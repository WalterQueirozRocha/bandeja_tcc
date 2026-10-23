import { faltaMarcadorGluten } from "@bandeja/dominio";
import type { OrigemMarcador } from "@bandeja/dados";
import type { IngredienteRotulo, MarcadorEntrada } from "@/lib/validacao";
import {
  buscarIngrediente,
  codigosCategorias,
  criarIngredienteRotulo,
  substituirMarcadores,
  type NovoMarcador,
} from "@/repositories/ingredientes";
import { listarFatores } from "@/repositories/preparacoes";
import { ErroNegocio } from "./erros";
import { modosDoIngrediente } from "./preparacoes";

// Detalhe com os modos de preparo que a ficha técnica pode oferecer.
export async function detalharIngrediente(id: number) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) return null;
  return { ...ingrediente, modos_disponiveis: modosDoIngrediente(ingrediente, await listarFatores()) };
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

// A origem segue a do ingrediente: TACO → MAPEAMENTO, rótulo → ROTULO.
export async function editarMarcadores(id: number, marcadores: MarcadorEntrada[]) {
  const ingrediente = await buscarIngrediente(id);
  if (!ingrediente) throw new ErroNegocio("Ingrediente não encontrado", 404);
  const origem = ingrediente.origem === "TACO" ? "MAPEAMENTO" : "ROTULO";
  return substituirMarcadores(id, await prepararMarcadores(marcadores, origem));
}
