// ============================================
// INTEGRAÇÃO EMAIL - SMTP via MailChannels
// (Cloudflare Workers Email Integration)
// ============================================

interface EmailOptions {
  to: string | string[];
  cc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export class EmailClient {
  private fromName: string;
  private fromEmail: string;

  constructor(fromEmail: string, fromName = 'Teixeira Brito Advocacia') {
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  async send(options: EmailOptions): Promise<void> {
    const toList = Array.isArray(options.to) ? options.to : [options.to];

    // MailChannels API (gratuito para Cloudflare Workers)
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: toList.map(email => ({ email })),
            cc: options.cc?.map(email => ({ email })),
          },
        ],
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        content: [
          {
            type: options.isHtml ? 'text/html' : 'text/plain',
            value: options.body,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email send error: ${response.status} - ${error}`);
    }
  }

  // Email padrão: documentos assinados
  async enviarDocumentosAssinados(
    para: string[],
    nomeCliente: string,
    tipoDoc: string
  ): Promise<void> {
    await this.send({
      to: para,
      subject: `TRIAGEM - ${nomeCliente.toUpperCase()} - ${tipoDoc} Assinado`,
      body: `Prezados,\n\nInformamos que o(a) ${tipoDoc} do cliente ${nomeCliente} foi assinado com sucesso via Autentique.\n\nOs documentos já foram salvos na pasta do cliente no OneDrive.\n\nAtenciosamente,\nSistema de Automação - Teixeira Brito Advocacia`,
    });
  }

  // Email padrão: triagem concluída
  async enviarTriagemConcluida(
    para: string[],
    nomeCliente: string,
    tipoCaso: string
  ): Promise<void> {
    await this.send({
      to: para,
      subject: `TRIAGEM CONCLUÍDA - ${nomeCliente.toUpperCase()} - ${tipoCaso}`,
      body: `Prezados,\n\nA triagem do cliente ${nomeCliente} (${tipoCaso}) foi concluída com sucesso.\n\nTodos os documentos foram recebidos e organizados.\nO caso já está cadastrado no sistema.\n\nPróximo passo: Análise pela Controladoria.\n\nAtenciosamente,\nSistema de Automação - Teixeira Brito Advocacia`,
    });
  }

  // Email padrão: prazo processual (formato POP 002)
  async enviarAlertaPrazo(
    para: string[],
    nomeCliente: string,
    parteContraria: string,
    peca: string,
    processo: string,
    prazoFatal: string,
    tipo: string
  ): Promise<void> {
    const assunto = `${tipo.toUpperCase()} - ${nomeCliente.split(' ')[0]} x ${parteContraria.split(' ')[0]} - ${peca} - ${processo}`;

    await this.send({
      to: para,
      subject: assunto,
      body: `Prezados,\n\nALERTA DE PRAZO PROCESSUAL\n\nCliente: ${nomeCliente}\nParte Contrária: ${parteContraria}\nPeça: ${peca}\nProcesso: ${processo}\nPrazo Fatal: ${prazoFatal}\nTipo: ${tipo}\n\nFavor providenciar dentro do prazo estabelecido.\n\nAtenciosamente,\nSistema de Automação - Teixeira Brito Advocacia`,
    });
  }

  // Email padrão: pós-audiência
  async enviarResumoAudiencia(
    para: string[],
    nomeCliente: string,
    tipoAudiencia: string,
    resultado: string
  ): Promise<void> {
    await this.send({
      to: para,
      subject: `PÓS-AUDIÊNCIA - ${nomeCliente.toUpperCase()} - ${tipoAudiencia}`,
      body: `Prezados,\n\nResumo da audiência de ${tipoAudiencia} do cliente ${nomeCliente}:\n\n${resultado}\n\nOs próximos passos serão lançados no sistema automaticamente.\n\nAtenciosamente,\nSistema de Automação - Teixeira Brito Advocacia`,
    });
  }
}
