import { exigirPerfil } from "@/lib/acesso";
import { buscaUsuarios, lerConsulta, lerCorpo, novoUsuario } from "@/lib/validacao";
import { listarUsuarios } from "@/repositories/usuarios";
import { respostaDeErro } from "@/services/erros";
import { cadastrarUsuario } from "@/services/usuarios";

// B1-M: só a coordenação gerencia usuários.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaUsuarios);
  if (filtro instanceof Response) return filtro;
  return Response.json(await listarUsuarios(filtro));
}

export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, novoUsuario);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await cadastrarUsuario(dados), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
