import type { ComponentProps, ReactNode } from "react";

// RNF01: todo estado combina cor + ícone geométrico + borda + texto em caixa alta, nunca só a cor.
export type Estado = "BLOQUEADO" | "ATENCAO" | "COMPATIVEL" | "AVISO";

const COR: Record<Estado, { borda: string; fundo: string; texto: string; icone: string }> = {
  BLOQUEADO: { borda: "border-bloqueado", fundo: "bg-bloqueado-fundo", texto: "text-bloqueado-texto", icone: "text-bloqueado" },
  ATENCAO: { borda: "border-atencao", fundo: "bg-atencao-fundo", texto: "text-atencao-texto", icone: "text-atencao" },
  COMPATIVEL: { borda: "border-compativel", fundo: "bg-compativel-fundo", texto: "text-compativel-texto", icone: "text-compativel" },
  AVISO: { borda: "border-aviso", fundo: "bg-aviso-fundo", texto: "text-aviso-texto", icone: "text-aviso" },
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
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${COR[estado].icone} ${className}`}>
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
export function Selo({ estado, children }: { estado: Estado; children: ReactNode }) {
  const c = COR[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-bold uppercase ${c.borda} ${c.fundo} ${c.texto}`}>
      <Icone estado={estado} className="size-3" />
      {children}
    </span>
  );
}

// Caixa de alerta: borda lateral + fundo + ícone; o título vai em caixa alta.
export function Alerta({ estado, titulo, children, className = "", ...props }: { estado: Estado; titulo?: ReactNode } & ComponentProps<"div">) {
  const c = COR[estado];
  return (
    <div className={`flex gap-2 rounded-lg border-l-4 p-3 ${c.borda} ${c.fundo} ${c.texto} ${className}`} {...props}>
      <Icone estado={estado} className="mt-0.5 size-4" />
      <div className="flex flex-1 flex-col gap-1">
        {titulo && <p className="font-bold uppercase">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}
