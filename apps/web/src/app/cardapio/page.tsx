import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { Alerta, ROTULO, Selo } from "@/components/alerta";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Indicador, PAINEL } from "@/components/indicador";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { NativeSelect } from "@/components/ui/native-select";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { buscarCardapioPorDataPeriodo } from "@/repositories/cardapios";
import { alunoDaConsulta } from "@/services/alunos";
import { montarCardapio } from "@/services/cardapios";
import { ErroNegocio } from "@/services/erros";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// RF07, CT23: a compatibilidade vem pronta do servidor.
export default async function Cardapio({ searchParams }: PageProps<"/cardapio">) {
  const sessao = await exigirSessaoNaPagina();
  const params = await searchParams;
  const data = typeof params.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : hojeNaBahia();
  const periodo = params.periodo === "TARDE" ? "TARDE" : "MANHA";
  const alunos = sessao.papel === "RESPONSAVEL" ? await alunosDoResponsavel(sessao.id) : [];
  const alunoParam = Number(params.aluno_id) || undefined;

  let conteudo;
  try {
    const aluno_id = await alunoDaConsulta(sessao, alunoParam ?? alunos[0]?.id);
    const encontrado = await buscarCardapioPorDataPeriodo(data, periodo);
    conteudo = encontrado ? await montarCardapio(encontrado.id, aluno_id) : null;
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    return <main className="p-4">{e.message}</main>;
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Cardápio</h1>
          <p className="text-sm text-secondary">Consulte os itens do turno, estimativas de carga glicêmica e compatibilidade alimentar.</p>
        </div>
        <FiltroAutomatico className="flex flex-wrap items-center gap-2">
          <DatePicker name="data" defaultValue={data} aria-label="Data" required className="w-40" />
          <NativeSelect name="periodo" defaultValue={periodo} aria-label="Turno" className="w-32">
            <option value="MANHA">Manhã</option>
            <option value="TARDE">Tarde</option>
          </NativeSelect>
          {alunos.length > 0 && (
            <NativeSelect name="aluno_id" defaultValue={alunoParam ?? alunos[0]!.id} aria-label="Aluno" className="w-44">
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </NativeSelect>
          )}
        </FiltroAutomatico>
      </div>

      {!conteudo ? (
        <Card className="py-8 text-center text-secondary">Nenhum cardápio publicado para esta data e turno.</Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {conteudo.itens.map((item) => {
            const cg = item.carga_glicemica;
            // RNF05: cada alergênico com o ingrediente de origem.
            const comOrigem = (presenca: string) =>
              item.alergenos.filter((a) => a.presenca === presenca).map((a) => `${a.nome} (${a.origens.join(", ")})`);
            const contem = comOrigem("CONTEM");
            const podeConter = comOrigem("PODE_CONTER");
            return (
              <li key={item.id} className="flex" data-testid="item-cardapio">
                <Card className="w-full justify-between">
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        <Link href={`/preparacoes/${item.preparacao_id}`} className="text-brand-navy hover:text-brand-royal">
                          {item.nome}
                        </Link>
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-sm tabular-nums">
                      R$ {item.preco.toFixed(2).replace(".", ",")}
                    </Badge>
                  </CardHeader>

                  <CardContent>
                    {item.compatibilidade && (
                      <div data-testid="compatibilidade" className="flex flex-col items-start gap-2">
                        <Selo estado={item.compatibilidade.resultado}>{ROTULO[item.compatibilidade.resultado]}</Selo>
                        {item.compatibilidade.alertas.map((a) => (
                          <Alerta key={a.texto} estado={a.resultado} className="w-full text-sm font-semibold">
                            {a.texto}
                          </Alerta>
                        ))}
                      </div>
                    )}

                    <dl className={`${PAINEL} grid-cols-3`}>
                      <Indicador rotulo="Carb. disponível" valor={`${num(cg.carboidrato_disponivel_g)} g`} destaque />
                      <Indicador rotulo={`CG (Rytz · ${cg.rotulo})`} valor={cg.rytz ? num(cg.rytz.cg) : "—"} />
                      <Indicador rotulo={`CG (FAO · ${cg.rotulo})`} valor={cg.fao ? num(cg.fao.cg) : "—"} />
                    </dl>

                    <div className="flex flex-col gap-1.5 text-sm">
                      {contem.length === 0 && podeConter.length === 0 && <p className="text-secondary">Nenhum alergênico marcado.</p>}
                      {contem.length > 0 && (
                        <p className="rounded-lg border border-bloqueado/50 bg-bloqueado-fundo px-2.5 py-1.5 text-bloqueado-texto">
                          <strong className="uppercase">Contém:</strong> {contem.join(", ")}
                        </p>
                      )}
                      {podeConter.length > 0 && (
                        <p className="rounded-lg border border-atencao/50 bg-atencao-fundo px-2.5 py-1.5 text-atencao-texto">
                          <strong className="uppercase">Pode conter:</strong> {podeConter.join(", ")}
                        </p>
                      )}
                    </div>

                    {"alternativas" in item && item.alternativas.length > 0 && (
                      <p
                        className="inline-flex items-center gap-1.5 rounded-lg border border-compativel/40 bg-compativel-fundo px-2.5 py-1.5 text-sm font-medium text-compativel-texto"
                        data-testid="alternativas"
                      >
                        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-compativel" />
                        Alternativas compatíveis: {item.alternativas.map((a) => a.nome).join(", ")}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="justify-between text-xs text-secondary">
                    <span>Porção: {num(item.porcao_g)} g</span>
                    <Link href={`/preparacoes/${item.preparacao_id}#fontes`} className="inline-flex items-center gap-1 text-sm font-medium">
                      Fontes e hipóteses
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </Link>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
