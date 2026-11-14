import { Clock } from "lucide-react";
import { Alerta } from "@/components/alerta";
import { Card } from "@/components/ui/card";
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
      <Alerta estado="AVISO" role="note" data-testid="aviso-sintomas" className="sticky top-16 z-10 font-semibold shadow-sm">
        {aviso}
      </Alerta>
      <div>
        <h1>Como estou me sentindo</h1>
        <p className="text-sm text-secondary">Registre no seu diário pessoal caso sinta algum desconforto após comer.</p>
      </div>
      <FormularioSintoma alunoId={aluno.id} grupos={grupos} />
      <section className="flex flex-col gap-3 pt-2">
        <h2>Meus registros</h2>
        {registros.length === 0 && <Card className="py-6 text-center text-secondary">Nenhum registro.</Card>}
        <ul className="flex flex-col gap-2.5">
          {registros.map((r) => (
            <li key={r.id} className="cartao flex flex-col gap-1 py-3.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary tabular-nums">
                <Clock aria-hidden="true" className="size-3.5" />
                {r.data_hora.toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
              </span>
              <span className="font-semibold text-brand-navy">
                {r.sintoma.descricao}
                {r.observacao && `: ${r.observacao}`}
              </span>
              {descreverAlimento(r) && <span className="text-sm text-secondary">{descreverAlimento(r)}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
