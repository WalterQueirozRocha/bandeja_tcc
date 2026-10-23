import { Indicador, PAINEL } from "@/components/indicador";
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
    <main className="flex flex-col gap-4 p-4">
      <h1>Panorama nutricional</h1>
      <form className="flex flex-wrap items-center gap-2">
        <input type="date" name="de" defaultValue={de} aria-label="De" className="campo" />
        <span className="text-secondary">até</span>
        <input type="date" name="ate" defaultValue={ate} aria-label="Até" className="campo" />
        <button type="submit" className="btn-primario">
          Ver
        </button>
      </form>
      <p className="text-sm text-secondary tabular-nums">
        {p.base.cardapios} cardápios · {p.base.itens_ofertados} itens ofertados
      </p>

      <section className="cartao flex flex-col gap-3">
        <h2>Médias por porção</h2>
        <dl className={`${PAINEL} grid-cols-2 sm:grid-cols-3`}>
          <Indicador rotulo="Carb. disponível" valor={`${num(m.carboidrato_disponivel_g)} g`} destaque />
          <Indicador rotulo={`CG (Rytz · ${m.rotulo_glicemico})`} valor={num(m.cg_rytz)} destaque />
          <Indicador rotulo="Energia" valor={`${num(m.energia_kcal)} kcal`} />
          <Indicador rotulo="Proteína" valor={`${num(m.proteina_g)} g`} />
          <Indicador rotulo="Lipídeos" valor={`${num(m.lipideos_g)} g`} />
          <Indicador rotulo="Fibra" valor={`${num(m.fibra_g)} g`} />
        </dl>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="cartao flex flex-col gap-2">
          <h2>Itens por categoria</h2>
          {p.categorias.length === 0 && <p className="text-secondary">Nenhuma categoria marcada nos itens do período.</p>}
          <ul className="flex flex-col divide-y divide-borda text-sm tabular-nums">
            {p.categorias.map((c) => (
              <li key={c.categoria} className="py-1.5">
                {c.nome}: {c.contem} contém · {c.pode_conter} pode conter
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao flex flex-col gap-3">
          <h2>Vendas no período</h2>
          <dl className={`${PAINEL} grid-cols-3`}>
            <Indicador rotulo="Concluídas" valor={p.vendas.CONCLUIDA} />
            <Indicador rotulo="Bloqueadas" valor={p.vendas.BLOQUEADA} />
            <Indicador rotulo="Encerradas" valor={p.vendas.CANCELADA_PELO_OPERADOR} />
          </dl>
        </section>
      </div>
    </main>
  );
}
