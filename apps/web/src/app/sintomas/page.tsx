import { Alerta } from "@/components/alerta";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { buscarAlunoDoUsuario } from "@/repositories/alunos";
import { registrosDoAluno } from "@/repositories/sintomas";
import { descreverAlimento, listaDeSintomas } from "@/services/sintomas";
import { FormularioSintoma } from "./formulario";

// RF12/RF13: diário do próprio aluno, com o aviso fixo sempre visível.
export default async function Sintomas() {
  const sessao = await exigirSessaoNaPagina();
  const aluno = sessao.papel === "ALUNO" ? await buscarAlunoDoUsuario(sessao.id) : null;
  if (!aluno) return <main className="p-4">Acesso negado.</main>;
  const [{ aviso, grupos }, registros] = await Promise.all([listaDeSintomas(), registrosDoAluno(aluno.id)]);

  return (
    <main className="flex flex-col gap-4 p-4">
      <Alerta estado="AVISO" role="note" data-testid="aviso-sintomas" className="sticky top-2 z-10 font-semibold shadow-sm">
        {aviso}
      </Alerta>
      <h1>Como estou me sentindo</h1>
      <FormularioSintoma alunoId={aluno.id} grupos={grupos} />
      <h2>Meus registros</h2>
      {registros.length === 0 && <p className="text-secondary">Nenhum registro.</p>}
      <ul className="flex flex-col gap-2">
        {registros.map((r) => (
          <li key={r.id} className="cartao py-3">
            <span className="block text-sm text-secondary tabular-nums">
              {r.data_hora.toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
            </span>
            {r.sintoma.descricao}
            {r.observacao && `: ${r.observacao}`}
            {descreverAlimento(r) && <span className="block text-sm text-secondary">{descreverAlimento(r)}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
