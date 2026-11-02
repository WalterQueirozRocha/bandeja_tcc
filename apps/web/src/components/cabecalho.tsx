"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Papel } from "@bandeja/dados";
import { COOKIE_TEMA, EVENTO_NOTIFICACOES, LINKS, type Tema } from "@/lib/navegacao";
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
    <Link href="/notificacoes" aria-label={rotulo} title={rotulo} className="btn-secundario relative px-2 py-1.5 hover:no-underline" data-testid="sino">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {naoLidas > 0 && (
        <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-bloqueado px-1 text-center text-xs font-bold leading-5 text-white tabular-nums">
          {naoLidas > 99 ? "99+" : naoLidas}
        </span>
      )}
    </Link>
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

  const traco = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  return (
    <button
      type="button"
      onClick={trocar}
      aria-label={`Tema ${NOME_TEMA[atual]}. Trocar tema`}
      title={`Tema ${NOME_TEMA[atual]}`}
      className="btn-secundario px-2 py-1.5"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        {atual === "sistema" && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" {...traco} />
            <path d="M8 20h8M12 16v4" {...traco} />
          </>
        )}
        {atual === "claro" && (
          <>
            <circle cx="12" cy="12" r="4" {...traco} />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...traco} />
          </>
        )}
        {atual === "escuro" && <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" {...traco} />}
      </svg>
    </button>
  );
}

export function Cabecalho({ papel, tema, naoLidas }: { papel: Papel | null; tema?: Tema; naoLidas: number }) {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh(); // o cabeçalho (layout) passa a ver que não há sessão
  }

  return (
    <header className="border-b border-borda bg-surface-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" aria-label="Bandeja, início" className="hover:no-underline">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {papel && <Sino key={papel} inicial={naoLidas} />}
          <SeletorTema tema={tema} />
          {papel ? (
            <button type="button" onClick={sair} className="btn-secundario py-1.5 text-sm">
              Sair
            </button>
          ) : (
            caminho !== "/login" && <Link href="/login" className="btn-primario py-1.5 text-sm hover:no-underline">
              Entrar
            </Link>
          )}
        </div>
        {papel && (
          <nav aria-label="Principal" className="w-full overflow-x-auto">
            <ul className="flex gap-1">
              {LINKS[papel].map(({ href, rotulo }) => {
                const ativo = caminho === href || caminho.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={ativo ? "page" : undefined}
                      className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium hover:no-underline ${
                        ativo ? "bg-brand-primary text-white" : "text-secondary hover:bg-surface-bg hover:text-brand-navy"
                      }`}
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
