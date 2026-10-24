import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { registrosLiberados } from "@/services/registros";

// RF20: os registros liberados por um pedido autorizado, só para o responsável que pediu.
export async function GET(req: Request, ctx: RouteContext<"/api/registros-sintomas/solicitacoes/[id]/registros">) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Acesso negado" }, { status: 403 });
  try {
    return Response.json(await registrosLiberados(sessao, id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
