import { prisma, type Compatibilidade, type Prisma, type ResultadoVenda } from "@bandeja/dados";

export function buscarItensCardapio(ids: number[]) {
  return prisma.itemCardapio.findMany({
    where: { id: { in: ids } },
    select: { id: true, cardapio_id: true, preparacao_id: true, preco: true, preparacao: { select: { nome: true } } },
  });
}

export function gravarVenda(
  aluno_id: number,
  operador_id: number,
  resultado: ResultadoVenda,
  itens: { item_cardapio_id: number; compatibilidade: Compatibilidade }[],
) {
  return prisma.venda.create({ data: { aluno_id, operador_id, resultado, itens: { create: itens } }, select: { id: true, data_hora: true } });
}

// Preparação de cada item em ATENÇÃO de vendas concluídas na semana (com repetição: cada item é um consumo).
export async function preparacoesEmAtencaoNaSemana(aluno_id: number, inicio: Date, fim: Date) {
  const itens = await prisma.itemVenda.findMany({
    where: { compatibilidade: "ATENCAO", venda: { aluno_id, resultado: "CONCLUIDA", data_hora: { gte: inicio, lt: fim } } },
    select: { item_cardapio: { select: { preparacao_id: true } } },
  });
  return itens.map((i) => i.item_cardapio.preparacao_id);
}

export function restricoesAcompanhamento(aluno_id: number) {
  return prisma.restricaoDeclarada.findMany({
    where: { aluno_id, tipo: { in: ["INTOLERANCIA", "RELIGIOSA", "PREFERENCIA"] } },
    select: { categoria_codigo: true, limite_notificacao: true },
  });
}

export async function alunoComResponsaveis(aluno_id: number) {
  return prisma.aluno.findUnique({
    where: { id: aluno_id },
    select: {
      id: true,
      usuario: { select: { nome: true } },
      responsaveis: { select: { responsavel: { select: { id: true, email: true } } } },
    },
  });
}

// Verificar, enviar e gravar a notificação sob uma trava por aluno: vendas simultâneas não duplicam o e-mail.
export function comTravaDoAluno<T>(aluno_id: number, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${aluno_id})`;
      return fn(tx);
    },
    { timeout: 20_000 },
  );
}

export async function notificacaoExiste(
  tx: Prisma.TransactionClient,
  chave: { destinatario_id: number; aluno_id: number; categoria_codigo: string; periodo: Date },
) {
  return (await tx.notificacao.count({ where: chave })) > 0;
}

export function gravarNotificacao(
  tx: Prisma.TransactionClient,
  dados: { destinatario_id: number; aluno_id: number; categoria_codigo: string; periodo: Date },
) {
  return tx.notificacao.create({ data: dados });
}

export function historicoDoAluno(aluno_id: number, de?: Date, ate?: Date) {
  return prisma.venda.findMany({
    where: { aluno_id, resultado: "CONCLUIDA", data_hora: { gte: de, lt: ate } },
    orderBy: { data_hora: "desc" },
    take: 200,
    select: {
      id: true,
      data_hora: true,
      itens: {
        select: {
          compatibilidade: true,
          item_cardapio: { select: { id: true, preco: true, preparacao_id: true, preparacao: { select: { nome: true } } } },
        },
      },
    },
  });
}
