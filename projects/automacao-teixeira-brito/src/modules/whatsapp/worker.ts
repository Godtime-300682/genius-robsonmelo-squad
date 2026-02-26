// ============================================
// MODULO WHATSAPP - Teixeira Brito Automacao IA
// Atendimento automatizado via WhatsApp 24/7
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';
import { processarMensagem, type WebhookPayload } from './chatbot';
import { WhatsAppClient } from '../../integrations/whatsapp';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const whatsappRoutes = new Hono<HonoEnv>();

// ============================================
// POST /webhook - Webhook Evolution API (público, validado por apikey)
// ============================================
whatsappRoutes.post('/webhook', async (c) => {
  // Validar apikey do webhook
  const apiKey = c.req.header('apikey') || c.req.query('apikey');
  if (apiKey && apiKey !== c.env.WHATSAPP_API_KEY) {
    return c.json({ success: false, error: 'API key invalida' }, 401);
  }

  const payload = await c.req.json<WebhookPayload>();

  // Filtrar apenas eventos de mensagem recebida
  if (payload.event !== 'messages.upsert') {
    return c.json({ success: true, message: 'Evento ignorado' });
  }

  try {
    const resultado = await processarMensagem(c.env, payload);

    return c.json({
      success: true,
      data: {
        tipo: resultado.tipo,
        escalado: resultado.escalado,
        cliente_encontrado: resultado.tipo !== 'OUTRO' || !resultado.resposta.includes('Não encontramos'),
      },
    });
  } catch (e) {
    console.error('Erro no webhook WhatsApp:', (e as Error).message);
    return c.json({ success: false, error: 'Erro ao processar mensagem' }, 500);
  }
});

// ============================================
// POST /send - Enviar mensagem (autenticado)
// ============================================
whatsappRoutes.post('/send', async (c) => {
  const body = await c.req.json<{
    cliente_id: string;
    mensagem: string;
    caso_id?: string;
  }>();

  const cliente = await c.env.DB.prepare(`
    SELECT id, nome, whatsapp, telefone FROM clientes WHERE id = ?
  `).bind(body.cliente_id).first();

  if (!cliente) {
    return c.json({ success: false, error: 'Cliente nao encontrado' }, 404);
  }

  const telefone = (cliente.whatsapp || cliente.telefone) as string;
  if (!telefone) {
    return c.json({ success: false, error: 'Cliente sem telefone/whatsapp cadastrado' }, 400);
  }

  // Enviar via Evolution API
  const whatsapp = new WhatsAppClient(c.env.WHATSAPP_API_URL, c.env.WHATSAPP_API_KEY);
  await whatsapp.sendMessage({ number: telefone, text: body.mensagem });

  // Registrar atendimento
  const id = generateId();
  const user = c.get('user');
  await c.env.DB.prepare(`
    INSERT INTO atendimentos (id, cliente_id, caso_id, canal, tipo, mensagem, respondido_por, created_at)
    VALUES (?, ?, ?, 'whatsapp', 'mensagem_enviada', ?, ?, ?)
  `).bind(id, body.cliente_id, body.caso_id ?? null, body.mensagem, user.sub, now()).run();

  return c.json({
    success: true,
    data: { atendimento_id: id, destinatario: telefone, status: 'enviado' },
  });
});

// ============================================
// POST /send-media - Enviar documento/mídia
// ============================================
whatsappRoutes.post('/send-media', async (c) => {
  const body = await c.req.json<{
    cliente_id: string;
    media_url: string;
    media_type: 'image' | 'document' | 'audio' | 'video';
    caption?: string;
    file_name?: string;
  }>();

  const cliente = await c.env.DB.prepare(`
    SELECT id, nome, whatsapp, telefone FROM clientes WHERE id = ?
  `).bind(body.cliente_id).first();

  if (!cliente) {
    return c.json({ success: false, error: 'Cliente nao encontrado' }, 404);
  }

  const telefone = (cliente.whatsapp || cliente.telefone) as string;
  if (!telefone) {
    return c.json({ success: false, error: 'Cliente sem telefone/whatsapp cadastrado' }, 400);
  }

  const whatsapp = new WhatsAppClient(c.env.WHATSAPP_API_URL, c.env.WHATSAPP_API_KEY);
  await whatsapp.sendMedia({
    number: telefone,
    mediaUrl: body.media_url,
    mediaType: body.media_type,
    caption: body.caption,
    fileName: body.file_name,
  });

  return c.json({ success: true, data: { status: 'enviado' } });
});

// ============================================
// GET /atendimentos - Listar atendimentos
// ============================================
whatsappRoutes.get('/atendimentos', async (c) => {
  const clienteId = c.req.query('cliente_id');
  const escalado = c.req.query('escalado');
  const respondidoPor = c.req.query('respondido_por');
  const tipo = c.req.query('tipo');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.*, cl.nome AS cliente_nome, cl.whatsapp,
           u.nome AS escalado_para_nome
    FROM atendimentos a
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = a.escalado_para
    WHERE a.canal = 'whatsapp'
  `;
  const params: (string | number)[] = [];

  if (clienteId) {
    query += ' AND a.cliente_id = ?';
    params.push(clienteId);
  }
  if (escalado === '1') {
    query += ' AND a.escalado = 1';
  }
  if (respondidoPor) {
    query += ' AND a.respondido_por = ?';
    params.push(respondidoPor);
  }
  if (tipo) {
    query += ' AND a.tipo = ?';
    params.push(tipo);
  }

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

  const countQuery = clienteId
    ? `SELECT COUNT(*) as total FROM atendimentos WHERE canal = 'whatsapp' AND cliente_id = ?`
    : `SELECT COUNT(*) as total FROM atendimentos WHERE canal = 'whatsapp'`;
  const countResult = clienteId
    ? await c.env.DB.prepare(countQuery).bind(clienteId).first()
    : await c.env.DB.prepare(countQuery).first();

  return c.json({
    success: true,
    data: result.results,
    meta: { page, limit, total: countResult?.total ?? 0 },
  });
});

// ============================================
// GET /atendimentos/escalados - Listar escalados pendentes
// ============================================
whatsappRoutes.get('/atendimentos/escalados', async (c) => {
  const user = c.get('user');

  let query = `
    SELECT a.id, a.tipo, a.mensagem, a.created_at,
           cl.nome AS cliente_nome, cl.whatsapp,
           ca.numero_processo
    FROM atendimentos a
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN casos ca ON ca.id = a.caso_id
    WHERE a.escalado = 1 AND a.canal = 'whatsapp'
  `;
  const params: string[] = [];

  // Filtrar por advogado se não for admin
  if (user.role === 'advogado') {
    query += ' AND a.escalado_para = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY a.created_at DESC LIMIT 50';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({ success: true, data: result.results });
});

// ============================================
// GET /stats - Estatísticas do chatbot
// ============================================
whatsappRoutes.get('/stats', async (c) => {
  const [totalHoje, porTipo, porRespondido, escalados] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM atendimentos
      WHERE canal = 'whatsapp' AND created_at >= date('now')
    `).first(),
    c.env.DB.prepare(`
      SELECT tipo, COUNT(*) as total FROM atendimentos
      WHERE canal = 'whatsapp' AND created_at >= date('now', '-7 days')
      GROUP BY tipo ORDER BY total DESC
    `).all(),
    c.env.DB.prepare(`
      SELECT respondido_por, COUNT(*) as total FROM atendimentos
      WHERE canal = 'whatsapp' AND created_at >= date('now', '-7 days')
      GROUP BY respondido_por
    `).all(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM atendimentos
      WHERE canal = 'whatsapp' AND escalado = 1 AND created_at >= date('now', '-7 days')
    `).first(),
  ]);

  return c.json({
    success: true,
    data: {
      atendimentos_hoje: totalHoje?.total ?? 0,
      por_tipo: porTipo.results,
      por_respondido: porRespondido.results,
      escalados_semana: escalados?.total ?? 0,
    },
  });
});
