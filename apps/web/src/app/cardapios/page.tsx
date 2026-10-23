import Link from "next/link";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { PERIODO, dataBr } from "@/lib/rotulos";
import { listarCardapios, paraIso } from "@/repositories/cardapios";

// RF05: gestão dos cardápios pelo operador (a consulta com compatibilidade fica em /cardapio).
export default async function Cardapios({ searchParams }: PageProps<"/cardapios">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const data = typeof params.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : undefined;
  const inativos = params.inativos === "true";
  const lista = await listarCardapios({ data, inativos });

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1>Cardápios</h1>
        <Link href="/cardapios/novo" className="btn-primario hover:no-underline">
          Publicar cardápio
        </Link>
      </div>
      <form className="flex flex-wrap items-center gap-2">
        <input type="date" name="data" defaultValue={data} aria-label="Data" className="campo" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inativos" value="true" defaultChecked={inativos} />
          Mostrar desabilitados
        </label>
        <button type="submit" className="btn-secundario">
          Filtrar
        </button>
      </form>

      {lista.length === 0 && <p className="text-secondary">Nenhum cardápio encontrado.</p>}
      <ul className="flex flex-col gap-2">
        {lista.map((c) => {
          const iso = paraIso(c.data);
          return (
            <li key={c.id} className="cartao flex flex-wrap items-center gap-3 py-3">
              <span className="flex-1">
                <span className="font-semibold tabular-nums">{dataBr(iso)}</span> · {PERIODO[c.periodo]}
                <span className="block text-sm text-secondary">{c._count.itens} itens</span>
              </span>
              {!c.ativo && <SeloDesabilitado />}
              <Link href={`/cardapios/${c.id}`} className="btn-secundario py-1 text-sm hover:no-underline">
                Editar
              </Link>
              {c.ativo && (
                <Link href={`/cardapio?data=${iso}&periodo=${c.periodo}`} className="text-sm">
                  Ver como o aluno vê
                </Link>
              )}
              <AcoesRegistro url={`/api/cardapios/${c.id}`} ativo={c.ativo} nome={`o cardápio de ${dataBr(iso)}`} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
