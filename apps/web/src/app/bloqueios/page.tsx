import { Selo } from "@/components/alerta";
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
    <main className="flex flex-col gap-4 p-4">
      <h1>Bloqueios</h1>
      {responsavel && <NovoBloqueio alunos={alunos} preparacoes={preparacoes.map((p) => ({ id: p.id, nome: p.nome }))} />}
      {bloqueios.length === 0 && <p className="text-secondary">Nenhum bloqueio.</p>}
      <ul className="flex flex-col gap-2">
        {bloqueios.map((b) => (
          <li key={b.id} className="cartao flex flex-wrap items-center gap-3 py-3">
            <span className="flex-1">
              <span className="font-semibold">{b.preparacao.nome}</span>
              <span className="block text-sm text-secondary">{b.aluno.nome}</span>
            </span>
            {/* Executado = venda bloqueada (RF14); as outras situações não têm cor semântica. */}
            {b.situacao === "EXECUTADA" ? (
              <Selo estado="BLOQUEADO">{b.situacao}</Selo>
            ) : (
              <span className="rounded-full border border-borda px-2.5 py-0.5 text-xs font-bold text-secondary">{b.situacao}</span>
            )}
            <AcaoBloqueio id={b.id} papel={sessao.papel} situacao={b.situacao} />
          </li>
        ))}
      </ul>
    </main>
  );
}
