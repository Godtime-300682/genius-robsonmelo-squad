// ============================================
// MOTOR COMERCIAL IA - Teixeira Brito Automacao
// Qualificacao, scoring, assignment, briefing
// ============================================

import type { Env } from '../../shared/types';
import { OpenAIClient } from '../../integrations/openai';
import { WhatsAppClient } from '../../integrations/whatsapp';
import { generateId, now, formatDate, formatPhone } from '../../shared/utils';

// ============================================
// TIPOS
// ============================================

interface LeadParaQualificar {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  tipo_caso: string | null;
  urgencia: string;
  canal_origem: string;
  score: string;
  status: string;
  created_at: string;
}

interface QualificacaoIA {
  score: 'quente' | 'morno' | 'frio';
  briefing: string;
  area_direito: string;
  valor_estimado: string;
  probabilidade_fechamento: string;
  proxima_acao: string;
}

interface CloserDisponivel {
  id: string;
  nome: string;
  leads_ativos: number;
}

interface ResultadoQualificacao {
  leads_processados: number;
  qualificados_quente: number;
  qualificados_morno: number;
  qualificados_frio: number;
  atribuidos_closer: number;
  briefings_gerados: number;
  notificacoes_enviadas: number;
  erros: string[];
}

interface MetricasComercial {
  pipeline: {
    novos: number;
    qualificados: number;
    agendados: number;
    fechados: number;
    perdidos: number;
  };
  scoring: {
    quentes: number;
    mornos: number;
    frios: number;
  };
  conversao: {
    lead_para_qualificado: number;
    qualificado_para_agendado: number;
    agendado_para_fechado: number;
    taxa_geral: number;
  };
  closers: Array<{
    nome: string;
    leads_ativos: number;
    fechados_mes: number;
    taxa_conversao: number;
  }>;
  origens: Array<{
    canal: string;
    total: number;
    fechados: number;
    taxa: number;
  }>;
  periodo: {
    leads_hoje: number;
    leads_semana: number;
    leads_mes: number;
    valor_fechado_mes: number;
  };
}

// ============================================
// QUALIFICACAO IA DE LEADS
// ============================================

export async function qualificarLeadsPendentes(env: Env): Promise<ResultadoQualificacao> {
  const resultado: ResultadoQualificacao = {
    leads_processados: 0,
    qualificados_quente: 0,
    qualificados_morno: 0,
    qualificados_frio: 0,
    atribuidos_closer: 0,
    briefings_gerados: 0,
    notificacoes_enviadas: 0,
    erros: [],
  };

  // Buscar leads novos nao qualificados por IA
  const leads = await env.DB.prepare(`
    SELECT id, nome, telefone, email, tipo_caso, urgencia, canal_origem, score, status, created_at
    FROM leads
    WHERE status = 'novo' AND qualificado_por_ia = 0
    ORDER BY created_at ASC
    LIMIT 20
  `).all();

  if (!leads.results.length) {
    return resultado;
  }

  const openai = new OpenAIClient(env.OPENAI_API_KEY);
  const wa = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);

  for (const row of leads.results) {
    const lead = row as unknown as LeadParaQualificar;
    try {
      // 1. Qualificar via IA
      const qualificacao = await qualificarComIA(openai, lead);
      resultado.leads_processados++;

      // 2. Contar score
      if (qualificacao.score === 'quente') resultado.qualificados_quente++;
      else if (qualificacao.score === 'morno') resultado.qualificados_morno++;
      else resultado.qualificados_frio++;

      // 3. Atribuir closer (round-robin para quentes e mornos)
      let closerId: string | null = null;
      if (qualificacao.score !== 'frio') {
        const closer = await atribuirCloser(env);
        if (closer) {
          closerId = closer.id;
          resultado.atribuidos_closer++;
        }
      }

      // 4. Gerar briefing completo para o closer
      const briefingCompleto = gerarBriefingCompleto(lead, qualificacao);
      resultado.briefings_gerados++;

      // 5. Atualizar lead no banco
      await env.DB.prepare(`
        UPDATE leads SET
          score = ?,
          qualificado_por_ia = 1,
          briefing_ia = ?,
          closer_id = ?,
          status = ?
        WHERE id = ?
      `).bind(
        qualificacao.score,
        briefingCompleto,
        closerId,
        qualificacao.score === 'frio' ? 'novo' : 'qualificado',
        lead.id,
      ).run();

      // 6. Notificar closer via WhatsApp (leads quentes)
      if (qualificacao.score === 'quente' && closerId) {
        await notificarCloser(env, wa, closerId, lead, qualificacao);
        resultado.notificacoes_enviadas++;
      }

      // 7. Registrar atividade
      await registrarAtividade(env, lead.id, 'qualificacao_ia', briefingCompleto);

    } catch (e) {
      resultado.erros.push(`Lead ${lead.id} (${lead.nome}): ${(e as Error).message}`);
    }
  }

  return resultado;
}

// ============================================
// QUALIFICACAO COM IA (GPT-4o-mini)
// ============================================

async function qualificarComIA(openai: OpenAIClient, lead: LeadParaQualificar): Promise<QualificacaoIA> {
  const prompt = `Analise este lead de escritório de advocacia e retorne JSON:

LEAD:
- Nome: ${lead.nome}
- Tipo de caso: ${lead.tipo_caso || 'Não informado'}
- Urgência declarada: ${lead.urgencia}
- Canal de origem: ${lead.canal_origem}
- Telefone: ${lead.telefone ? 'Informado' : 'Não'}
- Email: ${lead.email ? 'Informado' : 'Não'}

CONTEXTO DO ESCRITÓRIO:
- Teixeira Brito Advocacia (Goiânia-GO)
- Áreas: Cível, Trabalhista, Previdenciário, Empresarial, Família, Criminal, Tributário, Consumidor
- Sócio principal: Dr. Breno Teixeira Brito
- Foco: casos de média e alta complexidade

RETORNE JSON com:
{
  "score": "quente" | "morno" | "frio",
  "briefing": "briefing de 2-3 frases para o Closer usar na reunião",
  "area_direito": "área principal do caso",
  "valor_estimado": "baixo (<5k)" | "medio (5k-20k)" | "alto (>20k)",
  "probabilidade_fechamento": "alta" | "media" | "baixa",
  "proxima_acao": "ação recomendada para o comercial"
}

CRITÉRIOS DE SCORING:
- QUENTE: urgência alta + tipo de caso definido + contato completo
- MORNO: interesse real mas sem urgência imediata ou dados incompletos
- FRIO: apenas consultando, sem dados ou tipo genérico

Responda APENAS com o JSON válido.`;

  const resposta = await openai.chat([
    { role: 'system', content: 'Você é SDR sênior da Teixeira Brito Advocacia. Analise leads com precisão.' },
    { role: 'user', content: prompt },
  ], { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 400 });

  try {
    return JSON.parse(resposta) as QualificacaoIA;
  } catch {
    // Fallback: scoring baseado em regras
    return {
      score: lead.urgencia === 'alta' ? 'quente' : lead.urgencia === 'media' ? 'morno' : 'frio',
      briefing: `Lead ${lead.nome} - ${lead.tipo_caso || 'tipo não informado'}. Urgência: ${lead.urgencia}. Canal: ${lead.canal_origem}.`,
      area_direito: lead.tipo_caso || 'Não identificada',
      valor_estimado: 'medio (5k-20k)',
      probabilidade_fechamento: lead.urgencia === 'alta' ? 'alta' : 'media',
      proxima_acao: 'Entrar em contato para entender melhor a demanda',
    };
  }
}

// ============================================
// ATRIBUICAO DE CLOSER (ROUND-ROBIN)
// ============================================

async function atribuirCloser(env: Env): Promise<CloserDisponivel | null> {
  // Buscar usuarios com role 'comercial' ou 'coordenador', ordenados por menos leads ativos
  const closers = await env.DB.prepare(`
    SELECT u.id, u.nome,
           COALESCE(
             (SELECT COUNT(*) FROM leads l WHERE l.closer_id = u.id AND l.status IN ('qualificado', 'agendado')),
             0
           ) AS leads_ativos
    FROM usuarios u
    WHERE u.role IN ('comercial', 'coordenador') AND u.ativo = 1
    ORDER BY leads_ativos ASC
    LIMIT 1
  `).first();

  if (!closers) return null;

  return {
    id: closers.id as string,
    nome: closers.nome as string,
    leads_ativos: closers.leads_ativos as number,
  };
}

// ============================================
// BRIEFING COMPLETO PARA CLOSER
// ============================================

function gerarBriefingCompleto(lead: LeadParaQualificar, qualificacao: QualificacaoIA): string {
  const scoreEmoji = qualificacao.score === 'quente' ? '🔥' : qualificacao.score === 'morno' ? '🟡' : '🔵';
  const probEmoji = qualificacao.probabilidade_fechamento === 'alta' ? '📈' : qualificacao.probabilidade_fechamento === 'media' ? '➡️' : '📉';

  return [
    `${scoreEmoji} BRIEFING IA - Lead ${lead.nome}`,
    ``,
    `📊 Score: ${qualificacao.score.toUpperCase()}`,
    `⚖️ Área: ${qualificacao.area_direito}`,
    `💰 Valor estimado: ${qualificacao.valor_estimado}`,
    `${probEmoji} Probabilidade: ${qualificacao.probabilidade_fechamento}`,
    ``,
    `📝 Briefing: ${qualificacao.briefing}`,
    ``,
    `📋 Dados do Lead:`,
    `- Telefone: ${formatPhone(lead.telefone)}`,
    `- Email: ${lead.email || 'Não informado'}`,
    `- Canal: ${lead.canal_origem}`,
    `- Urgência: ${lead.urgencia}`,
    `- Cadastrado em: ${formatDate(lead.created_at)}`,
    ``,
    `🎯 Próxima ação: ${qualificacao.proxima_acao}`,
  ].join('\n');
}

// ============================================
// NOTIFICACAO DO CLOSER (WHATSAPP)
// ============================================

async function notificarCloser(
  env: Env,
  wa: WhatsAppClient,
  closerId: string,
  lead: LeadParaQualificar,
  qualificacao: QualificacaoIA
): Promise<void> {
  // Buscar WhatsApp do closer
  const closer = await env.DB.prepare(
    'SELECT nome, email FROM usuarios WHERE id = ?'
  ).bind(closerId).first();

  if (!closer) return;

  // Para notificação do closer, usar o telefone cadastrado (ou fallback para coordenador)
  const closerPhone = await env.DB.prepare(
    "SELECT telefone FROM usuarios WHERE id = ? AND telefone IS NOT NULL"
  ).bind(closerId).first();

  // Fallback: buscar coordenador Breno
  const telefone = closerPhone?.telefone as string | undefined;
  if (!telefone) return;

  const scoreEmoji = qualificacao.score === 'quente' ? '🔥' : '🟡';

  const mensagem = [
    `${scoreEmoji} NOVO LEAD ${qualificacao.score.toUpperCase()}!`,
    ``,
    `👤 ${lead.nome}`,
    `📞 ${formatPhone(lead.telefone)}`,
    `⚖️ ${qualificacao.area_direito}`,
    `💰 Valor: ${qualificacao.valor_estimado}`,
    ``,
    `📝 ${qualificacao.briefing}`,
    ``,
    `🎯 ${qualificacao.proxima_acao}`,
    ``,
    `_Qualificado por IA - Teixeira Brito_`,
  ].join('\n');

  await wa.sendMessage({ number: telefone, text: mensagem });

  // Registrar notificacao
  await env.DB.prepare(`
    INSERT INTO notificacoes (id, destinatario_id, tipo, canal, titulo, mensagem, enviada, lida, referencia_tipo, referencia_id, created_at)
    VALUES (?, ?, 'lead', 'whatsapp', ?, ?, 1, 0, 'lead', ?, ?)
  `).bind(
    generateId(),
    closerId,
    `Lead ${qualificacao.score}: ${lead.nome}`,
    mensagem,
    lead.id,
    now(),
  ).run();
}

// ============================================
// AGENDAMENTO AUTOMATICO
// ============================================

export async function sugerirAgendamento(env: Env, leadId: string): Promise<{
  sugestoes: string[];
  mensagem_whatsapp: string;
}> {
  // Buscar lead
  const lead = await env.DB.prepare(
    'SELECT l.*, u.nome AS closer_nome FROM leads l LEFT JOIN usuarios u ON u.id = l.closer_id WHERE l.id = ?'
  ).bind(leadId).first();

  if (!lead) throw new Error('Lead não encontrado');

  // Gerar sugestões de horário (próximos 3 dias úteis, horários comerciais)
  const sugestoes: string[] = [];
  const hoje = new Date();
  let diasAdicionados = 0;

  while (sugestoes.length < 3) {
    hoje.setDate(hoje.getDate() + 1);
    const dia = hoje.getDay();
    if (dia === 0 || dia === 6) continue; // pular fim de semana
    diasAdicionados++;

    const dataStr = formatDate(hoje);
    sugestoes.push(`${dataStr} às 10:00`);
    if (sugestoes.length < 3) sugestoes.push(`${dataStr} às 15:00`);
  }

  const closerNome = (lead.closer_nome as string) || 'nosso especialista';

  const mensagem_whatsapp = [
    `Olá ${lead.nome}! 👋`,
    ``,
    `Sou da Teixeira Brito Advocacia. Analisamos seu caso e gostaríamos de agendar uma conversa com ${closerNome} para entender melhor como podemos ajudar.`,
    ``,
    `📅 Horários disponíveis:`,
    ...sugestoes.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `Qual horário fica melhor para você? Ou sugira outro de sua preferência.`,
    ``,
    `_Teixeira Brito Advocacia_`,
  ].join('\n');

  return { sugestoes, mensagem_whatsapp };
}

// ============================================
// ENVIAR PROPOSTA DE AGENDAMENTO VIA WHATSAPP
// ============================================

export async function enviarPropostaAgendamento(env: Env, leadId: string): Promise<{ enviado: boolean }> {
  const lead = await env.DB.prepare(
    'SELECT nome, telefone FROM leads WHERE id = ?'
  ).bind(leadId).first();

  if (!lead) throw new Error('Lead não encontrado');

  const { mensagem_whatsapp } = await sugerirAgendamento(env, leadId);

  const wa = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
  await wa.sendMessage({
    number: lead.telefone as string,
    text: mensagem_whatsapp,
  });

  await registrarAtividade(env, leadId, 'proposta_agendamento', 'Proposta de agendamento enviada via WhatsApp');

  return { enviado: true };
}

// ============================================
// GERAR BRIEFING PRE-REUNIAO
// ============================================

export async function gerarBriefingPreReuniao(env: Env, leadId: string): Promise<string> {
  const lead = await env.DB.prepare(`
    SELECT l.*, u.nome AS closer_nome
    FROM leads l
    LEFT JOIN usuarios u ON u.id = l.closer_id
    WHERE l.id = ?
  `).bind(leadId).first();

  if (!lead) throw new Error('Lead não encontrado');

  // Buscar histórico de atendimentos do mesmo telefone
  const atendimentos = await env.DB.prepare(`
    SELECT tipo, mensagem, created_at
    FROM atendimentos
    WHERE cliente_id IN (SELECT id FROM clientes WHERE telefone = ? OR whatsapp = ?)
    ORDER BY created_at DESC LIMIT 5
  `).bind(lead.telefone, lead.telefone).all();

  const openai = new OpenAIClient(env.OPENAI_API_KEY);

  const historicoTexto = atendimentos.results.length > 0
    ? atendimentos.results.map(a => `[${a.tipo}] ${a.mensagem}`).join('\n')
    : 'Sem histórico prévio.';

  const briefing = await openai.chat([
    {
      role: 'system',
      content: `Você é assistente comercial sênior da Teixeira Brito Advocacia. Gere um briefing pré-reunião completo para o Closer.`,
    },
    {
      role: 'user',
      content: [
        `LEAD: ${lead.nome}`,
        `TIPO CASO: ${lead.tipo_caso || 'Não informado'}`,
        `URGÊNCIA: ${lead.urgencia}`,
        `SCORE IA: ${lead.score}`,
        `CANAL: ${lead.canal_origem}`,
        `BRIEFING ANTERIOR: ${lead.briefing_ia || 'Nenhum'}`,
        ``,
        `HISTÓRICO DE CONTATO:`,
        historicoTexto,
        ``,
        `Gere briefing com:`,
        `1. Resumo do caso (2-3 frases)`,
        `2. Pontos-chave para a reunião`,
        `3. Possíveis objeções e como contornar`,
        `4. Valor sugerido de honorários (faixa)`,
        `5. Estratégia de fechamento recomendada`,
      ].join('\n'),
    },
  ], { model: 'gpt-4o-mini', temperature: 0.4, maxTokens: 800 });

  // Atualizar briefing no lead
  await env.DB.prepare(
    'UPDATE leads SET briefing_ia = ? WHERE id = ?'
  ).bind(briefing, leadId).run();

  await registrarAtividade(env, leadId, 'briefing_pre_reuniao', 'Briefing pré-reunião gerado por IA');

  return briefing;
}

// ============================================
// METRICAS COMERCIAIS
// ============================================

export async function gerarMetricasComercial(env: Env): Promise<MetricasComercial> {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioSemana = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  })();
  const inicioMes = hoje.substring(0, 7) + '-01';

  const [
    pipeline,
    scoring,
    closersResult,
    origensResult,
    periodoResult,
  ] = await Promise.all([
    // Pipeline por status
    env.DB.prepare(`
      SELECT status, COUNT(*) as total FROM leads GROUP BY status
    `).all(),

    // Scoring
    env.DB.prepare(`
      SELECT score, COUNT(*) as total FROM leads WHERE status NOT IN ('perdido') GROUP BY score
    `).all(),

    // Performance dos closers
    env.DB.prepare(`
      SELECT u.nome,
        COALESCE(SUM(CASE WHEN l.status IN ('qualificado', 'agendado') THEN 1 ELSE 0 END), 0) AS leads_ativos,
        COALESCE(SUM(CASE WHEN l.status = 'fechado' AND l.created_at >= ? THEN 1 ELSE 0 END), 0) AS fechados_mes,
        COUNT(l.id) AS total_leads
      FROM usuarios u
      LEFT JOIN leads l ON l.closer_id = u.id
      WHERE u.role IN ('comercial', 'coordenador') AND u.ativo = 1
      GROUP BY u.id, u.nome
    `).bind(inicioMes).all(),

    // Origens
    env.DB.prepare(`
      SELECT canal_origem AS canal,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'fechado' THEN 1 ELSE 0 END) AS fechados
      FROM leads
      GROUP BY canal_origem
    `).all(),

    // Período
    env.DB.prepare(`
      SELECT
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS leads_hoje,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS leads_semana,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS leads_mes
      FROM leads
    `).bind(hoje, inicioSemana, inicioMes).first(),
  ]);

  // Montar pipeline
  const pipelineMap: Record<string, number> = {};
  for (const row of pipeline.results) {
    pipelineMap[row.status as string] = row.total as number;
  }

  // Montar scoring
  const scoringMap: Record<string, number> = {};
  for (const row of scoring.results) {
    scoringMap[row.score as string] = row.total as number;
  }

  // Calcular taxas de conversão
  const totalLeads = Object.values(pipelineMap).reduce((a, b) => a + b, 0) || 1;
  const qualificados = (pipelineMap['qualificado'] || 0) + (pipelineMap['agendado'] || 0) + (pipelineMap['fechado'] || 0);
  const agendados = (pipelineMap['agendado'] || 0) + (pipelineMap['fechado'] || 0);
  const fechados = pipelineMap['fechado'] || 0;

  // Closers
  const closers = closersResult.results.map(c => ({
    nome: c.nome as string,
    leads_ativos: c.leads_ativos as number,
    fechados_mes: c.fechados_mes as number,
    taxa_conversao: (c.total_leads as number) > 0
      ? Math.round(((c.fechados_mes as number) / (c.total_leads as number)) * 100)
      : 0,
  }));

  // Origens
  const origens = origensResult.results.map(o => ({
    canal: o.canal as string,
    total: o.total as number,
    fechados: o.fechados as number,
    taxa: (o.total as number) > 0
      ? Math.round(((o.fechados as number) / (o.total as number)) * 100)
      : 0,
  }));

  // Valor fechado no mês (buscar de casos criados a partir de leads fechados)
  const valorMes = await env.DB.prepare(`
    SELECT COALESCE(SUM(ca.valor_honorarios), 0) AS total
    FROM casos ca
    WHERE ca.created_at >= ? AND ca.fase_pipeline = 'comercial'
  `).bind(inicioMes).first();

  return {
    pipeline: {
      novos: pipelineMap['novo'] || 0,
      qualificados: pipelineMap['qualificado'] || 0,
      agendados: pipelineMap['agendado'] || 0,
      fechados: pipelineMap['fechado'] || 0,
      perdidos: pipelineMap['perdido'] || 0,
    },
    scoring: {
      quentes: scoringMap['quente'] || 0,
      mornos: scoringMap['morno'] || 0,
      frios: scoringMap['frio'] || 0,
    },
    conversao: {
      lead_para_qualificado: Math.round((qualificados / totalLeads) * 100),
      qualificado_para_agendado: qualificados > 0 ? Math.round((agendados / qualificados) * 100) : 0,
      agendado_para_fechado: agendados > 0 ? Math.round((fechados / agendados) * 100) : 0,
      taxa_geral: Math.round((fechados / totalLeads) * 100),
    },
    closers,
    origens,
    periodo: {
      leads_hoje: (periodoResult?.leads_hoje as number) || 0,
      leads_semana: (periodoResult?.leads_semana as number) || 0,
      leads_mes: (periodoResult?.leads_mes as number) || 0,
      valor_fechado_mes: (valorMes?.total as number) || 0,
    },
  };
}

// ============================================
// CONVERTER LEAD EM CLIENTE + CASO
// ============================================

export async function converterLeadEmCliente(env: Env, leadId: string, dados: {
  cpf_cnpj: string;
  endereco: string;
  tipo_caso: string;
  area_direito: string;
  advogado_id: string;
  valor_causa?: number;
  valor_honorarios?: number;
  numero_processo?: string;
}): Promise<{ cliente_id: string; caso_id: string }> {
  const lead = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
  if (!lead) throw new Error('Lead não encontrado');

  const clienteId = generateId();
  const casoId = generateId();
  const timestamp = now();

  // Criar cliente
  await env.DB.prepare(`
    INSERT INTO clientes (id, nome, cpf_cnpj, email, telefone, whatsapp, endereco, tipo_caso, area_direito, status, advogado_responsavel_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?)
  `).bind(
    clienteId,
    lead.nome,
    dados.cpf_cnpj,
    lead.email || '',
    lead.telefone,
    lead.telefone,
    dados.endereco,
    dados.tipo_caso,
    dados.area_direito,
    dados.advogado_id,
    timestamp,
    timestamp,
  ).run();

  // Criar caso
  await env.DB.prepare(`
    INSERT INTO casos (id, cliente_id, numero_processo, tipo, area_direito, status, fase_pipeline, advogado_id, valor_causa, valor_honorarios, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'triagem', 'triagem', ?, ?, ?, ?, ?)
  `).bind(
    casoId,
    clienteId,
    dados.numero_processo || null,
    dados.tipo_caso,
    dados.area_direito,
    dados.advogado_id,
    dados.valor_causa || null,
    dados.valor_honorarios || null,
    timestamp,
    timestamp,
  ).run();

  // Atualizar lead como fechado
  await env.DB.prepare(`
    UPDATE leads SET status = 'fechado' WHERE id = ?
  `).bind(leadId).run();

  await registrarAtividade(env, leadId, 'conversao_cliente', `Lead convertido em Cliente ${clienteId} + Caso ${casoId}`);

  return { cliente_id: clienteId, caso_id: casoId };
}

// ============================================
// FOLLOW-UP AUTOMATICO
// ============================================

export async function processarFollowUps(env: Env): Promise<{
  followups_enviados: number;
  leads_perdidos: number;
  erros: string[];
}> {
  const resultado = { followups_enviados: 0, leads_perdidos: 0, erros: [] as string[] };

  const wa = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);

  // Leads qualificados sem agendamento há mais de 2 dias
  const leadsFollowUp = await env.DB.prepare(`
    SELECT l.id, l.nome, l.telefone, l.tipo_caso, l.score, l.created_at,
           u.nome AS closer_nome
    FROM leads l
    LEFT JOIN usuarios u ON u.id = l.closer_id
    WHERE l.status = 'qualificado'
      AND l.reuniao_agendada IS NULL
      AND l.created_at <= datetime('now', '-2 days')
      AND l.created_at > datetime('now', '-10 days')
  `).all();

  for (const lead of leadsFollowUp.results) {
    try {
      const diasDesdeContato = Math.floor(
        (Date.now() - new Date(lead.created_at as string).getTime()) / (1000 * 60 * 60 * 24)
      );

      let mensagem: string;
      if (diasDesdeContato <= 3) {
        mensagem = [
          `Olá ${lead.nome}! 👋`,
          ``,
          `Entramos em contato recentemente sobre seu caso de ${lead.tipo_caso || 'direito'}. Conseguiu analisar nossa proposta?`,
          ``,
          `Estamos à disposição para agendar uma conversa sem compromisso.`,
          ``,
          `_Teixeira Brito Advocacia_`,
        ].join('\n');
      } else if (diasDesdeContato <= 7) {
        mensagem = [
          `${lead.nome}, tudo bem?`,
          ``,
          `Notamos que ainda não conseguimos agendar sua consulta. Sabemos que esses assuntos exigem atenção especial.`,
          ``,
          `Que tal conversarmos esta semana? Temos horários flexíveis.`,
          ``,
          `_Teixeira Brito Advocacia_`,
        ].join('\n');
      } else {
        mensagem = [
          `Olá ${lead.nome},`,
          ``,
          `Passando para informar que mantemos seu caso em nossa agenda. Quando se sentir pronto(a), estamos à disposição.`,
          ``,
          `Não hesite em nos procurar.`,
          ``,
          `_Teixeira Brito Advocacia_`,
        ].join('\n');
      }

      await wa.sendMessage({ number: lead.telefone as string, text: mensagem });
      resultado.followups_enviados++;

      await registrarAtividade(env, lead.id as string, 'followup_automatico', `Follow-up D+${diasDesdeContato} enviado`);
    } catch (e) {
      resultado.erros.push(`Follow-up ${lead.id}: ${(e as Error).message}`);
    }
  }

  // Marcar leads antigos como perdidos (> 30 dias sem agendamento)
  const leadsPerdidos = await env.DB.prepare(`
    UPDATE leads SET status = 'perdido'
    WHERE status IN ('novo', 'qualificado')
      AND reuniao_agendada IS NULL
      AND created_at <= datetime('now', '-30 days')
  `).run();

  resultado.leads_perdidos = leadsPerdidos.meta.changes;

  return resultado;
}

// ============================================
// UTILS
// ============================================

async function registrarAtividade(env: Env, referenciaId: string, acao: string, descricao: string): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO atividades_log (id, usuario_id, acao, entidade_tipo, entidade_id, detalhes, created_at)
    VALUES (?, NULL, ?, 'lead', ?, ?, ?)
  `).bind(generateId(), acao, referenciaId, descricao, now()).run();
}
