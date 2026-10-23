import { ROTULO_ESTIMATIVA } from "@bandeja/dominio";
import { inicioDoDiaNaBahia } from "@/lib/datas";
import type { PanoramaEntrada } from "@/lib/validacao";
import { cardapiosDoPeriodo, vendasPorResultado } from "@/repositories/panorama";
import { ErroNegocio } from "./erros";
import { resumirPreparacoes } from "./preparacoes";

const MAX_DIAS = 366;
const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null);

// RF15 / P17: indicadores por período, com médias por item ofertado (cada aparição no cardápio conta).
export async function montarPanorama({ de, ate, periodo }: PanoramaEntrada) {
  const dias = (inicioDoDiaNaBahia(ate).getTime() - inicioDoDiaNaBahia(de).getTime()) / 86_400_000;
  if (dias < 0) throw new ErroNegocio("A data inicial deve ser anterior ou igual à final");
  if (dias >= MAX_DIAS) throw new ErroNegocio(`Período máximo de ${MAX_DIAS} dias`);

  const [cardapios, vendas] = await Promise.all([
    cardapiosDoPeriodo(de, ate, periodo),
    vendasPorResultado(inicioDoDiaNaBahia(de), inicioDoDiaNaBahia(ate, 1)),
  ]);
  const ofertados = cardapios.flatMap((c) => c.itens.map((i) => i.preparacao_id));
  const resumos = await resumirPreparacoes([...new Set(ofertados)]);
  const itens = ofertados.map((id) => resumos.get(id)!);

  const categorias = new Map<string, { categoria: string; nome: string; contem: number; pode_conter: number }>();
  for (const item of itens) {
    for (const a of item.alergenos) {
      const atual = categorias.get(a.categoria) ?? { categoria: a.categoria, nome: a.nome, contem: 0, pode_conter: 0 };
      if (a.presenca === "CONTEM") atual.contem++;
      else atual.pode_conter++;
      categorias.set(a.categoria, atual);
    }
  }

  return {
    periodo: { de, ate, turno: periodo ?? null },
    base: { cardapios: cardapios.length, itens_ofertados: itens.length },
    medias_por_porcao: {
      rotulo_glicemico: ROTULO_ESTIMATIVA,
      carboidrato_disponivel_g: media(itens.map((i) => i.carga_glicemica.carboidrato_disponivel_g)),
      cg_rytz: media(itens.flatMap((i) => (i.carga_glicemica.rytz ? [i.carga_glicemica.rytz.cg] : []))),
      energia_kcal: media(itens.map((i) => i.nutrientes_porcao.energia_kcal)),
      proteina_g: media(itens.map((i) => i.nutrientes_porcao.proteina_g)),
      lipideos_g: media(itens.map((i) => i.nutrientes_porcao.lipideos_g)),
      fibra_g: media(itens.map((i) => i.nutrientes_porcao.fibra_g)),
    },
    categorias: [...categorias.values()]
      .map((c) => ({ ...c, total: c.contem + c.pode_conter }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)),
    vendas: {
      CONCLUIDA: vendas.CONCLUIDA ?? 0,
      BLOQUEADA: vendas.BLOQUEADA ?? 0,
      CANCELADA_PELO_OPERADOR: vendas.CANCELADA_PELO_OPERADOR ?? 0,
    },
  };
}
