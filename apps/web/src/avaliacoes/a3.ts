import { prisma } from "@bandeja/dados";
import { escreverTabela, planilha } from "@bandeja/dados/src/csv";
import { resumirPreparacoes } from "@/services/preparacoes";
import { concordancia } from "./metricas";

const fmt = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ","));

// A3: concordância Rytz × FAO/OMS nas preparações calculáveis pelos dois modelos (consistência, não exatidão).
export async function avaliarA3() {
  const ids = (await prisma.preparacao.findMany({ select: { id: true } })).map((p) => p.id);
  const resumos = [...(await resumirPreparacoes(ids)).values()];
  const pares = resumos.flatMap((r) => {
    const { rytz, fao } = r.carga_glicemica;
    return rytz && fao ? [{ nome: r.nome, rytz, fao }] : [];
  });

  escreverTabela(
    planilha("avaliacoes/resultados/a3.csv"),
    ["preparacao", "ig_rytz", "ig_fao", "dif_ig", "cg_rytz", "cg_fao", "dif_cg"],
    pares.map((p) => [p.nome, fmt(p.rytz.ig), fmt(p.fao.ig), fmt(p.rytz.ig - p.fao.ig), fmt(p.rytz.cg), fmt(p.fao.cg), fmt(p.rytz.cg - p.fao.cg)]),
  );
  const linha = (rotulo: string, c: ReturnType<typeof concordancia>) =>
    `${rotulo}: n ${c.n} · diferença média (Rytz − FAO) ${fmt(c.diferenca_media)} · limites ${fmt(c.limite_inferior)} a ${fmt(c.limite_superior)} · Pearson ${fmt(c.pearson)}`;
  return [
    `A3: ${pares.length} de ${resumos.length} preparações calculáveis pelos dois modelos → resultados/a3.csv`,
    linha("IG", concordancia(pares.map((p) => [p.rytz.ig, p.fao.ig]))),
    linha("CG", concordancia(pares.map((p) => [p.rytz.cg, p.fao.cg]))),
  ].join("\n");
}
