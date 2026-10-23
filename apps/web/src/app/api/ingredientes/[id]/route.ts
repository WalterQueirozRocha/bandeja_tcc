import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { detalharIngrediente } from "@/services/ingredientes";

export async function GET(req: Request, ctx: RouteContext<"/api/ingredientes/[id]">) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  const ingrediente = id && (await detalharIngrediente(id));
  if (!ingrediente) return Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });
  return Response.json(ingrediente);
}
