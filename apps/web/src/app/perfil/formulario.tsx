"use client";

import { useState } from "react";
import { Plus, Save, ShieldOff, Trash2 } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import { Selo } from "@/components/alerta";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { EXCLUSAO_ESTRITA, TIPO_CATEGORIA, TIPO_RESTRICAO, opcoes } from "@/lib/rotulos";

type Restricao = { categoria_codigo: string; tipo: string; limite_notificacao: number | null };
type Categoria = { codigo: string; nome: string; tipo: string };

// Ponto 6 do plano das telas (validar com a orientadora).
const TEXTO_CONSENTIMENTO =
  "Declaro que sou responsável por este aluno e autorizo o registro das restrições alimentares abaixo, usadas apenas para alertar a cantina no momento da venda. Posso revogar esta autorização a qualquer momento, e o perfil será apagado.";

const LIMITE_PADRAO = 2;

export function FormularioPerfil({
  alunoId,
  consentido,
  categorias,
  inicial,
}: {
  alunoId: number;
  consentido: boolean;
  categorias: Categoria[];
  inicial: Restricao[];
}) {
  const { erro, setErro, ocupado, executar } = useAcao();
  const [lista, setLista] = useState(inicial);
  const [nova, setNova] = useState<Restricao>({ categoria_codigo: "", tipo: "ALERGIA", limite_notificacao: null });
  const [aceite, setAceite] = useState(false);
  const [aviso, setAviso] = useState("");
  const nomeDa = (codigo: string) => categorias.find((c) => c.codigo === codigo)?.nome ?? codigo;
  const estrita = (tipo: string) => EXCLUSAO_ESTRITA.includes(tipo);

  function mudarTipo(tipo: string) {
    // Doença celíaca só existe na categoria Glúten.
    setNova({
      ...nova,
      tipo,
      categoria_codigo: tipo === "DOENCA_CELIACA" ? "GLUTEN" : nova.categoria_codigo,
      limite_notificacao: estrita(tipo) ? null : LIMITE_PADRAO,
    });
  }

  function adicionar() {
    if (!nova.categoria_codigo) return setErro("Escolha a categoria.");
    if (lista.some((r) => r.categoria_codigo === nova.categoria_codigo)) return setErro("Essa categoria já está no perfil.");
    setErro("");
    setLista([...lista, nova]);
    setNova({ ...nova, categoria_codigo: "" });
  }

  async function salvar() {
    const restricoes = lista.map((r) => ({
      categoria_codigo: r.categoria_codigo,
      tipo: r.tipo,
      ...(!estrita(r.tipo) && { limite_notificacao: r.limite_notificacao ?? LIMITE_PADRAO }),
    }));
    const ok = await executar(`/api/alunos/${alunoId}/perfil`, "PUT", { ...(!consentido && { consentimento: aceite }), restricoes });
    setAviso(ok ? "Perfil salvo." : "");
  }

  async function revogar() {
    if (await executar(`/api/alunos/${alunoId}/perfil`, "DELETE")) {
      setLista([]);
      setAviso("Consentimento revogado e perfil apagado.");
    }
  }

  const porTipo = Object.keys(TIPO_CATEGORIA).map((tipo) => ({ tipo, itens: categorias.filter((c) => c.tipo === tipo) }));

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2.5">
        {lista.length === 0 && <li className="rounded-xl border border-borda bg-surface-card py-6 text-center text-secondary">Nenhuma restrição declarada.</li>}
        {lista.map((r) => (
          <li key={r.categoria_codigo} className="cartao flex flex-wrap items-center gap-3 py-3.5">
            <span className="flex-1">
              <span className="font-semibold">{nomeDa(r.categoria_codigo)}</span>
              <span className="block text-sm text-secondary">{TIPO_RESTRICAO[r.tipo]}</span>
            </span>
            {estrita(r.tipo) ? (
              <Selo estado="BLOQUEADO">Bloqueia a venda</Selo>
            ) : (
              <label className="flex items-center gap-2 text-sm font-medium">
                Limite por semana
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={r.limite_notificacao ?? LIMITE_PADRAO}
                  onChange={(e) => setLista(lista.map((x) => (x === r ? { ...x, limite_notificacao: Number(e.target.value) } : x)))}
                  className="h-8 w-20 text-center tabular-nums"
                />
              </label>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setLista(lista.filter((x) => x !== r))}>
              <Trash2 aria-hidden="true" className="size-3.5" />
              Remover
            </Button>
          </li>
        ))}
      </ul>

      <Card asChild>
        <fieldset>
          <legend className="sr-only">Adicionar restrição</legend>
          <CardHeader>
            <CardTitle>Adicionar restrição</CardTitle>
            <CardDescription>
              Alergia e doença celíaca <strong>bloqueiam</strong> a venda (inclusive em &quot;pode conter&quot;). Intolerância, restrição religiosa e preferência
              geram um <strong>alerta</strong> no balcão e contam no limite da semana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Label>
                Tipo
                <NativeSelect value={nova.tipo} onChange={(e) => mudarTipo(e.target.value)}>
                  {opcoes(TIPO_RESTRICAO).map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <Label>
                Categoria
                <NativeSelect
                  value={nova.categoria_codigo}
                  disabled={nova.tipo === "DOENCA_CELIACA"}
                  onChange={(e) => setNova({ ...nova, categoria_codigo: e.target.value })}
                >
                  <option value="">Escolha…</option>
                  {porTipo.map((g) => (
                    <optgroup key={g.tipo} label={TIPO_CATEGORIA[g.tipo]}>
                      {g.itens.map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.nome}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>
              </Label>
              <Button type="button" variant="outline" onClick={adicionar}>
                <Plus aria-hidden="true" className="size-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </fieldset>
      </Card>

      {!consentido && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda bg-surface-card p-4 text-sm leading-relaxed shadow-2xs transition-colors has-checked:border-brand-royal has-checked:bg-brand-royal/5">
          <Checkbox checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1" />
          <span>{TEXTO_CONSENTIMENTO}</span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={salvar} disabled={ocupado || (!consentido && !aceite)}>
          <Save aria-hidden="true" className="size-4" />
          Salvar perfil
        </Button>
        {consentido && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={ocupado}>
                <ShieldOff aria-hidden="true" className="size-4" />
                Revogar consentimento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revogar o consentimento?</AlertDialogTitle>
                <AlertDialogDescription>
                  O perfil de saúde deste aluno será apagado imediatamente e os itens do cardápio deixarão de exibir alertas personalizados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={revogar} className="bg-bloqueado text-white hover:opacity-90">
                  Confirmar revogação
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {aviso && (
          <span role="status" className="text-sm font-medium text-brand-navy">
            {aviso}
          </span>
        )}
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}
