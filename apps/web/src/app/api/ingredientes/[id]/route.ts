import { exigirPerfil } from "@/lib/acesso";
import { edicaoIngrediente, lerCorpo, lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { detalharIngrediente, editarIngrediente, excluirIngrediente } from "@/services/ingredientes";

const naoEncontrado = () => Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });

// M4: edição parcial. Só o operador.
export async function PUT(req: Request, ctx: RouteContext<"/api/ingredientes/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, edicaoIngrediente);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await editarIngrediente(id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function GET(req: Request, ctx: RouteContext<"/api/ingredientes/[id]">) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  const ingrediente = id && (await detalharIngrediente(id));
  if (!ingrediente) return naoEncontrado();
  return Response.json(ingrediente);
}

// B2: apaga se nunca foi usado; senão desabilita. Só o operador.
export async function DELETE(req: Request, ctx: RouteContext<"/api/ingredientes/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await excluirIngrediente(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
