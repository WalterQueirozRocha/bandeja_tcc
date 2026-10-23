import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, lerId, registroSintoma } from "@/lib/validacao";
import { registrosDoAluno } from "@/repositories/sintomas";
import { exigirAcessoAoAluno } from "@/services/alunos";
import { respostaDeErro } from "@/services/erros";
import { registrarSintoma } from "@/services/sintomas";

// Quadro 9 / doc §4.8: só o próprio aluno cria e vê; ninguém mais vê na plataforma.
async function alunoProprio(req: Request, ctx: RouteContext<"/api/alunos/[id]/sintomas">) {
  const sessao = await exigirPerfil(req, ["ALUNO"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Acesso negado" }, { status: 403 });
  try {
    await exigirAcessoAoAluno(sessao, id, ["ALUNO"]);
    return id;
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function GET(req: Request, ctx: RouteContext<"/api/alunos/[id]/sintomas">) {
  const id = await alunoProprio(req, ctx);
  if (id instanceof Response) return id;
  return Response.json(await registrosDoAluno(id));
}

export async function POST(req: Request, ctx: RouteContext<"/api/alunos/[id]/sintomas">) {
  const id = await alunoProprio(req, ctx);
  if (id instanceof Response) return id;
  const dados = await lerCorpo(req, registroSintoma);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await registrarSintoma(id, dados), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
