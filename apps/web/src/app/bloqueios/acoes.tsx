"use client";

import { useAcao } from "@/components/acao";

export function NovoBloqueio({ alunos, preparacoes }: { alunos: { id: number; nome: string }[]; preparacoes: { id: number; nome: string }[] }) {
  const { erro, executar } = useAcao();
  return (
    <form
      action={async (f) => {
        await executar("/api/bloqueios", "POST", { aluno_id: Number(f.get("aluno_id")), preparacao_id: Number(f.get("preparacao_id")) });
      }}
      className="cartao flex flex-wrap gap-2"
    >
      <select name="aluno_id" aria-label="Aluno" className="campo">
        {alunos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
          </option>
        ))}
      </select>
      <select name="preparacao_id" aria-label="Preparação" className="campo min-w-0 flex-1">
        {preparacoes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-primario">
        Solicitar bloqueio
      </button>
      {erro && (
        <p role="alert" className="w-full text-sm font-medium text-bloqueado-texto">
          {erro}
        </p>
      )}
    </form>
  );
}

export function AcaoBloqueio({ id, papel, situacao }: { id: number; papel: string; situacao: string }) {
  const { erro, executar } = useAcao();
  return (
    <span className="flex flex-wrap items-center gap-2">
      {papel === "OPERADOR" && situacao === "SOLICITADA" && (
        <>
          <button type="button" onClick={() => executar(`/api/bloqueios/${id}`, "PUT", { situacao: "EXECUTADA" })} className="btn-primario py-1 text-sm">
            Executar
          </button>
          <button type="button" onClick={() => executar(`/api/bloqueios/${id}`, "PUT", { situacao: "RECUSADA" })} className="btn-secundario py-1 text-sm">
            Recusar
          </button>
        </>
      )}
      {papel === "RESPONSAVEL" && (
        <button type="button" onClick={() => executar(`/api/bloqueios/${id}`, "DELETE")} className="btn-secundario py-1 text-sm">
          Cancelar
        </button>
      )}
      {erro && <span className="text-sm font-medium text-bloqueado-texto">{erro}</span>}
    </span>
  );
}
