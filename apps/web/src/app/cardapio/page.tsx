import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { buscarCardapioPorDataPeriodo } from "@/repositories/cardapios";
import { alunoDaConsulta } from "@/services/alunos";
import { montarCardapio } from "@/services/cardapios";
import { ErroNegocio } from "@/services/erros";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const MARCA = { COMPATIVEL: "Compatível", ATENCAO: "Atenção", BLOQUEADO: "Bloqueado" } as const;

// Página mínima (RF07, CT23): a compatibilidade vem pronta do servidor.
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
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-2xl font-semibold">Cardápio</h1>
      <form className="flex flex-wrap gap-2">
        <input type="date" name="data" defaultValue={data} className="rounded border p-2" />
        <select name="periodo" defaultValue={periodo} className="rounded border p-2">
          <option value="MANHA">Manhã</option>
          <option value="TARDE">Tarde</option>
        </select>
        {alunos.length > 0 && (
          <select name="aluno_id" defaultValue={alunoParam ?? alunos[0]!.id} className="rounded border p-2">
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="rounded bg-zinc-900 px-4 text-white">
          Ver
        </button>
      </form>

      {!conteudo ? (
        <p>Nenhum cardápio publicado para esta data e turno.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {conteudo.itens.map((item) => (
            <li key={item.id} className="rounded border p-3" data-testid="item-cardapio">
              <div className="flex justify-between gap-2">
                <strong>{item.nome}</strong>
                <span>R$ {item.preco.toFixed(2).replace(".", ",")}</span>
              </div>
              {item.compatibilidade && (
                <p data-testid="compatibilidade">
                  {MARCA[item.compatibilidade.resultado]}
                  {item.compatibilidade.alertas.map((a) => ` · ${a.texto}`)}
                </p>
              )}
              {"alternativas" in item && item.alternativas.length > 0 && (
                <p className="text-sm" data-testid="alternativas">
                  Alternativas compatíveis: {item.alternativas.map((a) => a.nome).join(", ")}
                </p>
              )}
              <p className="text-sm">
                Alergênicos:{" "}
                {item.alergenos.length
                  ? item.alergenos.map((a) => `${a.nome}${a.presenca === "PODE_CONTER" ? " (pode conter)" : ""}`).join(", ")
                  : "nenhum marcado"}
              </p>
              <p className="text-sm">
                Carboidrato disponível: {num(item.carga_glicemica.carboidrato_disponivel_g)} g
                {item.carga_glicemica.rytz && ` · CG ${num(item.carga_glicemica.rytz.cg)} (${item.carga_glicemica.rotulo})`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
