import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="flex flex-col gap-6 py-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-secondary">
          <Link href="/usuarios" className="no-underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Usuários
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{u.nome}</h1>
            <Badge variant="outline">{PAPEL[u.papel]}</Badge>
            {!u.ativo && <SeloDesabilitado />}
          </div>
          <p className="text-sm text-secondary">
            {PAPEL[u.papel]} · {u.email}
          </p>
        </div>
        {u.id !== sessao.id && <AcoesRegistro url={`/api/usuarios/${u.id}`} ativo={u.ativo} nome={u.nome} voltarPara="/usuarios" />}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <DadosUsuario usuario={basico} />
            </CardContent>
          </section>
        </Card>

        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Senha</CardTitle>
            </CardHeader>
            <CardContent>
              <RedefinirSenha usuario={basico} />
            </CardContent>
          </section>
        </Card>
      </div>

      {u.aluno && (
        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Responsáveis</CardTitle>
            </CardHeader>
            <CardContent>
              <Vinculos alunoId={u.aluno.id} vinculados={u.aluno.responsaveis} responsaveis={responsaveis} />
            </CardContent>
          </section>
        </Card>
      )}

      {u.alunos && (
        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Alunos vinculados</CardTitle>
            </CardHeader>
            <CardContent>
              {u.alunos.length === 0 && <p className="text-sm text-secondary">Nenhum aluno. O vínculo é feito na página do aluno.</p>}
              {u.alunos.length > 0 && (
                <ul className="flex flex-col gap-2 text-sm">
                  {u.alunos.map((a) => (
                    <li key={a.id} className="rounded-lg border border-borda bg-surface-muted px-3 py-2 font-medium text-brand-navy">
                      {a.nome} <span className="font-normal text-secondary">({a.serie})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </section>
        </Card>
      )}
    </main>
  );
}
