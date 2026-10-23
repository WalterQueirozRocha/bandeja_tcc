import { exigirPerfil } from "@/lib/acesso";
import { alunosDoResponsavel, buscarAlunoDoUsuario } from "@/repositories/alunos";
import { buscarUsuario } from "@/repositories/usuarios";

// Doc §10 "/auth: perfil do usuário": quem está logado e a quais alunos tem acesso.
export async function GET(req: Request) {
  const sessao = await exigirPerfil(req);
  if (sessao instanceof Response) return sessao;
  const usuario = await buscarUsuario(sessao.id);
  if (!usuario) return Response.json({ erro: "Não autenticado" }, { status: 401 });
  return Response.json({
    usuario,
    ...(usuario.papel === "ALUNO" && { aluno_id: (await buscarAlunoDoUsuario(usuario.id))?.id ?? null }),
    ...(usuario.papel === "RESPONSAVEL" && { alunos: await alunosDoResponsavel(usuario.id) }),
  });
}
