import {
  comporPreparacao,
  derivarAlergenos,
  estimarCargaGlicemica,
  modosDisponiveis,
  type ItemComposicao,
  type MetaGlicemica,
  type Modo,
} from "@bandeja/dominio";
import type { GrupoAlimentar, ModoPreparo } from "@bandeja/dados";
import type { DadosPreparacaoEntrada } from "@/lib/validacao";
import { codigosCategorias } from "@/repositories/ingredientes";
import {
  apagarPreparacao,
  atualizarPreparacao,
  buscarIngredientesCalculo,
  buscarPreparacao,
  buscarPreparacoes,
  criarPreparacao,
  listarFatores,
  mudarAtivoPreparacao,
  nomesCategorias,
  type IngredienteCalculo,
} from "@/repositories/preparacoes";
import { ErroNegocio } from "./erros";
import { apagarOuDesabilitar } from "./exclusao";

type Fator = { grupo_alimentar: GrupoAlimentar; modo_preparo: ModoPreparo; fator_coccao: number };

function fatoresDoGrupo(grupo: GrupoAlimentar, fatores: Fator[]) {
  return Object.fromEntries(fatores.filter((f) => f.grupo_alimentar === grupo).map((f) => [f.modo_preparo, f.fator_coccao]));
}

// Decisão 2 do I2: a forma preparada da TACO (com forma crua ligada) não entra direto na ficha.
// Modos do cru: os das formas preparadas na TACO; sem nenhuma, os com fator do grupo (03/11).
export function modosDoIngrediente(
  ingrediente: { grupo_alimentar: GrupoAlimentar; forma_crua_id: number | null; formas_preparadas: { modo_preparo: ModoPreparo | null }[] },
  fatores: Fator[],
): Modo[] {
  if (ingrediente.forma_crua_id !== null) return [];
  return modosDisponiveis({
    fatores: fatoresDoGrupo(ingrediente.grupo_alimentar, fatores),
    formasPreparadas: Object.fromEntries(ingrediente.formas_preparadas.map((f) => [f.modo_preparo, true])),
  });
}

// Converte o item da ficha para o formato do domínio, usando a forma preparada da TACO quando existe.
function paraDominio(ingrediente: IngredienteCalculo, quantidade_crua_g: number, modo: ModoPreparo, fatores: Fator[]) {
  const forma = modo === "CRU" ? undefined : ingrediente.formas_preparadas.find((f) => f.modo_preparo === modo);
  const fonte = forma ?? ingrediente;
  // Forma preparada sem fator do grupo: fator nulo (peso final = peso cru, com hipótese).
  const fator = modo === "CRU" ? 1 : (fatoresDoGrupo(ingrediente.grupo_alimentar, fatores)[modo] ?? (forma ? null : undefined));
  if (fator === undefined) throw new ErroNegocio(`${ingrediente.nome}: sem fator de cocção para ${modo}`);
  // IG pareado para a forma preparada, se houver; senão o do próprio ingrediente.
  const valorIg = forma?.valor_ig ?? ingrediente.valor_ig;
  const item: ItemComposicao & MetaGlicemica = {
    nome: ingrediente.nome,
    quantidade_crua_g,
    modo,
    fator_coccao: fator,
    forma_preparada: forma !== undefined,
    composicao: {
      energia_kcal: fonte.energia_kcal,
      proteina_g: fonte.proteina_g,
      lipideos_g: fonte.lipideos_g,
      carboidrato_g: fonte.carboidrato_g,
      fibra_g: fonte.fibra_g,
      cinzas_g: fonte.cinzas_g,
      umidade_g: fonte.umidade_g,
    },
    categoria_carboidrato: fonte.categoria_carboidrato,
    rds_percentual: fonte.rds_percentual,
    ig: valorIg ? { valor: valorIg.ig, lista: valorIg.lista } : null,
  };
  // Marcadores do cru e da forma preparada: a união nunca perde um alergênico.
  const marcadores = [...ingrediente.marcadores, ...(forma?.marcadores ?? [])].map((m) => ({ categoria: m.categoria_codigo, presenca: m.presenca }));
  return { item, marcadores };
}

export async function salvarPreparacao(dados: DadosPreparacaoEntrada, id?: number) {
  const atual = id === undefined ? null : await buscarPreparacao(id);
  if (id !== undefined && !atual) throw new ErroNegocio("Preparação não encontrada", 404);
  // B2: ingrediente desabilitado não entra; o que já estava na ficha pode continuar.
  const jaNaFicha = new Set(atual?.itens.map((i) => i.ingrediente_id));
  const [ingredientes, fatores, categorias] = await Promise.all([
    buscarIngredientesCalculo(dados.itens.map((i) => i.ingrediente_id)),
    listarFatores(),
    codigosCategorias(),
  ]);
  const porId = new Map(ingredientes.map((i) => [i.id, i]));
  const erros: string[] = [];
  const itens: ItemComposicao[] = [];
  for (const entrada of dados.itens) {
    const ingrediente = porId.get(entrada.ingrediente_id);
    const modos = ingrediente ? modosDoIngrediente(ingrediente, fatores) : [];
    if (!ingrediente) erros.push(`Ingrediente ${entrada.ingrediente_id} não encontrado`);
    else if (!ingrediente.ativo && !jaNaFicha.has(ingrediente.id)) erros.push(`${ingrediente.nome} está desabilitado`);
    else if (ingrediente.forma_crua_id !== null) {
      erros.push(`${ingrediente.nome} já é uma forma preparada: use o ingrediente cru com o modo ${ingrediente.modo_preparo}`);
    } else if (!modos.includes(entrada.modo_preparo)) {
      erros.push(`${ingrediente.nome}: modo ${entrada.modo_preparo} não disponível (disponíveis: ${modos.join(", ")})`);
    } else {
      // D6 / FC-02: alimento da TACO (e a forma preparada que o modo usa) só com a marcação conferida, inclusive o que já estava na ficha.
      const forma = ingrediente.formas_preparadas.find((f) => f.modo_preparo === entrada.modo_preparo);
      const naoConferidos = [ingrediente, ...(forma ? [forma] : [])].filter(
        (i) => i.origem === "TACO" && !i.marcacao_conferida_em,
      );
      if (naoConferidos.length) erros.push(...naoConferidos.map((i) => `${i.nome}: marcação de alergênicos ainda não conferida`));
      else itens.push(paraDominio(ingrediente, entrada.quantidade_crua_g, entrada.modo_preparo, fatores).item);
    }
  }
  const invalidas = dados.contato_cozinha.filter((c) => !categorias.has(c.categoria_codigo)).map((c) => c.categoria_codigo);
  if (invalidas.length) erros.push(`Categorias inexistentes: ${invalidas.join(", ")}`);
  if (erros.length) throw new ErroNegocio(erros.join("; "));

  const salvar = {
    ...dados,
    peso_final_calculado: comporPreparacao(itens, dados.porcao_g).peso_final_g,
  };
  return id === undefined ? criarPreparacao(salvar) : atualizarPreparacao(id, salvar);
}

// B2: em uso = está em algum cardápio ou bloqueio.
export async function excluirPreparacao(id: number) {
  if (!(await buscarPreparacao(id))) throw new ErroNegocio("Preparação não encontrada", 404);
  return apagarOuDesabilitar(() => apagarPreparacao(id), () => mudarAtivoPreparacao(id, false));
}

export async function habilitarPreparacao(id: number) {
  if (!(await buscarPreparacao(id))) throw new ErroNegocio("Preparação não encontrada", 404);
  return mudarAtivoPreparacao(id, true);
}

type PreparacaoCalculo = NonNullable<Awaited<ReturnType<typeof buscarPreparacao>>>;

const converter = (prep: PreparacaoCalculo, fatores: Fator[]) =>
  prep.itens.map((i) => paraDominio(i.ingrediente, i.quantidade_crua_g, i.modo_preparo, fatores));

function alergenosDe(prep: PreparacaoCalculo, convertidos: ReturnType<typeof converter>, nomes: Map<string, string>) {
  return derivarAlergenos(
    convertidos.map((c) => ({ nome: c.item.nome, marcadores: c.marcadores })),
    prep.marcadores_cozinha.map((m) => m.categoria_codigo),
  ).map((a) => ({ ...a, nome: nomes.get(a.categoria) ?? a.categoria }));
}

async function carregar(id: number) {
  const prep = await buscarPreparacao(id);
  if (!prep) throw new ErroNegocio("Preparação não encontrada", 404);
  return { prep, convertidos: converter(prep, await listarFatores()) };
}

const resumo = (p: { id: number; nome: string; porcao_g: number }) => ({ id: p.id, nome: p.nome, porcao_g: p.porcao_g });

export async function calcularComposicao(id: number) {
  const { prep, convertidos } = await carregar(id);
  return { preparacao: resumo(prep), ...comporPreparacao(convertidos.map((c) => c.item), prep.porcao_g) };
}

export async function calcularAlergenos(id: number) {
  const { prep, convertidos } = await carregar(id);
  return { preparacao: resumo(prep), alergenos: alergenosDe(prep, convertidos, await nomesCategorias()) };
}

export async function calcularCargaGlicemica(id: number) {
  const { prep, convertidos } = await carregar(id);
  return { preparacao: resumo(prep), ...estimarCargaGlicemica(convertidos.map((c) => c.item), prep.porcao_g) };
}

// Alergênicos e CG de várias preparações com três consultas no total (cardápio).
export async function resumirPreparacoes(ids: number[]) {
  const [preps, fatores, nomes] = await Promise.all([buscarPreparacoes(ids), listarFatores(), nomesCategorias()]);
  return new Map(
    preps.map((prep) => {
      const convertidos = converter(prep, fatores);
      const itens = convertidos.map((c) => c.item);
      const cg = estimarCargaGlicemica(itens, prep.porcao_g);
      return [
        prep.id,
        {
          ...resumo(prep),
          nutrientes_porcao: comporPreparacao(itens, prep.porcao_g).porcao,
          alergenos: alergenosDe(prep, convertidos, nomes),
          carga_glicemica: { rotulo: cg.rotulo, carboidrato_disponivel_g: cg.carboidrato_disponivel_g, rytz: cg.rytz, fao: cg.fao },
        },
      ];
    }),
  );
}
