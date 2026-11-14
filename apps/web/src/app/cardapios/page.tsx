import Link from "next/link";
import { CalendarPlus, Eye, Pencil } from "lucide-react";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { PERIODO, dataBr } from "@/lib/rotulos";
import { listarCardapios, paraIso } from "@/repositories/cardapios";

// RF05: gestão dos cardápios pelo operador (a consulta com compatibilidade fica em /cardapio).
export default async function Cardapios({ searchParams }: PageProps<"/cardapios">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const data = typeof params.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : undefined;
  const inativos = params.inativos === "true";
  const lista = await listarCardapios({ data, inativos });

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>Cardápios</h1>
          <p className="text-sm text-secondary">Publique e gerencie os cardápios ofertados em cada data e turno escolar.</p>
        </div>
        <Button asChild>
          <Link href="/cardapios/novo">
            <CalendarPlus aria-hidden="true" className="size-4" />
            Publicar cardápio
          </Link>
        </Button>
      </div>

      <Card className="p-3.5">
        <FiltroAutomatico className="flex flex-wrap items-center gap-3">
          <DatePicker name="data" defaultValue={data} aria-label="Data" placeholder="Todas as datas" limpar className="w-44" />
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda bg-surface-card px-3 py-1.5 text-sm font-medium text-brand-navy transition-colors select-none hover:border-brand-royal/60">
            <Checkbox name="inativos" value="true" defaultChecked={inativos} />
            Mostrar desabilitados
          </label>
        </FiltroAutomatico>
      </Card>

      {lista.length === 0 && <Card className="py-8 text-center text-secondary">Nenhum cardápio encontrado.</Card>}
      <ul className="flex flex-col gap-2.5">
        {lista.map((c) => {
          const iso = paraIso(c.data);
          return (
            <li key={c.id} className="cartao flex flex-wrap items-center gap-3 py-3.5">
              <span className="flex flex-1 flex-wrap items-center gap-2.5">
                <span className="font-semibold tabular-nums">{dataBr(iso)}</span>
                <Badge variant="secondary">{PERIODO[c.periodo]}</Badge>
                <span className="text-sm text-secondary">{c._count.itens} itens</span>
              </span>
              {!c.ativo && <SeloDesabilitado />}
              {c.ativo && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/cardapio?data=${iso}&periodo=${c.periodo}`}>
                    <Eye aria-hidden="true" className="size-3.5" />
                    Ver como o aluno vê
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/cardapios/${c.id}`}>
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Editar
                </Link>
              </Button>
              <AcoesRegistro url={`/api/cardapios/${c.id}`} ativo={c.ativo} nome={`o cardápio de ${dataBr(iso)}`} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
