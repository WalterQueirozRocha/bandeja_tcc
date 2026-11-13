import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CEREAIS_COM_GLUTEN, faltaMarcadorGluten } from "./gluten";

describe("faltaMarcadorGluten (S1)", () => {
  it("cereal sem GLUTEN é recusado", () => {
    expect(faltaMarcadorGluten(["TRIGO"])).toBe(true);
    expect(faltaMarcadorGluten(["LEITE", "AVEIA"])).toBe(true);
  });

  it("cereal com GLUTEN ou nenhum cereal passa", () => {
    expect(faltaMarcadorGluten(["TRIGO", "GLUTEN"])).toBe(false);
    expect(faltaMarcadorGluten(["LEITE", "LACTOSE"])).toBe(false);
    expect(faltaMarcadorGluten([])).toBe(false);
  });

  it("acrescentar GLUTEN sempre resolve", () => {
    const categoria = fc.constantFrom(...CEREAIS_COM_GLUTEN, "LEITE", "OVOS", "SOJA", "LACTOSE");
    fc.assert(
      fc.property(fc.array(categoria), (categorias) => !faltaMarcadorGluten([...categorias, "GLUTEN"])),
    );
  });
});
