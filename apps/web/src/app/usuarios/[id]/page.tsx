import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { PAPEL } from "@/lib/rotulos";
import { listarUsuarios } from "@/repositories/usuarios";
import { ErroNegocio } from "@/services/erros";
import { lerUsuario } from "@/services/usuarios";
import { DadosUsuario, RedefinirSenha, Vinculos } from "../formularios";

export default async function Usuario({ params }: PageProps<"/usuarios/[id]">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "COORDENACAO") return <main className="p-4">Acesso negado.</main>;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  let u;
  try {
    u = await lerUsuario(id);
  } catch (e) {
    if (e instanceof ErroNegocio && e.status === 404) notFound();
    throw e;
  }
  const basico = { id: u.id, nome: u.nome, email: u.email, ...(u.aluno && { serie: u.aluno.serie }) };
  const responsaveis = u.aluno ? (await listarUsuarios({ papel: "RESPONSAVEL" })).map((r) => ({ id: r.id, nome: r.nome, email: r.email })) : [];

  return (
    <main className="flex flex-col gap-4 p-4">
      <Link href="/usuarios" className="text-sm">
        ← Usuários
      </Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1>{u.nome}</h1>
          <p className="text-sm text-secondary">
            {PAPEL[u.papel]} · {u.email}
          </p>
        </div>
        {!u.ativo && <SeloDesabilitado />}
        {u.id !== sessao.id && <AcoesRegistro url={`/api/usuarios/${u.id}`} ativo={u.ativo} nome={u.nome} voltarPara="/usuarios" />}
      </div>

      <section className="cartao flex flex-col gap-3">
        <h2>Dados</h2>
        <DadosUsuario usuario={basico} />
      </section>

      <section className="cartao flex flex-col gap-3">
        <h2>Senha</h2>
        <RedefinirSenha usuario={basico} />
      </section>

      {u.aluno && (
        <section className="cartao flex flex-col gap-3">
          <h2>Responsáveis</h2>
          <Vinculos alunoId={u.aluno.id} vinculados={u.aluno.responsaveis} responsaveis={responsaveis} />
        </section>
      )}

      {u.alunos && (
        <section className="cartao flex flex-col gap-2">
          <h2>Alunos vinculados</h2>
          {u.alunos.length === 0 && <p className="text-sm text-secondary">Nenhum aluno. O vínculo é feito na página do aluno.</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {u.alunos.map((a) => (
              <li key={a.id}>
                {a.nome} <span className="text-secondary">({a.serie})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
