import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { habilitarUsuario } from "@/services/usuarios";

export async function POST(req: Request, ctx: RouteContext<"/api/usuarios/[id]/habilitar">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Usuário não encontrado" }, { status: 404 });
  try {
    return Response.json(await habilitarUsuario(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
