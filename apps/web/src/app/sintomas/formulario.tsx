"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Radio } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Grupo = { grupo: string; sintomas: { codigo: string; descricao: string }[] };
type ItemComprado = { venda_id: number; item_cardapio_id: number; comprado_em: string; nome: string };

const NOME_GRUPO: Record<string, string> = {
  PELE: "Pele",
  BOCA_GARGANTA: "Boca e garganta",
  BARRIGA: "Barriga",
  RESPIRACAO: "Respiração",
  OUTROS: "Outros",
};

// Hora local no formato YYYY-MM-DDTHH:mm.
const agoraLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const chave = (i: { venda_id: number; item_cardapio_id: number }) => `${i.venda_id}:${i.item_cardapio_id}`;

export function FormularioSintoma({ alunoId, grupos }: { alunoId: number; grupos: Grupo[] }) {
  const router = useRouter();
  const [sintoma, setSintoma] = useState("");
  const [dataHora, setDataHora] = useState(agoraLocal);
  // D3: compras nas 24 h antes da data e hora informadas; o aluno marca o que comeu (ou escreve o de fora).
  const [comprados, setComprados] = useState<ItemComprado[] | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [externo, setExterno] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const data = new Date(dataHora);
    if (Number.isNaN(data.getTime())) return;
    let atual = true;
    fetch(`/api/alunos/${alunoId}/sintomas/itens?ate=${encodeURIComponent(data.toISOString())}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((itens: ItemComprado[]) => {
        if (!atual) return;
        setComprados(itens);
        setMarcados((m) => m.filter((k) => itens.some((i) => chave(i) === k)));
      })
      .catch(() => atual && setComprados([]));
    return () => {
      atual = false;
    };
  }, [alunoId, dataHora]);

  async function registrar(form: FormData) {
    const observacao = String(form.get("observacao") ?? "").trim();
    const res = await fetch(`/api/alunos/${alunoId}/sintomas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sintoma_codigo: sintoma,
        data_hora: new Date(dataHora).toISOString(),
        observacao: observacao || undefined,
        itens: (comprados ?? []).filter((i) => marcados.includes(chave(i))).map(({ venda_id, item_cardapio_id }) => ({ venda_id, item_cardapio_id })),
        alimento_externo: externo.trim() || undefined,
      }),
    });
    setMensagem(res.ok ? "Registro salvo." : ((await res.json()).erro ?? "Não foi possível salvar."));
    if (res.ok) {
      setSintoma("");
      setMarcados([]);
      setExterno("");
      router.refresh();
    }
  }

  const indicouAlimento = marcados.length > 0 || externo.trim() !== "";

  return (
    <form action={registrar} className="flex flex-col gap-4">
      <Card>
        <Label className="max-w-xs">
          Data e hora
          <DateTimePicker name="data_hora" value={dataHora} onChange={(e) => setDataHora(e.target.value)} required />
        </Label>
      </Card>

      <fieldset className="cartao flex flex-col gap-2.5" data-testid="alimento-sintoma">
        <legend className="flex items-center gap-2 font-heading text-base font-bold">
          <Utensils aria-hidden="true" className="size-4 text-brand-royal" />
          O que você comeu antes?
        </legend>
        <p className="text-sm text-secondary">Marque o que comprou na cantina ou escreva o que comeu de fora. Pelo menos um dos dois.</p>
        {comprados === null && <p className="text-sm text-secondary">Carregando suas compras…</p>}
        {comprados?.length === 0 && <p className="text-sm text-secondary">Nenhuma compra na cantina nas 24 h anteriores.</p>}
        {comprados?.map((i) => (
          <label
            key={chave(i)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-borda bg-surface-card p-2.5 text-sm font-medium transition-colors hover:border-brand-royal/60 has-checked:border-brand-royal has-checked:bg-brand-royal/5 has-checked:ring-1 has-checked:ring-brand-royal"
          >
            <Checkbox
              checked={marcados.includes(chave(i))}
              onChange={(e) => setMarcados(e.target.checked ? [...marcados, chave(i)] : marcados.filter((k) => k !== chave(i)))}
            />
            <span>{i.nome}</span>
            <span className="ml-auto text-xs text-secondary tabular-nums">
              {new Date(i.comprado_em).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" })}
            </span>
          </label>
        ))}
        <Input
          value={externo}
          onChange={(e) => setExterno(e.target.value)}
          maxLength={100}
          aria-label="Alimento de fora da cantina"
          placeholder="De fora da cantina (ex.: lanche de casa)"
        />
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        {grupos.map((g) => (
          <Card key={g.grupo}>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-heading text-base font-bold">{NOME_GRUPO[g.grupo]}</legend>
              {g.sintomas.map((s) => (
                <label
                  key={s.codigo}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-borda bg-surface-card p-2.5 text-sm transition-colors hover:border-brand-royal/60 has-checked:border-brand-royal has-checked:bg-brand-royal/5 has-checked:ring-1 has-checked:ring-brand-royal"
                >
                  <Radio name="sintoma" value={s.codigo} checked={sintoma === s.codigo} onChange={() => setSintoma(s.codigo)} />
                  <span>{s.descricao}</span>
                </label>
              ))}
            </fieldset>
          </Card>
        ))}
      </div>

      {sintoma === "OUTRO" && (
        <Input name="observacao" maxLength={100} aria-label="Observação" placeholder="Descreva em poucas palavras (opcional)" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={!sintoma || !indicouAlimento}>
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Registrar
        </Button>
        {mensagem && (
          <p role="status" className="text-sm font-medium text-brand-navy">
            {mensagem}
          </p>
        )}
      </div>
    </form>
  );
}
