"use client";

import { useState } from "react";

type Item = { id: number; nome: string; preco: number };
type Aluno = { id: number; nome: string; serie: string };
type Resposta = {
  resultado: "CONCLUIDA" | "BLOQUEADA" | "CANCELADA_PELO_OPERADOR" | "CONFIRMACAO_NECESSARIA";
  itens: { nome: string; compatibilidade: string; alertas: string[]; alternativas?: { nome: string }[] }[];
  erro?: string;
};

const TITULO = {
  CONCLUIDA: "Venda concluída",
  BLOQUEADA: "VENDA BLOQUEADA",
  CANCELADA_PELO_OPERADOR: "Venda encerrada",
  CONFIRMACAO_NECESSARIA: "Atenção: confirme com o aluno",
};

export function Balcao({ itens }: { itens: Item[] }) {
  const [busca, setBusca] = useState("");
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [resposta, setResposta] = useState<Resposta | null>(null);

  async function buscarAlunos() {
    const res = await fetch(`/api/alunos?${new URLSearchParams({ busca })}`);
    setAlunos(res.ok ? await res.json() : []);
  }

  async function vender(decisao?: "CONCLUIR" | "ENCERRAR") {
    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ aluno_id: aluno!.id, itens: marcados, decisao }),
    });
    const corpo: Resposta = await res.json();
    setResposta(corpo);
    if (corpo.resultado && corpo.resultado !== "CONFIRMACAO_NECESSARIA") setMarcados([]);
  }

  const alertas = resposta?.itens?.flatMap((i) => i.alertas) ?? [];
  const alternativas = [...new Set(resposta?.itens?.flatMap((i) => i.alternativas?.map((a) => a.nome) ?? []) ?? [])];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do aluno" className="flex-1 rounded border p-2" />
        <button type="button" onClick={buscarAlunos} className="rounded border px-4">
          Buscar aluno
        </button>
      </div>
      {alunos.map((a) => (
        <label key={a.id} className="flex gap-2">
          <input type="radio" name="aluno" checked={aluno?.id === a.id} onChange={() => {
              setAluno(a);
              setResposta(null);
            }}
          />
          {a.nome} ({a.serie})
        </label>
      ))}

      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">Itens</legend>
        {itens.map((i) => (
          <label key={i.id} className="flex gap-2">
            <input
              type="checkbox"
              checked={marcados.includes(i.id)}
              onChange={(e) => setMarcados(e.target.checked ? [...marcados, i.id] : marcados.filter((m) => m !== i.id))}
            />
            {i.nome} — R$ {i.preco.toFixed(2).replace(".", ",")}
          </label>
        ))}
      </fieldset>

      <button type="button" disabled={!aluno || marcados.length === 0} onClick={() => vender()} className="rounded bg-zinc-900 p-2 text-white disabled:opacity-40">
        Registrar venda
      </button>

      {resposta && (
        <div role="alert" data-testid="resultado-venda" className={`rounded border-2 p-3 ${resposta.resultado === "BLOQUEADA" ? "border-red-600" : "border-amber-500"}`}>
          {resposta.erro ? (
            <p>{resposta.erro}</p>
          ) : (
            <>
              <p className="text-lg font-bold">{TITULO[resposta.resultado]}</p>
              {alertas.map((a) => (
                <p key={a} className="font-semibold">
                  {a}
                </p>
              ))}
              {alternativas.length > 0 && <p>Sugestões compatíveis: {alternativas.join(", ")}</p>}
              {resposta.resultado === "CONFIRMACAO_NECESSARIA" && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => vender("CONCLUIR")} className="rounded bg-zinc-900 px-4 py-2 text-white">
                    Concluir venda
                  </button>
                  <button type="button" onClick={() => vender("ENCERRAR")} className="rounded border px-4 py-2">
                    Encerrar venda
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
