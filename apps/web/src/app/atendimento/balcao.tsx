"use client";

import { useState } from "react";
import { Check, Search, ShoppingBag, UserCheck, X } from "lucide-react";
import { Alerta } from "@/components/alerta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Radio } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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

const opcao =
  "flex cursor-pointer items-center gap-3 rounded-lg border border-borda bg-surface-card p-3 transition-colors hover:border-brand-royal/60 has-checked:border-brand-royal has-checked:bg-brand-royal/5 has-checked:ring-1 has-checked:ring-brand-royal";

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <UserCheck aria-hidden="true" className="size-5 text-brand-royal" />
              Aluno
            </CardTitle>
            {aluno && <Badge variant="default">{aluno.nome}</Badge>}
          </div>
          <CardDescription>Busque pelo nome para selecionar o aluno atendido no balcão.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarAlunos();
                  }
                }}
                placeholder="Nome do aluno"
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" onClick={buscarAlunos}>
              Buscar aluno
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {alunos.map((a) => (
              <label key={a.id} className={opcao}>
                <Radio
                  name="aluno"
                  checked={aluno?.id === a.id}
                  onChange={() => {
                    setAluno(a);
                    setResposta(null);
                  }}
                />
                <span className="flex flex-1 items-center justify-between gap-2 font-medium">
                  <span>{a.nome}</span>
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-normal text-secondary">({a.serie})</span>
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="justify-between">
        <CardContent>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex items-center gap-2 font-heading text-lg font-bold">
              <ShoppingBag aria-hidden="true" className="size-5 text-brand-royal" />
              Itens
            </legend>
            {itens.map((i) => (
              <label key={i.id} className={opcao}>
                <Checkbox checked={i.id in marcados} onChange={(e) => marcar(i.id, e.target.checked ? 1 : null)} />
                <span className="flex-1 font-medium">{i.nome}</span>
                {i.id in marcados && (
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={marcados[i.id]}
                    onChange={(e) => marcar(i.id, Math.min(20, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
                    aria-label={`Quantidade de ${i.nome}`}
                    className="h-8 w-16 px-2 text-center tabular-nums"
                  />
                )}
                <Badge variant="secondary" className="tabular-nums">
                  {reais(i.preco)}
                </Badge>
              </label>
            ))}
          </fieldset>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 bg-surface-muted/40 -mx-5 -mb-5 rounded-b-xl p-5">
          <p className="flex items-center justify-between text-base font-bold" data-testid="total-venda">
            <span>Total</span>
            <span className="text-lg text-brand-teal tabular-nums">{reais(total)}</span>
          </p>
          <Button type="button" size="lg" disabled={!aluno || Object.keys(marcados).length === 0} onClick={() => vender()} className="w-full">
            Registrar venda
          </Button>
        </CardFooter>
      </Card>

      {resposta && (
        <div role="alert" data-testid="resultado-venda" className="md:col-span-2">
          {resposta.erro ? (
            <Alerta estado="BLOQUEADO">{resposta.erro}</Alerta>
          ) : !estado ? (
            <Card className="font-semibold">{TITULO[resposta.resultado]}</Card>
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
                  <Button type="button" onClick={() => vender("CONCLUIR")}>
                    <Check aria-hidden="true" className="size-4" />
                    Concluir venda
                  </Button>
                  <Button type="button" variant="outline" onClick={() => vender("ENCERRAR")}>
                    <X aria-hidden="true" className="size-4" />
                    Encerrar venda
                  </Button>
                </div>
              )}
            </Alerta>
          )}
        </div>
      )}
    </div>
  );
}
