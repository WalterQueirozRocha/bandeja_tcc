import { avaliar, sugerirAlternativas } from "@bandeja/dominio";
import type { CardapioEntrada, NovoCardapioEntrada } from "@/lib/validacao";
import { perfilCompatibilidade } from "@/repositories/alunos";
import {
  apagarCardapio,
  atualizarCardapio,
  buscarCardapio,
  buscarCardapioPorDataPeriodo,
  criarCardapios,
  mudarAtivoCardapio,
  paraData,
  paraIso,
  preparacoesAtivas,
} from "@/repositories/cardapios";
import { ErroNegocio } from "./erros";
import { apagarOuDesabilitar } from "./exclusao";
import { resumirPreparacoes } from "./preparacoes";

async function conferirDatasLivres(datas: string[], periodo: CardapioEntrada["periodo"], id?: number) {
  const ocupadas = [];
  for (const data of datas) {
    const mesmoDia = await buscarCardapioPorDataPeriodo(data, periodo);
    if (mesmoDia && mesmoDia.id !== id) ocupadas.push(data);
  }
  if (ocupadas.length) throw new ErroNegocio(`Já existe cardápio para ${ocupadas.join(", ")} (${periodo})`);
}

// Dias úteis de `de` até `ate` (sábado e domingo ficam de fora).
export function diasUteis(de: string, ate: string) {
  const dias = [];
  for (let d = paraData(de); d <= paraData(ate); d = new Date(d.getTime() + 86_400_000)) {
    if (d.getUTCDay() % 6 !== 0) dias.push(paraIso(d));
  }
  return dias;
}

// B2: preparação desabilitada não entra; a que já está no cardápio pode continuar.
async function validar(datas: string[], dados: CardapioEntrada, jaNoCardapio: number[] = [], id?: number) {
  await conferirDatasLivres(datas, dados.periodo, id);
  const permitidas = await preparacoesAtivas(dados.itens.map((i) => i.preparacao_id));
  const faltando = dados.itens.filter((i) => !permitidas.has(i.preparacao_id) && !jaNoCardapio.includes(i.preparacao_id));
  if (faltando.length) throw new ErroNegocio(`Preparações inexistentes ou desabilitadas: ${faltando.map((i) => i.preparacao_id).join(", ")}`);
}

// RF05: criar é publicar. Com `ate`, um cardápio por dia útil do intervalo.
export async function publicarCardapio(dados: NovoCardapioEntrada) {
  const datas = dados.ate ? diasUteis(dados.data, dados.ate) : [dados.data];
  if (!datas.length) throw new ErroNegocio("O intervalo não tem dia útil");
  await validar(datas, dados);
  const criados = await criarCardapios(datas, dados.periodo, dados.itens);
  return { id: criados[0]!.id, ids: criados.map((c) => c.id) };
}

export async function editarCardapio(id: number, dados: CardapioEntrada) {
  const atual = await buscarCardapio(id);
  if (!atual) throw new ErroNegocio("Cardápio não encontrado", 404);
  await validar([dados.data], dados, atual.itens.map((i) => i.preparacao_id), id);
  return atualizarCardapio(id, dados.data, dados.periodo, dados.itens);
}

// B2: em uso = algum item já foi vendido.
export async function excluirCardapio(id: number) {
  if (!(await buscarCardapio(id))) throw new ErroNegocio("Cardápio não encontrado", 404);
  return apagarOuDesabilitar(() => apagarCardapio(id), () => mudarAtivoCardapio(id, false));
}

// Habilitar de novo só se a data e o turno estiverem livres.
export async function habilitarCardapio(id: number) {
  const cardapio = await buscarCardapio(id);
  if (!cardapio) throw new ErroNegocio("Cardápio não encontrado", 404);
  await conferirDatasLivres([paraIso(cardapio.data)], cardapio.periodo, id);
  return mudarAtivoCardapio(id, true);
}

// RF07: com `aluno_id`, cada item recebe a compatibilidade com o perfil do aluno (calculada no servidor).
export async function montarCardapio(id: number, aluno_id: number | null) {
  const cardapio = await buscarCardapio(id);
  if (!cardapio) throw new ErroNegocio("Cardápio não encontrado", 404);
  const [resumos, perfil] = await Promise.all([
    resumirPreparacoes(cardapio.itens.map((i) => i.preparacao_id)),
    aluno_id === null ? null : perfilCompatibilidade(aluno_id),
  ]);

  const itens = cardapio.itens.map((item) => {
    const prep = resumos.get(item.preparacao_id)!;
    return {
      id: item.id,
      preparacao_id: item.preparacao_id,
      nome: item.preparacao.nome,
      preco: Number(item.preco),
      porcao_g: prep.porcao_g,
      alergenos: prep.alergenos,
      carga_glicemica: prep.carga_glicemica,
      ...(perfil && {
        compatibilidade: avaliar(
          perfil,
          { id: item.preparacao_id, nome: item.preparacao.nome },
          prep.alergenos.map((a) => ({ categoria: a.categoria, nome: a.nome })),
        ),
      }),
    };
  });

  // RF16: alternativas compatíveis do mesmo cardápio para os itens com restrição.
  const avaliados = itens.flatMap((i) =>
    i.compatibilidade
      ? [{ id: i.id, nome: i.nome, compatibilidade: i.compatibilidade.resultado, carboidrato_disponivel_g: i.carga_glicemica.carboidrato_disponivel_g }]
      : [],
  );
  return {
    id: cardapio.id,
    data: paraIso(cardapio.data),
    periodo: cardapio.periodo,
    ativo: cardapio.ativo,
    aluno_id,
    itens: itens.map((i) => {
      const avaliado = avaliados.find((a) => a.id === i.id);
      return avaliado
        ? { ...i, alternativas: sugerirAlternativas(avaliado, avaliados).map((a) => ({ item_cardapio_id: a.id, nome: a.nome })) }
        : i;
    }),
  };
}
