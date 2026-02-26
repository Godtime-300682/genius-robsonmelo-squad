// ============================================
// MODULO DASHBOARD - Teixeira Brito Automacao IA
// Metricas, KPIs e visoes gerenciais
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const dashboardRoutes = new Hono<HonoEnv>();

// GET /pipeline - Casos agrupados por fase do pipeline
dashboardRoutes.get('/pipeline', async (c) => {
  const advogadoId = c.req.query('advogado_id');

  let query = `
    SELECT fase_pipeline, status, COUNT(*) AS total,
           SUM(valor_causa) AS valor_total_causa,
           SUM(valor_honorarios) AS valor_total_honorarios
    FROM casos
    WHERE status NOT IN ('arquivado')
  `;
  const params: string[] = [];

  if (advogadoId) {
    query += ' AND advogado_id = ?';
    params.push(advogadoId);
  }

  query += ' GROUP BY fase_pipeline, status ORDER BY fase_pipeline';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  // Resumo por fase
  const fases = ['comercial', 'triagem', 'iniciais', 'em_andamento', 'audiencia', 'concluido'];
  const pipeline = fases.map((fase) => {
    const rows = result.results.filter((r: Record<string, unknown>) => r.fase_pipeline === fase);
    return {
      fase,
      total: rows.reduce((sum: number, r: Record<string, unknown>) => sum + (r.total as number), 0),
      valor_causa: rows.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.valor_total_causa as number) ?? 0), 0),
      valor_honorarios: rows.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.valor_total_honorarios as number) ?? 0), 0),
    };
  });

  return c.json({ success: true, data: { pipeline, detalhado: result.results } });
});

// GET /kanban - Casos agrupados por setor/advogado
dashboardRoutes.get('/kanban', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT u.nome AS advogado_nome, u.setor, u.id AS advogado_id,
           c.fase_pipeline, COUNT(*) AS total,
           SUM(CASE WHEN c.status = 'triagem' THEN 1 ELSE 0 END) AS em_triagem,
           SUM(CASE WHEN c.status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento,
           SUM(CASE WHEN c.status = 'audiencia' THEN 1 ELSE 0 END) AS em_audiencia
    FROM casos c
    LEFT JOIN usuarios u ON u.id = c.advogado_id
    WHERE c.status NOT IN ('concluido', 'arquivado')
    GROUP BY u.id, u.nome, u.setor, c.fase_pipeline
    ORDER BY u.setor, u.nome, c.fase_pipeline
  `).all();

  // Agrupar por setor
  const porSetor: Record<string, { setor: string; advogados: Record<string, { nome: string; casos: Record<string, unknown>[] }> }> = {};
  for (const row of result.results) {
    const setor = (row.setor as string) || 'Sem setor';
    const advId = row.advogado_id as string;
    if (!porSetor[setor]) {
      porSetor[setor] = { setor, advogados: {} };
    }
    if (!porSetor[setor].advogados[advId]) {
      porSetor[setor].advogados[advId] = { nome: row.advogado_nome as string, casos: [] };
    }
    porSetor[setor].advogados[advId].casos.push(row);
  }

  // Converter para array
  const kanban = Object.values(porSetor).map((s) => ({
    setor: s.setor,
    advogados: Object.values(s.advogados),
  }));

  return c.json({ success: true, data: kanban });
});

// GET /metricas - Metricas gerais do escritorio
dashboardRoutes.get('/metricas', async (c) => {
  const [
    totalCasos,
    casosAtivos,
    prazosVencendo,
    prazosVencidos,
    cobrancasVencidas,
    leadsNovos,
    audienciasProximas,
    atendimentosHoje,
    docsNaoRevisados,
    financeiro,
  ] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS total FROM casos').first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM casos WHERE status NOT IN ('concluido', 'arquivado')").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM prazos WHERE status IN ('pendente', 'em_andamento') AND data_prazo BETWEEN date('now') AND date('now', '+7 days')").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM prazos WHERE status = 'vencido'").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total, SUM(valor) AS valor_total FROM cobrancas WHERE status IN ('vencido', 'negociando')").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM leads WHERE status = 'novo' AND created_at >= date('now', '-7 days')").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM audiencias WHERE status IN ('agendada', 'confirmada') AND data_hora BETWEEN datetime('now') AND datetime('now', '+7 days')").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN respondido_por = 'ia' THEN 1 ELSE 0 END) AS por_ia FROM atendimentos WHERE created_at >= date('now')").first(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM documentos WHERE gerado_por_ia = 1 AND revisado = 0").first(),
    c.env.DB.prepare("SELECT SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) AS recebido, SUM(CASE WHEN status != 'pago' THEN valor ELSE 0 END) AS a_receber FROM cobrancas WHERE data_vencimento >= date('now', '-90 days')").first(),
  ]);

  return c.json({
    success: true,
    data: {
      casos: {
        total: totalCasos?.total ?? 0,
        ativos: casosAtivos?.total ?? 0,
      },
      prazos: {
        vencendo_7_dias: prazosVencendo?.total ?? 0,
        vencidos: prazosVencidos?.total ?? 0,
      },
      cobrancas: {
        inadimplentes: cobrancasVencidas?.total ?? 0,
        valor_inadimplente: cobrancasVencidas?.valor_total ?? 0,
      },
      leads: {
        novos_7_dias: leadsNovos?.total ?? 0,
      },
      audiencias: {
        proximas_7_dias: audienciasProximas?.total ?? 0,
      },
      atendimentos: {
        hoje: atendimentosHoje?.total ?? 0,
        por_ia_hoje: atendimentosHoje?.por_ia ?? 0,
      },
      documentos: {
        pendentes_revisao: docsNaoRevisados?.total ?? 0,
      },
      financeiro: {
        recebido_90_dias: financeiro?.recebido ?? 0,
        a_receber_90_dias: financeiro?.a_receber ?? 0,
      },
    },
  });
});

// GET /alertas - Alertas e notificacoes urgentes
dashboardRoutes.get('/alertas', async (c) => {
  const user = c.get('user');

  const [prazosUrgentes, audienciasAmanha, cobrancasVencidas, leadsQuentes, docsAssinatura] = await Promise.all([
    // Prazos vencendo hoje ou amanha
    c.env.DB.prepare(`
      SELECT p.id, p.descricao, p.data_prazo, p.tipo, p.status,
             ca.numero_processo, cl.nome AS cliente_nome, u.nome AS responsavel_nome
      FROM prazos p
      LEFT JOIN casos ca ON ca.id = p.caso_id
      LEFT JOIN clientes cl ON cl.id = ca.cliente_id
      LEFT JOIN usuarios u ON u.id = p.responsavel_id
      WHERE p.status IN ('pendente', 'em_andamento')
        AND p.data_prazo BETWEEN date('now') AND date('now', '+1 day')
      ORDER BY p.data_prazo ASC
      LIMIT 20
    `).all(),

    // Audiencias nas proximas 48h
    c.env.DB.prepare(`
      SELECT a.id, a.tipo, a.data_hora, a.local, a.status,
             ca.numero_processo, cl.nome AS cliente_nome, u.nome AS advogado_nome
      FROM audiencias a
      LEFT JOIN casos ca ON ca.id = a.caso_id
      LEFT JOIN clientes cl ON cl.id = a.cliente_id
      LEFT JOIN usuarios u ON u.id = a.advogado_id
      WHERE a.status IN ('agendada', 'confirmada')
        AND a.data_hora BETWEEN datetime('now') AND datetime('now', '+2 days')
      ORDER BY a.data_hora ASC
      LIMIT 10
    `).all(),

    // Cobrancas vencidas ha mais de 7 dias
    c.env.DB.prepare(`
      SELECT co.id, co.tipo, co.valor, co.data_vencimento, co.sequencia_cobranca,
             cl.nome AS cliente_nome, cl.whatsapp
      FROM cobrancas co
      LEFT JOIN clientes cl ON cl.id = co.cliente_id
      WHERE co.status = 'vencido'
        AND co.data_vencimento <= date('now', '-7 days')
      ORDER BY co.data_vencimento ASC
      LIMIT 20
    `).all(),

    // Leads quentes sem closer
    c.env.DB.prepare(`
      SELECT id, nome, telefone, tipo_caso, urgencia, created_at
      FROM leads
      WHERE score = 'quente' AND status = 'novo' AND closer_id IS NULL
      ORDER BY created_at ASC
      LIMIT 10
    `).all(),

    // Documentos pendentes de assinatura ha mais de 3 dias
    c.env.DB.prepare(`
      SELECT d.id, d.nome, d.tipo, d.created_at,
             cl.nome AS cliente_nome
      FROM documentos d
      LEFT JOIN clientes cl ON cl.id = d.cliente_id
      WHERE d.status_assinatura = 'pendente'
        AND d.created_at <= datetime('now', '-3 days')
      ORDER BY d.created_at ASC
      LIMIT 10
    `).all(),
  ]);

  const alertas = [
    ...prazosUrgentes.results.map((p: Record<string, unknown>) => ({
      tipo: 'prazo_urgente',
      severidade: 'critico',
      mensagem: `Prazo ${p.tipo}: ${p.descricao} - ${p.cliente_nome} (${p.data_prazo})`,
      referencia_id: p.id,
    })),
    ...audienciasAmanha.results.map((a: Record<string, unknown>) => ({
      tipo: 'audiencia_proxima',
      severidade: 'alto',
      mensagem: `Audiencia de ${a.tipo} - ${a.cliente_nome} em ${a.data_hora} (${a.local})`,
      referencia_id: a.id,
    })),
    ...cobrancasVencidas.results.map((co: Record<string, unknown>) => ({
      tipo: 'cobranca_vencida',
      severidade: 'medio',
      mensagem: `Cobranca de R$ ${(co.valor as number).toFixed(2)} vencida - ${co.cliente_nome}`,
      referencia_id: co.id,
    })),
    ...leadsQuentes.results.map((l: Record<string, unknown>) => ({
      tipo: 'lead_sem_closer',
      severidade: 'medio',
      mensagem: `Lead quente sem closer: ${l.nome} - ${l.tipo_caso}`,
      referencia_id: l.id,
    })),
    ...docsAssinatura.results.map((d: Record<string, unknown>) => ({
      tipo: 'assinatura_pendente',
      severidade: 'baixo',
      mensagem: `Doc pendente de assinatura: ${d.nome} - ${d.cliente_nome}`,
      referencia_id: d.id,
    })),
  ];

  // Ordenar por severidade
  const ordemSeveridade: Record<string, number> = { critico: 0, alto: 1, medio: 2, baixo: 3 };
  alertas.sort((a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade]);

  return c.json({
    success: true,
    data: alertas,
    meta: {
      total: alertas.length,
      criticos: alertas.filter((a) => a.severidade === 'critico').length,
      altos: alertas.filter((a) => a.severidade === 'alto').length,
    },
  });
});

// ============================================
// NOVOS ENDPOINTS - FASE 8 (Dashboard Avançado)
// ============================================

// GET /kpis - KPIs completos do escritório
dashboardRoutes.get('/kpis', async (c) => {
  const { gerarKPIs } = await import('./analytics');
  const kpis = await gerarKPIs(c.env);
  return c.json({ success: true, data: kpis });
});

// GET /advogados - Relatório por advogado
dashboardRoutes.get('/advogados', async (c) => {
  const { relatorioPorAdvogado } = await import('./analytics');
  const relatorio = await relatorioPorAdvogado(c.env);
  return c.json({ success: true, data: relatorio });
});

// GET /financeiro - Relatório financeiro detalhado
dashboardRoutes.get('/financeiro', async (c) => {
  const { relatorioFinanceiro } = await import('./analytics');
  const relatorio = await relatorioFinanceiro(c.env);
  return c.json({ success: true, data: relatorio });
});

// GET /ia - Relatório de produtividade IA
dashboardRoutes.get('/ia', async (c) => {
  const { relatorioIA } = await import('./analytics');
  const relatorio = await relatorioIA(c.env);
  return c.json({ success: true, data: relatorio });
});

// GET /export/:tipo - Exportar relatório em CSV
dashboardRoutes.get('/export/:tipo', async (c) => {
  const tipo = c.req.param('tipo');
  const { exportarRelatorio } = await import('./analytics');

  const csv = await exportarRelatorio(c.env, tipo);

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});

// GET /resumo-diario - Resumo diário para coordenador
dashboardRoutes.get('/resumo-diario', async (c) => {
  const hoje = new Date().toISOString().split('T')[0];

  const [prazosHoje, audienciasHoje, cobrancasHoje, leadsHoje, atendimentosHoje] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END) as vencidos
      FROM prazos
      WHERE data_prazo = ?
    `).bind(hoje).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM audiencias
      WHERE status IN ('agendada','confirmada') AND date(data_hora) = ?
    `).bind(hoje).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as total, SUM(valor) as valor
      FROM cobrancas
      WHERE status = 'a_vencer' AND data_vencimento = ?
    `).bind(hoje).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM leads WHERE date(created_at) = ?
    `).bind(hoje).first(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN respondido_por = 'ia' THEN 1 ELSE 0 END) as ia,
        SUM(CASE WHEN escalado = 1 THEN 1 ELSE 0 END) as escalados
      FROM atendimentos WHERE date(created_at) = ?
    `).bind(hoje).first(),
  ]);

  return c.json({
    success: true,
    data: {
      data: hoje,
      prazos: {
        vencendo_hoje: (prazosHoje?.total as number) || 0,
        vencidos: (prazosHoje?.vencidos as number) || 0,
      },
      audiencias: {
        hoje: (audienciasHoje?.total as number) || 0,
      },
      cobrancas: {
        vencendo_hoje: (cobrancasHoje?.total as number) || 0,
        valor: (cobrancasHoje?.valor as number) || 0,
      },
      leads: {
        novos_hoje: (leadsHoje?.total as number) || 0,
      },
      atendimentos: {
        total: (atendimentosHoje?.total as number) || 0,
        por_ia: (atendimentosHoje?.ia as number) || 0,
        escalados: (atendimentosHoje?.escalados as number) || 0,
      },
    },
  });
});
