import { exigirPerfil } from "@/lib/acesso";
import { cardapio, consultaAluno, lerConsulta, lerCorpo, lerId } from "@/lib/validacao";
import { alunoDaConsulta } from "@/services/alunos";
import { editarCardapio, excluirCardapio, montarCardapio } from "@/services/cardapios";
import { respostaDeErro } from "@/services/erros";

const naoEncontrado = () => Response.json({ erro: "Cardápio não encontrado" }, { status: 404 });

// B2: apaga se nada foi vendido; senão desabilita (libera a data e o turno). Só o operador.
export async function DELETE(req: Request, ctx: RouteContext<"/api/cardapios/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await excluirCardapio(id));
  } catch (e) {
    return respostaDeErro(e);
  }
}

// RF07: aluno e responsável recebem a compatibilidade; operador e coordenação, o cardápio geral.
export async function GET(req: Request, ctx: RouteContext<"/api/cardapios/[id]">) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const consulta = lerConsulta(req, consultaAluno);
  if (consulta instanceof Response) return consulta;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await montarCardapio(id, await alunoDaConsulta(sessao, consulta.aluno_id)));
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function PUT(req: Request, ctx: RouteContext<"/api/cardapios/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, cardapio);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrado();
  try {
    return Response.json(await editarCardapio(id, dados));
  } catch (e) {
    return respostaDeErro(e);
  }
}
