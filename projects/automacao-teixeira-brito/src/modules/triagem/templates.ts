// ============================================
// TEMPLATES JURÍDICOS - Triagem Teixeira Brito
// Contrato de Honorários + Procuração Ad Judicia
// ============================================

export interface DadosCliente {
  nome_completo: string;
  nacionalidade: string;
  estado_civil: string;
  profissao: string;
  rg: string;
  cpf: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  email: string;
  telefone: string;
  whatsapp: string;
}

export interface DadosCaso {
  tipo_acao: string;
  area_direito: string;
  parte_contraria: string;
  comarca: string;
  vara: string;
  objeto: string;
  valor_causa_estimado: number;
  valor_honorarios: number;
  forma_pagamento: string;
  percentual_exito: number;
}

// ============================================
// TEMPLATE: CONTRATO DE HONORÁRIOS ADVOCATÍCIOS
// ============================================
export function gerarContratoHonorarios(cliente: DadosCliente, caso: DadosCaso): string {
  const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: ${cliente.nome_completo}, ${cliente.nacionalidade}, ${cliente.estado_civil}, ${cliente.profissao}, portador(a) do RG nº ${cliente.rg} e CPF nº ${cliente.cpf}, residente e domiciliado(a) na ${cliente.endereco}, ${cliente.cidade}/${cliente.estado}, CEP ${cliente.cep}, e-mail: ${cliente.email}, telefone: ${cliente.telefone}.

CONTRATADO: TEIXEIRA BRITO SOCIEDADE DE ADVOGADOS, inscrita na OAB/GO sob nº XXXXX, com sede na Rua XXXXX, nº XXX, Setor XXXXX, Goiânia/GO, CEP XXXXX-XXX, representada por seu sócio-administrador Dr. Dayan Teixeira Brito, OAB/GO nº XXXXX.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços Advocatícios, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.

CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios pelo CONTRATADO ao CONTRATANTE, consistente em ${caso.objeto}, na área de ${caso.area_direito}, ${caso.parte_contraria ? `em face de ${caso.parte_contraria},` : ''} perante ${caso.vara ? `a ${caso.vara} da` : 'a'} Comarca de ${caso.comarca}, Estado de Goiás.

CLÁUSULA SEGUNDA – DOS HONORÁRIOS
2.1. Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO honorários advocatícios no valor de R$ ${caso.valor_honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${valorPorExtenso(caso.valor_honorarios)}), a serem pagos da seguinte forma: ${caso.forma_pagamento}.

2.2. Em caso de êxito, total ou parcial, o CONTRATANTE pagará ao CONTRATADO, a título de honorários de êxito, o percentual de ${caso.percentual_exito}% (${percentualPorExtenso(caso.percentual_exito)}) sobre o proveito econômico obtido.

2.3. Os honorários previstos na cláusula 2.1 são devidos independentemente do resultado da demanda.

CLÁUSULA TERCEIRA – DAS DESPESAS
3.1. As despesas processuais (custas, emolumentos, perícias, diligências e outras) correrão por conta exclusiva do CONTRATANTE.

3.2. O CONTRATADO poderá solicitar ao CONTRATANTE, mediante recibo, valores para adiantamento de despesas processuais.

CLÁUSULA QUARTA – DAS OBRIGAÇÕES DO CONTRATADO
4.1. Prestar os serviços advocatícios com zelo, diligência e competência.
4.2. Manter o CONTRATANTE informado sobre o andamento do processo.
4.3. Comparecer às audiências e praticar todos os atos necessários à defesa dos interesses do CONTRATANTE.
4.4. Guardar sigilo profissional sobre as informações recebidas.

CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO CONTRATANTE
5.1. Fornecer ao CONTRATADO todos os documentos e informações necessários à prestação dos serviços.
5.2. Pagar pontualmente os honorários e despesas pactuados.
5.3. Informar imediatamente ao CONTRATADO sobre qualquer fato novo relacionado ao caso.
5.4. Comparecer às audiências e atos processuais quando convocado.

CLÁUSULA SEXTA – DA VIGÊNCIA
O presente contrato vigorará até o trânsito em julgado da ação ou até a resolução definitiva do caso, o que ocorrer primeiro.

CLÁUSULA SÉTIMA – DA RESCISÃO
7.1. O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação escrita com antecedência mínima de 30 (trinta) dias.
7.2. Em caso de rescisão, os honorários já pagos não serão restituídos, e os honorários de êxito serão devidos proporcionalmente ao trabalho realizado.

CLÁUSULA OITAVA – DO FORO
As partes elegem o Foro da Comarca de ${caso.comarca}, Estado de Goiás, para dirimir quaisquer questões oriundas do presente contrato.

E por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor e forma.

${cliente.cidade}/${cliente.estado}, ${dataAtual}.


_____________________________________________
${cliente.nome_completo}
CONTRATANTE
CPF: ${cliente.cpf}


_____________________________________________
TEIXEIRA BRITO SOCIEDADE DE ADVOGADOS
Dr. Dayan Teixeira Brito - OAB/GO nº XXXXX
CONTRATADO


Testemunhas:
1. ______________________ CPF: _______________
2. ______________________ CPF: _______________
`.trim();
}

// ============================================
// TEMPLATE: PROCURAÇÃO AD JUDICIA
// ============================================
export function gerarProcuracao(cliente: DadosCliente, caso: DadosCaso): string {
  return `
PROCURAÇÃO AD JUDICIA ET EXTRA

OUTORGANTE: ${cliente.nome_completo}, ${cliente.nacionalidade}, ${cliente.estado_civil}, ${cliente.profissao}, portador(a) do RG nº ${cliente.rg} e inscrito(a) no CPF sob o nº ${cliente.cpf}, residente e domiciliado(a) na ${cliente.endereco}, ${cliente.cidade}/${cliente.estado}, CEP ${cliente.cep}.

OUTORGADOS: Os advogados integrantes de TEIXEIRA BRITO SOCIEDADE DE ADVOGADOS, inscrita na OAB/GO sob nº XXXXX, com sede na Rua XXXXX, nº XXX, Setor XXXXX, Goiânia/GO, CEP XXXXX-XXX, especialmente:

- Dr. DAYAN TEIXEIRA BRITO, OAB/GO nº XXXXX
- Dra. JOELMA [SOBRENOME], OAB/GO nº XXXXX
- Dr. ARTHUR [SOBRENOME], OAB/GO nº XXXXX
- Dra. BRUNA [SOBRENOME], OAB/GO nº XXXXX
- Dra. LORRANE [SOBRENOME], OAB/GO nº XXXXX
- Dr. LUCIANO [SOBRENOME], OAB/GO nº XXXXX
- Dr. WEVERTON [SOBRENOME], OAB/GO nº XXXXX

PODERES: Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui os OUTORGADOS como seus bastantes procuradores, a quem confere amplos e gerais poderes para o foro em geral, com a cláusula "ad judicia et extra", para em conjunto ou separadamente, representá-lo(a) em juízo ou fora dele, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhes, ainda, poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação e firmar compromisso, podendo, ainda, substabelecer esta em outrem, com ou sem reserva de iguais poderes, dando tudo por bom, firme e valioso.

FINALIDADE: ${caso.objeto}, na área de ${caso.area_direito}${caso.parte_contraria ? `, em face de ${caso.parte_contraria}` : ''}, perante ${caso.vara ? `a ${caso.vara} da` : 'a'} Comarca de ${caso.comarca}/GO e Tribunais Superiores.

${cliente.cidade}/${cliente.estado}, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.


_____________________________________________
${cliente.nome_completo}
CPF: ${cliente.cpf}
RG: ${cliente.rg}
`.trim();
}

// ============================================
// CHECKLIST DE DOCUMENTOS POR ÁREA
// ============================================
export function getChecklistDocumentos(areaDireito: string): string[] {
  const checklists: Record<string, string[]> = {
    'trabalhista': [
      'Documento de identidade (RG/CNH)',
      'CPF',
      'Comprovante de residência',
      'CTPS (Carteira de Trabalho)',
      'Contracheques (últimos 6 meses)',
      'Termo de Rescisão (TRCT)',
      'Extrato FGTS',
      'Contrato de trabalho',
      'Comprovantes de pagamento',
    ],
    'previdenciario': [
      'Documento de identidade (RG/CNH)',
      'CPF',
      'Comprovante de residência',
      'CTPS (Carteira de Trabalho)',
      'CNIS (extrato previdenciário)',
      'Laudos médicos (se incapacidade)',
      'Carta de indeferimento/cessação do INSS',
      'Receituários médicos',
    ],
    'civel': [
      'Documento de identidade (RG/CNH)',
      'CPF',
      'Comprovante de residência',
      'Documentos relacionados ao caso',
      'Provas documentais',
      'Fotos/vídeos (se aplicável)',
      'Contratos relacionados',
    ],
    'familia': [
      'Documento de identidade (RG/CNH)',
      'CPF',
      'Comprovante de residência',
      'Certidão de casamento',
      'Certidão de nascimento dos filhos',
      'Comprovantes de renda',
      'Declaração de bens',
      'Extratos bancários',
    ],
    'consumidor': [
      'Documento de identidade (RG/CNH)',
      'CPF',
      'Comprovante de residência',
      'Nota fiscal / comprovante de compra',
      'Contrato com a empresa',
      'Prints de conversas / protocolos',
      'Fotos do produto/serviço',
      'Reclamação no Procon (se houver)',
    ],
    'criminal': [
      'Documento de identidade (RG/CNH)',
      'CPF',
      'Comprovante de residência',
      'Boletim de Ocorrência',
      'Documentos relacionados ao caso',
      'Provas documentais',
    ],
    'tributario': [
      'Documento de identidade (RG/CNH)',
      'CPF/CNPJ',
      'Comprovante de residência/sede',
      'Contrato Social (PJ)',
      'Notificações fiscais',
      'Guias de recolhimento',
      'Declarações de IR',
    ],
    'empresarial': [
      'Documento de identidade dos sócios',
      'CPF dos sócios',
      'CNPJ',
      'Contrato Social e alterações',
      'Balanço patrimonial',
      'Atas de reunião',
      'Contratos empresariais relacionados',
    ],
  };

  const area = areaDireito.toLowerCase();
  for (const [key, docs] of Object.entries(checklists)) {
    if (area.includes(key)) return docs;
  }

  // Checklist genérico
  return checklists['civel'];
}

// ============================================
// HELPERS
// ============================================
function valorPorExtenso(valor: number): string {
  // Simplificado - em produção usar biblioteca completa
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const partes: string[] = [];

  if (reais > 0) {
    partes.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos > 0) {
    partes.push(`${centavos} centavos`);
  }

  return partes.join(' e ') || 'zero reais';
}

function percentualPorExtenso(percentual: number): string {
  const nomes: Record<number, string> = {
    5: 'cinco por cento', 10: 'dez por cento', 15: 'quinze por cento',
    20: 'vinte por cento', 25: 'vinte e cinco por cento', 30: 'trinta por cento',
  };
  return nomes[percentual] || `${percentual} por cento`;
}
