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
  quantidade: number;
  carboidrato_disponivel_g: number;
  cg: number | null;
  cg_fao: number | null;
  categorias_atencao: string[];
};

export function gravarVenda(aluno_id: number, operador_id: number, resultado: ResultadoVenda, itens: ItemVendido[]) {
  return prisma.venda.create({ data: { aluno_id, operador_id, resultado, itens: { create: itens } }, select: { id: true, data_hora: true } });
}

// Consumos da categoria na semana: cada unidade de item de venda concluída em que ela deu ATENÇÃO conta um.
export async function consumosNaSemana(aluno_id: number, categoria: string, inicio: Date, fim: Date) {
  const { _sum } = await prisma.itemVenda.aggregate({
    _sum: { quantidade: true },
    where: {
      categorias_atencao: { has: categoria },
      venda: { aluno_id, resultado: "CONCLUIDA", data_hora: { gte: inicio, lt: fim } },
    },
  });
  return _sum.quantidade ?? 0;
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
      responsaveis: { where: { responsavel: { ativo: true } }, select: { responsavel: { select: { id: true } } } },
    },
  });
}

// Verificar e gravar a notificação sob uma trava por aluno: vendas simultâneas não duplicam o aviso.
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
  return (await tx.notificacao.count({ where: { ...chave, tipo: "LIMITE_SEMANAL" } })) > 0;
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
          quantidade: true,
          carboidrato_disponivel_g: true,
          cg: true,
          cg_fao: true,
          item_cardapio: { select: { preparacao: { select: { id: true, nome: true } } } },
        },
      },
    },
  });
}
