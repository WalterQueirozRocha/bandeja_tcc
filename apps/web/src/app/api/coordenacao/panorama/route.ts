import { exigirPerfil } from "@/lib/acesso";
import { consultaPanorama, lerConsulta } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { montarPanorama } from "@/services/panorama";

// RF15 / Quadro 9: coordenação e operador; sem dados individuais.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req, ["COORDENACAO", "OPERADOR"]);
  if (sessao instanceof Response) return sessao;
  const filtro = lerConsulta(req, consultaPanorama);
  if (filtro instanceof Response) return filtro;
  try {
    return Response.json(await montarPanorama(filtro));
  } catch (e) {
    return respostaDeErro(e);
  }
}
