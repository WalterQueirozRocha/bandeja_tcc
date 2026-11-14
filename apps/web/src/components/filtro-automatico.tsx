"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function FiltroAutomatico({ className, children, ...props }: React.ComponentProps<"form">) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = React.useRef<HTMLFormElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendente, iniciarTransicao] = React.useTransition();

  const aplicar = React.useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const dados = new FormData(form);
    const params = new URLSearchParams();
    for (const [chave, valor] of dados.entries()) {
      const texto = String(valor).trim();
      if (texto !== "") params.set(chave, texto);
    }
    const query = params.toString();
    iniciarTransicao(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [pathname, router]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function aoAlterar(e: React.FormEvent<HTMLFormElement>) {
    const alvo = e.target as HTMLElement | null;
    if (!alvo) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (alvo instanceof HTMLInputElement && (alvo.type === "text" || alvo.type === "search")) {
      timerRef.current = setTimeout(aplicar, 300);
    } else {
      aplicar();
    }
  }

  return (
    <form
      ref={formRef}
      aria-busy={pendente}
      onSubmit={(e) => {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        aplicar();
      }}
      onChange={aoAlterar}
      className={cn("transition-opacity", pendente && "opacity-75", className)}
      {...props}
    >
      {children}
    </form>
  );
}
