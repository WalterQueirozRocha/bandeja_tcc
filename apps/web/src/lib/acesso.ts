import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Papel } from "@bandeja/dados";
import { usuarioAtivo } from "@/repositories/usuarios";

export const COOKIE_SESSAO = "bandeja_sessao";
export const DURACAO_SESSAO_S = 8 * 60 * 60;

export type Sessao = { id: number; papel: Papel };

function segredo() {
  const s = process.env.JWT_SEGREDO;
  if (!s) throw new Error("JWT_SEGREDO não definido");
  return new TextEncoder().encode(s);
}

export async function emitirToken(sessao: Sessao) {
  return new SignJWT({ papel: sessao.papel })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(sessao.id))
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_SESSAO_S}s`)
    .sign(segredo());
}

// Além do token, o usuário precisa continuar ativo: desabilitar corta a sessão na hora (3b).
export async function verificarToken(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  let sessao: Sessao;
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    sessao = { id: Number(payload.sub), papel: payload.papel as Papel };
  } catch {
    return null;
  }
  return (await usuarioAtivo(sessao.id)) ? sessao : null;
}

// Bearer (API/app) ou cookie httpOnly (web).
function tokenDaRequisicao(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${COOKIE_SESSAO}=([^;]+)`))?.[1];
  return bearer ?? cookie;
}

// Para páginas (componentes de servidor): sem sessão válida, vai para o login.
export async function exigirSessaoNaPagina(): Promise<Sessao> {
  const sessao = await verificarToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) redirect("/login");
  return sessao;
}

// Guarda do Quadro 9, chamada no início de cada rota. Sem `papeis`, basta estar autenticado.
export async function exigirPerfil(req: Request, papeis?: Papel[]): Promise<Sessao | Response> {
  const sessao = await verificarToken(tokenDaRequisicao(req));
  if (!sessao) return Response.json({ erro: "Não autenticado" }, { status: 401 });
  if (papeis && !papeis.includes(sessao.papel)) return Response.json({ erro: "Acesso negado" }, { status: 403 });
  return sessao;
}
