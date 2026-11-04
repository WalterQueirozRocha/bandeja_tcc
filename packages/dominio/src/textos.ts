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
  // D2: notificações na plataforma. As do operador e da coordenação não levam dado de saúde (RNF04, §4.8).
  bloqueioSolicitado: (preparacao: string, aluno: string) => `Novo bloqueio solicitado: ${preparacao} para ${aluno}.`,
  bloqueioDecidido: (preparacao: string, aluno: string, executado: boolean) =>
    `O bloqueio de ${preparacao} para ${aluno} foi ${executado ? "executado" : "recusado"}.`,
  bloqueioCancelado: (preparacao: string, aluno: string) => `O bloqueio de ${preparacao} para ${aluno} foi cancelado.`,
  registrosSolicitados: (responsavel: string, aluno: string) => `Novo pedido de registros de sintomas: ${responsavel} para ${aluno}.`,
  registrosDecididos: (aluno: string, autorizado: boolean) =>
    `Seu pedido dos registros de sintomas de ${aluno} foi ${autorizado ? "autorizado" : "recusado"}.`,
  senhaSolicitada: (nome: string, email: string) => `${nome} (${email}) esqueceu a senha e pediu uma nova. Redefina e avise a pessoa.`,
  avisoSintomas:
    "Este registro não é um diagnóstico. Se você sentir falta de ar, aperto na garganta, inchaço na boca ou tontura, avise agora um adulto da escola.",
};
