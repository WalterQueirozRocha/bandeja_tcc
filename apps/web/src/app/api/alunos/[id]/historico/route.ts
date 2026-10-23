import { exigirPerfil } from "@/lib/acesso";
import { lerConsulta, lerId, periodoHistorico } from "@/lib/validacao";
import { exigirAcessoAoAluno } from "@/services/alunos";
import { respostaDeErro } from "@/services/erros";
import { lerHistorico } from "@/services/vendas";

// Quadro 9: o aluno vê o próprio histórico; o responsável, o do aluno vinculado.
export async function GET(req: Request, ctx: RouteContext<"/api/alunos/[id]/historico">) {
  const sessao = await exigirPerfil(req, ["ALUNO", "RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, periodoHistorico);
  if (filtro instanceof Response) return filtro;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Acesso negado" }, { status: 403 });
  try {
    await exigirAcessoAoAluno(sessao, id, ["ALUNO", "RESPONSAVEL"]);
    return Response.json(await lerHistorico(id, filtro.de, filtro.ate));
  } catch (e) {
    return respostaDeErro(e);
  }
}
