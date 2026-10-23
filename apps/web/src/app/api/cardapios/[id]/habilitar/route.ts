import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { habilitarCardapio } from "@/services/cardapios";
import { respostaDeErro } from "@/services/erros";

export async function POST(req: Request, ctx: RouteContext<"/api/cardapios/[id]/habilitar">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Cardápio não encontrado" }, { status: 404 });
  try {
    return Response.json(await habilitarCardapio(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
