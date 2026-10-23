import { faltaMarcadorGluten } from "@bandeja/dominio";
import type { OrigemMarcador } from "@bandeja/dados";
import type { EdicaoIngrediente, FormaCrua, IngredienteRotulo, MarcadorEntrada, ValorIgEntrada } from "@/lib/validacao";
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
// Atenção: reimportar a TACO volta esses dois campos ao padrão + carboidratos.csv.
const SO_TACO = ["categoria_carboidrato", "rds_percentual"];

export async function editarIngrediente(id: number, dados: EdicaoIngrediente) {
  const ingrediente = await exigirIngrediente(id);
  const proibidos = Object.keys(dados).filter((k) => !SO_TACO.includes(k));
  if (ingrediente.origem === "TACO" && proibidos.length) {
    throw new ErroNegocio(`Ingrediente da TACO: só categoria_carboidrato e rds_percentual podem ser editados (recebido: ${proibidos.join(", ")})`);
  }
  return atualizarIngrediente(id, dados);
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
  if ((await exigirIngrediente(id)).forma_crua_id === null) throw new ErroNegocio("Ingrediente sem forma crua ligada", 404);
  return ligarFormaCrua(id, null, null);
}

// Regras comuns ao cadastro e à edição: categorias existentes, S1 e conferência dupla no MAPEAMENTO.
async function prepararMarcadores(entrada: MarcadorEntrada[], origem: OrigemMarcador): Promise<NovoMarcador[]> {
  const existentes = await codigosCategorias();
  const invalidas = entrada.filter((m) => !existentes.has(m.categoria_codigo)).map((m) => m.categoria_codigo);
  if (invalidas.length) throw new ErroNegocio(`Categorias inexistentes: ${invalidas.join(", ")}`);
  if (faltaMarcadorGluten(entrada.map((m) => m.categoria_codigo))) {
    throw new ErroNegocio("Ingrediente com trigo, centeio, cevada ou aveia deve ter o marcador GLUTEN");
  }
  if (origem === "MAPEAMENTO") {
    const semConferencia = entrada.filter(
      (m) => !m.conferido_por_1 || !m.conferido_por_2 || m.conferido_por_1.toLowerCase() === m.conferido_por_2.toLowerCase(),
    );
    if (semConferencia.length) {
      throw new ErroNegocio("Marcadores da TACO exigem conferência dupla por duas pessoas diferentes");
    }
  }
  return entrada.map((m) => ({
    categoria_codigo: m.categoria_codigo,
    presenca: m.presenca,
    origem,
    conferido_por_1: m.conferido_por_1 ?? null,
    conferido_por_2: m.conferido_por_2 ?? null,
  }));
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

// A origem segue a do ingrediente: TACO → MAPEAMENTO, rótulo → ROTULO.
export async function editarMarcadores(id: number, marcadores: MarcadorEntrada[]) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) throw new ErroNegocio("Ingrediente não encontrado", 404);
  const origem = ingrediente.origem === "TACO" ? "MAPEAMENTO" : "ROTULO";
  return substituirMarcadores(id, await prepararMarcadores(marcadores, origem));
}
