"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Grupo = { grupo: string; sintomas: { codigo: string; descricao: string }[] };

const NOME_GRUPO: Record<string, string> = {
  PELE: "Pele",
  BOCA_GARGANTA: "Boca e garganta",
  BARRIGA: "Barriga",
  RESPIRACAO: "Respiração",
  OUTROS: "Outros",
};

// Hora local no formato do <input type="datetime-local">.
const agoraLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function FormularioSintoma({ alunoId, grupos }: { alunoId: number; grupos: Grupo[] }) {
  const router = useRouter();
  const [sintoma, setSintoma] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function registrar(form: FormData) {
    const observacao = String(form.get("observacao") ?? "").trim();
    const res = await fetch(`/api/alunos/${alunoId}/sintomas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sintoma_codigo: sintoma,
        data_hora: new Date(String(form.get("data_hora"))).toISOString(),
        observacao: observacao || undefined,
      }),
    });
    setMensagem(res.ok ? "Registro salvo." : ((await res.json()).erro ?? "Não foi possível salvar."));
    if (res.ok) {
      setSintoma("");
      router.refresh();
    }
  }

  return (
    <form action={registrar} className="flex flex-col gap-3">
      {grupos.map((g) => (
        <fieldset key={g.grupo} className="flex flex-col gap-1">
          <legend className="font-semibold">{NOME_GRUPO[g.grupo]}</legend>
          {g.sintomas.map((s) => (
            <label key={s.codigo} className="flex gap-2">
              <input type="radio" name="sintoma" value={s.codigo} checked={sintoma === s.codigo} onChange={() => setSintoma(s.codigo)} />
              {s.descricao}
            </label>
          ))}
        </fieldset>
      ))}
      {sintoma === "OUTRO" && (
        <input name="observacao" maxLength={100} required placeholder="Descreva em poucas palavras" className="rounded border p-2" />
      )}
      <label className="flex flex-col gap-1">
        Data e hora
        <input type="datetime-local" name="data_hora" defaultValue={agoraLocal()} required className="rounded border p-2" />
      </label>
      <button type="submit" disabled={!sintoma} className="rounded bg-zinc-900 p-2 text-white disabled:opacity-40">
        Registrar
      </button>
      {mensagem && <p role="status">{mensagem}</p>}
    </form>
  );
}
