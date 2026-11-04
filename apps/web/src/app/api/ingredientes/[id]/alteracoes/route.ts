import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { alteracoesDoIngrediente, detalharIngrediente } from "@/services/ingredientes";

// Registro de criação e edição do alimento (04/11): operador e coordenação.
export async function GET(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/alteracoes">) {
  const sessao = await exigirPerfil(req, ["OPERADOR", "COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id || !(await detalharIngrediente(id))) return Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });
  return Response.json(await alteracoesDoIngrediente(id));
}
