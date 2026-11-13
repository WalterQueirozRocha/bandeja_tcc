import { describe, expect, it } from "vitest";
import { composicao, item } from "./apoio-testes";
import { comporPreparacao, modosDisponiveis } from "./composicao";

describe("comporPreparacao", () => {
  it("CT01: 100 g cru, 78 g de carboidrato/100 g, fator 2,5 → 250 g; 78 g; 31,2 g/100 g", () => {
    const r = comporPreparacao(
      [item({ modo: "COZIDO", fator_coccao: 2.5, composicao: composicao({ carboidrato_g: 78 }) })],
      100,
    );
    expect(r.peso_final_g).toBe(250);
    expect(r.total.carboidrato_g).toBeCloseTo(78);
    expect(r.por_100g.carboidrato_g).toBeCloseTo(31.2);
    expect(r.hipoteses[0]).toMatch(/fator de cocção 2.5 só no peso \(referência do fator não informada\)/);
  });

  it("a hipótese cita a referência cadastrada do fator", () => {
    const r = comporPreparacao([item({ modo: "COZIDO", fator_coccao: 2.64, fator_referencia: "Silva et al. (2012)" })], 100);
    expect(r.hipoteses[0]).toMatch(/fator de cocção 2.64 só no peso \(Silva et al. \(2012\)\)/);
  });

  it("com forma preparada, a composição vale para o peso preparado", () => {
    const r = comporPreparacao(
      [item({ modo: "COZIDO", fator_coccao: 2.5, forma_preparada: true, composicao: composicao({ carboidrato_g: 28 }) })],
      100,
    );
    expect(r.total.carboidrato_g).toBeCloseTo(70); // 250 g × 28/100
    expect(r.porcao.carboidrato_g).toBeCloseTo(28);
    expect(r.hipoteses[0]).toMatch(/forma preparada na TACO/);
  });

  it("soma ingredientes e escala para a porção (Eq. 3.1)", () => {
    const r = comporPreparacao(
      [
        item({ nome: "A", quantidade_crua_g: 100, composicao: composicao({ proteina_g: 10 }) }),
        item({ nome: "B", quantidade_crua_g: 300, composicao: composicao({ proteina_g: 2 }) }),
      ],
      200,
    );
    expect(r.peso_final_g).toBe(400);
    expect(r.total.proteina_g).toBeCloseTo(16);
    expect(r.porcao.proteina_g).toBeCloseTo(8);
  });

  it("nutriente ausente vira 0 e fica nas hipóteses", () => {
    const r = comporPreparacao([item({ nome: "Pão", composicao: composicao({ cinzas_g: null }) })], 50);
    expect(r.total.cinzas_g).toBe(0);
    expect(r.hipoteses).toContain("cinzas_g ausente em Pão: tratado como 0");
  });

  it("fibra não analisada vira 0, com hipótese própria", () => {
    const r = comporPreparacao([item({ nome: "Açúcar", composicao: composicao({ carboidrato_g: 99.5, fibra_g: null }) })], 10);
    expect(r.total.fibra_g).toBe(0);
    expect(r.hipoteses).toContain("fibra não analisada em Açúcar: tratada como 0 (carboidrato disponível = carboidrato total)");
  });

  it("forma preparada sem fator do grupo: peso final = peso cru, com hipótese", () => {
    const r = comporPreparacao(
      [item({ nome: "Frango", modo: "ASSADO", fator_coccao: null, forma_preparada: true, composicao: composicao({ proteina_g: 28 }) })],
      100,
    );
    expect(r.peso_final_g).toBe(100);
    expect(r.porcao.proteina_g).toBeCloseTo(28);
    expect(r.hipoteses[0]).toMatch(/sem fator de cocção publicado para o grupo, peso final = peso cru/);
  });

  it("sem itens, tudo zero", () => {
    expect(comporPreparacao([], 100).porcao.carboidrato_g).toBe(0);
  });
});

describe("modosDisponiveis", () => {
  it("CT02: frito sem forma frita na TACO não é oferecido", () => {
    expect(modosDisponiveis({ fatores: { FRITO: 0.9 }, formasPreparadas: {} })).toEqual(["CRU"]);
  });

  it("frito com forma frita e fator é oferecido", () => {
    expect(modosDisponiveis({ fatores: { FRITO: 0.9 }, formasPreparadas: { FRITO: {} } })).toContain("FRITO");
  });

  it("com forma preparada na TACO, só CRU e os modos dela, mesmo sem fator (Quadro 13, nº 5)", () => {
    // pão de queijo cru: grupo com fator COZIDO, mas a TACO só tem o assado
    expect(modosDisponiveis({ fatores: { COZIDO: 0.99 }, formasPreparadas: { ASSADO: {} } })).toEqual(["CRU", "ASSADO"]);
    // batata: forma frita sem fator FRITO do grupo
    expect(modosDisponiveis({ fatores: { COZIDO: 0.99 }, formasPreparadas: { COZIDO: {}, FRITO: {} } })).toEqual(["CRU", "COZIDO", "FRITO"]);
  });

  it("sem forma preparada, os modos com fator do grupo; FRITO nunca", () => {
    expect(modosDisponiveis({ fatores: { COZIDO: 2.5, GRELHADO: 0.7, FRITO: 0.8 }, formasPreparadas: {} })).toEqual(["CRU", "COZIDO", "GRELHADO"]);
    expect(modosDisponiveis({ fatores: {}, formasPreparadas: {} })).toEqual(["CRU"]);
  });
});
