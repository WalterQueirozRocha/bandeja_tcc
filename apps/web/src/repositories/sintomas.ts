import { prisma } from "@bandeja/dados";

export function listarSintomas() {
  return prisma.sintoma.findMany({ select: { codigo: true, descricao: true, grupo: true } });
}

export function buscarSintoma(codigo: string) {
  return prisma.sintoma.findUnique({ where: { codigo }, select: { codigo: true } });
}

// D3: o nome mostrado vem da preparação ligada ao item comprado.
const alimento = {
  alimento_externo: true,
  itens: { select: { item_venda: { select: { item_cardapio: { select: { preparacao: { select: { nome: true } } } } } } } },
} as const;

type ComAlimento = { alimento_externo: string | null; itens: { item_venda: { item_cardapio: { preparacao: { nome: string } } } }[] };

const comAlimentos = <T extends ComAlimento>({ itens, ...r }: T) => ({
  ...r,
  itens_cantina: itens.map((i) => i.item_venda.item_cardapio.preparacao.nome),
});

export async function registrosDoAluno(aluno_id: number) {
  const registros = await prisma.registroSintoma.findMany({
    where: { aluno_id },
    orderBy: { data_hora: "desc" },
    take: 200,
    select: { id: true, data_hora: true, observacao: true, sintoma: { select: { codigo: true, descricao: true, grupo: true } }, ...alimento },
  });
  return registros.map(comAlimentos);
}

// RF20: o que um pedido autorizado libera — os registros gravados até a decisão da escola.
export async function registrosGravadosAte(aluno_id: number, ate: Date) {
  const registros = await prisma.registroSintoma.findMany({
    where: { aluno_id, registrado_em: { lte: ate } },
    orderBy: { data_hora: "desc" },
    select: { id: true, data_hora: true, observacao: true, sintoma: { select: { descricao: true } }, ...alimento },
  });
  return registros.map(comAlimentos);
}

// D3: itens das vendas CONCLUÍDAS do aluno entre `de` e `ate`, os que ele pode indicar no sintoma.
export async function itensComprados(aluno_id: number, de: Date, ate: Date) {
  const itens = await prisma.itemVenda.findMany({
    where: { venda: { aluno_id, resultado: "CONCLUIDA", data_hora: { gte: de, lte: ate } } },
    orderBy: { venda: { data_hora: "desc" } },
    select: { venda_id: true, item_cardapio_id: true, venda: { select: { data_hora: true } }, item_cardapio: { select: { preparacao: { select: { nome: true } } } } },
  });
  return itens.map((i) => ({ venda_id: i.venda_id, item_cardapio_id: i.item_cardapio_id, comprado_em: i.venda.data_hora, nome: i.item_cardapio.preparacao.nome }));
}

export function gravarRegistro(
  aluno_id: number,
  dados: { sintoma_codigo: string; data_hora: Date; observacao: string | null; alimento_externo: string | null; itens: { venda_id: number; item_cardapio_id: number }[] },
) {
  const { itens, ...campos } = dados;
  return prisma.registroSintoma.create({
    // Mesmo relógio de `decidida_em` (RF20), para a comparação não depender do relógio do banco.
    data: { aluno_id, ...campos, registrado_em: new Date(), itens: { create: itens } },
    select: { id: true, data_hora: true, observacao: true, sintoma_codigo: true, alimento_externo: true, itens: { select: { venda_id: true, item_cardapio_id: true } } },
  });
}
