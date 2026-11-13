import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lerTabela, planilha } from "./csv";

const arquivo = (conteudo: string) => {
  const caminho = join(mkdtempSync(join(tmpdir(), "csv-")), "t.csv");
  writeFileSync(caminho, conteudo, "utf8");
  return caminho;
};

describe("lerTabela", () => {
  it("linha com coluna a mais (';' dentro de campo) é erro com o número da linha", () => {
    expect(() => lerTabela(arquivo("a;b\n1;2\n3;4;5\n"))).toThrow(/colunas a mais.*: 3$/);
  });

  it("linha com colunas a menos é aceita e completa com vazio", () => {
    expect(lerTabela(arquivo("a;b;c\n1;2\n"))).toEqual([{ a: "1", b: "2", c: "", linha: "2" }]);
  });

  it.each(["valores-ig.csv", "marcadores.csv", "carboidratos.csv", "fatores-coccao.csv", "formas-preparadas.csv"])(
    "planilha real %s não tem coluna a mais",
    (nome) => {
      expect(() => lerTabela(planilha(nome))).not.toThrow();
    },
  );
});
