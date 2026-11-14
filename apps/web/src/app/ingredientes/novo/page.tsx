import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarCategorias } from "@/repositories/ingredientes";
import { FormularioIngrediente } from "../secoes";

// RF01: alimento pelo rótulo ou de outra tabela (a regra do glúten vale aqui); operador e coordenação (04/11).
export default async function NovoIngrediente() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR" && sessao.papel !== "COORDENACAO") return <main className="p-4">Acesso negado.</main>;
  const categorias = (await listarCategorias()).map((c) => ({ codigo: c.codigo, nome: c.nome }));

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Novo alimento</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados nutricionais e restrições</CardTitle>
          <CardDescription>Cadastre um alimento a partir do rótulo da embalagem ou de outra tabela de composição.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioIngrediente categorias={categorias} />
        </CardContent>
      </Card>
    </main>
  );
}
