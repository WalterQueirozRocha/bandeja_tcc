import type { ReactNode } from "react";

// Valor nutricional em destaque (usar dentro de <dl>); números tabulares (manual, seção 4).
export function Indicador({ rotulo, valor, destaque = false }: { rotulo: string; valor: ReactNode; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-secondary">{rotulo}</dt>
      <dd className={`text-xl font-bold tabular-nums ${destaque ? "text-brand-teal" : ""}`}>{valor}</dd>
    </div>
  );
}

export const PAINEL = "grid gap-2 rounded-lg border border-borda bg-surface-bg p-3 text-center";
