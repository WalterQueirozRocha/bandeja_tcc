import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, substituicaoMarcadores } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { editarMarcadores } from "@/services/ingredientes";

// Substitui todos os marcadores do ingrediente. Só o operador.
export async function PUT(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/marcadores">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, substituicaoMarcadores);
  if (dados instanceof Response) return dados;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });
  try {
    return Response.json(await editarMarcadores(id, dados.marcadores));
  } catch (e) {
    return respostaDeErro(e);
  }
}
