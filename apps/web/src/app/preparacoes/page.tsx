import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarPreparacoes } from "@/repositories/preparacoes";

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

// RF02: lista das preparações; o operador cria, edita e exclui.
export default async function Preparacoes({ searchParams }: PageProps<"/preparacoes">) {
  const sessao = await exigirSessaoNaPagina();
  const operador = sessao.papel === "OPERADOR";
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const inativos = operador && params.inativos === "true";
  const lista = await listarPreparacoes(busca || undefined, inativos);

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>Preparações</h1>
          <p className="text-sm text-secondary">Fichas técnicas com cálculo automático de nutrientes, alergênicos e carga glicêmica.</p>
        </div>
        {operador && (
          <Button asChild>
            <Link href="/preparacoes/nova">
              <Plus aria-hidden="true" className="size-4" />
              Nova preparação
            </Link>
          </Button>
        )}
      </div>

      <Card className="p-3.5">
        <FiltroAutomatico className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
            <Input name="busca" defaultValue={busca} placeholder="Buscar por nome" aria-label="Buscar por nome" className="pl-9" />
          </div>
          {operador && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda bg-surface-card px-3 py-1.5 text-sm font-medium text-brand-navy transition-colors select-none hover:border-brand-royal/60">
              <Checkbox name="inativos" value="true" defaultChecked={inativos} />
              Mostrar desabilitadas
            </label>
          )}
        </FiltroAutomatico>
      </Card>

      {lista.length === 0 && <Card className="py-8 text-center text-secondary">Nenhuma preparação encontrada.</Card>}
      <ul className="grid gap-3 md:grid-cols-2">
        {lista.map((p) => (
          <li key={p.id} className="cartao flex flex-wrap items-center gap-3 py-3.5">
            <span className="flex-1">
              <Link href={`/preparacoes/${p.id}`} className="font-semibold text-brand-navy hover:text-brand-royal">
                {p.nome}
              </Link>
              <span className="block text-sm text-secondary tabular-nums">
                Porção {num(p.porcao_g)} g · peso final {num(p.peso_final_calculado)} g
              </span>
            </span>
            {!p.ativo && <SeloDesabilitado />}
            {operador && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/preparacoes/${p.id}/editar`}>
                    <Pencil aria-hidden="true" className="size-3.5" />
                    Editar
                  </Link>
                </Button>
                <AcoesRegistro url={`/api/preparacoes/${p.id}`} ativo={p.ativo} nome={p.nome} />
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
