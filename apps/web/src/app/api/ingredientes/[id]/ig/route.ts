import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, lerId, valorIg } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { gravarIg, removerIg } from "@/services/ingredientes";

const naoEncontrado = () => Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });

// M2: cria ou substitui o IG pareado do ingrediente. Só o operador.
export async function PUT(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/ig">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, valorIg);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await gravarIg(id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/ig">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    await removerIg(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
