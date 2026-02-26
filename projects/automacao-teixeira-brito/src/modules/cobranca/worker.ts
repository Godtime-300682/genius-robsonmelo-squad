// ============================================
// MODULO COBRANCA - Teixeira Brito Automacao IA
// Gestao de cobrancas e inadimplencia
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const cobrancaRoutes = new Hono<HonoEnv>();

// POST / - Criar cobranca
cobrancaRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    cliente_id: string;
    caso_id: string;
    tipo: string;
    valor: number;
    data_vencimento: string;
  }>();

  const id = generateId();

  await c.env.DB.prepare(`
    INSERT INTO cobrancas (id, cliente_id, caso_id, tipo, valor, data_vencimento, status, sequencia_cobranca, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'a_vencer', 0, ?)
  `).bind(
    id,
    body.cliente_id,
    body.caso_id,
    body.tipo,
    body.valor,
    body.data_vencimento,
    now(),
  ).run();

  return c.json({ success: true, data: { id, status: 'a_vencer' } }, 201);
});

// GET / - Listar cobrancas
cobrancaRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const clienteId = c.req.query('cliente_id');
  const casoId = c.req.query('caso_id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT co.*, cl.nome AS cliente_nome, cl.whatsapp, cl.email AS cliente_email,
           ca.numero_processo, ca.tipo AS caso_tipo
    FROM cobrancas co
    LEFT JOIN clientes cl ON cl.id = co.cliente_id
    LEFT JOIN casos ca ON ca.id = co.caso_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND co.status = ?';
    params.push(status);
  }
  if (clienteId) {
    query += ' AND co.cliente_id = ?';
    params.push(clienteId);
  }
  if (casoId) {
    query += ' AND co.caso_id = ?';
    params.push(casoId);
  }

  query += ' ORDER BY co.data_vencimento ASC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

  return c.json({ success: true, data: result.results, meta: { page, limit } });
});

// GET /inadimplentes - Listar cobrancas vencidas (inadimplentes)
cobrancaRoutes.get('/inadimplentes', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT co.id, co.tipo, co.valor, co.data_vencimento, co.status, co.sequencia_cobranca,
           co.ultima_cobranca_em,
           cl.id AS cliente_id, cl.nome AS cliente_nome, cl.whatsapp, cl.email AS cliente_email, cl.telefone,
           ca.id AS caso_id, ca.numero_processo, ca.tipo AS caso_tipo,
           u.nome AS advogado_nome,
           CAST(julianday('now') - julianday(co.data_vencimento) AS INTEGER) AS dias_vencido
    FROM cobrancas co
    LEFT JOIN clientes cl ON cl.id = co.cliente_id
    LEFT JOIN casos ca ON ca.id = co.caso_id
    LEFT JOIN usuarios u ON u.id = ca.advogado_id
    WHERE co.status IN ('vencido', 'negociando')
    ORDER BY co.data_vencimento ASC
  `).all();

  // Agrupar por cliente
  const porCliente: Record<string, { cliente: Record<string, unknown>; cobrancas: Record<string, unknown>[]; total_devido: number }> = {};
  for (const row of result.results) {
    const cid = row.cliente_id as string;
    if (!porCliente[cid]) {
      porCliente[cid] = {
        cliente: {
          id: row.cliente_id,
          nome: row.cliente_nome,
          whatsapp: row.whatsapp,
          email: row.cliente_email,
          telefone: row.telefone,
        },
        cobrancas: [],
        total_devido: 0,
      };
    }
    porCliente[cid].cobrancas.push(row);
    porCliente[cid].total_devido += row.valor as number;
  }

  return c.json({
    success: true,
    data: Object.values(porCliente),
    meta: {
      total_inadimplentes: Object.keys(porCliente).length,
      total_cobrancas_vencidas: result.results.length,
      valor_total_devido: result.results.reduce((sum, r) => sum + (r.valor as number), 0),
    },
  });
});

// PATCH /:id/pago - Marcar cobranca como paga
cobrancaRoutes.patch('/:id/pago', async (c) => {
  const id = c.req.param('id');
  const timestamp = now();

  const cobranca = await c.env.DB.prepare('SELECT id, cliente_id FROM cobrancas WHERE id = ?').bind(id).first();
  if (!cobranca) {
    return c.json({ success: false, error: 'Cobranca nao encontrada' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE cobrancas SET status = 'pago', pago_em = ? WHERE id = ?
  `).bind(timestamp, id).run();

  return c.json({ success: true, data: { id, status: 'pago', pago_em: timestamp } });
});
