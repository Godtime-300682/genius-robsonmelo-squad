// ============================================
// TIPOS GLOBAIS - Teixeira Brito Automação
// ============================================

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  DOCS: R2Bucket;
  ENVIRONMENT: string;
  APP_NAME: string;
  ESCRITORIO_NOME: string;
  // Secrets (configurados via wrangler secret put)
  OPENAI_API_KEY: string;
  WHATSAPP_API_URL: string;
  WHATSAPP_API_KEY: string;
  AUTENTIQUE_API_KEY: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  MICROSOFT_TENANT_ID: string;
  SMTP_HOST: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  JWT_SECRET: string;
}

// --- USUARIOS ---
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  role: 'admin' | 'coordenador' | 'advogado' | 'assistente' | 'comercial';
  setor: string;
  ativo: boolean;
  created_at: string;
}

// --- CLIENTES ---
export interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  tipo_caso: string;
  area_direito: string;
  status: 'lead' | 'triagem' | 'ativo' | 'concluido' | 'arquivado';
  advogado_responsavel_id: string;
  grupo_whatsapp_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// --- CASOS ---
export interface Caso {
  id: string;
  cliente_id: string;
  numero_processo: string | null;
  tipo: string;
  area_direito: string;
  status: 'triagem' | 'iniciais' | 'em_andamento' | 'audiencia' | 'recurso' | 'concluido' | 'arquivado';
  fase_pipeline: 'comercial' | 'triagem' | 'iniciais' | 'em_andamento' | 'audiencia' | 'concluido';
  advogado_id: string;
  coordenador_id: string | null;
  valor_causa: number | null;
  valor_honorarios: number | null;
  comarca: string | null;
  vara: string | null;
  parte_contraria: string | null;
  pasta_onedrive: string | null;
  caso_astrea_id: string | null;
  contrato_autentique_id: string | null;
  procuracao_autentique_id: string | null;
  docs_checklist: string; // JSON array
  docs_recebidos: string; // JSON array
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// --- PRAZOS ---
export interface Prazo {
  id: string;
  caso_id: string;
  tipo: 'PI' | 'PF' | 'PR' | 'audiencia' | 'diligencia' | 'outro';
  descricao: string;
  data_prazo: string;
  data_alerta: string | null;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'vencido';
  responsavel_id: string;
  intimacao_tipo: 'decisao' | 'sentenca' | 'audiencia' | 'julgamento' | 'despacho' | null;
  prazo_fatal: string | null;
  prazo_revisao: string | null;
  notificado: boolean;
  created_at: string;
}

// --- DOCUMENTOS ---
export interface Documento {
  id: string;
  caso_id: string;
  cliente_id: string;
  tipo: 'contrato' | 'procuracao' | 'peticao' | 'documento_pessoal' | 'probatorio' | 'guia' | 'outro';
  nome: string;
  url_r2: string | null;
  url_onedrive: string | null;
  autentique_id: string | null;
  status_assinatura: 'pendente' | 'assinado' | 'recusado' | 'nao_aplicavel';
  gerado_por_ia: boolean;
  revisado: boolean;
  created_at: string;
}

// --- ATENDIMENTOS ---
export interface Atendimento {
  id: string;
  cliente_id: string;
  caso_id: string | null;
  canal: 'whatsapp' | 'email' | 'telefone' | 'presencial';
  tipo: 'duvida_andamento' | 'envio_documento' | 'duvida_pagamento' | 'agendamento' | 'reclamacao' | 'outro';
  mensagem: string;
  resposta: string | null;
  respondido_por: 'ia' | 'humano';
  escalado: boolean;
  escalado_para: string | null;
  satisfacao: number | null;
  created_at: string;
}

// --- COBRANCAS ---
export interface Cobranca {
  id: string;
  cliente_id: string;
  caso_id: string;
  tipo: 'honorarios' | 'custas' | 'acordo';
  valor: number;
  data_vencimento: string;
  status: 'a_vencer' | 'vencido' | 'pago' | 'negociando' | 'ajuizado';
  sequencia_cobranca: number; // 0=sem cobrança, 1=D-3, 2=D0, 3=D+3, 4=D+7, 5=D+15
  ultima_cobranca_em: string | null;
  pago_em: string | null;
  created_at: string;
}

// --- LEADS ---
export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  tipo_caso: string;
  urgencia: 'alta' | 'media' | 'baixa';
  score: 'quente' | 'morno' | 'frio';
  canal_origem: 'site' | 'whatsapp' | 'indicacao' | 'redes_sociais' | 'outro';
  qualificado_por_ia: boolean;
  briefing_ia: string | null;
  closer_id: string | null;
  reuniao_agendada: string | null;
  status: 'novo' | 'qualificado' | 'agendado' | 'fechado' | 'perdido';
  created_at: string;
}

// --- AUDIENCIAS ---
export interface Audiencia {
  id: string;
  caso_id: string;
  cliente_id: string;
  tipo: 'conciliacao' | 'instrucao' | 'julgamento';
  data_hora: string;
  local: string;
  advogado_id: string;
  status: 'agendada' | 'confirmada' | 'realizada' | 'adiada' | 'cancelada';
  lembrete_d7_enviado: boolean;
  lembrete_d3_enviado: boolean;
  lembrete_d1_enviado: boolean;
  resultado: string | null;
  acordo_valor: number | null;
  created_at: string;
}

// --- NOTIFICACOES ---
export interface Notificacao {
  id: string;
  destinatario_id: string;
  tipo: 'prazo' | 'audiencia' | 'cobranca' | 'documento' | 'lead' | 'sistema';
  canal: 'whatsapp' | 'email' | 'sistema';
  titulo: string;
  mensagem: string;
  enviada: boolean;
  lida: boolean;
  referencia_tipo: string | null;
  referencia_id: string | null;
  created_at: string;
}

// --- JWT ---
export interface JWTPayload {
  sub: string;
  nome: string;
  role: string;
  setor: string;
  iat: number;
  exp: number;
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
