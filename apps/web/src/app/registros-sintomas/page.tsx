import Link from "next/link";
import { FileCheck2, FileText } from "lucide-react";
import { Selo } from "@/components/alerta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { dataHoraNaBahia, verPedidos } from "@/services/registros";
import { DecisaoPedido, NovoPedido } from "./acoes";

// RF20: o responsável pede e acompanha; a coordenação autoriza ou recusa sem ver os registros.
export default async function RegistrosSintomas() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "RESPONSAVEL" && sessao.papel !== "COORDENACAO") return <main className="p-4">Acesso negado.</main>;
  const responsavel = sessao.papel === "RESPONSAVEL";
  const [pedidos, alunos] = await Promise.all([verPedidos(sessao), responsavel ? alunosDoResponsavel(sessao.id) : []]);

  return (
    <main className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-brand-royal">
          <FileCheck2 className="size-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">Acesso Controlado</span>
        </div>
        <h1>{responsavel ? "Registros de sintomas" : "Pedidos de registros de sintomas"}</h1>
        <p className="text-sm text-secondary">
          {responsavel
            ? "Peça à escola os registros de sintomas do aluno. Depois da autorização, você vê os registros gravados até aquele momento e pode baixar em PDF."
            : "Confira se quem pediu é responsável vinculado ao aluno. A escola não vê o conteúdo dos registros."}
        </p>
      </header>

      {responsavel && <NovoPedido alunos={alunos} />}

      {pedidos.length === 0 && (
        <Card className="items-center justify-center py-10 text-center">
          <p className="text-secondary">Nenhum pedido.</p>
        </Card>
      )}

      {pedidos.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {pedidos.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-borda bg-surface-card p-4 shadow-xs"
              data-testid="pedido-registros"
            >
              <span className="flex-1">
                <span className="font-semibold text-brand-navy">{p.aluno.nome}</span>
                <span className="block text-sm text-secondary">
                  {!responsavel && `${p.responsavel.nome} (${p.responsavel.email}) · `}
                  pedido em <span className="tabular-nums">{dataHoraNaBahia(p.solicitada_em)}</span>
                </span>
                {p.situacao === "AUTORIZADA" && (
                  <span className="block text-sm text-secondary" data-testid="ultimo-acesso">
                    {p.ultimo_acesso ? (
                      <>
                        Último acesso em <span className="tabular-nums">{dataHoraNaBahia(p.ultimo_acesso)}</span>
                      </>
                    ) : (
                      "Ainda não acessado"
                    )}
                  </span>
                )}
                {!responsavel && !p.vinculado && (
                  <span className="block text-sm font-medium text-bloqueado-texto">Não está mais vinculado ao aluno</span>
                )}
              </span>
              {/* Autorizado libera o acesso; as outras situações não têm cor semântica. */}
              {p.situacao === "AUTORIZADA" ? (
                <Selo estado="COMPATIVEL">{p.situacao}</Selo>
              ) : (
                <Badge variant="secondary">{p.situacao}</Badge>
              )}
              {responsavel && p.situacao === "AUTORIZADA" && (
                <Button asChild size="sm">
                  <Link href={`/registros-sintomas/${p.id}`} className="no-underline">
                    <FileText className="size-3.5" aria-hidden="true" />
                    Ver registros
                  </Link>
                </Button>
              )}
              {!responsavel && p.situacao === "SOLICITADA" && <DecisaoPedido id={p.id} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
