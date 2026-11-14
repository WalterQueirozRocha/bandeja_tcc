import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { SeloDesabilitado } from "@/components/acao";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { GRUPO_ALIMENTAR, ORIGEM_INGREDIENTE } from "@/lib/rotulos";
import { listarIngredientes } from "@/repositories/ingredientes";

const TAMANHO = 50;

export default async function Ingredientes({ searchParams }: PageProps<"/ingredientes">) {
  const sessao = await exigirSessaoNaPagina();
  const operador = sessao.papel === "OPERADOR";
  const editor = operador || sessao.papel === "COORDENACAO"; // cadastram alimentos (04/11)

  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const inativos = operador && params.inativos === "true";
  const { total, itens } = await listarIngredientes({ busca: busca || undefined, inativos, pagina, tamanho: TAMANHO });
  const link = (p: number) => `/ingredientes?${new URLSearchParams({ busca, pagina: String(p), ...(inativos && { inativos: "true" }) })}`;

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>Ingredientes</h1>
          <p className="text-sm text-secondary">Alimentos da TACO, rótulos industrializados e tabelas complementares.</p>
        </div>
        {editor && (
          <Button asChild>
            <Link href="/ingredientes/novo">
              <Plus aria-hidden="true" className="size-4" />
              Novo alimento
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
              Mostrar desabilitados
            </label>
          )}
        </FiltroAutomatico>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-secondary tabular-nums">{total} encontrados</p>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Marcadores</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">
                  <Link href={`/ingredientes/${i.id}`} className="text-brand-navy hover:text-brand-royal">
                    {i.nome}
                  </Link>{" "}
                  {!i.ativo && <SeloDesabilitado />}
                </TableCell>
                <TableCell className="text-secondary">{GRUPO_ALIMENTAR[i.grupo_alimentar]}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ORIGEM_INGREDIENTE[i.origem]}</Badge>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {i.origem !== "ROTULO" && !i.marcacao_conferida_em && <Badge variant="outline">Pendente</Badge>}
                    {i.origem !== "ROTULO" && i.marcacao_conferida_em && i.marcadores.length === 0 && (
                      <Badge variant="outline">Sem alergênico</Badge>
                    )}
                    {i.marcadores.map((m) => (
                      <span
                        key={m.categoria_codigo}
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                          m.presenca === "PODE_CONTER"
                            ? "border-atencao/60 bg-atencao-fundo text-atencao-texto"
                            : "border-bloqueado/60 bg-bloqueado-fundo text-bloqueado-texto"
                        }`}
                      >
                        {m.categoria_codigo}
                        {m.presenca === "PODE_CONTER" && " (pode conter)"}
                      </span>
                    ))}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <nav aria-label="Páginas" className="flex gap-2">
        {pagina > 1 && (
          <Button asChild variant="outline" size="sm">
            <a href={link(pagina - 1)}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              Anterior
            </a>
          </Button>
        )}
        {pagina * TAMANHO < total && (
          <Button asChild variant="outline" size="sm">
            <a href={link(pagina + 1)}>
              Próxima
              <ChevronRight aria-hidden="true" className="size-4" />
            </a>
          </Button>
        )}
      </nav>
    </main>
  );
}
