import { exigirPerfil } from "@/lib/acesso";
import { buscaBloqueios, lerConsulta, lerCorpo, novoBloqueio } from "@/lib/validacao";
import { solicitarBloqueio, verBloqueios } from "@/services/bloqueios";
import { respostaDeErro } from "@/services/erros";

// Quadro 9: operador executa, responsável solicita; aluno e coordenação não acessam.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR", "RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaBloqueios);
  if (filtro instanceof Response) return filtro;
  return Response.json(await verBloqueios(sessao, filtro.situacao));
}

export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, novoBloqueio);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await solicitarBloqueio(sessao, dados.aluno_id, dados.preparacao_id), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
