import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Alerta } from "@/components/alerta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { ErroNegocio } from "@/services/erros";
import { dataHoraNaBahia, registrosLiberados } from "@/services/registros";

// RF20: registros liberados por um pedido autorizado, com o download em PDF.
export default async function RegistrosLiberados({ params }: PageProps<"/registros-sintomas/[id]">) {
  const sessao = await exigirSessaoNaPagina();
  const id = Number((await params).id);
  if (sessao.papel !== "RESPONSAVEL" || !Number.isInteger(id) || id <= 0) return <main className="p-4">Acesso negado.</main>;
  let dados;
  try {
    dados = await registrosLiberados(sessao, id, "TELA");
  } catch (e) {
    if (e instanceof ErroNegocio) return <main className="p-4">{e.message}.</main>;
    throw e;
  }
  const { pedido, registros } = dados;

  return (
    <main className="flex flex-col gap-6 py-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-secondary">
          <Link href="/registros-sintomas" className="no-underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Pedidos
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1>Registros de sintomas — {pedido.aluno.nome}</h1>
          <p className="text-sm text-secondary">
            Registros gravados até <span className="tabular-nums">{dataHoraNaBahia(pedido.autorizado_em)}</span>, quando a escola autorizou o pedido.
          </p>
        </div>
        <Button asChild>
          <a href={`/api/registros-sintomas/solicitacoes/${pedido.id}/pdf`} download className="no-underline">
            <Download className="size-4" aria-hidden="true" />
            Baixar PDF
          </a>
        </Button>
      </header>

      <Alerta estado="AVISO" role="note">
        Estes registros foram feitos pelo aluno e não são um diagnóstico.
      </Alerta>

      {registros.length === 0 && (
        <Card className="items-center justify-center py-10 text-center">
          <p className="text-secondary">Nenhum registro.</p>
        </Card>
      )}

      {registros.length > 0 && (
        <ul className="flex flex-col gap-2.5" data-testid="registros-liberados">
          {registros.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 rounded-xl border border-borda bg-surface-card p-4 shadow-xs">
              <span className="text-xs font-medium text-secondary tabular-nums">{dataHoraNaBahia(r.data_hora)}</span>
              <span className="font-medium text-brand-navy">
                {r.sintoma}
                {r.observacao && `: ${r.observacao}`}
              </span>
              {r.alimento && <span className="text-sm text-secondary">{r.alimento}</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
