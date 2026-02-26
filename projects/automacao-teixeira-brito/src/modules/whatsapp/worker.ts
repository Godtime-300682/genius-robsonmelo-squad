// ============================================
// MODULO WHATSAPP - Teixeira Brito Automacao IA
// Atendimento automatizado via WhatsApp
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const whatsappRoutes = new Hono<HonoEnv>();

// POST /webhook - Receber mensagem do WhatsApp (webhook)
whatsappRoutes.post('/webhook', async (c) => {
  const body = await c.req.json<{
    from: string;
    message: string;
    timestamp?: string;
    message_id?: string;
  }>();

  const telefone = body.from.replace(/\D/g, '');

  // Buscar cliente pelo WhatsApp
  const cliente = await c.env.DB.prepare(`
    SELECT cl.id, cl.nome, cl.status, cl.advogado_responsavel_id,
           ca.id AS caso_id, ca.status AS caso_status, ca.numero_processo
    FROM clientes cl
    LEFT JOIN casos ca ON ca.cliente_id = cl.id AND ca.status NOT IN ('concluido', 'arquivado')
    WHERE cl.whatsapp LIKE ? OR cl.telefone LIKE ?
    ORDER BY ca.created_at DESC
    LIMIT 1
  `).bind(`%${telefone}%`, `%${telefone}%`).first();

  // Classificar tipo de atendimento via palavras-chave
  const msg = body.message.toLowerCase();
  let tipo = 'outro';
  if (msg.includes('andamento') || msg.includes('processo') || msg.includes('como esta')) {
    tipo = 'duvida_andamento';
  } else if (msg.includes('documento') || msg.includes('enviar') || msg.includes('anexo')) {
    tipo = 'envio_documento';
  } else if (msg.includes('pagar') || msg.includes('boleto') || msg.includes('honorario') || msg.includes('valor')) {
    tipo = 'duvida_pagamento';
  } else if (msg.includes('agendar') || msg.includes('reuniao') || msg.includes('horario')) {
    tipo = 'agendamento';
  } else if (msg.includes('reclamacao') || msg.includes('insatisf') || msg.includes('problema')) {
    tipo = 'reclamacao';
  }

  const id = generateId();
  const escalado = tipo === 'reclamacao' || !cliente;

  await c.env.DB.prepare(`
    INSERT INTO atendimentos (id, cliente_id, caso_id, canal, tipo, mensagem, respondido_por, escalado, escalado_para, created_at)
    VALUES (?, ?, ?, 'whatsapp', ?, ?, 'ia', ?, ?, ?)
  `).bind(
    id,
    cliente?.id ?? 'desconhecido',
    cliente?.caso_id ?? null,
    tipo,
    body.message,
    escalado ? 1 : 0,
    escalado ? (cliente?.advogado_responsavel_id ?? null) : null,
    now(),
  ).run();

  // Gerar resposta automatica baseada no tipo
  let resposta = '';
  if (!cliente) {
    resposta = 'Ola! Nao encontramos seu cadastro em nosso sistema. Por favor, informe seu nome completo e CPF para que possamos ajuda-lo.';
  } else if (tipo === 'duvida_andamento' && cliente.caso_id) {
    resposta = `Ola, ${(cliente.nome as string).split(' ')[0]}! Seu processo ${cliente.numero_processo ?? ''} esta com status: ${cliente.caso_status}. Para mais detalhes, seu advogado entrara em contato em breve.`;
  } else if (tipo === 'duvida_pagamento') {
    resposta = `Ola, ${(cliente.nome as string).split(' ')[0]}! Vou verificar a situacao financeira do seu caso e retorno em instantes.`;
  } else if (tipo === 'reclamacao') {
    resposta = `Ola, ${(cliente.nome as string).split(' ')[0]}! Lamentamos o ocorrido. Sua mensagem foi encaminhada para o advogado responsavel que entrara em contato em breve.`;
  } else {
    resposta = `Ola, ${cliente ? (cliente.nome as string).split(' ')[0] : ''}! Recebemos sua mensagem e estamos analisando. Retornaremos em breve.`;
  }

  // Atualizar atendimento com resposta
  await c.env.DB.prepare(`
    UPDATE atendimentos SET resposta = ? WHERE id = ?
  `).bind(resposta, id).run();

  return c.json({
    success: true,
    data: {
      atendimento_id: id,
      resposta,
      escalado,
      tipo,
      cliente_encontrado: !!cliente,
    },
  });
});

// POST /send - Enviar mensagem via WhatsApp
whatsappRoutes.post('/send', async (c) => {
  const body = await c.req.json<{
    cliente_id: string;
    mensagem: string;
    caso_id?: string;
  }>();

  // Buscar dados do cliente
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

  // Registrar atendimento de saida
  const id = generateId();
  await c.env.DB.prepare(`
    INSERT INTO atendimentos (id, cliente_id, caso_id, canal, tipo, mensagem, respondido_por, created_at)
    VALUES (?, ?, ?, 'whatsapp', 'outro', ?, 'humano', ?)
  `).bind(id, body.cliente_id, body.caso_id ?? null, body.mensagem, now()).run();

  // Aqui integraria com a API do WhatsApp (Evolution API / Z-API)
  // Por enquanto, retorna sucesso simulado
  return c.json({
    success: true,
    data: {
      atendimento_id: id,
      destinatario: telefone,
      status: 'enviado',
    },
  });
});

// GET /atendimentos - Listar atendimentos WhatsApp
whatsappRoutes.get('/atendimentos', async (c) => {
  const clienteId = c.req.query('cliente_id');
  const escalado = c.req.query('escalado');
  const respondidoPor = c.req.query('respondido_por');
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

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM atendimentos WHERE canal = 'whatsapp'`
  ).first();

  return c.json({
    success: true,
    data: result.results,
    meta: { page, limit, total: countResult?.total ?? 0 },
  });
});
