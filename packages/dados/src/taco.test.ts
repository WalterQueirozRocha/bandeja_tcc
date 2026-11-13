import { describe, expect, it } from "vitest";
import { lerLinhas } from "./csv";
import { categoriaCarboidratoPadrao, detectarModo, lerAlimentosTaco, sugerirFormas, valorTaco } from "./taco";

const planilha = new URL("../planilhas/taco.csv", import.meta.url);

describe("valorTaco", () => {
  it("Tr vira 0; NA, * e vazio viram nulo", () => {
    expect(valorTaco("Tr")).toBe(0);
    expect(valorTaco("NA")).toBeNull();
    expect(valorTaco("*")).toBeNull();
    expect(valorTaco("")).toBeNull();
    expect(valorTaco("25.809750000000001")).toBeCloseTo(25.80975);
  });

  it("valor desconhecido é erro", () => {
    expect(() => valorTaco("abc")).toThrow();
  });
});

describe("lerAlimentosTaco (planilha real)", () => {
  const alimentos = lerAlimentosTaco(lerLinhas(planilha));

  it("lê os 597 alimentos em 15 grupos", () => {
    expect(alimentos).toHaveLength(597);
    expect(new Set(alimentos.map((a) => a.grupo_alimentar)).size).toBe(15);
  });

  it("lê a composição do arroz tipo 1 cozido (código 3)", () => {
    const arroz = alimentos.find((a) => a.codigo_taco === 3)!;
    expect(arroz.nome).toBe("Arroz, tipo 1, cozido");
    expect(arroz.grupo_alimentar).toBe("CEREAIS");
    expect(arroz.carboidrato_g).toBeCloseTo(28.06, 2);
    expect(arroz.fibra_g).toBeCloseTo(1.56, 2);
    expect(arroz.umidade_g).toBeCloseTo(69.11, 2);
  });

  it("sugere arroz tipo 1 cozido → arroz tipo 1 cru", () => {
    const forma = sugerirFormas(alimentos).find((f) => f.preparado.codigo_taco === 3)!;
    expect(forma.modo).toBe("COZIDO");
    expect(forma.cru.codigo_taco).toBe(4);
  });
});

describe("detectarModo", () => {
  it("reconhece o último termo como modo de preparo", () => {
    expect(detectarModo("Batata, inglesa, frita")).toEqual({ base: "Batata, inglesa", modo: "FRITO" });
    expect(detectarModo("Aveia, flocos, crua")).toEqual({ base: "Aveia, flocos", modo: "CRU" });
    expect(detectarModo("Batata, frita, tipo chips, industrializada")).toBeNull();
  });
});

describe("categoriaCarboidratoPadrao", () => {
  const base = { codigo_taco: 1, nome: "x", umidade_g: 0, energia_kcal: 0, proteina_g: 0, lipideos_g: 0, cinzas_g: 0 };

  it("sem carboidrato disponível → NENHUM", () => {
    expect(categoriaCarboidratoPadrao({ ...base, grupo_alimentar: "CEREAIS", carboidrato_g: 2, fibra_g: 3 })).toBe("NENHUM");
  });

  it("usa o padrão do grupo e AMIDO como conservador", () => {
    expect(categoriaCarboidratoPadrao({ ...base, grupo_alimentar: "LEITE", carboidrato_g: 5, fibra_g: 0 })).toBe("LACTOSE");
    expect(categoriaCarboidratoPadrao({ ...base, grupo_alimentar: "CEREAIS", carboidrato_g: 70, fibra_g: 2 })).toBe("AMIDO");
  });
});
