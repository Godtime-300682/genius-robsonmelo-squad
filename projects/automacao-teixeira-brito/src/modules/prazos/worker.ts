// ============================================
// MODULO PRAZOS - Teixeira Brito Automacao IA
// Gestao de prazos processuais
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const prazosRoutes = new Hono<HonoEnv>();

// POST / - Criar prazo
prazosRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    caso_id: string;
    tipo: string;
    descricao: string;
    data_prazo: string;
    data_alerta?: string;
    responsavel_id?: string;
    intimacao_tipo?: string;
    prazo_fatal?: string;
    prazo_revisao?: string;
  }>();

  const id = generateId();
  const responsavelId = body.responsavel_id ?? user.sub;

  await c.env.DB.prepare(`
    INSERT INTO prazos (id, caso_id, tipo, descricao, data_prazo, data_alerta, status, responsavel_id, intimacao_tipo, prazo_fatal, prazo_revisao, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.caso_id,
    body.tipo,
    body.descricao,
    body.data_prazo,
    body.data_alerta ?? null,
    responsavelId,
    body.intimacao_tipo ?? null,
    body.prazo_fatal ?? null,
    body.prazo_revisao ?? null,
    now(),
  ).run();

  return c.json({ success: true, data: { id, status: 'pendente' } }, 201);
});

// GET / - Listar prazos
prazosRoutes.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const casoId = c.req.query('caso_id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, ca.numero_processo, ca.tipo AS caso_tipo,
           cl.nome AS cliente_nome, u.nome AS responsavel_nome
    FROM prazos p
    LEFT JOIN casos ca ON ca.id = p.caso_id
    LEFT JOIN clientes cl ON cl.id = ca.cliente_id
    LEFT JOIN usuarios u ON u.id = p.responsavel_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  if (casoId) {
    query += ' AND p.caso_id = ?';
    params.push(casoId);
  }
  if (user.role === 'advogado') {
    query += ' AND p.responsavel_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY p.data_prazo ASC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query)
    .bind(...params, limit, offset)
    .all();

  return c.json({ success: true, data: result.results, meta: { page, limit } });
});

// GET /vencendo - Prazos vencendo nos proximos 7 dias
prazosRoutes.get('/vencendo', async (c) => {
  const user = c.get('user');

  let query = `
    SELECT p.*, ca.numero_processo, ca.tipo AS caso_tipo,
           cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp,
           u.nome AS responsavel_nome
    FROM prazos p
    LEFT JOIN casos ca ON ca.id = p.caso_id
    LEFT JOIN clientes cl ON cl.id = ca.cliente_id
    LEFT JOIN usuarios u ON u.id = p.responsavel_id
    WHERE p.status IN ('pendente', 'em_andamento')
      AND p.data_prazo BETWEEN date('now') AND date('now', '+7 days')
  `;
  const params: string[] = [];

  if (user.role === 'advogado') {
    query += ' AND p.responsavel_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY p.data_prazo ASC';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  // Separar por urgencia
  const hoje = new Date().toISOString().split('T')[0];
  const prazos = result.results.map((p: Record<string, unknown>) => ({
    ...p,
    dias_restantes: Math.ceil(
      (new Date(p.data_prazo as string).getTime() - new Date(hoje).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return c.json({
    success: true,
    data: prazos,
    meta: {
      total: prazos.length,
      vencendo_hoje: prazos.filter((p: { dias_restantes: number }) => p.dias_restantes === 0).length,
      vencendo_amanha: prazos.filter((p: { dias_restantes: number }) => p.dias_restantes === 1).length,
    },
  });
});

// PATCH /:id/status - Atualizar status do prazo
prazosRoutes.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json<{ status: string }>();

  const prazo = await c.env.DB.prepare('SELECT id FROM prazos WHERE id = ?').bind(id).first();
  if (!prazo) {
    return c.json({ success: false, error: 'Prazo nao encontrado' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE prazos SET status = ? WHERE id = ?
  `).bind(status, id).run();

  return c.json({ success: true, data: { id, status } });
});
