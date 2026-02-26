// ============================================
// API GATEWAY - Teixeira Brito Automação IA
// Framework: Hono (Cloudflare Workers)
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ApiResponse, JWTPayload } from '../shared/types';
import { authenticate, createToken, hashPassword, verifyPassword } from '../shared/auth';
import { generateId, now, jsonResponse, errorResponse } from '../shared/utils';

// Módulos
import { triagemRoutes } from '../modules/triagem/worker';
import { prazosRoutes } from '../modules/prazos/worker';
import { whatsappRoutes } from '../modules/whatsapp/worker';
import { cobrancaRoutes } from '../modules/cobranca/worker';
import { comercialRoutes } from '../modules/comercial/worker';
import { audienciasRoutes } from '../modules/audiencias/worker';
import { documentosRoutes } from '../modules/documentos/worker';
import { dashboardRoutes } from '../modules/dashboard/worker';

type HonoEnv = { Bindings: Env; Variables: { user: JWTPayload } };
const app = new Hono<HonoEnv>();

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));

// Auth middleware (protege tudo exceto /auth/* e /webhook/*)
app.use('/api/*', async (c, next) => {
  const user = await authenticate(c.req.raw, c.env);
  if (!user) {
    return c.json({ success: false, error: 'Não autorizado' }, 401);
  }
  c.set('user', user);
  await next();
});

// ============================================
// ROTAS DE AUTH (públicas)
// ============================================

// Login
app.post('/auth/login', async (c) => {
  const { email, senha } = await c.req.json<{ email: string; senha: string }>();

  const result = await c.env.DB.prepare(
    'SELECT id, nome, email, senha_hash, role, setor FROM usuarios WHERE email = ? AND ativo = 1'
  ).bind(email).first();

  if (!result) {
    return c.json({ success: false, error: 'Credenciais inválidas' }, 401);
  }

  const valid = await verifyPassword(senha, result.senha_hash as string);
  if (!valid) {
    return c.json({ success: false, error: 'Credenciais inválidas' }, 401);
  }

  const token = await createToken({
    sub: result.id as string,
    nome: result.nome as string,
    role: result.role as string,
    setor: result.setor as string,
  }, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: {
      token,
      usuario: {
        id: result.id,
        nome: result.nome,
        email: result.email,
        role: result.role,
        setor: result.setor,
      },
    },
  });
});

// Registrar usuário (admin only via seed ou admin existente)
app.post('/auth/register', async (c) => {
  const { nome, email, senha, role, setor, adminKey } = await c.req.json<{
    nome: string; email: string; senha: string; role: string; setor: string; adminKey?: string;
  }>();

  // Verificar se é admin (via JWT ou adminKey para seed inicial)
  const user = await authenticate(c.req.raw, c.env);
  if (!user && adminKey !== c.env.JWT_SECRET) {
    return c.json({ success: false, error: 'Não autorizado' }, 401);
  }
  if (user && user.role !== 'admin') {
    return c.json({ success: false, error: 'Apenas admin pode registrar usuários' }, 403);
  }

  const id = generateId();
  const senhaHash = await hashPassword(senha);

  await c.env.DB.prepare(
    'INSERT INTO usuarios (id, nome, email, senha_hash, role, setor) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, nome, email, senhaHash, role, setor).run();

  return c.json({ success: true, data: { id, nome, email, role, setor } }, 201);
});

// ============================================
// ROTAS DE API (protegidas)
// ============================================

// Health check
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'online',
      app: c.env.APP_NAME,
      environment: c.env.ENVIRONMENT,
      timestamp: now(),
    },
  });
});

// Dashboard stats
app.get('/api/stats', async (c) => {
  const [clientes, casos, prazos, cobrancas, leads, atendimentos] = await Promise.all([
    c.env.DB.prepare('SELECT status, COUNT(*) as total FROM clientes GROUP BY status').all(),
    c.env.DB.prepare('SELECT fase_pipeline, COUNT(*) as total FROM casos GROUP BY fase_pipeline').all(),
    c.env.DB.prepare("SELECT status, COUNT(*) as total FROM prazos WHERE data_prazo >= date('now', '-30 days') GROUP BY status").all(),
    c.env.DB.prepare('SELECT status, COUNT(*) as total FROM cobrancas GROUP BY status').all(),
    c.env.DB.prepare('SELECT score, COUNT(*) as total FROM leads GROUP BY score').all(),
    c.env.DB.prepare("SELECT respondido_por, COUNT(*) as total FROM atendimentos WHERE created_at >= date('now', '-30 days') GROUP BY respondido_por").all(),
  ]);

  return c.json({
    success: true,
    data: { clientes: clientes.results, casos: casos.results, prazos: prazos.results, cobrancas: cobrancas.results, leads: leads.results, atendimentos: atendimentos.results },
  });
});

// ============================================
// MÓDULOS (sub-rotas)
// ============================================

app.route('/api/triagem', triagemRoutes);
app.route('/api/prazos', prazosRoutes);
app.route('/api/whatsapp', whatsappRoutes);
app.route('/api/cobranca', cobrancaRoutes);
app.route('/api/comercial', comercialRoutes);
app.route('/api/audiencias', audienciasRoutes);
app.route('/api/documentos', documentosRoutes);
app.route('/api/dashboard', dashboardRoutes);

// Webhook WhatsApp (público - validado por apikey dentro do módulo)
app.route('/webhook/whatsapp', (() => {
  const webhookApp = new Hono<HonoEnv>();
  webhookApp.post('/', async (c) => {
    // Importar e processar via chatbot
    const { processarMensagem } = await import('../modules/whatsapp/chatbot');
    const payload = await c.req.json();
    if (payload.event !== 'messages.upsert') {
      return c.json({ success: true, message: 'Evento ignorado' });
    }
    try {
      const resultado = await processarMensagem(c.env, payload);
      return c.json({ success: true, data: { tipo: resultado.tipo, escalado: resultado.escalado } });
    } catch (e) {
      console.error('Webhook WhatsApp error:', (e as Error).message);
      return c.json({ success: false, error: 'Erro ao processar' }, 500);
    }
  });
  return webhookApp;
})());

// ============================================
// CRON TRIGGERS
// ============================================

app.get('/cron/prazos', async (c) => {
  const { processarPublicacoesDiarias } = await import('../modules/prazos/scraper');
  const resultado = await processarPublicacoesDiarias(c.env);
  return c.json({ success: true, data: resultado });
});

app.get('/cron/prazos-lembretes', async (c) => {
  const { enviarLembretesPrazos } = await import('../modules/prazos/scraper');
  const resultado = await enviarLembretesPrazos(c.env);
  return c.json({ success: true, data: resultado });
});

app.get('/cron/audiencias', async (c) => {
  // Enviar lembretes de audiência (09:00)
  return c.json({ success: true, message: 'Cron audiências executado' });
});

app.get('/cron/cobrancas', async (c) => {
  const { processarCobrancasDiarias } = await import('../modules/cobranca/engine');
  const resultado = await processarCobrancasDiarias(c.env);
  return c.json({ success: true, data: resultado });
});

app.get('/cron/assinaturas', async (c) => {
  // Verificar assinaturas pendentes (14:00)
  return c.json({ success: true, message: 'Cron assinaturas executado' });
});

app.get('/cron/documentos', async (c) => {
  // Cobrar documentos faltantes (07:00)
  return c.json({ success: true, message: 'Cron documentos executado' });
});

// ============================================
// 404
// ============================================

app.notFound((c) => {
  return c.json({ success: false, error: 'Rota não encontrada' }, 404);
});

// ============================================
// ERROR HANDLER
// ============================================

app.onError((err, c) => {
  console.error(`Error: ${err.message}`, err.stack);
  return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
});

// ============================================
// EXPORT
// ============================================

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const hour = new Date(event.scheduledTime).getUTCHours();
    // UTC-3 para Brasília: 8h BR = 11h UTC, 9h = 12h, 10h = 13h, 14h = 17h, 7h = 10h
    switch (hour) {
      case 11: { // 8h BR - Scraping TJ + Classificação IA
        console.log('Cron: Verificando publicações TJ-GO...');
        const { processarPublicacoesDiarias } = await import('../modules/prazos/scraper');
        const resultado = await processarPublicacoesDiarias(env);
        console.log(`Cron prazos: ${resultado.publicacoes_encontradas} pub, ${resultado.intimacoes_classificadas} class, ${resultado.prazos_criados} prazos, ${resultado.erros.length} erros`);
        break;
      }
      case 12: { // 9h BR - Lembretes de prazos + Audiências
        console.log('Cron: Enviando lembretes de prazos e audiências...');
        const { enviarLembretesPrazos } = await import('../modules/prazos/scraper');
        const lembretes = await enviarLembretesPrazos(env);
        console.log(`Cron lembretes: ${lembretes.enviados} enviados, ${lembretes.erros} erros`);
        break;
      }
      case 13: { // 10h BR - Cobranças automáticas
        console.log('Cron: Processando cobrancas automaticas...');
        const { processarCobrancasDiarias } = await import('../modules/cobranca/engine');
        const cobrancas = await processarCobrancasDiarias(env);
        console.log(`Cron cobrancas: ${cobrancas.processadas} processadas, ${cobrancas.enviadas_whatsapp} WA, ${cobrancas.escaladas} escaladas, ${cobrancas.erros.length} erros`);
        break;
      }
      case 17: // 14h BR - Assinaturas
        console.log('Cron: Verificando assinaturas pendentes...');
        break;
      case 10: // 7h BR - Documentos
        console.log('Cron: Cobrando documentos faltantes...');
        break;
    }
  },
};
