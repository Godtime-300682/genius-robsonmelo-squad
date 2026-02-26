// ============================================
// INTEGRAÇÃO OPENAI - GPT-4o / GPT-4o-mini
// ============================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: 'gpt-4o' | 'gpt-4o-mini';
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 2000 } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  // Classificar intenção do cliente (WhatsApp)
  async classificarIntencao(mensagem: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: `Você é assistente jurídico da Teixeira Brito Advocacia. Classifique a mensagem do cliente em UMA das categorias:
- ANDAMENTO: pergunta sobre andamento do processo
- DOCUMENTO: envio ou pedido de documento
- PAGAMENTO: dúvida sobre pagamento/boleto
- AGENDAMENTO: quer agendar reunião/audiência
- RECLAMACAO: reclamação ou insatisfação
- OUTRO: não se encaixa nas anteriores
Responda APENAS com a categoria.`
      },
      { role: 'user', content: mensagem }
    ], { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 20 });
  }

  // Gerar resposta para cliente via WhatsApp
  async gerarRespostaCliente(mensagem: string, contexto: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: `Você é assistente jurídico virtual da Teixeira Brito Advocacia. Responda de forma profissional, empática e clara. Use português formal mas acessível. Seja breve (máximo 3 parágrafos). Contexto do caso: ${contexto}`
      },
      { role: 'user', content: mensagem }
    ], { model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 500 });
  }

  // Classificar intimação (tipo e urgência)
  async classificarIntimacao(textoIntimacao: string): Promise<{ tipo: string; urgencia: string; resumo: string }> {
    const resposta = await this.chat([
      {
        role: 'system',
        content: `Analise a intimação judicial e retorne JSON com:
- tipo: "decisao", "sentenca", "audiencia", "julgamento" ou "despacho"
- urgencia: "critica" (prazo < 5 dias), "alta" (5-10 dias), "media" (10-15 dias), "baixa" (> 15 dias)
- resumo: resumo em 1-2 frases
Responda APENAS com o JSON válido.`
      },
      { role: 'user', content: textoIntimacao }
    ], { model: 'gpt-4o', temperature: 0.1, maxTokens: 200 });

    return JSON.parse(resposta);
  }

  // Qualificar lead (scoring)
  async qualificarLead(dados: { nome: string; tipoCaso: string; urgencia: string; descricao: string }): Promise<{ score: string; briefing: string }> {
    const resposta = await this.chat([
      {
        role: 'system',
        content: `Você é SDR da Teixeira Brito Advocacia. Analise o lead e retorne JSON com:
- score: "quente" (caso urgente + documentação pronta), "morno" (interesse real mas sem urgência), "frio" (apenas consultando)
- briefing: briefing de 2-3 frases para o Closer usar na reunião
Áreas do escritório: Cível, Trabalhista, Previdenciário, Empresarial, Família, Criminal, Tributário, Consumidor.
Responda APENAS com JSON válido.`
      },
      { role: 'user', content: `Nome: ${dados.nome}\nTipo: ${dados.tipoCaso}\nUrgência: ${dados.urgencia}\nDescrição: ${dados.descricao}` }
    ], { model: 'gpt-4o-mini', temperature: 0.3, maxTokens: 300 });

    return JSON.parse(resposta);
  }

  // Gerar documento (contrato, procuração, petição)
  async gerarDocumento(tipo: string, dados: Record<string, string>, template: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: `Você é advogado redator da Teixeira Brito Advocacia. Gere o documento jurídico solicitado usando o template fornecido e preenchendo com os dados do cliente. Mantenha linguagem jurídica formal e precisa. O documento será revisado por um advogado humano antes do uso.`
      },
      {
        role: 'user',
        content: `Tipo: ${tipo}\nDados: ${JSON.stringify(dados)}\nTemplate:\n${template}`
      }
    ], { model: 'gpt-4o', temperature: 0.3, maxTokens: 4000 });
  }
}
