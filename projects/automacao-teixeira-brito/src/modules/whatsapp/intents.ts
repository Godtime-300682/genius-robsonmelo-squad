// ============================================
// INTENTS - Classificação e Handlers de Intenção
// Chatbot WhatsApp Teixeira Brito
// ============================================

import type { Env } from '../../shared/types';
import { WhatsAppClient } from '../../integrations/whatsapp';
import { OpenAIClient } from '../../integrations/openai';
import { now } from '../../shared/utils';

export type IntentType = 'ANDAMENTO' | 'DOCUMENTO' | 'PAGAMENTO' | 'AGENDAMENTO' | 'RECLAMACAO' | 'SAUDACAO' | 'OUTRO';

export interface ClienteContexto {
  id: string;
  nome: string;
  status: string;
  advogado_id: string | null;
  advogado_nome: string | null;
  caso_id: string | null;
  caso_status: string | null;
  numero_processo: string | null;
  area_direito: string | null;
}

export interface IntentResult {
  resposta: string;
  escalado: boolean;
  escalado_para: string | null;
  tipo: IntentType;
  dados_extras?: Record<string, unknown>;
}

// ============================================
// HANDLER: ANDAMENTO DO PROCESSO
// ============================================
export async function handleAndamento(
  env: Env,
  cliente: ClienteContexto,
  mensagem: string,
): Promise<IntentResult> {
  if (!cliente.caso_id) {
    return {
      resposta: `Olá, ${cliente.nome.split(' ')[0]}! No momento não encontramos um processo ativo vinculado ao seu cadastro. Caso tenha dúvidas, um de nossos advogados entrará em contato.\n\n_Teixeira Brito Advocacia_`,
      escalado: false,
      escalado_para: null,
      tipo: 'ANDAMENTO',
    };
  }

  // Buscar detalhes do caso e últimos prazos
  const [caso, prazos, ultimaAtividade] = await Promise.all([
    env.DB.prepare(`
      SELECT tipo, area_direito, status, fase_pipeline, comarca, vara, observacoes
      FROM casos WHERE id = ?
    `).bind(cliente.caso_id).first(),
    env.DB.prepare(`
      SELECT tipo, descricao, data_prazo, status
      FROM prazos WHERE caso_id = ? AND status != 'concluido'
      ORDER BY data_prazo ASC LIMIT 3
    `).bind(cliente.caso_id).all(),
    env.DB.prepare(`
      SELECT acao, descricao, created_at
      FROM atividades_log WHERE caso_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(cliente.caso_id).first(),
  ]);

  const statusTexto = caso?.fase_pipeline || caso?.status || 'em análise';
  const prazosTexto = prazos.results.length > 0
    ? prazos.results.map((p) => `• ${p.tipo}: ${p.descricao} (${p.data_prazo})`).join('\n')
    : 'Nenhum prazo pendente no momento.';
  const ultimaAcao = ultimaAtividade
    ? `Última movimentação: ${ultimaAtividade.descricao} em ${ultimaAtividade.created_at}`
    : '';

  const resposta = `Olá, ${cliente.nome.split(' ')[0]}! Segue o andamento do seu caso:\n\n` +
    `📋 *Processo:* ${cliente.numero_processo || 'Em fase inicial'}\n` +
    `📌 *Status:* ${statusTexto}\n` +
    `⚖️ *Área:* ${cliente.area_direito || ''}\n` +
    `🏛️ *Comarca/Vara:* ${caso?.comarca || ''} ${caso?.vara ? `- ${caso.vara}` : ''}\n\n` +
    `📅 *Próximos prazos:*\n${prazosTexto}\n\n` +
    `${ultimaAcao}\n\n` +
    `Precisa de mais informações? Responda aqui ou entre em contato com seu advogado.\n\n_Teixeira Brito Advocacia_`;

  return {
    resposta,
    escalado: false,
    escalado_para: null,
    tipo: 'ANDAMENTO',
    dados_extras: { caso_status: statusTexto, prazos_pendentes: prazos.results.length },
  };
}

// ============================================
// HANDLER: RECEBIMENTO DE DOCUMENTO
// ============================================
export async function handleDocumento(
  env: Env,
  cliente: ClienteContexto,
  mensagem: string,
): Promise<IntentResult> {
  // Verificar se há documentos pendentes
  const docsPendentes = await env.DB.prepare(`
    SELECT tipo, nome FROM documentos
    WHERE caso_id = ? AND status_assinatura IN ('pendente', 'aguardando')
    ORDER BY created_at DESC
  `).bind(cliente.caso_id || '').all();

  if (docsPendentes.results.length > 0) {
    const listaDocsPendentes = docsPendentes.results
      .map((d) => `• ${d.nome || d.tipo}`)
      .join('\n');

    return {
      resposta: `Olá, ${cliente.nome.split(' ')[0]}! 📄\n\n` +
        `Obrigado por enviar o documento. Nossa equipe vai analisar e confirmar o recebimento.\n\n` +
        `Documentos ainda pendentes:\n${listaDocsPendentes}\n\n` +
        `Por favor, envie os documentos restantes para agilizar seu processo.\n\n_Teixeira Brito Advocacia_`,
      escalado: false,
      escalado_para: null,
      tipo: 'DOCUMENTO',
      dados_extras: { docs_pendentes: docsPendentes.results.length },
    };
  }

  return {
    resposta: `Olá, ${cliente.nome.split(' ')[0]}! 📄\n\nRecebemos sua mensagem sobre documentos. ` +
      `Vou encaminhar para a equipe responsável que fará a conferência.\n\n` +
      `Se precisar enviar algum arquivo, pode mandar diretamente aqui nesta conversa.\n\n_Teixeira Brito Advocacia_`,
    escalado: true,
    escalado_para: cliente.advogado_id,
    tipo: 'DOCUMENTO',
  };
}

// ============================================
// HANDLER: DÚVIDA DE PAGAMENTO
// ============================================
export async function handlePagamento(
  env: Env,
  cliente: ClienteContexto,
  mensagem: string,
): Promise<IntentResult> {
  // Buscar cobranças do cliente
  const cobrancas = await env.DB.prepare(`
    SELECT valor, data_vencimento, status, descricao
    FROM cobrancas WHERE cliente_id = ? AND status IN ('pendente', 'vencido', 'atrasado')
    ORDER BY data_vencimento ASC
  `).bind(cliente.id).all();

  if (cobrancas.results.length === 0) {
    return {
      resposta: `Olá, ${cliente.nome.split(' ')[0]}! 💰\n\n` +
        `Verificamos e no momento não há cobranças pendentes em seu nome. ` +
        `Se recebeu algum boleto ou tem dúvidas sobre valores, por favor nos informe para verificarmos.\n\n_Teixeira Brito Advocacia_`,
      escalado: false,
      escalado_para: null,
      tipo: 'PAGAMENTO',
    };
  }

  const listaCobrancas = cobrancas.results.map((c) => {
    const status = c.status === 'vencido' || c.status === 'atrasado' ? '⚠️ VENCIDO' : '🟢 A vencer';
    return `• R$ ${(c.valor as number).toFixed(2)} - Venc: ${c.data_vencimento} (${status})`;
  }).join('\n');

  const totalPendente = cobrancas.results.reduce((sum, c) => sum + (c.valor as number), 0);

  return {
    resposta: `Olá, ${cliente.nome.split(' ')[0]}! 💰\n\n` +
      `Segue a situação financeira do seu caso:\n\n${listaCobrancas}\n\n` +
      `💵 *Total pendente:* R$ ${totalPendente.toFixed(2)}\n\n` +
      `Para solicitar 2ª via do boleto ou negociar condições, entre em contato com nosso setor financeiro ` +
      `ou responda esta mensagem.\n\n_Teixeira Brito Advocacia_`,
    escalado: true,
    escalado_para: cliente.advogado_id,
    tipo: 'PAGAMENTO',
    dados_extras: { total_pendente: totalPendente, qtd_cobrancas: cobrancas.results.length },
  };
}

// ============================================
// HANDLER: AGENDAMENTO
// ============================================
export async function handleAgendamento(
  env: Env,
  cliente: ClienteContexto,
  mensagem: string,
): Promise<IntentResult> {
  // Buscar próximas audiências
  const audiencias = await env.DB.prepare(`
    SELECT tipo, data_audiencia, hora, local, status
    FROM audiencias
    WHERE caso_id = ? AND status != 'realizada' AND data_audiencia >= date('now')
    ORDER BY data_audiencia ASC LIMIT 3
  `).bind(cliente.caso_id || '').all();

  let textoAudiencias = '';
  if (audiencias.results.length > 0) {
    textoAudiencias = '\n\n📅 *Audiências agendadas:*\n' +
      audiencias.results.map((a) =>
        `• ${a.tipo} - ${a.data_audiencia} às ${a.hora || 'horário a confirmar'} - ${a.local || 'local a confirmar'}`
      ).join('\n');
  }

  return {
    resposta: `Olá, ${cliente.nome.split(' ')[0]}! 📅\n\n` +
      `Para agendar uma reunião com seu advogado, preciso de algumas informações:\n\n` +
      `1️⃣ Qual o assunto da reunião?\n` +
      `2️⃣ Qual sua preferência de horário? (manhã/tarde)\n` +
      `3️⃣ Presencial ou por videochamada?\n\n` +
      `Vou encaminhar sua solicitação para agendamento.${textoAudiencias}\n\n_Teixeira Brito Advocacia_`,
    escalado: true,
    escalado_para: cliente.advogado_id,
    tipo: 'AGENDAMENTO',
  };
}

// ============================================
// HANDLER: RECLAMAÇÃO (sempre escala)
// ============================================
export async function handleReclamacao(
  env: Env,
  cliente: ClienteContexto,
  mensagem: string,
): Promise<IntentResult> {
  // Registrar notificação de urgência
  const notifId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await env.DB.prepare(`
    INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, prioridade, created_at)
    VALUES (?, ?, 'reclamacao', ?, ?, 'critica', ?)
  `).bind(
    notifId,
    cliente.advogado_id || 'admin',
    `Reclamação de ${cliente.nome}`,
    `Cliente ${cliente.nome} enviou reclamação via WhatsApp: "${mensagem.substring(0, 200)}"`,
    now(),
  ).run();

  return {
    resposta: `Olá, ${cliente.nome.split(' ')[0]}.\n\n` +
      `Lamentamos que esteja tendo uma experiência insatisfatória. ` +
      `Sua mensagem foi encaminhada diretamente ao advogado responsável e à coordenação do escritório.\n\n` +
      `Entraremos em contato em até *2 horas* para resolver sua situação.\n\n` +
      `Se preferir, pode ligar diretamente para nosso escritório.\n\n_Teixeira Brito Advocacia_`,
    escalado: true,
    escalado_para: cliente.advogado_id,
    tipo: 'RECLAMACAO',
    dados_extras: { notificacao_id: notifId, prioridade: 'critica' },
  };
}

// ============================================
// HANDLER: SAUDAÇÃO
// ============================================
export function handleSaudacao(cliente: ClienteContexto): IntentResult {
  return {
    resposta: `Olá, ${cliente.nome.split(' ')[0]}! 👋\n\n` +
      `Bem-vindo(a) ao atendimento virtual da *Teixeira Brito Advocacia*.\n\n` +
      `Como posso ajudar? Escolha uma opção:\n\n` +
      `1️⃣ Andamento do processo\n` +
      `2️⃣ Enviar documento\n` +
      `3️⃣ Dúvida sobre pagamento\n` +
      `4️⃣ Agendar reunião\n` +
      `5️⃣ Falar com advogado\n\n` +
      `Digite o número da opção ou escreva sua dúvida.\n\n_Teixeira Brito Advocacia_`,
    escalado: false,
    escalado_para: null,
    tipo: 'SAUDACAO',
  };
}

// ============================================
// HANDLER: OUTRO (resposta genérica com IA)
// ============================================
export async function handleOutro(
  env: Env,
  cliente: ClienteContexto,
  mensagem: string,
): Promise<IntentResult> {
  const openai = new OpenAIClient(env.OPENAI_API_KEY);

  const contexto = `Cliente: ${cliente.nome}. ` +
    `Status: ${cliente.status}. ` +
    `${cliente.caso_id ? `Caso ativo na área de ${cliente.area_direito || 'não especificada'}. Status do caso: ${cliente.caso_status || 'em andamento'}.` : 'Sem caso ativo.'}`;

  const respostaIA = await openai.gerarRespostaCliente(mensagem, contexto);

  return {
    resposta: respostaIA + '\n\n_Teixeira Brito Advocacia_',
    escalado: false,
    escalado_para: null,
    tipo: 'OUTRO',
  };
}

// ============================================
// HANDLER: CLIENTE NÃO ENCONTRADO
// ============================================
export function handleClienteDesconhecido(): IntentResult {
  return {
    resposta: `Olá! 👋\n\n` +
      `Bem-vindo(a) à *Teixeira Brito Advocacia*.\n\n` +
      `Não encontramos seu cadastro em nosso sistema. Para que possamos ajudá-lo(a), por favor informe:\n\n` +
      `📝 Nome completo\n` +
      `📝 CPF\n\n` +
      `Ou se preferir, você pode agendar uma consulta respondendo *"agendar consulta"*.\n\n_Teixeira Brito Advocacia_`,
    escalado: false,
    escalado_para: null,
    tipo: 'OUTRO',
  };
}

// ============================================
// CLASSIFICAÇÃO POR MENU NUMÉRICO
// ============================================
export function classificarPorMenu(mensagem: string): IntentType | null {
  const msg = mensagem.trim();
  if (msg === '1') return 'ANDAMENTO';
  if (msg === '2') return 'DOCUMENTO';
  if (msg === '3') return 'PAGAMENTO';
  if (msg === '4') return 'AGENDAMENTO';
  if (msg === '5') return 'RECLAMACAO'; // "falar com advogado" = escala
  return null;
}

// ============================================
// CLASSIFICAÇÃO POR PALAVRAS-CHAVE (fallback rápido)
// ============================================
export function classificarPorPalavrasChave(mensagem: string): IntentType | null {
  const msg = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Saudações
  if (/^(oi|ola|bom dia|boa tarde|boa noite|hey|hi|hello|eae|e ai)\b/.test(msg)) return 'SAUDACAO';

  // Andamento
  if (/\b(andamento|processo|como esta|situacao|status|novidade|despacho|sentenca|intimacao)\b/.test(msg)) return 'ANDAMENTO';

  // Documento
  if (/\b(documento|enviar|anexo|comprovante|certidao|contrato|procuracao|rg|cpf|cnh)\b/.test(msg)) return 'DOCUMENTO';

  // Pagamento
  if (/\b(pagar|pagamento|boleto|honorario|valor|parcela|vencimento|pix|financeiro|cobran)\b/.test(msg)) return 'PAGAMENTO';

  // Agendamento
  if (/\b(agendar|agenda|reuniao|horario|marcar|consulta|atendimento presencial)\b/.test(msg)) return 'AGENDAMENTO';

  // Reclamação
  if (/\b(reclamacao|insatisf|problema|demora|absurdo|pessimo|nao resolve|abandono|ninguem)\b/.test(msg)) return 'RECLAMACAO';

  return null;
}
