import { avaliar, sugerirAlternativas } from "@bandeja/dominio";
import type { CardapioEntrada } from "@/lib/validacao";
import { perfilCompatibilidade } from "@/repositories/alunos";
import {
  apagarCardapio,
  atualizarCardapio,
  buscarCardapio,
  buscarCardapioPorDataPeriodo,
  criarCardapio,
  mudarAtivoCardapio,
  paraIso,
  preparacoesAtivas,
} from "@/repositories/cardapios";
import { ErroNegocio } from "./erros";
import { apagarOuDesabilitar } from "./exclusao";
import { resumirPreparacoes } from "./preparacoes";

async function conferirDataLivre(data: string, periodo: CardapioEntrada["periodo"], id?: number) {
  const mesmoDia = await buscarCardapioPorDataPeriodo(data, periodo);
  if (mesmoDia && mesmoDia.id !== id) throw new ErroNegocio(`Já existe cardápio para ${data} (${periodo})`);
}

// B2: preparação desabilitada não entra; a que já está no cardápio pode continuar.
async function validar(dados: CardapioEntrada, jaNoCardapio: number[] = [], id?: number) {
  await conferirDataLivre(dados.data, dados.periodo, id);
  const permitidas = await preparacoesAtivas(dados.itens.map((i) => i.preparacao_id));
  const faltando = dados.itens.filter((i) => !permitidas.has(i.preparacao_id) && !jaNoCardapio.includes(i.preparacao_id));
  if (faltando.length) throw new ErroNegocio(`Preparações inexistentes ou desabilitadas: ${faltando.map((i) => i.preparacao_id).join(", ")}`);
}

// RF05: criar é publicar.
export async function publicarCardapio(dados: CardapioEntrada) {
  await validar(dados);
  return criarCardapio(dados.data, dados.periodo, dados.itens);
}

export async function editarCardapio(id: number, dados: CardapioEntrada) {
  const atual = await buscarCardapio(id);
  if (!atual) throw new ErroNegocio("Cardápio não encontrado", 404);
  await validar(dados, atual.itens.map((i) => i.preparacao_id), id);
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
  await conferirDataLivre(paraIso(cardapio.data), cardapio.periodo, id);
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
