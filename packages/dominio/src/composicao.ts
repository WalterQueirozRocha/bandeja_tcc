export const NUTRIENTES = [
  "energia_kcal",
  "proteina_g",
  "lipideos_g",
  "carboidrato_g",
  "fibra_g",
  "cinzas_g",
  "umidade_g",
] as const;
export type Nutriente = (typeof NUTRIENTES)[number];

// Por 100 g; null = não analisado na TACO ou não informado no rótulo.
export type Composicao = Record<Nutriente, number | null>;
export type Nutrientes = Record<Nutriente, number>;

export type Modo = "CRU" | "COZIDO" | "ASSADO" | "GRELHADO" | "FRITO";

// P2: CRU sempre (fator 1); outros modos só com fator publicado para o grupo; FRITO exige também a forma frita da TACO.
export function modosDisponiveis(ingrediente: {
  fatores: Partial<Record<Modo, number>>;
  formasPreparadas: Partial<Record<Modo, unknown>>;
}): Modo[] {
  const modos: Modo[] = ["CRU"];
  for (const m of ["COZIDO", "ASSADO", "GRELHADO"] as const) if (ingrediente.fatores[m] !== undefined) modos.push(m);
  if (ingrediente.fatores.FRITO !== undefined && ingrediente.formasPreparadas.FRITO !== undefined) modos.push("FRITO");
  return modos;
}

export type ItemComposicao = {
  nome: string;
  quantidade_crua_g: number;
  modo: Modo;
  fator_coccao: number;
  composicao: Composicao;
  // true: `composicao` é da forma preparada na TACO; false: é a crua e o fator só muda o peso.
  forma_preparada: boolean;
};

export type ResultadoComposicao = {
  peso_final_g: number;
  total: Nutrientes;
  porcao: Nutrientes;
  por_100g: Nutrientes;
  itens: { nome: string; peso_final_g: number; nutrientes: Nutrientes }[];
  hipoteses: string[];
};

const zerado = (): Nutrientes => Object.fromEntries(NUTRIENTES.map((n) => [n, 0])) as Nutrientes;
const escalar = (n: Nutrientes, k: number): Nutrientes =>
  Object.fromEntries(NUTRIENTES.map((x) => [x, n[x] * k])) as Nutrientes;

// Eq. 2.1 e 3.1: N_porcao = (ΣN_i / ΣP_i) × p.
export function comporPreparacao(itens: ItemComposicao[], porcao_g: number): ResultadoComposicao {
  const hipoteses: string[] = [];
  const total = zerado();
  let peso_final_g = 0;

  const calculados = itens.map((item) => {
    const peso = item.quantidade_crua_g * item.fator_coccao;
    // Com forma preparada, a composição vale para o peso já preparado; sem ela, para o peso cru.
    const base = item.forma_preparada ? peso : item.quantidade_crua_g;
    const nutrientes = zerado();
    for (const n of NUTRIENTES) {
      const c = item.composicao[n];
      if (c === null) hipoteses.push(`${n} ausente em ${item.nome}: tratado como 0`);
      nutrientes[n] = (base * (c ?? 0)) / 100;
      total[n] += nutrientes[n];
    }
    peso_final_g += peso;
    hipoteses.push(
      item.modo === "CRU"
        ? `${item.nome}: composição da TACO/rótulo como está`
        : item.forma_preparada
          ? `${item.nome} (${item.modo}): composição da forma preparada na TACO; fator de cocção ${item.fator_coccao}`
          : `${item.nome} (${item.modo}): composição crua; fator de cocção ${item.fator_coccao} só no peso (Domene, 2018)`,
    );
    return { nome: item.nome, peso_final_g: peso, nutrientes };
  });

  const porGrama = peso_final_g > 0 ? 1 / peso_final_g : 0;
  return {
    peso_final_g,
    total,
    porcao: escalar(total, porGrama * porcao_g),
    por_100g: escalar(total, porGrama * 100),
    itens: calculados,
    hipoteses,
  };
}
