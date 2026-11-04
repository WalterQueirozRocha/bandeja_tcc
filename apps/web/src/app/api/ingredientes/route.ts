import { exigirPerfil } from "@/lib/acesso";
import { buscaIngredientes, lerConsulta, novoIngrediente, lerCorpo } from "@/lib/validacao";
import { listarIngredientes } from "@/repositories/ingredientes";
import { respostaDeErro } from "@/services/erros";
import { cadastrarIngrediente } from "@/services/ingredientes";

// Quadro 9: os quatro perfis consultam.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaIngredientes);
  if (filtro instanceof Response) return filtro;
  return Response.json(await listarIngredientes({ ...filtro, inativos: sessao.papel === "OPERADOR" && filtro.inativos }));
}

// Cadastro pelo rótulo ou de outra tabela: operador e coordenação (04/11), com registro.
export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR", "COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, novoIngrediente);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await cadastrarIngrediente(dados, sessao.id), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
