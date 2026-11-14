import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Valor nutricional em destaque (usar dentro de <dl>); números tabulares (manual, seção 4).
export function Indicador({ rotulo, valor, destaque = false }: { rotulo: string; valor: ReactNode; destaque?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
        destaque ? "border-brand-teal/40 bg-brand-teal/5" : "border-borda/80 bg-surface-card",
      )}
    >
      <dt className="text-xs font-medium text-secondary">{rotulo}</dt>
      <dd className={cn("text-xl font-bold tracking-tight tabular-nums", destaque ? "text-brand-teal" : "text-brand-navy")}>{valor}</dd>
    </div>
  );
}

export const PAINEL = "grid gap-2.5 rounded-xl border border-borda bg-surface-muted/70 p-3";
