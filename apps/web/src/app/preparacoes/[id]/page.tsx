import { notFound } from "next/navigation";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { ErroNegocio } from "@/services/erros";
import { calcularAlergenos, calcularCargaGlicemica, calcularComposicao } from "@/services/preparacoes";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// Página só de leitura para conferir os cálculos do I2.
export default async function Preparacao({ params }: PageProps<"/preparacoes/[id]">) {
  await exigirSessaoNaPagina();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let dados;
  try {
    dados = await Promise.all([calcularComposicao(id), calcularAlergenos(id), calcularCargaGlicemica(id)]);
  } catch (e) {
    if (e instanceof ErroNegocio && e.status === 404) notFound();
    throw e;
  }
  const [composicao, { alergenos }, cg] = dados;
  const p = composicao.porcao;

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">{composicao.preparacao.nome}</h1>
      <p>
        Porção: {num(composicao.preparacao.porcao_g)} g · Peso final da receita: {num(composicao.peso_final_g)} g
      </p>

      <section>
        <h2 className="text-lg font-semibold">Composição da porção</h2>
        <ul>
          <li>Energia: {num(p.energia_kcal)} kcal</li>
          <li>Carboidrato: {num(p.carboidrato_g)} g · Fibra: {num(p.fibra_g)} g</li>
          <li>Proteína: {num(p.proteina_g)} g · Lipídeos: {num(p.lipideos_g)} g</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Alergênicos e restrições</h2>
        {alergenos.length === 0 ? (
          <p>Nenhuma categoria marcada.</p>
        ) : (
          <ul>
            {alergenos.map((a) => (
              <li key={a.categoria}>
                {a.nome}: {a.presenca === "CONTEM" ? "contém" : "pode conter"} ({a.origens.join(", ")})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Carga glicêmica ({cg.rotulo})</h2>
        <ul>
          <li>Carboidrato disponível: {num(cg.carboidrato_disponivel_g)} g</li>
          <li>Rytz et al.: {cg.rytz ? `IG ${num(cg.rytz.ig)} · CG ${num(cg.rytz.cg)}` : "não calculável"}</li>
          <li>FAO/OMS: {cg.fao ? `IG ${num(cg.fao.ig)} · CG ${num(cg.fao.cg)}` : `não calculável (${cg.motivo_fao})`}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Fontes e hipóteses</h2>
        <ul className="list-disc pl-5 text-sm">
          {[...new Set(cg.hipoteses)].map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
