import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarIngredientes } from "@/repositories/ingredientes";

const TAMANHO = 50;

export default async function Ingredientes({ searchParams }: PageProps<"/ingredientes">) {
  await exigirSessaoNaPagina();

  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const { total, itens } = await listarIngredientes({ busca: busca || undefined, pagina, tamanho: TAMANHO });
  const link = (p: number) => `/ingredientes?${new URLSearchParams({ busca, pagina: String(p) })}`;

  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">Ingredientes</h1>
      <form className="flex gap-2">
        <input name="busca" defaultValue={busca} placeholder="Buscar por nome" className="flex-1 rounded border p-2" />
        <button type="submit" className="rounded bg-zinc-900 px-4 text-white">
          Buscar
        </button>
      </form>
      <p>{total} encontrados</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Nome</th>
              <th className="p-2">Grupo</th>
              <th className="p-2">Origem</th>
              <th className="p-2">Marcadores</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className="border-b">
                <td className="p-2">{i.nome}</td>
                <td className="p-2">{i.grupo_alimentar}</td>
                <td className="p-2">{i.origem}</td>
                <td className="p-2">
                  {i.marcadores.map((m) => `${m.categoria_codigo}${m.presenca === "PODE_CONTER" ? " (pode conter)" : ""}`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="flex gap-4">
        {pagina > 1 && <a href={link(pagina - 1)}>← Anterior</a>}
        {pagina * TAMANHO < total && <a href={link(pagina + 1)}>Próxima →</a>}
      </nav>
    </main>
  );
}
