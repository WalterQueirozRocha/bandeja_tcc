"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { telaInicial } from "@/lib/navegacao";

export default function Login() {
  const router = useRouter();
  const [erro, setErro] = useState("");

  async function entrar(form: FormData) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), senha: form.get("senha") }),
    });
    if (!res.ok) return setErro("E-mail ou senha inválidos");
    router.push(telaInicial((await res.json()).usuario.papel)); // A1: a primeira tela do perfil
    router.refresh(); // o cabeçalho (layout) passa a ver a sessão
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="cartao flex w-full max-w-sm flex-col gap-4 p-6">
        <h1>Entrar</h1>
        <form action={entrar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="username" className="campo" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Senha
            <input name="senha" type="password" required autoComplete="current-password" className="campo" />
          </label>
          <button type="submit" className="btn-primario">
            Entrar
          </button>
          {erro && (
            <p role="alert" className="text-sm font-medium text-bloqueado-texto">
              {erro}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
