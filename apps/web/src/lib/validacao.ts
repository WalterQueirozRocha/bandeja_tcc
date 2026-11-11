import { z } from "zod";
import {
  CategoriaCarboidrato,
  GrupoAlimentar,
  ListaIG,
  ModoPreparo,
  OrigemIngrediente,
  Papel,
  Periodo,
  Presenca,
  SituacaoBloqueio,
  SituacaoRegistros,
  TipoRestricao,
} from "@bandeja/dados";

export const login = z.object({
  email: z.email(),
  senha: z.string().min(1),
});

export const esqueciSenha = z.object({ email: z.email() });

// B2: `?inativos=true` lista também os desabilitados (só para quem pode habilitar).
const inativos = z.stringbool().optional();

// B1-M: cadastro manual de usuários (mesmas regras do importador `usuarios`).
const SENHA_MINIMA = 6;
const nomeUsuario = z.string().trim().min(1).max(200);
const emailUsuario = z.email().transform((e) => e.toLowerCase());
const serie = z.string().trim().min(1).max(50);
const senha = z.string().min(SENHA_MINIMA).max(100);

export const novoUsuario = z
  .object({ nome: nomeUsuario, email: emailUsuario, papel: z.enum(Papel), senha, serie: serie.optional() })
  .refine((u) => (u.papel === "ALUNO") === (u.serie !== undefined), { message: "série é obrigatória para aluno e só vale para aluno", path: ["serie"] });

export const edicaoUsuario = z.object({ nome: nomeUsuario, email: emailUsuario, serie: serie.optional(), senha: senha.optional() });

export const buscaUsuarios = z.object({
  busca: z.string().trim().max(100).optional(),
  papel: z.enum(Papel).optional(),
  inativos,
});

export const vinculo = z.object({ responsavel_id: z.number().int().positive() });

export type NovoUsuario = z.infer<typeof novoUsuario>;
export type EdicaoUsuario = z.infer<typeof edicaoUsuario>;

export const buscaIngredientes = z.object({
  busca: z.string().trim().max(100).optional(),
  grupo: z.enum(GrupoAlimentar).optional(),
  origem: z.enum(OrigemIngrediente).optional(),
  inativos,
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(100).default(50),
});

const semRepetir = (marcadores: { categoria_codigo: string }[]) =>
  new Set(marcadores.map((m) => m.categoria_codigo)).size === marcadores.length;

const marcador = z.object({
  categoria_codigo: z.string().trim().min(1),
  presenca: z.enum(Presenca),
});

const conferente = z.string().trim().min(1).max(100);

const listaMarcadores = z.array(marcador).refine(semRepetir, "categoria repetida");

const por100g = z.number().min(0).nullable().optional();

const dadosIngrediente = z.object({
  nome: z.string().trim().min(1).max(200),
  grupo_alimentar: z.enum(GrupoAlimentar),
  categoria_carboidrato: z.enum(CategoriaCarboidrato),
  energia_kcal: por100g,
  proteina_g: por100g,
  lipideos_g: por100g,
  carboidrato_g: por100g,
  fibra_g: por100g,
  cinzas_g: por100g,
  umidade_g: por100g,
  rds_percentual: z.number().min(0).max(100).nullable().optional(),
});

const fonte = z.string().trim().min(1).max(300);

// Cadastro pelo rótulo ou de outra tabela (ex.: TBCA), que exige a fonte (04/11).
export const novoIngrediente = dadosIngrediente
  .extend({
    origem: z.enum(["ROTULO", "OUTRA_TABELA"]).default("ROTULO"),
    fonte: fonte.optional(),
    marcadores: listaMarcadores.default([]),
  })
  .refine((i) => (i.origem === "OUTRA_TABELA") === (i.fonte !== undefined), {
    message: "a fonte é obrigatória para alimento de outra tabela e só vale para ele",
    path: ["fonte"],
  });

// D6: na TACO a conferência dupla vale para o conjunto (lista vazia = conferido, sem alergênico).
export const substituicaoMarcadores = z.object({
  marcadores: listaMarcadores,
  conferido_por_1: conferente.optional(),
  conferido_por_2: conferente.optional(),
});

// M4: edição parcial, sempre com o motivo (registro de alterações, 04/11). Na TACO valem a categoria, o RDS
// e os campos não analisados, com a fonte; em outra tabela, a fonte também pode mudar.
export const edicaoIngrediente = dadosIngrediente
  .partial()
  .extend({ fonte: fonte.optional(), motivo: z.string().trim().min(1).max(500) })
  .refine((dados) => Object.keys(dados).some((k) => k !== "motivo"), "nada a alterar");

// Criação manual com as mesmas regras das planilhas (M1–M3). CRU sempre usa fator 1.
const modoCozido = z.enum(ModoPreparo).exclude(["CRU"]);

export const fator = z.object({
  grupo_alimentar: z.enum(GrupoAlimentar),
  modo_preparo: modoCozido,
  fator_coccao: z.number().positive().max(20),
  referencia: z.string().trim().min(1).max(300),
});

// IG na escala do pão é convertido para a da glicose (÷ 1,4), como no importador.
export const valorIg = z
  .object({
    ig: z.number().min(0).max(200),
    escala: z.enum(["GLICOSE", "PAO"]).default("GLICOSE"),
    lista: z.enum(ListaIG),
    item_correspondente: z.string().trim().min(1).max(200),
    justificativa: z.string().trim().min(1).max(500),
    conferido_por_1: conferente,
    conferido_por_2: conferente,
  })
  .refine((v) => v.conferido_por_1.toLowerCase() !== v.conferido_por_2.toLowerCase(), {
    message: "a conferência deve ser feita por outra pessoa",
    path: ["conferido_por_2"],
  })
  // IG 0 só como estimativa (passo 6 de Louie et al., 2015), como no importador.
  .refine((v) => v.ig > 0 || v.lista === "ESTIMADO", { message: "IG deve ser positivo (0 só na lista ESTIMADO)", path: ["ig"] });

export const formaCrua = z.object({ forma_crua_id: z.number().int().positive(), modo_preparo: modoCozido });

export type EdicaoIngrediente = z.infer<typeof edicaoIngrediente>;
export type FatorEntrada = z.infer<typeof fator>;
export type ValorIgEntrada = z.infer<typeof valorIg>;
export type FormaCrua = z.infer<typeof formaCrua>;

export const buscaPreparacoes = z.object({ busca: z.string().trim().max(100).optional(), inativos });

const unicos = (valores: unknown[]) => new Set(valores).size === valores.length;

export const preparacao = z.object({
  nome: z.string().trim().min(1).max(200),
  porcao_g: z.number().positive().max(5000),
  itens: z
    .array(
      z.object({
        ingrediente_id: z.number().int().positive(),
        quantidade_crua_g: z.number().positive().max(100_000),
        modo_preparo: z.enum(ModoPreparo),
      }),
    )
    .min(1)
    .refine((itens) => unicos(itens.map((i) => i.ingrediente_id)), "ingrediente repetido"),
  // RF03: "pode conter" por contato na cozinha.
  contato_cozinha: z
    .array(z.object({ categoria_codigo: z.string().trim().min(1), motivo: z.string().trim().min(1).max(200) }))
    .refine((lista) => unicos(lista.map((c) => c.categoria_codigo)), "categoria repetida")
    .default([]),
});

export type DadosPreparacaoEntrada = z.infer<typeof preparacao>;

export const cardapio = z.object({
  data: z.iso.date(),
  periodo: z.enum(Periodo),
  itens: z
    .array(z.object({ preparacao_id: z.number().int().positive(), preco: z.number().min(0).max(10_000) }))
    .min(1)
    .refine((itens) => unicos(itens.map((i) => i.preparacao_id)), "preparação repetida"),
});

// Com `ate`, publica um cardápio por dia útil do intervalo.
export const novoCardapio = cardapio
  .extend({ ate: z.iso.date().optional() })
  .refine((c) => !c.ate || c.ate >= c.data, { message: "a data final deve ser igual ou posterior à inicial", path: ["ate"] })
  .refine((c) => !c.ate || Date.parse(c.ate) - Date.parse(c.data) <= 31 * 86_400_000, { message: "intervalo de no máximo 31 dias", path: ["ate"] });

export const buscaCardapios = z.object({
  data: z.iso.date().optional(),
  periodo: z.enum(Periodo).optional(),
  inativos,
});

export const consultaAluno = z.object({ aluno_id: z.coerce.number().int().positive().optional() });

// RF06: só tipo e categoria; limite só para acompanhamento.
export const perfilSaude = z.object({
  consentimento: z.boolean().optional(),
  restricoes: z
    .array(
      z.object({
        categoria_codigo: z.string().trim().min(1),
        tipo: z.enum(TipoRestricao),
        limite_notificacao: z.number().int().min(0).max(50).optional(),
      }),
    )
    .refine((lista) => unicos(lista.map((r) => r.categoria_codigo)), "categoria repetida"),
});

// Fig. 7: sem `decisao`, uma venda com item em ATENÇÃO só devolve o alerta para o operador confirmar.
export const venda = z.object({
  aluno_id: z.number().int().positive(),
  itens: z
    .array(z.object({ item_cardapio_id: z.number().int().positive(), quantidade: z.number().int().min(1).max(20).default(1) }))
    .min(1)
    .max(100)
    .refine((itens) => unicos(itens.map((i) => i.item_cardapio_id)), "item repetido"),
  decisao: z.enum(["CONCLUIR", "ENCERRAR"]).optional(),
});

export const buscaAlunos = z.object({ busca: z.string().trim().max(100).optional() });

export const periodoHistorico = z.object({ de: z.iso.date().optional(), ate: z.iso.date().optional() });

export const novoBloqueio = z.object({
  aluno_id: z.number().int().positive(),
  preparacao_id: z.number().int().positive(),
});

export const buscaBloqueios = z.object({ situacao: z.enum(SituacaoBloqueio).optional() });

export const decisaoBloqueio = z.object({ situacao: z.enum(["EXECUTADA", "RECUSADA"]) });

// RF20: o responsável pede os registros de um aluno; a coordenação decide.
export const novoPedidoRegistros = z.object({ aluno_id: z.number().int().positive() });

export const buscaPedidosRegistros = z.object({ situacao: z.enum(SituacaoRegistros).optional() });

export const decisaoPedidoRegistros = z.object({ situacao: z.enum(["AUTORIZADA", "RECUSADA"]) });

// D2: com `id` marca uma notificação; sem corpo (ou sem `id`), todas.
export const marcacaoLidas = z.object({ id: z.number().int().positive().optional() }).optional();

// RF12: data/hora com fuso (a tela converte a hora local); texto curto (opcional) só para "Outro".
// D3: o que comeu antes (itens das próprias compras e/ou alimento de fora); ao menos um, conferido no serviço.
const itemComprado = z.object({ venda_id: z.number().int().positive(), item_cardapio_id: z.number().int().positive() });

export const registroSintoma = z.object({
  sintoma_codigo: z.string().trim().min(1),
  data_hora: z.iso.datetime({ offset: true }),
  observacao: z.string().trim().min(1).max(100).optional(),
  itens: z
    .array(itemComprado)
    .max(30)
    .refine((l) => new Set(l.map((i) => `${i.venda_id}:${i.item_cardapio_id}`)).size === l.length, "item repetido")
    .default([]),
  alimento_externo: z.string().trim().min(1).max(100).optional(),
});

export const consultaItensSintoma = z.object({ ate: z.iso.datetime({ offset: true }) });

export const consultaPanorama = z.object({
  de: z.iso.date(),
  ate: z.iso.date(),
  periodo: z.enum(Periodo).optional(),
});

export type PanoramaEntrada = z.infer<typeof consultaPanorama>;
export type SintomaEntrada = z.infer<typeof registroSintoma>;
export type VendaEntrada = z.infer<typeof venda>;
export type CardapioEntrada = z.infer<typeof cardapio>;
export type NovoCardapioEntrada = z.infer<typeof novoCardapio>;
export type PerfilEntrada = z.infer<typeof perfilSaude>;
export type NovoIngrediente = z.infer<typeof novoIngrediente>;
export type MarcadorEntrada = z.infer<typeof marcador>;
export type SubstituicaoMarcadores = z.infer<typeof substituicaoMarcadores>;

function invalido(erro: z.ZodError) {
  return Response.json(
    { erro: "Dados inválidos", detalhes: erro.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })) },
    { status: 400 },
  );
}

export async function lerCorpo<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  const corpo = await req.json().catch(() => undefined);
  const r = schema.safeParse(corpo);
  return r.success ? r.data : invalido(r.error);
}

export async function lerId(ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function lerConsulta<T extends z.ZodType>(req: Request, schema: T): z.infer<T> | Response {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const r = schema.safeParse(params);
  return r.success ? r.data : invalido(r.error);
}
