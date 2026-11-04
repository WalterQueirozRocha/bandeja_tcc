import { faltaMarcadorGluten } from "@bandeja/dominio";
import type { ModoPreparo, OrigemMarcador } from "@bandeja/dados";
import type { EdicaoIngrediente, FormaCrua, IngredienteRotulo, MarcadorEntrada, SubstituicaoMarcadores, ValorIgEntrada } from "@/lib/validacao";
import {
  apagarIg,
  apagarIngrediente,
  atualizarIngrediente,
  buscarIngrediente,
  codigosCategorias,
  criarIngredienteRotulo,
  ligarFormaCrua,
  mudarAtivoIngrediente,
  salvarIg,
  substituirMarcadores,
  usadoEmPreparacao,
  type Conferencia,
  type NovoMarcador,
} from "@/repositories/ingredientes";
import { listarFatores } from "@/repositories/preparacoes";
import { ErroNegocio } from "./erros";
import { apagarOuDesabilitar } from "./exclusao";
import { modosDoIngrediente } from "./preparacoes";

// Detalhe com os modos de preparo que a ficha técnica pode oferecer.
export async function detalharIngrediente(id: number) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) return null;
  return { ...ingrediente, modos_disponiveis: modosDoIngrediente(ingrediente, await listarFatores()) };
}

async function exigirIngrediente(id: number) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) throw new ErroNegocio("Ingrediente não encontrado", 404);
  return ingrediente;
}

// M4: no rótulo edita tudo; na TACO só a categoria de carboidrato e o RDS (o resto vem da tabela).
// Reimportar a TACO mantém esses dois campos, exceto quando o alimento está no carboidratos.csv (FC-09).
const SO_TACO = ["categoria_carboidrato", "rds_percentual"];

export async function editarIngrediente(id: number, dados: EdicaoIngrediente) {
  const ingrediente = await exigirIngrediente(id);
  const proibidos = Object.keys(dados).filter((k) => !SO_TACO.includes(k));
  if (ingrediente.origem === "TACO" && proibidos.length) {
    throw new ErroNegocio(`Ingrediente da TACO: só categoria_carboidrato e rds_percentual podem ser editados (recebido: ${proibidos.join(", ")})`);
  }
  // FC-11: o fator de cocção vem do grupo; trocar o grupo mudaria (ou quebraria) as preparações cozidas que usam o ingrediente.
  const mudouGrupo = dados.grupo_alimentar !== undefined && dados.grupo_alimentar !== ingrediente.grupo_alimentar;
  if (mudouGrupo && (await usadoEmPreparacao(id, { not: "CRU" }))) {
    throw new ErroNegocio(`${ingrediente.nome} está em preparação com modo de preparo além do cru, e o fator depende do grupo: troque o modo nessas preparações antes de mudar o grupo`);
  }
  return atualizarIngrediente(id, dados);
}

// FC-12: o modo pode depender só da forma preparada (FRITO sempre; os outros sem fator do grupo, 03/11);
// ela não sai enquanto uma preparação usa o cru nesse modo.
async function conferirFormaLivre(forma: { nome: string; forma_crua_id: number | null; modo_preparo: ModoPreparo | null }) {
  if (forma.modo_preparo && forma.forma_crua_id !== null && (await usadoEmPreparacao(forma.forma_crua_id, forma.modo_preparo))) {
    throw new ErroNegocio(`${forma.nome} é a forma preparada usada por preparações no modo ${forma.modo_preparo}: troque o modo nessas preparações antes`);
  }
}

// M2 (= valores-ig.csv): um IG por ingrediente, com conferência dupla; escala do pão ÷ 1,4.
export async function gravarIg(id: number, { escala, ig, ...dados }: ValorIgEntrada) {
  await exigirIngrediente(id);
  return salvarIg(id, { ...dados, ig: escala === "PAO" ? ig / 1.4 : ig });
}

export async function removerIg(id: number) {
  await exigirIngrediente(id);
  if ((await apagarIg(id)).count === 0) throw new ErroNegocio("Ingrediente sem IG pareado", 404);
}

// M3 (= formas-preparadas.csv): liga a forma preparada da TACO à sua forma crua.
export async function definirFormaCrua(id: number, { forma_crua_id, modo_preparo }: FormaCrua) {
  const [forma, crua] = [await exigirIngrediente(id), await buscarIngrediente(forma_crua_id)];
  if (forma.forma_crua_id !== forma_crua_id || forma.modo_preparo !== modo_preparo) await conferirFormaLivre(forma);
  const erros: string[] = [];
  if (!crua) erros.push("Forma crua não encontrada");
  else {
    if (forma.origem !== "TACO" || crua.origem !== "TACO") erros.push("A ligação vale só para ingredientes da TACO");
    if (crua.id === forma.id) erros.push("Um ingrediente não pode ser a forma crua dele mesmo");
    if (crua.forma_crua_id !== null) erros.push(`${crua.nome} já é uma forma preparada`);
    if (forma.formas_preparadas.length) erros.push(`${forma.nome} já é a forma crua de outros ingredientes`);
    const outra = crua.formas_preparadas.find((f) => f.modo_preparo === modo_preparo && f.id !== forma.id);
    if (outra) erros.push(`${crua.nome} já tem forma ${modo_preparo}: ${outra.nome}`);
  }
  if (erros.length) throw new ErroNegocio(erros.join("; "));
  return ligarFormaCrua(id, forma_crua_id, modo_preparo);
}

export async function removerFormaCrua(id: number) {
  const forma = await exigirIngrediente(id);
  if (forma.forma_crua_id === null) throw new ErroNegocio("Ingrediente sem forma crua ligada", 404);
  await conferirFormaLivre(forma);
  return ligarFormaCrua(id, null, null);
}

// Regras comuns ao cadastro e à edição: categorias existentes e S1. No MAPEAMENTO, os marcadores herdam a conferência do conjunto.
async function prepararMarcadores(entrada: MarcadorEntrada[], origem: OrigemMarcador, conferencia?: Conferencia): Promise<NovoMarcador[]> {
  const existentes = await codigosCategorias();
  const invalidas = entrada.filter((m) => !existentes.has(m.categoria_codigo)).map((m) => m.categoria_codigo);
  if (invalidas.length) throw new ErroNegocio(`Categorias inexistentes: ${invalidas.join(", ")}`);
  if (faltaMarcadorGluten(entrada.map((m) => m.categoria_codigo))) {
    throw new ErroNegocio("Ingrediente com trigo, centeio, cevada ou aveia deve ter o marcador GLUTEN");
  }
  return entrada.map((m) => ({
    categoria_codigo: m.categoria_codigo,
    presenca: m.presenca,
    origem,
    conferido_por_1: conferencia?.conferido_por_1 ?? null,
    conferido_por_2: conferencia?.conferido_por_2 ?? null,
  }));
}

// D6 / RF01: a marcação da TACO só vale conferida por duas pessoas diferentes.
function exigirConferenciaDupla({ conferido_por_1: a, conferido_por_2: b }: SubstituicaoMarcadores): Conferencia {
  if (!a || !b || a.toLowerCase() === b.toLowerCase()) {
    throw new ErroNegocio("Marcação da TACO exige conferência dupla por duas pessoas diferentes");
  }
  return { conferido_por_1: a, conferido_por_2: b };
}

export async function cadastrarPorRotulo({ marcadores, ...dados }: IngredienteRotulo) {
  return criarIngredienteRotulo(dados, await prepararMarcadores(marcadores, "ROTULO"));
}

// B2: ingrediente da TACO nunca é apagado (a reimportação o recriaria); só desabilitado.
export async function excluirIngrediente(id: number) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) throw new ErroNegocio("Ingrediente não encontrado", 404);
  const desabilitar = () => mudarAtivoIngrediente(id, false);
  if (ingrediente.origem === "TACO") {
    await desabilitar();
    return { resultado: "DESABILITADO" as const };
  }
  return apagarOuDesabilitar(() => apagarIngrediente(id), desabilitar);
}

export async function habilitarIngrediente(id: number) {
  if (!(await buscarIngrediente(id))) throw new ErroNegocio("Ingrediente não encontrado", 404);
  return mudarAtivoIngrediente(id, true);
}

// A origem segue a do ingrediente: TACO → MAPEAMENTO (com a conferência do conjunto), rótulo → ROTULO.
export async function editarMarcadores(id: number, dados: SubstituicaoMarcadores) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) throw new ErroNegocio("Ingrediente não encontrado", 404);
  if (ingrediente.origem !== "TACO") return substituirMarcadores(id, await prepararMarcadores(dados.marcadores, "ROTULO"));
  const conferencia = exigirConferenciaDupla(dados);
  return substituirMarcadores(id, await prepararMarcadores(dados.marcadores, "MAPEAMENTO", conferencia), conferencia);
}
