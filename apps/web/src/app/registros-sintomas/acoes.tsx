"use client";

import { Check, Plus, X } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";

export function NovoPedido({ alunos }: { alunos: { id: number; nome: string }[] }) {
  const { erro, ocupado, executar } = useAcao();
  return (
    <Card asChild className="p-4">
      <form
        action={async (f) => {
          await executar("/api/registros-sintomas/solicitacoes", "POST", { aluno_id: Number(f.get("aluno_id")) });
        }}
        className="flex flex-wrap items-center gap-2.5"
      >
        <NativeSelect name="aluno_id" aria-label="Aluno" className="min-w-0 flex-1">
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" disabled={ocupado || alunos.length === 0}>
          <Plus className="size-4" aria-hidden="true" />
          Pedir registros
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

export function DecisaoPedido({ id }: { id: number }) {
  const { erro, ocupado, executar } = useAcao();
  const decidir = (situacao: "AUTORIZADA" | "RECUSADA") => executar(`/api/registros-sintomas/solicitacoes/${id}`, "PUT", { situacao });
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" disabled={ocupado} onClick={() => decidir("AUTORIZADA")}>
        <Check className="size-3.5" aria-hidden="true" />
        Autorizar
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={ocupado} onClick={() => decidir("RECUSADA")}>
        <X className="size-3.5" aria-hidden="true" />
        Recusar
      </Button>
      <MensagemErro erro={erro} />
    </span>
  );
}
