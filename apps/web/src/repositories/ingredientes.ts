import { prisma, type GrupoAlimentar, type OrigemIngrediente, type OrigemMarcador, type Presenca, type Prisma } from "@bandeja/dados";

export type FiltroIngredientes = {
  busca?: string;
  grupo?: GrupoAlimentar;
  origem?: OrigemIngrediente;
  pagina: number;
  tamanho: number;
};

export type NovoMarcador = {
  categoria_codigo: string;
  presenca: Presenca;
  origem: OrigemMarcador;
  conferido_por_1?: string | null;
  conferido_por_2?: string | null;
};

export async function listarIngredientes({ busca, grupo, origem, pagina, tamanho }: FiltroIngredientes) {
  const where: Prisma.IngredienteWhereInput = {
    grupo_alimentar: grupo,
    origem,
    ...(busca && { nome: { contains: busca, mode: "insensitive" } }),
  };
  const [total, itens] = await prisma.$transaction([
    prisma.ingrediente.count({ where }),
    prisma.ingrediente.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * tamanho,
      take: tamanho,
      select: {
        id: true,
        nome: true,
        codigo_taco: true,
        grupo_alimentar: true,
        origem: true,
        modo_preparo: true,
        marcadores: { select: { categoria_codigo: true, presenca: true } },
      },
    }),
  ]);
  return { total, pagina, tamanho, itens };
}

export function buscarIngrediente(id: number) {
  return prisma.ingrediente.findUnique({
    where: { id },
    include: {
      marcadores: { include: { categoria: { select: { nome: true, tipo: true } } } },
      valor_ig: true,
      forma_crua: { select: { id: true, nome: true } },
      formas_preparadas: { select: { id: true, nome: true, modo_preparo: true } },
    },
  });
}

export function criarIngredienteRotulo(
  dados: Omit<Prisma.IngredienteCreateInput, "origem" | "marcadores">,
  marcadores: NovoMarcador[],
) {
  return prisma.ingrediente.create({
    data: { ...dados, origem: "ROTULO", marcadores: { create: marcadores } },
    include: { marcadores: true },
  });
}

export async function substituirMarcadores(ingrediente_id: number, marcadores: NovoMarcador[]) {
  const [, , atualizados] = await prisma.$transaction([
    prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id } }),
    prisma.marcadorIngrediente.createMany({ data: marcadores.map((m) => ({ ...m, ingrediente_id })) }),
    prisma.marcadorIngrediente.findMany({ where: { ingrediente_id } }),
  ]);
  return atualizados;
}

export async function codigosCategorias() {
  return new Set((await prisma.categoriaRestricao.findMany({ select: { codigo: true } })).map((c) => c.codigo));
}

export function listarCategorias() {
  return prisma.categoriaRestricao.findMany({ orderBy: [{ tipo: "asc" }, { nome: "asc" }] });
}
