// Textos fixos da interface (doc §4.9 e decisão P6). Não alterar sem atualizar a documentação.
export const CONTATO_COZINHA = "contato na cozinha";
export const ROTULO_ESTIMATIVA = "estimativa";

export const textos = {
  alergia: (categoria: string) => `ALERGIA DECLARADA: ${categoria}. Venda bloqueada.`,
  doencaCeliaca: () => "DOENÇA CELÍACA DECLARADA: glúten. Venda bloqueada.",
  bloqueioResponsavel: (preparacao: string) => `BLOQUEIO SOLICITADO PELO RESPONSÁVEL: ${preparacao}. Venda bloqueada.`,
  acompanhamento: (categoria: string) => `RESTRIÇÃO DECLARADA: ${categoria}. Confirme com o aluno.`,
  notificacao: (nome: string, n: number, categoria: string, limite: number) =>
    `${nome} consumiu ${n} itens com ${categoria} nesta semana. Limite definido: ${limite}.`,
  avisoSintomas:
    "Este registro não é um diagnóstico. Se você sentir falta de ar, aperto na garganta, inchaço na boca ou tontura, avise agora um adulto da escola.",
};
