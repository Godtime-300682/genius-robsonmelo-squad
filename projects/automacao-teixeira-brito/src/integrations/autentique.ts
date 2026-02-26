// ============================================
// INTEGRAÇÃO AUTENTIQUE - Assinaturas Digitais
// ============================================

interface Signer {
  name: string;
  email: string;
  phone?: string;
  action: 'SIGN' | 'APPROVE' | 'ACKNOWLEDGE';
}

interface CreateDocumentOptions {
  name: string;
  content: string; // base64 do PDF
  signers: Signer[];
  message?: string;
  reminderInterval?: number;
}

interface DocumentStatus {
  id: string;
  name: string;
  signed: boolean;
  signers: Array<{
    name: string;
    email: string;
    signed: boolean;
    signed_at: string | null;
  }>;
}

export class AutentiqueClient {
  private apiKey: string;
  private baseUrl = 'https://api.autentique.com.br/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async graphql(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Autentique API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { data: unknown; errors?: Array<{ message: string }> };
    if (data.errors?.length) {
      throw new Error(`Autentique GraphQL error: ${data.errors[0].message}`);
    }
    return data.data;
  }

  // Criar documento para assinatura
  async criarDocumento(options: CreateDocumentOptions): Promise<string> {
    const query = `
      mutation CreateDocument(
        $document: DocumentInput!
        $signers: [SignerInput!]!
        $file: Upload!
      ) {
        createDocument(
          document: $document
          signers: $signers
          file: $file
        ) {
          id
          name
        }
      }
    `;

    const variables = {
      document: {
        name: options.name,
        message: options.message || 'Documento para assinatura - Teixeira Brito Advocacia',
        reminder: options.reminderInterval ? 'DAILY' : null,
      },
      signers: options.signers.map(s => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
        action: s.action,
      })),
    };

    const result = await this.graphql(query, variables) as { createDocument: { id: string } };
    return result.createDocument.id;
  }

  // Verificar status de assinaturas
  async verificarStatus(documentId: string): Promise<DocumentStatus> {
    const query = `
      query GetDocument($id: UUID!) {
        document(id: $id) {
          id
          name
          signatures {
            public_id
            name
            email
            signed {
              created_at
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { id: documentId }) as {
      document: {
        id: string;
        name: string;
        signatures: Array<{
          name: string;
          email: string;
          signed: { created_at: string } | null;
        }>;
      };
    };

    const doc = result.document;
    return {
      id: doc.id,
      name: doc.name,
      signed: doc.signatures.every(s => s.signed !== null),
      signers: doc.signatures.map(s => ({
        name: s.name,
        email: s.email,
        signed: s.signed !== null,
        signed_at: s.signed?.created_at || null,
      })),
    };
  }

  // Verificar se todos assinaram
  async todosAssinaram(documentId: string): Promise<boolean> {
    const status = await this.verificarStatus(documentId);
    return status.signed;
  }

  // Listar documentos pendentes
  async listarPendentes(): Promise<DocumentStatus[]> {
    const query = `
      query ListDocuments {
        documents(limit: 50, page: 1) {
          data {
            id
            name
            signatures {
              name
              email
              signed { created_at }
            }
          }
        }
      }
    `;

    const result = await this.graphql(query) as {
      documents: {
        data: Array<{
          id: string;
          name: string;
          signatures: Array<{
            name: string;
            email: string;
            signed: { created_at: string } | null;
          }>;
        }>;
      };
    };

    return result.documents.data
      .filter(doc => !doc.signatures.every(s => s.signed !== null))
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        signed: false,
        signers: doc.signatures.map(s => ({
          name: s.name,
          email: s.email,
          signed: s.signed !== null,
          signed_at: s.signed?.created_at || null,
        })),
      }));
  }
}
