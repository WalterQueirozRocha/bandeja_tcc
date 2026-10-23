"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CorpoErro = { erro?: string; detalhes?: { campo: string; mensagem: string }[] };

// 400 traz os campos inválidos; 422, a regra de negócio.
function mensagemDeErro(corpo: CorpoErro | null) {
  if (!corpo?.erro) return "Não foi possível concluir. Tente de novo.";
  if (!corpo.detalhes?.length) return corpo.erro;
  return `${corpo.erro}: ${corpo.detalhes.map((d) => (d.campo ? `${d.campo} — ${d.mensagem}` : d.mensagem)).join("; ")}`;
}

// A6: chamada à API a partir das telas. Em sucesso, atualiza os dados da página.
export function useAcao() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function executar<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T | null> {
    setOcupado(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const corpo = res.status === 204 ? {} : await res.json().catch(() => null);
      if (!res.ok) {
        setErro(mensagemDeErro(corpo));
        return null;
      }
      setErro("");
      router.refresh();
      return (corpo ?? {}) as T;
    } finally {
      setOcupado(false);
    }
  }

  return { erro, setErro, ocupado, executar };
}

export function MensagemErro({ erro }: { erro: string }) {
  if (!erro) return null;
  return (
    <p role="alert" className="text-sm font-medium text-bloqueado-texto">
      {erro}
    </p>
  );
}

// Excluir (apaga se nunca foi usado; senão desabilita) e habilitar de novo (B2).
export function AcoesRegistro({ url, ativo, nome, voltarPara }: { url: string; ativo: boolean; nome: string; voltarPara?: string }) {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [aviso, setAviso] = useState("");

  async function excluir() {
    if (!confirm(`Excluir ${nome}? Se já estiver em uso, ele será desabilitado (some das consultas, mas continua nos registros).`)) return;
    const r = await executar<{ resultado: "APAGADO" | "DESABILITADO" }>(url, "DELETE");
    if (!r) return;
    if (r.resultado === "APAGADO" && voltarPara) router.push(voltarPara);
    else setAviso(r.resultado === "APAGADO" ? "Apagado." : "Desabilitado: está em uso, por isso foi mantido nos registros.");
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {ativo ? (
        <button type="button" disabled={ocupado} onClick={excluir} className="btn-secundario py-1 text-sm">
          Excluir
        </button>
      ) : (
        <button type="button" disabled={ocupado} onClick={() => executar(`${url}/habilitar`, "POST").then((r) => r && setAviso("Habilitado."))} className="btn-primario py-1 text-sm">
          Habilitar
        </button>
      )}
      {aviso && (
        <span role="status" className="text-sm text-secondary">
          {aviso}
        </span>
      )}
      <MensagemErro erro={erro} />
    </span>
  );
}

// Situação do registro (B2): desabilitado aparece só para quem pode habilitar.
export function SeloDesabilitado() {
  return <span className="rounded-full border border-borda px-2 py-0.5 text-xs font-bold uppercase text-secondary">Desabilitado</span>;
}
