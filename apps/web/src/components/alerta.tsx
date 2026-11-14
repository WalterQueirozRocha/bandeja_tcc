import type { ComponentProps, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// RNF01: todo estado combina cor + ícone geométrico + borda + texto em caixa alta, nunca só a cor.
export type Estado = "BLOQUEADO" | "ATENCAO" | "COMPATIVEL" | "AVISO";

const COR_ICONE: Record<Estado, string> = {
  BLOQUEADO: "text-bloqueado",
  ATENCAO: "text-atencao",
  COMPATIVEL: "text-compativel",
  AVISO: "text-aviso",
};

const VARIANTE: Record<Estado, "bloqueado" | "atencao" | "compativel" | "aviso"> = {
  BLOQUEADO: "bloqueado",
  ATENCAO: "atencao",
  COMPATIVEL: "compativel",
  AVISO: "aviso",
};

export const ROTULO: Record<Exclude<Estado, "AVISO">, string> = {
  BLOQUEADO: "Bloqueado",
  ATENCAO: "Atenção",
  COMPATIVEL: "Compatível",
};

// Ícones em SVG (sem texto), para não alterar o texto lido pelos testes e pelo leitor de tela.
export function Icone({ estado, className = "size-4" }: { estado: Estado; className?: string }) {
  const traco = { stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("shrink-0", COR_ICONE[estado], className)}>
      {estado === "BLOQUEADO" && <path d="M4 4l8 8M12 4l-8 8" {...traco} />}
      {estado === "ATENCAO" && (
        <>
          <path d="M8 2.5v7" {...traco} />
          <circle cx="8" cy="13" r="1.4" fill="currentColor" />
        </>
      )}
      {estado === "COMPATIVEL" && <path d="M3 8.5l3.2 3.2L13 4.8" {...traco} />}
      {estado === "AVISO" && (
        <>
          <circle cx="8" cy="3.3" r="1.4" fill="currentColor" />
          <path d="M8 7v6.5" {...traco} />
        </>
      )}
    </svg>
  );
}

// Selo do item (cardápio): contorno + ícone + rótulo em caixa alta.
export function Selo({ estado, children, className }: { estado: Estado; children: ReactNode; className?: string }) {
  return (
    <Badge variant={VARIANTE[estado]} className={className}>
      <Icone estado={estado} className="size-3" />
      {children}
    </Badge>
  );
}

// Caixa de alerta: borda lateral + fundo + ícone; o título vai em caixa alta.
export function Alerta({ estado, titulo, children, className = "", ...props }: { estado: Estado; titulo?: ReactNode } & ComponentProps<"div">) {
  return (
    <Alert variant={VARIANTE[estado]} className={className} {...props}>
      <Icone estado={estado} className="mt-0.5 size-4" />
      <AlertDescription>
        {titulo && <AlertTitle>{titulo}</AlertTitle>}
        {children}
      </AlertDescription>
    </Alert>
  );
}
