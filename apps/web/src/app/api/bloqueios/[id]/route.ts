import { exigirPerfil } from "@/lib/acesso";
import { decisaoBloqueio, lerCorpo, lerId } from "@/lib/validacao";
import { cancelarBloqueio, decidirBloqueio } from "@/services/bloqueios";
import { respostaDeErro } from "@/services/erros";

const naoEncontrado = () => Response.json({ erro: "Bloqueio não encontrado" }, { status: 404 });

// O operador executa ou recusa um pedido SOLICITADO.
export async function PUT(req: Request, ctx: RouteContext<"/api/bloqueios/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, decisaoBloqueio);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await decidirBloqueio(id, dados.situacao));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// O responsável que pediu desfaz o pedido ou o bloqueio.
export async function DELETE(req: Request, ctx: RouteContext<"/api/bloqueios/[id]">) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    await cancelarBloqueio(sessao, id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
