import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { habilitarIngrediente } from "@/services/ingredientes";

export async function POST(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/habilitar">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });
  try {
    return Response.json(await habilitarIngrediente(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
