import { notFound } from "next/navigation";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarCategorias } from "@/repositories/ingredientes";
import { buscarPreparacao, listarFatores } from "@/repositories/preparacoes";
import { modosDoIngrediente } from "@/services/preparacoes";
import { FormularioPreparacao } from "../../formulario";

export default async function EditarPreparacao({ params }: PageProps<"/preparacoes/[id]/editar">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const id = Number((await params).id);
  const prep = Number.isInteger(id) && id > 0 ? await buscarPreparacao(id) : null;
  if (!prep) notFound();
  const [fatores, categorias] = await Promise.all([listarFatores(), listarCategorias()]);

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Editar ficha técnica</h1>
      <FormularioPreparacao
        categorias={categorias.map((c) => ({ codigo: c.codigo, nome: c.nome }))}
        inicial={{
          id,
          nome: prep.nome,
          porcao_g: prep.porcao_g,
          itens: prep.itens.map((i) => {
            const modos = modosDoIngrediente(i.ingrediente, fatores);
            // O modo gravado continua na lista, mesmo que o fator tenha mudado depois.
            return {
              ingrediente_id: i.ingrediente_id,
              nome: i.ingrediente.nome,
              quantidade_crua_g: i.quantidade_crua_g,
              modo_preparo: i.modo_preparo,
              modos: modos.includes(i.modo_preparo) ? modos : [i.modo_preparo, ...modos],
            };
          }),
          contato_cozinha: prep.marcadores_cozinha,
        }}
      />
    </main>
  );
}
