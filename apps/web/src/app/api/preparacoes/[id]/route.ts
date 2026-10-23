import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, lerId, preparacao } from "@/lib/validacao";
import { buscarPreparacao } from "@/repositories/preparacoes";
import { respostaDeErro } from "@/services/erros";
import { salvarPreparacao } from "@/services/preparacoes";

const naoEncontrada = () => Response.json({ erro: "Preparação não encontrada" }, { status: 404 });

export async function GET(req: Request, ctx: RouteContext<"/api/preparacoes/[id]">) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  const prep = id && (await buscarPreparacao(id));
  if (!prep) return naoEncontrada();
  return Response.json({
    id: prep.id,
    nome: prep.nome,
    porcao_g: prep.porcao_g,
    peso_final_calculado: prep.peso_final_calculado,
    itens: prep.itens.map((i) => ({
      ingrediente_id: i.ingrediente_id,
      nome: i.ingrediente.nome,
      quantidade_crua_g: i.quantidade_crua_g,
      modo_preparo: i.modo_preparo,
    })),
    contato_cozinha: prep.marcadores_cozinha,
  });
}

// Substitui a ficha inteira. Só o operador.
export async function PUT(req: Request, ctx: RouteContext<"/api/preparacoes/[id]">) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, preparacao);
  if (dados instanceof Response) return dados;
  const id = await lerId(ctx);
  if (!id) return naoEncontrada();
  try {
    return Response.json(await salvarPreparacao(dados, id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
