import { exigirPerfil } from "@/lib/acesso";
import { buscaPedidosRegistros, lerConsulta, lerCorpo, novoPedidoRegistros } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { pedirRegistros, verPedidos } from "@/services/registros";

// RF20: responsável pede e acompanha os seus; coordenação lista todos, sem o conteúdo dos registros.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL", "COORDENACAO"]);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaPedidosRegistros);
  if (filtro instanceof Response) return filtro;
  return Response.json(await verPedidos(sessao, filtro.situacao));
}

export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, novoPedidoRegistros);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await pedirRegistros(sessao, dados.aluno_id), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
