import { prisma } from "./banco";

// FC-08: peso final = Σ peso cru × fator do grupo no modo (CRU = 1), a mesma regra do domínio (v3 §4.4).
// ponytail: recalcula todas as preparações; filtrar pelo grupo e modo do fator alterado se forem muitas.
export async function recalcularPesosFinais() {
  const [preparacoes, fatores] = await Promise.all([
    prisma.preparacao.findMany({
      select: {
        id: true,
        peso_final_calculado: true,
        itens: { select: { quantidade_crua_g: true, modo_preparo: true, ingrediente: { select: { grupo_alimentar: true } } } },
      },
    }),
    prisma.fatorPreparo.findMany({ select: { grupo_alimentar: true, modo_preparo: true, fator_coccao: true } }),
  ]);
  const fatorDe = new Map(fatores.map((f) => [`${f.grupo_alimentar}/${f.modo_preparo}`, f.fator_coccao]));
  const atualizacoes = preparacoes.flatMap((p) => {
    const pesos = p.itens.map((i) =>
      i.modo_preparo === "CRU" ? i.quantidade_crua_g : i.quantidade_crua_g * (fatorDe.get(`${i.ingrediente.grupo_alimentar}/${i.modo_preparo}`) ?? NaN),
    );
    const peso = pesos.reduce((s, x) => s + x, 0);
    // Sem fator (não deveria acontecer: fator em uso não é removido) a preparação fica como está.
    if (Number.isNaN(peso) || peso === p.peso_final_calculado) return [];
    return [prisma.preparacao.update({ where: { id: p.id }, data: { peso_final_calculado: peso } })];
  });
  await prisma.$transaction(atualizacoes);
  return atualizacoes.length;
}
