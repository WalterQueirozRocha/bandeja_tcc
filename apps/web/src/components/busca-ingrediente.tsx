"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GRUPO_ALIMENTAR, ORIGEM_INGREDIENTE } from "@/lib/rotulos";

export type IngredienteEncontrado = { id: number; nome: string; grupo_alimentar: string; origem: string; modo_preparo: string | null };

// Busca na TACO e nos industrializados (GET /api/ingredientes). Não é um <form>: pode ficar dentro de outro.
export function BuscaIngrediente({
  rotulo,
  onEscolher,
  filtro,
}: {
  rotulo: string;
  onEscolher: (i: IngredienteEncontrado) => void;
  filtro?: (i: IngredienteEncontrado) => boolean;
}) {
  const [busca, setBusca] = useState("");
  const [resultado, setResultado] = useState<IngredienteEncontrado[] | null>(null);

  async function buscar() {
    if (!busca.trim()) return;
    const res = await fetch(`/api/ingredientes?${new URLSearchParams({ busca, tamanho: "20" })}`);
    const itens: IngredienteEncontrado[] = res.ok ? (await res.json()).itens : [];
    setResultado(filtro ? itens.filter(filtro) : itens);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder={rotulo}
            aria-label={rotulo}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={buscar}>
          Buscar
        </Button>
      </div>
      {resultado && (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-xl border border-borda bg-surface-muted/60 p-2">
          {resultado.length === 0 && <li className="px-2 py-3 text-center text-sm text-secondary">Nada encontrado.</li>}
          {resultado.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onEscolher(i);
                  setResultado(null);
                  setBusca("");
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-borda bg-surface-card p-2.5 text-left text-sm shadow-2xs transition-colors hover:border-brand-royal hover:bg-surface-hover"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold text-brand-navy">{i.nome}</span>
                  <span className="text-xs text-secondary">{GRUPO_ALIMENTAR[i.grupo_alimentar]}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{ORIGEM_INGREDIENTE[i.origem]}</Badge>
                  <Plus aria-hidden="true" className="size-4 text-brand-royal" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
