import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, LogIn } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COOKIE_SESSAO, verificarToken } from "@/lib/acesso";
import { LINKS } from "@/lib/navegacao";

export default async function Home() {
  const sessao = await verificarToken((await cookies()).get(COOKIE_SESSAO)?.value);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Card className="flex w-full max-w-lg flex-col items-center gap-5 p-8 text-center">
        <h1>
          <Logo grande />
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-secondary">
          Gestão alimentar escolar com derivação automática de alergênicos e estimativa de carga glicêmica.
        </p>
        {sessao ? (
          <nav aria-label="Acesso rápido" className="grid w-full gap-2.5 sm:grid-cols-2">
            {LINKS[sessao.papel].map(({ href, rotulo }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between rounded-xl border border-borda bg-surface-muted/60 px-4 py-3 text-left text-sm font-semibold text-brand-navy shadow-2xs transition-colors hover:border-brand-royal hover:bg-surface-hover hover:no-underline"
              >
                <span>{rotulo}</span>
                <ArrowRight aria-hidden="true" className="size-4 text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-brand-royal" />
              </Link>
            ))}
          </nav>
        ) : (
          <Button asChild size="lg" className="mt-1">
            <Link href="/login">
              <LogIn aria-hidden="true" className="size-4" />
              Entrar
            </Link>
          </Button>
        )}
      </Card>
    </main>
  );
}
