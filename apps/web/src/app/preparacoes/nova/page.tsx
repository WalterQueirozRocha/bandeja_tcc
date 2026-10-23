import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarCategorias } from "@/repositories/ingredientes";
import { FormularioPreparacao } from "../formulario";

export default async function NovaPreparacao() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const categorias = (await listarCategorias()).map((c) => ({ codigo: c.codigo, nome: c.nome }));

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Nova preparação</h1>
      <FormularioPreparacao categorias={categorias} />
    </main>
  );
}
