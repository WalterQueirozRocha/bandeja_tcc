import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, lerId, perfilSaude } from "@/lib/validacao";
import { exigirAcessoAoAluno, gravarPerfil, lerPerfil, revogarPerfil } from "@/services/alunos";
import { respostaDeErro } from "@/services/erros";

const negado = () => Response.json({ erro: "Acesso negado" }, { status: 403 });

// Quadro 9 / CT21: só o próprio aluno e o responsável vinculado; operador vê apenas o alerta no atendimento.
export async function GET(req: Request, ctx: RouteContext<"/api/alunos/[id]/perfil">) {
  const sessao = await exigirPerfil(req, ["ALUNO", "RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return negado();
  try {
    await exigirAcessoAoAluno(sessao, id, ["ALUNO", "RESPONSAVEL"]);
    return Response.json(await lerPerfil(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// RF06: criado e editado só pelo responsável, com consentimento.
export async function PUT(req: Request, ctx: RouteContext<"/api/alunos/[id]/perfil">) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, perfilSaude);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return negado();
  try {
    await exigirAcessoAoAluno(sessao, id, ["RESPONSAVEL"]);
    return Response.json(await gravarPerfil(id, sessao.id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// LGPD: revogar o consentimento apaga o perfil de saúde.
export async function DELETE(req: Request, ctx: RouteContext<"/api/alunos/[id]/perfil">) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return negado();
  try {
    await exigirAcessoAoAluno(sessao, id, ["RESPONSAVEL"]);
    await revogarPerfil(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
