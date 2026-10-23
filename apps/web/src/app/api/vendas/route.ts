import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, venda } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { registrarVenda } from "@/services/vendas";

// RF08–RF11: registra a venda (comprovante, sem pagamento). Só o operador.
export async function POST(req: Request) {
  const sessao = await exigirPerfil(req, ["OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, venda);
  if (dados instanceof Response) return dados;
  try {
    const { gravada, ...resultado } = await registrarVenda(sessao.id, dados);
    return Response.json(resultado, { status: gravada ? 201 : 200 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
