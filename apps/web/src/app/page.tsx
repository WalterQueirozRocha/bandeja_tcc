import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { COOKIE_SESSAO, verificarToken } from "@/lib/acesso";
import { LINKS } from "@/lib/navegacao";

export default async function Home() {
  const sessao = await verificarToken((await cookies()).get(COOKIE_SESSAO)?.value);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <h1>
        <Logo grande />
      </h1>
      <p className="max-w-md text-secondary">
        Gestão alimentar escolar com derivação automática de alergênicos e estimativa de carga glicêmica.
      </p>
      {sessao ? (
        <nav aria-label="Acesso rápido" className="grid w-full max-w-md gap-3 sm:grid-cols-2">
          {LINKS[sessao.papel].map(({ href, rotulo }) => (
            <Link key={href} href={href} className="cartao font-semibold text-brand-navy hover:border-brand-royal hover:no-underline">
              {rotulo}
            </Link>
          ))}
        </nav>
      ) : (
        <Link href="/login" className="btn-primario hover:no-underline">
          Entrar
        </Link>
      )}
    </main>
  );
}
