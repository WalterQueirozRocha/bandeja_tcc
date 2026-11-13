import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { lerTabela } from "@bandeja/dados/src/csv";
import { importarA1, PASTA_A1, PREFIXO_A1 } from "@/avaliacoes/a1";
import { calcularAlergenos } from "@/services/preparacoes";

// D8: as preparações reais da A1 viram teste de regressão da derivação de alergênicos.
// O snapshot é revisado pela equipe na primeira geração; no CI, snapshot ausente faz o teste falhar.
const temDados = lerTabela(new URL("a1-preparacoes.csv", PASTA_A1)).length > 0;

describe("regressão A1", () => {
  afterAll(async () => {
    await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO_A1 } } });
    await prisma.$disconnect();
  });

  it.skipIf(!temDados)(
    temDados ? "a derivação de cada preparação da A1 não muda" : "pulado: a1-preparacoes.csv ainda não tem dados",
    async () => {
      await importarA1();
      const preps = await prisma.preparacao.findMany({ where: { nome: { startsWith: PREFIXO_A1 } }, orderBy: { nome: "asc" } });
      const resultado: Record<string, string[]> = {};
      for (const p of preps) {
        resultado[p.nome] = (await calcularAlergenos(p.id)).alergenos.map((a) => `${a.categoria}:${a.presenca}`);
      }
      await expect(JSON.stringify(resultado, null, 2)).toMatchFileSnapshot("./__snapshots__/a1-alergenos.json");
    },
  );
});
