"use client";

import { Check, Plus, X } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";

export function NovoBloqueio({ alunos, preparacoes }: { alunos: { id: number; nome: string }[]; preparacoes: { id: number; nome: string }[] }) {
  const { erro, ocupado, executar } = useAcao();
  return (
    <Card asChild className="p-4">
      <form
        action={async (f) => {
          await executar("/api/bloqueios", "POST", { aluno_id: Number(f.get("aluno_id")), preparacao_id: Number(f.get("preparacao_id")) });
        }}
        className="flex flex-wrap items-center gap-2.5"
      >
        <NativeSelect name="aluno_id" aria-label="Aluno" className="w-full sm:w-56">
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="preparacao_id" aria-label="Preparação" className="min-w-0 flex-1">
          {preparacoes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" disabled={ocupado}>
          <Plus className="size-4" aria-hidden="true" />
          Solicitar bloqueio
        </Button>
        {erro && (
          <div className="w-full">
            <MensagemErro erro={erro} />
          </div>
        )}
      </form>
    </Card>
  );
}

export function AcaoBloqueio({ id, papel, situacao }: { id: number; papel: string; situacao: string }) {
  const { erro, ocupado, executar } = useAcao();
  return (
    <span className="flex flex-wrap items-center gap-2">
      {papel === "OPERADOR" && situacao === "SOLICITADA" && (
        <>
          <Button type="button" size="sm" disabled={ocupado} onClick={() => executar(`/api/bloqueios/${id}`, "PUT", { situacao: "EXECUTADA" })}>
            <Check className="size-3.5" aria-hidden="true" />
            Executar
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={ocupado} onClick={() => executar(`/api/bloqueios/${id}`, "PUT", { situacao: "RECUSADA" })}>
            <X className="size-3.5" aria-hidden="true" />
            Recusar
          </Button>
        </>
      )}
      {papel === "RESPONSAVEL" && (
        <Button type="button" variant="secondary" size="sm" disabled={ocupado} onClick={() => executar(`/api/bloqueios/${id}`, "DELETE")}>
          Cancelar
        </Button>
      )}
      {erro && <span className="text-sm font-medium text-bloqueado-texto">{erro}</span>}
    </span>
  );
}
