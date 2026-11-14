import Link from "next/link";
import { Clock } from "lucide-react";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Indicador, PAINEL } from "@/components/indicador";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { alunoDaConsulta } from "@/services/alunos";
import { ErroNegocio } from "@/services/erros";
import { lerHistorico } from "@/services/vendas";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// Histórico de consumo do aluno (D7) com a CG da refeição (P15).
export default async function Historico({ searchParams }: PageProps<"/historico">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "ALUNO" && sessao.papel !== "RESPONSAVEL") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const alunos = sessao.papel === "RESPONSAVEL" ? await alunosDoResponsavel(sessao.id) : [];
  const alunoParam = Number(params.aluno_id) || alunos[0]?.id;

  let vendas;
  try {
    const aluno_id = await alunoDaConsulta(sessao, alunoParam);
    vendas = aluno_id === null ? [] : await lerHistorico(aluno_id);
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    return <main className="p-4">{e.message}</main>;
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Histórico de consumo</h1>
          <p className="text-sm text-secondary">
            CG estimada pelos modelos de Rytz et al. (2019) e da FAO/OMS (1998). As hipóteses de cada item estão na ficha da preparação (clique no nome).
          </p>
        </div>
        {alunos.length > 1 && (
          <FiltroAutomatico className="flex items-center gap-2">
            <NativeSelect name="aluno_id" defaultValue={alunoParam} aria-label="Aluno" className="w-48">
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </NativeSelect>
          </FiltroAutomatico>
        )}
      </div>

      {vendas.length === 0 && <Card className="py-8 text-center text-secondary">Nenhum consumo registrado.</Card>}
      <ul className="grid gap-4 md:grid-cols-2">
        {vendas.map((v) => (
          <li key={v.venda_id} className="flex">
            <Card className="w-full justify-between">
              <CardHeader className="flex-row items-center justify-between gap-2 border-b border-borda/60 pb-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary tabular-nums">
                  <Clock aria-hidden="true" className="size-3.5" />
                  {new Date(v.data_hora).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
                </p>
                <Badge variant="secondary" className="tabular-nums">
                  {v.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {v.itens.map((i, n) => (
                    <span key={n}>
                      {n > 0 && ", "}
                      {i.quantidade > 1 && `${i.quantidade}× `}
                      <Link href={`/preparacoes/${i.preparacao_id}#fontes`}>{i.nome}</Link>
                    </span>
                  ))}
                </p>
                <dl className={`${PAINEL} grid-cols-3`}>
                  <Indicador rotulo="Carb. disponível" valor={`${num(v.carboidrato_disponivel_g)} g`} destaque />
                  <Indicador rotulo={`CG da refeição (Rytz · ${v.rotulo})`} valor={num(v.cg_refeicao)} />
                  <Indicador rotulo={`CG da refeição (FAO · ${v.rotulo})`} valor={v.cg_refeicao_fao === null ? "—" : num(v.cg_refeicao_fao)} />
                </dl>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
