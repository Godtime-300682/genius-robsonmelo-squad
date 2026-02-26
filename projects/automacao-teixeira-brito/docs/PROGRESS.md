# Automacao Teixeira Brito - Progresso do Projeto

> **Documento vivo** - Atualizado a cada fase concluida
> Ultima atualizacao: 2026-02-26

---

## Status Geral

```
╔══════════════════════════════════════════════════════════════╗
║              AUTOMACAO TEIXEIRA BRITO IA                     ║
║                                                              ║
║  Fases: [######==] 6/8 completas (75%)                       ║
║  Codigo: 6.500+ linhas | 26 arquivos TypeScript              ║
║  Commits: 8 (feat + docs)                                    ║
║  Stack: Cloudflare Workers + Hono + D1 + KV + R2             ║
╚══════════════════════════════════════════════════════════════╝
```

### Barra de Progresso por Fase

```
FASE 1 - Fundacao        [##########] 100%  ✅ 25/02/2026
FASE 2 - Triagem         [##########] 100%  ✅ 25/02/2026
FASE 3 - WhatsApp 24/7   [##########] 100%  ✅ 25/02/2026
FASE 4 - Prazos IA       [##########] 100%  ✅ 26/02/2026
FASE 5 - Cobranca Auto   [##########] 100%  ✅ 26/02/2026
FASE 6 - Comercial IA    [##########] 100%  ✅ 26/02/2026
FASE 7 - Audiencias      [..........]   0%  ⏳ Pendente
FASE 8 - Dashboard       [..........]   0%  ⏳ Pendente
```

---

## Metricas do Projeto

### Linhas de Codigo por Camada

```
                    LINHAS DE CODIGO POR CAMADA
  ┌────────────────────────────────────────────────────┐
  │ Gateway      ████████████░░░░░░░░░░░░░░░░  270     │
  │ Shared       ████████████░░░░░░░░░░░░░░░░  412     │
  │ Integracoes  ██████████████░░░░░░░░░░░░░░  693     │
  │ Triagem      ██████████████████░░░░░░░░░░  874     │
  │ WhatsApp     ███████████████████░░░░░░░░░  944     │
  │ Prazos       ████████████████████████░░░░ 1.046    │
  │ Cobranca     ██████████████░░░░░░░░░░░░░░  500+    │
  │ Comercial    ████████████████████░░░░░░░░  700+    │
  │ Audiencias   █████░░░░░░░░░░░░░░░░░░░░░░░  178     │
  │ Documentos   ████░░░░░░░░░░░░░░░░░░░░░░░░  146     │
  │ Dashboard    ████████░░░░░░░░░░░░░░░░░░░░  263     │
  └────────────────────────────────────────────────────┘
  TOTAL: 6.000+ linhas
```

### Endpoints da API

```
                  ENDPOINTS POR MODULO
  ┌───────────────────────────────────────────┐
  │ Modulo       │ GET │ POST │ PATCH │ TOTAL │
  ├───────────────────────────────────────────┤
  │ Auth         │  -  │   2  │   -   │   2   │
  │ Stats        │  1  │   -  │   -   │   1   │
  │ Triagem      │  2  │   2  │   1   │   5   │
  │ WhatsApp     │  3  │   2  │   -   │   5   │
  │ Prazos       │  3  │   4  │   1   │   8   │
  │ Cobranca     │  2  │   1  │   1   │   4   │
  │ Comercial    │  4  │   5  │   1   │  10   │
  │ Audiencias   │  2  │   1  │   1   │   4   │
  │ Documentos   │  2  │   2  │   -   │   4   │
  │ Dashboard    │  4  │   -  │   -   │   4   │
  │ Webhook      │  -  │   1  │   -   │   1   │
  │ Crons        │  7  │   -  │   -   │   7   │
  ├───────────────────────────────────────────┤
  │ TOTAL        │ 30  │  22  │   5   │  57   │
  └───────────────────────────────────────────┘
```

---

## Detalhamento por Fase

---

### FASE 1: Fundacao do Sistema ✅

**Data:** 25/02/2026 | **Commit:** `1a8100f` | **Status:** COMPLETA

**Objetivo:** Infraestrutura base, types, auth, integracoes, config Cloudflare

**Arquivos Criados:**

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `shared/types.ts` | 216 | 12 interfaces (Env, Usuario, Cliente, Caso, Prazo, Documento, Atendimento, Cobranca, Lead, Audiencia, Notificacao, JWTPayload) |
| `shared/auth.ts` | 94 | JWT auth (createToken, authenticate, hashPassword, verifyPassword) |
| `shared/utils.ts` | 102 | Helpers (generateId, now, formatDate, slugify, jsonResponse) |
| `integrations/whatsapp.ts` | 123 | Evolution API (sendMessage, sendMedia, sendButtons, sendList) |
| `integrations/openai.ts` | 126 | GPT-4o (classificarIntimacao, gerarDocumento, analisarLead) |
| `integrations/autentique.ts` | 196 | Assinatura eletronica (criarDocumento, enviarParaAssinar, verificarStatus) |
| `integrations/onedrive.ts` | 133 | Microsoft Graph (criarPasta, uploadArquivo, listarArquivos) |
| `integrations/email.ts` | 115 | MailChannels (enviarDocumentosAssinados, enviarTriagemConcluida, enviarAlertaPrazo) |
| `gateway/index.ts` | 270 | API Gateway Hono (rotas, auth middleware, crons, error handler) |
| `wrangler.toml` | 41 | Config Cloudflare (D1, KV x2, R2, crons) |
| `worker.js` | 551 | Apresentacao HTML interativa (12 slides) |

**Infraestrutura Cloudflare:**

```
┌─────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS                  │
│                                                  │
│  Worker: teixeira-brito-api                      │
│  Entry:  src/gateway/index.ts                    │
│  Compat: 2024-06-01 + nodejs_compat             │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ D1 (SQL) │ │ KV:SESS  │ │ KV:CACHE │         │
│  │ teixeira │ │ sessions │ │ cache    │         │
│  │ -brito-db│ │          │ │          │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│  ┌──────────────────┐                            │
│  │ R2: DOCS         │                            │
│  │ teixeira-brito-  │                            │
│  │ docs             │                            │
│  └──────────────────┘                            │
│                                                  │
│  Crons: 5 triggers (seg-sex)                     │
│  07h: Docs | 08h: TJ | 09h: Aud                 │
│  10h: Cob  | 14h: Ass                            │
└─────────────────────────────────────────────────┘
```

**Integracoes Externas:**

```
┌─────────────┐    ┌──────────────┐    ┌───────────┐
│ Evolution   │    │   OpenAI     │    │ Autentique│
│ API (WhApp) │    │  GPT-4o-mini │    │  e-Sign   │
│ Send/Recv   │    │  Classif/Gen │    │ Contratos │
└──────┬──────┘    └──────┬───────┘    └─────┬─────┘
       │                  │                   │
       └──────────┬───────┴───────────────────┘
                  │
         ┌────────▼────────┐
         │   WORKER API    │
         │  Hono Framework │
         └────────┬────────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
┌──────▼──┐ ┌────▼───┐ ┌────▼─────┐
│MS Graph │ │ Mail   │ │ TJ-GO   │
│OneDrive │ │Channels│ │ DJE/PJe │
│ Pastas  │ │ SMTP   │ │ Scraping│
└─────────┘ └────────┘ └──────────┘
```

---

### FASE 2: Modulo Triagem Automatizada ✅

**Data:** 25/02/2026 | **Commit:** `1e5fbb9` | **Status:** COMPLETA

**Objetivo:** Automatizar os 9 passos do POP 001 (onboarding de clientes)

**Arquivos Criados:**

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `modules/triagem/worker.ts` | 194 | 5 endpoints (POST iniciar, GET listar, GET :id, POST :id/documentos, PATCH :id/status) |
| `modules/triagem/handlers.ts` | 420 | Automacao dos 9 passos POP 001 |
| `modules/triagem/templates.ts` | 260 | Templates WhatsApp (boas-vindas, docs, checklist, contrato) |

**Fluxo Automatizado (9 Passos POP 001):**

```
  CLIENTE FECHA CONTRATO
         │
         ▼
  ┌──────────────┐
  │ 1. Receber   │ Dados do comercial via WhatsApp
  │    dados     │ Nome, CPF, tipo caso, docs
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 2. Criar     │ Grupo WhatsApp "TRIAGEM - [NOME]"
  │    grupo WA  │ + mensagem de boas-vindas
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 3. Contrato  │ Gerar via Autentique
  │    digital   │ Enviar para assinatura
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 4. Procuracao│ Gerar procuracao
  │    digital   │ Enviar para assinatura
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 5. Criar     │ Estrutura padrao OneDrive
  │    pasta OD  │ /Clientes/[NOME]/[subpastas]
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 6. Cadastrar │ Cliente + Caso no D1
  │    no sistema│ Status: triagem
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 7. Cobrar    │ Checklist de docs pendentes
  │    documentos│ WhatsApp automatico
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 8. Verificar │ Checar assinaturas Autentique
  │    assinat.  │ Status contrato + procuracao
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 9. Concluir  │ Mover pipeline: triagem → iniciais
  │    triagem   │ Notificar equipe + email padrao
  └──────────────┘
```

**Endpoints:**
- `POST /api/triagem/iniciar` — Inicia os 9 passos automaticamente
- `GET /api/triagem` — Lista triagens com filtros
- `GET /api/triagem/:id` — Detalhe de uma triagem
- `POST /api/triagem/:id/documentos` — Upload de documentos do cliente
- `PATCH /api/triagem/:id/status` — Atualiza status da triagem

---

### FASE 3: Chatbot WhatsApp 24/7 ✅

**Data:** 25/02/2026 | **Commit:** `1f463c8` | **Status:** COMPLETA

**Objetivo:** Atendimento automatico 24/7 via WhatsApp com IA

**Arquivos Criados:**

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `modules/whatsapp/chatbot.ts` | 344 | Motor principal (webhook, anti-flood, classificacao 3 camadas) |
| `modules/whatsapp/intents.ts` | 352 | 7 handlers de intencao com IA |
| `modules/whatsapp/worker.ts` | 248 | 6 endpoints (webhook, send, send-media, atendimentos, escalados, stats) |

**Arquitetura do Chatbot:**

```
  MENSAGEM WHATSAPP
         │
         ▼
  ┌──────────────────┐
  │  WEBHOOK ENTRY   │  POST /webhook/whatsapp
  │  Evolution API   │  Valida evento: messages.upsert
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  ANTI-FLOOD      │  Max 10 msg/min por numero
  │  KV Sessions     │  Rejeita se exceder
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  BUSCAR CLIENTE  │  D1: clientes WHERE whatsapp = ?
  │  no D1           │  Se nao encontrar → msg padrao
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │         CLASSIFICACAO 3 CAMADAS          │
  │                                          │
  │  Camada 1: Menu Numerico                 │
  │  "1" → ANDAMENTO                         │
  │  "2" → DOCUMENTO                         │
  │  "3" → PAGAMENTO                         │
  │  "4" → FALAR COM ADVOGADO               │
  │  "5" → AGENDAMENTO                       │
  │                                          │
  │  Camada 2: Palavras-chave               │
  │  "prazo|andamento|processo" → ANDAMENTO  │
  │  "doc|enviar|anexo" → DOCUMENTO          │
  │  "pagar|boleto|valor" → PAGAMENTO        │
  │                                          │
  │  Camada 3: GPT-4o-mini                  │
  │  Classifica intencao com contexto do     │
  │  cliente e historico                      │
  └────────┬─────────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │         7 HANDLERS DE INTENCAO           │
  │                                          │
  │  ANDAMENTO  → consulta caso + prazos     │
  │  DOCUMENTO  → lista docs pendentes       │
  │  PAGAMENTO  → consulta cobrancas         │
  │  AGENDAMENTO→ lista audiencias proximas  │
  │  RECLAMACAO → ESCALA sempre (critica)    │
  │  SAUDACAO   → menu interativo 5 opcoes   │
  │  OUTRO      → resposta IA c/ contexto    │
  └────────┬─────────────────────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  ENVIAR RESPOSTA │  Via Evolution API
  │  + Log D1        │  Salvar em atendimentos
  └──────────────────┘
```

**Endpoints:**
- `POST /webhook/whatsapp` — Webhook Evolution API (publico)
- `POST /api/whatsapp/send` — Envio manual (autenticado)
- `POST /api/whatsapp/send-media` — Envio de midia
- `GET /api/whatsapp/atendimentos` — Listar atendimentos com filtros
- `GET /api/whatsapp/atendimentos/escalados` — Pendentes por advogado
- `GET /api/whatsapp/stats` — Metricas do chatbot

---

### FASE 4: Gestao de Prazos IA ✅

**Data:** 26/02/2026 | **Commit:** `746e97b` | **Status:** COMPLETA

**Objetivo:** Scraping TJ-GO, calculo de prazos PI/PF/PR, notificacoes em cascata

**Arquivos Criados/Modificados:**

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `modules/prazos/scraper.ts` | 541 | Scraping TJ-GO (DJE/PJe), classificacao IA, notificacoes cascata |
| `modules/prazos/calculator.ts` | 284 | Calculadora prazos forenses (PI/PF/PR, feriados GO, recesso) |
| `modules/prazos/worker.ts` | 221 | 8 endpoints (CRUD + calcular + urgencia + scraping) |
| `gateway/index.ts` | +27 | Crons reais integrados |

**Sistema de Prazos (POP 002):**

```
  ┌─────────────────────────────────────────────────────┐
  │              CRON 08h (Seg-Sex)                     │
  │                                                      │
  │  ┌──────────────┐                                    │
  │  │ 1. SCRAPING  │  Buscar publicacoes TJ-GO          │
  │  │    TJ-GO     │  Endpoints: DJE + PJe              │
  │  │              │  Para cada processo ativo no D1     │
  │  └──────┬───────┘                                    │
  │         │                                            │
  │         ▼                                            │
  │  ┌──────────────┐                                    │
  │  │ 2. FILTRAR   │  KV Cache: pub:{proc}:{data}:{tipo}│
  │  │    DUPLICATAS │  TTL 30 dias                       │
  │  └──────┬───────┘                                    │
  │         │                                            │
  │         ▼                                            │
  │  ┌──────────────┐                                    │
  │  │ 3. CLASSIF.  │  GPT-4o: tipo + urgencia + resumo  │
  │  │    IA        │  5 tipos: decisao, sentenca,        │
  │  │              │  audiencia, julgamento, despacho     │
  │  └──────┬───────┘                                    │
  │         │                                            │
  │         ▼                                            │
  │  ┌──────────────┐                                    │
  │  │ 4. CALCULAR  │  Calculadora forense:               │
  │  │    PRAZOS    │  PI = D+1 util da publicacao        │
  │  │              │  PF = PI + N dias uteis forenses     │
  │  │              │  PR = PF - 2 dias uteis              │
  │  └──────┬───────┘                                    │
  │         │                                            │
  │         ▼                                            │
  │  ┌──────────────┐                                    │
  │  │ 5. CRIAR     │  3 registros no D1:                 │
  │  │    PRAZOS D1 │  PI (informativo)                   │
  │  │              │  PF (prazo fatal)                    │
  │  │              │  PR (prazo revisao)                  │
  │  └──────┬───────┘                                    │
  │         │                                            │
  │         ▼                                            │
  │  ┌──────────────────────────────────────┐            │
  │  │ 6. NOTIFICACOES EM CASCATA          │            │
  │  │                                      │            │
  │  │  D+1: Notif sistema + KV lembrete    │            │
  │  │  PR:  WhatsApp + Email "REVISAO"     │            │
  │  │  PF-1: WhatsApp + Email "URGENTE"    │            │
  │  │  PF:   Alerta CRITICO               │            │
  │  └──────────────────────────────────────┘            │
  └─────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────┐
  │              CRON 09h (Seg-Sex)                     │
  │                                                      │
  │  enviarLembretesPrazos()                             │
  │  - Busca prazos com data_alerta <= hoje              │
  │  - Envia notificacao sistema                         │
  │  - Envia WhatsApp para advogado                      │
  │  - Envia email para advogado                         │
  │  - Marca prazos vencidos automaticamente             │
  └─────────────────────────────────────────────────────┘
```

**Calculadora de Prazos Forenses:**

```
  ┌───────────────────────────────────────────────┐
  │  REGRAS DE DIAS UTEIS FORENSES (GO)          │
  │                                               │
  │  Exclui:                                      │
  │  - Sabados e Domingos                         │
  │  - Feriados nacionais (14/ano)                │
  │  - Feriados GO (26/07 Fundacao Goiania)       │
  │  - Dia do Servidor Publico (24/10)            │
  │  - Recesso forense (20/12 a 06/01)            │
  │                                               │
  │  Prazos padrao por tipo (CPC):                │
  │  - Sentenca/Decisao: 15 dias uteis            │
  │  - Contestacao/Replica: 15 dias uteis          │
  │  - Embargos declaracao: 5 dias uteis           │
  │  - Despacho simples: 5 dias uteis              │
  │  - Audiencia: 5 dias uteis                     │
  └───────────────────────────────────────────────┘
```

**Mapa de Urgencia:**

```
  ┌────────────┬────────────────┬────────┐
  │ Urgencia   │ Dias Restantes │ Cor    │
  ├────────────┼────────────────┼────────┤
  │ VENCIDO    │ < 0            │ PRETO  │
  │ CRITICO    │ <= 1           │ VERM.  │
  │ URGENTE    │ <= 3           │ LARANJA│
  │ ATENCAO    │ <= 5           │ AMARELO│
  │ NORMAL     │ > 5            │ VERDE  │
  └────────────┴────────────────┴────────┘
```

**Endpoints:**
- `POST /api/prazos` — Criar prazo manual
- `GET /api/prazos` — Listar com filtros (status, caso_id, paginacao)
- `GET /api/prazos/vencendo` — Prazos dos proximos 7 dias
- `GET /api/prazos/urgencia` — Mapa completo de urgencia
- `PATCH /api/prazos/:id/status` — Atualizar status
- `POST /api/prazos/calcular` — Calcular PI/PF/PR para uma data
- `POST /api/prazos/calcular-lote` — Calculo em lote
- `POST /api/prazos/scraping-manual` — Executar scraping sob demanda (admin)

---

### FASE 5: Cobranca Automatica ✅

**Data:** 26/02/2026 | **Commit:** (atual) | **Status:** COMPLETA

**Objetivo:** Sequencia automatica de cobranca por WhatsApp (D-3, D0, D+3, D+7, D+15)

**Arquivos Criados/Modificados:**

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `modules/cobranca/engine.ts` | 350+ | Motor de cobranca (sequencia D-3 a D+15, templates, escalacao) |
| `modules/cobranca/worker.ts` | 210+ | 8 endpoints (CRUD + relatorio + dashboard + processar-manual) |
| `gateway/index.ts` | +8 | Cron real integrado (10h) |

**Sequencia de Cobranca:**

```
  ┌──────────────────────────────────────────────────────────┐
  │              SEQUENCIA AUTOMATICA                        │
  │                                                          │
  │  Seq 1 │ D-3  │ Lembrete gentil      │ WhatsApp         │
  │  Seq 2 │ D0   │ Aviso de vencimento  │ WhatsApp         │
  │  Seq 3 │ D+3  │ Cobranca firme       │ WhatsApp + Email │
  │  Seq 4 │ D+7  │ Cobranca final       │ WhatsApp + Email │
  │  Seq 5 │ D+15 │ ESCALAR coordenador  │ WA + Email + Sist│
  └──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Motor de sequencia com 5 templates progressivos (gentil → escalar)
- Cooldown: max 1 cobranca/dia por boleto
- Escalacao D+15: notifica coordenador (Breno) via WhatsApp + sistema
- Relatorio de inadimplencia (taxa, top devedores, por sequencia)
- Dashboard financeiro (por status, vencendo hoje, pagos no mes)
- Atualizacao automatica de status (a_vencer → vencido)
- Log de atividade em cada cobranca enviada

**Endpoints:**
- `POST /api/cobranca` — Criar cobranca
- `GET /api/cobranca` — Listar com filtros
- `GET /api/cobranca/inadimplentes` — Agrupado por cliente
- `GET /api/cobranca/relatorio` — Relatorio completo de inadimplencia
- `GET /api/cobranca/dashboard` — Metricas resumidas
- `PATCH /api/cobranca/:id/pago` — Marcar como pago
- `PATCH /api/cobranca/:id/negociar` — Marcar como negociando
- `POST /api/cobranca/processar-manual` — Executar motor (admin)

---

### FASE 6: Comercial Inteligente ✅

**Data:** 26/02/2026 | **Commit:** (atual) | **Status:** COMPLETA

**Objetivo:** Qualificacao de leads com IA, scoring automatico, assignment, briefing, follow-up

**Arquivos Criados/Modificados:**

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `modules/comercial/qualifier.ts` | 470+ | Motor IA (qualificacao, scoring, assignment, briefing, follow-up, conversao) |
| `modules/comercial/worker.ts` | 280+ | 10 endpoints (CRUD + qualificar + agendar + briefing + converter + metricas) |
| `gateway/index.ts` | +14 | Crons: qualificacao IA (11h) + follow-ups (13h) |

**Pipeline Comercial IA:**

```
  ┌──────────────────────────────────────────────────────────┐
  │              PIPELINE COMERCIAL INTELIGENTE               │
  │                                                           │
  │  LEAD ENTRA                                               │
  │      │                                                    │
  │      ▼                                                    │
  │  ┌──────────────┐                                         │
  │  │ 1. CADASTRO  │  POST /api/comercial/lead               │
  │  │    manual ou │  Canal: site/whatsapp/indicacao/redes    │
  │  │    chatbot   │  Score inicial: urgencia-based           │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │         ▼                                                 │
  │  ┌──────────────┐                                         │
  │  │ 2. QUALIFIC. │  CRON 11h BR (14h UTC)                  │
  │  │    IA        │  GPT-4o-mini analisa:                    │
  │  │              │  - tipo caso + urgencia + canal          │
  │  │              │  - area_direito + valor_estimado         │
  │  │              │  - probabilidade_fechamento              │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │    ┌────┼─────────┐                                       │
  │    │    │         │                                       │
  │    ▼    ▼         ▼                                       │
  │  🔥     🟡        🔵                                      │
  │  QUENTE MORNO     FRIO                                    │
  │    │    │         │                                       │
  │    │    │         └─ Aguardar (sem closer)                │
  │    │    │                                                 │
  │    ▼    ▼                                                 │
  │  ┌──────────────┐                                         │
  │  │ 3. ATRIBUIR  │  Round-robin: usuario com menos leads   │
  │  │    CLOSER    │  Roles: comercial ou coordenador         │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │         ▼                                                 │
  │  ┌──────────────┐                                         │
  │  │ 4. BRIEFING  │  IA gera briefing completo:             │
  │  │    IA        │  - Score + area + valor estimado         │
  │  │              │  - Probabilidade + proxima acao          │
  │  │              │  - Dados do lead formatados              │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │         ▼ (se QUENTE)                                     │
  │  ┌──────────────┐                                         │
  │  │ 5. NOTIFICAR │  WhatsApp para closer:                  │
  │  │    CLOSER    │  "🔥 NOVO LEAD QUENTE!"                 │
  │  │              │  + briefing resumido                     │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │         ▼                                                 │
  │  ┌──────────────┐                                         │
  │  │ 6. AGENDAR   │  WhatsApp para lead:                    │
  │  │    REUNIAO   │  3 sugestoes de horario                  │
  │  │              │  Proximos 3 dias uteis                   │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │         ▼                                                 │
  │  ┌──────────────┐                                         │
  │  │ 7. BRIEFING  │  Pre-reuniao com IA:                    │
  │  │    REUNIAO   │  - Resumo do caso                       │
  │  │              │  - Pontos-chave + objecoes               │
  │  │              │  - Valor sugerido + estrategia           │
  │  └──────┬───────┘                                         │
  │         │                                                 │
  │    ┌────┼─────────┐                                       │
  │    ▼    ▼         │                                       │
  │  FECHOU PERDEU    │                                       │
  │    │              │                                       │
  │    ▼              │                                       │
  │  ┌──────────────┐ │                                       │
  │  │ 8. CONVERTER │ │  Lead → Cliente + Caso no D1          │
  │  │    CLIENTE   │ │  Status caso: triagem                  │
  │  └──────────────┘ │                                       │
  │                    ▼                                       │
  │  ┌──────────────────────────────────────┐                 │
  │  │ FOLLOW-UP AUTOMATICO (CRON 13h BR)  │                 │
  │  │                                      │                 │
  │  │  D+2-3:  "Conseguiu analisar?"      │                 │
  │  │  D+4-7:  "Horarios flexiveis"       │                 │
  │  │  D+8-10: "Mantemos na agenda"       │                 │
  │  │  D+30:   Marcar como PERDIDO        │                 │
  │  └──────────────────────────────────────┘                 │
  └──────────────────────────────────────────────────────────┘
```

**Metricas Comerciais:**

```
  ┌──────────────────────────────────────────────────────┐
  │               METRICAS DISPONIVEIS                    │
  │                                                       │
  │  PIPELINE:                                            │
  │    Novos → Qualificados → Agendados → Fechados       │
  │                                                       │
  │  SCORING:                                             │
  │    🔥 Quentes │ 🟡 Mornos │ 🔵 Frios                │
  │                                                       │
  │  CONVERSAO:                                           │
  │    Lead → Qualif (%) │ Qualif → Agend (%)            │
  │    Agend → Fechado (%) │ Taxa geral (%)              │
  │                                                       │
  │  POR CLOSER:                                          │
  │    Leads ativos │ Fechados/mes │ Taxa conversao      │
  │                                                       │
  │  POR CANAL:                                           │
  │    Site │ WhatsApp │ Indicacao │ Redes │ Outro       │
  │    Total + Fechados + Taxa por canal                  │
  │                                                       │
  │  PERIODO:                                             │
  │    Hoje │ Semana │ Mes │ Valor fechado no mes        │
  └──────────────────────────────────────────────────────┘
```

**Endpoints:**
- `POST /api/comercial/lead` — Criar lead (manual)
- `GET /api/comercial/leads` — Listar com filtros
- `GET /api/comercial/leads/quentes` — Leads prioritarios
- `PATCH /api/comercial/lead/:id/status` — Atualizar status/score
- `POST /api/comercial/qualificar-manual` — Executar qualificacao IA (admin)
- `POST /api/comercial/lead/:id/qualificar` — Qualificar lead especifico via IA
- `POST /api/comercial/lead/:id/agendar` — Enviar proposta agendamento (WhatsApp)
- `GET /api/comercial/lead/:id/sugestao-agendamento` — Sugerir horarios
- `GET /api/comercial/lead/:id/briefing` — Gerar briefing pre-reuniao (IA)
- `POST /api/comercial/lead/:id/converter` — Converter lead em cliente + caso
- `GET /api/comercial/metricas` — Metricas completas
- `GET /api/comercial/dashboard` — Dashboard resumido
- `POST /api/comercial/followup-manual` — Executar follow-ups (admin)

---

### FASE 7: Audiencias e Lembretes ⏳

**Status:** PENDENTE

**Objetivo:** Gestao de audiencias com lembretes D-7, D-3, D-1

**Modulo existente:** `modules/audiencias/worker.ts` (178 linhas - CRUD basico)

**Falta implementar:**
- [ ] Motor de lembretes em cascata (D-7, D-3, D-1)
- [ ] Cron de verificacao diaria
- [ ] Notificacao multi-canal (WhatsApp + Email + Sistema)
- [ ] Pos-audiencia: registro de resultado
- [ ] Integracao com cron gateway

---

### FASE 8: Dashboard & Pipeline ⏳

**Status:** PENDENTE

**Objetivo:** Dashboard Kanban em tempo real com metricas

**Modulo existente:** `modules/dashboard/worker.ts` (263 linhas - queries basicas)

**Falta implementar:**
- [ ] Pipeline visual do cliente (Comercial → Concluido)
- [ ] Metricas em tempo real por setor
- [ ] Alertas de prazos criticos
- [ ] Indicadores financeiros
- [ ] Export de relatorios

---

## Arvore de Arquivos Completa

```
automacao-teixeira-brito/
├── 01-MAPEAMENTO-PROCESSOS.md          # Mapeamento dos 10 setores
├── 02-ARQUITETURA-TECNICA.md           # Arquitetura tecnica
├── 03-PROPOSTA-COMERCIAL.md            # Proposta para cliente
├── 04-APRESENTACAO-CLIENTE.md          # Apresentacao (conteudo slides)
├── 05-CUSTOS-E-PRICING.md              # Custos e pricing
├── README.md                           # Visao geral
├── apresentacao.html                   # Alias do worker.js
├── package.json                        # Dependencias
├── tsconfig.json                       # Config TypeScript
├── wrangler.toml                       # Config Cloudflare Workers
├── worker.js                           # Apresentacao HTML (12 slides)
│
├── docs/                               # DOCUMENTACAO DO PROJETO
│   ├── PROGRESS.md                     # << ESTE ARQUIVO
│   ├── progress/                       # Historico por fase
│   ├── workflows/                      # Workflows visuais
│   └── architecture/                   # Diagramas de arquitetura
│
└── src/
    ├── gateway/
    │   └── index.ts                    # API Gateway (270 linhas)
    │                                    # Auth, CORS, rotas, crons, errors
    │
    ├── shared/
    │   ├── types.ts                    # 12 interfaces (216 linhas)
    │   ├── auth.ts                     # JWT auth (94 linhas)
    │   └── utils.ts                    # Helpers (102 linhas)
    │
    ├── integrations/
    │   ├── whatsapp.ts                 # Evolution API (123 linhas)
    │   ├── openai.ts                   # GPT-4o (126 linhas)
    │   ├── autentique.ts               # e-Sign (196 linhas)
    │   ├── onedrive.ts                 # MS Graph (133 linhas)
    │   └── email.ts                    # MailChannels (115 linhas)
    │
    └── modules/
        ├── triagem/                    # FASE 2 ✅
        │   ├── worker.ts              # 5 endpoints (194 linhas)
        │   ├── handlers.ts            # 9 passos POP 001 (420 linhas)
        │   └── templates.ts           # Templates WhatsApp (260 linhas)
        │
        ├── whatsapp/                   # FASE 3 ✅
        │   ├── worker.ts              # 6 endpoints (248 linhas)
        │   ├── chatbot.ts             # Motor IA (344 linhas)
        │   └── intents.ts             # 7 handlers (352 linhas)
        │
        ├── prazos/                     # FASE 4 ✅
        │   ├── worker.ts              # 8 endpoints (221 linhas)
        │   ├── scraper.ts             # Scraping TJ-GO (541 linhas)
        │   └── calculator.ts          # PI/PF/PR forense (284 linhas)
        │
        ├── cobranca/                   # FASE 5 ✅
        │   ├── worker.ts              # 8 endpoints (210+ linhas)
        │   └── engine.ts              # Motor cobranca (350+ linhas)
        │
        ├── comercial/                  # FASE 6 ✅
        │   ├── worker.ts              # 13 endpoints (280+ linhas)
        │   └── qualifier.ts           # Motor IA comercial (470+ linhas)
        │
        ├── audiencias/                 # FASE 7 ⏳
        │   └── worker.ts              # CRUD basico (178 linhas)
        │
        ├── documentos/                 # Suporte (todos as fases)
        │   └── worker.ts              # CRUD docs (146 linhas)
        │
        └── dashboard/                  # FASE 8 ⏳
            └── worker.ts              # Queries basicas (263 linhas)
```

---

## Historico de Commits

| # | Hash | Data | Mensagem |
|---|------|------|----------|
| 1 | `5db0e27` | 25/02 15:30 | feat: Squad Genius Robson Melo - estrutura completa |
| 2 | `1a8100f` | 25/02 22:36 | feat: FASE 1 completa - Fundacao do sistema de automacao IA |
| 3 | `1e5fbb9` | 25/02 23:01 | feat: FASE 2 - Modulo Triagem completo (9 passos POP 001) |
| 4 | `1f463c8` | 25/02 23:42 | feat: FASE 3 - Chatbot WhatsApp 24/7 com IA |
| 5 | `746e97b` | 26/02 09:09 | feat: FASE 4 - Gestao de Prazos IA completa |
| 6 | `ec5bd43` | 26/02 10:xx | feat: FASE 5 - Cobranca Automatica completa |
| 7 | `(atual)` | 26/02 xx:xx | feat: FASE 6 - Comercial Inteligente com IA |

---

## Stack Tecnologica

```
┌─────────────────────────────────────────────────────────┐
│                    STACK COMPLETA                        │
│                                                          │
│  RUNTIME          Cloudflare Workers (Edge Computing)    │
│  FRAMEWORK        Hono (ultrafast web framework)         │
│  LINGUAGEM        TypeScript (strict mode)               │
│  BANCO DE DADOS   Cloudflare D1 (SQLite distribuido)     │
│  CACHE/SESSOES    Cloudflare KV (key-value global)       │
│  STORAGE          Cloudflare R2 (S3 compat, 0 egress)    │
│  IA               OpenAI GPT-4o-mini (classificacao/gen) │
│  WHATSAPP         Evolution API (self-hosted)            │
│  ASSINATURA       Autentique (e-sign brasileiro)         │
│  STORAGE DOCS     Microsoft OneDrive (Graph API)         │
│  EMAIL            MailChannels (via CF Workers)           │
│  CRON             CF Workers Cron Triggers (5 jobs)       │
│  AUTH             JWT (custom, HMAC-SHA256)               │
└─────────────────────────────────────────────────────────┘
```

---

*Documento gerado e mantido automaticamente pelo Orion (AIOS Master)*
*Proxima atualizacao: ao concluir FASE 7*
