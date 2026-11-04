import { comporPreparacao, type ItemComposicao } from "./composicao";
import { ROTULO_ESTIMATIVA } from "./textos";

// Carboidrato disponível (Eq. 3.2): a TACO inclui a fibra no carboidrato. Fibra não analisada (nula) conta como 0.
export function carboidratoDisponivel(carboidrato_g: number, fibra_g: number | null): number {
  return Math.max(0, carboidrato_g - (fibra_g ?? 0));
}

export type CategoriaCarboidrato =
  | "GLICOSE" | "FRUTOSE" | "GALACTOSE" | "MALTOSE" | "TREALOSE" | "SACAROSE" | "LACTOSE"
  | "ISOMALTULOSE" | "MALTOTRIOSE_MALTOTETRAOSE" | "AMIDO" | "MALTODEXTRINA" | "MALTITOL" | "XILITOL" | "NENHUM";

// Rytz et al. (2019), Tabela 2: IG de cada carboidrato (a = 1, exceto amido: a = RDS/100).
export const IG_CARBOIDRATO: Record<Exclude<CategoriaCarboidrato, "NENHUM">, number> = {
  GLICOSE: 100, FRUTOSE: 20, GALACTOSE: 20, MALTOSE: 105, TREALOSE: 70, SACAROSE: 62, LACTOSE: 47,
  ISOMALTULOSE: 32, MALTOTRIOSE_MALTOTETRAOSE: 110, AMIDO: 110, MALTODEXTRINA: 110, MALTITOL: 35, XILITOL: 12,
};

// Redutores b_j. Quadro 7: toda fibra tratada como insolúvel (b = 0,1); água tem b = 0 e por isso não entra.
export type Coeficientes = { proteina: number; gordura: number; fibra: number; cinzas: number };
export const COEFICIENTES_PADRAO: Coeficientes = { proteina: 0.6, gordura: 0.6, fibra: 0.1, cinzas: 0.1 };

// Quadro 7: RDS medido (Englyst et al., 1999) ou, na falta, o maior valor entre os cereais.
export const RDS_PADRAO_PERCENTUAL = 94;

export type ComponenteGlicemico = {
  nome: string;
  carboidrato_disponivel_g: number;
  categoria_carboidrato: CategoriaCarboidrato;
  rds_percentual: number | null;
  proteina_g: number;
  lipideos_g: number;
  fibra_g: number;
  cinzas_g: number;
  ig: { valor: number; lista: "LISTA_1" | "LISTA_2" } | null;
};

type Estimativa = { ig: number | null; hipoteses: string[]; motivo?: string };

// Eq. 2.5: IG = Σ(x_i·a_i·IG_i) / (Σx_i + Σx_j·b_j). Escala invariante: aceita gramas totais ou da porção.
export function igRytz(componentes: ComponenteGlicemico[], b: Coeficientes = COEFICIENTES_PADRAO): Estimativa {
  const hipoteses: string[] = [];
  let numerador = 0;
  let somaCarboidratos = 0;
  let somaRedutores = 0;
  for (const c of componentes) {
    const x = c.carboidrato_disponivel_g;
    if (x > 0) {
      let categoria = c.categoria_carboidrato;
      if (categoria === "NENHUM") {
        categoria = "AMIDO";
        hipoteses.push(`${c.nome}: tem carboidrato disponível sem categoria; tratado como amido (maior índice)`);
      }
      let a = 1;
      if (categoria === "AMIDO") {
        const rds = c.rds_percentual ?? RDS_PADRAO_PERCENTUAL;
        if (c.rds_percentual === null) hipoteses.push(`${c.nome}: RDS não medido; assumido ${RDS_PADRAO_PERCENTUAL}%`);
        a = rds / 100;
      }
      numerador += x * a * IG_CARBOIDRATO[categoria];
      somaCarboidratos += x;
    }
    somaRedutores += c.proteina_g * b.proteina + c.lipideos_g * b.gordura + c.fibra_g * b.fibra + c.cinzas_g * b.cinzas;
  }
  if (componentes.some((c) => c.fibra_g > 0)) hipoteses.push("Fibra tratada como insolúvel (b = 0,1)");
  const denominador = somaCarboidratos + somaRedutores;
  return denominador > 0 ? { ig: numerador / denominador, hipoteses } : { ig: null, hipoteses, motivo: "preparação sem macronutrientes" };
}

// Eq. 2.4: média dos IG ponderada pelo carboidrato disponível; só com todos os ingredientes com carboidrato pareados.
export function igFao(componentes: ComponenteGlicemico[]): Estimativa {
  const comCarboidrato = componentes.filter((c) => c.carboidrato_disponivel_g > 0);
  if (comCarboidrato.length === 0) return { ig: null, hipoteses: [], motivo: "preparação sem carboidrato disponível" };
  const semIg = comCarboidrato.filter((c) => c.ig === null).map((c) => c.nome);
  if (semIg.length) return { ig: null, hipoteses: [], motivo: `sem IG pareado: ${semIg.join(", ")}` };
  const hipoteses = comCarboidrato
    .filter((c) => c.ig!.lista === "LISTA_2")
    .map((c) => `${c.nome}: IG da lista 2 de Atkinson et al. (2021), método fora do padrão ISO`);
  const soma = comCarboidrato.reduce((s, c) => s + c.carboidrato_disponivel_g, 0);
  const ponderado = comCarboidrato.reduce((s, c) => s + c.carboidrato_disponivel_g * c.ig!.valor, 0);
  return { ig: ponderado / soma, hipoteses };
}

// Eq. 2.3.
export const cargaGlicemica = (ig: number, carboidratoDisponivel_g: number) => (ig * carboidratoDisponivel_g) / 100;
export const cgRefeicao = (cargas: number[]) => cargas.reduce((s, c) => s + c, 0);
// FAO/OMS: a refeição só tem CG quando todas as preparações têm (mesma regra do pareamento); null = não calculável.
export const cgRefeicaoSeCalculavel = (cargas: (number | null)[]) =>
  cargas.includes(null) ? null : cgRefeicao(cargas as number[]);

export type MetaGlicemica = Pick<ComponenteGlicemico, "categoria_carboidrato" | "rds_percentual" | "ig">;

// RF04: sempre informa os gramas de carboidrato disponível da porção; CG de cada modelo, sem faixas.
export function estimarCargaGlicemica(itens: (ItemComposicao & MetaGlicemica)[], porcao_g: number) {
  const composicao = comporPreparacao(itens, porcao_g);
  const componentes: ComponenteGlicemico[] = itens.map((item, i) => {
    const n = composicao.itens[i]!.nutrientes;
    return {
      nome: item.nome,
      carboidrato_disponivel_g: carboidratoDisponivel(n.carboidrato_g, n.fibra_g),
      categoria_carboidrato: item.categoria_carboidrato,
      rds_percentual: item.rds_percentual,
      proteina_g: n.proteina_g,
      lipideos_g: n.lipideos_g,
      fibra_g: n.fibra_g,
      cinzas_g: n.cinzas_g,
      ig: item.ig,
    };
  });
  const fracaoPorcao = composicao.peso_final_g > 0 ? porcao_g / composicao.peso_final_g : 0;
  const carboidrato_disponivel_g =
    componentes.reduce((s, c) => s + c.carboidrato_disponivel_g, 0) * fracaoPorcao;
  const rytz = igRytz(componentes);
  const fao = igFao(componentes);
  const modelo = (e: Estimativa) => (e.ig === null ? null : { ig: e.ig, cg: cargaGlicemica(e.ig, carboidrato_disponivel_g) });

  return {
    rotulo: ROTULO_ESTIMATIVA,
    porcao_g,
    carboidrato_disponivel_g,
    rytz: modelo(rytz),
    fao: modelo(fao),
    motivo_fao: fao.motivo ?? null,
    hipoteses: [...composicao.hipoteses, ...rytz.hipoteses, ...fao.hipoteses],
  };
}
