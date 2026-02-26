# Workflow Geral - Automacao Teixeira Brito

> Ultima atualizacao: 2026-02-26

---

## Workflow Master: Jornada Completa do Cliente

```
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                  JORNADA DO CLIENTE - TEIXEIRA BRITO                 ║
  ╠═══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐            ║
  ║  │ LEAD    │──▶│ TRIAGEM │──▶│ INICIAIS│──▶│  EM     │            ║
  ║  │ (Comerc)│   │ (POP001)│   │ (Peticao│   │ANDAMENT.│            ║
  ║  │ FASE 6  │   │ FASE 2  │   │  Ini.)  │   │         │            ║
  ║  └─────────┘   └─────────┘   └─────────┘   └────┬────┘            ║
  ║                                                   │                 ║
  ║                                    ┌──────────────┼──────────┐      ║
  ║                                    │              │          │      ║
  ║                              ┌─────▼───┐   ┌─────▼───┐ ┌────▼───┐ ║
  ║                              │AUDIENCIA│   │ RECURSO │ │ACORDO  │ ║
  ║                              │ FASE 7  │   │ FASE 4  │ │(Extra) │ ║
  ║                              └─────┬───┘   └─────┬───┘ └────┬───┘ ║
  ║                                    │              │          │      ║
  ║                                    └──────────────┼──────────┘      ║
  ║                                                   │                 ║
  ║                                             ┌─────▼───┐            ║
  ║                                             │CONCLUIDO│            ║
  ║                                             │         │            ║
  ║                                             └─────────┘            ║
  ║                                                                      ║
  ║  TRANSVERSAL (todas as etapas):                                      ║
  ║  [WhatsApp 24/7 - FASE 3] [Cobranca Auto - FASE 5]                 ║
  ║  [Dashboard - FASE 8] [Prazos IA - FASE 4]                          ║
  ╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Workflow 1: Captacao Comercial (FASE 6)

```
  LEAD ENTRA (site/whatsapp/indicacao/redes)
         │
         ▼
  ┌──────────────────┐
  │  QUALIFICACAO IA │  GPT-4o analisa:
  │                  │  - Tipo de caso
  │                  │  - Urgencia
  │                  │  - Viabilidade
  └────────┬─────────┘
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
  ┌─────┐┌─────┐┌─────┐
  │QUENT││MORNO││FRIO │
  │Score││Score││Score│
  └──┬──┘└──┬──┘└──┬──┘
     │      │      │
     ▼      ▼      ▼
  Agenda  Nurture  Arquivo
  Reuniao Sequence
     │
     ▼
  ┌──────────────────┐
  │  BRIEFING IA     │  GPT-4o gera briefing
  │  para Closer     │  com dados do lead
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  REUNIAO         │  Closer fecha contrato
  │  FECHAMENTO      │  → Dispara TRIAGEM
  └──────────────────┘
```

---

## Workflow 2: Triagem Automatizada (FASE 2)

```
  CONTRATO FECHADO (trigger do comercial)
         │
         ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  1. DADOS        │────▶│  2. GRUPO WA     │
  │  Receber info    │     │  Criar grupo     │
  │  do comercial    │     │  + boas-vindas    │
  └──────────────────┘     └────────┬─────────┘
                                    │
                                    ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  4. PROCURACAO   │◀────│  3. CONTRATO     │
  │  Gerar + enviar  │     │  Autentique      │
  │  Autentique      │     │  e-signature     │
  └────────┬─────────┘     └──────────────────┘
           │
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  5. PASTA OD     │────▶│  6. CADASTRO D1  │
  │  Criar estrutura │     │  Cliente + Caso   │
  │  OneDrive        │     │  no banco         │
  └──────────────────┘     └────────┬─────────┘
                                    │
                                    ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  7. COBRAR DOCS  │────▶│  8. VERIFICAR    │
  │  Checklist WA    │     │  Assinaturas     │
  │  automatico      │     │  Autentique      │
  └──────────────────┘     └────────┬─────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │  9. CONCLUIR     │
                           │  Pipeline →      │
                           │  Iniciais        │
                           └──────────────────┘
```

---

## Workflow 3: Atendimento WhatsApp 24/7 (FASE 3)

```
  MENSAGEM CHEGA (qualquer horario)
         │
         ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  ANTI-FLOOD  │───▶│  IDENTIFICAR │───▶│  CLASSIFICAR │
  │  10 msg/min  │    │  CLIENTE D1  │    │  3 CAMADAS   │
  └──────────────┘    └──────────────┘    └──────┬───────┘
                                                  │
           ┌──────────────┬──────────┬────────────┼────────┬──────────┐
           ▼              ▼          ▼            ▼        ▼          ▼
     ┌──────────┐  ┌──────────┐ ┌────────┐ ┌─────────┐ ┌────┐ ┌────────┐
     │ANDAMENTO │  │DOCUMENTO │ │PAGAMENT│ │AGENDAMEN│ │RECL│ │SAUDACAO│
     │Caso+prazo│  │Lista pend│ │Cobranca│ │Audiencia│ │ESCA│ │Menu 5  │
     │          │  │          │ │s       │ │s        │ │LA  │ │opcoes  │
     └──────────┘  └──────────┘ └────────┘ └─────────┘ └────┘ └────────┘
           │              │          │            │        │          │
           └──────────────┴──────────┴────────────┴────────┴──────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │  RESPOSTA + LOG   │
                                 │  WhatsApp + D1    │
                                 └──────────────────┘
```

---

## Workflow 4: Gestao de Prazos IA (FASE 4)

```
  CRON 08h SEG-SEX
         │
         ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                    PIPELINE DIARIO                           │
  │                                                              │
  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
  │  │ SCRAPING │──▶│ FILTRAR  │──▶│ CLASSIF. │──▶│ CALCULAR│ │
  │  │ TJ-GO    │   │ DUPLICAT │   │ IA GPT4o │   │ PI/PF/PR│ │
  │  │ DJE+PJe  │   │ KV Cache │   │ tipo+urg │   │ forense │ │
  │  └──────────┘   └──────────┘   └──────────┘   └────┬────┘ │
  │                                                      │      │
  │                                                      ▼      │
  │                                              ┌──────────┐  │
  │                                              │ SALVAR   │  │
  │                                              │ D1 + KV  │  │
  │                                              │ 3 prazos │  │
  │                                              └────┬─────┘  │
  │                                                   │        │
  └───────────────────────────────────────────────────┼────────┘
                                                      │
                                                      ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                 CASCATA DE NOTIFICACOES                      │
  │                                                              │
  │  D+1 (inicio)          PR (revisao)         PF-1 (vespera)  │
  │  ┌──────────┐         ┌──────────┐         ┌──────────┐    │
  │  │ Sistema  │         │ WhatsApp │         │ WhatsApp │    │
  │  │ Notific. │         │ + Email  │         │ + Email  │    │
  │  │ Info     │         │ REVISAO  │         │ URGENTE  │    │
  │  └──────────┘         └──────────┘         └──────────┘    │
  └──────────────────────────────────────────────────────────────┘
```

---

## Workflow 5: Cobranca Automatica (FASE 5 - PENDENTE)

```
  COBRANCA CRIADA (honorarios/custas/acordo)
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │              SEQUENCIA DE COBRANCA                       │
  │                                                          │
  │   D-3        D0         D+3        D+7        D+15      │
  │  ┌────┐    ┌────┐    ┌────┐    ┌────┐    ┌────┐        │
  │  │Lembr│──▶│Venci│──▶│Cobr │──▶│Cobr │──▶│Cobr │        │
  │  │ete  │   │mento│   │anca│   │anca│   │anca│        │
  │  │Gentil│   │Info │   │Firme│   │Final│   │Legal│        │
  │  └────┘    └────┘    └────┘    └────┘    └────┘        │
  │                                             │            │
  │                                             ▼            │
  │                                      ┌────────────┐     │
  │                                      │ ESCALAR    │     │
  │                                      │ p/ Breno   │     │
  │                                      │ (Coord.)   │     │
  │                                      └────────────┘     │
  └──────────────────────────────────────────────────────────┘
```

---

## Workflow 6: Audiencias e Lembretes (FASE 7 - PENDENTE)

```
  AUDIENCIA AGENDADA
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │              CASCATA DE LEMBRETES                        │
  │                                                          │
  │   D-7              D-3              D-1                  │
  │  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
  │  │ WhatsApp │    │ WhatsApp │    │ WhatsApp │          │
  │  │ + Email  │    │ + Email  │    │ + Email  │          │
  │  │ "Agenda" │    │ "Prep."  │    │ "AMANHA" │          │
  │  │          │    │ Docs     │    │ Endereco │          │
  │  │ Cliente +│    │ + Orient.│    │ + Hora   │          │
  │  │ Advogado │    │          │    │ + Mapa   │          │
  │  └──────────┘    └──────────┘    └──────────┘          │
  │                                                          │
  │                    POS-AUDIENCIA                          │
  │                  ┌──────────────┐                        │
  │                  │ Registrar    │                        │
  │                  │ resultado    │                        │
  │                  │ + proximo    │                        │
  │                  │ passo        │                        │
  │                  └──────────────┘                        │
  └──────────────────────────────────────────────────────────┘
```

---

## Workflow de Crons (Scheduled Triggers)

```
  ┌─────────────────────────────────────────────────────────────┐
  │                CRON SCHEDULE (SEG-SEX)                      │
  │                                                              │
  │  07:00 ─── Cobrar documentos faltantes (triagem)            │
  │      │     Verifica assinaturas pendentes Autentique         │
  │      │     Envia WhatsApp cobrando docs                      │
  │      │                                                       │
  │  08:00 ─── Scraping TJ-GO + Classificacao IA  ← FASE 4 ✅  │
  │      │     Busca publicacoes DJE/PJe                         │
  │      │     Classifica com GPT-4o                              │
  │      │     Cria prazos PI/PF/PR                              │
  │      │                                                       │
  │  09:00 ─── Lembretes prazos + audiencias  ← FASE 4 ✅       │
  │      │     Envia WhatsApp + Email para advogados             │
  │      │     Atualiza status de prazos vencidos                │
  │      │                                                       │
  │  10:00 ─── Processar cobrancas  ← FASE 5 (pendente)         │
  │      │     Sequencia D-3 a D+15                              │
  │      │                                                       │
  │  14:00 ─── Verificar assinaturas pendentes                   │
  │            Checar status Autentique                           │
  │            Cobrar assinaturas atrasadas                       │
  └─────────────────────────────────────────────────────────────┘
```

---

## Mapa de Integracoes

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                     MAPA DE INTEGRACOES                         │
  │                                                                  │
  │                    ┌───────────────────┐                         │
  │                    │   WORKER API      │                         │
  │                    │   (Hono + CF)     │                         │
  │                    └─────────┬─────────┘                         │
  │                              │                                   │
  │         ┌────────────────────┼────────────────────┐              │
  │         │                    │                    │              │
  │    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐         │
  │    │  D1     │         │  KV     │         │  R2     │         │
  │    │ SQLite  │         │ Cache   │         │ Storage │         │
  │    │ 12 tabs │         │ Sessoes │         │ Docs    │         │
  │    └─────────┘         └─────────┘         └─────────┘         │
  │                                                                  │
  │    ┌────────────────────────────────────────────────────┐       │
  │    │              INTEGRACOES EXTERNAS                   │       │
  │    │                                                     │       │
  │    │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │       │
  │    │  │Evolution │  │  OpenAI  │  │Autentique│         │       │
  │    │  │API       │  │ GPT-4o   │  │ e-Sign   │         │       │
  │    │  │WhatsApp  │  │ mini     │  │          │         │       │
  │    │  └──────────┘  └──────────┘  └──────────┘         │       │
  │    │                                                     │       │
  │    │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │       │
  │    │  │MS Graph  │  │  Mail    │  │  TJ-GO   │         │       │
  │    │  │OneDrive  │  │ Channels │  │ DJE/PJe  │         │       │
  │    │  │          │  │ Email    │  │ Scraping  │         │       │
  │    │  └──────────┘  └──────────┘  └──────────┘         │       │
  │    └────────────────────────────────────────────────────┘       │
  └─────────────────────────────────────────────────────────────────┘
```

---

*Documento gerado pelo Orion (AIOS Master) - Atualizado a cada fase*
