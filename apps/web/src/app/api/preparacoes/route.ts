import { exigirPerfil } from "@/lib/acesso";
import { buscaPreparacoes, lerConsulta, lerCorpo, preparacao } from "@/lib/validacao";
import { listarPreparacoes } from "@/repositories/preparacoes";
import { respostaDeErro } from "@/services/erros";
import { salvarPreparacao } from "@/services/preparacoes";

export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaPreparacoes);
  if (filtro instanceof Response) return filtro;
  return Response.json(await listarPreparacoes(filtro.busca));
}

// Ficha técnica (RF02, RF03): só o operador.
export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, preparacao);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await salvarPreparacao(dados), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
