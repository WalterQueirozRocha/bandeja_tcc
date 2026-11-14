import Link from "next/link";
import { Search, Users } from "lucide-react";
import type { Papel } from "@bandeja/dados";
import { SeloDesabilitado } from "@/components/acao";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { PAPEL, opcoes } from "@/lib/rotulos";
import { listarUsuarios } from "@/repositories/usuarios";
import { NovoUsuario } from "./formularios";

// B1-M: a coordenação gerencia as contas e os vínculos.
export default async function Usuarios({ searchParams }: PageProps<"/usuarios">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "COORDENACAO") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const papel = typeof params.papel === "string" && params.papel in PAPEL ? (params.papel as Papel) : undefined;
  const inativos = params.inativos === "true";
  const lista = await listarUsuarios({ busca: busca || undefined, papel, inativos });

  return (
    <main className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-brand-royal">
          <Users className="size-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">Contas e Vínculos</span>
        </div>
        <h1>Usuários</h1>
      </header>

      <NovoUsuario />

      <Card className="p-4">
        <FiltroAutomatico className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
            <Input name="busca" defaultValue={busca} placeholder="Nome ou e-mail" aria-label="Nome ou e-mail" className="pl-9" />
          </div>
          <NativeSelect name="papel" defaultValue={papel ?? ""} aria-label="Papel" className="w-44">
            <option value="">Todos os papéis</option>
            {opcoes(PAPEL).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </NativeSelect>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda bg-surface-card px-3 py-1.5 text-sm font-medium text-brand-navy transition-colors select-none hover:border-brand-royal/60">
            <Checkbox name="inativos" value="true" defaultChecked={inativos} />
            Mostrar desabilitados
          </label>
        </FiltroAutomatico>
      </Card>

      {lista.length === 0 && (
        <Card className="items-center justify-center py-10 text-center">
          <p className="text-secondary">Nenhum usuário encontrado.</p>
        </Card>
      )}

      {lista.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-borda bg-surface-card p-4 shadow-xs transition-colors hover:border-brand-royal/50"
            >
              <span className="flex-1">
                <Link href={`/usuarios/${u.id}`} className="font-semibold text-brand-navy no-underline hover:text-brand-royal hover:underline">
                  {u.nome}
                </Link>
                <span className="block text-sm text-secondary">
                  {PAPEL[u.papel]}
                  {u.aluno && ` · ${u.aluno.serie}`} · {u.email}
                </span>
              </span>
              <Badge variant="outline">{PAPEL[u.papel]}</Badge>
              {!u.ativo && <SeloDesabilitado />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
