// ============================================
// MOTOR DE COBRANCA AUTOMATICA
// Sequencia: D-3, D0, D+3, D+7, D+15
// ============================================

import type { Env } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

// ============================================
// INTERFACES
// ============================================

export interface CobrancaPendente {
  id: string;
  cliente_id: string;
  caso_id: string;
  tipo: string;
  valor: number;
  data_vencimento: string;
  status: string;
  sequencia_cobranca: number;
  ultima_cobranca_em: string | null;
  cliente_nome: string;
  whatsapp: string | null;
  cliente_email: string | null;
  numero_processo: string | null;
  caso_tipo: string | null;
  advogado_nome: string | null;
  advogado_id: string | null;
  dias_vencido: number;
}

export interface ResultadoCobranca {
  processadas: number;
  enviadas_whatsapp: number;
  enviadas_email: number;
  escaladas: number;
  erros: string[];
  detalhes: Array<{
    cobranca_id: string;
    cliente: string;
    sequencia: number;
    acao: string;
  }>;
}

// ============================================
// SEQUENCIA DE COBRANCA
// ============================================
// Seq 0: Sem cobranca (criada, a_vencer)
// Seq 1: D-3 (3 dias antes do vencimento) - Lembrete gentil
// Seq 2: D0  (dia do vencimento) - Aviso de vencimento
// Seq 3: D+3 (3 dias apos) - Cobranca firme
// Seq 4: D+7 (7 dias apos) - Cobranca final
// Seq 5: D+15 (15 dias apos) - Escalar para coordenador

const SEQUENCIA_CONFIG: Record<number, {
  dias_relativo: number; // negativo = antes do venc, positivo = apos
  tom: 'gentil' | 'informativo' | 'firme' | 'final' | 'escalar';
  descricao: string;
}> = {
  1: { dias_relativo: -3, tom: 'gentil', descricao: 'Lembrete D-3' },
  2: { dias_relativo: 0, tom: 'informativo', descricao: 'Vencimento D0' },
  3: { dias_relativo: 3, tom: 'firme', descricao: 'Cobranca D+3' },
  4: { dias_relativo: 7, tom: 'final', descricao: 'Cobranca D+7' },
  5: { dias_relativo: 15, tom: 'escalar', descricao: 'Escalar D+15' },
};

// ============================================
// PROCESSAR COBRANCAS DIARIAS (CRON 10h)
// ============================================
export async function processarCobrancasDiarias(env: Env): Promise<ResultadoCobranca> {
  const resultado: ResultadoCobranca = {
    processadas: 0,
    enviadas_whatsapp: 0,
    enviadas_email: 0,
    escaladas: 0,
    erros: [],
    detalhes: [],
  };

  const hoje = new Date().toISOString().split('T')[0];

  try {
    // Buscar TODAS as cobrancas que precisam de acao hoje
    const cobrancas = await env.DB.prepare(`
      SELECT co.*, cl.nome AS cliente_nome, cl.whatsapp, cl.email AS cliente_email,
             ca.numero_processo, ca.tipo AS caso_tipo, ca.advogado_id,
             u.nome AS advogado_nome,
             CAST(julianday(?) - julianday(co.data_vencimento) AS INTEGER) AS dias_vencido
      FROM cobrancas co
      LEFT JOIN clientes cl ON cl.id = co.cliente_id
      LEFT JOIN casos ca ON ca.id = co.caso_id
      LEFT JOIN usuarios u ON u.id = ca.advogado_id
      WHERE co.status NOT IN ('pago', 'ajuizado')
      ORDER BY co.data_vencimento ASC
    `).bind(hoje).all();

    for (const row of cobrancas.results) {
      const cobranca = row as unknown as CobrancaPendente;
      const diasVencido = cobranca.dias_vencido;

      // Determinar proxima sequencia
      const proximaSeq = determinarProximaSequencia(cobranca.sequencia_cobranca, diasVencido);
      if (proximaSeq === null) continue; // Nao e hora de cobrar

      // Verificar cooldown (nao cobrar mais de 1x no mesmo dia)
      if (cobranca.ultima_cobranca_em === hoje) continue;

      try {
        await executarCobranca(env, cobranca, proximaSeq, hoje);
        resultado.processadas++;

        if (cobranca.whatsapp) resultado.enviadas_whatsapp++;
        if (cobranca.cliente_email) resultado.enviadas_email++;
        if (proximaSeq === 5) resultado.escaladas++;

        resultado.detalhes.push({
          cobranca_id: cobranca.id,
          cliente: cobranca.cliente_nome,
          sequencia: proximaSeq,
          acao: SEQUENCIA_CONFIG[proximaSeq].descricao,
        });
      } catch (e) {
        resultado.erros.push(`Erro cobranca ${cobranca.id} (${cobranca.cliente_nome}): ${(e as Error).message}`);
      }
    }

    // Atualizar status de cobrancas vencidas
    await env.DB.prepare(`
      UPDATE cobrancas SET status = 'vencido'
      WHERE status = 'a_vencer' AND data_vencimento < ?
    `).bind(hoje).run();

    console.log(`Cobrancas: ${resultado.processadas} processadas, ${resultado.enviadas_whatsapp} WA, ${resultado.escaladas} escaladas`);
  } catch (e) {
    resultado.erros.push(`Erro geral: ${(e as Error).message}`);
  }

  return resultado;
}

// ============================================
// DETERMINAR PROXIMA SEQUENCIA
// ============================================
function determinarProximaSequencia(seqAtual: number, diasVencido: number): number | null {
  for (let seq = seqAtual + 1; seq <= 5; seq++) {
    const config = SEQUENCIA_CONFIG[seq];
    if (diasVencido >= config.dias_relativo) {
      return seq;
    }
  }
  return null;
}

// ============================================
// EXECUTAR COBRANCA (enviar + registrar)
// ============================================
async function executarCobranca(
  env: Env,
  cobranca: CobrancaPendente,
  sequencia: number,
  hoje: string,
): Promise<void> {
  const config = SEQUENCIA_CONFIG[sequencia];
  const template = gerarMensagemCobranca(cobranca, sequencia);
  const timestamp = now();

  // 1. Enviar WhatsApp
  if (cobranca.whatsapp) {
    const { WhatsAppClient } = await import('../../integrations/whatsapp');
    const whatsapp = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
    await whatsapp.sendMessage({ number: cobranca.whatsapp, text: template.whatsapp });
  }

  // 2. Enviar Email (a partir de D+3)
  if (cobranca.cliente_email && sequencia >= 3) {
    const { EmailClient } = await import('../../integrations/email');
    const email = new EmailClient(env.SMTP_USER);
    await email.send({
      to: cobranca.cliente_email,
      subject: template.emailAssunto,
      body: template.emailCorpo,
    });
  }

  // 3. Atualizar sequencia no banco
  const novoStatus = sequencia >= 3 ? 'vencido' : cobranca.status;
  await env.DB.prepare(`
    UPDATE cobrancas SET sequencia_cobranca = ?, ultima_cobranca_em = ?, status = ?
    WHERE id = ?
  `).bind(sequencia, hoje, novoStatus, cobranca.id).run();

  // 4. Registrar notificacao no sistema
  await env.DB.prepare(`
    INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, prioridade, created_at)
    VALUES (?, ?, 'cobranca', ?, ?, ?, ?)
  `).bind(
    generateId(),
    cobranca.advogado_id || 'admin',
    `[${config.descricao}] ${cobranca.cliente_nome}`,
    `Cobranca seq. ${sequencia} enviada para ${cobranca.cliente_nome}.\n` +
    `Valor: R$${cobranca.valor.toFixed(2)} | Tipo: ${cobranca.tipo}\n` +
    `Vencimento: ${cobranca.data_vencimento} | Tom: ${config.tom}`,
    sequencia >= 4 ? 'critica' : sequencia >= 3 ? 'alta' : 'media',
    timestamp,
  ).run();

  // 5. Se escalar (seq 5), notificar coordenador Breno
  if (sequencia === 5) {
    await escalarParaCoordenador(env, cobranca, timestamp);
  }

  // 6. Log de atividade
  await env.DB.prepare(`
    INSERT INTO atividades_log (id, caso_id, usuario_id, acao, descricao, created_at)
    VALUES (?, ?, 'sistema', 'cobranca_enviada', ?, ?)
  `).bind(
    generateId(),
    cobranca.caso_id,
    `Cobranca seq.${sequencia} (${config.tom}) enviada para ${cobranca.cliente_nome}. Valor: R$${cobranca.valor.toFixed(2)}`,
    timestamp,
  ).run();
}

// ============================================
// ESCALAR PARA COORDENADOR (D+15)
// ============================================
async function escalarParaCoordenador(env: Env, cobranca: CobrancaPendente, timestamp: string): Promise<void> {
  // Buscar coordenador de cobranca (Breno)
  const coordenador = await env.DB.prepare(`
    SELECT id, nome, whatsapp, email FROM usuarios
    WHERE setor = 'cobranca' AND role IN ('admin', 'coordenador')
    LIMIT 1
  `).first();

  const destinatario = coordenador?.id as string || 'admin';
  const nomeCoord = coordenador?.nome as string || 'Coordenador';

  // Notificacao critica no sistema
  await env.DB.prepare(`
    INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, prioridade, created_at)
    VALUES (?, ?, 'cobranca', ?, ?, 'critica', ?)
  `).bind(
    generateId(),
    destinatario,
    `ESCALACAO - Inadimplencia ${cobranca.cliente_nome}`,
    `Cliente ${cobranca.cliente_nome} atingiu D+15 sem pagamento.\n\n` +
    `Valor: R$${cobranca.valor.toFixed(2)}\n` +
    `Tipo: ${cobranca.tipo}\n` +
    `Processo: ${cobranca.numero_processo || 'N/A'}\n` +
    `Vencimento: ${cobranca.data_vencimento}\n` +
    `WhatsApp: ${cobranca.whatsapp || 'N/A'}\n\n` +
    `Todas as 5 tentativas de cobranca foram realizadas.\n` +
    `Acao requerida: contato direto ou medida judicial.`,
    timestamp,
  ).run();

  // WhatsApp para coordenador
  if (coordenador?.whatsapp) {
    const { WhatsAppClient } = await import('../../integrations/whatsapp');
    const whatsapp = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
    await whatsapp.sendMessage({
      number: coordenador.whatsapp as string,
      text: `*ESCALACAO DE COBRANCA*\n\n` +
        `Cliente: ${cobranca.cliente_nome}\n` +
        `Valor: R$${cobranca.valor.toFixed(2)}\n` +
        `Tipo: ${cobranca.tipo}\n` +
        `Vencido ha: ${Math.abs(cobranca.dias_vencido)} dias\n` +
        `Processo: ${cobranca.numero_processo || 'N/A'}\n\n` +
        `5 tentativas de cobranca realizadas sem sucesso.\n` +
        `Favor tomar providencias.`,
    });
  }

  // Atualizar status para 'negociando' (sinalizar que precisa acao humana)
  await env.DB.prepare(`
    UPDATE cobrancas SET status = 'negociando' WHERE id = ?
  `).bind(cobranca.id).run();
}

// ============================================
// TEMPLATES DE MENSAGEM POR SEQUENCIA
// ============================================
function gerarMensagemCobranca(cobranca: CobrancaPendente, sequencia: number): {
  whatsapp: string;
  emailAssunto: string;
  emailCorpo: string;
} {
  const valor = `R$${cobranca.valor.toFixed(2)}`;
  const nome = cobranca.cliente_nome.split(' ')[0]; // Primeiro nome
  const vencimento = formatarData(cobranca.data_vencimento);
  const tipo = cobranca.tipo === 'honorarios' ? 'honorarios advocaticios'
    : cobranca.tipo === 'custas' ? 'custas processuais'
    : cobranca.tipo === 'acordo' ? 'parcela do acordo'
    : cobranca.tipo;

  switch (sequencia) {
    // D-3: Lembrete gentil
    case 1:
      return {
        whatsapp:
          `Ola, ${nome}! Tudo bem?\n\n` +
          `Passando para lembrar que o pagamento de ${tipo} no valor de *${valor}* ` +
          `vence em *${vencimento}*.\n\n` +
          `Se ja efetuou o pagamento, por favor desconsidere esta mensagem.\n\n` +
          `Qualquer duvida, estamos a disposicao.\n\n` +
          `_Teixeira Brito Advocacia_`,
        emailAssunto: `Lembrete de pagamento - ${tipo}`,
        emailCorpo:
          `Prezado(a) ${cobranca.cliente_nome},\n\n` +
          `Informamos que o pagamento de ${tipo} no valor de ${valor} vence em ${vencimento}.\n\n` +
          `Caso ja tenha efetuado o pagamento, por favor desconsidere este email.\n\n` +
          `Atenciosamente,\nTeixeira Brito Advocacia`,
      };

    // D0: Vencimento hoje
    case 2:
      return {
        whatsapp:
          `Ola, ${nome}!\n\n` +
          `Informamos que o pagamento de ${tipo} no valor de *${valor}* ` +
          `*vence hoje* (${vencimento}).\n\n` +
          `Caso precise de alguma orientacao para efetuar o pagamento, estamos a disposicao.\n\n` +
          `_Teixeira Brito Advocacia_`,
        emailAssunto: `Vencimento hoje - ${tipo} - ${valor}`,
        emailCorpo:
          `Prezado(a) ${cobranca.cliente_nome},\n\n` +
          `O pagamento de ${tipo} no valor de ${valor} vence hoje (${vencimento}).\n\n` +
          `Solicitamos a gentileza de providenciar o pagamento.\n\n` +
          `Atenciosamente,\nTeixeira Brito Advocacia`,
      };

    // D+3: Cobranca firme
    case 3:
      return {
        whatsapp:
          `Ola, ${nome}.\n\n` +
          `Identificamos que o pagamento de ${tipo} no valor de *${valor}*, ` +
          `com vencimento em ${vencimento}, ainda *nao foi identificado*.\n\n` +
          `Solicitamos a regularizacao o mais breve possivel para evitar ` +
          `eventuais encargos.\n\n` +
          `Caso ja tenha pago, por favor nos envie o comprovante.\n\n` +
          `_Teixeira Brito Advocacia_`,
        emailAssunto: `PENDENTE - Pagamento de ${tipo} - ${valor}`,
        emailCorpo:
          `Prezado(a) ${cobranca.cliente_nome},\n\n` +
          `Verificamos que o pagamento de ${tipo} no valor de ${valor}, com vencimento em ${vencimento}, nao foi identificado em nosso sistema.\n\n` +
          `Solicitamos a regularizacao o mais breve possivel.\n\n` +
          `Caso ja tenha efetuado o pagamento, pedimos a gentileza de enviar o comprovante.\n\n` +
          `Atenciosamente,\nTeixeira Brito Advocacia`,
      };

    // D+7: Cobranca final
    case 4:
      return {
        whatsapp:
          `${nome}, boa tarde.\n\n` +
          `O pagamento de ${tipo} no valor de *${valor}* esta *pendente ha mais de 7 dias* ` +
          `(vencimento: ${vencimento}).\n\n` +
          `Precisamos regularizar esta situacao com urgencia. ` +
          `Por favor, entre em contato conosco para verificar as opcoes de pagamento.\n\n` +
          `Caso nao haja regularizacao, poderemos tomar as medidas cabiveis.\n\n` +
          `_Teixeira Brito Advocacia_`,
        emailAssunto: `URGENTE - Pagamento pendente ha 7 dias - ${tipo}`,
        emailCorpo:
          `Prezado(a) ${cobranca.cliente_nome},\n\n` +
          `O pagamento de ${tipo} no valor de ${valor}, vencido em ${vencimento}, permanece pendente ha mais de 7 dias.\n\n` +
          `Solicitamos urgencia na regularizacao para evitar medidas cabiveis.\n\n` +
          `Entre em contato conosco para verificar opcoes de pagamento.\n\n` +
          `Atenciosamente,\nTeixeira Brito Advocacia`,
      };

    // D+15: Escalar
    case 5:
      return {
        whatsapp:
          `${nome},\n\n` +
          `Apesar das tentativas anteriores de contato, o pagamento de ${tipo} ` +
          `no valor de *${valor}* (vencimento: ${vencimento}) permanece *sem regularizacao*.\n\n` +
          `Informamos que o caso sera encaminhado para nosso setor de cobranca para as ` +
          `*providencias cabiveis*.\n\n` +
          `Caso deseje regularizar, entre em contato *imediatamente* pelo telefone ou WhatsApp.\n\n` +
          `_Teixeira Brito Advocacia_`,
        emailAssunto: `ULTIMO AVISO - Pagamento pendente ha 15 dias - ${tipo}`,
        emailCorpo:
          `Prezado(a) ${cobranca.cliente_nome},\n\n` +
          `O pagamento de ${tipo} no valor de ${valor}, vencido em ${vencimento}, permanece pendente ha mais de 15 dias, apesar de nossos contatos anteriores.\n\n` +
          `Informamos que o caso sera encaminhado ao setor de cobranca para as providencias cabiveis.\n\n` +
          `Caso deseje regularizar sua situacao, entre em contato imediatamente.\n\n` +
          `Atenciosamente,\nTeixeira Brito Advocacia`,
      };

    default:
      return {
        whatsapp: `Ola, ${nome}. Verificar pendencia de pagamento.`,
        emailAssunto: `Pendencia de pagamento - ${tipo}`,
        emailCorpo: `Prezado(a), verificar pendencia de pagamento.`,
      };
  }
}

// ============================================
// RELATORIO DE INADIMPLENCIA
// ============================================
export async function gerarRelatorioInadimplencia(env: Env): Promise<{
  resumo: {
    total_cobrancas: number;
    total_a_vencer: number;
    total_vencidas: number;
    total_pagas: number;
    valor_a_vencer: number;
    valor_vencido: number;
    valor_pago_mes: number;
    taxa_inadimplencia: number;
  };
  por_sequencia: Array<{ sequencia: number; quantidade: number; valor_total: number }>;
  top_inadimplentes: Array<{ cliente: string; valor_total: number; cobrancas: number; dias_max: number }>;
}> {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.substring(0, 7) + '-01';

  // Resumo geral
  const [totais, pagosMes] = await Promise.all([
    env.DB.prepare(`
      SELECT status, COUNT(*) as qtd, SUM(valor) as valor_total
      FROM cobrancas GROUP BY status
    `).all(),
    env.DB.prepare(`
      SELECT COUNT(*) as qtd, SUM(valor) as valor_total
      FROM cobrancas WHERE status = 'pago' AND pago_em >= ?
    `).bind(inicioMes).first(),
  ]);

  let totalCobrancas = 0, totalAVencer = 0, totalVencidas = 0, totalPagas = 0;
  let valorAVencer = 0, valorVencido = 0;

  for (const row of totais.results) {
    const qtd = row.qtd as number;
    const valor = row.valor_total as number;
    totalCobrancas += qtd;
    switch (row.status) {
      case 'a_vencer': totalAVencer += qtd; valorAVencer += valor; break;
      case 'vencido': case 'negociando': totalVencidas += qtd; valorVencido += valor; break;
      case 'pago': totalPagas += qtd; break;
    }
  }

  const taxaInadimplencia = totalCobrancas > 0
    ? Math.round((totalVencidas / (totalCobrancas - totalPagas)) * 100)
    : 0;

  // Por sequencia de cobranca
  const porSequencia = await env.DB.prepare(`
    SELECT sequencia_cobranca as sequencia, COUNT(*) as quantidade, SUM(valor) as valor_total
    FROM cobrancas WHERE status NOT IN ('pago')
    GROUP BY sequencia_cobranca ORDER BY sequencia_cobranca
  `).all();

  // Top inadimplentes
  const topInadimplentes = await env.DB.prepare(`
    SELECT cl.nome as cliente, SUM(co.valor) as valor_total, COUNT(*) as cobrancas,
           MAX(CAST(julianday(?) - julianday(co.data_vencimento) AS INTEGER)) as dias_max
    FROM cobrancas co
    LEFT JOIN clientes cl ON cl.id = co.cliente_id
    WHERE co.status IN ('vencido', 'negociando')
    GROUP BY co.cliente_id
    ORDER BY valor_total DESC
    LIMIT 10
  `).bind(hoje).all();

  return {
    resumo: {
      total_cobrancas: totalCobrancas,
      total_a_vencer: totalAVencer,
      total_vencidas: totalVencidas,
      total_pagas: totalPagas,
      valor_a_vencer: valorAVencer,
      valor_vencido: valorVencido,
      valor_pago_mes: (pagosMes?.valor_total as number) || 0,
      taxa_inadimplencia: taxaInadimplencia,
    },
    por_sequencia: porSequencia.results as Array<{ sequencia: number; quantidade: number; valor_total: number }>,
    top_inadimplentes: topInadimplentes.results as Array<{ cliente: string; valor_total: number; cobrancas: number; dias_max: number }>,
  };
}

// ============================================
// HELPER: Formatar data BR
// ============================================
function formatarData(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}
