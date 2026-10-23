import { exigirPerfil } from "@/lib/acesso";
import { edicaoUsuario, lerCorpo, lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { editarUsuario, excluirUsuario, lerUsuario } from "@/services/usuarios";

const naoEncontrado = () => Response.json({ erro: "Usuário não encontrado" }, { status: 404 });

// Dados do usuário e vínculos (responsáveis do aluno ou alunos do responsável).
export async function GET(req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await lerUsuario(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// Edita nome, e-mail e série; `senha` opcional redefine a senha.
export async function PUT(req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, edicaoUsuario);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await editarUsuario(id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// B2: apaga quem nunca teve registro; senão desabilita.
export async function DELETE(req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await excluirUsuario(id, sessao.id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
