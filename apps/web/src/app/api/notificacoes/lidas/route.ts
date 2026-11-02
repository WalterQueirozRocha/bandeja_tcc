import { exigirPerfil } from "@/lib/acesso";
import { lerCorpo, marcacaoLidas } from "@/lib/validacao";
import { marcarComoLidas } from "@/services/notificacoes";

// D2: marca como lida uma notificação própria ({ id }) ou todas (sem corpo). Não se apaga (N3).
export async function POST(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const dados = await lerCorpo(req, marcacaoLidas);
  if (dados instanceof Response) return dados;
  return Response.json(await marcarComoLidas(sessao, dados?.id));
}
