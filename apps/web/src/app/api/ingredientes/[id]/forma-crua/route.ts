import { exigirPerfil } from "@/lib/acesso";
import { formaCrua, lerCorpo, lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { definirFormaCrua, removerFormaCrua } from "@/services/ingredientes";

const naoEncontrado = () => Response.json({ erro: "Ingrediente não encontrado" }, { status: 404 });

// M3: liga esta forma preparada da TACO à forma crua. Só o operador.
export async function PUT(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/forma-crua">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, formaCrua);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await definirFormaCrua(id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/ingredientes/[id]/forma-crua">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await removerFormaCrua(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
