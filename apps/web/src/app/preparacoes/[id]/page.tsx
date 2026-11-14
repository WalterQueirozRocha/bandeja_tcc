import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { Indicador, PAINEL } from "@/components/indicador";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            <Button asChild size="sm">
              <Link href={`/preparacoes/${id}/editar`}>
                <Pencil aria-hidden="true" className="size-3.5" />
                Editar
              </Link>
            </Button>
            <AcoesRegistro url={`/api/preparacoes/${id}`} ativo={ativo} nome="esta preparação" voltarPara="/preparacoes" />
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Carga glicêmica ({cg.rotulo})</CardTitle>
            <CardDescription>Estimativa da porção pelos modelos de Rytz et al. (2019) e FAO/OMS (1998).</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className={`${PAINEL} grid-cols-3`}>
              <Indicador rotulo="Carb. disponível" valor={`${num(cg.carboidrato_disponivel_g)} g`} destaque />
              <Indicador rotulo={`CG (Rytz · ${cg.rotulo})`} valor={cg.rytz ? num(cg.rytz.cg) : "—"} />
              <Indicador rotulo={`CG (FAO · ${cg.rotulo})`} valor={cg.fao ? num(cg.fao.cg) : "—"} />
            </dl>
            <ul className="flex flex-col gap-1 text-sm text-secondary tabular-nums">
              <li>Rytz et al.: {cg.rytz ? `IG ${num(cg.rytz.ig)} · CG ${num(cg.rytz.cg)}` : "não calculável"}</li>
              <li>FAO/OMS: {cg.fao ? `IG ${num(cg.fao.ig)} · CG ${num(cg.fao.cg)}` : `não calculável (${cg.motivo_fao})`}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição da porção</CardTitle>
            <CardDescription>Macronutrientes calculados para a porção servida ({num(composicao.preparacao.porcao_g)} g).</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className={`${PAINEL} grid-cols-2 sm:grid-cols-3`}>
              <Indicador rotulo="Energia" valor={`${num(p.energia_kcal)} kcal`} />
              <Indicador rotulo="Carboidrato" valor={`${num(p.carboidrato_g)} g`} />
              <Indicador rotulo="Fibra" valor={`${num(p.fibra_g)} g`} />
              <Indicador rotulo="Proteína" valor={`${num(p.proteina_g)} g`} />
              <Indicador rotulo="Lipídeos" valor={`${num(p.lipideos_g)} g`} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rastreabilidade de alergênicos</CardTitle>
          <CardDescription>União dos marcadores dos ingredientes e do contato na cozinha.</CardDescription>
        </CardHeader>
        <CardContent>
          {alergenos.length === 0 ? (
            <p className="text-secondary">Nenhuma categoria marcada.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {alergenos.map((a) => (
                <li
                  key={a.categoria}
                  className={`rounded-lg border px-3 py-2 ${
                    a.presenca === "CONTEM"
                      ? "border-bloqueado/50 bg-bloqueado-fundo text-bloqueado-texto"
                      : "border-atencao/50 bg-atencao-fundo text-atencao-texto"
                  }`}
                >
                  <strong className="uppercase">{a.presenca === "CONTEM" ? "Contém" : "Pode conter"}:</strong> {a.nome}{" "}
                  <em>({a.origens.join(", ")})</em>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card id="fontes">
        <CardHeader>
          <CardTitle>Fontes e hipóteses</CardTitle>
          <CardDescription>Premissas e referências aplicadas na composição e na estimativa glicêmica desta ficha.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-secondary">
            {[...new Set(cg.hipoteses)].map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
