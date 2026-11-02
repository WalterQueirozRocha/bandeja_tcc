import { exigirPerfil } from "@/lib/acesso";
import { consultaItensSintoma, lerConsulta, lerId } from "@/lib/validacao";
import { exigirAcessoAoAluno } from "@/services/alunos";
import { respostaDeErro } from "@/services/erros";
import { itensParaSintoma } from "@/services/sintomas";

// D3: itens que o próprio aluno comprou nas 24 h antes de `ate` (data e hora do sintoma).
export async function GET(req: Request, ctx: RouteContext<"/api/alunos/[id]/sintomas/itens">) {
  const sessao = await exigirPerfil(req, ["ALUNO"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Acesso negado" }, { status: 403 });
  const consulta = lerConsulta(req, consultaItensSintoma);
  if (consulta instanceof Response) return consulta;
  try {
    await exigirAcessoAoAluno(sessao, id, ["ALUNO"]);
    return Response.json(await itensParaSintoma(id, new Date(consulta.ate)));
  } catch (e) {
    return respostaDeErro(e);
  }
}
