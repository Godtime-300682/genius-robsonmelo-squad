// ============================================
// INTEGRAÇÃO WHATSAPP - Evolution API
// ============================================

interface SendMessageOptions {
  number: string;
  text: string;
}

interface SendMediaOptions {
  number: string;
  mediaUrl: string;
  caption?: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
  fileName?: string;
}

interface CreateGroupOptions {
  name: string;
  participants: string[];
}

export class WhatsAppClient {
  private apiUrl: string;
  private apiKey: string;
  private instance: string;

  constructor(apiUrl: string, apiKey: string, instance = 'teixeira-brito') {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.instance = instance;
  }

  private async request(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Enviar mensagem de texto
  async sendMessage({ number, text }: SendMessageOptions): Promise<unknown> {
    return this.request(`/message/sendText/${this.instance}`, {
      number: this.formatNumber(number),
      text,
    });
  }

  // Enviar documento/mídia
  async sendMedia({ number, mediaUrl, caption, mediaType, fileName }: SendMediaOptions): Promise<unknown> {
    return this.request(`/message/sendMedia/${this.instance}`, {
      number: this.formatNumber(number),
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption || '',
      fileName: fileName || 'documento',
    });
  }

  // Criar grupo WhatsApp
  async createGroup({ name, participants }: CreateGroupOptions): Promise<{ groupId: string }> {
    const result = await this.request(`/group/create/${this.instance}`, {
      subject: name,
      participants: participants.map(p => this.formatNumber(p)),
    }) as { id: string };

    return { groupId: result.id };
  }

  // Enviar mensagem para grupo
  async sendGroupMessage(groupId: string, text: string): Promise<unknown> {
    return this.request(`/message/sendText/${this.instance}`, {
      number: groupId,
      text,
    });
  }

  // Lembrete de cobrança formatado
  async enviarCobranca(numero: string, nomeCliente: string, valor: number, vencimento: string, sequencia: number): Promise<unknown> {
    const mensagens: Record<number, string> = {
      1: `Olá ${nomeCliente}! 😊\n\nEste é um lembrete amigável: seu boleto de R$ ${valor.toFixed(2)} vence em ${vencimento}.\n\nPrecisa do código de barras? É só responder aqui!\n\n_Teixeira Brito Advocacia_`,
      2: `Olá ${nomeCliente},\n\nSeu boleto de R$ ${valor.toFixed(2)} venceu hoje (${vencimento}).\n\nEvite juros e encargos fazendo o pagamento o quanto antes. Se já pagou, desconsidere esta mensagem.\n\n_Teixeira Brito Advocacia_`,
      3: `${nomeCliente}, bom dia!\n\nIdentificamos que o boleto de R$ ${valor.toFixed(2)} (venc. ${vencimento}) encontra-se em aberto.\n\nSe houver alguma dificuldade, estamos à disposição para negociar.\n\n_Teixeira Brito Advocacia_`,
      4: `Prezado(a) ${nomeCliente},\n\nInformamos que o boleto de R$ ${valor.toFixed(2)} (venc. ${vencimento}) permanece em aberto há mais de 7 dias.\n\nSolicitamos gentilmente a regularização para evitar medidas adicionais.\n\nEm caso de dúvidas, entre em contato conosco.\n\n_Teixeira Brito Advocacia_`,
      5: `Prezado(a) ${nomeCliente},\n\nÚltima tentativa de contato referente ao débito de R$ ${valor.toFixed(2)} (venc. ${vencimento}).\n\nCaso não haja manifestação, o caso será encaminhado à coordenação para as providências cabíveis.\n\nEstamos à disposição para negociação.\n\n_Teixeira Brito Advocacia_`,
    };

    const texto = mensagens[sequencia] || mensagens[3];
    return this.sendMessage({ number: numero, text: texto });
  }

  // Lembrete de audiência
  async enviarLembreteAudiencia(numero: string, nomeCliente: string, tipo: string, data: string, local: string, diasAntes: number): Promise<unknown> {
    let texto: string;
    if (diasAntes === 7) {
      texto = `Olá ${nomeCliente}! 📋\n\nLembramos que sua audiência de ${tipo} está agendada para ${data}.\n\nLocal: ${local}\n\nNos próximos dias entraremos em contato para alinhar os detalhes.\n\n_Teixeira Brito Advocacia_`;
    } else if (diasAntes === 3) {
      texto = `${nomeCliente}, sua audiência de ${tipo} será em 3 dias (${data}).\n\nLocal: ${local}\n\nPor favor, confirme sua presença respondendo esta mensagem. Alguma dúvida sobre o que será tratado?\n\n_Teixeira Brito Advocacia_`;
    } else {
      texto = `⚠️ ${nomeCliente}, AMANHÃ é sua audiência!\n\n📅 ${data}\n📍 ${local}\n📋 Tipo: ${tipo}\n\nChegue com 15 minutos de antecedência. Leve documento com foto.\n\nQualquer imprevisto, nos avise imediatamente.\n\n_Teixeira Brito Advocacia_`;
    }

    return this.sendMessage({ number: numero, text: texto });
  }

  private formatNumber(number: string): string {
    const clean = number.replace(/\D/g, '');
    if (clean.length === 11) return `55${clean}`;
    if (clean.length === 13 && clean.startsWith('55')) return clean;
    return clean;
  }
}
