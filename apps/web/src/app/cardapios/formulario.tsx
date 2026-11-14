"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PERIODO, opcoes } from "@/lib/rotulos";

type Item = { preparacao_id: number; preco: number };
type Inicial = { id: number; data: string; periodo: string; itens: Item[] };

// RF05: publicar (criar = publicar) e editar. Retirar um item já vendido o desabilita (B3).
export function FormularioCardapio({
  preparacoes,
  inicial,
  dataPadrao,
}: {
  preparacoes: { id: number; nome: string }[];
  inicial?: Inicial;
  dataPadrao: string;
}) {
  const router = useRouter();
  const { erro, setErro, ocupado, executar } = useAcao();
  const [data, setData] = useState(inicial?.data ?? dataPadrao);
  const [ate, setAte] = useState("");
  const [periodo, setPeriodo] = useState(inicial?.periodo ?? "MANHA");
  const [itens, setItens] = useState<Item[]>(inicial?.itens ?? [{ preparacao_id: 0, preco: 0 }]);
  const mudar = (i: number, item: Partial<Item>) => setItens(itens.map((x, j) => (j === i ? { ...x, ...item } : x)));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (itens.some((i) => !i.preparacao_id)) return setErro("Escolha a preparação de cada item.");
    const corpo = { data, periodo, itens };
    const r = inicial
      ? await executar(`/api/cardapios/${inicial.id}`, "PUT", corpo)
      : await executar("/api/cardapios", "POST", { ...corpo, ...(ate && { ate }) });
    if (r) router.push("/cardapios");
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Período e turno</CardTitle>
          <CardDescription>Defina a data (ou intervalo de dias úteis) e o turno em que este cardápio ficará disponível.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-start gap-4">
            <Label className="w-44">
              Data
              <DatePicker value={data} onChange={(e) => setData(e.target.value)} required />
            </Label>
            {!inicial && (
              <Label className="w-48">
                Até (opcional)
                <DatePicker value={ate} min={data} onChange={(e) => setAte(e.target.value)} limpar placeholder="Selecionar data" />
                <span className="text-xs font-normal text-secondary">Um cardápio por dia útil</span>
              </Label>
            )}
            <Label className="w-36">
              Turno
              <NativeSelect value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {opcoes(PERIODO).map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </NativeSelect>
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card asChild>
        <fieldset>
          <legend className="sr-only">Itens do cardápio</legend>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
            <CardDescription>Escolha as preparações cadastradas e informe o preço unitário de venda.</CardDescription>
          </CardHeader>
          <CardContent>
            {itens.map((item, i) => (
              <div key={i} className="grid gap-2.5 border-b border-borda pb-3 last:border-0 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
                <Label>
                  Preparação
                  <NativeSelect value={item.preparacao_id} onChange={(e) => mudar(i, { preparacao_id: Number(e.target.value) })}>
                    <option value={0}>Escolha…</option>
                    {preparacoes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </NativeSelect>
                </Label>
                <Label>
                  Preço (R$)
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.preco}
                    onChange={(e) => mudar(i, { preco: Number(e.target.value) })}
                    className="tabular-nums"
                  />
                </Label>
                <Button type="button" variant="outline" disabled={itens.length === 1} onClick={() => setItens(itens.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  Remover
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setItens([...itens, { preparacao_id: 0, preco: 0 }])} className="self-start">
              <Plus aria-hidden="true" className="size-4" />
              Adicionar item
            </Button>
          </CardContent>
        </fieldset>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>
          <Save aria-hidden="true" className="size-4" />
          {inicial ? "Salvar alterações" : "Publicar cardápio"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/cardapios")}>
          Cancelar
        </Button>
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}
