import { avaliar, cgRefeicao, cgRefeicaoSeCalculavel, deveNotificar, semanaDe, textos, ROTULO_ESTIMATIVA, type Compatibilidade } from "@bandeja/dominio";
import type { ResultadoVenda } from "@bandeja/dados";
import { inicioDoDiaNaBahia } from "@/lib/datas";
import type { VendaEntrada } from "@/lib/validacao";
import { perfilCompatibilidade } from "@/repositories/alunos";
import { nomesCategorias } from "@/repositories/preparacoes";
import {
  alunoComResponsaveis,
  buscarItensCardapio,
  comTravaDoAluno,
  consumosNaSemana,
  gravarVenda,
  historicoDoAluno,
  notificacaoExiste,
  restricoesAcompanhamento,
} from "@/repositories/vendas";
import { criarNotificacoes } from "@/repositories/notificacoes";
import { montarCardapio } from "./cardapios";
import { ErroNegocio } from "./erros";
import { resumirPreparacoes } from "./preparacoes";

// Fig. 7 / RF08–RF10. O operador recebe só os textos fixos dos alertas, nunca o perfil (RNF04).
export async function registrarVenda(operador_id: number, dados: VendaEntrada) {
  const aluno = await alunoComResponsaveis(dados.aluno_id);
  if (!aluno) throw new ErroNegocio("Aluno não encontrado", 404);
  const ids = dados.itens.map((i) => i.item_cardapio_id);
  const itensCardapio = await buscarItensCardapio(ids);
  const faltando = ids.filter((id) => !itensCardapio.some((i) => i.id === id));
  if (faltando.length) throw new ErroNegocio(`Itens do cardápio inexistentes: ${faltando.join(", ")}`);

  const [resumos, perfil] = await Promise.all([
    resumirPreparacoes([...new Set(itensCardapio.map((i) => i.preparacao_id))]),
    perfilCompatibilidade(aluno.id),
  ]);
  const itens = dados.itens.map(({ item_cardapio_id: id, quantidade }) => {
    const item = itensCardapio.find((i) => i.id === id)!;
    const prep = resumos.get(item.preparacao_id)!;
    const { resultado, alertas } = avaliar(
      perfil,
      { id: item.preparacao_id, nome: item.preparacao.nome },
      prep.alergenos.map((a) => ({ categoria: a.categoria, nome: a.nome })),
    );
    return {
      item_cardapio_id: id,
      nome: item.preparacao.nome,
      compatibilidade: resultado,
      alertas,
      // B4: valores do momento da venda.
      valores: {
        preco: item.preco,
        quantidade,
        carboidrato_disponivel_g: prep.carga_glicemica.carboidrato_disponivel_g,
        cg: prep.carga_glicemica.rytz?.cg ?? null,
        // FC-01: sem carboidrato disponível a CG é 0, e não "não calculável" (não tira a refeição do cálculo).
        cg_fao: prep.carga_glicemica.fao?.cg ?? (prep.carga_glicemica.carboidrato_disponivel_g === 0 ? 0 : null),
        categorias_atencao: alertas.filter((a) => a.resultado === "ATENCAO").map((a) => a.categoria!),
      },
    };
  });
  const tem = (c: Compatibilidade) => itens.some((i) => i.compatibilidade === c);
  const alternativas = await alternativasNoBalcao(
    itens.filter((i) => i.compatibilidade !== "COMPATIVEL").map((i) => i.item_cardapio_id),
    itensCardapio,
    aluno.id,
  );
  const resposta = (resultado: ResultadoVenda | "CONFIRMACAO_NECESSARIA") => ({
    resultado,
    total: totalDaVenda(itens.map((i) => i.valores)),
    itens: itens.map(({ item_cardapio_id, nome, compatibilidade, alertas, valores }) => ({
      item_cardapio_id,
      nome,
      quantidade: valores.quantidade,
      compatibilidade,
      alertas: alertas.map((a) => a.texto),
      ...(compatibilidade !== "COMPATIVEL" && { alternativas: alternativas.get(item_cardapio_id) ?? [] }),
    })),
  });

  // P7: um item bloqueado bloqueia a venda inteira, qualquer que seja a decisão.
  let resultado: ResultadoVenda;
  if (tem("BLOQUEADO")) resultado = "BLOQUEADA";
  else if (tem("ATENCAO") && !dados.decisao) return { gravada: false, ...resposta("CONFIRMACAO_NECESSARIA") };
  else resultado = tem("ATENCAO") && dados.decisao === "ENCERRAR" ? "CANCELADA_PELO_OPERADOR" : "CONCLUIDA";

  const venda = await gravarVenda(
    aluno.id,
    operador_id,
    resultado,
    itens.map(({ item_cardapio_id, compatibilidade, valores }) => ({ item_cardapio_id, compatibilidade, ...valores })),
  );
  const contagem =
    resultado === "CONCLUIDA" && tem("ATENCAO")
      ? await contarENotificar(aluno, itens.flatMap((i) => i.valores.categorias_atencao), venda.data_hora)
      : [];
  return { gravada: true, venda_id: venda.id, ...resposta(resultado), contagem };
}

// Soma em centavos para não acumular erro de ponto flutuante.
const totalDaVenda = (itens: { preco: { toString(): string }; quantidade: number }[]) =>
  itens.reduce((s, i) => s + Math.round(Number(i.preco) * 100) * i.quantidade, 0) / 100;

// RF16 no balcão: as alternativas vêm do cardápio de cada item com restrição (só quando há algum).
async function alternativasNoBalcao(
  comRestricao: number[],
  itensCardapio: { id: number; cardapio_id: number }[],
  aluno_id: number,
) {
  const porItem = new Map<number, { item_cardapio_id: number; nome: string }[]>();
  const cardapios = new Set(itensCardapio.filter((i) => comRestricao.includes(i.id)).map((i) => i.cardapio_id));
  for (const cardapio_id of cardapios) {
    for (const i of (await montarCardapio(cardapio_id, aluno_id)).itens) {
      if ("alternativas" in i && comRestricao.includes(i.id)) porItem.set(i.id, i.alternativas);
    }
  }
  return porItem;
}

type AlunoNotificacao = NonNullable<Awaited<ReturnType<typeof alunoComResponsaveis>>>;

// RF11 / doc §4.7: conta os consumos da semana (incluindo esta venda) só das categorias em ATENÇÃO nesta venda.
// D2: o aviso é a notificação na plataforma, gravada sob a trava (sem chamada externa).
async function contarENotificar(aluno: AlunoNotificacao, categoriasDaVenda: string[], agora: Date) {
  const semana = semanaDe(agora);
  const [restricoes, nomes] = await Promise.all([restricoesAcompanhamento(aluno.id), nomesCategorias()]);
  const periodo = new Date(`${semana.segunda}T00:00:00Z`);
  const nomeAluno = aluno.usuario?.nome ?? `Aluno ${aluno.id}`;

  const contagem = [];
  for (const r of restricoes.filter((r) => categoriasDaVenda.includes(r.categoria_codigo))) {
    // B4: conta pelas categorias gravadas em cada venda, não pela preparação atual.
    const consumos = await consumosNaSemana(aluno.id, r.categoria_codigo, semana.inicio, semana.fim);
    const categoria = nomes.get(r.categoria_codigo) ?? r.categoria_codigo;
    let notificados = 0;
    for (const { responsavel } of aluno.responsaveis) {
      const chave = { destinatario_id: responsavel.id, aluno_id: aluno.id, categoria_codigo: r.categoria_codigo, periodo };
      const enviou = await comTravaDoAluno(aluno.id, async (tx) => {
        if (!deveNotificar(consumos, r.limite_notificacao, await notificacaoExiste(tx, chave))) return false;
        await criarNotificacoes(tx, [
          {
            ...chave,
            tipo: "LIMITE_SEMANAL",
            mensagem: textos.notificacao(nomeAluno, consumos, categoria, r.limite_notificacao),
            link: "/historico",
          },
        ]);
        return true;
      });
      if (enviou) notificados++;
    }
    contagem.push({ categoria: r.categoria_codigo, consumos, limite: r.limite_notificacao, notificados });
  }
  return contagem;
}

// Histórico de consumo (D7) com a CG da refeição (P15): só vendas concluídas.
export async function lerHistorico(aluno_id: number, de?: string, ate?: string) {
  const vendas = await historicoDoAluno(
    aluno_id,
    de ? inicioDoDiaNaBahia(de) : undefined,
    ate ? inicioDoDiaNaBahia(ate, 1) : undefined,
  );
  // B4: preço, carboidrato e CG gravados na venda (vendas anteriores à migração não têm carboidrato nem CG).
  // Carboidrato e CG são por unidade: o item conta quantidade × o valor gravado.
  return vendas.map((v) => {
    const itens = v.itens.map((i) => ({
      preparacao_id: i.item_cardapio.preparacao.id,
      nome: i.item_cardapio.preparacao.nome,
      preco: Number(i.preco),
      quantidade: i.quantidade,
      compatibilidade: i.compatibilidade,
      carboidrato_disponivel_g: (i.carboidrato_disponivel_g ?? 0) * i.quantidade,
      cg: i.cg === null ? null : i.cg * i.quantidade,
      cg_fao: i.cg_fao === null ? null : i.cg_fao * i.quantidade,
    }));
    return {
      venda_id: v.id,
      data_hora: v.data_hora,
      itens,
      total: totalDaVenda(itens),
      carboidrato_disponivel_g: itens.reduce((s, i) => s + i.carboidrato_disponivel_g, 0),
      cg_refeicao: cgRefeicao(itens.flatMap((i) => (i.cg === null ? [] : [i.cg]))),
      // FC-01 / RF04: a refeição também pela FAO/OMS; vendas anteriores à coluna ficam "não calculável".
      cg_refeicao_fao: cgRefeicaoSeCalculavel(itens.map((i) => i.cg_fao)),
      rotulo: ROTULO_ESTIMATIVA,
    };
  });
}
