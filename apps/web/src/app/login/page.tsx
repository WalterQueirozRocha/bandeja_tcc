"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [erro, setErro] = useState("");

  async function entrar(form: FormData) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), senha: form.get("senha") }),
    });
    if (res.ok) router.push("/ingredientes");
    else setErro("E-mail ou senha inválidos");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <form action={entrar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          E-mail
          <input name="email" type="email" required className="rounded border p-2" />
        </label>
        <label className="flex flex-col gap-1">
          Senha
          <input name="senha" type="password" required className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-zinc-900 p-2 text-white">
          Entrar
        </button>
        {erro && <p role="alert" className="text-red-600">{erro}</p>}
      </form>
    </main>
  );
}
