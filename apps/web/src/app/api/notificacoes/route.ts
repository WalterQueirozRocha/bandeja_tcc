import { exigirPerfil } from "@/lib/acesso";
import { verNotificacoes } from "@/services/notificacoes";

// D2: as notificações do próprio usuário, mais recentes primeiro, com o total de não lidas. Todos os perfis.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  return Response.json(await verNotificacoes(sessao));
}
