import { prisma, type Periodo } from "@bandeja/dados";
import { paraData } from "./cardapios";

export function cardapiosDoPeriodo(de: string, ate: string, periodo?: Periodo) {
  return prisma.cardapio.findMany({
    where: { data: { gte: paraData(de), lte: paraData(ate) }, periodo, ativo: true },
    select: { id: true, itens: { where: { ativo: true }, select: { preparacao_id: true } } },
  });
}

// Só totais por resultado: nenhum dado individual (RF15).
export async function vendasPorResultado(inicio: Date, fim: Date) {
  const grupos = await prisma.venda.groupBy({
    by: ["resultado"],
    where: { data_hora: { gte: inicio, lt: fim } },
    _count: { _all: true },
  });
  return Object.fromEntries(grupos.map((g) => [g.resultado, g._count._all]));
}
