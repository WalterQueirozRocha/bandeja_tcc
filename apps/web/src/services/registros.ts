import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { textos } from "@bandeja/dominio";
import type { Sessao } from "@/lib/acesso";
import type { SituacaoRegistros } from "@bandeja/dados";
import { estaVinculado } from "@/repositories/alunos";
import { buscarPedido, criarPedido, existePedidoPendente, gravarDecisao, listarPedidos } from "@/repositories/registros";
import { registrosGravadosAte } from "@/repositories/sintomas";
import { exigirAcessoAoAluno } from "./alunos";
import { ErroNegocio } from "./erros";

// RF20 (decisão V3-1): o responsável pede; a coordenação autoriza sem ver o conteúdo;
// o responsável vê na plataforma os registros gravados até a autorização e pode baixar o PDF.
export async function pedirRegistros(sessao: Sessao, aluno_id: number) {
  await exigirAcessoAoAluno(sessao, aluno_id, ["RESPONSAVEL"]);
  if (await existePedidoPendente(sessao.id, aluno_id)) throw new ErroNegocio("Já existe um pedido aguardando a escola para este aluno");
  return criarPedido(sessao.id, aluno_id);
}

// Responsável vê os próprios pedidos; coordenação vê todos (só os dados do pedido).
export function verPedidos(sessao: Sessao, situacao?: SituacaoRegistros) {
  return listarPedidos({ situacao, responsavel_id: sessao.papel === "RESPONSAVEL" ? sessao.id : undefined });
}

export async function decidirPedido(sessao: Sessao, id: number, situacao: "AUTORIZADA" | "RECUSADA") {
  const pedido = await buscarPedido(id);
  if (!pedido) throw new ErroNegocio("Pedido não encontrado", 404);
  if (pedido.situacao !== "SOLICITADA") throw new ErroNegocio(`Pedido já está ${pedido.situacao}`);
  if (situacao === "AUTORIZADA" && !(await estaVinculado(pedido.aluno.id, pedido.responsavel_id))) {
    throw new ErroNegocio("Quem pediu não é mais responsável vinculado ao aluno");
  }
  if (!(await gravarDecisao(id, situacao, sessao.id))) throw new ErroNegocio("Pedido já foi decidido");
  return { id, situacao };
}

// Só o responsável que pediu, com o pedido autorizado e o vínculo ainda ativo.
export async function registrosLiberados(sessao: Sessao, id: number) {
  const pedido = await buscarPedido(id);
  if (!pedido || pedido.responsavel_id !== sessao.id) throw new ErroNegocio("Acesso negado", 403);
  if (pedido.situacao !== "AUTORIZADA" || !pedido.decidida_em) throw new ErroNegocio("O pedido ainda não foi autorizado pela escola");
  if (!(await estaVinculado(pedido.aluno.id, sessao.id))) throw new ErroNegocio("Acesso negado", 403);
  const registros = await registrosGravadosAte(pedido.aluno.id, pedido.decidida_em);
  return {
    pedido: { id: pedido.id, aluno: pedido.aluno, autorizado_em: pedido.decidida_em },
    registros: registros.map((r) => ({ id: r.id, data_hora: r.data_hora, sintoma: r.sintoma.descricao, observacao: r.observacao })),
  };
}

export type RegistrosLiberados = Awaited<ReturnType<typeof registrosLiberados>>;

export const dataHoraNaBahia = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

// ponytail: a fonte padrão do PDF (WinAnsi) cobre o português; o que estiver fora vira "?".
const paraWinAnsi = (texto: string) => texto.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(" ")) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  return atual ? [...linhas, atual] : linhas;
}

export async function gerarPdfRegistros({ pedido, registros }: RegistrosLiberados) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [LARGURA, ALTURA, MARGEM] = [595, 842, 50]; // A4 em pontos
  const util = LARGURA - 2 * MARGEM;
  let pagina: PDFPage = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - MARGEM;

  const garantirEspaco = (altura: number) => {
    if (y >= MARGEM + altura) return;
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - MARGEM;
  };
  const escrever = (texto: string, opcoes: { x?: number; tamanho?: number; fonte?: PDFFont; largura?: number } = {}) => {
    const { x = MARGEM, tamanho = 10, fonte = normal, largura = util - (x - MARGEM) } = opcoes;
    for (const linha of quebrarLinhas(paraWinAnsi(texto), fonte, tamanho, largura)) {
      garantirEspaco(tamanho);
      pagina.drawText(linha, { x, y, size: tamanho, font: fonte });
      y -= tamanho + 4;
    }
  };

  escrever("Bandeja - Registros de sintomas", { tamanho: 16, fonte: negrito });
  y -= 6;
  escrever(`Aluno: ${pedido.aluno.nome} (${pedido.aluno.serie})`);
  escrever(`Registros gravados até ${dataHoraNaBahia(pedido.autorizado_em)}, data da autorização da escola`);
  y -= 10;
  if (registros.length === 0) escrever("Nenhum registro.");
  for (const r of registros) {
    garantirEspaco(50); // a linha do registro (até 3 linhas) não se divide entre páginas
    const topo = y;
    escrever(dataHoraNaBahia(r.data_hora), { fonte: negrito });
    y = topo;
    escrever(r.sintoma, { x: MARGEM + 110 });
    if (r.observacao) escrever(r.observacao, { x: MARGEM + 110, tamanho: 9 });
    y -= 6;
  }
  y -= 10;
  escrever(textos.avisoSintomas, { tamanho: 9 });
  return pdf.save();
}
