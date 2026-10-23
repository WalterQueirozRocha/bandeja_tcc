import Link from "next/link";
import { Alerta, ROTULO, Selo } from "@/components/alerta";
import { Indicador, PAINEL } from "@/components/indicador";
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
      <h1>Cardápio</h1>
      <form className="flex flex-wrap gap-2">
        <input type="date" name="data" defaultValue={data} aria-label="Data" className="campo" />
        <select name="periodo" defaultValue={periodo} aria-label="Turno" className="campo">
          <option value="MANHA">Manhã</option>
          <option value="TARDE">Tarde</option>
        </select>
        {alunos.length > 0 && (
          <select name="aluno_id" defaultValue={alunoParam ?? alunos[0]!.id} aria-label="Aluno" className="campo">
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="btn-primario">
          Ver
        </button>
      </form>

      {!conteudo ? (
        <p className="text-secondary">Nenhum cardápio publicado para esta data e turno.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {conteudo.itens.map((item) => {
            const cg = item.carga_glicemica;
            const contem = item.alergenos.filter((a) => a.presenca === "CONTEM").map((a) => a.nome);
            const podeConter = item.alergenos.filter((a) => a.presenca === "PODE_CONTER").map((a) => a.nome);
            return (
              <li key={item.id} className="cartao flex flex-col gap-3" data-testid="item-cardapio">
                <div>
                  <h2 className="text-base">
                    <Link href={`/preparacoes/${item.preparacao_id}`} className="text-brand-navy">
                      {item.nome}
                    </Link>
                  </h2>
                  <p className="text-sm text-secondary tabular-nums">R$ {item.preco.toFixed(2).replace(".", ",")}</p>
                </div>

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

                <dl className={`${PAINEL} grid-cols-2`}>
                  <Indicador rotulo="Carb. disponível" valor={`${num(cg.carboidrato_disponivel_g)} g`} destaque />
                  <Indicador rotulo={`CG (Rytz · ${cg.rotulo})`} valor={cg.rytz ? num(cg.rytz.cg) : "—"} />
                </dl>

                <div className="flex flex-col gap-1 text-sm">
                  {contem.length === 0 && podeConter.length === 0 && <p className="text-secondary">Nenhum alergênico marcado.</p>}
                  {contem.length > 0 && (
                    <p className="rounded-md border border-bloqueado bg-bloqueado-fundo px-2 py-1 text-bloqueado-texto">
                      <strong className="uppercase">Contém:</strong> {contem.join(", ")}
                    </p>
                  )}
                  {podeConter.length > 0 && (
                    <p className="rounded-md border border-atencao bg-atencao-fundo px-2 py-1 text-atencao-texto">
                      <strong className="uppercase">Pode conter:</strong> {podeConter.join(", ")}
                    </p>
                  )}
                </div>

                {"alternativas" in item && item.alternativas.length > 0 && (
                  <p className="text-sm font-medium text-compativel-texto" data-testid="alternativas">
                    Alternativas compatíveis: {item.alternativas.map((a) => a.nome).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
