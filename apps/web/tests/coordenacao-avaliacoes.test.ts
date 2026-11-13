import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, type Prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as cardapio from "@/app/api/cardapios/[id]/route";
import * as panorama from "@/app/api/coordenacao/panorama/route";
import * as vendas from "@/app/api/vendas/route";
import { avaliarA1, importarA1, PREFIXO_A1 } from "@/avaliacoes/a1";

const PREFIXO = "TESTE I6 ";
const DATAS = ["2096-01-01", "2096-01-02"];
type Papel = "operador" | "aluno" | "responsavel" | "coordenacao";
let tokens: Record<Papel, string>;
let alunoId: number;
let farinhaId: number;
let marcadoresFarinha: Prisma.MarcadorIngredienteCreateManyInput[];
let cardapioId: number;
let itens: Record<"pacoca" | "pao" | "arroz" | "biscoito", number>;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
const verPanorama = (consulta: string, token = tokens.coordenacao) => panorama.GET(req(`/api/coordenacao/panorama?${consulta}`, token));

async function criarPreparacao(nome: string, codigoTaco: number, cozinha: string[]) {
  const ingrediente = await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: codigoTaco } });
  return (
    await prisma.preparacao.create({
      data: {
        nome: PREFIXO + nome,
        porcao_g: 100,
        peso_final_calculado: 100,
        itens: { create: [{ ingrediente_id: ingrediente.id, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
        marcadores_cozinha: { create: cozinha.map((categoria_codigo) => ({ categoria_codigo, presenca: "PODE_CONTER" as const, motivo: "teste" })) },
      },
    })
  ).id;
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
  const usuarioAluno = await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } });
  const responsavel = await prisma.usuario.findUniqueOrThrow({ where: { email: "responsavel@gmail.com" } });
  alunoId = usuarioAluno.aluno!.id;
  farinhaId = (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 35 } })).id;
  // Os marcadores reais da farinha (marcadores.csv) saem durante o teste e voltam no fim.
  marcadoresFarinha = await prisma.marcadorIngrediente.findMany({ where: { ingrediente_id: farinhaId } });
  await prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id: farinhaId } });

  const preps = {
    pacoca: await criarPreparacao("Paçoca", 4, ["AMENDOIM"]),
    pao: await criarPreparacao("Pão", 35, ["GLUTEN"]),
    arroz: await criarPreparacao("Arroz", 4, []),
    biscoito: await criarPreparacao("Biscoito", 35, []),
  };
  const [dia1] = await Promise.all(
    DATAS.map((d, i) =>
      prisma.cardapio.create({
        data: {
          data: new Date(`${d}T00:00:00Z`),
          periodo: "MANHA",
          itens: { create: (i === 0 ? Object.values(preps) : [preps.pacoca, preps.arroz]).map((preparacao_id) => ({ preparacao_id, preco: 5 })) },
        },
        include: { itens: true },
      }),
    ),
  );
  cardapioId = dia1!.id;
  const idDe = (prep: number) => dia1!.itens.find((i) => i.preparacao_id === prep)!.id;
  itens = { pacoca: idDe(preps.pacoca), pao: idDe(preps.pao), arroz: idDe(preps.arroz), biscoito: idDe(preps.biscoito) };

  // Vendas agregadas do período (sem identificar alunos no panorama).
  const operador = await prisma.usuario.findUniqueOrThrow({ where: { email: "operador@gmail.com" } });
  const venda = (resultado: "CONCLUIDA" | "BLOQUEADA", hora: string) =>
    prisma.venda.create({
      data: { aluno_id: alunoId, operador_id: operador.id, resultado, data_hora: new Date(hora), itens: { create: [{ item_cardapio_id: itens.arroz, compatibilidade: "COMPATIVEL", preco: 5 }] } },
    });
  await venda("CONCLUIDA", "2096-01-01T12:00:00Z");
  await venda("CONCLUIDA", "2096-01-02T12:00:00Z");
  await venda("BLOQUEADA", "2096-01-02T13:00:00Z");
  await venda("CONCLUIDA", "2096-01-03T12:00:00Z"); // fora do período

  await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.aluno.update({
    where: { id: alunoId },
    data: {
      consentimento_por: responsavel.id,
      consentimento_em: new Date(),
      restricoes: { create: [{ categoria_codigo: "AMENDOIM", tipo: "ALERGIA", declarada_por: responsavel.id }] },
    },
  });
});

afterAll(async () => {
  await prisma.venda.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.cardapio.deleteMany({ where: { data: { in: DATAS.map((d) => new Date(`${d}T00:00:00Z`)) } } });
  await prisma.preparacao.deleteMany({ where: { OR: [{ nome: { startsWith: PREFIXO } }, { nome: { startsWith: PREFIXO_A1 } }] } });
  await prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id: farinhaId } });
  await prisma.marcadorIngrediente.createMany({ data: marcadoresFarinha });
  await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.aluno.update({ where: { id: alunoId }, data: { consentimento_por: null, consentimento_em: null } });
  await prisma.$disconnect();
});

describe("GET /api/coordenacao/panorama (RF15)", () => {
  it("coordenação e operador veem; aluno e responsável → 403", async () => {
    expect((await verPanorama(`de=${DATAS[0]}&ate=${DATAS[1]}`)).status).toBe(200);
    expect((await verPanorama(`de=${DATAS[0]}&ate=${DATAS[1]}`, tokens.operador)).status).toBe(200);
    expect((await verPanorama(`de=${DATAS[0]}&ate=${DATAS[1]}`, tokens.aluno)).status).toBe(403);
    expect((await verPanorama(`de=${DATAS[0]}&ate=${DATAS[1]}`, tokens.responsavel)).status).toBe(403);
  });

  it("indicadores por item ofertado e vendas agregadas do período", async () => {
    const p = await json(await verPanorama(`de=${DATAS[0]}&ate=${DATAS[1]}`));
    expect(p.base).toEqual({ cardapios: 2, itens_ofertados: 6 });
    expect(p.categorias).toEqual([
      { categoria: "AMENDOIM", nome: "Amendoim", contem: 0, pode_conter: 2, total: 2 },
      { categoria: "GLUTEN", nome: "Glúten", contem: 0, pode_conter: 1, total: 1 },
    ]);
    expect(p.medias_por_porcao.carboidrato_disponivel_g).toBeGreaterThan(0);
    expect(p.medias_por_porcao.rotulo_glicemico).toBe("estimativa");
    expect(p.vendas).toEqual({ CONCLUIDA: 2, BLOQUEADA: 1, CANCELADA_PELO_OPERADOR: 0 });
    expect(JSON.stringify(p)).not.toMatch(/aluno/i);
  });

  it("período sem cardápio: médias vazias; datas invertidas ou período longo → 422", async () => {
    const vazio = await json(await verPanorama("de=2095-01-01&ate=2095-01-02"));
    expect(vazio.base.itens_ofertados).toBe(0);
    expect(vazio.medias_por_porcao.carboidrato_disponivel_g).toBeNull();
    expect((await verPanorama(`de=${DATAS[1]}&ate=${DATAS[0]}`)).status).toBe(422);
    expect((await verPanorama("de=2094-01-01&ate=2096-01-01")).status).toBe(422);
    expect((await verPanorama("de=2096-01-01")).status).toBe(400);
  });
});

describe("RF16: alternativa compatível", () => {
  it("no cardápio do aluno: item bloqueado sugere até 3 compatíveis; compatível não sugere", async () => {
    const corpo = await json(await cardapio.GET(req(`/api/cardapios/${cardapioId}`, tokens.aluno), ctx(cardapioId)));
    const pacoca = corpo.itens.find((i: { id: number }) => i.id === itens.pacoca);
    expect(pacoca.compatibilidade.resultado).toBe("BLOQUEADO");
    expect(pacoca.alternativas.map((a: { item_cardapio_id: number }) => a.item_cardapio_id).sort()).toEqual(
      [itens.pao, itens.arroz, itens.biscoito].sort(),
    );
    const arroz = corpo.itens.find((i: { id: number }) => i.id === itens.arroz);
    expect(arroz.alternativas).toEqual([]);
  });

  it("no balcão: a venda bloqueada traz as sugestões", async () => {
    const res = await vendas.POST(req("/api/vendas", tokens.operador, { method: "POST", body: { aluno_id: alunoId, itens: [{ item_cardapio_id: itens.pacoca }] } }));
    const corpo = await json(res);
    expect(corpo.resultado).toBe("BLOQUEADA");
    expect(corpo.itens[0].alternativas).toHaveLength(3);
  });
});

describe("A1: importação e avaliação com planilhas de exemplo", () => {
  let pasta: string;

  beforeAll(() => {
    pasta = mkdtempSync(join(tmpdir(), "bandeja-a1-"));
    const escrever = (nome: string, texto: string) => writeFileSync(join(pasta, nome), texto, "utf8");
    escrever("a1-preparacoes.csv", "preparacao;codigo_taco;quantidade_crua_g;modo_preparo;porcao_g;contato_cozinha\nBolo;35;200;CRU;80;AMENDOIM\nBolo;4;50;CRU;;\n");
    escrever("a1-gabarito.csv", "preparacao;categoria\nBolo;TRIGO\nBolo;GLUTEN\nBolo;OVOS\n");
    escrever("a1-manual.csv", "preparacao;categoria\nBolo;TRIGO\n");
  });

  afterAll(() => rmSync(pasta, { recursive: true, force: true }));

  it("importa a ficha técnica e calcula as taxas do Bandeja e da marcação manual", async () => {
    await prisma.marcadorIngrediente.createMany({
      data: ["TRIGO", "GLUTEN"].map((categoria_codigo) => ({
        ingrediente_id: farinhaId, categoria_codigo, presenca: "CONTEM" as const, origem: "MAPEAMENTO" as const, conferido_por_1: "Ana", conferido_por_2: "Bruno",
      })),
    });
    const url = pathToFileURL(`${pasta}/`);
    expect(await importarA1(url)).toBe("1 preparações da A1 importadas");
    expect(await importarA1(url)).toBe("1 preparações da A1 importadas"); // reimportar não duplica
    expect(await prisma.preparacao.count({ where: { nome: `${PREFIXO_A1}Bolo` } })).toBe(1);

    // Bandeja: {TRIGO, GLUTEN, AMENDOIM} × gabarito {TRIGO, GLUTEN, OVOS} → VP 2, FN 1, FP 1.
    // Manual: {TRIGO} → VP 1, FN 2, FP 0.
    const resumo = await avaliarA1(url);
    expect(resumo).toContain("BANDEJA: VP 2, FN 1, FP 1 · T_omissão 33,3% · T_falso alarme 33,3%");
    expect(resumo).toContain("MANUAL: VP 1, FN 2, FP 0 · T_omissão 66,7% · T_falso alarme 0,0%");
    expect(readFileSync(join(pasta, "resultados", "a1.csv"), "utf8")).toContain("BANDEJA;TOTAL;2;1;1;33,3;33,3");
  });

  it("nome divergente entre as planilhas → erro listando a preparação", async () => {
    writeFileSync(join(pasta, "a1-manual.csv"), "preparacao;categoria\nBolo de cenoura;TRIGO\n", "utf8");
    await expect(avaliarA1(pathToFileURL(`${pasta}/`))).rejects.toThrow(/Bolo de cenoura/);
  });
});
