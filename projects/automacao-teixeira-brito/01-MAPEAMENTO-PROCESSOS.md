# MAPEAMENTO DE PROCESSOS - TEIXEIRA BRITO ADVOCACIA

## Escritorio: Teixeira Brito Advocacia (Goias)
## Data: 25/02/2026
## Baseado em: 3 POPs + Planilha Cargos + Mapa Mental + Workflow + Flashcards

---

## 1. ESTRUTURA ORGANIZACIONAL

### 10 Setores Operacionais

| # | Setor | Responsavel | Funcao Principal |
|---|-------|------------|------------------|
| 1 | Comercial | Riany (SDR/Social Seller) + Closer | Captacao de leads e fechamento de contratos |
| 2 | Triagem | Colaborador(a) designado(a) | Onboarding do cliente + documentacao |
| 3 | Controladoria | Danielle (Controller/Coordenadora) | Prazos processuais + intimacoes |
| 4 | Iniciais | Joelma (Advogada) + Arthur (Revisor) | Peticoes iniciais |
| 5 | Prazos | Bruna, Lorrane, Luciano, Weverton, Sarah | Peticoes processuais (recursos, contestacoes) |
| 6 | Relacionamento | Lucas (Back Office) | Atendimento ao cliente + boletos |
| 7 | Extrajudicial | Pedro Felipe | Resolucoes extrajudiciais |
| 8 | Holding | Karla, Marcondes, Guilherme, Ricardo | Societario + contratos sociais |
| 9 | Cobranca | Breno (Coord.) + Yasmyn (Assistente) | Cobranca de honorarios |
| 10 | Financeiro/RH | Breno | Controle financeiro + boletos |

### Equipe Total: ~15+ colaboradores nomeados

---

## 2. SISTEMAS ATUAIS

| Sistema | Uso | Setor |
|---------|-----|-------|
| **Astrea** | Gestao de casos/processos, prazos, tarefas | Todos |
| **Autentique** | Assinatura eletronica de contratos/procuracoes | Triagem, Comercial |
| **OneDrive** | Armazenamento de documentos (pastas por cliente) | Todos |
| **WhatsApp** | Comunicacao com clientes + grupos internos | Todos |
| **Email** | Comunicacao formal interna (padrao de assunto definido) | Todos |
| **Calendly/Agenda** | Agendamento (mencionado indiretamente) | Comercial |
| **Sites TJ** | Consulta de publicacoes/intimacoes | Controladoria |

---

## 3. PROCESSOS MAPEADOS (DETALHADO)

### 3.1 PROCESSO: TRIAGEM (POP 001) - 9 Passos

**Trigger:** Comercial fecha contrato e envia dados ao grupo WhatsApp "Triagem - TEIXEIRA BRITO ADVOCACIA"

| Passo | Acao | Responsavel | Sistema | Tempo | Automatizavel? |
|-------|------|------------|---------|-------|----------------|
| 1 | Receber demanda + criar grupo WhatsApp "Juridico - NOME DO CLIENTE" | Triagem | WhatsApp | 15 min | PARCIAL |
| 2 | Redigir Contrato + Procuracao, enviar via Autentique | Triagem | Autentique | 30-60 min | SIM |
| 3 | Monitorar assinaturas (cobrar apos 1 dia util) | Triagem | Autentique, WhatsApp | Recorrente | SIM |
| 4 | Enviar docs assinados ao Coordenador + Financeiro (CC Socios) | Triagem | Email | 10 min | SIM |
| 5 | Criar pasta do cliente no OneDrive (nomenclatura padrao) | Triagem | OneDrive | 15 min | SIM |
| 6 | Criar "Caso" no Astrea (campos especificos) | Triagem | Astrea | 20 min | PARCIAL |
| 7 | Checar documentos vs checklist, solicitar faltantes | Triagem | WhatsApp, OneDrive | 30 min | PARCIAL |
| 8 | Monitorar envio de docs (cobrar a cada 2 dias uteis) | Triagem | WhatsApp | Recorrente | SIM |
| 9 | Comunicar conclusao ao Coordenador + Controller | Triagem | Email | 10 min | SIM |

**Tempo total estimado por caso:** 2-4 horas (sem esperas)
**Potencial de automacao:** 70-80%

---

### 3.2 PROCESSO: PRAZOS JUDICIAIS (POP 002) - 3 Sub-procedimentos

#### 3.2.1 Intimacao de Decisoes/Sentencas (10 Passos)

| Passo | Acao | Responsavel | Sistema | Automatizavel? |
|-------|------|------------|---------|----------------|
| 1 | Receber intimacao + lancar prazos (PI, PF, PR) | Controller | Astrea | PARCIAL |
| 2 | Lancar tarefa D+1 para Relacionamento (comunicar cliente) | Controller | Astrea | SIM |
| 3 | Advogado analisa decisao + define estrategia + solicita guia | Advogado | Astrea | NAO (decisao humana) |
| 4 | Assistente Controladoria emite guia D+1 | Assistente | Site TJ | PARCIAL |
| 5 | Coordenador valida guia | Coordenador | Email | NAO (validacao humana) |
| 6 | Relacionamento envia boleto ao cliente + monitora pagamento | Relacionamento | WhatsApp, Email | SIM |
| 7 | Advogado redige peticao ate PR (D-4 do PF) | Advogado | Word | NAO (trabalho juridico) |
| 8 | Coordenador revisa peticao D-3 | Coordenador | Word | NAO (revisao humana) |
| 9 | Advogado envia peticao final ate 15h do PF (Word + PDF) | Advogado | Email | PARCIAL |
| 10 | Assistente protocola + Controller confere no TJ | Assistente, Controller | Site TJ, Astrea | PARCIAL |

**Potencial de automacao:** 40-50% (muitas decisoes juridicas humanas)

#### 3.2.2 Audiencias - Conciliacao e Instrucao (4 Passos)

| Passo | Acao | Responsavel | Automatizavel? |
|-------|------|------------|----------------|
| 1 | Lancar lembretes (D+1, 1 semana antes, 1 dia antes) | Controller | SIM |
| 2 | Alinhar com cliente D-3 | Relacionamento | PARCIAL |
| 3 | Pos-audiencia: email com resumo + acordo | Advogado | PARCIAL |
| 4 | Verificar ata + atualizar cliente | Controller, Relacionamento | SIM |

**Potencial de automacao:** 60-70%

#### 3.2.3 Sessoes de Julgamento (2 Passos)

| Passo | Acao | Responsavel | Automatizavel? |
|-------|------|------------|----------------|
| 1 | Lancar prazos + tarefa sustentacao oral D+1 | Controller | SIM |
| 2 | Advogado decide sustentacao + enviar memoriais D-5 | Advogado | NAO (decisao juridica) |

**Potencial de automacao:** 30-40%

---

### 3.3 PROCESSO: COMERCIAL (Inferido)

| Acao | Responsavel | Automatizavel? |
|------|------------|----------------|
| Filtrar leads qualificados | SDR (Riany) | SIM (IA pode pre-qualificar) |
| Agendar reuniao com Closer | SDR | SIM |
| Atendimento para fechamento | Closer | PARCIAL (IA pode preparar) |
| Enviar info para Triagem | Comercial | SIM |

**Potencial de automacao:** 60-70%

---

### 3.4 PROCESSO: INICIAIS (Inferido)

| Acao | Responsavel | Automatizavel? |
|------|------------|----------------|
| Receber prazo da Controladoria | Sistema | SIM |
| Confeccionar Peticao Inicial | Advogada (Joelma) | PARCIAL (IA pode rascunhar) |
| Revisar peticao | Coordenador (Arthur) | NAO (revisao humana) |
| Protocolar | Back Office (Lucas) | PARCIAL |

**Potencial de automacao:** 30-40%

---

### 3.5 PROCESSO: RELACIONAMENTO (Inferido)

| Acao | Responsavel | Automatizavel? |
|------|------------|----------------|
| Tirar duvidas do cliente (WhatsApp/Telefone) | Lucas | PARCIAL (chatbot + humano) |
| Enviar boletos judiciais | Lucas | SIM |
| Monitorar pagamento | Lucas | SIM |
| Atualizar andamento processual | Lucas | SIM |
| Lembrar cliente sobre audiencia | Lucas | SIM |

**Potencial de automacao:** 70-80%

---

### 3.6 PROCESSO: COBRANCA (Inferido)

| Acao | Responsavel | Automatizavel? |
|------|------------|----------------|
| Emitir boletos de honorarios | Breno | SIM |
| Cobrar inadimplentes | Yasmyn | SIM (automacao WhatsApp) |
| Enviar para ajuizamento se infrutifero | Yasmyn | PARCIAL |
| Monitorar cobrancas | Breno | SIM |

**Potencial de automacao:** 80-90%

---

## 4. RESUMO DE AUTOMACAO

### Por Setor

| Setor | % Automatizavel | Prioridade | Impacto |
|-------|----------------|-----------|---------|
| **Triagem** | 70-80% | ALTA | Libera horas de trabalho manual repetitivo |
| **Relacionamento** | 70-80% | ALTA | Melhora experiencia do cliente + libera Lucas |
| **Cobranca** | 80-90% | ALTA | Reduz inadimplencia + libera equipe |
| **Comercial** | 60-70% | MEDIA | Qualifica leads automaticamente |
| **Controladoria** | 40-50% | MEDIA | Reduz risco de perda de prazo |
| **Audiencias** | 60-70% | MEDIA | Automatiza lembretes e follow-ups |
| **Iniciais** | 30-40% | BAIXA | IA auxilia mas advogado decide |
| **Prazos** | 40-50% | BAIXA | Automacao de notificacoes, peticoes sao humanas |
| **Holding** | 30-40% | BAIXA | Trabalho muito especializado |
| **Financeiro/RH** | 50-60% | MEDIA | Automacao de boletos e relatorios |

### Tarefas Mais Automatizaveis (Quick Wins)

1. **Monitoramento de assinaturas** (Autentique) - 100% automatizavel
2. **Criacao de pasta OneDrive** com nomenclatura padrao - 100% automatizavel
3. **Envio de emails padronizados** (docs assinados, conclusao, etc.) - 100% automatizavel
4. **Lembretes de audiencia** (D-7, D-1) - 100% automatizavel
5. **Cobranca de documentos faltantes** (cada 2 dias) - 100% automatizavel
6. **Envio de boletos** + monitoramento de pagamento - 100% automatizavel
7. **Notificacao ao cliente** sobre andamento processual - 90% automatizavel
8. **Pre-qualificacao de leads** via chatbot WhatsApp - 80% automatizavel
9. **Criacao de caso no Astrea** (campos padrao) - 70% automatizavel
10. **Redacao de contratos** padrao + procuracoes - 70% automatizavel

### Horas Semanais Estimadas Liberadas

| Automatizacao | Horas/Semana Economizadas |
|--------------|--------------------------|
| Triagem automatizada | 10-15h/semana |
| Lembretes e follow-ups automaticos | 8-12h/semana |
| Cobranca automatizada | 5-8h/semana |
| Atendimento via chatbot (nivel 1) | 10-15h/semana |
| Emails e notificacoes automaticas | 5-8h/semana |
| Criacao de pastas/docs automatica | 3-5h/semana |
| **TOTAL** | **41-63h/semana** |

---

## 5. PADRAO DE COMUNICACAO (E-MAIL)

**Assunto padrao (POP 002):**
```
O QUE E PRA SER FEITO - PRIMEIRO NOME CLIENTE x PRIMEIRO NOME PARTE CONTRARIA - NOME DA PECA - NUMERO DO PROCESSO
```

**Exemplo:**
```
RECURSO - JOAO x MARIA - Apelacao Civel - 5001234-56.2024.8.09.0001
```

Este padrao DEVE ser mantido na automacao para compatibilidade.

---

## 6. NOMENCLATURA DE ARQUIVOS (OneDrive)

```
Doc. 01 - Documento Pessoal
Doc. 02 - Contrato de Honorarios
Doc. 03 - Procuracao
Doc. 04+ - Documentos Probatorios
```

Este padrao DEVE ser mantido na automacao.

---

## 7. FLUXO COMPLETO DO CASO (Do Cliente ao Tribunal)

```
ETAPA 1: INTEGRACAO E DOCUMENTACAO (Triagem)
1. Recebimento da Demanda → Comercial envia info/docs
2. Formalizacao e Organizacao → Grupo WhatsApp + Contrato/Procuracao
3. Estruturacao do Caso → Pasta OneDrive + Cadastro Astrea
4. Finalizacao e Encaminhamento → Comunicar Controladoria

ETAPA 2: GESTAO DE PRAZOS PROCESSUAIS
1. Recebimento da Intimacao → Controller lanca prazos
2. Analise e Acao Juridica → Advogado define estrategia
3. Elaboracao e Revisao da Peca → Advogado + Coordenador
4. Protocolo e Conferencia → Assistente + Controller verifica
```

---

## CONCLUSAO

O escritorio Teixeira Brito possui processos **muito bem documentados** com POPs detalhados, o que facilita enormemente a automacao. Os maiores ganhos estao em:

1. **Eliminacao de trabalho manual repetitivo** (emails, lembretes, cobrancas)
2. **Reducao de risco** (prazos nunca esquecidos, follow-ups automaticos)
3. **Melhoria da experiencia do cliente** (respostas 24/7, atualizacoes automaticas)
4. **Liberacao de 41-63 horas/semana** para trabalho juridico de alto valor

O fato de terem POPs formais significa que a IA pode seguir exatamente os mesmos procedimentos, apenas de forma automatizada e 24/7.
