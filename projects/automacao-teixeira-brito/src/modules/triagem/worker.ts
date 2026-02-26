// ============================================
// MODULO TRIAGEM - Teixeira Brito Automacao IA
// Gestao de triagem de casos juridicos
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const triagemRoutes = new Hono<HonoEnv>();

// POST / - Criar triagem (novo caso em fase triagem)
triagemRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    cliente_id: string;
    tipo: string;
    area_direito: string;
    numero_processo?: string;
    valor_causa?: number;
    comarca?: string;
    vara?: string;
    parte_contraria?: string;
    observacoes?: string;
  }>();

  const id = generateId();
  const timestamp = now();

  await c.env.DB.prepare(`
    INSERT INTO casos (id, cliente_id, numero_processo, tipo, area_direito, status, fase_pipeline, advogado_id, valor_causa, comarca, vara, parte_contraria, observacoes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'triagem', 'triagem', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.cliente_id,
    body.numero_processo ?? null,
    body.tipo,
    body.area_direito,
    user.sub,
    body.valor_causa ?? null,
    body.comarca ?? null,
    body.vara ?? null,
    body.parte_contraria ?? null,
    body.observacoes ?? null,
    timestamp,
    timestamp,
  ).run();

  // Atualizar status do cliente para triagem
  await c.env.DB.prepare(`
    UPDATE clientes SET status = 'triagem', updated_at = ? WHERE id = ?
  `).bind(timestamp, body.cliente_id).run();

  return c.json({ success: true, data: { id, status: 'triagem', fase_pipeline: 'triagem' } }, 201);
});

// GET /:id - Buscar triagem/caso por ID
triagemRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const caso = await c.env.DB.prepare(`
    SELECT c.*, cl.nome AS cliente_nome, cl.cpf_cnpj, cl.telefone, cl.whatsapp, cl.email AS cliente_email,
           u.nome AS advogado_nome
    FROM casos c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN usuarios u ON u.id = c.advogado_id
    WHERE c.id = ? AND c.status = 'triagem'
  `).bind(id).first();

  if (!caso) {
    return c.json({ success: false, error: 'Triagem nao encontrada' }, 404);
  }

  // Buscar documentos pendentes
  const docs = await c.env.DB.prepare(`
    SELECT id, tipo, nome, status_assinatura, gerado_por_ia FROM documentos WHERE caso_id = ?
  `).bind(id).all();

  return c.json({ success: true, data: { ...caso, documentos: docs.results } });
});

// GET / - Listar todos os casos em triagem
triagemRoutes.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status') || 'triagem';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT c.id, c.tipo, c.area_direito, c.status, c.fase_pipeline, c.created_at,
           cl.nome AS cliente_nome, cl.telefone, cl.whatsapp,
           u.nome AS advogado_nome
    FROM casos c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN usuarios u ON u.id = c.advogado_id
    WHERE c.status = ?
  `;
  const params: string[] = [status];

  // Se nao for admin/coordenador, filtrar apenas do advogado
  if (user.role === 'advogado') {
    query += ' AND c.advogado_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query)
    .bind(...params, limit, offset)
    .all();

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM casos WHERE status = ?`
  ).bind(status).first();

  return c.json({
    success: true,
    data: result.results,
    meta: { page, limit, total: countResult?.total ?? 0 },
  });
});

// PATCH /:id/status - Atualizar status da triagem (aprovar/rejeitar)
triagemRoutes.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status, fase_pipeline, observacoes } = await c.req.json<{
    status: string;
    fase_pipeline?: string;
    observacoes?: string;
  }>();

  const timestamp = now();

  const caso = await c.env.DB.prepare('SELECT id, cliente_id FROM casos WHERE id = ?').bind(id).first();
  if (!caso) {
    return c.json({ success: false, error: 'Caso nao encontrado' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE casos SET status = ?, fase_pipeline = COALESCE(?, fase_pipeline), observacoes = COALESCE(?, observacoes), updated_at = ?
    WHERE id = ?
  `).bind(status, fase_pipeline ?? null, observacoes ?? null, timestamp, id).run();

  // Se aprovado (iniciais), atualizar cliente para ativo
  if (status === 'iniciais') {
    await c.env.DB.prepare(`
      UPDATE clientes SET status = 'ativo', updated_at = ? WHERE id = ?
    `).bind(timestamp, caso.cliente_id as string).run();
  }

  return c.json({ success: true, data: { id, status, fase_pipeline: fase_pipeline ?? status } });
});
