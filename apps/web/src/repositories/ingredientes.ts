import {
  prisma,
  type GrupoAlimentar,
  type ModoPreparo,
  type OrigemIngrediente,
  type OrigemMarcador,
  type Presenca,
  type Prisma,
} from "@bandeja/dados";

export type FiltroIngredientes = {
  busca?: string;
  grupo?: GrupoAlimentar;
  origem?: OrigemIngrediente;
  inativos?: boolean;
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

export async function listarIngredientes({ busca, grupo, origem, inativos, pagina, tamanho }: FiltroIngredientes) {
  const where: Prisma.IngredienteWhereInput = {
    grupo_alimentar: grupo,
    origem,
    ativo: inativos ? undefined : true,
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
        ativo: true,
        marcacao_conferida_em: true,
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

export type CampoAlterado = { campo: string; antes: unknown; depois: unknown; fonte?: string };

// A criação já grava o registro com os valores iniciais (04/11).
export function criarIngrediente(
  dados: Omit<Prisma.IngredienteCreateInput, "marcadores" | "alteracoes">,
  marcadores: NovoMarcador[],
  usuario_id: number,
  campos: CampoAlterado[],
) {
  return prisma.ingrediente.create({
    data: {
      ...dados,
      marcadores: { create: marcadores },
      alteracoes: { create: { usuario_id, acao: "CRIACAO", campos: campos as Prisma.InputJsonValue } },
    },
    include: { marcadores: true },
  });
}

// Edição e registro na mesma transação: não há alteração sem registro.
export async function atualizarIngrediente(
  id: number,
  dados: Prisma.IngredienteUpdateInput,
  registro: { usuario_id: number; campos: CampoAlterado[]; motivo: string },
) {
  const [ingrediente] = await prisma.$transaction([
    prisma.ingrediente.update({ where: { id }, data: dados }),
    prisma.alteracaoIngrediente.create({
      data: { ingrediente_id: id, usuario_id: registro.usuario_id, acao: "EDICAO", campos: registro.campos as Prisma.InputJsonValue, motivo: registro.motivo },
    }),
  ]);
  return ingrediente;
}

export function listarAlteracoes(ingrediente_id: number) {
  return prisma.alteracaoIngrediente.findMany({
    where: { ingrediente_id },
    orderBy: { criado_em: "desc" },
    include: { usuario: { select: { nome: true, papel: true } } },
  });
}

export type DadosIg = Omit<Prisma.ValorIGUncheckedCreateInput, "id" | "ingrediente_id">;

export function salvarIg(ingrediente_id: number, dados: DadosIg) {
  return prisma.valorIG.upsert({ where: { ingrediente_id }, update: dados, create: { ...dados, ingrediente_id } });
}

export function apagarIg(ingrediente_id: number) {
  return prisma.valorIG.deleteMany({ where: { ingrediente_id } });
}

export function ligarFormaCrua(id: number, forma_crua_id: number | null, modo_preparo: ModoPreparo | null) {
  return prisma.ingrediente.update({
    where: { id },
    data: { forma_crua_id, modo_preparo },
    select: { id: true, nome: true, forma_crua_id: true, modo_preparo: true },
  });
}

export type Conferencia = { conferido_por_1: string; conferido_por_2: string };

// D6: na TACO, a conferência do conjunto é gravada no ingrediente junto com os marcadores.
export async function substituirMarcadores(ingrediente_id: number, marcadores: NovoMarcador[], conferencia?: Conferencia) {
  const [, , atualizados] = await prisma.$transaction([
    prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id } }),
    prisma.marcadorIngrediente.createMany({ data: marcadores.map((m) => ({ ...m, ingrediente_id })) }),
    prisma.marcadorIngrediente.findMany({ where: { ingrediente_id } }),
    ...(conferencia
      ? [
          prisma.ingrediente.update({
            where: { id: ingrediente_id },
            data: {
              marcacao_conferida_por_1: conferencia.conferido_por_1,
              marcacao_conferida_por_2: conferencia.conferido_por_2,
              marcacao_conferida_em: new Date(),
            },
          }),
        ]
      : []),
  ]);
  return atualizados;
}

// Alguma preparação usa o ingrediente nesse modo (ou, com { not }, em outro modo)?
export async function usadoEmPreparacao(ingrediente_id: number, modo_preparo: ModoPreparo | { not: ModoPreparo }) {
  return (await prisma.itemPreparacao.count({ where: { ingrediente_id, modo_preparo } })) > 0;
}

export function apagarIngrediente(id: number) {
  return prisma.ingrediente.delete({ where: { id } });
}

export function mudarAtivoIngrediente(id: number, ativo: boolean) {
  return prisma.ingrediente.update({ where: { id }, data: { ativo }, select: { id: true, ativo: true } });
}

export async function codigosCategorias() {
  return new Set((await prisma.categoriaRestricao.findMany({ select: { codigo: true } })).map((c) => c.codigo));
}

export function listarCategorias() {
  return prisma.categoriaRestricao.findMany({ orderBy: [{ tipo: "asc" }, { nome: "asc" }] });
}
