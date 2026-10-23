import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, lerId, vinculo } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { vincularResponsavel } from "@/services/usuarios";

// B1-M: a coordenação vincula um responsável ao aluno.
export async function POST(req: Request, ctx: RouteContext<"/api/alunos/[id]/responsaveis">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, vinculo);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Aluno não encontrado" }, { status: 404 });
  try {
    return Response.json(await vincularResponsavel(id, dados.responsavel_id), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
