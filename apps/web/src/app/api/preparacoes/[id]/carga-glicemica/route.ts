import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { calcularCargaGlicemica } from "@/services/preparacoes";

export async function GET(req: Request, ctx: RouteContext<"/api/preparacoes/[id]/carga-glicemica">) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Preparação não encontrada" }, { status: 404 });
  try {
    return Response.json(await calcularCargaGlicemica(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
