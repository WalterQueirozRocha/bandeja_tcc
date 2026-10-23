import { exigirPerfil } from "@/lib/acesso";
import { buscaCardapios, cardapio, lerConsulta, lerCorpo } from "@/lib/validacao";
import { listarCardapios, paraIso } from "@/repositories/cardapios";
import { publicarCardapio } from "@/services/cardapios";
import { respostaDeErro } from "@/services/erros";

export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, buscaCardapios);
  if (filtro instanceof Response) return filtro;
  const lista = await listarCardapios({ ...filtro, inativos: sessao.papel === "OPERADOR" && filtro.inativos });
  return Response.json(lista.map((c) => ({ id: c.id, data: paraIso(c.data), periodo: c.periodo, ativo: c.ativo, itens: c._count.itens })));
}

// RF05: publicar (criar = publicar). Só o operador.
export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, cardapio);
  if (dados instanceof Response) return dados;
  try {
    return Response.json(await publicarCardapio(dados), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
