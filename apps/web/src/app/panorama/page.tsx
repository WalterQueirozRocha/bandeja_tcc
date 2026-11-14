import { BarChart3 } from "lucide-react";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Indicador, PAINEL } from "@/components/indicador";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { ErroNegocio } from "@/services/erros";
import { montarPanorama } from "@/services/panorama";

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));
const dataValida = (v: unknown, padrao: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : padrao);

// Panorama nutricional (RF15).
export default async function Panorama({ searchParams }: PageProps<"/panorama">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "COORDENACAO" && sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const hoje = hojeNaBahia();
  const de = dataValida(params.de, `${hoje.slice(0, 8)}01`);
  const ate = dataValida(params.ate, hoje);

  let p;
  try {
    p = await montarPanorama({ de, ate });
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    return <main className="p-4">{e.message}</main>;
  }
  const m = p.medias_por_porcao;

  return (
    <main className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-brand-royal">
          <BarChart3 className="size-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">Indicadores Consolidados</span>
        </div>
        <h1>Panorama nutricional</h1>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FiltroAutomatico className="flex flex-wrap items-center gap-2">
            <DatePicker name="de" defaultValue={de} aria-label="De" required className="w-40" />
            <span className="text-sm text-secondary">até</span>
            <DatePicker name="ate" defaultValue={ate} aria-label="Até" required className="w-40" />
          </FiltroAutomatico>
          <p className="text-sm font-medium text-secondary tabular-nums">
            {p.base.cardapios} cardápios · {p.base.itens_ofertados} itens ofertados
          </p>
        </div>
      </Card>

      <Card asChild>
        <section>
          <CardHeader>
            <CardTitle>Médias por porção</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className={`${PAINEL} grid-cols-2 sm:grid-cols-3`}>
              <Indicador rotulo="Carb. disponível" valor={`${num(m.carboidrato_disponivel_g)} g`} destaque />
              <Indicador rotulo={`CG (Rytz · ${m.rotulo_glicemico})`} valor={num(m.cg_rytz)} destaque />
              <Indicador rotulo="Energia" valor={`${num(m.energia_kcal)} kcal`} />
              <Indicador rotulo="Proteína" valor={`${num(m.proteina_g)} g`} />
              <Indicador rotulo="Lipídeos" valor={`${num(m.lipideos_g)} g`} />
              <Indicador rotulo="Fibra" valor={`${num(m.fibra_g)} g`} />
            </dl>
          </CardContent>
        </section>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Itens por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {p.categorias.length === 0 && <p className="text-secondary">Nenhuma categoria marcada nos itens do período.</p>}
              {p.categorias.length > 0 && (
                <ul className="flex flex-col divide-y divide-borda text-sm tabular-nums">
                  {p.categorias.map((c) => (
                    <li key={c.categoria} className="py-2 font-medium text-brand-navy">
                      {c.nome}: {c.contem} contém · {c.pode_conter} pode conter
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </section>
        </Card>

        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Vendas no período</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className={`${PAINEL} grid-cols-3`}>
                <Indicador rotulo="Concluídas" valor={p.vendas.CONCLUIDA} />
                <Indicador rotulo="Bloqueadas" valor={p.vendas.BLOQUEADA} />
                <Indicador rotulo="Encerradas" valor={p.vendas.CANCELADA_PELO_OPERADOR} />
              </dl>
            </CardContent>
          </section>
        </Card>
      </div>
    </main>
  );
}
