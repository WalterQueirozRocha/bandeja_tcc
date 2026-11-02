import { exigirPerfil } from "@/lib/acesso";
import { naoLidas } from "@/services/notificacoes";

// D2: só o número, para o sino (consultado a cada troca de tela).
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  return Response.json({ nao_lidas: await naoLidas(sessao) });
}
