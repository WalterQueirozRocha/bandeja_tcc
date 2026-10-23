import { prisma, type Periodo } from "@bandeja/dados";

export type ItemNovo = { preparacao_id: number; preco: number };

// Cardapio.data é @db.Date: guardado em UTC à meia-noite.
export const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const paraIso = (d: Date) => d.toISOString().slice(0, 10);

export function listarCardapios(filtro: { data?: string; periodo?: Periodo }) {
  return prisma.cardapio.findMany({
    where: { data: filtro.data ? paraData(filtro.data) : undefined, periodo: filtro.periodo },
    orderBy: [{ data: "desc" }, { periodo: "asc" }],
    select: { id: true, data: true, periodo: true, _count: { select: { itens: true } } },
  });
}

export function buscarCardapioPorDataPeriodo(data: string, periodo: Periodo) {
  return prisma.cardapio.findFirst({ where: { data: paraData(data), periodo }, select: { id: true } });
}

export function buscarCardapio(id: number) {
  return prisma.cardapio.findUnique({
    where: { id },
    include: {
      itens: { select: { id: true, preparacao_id: true, preco: true, preparacao: { select: { nome: true } } }, orderBy: { id: "asc" } },
    },
  });
}

export async function preparacoesExistentes(ids: number[]) {
  return new Set((await prisma.preparacao.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id));
}

export function criarCardapio(data: string, periodo: Periodo, itens: ItemNovo[]) {
  return prisma.cardapio.create({ data: { data: paraData(data), periodo, itens: { create: itens } }, select: { id: true } });
}

// Mantém o id dos itens que continuam (as vendas do I4 apontam para ItemCardapio).
export async function atualizarCardapio(id: number, data: string, periodo: Periodo, itens: ItemNovo[]) {
  const atuais = await prisma.itemCardapio.findMany({ where: { cardapio_id: id }, select: { id: true, preparacao_id: true } });
  const porPreparacao = new Map(atuais.map((i) => [i.preparacao_id, i.id]));
  const novos = new Set(itens.map((i) => i.preparacao_id));
  await prisma.$transaction([
    prisma.cardapio.update({ where: { id }, data: { data: paraData(data), periodo } }),
    prisma.itemCardapio.deleteMany({ where: { cardapio_id: id, preparacao_id: { notIn: [...novos] } } }),
    ...itens.map((i) => {
      const existente = porPreparacao.get(i.preparacao_id);
      return existente
        ? prisma.itemCardapio.update({ where: { id: existente }, data: { preco: i.preco } })
        : prisma.itemCardapio.create({ data: { ...i, cardapio_id: id } });
    }),
  ]);
  return { id };
}
