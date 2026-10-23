import bcrypt from "bcryptjs";
import { COOKIE_SESSAO, DURACAO_SESSAO_S, emitirToken } from "@/lib/acesso";
import { lerCorpo, login } from "@/lib/validacao";
import { buscarUsuarioPorEmail } from "@/repositories/usuarios";

// Hash fictício: e-mail inexistente leva o mesmo tempo que senha errada.
const HASH_FICTICIO = bcrypt.hashSync("senha-ficticia", 10);

export async function POST(req: Request) {
  const dados = await lerCorpo(req, login);
  if (dados instanceof Response) return dados;

  const usuario = await buscarUsuarioPorEmail(dados.email);
  const senhaOk = await bcrypt.compare(dados.senha, usuario?.senha_hash ?? HASH_FICTICIO);
  // Desabilitado recebe a mesma resposta: não revela que a conta existe.
  if (!usuario || !usuario.ativo || !senhaOk) return Response.json({ erro: "E-mail ou senha inválidos" }, { status: 401 });

  const token = await emitirToken({ id: usuario.id, papel: usuario.papel });
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { token, usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel } },
    {
      headers: {
        "Set-Cookie": `${COOKIE_SESSAO}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${DURACAO_SESSAO_S}${seguro}`,
      },
    },
  );
}
