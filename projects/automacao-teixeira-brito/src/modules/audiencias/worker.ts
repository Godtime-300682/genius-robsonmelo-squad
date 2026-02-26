// ============================================
// MODULO AUDIENCIAS - Teixeira Brito Automacao IA
// Gestao de audiencias judiciais
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const audienciasRoutes = new Hono<HonoEnv>();

// POST / - Criar audiencia
audienciasRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    caso_id: string;
    cliente_id: string;
    tipo: string;
    data_hora: string;
    local?: string;
    advogado_id?: string;
  }>();

  const id = generateId();
  const advogadoId = body.advogado_id ?? user.sub;

  await c.env.DB.prepare(`
    INSERT INTO audiencias (id, caso_id, cliente_id, tipo, data_hora, local, advogado_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'agendada', ?)
  `).bind(
    id,
    body.caso_id,
    body.cliente_id,
    body.tipo,
    body.data_hora,
    body.local ?? null,
    advogadoId,
    now(),
  ).run();

  // Criar prazo correspondente
  const prazoId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO prazos (id, caso_id, tipo, descricao, data_prazo, status, responsavel_id, intimacao_tipo, created_at)
    VALUES (?, ?, 'audiencia', ?, ?, 'pendente', ?, 'audiencia', ?)
  `).bind(
    prazoId,
    body.caso_id,
    `Audiencia de ${body.tipo} - ${body.data_hora}`,
    body.data_hora.split('T')[0],
    advogadoId,
    now(),
  ).run();

  return c.json({ success: true, data: { id, prazo_id: prazoId, status: 'agendada' } }, 201);
});

// GET / - Listar audiencias
audienciasRoutes.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const casoId = c.req.query('caso_id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.*, ca.numero_processo, ca.tipo AS caso_tipo,
           cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp,
           u.nome AS advogado_nome
    FROM audiencias a
    LEFT JOIN casos ca ON ca.id = a.caso_id
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = a.advogado_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (casoId) {
    query += ' AND a.caso_id = ?';
    params.push(casoId);
  }
  if (user.role === 'advogado') {
    query += ' AND a.advogado_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY a.data_hora DESC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

  return c.json({ success: true, data: result.results, meta: { page, limit } });
});

// GET /proximas - Audiencias proximas (7 dias)
audienciasRoutes.get('/proximas', async (c) => {
  const user = c.get('user');

  let query = `
    SELECT a.*, ca.numero_processo, ca.tipo AS caso_tipo, ca.parte_contraria,
           cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp, cl.telefone AS cliente_telefone,
           u.nome AS advogado_nome,
           CAST(julianday(a.data_hora) - julianday('now') AS INTEGER) AS dias_restantes
    FROM audiencias a
    LEFT JOIN casos ca ON ca.id = a.caso_id
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = a.advogado_id
    WHERE a.status IN ('agendada', 'confirmada')
      AND a.data_hora BETWEEN datetime('now') AND datetime('now', '+7 days')
  `;
  const params: string[] = [];

  if (user.role === 'advogado') {
    query += ' AND a.advogado_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY a.data_hora ASC';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    success: true,
    data: result.results,
    meta: {
      total: result.results.length,
      lembretes_pendentes: result.results.filter(
        (a: Record<string, unknown>) => !a.lembrete_d1_enviado
      ).length,
    },
  });
});

// PATCH /:id/resultado - Registrar resultado da audiencia
audienciasRoutes.patch('/:id/resultado', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    status: string;
    resultado?: string;
    acordo_valor?: number;
  }>();

  const audiencia = await c.env.DB.prepare(
    'SELECT id, caso_id FROM audiencias WHERE id = ?'
  ).bind(id).first();

  if (!audiencia) {
    return c.json({ success: false, error: 'Audiencia nao encontrada' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE audiencias SET status = ?, resultado = ?, acordo_valor = ? WHERE id = ?
  `).bind(
    body.status,
    body.resultado ?? null,
    body.acordo_valor ?? null,
    id,
  ).run();

  // Se houve acordo, atualizar caso
  if (body.acordo_valor && body.acordo_valor > 0) {
    await c.env.DB.prepare(`
      UPDATE casos SET observacoes = COALESCE(observacoes, '') || ' | Acordo em audiencia: R$ ' || ?, updated_at = ?
      WHERE id = ?
    `).bind(body.acordo_valor.toFixed(2), now(), audiencia.caso_id as string).run();
  }

  return c.json({
    success: true,
    data: { id, status: body.status, resultado: body.resultado, acordo_valor: body.acordo_valor },
  });
});

// ============================================
// NOVOS ENDPOINTS - FASE 7 (Audiências IA)
// ============================================

// POST /lembretes-manual - Executar motor de lembretes manualmente (admin)
audienciasRoutes.post('/lembretes-manual', async (c) => {
  const user = c.get('user');
  if (!['admin', 'coordenador'].includes(user.role)) {
    return c.json({ success: false, error: 'Apenas admin/coordenador' }, 403);
  }

  const { processarLembretesDiarios } = await import('./reminder');
  const resultado = await processarLembretesDiarios(c.env);
  return c.json({ success: true, data: resultado });
});

// PATCH /:id/confirmar - Confirmar audiencia (advogado)
audienciasRoutes.patch('/:id/confirmar', async (c) => {
  const id = c.req.param('id');
  const { confirmarAudiencia } = await import('./reminder');

  await confirmarAudiencia(c.env, id);
  return c.json({ success: true, data: { id, status: 'confirmada' } });
});

// GET /:id/preparacao - Gerar preparacao IA para audiencia
audienciasRoutes.get('/:id/preparacao', async (c) => {
  const id = c.req.param('id');
  const { gerarPreparacaoAudiencia } = await import('./reminder');

  const preparacao = await gerarPreparacaoAudiencia(c.env, id);
  return c.json({ success: true, data: preparacao });
});

// GET /metricas - Metricas de audiencias
audienciasRoutes.get('/metricas', async (c) => {
  const { gerarMetricasAudiencias } = await import('./reminder');
  const metricas = await gerarMetricasAudiencias(c.env);
  return c.json({ success: true, data: metricas });
});

// GET /calendario - Calendario de audiencias (30 dias)
audienciasRoutes.get('/calendario', async (c) => {
  const user = c.get('user');

  let query = `
    SELECT a.id, a.tipo, a.data_hora, a.local, a.status,
           cl.nome AS cliente_nome,
           u.nome AS advogado_nome,
           ca.numero_processo
    FROM audiencias a
    LEFT JOIN clientes cl ON cl.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = a.advogado_id
    LEFT JOIN casos ca ON ca.id = a.caso_id
    WHERE a.status IN ('agendada', 'confirmada')
      AND date(a.data_hora) BETWEEN date('now') AND date('now', '+30 days')
  `;
  const params: string[] = [];

  if (user.role === 'advogado') {
    query += ' AND a.advogado_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY a.data_hora ASC';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  // Agrupar por data
  const porData: Record<string, unknown[]> = {};
  for (const row of result.results) {
    const data = (row.data_hora as string).split('T')[0];
    if (!porData[data]) porData[data] = [];
    porData[data].push(row);
  }

  return c.json({
    success: true,
    data: porData,
    meta: { total: result.results.length, dias_com_audiencia: Object.keys(porData).length },
  });
});

// POST /pos-audiencia-manual - Executar follow-up pos-audiencia manualmente
audienciasRoutes.post('/pos-audiencia-manual', async (c) => {
  const user = c.get('user');
  if (!['admin', 'coordenador'].includes(user.role)) {
    return c.json({ success: false, error: 'Apenas admin/coordenador' }, 403);
  }

  const { processarPosAudiencia } = await import('./reminder');
  const resultado = await processarPosAudiencia(c.env);
  return c.json({ success: true, data: resultado });
});

// GET /dashboard - Dashboard resumido de audiencias
audienciasRoutes.get('/dashboard', async (c) => {
  const hoje = new Date().toISOString().split('T')[0];

  const [hojeDados, semana, pendentes, semResultado] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM audiencias
      WHERE status IN ('agendada', 'confirmada') AND date(data_hora) = ?
    `).bind(hoje).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM audiencias
      WHERE status IN ('agendada', 'confirmada')
        AND date(data_hora) BETWEEN date('now') AND date('now', '+7 days')
    `).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM audiencias
      WHERE status IN ('agendada', 'confirmada')
        AND (lembrete_d7_enviado = 0 OR lembrete_d3_enviado = 0 OR lembrete_d1_enviado = 0)
        AND date(data_hora) BETWEEN date('now') AND date('now', '+8 days')
    `).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM audiencias
      WHERE status IN ('agendada', 'confirmada')
        AND date(data_hora) < date('now')
        AND resultado IS NULL
    `).first(),
  ]);

  return c.json({
    success: true,
    data: {
      audiencias_hoje: hojeDados?.qtd || 0,
      audiencias_semana: semana?.qtd || 0,
      lembretes_pendentes: pendentes?.qtd || 0,
      sem_resultado: semResultado?.qtd || 0,
    },
  });
});
