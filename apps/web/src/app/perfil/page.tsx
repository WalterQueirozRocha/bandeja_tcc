import { Selo } from "@/components/alerta";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { EXCLUSAO_ESTRITA, TIPO_RESTRICAO } from "@/lib/rotulos";
import { alunosDoResponsavel, buscarAlunoDoUsuario } from "@/repositories/alunos";
import { listarCategorias } from "@/repositories/ingredientes";
import { exigirAcessoAoAluno, lerPerfil } from "@/services/alunos";
import { ErroNegocio } from "@/services/erros";
import { FormularioPerfil } from "./formulario";

type Perfil = Awaited<ReturnType<typeof lerPerfil>>;

// RF06 / RNF07: o responsável declara as restrições com consentimento; o aluno vê o próprio perfil (Quadro 9).
export default async function PaginaPerfil({ searchParams }: PageProps<"/perfil">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "RESPONSAVEL" && sessao.papel !== "ALUNO") return <main className="p-4">Acesso negado.</main>;
  const responsavel = sessao.papel === "RESPONSAVEL";
  const alunos = responsavel ? await alunosDoResponsavel(sessao.id) : [];
  const alunoId = responsavel ? Number((await searchParams).aluno_id) || alunos[0]?.id : (await buscarAlunoDoUsuario(sessao.id))?.id;
  if (!alunoId) return <main className="p-4 text-secondary">Nenhum aluno vinculado a este usuário.</main>;

  let perfil: Perfil;
  try {
    await exigirAcessoAoAluno(sessao, alunoId, ["ALUNO", "RESPONSAVEL"]);
    perfil = await lerPerfil(alunoId);
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    return <main className="p-4">{e.message}</main>;
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>{responsavel ? "Perfil de saúde" : "Meu perfil"}</h1>
      {alunos.length > 1 && (
        <form className="flex gap-2">
          <select name="aluno_id" defaultValue={alunoId} aria-label="Aluno" className="campo">
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secundario">
            Ver
          </button>
        </form>
      )}
      <p className="text-sm text-secondary">
        {perfil.consentimento
          ? `Consentimento registrado em ${new Date(perfil.consentimento.em).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}.`
          : "Nenhum perfil declarado: os itens do cardápio aparecem como compatíveis."}
      </p>

      {responsavel ? (
        <FormularioPerfil
          key={alunoId}
          alunoId={alunoId}
          consentido={perfil.consentimento !== null}
          categorias={(await listarCategorias()).map((c) => ({ codigo: c.codigo, nome: c.nome, tipo: c.tipo }))}
          inicial={perfil.restricoes.map((r) => ({ categoria_codigo: r.categoria_codigo, tipo: r.tipo, limite_notificacao: r.limite_notificacao }))}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {perfil.restricoes.length === 0 && <li className="text-secondary">Nenhuma restrição declarada.</li>}
          {perfil.restricoes.map((r) => (
            <li key={r.categoria_codigo} className="cartao flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <span className="font-semibold">{r.categoria}</span>
                <span className="block text-sm text-secondary">{TIPO_RESTRICAO[r.tipo]}</span>
              </span>
              {EXCLUSAO_ESTRITA.includes(r.tipo) ? (
                <Selo estado="BLOQUEADO">Bloqueia a venda</Selo>
              ) : (
                <Selo estado="ATENCAO">Atenção · limite {r.limite_notificacao}/semana</Selo>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
