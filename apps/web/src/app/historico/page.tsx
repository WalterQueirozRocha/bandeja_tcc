import { exigirSessaoNaPagina } from "@/lib/acesso";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { alunoDaConsulta } from "@/services/alunos";
import { ErroNegocio } from "@/services/erros";
import { lerHistorico } from "@/services/vendas";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// Histórico de consumo do aluno (D7) com a CG da refeição (P15).
export default async function Historico({ searchParams }: PageProps<"/historico">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "ALUNO" && sessao.papel !== "RESPONSAVEL") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const alunos = sessao.papel === "RESPONSAVEL" ? await alunosDoResponsavel(sessao.id) : [];
  const alunoParam = Number(params.aluno_id) || alunos[0]?.id;

  let vendas;
  try {
    const aluno_id = await alunoDaConsulta(sessao, alunoParam);
    vendas = aluno_id === null ? [] : await lerHistorico(aluno_id);
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    return <main className="p-4">{e.message}</main>;
  }

  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">Histórico de consumo</h1>
      {alunos.length > 1 && (
        <form className="flex gap-2">
          <select name="aluno_id" defaultValue={alunoParam} className="rounded border p-2">
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded border px-4">
            Ver
          </button>
        </form>
      )}
      {vendas.length === 0 && <p>Nenhum consumo registrado.</p>}
      <ul className="flex flex-col gap-3">
        {vendas.map((v) => (
          <li key={v.venda_id} className="rounded border p-3">
            <p className="font-semibold">{new Date(v.data_hora).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}</p>
            <p>{v.itens.map((i) => i.nome).join(", ")}</p>
            <p className="text-sm">
              Carboidrato disponível: {num(v.carboidrato_disponivel_g)} g · CG da refeição: {num(v.cg_refeicao)} ({v.rotulo})
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
