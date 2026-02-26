# Arquitetura do Sistema - Automacao Teixeira Brito

> Ultima atualizacao: 2026-02-26

---

## Visao Geral da Arquitetura

```
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                    ARQUITETURA CLOUD-NATIVE                          ║
  ║                    Cloudflare Workers (Edge)                         ║
  ╠═══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ┌─────────────────────────────────────────────────────────────┐    ║
  ║  │                    CDN / EDGE NETWORK                       │    ║
  ║  │                   (200+ data centers)                       │    ║
  ║  └───────────────────────────┬─────────────────────────────────┘    ║
  ║                              │                                      ║
  ║  ┌───────────────────────────▼─────────────────────────────────┐    ║
  ║  │                   CLOUDFLARE WORKER                         │    ║
  ║  │                  teixeira-brito-api                          │    ║
  ║  │                                                              │    ║
  ║  │  ┌──────────────────────────────────────────────────────┐   │    ║
  ║  │  │                    HONO FRAMEWORK                     │   │    ║
  ║  │  │                                                       │   │    ║
  ║  │  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │   │    ║
  ║  │  │  │  CORS  │  │  AUTH  │  │ ERROR  │  │  LOG   │    │   │    ║
  ║  │  │  │Middlew.│  │ JWT    │  │Handler │  │        │    │   │    ║
  ║  │  │  └────────┘  └────────┘  └────────┘  └────────┘    │   │    ║
  ║  │  │                                                       │   │    ║
  ║  │  │  ┌──────────────────────────────────────────────┐    │   │    ║
  ║  │  │  │              API GATEWAY (index.ts)           │    │   │    ║
  ║  │  │  │                                               │    │   │    ║
  ║  │  │  │  /auth/*     → Login, Register               │    │   │    ║
  ║  │  │  │  /api/*      → Modulos (protegido JWT)       │    │   │    ║
  ║  │  │  │  /webhook/*  → WhatsApp (publico)            │    │   │    ║
  ║  │  │  │  /cron/*     → Triggers agendados            │    │   │    ║
  ║  │  │  └──────────────────────────────────────────────┘    │   │    ║
  ║  │  └──────────────────────────────────────────────────────┘   │    ║
  ║  │                                                              │    ║
  ║  │  ┌─────────────────────────────────────────────────────┐    │    ║
  ║  │  │                    8 MODULOS                         │    │    ║
  ║  │  │                                                      │    │    ║
  ║  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │    ║
  ║  │  │  │Triagem │ │WhatsApp│ │ Prazos │ │Cobranca│       │    │    ║
  ║  │  │  │ FASE 2 │ │ FASE 3 │ │ FASE 4 │ │ FASE 5 │       │    │    ║
  ║  │  │  │  ✅    │ │  ✅    │ │  ✅    │ │  ⏳    │       │    │    ║
  ║  │  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │    ║
  ║  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │    ║
  ║  │  │  │Comercia│ │Audienc.│ │Document│ │Dashboar│       │    │    ║
  ║  │  │  │ FASE 6 │ │ FASE 7 │ │ Suport │ │ FASE 8 │       │    │    ║
  ║  │  │  │  ⏳    │ │  ⏳    │ │  ✅    │ │  ⏳    │       │    │    ║
  ║  │  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │    ║
  ║  │  └─────────────────────────────────────────────────────┘    │    ║
  ║  └─────────────────────────────────────────────────────────────┘    ║
  ║                                                                      ║
  ║  ┌────────────────────────────────────────────────────────────┐     ║
  ║  │                   DATA LAYER                                │     ║
  ║  │                                                             │     ║
  ║  │  ┌──────────────┐  ┌────────────┐  ┌────────────────┐     │     ║
  ║  │  │     D1       │  │    KV      │  │      R2        │     │     ║
  ║  │  │   SQLite     │  │ Key-Value  │  │  Object Store  │     │     ║
  ║  │  │              │  │            │  │                │     │     ║
  ║  │  │ - usuarios   │  │ SESSIONS:  │  │ DOCS:          │     │     ║
  ║  │  │ - clientes   │  │  JWT sess  │  │  contratos     │     │     ║
  ║  │  │ - casos      │  │  chatbot   │  │  procuracoes   │     │     ║
  ║  │  │ - prazos     │  │            │  │  peticoes      │     │     ║
  ║  │  │ - cobrancas  │  │ CACHE:     │  │  documentos    │     │     ║
  ║  │  │ - leads      │  │  anti-flood│  │  pessoais      │     │     ║
  ║  │  │ - audiencias │  │  pub dedup │  │                │     │     ║
  ║  │  │ - documentos │  │  lembretes │  │                │     │     ║
  ║  │  │ - atendiment │  │            │  │                │     │     ║
  ║  │  │ - notificaco │  │            │  │                │     │     ║
  ║  │  │ - atividades │  │            │  │                │     │     ║
  ║  │  └──────────────┘  └────────────┘  └────────────────┘     │     ║
  ║  └────────────────────────────────────────────────────────────┘     ║
  ╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Modelo de Dados (D1)

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                     MODELO DE DADOS (D1)                         │
  │                                                                   │
  │                        ┌──────────┐                              │
  │                        │ USUARIOS │                              │
  │                        │ id       │                              │
  │                        │ nome     │                              │
  │                        │ email    │                              │
  │                        │ role     │                              │
  │                        │ setor    │                              │
  │                        └────┬─────┘                              │
  │                             │ 1:N                                │
  │                    ┌────────┼────────┐                           │
  │                    │        │        │                           │
  │              ┌─────▼──┐ ┌──▼─────┐ ┌▼────────┐                 │
  │              │ LEADS  │ │CLIENTES│ │ATIVIDADE│                 │
  │              │ id     │ │ id     │ │  _LOG   │                 │
  │              │ nome   │ │ nome   │ │ id      │                 │
  │              │ score  │ │ cpf    │ │ acao    │                 │
  │              │ status │ │ status │ │ descr.  │                 │
  │              └────────┘ └───┬────┘ └─────────┘                 │
  │                             │ 1:N                                │
  │                    ┌────────┼────────┐                           │
  │                    │        │        │                           │
  │              ┌─────▼──┐ ┌──▼─────┐ ┌▼────────┐                 │
  │              │ CASOS  │ │ATENDIM.│ │COBRANCAS│                 │
  │              │ id     │ │ id     │ │ id      │                 │
  │              │ tipo   │ │ canal  │ │ valor   │                 │
  │              │ status │ │ tipo   │ │ status  │                 │
  │              │ fase   │ │ resp.  │ │ seq.    │                 │
  │              └───┬────┘ └────────┘ └─────────┘                 │
  │                  │ 1:N                                           │
  │         ┌────────┼────────┬────────────┐                        │
  │         │        │        │            │                        │
  │   ┌─────▼──┐ ┌──▼─────┐ ┌▼────────┐ ┌▼──────────┐            │
  │   │PRAZOS  │ │AUDIENC.│ │DOCUMENT.│ │NOTIFICACO│            │
  │   │ id     │ │ id     │ │ id      │ │  ES       │            │
  │   │ tipo   │ │ tipo   │ │ tipo    │ │ id        │            │
  │   │ PI/PF/ │ │ data   │ │ url_r2  │ │ tipo      │            │
  │   │ PR     │ │ status │ │ status  │ │ canal     │            │
  │   │ status │ │        │ │ assin.  │ │           │            │
  │   └────────┘ └────────┘ └─────────┘ └───────────┘            │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Seguranca

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    CAMADAS DE SEGURANCA                      │
  │                                                              │
  │  LAYER 1: Cloudflare (DDoS, WAF, Rate Limit)               │
  │  ──────────────────────────────────────────                  │
  │  - DDoS Protection (automatico)                              │
  │  - SSL/TLS end-to-end                                        │
  │  - Rate limiting por IP                                      │
  │                                                              │
  │  LAYER 2: CORS + Auth Middleware                             │
  │  ──────────────────────────────────────────                  │
  │  - CORS configurado (origin: *)                              │
  │  - JWT HMAC-SHA256 (todas as /api/* rotas)                   │
  │  - Webhook WhatsApp: publico (validado internamente)         │
  │                                                              │
  │  LAYER 3: Application Security                               │
  │  ──────────────────────────────────────────                  │
  │  - Roles: admin, coordenador, advogado, assistente, comerc.  │
  │  - Anti-flood chatbot (10 msg/min via KV)                    │
  │  - Scraping manual: apenas admin/coordenador                 │
  │  - Passwords: PBKDF2 hash (crypto.subtle)                    │
  │                                                              │
  │  LAYER 4: Data Security                                      │
  │  ──────────────────────────────────────────                  │
  │  - D1: dados no edge Cloudflare (criptografado em repouso)  │
  │  - KV: TTL automatico (sessoes 24h, cache 30d)              │
  │  - R2: bucket privado (acesso via Worker apenas)             │
  │  - Secrets via wrangler secret put (nunca em codigo)         │
  └──────────────────────────────────────────────────────────────┘
```

---

## Performance

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    METRICAS DE PERFORMANCE                   │
  │                                                              │
  │  Latencia API (p50):          < 50ms  (edge computing)      │
  │  Latencia API (p99):          < 200ms                        │
  │  Cold start Worker:           < 5ms   (V8 isolates)         │
  │  Throughput:                  10K req/s (por datacenter)     │
  │                                                              │
  │  D1 Query (simples):          < 10ms                        │
  │  D1 Query (JOIN):             < 30ms                        │
  │  KV Read:                     < 5ms                         │
  │  KV Write:                    < 50ms (global propagation)   │
  │  R2 Upload:                   < 200ms (depende do tamanho)  │
  │                                                              │
  │  OpenAI GPT-4o-mini:          200-500ms (classificacao)     │
  │  Evolution API:               100-300ms (envio WhatsApp)    │
  │  Autentique API:              300-500ms                      │
  │  OneDrive Graph API:          200-400ms                      │
  │  TJ-GO Scraping:              500-2000ms (por processo)     │
  └──────────────────────────────────────────────────────────────┘
```

---

## Custo Estimado (Producao)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    CUSTOS CLOUDFLARE                          │
  │                                                              │
  │  Workers Free:       100K req/dia  (suficiente para inicio)  │
  │  Workers Paid ($5):  10M req/mes   (escala)                  │
  │                                                              │
  │  D1 Free:            5GB storage + 5M rows read/dia          │
  │  KV Free:            100K reads + 1K writes/dia              │
  │  R2 Free:            10GB storage + 1M Class A ops           │
  │                                                              │
  │  TOTAL CLOUDFLARE:   $0-5/mes (fase inicial)                │
  │                                                              │
  │  ┌──────────────────────────────────────────────────┐       │
  │  │  CUSTOS EXTERNOS                                  │       │
  │  │                                                   │       │
  │  │  OpenAI GPT-4o-mini: ~$5-15/mes (classificacao)  │       │
  │  │  Evolution API: self-hosted (custo servidor)      │       │
  │  │  Autentique: plano do escritorio (ja existente)   │       │
  │  │  OneDrive: licenca M365 (ja existente)            │       │
  │  │  MailChannels: gratuito via CF Workers            │       │
  │  │                                                   │       │
  │  │  TOTAL EXTERNO: ~$5-20/mes                        │       │
  │  └──────────────────────────────────────────────────┘       │
  │                                                              │
  │  CUSTO TOTAL INFRAESTRUTURA: ~$10-25/mes                    │
  └──────────────────────────────────────────────────────────────┘
```

---

*Documento gerado pelo Orion (AIOS Master) - Atualizado a cada fase*
