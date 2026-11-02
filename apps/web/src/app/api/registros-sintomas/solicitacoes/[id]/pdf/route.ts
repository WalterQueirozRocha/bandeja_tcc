import { exigirPerfil } from "@/lib/acesso";
import { lerId } from "@/lib/validacao";
import { respostaDeErro } from "@/services/erros";
import { gerarPdfRegistros, registrosLiberados } from "@/services/registros";

// RF20: o mesmo conteúdo da tela, em PDF para baixar.
export async function GET(req: Request, ctx: RouteContext<"/api/registros-sintomas/solicitacoes/[id]/pdf">) {
  const sessao = await exigirPerfil(req, ["RESPONSAVEL"]);
  if (sessao instanceof Response) return sessao;
  const id = await lerId(ctx);
  if (!id) return Response.json({ erro: "Acesso negado" }, { status: 403 });
  try {
    const pdf = await gerarPdfRegistros(await registrosLiberados(sessao, id, "PDF"));
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="registros-sintomas-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
