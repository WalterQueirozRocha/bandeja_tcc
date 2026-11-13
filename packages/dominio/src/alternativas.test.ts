import { describe, expect, it } from "vitest";
import { sugerirAlternativas, type ItemAvaliado } from "./alternativas";

const item = (id: number, compatibilidade: ItemAvaliado["compatibilidade"], carboidrato_disponivel_g: number): ItemAvaliado => ({
  id,
  nome: `Item ${id}`,
  compatibilidade,
  carboidrato_disponivel_g,
});

const cardapio = [
  item(1, "BLOQUEADO", 30),
  item(2, "COMPATIVEL", 50),
  item(3, "COMPATIVEL", 28),
  item(4, "ATENCAO", 31),
  item(5, "COMPATIVEL", 35),
  item(6, "COMPATIVEL", 10),
];

describe("sugerirAlternativas (RF16)", () => {
  it("até 3 compatíveis do mesmo cardápio, os de carboidrato mais próximo primeiro", () => {
    // distâncias a 30 g: item 3 → 2, item 5 → 5, itens 2 e 6 → 20 (empate: ordem alfabética)
    expect(sugerirAlternativas(cardapio[0]!, cardapio).map((i) => i.id)).toEqual([3, 5, 2]);
  });

  it("nunca sugere item em atenção ou bloqueado", () => {
    expect(sugerirAlternativas(cardapio[3]!, cardapio).every((i) => i.compatibilidade === "COMPATIVEL")).toBe(true);
  });

  it("item compatível não precisa de alternativa", () => {
    expect(sugerirAlternativas(cardapio[1]!, cardapio)).toEqual([]);
  });

  it("sem compatíveis no cardápio, não há sugestão", () => {
    expect(sugerirAlternativas(cardapio[0]!, [cardapio[0]!, cardapio[3]!])).toEqual([]);
  });

  it("empate na distância: ordem alfabética", () => {
    const empate = [item(1, "BLOQUEADO", 20), { ...item(2, "COMPATIVEL", 25), nome: "B" }, { ...item(3, "COMPATIVEL", 15), nome: "A" }];
    expect(sugerirAlternativas(empate[0]!, empate).map((i) => i.nome)).toEqual(["A", "B"]);
  });
});
