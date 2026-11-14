"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, KeyRound, Link2, Save, Unlink, UserPlus } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PAPEL, opcoes } from "@/lib/rotulos";

const SENHA_MINIMA = 6;

function Campo({ rotulo, ...props }: { rotulo: string } & React.ComponentProps<typeof Input>) {
  return (
    <Label className="flex flex-col items-start gap-1.5">
      <span>{rotulo}</span>
      <Input {...props} />
    </Label>
  );
}

// B1-M: a coordenação cria a conta; aluno precisa da série.
export function NovoUsuario() {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState({ nome: "", email: "", papel: "ALUNO", senha: "", serie: "" });
  const aluno = dados.papel === "ALUNO";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { serie, ...resto } = dados;
    const r = await executar<{ id: number }>("/api/usuarios", "POST", { ...resto, ...(aluno && { serie }) });
    if (r) router.push(`/usuarios/${r.id}`);
  }

  return (
    <Card asChild>
      <form onSubmit={salvar}>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required maxLength={200} />
            <Campo rotulo="E-mail" type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} required />
            <Label className="flex flex-col items-start gap-1.5">
              <span>Papel</span>
              <NativeSelect value={dados.papel} onChange={(e) => setDados({ ...dados, papel: e.target.value })}>
                {opcoes(PAPEL).map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            {aluno && (
              <Campo
                rotulo="Série"
                value={dados.serie}
                onChange={(e) => setDados({ ...dados, serie: e.target.value })}
                required
                maxLength={50}
                placeholder="Ex.: 8º ano"
              />
            )}
            <Campo
              rotulo={`Senha inicial (mínimo ${SENHA_MINIMA})`}
              type="password"
              autoComplete="new-password"
              value={dados.senha}
              onChange={(e) => setDados({ ...dados, senha: e.target.value })}
              required
              minLength={SENHA_MINIMA}
            />
          </div>
          <Button type="submit" disabled={ocupado} className="self-start">
            <UserPlus className="size-4" aria-hidden="true" />
            Criar usuário
          </Button>
          <MensagemErro erro={erro} />
        </CardContent>
      </form>
    </Card>
  );
}

type Usuario = { id: number; nome: string; email: string; serie?: string };

export function DadosUsuario({ usuario }: { usuario: Usuario }) {
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState(usuario);
  const [aviso, setAviso] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { id, ...corpo } = dados;
    setAviso((await executar(`/api/usuarios/${id}`, "PUT", corpo)) ? "Dados salvos." : "");
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required maxLength={200} />
        <Campo rotulo="E-mail" type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} required />
        {usuario.serie !== undefined && (
          <Campo rotulo="Série" value={dados.serie ?? ""} onChange={(e) => setDados({ ...dados, serie: e.target.value })} required maxLength={50} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={ocupado}>
          <Save className="size-4" aria-hidden="true" />
          Salvar dados
        </Button>
        {aviso && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-compativel-texto">
            <Check className="size-4" aria-hidden="true" />
            {aviso}
          </span>
        )}
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}

export function RedefinirSenha({ usuario }: { usuario: Usuario }) {
  const { erro, ocupado, executar } = useAcao();
  const [senha, setSenha] = useState("");
  const [aviso, setAviso] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { id, ...corpo } = usuario;
    const ok = await executar(`/api/usuarios/${id}`, "PUT", { ...corpo, senha });
    setAviso(ok ? "Senha redefinida." : "");
    if (ok) setSenha("");
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Campo
        rotulo={`Nova senha (mínimo ${SENHA_MINIMA})`}
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
        minLength={SENHA_MINIMA}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={ocupado}>
          <KeyRound className="size-4" aria-hidden="true" />
          Redefinir senha
        </Button>
        {aviso && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-compativel-texto">
            <Check className="size-4" aria-hidden="true" />
            {aviso}
          </span>
        )}
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}

// Responsáveis do aluno: vincular e desvincular.
export function Vinculos({
  alunoId,
  vinculados,
  responsaveis,
}: {
  alunoId: number;
  vinculados: { id: number; nome: string; email: string }[];
  responsaveis: { id: number; nome: string; email: string }[];
}) {
  const { erro, ocupado, executar } = useAcao();
  const [escolhido, setEscolhido] = useState(0);
  const disponiveis = responsaveis.filter((r) => !vinculados.some((v) => v.id === r.id));

  return (
    <div className="flex flex-col gap-4">
      {vinculados.length === 0 && <p className="text-sm text-secondary">Nenhum responsável vinculado.</p>}
      {vinculados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {vinculados.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-borda bg-surface-muted p-3 text-sm">
              <span className="flex-1 font-medium text-brand-navy">
                {r.nome} <span className="font-normal text-secondary">({r.email})</span>
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="secondary" size="sm" disabled={ocupado}>
                    <Unlink className="size-3.5" aria-hidden="true" />
                    Desvincular
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desvincular {r.nome}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O responsável perderá o acesso ao histórico, aos bloqueios e aos pedidos de registros de sintomas deste aluno.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => executar(`/api/alunos/${alunoId}/responsaveis/${r.id}`, "DELETE")}>
                      Confirmar desvínculo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2.5">
        <Label className="flex min-w-56 flex-1 flex-col items-start gap-1.5">
          <span>Responsável</span>
          <NativeSelect value={escolhido} onChange={(e) => setEscolhido(Number(e.target.value))}>
            <option value={0}>Escolha…</option>
            {disponiveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} ({r.email})
              </option>
            ))}
          </NativeSelect>
        </Label>
        <Button
          type="button"
          disabled={ocupado || !escolhido}
          onClick={async () => (await executar(`/api/alunos/${alunoId}/responsaveis`, "POST", { responsavel_id: escolhido })) && setEscolhido(0)}
        >
          <Link2 className="size-4" aria-hidden="true" />
          Vincular
        </Button>
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}
