import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { habilitarPreparacao } from "@/services/preparacoes";

export async function POST(req: Request, ctx: RouteContext<"/api/preparacoes/[id]/habilitar">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Preparação não encontrada" }, { status: 404 });
  try {
    return Response.json(await habilitarPreparacao(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
