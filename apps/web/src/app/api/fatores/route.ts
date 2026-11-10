import { exigirPerfil } from "@/lib/acesso";
import { fator, lerCorpo } from "@/lib/validacao";
import { listarFatoresCompletos } from "@/repositories/fatores";
import { respostaDeErro } from "@/services/erros";
import { cadastrarFator } from "@/services/fatores";

// M1: fatores de cocção (referência de cada fator no cadastro). Todos consultam; só o operador cria e edita.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  return Response.json(await listarFatoresCompletos());
}

export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, fator);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await cadastrarFator(dados), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
