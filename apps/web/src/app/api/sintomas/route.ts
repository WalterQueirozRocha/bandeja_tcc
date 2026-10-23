import { exigirPerfil } from "@/lib/acesso";
import { listaDeSintomas } from "@/services/sintomas";

// Lista fixa do Quadro 8 e o aviso do RF13.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  return Response.json(await listaDeSintomas());
}
