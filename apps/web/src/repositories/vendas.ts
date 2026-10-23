import { prisma, type Compatibilidade, type Prisma, type ResultadoVenda } from "@bandeja/dados";
import { alunoAtivo } from "./alunos";

// Só itens ativos de cardápios ativos podem ser vendidos.
export function buscarItensCardapio(ids: number[]) {
  return prisma.itemCardapio.findMany({
    where: { id: { in: ids }, ativo: true, cardapio: { ativo: true } },
    select: { id: true, cardapio_id: true, preparacao_id: true, preco: true, preparacao: { select: { nome: true } } },
  });
}

export type ItemVendido = {
  item_cardapio_id: number;
  compatibilidade: Compatibilidade;
  preco: Prisma.Decimal;
  carboidrato_disponivel_g: number;
  cg: number | null;
  categorias_atencao: string[];
};

export function gravarVenda(aluno_id: number, operador_id: number, resultado: ResultadoVenda, itens: ItemVendido[]) {
  return prisma.venda.create({ data: { aluno_id, operador_id, resultado, itens: { create: itens } }, select: { id: true, data_hora: true } });
}

// Consumos da categoria na semana: cada item de venda concluída em que ela deu ATENÇÃO conta um.
export function consumosNaSemana(aluno_id: number, categoria: string, inicio: Date, fim: Date) {
  return prisma.itemVenda.count({
    where: {
      categorias_atencao: { has: categoria },
      venda: { aluno_id, resultado: "CONCLUIDA", data_hora: { gte: inicio, lt: fim } },
    },
  });
}

export function restricoesAcompanhamento(aluno_id: number) {
  return prisma.restricaoDeclarada.findMany({
    where: { aluno_id, tipo: { in: ["INTOLERANCIA", "RELIGIOSA", "PREFERENCIA"] } },
    select: { categoria_codigo: true, limite_notificacao: true },
  });
}

export async function alunoComResponsaveis(aluno_id: number) {
  return prisma.aluno.findUnique({
    where: { id: aluno_id, ...alunoAtivo },
    select: {
      id: true,
      usuario: { select: { nome: true } },
      responsaveis: { where: { responsavel: { ativo: true } }, select: { responsavel: { select: { id: true, email: true } } } },
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
          preco: true,
          carboidrato_disponivel_g: true,
          cg: true,
          item_cardapio: { select: { preparacao: { select: { nome: true } } } },
        },
      },
    },
  });
}
