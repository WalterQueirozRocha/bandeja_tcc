import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Cabecalho } from "@/components/cabecalho";
import { COOKIE_SESSAO, verificarToken } from "@/lib/acesso";
import { COOKIE_TEMA, lerTema } from "@/lib/navegacao";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["700", "800"] });

export const metadata: Metadata = {
  title: "Bandeja",
  description: "Gestão alimentar escolar",
  icons: { icon: "/logo-bandeja-icone.svg" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const sessao = await verificarToken(jar.get(COOKIE_SESSAO)?.value);
  const tema = lerTema(jar.get(COOKIE_TEMA)?.value);

  return (
    <html lang="pt-BR" data-tema={tema} className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Cabecalho papel={sessao?.papel ?? null} tema={tema} />
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
