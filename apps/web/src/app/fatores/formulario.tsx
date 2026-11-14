"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { GRUPO_ALIMENTAR, MODO_PREPARO, opcoes } from "@/lib/rotulos";

type Fator = { id: number; grupo_alimentar: string; modo_preparo: string; fator_coccao: number; referencia: string };

const MODOS = opcoes(MODO_PREPARO).filter((o) => o.valor !== "CRU");
const REFERENCIA_PADRAO = "Silva et al. (2012)";

// M1: novo fator (um por grupo e modo; cru usa sempre 1).
export function NovoFator() {
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState({ grupo_alimentar: "CEREAIS", modo_preparo: "COZIDO", fator_coccao: "", referencia: REFERENCIA_PADRAO });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await executar("/api/fatores", "POST", { ...dados, fator_coccao: Number(dados.fator_coccao.replace(",", ".")) });
    if (ok) setDados({ ...dados, fator_coccao: "" });
  }

  return (
    <Card asChild>
      <form onSubmit={salvar}>
        <CardHeader>
          <CardTitle>Novo fator</CardTitle>
          <CardDescription>Cadastre o fator térmico de rendimento por grupo alimentar e modo de preparo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <Label>
              Grupo
              <NativeSelect value={dados.grupo_alimentar} onChange={(e) => setDados({ ...dados, grupo_alimentar: e.target.value })}>
                {opcoes(GRUPO_ALIMENTAR).map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label>
              Modo
              <NativeSelect value={dados.modo_preparo} onChange={(e) => setDados({ ...dados, modo_preparo: e.target.value })}>
                {MODOS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label>
              Fator
              <Input
                inputMode="decimal"
                value={dados.fator_coccao}
                onChange={(e) => setDados({ ...dados, fator_coccao: e.target.value })}
                required
                className="tabular-nums"
              />
            </Label>
            <Label>
              Referência
              <Input value={dados.referencia} onChange={(e) => setDados({ ...dados, referencia: e.target.value })} required />
            </Label>
          </div>
          <Button type="submit" disabled={ocupado} className="self-start">
            <Plus aria-hidden="true" className="size-4" />
            Adicionar fator
          </Button>
          <MensagemErro erro={erro} />
        </CardContent>
      </form>
    </Card>
  );
}

// Edita o valor e a referência; remover é recusado se alguma preparação depende do fator.
export function LinhaFator({ fator }: { fator: Fator }) {
  const { erro, ocupado, executar } = useAcao();
  const [valor, setValor] = useState(String(fator.fator_coccao));
  const [referencia, setReferencia] = useState(fator.referencia);
  const [aviso, setAviso] = useState("");

  async function salvar() {
    const ok = await executar(`/api/fatores/${fator.id}`, "PUT", { ...fator, fator_coccao: Number(valor.replace(",", ".")), referencia });
    setAviso(ok ? "Salvo." : "");
  }

  return (
    <li className="cartao flex flex-col gap-2 py-3.5">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_7rem_1fr_auto_auto] sm:items-end">
        <span className="flex flex-wrap items-center gap-2 font-semibold sm:pb-2">
          <span>{GRUPO_ALIMENTAR[fator.grupo_alimentar]}</span>
          <Badge variant="secondary">{MODO_PREPARO[fator.modo_preparo]}</Badge>
        </span>
        <Label>
          Fator
          <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="tabular-nums" />
        </Label>
        <Label>
          Referência
          <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </Label>
        <Button type="button" variant="outline" disabled={ocupado} onClick={salvar}>
          <Save aria-hidden="true" className="size-3.5" />
          Salvar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={ocupado}>
              <Trash2 aria-hidden="true" className="size-3.5" />
              Remover
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover este fator?</AlertDialogTitle>
              <AlertDialogDescription>
                O modo {MODO_PREPARO[fator.modo_preparo]?.toLowerCase()} deixará de ser oferecido nas fichas técnicas para o grupo{" "}
                {GRUPO_ALIMENTAR[fator.grupo_alimentar]?.toLowerCase()}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => executar(`/api/fatores/${fator.id}`, "DELETE")} className="bg-bloqueado text-white hover:opacity-90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {aviso && (
        <span role="status" className="text-sm font-medium text-brand-navy">
          {aviso}
        </span>
      )}
      <MensagemErro erro={erro} />
    </li>
  );
}
