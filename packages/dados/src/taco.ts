import type { CategoriaCarboidrato, GrupoAlimentar, ModoPreparo } from "./generated/prisma/client";

// Títulos de grupo da planilha "CMVCol taco3" (TACO 4ª ed.) → enum.
export const GRUPOS_TACO: Record<string, GrupoAlimentar> = {
  "Cereais e derivados": "CEREAIS",
  "Verduras, hortaliças e derivados": "VERDURAS_HORTALICAS",
  "Frutas e derivados": "FRUTAS",
  "Gorduras e óleos": "GORDURAS_OLEOS",
  "Pescados e frutos do mar": "PESCADOS_FRUTOS_MAR",
  "Carnes e derivados": "CARNES",
  "Leite e derivados": "LEITE",
  "Bebidas (alcoólicas e não alcoólicas)": "BEBIDAS",
  "Ovos e derivados": "OVOS",
  "Produtos açucarados": "PRODUTOS_ACUCARADOS",
  "Miscelâneas": "MISCELANEAS",
  "Outros alimentos industrializados": "OUTROS_INDUSTRIALIZADOS",
  "Alimentos preparados": "ALIMENTOS_PREPARADOS",
  "Leguminosas e derivados": "LEGUMINOSAS",
  "Nozes e sementes": "NOZES_SEMENTES",
};

export type AlimentoTaco = {
  codigo_taco: number;
  nome: string;
  grupo_alimentar: GrupoAlimentar;
  umidade_g: number | null;
  energia_kcal: number | null;
  proteina_g: number | null;
  lipideos_g: number | null;
  carboidrato_g: number | null;
  fibra_g: number | null;
  cinzas_g: number | null;
};

// "Tr" (traço) → 0; "NA", "*" e vazio (não analisado) → nulo.
export function valorTaco(texto: string | undefined): number | null {
  if (texto === undefined || texto === "" || texto === "NA" || texto === "*") return null;
  if (texto === "Tr") return 0;
  const n = Number(texto);
  if (Number.isNaN(n)) throw new Error(`valor da TACO inválido: "${texto}"`);
  return n;
}

// Colunas: 0 número, 1 descrição, 2 umidade, 3 kcal, 5 proteína, 6 lipídeos, 8 carboidrato, 9 fibra, 10 cinzas.
export function lerAlimentosTaco(linhas: string[][]): AlimentoTaco[] {
  const alimentos: AlimentoTaco[] = [];
  let grupo: GrupoAlimentar | undefined;
  for (const c of linhas) {
    const titulo = GRUPOS_TACO[c[0] ?? ""];
    if (titulo) {
      grupo = titulo;
      continue;
    }
    if (!/^\d+$/.test(c[0] ?? "")) continue;
    if (!grupo) throw new Error(`alimento ${c[0]} antes de qualquer título de grupo`);
    alimentos.push({
      codigo_taco: Number(c[0]),
      nome: c[1] ?? "",
      grupo_alimentar: grupo,
      umidade_g: valorTaco(c[2]),
      energia_kcal: valorTaco(c[3]),
      proteina_g: valorTaco(c[5]),
      lipideos_g: valorTaco(c[6]),
      carboidrato_g: valorTaco(c[8]),
      fibra_g: valorTaco(c[9]),
      cinzas_g: valorTaco(c[10]),
    });
  }
  return alimentos;
}

// ponytail: padrão provisório por grupo (Quadro 7: em mistura, o carboidrato de maior índice);
// exceções vêm de planilhas/carboidratos.csv, revisado pela equipe.
const CARBOIDRATO_POR_GRUPO: Partial<Record<GrupoAlimentar, CategoriaCarboidrato>> = {
  LEITE: "LACTOSE",
  PRODUTOS_ACUCARADOS: "SACAROSE",
  BEBIDAS: "SACAROSE",
  FRUTAS: "GLICOSE",
};

export function categoriaCarboidratoPadrao(a: AlimentoTaco): CategoriaCarboidrato {
  if (Math.max(0, (a.carboidrato_g ?? 0) - (a.fibra_g ?? 0)) === 0) return "NENHUM";
  return CARBOIDRATO_POR_GRUPO[a.grupo_alimentar] ?? "AMIDO";
}

const MODOS: Record<string, ModoPreparo> = {
  cru: "CRU", crua: "CRU",
  cozido: "COZIDO", cozida: "COZIDO",
  assado: "ASSADO", assada: "ASSADO",
  grelhado: "GRELHADO", grelhada: "GRELHADO",
  frito: "FRITO", frita: "FRITO",
};

// "Arroz, tipo 1, cozido" → { base: "Arroz, tipo 1", modo: "COZIDO" }.
export function detectarModo(nome: string): { base: string; modo: ModoPreparo } | null {
  const i = nome.lastIndexOf(",");
  const modo = MODOS[nome.slice(i + 1).trim().toLowerCase()];
  return i > 0 && modo ? { base: nome.slice(0, i).trim(), modo } : null;
}

// Sugere a ligação preparado → cru pelo nome; a equipe confere antes de importar.
export function sugerirFormas(alimentos: AlimentoTaco[]) {
  const crus = new Map<string, AlimentoTaco>();
  for (const a of alimentos) {
    const d = detectarModo(a.nome);
    if (d?.modo === "CRU") crus.set(d.base.toLowerCase(), a);
  }
  return alimentos.flatMap((a) => {
    const d = detectarModo(a.nome);
    const cru = d && d.modo !== "CRU" ? crus.get(d.base.toLowerCase()) : undefined;
    return cru && d ? [{ preparado: a, modo: d.modo, cru }] : [];
  });
}
