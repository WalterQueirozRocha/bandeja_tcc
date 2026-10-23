"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function useAcao() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  async function executar(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    setErro(res.ok ? "" : ((await res.json()).erro ?? "Erro"));
    if (res.ok) router.refresh();
  }
  return { erro, executar };
}

export function NovoBloqueio({ alunos, preparacoes }: { alunos: { id: number; nome: string }[]; preparacoes: { id: number; nome: string }[] }) {
  const { erro, executar } = useAcao();
  return (
    <form
      action={(f) => executar("/api/bloqueios", "POST", { aluno_id: Number(f.get("aluno_id")), preparacao_id: Number(f.get("preparacao_id")) })}
      className="flex flex-wrap gap-2"
    >
      <select name="aluno_id" className="rounded border p-2">
        {alunos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
          </option>
        ))}
      </select>
      <select name="preparacao_id" className="rounded border p-2">
        {preparacoes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-zinc-900 px-4 text-white">
        Solicitar bloqueio
      </button>
      {erro && <p role="alert" className="text-red-600">{erro}</p>}
    </form>
  );
}

export function AcaoBloqueio({ id, papel, situacao }: { id: number; papel: string; situacao: string }) {
  const { erro, executar } = useAcao();
  return (
    <span className="flex gap-2">
      {papel === "OPERADOR" && situacao === "SOLICITADA" && (
        <>
          <button type="button" onClick={() => executar(`/api/bloqueios/${id}`, "PUT", { situacao: "EXECUTADA" })} className="rounded border px-2">
            Executar
          </button>
          <button type="button" onClick={() => executar(`/api/bloqueios/${id}`, "PUT", { situacao: "RECUSADA" })} className="rounded border px-2">
            Recusar
          </button>
        </>
      )}
      {papel === "RESPONSAVEL" && (
        <button type="button" onClick={() => executar(`/api/bloqueios/${id}`, "DELETE")} className="rounded border px-2">
          Cancelar
        </button>
      )}
      {erro && <span className="text-red-600">{erro}</span>}
    </span>
  );
}
