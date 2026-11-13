import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as notificacoes from "@/app/api/notificacoes/route";
import * as naoLidas from "@/app/api/notificacoes/nao-lidas/route";
import * as lidas from "@/app/api/notificacoes/lidas/route";

// D2: notificações na plataforma — cada usuário só vê e marca as próprias; não se apaga.
const MARCA = "TESTE D2 ";
type Papel = "operador" | "responsavel";
let tokens: Record<Papel, string>;
let ids: Record<Papel, number>;
let doOperador: number;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const json = async (r: Response) => r.json();
const ver = (token: string) => notificacoes.GET(req("/api/notificacoes", token));
const contar = async (token: string) => (await json(await naoLidas.GET(req("/api/notificacoes/nao-lidas", token)))).nao_lidas;
const marcar = (token: string, body?: unknown) => lidas.POST(req("/api/notificacoes/lidas", token, { method: "POST", body }));

beforeAll(async () => {
  const entrar = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = { operador: await entrar("operador@gmail.com"), responsavel: await entrar("responsavel@gmail.com") };
  const id = async (email: string) => (await prisma.usuario.findUniqueOrThrow({ where: { email } })).id;
  ids = { operador: await id("operador@gmail.com"), responsavel: await id("responsavel@gmail.com") };
  await prisma.notificacao.deleteMany({ where: { destinatario_id: { in: Object.values(ids) } } });
  const criar = (destinatario_id: number, n: number) =>
    prisma.notificacao.create({ data: { destinatario_id, tipo: "BLOQUEIO_SOLICITADO", mensagem: `${MARCA}${n}`, link: "/bloqueios" } });
  await criar(ids.responsavel, 1);
  await criar(ids.responsavel, 2);
  doOperador = (await criar(ids.operador, 3)).id;
});

afterAll(async () => {
  await prisma.notificacao.deleteMany({ where: { mensagem: { startsWith: MARCA } } });
  await prisma.$disconnect();
});

describe("GET /api/notificacoes e /nao-lidas", () => {
  it("sem login → 401", async () => {
    expect((await notificacoes.GET(req("/api/notificacoes"))).status).toBe(401);
    expect((await naoLidas.GET(req("/api/notificacoes/nao-lidas"))).status).toBe(401);
  });

  it("cada usuário vê só as próprias, mais recentes primeiro", async () => {
    const corpo = await json(await ver(tokens.responsavel));
    expect(corpo.nao_lidas).toBe(2);
    expect(corpo.itens.map((n: { mensagem: string }) => n.mensagem)).toEqual([`${MARCA}2`, `${MARCA}1`]);
    expect(await contar(tokens.operador)).toBe(1);
  });
});

describe("POST /api/notificacoes/lidas", () => {
  it("marcar a notificação de outro usuário não tem efeito", async () => {
    expect(await json(await marcar(tokens.responsavel, { id: doOperador }))).toEqual({ marcadas: 0, nao_lidas: 2 });
    expect(await contar(tokens.operador)).toBe(1);
  });

  it("marca uma; depois, todas (sem corpo); nada é apagado", async () => {
    const [primeira] = (await json(await ver(tokens.responsavel))).itens;
    expect(await json(await marcar(tokens.responsavel, { id: primeira.id }))).toEqual({ marcadas: 1, nao_lidas: 1 });
    expect(await json(await marcar(tokens.responsavel))).toEqual({ marcadas: 1, nao_lidas: 0 });
    const corpo = await json(await ver(tokens.responsavel));
    expect(corpo.itens).toHaveLength(2);
    expect(corpo.itens.every((n: { lida_em: string | null }) => n.lida_em)).toBe(true);
  });

  it("id inválido → 400", async () => {
    expect((await marcar(tokens.responsavel, { id: "x" })).status).toBe(400);
  });
});
