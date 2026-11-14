"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, KeyRound, LogIn } from "lucide-react";
import { MensagemErro } from "@/components/acao";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { telaInicial } from "@/lib/navegacao";

export default function Login() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [esqueci, setEsqueci] = useState(false);
  const [aviso, setAviso] = useState("");

  async function entrar(form: FormData) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), senha: form.get("senha") }),
    });
    if (!res.ok) return setErro("E-mail ou senha inválidos");
    router.push(telaInicial((await res.json()).usuario.papel));
    router.refresh();
  }

  // Sem e-mail: o pedido vira notificação para a coordenação, que redefine a senha.
  async function pedirNovaSenha(form: FormData) {
    const res = await fetch("/api/auth/esqueci-senha", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    setAviso(res.ok ? (await res.json()).mensagem : "Não foi possível enviar o pedido. Tente de novo.");
  }

  if (esqueci)
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle asChild>
              <h1>Esqueci a senha</h1>
            </CardTitle>
            <CardDescription>
              Informe o seu e-mail. A coordenação da escola recebe o pedido e redefine a sua senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={pedirNovaSenha} className="flex flex-col gap-3.5">
              <Label>
                E-mail
                <Input name="email" type="email" required autoComplete="username" placeholder="seu.email@escola.br" />
              </Label>
              <Button type="submit" className="w-full">
                <KeyRound aria-hidden="true" className="size-4" />
                Pedir nova senha
              </Button>
              {aviso && (
                <p role="status" className="rounded-lg border border-borda bg-surface-muted px-3 py-2 text-sm text-brand-navy">
                  {aviso}
                </p>
              )}
            </form>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0"
              onClick={() => {
                setEsqueci(false);
                setAviso("");
              }}
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Voltar para entrar
            </Button>
          </CardFooter>
        </Card>
      </main>
    );

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-start gap-3">
          <Logo />
          <div className="flex flex-col gap-1">
            <CardTitle asChild>
              <h1>Entrar</h1>
            </CardTitle>
            <CardDescription>Acesse a plataforma com o seu e-mail e senha institucional.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={entrar} className="flex flex-col gap-3.5">
            <Label>
              E-mail
              <Input name="email" type="email" required autoComplete="username" placeholder="seu.email@escola.br" />
            </Label>
            <Label>
              Senha
              <Input name="senha" type="password" required autoComplete="current-password" />
            </Label>
            <Button type="submit" className="mt-1 w-full">
              <LogIn aria-hidden="true" className="size-4" />
              Entrar
            </Button>
            <MensagemErro erro={erro} />
          </form>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setEsqueci(true)}>
            Esqueci minha senha
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
