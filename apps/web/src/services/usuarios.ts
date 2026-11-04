import bcrypt from "bcryptjs";
import { textos } from "@bandeja/dominio";
import type { EdicaoUsuario, NovoUsuario } from "@/lib/validacao";
import {
  apagarUsuario,
  apagarVinculo,
  atualizarUsuario,
  buscarAluno,
  buscarUsuarioPorEmail,
  criarUsuario,
  criarVinculo,
  detalharUsuario,
  mudarAtivoUsuario,
  usuarioEmUso,
} from "@/repositories/usuarios";
import { criarNotificacoes, emTransacao, existeNaoLida, idsAtivosDoPapel } from "@/repositories/notificacoes";
import { ErroNegocio } from "./erros";

// B1-M: a coordenação cria e mantém as contas. O papel não muda depois de criado.

const hash = (senha: string) => bcrypt.hash(senha, 10);

async function exigirUsuario(id: number) {
  const usuario = await detalharUsuario(id);
  if (!usuario) throw new ErroNegocio("Usuário não encontrado", 404);
  return usuario;
}

async function conferirEmailLivre(email: string, id?: number) {
  const dono = await buscarUsuarioPorEmail(email);
  if (dono && dono.id !== id) throw new ErroNegocio("E-mail já cadastrado");
}

export async function cadastrarUsuario({ senha, ...dados }: NovoUsuario) {
  await conferirEmailLivre(dados.email);
  return criarUsuario({ ...dados, senha_hash: await hash(senha) });
}

export async function editarUsuario(id: number, { senha, ...dados }: EdicaoUsuario) {
  const atual = await exigirUsuario(id);
  if (dados.serie !== undefined && !atual.aluno) throw new ErroNegocio("Série só vale para aluno");
  await conferirEmailLivre(dados.email, id);
  return atualizarUsuario(id, { ...dados, ...(senha && { senha_hash: await hash(senha) }) });
}

export async function lerUsuario(id: number) {
  const u = await exigirUsuario(id);
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    ativo: u.ativo,
    ...(u.aluno && { aluno: { id: u.aluno.id, serie: u.aluno.serie, responsaveis: u.aluno.responsaveis.map((r) => r.responsavel) } }),
    ...(u.papel === "RESPONSAVEL" && {
      alunos: u.vinculos.map(({ aluno }) => ({ id: aluno.id, serie: aluno.serie, nome: aluno.usuario?.nome ?? `Aluno ${aluno.id}` })),
    }),
  };
}

// B2: apaga quem nunca teve registro; senão desabilita (perde a sessão na hora).
export async function excluirUsuario(id: number, quem: number) {
  if (id === quem) throw new ErroNegocio("Não é possível desabilitar o próprio usuário");
  await exigirUsuario(id);
  if (await usuarioEmUso(id)) {
    await mudarAtivoUsuario(id, false);
    return { resultado: "DESABILITADO" as const };
  }
  await apagarUsuario(id);
  return { resultado: "APAGADO" as const };
}

export async function habilitarUsuario(id: number) {
  await exigirUsuario(id);
  return mudarAtivoUsuario(id, true);
}

export async function vincularResponsavel(aluno_id: number, responsavel_id: number) {
  if (!(await buscarAluno(aluno_id))) throw new ErroNegocio("Aluno não encontrado", 404);
  const responsavel = await detalharUsuario(responsavel_id);
  if (responsavel?.papel !== "RESPONSAVEL") throw new ErroNegocio("O usuário informado não é um responsável");
  if (responsavel.vinculos.some((v) => v.aluno.id === aluno_id)) throw new ErroNegocio("Responsável já vinculado a este aluno");
  await criarVinculo(aluno_id, responsavel_id);
  return { aluno_id, responsavel_id };
}

export async function desvincularResponsavel(aluno_id: number, responsavel_id: number) {
  if ((await apagarVinculo(aluno_id, responsavel_id)).count === 0) throw new ErroNegocio("Vínculo não encontrado", 404);
}

// Esqueci a senha (03/11), sem e-mail: a coordenação ativa é notificada e redefine em /usuarios/[id].
// Quem chama responde sempre igual; conta inexistente ou desabilitada não gera nada, e não repete aviso não lido.
export async function pedirNovaSenha(email: string) {
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario?.ativo) return;
  const link = `/usuarios/${usuario.id}`;
  await emTransacao(async (tx) => {
    if (await existeNaoLida(tx, "SENHA_SOLICITADA", link)) return;
    const coordenacao = (await idsAtivosDoPapel(tx, "COORDENACAO")).filter((id) => id !== usuario.id);
    const mensagem = textos.senhaSolicitada(usuario.nome, usuario.email);
    await criarNotificacoes(tx, coordenacao.map((destinatario_id) => ({ destinatario_id, tipo: "SENHA_SOLICITADA", mensagem, link })));
  });
}
