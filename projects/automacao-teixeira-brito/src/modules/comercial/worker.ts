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

// ============================================
// NOVOS ENDPOINTS - FASE 6 (Comercial IA)
// ============================================

// POST /qualificar-manual - Executar qualificacao IA manualmente (admin/coordenador)
comercialRoutes.post('/qualificar-manual', async (c) => {
  const user = c.get('user');
  if (!['admin', 'coordenador', 'comercial'].includes(user.role)) {
    return c.json({ success: false, error: 'Sem permissao para qualificacao manual' }, 403);
  }

  const { qualificarLeadsPendentes } = await import('./qualifier');
  const resultado = await qualificarLeadsPendentes(c.env);
  return c.json({ success: true, data: resultado });
});

// POST /lead/:id/qualificar - Qualificar lead especifico via IA
comercialRoutes.post('/lead/:id/qualificar', async (c) => {
  const leadId = c.req.param('id');
  const { qualificarLeadsPendentes } = await import('./qualifier');

  // Marcar como nao qualificado para reprocessar
  await c.env.DB.prepare(
    'UPDATE leads SET qualificado_por_ia = 0, status = ? WHERE id = ?'
  ).bind('novo', leadId).run();

  const resultado = await qualificarLeadsPendentes(c.env);
  return c.json({ success: true, data: resultado });
});

// POST /lead/:id/agendar - Enviar proposta de agendamento via WhatsApp
comercialRoutes.post('/lead/:id/agendar', async (c) => {
  const leadId = c.req.param('id');
  const { enviarPropostaAgendamento } = await import('./qualifier');

  const resultado = await enviarPropostaAgendamento(c.env, leadId);
  return c.json({ success: true, data: resultado });
});

// GET /lead/:id/sugestao-agendamento - Sugerir horarios para agendamento
comercialRoutes.get('/lead/:id/sugestao-agendamento', async (c) => {
  const leadId = c.req.param('id');
  const { sugerirAgendamento } = await import('./qualifier');

  const sugestao = await sugerirAgendamento(c.env, leadId);
  return c.json({ success: true, data: sugestao });
});

// GET /lead/:id/briefing - Gerar briefing pre-reuniao com IA
comercialRoutes.get('/lead/:id/briefing', async (c) => {
  const leadId = c.req.param('id');
  const { gerarBriefingPreReuniao } = await import('./qualifier');

  const briefing = await gerarBriefingPreReuniao(c.env, leadId);
  return c.json({ success: true, data: { briefing } });
});

// POST /lead/:id/converter - Converter lead em cliente + caso
comercialRoutes.post('/lead/:id/converter', async (c) => {
  const leadId = c.req.param('id');
  const body = await c.req.json<{
    cpf_cnpj: string;
    endereco: string;
    tipo_caso: string;
    area_direito: string;
    advogado_id: string;
    valor_causa?: number;
    valor_honorarios?: number;
    numero_processo?: string;
  }>();

  const { converterLeadEmCliente } = await import('./qualifier');
  const resultado = await converterLeadEmCliente(c.env, leadId, body);
  return c.json({ success: true, data: resultado }, 201);
});

// GET /metricas - Metricas completas do comercial
comercialRoutes.get('/metricas', async (c) => {
  const { gerarMetricasComercial } = await import('./qualifier');
  const metricas = await gerarMetricasComercial(c.env);
  return c.json({ success: true, data: metricas });
});

// GET /dashboard - Dashboard resumido do comercial
comercialRoutes.get('/dashboard', async (c) => {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.substring(0, 7) + '-01';

  const [pipeline, scoring, leadsHoje, leadsSemana] = await Promise.all([
    c.env.DB.prepare(`
      SELECT status, COUNT(*) as qtd FROM leads GROUP BY status
    `).all(),
    c.env.DB.prepare(`
      SELECT score, COUNT(*) as qtd FROM leads WHERE status NOT IN ('perdido') GROUP BY score
    `).all(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM leads WHERE created_at >= ?
    `).bind(hoje).first(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as qtd FROM leads WHERE created_at >= ?
    `).bind(inicioMes).first(),
  ]);

  return c.json({
    success: true,
    data: {
      pipeline: pipeline.results,
      scoring: scoring.results,
      leads_hoje: leadsHoje?.qtd || 0,
      leads_mes: leadsSemana?.qtd || 0,
    },
  });
});

// POST /followup-manual - Executar follow-ups manualmente
comercialRoutes.post('/followup-manual', async (c) => {
  const user = c.get('user');
  if (!['admin', 'coordenador', 'comercial'].includes(user.role)) {
    return c.json({ success: false, error: 'Sem permissao' }, 403);
  }

  const { processarFollowUps } = await import('./qualifier');
  const resultado = await processarFollowUps(c.env);
  return c.json({ success: true, data: resultado });
});
