import { exigirPerfil } from "@/lib/acesso";
import { buscaAlunos, lerConsulta } from "@/lib/validacao";
import { buscarAlunos } from "@/repositories/alunos";

// Identificação do aluno no balcão: só o operador; devolve nome e série, sem dados de saúde.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaAlunos);
  if (filtro instanceof Response) return filtro;
  return Response.json(await buscarAlunos(filtro.busca));
}
