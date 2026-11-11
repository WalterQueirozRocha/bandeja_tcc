import { prisma, type Periodo } from "@bandeja/dados";

export type ItemNovo = { preparacao_id: number; preco: number };

// Cardapio.data é @db.Date: guardado em UTC à meia-noite.
export const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const paraIso = (d: Date) => d.toISOString().slice(0, 10);

export function listarCardapios(filtro: { data?: string; periodo?: Periodo; inativos?: boolean }) {
  return prisma.cardapio.findMany({
    where: { data: filtro.data ? paraData(filtro.data) : undefined, periodo: filtro.periodo, ativo: filtro.inativos ? undefined : true },
    orderBy: [{ data: "desc" }, { periodo: "asc" }],
    select: { id: true, data: true, periodo: true, ativo: true, _count: { select: { itens: { where: { ativo: true } } } } },
  });
}

// Só os ativos: um cardápio desabilitado libera a data e o turno.
export function buscarCardapioPorDataPeriodo(data: string, periodo: Periodo) {
  return prisma.cardapio.findFirst({ where: { data: paraData(data), periodo, ativo: true }, select: { id: true } });
}

// Itens retirados depois de vendidos (ativo = false) não aparecem mais.
export function buscarCardapio(id: number) {
  return prisma.cardapio.findUnique({
    where: { id },
    include: {
      itens: {
        where: { ativo: true },
        select: { id: true, preparacao_id: true, preco: true, preparacao: { select: { nome: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function preparacoesAtivas(ids: number[]) {
  return new Set((await prisma.preparacao.findMany({ where: { id: { in: ids }, ativo: true }, select: { id: true } })).map((p) => p.id));
}

// Um cardápio por data, todos com os mesmos itens, numa transação.
export function criarCardapios(datas: string[], periodo: Periodo, itens: ItemNovo[]) {
  return prisma.$transaction(
    datas.map((data) => prisma.cardapio.create({ data: { data: paraData(data), periodo, itens: { create: itens } }, select: { id: true } })),
  );
}

// Mantém o id dos itens que continuam (as vendas apontam para ItemCardapio).
// B3: o item retirado que já foi vendido é desabilitado; se voltar, é reabilitado com o mesmo id.
export async function atualizarCardapio(id: number, data: string, periodo: Periodo, itens: ItemNovo[]) {
  const atuais = await prisma.itemCardapio.findMany({
    where: { cardapio_id: id },
    select: { id: true, preparacao_id: true, _count: { select: { itens_venda: true } } },
  });
  const porPreparacao = new Map(atuais.map((i) => [i.preparacao_id, i.id]));
  const novos = new Set(itens.map((i) => i.preparacao_id));
  const retirados = atuais.filter((i) => !novos.has(i.preparacao_id));
  await prisma.$transaction([
    prisma.cardapio.update({ where: { id }, data: { data: paraData(data), periodo } }),
    prisma.itemCardapio.deleteMany({ where: { id: { in: retirados.filter((i) => i._count.itens_venda === 0).map((i) => i.id) } } }),
    prisma.itemCardapio.updateMany({ where: { id: { in: retirados.filter((i) => i._count.itens_venda > 0).map((i) => i.id) } }, data: { ativo: false } }),
    ...itens.map((i) => {
      const existente = porPreparacao.get(i.preparacao_id);
      return existente
        ? prisma.itemCardapio.update({ where: { id: existente }, data: { preco: i.preco, ativo: true } })
        : prisma.itemCardapio.create({ data: { ...i, cardapio_id: id } });
    }),
  ]);
  return { id };
}

export function apagarCardapio(id: number) {
  return prisma.cardapio.delete({ where: { id } });
}

export function mudarAtivoCardapio(id: number, ativo: boolean) {
  return prisma.cardapio.update({ where: { id }, data: { ativo }, select: { id: true, ativo: true } });
}
