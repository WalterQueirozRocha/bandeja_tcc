"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <p role="alert" className="inline-flex items-center gap-1.5 rounded-md border border-bloqueado/40 bg-bloqueado-fundo px-2.5 py-1.5 text-sm font-medium text-bloqueado-texto">
      <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-bloqueado" />
      <span>{erro}</span>
    </p>
  );
}

// Excluir (apaga se nunca foi usado; senão desabilita) e habilitar de novo (B2).
export function AcoesRegistro({ url, ativo, nome, voltarPara }: { url: string; ativo: boolean; nome: string; voltarPara?: string }) {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [aviso, setAviso] = useState("");

  async function excluir() {
    const r = await executar<{ resultado: "APAGADO" | "DESABILITADO" }>(url, "DELETE");
    if (!r) return;
    if (r.resultado === "APAGADO" && voltarPara) router.push(voltarPara);
    else setAviso(r.resultado === "APAGADO" ? "Apagado." : "Desabilitado: está em uso, por isso foi mantido nos registros.");
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {ativo ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={ocupado}>
              <Trash2 aria-hidden="true" className="size-3.5" />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {nome}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se já estiver em uso, ele será apenas desabilitado (some das consultas, mas continua preservado nos registros históricos).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={excluir}>
                Confirmar exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={ocupado}
          onClick={() => executar(`${url}/habilitar`, "POST").then((r) => r && setAviso("Habilitado."))}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Habilitar
        </Button>
      )}
      {aviso && (
        <span role="status" className="inline-flex items-center gap-1 text-sm text-secondary">
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-compativel" />
          {aviso}
        </span>
      )}
      <MensagemErro erro={erro} />
    </span>
  );
}

// Situação do registro (B2): desabilitado aparece só para quem pode habilitar.
export function SeloDesabilitado() {
  return (
    <Badge variant="outline" className="uppercase">
      Desabilitado
    </Badge>
  );
}
