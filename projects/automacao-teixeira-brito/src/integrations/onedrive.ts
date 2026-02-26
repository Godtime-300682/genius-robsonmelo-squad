// ============================================
// INTEGRAÇÃO ONEDRIVE - Microsoft Graph API
// ============================================

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export class OneDriveClient {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(clientId: string, clientSecret: string, tenantId: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tenantId = tenantId;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Microsoft auth error: ${response.status}`);
    }

    const data = await response.json() as TokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneDrive API error: ${response.status} - ${error}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // Criar pasta do cliente (nomenclatura padrão)
  async criarPastaCliente(nomeCliente: string, tipoCaso: string, pastaRaiz = 'Clientes'): Promise<string> {
    const nomePasta = `${nomeCliente.toUpperCase()} - ${tipoCaso}`;

    const result = await this.request(`/drive/root:/${pastaRaiz}/${nomePasta}:/`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: nomePasta,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    }) as { id: string; webUrl: string };

    // Criar subpastas padrão
    const subpastas = ['Documentos Pessoais', 'Contratos', 'Petições', 'Provas', 'Audiências', 'Correspondências'];
    for (const sub of subpastas) {
      await this.request(`/drive/items/${result.id}/children`, {
        method: 'POST',
        body: JSON.stringify({
          name: sub,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      }).catch(() => {}); // Ignora se já existe
    }

    return result.webUrl;
  }

  // Upload de arquivo
  async uploadArquivo(pastaPath: string, nomeArquivo: string, conteudo: ArrayBuffer): Promise<string> {
    const result = await this.request(
      `/drive/root:/${pastaPath}/${nomeArquivo}:/content`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: conteudo,
      }
    ) as { webUrl: string };

    return result.webUrl;
  }

  // Listar arquivos de uma pasta
  async listarArquivos(pastaPath: string): Promise<Array<{ name: string; id: string; webUrl: string }>> {
    const result = await this.request(`/drive/root:/${pastaPath}:/children`) as {
      value: Array<{ name: string; id: string; webUrl: string }>;
    };
    return result.value;
  }

  // Verificar se pasta existe
  async pastaExiste(pastaPath: string): Promise<boolean> {
    try {
      await this.request(`/drive/root:/${pastaPath}:/`);
      return true;
    } catch {
      return false;
    }
  }
}
