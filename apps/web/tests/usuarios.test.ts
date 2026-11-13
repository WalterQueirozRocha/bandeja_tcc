import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { importarUsuarios } from "@bandeja/dados/src/importadores";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as sessao from "@/app/api/auth/sessao/route";
import * as responsaveis from "@/app/api/alunos/[id]/responsaveis/route";
import * as responsavel from "@/app/api/alunos/[id]/responsaveis/[responsavel_id]/route";
import * as usuarios from "@/app/api/usuarios/route";
import * as usuario from "@/app/api/usuarios/[id]/route";
import * as habilitar from "@/app/api/usuarios/[id]/habilitar/route";
import * as esqueci from "@/app/api/auth/esqueci-senha/route";

// B1 / B1-M: cadastro de usuários pela coordenação e por planilha.
const DOMINIO = "@b1.teste";
let tokens: Record<"coordenacao" | "operador", string>;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
const entrar = (email: string, senha: string) => login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha } }));
const criar = (body: unknown, token = tokens.coordenacao) => usuarios.POST(req("/api/usuarios", token, { method: "POST", body }));

async function limpar() {
  await prisma.notificacao.deleteMany({ where: { tipo: "SENHA_SOLICITADA" } });
  const ids = (await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO } }, select: { id: true } })).map((u) => u.id);
  await prisma.aluno.deleteMany({ where: { usuario_id: { in: ids } } });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  const token = async (email: string) => (await json(await entrar(email, SENHA_TESTE))).token;
  tokens = { coordenacao: await token("coordenacao@gmail.com"), operador: await token("operador@gmail.com") };
  await limpar();
});

afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("cadastro manual (coordenação)", () => {
  let aluno: { id: number; aluno: { id: number } };
  let resp: { id: number };

  it("só a coordenação cria; aluno exige série; e-mail repetido → 422", async () => {
    expect((await criar({ nome: "X", email: `x${DOMINIO}`, papel: "OPERADOR", senha: "123456" }, tokens.operador)).status).toBe(403);
    expect((await criar({ nome: "Sem série", email: `s${DOMINIO}`, papel: "ALUNO", senha: "123456" })).status).toBe(400);
    const r = await criar({ nome: "Ana Aluna", email: `Ana${DOMINIO}`, papel: "ALUNO", senha: "123456", serie: "8º ano" });
    expect(r.status).toBe(201);
    aluno = await json(r);
    expect(aluno).toMatchObject({ email: `ana${DOMINIO}`, papel: "ALUNO", ativo: true, aluno: { serie: "8º ano" } });
    expect(JSON.stringify(aluno)).not.toMatch(/senha/);
    expect((await criar({ nome: "Outra", email: `ana${DOMINIO}`, papel: "OPERADOR", senha: "123456" })).status).toBe(422);
    resp = await json(await criar({ nome: "Rui Responsável", email: `rui${DOMINIO}`, papel: "RESPONSAVEL", senha: "123456" }));
  });

  it("vincula e desvincula responsável; usuário que não é responsável → 422", async () => {
    const vincular = (responsavel_id: number) =>
      responsaveis.POST(req(`/api/alunos/${aluno.aluno.id}/responsaveis`, tokens.coordenacao, { method: "POST", body: { responsavel_id } }), ctx(aluno.aluno.id));
    expect((await vincular(resp.id)).status).toBe(201);
    expect((await vincular(resp.id)).status).toBe(422);
    expect((await vincular(aluno.id)).status).toBe(422);
    const detalhe = await json(await usuario.GET(req(`/api/usuarios/${aluno.id}`, tokens.coordenacao), ctx(aluno.id)));
    expect(detalhe.aluno.responsaveis.map((r: { id: number }) => r.id)).toEqual([resp.id]);

    const desvincular = () =>
      responsavel.DELETE(req("/x", tokens.coordenacao, { method: "DELETE" }), {
        params: Promise.resolve({ id: String(aluno.aluno.id), responsavel_id: String(resp.id) }),
      });
    expect((await desvincular()).status).toBe(204);
    expect((await desvincular()).status).toBe(404);
  });

  it("edita nome e redefine a senha", async () => {
    const r = await usuario.PUT(
      req(`/api/usuarios/${aluno.id}`, tokens.coordenacao, { method: "PUT", body: { nome: "Ana Souza", email: `ana${DOMINIO}`, serie: "9º ano", senha: "nova-senha" } }),
      ctx(aluno.id),
    );
    expect(await json(r)).toMatchObject({ nome: "Ana Souza", aluno: { serie: "9º ano" } });
    expect((await entrar(`ana${DOMINIO}`, "123456")).status).toBe(401);
    expect((await entrar(`ana${DOMINIO}`, "nova-senha")).status).toBe(200);
  });

  it("sem registros → APAGADO; com vínculo → DESABILITADO, perde a sessão na hora; habilitar devolve", async () => {
    const solto = await json(await criar({ nome: "Solto", email: `solto${DOMINIO}`, papel: "OPERADOR", senha: "123456" }));
    const excluir = (id: number) => usuario.DELETE(req(`/api/usuarios/${id}`, tokens.coordenacao, { method: "DELETE" }), ctx(id));
    expect(await json(await excluir(solto.id))).toEqual({ resultado: "APAGADO" });

    await responsaveis.POST(req("/x", tokens.coordenacao, { method: "POST", body: { responsavel_id: resp.id } }), ctx(aluno.aluno.id));
    const tokenRui = (await json(await entrar(`rui${DOMINIO}`, "123456"))).token;
    expect(await json(await excluir(resp.id))).toEqual({ resultado: "DESABILITADO" });
    expect((await sessao.GET(req("/api/auth/sessao", tokenRui))).status).toBe(401);
    expect((await entrar(`rui${DOMINIO}`, "123456")).status).toBe(401);
    const ativos = await json(await usuarios.GET(req(`/api/usuarios?busca=${DOMINIO}`, tokens.coordenacao)));
    expect(ativos.map((u: { id: number }) => u.id)).not.toContain(resp.id);

    expect((await habilitar.POST(req("/x", tokens.coordenacao, { method: "POST" }), ctx(resp.id))).status).toBe(200);
    expect((await entrar(`rui${DOMINIO}`, "123456")).status).toBe(200);
  });

  it("a coordenação não desabilita o próprio usuário", async () => {
    const eu = await prisma.usuario.findUniqueOrThrow({ where: { email: "coordenacao@gmail.com" } });
    const r = await usuario.DELETE(req("/x", tokens.coordenacao, { method: "DELETE" }), ctx(eu.id));
    expect(r.status).toBe(422);
  });
});

describe("importador por planilha (B1)", () => {
  const pasta = mkdtempSync(join(tmpdir(), "usuarios-"));
  const planilha = (linhas: string[]) => {
    const arquivo = join(pasta, `u${Math.random()}.csv`);
    writeFileSync(arquivo, ["email;nome;papel;serie;responsaveis", ...linhas].join("\n"));
    return arquivo;
  };

  it("cria alunos, responsáveis e vínculos; reimportar mescla e não pede senha", async () => {
    const arquivo = planilha([`mae${DOMINIO};Mãe;RESPONSAVEL;;`, `pai${DOMINIO};Pai;RESPONSAVEL;;`, `bia${DOMINIO};Bia;ALUNO;7º ano;mae${DOMINIO}|pai${DOMINIO}`]);
    expect(await importarUsuarios("123456", arquivo)).toBe("3 usuários (3 novos)");
    const bia = await prisma.usuario.findUniqueOrThrow({ where: { email: `bia${DOMINIO}` }, include: { aluno: { include: { responsaveis: true } } } });
    expect(bia.aluno?.responsaveis).toHaveLength(2);
    expect((await entrar(`mae${DOMINIO}`, "123456")).status).toBe(200);
    expect(await importarUsuarios(undefined, arquivo)).toBe("3 usuários (0 novos)");
  });

  it("qualquer erro → nada é gravado", async () => {
    const arquivo = planilha([`novo${DOMINIO};Novo;ALUNO;;`, `x${DOMINIO};X;ALUNO;6º ano;bia${DOMINIO}`, `mae${DOMINIO};Mãe;OPERADOR;;`]);
    await expect(importarUsuarios("123456", arquivo)).rejects.toThrow(/série é obrigatória[\s\S]*não é um responsável[\s\S]*papel de um usuário existente/);
    expect(await prisma.usuario.count({ where: { email: { in: [`novo${DOMINIO}`, `x${DOMINIO}`] } } })).toBe(0);
    await expect(importarUsuarios(undefined, planilha([`outro${DOMINIO};Outro;OPERADOR;;`]))).rejects.toThrow(/--senha=/);
  });
});

describe("esqueci a senha (03/11, sem e-mail)", () => {
  const pedir = (email: string) => esqueci.POST(req("/api/auth/esqueci-senha", undefined, { method: "POST", body: { email } }));
  const avisos = () => prisma.notificacao.findMany({ where: { tipo: "SENHA_SOLICITADA" } });

  it("notifica a coordenação uma vez; e-mail inexistente responde igual e não gera nada", async () => {
    const pessoa = await json(await criar({ nome: "Esquecida", email: `esq${DOMINIO}`, papel: "OPERADOR", senha: "123456" }));
    const [existe, naoExiste] = [await pedir(`ESQ${DOMINIO}`), await pedir(`ninguem${DOMINIO}`)];
    expect(existe.status).toBe(202);
    expect(await json(existe)).toEqual(await json(naoExiste));
    expect((await pedir("nao-e-email")).status).toBe(400);
    await pedir(`esq${DOMINIO}`); // repetido com aviso não lido: não duplica
    const lista = await avisos();
    const coordenacao = await prisma.usuario.count({ where: { papel: "COORDENACAO", ativo: true } });
    expect(lista).toHaveLength(coordenacao);
    expect(lista[0]).toMatchObject({ link: `/usuarios/${pessoa.id}`, mensagem: expect.stringContaining("Esquecida") });
  });
});
