import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { listarPreparacoes } from "@/repositories/preparacoes";
import { FormularioCardapio } from "../formulario";

// `?data=aaaa-mm-dd` já abre o formulário nessa data (por exemplo, vindo da lista filtrada).
export default async function NovoCardapio({ searchParams }: PageProps<"/cardapios/novo">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const { data } = await searchParams;
  const dataPadrao = typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hojeNaBahia();
  const preparacoes = await listarPreparacoes();

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Publicar cardápio</h1>
      {preparacoes.length === 0 ? (
        <p className="text-secondary">Cadastre uma preparação antes de publicar o cardápio.</p>
      ) : (
        <FormularioCardapio preparacoes={preparacoes.map((p) => ({ id: p.id, nome: p.nome }))} dataPadrao={dataPadrao} />
      )}
    </main>
  );
}
