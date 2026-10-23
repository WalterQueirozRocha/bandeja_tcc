import { COOKIE_SESSAO } from "@/lib/acesso";

export async function POST() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": `${COOKIE_SESSAO}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0` },
  });
}
