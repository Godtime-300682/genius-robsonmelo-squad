// ============================================
// CHATBOT WHATSAPP - Teixeira Brito Automação IA
// Motor principal do atendimento 24/7
// ============================================

import type { Env } from '../../shared/types';
import { OpenAIClient } from '../../integrations/openai';
import { WhatsAppClient } from '../../integrations/whatsapp';
import { generateId, now } from '../../shared/utils';
import {
  type IntentType,
  type ClienteContexto,
  type IntentResult,
  classificarPorMenu,
  classificarPorPalavrasChave,
  handleAndamento,
  handleDocumento,
  handlePagamento,
  handleAgendamento,
  handleReclamacao,
  handleSaudacao,
  handleOutro,
  handleClienteDesconhecido,
} from './intents';

// ============================================
// INTERFACE DO WEBHOOK (Evolution API)
// ============================================
export interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { caption?: string; mimetype?: string };
      documentMessage?: { fileName?: string; mimetype?: string; caption?: string };
      audioMessage?: { mimetype?: string };
    };
    messageTimestamp?: number;
    messageType?: string;
  };
}

// ============================================
// EXTRAIR MENSAGEM DO PAYLOAD
// ============================================
function extrairMensagem(payload: WebhookPayload): { texto: string; tipo: string; midia: boolean } {
  const msg = payload.data.message;
  if (!msg) return { texto: '', tipo: 'texto', midia: false };

  if (msg.conversation) {
    return { texto: msg.conversation, tipo: 'texto', midia: false };
  }
  if (msg.extendedTextMessage?.text) {
    return { texto: msg.extendedTextMessage.text, tipo: 'texto', midia: false };
  }
  if (msg.imageMessage) {
    return { texto: msg.imageMessage.caption || '[Imagem enviada]', tipo: 'imagem', midia: true };
  }
  if (msg.documentMessage) {
    return { texto: msg.documentMessage.caption || `[Documento: ${msg.documentMessage.fileName || 'arquivo'}]`, tipo: 'documento', midia: true };
  }
  if (msg.audioMessage) {
    return { texto: '[Áudio enviado]', tipo: 'audio', midia: true };
  }

  return { texto: '', tipo: 'desconhecido', midia: false };
}

// ============================================
// EXTRAIR TELEFONE DO JID
// ============================================
function extrairTelefone(remoteJid: string): string {
  // Format: 5562999999999@s.whatsapp.net
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

// ============================================
// BUSCAR CLIENTE NO D1
// ============================================
async function buscarCliente(env: Env, telefone: string): Promise<ClienteContexto | null> {
  // Normalizar: pegar últimos 11 dígitos (DDD + número)
  const tel = telefone.replace(/\D/g, '');
  const telBusca = tel.length > 11 ? tel.slice(-11) : tel;

  const result = await env.DB.prepare(`
    SELECT
      cl.id, cl.nome, cl.status,
      cl.advogado_responsavel_id AS advogado_id,
      u.nome AS advogado_nome,
      ca.id AS caso_id, ca.status AS caso_status,
      ca.numero_processo, ca.area_direito
    FROM clientes cl
    LEFT JOIN usuarios u ON u.id = cl.advogado_responsavel_id
    LEFT JOIN casos ca ON ca.cliente_id = cl.id AND ca.status NOT IN ('concluido', 'arquivado')
    WHERE cl.whatsapp LIKE ? OR cl.telefone LIKE ?
    ORDER BY ca.created_at DESC
    LIMIT 1
  `).bind(`%${telBusca}%`, `%${telBusca}%`).first();

  if (!result) return null;

  return {
    id: result.id as string,
    nome: result.nome as string,
    status: result.status as string,
    advogado_id: result.advogado_id as string | null,
    advogado_nome: result.advogado_nome as string | null,
    caso_id: result.caso_id as string | null,
    caso_status: result.caso_status as string | null,
    numero_processo: result.numero_processo as string | null,
    area_direito: result.area_direito as string | null,
  };
}

// ============================================
// VERIFICAR SESSÃO (anti-flood + contexto)
// ============================================
interface Sessao {
  ultimaMensagem: number;
  contadorMensagens: number;
  ultimaIntencao: IntentType | null;
}

async function verificarSessao(env: Env, telefone: string): Promise<Sessao> {
  const key = `session:${telefone}`;
  const cached = await env.SESSIONS.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return { ultimaMensagem: 0, contadorMensagens: 0, ultimaIntencao: null };
}

async function atualizarSessao(env: Env, telefone: string, intencao: IntentType): Promise<boolean> {
  const key = `session:${telefone}`;
  const sessao = await verificarSessao(env, telefone);
  const agora = Date.now();

  // Anti-flood: max 10 mensagens por minuto
  if (agora - sessao.ultimaMensagem < 60000) {
    sessao.contadorMensagens++;
    if (sessao.contadorMensagens > 10) {
      return false; // flood detectado
    }
  } else {
    sessao.contadorMensagens = 1;
  }

  sessao.ultimaMensagem = agora;
  sessao.ultimaIntencao = intencao;

  await env.SESSIONS.put(key, JSON.stringify(sessao), { expirationTtl: 3600 }); // 1h TTL
  return true;
}

// ============================================
// CLASSIFICAR INTENÇÃO (3 camadas)
// ============================================
async function classificarIntencao(env: Env, mensagem: string): Promise<IntentType> {
  // Camada 1: Menu numérico (instantâneo)
  const menuIntent = classificarPorMenu(mensagem);
  if (menuIntent) return menuIntent;

  // Camada 2: Palavras-chave (instantâneo)
  const kwIntent = classificarPorPalavrasChave(mensagem);
  if (kwIntent) return kwIntent;

  // Camada 3: GPT-4o-mini (fallback inteligente)
  const openai = new OpenAIClient(env.OPENAI_API_KEY);
  const classificacao = await openai.classificarIntencao(mensagem);
  const intent = classificacao.trim().toUpperCase() as IntentType;

  const validas: IntentType[] = ['ANDAMENTO', 'DOCUMENTO', 'PAGAMENTO', 'AGENDAMENTO', 'RECLAMACAO', 'OUTRO'];
  return validas.includes(intent) ? intent : 'OUTRO';
}

// ============================================
// PROCESSAR MENSAGEM (função principal)
// ============================================
export async function processarMensagem(env: Env, payload: WebhookPayload): Promise<IntentResult> {
  // Ignorar mensagens enviadas por nós
  if (payload.data.key.fromMe) {
    return { resposta: '', escalado: false, escalado_para: null, tipo: 'OUTRO' };
  }

  const telefone = extrairTelefone(payload.data.key.remoteJid);
  const { texto, tipo: tipoMidia, midia } = extrairMensagem(payload);

  // Ignorar mensagens vazias
  if (!texto && !midia) {
    return { resposta: '', escalado: false, escalado_para: null, tipo: 'OUTRO' };
  }

  // Verificar anti-flood
  const sessaoOk = await atualizarSessao(env, telefone, 'OUTRO');
  if (!sessaoOk) {
    return {
      resposta: 'Você está enviando muitas mensagens. Por favor, aguarde um momento e tente novamente.',
      escalado: false,
      escalado_para: null,
      tipo: 'OUTRO',
    };
  }

  // Buscar cliente
  const cliente = await buscarCliente(env, telefone);

  // Cliente não encontrado
  if (!cliente) {
    const resultado = handleClienteDesconhecido();
    await registrarAtendimento(env, 'desconhecido', null, texto, resultado, telefone);
    return resultado;
  }

  // Mídia recebida = tratamento de documento
  if (midia) {
    const resultado = await handleDocumento(env, cliente, texto);
    resultado.dados_extras = { ...resultado.dados_extras, tipo_midia: tipoMidia };
    await registrarAtendimento(env, cliente.id, cliente.caso_id, texto, resultado, telefone);
    return resultado;
  }

  // Classificar intenção
  const intencao = await classificarIntencao(env, texto);
  await atualizarSessao(env, telefone, intencao);

  // Executar handler da intenção
  let resultado: IntentResult;
  switch (intencao) {
    case 'SAUDACAO':
      resultado = handleSaudacao(cliente);
      break;
    case 'ANDAMENTO':
      resultado = await handleAndamento(env, cliente, texto);
      break;
    case 'DOCUMENTO':
      resultado = await handleDocumento(env, cliente, texto);
      break;
    case 'PAGAMENTO':
      resultado = await handlePagamento(env, cliente, texto);
      break;
    case 'AGENDAMENTO':
      resultado = await handleAgendamento(env, cliente, texto);
      break;
    case 'RECLAMACAO':
      resultado = await handleReclamacao(env, cliente, texto);
      break;
    default:
      resultado = await handleOutro(env, cliente, texto);
  }

  // Registrar atendimento no banco
  await registrarAtendimento(env, cliente.id, cliente.caso_id, texto, resultado, telefone);

  // Enviar resposta via WhatsApp
  await enviarResposta(env, telefone, resultado.resposta);

  // Se escalado, notificar advogado
  if (resultado.escalado && resultado.escalado_para) {
    await notificarAdvogado(env, resultado, cliente, texto);
  }

  return resultado;
}

// ============================================
// REGISTRAR ATENDIMENTO NO D1
// ============================================
async function registrarAtendimento(
  env: Env,
  clienteId: string,
  casoId: string | null,
  mensagem: string,
  resultado: IntentResult,
  telefone: string,
): Promise<void> {
  const id = generateId();
  await env.DB.prepare(`
    INSERT INTO atendimentos (id, cliente_id, caso_id, canal, tipo, mensagem, resposta, respondido_por, escalado, escalado_para, created_at)
    VALUES (?, ?, ?, 'whatsapp', ?, ?, ?, 'ia', ?, ?, ?)
  `).bind(
    id,
    clienteId,
    casoId,
    resultado.tipo.toLowerCase(),
    mensagem.substring(0, 1000),
    resultado.resposta.substring(0, 2000),
    resultado.escalado ? 1 : 0,
    resultado.escalado_para,
    now(),
  ).run();
}

// ============================================
// ENVIAR RESPOSTA VIA WHATSAPP
// ============================================
async function enviarResposta(env: Env, telefone: string, mensagem: string): Promise<void> {
  if (!mensagem) return;

  const whatsapp = new WhatsAppClient(
    env.WHATSAPP_API_URL,
    env.WHATSAPP_API_KEY,
  );

  await whatsapp.sendMessage({ number: telefone, text: mensagem });
}

// ============================================
// NOTIFICAR ADVOGADO SOBRE ESCALAÇÃO
// ============================================
async function notificarAdvogado(
  env: Env,
  resultado: IntentResult,
  cliente: ClienteContexto,
  mensagemOriginal: string,
): Promise<void> {
  // Buscar telefone do advogado
  const advogado = await env.DB.prepare(`
    SELECT nome, whatsapp, telefone FROM usuarios WHERE id = ?
  `).bind(resultado.escalado_para!).first();

  if (!advogado) return;

  const telAdvogado = (advogado.whatsapp || advogado.telefone) as string;
  if (!telAdvogado) return;

  const emoji = resultado.tipo === 'RECLAMACAO' ? '🚨' : '📩';
  const notificacao = `${emoji} *Atendimento Escalado*\n\n` +
    `👤 Cliente: ${cliente.nome}\n` +
    `📋 Tipo: ${resultado.tipo}\n` +
    `${cliente.numero_processo ? `📝 Processo: ${cliente.numero_processo}\n` : ''}` +
    `\n💬 Mensagem:\n"${mensagemOriginal.substring(0, 300)}"\n\n` +
    `Responda diretamente ao cliente ou acesse o sistema para mais detalhes.`;

  const whatsapp = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
  await whatsapp.sendMessage({ number: telAdvogado, text: notificacao });
}
