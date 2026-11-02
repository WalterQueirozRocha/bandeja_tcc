import { textos } from "@bandeja/dominio";
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
import { criarNotificacoes, emTransacao, idsAtivosDoPapel } from "@/repositories/notificacoes";
import type { SituacaoBloqueio } from "@bandeja/dados";
import { exigirAcessoAoAluno } from "./alunos";
import { ErroNegocio } from "./erros";

const LINK = "/bloqueios";

// RF14 / P6: o responsável solicita o bloqueio de uma preparação; vale depois que o operador executa.
// D2: os operadores ativos são notificados na mesma transação.
export async function solicitarBloqueio(sessao: Sessao, aluno_id: number, preparacao_id: number) {
  await exigirAcessoAoAluno(sessao, aluno_id, ["RESPONSAVEL"]);
  if (!(await preparacoesAtivas([preparacao_id])).has(preparacao_id)) throw new ErroNegocio("Preparação não encontrada ou desabilitada");
  if (await existeBloqueioAtivo(aluno_id, preparacao_id)) throw new ErroNegocio("Já existe bloqueio ativo para esta preparação");
  return emTransacao(async (tx) => {
    const b = await criarBloqueio(tx, sessao.id, aluno_id, preparacao_id);
    const mensagem = textos.bloqueioSolicitado(b.preparacao.nome, b.aluno.nome);
    const operadores = await idsAtivosDoPapel(tx, "OPERADOR");
    await criarNotificacoes(tx, operadores.map((destinatario_id) => ({ destinatario_id, tipo: "BLOQUEIO_SOLICITADO", mensagem, link: LINK })));
    return { id: b.id, situacao: b.situacao };
  });
}

// Operador vê todos; responsável, só os que pediu.
export function verBloqueios(sessao: Sessao, situacao?: SituacaoBloqueio) {
  return listarBloqueios({ situacao, responsavel_id: sessao.papel === "RESPONSAVEL" ? sessao.id : undefined });
}

export async function decidirBloqueio(id: number, situacao: "EXECUTADA" | "RECUSADA") {
  const bloqueio = await buscarBloqueio(id);
  if (!bloqueio) throw new ErroNegocio("Bloqueio não encontrado", 404);
  if (bloqueio.situacao !== "SOLICITADA") throw new ErroNegocio(`Bloqueio já está ${bloqueio.situacao}`);
  const executado = situacao === "EXECUTADA";
  return emTransacao(async (tx) => {
    const resultado = await mudarSituacao(tx, id, situacao);
    await criarNotificacoes(tx, [
      {
        destinatario_id: bloqueio.responsavel_id,
        tipo: executado ? "BLOQUEIO_EXECUTADO" : "BLOQUEIO_RECUSADO",
        mensagem: textos.bloqueioDecidido(bloqueio.preparacao.nome, bloqueio.aluno.nome, executado),
        link: LINK,
      },
    ]);
    return resultado;
  });
}

// O pedido é apagado (DF-12); os operadores sabem do cancelamento, exceto do que já tinham recusado.
export async function cancelarBloqueio(sessao: Sessao, id: number) {
  const bloqueio = await buscarBloqueio(id);
  if (!bloqueio || bloqueio.responsavel_id !== sessao.id) throw new ErroNegocio("Acesso negado", 403);
  await emTransacao(async (tx) => {
    await apagarBloqueio(tx, id);
    if (bloqueio.situacao === "RECUSADA") return;
    const mensagem = textos.bloqueioCancelado(bloqueio.preparacao.nome, bloqueio.aluno.nome);
    const operadores = await idsAtivosDoPapel(tx, "OPERADOR");
    await criarNotificacoes(tx, operadores.map((destinatario_id) => ({ destinatario_id, tipo: "BLOQUEIO_CANCELADO", mensagem, link: LINK })));
  });
}
