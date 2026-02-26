-- ============================================
-- SCHEMA D1 - Teixeira Brito Automação IA
-- 8 Módulos Premium
-- ============================================

-- USUARIOS (equipe do escritório)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','coordenador','advogado','assistente','comercial')),
  setor TEXT NOT NULL,
  telefone TEXT,
  ativo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  endereco TEXT,
  tipo_caso TEXT,
  area_direito TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead','triagem','ativo','concluido','arquivado')),
  advogado_responsavel_id TEXT REFERENCES usuarios(id),
  grupo_whatsapp_id TEXT,
  observacoes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- CASOS (processos jurídicos)
CREATE TABLE IF NOT EXISTS casos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  numero_processo TEXT,
  tipo TEXT NOT NULL,
  area_direito TEXT,
  status TEXT DEFAULT 'triagem' CHECK (status IN ('triagem','iniciais','em_andamento','audiencia','recurso','concluido','arquivado')),
  fase_pipeline TEXT DEFAULT 'triagem' CHECK (fase_pipeline IN ('comercial','triagem','iniciais','em_andamento','audiencia','concluido')),
  advogado_id TEXT NOT NULL REFERENCES usuarios(id),
  coordenador_id TEXT REFERENCES usuarios(id),
  valor_causa REAL,
  valor_honorarios REAL,
  comarca TEXT,
  vara TEXT,
  parte_contraria TEXT,
  pasta_onedrive TEXT,
  caso_astrea_id TEXT,
  contrato_autentique_id TEXT,
  procuracao_autentique_id TEXT,
  docs_checklist TEXT DEFAULT '[]',
  docs_recebidos TEXT DEFAULT '[]',
  observacoes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- PRAZOS PROCESSUAIS
CREATE TABLE IF NOT EXISTS prazos (
  id TEXT PRIMARY KEY,
  caso_id TEXT NOT NULL REFERENCES casos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('PI','PF','PR','audiencia','diligencia','outro')),
  descricao TEXT NOT NULL,
  data_prazo TEXT NOT NULL,
  data_alerta TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluido','vencido')),
  responsavel_id TEXT NOT NULL REFERENCES usuarios(id),
  intimacao_tipo TEXT CHECK (intimacao_tipo IN ('decisao','sentenca','audiencia','julgamento','despacho')),
  prazo_fatal TEXT,
  prazo_revisao TEXT,
  notificado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- DOCUMENTOS
CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY,
  caso_id TEXT NOT NULL REFERENCES casos(id),
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato','procuracao','peticao','documento_pessoal','probatorio','guia','outro')),
  nome TEXT NOT NULL,
  url_r2 TEXT,
  url_onedrive TEXT,
  autentique_id TEXT,
  status_assinatura TEXT DEFAULT 'nao_aplicavel' CHECK (status_assinatura IN ('pendente','assinado','recusado','nao_aplicavel')),
  gerado_por_ia INTEGER DEFAULT 0,
  revisado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ATENDIMENTOS (WhatsApp, email, etc)
CREATE TABLE IF NOT EXISTS atendimentos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  caso_id TEXT REFERENCES casos(id),
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp','email','telefone','presencial')),
  tipo TEXT CHECK (tipo IN ('duvida_andamento','envio_documento','duvida_pagamento','agendamento','reclamacao','outro')),
  mensagem TEXT NOT NULL,
  resposta TEXT,
  respondido_por TEXT DEFAULT 'ia' CHECK (respondido_por IN ('ia','humano')),
  escalado INTEGER DEFAULT 0,
  escalado_para TEXT REFERENCES usuarios(id),
  satisfacao INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- COBRANÇAS
CREATE TABLE IF NOT EXISTS cobrancas (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  caso_id TEXT NOT NULL REFERENCES casos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('honorarios','custas','acordo')),
  valor REAL NOT NULL,
  data_vencimento TEXT NOT NULL,
  status TEXT DEFAULT 'a_vencer' CHECK (status IN ('a_vencer','vencido','pago','negociando','ajuizado')),
  sequencia_cobranca INTEGER DEFAULT 0,
  ultima_cobranca_em TEXT,
  pago_em TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- LEADS (comercial)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  tipo_caso TEXT,
  urgencia TEXT DEFAULT 'media' CHECK (urgencia IN ('alta','media','baixa')),
  score TEXT DEFAULT 'morno' CHECK (score IN ('quente','morno','frio')),
  canal_origem TEXT CHECK (canal_origem IN ('site','whatsapp','indicacao','redes_sociais','outro')),
  qualificado_por_ia INTEGER DEFAULT 0,
  briefing_ia TEXT,
  closer_id TEXT REFERENCES usuarios(id),
  reuniao_agendada TEXT,
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo','qualificado','agendado','fechado','perdido')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- AUDIÊNCIAS
CREATE TABLE IF NOT EXISTS audiencias (
  id TEXT PRIMARY KEY,
  caso_id TEXT NOT NULL REFERENCES casos(id),
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('conciliacao','instrucao','julgamento')),
  data_hora TEXT NOT NULL,
  local TEXT,
  advogado_id TEXT NOT NULL REFERENCES usuarios(id),
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada','confirmada','realizada','adiada','cancelada')),
  lembrete_d7_enviado INTEGER DEFAULT 0,
  lembrete_d3_enviado INTEGER DEFAULT 0,
  lembrete_d1_enviado INTEGER DEFAULT 0,
  resultado TEXT,
  acordo_valor REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notificacoes (
  id TEXT PRIMARY KEY,
  destinatario_id TEXT NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('prazo','audiencia','cobranca','documento','lead','sistema')),
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp','email','sistema')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  enviada INTEGER DEFAULT 0,
  lida INTEGER DEFAULT 0,
  referencia_tipo TEXT,
  referencia_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- LOG DE ATIVIDADES (auditoria)
CREATE TABLE IF NOT EXISTS atividades_log (
  id TEXT PRIMARY KEY,
  usuario_id TEXT REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  entidade_tipo TEXT,
  entidade_id TEXT,
  detalhes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_advogado ON clientes(advogado_responsavel_id);

CREATE INDEX IF NOT EXISTS idx_casos_cliente ON casos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_casos_status ON casos(status);
CREATE INDEX IF NOT EXISTS idx_casos_pipeline ON casos(fase_pipeline);
CREATE INDEX IF NOT EXISTS idx_casos_advogado ON casos(advogado_id);

CREATE INDEX IF NOT EXISTS idx_prazos_caso ON prazos(caso_id);
CREATE INDEX IF NOT EXISTS idx_prazos_data ON prazos(data_prazo);
CREATE INDEX IF NOT EXISTS idx_prazos_status ON prazos(status);
CREATE INDEX IF NOT EXISTS idx_prazos_responsavel ON prazos(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_documentos_caso ON documentos(caso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_assinatura ON documentos(status_assinatura);

CREATE INDEX IF NOT EXISTS idx_atendimentos_cliente ON atendimentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_canal ON atendimentos(canal);

CREATE INDEX IF NOT EXISTS idx_cobrancas_vencimento ON cobrancas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON cobrancas(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_cliente ON cobrancas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_audiencias_data ON audiencias(data_hora);
CREATE INDEX IF NOT EXISTS idx_audiencias_caso ON audiencias(caso_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_status ON audiencias(status);

CREATE INDEX IF NOT EXISTS idx_notificacoes_dest ON notificacoes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_enviada ON notificacoes(enviada);

CREATE INDEX IF NOT EXISTS idx_log_usuario ON atividades_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_log_entidade ON atividades_log(entidade_tipo, entidade_id);
