import { describe, expect, it } from "vitest";
import { derivarAlergenos } from "./alergenos";

describe("derivarAlergenos", () => {
  it("CT11: farinha de trigo + chocolate industrializado", () => {
    const r = derivarAlergenos([
      { nome: "Farinha de trigo", marcadores: [{ categoria: "TRIGO", presenca: "CONTEM" }, { categoria: "GLUTEN", presenca: "CONTEM" }] },
      { nome: "Chocolate", marcadores: [{ categoria: "LEITE", presenca: "CONTEM" }, { categoria: "AMENDOIM", presenca: "PODE_CONTER" }] },
    ]);
    expect(r).toEqual([
      { categoria: "AMENDOIM", presenca: "PODE_CONTER", origens: ["Chocolate"] },
      { categoria: "GLUTEN", presenca: "CONTEM", origens: ["Farinha de trigo"] },
      { categoria: "LEITE", presenca: "CONTEM", origens: ["Chocolate"] },
      { categoria: "TRIGO", presenca: "CONTEM", origens: ["Farinha de trigo"] },
    ]);
  });

  it("CT12: leite contém em um e pode conter em outro → contém, com as duas origens", () => {
    const r = derivarAlergenos([
      { nome: "Biscoito", marcadores: [{ categoria: "LEITE", presenca: "PODE_CONTER" }] },
      { nome: "Queijo", marcadores: [{ categoria: "LEITE", presenca: "CONTEM" }] },
    ]);
    expect(r).toEqual([{ categoria: "LEITE", presenca: "CONTEM", origens: ["Biscoito", "Queijo"] }]);
  });

  it("CT13: preparação sem trigo marcada pelo operador → pode conter, contato na cozinha", () => {
    const r = derivarAlergenos([{ nome: "Batata", marcadores: [] }], ["TRIGO"]);
    expect(r).toEqual([{ categoria: "TRIGO", presenca: "PODE_CONTER", origens: ["contato na cozinha"] }]);
  });

  it("contato na cozinha não rebaixa um CONTEM", () => {
    const r = derivarAlergenos([{ nome: "Farinha", marcadores: [{ categoria: "TRIGO", presenca: "CONTEM" }] }], ["TRIGO"]);
    expect(r).toEqual([{ categoria: "TRIGO", presenca: "CONTEM", origens: ["Farinha", "contato na cozinha"] }]);
  });
});
