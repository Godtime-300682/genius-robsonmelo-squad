// ============================================
// MODULO COMERCIAL - Teixeira Brito Automacao IA
// Gestao de leads e pipeline comercial
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const comercialRoutes = new Hono<HonoEnv>();

// POST /lead - Criar novo lead
comercialRoutes.post('/lead', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    nome: string;
    telefone: string;
    email?: string;
    tipo_caso?: string;
    urgencia?: string;
    canal_origem?: string;
    briefing_ia?: string;
  }>();

  const id = generateId();

  // Score inicial baseado na urgencia
  let score = 'morno';
  if (body.urgencia === 'alta') {
    score = 'quente';
  } else if (body.urgencia === 'baixa') {
    score = 'frio';
  }

  await c.env.DB.prepare(`
    INSERT INTO leads (id, nome, telefone, email, tipo_caso, urgencia, score, canal_origem, qualificado_por_ia, briefing_ia, closer_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'novo', ?)
  `).bind(
    id,
    body.nome,
    body.telefone,
    body.email ?? null,
    body.tipo_caso ?? null,
    body.urgencia ?? 'media',
    score,
    body.canal_origem ?? 'outro',
    body.briefing_ia ?? null,
    user.role === 'comercial' ? user.sub : null,
    now(),
  ).run();

  return c.json({ success: true, data: { id, score, status: 'novo' } }, 201);
});

// GET /leads - Listar leads
comercialRoutes.get('/leads', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const score = c.req.query('score');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT l.*, u.nome AS closer_nome
    FROM leads l
    LEFT JOIN usuarios u ON u.id = l.closer_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND l.status = ?';
    params.push(status);
  }
  if (score) {
    query += ' AND l.score = ?';
    params.push(score);
  }
  if (user.role === 'comercial') {
    query += ' AND (l.closer_id = ? OR l.closer_id IS NULL)';
    params.push(user.sub);
  }

  query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM leads'
  ).first();

  return c.json({
    success: true,
    data: result.results,
    meta: { page, limit, total: countResult?.total ?? 0 },
  });
});

// GET /leads/quentes - Leads quentes (prioridade de atendimento)
comercialRoutes.get('/leads/quentes', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT l.*, u.nome AS closer_nome,
           CASE
             WHEN l.urgencia = 'alta' AND l.score = 'quente' THEN 1
             WHEN l.urgencia = 'alta' OR l.score = 'quente' THEN 2
             WHEN l.urgencia = 'media' AND l.score = 'morno' THEN 3
             ELSE 4
           END AS prioridade
    FROM leads l
    LEFT JOIN usuarios u ON u.id = l.closer_id
    WHERE l.status IN ('novo', 'qualificado')
      AND l.score IN ('quente', 'morno')
    ORDER BY prioridade ASC, l.created_at ASC
    LIMIT 50
  `).all();

  const quentes = result.results.filter((l: Record<string, unknown>) => l.score === 'quente');
  const mornos = result.results.filter((l: Record<string, unknown>) => l.score === 'morno');

  return c.json({
    success: true,
    data: result.results,
    meta: {
      total: result.results.length,
      quentes: quentes.length,
      mornos: mornos.length,
    },
  });
});

// PATCH /lead/:id/status - Atualizar status do lead
comercialRoutes.patch('/lead/:id/status', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json<{
    status: string;
    score?: string;
    closer_id?: string;
    reuniao_agendada?: string;
    qualificado_por_ia?: boolean;
    briefing_ia?: string;
  }>();

  const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ?').bind(id).first();
  if (!lead) {
    return c.json({ success: false, error: 'Lead nao encontrado' }, 404);
  }

  // Construir update dinamico
  const updates: string[] = ['status = ?'];
  const params: (string | number | null)[] = [body.status];

  if (body.score) {
    updates.push('score = ?');
    params.push(body.score);
  }
  if (body.closer_id) {
    updates.push('closer_id = ?');
    params.push(body.closer_id);
  } else if (body.status === 'qualificado' && !body.closer_id) {
    updates.push('closer_id = ?');
    params.push(user.sub);
  }
  if (body.reuniao_agendada) {
    updates.push('reuniao_agendada = ?');
    params.push(body.reuniao_agendada);
  }
  if (body.qualificado_por_ia !== undefined) {
    updates.push('qualificado_por_ia = ?');
    params.push(body.qualificado_por_ia ? 1 : 0);
  }
  if (body.briefing_ia) {
    updates.push('briefing_ia = ?');
    params.push(body.briefing_ia);
  }

  params.push(id);

  await c.env.DB.prepare(
    `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ success: true, data: { id, status: body.status, score: body.score } });
});
