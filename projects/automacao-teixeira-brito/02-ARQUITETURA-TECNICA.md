# ARQUITETURA TECNICA - AUTOMACAO TEIXEIRA BRITO

## Projeto: IA 24/7 para Escritorio de Advocacia
## Cliente: Teixeira Brito Advocacia
## Data: 25/02/2026

---

## 1. VISAO GERAL DA ARQUITETURA

```
                    ┌─────────────────────────┐
                    │   CLIENTES / LEADS       │
                    │  (WhatsApp, Site, Tel)    │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   CAMADA DE ENTRADA       │
                    │  WhatsApp Business API    │
                    │  Chatbot IA (n8n/Make)    │
                    │  Site + Formularios       │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   ORQUESTRADOR CENTRAL    │
                    │  n8n (Self-hosted) ou     │
                    │  Make (Cloud)             │
                    │  + Agentes IA (OpenAI)    │
                    └──────────┬───────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
    │  ASTREA (API)  │ │  AUTENTIQUE │ │  ONEDRIVE    │
    │  Casos/Prazos  │ │  Assinaturas│ │  Documentos  │
    └────────────────┘ └─────────────┘ └──────────────┘
              │                │                │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
    │  WHATSAPP API  │ │   EMAIL     │ │  DASHBOARD   │
    │  Notificacoes  │ │  SMTP/Gmail │ │  Monitoramento│
    └────────────────┘ └─────────────┘ └──────────────┘
```

---

## 2. STACK TECNOLOGICO

### 2.1 Orquestrador de Automacao

**Opcao A (Recomendada): n8n Self-Hosted**
- Custo: ~R$50-100/mes (VPS)
- Vantagem: Sem limite de execucoes, controle total, LGPD
- Setup: Docker em VPS (DigitalOcean/Hetzner)

**Opcao B: Make (Integromat)**
- Custo: ~R$300-600/mes (plano Pro)
- Vantagem: Mais facil de manter, sem servidor
- Limitacao: Limite de operacoes por mes

**Decisao:** n8n e mais vantajoso para volume alto de automacoes de um escritorio com 100+ clientes.

### 2.2 IA / LLM

| Componente | Tecnologia | Custo Estimado |
|-----------|-----------|----------------|
| Chatbot WhatsApp | OpenAI GPT-4o-mini | ~R$100-300/mes |
| Geracao de documentos | OpenAI GPT-4o | ~R$200-500/mes |
| Analise de intimacoes | OpenAI GPT-4o | ~R$100-200/mes |
| Classificacao de leads | OpenAI GPT-4o-mini | ~R$50-100/mes |

### 2.3 Integracoes

| Sistema | Metodo de Integracao | Complexidade |
|---------|---------------------|-------------|
| **WhatsApp** | Evolution API (self-hosted) ou Z-API | Media |
| **Astrea** | API REST (verificar disponibilidade) ou RPA | Alta |
| **Autentique** | API REST oficial | Baixa |
| **OneDrive** | Microsoft Graph API | Media |
| **Email** | SMTP/IMAP (Gmail ou Outlook) | Baixa |
| **Sites TJ** | Web scraping (Puppeteer/Playwright) | Alta |

### 2.4 Infraestrutura

| Componente | Tecnologia | Custo/mes |
|-----------|-----------|-----------|
| Servidor n8n | VPS 4GB RAM (Hetzner/DO) | R$50-100 |
| Banco de dados | PostgreSQL (no mesmo VPS) | Incluso |
| WhatsApp API | Evolution API (self-hosted) | R$0-50 |
| Backup | Automatico diario | R$20-30 |
| Dominio + SSL | Cloudflare | R$0-20 |
| **Total infra** | | **R$70-200/mes** |

---

## 3. MODULOS DE AUTOMACAO

### MODULO 1: TRIAGEM AUTOMATIZADA (Prioridade ALTA)

**Fluxo automatizado:**
```
1. Comercial preenche formulario com dados do cliente
   ↓
2. IA cria automaticamente:
   - Grupo WhatsApp (via API)
   - Contrato (template preenchido com dados)
   - Procuracao (template preenchido)
   ↓
3. Envia via Autentique para assinatura
   ↓
4. Monitora assinaturas automaticamente (lembrete D+1)
   ↓
5. Ao assinar:
   - Cria pasta no OneDrive (nomenclatura padrao)
   - Cria Caso no Astrea
   - Envia email ao Coordenador + Financeiro
   ↓
6. Verifica checklist de documentos vs recebidos
   ↓
7. Cobra documentos faltantes a cada 2 dias (WhatsApp)
   ↓
8. Quando completo: email para Coordenador + Controller
```

**Economia:** 10-15h/semana | **Complexidade:** Media

---

### MODULO 2: GESTAO DE PRAZOS INTELIGENTE (Prioridade ALTA)

**Fluxo automatizado:**
```
1. IA monitora publicacoes nos sites dos TJs (scraping)
   ↓
2. Identifica intimacoes do escritorio
   ↓
3. Classifica tipo (decisao, sentenca, audiencia, julgamento)
   ↓
4. Calcula e lanca prazos automaticamente:
   - PI (Prazo Inicial)
   - PF (Prazo Fatal)
   - PR (Prazo Revisao = PF - 4 dias)
   ↓
5. Notifica Controller + Advogado responsavel
   ↓
6. Envia lembretes automaticos:
   - D+1: Tarefa para Relacionamento (comunicar cliente)
   - PR: Alerta para Coordenador (revisao)
   - PF-1: Alerta final para protocolo
   ↓
7. Pos-protocolo: verifica no site do TJ se foi efetivado
```

**Economia:** 8-12h/semana | **Complexidade:** Alta

---

### MODULO 3: ATENDIMENTO 24/7 VIA WHATSAPP (Prioridade ALTA)

**Fluxo automatizado:**
```
1. Cliente envia mensagem no grupo WhatsApp
   ↓
2. Chatbot IA identifica intencao:
   a) Duvida sobre andamento → Consulta Astrea → Responde
   b) Envio de documento → Salva no OneDrive → Confirma
   c) Duvida sobre pagamento → Consulta financeiro → Responde
   d) Agendamento → Oferece horarios → Agenda
   e) Assunto complexo → Escala para humano (Lucas/Advogado)
   ↓
3. Registro de todas interacoes para historico
   ↓
4. Dashboard de atendimentos para gestao
```

**Economia:** 10-15h/semana | **Complexidade:** Media-Alta

---

### MODULO 4: COBRANCA AUTOMATIZADA (Prioridade ALTA)

**Fluxo automatizado:**
```
1. Sistema identifica boletos vencidos / a vencer
   ↓
2. Sequencia de cobranca automatica:
   - D-3: Lembrete amigavel via WhatsApp
   - D0: Boleto vence, lembrete
   - D+3: Cobranca educada
   - D+7: Cobranca formal
   - D+15: Alerta para coordenador (escalar)
   ↓
3. Ao receber pagamento: confirma + atualiza sistema
   ↓
4. Relatorio semanal de inadimplencia
```

**Economia:** 5-8h/semana | **Complexidade:** Baixa-Media

---

### MODULO 5: COMERCIAL INTELIGENTE (Prioridade MEDIA)

**Fluxo automatizado:**
```
1. Lead chega (site, indicacao, redes sociais)
   ↓
2. Chatbot IA faz pre-qualificacao:
   - Tipo de caso
   - Urgencia
   - Documentos disponiveis
   - Expectativa
   ↓
3. Classifica: Quente / Morno / Frio
   ↓
4. Quente → Agenda reuniao com Closer automaticamente
   Morno → Entra em sequencia de nurturing
   Frio → Descartado com mensagem educada
   ↓
5. Prepara briefing para o Closer antes da reuniao
```

**Economia:** 5-8h/semana | **Complexidade:** Media

---

### MODULO 6: AUDIENCIAS E LEMBRETES (Prioridade MEDIA)

**Fluxo automatizado:**
```
1. Audiencia cadastrada no Astrea
   ↓
2. Lembretes automaticos:
   - D-7: Lembrete ao advogado + cliente
   - D-3: Alinhamento com cliente (detalhes, horario, local)
   - D-1: Confirmacao final
   ↓
3. Pos-audiencia:
   - Email automatico com template preenchido
   - Atualizar Astrea com resultado
   - Se acordo: monitorar pagamento
   - Se nao: lancar proximos prazos
```

**Economia:** 3-5h/semana | **Complexidade:** Baixa

---

### MODULO 7: GERACAO DE DOCUMENTOS COM IA (Prioridade MEDIA)

**Capacidades:**
```
- Gerar rascunho de Contrato de Honorarios (template + dados)
- Gerar rascunho de Procuracao (template + dados)
- Gerar rascunho de peticoes simples (modelo + caso)
- Gerar emails padronizados (follow-up, cobranca, notificacao)
- Gerar relatorios de andamento para cliente
```

**Nota:** Todos os documentos juridicos passam por revisao humana obrigatoria.

**Economia:** 5-8h/semana | **Complexidade:** Media

---

### MODULO 8: DASHBOARD E RELATORIOS (Prioridade BAIXA)

**Funcionalidades:**
```
- Visao geral de todos os casos ativos
- Status de prazos (vencendo, vencidos, em dia)
- Metricas de atendimento (tempo de resposta, satisfacao)
- Metricas financeiras (honorarios, inadimplencia)
- Performance por setor/colaborador
- Alertas em tempo real
```

**Complexidade:** Media

---

## 4. FASES DE IMPLEMENTACAO

### FASE 1: FUNDACAO (Semana 1-3) - Setup + Triagem
- Configurar infraestrutura (VPS, n8n, banco de dados)
- Integrar WhatsApp Business API
- Integrar OneDrive (Microsoft Graph)
- Integrar Autentique API
- Implementar Modulo 1 (Triagem Automatizada)
- Testes end-to-end com caso real

### FASE 2: COMUNICACAO (Semana 4-6) - Atendimento + Cobranca
- Implementar Modulo 3 (Chatbot WhatsApp 24/7)
- Implementar Modulo 4 (Cobranca Automatizada)
- Treinar IA com FAQs do escritorio
- Implementar escalacao para humanos
- Testes com clientes reais (piloto)

### FASE 3: PRAZOS (Semana 7-10) - Controladoria Inteligente
- Integrar com Astrea (API ou RPA)
- Implementar scraping de publicacoes TJ
- Implementar Modulo 2 (Gestao de Prazos)
- Implementar Modulo 6 (Audiencias e Lembretes)
- Testes rigorosos (prazos sao criticos)

### FASE 4: OTIMIZACAO (Semana 11-14) - Comercial + Docs + Dashboard
- Implementar Modulo 5 (Comercial Inteligente)
- Implementar Modulo 7 (Geracao de Documentos)
- Implementar Modulo 8 (Dashboard)
- Otimizacoes baseadas em feedback
- Treinamento da equipe

### FASE 5: MANUTENCAO CONTÍNUA (Mes 4+)
- Monitoramento 24/7
- Ajustes e melhorias
- Novos modulos sob demanda
- Suporte tecnico

---

## 5. RISCOS E MITIGACOES

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Astrea sem API publica | Alta | Alto | Usar RPA (Puppeteer) como alternativa |
| Equipe resistente a mudanca | Media | Medio | Treinamento gradual, mostrar beneficios |
| IA gerar resposta incorreta | Media | Alto | Revisao humana obrigatoria, prompts bem definidos |
| WhatsApp banir numero | Baixa | Alto | Usar API oficial (Business API) |
| Perda de prazo por falha | Baixa | Critico | Sistema redundante, alertas multiplos, fallback humano |
| LGPD / dados sensiveis | Media | Alto | Criptografia, acesso controlado, servidor no Brasil |

---

## 6. DEPENDENCIAS CRITICAS A VERIFICAR

1. **Astrea tem API?** → Se nao, precisamos de RPA (custo e complexidade maiores)
2. **WhatsApp Business API aprovada?** → Processo de aprovacao Meta (~2-4 semanas)
3. **Acesso aos sites TJ** → Verificar se permitem scraping ou tem API
4. **Templates de documentos** → Precisamos dos modelos atuais de contrato, procuracao, etc.
5. **Acesso OneDrive** → Permissoes de API para criar pastas/arquivos
