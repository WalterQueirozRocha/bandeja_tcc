import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import { emitirToken } from "@/lib/acesso";
import * as login from "@/app/api/auth/login/route";
import * as sintomas from "@/app/api/alunos/[id]/sintomas/route";
import * as pedidos from "@/app/api/registros-sintomas/solicitacoes/route";
import * as pedido from "@/app/api/registros-sintomas/solicitacoes/[id]/route";
import * as liberados from "@/app/api/registros-sintomas/solicitacoes/[id]/registros/route";
import * as pdf from "@/app/api/registros-sintomas/solicitacoes/[id]/pdf/route";
import * as usuario from "@/app/api/usuarios/[id]/route";

// RF20 (decisão V3-1): pedido em tela, autorização da coordenação sem ver o conteúdo, leitura e PDF.
const DOMINIO = "@rf20.teste";
type Papel = "operador" | "aluno" | "responsavel" | "coordenacao";
let tokens: Record<Papel, string>;
let alunoId: number;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
const pedir = (token = tokens.responsavel, aluno_id = alunoId) =>
  pedidos.POST(req("/api/registros-sintomas/solicitacoes", token, { method: "POST", body: { aluno_id } }));
const decidir = (id: number, situacao: string, token = tokens.coordenacao) =>
  pedido.PUT(req(`/api/registros-sintomas/solicitacoes/${id}`, token, { method: "PUT", body: { situacao } }), ctx(id));
const ver = (id: number, token = tokens.responsavel) => liberados.GET(req(`/api/registros-sintomas/solicitacoes/${id}/registros`, token), ctx(id));
const baixar = (id: number, token = tokens.responsavel) => pdf.GET(req(`/api/registros-sintomas/solicitacoes/${id}/pdf`, token), ctx(id));
// D3: o alimento é obrigatório no registro.
const registrar = (sintoma_codigo: string, data_hora: string, observacao?: string) =>
  sintomas.POST(
    req(`/api/alunos/${alunoId}/sintomas`, tokens.aluno, { method: "POST", body: { sintoma_codigo, data_hora, observacao, alimento_externo: "lanche de casa" } }),
    ctx(alunoId),
  );
const TIPOS_RF20 = ["REGISTROS_SOLICITADOS", "REGISTROS_AUTORIZADOS", "REGISTROS_RECUSADOS"] as const;
const notificacoesRf20 = (email: string) =>
  prisma.notificacao.findMany({ where: { tipo: { in: [...TIPOS_RF20] }, destinatario: { email } }, orderBy: { id: "asc" } });
const acessos = (solicitacao_id: number) => prisma.acessoRegistros.findMany({ where: { solicitacao_id }, orderBy: { id: "asc" } });

// Responsável extra, vinculado ao aluno de teste, para os casos de vínculo desfeito.
async function novoResponsavel(nome: string) {
  const u = await prisma.usuario.create({ data: { nome, email: `${nome}${DOMINIO}`, papel: "RESPONSAVEL", senha_hash: "x" } });
  await prisma.vinculoResponsavel.create({ data: { aluno_id: alunoId, responsavel_id: u.id } });
  return { id: u.id, token: await emitirToken({ id: u.id, papel: "RESPONSAVEL" }) };
}

async function limpar() {
  // D2: as notificações do RF20 prendem os destinatários extras.
  await prisma.notificacao.deleteMany({ where: { tipo: { in: [...TIPOS_RF20] } } });
  await prisma.solicitacaoRegistros.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.registroSintoma.deleteMany({ where: { aluno_id: alunoId } });
  const extras = { email: { endsWith: DOMINIO } };
  await prisma.vinculoResponsavel.deleteMany({ where: { responsavel: extras } });
  await prisma.usuario.deleteMany({ where: extras });
}

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = {
    operador: await token("operador@gmail.com"),
    aluno: await token("aluno@gmail.com"),
    responsavel: await token("responsavel@gmail.com"),
    coordenacao: await token("coordenacao@gmail.com"),
  };
  alunoId = (await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } })).aluno!.id;
  await limpar();
});

afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("pedido e decisão", () => {
  let id: number;

  it("responsável vinculado pede; outro pedido pendente para o mesmo aluno → 422", async () => {
    await registrar("ENJOO", new Date(Date.now() - 3_600_000).toISOString());
    const res = await pedir();
    expect(res.status).toBe(201);
    id = (await json(res)).id;
    expect((await pedir()).status).toBe(422);
  });

  it("D2: a coordenação é notificada do pedido, sem o conteúdo dos registros", async () => {
    const [n] = await notificacoesRf20("coordenacao@gmail.com");
    expect(n).toMatchObject({ tipo: "REGISTROS_SOLICITADOS", link: "/registros-sintomas", lida_em: null });
    expect(n!.mensagem).toMatch(/^Novo pedido de registros de sintomas: .+ para Aluno Teste\.$/);
    expect(n!.mensagem).not.toMatch(/Enjoo|lanche/i);
  });

  it("só o responsável pede, e só para aluno vinculado", async () => {
    for (const token of [tokens.aluno, tokens.operador, tokens.coordenacao]) expect((await pedir(token)).status).toBe(403);
    expect((await pedir(tokens.responsavel, 999999)).status).toBe(403);
  });

  it("antes da autorização, nada é liberado (tela e PDF) e nenhum acesso é gravado", async () => {
    expect((await ver(id)).status).toBe(422);
    expect((await baixar(id)).status).toBe(422);
    expect(await acessos(id)).toEqual([]);
  });

  it("coordenação lista os pedidos sem nenhum dado dos registros", async () => {
    const lista = await json(await pedidos.GET(req("/api/registros-sintomas/solicitacoes", tokens.coordenacao)));
    expect(lista.find((p: { id: number }) => p.id === id)).toMatchObject({ situacao: "SOLICITADA", vinculado: true, aluno: { id: alunoId } });
    expect(JSON.stringify(lista)).not.toMatch(/sintoma|observacao|Enjoo/i);
  });

  it("aluno e operador não listam; responsável vê só os próprios", async () => {
    for (const token of [tokens.aluno, tokens.operador]) {
      expect((await pedidos.GET(req("/api/registros-sintomas/solicitacoes", token))).status).toBe(403);
    }
    const outro = await novoResponsavel("outro");
    expect(await json(await pedidos.GET(req("/api/registros-sintomas/solicitacoes", outro.token)))).toEqual([]);
  });

  it("só a coordenação decide; decidir de novo → 422", async () => {
    expect((await decidir(id, "AUTORIZADA", tokens.responsavel)).status).toBe(403);
    expect((await decidir(id, "AUTORIZADA", tokens.operador)).status).toBe(403);
    expect(await json(await decidir(id, "AUTORIZADA"))).toEqual({ id, situacao: "AUTORIZADA" });
    expect((await decidir(id, "RECUSADA")).status).toBe(422);
  });

  it("D2: o responsável é notificado da autorização, com o link para os registros", async () => {
    expect(await notificacoesRf20("responsavel@gmail.com")).toEqual([
      expect.objectContaining({
        tipo: "REGISTROS_AUTORIZADOS",
        mensagem: "Seu pedido dos registros de sintomas de Aluno Teste foi autorizado.",
        link: `/registros-sintomas/${id}`,
      }),
    ]);
  });

  it("autorizado: o responsável vê os registros gravados até a autorização, com o alimento (D3)", async () => {
    // Gravado depois da autorização, mesmo com data passada, não entra neste pedido.
    await registrar("OUTRO", new Date(Date.now() - 7_200_000).toISOString(), "dor de cabeça");
    const corpo = await json(await ver(id));
    expect(corpo.pedido.aluno.id).toBe(alunoId);
    expect(corpo.registros).toEqual([expect.objectContaining({ sintoma: "Enjoo", alimento: "Comeu antes. De fora: lanche de casa." })]);
  });

  it("D4: o acesso à tela fica registrado, e a coordenação vê só quando foi", async () => {
    expect(await acessos(id)).toEqual([expect.objectContaining({ tipo: "TELA" })]);
    const lista = await json(await pedidos.GET(req("/api/registros-sintomas/solicitacoes", tokens.coordenacao)));
    expect(lista.find((p: { id: number }) => p.id === id).ultimo_acesso).toEqual(expect.any(String));
  });

  it("coordenação, aluno e outro responsável não leem os registros nem o PDF → 403", async () => {
    const outro = await novoResponsavel("curioso");
    for (const token of [tokens.coordenacao, tokens.aluno, tokens.operador]) {
      expect((await ver(id, token)).status).toBe(403);
      expect((await baixar(id, token)).status).toBe(403);
    }
    expect((await ver(id, outro.token)).status).toBe(403);
    expect((await ver(999999)).status).toBe(403);
    expect(await acessos(id)).toHaveLength(1); // D4: acesso negado não é gravado
  });

  it("PDF: arquivo para baixar; o download fica registrado (D4)", async () => {
    const res = await baixar(id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="registros-sintomas-\d+\.pdf"$/);
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await acessos(id)).map((a) => a.tipo)).toEqual(["TELA", "PDF"]);
  });

  it("um novo pedido autorizado libera também os registros novos", async () => {
    const novo = (await json(await pedir())).id;
    await decidir(novo, "AUTORIZADA");
    const corpo = await json(await ver(novo));
    expect(corpo.registros.map((r: { sintoma: string; observacao: string | null }) => [r.sintoma, r.observacao])).toEqual([
      ["Enjoo", null],
      ["Outro", "dor de cabeça"],
    ]);
  });

  it("recusado: nada é liberado", async () => {
    const novo = (await json(await pedir())).id;
    expect((await json(await decidir(novo, "RECUSADA"))).situacao).toBe("RECUSADA");
    expect((await ver(novo)).status).toBe(422);
    expect((await notificacoesRf20("responsavel@gmail.com")).at(-1)).toMatchObject({
      tipo: "REGISTROS_RECUSADOS",
      mensagem: "Seu pedido dos registros de sintomas de Aluno Teste foi recusado.",
      link: "/registros-sintomas",
    });
  });
});

describe("vínculo desfeito", () => {
  it("não se autoriza pedido de quem deixou de ser vinculado", async () => {
    const r = await novoResponsavel("ex1");
    const id = (await json(await pedir(r.token))).id;
    await prisma.vinculoResponsavel.deleteMany({ where: { responsavel_id: r.id } });
    expect((await json(await pedidos.GET(req("/api/registros-sintomas/solicitacoes", tokens.coordenacao)))).find((p: { id: number }) => p.id === id).vinculado).toBe(false);
    expect((await decidir(id, "AUTORIZADA")).status).toBe(422);
  });

  it("quem deixou de ser vinculado perde o acesso ao que já foi autorizado", async () => {
    const r = await novoResponsavel("ex2");
    const id = (await json(await pedir(r.token))).id;
    await decidir(id, "AUTORIZADA");
    expect((await ver(id, r.token)).status).toBe(200);
    await prisma.vinculoResponsavel.deleteMany({ where: { responsavel_id: r.id } });
    expect((await ver(id, r.token)).status).toBe(403);
    expect((await baixar(id, r.token)).status).toBe(403);
  });

  it("responsável com pedido é desabilitado, não apagado (B2)", async () => {
    const r = await prisma.usuario.findUniqueOrThrow({ where: { email: `ex2${DOMINIO}` } });
    const res = await usuario.DELETE(req(`/api/usuarios/${r.id}`, tokens.coordenacao, { method: "DELETE" }), ctx(r.id));
    expect(await json(res)).toEqual({ resultado: "DESABILITADO" });
  });
});
