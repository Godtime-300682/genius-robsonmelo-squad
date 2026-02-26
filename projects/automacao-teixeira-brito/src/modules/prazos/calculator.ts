// ============================================
// CALCULADORA DE PRAZOS PROCESSUAIS
// POP 002: PI (Prazo Inicial), PF (Prazo Fatal),
//          PR (Prazo Revisão)
// ============================================

// ============================================
// FERIADOS NACIONAIS + GO (2024-2026)
// ============================================
const FERIADOS_NACIONAIS: string[] = [
  // 2025
  '2025-01-01', // Confraternização Universal
  '2025-03-03', // Carnaval
  '2025-03-04', // Carnaval
  '2025-04-18', // Sexta-feira Santa
  '2025-04-21', // Tiradentes
  '2025-05-01', // Dia do Trabalho
  '2025-06-19', // Corpus Christi
  '2025-07-26', // Fundação de Goiânia (municipal)
  '2025-09-07', // Independência
  '2025-10-12', // Nossa Sra. Aparecida
  '2025-10-24', // Dia do Servidor Público (forense)
  '2025-11-02', // Finados
  '2025-11-15', // Proclamação da República
  '2025-12-25', // Natal
  // 2026
  '2026-01-01',
  '2026-02-16', // Carnaval
  '2026-02-17', // Carnaval
  '2026-04-03', // Sexta-feira Santa
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-07-26', // Fundação de Goiânia
  '2026-09-07', // Independência
  '2026-10-12', // Nossa Sra. Aparecida
  '2026-10-24', // Dia do Servidor Público
  '2026-11-02', // Finados
  '2026-11-15', // Proclamação da República
  '2026-12-25', // Natal
];

// Recesso forense TJ-GO: 20/12 a 06/01
const RECESSO_INICIO_DIA = 20;
const RECESSO_INICIO_MES = 12;
const RECESSO_FIM_DIA = 6;
const RECESSO_FIM_MES = 1;

// ============================================
// VERIFICAÇÕES DE DIA ÚTIL FORENSE
// ============================================

export function isFeriado(date: Date): boolean {
  const iso = date.toISOString().split('T')[0];
  return FERIADOS_NACIONAIS.includes(iso);
}

export function isRecessoForense(date: Date): boolean {
  const mes = date.getMonth() + 1; // 1-12
  const dia = date.getDate();

  // Dezembro: a partir do dia 20
  if (mes === RECESSO_INICIO_MES && dia >= RECESSO_INICIO_DIA) return true;
  // Janeiro: até o dia 6
  if (mes === RECESSO_FIM_MES && dia <= RECESSO_FIM_DIA) return true;

  return false;
}

export function isFimDeSemana(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Domingo ou Sábado
}

export function isDiaUtilForense(date: Date): boolean {
  return !isFimDeSemana(date) && !isFeriado(date) && !isRecessoForense(date);
}

// ============================================
// ADICIONAR DIAS ÚTEIS FORENSES
// ============================================
export function addDiasUteisForenses(dataInicial: Date, dias: number): Date {
  const result = new Date(dataInicial);
  let adicionados = 0;

  while (adicionados < dias) {
    result.setDate(result.getDate() + 1);
    if (isDiaUtilForense(result)) {
      adicionados++;
    }
  }

  return result;
}

// ============================================
// SUBTRAIR DIAS ÚTEIS FORENSES
// ============================================
export function subDiasUteisForenses(dataFinal: Date, dias: number): Date {
  const result = new Date(dataFinal);
  let subtraidos = 0;

  while (subtraidos < dias) {
    result.setDate(result.getDate() - 1);
    if (isDiaUtilForense(result)) {
      subtraidos++;
    }
  }

  return result;
}

// ============================================
// ENCONTRAR PRÓXIMO DIA ÚTIL
// ============================================
export function proximoDiaUtil(date: Date): Date {
  const result = new Date(date);
  while (!isDiaUtilForense(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

// ============================================
// CONTAR DIAS ÚTEIS ENTRE DATAS
// ============================================
export function contarDiasUteis(inicio: Date, fim: Date): number {
  let count = 0;
  const current = new Date(inicio);
  current.setDate(current.getDate() + 1); // começa no dia seguinte

  while (current <= fim) {
    if (isDiaUtilForense(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// ============================================
// INTERFACE DE RESULTADO
// ============================================
export interface PrazosCalculados {
  dataPublicacao: string;
  inicioContagem: string;  // D+1 da publicação (primeiro dia útil)
  prazoFatal: string;      // PF - último dia para protocolar
  prazoRevisao: string;    // PR - 2 dias úteis antes do PF
  alertaD1: string;        // Alerta no D+1
  alertaPR: string;        // Alerta no PR
  alertaPF: string;        // Alerta 1 dia útil antes do PF
  diasUteisTotal: number;
  tipo: string;
}

// ============================================
// CALCULAR PRAZOS (função principal)
// ============================================
export function calcularPrazos(
  dataPublicacao: string,
  tipoIntimacao: string,
  prazoEmDias?: number,
): PrazosCalculados {
  const pubDate = new Date(dataPublicacao + 'T12:00:00');

  // Determinar prazo em dias úteis baseado no tipo
  const dias = prazoEmDias || getPrazoPadrao(tipoIntimacao);

  // D+1: Primeiro dia útil após a publicação (início da contagem)
  const inicioContagem = proximoDiaUtil(new Date(pubDate));
  if (inicioContagem.getTime() === pubDate.getTime()) {
    // Se a publicação é em dia útil, contagem inicia no dia seguinte útil
    inicioContagem.setDate(inicioContagem.getDate() + 1);
    while (!isDiaUtilForense(inicioContagem)) {
      inicioContagem.setDate(inicioContagem.getDate() + 1);
    }
  }

  // PF: Prazo Fatal = início da contagem + dias úteis
  const prazoFatal = addDiasUteisForenses(inicioContagem, dias);

  // PR: Prazo Revisão = 2 dias úteis antes do PF
  const prazoRevisao = subDiasUteisForenses(prazoFatal, 2);

  // Alertas
  const alertaD1 = formatDateISO(inicioContagem);
  const alertaPR = formatDateISO(prazoRevisao);
  const alertaPF = formatDateISO(subDiasUteisForenses(prazoFatal, 1)); // véspera útil

  return {
    dataPublicacao,
    inicioContagem: formatDateISO(inicioContagem),
    prazoFatal: formatDateISO(prazoFatal),
    prazoRevisao: formatDateISO(prazoRevisao),
    alertaD1,
    alertaPR,
    alertaPF,
    diasUteisTotal: dias,
    tipo: tipoIntimacao,
  };
}

// ============================================
// PRAZOS PADRÃO POR TIPO (CPC)
// ============================================
function getPrazoPadrao(tipo: string): number {
  const prazos: Record<string, number> = {
    // Recursos
    'sentenca': 15,         // Apelação: 15 dias úteis (CPC art. 1.003)
    'decisao': 15,          // Agravo de instrumento: 15 dias úteis (CPC art. 1.003)
    'julgamento': 15,       // Embargos de declaração: 5 dias (CPC art. 1.023), mas padrão 15

    // Manifestações
    'despacho': 5,          // Manifestação simples: 5 dias úteis (CPC art. 218)
    'audiencia': 5,         // Preparação: depende, padrão 5

    // Prazos especiais
    'contestacao': 15,      // Contestação: 15 dias úteis (CPC art. 335)
    'reconvencao': 15,      // Reconvenção: 15 dias úteis
    'replica': 15,          // Réplica: 15 dias úteis (CPC art. 351)
    'embargos': 5,          // Embargos de declaração: 5 dias úteis
    'impugnacao': 15,       // Impugnação: 15 dias úteis
    'recurso_especial': 15, // REsp: 15 dias úteis
    'recurso_extraordinario': 15, // RE: 15 dias úteis
    'agravo_interno': 15,   // Agravo interno: 15 dias úteis
  };

  return prazos[tipo] || 5; // padrão: 5 dias úteis
}

// ============================================
// CALCULAR MÚLTIPLOS PRAZOS (batch)
// ============================================
export function calcularPrazosLote(
  items: Array<{ dataPublicacao: string; tipo: string; prazo?: number }>
): PrazosCalculados[] {
  return items.map(item => calcularPrazos(item.dataPublicacao, item.tipo, item.prazo));
}

// ============================================
// VERIFICAR SE PRAZO ESTÁ VENCENDO
// ============================================
export function verificarUrgenciaPrazo(dataFatal: string): {
  diasRestantes: number;
  urgencia: 'vencido' | 'critico' | 'urgente' | 'atencao' | 'normal';
  cor: string;
} {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fatal = new Date(dataFatal + 'T00:00:00');

  const diasRestantes = contarDiasUteis(hoje, fatal);
  const diasCorridos = Math.ceil((fatal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  let urgencia: 'vencido' | 'critico' | 'urgente' | 'atencao' | 'normal';
  let cor: string;

  if (diasCorridos < 0) {
    urgencia = 'vencido';
    cor = 'preto';
  } else if (diasRestantes <= 1) {
    urgencia = 'critico';
    cor = 'vermelho';
  } else if (diasRestantes <= 3) {
    urgencia = 'urgente';
    cor = 'laranja';
  } else if (diasRestantes <= 5) {
    urgencia = 'atencao';
    cor = 'amarelo';
  } else {
    urgencia = 'normal';
    cor = 'verde';
  }

  return { diasRestantes, urgencia, cor };
}

// ============================================
// HELPER: formatar data para ISO (YYYY-MM-DD)
// ============================================
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}
