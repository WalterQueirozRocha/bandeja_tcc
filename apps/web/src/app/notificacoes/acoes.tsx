"use client";

import { Check, CheckCheck } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import { Button } from "@/components/ui/button";
import { EVENTO_NOTIFICACOES } from "@/lib/navegacao";

// Sem `id`, marca todas como lidas.
export function MarcarLida({ id }: { id?: number }) {
  const { erro, ocupado, executar } = useAcao();
  async function marcar() {
    if (await executar("/api/notificacoes/lidas", "POST", id ? { id } : {})) window.dispatchEvent(new Event(EVENTO_NOTIFICACOES));
  }
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={marcar} disabled={ocupado} className={id ? "" : "self-start"}>
        {id ? <Check className="size-3.5" aria-hidden="true" /> : <CheckCheck className="size-3.5" aria-hidden="true" />}
        {id ? "Marcar como lida" : "Marcar todas como lidas"}
      </Button>
      <MensagemErro erro={erro} />
    </>
  );
}
