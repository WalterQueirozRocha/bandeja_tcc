import { EXCLUSAO_ESTRITA } from "@bandeja/dominio";
import type { Sessao } from "@/lib/acesso";
import type { PerfilEntrada } from "@/lib/validacao";
import {
  alunosDoResponsavel,
  apagarPerfil,
  buscarAlunoDoUsuario,
  buscarPerfil,
  estaVinculado,
  salvarPerfil,
} from "@/repositories/alunos";
import { codigosCategorias } from "@/repositories/ingredientes";
import { ErroNegocio } from "./erros";

const negado = () => new ErroNegocio("Acesso negado", 403);

// Quadro 9: ALUNO vê só o próprio; RESPONSAVEL só os vinculados. Inexistente e não vinculado dão a mesma resposta.
export async function exigirAcessoAoAluno(sessao: Sessao, aluno_id: number, papeis: ("ALUNO" | "RESPONSAVEL")[]) {
  if (sessao.papel === "ALUNO" && papeis.includes("ALUNO")) {
    if ((await buscarAlunoDoUsuario(sessao.id))?.id !== aluno_id) throw negado();
    return;
  }
  if (sessao.papel === "RESPONSAVEL" && papeis.includes("RESPONSAVEL")) {
    if (!(await estaVinculado(aluno_id, sessao.id))) throw negado();
    return;
  }
  throw negado();
}

// Aluno cuja compatibilidade aparece no cardápio; null = cardápio geral (operador, coordenação).
export async function alunoDaConsulta(sessao: Sessao, aluno_id?: number): Promise<number | null> {
  if (sessao.papel === "ALUNO") {
    const proprio = (await buscarAlunoDoUsuario(sessao.id))?.id ?? null;
    if (aluno_id !== undefined && aluno_id !== proprio) throw negado();
    return proprio;
  }
  if (sessao.papel === "RESPONSAVEL") {
    if (aluno_id !== undefined) {
      await exigirAcessoAoAluno(sessao, aluno_id, ["RESPONSAVEL"]);
      return aluno_id;
    }
    const alunos = await alunosDoResponsavel(sessao.id);
    if (alunos.length > 1) throw new ErroNegocio("Informe aluno_id: há mais de um aluno vinculado");
    return alunos[0]?.id ?? null;
  }
  if (aluno_id !== undefined) throw negado();
  return null;
}

export async function lerPerfil(aluno_id: number) {
  const perfil = await buscarPerfil(aluno_id);
  if (!perfil) throw negado();
  return {
    aluno_id: perfil.id,
    consentimento: perfil.consentimento_em ? { por: perfil.consentimento_por, em: perfil.consentimento_em } : null,
    restricoes: perfil.restricoes.map((r) => ({
      categoria_codigo: r.categoria_codigo,
      categoria: r.categoria.nome,
      tipo: r.tipo,
      limite_notificacao: EXCLUSAO_ESTRITA.includes(r.tipo) ? null : r.limite_notificacao,
      data: r.data,
    })),
  };
}

// RF06 / RNF07: só tipo e categoria; consentimento do responsável antes da primeira gravação.
export async function gravarPerfil(aluno_id: number, responsavel_id: number, dados: PerfilEntrada) {
  const atual = await buscarPerfil(aluno_id);
  if (!atual) throw negado();
  if (!atual.consentimento_em && !dados.consentimento) {
    throw new ErroNegocio("O consentimento do responsável é obrigatório para criar o perfil de saúde");
  }
  const categorias = await codigosCategorias();
  const erros: string[] = [];
  for (const r of dados.restricoes) {
    if (!categorias.has(r.categoria_codigo)) erros.push(`Categoria inexistente: ${r.categoria_codigo}`);
    if (r.tipo === "DOENCA_CELIACA" && r.categoria_codigo !== "GLUTEN") erros.push("Doença celíaca deve ser declarada na categoria GLUTEN");
    if (EXCLUSAO_ESTRITA.includes(r.tipo) && r.limite_notificacao !== undefined) {
      erros.push(`${r.categoria_codigo}: limite de notificação só vale para restrições de acompanhamento`);
    }
  }
  if (erros.length) throw new ErroNegocio(erros.join("; "));

  await salvarPerfil(
    aluno_id,
    responsavel_id,
    !atual.consentimento_em,
    dados.restricoes.map((r) => ({ categoria_codigo: r.categoria_codigo, tipo: r.tipo, limite_notificacao: r.limite_notificacao ?? 2 })),
  );
  return lerPerfil(aluno_id);
}

export async function revogarPerfil(aluno_id: number) {
  await apagarPerfil(aluno_id);
}
