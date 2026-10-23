import { exigirSessaoNaPagina } from "@/lib/acesso";
import { hojeNaBahia } from "@/lib/datas";
import { buscarCardapioPorDataPeriodo } from "@/repositories/cardapios";
import { montarCardapio } from "@/services/cardapios";
import { Balcao } from "./balcao";

// PDV do operador (RF08–RF10): o cardápio do dia vem sem dados de saúde.
export default async function Atendimento({ searchParams }: PageProps<"/atendimento">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const data = typeof params.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : hojeNaBahia();
  const periodo = params.periodo === "TARDE" ? "TARDE" : "MANHA";
  const encontrado = await buscarCardapioPorDataPeriodo(data, periodo);
  const cardapio = encontrado ? await montarCardapio(encontrado.id, null) : null;

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Atendimento</h1>
      <form className="flex flex-wrap gap-2">
        <input type="date" name="data" defaultValue={data} aria-label="Data" className="campo" />
        <select name="periodo" defaultValue={periodo} aria-label="Turno" className="campo">
          <option value="MANHA">Manhã</option>
          <option value="TARDE">Tarde</option>
        </select>
        <button type="submit" className="btn-secundario">
          Trocar cardápio
        </button>
      </form>
      {cardapio ? (
        <Balcao itens={cardapio.itens.map((i) => ({ id: i.id, nome: i.nome, preco: i.preco }))} />
      ) : (
        <p className="text-secondary">Nenhum cardápio publicado para esta data e turno.</p>
      )}
    </main>
  );
}
