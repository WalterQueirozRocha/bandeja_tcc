import Link from "next/link";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarPreparacoes } from "@/repositories/preparacoes";

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

// RF02: lista das preparações; o operador cria, edita e exclui.
export default async function Preparacoes({ searchParams }: PageProps<"/preparacoes">) {
  const sessao = await exigirSessaoNaPagina();
  const operador = sessao.papel === "OPERADOR";
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const inativos = operador && params.inativos === "true";
  const lista = await listarPreparacoes(busca || undefined, inativos);

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1>Preparações</h1>
        {operador && (
          <Link href="/preparacoes/nova" className="btn-primario hover:no-underline">
            Nova preparação
          </Link>
        )}
      </div>
      <form className="flex flex-wrap items-center gap-2">
        <input name="busca" defaultValue={busca} placeholder="Buscar por nome" aria-label="Buscar por nome" className="campo min-w-0 flex-1" />
        {operador && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="inativos" value="true" defaultChecked={inativos} />
            Mostrar desabilitadas
          </label>
        )}
        <button type="submit" className="btn-secundario">
          Buscar
        </button>
      </form>

      {lista.length === 0 && <p className="text-secondary">Nenhuma preparação encontrada.</p>}
      <ul className="grid gap-2 md:grid-cols-2">
        {lista.map((p) => (
          <li key={p.id} className="cartao flex flex-wrap items-center gap-3 py-3">
            <span className="flex-1">
              <Link href={`/preparacoes/${p.id}`} className="font-semibold">
                {p.nome}
              </Link>
              <span className="block text-sm text-secondary tabular-nums">
                Porção {num(p.porcao_g)} g · peso final {num(p.peso_final_calculado)} g
              </span>
            </span>
            {!p.ativo && <SeloDesabilitado />}
            {operador && (
              <>
                <Link href={`/preparacoes/${p.id}/editar`} className="btn-secundario py-1 text-sm hover:no-underline">
                  Editar
                </Link>
                <AcoesRegistro url={`/api/preparacoes/${p.id}`} ativo={p.ativo} nome={p.nome} />
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
