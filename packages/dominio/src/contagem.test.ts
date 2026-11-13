import { describe, expect, it } from "vitest";
import { deveNotificar, semanaDe } from "./contagem";

describe("semanaDe (P8)", () => {
  it("quinta-feira 23/10/2026 → semana de segunda 19/10", () => {
    const s = semanaDe(new Date("2026-10-23T15:00:00Z"));
    expect(s.segunda).toBe("2026-10-19");
    expect(s.inicio.toISOString()).toBe("2026-10-19T03:00:00.000Z"); // 00:00 em Salvador
    expect(s.fim.toISOString()).toBe("2026-10-26T03:00:00.000Z");
  });

  it("domingo 23h30 em Salvador ainda é a semana anterior", () => {
    expect(semanaDe(new Date("2026-10-26T02:30:00Z")).segunda).toBe("2026-10-19");
  });

  it("segunda 00h10 em Salvador já é a semana nova", () => {
    expect(semanaDe(new Date("2026-10-26T03:10:00Z")).segunda).toBe("2026-10-26");
  });
});

describe("deveNotificar (RF11)", () => {
  it("CT17: limite 2; 2º, 3º e 4º consumos → só o 3º notifica", () => {
    let notificada = false;
    const resultado = [2, 3, 4].map((n) => {
      const notifica = deveNotificar(n, 2, notificada);
      notificada ||= notifica;
      return notifica;
    });
    expect(resultado).toEqual([false, true, false]);
  });

  it("limite ajustado pelo responsável", () => {
    expect(deveNotificar(1, 0, false)).toBe(true);
    expect(deveNotificar(5, 5, false)).toBe(false);
  });
});
