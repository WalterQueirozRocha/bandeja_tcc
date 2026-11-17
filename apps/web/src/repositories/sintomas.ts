import { prisma, type Prisma } from "@bandeja/dados";

export function listarSintomas() {
  return prisma.sintoma.findMany({ select: { codigo: true, descricao: true, grupo: true } });
}

export async function codigosExistentes(codigos: string[]) {
  const sintomas = await prisma.sintoma.findMany({ where: { codigo: { in: codigos } }, select: { codigo: true } });
  return new Set(sintomas.map((s) => s.codigo));
}

// A ocorrência inteira: sintomas na ordem dos grupos da tela e o nome do item comprado vindo da preparação (D3).
const ocorrencia = {
  id: true,
  data_hora: true,
  observacao: true,
  alimento_externo: true,
  sintomas: {
    orderBy: [{ sintoma: { grupo: "asc" } }, { sintoma: { descricao: "asc" } }],
    select: { sintoma: { select: { codigo: true, descricao: true, grupo: true } } },
  },
  itens: { select: { item_venda: { select: { item_cardapio: { select: { preparacao: { select: { nome: true } } } } } } } },
} satisfies Prisma.RegistroSintomaSelect;

type Ocorrencia = {
  sintomas: { sintoma: { codigo: string; descricao: string } }[];
  itens: { item_venda: { item_cardapio: { preparacao: { nome: string } } } }[];
};

const achatar = <T extends Ocorrencia>({ sintomas, itens, ...r }: T) => ({
  ...r,
  sintomas: sintomas.map((s) => s.sintoma),
  itens_cantina: itens.map((i) => i.item_venda.item_cardapio.preparacao.nome),
});

export async function registrosDoAluno(aluno_id: number) {
  const registros = await prisma.registroSintoma.findMany({ where: { aluno_id }, orderBy: { data_hora: "desc" }, take: 200, select: ocorrencia });
  return registros.map(achatar);
}

// RF20: o que um pedido autorizado libera — os registros gravados até a decisão da escola.
export async function registrosGravadosAte(aluno_id: number, ate: Date) {
  const registros = await prisma.registroSintoma.findMany({
    where: { aluno_id, registrado_em: { lte: ate } },
    orderBy: { data_hora: "desc" },
    select: ocorrencia,
  });
  return registros.map(achatar);
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

export async function gravarRegistro(
  aluno_id: number,
  dados: { sintomas_codigo: string[]; data_hora: Date; observacao: string | null; alimento_externo: string | null; itens: { venda_id: number; item_cardapio_id: number }[] },
) {
  const { sintomas_codigo, itens, ...campos } = dados;
  const { sintomas, ...registro } = await prisma.registroSintoma.create({
    // Mesmo relógio de `decidida_em` (RF20), para a comparação não depender do relógio do banco.
    data: {
      aluno_id,
      ...campos,
      registrado_em: new Date(),
      sintomas: { create: sintomas_codigo.map((sintoma_codigo) => ({ sintoma_codigo })) },
      itens: { create: itens },
    },
    select: {
      id: true,
      data_hora: true,
      observacao: true,
      alimento_externo: true,
      sintomas: { select: { sintoma_codigo: true } },
      itens: { select: { venda_id: true, item_cardapio_id: true } },
    },
  });
  return { ...registro, sintomas_codigo: sintomas.map((s) => s.sintoma_codigo) };
}
