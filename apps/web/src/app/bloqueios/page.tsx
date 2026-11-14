import { ShieldBan } from "lucide-react";
import { Selo } from "@/components/alerta";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { listarPreparacoes } from "@/repositories/preparacoes";
import { verBloqueios } from "@/services/bloqueios";
import { AcaoBloqueio, NovoBloqueio } from "./acoes";

// RF14: o responsável solicita e cancela; o operador executa ou recusa.
export default async function Bloqueios() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR" && sessao.papel !== "RESPONSAVEL") return <main className="p-4">Acesso negado.</main>;
  const bloqueios = await verBloqueios(sessao);
  const responsavel = sessao.papel === "RESPONSAVEL";
  const [alunos, preparacoes] = responsavel
    ? await Promise.all([alunosDoResponsavel(sessao.id), listarPreparacoes()])
    : [[], []];

  return (
    <main className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-brand-royal">
          <ShieldBan className="size-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">Restrição de Venda</span>
        </div>
        <h1>Bloqueios</h1>
        <p className="text-sm text-secondary">
          {responsavel
            ? "Solicite o bloqueio de preparações específicas para os alunos sob sua responsabilidade."
            : "Gerencie as solicitações de bloqueio enviadas pelos responsáveis."}
        </p>
      </header>

      {responsavel && <NovoBloqueio alunos={alunos} preparacoes={preparacoes.map((p) => ({ id: p.id, nome: p.nome }))} />}

      {bloqueios.length === 0 && (
        <Card className="items-center justify-center py-10 text-center">
          <p className="text-secondary">Nenhum bloqueio.</p>
        </Card>
      )}

      {bloqueios.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {bloqueios.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-borda bg-surface-card p-4 shadow-xs">
              <span className="flex-1">
                <span className="font-semibold text-brand-navy">{b.preparacao.nome}</span>
                <span className="block text-sm text-secondary">{b.aluno.nome}</span>
              </span>
              {/* Executado = venda bloqueada (RF14); as outras situações não têm cor semântica. */}
              {b.situacao === "EXECUTADA" ? (
                <Selo estado="BLOQUEADO">{b.situacao}</Selo>
              ) : (
                <Badge variant="secondary">{b.situacao}</Badge>
              )}
              <AcaoBloqueio id={b.id} papel={sessao.papel} situacao={b.situacao} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
