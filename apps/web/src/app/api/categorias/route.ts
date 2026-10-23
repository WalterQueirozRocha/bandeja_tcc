import { exigirPerfil } from "@/lib/acesso";
import { listarCategorias } from "@/repositories/ingredientes";

export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  return Response.json(await listarCategorias());
}
