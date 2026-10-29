import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { Indicador, PAINEL } from "@/components/indicador";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { buscarPreparacao } from "@/repositories/preparacoes";
import { ErroNegocio } from "@/services/erros";
import { calcularAlergenos, calcularCargaGlicemica, calcularComposicao } from "@/services/preparacoes";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// Ficha da preparação: cálculos (RF02–RF04) para todos; o operador edita e exclui.
export default async function Preparacao({ params }: PageProps<"/preparacoes/[id]">) {
  const sessao = await exigirSessaoNaPagina();
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
  const ativo = (await buscarPreparacao(id))?.ativo ?? true;

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1>{composicao.preparacao.nome}</h1>
          <p className="text-sm text-secondary tabular-nums">
            Porção: {num(composicao.preparacao.porcao_g)} g · Peso final da receita: {num(composicao.peso_final_g)} g
          </p>
        </div>
        {!ativo && <SeloDesabilitado />}
        {sessao.papel === "OPERADOR" && (
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/preparacoes/${id}/editar`} className="btn-primario py-1 text-sm hover:no-underline">
              Editar
            </Link>
            <AcoesRegistro url={`/api/preparacoes/${id}`} ativo={ativo} nome="esta preparação" voltarPara="/preparacoes" />
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="cartao flex flex-col gap-3">
          <h2>Carga glicêmica ({cg.rotulo})</h2>
          <dl className={`${PAINEL} grid-cols-3`}>
            <Indicador rotulo="Carb. disponível" valor={`${num(cg.carboidrato_disponivel_g)} g`} destaque />
            <Indicador rotulo={`CG (Rytz · ${cg.rotulo})`} valor={cg.rytz ? num(cg.rytz.cg) : "—"} />
            <Indicador rotulo={`CG (FAO · ${cg.rotulo})`} valor={cg.fao ? num(cg.fao.cg) : "—"} />
          </dl>
          <ul className="text-sm text-secondary tabular-nums">
            <li>Rytz et al.: {cg.rytz ? `IG ${num(cg.rytz.ig)} · CG ${num(cg.rytz.cg)}` : "não calculável"}</li>
            <li>FAO/OMS: {cg.fao ? `IG ${num(cg.fao.ig)} · CG ${num(cg.fao.cg)}` : `não calculável (${cg.motivo_fao})`}</li>
          </ul>
        </section>

        <section className="cartao flex flex-col gap-3">
          <h2>Composição da porção</h2>
          <dl className={`${PAINEL} grid-cols-2 sm:grid-cols-3`}>
            <Indicador rotulo="Energia" valor={`${num(p.energia_kcal)} kcal`} />
            <Indicador rotulo="Carboidrato" valor={`${num(p.carboidrato_g)} g`} />
            <Indicador rotulo="Fibra" valor={`${num(p.fibra_g)} g`} />
            <Indicador rotulo="Proteína" valor={`${num(p.proteina_g)} g`} />
            <Indicador rotulo="Lipídeos" valor={`${num(p.lipideos_g)} g`} />
          </dl>
        </section>
      </div>

      <section className="cartao flex flex-col gap-2">
        <h2>Rastreabilidade de alergênicos</h2>
        {alergenos.length === 0 ? (
          <p className="text-secondary">Nenhuma categoria marcada.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {alergenos.map((a) => (
              <li
                key={a.categoria}
                className={`rounded-md border px-2 py-1 ${
                  a.presenca === "CONTEM"
                    ? "border-bloqueado bg-bloqueado-fundo text-bloqueado-texto"
                    : "border-atencao bg-atencao-fundo text-atencao-texto"
                }`}
              >
                <strong className="uppercase">{a.presenca === "CONTEM" ? "Contém" : "Pode conter"}:</strong> {a.nome}{" "}
                <em>({a.origens.join(", ")})</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="fontes" className="cartao flex flex-col gap-2">
        <h2>Fontes e hipóteses</h2>
        <ul className="list-disc pl-5 text-sm text-secondary">
          {[...new Set(cg.hipoteses)].map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
