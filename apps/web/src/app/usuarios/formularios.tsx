"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensagemErro, useAcao } from "@/components/acao";
import { PAPEL, opcoes } from "@/lib/rotulos";

const SENHA_MINIMA = 6;

function Campo({ rotulo, ...props }: { rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {rotulo}
      <input {...props} className="campo" />
    </label>
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
    <form onSubmit={salvar} className="cartao flex flex-col gap-3">
      <h2>Novo usuário</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <Campo rotulo="Nome" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required maxLength={200} />
        <Campo rotulo="E-mail" type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} required />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Papel
          <select value={dados.papel} onChange={(e) => setDados({ ...dados, papel: e.target.value })} className="campo">
            {opcoes(PAPEL).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
        {aluno && <Campo rotulo="Série" value={dados.serie} onChange={(e) => setDados({ ...dados, serie: e.target.value })} required maxLength={50} placeholder="Ex.: 8º ano" />}
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
      <button type="submit" disabled={ocupado} className="btn-primario self-start">
        Criar usuário
      </button>
      <MensagemErro erro={erro} />
    </form>
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
    <form onSubmit={salvar} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Campo rotulo="Nome" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required maxLength={200} />
        <Campo rotulo="E-mail" type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} required />
        {usuario.serie !== undefined && (
          <Campo rotulo="Série" value={dados.serie ?? ""} onChange={(e) => setDados({ ...dados, serie: e.target.value })} required maxLength={50} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={ocupado} className="btn-primario">
          Salvar dados
        </button>
        {aviso && <span role="status" className="text-sm">{aviso}</span>}
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
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-2">
      <Campo rotulo={`Nova senha (mínimo ${SENHA_MINIMA})`} type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={SENHA_MINIMA} />
      <button type="submit" disabled={ocupado} className="btn-secundario">
        Redefinir senha
      </button>
      {aviso && <span role="status" className="text-sm">{aviso}</span>}
      <MensagemErro erro={erro} />
    </form>
  );
}

// Responsáveis do aluno: vincular e desvincular.
export function Vinculos({ alunoId, vinculados, responsaveis }: { alunoId: number; vinculados: { id: number; nome: string; email: string }[]; responsaveis: { id: number; nome: string; email: string }[] }) {
  const { erro, ocupado, executar } = useAcao();
  const [escolhido, setEscolhido] = useState(0);
  const disponiveis = responsaveis.filter((r) => !vinculados.some((v) => v.id === r.id));

  return (
    <div className="flex flex-col gap-3">
      {vinculados.length === 0 && <p className="text-sm text-secondary">Nenhum responsável vinculado.</p>}
      <ul className="flex flex-col gap-1">
        {vinculados.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-borda p-2 text-sm">
            <span className="flex-1">
              {r.nome} <span className="text-secondary">({r.email})</span>
            </span>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => confirm(`Desvincular ${r.nome}?`) && executar(`/api/alunos/${alunoId}/responsaveis/${r.id}`, "DELETE")}
              className="btn-secundario py-1 text-sm"
            >
              Desvincular
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Responsável
          <select value={escolhido} onChange={(e) => setEscolhido(Number(e.target.value))} className="campo">
            <option value={0}>Escolha…</option>
            {disponiveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} ({r.email})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={ocupado || !escolhido}
          onClick={async () => (await executar(`/api/alunos/${alunoId}/responsaveis`, "POST", { responsavel_id: escolhido })) && setEscolhido(0)}
          className="btn-primario"
        >
          Vincular
        </button>
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}
