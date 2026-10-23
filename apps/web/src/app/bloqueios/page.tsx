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
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">Bloqueios</h1>
      {responsavel && <NovoBloqueio alunos={alunos} preparacoes={preparacoes.map((p) => ({ id: p.id, nome: p.nome }))} />}
      {bloqueios.length === 0 && <p>Nenhum bloqueio.</p>}
      <ul className="flex flex-col gap-2">
        {bloqueios.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 rounded border p-2">
            <span className="flex-1">
              {b.aluno.nome} — {b.preparacao.nome} — <strong>{b.situacao}</strong>
            </span>
            <AcaoBloqueio id={b.id} papel={sessao.papel} situacao={b.situacao} />
          </li>
        ))}
      </ul>
    </main>
  );
}
