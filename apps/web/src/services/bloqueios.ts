import type { Sessao } from "@/lib/acesso";
import { preparacoesAtivas } from "@/repositories/cardapios";
import {
  apagarBloqueio,
  buscarBloqueio,
  criarBloqueio,
  existeBloqueioAtivo,
  listarBloqueios,
  mudarSituacao,
} from "@/repositories/bloqueios";
import type { SituacaoBloqueio } from "@bandeja/dados";
import { exigirAcessoAoAluno } from "./alunos";
import { ErroNegocio } from "./erros";

// RF14 / P6: o responsável solicita o bloqueio de uma preparação; vale depois que o operador executa.
export async function solicitarBloqueio(sessao: Sessao, aluno_id: number, preparacao_id: number) {
  await exigirAcessoAoAluno(sessao, aluno_id, ["RESPONSAVEL"]);
  if (!(await preparacoesAtivas([preparacao_id])).has(preparacao_id)) throw new ErroNegocio("Preparação não encontrada ou desabilitada");
  if (await existeBloqueioAtivo(aluno_id, preparacao_id)) throw new ErroNegocio("Já existe bloqueio ativo para esta preparação");
  return criarBloqueio(sessao.id, aluno_id, preparacao_id);
}

// Operador vê todos; responsável, só os que pediu.
export function verBloqueios(sessao: Sessao, situacao?: SituacaoBloqueio) {
  return listarBloqueios({ situacao, responsavel_id: sessao.papel === "RESPONSAVEL" ? sessao.id : undefined });
}

export async function decidirBloqueio(id: number, situacao: "EXECUTADA" | "RECUSADA") {
  const bloqueio = await buscarBloqueio(id);
  if (!bloqueio) throw new ErroNegocio("Bloqueio não encontrado", 404);
  if (bloqueio.situacao !== "SOLICITADA") throw new ErroNegocio(`Bloqueio já está ${bloqueio.situacao}`);
  return mudarSituacao(id, situacao);
}

export async function cancelarBloqueio(sessao: Sessao, id: number) {
  const bloqueio = await buscarBloqueio(id);
  if (!bloqueio || bloqueio.responsavel_id !== sessao.id) throw new ErroNegocio("Acesso negado", 403);
  await apagarBloqueio(id);
}
