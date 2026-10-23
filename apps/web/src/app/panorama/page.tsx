import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { ErroNegocio } from "@/services/erros";
import { montarPanorama } from "@/services/panorama";

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));
const dataValida = (v: unknown, padrao: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : padrao);

// Página mínima do panorama nutricional (RF15).
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
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">Panorama nutricional</h1>
      <form className="flex flex-wrap gap-2">
        <input type="date" name="de" defaultValue={de} className="rounded border p-2" />
        <input type="date" name="ate" defaultValue={ate} className="rounded border p-2" />
        <button type="submit" className="rounded border px-4">
          Ver
        </button>
      </form>
      <p>
        {p.base.cardapios} cardápios · {p.base.itens_ofertados} itens ofertados
      </p>
      <section>
        <h2 className="text-lg font-semibold">Médias por porção</h2>
        <ul>
          <li>Carboidrato disponível: {num(m.carboidrato_disponivel_g)} g</li>
          <li>CG (Rytz): {num(m.cg_rytz)} ({m.rotulo_glicemico})</li>
          <li>Energia: {num(m.energia_kcal)} kcal · Proteína: {num(m.proteina_g)} g · Lipídeos: {num(m.lipideos_g)} g · Fibra: {num(m.fibra_g)} g</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Itens por categoria</h2>
        {p.categorias.length === 0 && <p>Nenhuma categoria marcada nos itens do período.</p>}
        <ul>
          {p.categorias.map((c) => (
            <li key={c.categoria}>
              {c.nome}: {c.contem} contém · {c.pode_conter} pode conter
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Vendas no período</h2>
        <p>
          Concluídas: {p.vendas.CONCLUIDA} · Bloqueadas: {p.vendas.BLOQUEADA} · Encerradas pelo operador: {p.vendas.CANCELADA_PELO_OPERADOR}
        </p>
      </section>
    </main>
  );
}
