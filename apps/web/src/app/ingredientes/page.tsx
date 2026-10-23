import Link from "next/link";
import { SeloDesabilitado } from "@/components/acao";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { GRUPO_ALIMENTAR, ORIGEM_INGREDIENTE } from "@/lib/rotulos";
import { listarIngredientes } from "@/repositories/ingredientes";

const TAMANHO = 50;

export default async function Ingredientes({ searchParams }: PageProps<"/ingredientes">) {
  const sessao = await exigirSessaoNaPagina();
  const operador = sessao.papel === "OPERADOR";

  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const inativos = operador && params.inativos === "true";
  const { total, itens } = await listarIngredientes({ busca: busca || undefined, inativos, pagina, tamanho: TAMANHO });
  const link = (p: number) => `/ingredientes?${new URLSearchParams({ busca, pagina: String(p), ...(inativos && { inativos: "true" }) })}`;

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1>Ingredientes</h1>
        {operador && (
          <Link href="/ingredientes/novo" className="btn-primario hover:no-underline">
            Novo industrializado
          </Link>
        )}
      </div>
      <form className="flex flex-wrap items-center gap-2">
        <input name="busca" defaultValue={busca} placeholder="Buscar por nome" className="campo min-w-0 flex-1" />
        {operador && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="inativos" value="true" defaultChecked={inativos} />
            Mostrar desabilitados
          </label>
        )}
        <button type="submit" className="btn-primario">
          Buscar
        </button>
      </form>
      <p className="text-sm text-secondary tabular-nums">{total} encontrados</p>
      <div className="cartao overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-bg text-secondary">
            <tr className="border-b border-borda">
              <th className="p-3 font-semibold">Nome</th>
              <th className="p-3 font-semibold">Grupo</th>
              <th className="p-3 font-semibold">Origem</th>
              <th className="p-3 font-semibold">Marcadores</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className="border-b border-borda last:border-0">
                <td className="p-3 font-medium">
                  <Link href={`/ingredientes/${i.id}`}>{i.nome}</Link> {!i.ativo && <SeloDesabilitado />}
                </td>
                <td className="p-3 text-secondary">{GRUPO_ALIMENTAR[i.grupo_alimentar]}</td>
                <td className="p-3 text-secondary">{ORIGEM_INGREDIENTE[i.origem]}</td>
                <td className="p-3">
                  <span className="flex flex-wrap gap-1">
                    {i.marcadores.map((m) => (
                      <span
                        key={m.categoria_codigo}
                        className={`rounded-md border px-1.5 py-0.5 text-xs font-semibold ${
                          m.presenca === "PODE_CONTER"
                            ? "border-atencao bg-atencao-fundo text-atencao-texto"
                            : "border-bloqueado bg-bloqueado-fundo text-bloqueado-texto"
                        }`}
                      >
                        {m.categoria_codigo}
                        {m.presenca === "PODE_CONTER" && " (pode conter)"}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Páginas" className="flex gap-2">
        {pagina > 1 && (
          <a href={link(pagina - 1)} className="btn-secundario hover:no-underline">
            ← Anterior
          </a>
        )}
        {pagina * TAMANHO < total && (
          <a href={link(pagina + 1)} className="btn-secundario hover:no-underline">
            Próxima →
          </a>
        )}
      </nav>
    </main>
  );
}
