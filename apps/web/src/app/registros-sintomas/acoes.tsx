"use client";

import { MensagemErro, useAcao } from "@/components/acao";

export function NovoPedido({ alunos }: { alunos: { id: number; nome: string }[] }) {
  const { erro, ocupado, executar } = useAcao();
  return (
    <form
      action={async (f) => {
        await executar("/api/registros-sintomas/solicitacoes", "POST", { aluno_id: Number(f.get("aluno_id")) });
      }}
      className="cartao flex flex-wrap gap-2"
    >
      <select name="aluno_id" aria-label="Aluno" className="campo min-w-0 flex-1">
        {alunos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
          </option>
        ))}
      </select>
      <button type="submit" disabled={ocupado || alunos.length === 0} className="btn-primario">
        Pedir registros
      </button>
      <div className="w-full">
        <MensagemErro erro={erro} />
      </div>
    </form>
  );
}

export function DecisaoPedido({ id }: { id: number }) {
  const { erro, ocupado, executar } = useAcao();
  const decidir = (situacao: "AUTORIZADA" | "RECUSADA") => executar(`/api/registros-sintomas/solicitacoes/${id}`, "PUT", { situacao });
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={ocupado} onClick={() => decidir("AUTORIZADA")} className="btn-primario py-1 text-sm">
        Autorizar
      </button>
      <button type="button" disabled={ocupado} onClick={() => decidir("RECUSADA")} className="btn-secundario py-1 text-sm">
        Recusar
      </button>
      <MensagemErro erro={erro} />
    </span>
  );
}
