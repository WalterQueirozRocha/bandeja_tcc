import { exigirPerfil } from "@/lib/acesso";
import { decisaoPedidoRegistros, lerCorpo, lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { decidirPedido } from "@/services/registros";

// RF20: a coordenação autoriza ou recusa um pedido SOLICITADO.
export async function PUT(req: Request, ctx: RouteContext<"/api/registros-sintomas/solicitacoes/[id]">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, decisaoPedidoRegistros);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Pedido não encontrado" }, { status: 404 });
  try {
    return Response.json(await decidirPedido(sessao, id, dados.situacao));
  } catch (e) {
    return respostaDeErro(e);
  }
}
