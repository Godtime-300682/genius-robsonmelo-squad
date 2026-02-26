// ============================================
// UTILITÁRIOS - Teixeira Brito Automação
// ============================================

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function addDays(date: string | Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addBusinessDays(date: string | Date, days: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return d;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('pt-BR');
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function daysUntil(targetDate: string | Date): number {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Padrão de assunto de email do escritório (POP 002)
export function formatEmailSubject(
  acao: string,
  clienteNome: string,
  parteContraria: string,
  peca: string,
  processo: string
): string {
  const primeiroNomeCliente = clienteNome.split(' ')[0];
  const primeiroNomeContraria = parteContraria.split(' ')[0];
  return `${acao.toUpperCase()} - ${primeiroNomeCliente} x ${primeiroNomeContraria} - ${peca} - ${processo}`;
}

// Nomenclatura padrão de documentos OneDrive
export function formatDocName(numero: number, tipo: string): string {
  return `Doc. ${String(numero).padStart(2, '0')} - ${tipo}`;
}

// Nomenclatura padrão de pasta OneDrive
export function formatPastaCliente(nomeCliente: string, tipoCaso: string): string {
  return `${nomeCliente.toUpperCase()} - ${tipoCaso}`;
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhone(phone: string): string {
  const clean = sanitizePhone(phone);
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  return phone;
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
