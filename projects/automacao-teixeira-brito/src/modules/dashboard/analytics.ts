// ============================================
// MOTOR ANALYTICS - Teixeira Brito Automacao IA
// KPIs, relatorios, indicadores financeiros
// ============================================

import type { Env } from '../../shared/types';

// ============================================
// KPIs DO ESCRITORIO
// ============================================

export interface KPIs {
  periodo: string;
  operacional: {
    casos_ativos: number;
    casos_novos_mes: number;
    casos_concluidos_mes: number;
    taxa_resolucao: number;
    tempo_medio_triagem_dias: number;
    prazos_cumpridos: number;
    prazos_perdidos: number;
    taxa_cumprimento_prazos: number;
  };
  financeiro: {
    receita_mes: number;
    receita_trimestre: number;
    honorarios_a_receber: number;
    inadimplencia_total: number;
    taxa_inadimplencia: number;
    ticket_medio: number;
    previsao_receita_proximo_mes: number;
  };
  comercial: {
    leads_mes: number;
    leads_qualificados: number;
    leads_convertidos: number;
    taxa_conversao: number;
    tempo_medio_conversao_dias: number;
    valor_medio_caso_novo: number;
  };
  atendimento: {
    atendimentos_mes: number;
    atendimentos_ia: number;
    atendimentos_humano: number;
    taxa_resolucao_ia: number;
    tempo_medio_resposta_min: number;
    satisfacao_media: number;
  };
  audiencias: {
    realizadas_mes: number;
    acordos_mes: number;
    valor_acordos: number;
    taxa_acordo: number;
    proximas_semana: number;
  };
}

export async function gerarKPIs(env: Env, periodo?: string): Promise<KPIs> {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.substring(0, 7) + '-01';
  const inicioTrimestre = (() => {
    const d = new Date();
    const mes = Math.floor(d.getMonth() / 3) * 3;
    return `${d.getFullYear()}-${String(mes + 1).padStart(2, '0')}-01`;
  })();

  const [
    casosAtivos, casosNovosMes, casosConcluidosMes,
    prazosStatus,
    financeiroMes, financeiroTrimestre, honorariosReceber, inadimplencia,
    leadsMes, leadsConvertidos,
    atendimentosMes,
    audienciasMes, acordosMes, audienciasSemana,
  ] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as t FROM casos WHERE status NOT IN ('concluido','arquivado')").first(),
    env.DB.prepare("SELECT COUNT(*) as t FROM casos WHERE created_at >= ?").bind(inicioMes).first(),
    env.DB.prepare("SELECT COUNT(*) as t FROM casos WHERE status = 'concluido' AND updated_at >= ?").bind(inicioMes).first(),

    env.DB.prepare(`
      SELECT
        SUM(CASE WHEN status = 'concluido' AND data_prazo >= date('now','-30 days') THEN 1 ELSE 0 END) as cumpridos,
        SUM(CASE WHEN status = 'vencido' AND data_prazo >= date('now','-30 days') THEN 1 ELSE 0 END) as perdidos
      FROM prazos
    `).first(),

    env.DB.prepare("SELECT COALESCE(SUM(valor),0) as t FROM cobrancas WHERE status='pago' AND pago_em >= ?").bind(inicioMes).first(),
    env.DB.prepare("SELECT COALESCE(SUM(valor),0) as t FROM cobrancas WHERE status='pago' AND pago_em >= ?").bind(inicioTrimestre).first(),
    env.DB.prepare("SELECT COALESCE(SUM(valor),0) as t FROM cobrancas WHERE status='a_vencer'").first(),
    env.DB.prepare("SELECT COALESCE(SUM(valor),0) as t, COUNT(*) as qtd FROM cobrancas WHERE status IN ('vencido','negociando')").first(),

    env.DB.prepare("SELECT COUNT(*) as t FROM leads WHERE created_at >= ?").bind(inicioMes).first(),
    env.DB.prepare("SELECT COUNT(*) as t FROM leads WHERE status='fechado' AND created_at >= ?").bind(inicioMes).first(),

    env.DB.prepare(`
      SELECT COUNT(*) as t,
        SUM(CASE WHEN respondido_por='ia' THEN 1 ELSE 0 END) as ia,
        SUM(CASE WHEN respondido_por='humano' THEN 1 ELSE 0 END) as humano,
        AVG(satisfacao) as sat
      FROM atendimentos WHERE created_at >= ?
    `).bind(inicioMes).first(),

    env.DB.prepare("SELECT COUNT(*) as t FROM audiencias WHERE status='realizada' AND data_hora >= ?").bind(inicioMes).first(),
    env.DB.prepare("SELECT COUNT(*) as t, COALESCE(SUM(acordo_valor),0) as v FROM audiencias WHERE acordo_valor > 0 AND data_hora >= ?").bind(inicioMes).first(),
    env.DB.prepare("SELECT COUNT(*) as t FROM audiencias WHERE status IN ('agendada','confirmada') AND date(data_hora) BETWEEN date('now') AND date('now','+7 days')").first(),
  ]);

  const cumpridos = (prazosStatus?.cumpridos as number) || 0;
  const perdidos = (prazosStatus?.perdidos as number) || 0;
  const totalPrazos = cumpridos + perdidos;

  const totalCobrancas = ((financeiroMes?.t as number) || 0) + ((inadimplencia?.t as number) || 0);
  const leadsTotal = (leadsMes?.t as number) || 1;
  const leadsConv = (leadsConvertidos?.t as number) || 0;
  const atdTotal = (atendimentosMes?.t as number) || 0;
  const atdIA = (atendimentosMes?.ia as number) || 0;
  const audRealizadas = (audienciasMes?.t as number) || 0;
  const audAcordos = (acordosMes?.t as number) || 0;

  return {
    periodo: `${inicioMes} a ${hoje}`,
    operacional: {
      casos_ativos: (casosAtivos?.t as number) || 0,
      casos_novos_mes: (casosNovosMes?.t as number) || 0,
      casos_concluidos_mes: (casosConcluidosMes?.t as number) || 0,
      taxa_resolucao: (casosNovosMes?.t as number) > 0
        ? Math.round(((casosConcluidosMes?.t as number) || 0) / ((casosNovosMes?.t as number) || 1) * 100) : 0,
      tempo_medio_triagem_dias: 3, // placeholder — calcularia com diff created_at/updated_at
      prazos_cumpridos: cumpridos,
      prazos_perdidos: perdidos,
      taxa_cumprimento_prazos: totalPrazos > 0 ? Math.round((cumpridos / totalPrazos) * 100) : 100,
    },
    financeiro: {
      receita_mes: (financeiroMes?.t as number) || 0,
      receita_trimestre: (financeiroTrimestre?.t as number) || 0,
      honorarios_a_receber: (honorariosReceber?.t as number) || 0,
      inadimplencia_total: (inadimplencia?.t as number) || 0,
      taxa_inadimplencia: totalCobrancas > 0
        ? Math.round(((inadimplencia?.t as number) || 0) / totalCobrancas * 100) : 0,
      ticket_medio: leadsConv > 0
        ? Math.round(((financeiroMes?.t as number) || 0) / leadsConv) : 0,
      previsao_receita_proximo_mes: (honorariosReceber?.t as number) || 0,
    },
    comercial: {
      leads_mes: leadsTotal,
      leads_qualificados: leadsTotal, // simplificado
      leads_convertidos: leadsConv,
      taxa_conversao: Math.round((leadsConv / leadsTotal) * 100),
      tempo_medio_conversao_dias: 7, // placeholder
      valor_medio_caso_novo: leadsConv > 0
        ? Math.round(((financeiroMes?.t as number) || 0) / leadsConv) : 0,
    },
    atendimento: {
      atendimentos_mes: atdTotal,
      atendimentos_ia: atdIA,
      atendimentos_humano: (atendimentosMes?.humano as number) || 0,
      taxa_resolucao_ia: atdTotal > 0 ? Math.round((atdIA / atdTotal) * 100) : 0,
      tempo_medio_resposta_min: 2, // placeholder
      satisfacao_media: (atendimentosMes?.sat as number) || 0,
    },
    audiencias: {
      realizadas_mes: audRealizadas,
      acordos_mes: audAcordos,
      valor_acordos: (acordosMes?.v as number) || 0,
      taxa_acordo: audRealizadas > 0 ? Math.round((audAcordos / audRealizadas) * 100) : 0,
      proximas_semana: (audienciasSemana?.t as number) || 0,
    },
  };
}

// ============================================
// RELATORIO POR ADVOGADO
// ============================================

export async function relatorioPorAdvogado(env: Env): Promise<Record<string, unknown>[]> {
  const inicioMes = new Date().toISOString().substring(0, 7) + '-01';

  const result = await env.DB.prepare(`
    SELECT u.id, u.nome, u.setor,
      COALESCE(SUM(CASE WHEN ca.status NOT IN ('concluido','arquivado') THEN 1 ELSE 0 END), 0) AS casos_ativos,
      COALESCE(SUM(CASE WHEN ca.status = 'concluido' AND ca.updated_at >= ? THEN 1 ELSE 0 END), 0) AS concluidos_mes,
      COALESCE(SUM(ca.valor_honorarios), 0) AS valor_honorarios_total,
      (SELECT COUNT(*) FROM prazos p WHERE p.responsavel_id = u.id AND p.status = 'vencido') AS prazos_vencidos,
      (SELECT COUNT(*) FROM audiencias a WHERE a.advogado_id = u.id AND a.status IN ('agendada','confirmada') AND date(a.data_hora) BETWEEN date('now') AND date('now','+7 days')) AS audiencias_semana,
      (SELECT COUNT(*) FROM leads l WHERE l.closer_id = u.id AND l.status IN ('qualificado','agendado')) AS leads_ativos
    FROM usuarios u
    LEFT JOIN casos ca ON ca.advogado_id = u.id
    WHERE u.role IN ('advogado','coordenador') AND u.ativo = 1
    GROUP BY u.id, u.nome, u.setor
    ORDER BY casos_ativos DESC
  `).bind(inicioMes).all();

  return result.results;
}

// ============================================
// RELATORIO FINANCEIRO DETALHADO
// ============================================

export async function relatorioFinanceiro(env: Env): Promise<Record<string, unknown>> {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.substring(0, 7) + '-01';

  const [receitaMensal, porTipo, porStatus, top10Devedores, previsao] = await Promise.all([
    // Receita dos últimos 6 meses
    env.DB.prepare(`
      SELECT strftime('%Y-%m', pago_em) AS mes, SUM(valor) AS total, COUNT(*) AS qtd
      FROM cobrancas
      WHERE status = 'pago' AND pago_em >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', pago_em)
      ORDER BY mes
    `).all(),

    // Por tipo de cobrança
    env.DB.prepare(`
      SELECT tipo, status, COUNT(*) AS qtd, SUM(valor) AS total
      FROM cobrancas
      GROUP BY tipo, status
    `).all(),

    // Status geral
    env.DB.prepare(`
      SELECT status, COUNT(*) AS qtd, SUM(valor) AS total
      FROM cobrancas
      GROUP BY status
    `).all(),

    // Top 10 devedores
    env.DB.prepare(`
      SELECT cl.nome, cl.id, SUM(co.valor) AS total_devido, COUNT(co.id) AS qtd_cobrancas,
             MIN(co.data_vencimento) AS vencimento_mais_antigo
      FROM cobrancas co
      LEFT JOIN clientes cl ON cl.id = co.cliente_id
      WHERE co.status IN ('vencido', 'negociando')
      GROUP BY cl.id, cl.nome
      ORDER BY total_devido DESC
      LIMIT 10
    `).all(),

    // Previsão (a vencer nos próximos 30 dias)
    env.DB.prepare(`
      SELECT strftime('%Y-%m-%d', data_vencimento) AS dia, SUM(valor) AS total
      FROM cobrancas
      WHERE status = 'a_vencer'
        AND data_vencimento BETWEEN date('now') AND date('now', '+30 days')
      GROUP BY dia
      ORDER BY dia
    `).all(),
  ]);

  return {
    receita_mensal: receitaMensal.results,
    por_tipo: porTipo.results,
    por_status: porStatus.results,
    top_devedores: top10Devedores.results,
    previsao_30_dias: previsao.results,
  };
}

// ============================================
// RELATORIO DE PRODUTIVIDADE IA
// ============================================

export async function relatorioIA(env: Env): Promise<Record<string, unknown>> {
  const inicioMes = new Date().toISOString().substring(0, 7) + '-01';

  const [chatbot, qualificacao, prazos, cobrancas] = await Promise.all([
    // Chatbot IA
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total_atendimentos,
        SUM(CASE WHEN respondido_por = 'ia' THEN 1 ELSE 0 END) AS resolvidos_ia,
        SUM(CASE WHEN escalado = 1 THEN 1 ELSE 0 END) AS escalados
      FROM atendimentos
      WHERE created_at >= ?
    `).bind(inicioMes).first(),

    // Qualificação IA de leads
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total_qualificados,
        SUM(CASE WHEN score = 'quente' THEN 1 ELSE 0 END) AS quentes,
        SUM(CASE WHEN score = 'morno' THEN 1 ELSE 0 END) AS mornos,
        SUM(CASE WHEN score = 'frio' THEN 1 ELSE 0 END) AS frios
      FROM leads
      WHERE qualificado_por_ia = 1 AND created_at >= ?
    `).bind(inicioMes).first(),

    // Prazos classificados por IA
    env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM prazos
      WHERE intimacao_tipo IS NOT NULL AND created_at >= ?
    `).bind(inicioMes).first(),

    // Cobranças automáticas
    env.DB.prepare(`
      SELECT COUNT(*) AS total_enviadas
      FROM atividades_log
      WHERE acao LIKE 'cobranca_%' AND created_at >= ?
    `).bind(inicioMes).first(),
  ]);

  const totalAtd = (chatbot?.total_atendimentos as number) || 1;
  const resolvidosIA = (chatbot?.resolvidos_ia as number) || 0;

  return {
    chatbot: {
      total_atendimentos: totalAtd,
      resolvidos_ia: resolvidosIA,
      escalados: (chatbot?.escalados as number) || 0,
      taxa_resolucao_ia: Math.round((resolvidosIA / totalAtd) * 100),
    },
    qualificacao_leads: {
      total: (qualificacao?.total_qualificados as number) || 0,
      quentes: (qualificacao?.quentes as number) || 0,
      mornos: (qualificacao?.mornos as number) || 0,
      frios: (qualificacao?.frios as number) || 0,
    },
    classificacao_prazos: {
      intimacoes_classificadas: (prazos?.total as number) || 0,
    },
    cobrancas_automaticas: {
      enviadas_mes: (cobrancas?.total_enviadas as number) || 0,
    },
    economia_estimada: {
      horas_economia_chatbot: Math.round(resolvidosIA * 5 / 60), // 5min por atendimento
      horas_economia_prazos: Math.round(((prazos?.total as number) || 0) * 15 / 60), // 15min por classificação
      horas_economia_cobranca: Math.round(((cobrancas?.total_enviadas as number) || 0) * 3 / 60), // 3min por cobrança
    },
  };
}

// ============================================
// EXPORT CSV (formato simplificado)
// ============================================

export async function exportarRelatorio(env: Env, tipo: string): Promise<string> {
  let csv = '';

  switch (tipo) {
    case 'casos': {
      const result = await env.DB.prepare(`
        SELECT ca.id, ca.numero_processo, ca.tipo, ca.area_direito, ca.status, ca.fase_pipeline,
               ca.valor_causa, ca.valor_honorarios, ca.comarca, ca.vara,
               cl.nome AS cliente, u.nome AS advogado, ca.created_at
        FROM casos ca
        LEFT JOIN clientes cl ON cl.id = ca.cliente_id
        LEFT JOIN usuarios u ON u.id = ca.advogado_id
        ORDER BY ca.created_at DESC
      `).all();

      csv = 'ID,Processo,Tipo,Área,Status,Fase,Valor Causa,Honorários,Comarca,Vara,Cliente,Advogado,Criado Em\n';
      for (const r of result.results) {
        csv += `${r.id},${r.numero_processo || ''},${r.tipo},${r.area_direito},${r.status},${r.fase_pipeline},${r.valor_causa || 0},${r.valor_honorarios || 0},${r.comarca || ''},${r.vara || ''},${r.cliente},${r.advogado},${r.created_at}\n`;
      }
      break;
    }

    case 'cobrancas': {
      const result = await env.DB.prepare(`
        SELECT co.id, co.tipo, co.valor, co.data_vencimento, co.status, co.sequencia_cobranca,
               co.pago_em, cl.nome AS cliente, ca.numero_processo
        FROM cobrancas co
        LEFT JOIN clientes cl ON cl.id = co.cliente_id
        LEFT JOIN casos ca ON ca.id = co.caso_id
        ORDER BY co.data_vencimento DESC
      `).all();

      csv = 'ID,Tipo,Valor,Vencimento,Status,Sequência,Pago Em,Cliente,Processo\n';
      for (const r of result.results) {
        csv += `${r.id},${r.tipo},${r.valor},${r.data_vencimento},${r.status},${r.sequencia_cobranca},${r.pago_em || ''},${r.cliente},${r.numero_processo || ''}\n`;
      }
      break;
    }

    case 'leads': {
      const result = await env.DB.prepare(`
        SELECT l.id, l.nome, l.telefone, l.email, l.tipo_caso, l.urgencia, l.score,
               l.canal_origem, l.status, l.qualificado_por_ia, u.nome AS closer, l.created_at
        FROM leads l
        LEFT JOIN usuarios u ON u.id = l.closer_id
        ORDER BY l.created_at DESC
      `).all();

      csv = 'ID,Nome,Telefone,Email,Tipo Caso,Urgência,Score,Canal,Status,IA,Closer,Criado Em\n';
      for (const r of result.results) {
        csv += `${r.id},${r.nome},${r.telefone},${r.email || ''},${r.tipo_caso || ''},${r.urgencia},${r.score},${r.canal_origem},${r.status},${r.qualificado_por_ia ? 'Sim' : 'Não'},${r.closer || ''},${r.created_at}\n`;
      }
      break;
    }

    case 'prazos': {
      const result = await env.DB.prepare(`
        SELECT p.id, p.tipo, p.descricao, p.data_prazo, p.status, p.intimacao_tipo,
               ca.numero_processo, u.nome AS responsavel
        FROM prazos p
        LEFT JOIN casos ca ON ca.id = p.caso_id
        LEFT JOIN usuarios u ON u.id = p.responsavel_id
        ORDER BY p.data_prazo DESC
      `).all();

      csv = 'ID,Tipo,Descrição,Data Prazo,Status,Intimação,Processo,Responsável\n';
      for (const r of result.results) {
        csv += `${r.id},${r.tipo},"${r.descricao}",${r.data_prazo},${r.status},${r.intimacao_tipo || ''},${r.numero_processo || ''},${r.responsavel}\n`;
      }
      break;
    }

    default:
      throw new Error(`Tipo de relatório não suportado: ${tipo}. Use: casos, cobrancas, leads, prazos`);
  }

  return csv;
}
