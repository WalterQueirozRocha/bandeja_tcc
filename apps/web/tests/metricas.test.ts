import { describe, expect, it } from "vitest";
import { concordancia, contarAcertos, somarAcertos, taxas } from "@/avaliacoes/metricas";

describe("A1: taxas de omissão e falso alarme (Eq. 3.3)", () => {
  it("conta VP, FN e FP contra o gabarito", () => {
    const a = contarAcertos(new Set(["TRIGO", "GLUTEN", "OVOS"]), new Set(["TRIGO", "GLUTEN", "AMENDOIM"]));
    expect(a).toEqual({ vp: 2, fn: 1, fp: 1 });
    expect(taxas(a)).toEqual({ t_omissao: 1 / 3, t_falso_alarme: 1 / 3 });
  });

  it("soma por condição e trata divisão por zero", () => {
    expect(somarAcertos([{ vp: 1, fn: 2, fp: 0 }, { vp: 3, fn: 0, fp: 1 }])).toEqual({ vp: 4, fn: 2, fp: 1 });
    expect(taxas({ vp: 0, fn: 0, fp: 0 })).toEqual({ t_omissao: null, t_falso_alarme: null });
  });
});

describe("A3: concordância (Bland-Altman e Pearson)", () => {
  it("valores conhecidos", () => {
    const c = concordancia([
      [10, 8],
      [20, 18],
      [30, 27],
    ]);
    // diferenças 2, 2, 3 → média 2,333; DP 0,577
    expect(c.n).toBe(3);
    expect(c.diferenca_media).toBeCloseTo(2.3333, 4);
    expect(c.desvio_padrao).toBeCloseTo(0.5774, 4);
    expect(c.limite_inferior).toBeCloseTo(2.3333 - 1.96 * 0.5774, 3);
    expect(c.limite_superior).toBeCloseTo(2.3333 + 1.96 * 0.5774, 3);
    expect(c.pearson).toBeCloseTo(0.9993, 3);
  });

  it("menos de dois pares ou variância zero → sem correlação", () => {
    expect(concordancia([]).pearson).toBeNull();
    expect(concordancia([[5, 3]]).diferenca_media).toBe(2);
    expect(concordancia([[5, 3], [5, 4]]).pearson).toBeNull();
  });
});
