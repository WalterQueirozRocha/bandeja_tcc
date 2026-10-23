import { prisma, type GrupoAlimentar, type ModoPreparo } from "@bandeja/dados";

type DadosFator = { grupo_alimentar: GrupoAlimentar; modo_preparo: ModoPreparo; fator_coccao: number; referencia: string };

export function listarFatoresCompletos() {
  return prisma.fatorPreparo.findMany({ orderBy: [{ grupo_alimentar: "asc" }, { modo_preparo: "asc" }] });
}

export function buscarFator(id: number) {
  return prisma.fatorPreparo.findUnique({ where: { id } });
}

export function buscarFatorPorChave(grupo_alimentar: GrupoAlimentar, modo_preparo: ModoPreparo) {
  return prisma.fatorPreparo.findFirst({ where: { grupo_alimentar, modo_preparo } });
}

// Em uso = alguma preparação tem ingrediente desse grupo nesse modo (o cálculo dela depende do fator).
export async function fatorEmUso(grupo_alimentar: GrupoAlimentar, modo_preparo: ModoPreparo) {
  return (await prisma.itemPreparacao.count({ where: { modo_preparo, ingrediente: { grupo_alimentar } } })) > 0;
}

export function criarFator(dados: DadosFator) {
  return prisma.fatorPreparo.create({ data: dados });
}

export function atualizarFator(id: number, dados: DadosFator) {
  return prisma.fatorPreparo.update({ where: { id }, data: dados });
}

export function apagarFator(id: number) {
  return prisma.fatorPreparo.delete({ where: { id } });
}
