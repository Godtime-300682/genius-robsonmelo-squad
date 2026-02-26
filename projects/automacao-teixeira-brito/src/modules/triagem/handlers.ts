// ============================================
// HANDLERS TRIAGEM - 9 Passos do POP 001
// Teixeira Brito Advocacia
// ============================================

import type { Env } from '../../shared/types';
import { generateId, now, formatPastaCliente, addBusinessDays, formatDate } from '../../shared/utils';
import { OpenAIClient } from '../../integrations/openai';
import { WhatsAppClient } from '../../integrations/whatsapp';
import { AutentiqueClient } from '../../integrations/autentique';
import { OneDriveClient } from '../../integrations/onedrive';
import { EmailClient } from '../../integrations/email';
import { gerarContratoHonorarios, gerarProcuracao, getChecklistDocumentos } from './templates';
import type { DadosCliente, DadosCaso } from './templates';

export interface TriagemInput {
  // Dados do cliente
  cliente: DadosCliente;
  // Dados do caso
  caso: DadosCaso;
  // Advogado responsável
  advogado_id: string;
  // Coordenador
  coordenador_id: string;
  // Emails para notificação
  email_coordenador: string;
  email_financeiro: string;
  email_socios: string[];
}

export interface TriagemResult {
  cliente_id: string;
  caso_id: string;
  grupo_whatsapp_id: string | null;
  contrato_autentique_id: string | null;
  procuracao_autentique_id: string | null;
  pasta_onedrive: string | null;
  docs_checklist: string[];
  status: string;
  passos_concluidos: string[];
  erros: string[];
}

// ============================================
// EXECUTOR PRINCIPAL - Orquestra os 9 passos
// ============================================
export async function executarTriagem(env: Env, input: TriagemInput): Promise<TriagemResult> {
  const result: TriagemResult = {
    cliente_id: '',
    caso_id: '',
    grupo_whatsapp_id: null,
    contrato_autentique_id: null,
    procuracao_autentique_id: null,
    pasta_onedrive: null,
    docs_checklist: [],
    status: 'em_andamento',
    passos_concluidos: [],
    erros: [],
  };

  // Inicializar clientes de integração
  const whatsapp = new WhatsAppClient(env.WHATSAPP_API_URL, env.WHATSAPP_API_KEY);
  const autentique = new AutentiqueClient(env.AUTENTIQUE_API_KEY);
  const onedrive = new OneDriveClient(env.MICROSOFT_CLIENT_ID, env.MICROSOFT_CLIENT_SECRET, env.MICROSOFT_TENANT_ID);
  const email = new EmailClient('automacao@teixeirabrito.adv.br');

  // ─── PASSO 1: Cadastrar cliente + Criar grupo WhatsApp ───
  try {
    result.cliente_id = await passo1_cadastrarCliente(env, input);
    result.passos_concluidos.push('1-cadastro-cliente');

    try {
      const grupoId = await whatsapp.createGroup({
        name: `Jurídico - ${input.cliente.nome_completo.toUpperCase()}`,
        participants: [input.cliente.telefone],
      });
      result.grupo_whatsapp_id = grupoId.groupId;

      await env.DB.prepare('UPDATE clientes SET grupo_whatsapp_id = ? WHERE id = ?')
        .bind(grupoId.groupId, result.cliente_id).run();

      result.passos_concluidos.push('1-grupo-whatsapp');
    } catch (e) {
      result.erros.push(`Passo 1 (WhatsApp): ${(e as Error).message}`);
    }
  } catch (e) {
    result.erros.push(`Passo 1 (Cadastro): ${(e as Error).message}`);
    result.status = 'erro';
    return result;
  }

  // ─── PASSO 2: Gerar Contrato + Procuração, enviar via Autentique ───
  try {
    const contrato = gerarContratoHonorarios(input.cliente, input.caso);
    const procuracao = gerarProcuracao(input.cliente, input.caso);

    // Enviar contrato via Autentique
    try {
      result.contrato_autentique_id = await autentique.criarDocumento({
        name: `Contrato de Honorários - ${input.cliente.nome_completo}`,
        content: btoa(contrato),
        signers: [
          { name: input.cliente.nome_completo, email: input.cliente.email, action: 'SIGN' },
          { name: 'Dr. Dayan Teixeira Brito', email: 'dayan@teixeirabrito.adv.br', action: 'SIGN' },
        ],
        message: 'Prezado(a), segue contrato de honorários para sua assinatura digital.',
        reminderInterval: 1,
      });

      // Registrar documento no DB
      await env.DB.prepare(
        'INSERT INTO documentos (id, caso_id, cliente_id, tipo, nome, autentique_id, status_assinatura, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(generateId(), '', result.cliente_id, 'contrato', `Contrato - ${input.cliente.nome_completo}`, result.contrato_autentique_id, 'pendente', now()).run();

      result.passos_concluidos.push('2-contrato-autentique');
    } catch (e) {
      result.erros.push(`Passo 2 (Contrato Autentique): ${(e as Error).message}`);
    }

    // Enviar procuração via Autentique
    try {
      result.procuracao_autentique_id = await autentique.criarDocumento({
        name: `Procuração - ${input.cliente.nome_completo}`,
        content: btoa(procuracao),
        signers: [
          { name: input.cliente.nome_completo, email: input.cliente.email, action: 'SIGN' },
        ],
        message: 'Prezado(a), segue procuração para sua assinatura digital.',
        reminderInterval: 1,
      });

      await env.DB.prepare(
        'INSERT INTO documentos (id, caso_id, cliente_id, tipo, nome, autentique_id, status_assinatura, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(generateId(), '', result.cliente_id, 'procuracao', `Procuração - ${input.cliente.nome_completo}`, result.procuracao_autentique_id, 'pendente', now()).run();

      result.passos_concluidos.push('2-procuracao-autentique');
    } catch (e) {
      result.erros.push(`Passo 2 (Procuração Autentique): ${(e as Error).message}`);
    }
  } catch (e) {
    result.erros.push(`Passo 2 (Docs): ${(e as Error).message}`);
  }

  // ─── PASSO 3: Agendar monitoramento de assinaturas (D+1) ───
  try {
    await agendarMonitoramentoAssinaturas(env, result.cliente_id, result.contrato_autentique_id, result.procuracao_autentique_id);
    result.passos_concluidos.push('3-monitoramento-agendado');
  } catch (e) {
    result.erros.push(`Passo 3: ${(e as Error).message}`);
  }

  // ─── PASSO 5: Criar pasta no OneDrive ───
  try {
    const pastaUrl = await onedrive.criarPastaCliente(input.cliente.nome_completo, input.caso.tipo_acao);
    result.pasta_onedrive = pastaUrl;
    result.passos_concluidos.push('5-pasta-onedrive');
  } catch (e) {
    result.erros.push(`Passo 5 (OneDrive): ${(e as Error).message}`);
  }

  // ─── PASSO 6: Criar caso no sistema ───
  try {
    result.caso_id = await passo6_criarCaso(env, input, result);
    result.passos_concluidos.push('6-caso-criado');
  } catch (e) {
    result.erros.push(`Passo 6 (Caso): ${(e as Error).message}`);
  }

  // ─── PASSO 7: Checar documentos vs checklist ───
  try {
    result.docs_checklist = getChecklistDocumentos(input.caso.area_direito);

    await env.DB.prepare('UPDATE casos SET docs_checklist = ? WHERE id = ?')
      .bind(JSON.stringify(result.docs_checklist), result.caso_id).run();

    result.passos_concluidos.push('7-checklist-definido');
  } catch (e) {
    result.erros.push(`Passo 7: ${(e as Error).message}`);
  }

  // ─── PASSO 8: Agendar cobrança de docs faltantes (cada 2 dias úteis) ───
  try {
    await agendarCobrancaDocumentos(env, result.cliente_id, result.caso_id, input.cliente.whatsapp);
    result.passos_concluidos.push('8-cobranca-docs-agendada');
  } catch (e) {
    result.erros.push(`Passo 8: ${(e as Error).message}`);
  }

  // ─── Atualizar status do cliente ───
  await env.DB.prepare('UPDATE clientes SET status = ?, updated_at = ? WHERE id = ?')
    .bind('triagem', now(), result.cliente_id).run();

  result.status = result.erros.length === 0 ? 'concluido' : 'parcial';

  // Log de atividade
  await env.DB.prepare(
    'INSERT INTO atividades_log (id, acao, entidade_tipo, entidade_id, detalhes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    'triagem_iniciada',
    'cliente',
    result.cliente_id,
    JSON.stringify({ passos: result.passos_concluidos, erros: result.erros }),
    now()
  ).run();

  return result;
}

// ============================================
// PASSO 1: Cadastrar cliente no banco
// ============================================
async function passo1_cadastrarCliente(env: Env, input: TriagemInput): Promise<string> {
  const id = generateId();

  await env.DB.prepare(`
    INSERT INTO clientes (id, nome, cpf_cnpj, email, telefone, whatsapp, endereco, tipo_caso, area_direito, status, advogado_responsavel_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'triagem', ?, ?, ?)
  `).bind(
    id,
    input.cliente.nome_completo,
    input.cliente.cpf,
    input.cliente.email,
    input.cliente.telefone,
    input.cliente.telefone,
    `${input.cliente.endereco}, ${input.cliente.cidade}/${input.cliente.estado}`,
    input.caso.tipo_acao,
    input.caso.area_direito,
    input.advogado_id,
    now(),
    now(),
  ).run();

  return id;
}

// ============================================
// PASSO 3: Agendar monitoramento de assinaturas
// ============================================
async function agendarMonitoramentoAssinaturas(
  env: Env,
  clienteId: string,
  contratoId: string | null,
  procuracaoId: string | null
): Promise<void> {
  // Salvar no KV para processamento pelo cron (14h diário)
  const monitoramento = {
    cliente_id: clienteId,
    contrato_autentique_id: contratoId,
    procuracao_autentique_id: procuracaoId,
    criado_em: now(),
    proxima_cobranca: addBusinessDays(new Date(), 1).toISOString(),
    tentativas: 0,
  };

  await env.CACHE.put(
    `assinatura:pendente:${clienteId}`,
    JSON.stringify(monitoramento),
    { expirationTtl: 30 * 24 * 60 * 60 } // 30 dias
  );
}

// ============================================
// PASSO 6: Criar caso no sistema
// ============================================
async function passo6_criarCaso(env: Env, input: TriagemInput, result: TriagemResult): Promise<string> {
  const id = generateId();

  await env.DB.prepare(`
    INSERT INTO casos (id, cliente_id, tipo, area_direito, status, fase_pipeline, advogado_id, coordenador_id, valor_causa, valor_honorarios, comarca, vara, parte_contraria, pasta_onedrive, contrato_autentique_id, procuracao_autentique_id, docs_checklist, docs_recebidos, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'triagem', 'triagem', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?)
  `).bind(
    id,
    result.cliente_id,
    input.caso.tipo_acao,
    input.caso.area_direito,
    input.advogado_id,
    input.coordenador_id,
    input.caso.valor_causa_estimado,
    input.caso.valor_honorarios,
    input.caso.comarca,
    input.caso.vara || null,
    input.caso.parte_contraria || null,
    result.pasta_onedrive,
    result.contrato_autentique_id,
    result.procuracao_autentique_id,
    now(),
    now(),
  ).run();

  // Atualizar documentos com o caso_id
  if (result.contrato_autentique_id) {
    await env.DB.prepare('UPDATE documentos SET caso_id = ? WHERE autentique_id = ?')
      .bind(id, result.contrato_autentique_id).run();
  }
  if (result.procuracao_autentique_id) {
    await env.DB.prepare('UPDATE documentos SET caso_id = ? WHERE autentique_id = ?')
      .bind(id, result.procuracao_autentique_id).run();
  }

  return id;
}

// ============================================
// PASSO 8: Agendar cobrança de documentos
// ============================================
async function agendarCobrancaDocumentos(
  env: Env,
  clienteId: string,
  casoId: string,
  whatsapp: string
): Promise<void> {
  const cobrancaDoc = {
    cliente_id: clienteId,
    caso_id: casoId,
    whatsapp: whatsapp,
    criado_em: now(),
    proxima_cobranca: addBusinessDays(new Date(), 2).toISOString(),
    tentativas: 0,
    max_tentativas: 10,
  };

  await env.CACHE.put(
    `docs:pendente:${casoId}`,
    JSON.stringify(cobrancaDoc),
    { expirationTtl: 60 * 24 * 60 * 60 } // 60 dias
  );
}

// ============================================
// PASSO 4: Enviar docs assinados (chamado pelo cron)
// ============================================
export async function processarAssinaturasConcluidas(env: Env): Promise<void> {
  const autentique = new AutentiqueClient(env.AUTENTIQUE_API_KEY);
  const emailClient = new EmailClient('automacao@teixeirabrito.adv.br');

  // Buscar docs pendentes de assinatura
  const docs = await env.DB.prepare(
    "SELECT d.*, cl.nome AS cliente_nome, cl.email AS cliente_email FROM documentos d LEFT JOIN clientes cl ON cl.id = d.cliente_id WHERE d.status_assinatura = 'pendente' AND d.autentique_id IS NOT NULL"
  ).all();

  for (const doc of docs.results) {
    try {
      const assinado = await autentique.todosAssinaram(doc.autentique_id as string);
      if (assinado) {
        // Atualizar status
        await env.DB.prepare("UPDATE documentos SET status_assinatura = 'assinado' WHERE id = ?")
          .bind(doc.id).run();

        // Buscar coordenador e financeiro do caso
        const caso = await env.DB.prepare(
          'SELECT coordenador_id, advogado_id FROM casos WHERE id = ?'
        ).bind(doc.caso_id).first();

        if (caso) {
          const coordenador = await env.DB.prepare('SELECT email FROM usuarios WHERE id = ?')
            .bind(caso.coordenador_id).first();
          const advogado = await env.DB.prepare('SELECT email FROM usuarios WHERE id = ?')
            .bind(caso.advogado_id).first();

          const destinatarios = [coordenador?.email, advogado?.email].filter(Boolean) as string[];

          if (destinatarios.length > 0) {
            await emailClient.enviarDocumentosAssinados(
              destinatarios,
              doc.cliente_nome as string,
              doc.tipo as string
            );
          }
        }
      }
    } catch (e) {
      console.error(`Erro ao verificar assinatura ${doc.id}:`, (e as Error).message);
    }
  }
}

// ============================================
// PASSO 9: Comunicar conclusão (chamado quando docs completos)
// ============================================
export async function comunicarConclusaoTriagem(env: Env, casoId: string): Promise<void> {
  const emailClient = new EmailClient('automacao@teixeirabrito.adv.br');

  const caso = await env.DB.prepare(`
    SELECT c.*, cl.nome AS cliente_nome, cl.email AS cliente_email,
           u.email AS advogado_email, u.nome AS advogado_nome
    FROM casos c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN usuarios u ON u.id = c.advogado_id
    WHERE c.id = ?
  `).bind(casoId).first();

  if (!caso) return;

  // Buscar coordenador
  const coordenador = caso.coordenador_id
    ? await env.DB.prepare('SELECT email FROM usuarios WHERE id = ?').bind(caso.coordenador_id).first()
    : null;

  const destinatarios = [caso.advogado_email, coordenador?.email].filter(Boolean) as string[];

  await emailClient.enviarTriagemConcluida(
    destinatarios,
    caso.cliente_nome as string,
    caso.tipo as string
  );

  // Atualizar status do caso para iniciais
  await env.DB.prepare("UPDATE casos SET status = 'iniciais', fase_pipeline = 'iniciais', updated_at = ? WHERE id = ?")
    .bind(now(), casoId).run();

  // Atualizar status do cliente
  await env.DB.prepare("UPDATE clientes SET status = 'ativo', updated_at = ? WHERE id = ?")
    .bind(now(), caso.cliente_id).run();

  // Log
  await env.DB.prepare(
    'INSERT INTO atividades_log (id, acao, entidade_tipo, entidade_id, detalhes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), 'triagem_concluida', 'caso', casoId, `Triagem concluída para ${caso.cliente_nome}`, now()).run();
}
