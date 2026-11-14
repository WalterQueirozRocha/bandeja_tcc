import { Alerta } from "@/components/alerta";
import { FiltroAutomatico } from "@/components/filtro-automatico";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { NativeSelect } from "@/components/ui/native-select";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Atendimento</h1>
          <p className="text-sm text-secondary">Identifique o aluno e selecione os itens para verificar a compatibilidade alimentar.</p>
        </div>
        <FiltroAutomatico className="flex flex-wrap items-center gap-2">
          <DatePicker name="data" defaultValue={data} aria-label="Data" required className="w-40" />
          <NativeSelect name="periodo" defaultValue={periodo} aria-label="Turno" className="w-32">
            <option value="MANHA">Manhã</option>
            <option value="TARDE">Tarde</option>
          </NativeSelect>
        </FiltroAutomatico>
      </div>
      {/* FC-07 (D7 = A): o servidor aceita, mas o operador vê que não é o cardápio do dia. */}
      {cardapio && data !== hojeNaBahia() && (
        <Alerta estado="ATENCAO" titulo="Este não é o cardápio de hoje" data-testid="aviso-outra-data">
          A venda será registrada com a data e a hora de agora.
        </Alerta>
      )}
      {cardapio ? (
        <Balcao itens={cardapio.itens.map((i) => ({ id: i.id, nome: i.nome, preco: i.preco }))} />
      ) : (
        <Card className="py-8 text-center text-secondary">Nenhum cardápio publicado para esta data e turno.</Card>
      )}
    </main>
  );
}
