"use client";

import { useState } from "react";
import { GRUPO_ALIMENTAR, ORIGEM_INGREDIENTE } from "@/lib/rotulos";

export type IngredienteEncontrado = { id: number; nome: string; grupo_alimentar: string; origem: string; modo_preparo: string | null };

// Busca na TACO e nos industrializados (GET /api/ingredientes). Não é um <form>: pode ficar dentro de outro.
export function BuscaIngrediente({ rotulo, onEscolher, filtro }: { rotulo: string; onEscolher: (i: IngredienteEncontrado) => void; filtro?: (i: IngredienteEncontrado) => boolean }) {
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
        <input
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
          className="campo min-w-0 flex-1"
        />
        <button type="button" onClick={buscar} className="btn-secundario">
          Buscar
        </button>
      </div>
      {resultado && (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {resultado.length === 0 && <li className="text-sm text-secondary">Nada encontrado.</li>}
          {resultado.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onEscolher(i);
                  setResultado(null);
                  setBusca("");
                }}
                className="w-full rounded-lg border border-borda bg-surface-card p-2 text-left text-sm hover:border-brand-royal"
              >
                <span className="font-medium">{i.nome}</span>
                <span className="block text-xs text-secondary">
                  {GRUPO_ALIMENTAR[i.grupo_alimentar]} · {ORIGEM_INGREDIENTE[i.origem]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
