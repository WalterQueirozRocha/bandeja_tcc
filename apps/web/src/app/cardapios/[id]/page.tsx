import { notFound } from "next/navigation";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { buscarCardapio, paraIso } from "@/repositories/cardapios";
import { listarPreparacoes } from "@/repositories/preparacoes";
import { FormularioCardapio } from "../formulario";

export default async function EditarCardapio({ params }: PageProps<"/cardapios/[id]">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const id = Number((await params).id);
  const cardapio = Number.isInteger(id) && id > 0 ? await buscarCardapio(id) : null;
  if (!cardapio) notFound();

  // Preparações ativas + as que já estão no cardápio (podem ter sido desabilitadas depois).
  const ativas = (await listarPreparacoes()).map((p) => ({ id: p.id, nome: p.nome }));
  const doCardapio = cardapio.itens.map((i) => ({ id: i.preparacao_id, nome: i.preparacao.nome }));
  const preparacoes = [...ativas, ...doCardapio.filter((p) => !ativas.some((a) => a.id === p.id))];

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1>Editar cardápio</h1>
        {!cardapio.ativo && <SeloDesabilitado />}
        <span className="ml-auto">
          <AcoesRegistro url={`/api/cardapios/${id}`} ativo={cardapio.ativo} nome="este cardápio" voltarPara="/cardapios" />
        </span>
      </div>
      <FormularioCardapio
        preparacoes={preparacoes}
        dataPadrao={hojeNaBahia()}
        inicial={{
          id,
          data: paraIso(cardapio.data),
          periodo: cardapio.periodo,
          itens: cardapio.itens.map((i) => ({ preparacao_id: i.preparacao_id, preco: Number(i.preco) })),
        }}
      />
    </main>
  );
}
