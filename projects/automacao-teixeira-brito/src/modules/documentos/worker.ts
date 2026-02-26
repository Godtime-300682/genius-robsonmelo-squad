// ============================================
// MODULO DOCUMENTOS - Teixeira Brito Automacao IA
// Gestao e geracao de documentos juridicos
// ============================================

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../shared/types';
import { generateId, now } from '../../shared/utils';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };

export const documentosRoutes = new Hono<HonoEnv>();

// POST /gerar - Gerar documento via IA
documentosRoutes.post('/gerar', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    caso_id: string;
    cliente_id: string;
    tipo: string;
    nome: string;
    prompt_extra?: string;
  }>();

  // Buscar contexto do caso para a IA
  const caso = await c.env.DB.prepare(`
    SELECT c.*, cl.nome AS cliente_nome, cl.cpf_cnpj, cl.endereco,
           u.nome AS advogado_nome
    FROM casos c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN usuarios u ON u.id = c.advogado_id
    WHERE c.id = ?
  `).bind(body.caso_id).first();

  if (!caso) {
    return c.json({ success: false, error: 'Caso nao encontrado' }, 404);
  }

  const id = generateId();

  // Registrar documento como gerado por IA (pendente de revisao)
  await c.env.DB.prepare(`
    INSERT INTO documentos (id, caso_id, cliente_id, tipo, nome, gerado_por_ia, revisado, status_assinatura, created_at)
    VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).bind(
    id,
    body.caso_id,
    body.cliente_id,
    body.tipo,
    body.nome,
    ['contrato', 'procuracao'].includes(body.tipo) ? 'pendente' : 'nao_aplicavel',
    now(),
  ).run();

  // Aqui integraria com a OpenAI para gerar o documento
  // Por enquanto, retorna o ID do documento criado
  return c.json({
    success: true,
    data: {
      id,
      tipo: body.tipo,
      nome: body.nome,
      gerado_por_ia: true,
      revisado: false,
      contexto: {
        caso_tipo: caso.tipo,
        cliente_nome: caso.cliente_nome,
        numero_processo: caso.numero_processo,
        advogado_nome: caso.advogado_nome,
      },
    },
  }, 201);
});

// GET / - Listar documentos
documentosRoutes.get('/', async (c) => {
  const casoId = c.req.query('caso_id');
  const clienteId = c.req.query('cliente_id');
  const tipo = c.req.query('tipo');
  const statusAssinatura = c.req.query('status_assinatura');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let query = `
    SELECT d.*, cl.nome AS cliente_nome, ca.numero_processo, ca.tipo AS caso_tipo
    FROM documentos d
    LEFT JOIN clientes cl ON cl.id = d.cliente_id
    LEFT JOIN casos ca ON ca.id = d.caso_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (casoId) {
    query += ' AND d.caso_id = ?';
    params.push(casoId);
  }
  if (clienteId) {
    query += ' AND d.cliente_id = ?';
    params.push(clienteId);
  }
  if (tipo) {
    query += ' AND d.tipo = ?';
    params.push(tipo);
  }
  if (statusAssinatura) {
    query += ' AND d.status_assinatura = ?';
    params.push(statusAssinatura);
  }

  query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';

  const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM documentos'
  ).first();

  return c.json({
    success: true,
    data: result.results,
    meta: { page, limit, total: countResult?.total ?? 0 },
  });
});

// GET /:id - Buscar documento por ID
documentosRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const doc = await c.env.DB.prepare(`
    SELECT d.*, cl.nome AS cliente_nome, cl.cpf_cnpj,
           ca.numero_processo, ca.tipo AS caso_tipo, ca.parte_contraria,
           u.nome AS advogado_nome
    FROM documentos d
    LEFT JOIN clientes cl ON cl.id = d.cliente_id
    LEFT JOIN casos ca ON ca.id = d.caso_id
    LEFT JOIN usuarios u ON u.id = ca.advogado_id
    WHERE d.id = ?
  `).bind(id).first();

  if (!doc) {
    return c.json({ success: false, error: 'Documento nao encontrado' }, 404);
  }

  return c.json({ success: true, data: doc });
});
