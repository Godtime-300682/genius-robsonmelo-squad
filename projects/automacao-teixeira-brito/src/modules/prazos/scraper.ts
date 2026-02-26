// ============================================
// SCRAPER TJ-GO - Publicações e Intimações
// POP 002: Gestão de Prazos Judiciais
// ============================================

import type { Env } from '../../shared/types';
import { OpenAIClient } from '../../integrations/openai';
import { generateId, now } from '../../shared/utils';

// ============================================
// INTERFACES
// ============================================

export interface PublicacaoTJ {
  numero_processo: string;
  data_publicacao: string;
  texto: string;
  tipo_diario: string; // DJE, DJGO
  caderno: string;
  pagina?: number;
}

export interface IntimacaoClassificada {
  numero_processo: string;
  data_publicacao: string;
  texto: string;
  tipo: 'decisao' | 'sentenca' | 'audiencia' | 'julgamento' | 'despacho';
  urgencia: 'critica' | 'alta' | 'media' | 'baixa';
  resumo: string;
  prazo_dias: number;
  caso_id: string | null;
  advogado_id: string | null;
  cliente_nome: string | null;
}

export interface ResultadoScraping {
  publicacoes_encontradas: number;
  intimacoes_classificadas: number;
  prazos_criados: number;
  erros: string[];
}

// ============================================
// SCRAPER: Buscar publicações do TJ-GO
// ============================================
export async function buscarPublicacoesTJ(env: Env): Promise<PublicacaoTJ[]> {
  // Buscar todos os processos ativos no sistema
  const processos = await env.DB.prepare(`
    SELECT DISTINCT numero_processo FROM casos
    WHERE numero_processo IS NOT NULL
      AND status NOT IN ('concluido', 'arquivado')
  `).all();

  if (processos.results.length === 0) return [];

  const publicacoes: PublicacaoTJ[] = [];

  for (const proc of processos.results) {
    const numero = proc.numero_processo as string;

    try {
      // Consulta ao DJE do TJ-GO via API pública
      // URL: https://projudi.tjgo.jus.br/BuscaPublicacao
      const resultado = await consultarDJE(numero);
      if (resultado) {
        publicacoes.push(...resultado);
      }
    } catch (e) {
      console.error(`Erro ao buscar publicações do processo ${numero}:`, (e as Error).message);
    }
  }

  return publicacoes;
}

// ============================================
// CONSULTA AO DJE (Diário de Justiça Eletrônico)
// ============================================
async function consultarDJE(numeroProcesso: string): Promise<PublicacaoTJ[]> {
  const publicacoes: PublicacaoTJ[] = [];

  // Formatar número do processo para consulta
  const numeroFormatado = numeroProcesso.replace(/\D/g, '');

  // Consultar API do TJ-GO (e-SAJ / PJe)
  // Em produção, usar o endpoint real do tribunal
  const endpoints = [
    // e-SAJ TJ-GO
    `https://www.tjgo.jus.br/index.php/consulta-publicacoes?processo=${numeroFormatado}`,
    // PJe TJ-GO
    `https://pje.tjgo.jus.br/pje/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam?processo=${numeroFormatado}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TeixeiraBrito-AutomacaoJuridica/1.0',
          'Accept': 'text/html,application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json() as { publicacoes?: Array<{ texto: string; data: string; caderno: string; pagina?: number }> };
        if (data.publicacoes) {
          for (const pub of data.publicacoes) {
            publicacoes.push({
              numero_processo: numeroProcesso,
              data_publicacao: pub.data,
              texto: pub.texto,
              tipo_diario: 'DJE-GO',
              caderno: pub.caderno,
              pagina: pub.pagina,
            });
          }
        }
      } else {
        // Parse HTML - extrair publicações do HTML
        const html = await response.text();
        const pubsExtraidas = extrairPublicacoesHTML(html, numeroProcesso);
        publicacoes.push(...pubsExtraidas);
      }
    } catch {
      // Timeout ou erro de rede - continuar com próximo endpoint
      continue;
    }
  }

  return publicacoes;
}

// ============================================
// PARSER HTML - Extração de publicações
// ============================================
function extrairPublicacoesHTML(html: string, numeroProcesso: string): PublicacaoTJ[] {
  const publicacoes: PublicacaoTJ[] = [];

  // Regex para encontrar blocos de publicação
  // Padrões comuns nos TJs: <div class="publicacao">, <td class="texto">, etc.
  const regexPublicacao = /<(?:div|td|span)[^>]*class="[^"]*(?:publicacao|texto|conteudo)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|td|span)>/gi;
  const regexData = /(\d{2}\/\d{2}\/\d{4})/;

  let match;
  while ((match = regexPublicacao.exec(html)) !== null) {
    const textoRaw = match[1]
      .replace(/<[^>]+>/g, ' ') // remove tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (textoRaw.length < 20) continue;

    // Verificar se menciona o processo
    const numLimpo = numeroProcesso.replace(/\D/g, '');
    if (!textoRaw.includes(numLimpo) && !textoRaw.includes(numeroProcesso)) continue;

    const dataMatch = textoRaw.match(regexData);
    const dataPublicacao = dataMatch
      ? dataMatch[1].split('/').reverse().join('-') // DD/MM/YYYY → YYYY-MM-DD
      : new Date().toISOString().split('T')[0];

    publicacoes.push({
      numero_processo: numeroProcesso,
      data_publicacao: dataPublicacao,
      texto: textoRaw.substring(0, 2000),
      tipo_diario: 'DJE-GO',
      caderno: 'Judicial',
    });
  }

  return publicacoes;
}

// ============================================
// CLASSIFICAR INTIMAÇÕES COM IA (GPT-4o)
// ============================================
export async function classificarIntimacoes(
  env: Env,
  publicacoes: PublicacaoTJ[],
): Promise<IntimacaoClassificada[]> {
  if (publicacoes.length === 0) return [];

  const openai = new OpenAIClient(env.OPENAI_API_KEY);
  const classificadas: IntimacaoClassificada[] = [];

  for (const pub of publicacoes) {
    try {
      // Buscar caso e advogado pelo número do processo
      const caso = await env.DB.prepare(`
        SELECT c.id AS caso_id, c.advogado_id, cl.nome AS cliente_nome
        FROM casos c
        LEFT JOIN clientes cl ON cl.id = c.cliente_id
        WHERE c.numero_processo = ?
        LIMIT 1
      `).bind(pub.numero_processo).first();

      // Classificar via GPT-4o
      const classificacao = await openai.classificarIntimacao(pub.texto);

      // Determinar prazo em dias baseado no tipo
      const prazoDias = calcularPrazoPorTipo(classificacao.tipo);

      classificadas.push({
        numero_processo: pub.numero_processo,
        data_publicacao: pub.data_publicacao,
        texto: pub.texto,
        tipo: classificacao.tipo as IntimacaoClassificada['tipo'],
        urgencia: classificacao.urgencia as IntimacaoClassificada['urgencia'],
        resumo: classificacao.resumo,
        prazo_dias: prazoDias,
        caso_id: caso?.caso_id as string | null,
        advogado_id: caso?.advogado_id as string | null,
        cliente_nome: caso?.cliente_nome as string | null,
      });
    } catch (e) {
      console.error(`Erro ao classificar intimação do processo ${pub.numero_processo}:`, (e as Error).message);
    }
  }

  return classificadas;
}

// ============================================
// PRAZO PADRÃO POR TIPO DE INTIMAÇÃO
// ============================================
function calcularPrazoPorTipo(tipo: string): number {
  switch (tipo) {
    case 'sentenca': return 15; // 15 dias úteis para recurso
    case 'decisao': return 15; // 15 dias úteis para agravo
    case 'audiencia': return 5; // preparação para audiência
    case 'julgamento': return 5;
    case 'despacho': return 5; // 5 dias úteis padrão
    default: return 5;
  }
}

// ============================================
// VERIFICAR DUPLICATA (evitar reprocessamento)
// ============================================
async function verificarDuplicata(env: Env, numeroProcesso: string, dataPublicacao: string, tipo: string): Promise<boolean> {
  const cacheKey = `pub:${numeroProcesso}:${dataPublicacao}:${tipo}`;
  const existe = await env.CACHE.get(cacheKey);
  if (existe) return true;

  // Marcar como processado (TTL 30 dias)
  await env.CACHE.put(cacheKey, '1', { expirationTtl: 2592000 });
  return false;
}

// ============================================
// PROCESSAR PUBLICAÇÕES (função principal do cron)
// ============================================
export async function processarPublicacoesDiarias(env: Env): Promise<ResultadoScraping> {
  const resultado: ResultadoScraping = {
    publicacoes_encontradas: 0,
    intimacoes_classificadas: 0,
    prazos_criados: 0,
    erros: [],
  };

  try {
    // 1. Buscar publicações do TJ
    const publicacoes = await buscarPublicacoesTJ(env);
    resultado.publicacoes_encontradas = publicacoes.length;

    if (publicacoes.length === 0) {
      console.log('Nenhuma publicação encontrada hoje.');
      return resultado;
    }

    // 2. Filtrar duplicatas
    const novas: PublicacaoTJ[] = [];
    for (const pub of publicacoes) {
      const duplicada = await verificarDuplicata(env, pub.numero_processo, pub.data_publicacao, pub.tipo_diario);
      if (!duplicada) {
        novas.push(pub);
      }
    }

    if (novas.length === 0) {
      console.log('Todas as publicações já foram processadas.');
      return resultado;
    }

    // 3. Classificar com IA
    const classificadas = await classificarIntimacoes(env, novas);
    resultado.intimacoes_classificadas = classificadas.length;

    // 4. Criar prazos e notificações
    for (const intimacao of classificadas) {
      if (!intimacao.caso_id) {
        resultado.erros.push(`Processo ${intimacao.numero_processo}: caso não encontrado no sistema`);
        continue;
      }

      try {
        await criarPrazosDeIntimacao(env, intimacao);
        resultado.prazos_criados++;
      } catch (e) {
        resultado.erros.push(`Erro ao criar prazo para ${intimacao.numero_processo}: ${(e as Error).message}`);
      }
    }

    // 5. Log do resultado
    console.log(`Scraping TJ concluído: ${resultado.publicacoes_encontradas} pub, ${resultado.intimacoes_classificadas} class, ${resultado.prazos_criados} prazos`);

  } catch (e) {
    resultado.erros.push(`Erro geral: ${(e as Error).message}`);
  }

  return resultado;
}

// ============================================
// CRIAR PRAZOS A PARTIR DE INTIMAÇÃO
// ============================================
async function criarPrazosDeIntimacao(env: Env, intimacao: IntimacaoClassificada): Promise<void> {
  const { calcularPrazos } = await import('./calculator');
  const timestamp = now();

  // Calcular PI, PF e PR
  const prazos = calcularPrazos(
    intimacao.data_publicacao,
    intimacao.tipo,
    intimacao.prazo_dias,
  );

  // Criar prazo PI (Prazo Inicial - D+1 da publicação)
  const piId = generateId();
  await env.DB.prepare(`
    INSERT INTO prazos (id, caso_id, tipo, descricao, data_prazo, data_alerta, status, responsavel_id, intimacao_tipo, prazo_fatal, prazo_revisao, notificado, created_at)
    VALUES (?, ?, 'PI', ?, ?, ?, 'pendente', ?, ?, ?, ?, 0, ?)
  `).bind(
    piId,
    intimacao.caso_id!,
    `[PI] ${intimacao.resumo}`,
    prazos.prazoFatal, // PI = data do prazo final
    prazos.alertaD1, // alertar D+1 da publicação
    intimacao.advogado_id,
    intimacao.tipo,
    prazos.prazoFatal,
    prazos.prazoRevisao,
    timestamp,
  ).run();

  // Criar prazo PF (Prazo Fatal)
  const pfId = generateId();
  await env.DB.prepare(`
    INSERT INTO prazos (id, caso_id, tipo, descricao, data_prazo, data_alerta, status, responsavel_id, intimacao_tipo, prazo_fatal, notificado, created_at)
    VALUES (?, ?, 'PF', ?, ?, ?, 'pendente', ?, ?, ?, 0, ?)
  `).bind(
    pfId,
    intimacao.caso_id!,
    `[PF] ${intimacao.resumo} - PRAZO FATAL`,
    prazos.prazoFatal,
    prazos.alertaPF, // alertar 1 dia útil antes do PF
    intimacao.advogado_id,
    intimacao.tipo,
    prazos.prazoFatal,
    timestamp,
  ).run();

  // Criar prazo PR (Prazo Revisão - 2 dias úteis antes do PF)
  const prId = generateId();
  await env.DB.prepare(`
    INSERT INTO prazos (id, caso_id, tipo, descricao, data_prazo, data_alerta, status, responsavel_id, intimacao_tipo, prazo_revisao, notificado, created_at)
    VALUES (?, ?, 'PR', ?, ?, ?, 'pendente', ?, ?, ?, 0, ?)
  `).bind(
    prId,
    intimacao.caso_id!,
    `[PR] ${intimacao.resumo} - REVISÃO`,
    prazos.prazoRevisao,
    prazos.prazoRevisao, // alertar no dia da revisão
    intimacao.advogado_id,
    intimacao.tipo,
    prazos.prazoRevisao,
    timestamp,
  ).run();

  // Registrar atividade no log
  await env.DB.prepare(`
    INSERT INTO atividades_log (id, caso_id, usuario_id, acao, descricao, created_at)
    VALUES (?, ?, 'sistema', 'intimacao_detectada', ?, ?)
  `).bind(
    generateId(),
    intimacao.caso_id!,
    `Intimação detectada (${intimacao.tipo}): ${intimacao.resumo}. Prazos criados: PI, PF (${prazos.prazoFatal}), PR (${prazos.prazoRevisao})`,
    timestamp,
  ).run();

  // Criar notificações
  await criarNotificacoesPrazo(env, intimacao, prazos);
}

// ============================================
// NOTIFICAÇÕES EM CASCATA (POP 002)
// ============================================
async function criarNotificacoesPrazo(
  env: Env,
  intimacao: IntimacaoClassificada,
  prazos: { alertaD1: string; prazoRevisao: string; alertaPF: string; prazoFatal: string },
): Promise<void> {
  const timestamp = now();

  // Notificação 1: D+1 (dia após publicação) → Advogado + Controller
  await env.DB.prepare(`
    INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, prioridade, created_at)
    VALUES (?, ?, 'prazo', ?, ?, ?, ?)
  `).bind(
    generateId(),
    intimacao.advogado_id || 'admin',
    `Nova Intimação - ${intimacao.numero_processo}`,
    `Intimação detectada (${intimacao.tipo.toUpperCase()}): ${intimacao.resumo}\n\n` +
    `Processo: ${intimacao.numero_processo}\n` +
    `Cliente: ${intimacao.cliente_nome || 'N/A'}\n` +
    `Prazo Fatal: ${prazos.prazoFatal}\n` +
    `Prazo Revisão: ${prazos.prazoRevisao}\n\n` +
    `Urgência: ${intimacao.urgencia.toUpperCase()}`,
    intimacao.urgencia === 'critica' ? 'critica' : 'alta',
    timestamp,
  ).run();

  // Agendar lembretes futuros via KV
  const lembretes = [
    { data: prazos.alertaD1, tipo: 'lembrete_d1', msg: 'Prazo iniciado - verificar e iniciar trabalho' },
    { data: prazos.prazoRevisao, tipo: 'lembrete_pr', msg: 'PRAZO DE REVISÃO - revisar peça antes do protocolo' },
    { data: prazos.alertaPF, tipo: 'lembrete_pf', msg: 'VÉSPERA DO PRAZO FATAL - protocolar HOJE' },
  ];

  for (const lembrete of lembretes) {
    const key = `lembrete:${intimacao.caso_id}:${lembrete.tipo}:${prazos.prazoFatal}`;
    await env.CACHE.put(key, JSON.stringify({
      caso_id: intimacao.caso_id,
      advogado_id: intimacao.advogado_id,
      numero_processo: intimacao.numero_processo,
      cliente_nome: intimacao.cliente_nome,
      tipo_intimacao: intimacao.tipo,
      resumo: intimacao.resumo,
      mensagem: lembrete.msg,
      data_prazo_fatal: prazos.prazoFatal,
      data_envio: lembrete.data,
    }), { expirationTtl: 2592000 }); // 30 dias TTL
  }
}

// ============================================
// ENVIAR LEMBRETES PENDENTES (chamado pelo cron)
// ============================================
export async function enviarLembretesPrazos(env: Env): Promise<{ enviados: number; erros: number }> {
  const hoje = new Date().toISOString().split('T')[0];
  let enviados = 0;
  let erros = 0;

  // Buscar prazos que precisam de notificação hoje
  const prazosHoje = await env.DB.prepare(`
    SELECT p.*, ca.numero_processo, ca.advogado_id,
           cl.nome AS cliente_nome, cl.whatsapp AS cliente_whatsapp,
           u.nome AS advogado_nome, u.whatsapp AS advogado_whatsapp, u.email AS advogado_email
    FROM prazos p
    LEFT JOIN casos ca ON ca.id = p.caso_id
    LEFT JOIN clientes cl ON cl.id = ca.cliente_id
    LEFT JOIN usuarios u ON u.id = p.responsavel_id
    WHERE p.status IN ('pendente', 'em_andamento')
      AND p.notificado = 0
      AND p.data_alerta <= ?
  `).bind(hoje).all();

  for (const prazo of prazosHoje.results) {
    try {
      const prioridade = prazo.tipo === 'PF' ? 'URGENTE' : prazo.tipo === 'PR' ? 'REVISÃO' : 'INFORMATIVO';

      // Notificação no sistema
      await env.DB.prepare(`
        INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, prioridade, created_at)
        VALUES (?, ?, 'prazo', ?, ?, ?, ?)
      `).bind(
        generateId(),
        prazo.responsavel_id as string,
        `[${prioridade}] Prazo ${prazo.tipo} - ${prazo.numero_processo || ''}`,
        `${prazo.descricao}\n\nCliente: ${prazo.cliente_nome || 'N/A'}\nData: ${prazo.data_prazo}\n${prazo.tipo === 'PF' ? '⚠️ PRAZO FATAL - PROTOCOLAR HOJE!' : ''}`,
        prazo.tipo === 'PF' ? 'critica' : 'alta',
        now(),
      ).run();

      // Enviar WhatsApp para o advogado
      if (prazo.advogado_whatsapp) {
        const { WhatsAppClient } = await import('../../integrations/whatsapp');
        const whatsapp = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);

        const emoji = prazo.tipo === 'PF' ? '🚨' : prazo.tipo === 'PR' ? '📝' : '📋';
        const msg = `${emoji} *LEMBRETE DE PRAZO*\n\n` +
          `📌 Tipo: ${prazo.tipo} (${prioridade})\n` +
          `📋 ${prazo.descricao}\n` +
          `👤 Cliente: ${prazo.cliente_nome || 'N/A'}\n` +
          `📝 Processo: ${prazo.numero_processo || 'N/A'}\n` +
          `📅 Data Prazo: ${prazo.data_prazo}\n` +
          `${prazo.prazo_fatal ? `⚠️ Prazo Fatal: ${prazo.prazo_fatal}\n` : ''}` +
          `\n_Teixeira Brito Advocacia - Sistema de Prazos_`;

        await whatsapp.sendMessage({ number: prazo.advogado_whatsapp as string, text: msg });
      }

      // Enviar email
      if (prazo.advogado_email) {
        const { EmailClient } = await import('../../integrations/email');
        const email = new EmailClient(env.SMTP_USER);
        await email.enviarAlertaPrazo(
          [prazo.advogado_email as string],
          prazo.cliente_nome as string || 'N/A',
          'Parte Contrária',
          prazo.descricao as string,
          prazo.numero_processo as string || '',
          prazo.data_prazo as string,
          prazo.tipo as string,
        );
      }

      // Marcar como notificado
      await env.DB.prepare(`UPDATE prazos SET notificado = 1 WHERE id = ?`).bind(prazo.id).run();

      enviados++;
    } catch (e) {
      console.error(`Erro ao enviar lembrete do prazo ${prazo.id}:`, (e as Error).message);
      erros++;
    }
  }

  // Verificar prazos vencidos (mudar status)
  await env.DB.prepare(`
    UPDATE prazos SET status = 'vencido'
    WHERE status IN ('pendente', 'em_andamento')
      AND data_prazo < ?
  `).bind(hoje).run();

  return { enviados, erros };
}
