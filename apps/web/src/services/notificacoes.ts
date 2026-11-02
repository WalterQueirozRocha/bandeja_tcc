import type { Sessao } from "@/lib/acesso";
import { contarNaoLidas, listarNotificacoes, marcarLidas } from "@/repositories/notificacoes";

// D2: cada usuário só vê e marca as próprias notificações. Não se apaga (N3).
export async function verNotificacoes(sessao: Sessao) {
  const [itens, nao_lidas] = await Promise.all([listarNotificacoes(sessao.id), contarNaoLidas(sessao.id)]);
  return { nao_lidas, itens };
}

export const naoLidas = (sessao: Sessao) => contarNaoLidas(sessao.id);

export async function marcarComoLidas(sessao: Sessao, id?: number) {
  const marcadas = await marcarLidas(sessao.id, id);
  return { marcadas, nao_lidas: await contarNaoLidas(sessao.id) };
}
