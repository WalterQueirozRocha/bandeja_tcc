"use client";

import { MensagemErro, useAcao } from "@/components/acao";
import { EVENTO_NOTIFICACOES } from "@/lib/navegacao";

// Sem `id`, marca todas como lidas.
export function MarcarLida({ id }: { id?: number }) {
  const { erro, ocupado, executar } = useAcao();
  async function marcar() {
    if (await executar("/api/notificacoes/lidas", "POST", id ? { id } : {})) window.dispatchEvent(new Event(EVENTO_NOTIFICACOES));
  }
  return (
    <>
      <button type="button" onClick={marcar} disabled={ocupado} className={`btn-secundario py-1 text-sm ${id ? "" : "self-start"}`}>
        {id ? "Marcar como lida" : "Marcar todas como lidas"}
      </button>
      <MensagemErro erro={erro} />
    </>
  );
}
