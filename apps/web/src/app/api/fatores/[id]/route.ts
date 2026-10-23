import { exigirPerfil } from "@/lib/acesso";
import { fator, lerCorpo, lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { editarFator, removerFator } from "@/services/fatores";

const naoEncontrado = () => Response.json({ erro: "Fator não encontrado" }, { status: 404 });

export async function PUT(req: Request, ctx: RouteContext<"/api/fatores/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, fator);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await editarFator(id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// Recusa se alguma preparação depende do fator (o cálculo dela deixaria de funcionar).
export async function DELETE(req: Request, ctx: RouteContext<"/api/fatores/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    await removerFator(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
