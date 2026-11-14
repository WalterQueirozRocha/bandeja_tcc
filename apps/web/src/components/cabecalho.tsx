"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogIn, LogOut, Monitor, Moon, Sun } from "lucide-react";
import type { Papel } from "@bandeja/dados";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COOKIE_TEMA, EVENTO_NOTIFICACOES, LINKS, type Tema } from "@/lib/navegacao";
import { PAPEL } from "@/lib/rotulos";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

// D2: o layout não renderiza de novo na navegação; o sino busca o número a cada troca de tela (N4) e após marcar como lida.
function Sino({ inicial }: { inicial: number }) {
  const caminho = usePathname();
  const [naoLidas, setNaoLidas] = useState(inicial);

  useEffect(() => {
    const atualizar = () =>
      fetch("/api/notificacoes/nao-lidas")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { nao_lidas: number } | null) => {
          if (d) setNaoLidas(d.nao_lidas);
        })
        .catch(() => {});
    atualizar();
    window.addEventListener(EVENTO_NOTIFICACOES, atualizar);
    return () => window.removeEventListener(EVENTO_NOTIFICACOES, atualizar);
  }, [caminho]);

  const rotulo = naoLidas === 0 ? "Notificações, nenhuma não lida" : `Notificações, ${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`;
  return (
    <Button asChild variant="outline" size="icon" className="relative">
      <Link href="/notificacoes" aria-label={rotulo} title={rotulo} data-testid="sino">
        <Bell aria-hidden="true" className="size-4" />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-bloqueado px-1 text-center text-[11px] font-bold leading-5 text-white shadow-xs tabular-nums"
          >
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </Link>
    </Button>
  );
}

const ORDEM = ["sistema", "claro", "escuro"] as const;
const NOME_TEMA = { sistema: "do sistema", claro: "claro", escuro: "escuro" };

// A5: um botão de ícone que alterna sistema → claro → escuro (cabe no celular).
function SeletorTema({ tema }: { tema?: Tema }) {
  const [atual, setAtual] = useState<(typeof ORDEM)[number]>(tema ?? "sistema");

  function trocar() {
    const proximo = ORDEM[(ORDEM.indexOf(atual) + 1) % ORDEM.length]!;
    const html = document.documentElement;
    if (proximo === "sistema") {
      delete html.dataset.tema;
      document.cookie = `${COOKIE_TEMA}=; Path=/; Max-Age=0; SameSite=Lax`;
    } else {
      html.dataset.tema = proximo;
      document.cookie = `${COOKIE_TEMA}=${proximo}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    setAtual(proximo);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={trocar}
      aria-label={`Tema ${NOME_TEMA[atual]}. Trocar tema`}
      title={`Tema ${NOME_TEMA[atual]}`}
    >
      {atual === "sistema" && <Monitor aria-hidden="true" className="size-4" />}
      {atual === "claro" && <Sun aria-hidden="true" className="size-4" />}
      {atual === "escuro" && <Moon aria-hidden="true" className="size-4" />}
    </Button>
  );
}

export function Cabecalho({ papel, tema, naoLidas }: { papel: Papel | null; tema?: Tema; naoLidas: number }) {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-borda bg-surface-card/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" aria-label="Bandeja, início" className="hover:no-underline">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {papel && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {PAPEL[papel]}
            </Badge>
          )}
          {papel && <Sino key={papel} inicial={naoLidas} />}
          <SeletorTema tema={tema} />
          {papel ? (
            <Button type="button" variant="outline" size="sm" onClick={sair}>
              <LogOut aria-hidden="true" className="size-3.5" />
              Sair
            </Button>
          ) : (
            caminho !== "/login" && (
              <Button asChild size="sm">
                <Link href="/login">
                  <LogIn aria-hidden="true" className="size-3.5" />
                  Entrar
                </Link>
              </Button>
            )
          )}
        </div>
        {papel && (
          <nav aria-label="Principal" className="w-full overflow-x-auto border-t border-borda/60 pt-2">
            <ul className="flex gap-1">
              {LINKS[papel].map(({ href, rotulo }) => {
                const ativo = caminho === href || caminho.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:no-underline",
                        ativo
                          ? "bg-brand-primary text-white shadow-2xs"
                          : "text-secondary hover:bg-surface-hover hover:text-brand-navy",
                      )}
                    >
                      {rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
