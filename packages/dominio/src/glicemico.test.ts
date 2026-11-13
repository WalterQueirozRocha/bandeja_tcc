import { describe, expect, it } from "vitest";
import { composicao, item } from "./apoio-testes";
import {
  carboidratoDisponivel,
  cargaGlicemica,
  cgRefeicao,
  cgRefeicaoSeCalculavel,
  estimarCargaGlicemica,
  igFao,
  igRytz,
  type ComponenteGlicemico,
} from "./glicemico";

const componente = (parcial: Partial<ComponenteGlicemico>): ComponenteGlicemico => ({
  nome: "C",
  carboidrato_disponivel_g: 0,
  categoria_carboidrato: "NENHUM",
  rds_percentual: null,
  proteina_g: 0,
  lipideos_g: 0,
  fibra_g: 0,
  cinzas_g: 0,
  ig: null,
  ...parcial,
});

describe("carboidratoDisponivel", () => {
  it("CT03: 20 g e fibra 3 g → 17 g; 2 g e fibra 3 g → 0 g", () => {
    expect(carboidratoDisponivel(20, 3)).toBe(17);
    expect(carboidratoDisponivel(2, 3)).toBe(0);
  });

  it("fibra vazia (não analisada na TACO) conta como 0", () => {
    expect(carboidratoDisponivel(99.5, null)).toBe(99.5);
    // açúcar refinado (TACO 494): carboidrato 99,5 g e fibra "NA"
    const r = estimarCargaGlicemica(
      [{ ...item({ nome: "Açúcar", quantidade_crua_g: 10, composicao: composicao({ carboidrato_g: 99.5, fibra_g: null }) }), categoria_carboidrato: "SACAROSE", rds_percentual: null, ig: { valor: 65, lista: "LISTA_1" } }],
      10,
    );
    expect(r.carboidrato_disponivel_g).toBeCloseTo(9.95);
    expect(r.fao!.cg).toBeCloseTo((65 * 9.95) / 100);
  });
});

describe("igRytz", () => {
  it("CT04: 50 g de glicose + 50 g de proteína → 62,5", () => {
    const r = igRytz([
      componente({ carboidrato_disponivel_g: 50, categoria_carboidrato: "GLICOSE" }),
      componente({ proteina_g: 50 }),
    ]);
    expect(r.ig).toBeCloseTo(62.5);
  });

  // Rytz et al. (2019), seção 2.4: 100 g de leite integral = 88 g água, 4,9 g lactose, 3,3 g gordura,
  // 3,1 g proteína, 0,7 g minerais. O artigo publica 26 (usando b = 0 para minerais; com b = 0,1, 26,1).
  it("CT05: leite do exemplo de Rytz et al. (2019) → ≈ 26", () => {
    const r = igRytz([
      componente({ carboidrato_disponivel_g: 4.9, categoria_carboidrato: "LACTOSE", lipideos_g: 3.3, proteina_g: 3.1, cinzas_g: 0.7 }),
    ]);
    expect(r.ig).toBeCloseTo(26, 0);
  });

  it("CT10: mesma fibra com b = 0,1 dá IG maior ou igual a b = 0,3", () => {
    const pao = [componente({ carboidrato_disponivel_g: 50, categoria_carboidrato: "AMIDO", rds_percentual: 94, fibra_g: 5 })];
    const insoluvel = igRytz(pao).ig!;
    const soluvel = igRytz(pao, { proteina: 0.6, gordura: 0.6, fibra: 0.3, cinzas: 0.1 }).ig!;
    expect(insoluvel).toBeGreaterThanOrEqual(soluvel);
  });

  it("amido sem RDS medido assume 94% e registra", () => {
    const r = igRytz([componente({ nome: "Bolo", carboidrato_disponivel_g: 10, categoria_carboidrato: "AMIDO" })]);
    expect(r.ig).toBeCloseTo(110 * 0.94);
    expect(r.hipoteses).toContain("Bolo: RDS não medido; assumido 94%");
  });

  it("carboidrato sem categoria é tratado como amido", () => {
    const r = igRytz([componente({ nome: "X", carboidrato_disponivel_g: 10, rds_percentual: 100 })]);
    expect(r.ig).toBeCloseTo(110);
    expect(r.hipoteses[0]).toMatch(/tratado como amido/);
  });

  it("sem nenhum macronutriente → não calculável", () => {
    expect(igRytz([componente({})]).ig).toBeNull();
  });
});

describe("igFao", () => {
  it("CT06: pão branco (50 g, IG 88) + manteiga (0 g) → 88", () => {
    const r = igFao([
      componente({ carboidrato_disponivel_g: 50, ig: { valor: 88, lista: "LISTA_1" } }),
      componente({ carboidrato_disponivel_g: 0 }),
    ]);
    expect(r.ig).toBe(88);
  });

  it("CT07: exemplo da FAO/OMS (escala do pão) → 80", () => {
    const r = igFao(
      [[25, 100], [25, 72], [6, 39], [5, 87], [12, 74]].map(([c, ig]) =>
        componente({ carboidrato_disponivel_g: c!, ig: { valor: ig!, lista: "LISTA_1" } }),
      ),
    );
    expect(r.ig).toBeCloseTo(80, 0);
  });

  it("CT08: ingrediente com carboidrato sem IG pareado → FAO não calculado; Rytz calculado", () => {
    const componentes = [
      componente({ nome: "Pão", carboidrato_disponivel_g: 50, categoria_carboidrato: "AMIDO", ig: { valor: 70, lista: "LISTA_1" } }),
      componente({ nome: "Doce", carboidrato_disponivel_g: 10, categoria_carboidrato: "SACAROSE" }),
    ];
    expect(igFao(componentes)).toMatchObject({ ig: null, motivo: "sem IG pareado: Doce" });
    expect(igRytz(componentes).ig).not.toBeNull();
  });

  it("IG da lista 2 fica sinalizado", () => {
    const r = igFao([componente({ nome: "Pão", carboidrato_disponivel_g: 10, ig: { valor: 70, lista: "LISTA_2" } })]);
    expect(r.hipoteses[0]).toMatch(/lista 2/);
  });

  it("IG estimado (Louie et al., 2015) entra na média e fica sinalizado; IG da lista 1 não gera hipótese", () => {
    const r = igFao([
      componente({ nome: "Pão", carboidrato_disponivel_g: 30, ig: { valor: 70, lista: "LISTA_1" } }),
      componente({ nome: "Paçoca", carboidrato_disponivel_g: 10, ig: { valor: 76, lista: "ESTIMADO" } }),
    ]);
    expect(r.ig).toBeCloseTo((30 * 70 + 10 * 76) / 40);
    expect(r.hipoteses).toEqual(["Paçoca: IG estimado (Louie et al., 2015), sem medição publicada"]);
  });

  it("sem carboidrato → não calculável", () => {
    expect(igFao([componente({})]).motivo).toBe("preparação sem carboidrato disponível");
  });
});

describe("carga glicêmica", () => {
  it("CT09: IG 70 e 30 g → CG 21,0; refeição com 21 e 9 → 30,0", () => {
    expect(cargaGlicemica(70, 30)).toBeCloseTo(21);
    expect(cgRefeicao([21, 9])).toBeCloseTo(30);
  });

  it("refeição pela FAO: soma só quando todos os itens têm CG", () => {
    expect(cgRefeicaoSeCalculavel([21, 9, 0])).toBeCloseTo(30);
    expect(cgRefeicaoSeCalculavel([21, null])).toBeNull();
  });

  it("estimativa da porção: gramas de carboidrato, os dois modelos e o rótulo", () => {
    const r = estimarCargaGlicemica(
      [
        {
          ...item({ nome: "Arroz", quantidade_crua_g: 100, modo: "COZIDO", fator_coccao: 2.5, composicao: composicao({ carboidrato_g: 78, fibra_g: 2, proteina_g: 7 }) }),
          categoria_carboidrato: "AMIDO",
          rds_percentual: null,
          ig: { valor: 70, lista: "LISTA_1" },
        },
      ],
      125,
    );
    expect(r.rotulo).toBe("estimativa");
    expect(r.carboidrato_disponivel_g).toBeCloseTo(38); // (78 − 2) × 125/250
    expect(r.fao).toEqual({ ig: 70, cg: expect.closeTo(26.6, 5) });
    expect(r.rytz!.cg).toBeCloseTo((r.rytz!.ig * 38) / 100);
    expect(r.motivo_fao).toBeNull();
    expect(r.hipoteses.some((h) => h.includes("RDS não medido"))).toBe(true);
  });

  it("FAO não calculável traz o motivo", () => {
    const r = estimarCargaGlicemica(
      [{ ...item({ nome: "Doce", composicao: composicao({ carboidrato_g: 50 }) }), categoria_carboidrato: "SACAROSE", rds_percentual: null, ig: null }],
      50,
    );
    expect(r.fao).toBeNull();
    expect(r.motivo_fao).toBe("sem IG pareado: Doce");
  });

  it("Louie et al. (2015): sem IG e com menos de 2,5 g/100 g → IG 0 na FAO; 2,5 g ou mais continua travando", () => {
    const arroz = {
      ...item({ nome: "Arroz", composicao: composicao({ carboidrato_g: 50 }) }),
      categoria_carboidrato: "AMIDO" as const,
      rds_percentual: null,
      ig: { valor: 70, lista: "LISTA_1" as const },
    };
    const queijo = (carboidrato_g: number) => ({
      ...item({ nome: "Queijo", quantidade_crua_g: 500, composicao: composicao({ carboidrato_g }) }),
      categoria_carboidrato: "LACTOSE" as const,
      rds_percentual: null,
      ig: null,
    });

    const abaixo = estimarCargaGlicemica([arroz, queijo(2)], 200);
    expect(abaixo.fao!.ig).toBeCloseTo((50 * 70 + 10 * 0) / 60); // 58,3
    expect(abaixo.hipoteses.some((h) => h.startsWith("Queijo: menos de 2.5 g") && h.includes("Louie"))).toBe(true);

    const noLimite = estimarCargaGlicemica([arroz, queijo(2.5)], 200);
    expect(noLimite.fao).toBeNull();
    expect(noLimite.motivo_fao).toBe("sem IG pareado: Queijo");
    expect(noLimite.hipoteses.some((h) => h.includes("Louie"))).toBe(false);
  });

  it("sem IG continua travando a FAO mesmo com pouca parte no carboidrato (a regra dos 5% saiu em 09/11)", () => {
    const arroz = {
      ...item({ nome: "Arroz", composicao: composicao({ carboidrato_g: 50 }) }),
      categoria_carboidrato: "AMIDO" as const,
      rds_percentual: null,
      ig: { valor: 70, lista: "LISTA_1" as const },
    };
    const cebola = (quantidade_crua_g: number) => ({
      ...item({ nome: "Cebola", quantidade_crua_g, composicao: composicao({ carboidrato_g: 7 }) }),
      categoria_carboidrato: "GLICOSE" as const,
      rds_percentual: null,
      ig: null,
    });

    const pouca = estimarCargaGlicemica([arroz, cebola(10)], 110); // 0,7 g de 50,7 g = 1,4%
    expect(pouca.fao).toBeNull();
    expect(pouca.motivo_fao).toBe("sem IG pareado: Cebola");

    // Com o IG estimado pelo passo 5 de Louie (mediana do subgrupo = 32), calcula.
    const estimada = estimarCargaGlicemica([arroz, { ...cebola(10), ig: { valor: 32, lista: "ESTIMADO" as const } }], 110);
    expect(estimada.fao!.ig).toBeCloseTo((50 * 70 + 0.7 * 32) / 50.7);
    expect(estimada.hipoteses).toContain("Cebola: IG estimado (Louie et al., 2015), sem medição publicada");
  });
});
