"use client";

import { useState } from "react";
import { Alerta } from "@/components/alerta";

type Item = { id: number; nome: string; preco: number };
type Aluno = { id: number; nome: string; serie: string };
type Resposta = {
  resultado: "CONCLUIDA" | "BLOQUEADA" | "CANCELADA_PELO_OPERADOR" | "CONFIRMACAO_NECESSARIA";
  total: number;
  itens: { nome: string; compatibilidade: string; alertas: string[]; alternativas?: { nome: string }[] }[];
  erro?: string;
};

const TITULO = {
  CONCLUIDA: "Venda concluída",
  BLOQUEADA: "VENDA BLOQUEADA",
  CANCELADA_PELO_OPERADOR: "Venda encerrada",
  CONFIRMACAO_NECESSARIA: "Atenção: confirme com o aluno",
};

const ESTADO = { CONCLUIDA: "COMPATIVEL", BLOQUEADA: "BLOQUEADO", CONFIRMACAO_NECESSARIA: "ATENCAO" } as const;

const reais = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

const opcao = "flex cursor-pointer items-center gap-3 rounded-lg border border-borda bg-surface-card p-3 has-checked:border-brand-royal has-checked:ring-1 has-checked:ring-brand-royal";

export function Balcao({ itens }: { itens: Item[] }) {
  const [busca, setBusca] = useState("");
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  // id do item → quantidade
  const [marcados, setMarcados] = useState<Record<number, number>>({});
  const [resposta, setResposta] = useState<Resposta | null>(null);

  async function buscarAlunos() {
    const res = await fetch(`/api/alunos?${new URLSearchParams({ busca })}`);
    setAlunos(res.ok ? await res.json() : []);
  }

  async function vender(decisao?: "CONCLUIR" | "ENCERRAR") {
    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        aluno_id: aluno!.id,
        itens: Object.entries(marcados).map(([id, quantidade]) => ({ item_cardapio_id: Number(id), quantidade })),
        decisao,
      }),
    });
    const corpo: Resposta = await res.json();
    setResposta(corpo);
    if (corpo.resultado && corpo.resultado !== "CONFIRMACAO_NECESSARIA") setMarcados({});
  }

  const marcar = (id: number, quantidade: number | null) =>
    setMarcados((m) => {
      const novo = { ...m };
      if (quantidade === null) delete novo[id];
      else novo[id] = quantidade;
      return novo;
    });
  const total = itens.reduce((s, i) => s + Math.round(i.preco * 100) * (marcados[i.id] ?? 0), 0) / 100;
  const alertas = resposta?.itens?.flatMap((i) => i.alertas) ?? [];
  const alternativas = [...new Set(resposta?.itens?.flatMap((i) => i.alternativas?.map((a) => a.nome) ?? []) ?? [])];
  const estado = resposta && !resposta.erro && resposta.resultado !== "CANCELADA_PELO_OPERADOR" ? ESTADO[resposta.resultado] : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="cartao flex flex-col gap-3">
        <h2>Aluno</h2>
        <div className="flex gap-2">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do aluno" className="campo min-w-0 flex-1" />
          <button type="button" onClick={buscarAlunos} className="btn-secundario">
            Buscar aluno
          </button>
        </div>
        {alunos.map((a) => (
          <label key={a.id} className={opcao}>
            <input
              type="radio"
              name="aluno"
              checked={aluno?.id === a.id}
              onChange={() => {
                setAluno(a);
                setResposta(null);
              }}
            />
            <span>
              {a.nome} <span className="text-secondary">({a.serie})</span>
            </span>
          </label>
        ))}
      </section>

      <section className="cartao flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-heading text-lg font-bold">Itens</legend>
          {itens.map((i) => (
            <label key={i.id} className={opcao}>
              <input
                type="checkbox"
                checked={i.id in marcados}
                onChange={(e) => marcar(i.id, e.target.checked ? 1 : null)}
              />
              <span className="flex-1">{i.nome}</span>
              {i.id in marcados && (
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={marcados[i.id]}
                  onChange={(e) => marcar(i.id, Math.min(20, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
                  aria-label={`Quantidade de ${i.nome}`}
                  className="campo w-16 text-center"
                />
              )}
              <span className="text-secondary tabular-nums">{reais(i.preco)}</span>
            </label>
          ))}
        </fieldset>
        <p className="flex justify-between font-semibold" data-testid="total-venda">
          <span>Total</span>
          <span className="tabular-nums">{reais(total)}</span>
        </p>
        <button type="button" disabled={!aluno || Object.keys(marcados).length === 0} onClick={() => vender()} className="btn-primario">
          Registrar venda
        </button>
      </section>

      {resposta && (
        <div role="alert" data-testid="resultado-venda" className="md:col-span-2">
          {resposta.erro ? (
            <Alerta estado="BLOQUEADO">{resposta.erro}</Alerta>
          ) : !estado ? (
            <p className="cartao font-semibold">{TITULO[resposta.resultado]}</p>
          ) : (
            <Alerta
              estado={estado}
              titulo={resposta.resultado === "CONCLUIDA" ? `${TITULO.CONCLUIDA} · ${reais(resposta.total)}` : TITULO[resposta.resultado]}
            >
              {alertas.map((a) => (
                <p key={a} className="font-semibold">
                  {a}
                </p>
              ))}
              {alternativas.length > 0 && <p>Sugestões compatíveis: {alternativas.join(", ")}</p>}
              {resposta.resultado === "CONFIRMACAO_NECESSARIA" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => vender("CONCLUIR")} className="btn-primario">
                    Concluir venda
                  </button>
                  <button type="button" onClick={() => vender("ENCERRAR")} className="btn-secundario">
                    Encerrar venda
                  </button>
                </div>
              )}
            </Alerta>
          )}
        </div>
      )}
    </div>
  );
}
