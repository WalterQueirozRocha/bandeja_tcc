import { exigirPerfil } from "@/lib/acesso";
import { respostaDeErro } from "@/services/erros";
import { desvincularResponsavel } from "@/services/usuarios";

export async function DELETE(req: Request, ctx: RouteContext<"/api/alunos/[id]/responsaveis/[responsavel_id]">) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const { id, responsavel_id } = await ctx.params;
  const [aluno, responsavel] = [Number(id), Number(responsavel_id)];
  if (!Number.isInteger(aluno) || !Number.isInteger(responsavel)) return Response.json({ erro: "Vínculo não encontrado" }, { status: 404 });
  try {
    await desvincularResponsavel(aluno, responsavel);
    return new Response(null, { status: 204 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
