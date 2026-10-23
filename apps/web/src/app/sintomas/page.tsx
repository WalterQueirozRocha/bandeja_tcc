import { exigirSessaoNaPagina } from "@/lib/acesso";
import { buscarAlunoDoUsuario } from "@/repositories/alunos";
import { registrosDoAluno } from "@/repositories/sintomas";
import { listaDeSintomas } from "@/services/sintomas";
import { FormularioSintoma } from "./formulario";

// RF12/RF13: diário do próprio aluno, com o aviso fixo sempre visível.
export default async function Sintomas() {
  const sessao = await exigirSessaoNaPagina();
  const aluno = sessao.papel === "ALUNO" ? await buscarAlunoDoUsuario(sessao.id) : null;
  if (!aluno) return <main className="p-4">Acesso negado.</main>;
  const [{ aviso, grupos }, registros] = await Promise.all([listaDeSintomas(), registrosDoAluno(aluno.id)]);

  return (
    <main className="flex flex-col gap-3 p-4">
      <p role="note" data-testid="aviso-sintomas" className="rounded border-2 border-red-600 p-3 font-semibold">
        {aviso}
      </p>
      <h1 className="text-2xl font-semibold">Como estou me sentindo</h1>
      <FormularioSintoma alunoId={aluno.id} grupos={grupos} />
      <h2 className="text-lg font-semibold">Meus registros</h2>
      {registros.length === 0 && <p>Nenhum registro.</p>}
      <ul className="flex flex-col gap-1">
        {registros.map((r) => (
          <li key={r.id} className="rounded border p-2">
            {r.data_hora.toLocaleString("pt-BR", { timeZone: "America/Bahia" })} — {r.sintoma.descricao}
            {r.observacao && `: ${r.observacao}`}
          </li>
        ))}
      </ul>
    </main>
  );
}
