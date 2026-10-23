import { prisma, type ModoPreparo, type Prisma } from "@bandeja/dados";

// Tudo o que o domínio precisa de um ingrediente: composição, marcadores, IG e as formas preparadas.
const camposCalculo = {
  id: true,
  nome: true,
  grupo_alimentar: true,
  forma_crua_id: true,
  modo_preparo: true,
  energia_kcal: true,
  proteina_g: true,
  lipideos_g: true,
  carboidrato_g: true,
  fibra_g: true,
  cinzas_g: true,
  umidade_g: true,
  categoria_carboidrato: true,
  rds_percentual: true,
  marcadores: { select: { categoria_codigo: true, presenca: true } },
  valor_ig: { select: { ig: true, lista: true } },
} satisfies Prisma.IngredienteSelect;

export const selecaoIngredienteCalculo = {
  ...camposCalculo,
  ativo: true,
  formas_preparadas: { select: camposCalculo },
} satisfies Prisma.IngredienteSelect;

export type IngredienteCalculo = Prisma.IngredienteGetPayload<{ select: typeof selecaoIngredienteCalculo }>;

export type DadosPreparacao = {
  nome: string;
  porcao_g: number;
  peso_final_calculado: number;
  itens: { ingrediente_id: number; quantidade_crua_g: number; modo_preparo: ModoPreparo }[];
  contato_cozinha: { categoria_codigo: string; motivo: string }[];
};

export function listarPreparacoes(busca?: string, inativos = false) {
  return prisma.preparacao.findMany({
    where: { ativo: inativos ? undefined : true, ...(busca && { nome: { contains: busca, mode: "insensitive" } }) },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, porcao_g: true, peso_final_calculado: true, ativo: true },
  });
}

export function apagarPreparacao(id: number) {
  return prisma.preparacao.delete({ where: { id } });
}

export function mudarAtivoPreparacao(id: number, ativo: boolean) {
  return prisma.preparacao.update({ where: { id }, data: { ativo }, select: { id: true, ativo: true } });
}

const inclusaoCalculo = {
  itens: { include: { ingrediente: { select: selecaoIngredienteCalculo } }, orderBy: { ingrediente_id: "asc" } },
  marcadores_cozinha: { select: { categoria_codigo: true, motivo: true } },
} satisfies Prisma.PreparacaoInclude;

export function buscarPreparacao(id: number) {
  return prisma.preparacao.findUnique({ where: { id }, include: inclusaoCalculo });
}

// Uma consulta para todas as preparações de um cardápio (CT22).
export function buscarPreparacoes(ids: number[]) {
  return prisma.preparacao.findMany({ where: { id: { in: ids } }, include: inclusaoCalculo });
}

export function buscarIngredientesCalculo(ids: number[]) {
  return prisma.ingrediente.findMany({ where: { id: { in: ids } }, select: selecaoIngredienteCalculo });
}

export function listarFatores() {
  return prisma.fatorPreparo.findMany({ select: { grupo_alimentar: true, modo_preparo: true, fator_coccao: true } });
}

export async function nomesCategorias() {
  return new Map((await prisma.categoriaRestricao.findMany({ select: { codigo: true, nome: true } })).map((c) => [c.codigo, c.nome]));
}

const filhos = (d: DadosPreparacao) => ({
  itens: { create: d.itens },
  marcadores_cozinha: { create: d.contato_cozinha.map((c) => ({ ...c, presenca: "PODE_CONTER" as const })) },
});

export function criarPreparacao(d: DadosPreparacao) {
  return prisma.preparacao.create({
    data: { nome: d.nome, porcao_g: d.porcao_g, peso_final_calculado: d.peso_final_calculado, ...filhos(d) },
    select: { id: true },
  });
}

export async function atualizarPreparacao(id: number, d: DadosPreparacao) {
  await prisma.$transaction([
    prisma.itemPreparacao.deleteMany({ where: { preparacao_id: id } }),
    prisma.marcadorPreparacao.deleteMany({ where: { preparacao_id: id } }),
    prisma.preparacao.update({
      where: { id },
      data: { nome: d.nome, porcao_g: d.porcao_g, peso_final_calculado: d.peso_final_calculado, ...filhos(d) },
    }),
  ]);
  return { id };
}
