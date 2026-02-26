// ============================================
// MOTOR DE LEMBRETES DE AUDIENCIAS
// Teixeira Brito Automacao IA
// Cascata: D-7, D-3, D-1 + Pos-audiencia
// ============================================

import type { Env } from '../../shared/types';
import { WhatsAppClient } from '../../integrations/whatsapp';
import { EmailClient } from '../../integrations/email';
import { OpenAIClient } from '../../integrations/openai';
import { generateId, now, formatDate } from '../../shared/utils';

// ============================================
// TIPOS
// ============================================

interface AudienciaParaLembrete {
  id: string;
  caso_id: string;
  cliente_id: string;
  tipo: string;
  data_hora: string;
  local: string;
  advogado_id: string;
  status: string;
  lembrete_d7_enviado: number;
  lembrete_d3_enviado: number;
  lembrete_d1_enviado: number;
  // Joins
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_email: string;
  cliente_telefone: string;
  advogado_nome: string;
  advogado_email: string;
  numero_processo: string | null;
  caso_tipo: string;
  parte_contraria: string | null;
  dias_restantes: number;
}

interface ResultadoLembretes {
  audiencias_verificadas: number;
  lembretes_d7: number;
  lembretes_d3: number;
  lembretes_d1: number;
  confirmacoes_solicitadas: number;
  notificacoes_advogado: number;
  erros: string[];
}

interface ResultadoPosAudiencia {
  audiencias_processadas: number;
  followups_enviados: number;
  erros: string[];
}

interface PrepAudiencia {
  checklist: string[];
  documentos_necessarios: string[];
  orientacoes_cliente: string;
  estrategia_resumo: string;
}

// ============================================
// PROCESSAR LEMBRETES DIARIOS (CRON 09h)
// ============================================

export async function processarLembretesDiarios(env: Env): Promise<ResultadoLembretes> {
  const resultado: ResultadoLembretes = {
    audiencias_verificadas: 0,
    lembretes_d7: 0,
    lembretes_d3: 0,
    lembretes_d1: 0,
    confirmacoes_solicitadas: 0,
    notificacoes_advogado: 0,
    erros: [],
  };

  // Buscar audiencias dos proximos 8 dias (para pegar D-7 inclusive)
  const audiencias = await env.DB.prepare(`
    SELECT a.id, a.caso_id, a.cliente_id, a.tipo, a.data_hora, a.local,
           a.advogado_id, a.status,
           a.lembrete_d7_enviado, a.lembrete_d3_enviado, a.lembrete_d1_enviado,
           cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp,
           cl.email AS cliente_email, cl.telefone AS cliente_telefone,
           u.nome AS advogado_nome, u.email AS advogado_email,
           ca.numero_processo, ca.tipo AS caso_tipo, ca.parte_contraria,
           CAST(julianday(date(a.data_hora)) - julianday(date('now')) AS INTEGER) AS dias_restantes
    FROM audiencias a
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = a.advogado_id
    LEFT JOIN casos ca ON ca.id = a.caso_id
    WHERE a.status IN ('agendada', 'confirmada')
      AND date(a.data_hora) BETWEEN date('now') AND date('now', '+8 days')
    ORDER BY a.data_hora ASC
  `).all();

  resultado.audiencias_verificadas = audiencias.results.length;

  if (!audiencias.results.length) return resultado;

  const wa = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
  const email = new EmailClient(env.SMTP_USER);

  for (const row of audiencias.results) {
    const aud = row as unknown as AudienciaParaLembrete;

    try {
      const dias = aud.dias_restantes;

      // D-7: Lembrete inicial + checklist
      if (dias <= 7 && dias > 3 && !aud.lembrete_d7_enviado) {
        await enviarLembreteD7(env, wa, email, aud);
        resultado.lembretes_d7++;
      }

      // D-3: Confirmacao + orientacoes detalhadas
      if (dias <= 3 && dias > 1 && !aud.lembrete_d3_enviado) {
        await enviarLembreteD3(env, wa, email, aud);
        resultado.lembretes_d3++;
        resultado.confirmacoes_solicitadas++;
      }

      // D-1: Lembrete URGENTE + instrucoes finais
      if (dias <= 1 && !aud.lembrete_d1_enviado) {
        await enviarLembreteD1(env, wa, email, aud);
        resultado.lembretes_d1++;
      }

      // Notificar advogado em todos os lembretes
      if ((dias === 7 || dias === 3 || dias === 1) && aud.advogado_email) {
        await notificarAdvogado(env, wa, aud, dias);
        resultado.notificacoes_advogado++;
      }

    } catch (e) {
      resultado.erros.push(`Audiencia ${aud.id}: ${(e as Error).message}`);
    }
  }

  return resultado;
}

// ============================================
// D-7: LEMBRETE INICIAL
// ============================================

async function enviarLembreteD7(
  env: Env, wa: WhatsAppClient, _email: EmailClient, aud: AudienciaParaLembrete
): Promise<void> {
  const dataFormatada = formatarDataHora(aud.data_hora);

  // WhatsApp para cliente
  await wa.enviarLembreteAudiencia(
    aud.cliente_whatsapp,
    aud.cliente_nome,
    aud.tipo,
    dataFormatada,
    aud.local || 'A confirmar',
    7,
  );

  // Marcar como enviado
  await env.DB.prepare(
    'UPDATE audiencias SET lembrete_d7_enviado = 1 WHERE id = ?'
  ).bind(aud.id).run();

  // Registrar notificacao
  await registrarNotificacao(env, aud.cliente_id, 'audiencia', 'whatsapp',
    `Lembrete D-7: Audiência ${aud.tipo}`,
    `Audiência de ${aud.tipo} em ${dataFormatada} - ${aud.local}`,
    aud.id,
  );

  await registrarAtividade(env, aud.id, 'lembrete_d7', `Lembrete D-7 enviado para ${aud.cliente_nome}`);
}

// ============================================
// D-3: CONFIRMACAO + ORIENTACOES
// ============================================

async function enviarLembreteD3(
  env: Env, wa: WhatsAppClient, _email: EmailClient, aud: AudienciaParaLembrete
): Promise<void> {
  const dataFormatada = formatarDataHora(aud.data_hora);

  // WhatsApp com pedido de confirmacao
  await wa.enviarLembreteAudiencia(
    aud.cliente_whatsapp,
    aud.cliente_nome,
    aud.tipo,
    dataFormatada,
    aud.local || 'A confirmar',
    3,
  );

  // Enviar orientacoes especificas por tipo
  const orientacoes = gerarOrientacoesPorTipo(aud.tipo, aud.cliente_nome);
  await wa.sendMessage({
    number: aud.cliente_whatsapp,
    text: orientacoes,
  });

  // Marcar como enviado
  await env.DB.prepare(
    'UPDATE audiencias SET lembrete_d3_enviado = 1 WHERE id = ?'
  ).bind(aud.id).run();

  await registrarNotificacao(env, aud.cliente_id, 'audiencia', 'whatsapp',
    `Confirmação D-3: Audiência ${aud.tipo}`,
    `Pedido de confirmação para audiência em ${dataFormatada}`,
    aud.id,
  );

  await registrarAtividade(env, aud.id, 'lembrete_d3', `Lembrete D-3 + orientações enviados para ${aud.cliente_nome}`);
}

// ============================================
// D-1: LEMBRETE URGENTE
// ============================================

async function enviarLembreteD1(
  env: Env, wa: WhatsAppClient, _email: EmailClient, aud: AudienciaParaLembrete
): Promise<void> {
  const dataFormatada = formatarDataHora(aud.data_hora);

  // WhatsApp URGENTE
  await wa.enviarLembreteAudiencia(
    aud.cliente_whatsapp,
    aud.cliente_nome,
    aud.tipo,
    dataFormatada,
    aud.local || 'A confirmar',
    1,
  );

  // Instrucoes finais
  const instrucoes = [
    `📋 *INSTRUÇÕES PARA AMANHÃ* - ${aud.cliente_nome}`,
    ``,
    `📅 ${dataFormatada}`,
    `📍 ${aud.local || 'Local a confirmar'}`,
    ``,
    `✅ *Checklist:*`,
    `1. Documento com foto (RG ou CNH)`,
    `2. Comprovante de endereço recente`,
    `3. Chegar 15 minutos antes`,
    `4. Vestimenta adequada (sem boné, chinelo)`,
    `5. Celular no silencioso`,
    ``,
    `⚠️ *Importante:*`,
    `- Seu advogado ${aud.advogado_nome} estará presente`,
    `- Não se atrase — audiência pode ser realizada sem você`,
    `- Em caso de imprevisto, ligue IMEDIATAMENTE`,
    ``,
    `📞 Qualquer dúvida, responda esta mensagem.`,
    ``,
    `_Teixeira Brito Advocacia_`,
  ].join('\n');

  await wa.sendMessage({
    number: aud.cliente_whatsapp,
    text: instrucoes,
  });

  // Marcar como enviado
  await env.DB.prepare(
    'UPDATE audiencias SET lembrete_d1_enviado = 1 WHERE id = ?'
  ).bind(aud.id).run();

  await registrarNotificacao(env, aud.cliente_id, 'audiencia', 'whatsapp',
    `⚠️ AMANHÃ: Audiência ${aud.tipo}`,
    `Lembrete urgente D-1 para audiência em ${dataFormatada}`,
    aud.id,
  );

  await registrarAtividade(env, aud.id, 'lembrete_d1', `Lembrete URGENTE D-1 enviado para ${aud.cliente_nome}`);
}

// ============================================
// NOTIFICAR ADVOGADO
// ============================================

async function notificarAdvogado(
  env: Env, wa: WhatsAppClient, aud: AudienciaParaLembrete, diasRestantes: number
): Promise<void> {
  // Buscar telefone do advogado
  const advogado = await env.DB.prepare(
    'SELECT telefone FROM usuarios WHERE id = ?'
  ).bind(aud.advogado_id).first();

  if (!advogado?.telefone) return;

  const emoji = diasRestantes <= 1 ? '⚠️' : diasRestantes <= 3 ? '📋' : '📅';
  const dataFormatada = formatarDataHora(aud.data_hora);

  const mensagem = [
    `${emoji} AUDIÊNCIA em ${diasRestantes} dia(s)`,
    ``,
    `👤 Cliente: ${aud.cliente_nome}`,
    `📋 Tipo: ${aud.tipo}`,
    `📅 Data: ${dataFormatada}`,
    `📍 Local: ${aud.local || 'A confirmar'}`,
    `📑 Processo: ${aud.numero_processo || 'N/A'}`,
    aud.parte_contraria ? `⚔️ Parte contrária: ${aud.parte_contraria}` : '',
    ``,
    `_Lembrete automático - Teixeira Brito_`,
  ].filter(Boolean).join('\n');

  await wa.sendMessage({
    number: advogado.telefone as string,
    text: mensagem,
  });

  await registrarNotificacao(env, aud.advogado_id, 'audiencia', 'whatsapp',
    `Audiência D-${diasRestantes}: ${aud.cliente_nome}`,
    mensagem,
    aud.id,
  );
}

// ============================================
// ORIENTACOES POR TIPO DE AUDIENCIA
// ============================================

function gerarOrientacoesPorTipo(tipo: string, nomeCliente: string): string {
  const orientacoes: Record<string, string> = {
    conciliacao: [
      `📋 *Orientações para Audiência de Conciliação*`,
      `${nomeCliente}, seguem informações importantes:`,
      ``,
      `🤝 *O que é:* Tentativa de acordo entre as partes`,
      ``,
      `✅ *Como se preparar:*`,
      `- Pense em um valor mínimo aceitável para acordo`,
      `- Tenha em mente seus principais argumentos`,
      `- Esteja aberto(a) à negociação`,
      `- Traga calculadora se necessário`,
      ``,
      `💡 *Dicas:*`,
      `- Mantenha a calma, mesmo se provocado(a)`,
      `- Deixe seu advogado conduzir a negociação`,
      `- Não aceite acordo sem consultar seu advogado`,
      `- Acordo homologado tem força de sentença`,
      ``,
      `_Teixeira Brito Advocacia_`,
    ].join('\n'),

    instrucao: [
      `📋 *Orientações para Audiência de Instrução*`,
      `${nomeCliente}, seguem informações importantes:`,
      ``,
      `📑 *O que é:* Audiência para ouvir testemunhas e produzir provas`,
      ``,
      `✅ *Como se preparar:*`,
      `- Releia os fatos do seu caso (pergunte ao advogado)`,
      `- Confirme presença das testemunhas`,
      `- Traga TODOS os documentos solicitados`,
      ``,
      `⚠️ *Importante:*`,
      `- Responda APENAS o que for perguntado`,
      `- Seja direto(a) e verdadeiro(a)`,
      `- Não interrompa falas das outras partes`,
      `- O juiz conduz a audiência — respeite a ordem`,
      ``,
      `_Teixeira Brito Advocacia_`,
    ].join('\n'),

    julgamento: [
      `📋 *Orientações para Audiência de Julgamento*`,
      `${nomeCliente}, seguem informações importantes:`,
      ``,
      `⚖️ *O que é:* Sessão onde o juiz proferirá a decisão`,
      ``,
      `✅ *Como se preparar:*`,
      `- Esteja presente pontualmente`,
      `- Seu advogado fará a sustentação oral`,
      `- A decisão pode ser dada na hora ou em até 30 dias`,
      ``,
      `💡 *O que esperar:*`,
      `- Pode haver debates entre advogados`,
      `- O resultado será comunicado por seu advogado`,
      `- Em caso de resultado desfavorável, há recursos possíveis`,
      ``,
      `_Teixeira Brito Advocacia_`,
    ].join('\n'),
  };

  return orientacoes[tipo] || orientacoes['conciliacao'];
}

// ============================================
// POS-AUDIENCIA: FOLLOW-UP AUTOMATICO
// ============================================

export async function processarPosAudiencia(env: Env): Promise<ResultadoPosAudiencia> {
  const resultado: ResultadoPosAudiencia = {
    audiencias_processadas: 0,
    followups_enviados: 0,
    erros: [],
  };

  // Audiencias realizadas ontem sem resultado registrado
  const audiencias = await env.DB.prepare(`
    SELECT a.id, a.caso_id, a.cliente_id, a.tipo, a.data_hora, a.local,
           a.advogado_id, a.status, a.resultado,
           cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp,
           u.nome AS advogado_nome
    FROM audiencias a
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = a.advogado_id
    WHERE a.status IN ('agendada', 'confirmada')
      AND date(a.data_hora) < date('now')
      AND a.resultado IS NULL
  `).all();

  resultado.audiencias_processadas = audiencias.results.length;
  const wa = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);

  for (const row of audiencias.results) {
    const aud = row as unknown as AudienciaParaLembrete;
    try {
      // Lembrar advogado de registrar resultado
      const advPhone = await env.DB.prepare(
        'SELECT telefone FROM usuarios WHERE id = ?'
      ).bind(aud.advogado_id).first();

      if (advPhone?.telefone) {
        const msg = [
          `📝 *Registro de Audiência Pendente*`,
          ``,
          `A audiência de ${aud.tipo} do cliente ${aud.cliente_nome} já ocorreu.`,
          ``,
          `Por favor, registre o resultado:`,
          `- Acordo? Valor?`,
          `- Adiada? Nova data?`,
          `- Concluída? Resultado?`,
          ``,
          `_Sistema automático - Teixeira Brito_`,
        ].join('\n');

        await wa.sendMessage({ number: advPhone.telefone as string, text: msg });
        resultado.followups_enviados++;
      }

      // Follow-up para cliente (agradecer presença)
      if (aud.cliente_whatsapp) {
        const msgCliente = [
          `Olá ${aud.cliente_nome}! 👋`,
          ``,
          `Gostaríamos de agradecer sua presença na audiência de ${aud.tipo}.`,
          ``,
          `Seu advogado ${aud.advogado_nome} entrará em contato para informar os próximos passos.`,
          ``,
          `Qualquer dúvida, estamos à disposição.`,
          ``,
          `_Teixeira Brito Advocacia_`,
        ].join('\n');

        await wa.sendMessage({ number: aud.cliente_whatsapp, text: msgCliente });
        resultado.followups_enviados++;
      }

      await registrarAtividade(env, aud.id, 'pos_audiencia_followup', `Follow-up pós-audiência enviado`);
    } catch (e) {
      resultado.erros.push(`Pós-audiência ${aud.id}: ${(e as Error).message}`);
    }
  }

  return resultado;
}

// ============================================
// PREPARACAO IA PARA AUDIENCIA
// ============================================

export async function gerarPreparacaoAudiencia(env: Env, audienciaId: string): Promise<PrepAudiencia> {
  const aud = await env.DB.prepare(`
    SELECT a.*, ca.numero_processo, ca.tipo AS caso_tipo, ca.parte_contraria,
           ca.observacoes AS caso_obs, ca.area_direito,
           cl.nome AS cliente_nome
    FROM audiencias a
    LEFT JOIN casos ca ON ca.id = a.caso_id
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    WHERE a.id = ?
  `).bind(audienciaId).first();

  if (!aud) throw new Error('Audiência não encontrada');

  const openai = new OpenAIClient(env.OPENAI_API_KEY);

  const resposta = await openai.chat([
    {
      role: 'system',
      content: 'Você é advogado sênior preparando uma audiência. Retorne JSON com preparação completa.',
    },
    {
      role: 'user',
      content: [
        `Prepare a audiência:`,
        `- Tipo: ${aud.tipo}`,
        `- Área: ${aud.area_direito || 'Não informada'}`,
        `- Processo: ${aud.numero_processo || 'N/A'}`,
        `- Cliente: ${aud.cliente_nome}`,
        `- Parte contrária: ${aud.parte_contraria || 'Não informada'}`,
        `- Observações: ${aud.caso_obs || 'Nenhuma'}`,
        ``,
        `Retorne JSON:`,
        `{`,
        `  "checklist": ["item1", "item2", ...],`,
        `  "documentos_necessarios": ["doc1", "doc2", ...],`,
        `  "orientacoes_cliente": "texto com orientações para o cliente",`,
        `  "estrategia_resumo": "resumo da estratégia recomendada"`,
        `}`,
      ].join('\n'),
    },
  ], { model: 'gpt-4o-mini', temperature: 0.3, maxTokens: 800 });

  try {
    return JSON.parse(resposta) as PrepAudiencia;
  } catch {
    return {
      checklist: [
        'Confirmar presença do cliente',
        'Revisar petição inicial',
        'Preparar documentos comprobatórios',
        'Verificar testemunhas confirmadas',
        'Revisar jurisprudência atualizada',
      ],
      documentos_necessarios: [
        'RG/CNH do cliente',
        'Procuração',
        'Petição inicial',
        'Documentos probatórios',
      ],
      orientacoes_cliente: `${aud.cliente_nome}, compareça com 15 minutos de antecedência, com documento de identidade. Vista-se adequadamente e mantenha celular no silencioso.`,
      estrategia_resumo: `Audiência de ${aud.tipo} - seguir estratégia padrão conforme peças processuais.`,
    };
  }
}

// ============================================
// METRICAS DE AUDIENCIAS
// ============================================

export async function gerarMetricasAudiencias(env: Env): Promise<Record<string, unknown>> {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.substring(0, 7) + '-01';

  const [porStatus, porTipo, proximaSemana, realizadasMes, acordosMes] = await Promise.all([
    env.DB.prepare(`
      SELECT status, COUNT(*) as qtd FROM audiencias GROUP BY status
    `).all(),

    env.DB.prepare(`
      SELECT tipo, COUNT(*) as qtd FROM audiencias GROUP BY tipo
    `).all(),

    env.DB.prepare(`
      SELECT COUNT(*) as qtd
      FROM audiencias
      WHERE status IN ('agendada', 'confirmada')
        AND date(data_hora) BETWEEN date('now') AND date('now', '+7 days')
    `).first(),

    env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM audiencias
      WHERE status = 'realizada' AND data_hora >= ?
    `).bind(inicioMes).first(),

    env.DB.prepare(`
      SELECT COUNT(*) as qtd, COALESCE(SUM(acordo_valor), 0) as total
      FROM audiencias
      WHERE acordo_valor > 0 AND data_hora >= ?
    `).bind(inicioMes).first(),
  ]);

  // Lembretes pendentes
  const lembretesPendentes = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN lembrete_d7_enviado = 0 AND CAST(julianday(date(data_hora)) - julianday(date('now')) AS INTEGER) <= 7 THEN 1 ELSE 0 END) AS d7_pendentes,
      SUM(CASE WHEN lembrete_d3_enviado = 0 AND CAST(julianday(date(data_hora)) - julianday(date('now')) AS INTEGER) <= 3 THEN 1 ELSE 0 END) AS d3_pendentes,
      SUM(CASE WHEN lembrete_d1_enviado = 0 AND CAST(julianday(date(data_hora)) - julianday(date('now')) AS INTEGER) <= 1 THEN 1 ELSE 0 END) AS d1_pendentes
    FROM audiencias
    WHERE status IN ('agendada', 'confirmada')
      AND date(data_hora) >= date('now')
  `).first();

  return {
    por_status: porStatus.results,
    por_tipo: porTipo.results,
    proxima_semana: proximaSemana?.qtd || 0,
    realizadas_mes: realizadasMes?.qtd || 0,
    acordos_mes: {
      quantidade: acordosMes?.qtd || 0,
      valor_total: acordosMes?.total || 0,
    },
    lembretes_pendentes: {
      d7: (lembretesPendentes?.d7_pendentes as number) || 0,
      d3: (lembretesPendentes?.d3_pendentes as number) || 0,
      d1: (lembretesPendentes?.d1_pendentes as number) || 0,
    },
  };
}

// ============================================
// CONFIRMAR AUDIENCIA (manual pelo advogado)
// ============================================

export async function confirmarAudiencia(env: Env, audienciaId: string): Promise<void> {
  const aud = await env.DB.prepare(`
    SELECT a.id, cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp, a.tipo, a.data_hora, a.local
    FROM audiencias a
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    WHERE a.id = ?
  `).bind(audienciaId).first();

  if (!aud) throw new Error('Audiência não encontrada');

  await env.DB.prepare(
    "UPDATE audiencias SET status = 'confirmada' WHERE id = ?"
  ).bind(audienciaId).run();

  // Notificar cliente
  if (aud.cliente_whatsapp) {
    const wa = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
    await wa.sendMessage({
      number: aud.cliente_whatsapp as string,
      text: [
        `✅ ${aud.cliente_nome}, sua audiência está *CONFIRMADA*!`,
        ``,
        `📋 Tipo: ${aud.tipo}`,
        `📅 Data: ${formatarDataHora(aud.data_hora as string)}`,
        `📍 Local: ${aud.local || 'A confirmar'}`,
        ``,
        `Lembre-se de chegar com 15 minutos de antecedência.`,
        ``,
        `_Teixeira Brito Advocacia_`,
      ].join('\n'),
    });
  }

  await registrarAtividade(env, audienciaId, 'audiencia_confirmada', `Audiência confirmada`);
}

// ============================================
// UTILS
// ============================================

function formatarDataHora(dataHora: string): string {
  const d = new Date(dataHora);
  const dia = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}

async function registrarNotificacao(
  env: Env, destinatarioId: string, tipo: string, canal: string,
  titulo: string, mensagem: string, referenciaId: string
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO notificacoes (id, destinatario_id, tipo, canal, titulo, mensagem, enviada, lida, referencia_tipo, referencia_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'audiencia', ?, ?)
  `).bind(generateId(), destinatarioId, tipo, canal, titulo, mensagem, referenciaId, now()).run();
}

async function registrarAtividade(env: Env, referenciaId: string, acao: string, descricao: string): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO atividades_log (id, usuario_id, acao, entidade_tipo, entidade_id, detalhes, created_at)
    VALUES (?, NULL, ?, 'audiencia', ?, ?, ?)
  `).bind(generateId(), acao, referenciaId, descricao, now()).run();
}
