import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarCategorias } from "@/repositories/ingredientes";
import { FormularioIngrediente } from "../secoes";

// RF01: industrializado cadastrado pelo rótulo (a regra do glúten vale aqui).
export default async function NovoIngrediente() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const categorias = (await listarCategorias()).map((c) => ({ codigo: c.codigo, nome: c.nome }));

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Novo ingrediente industrializado</h1>
      <div className="cartao">
        <FormularioIngrediente categorias={categorias} />
      </div>
    </main>
  );
}
