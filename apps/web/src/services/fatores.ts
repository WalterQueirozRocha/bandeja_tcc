import type { FatorEntrada } from "@/lib/validacao";
import { apagarFator, atualizarFator, buscarFator, buscarFatorPorChave, criarFator, fatorEmUso } from "@/repositories/fatores";
import { ErroNegocio } from "./erros";

// M1: um fator por (grupo, modo), como em fatores-coccao.csv (P2: sem fator, o modo não é oferecido).

async function conferirChaveLivre(dados: FatorEntrada, id?: number) {
  const outro = await buscarFatorPorChave(dados.grupo_alimentar, dados.modo_preparo);
  if (outro && outro.id !== id) throw new ErroNegocio(`Já existe fator para ${dados.grupo_alimentar} / ${dados.modo_preparo}`);
}

const emUso = (f: { grupo_alimentar: string; modo_preparo: string }) =>
  new ErroNegocio(`O fator ${f.grupo_alimentar} / ${f.modo_preparo} é usado por preparações cadastradas: edite o valor em vez de remover`);

async function exigirFator(id: number) {
  const fator = await buscarFator(id);
  if (!fator) throw new ErroNegocio("Fator não encontrado", 404);
  return fator;
}

export async function cadastrarFator(dados: FatorEntrada) {
  await conferirChaveLivre(dados);
  return criarFator(dados);
}

// Trocar o grupo ou o modo de um fator em uso quebraria o cálculo das preparações que dependem dele.
export async function editarFator(id: number, dados: FatorEntrada) {
  const atual = await exigirFator(id);
  const mudouChave = atual.grupo_alimentar !== dados.grupo_alimentar || atual.modo_preparo !== dados.modo_preparo;
  if (mudouChave && (await fatorEmUso(atual.grupo_alimentar, atual.modo_preparo))) throw emUso(atual);
  await conferirChaveLivre(dados, id);
  return atualizarFator(id, dados);
}

export async function removerFator(id: number) {
  const atual = await exigirFator(id);
  if (await fatorEmUso(atual.grupo_alimentar, atual.modo_preparo)) throw emUso(atual);
  await apagarFator(id);
}
