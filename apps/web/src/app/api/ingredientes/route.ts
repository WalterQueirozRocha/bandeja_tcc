import { exigirPerfil } from "@/lib/acesso";
import { buscaIngredientes, ingredienteRotulo, lerConsulta, lerCorpo } from "@/lib/validacao";
import { listarIngredientes } from "@/repositories/ingredientes";
import { respostaDeErro } from "@/services/erros";
import { cadastrarPorRotulo } from "@/services/ingredientes";

// Quadro 9: os quatro perfis consultam.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaIngredientes);
  if (filtro instanceof Response) return filtro;
  return Response.json(await listarIngredientes({ ...filtro, inativos: sessao.papel === "OPERADOR" && filtro.inativos }));
}

// Cadastro de industrializado pelo rótulo: só o operador.
export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, ingredienteRotulo);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await cadastrarPorRotulo(dados), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
