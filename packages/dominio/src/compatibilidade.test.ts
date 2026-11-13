import { describe, expect, it } from "vitest";
import { avaliar } from "./compatibilidade";
import { textos } from "./textos";

const coxinha = { id: 1, nome: "Coxinha" };
const semRestricao = { restricoes: [], bloqueios: [] };

describe("avaliar", () => {
  it("CT14: alergia a amendoim; item pode conter amendoim → BLOQUEADO com alerta de alergia", () => {
    const r = avaliar(
      { restricoes: [{ categoria: "AMENDOIM", tipo: "ALERGIA" }], bloqueios: [] },
      coxinha,
      [{ categoria: "AMENDOIM", nome: "Amendoim" }],
    );
    expect(r).toEqual({
      resultado: "BLOQUEADO",
      alertas: [{ resultado: "BLOQUEADO", categoria: "AMENDOIM", texto: "ALERGIA DECLARADA: Amendoim. Venda bloqueada." }],
    });
  });

  it("CT15: doença celíaca; item pode conter glúten → BLOQUEADO com alerta de doença celíaca", () => {
    const r = avaliar(
      { restricoes: [{ categoria: "GLUTEN", tipo: "DOENCA_CELIACA" }], bloqueios: [] },
      coxinha,
      [{ categoria: "GLUTEN", nome: "Glúten" }],
    );
    expect(r.resultado).toBe("BLOQUEADO");
    expect(r.alertas[0]!.texto).toBe("DOENÇA CELÍACA DECLARADA: glúten. Venda bloqueada.");
  });

  it("CT16 (domínio): intolerância à lactose; item com lactose → ATENCAO", () => {
    const r = avaliar(
      { restricoes: [{ categoria: "LACTOSE", tipo: "INTOLERANCIA" }], bloqueios: [] },
      coxinha,
      [{ categoria: "LACTOSE", nome: "Lactose" }],
    );
    expect(r.resultado).toBe("ATENCAO");
    expect(r.alertas[0]!.texto).toBe("RESTRIÇÃO DECLARADA: Lactose. Confirme com o aluno.");
  });

  it("CT19: aluno sem restrições → COMPATIVEL", () => {
    expect(avaliar(semRestricao, coxinha, [{ categoria: "TRIGO", nome: "Trigo" }])).toEqual({ resultado: "COMPATIVEL", alertas: [] });
  });

  it("bloqueio executado pelo operador → BLOQUEADO", () => {
    const r = avaliar({ restricoes: [], bloqueios: [1] }, coxinha, []);
    expect(r.resultado).toBe("BLOQUEADO");
    expect(r.alertas[0]!.texto).toBe("BLOQUEIO SOLICITADO PELO RESPONSÁVEL: Coxinha. Venda bloqueada.");
  });

  it("exclusão estrita prevalece sobre acompanhamento", () => {
    const r = avaliar(
      { restricoes: [{ categoria: "SUINA", tipo: "RELIGIOSA" }, { categoria: "OVOS", tipo: "ALERGIA" }], bloqueios: [] },
      coxinha,
      [{ categoria: "SUINA", nome: "Origem suína" }, { categoria: "OVOS", nome: "Ovos" }],
    );
    expect(r.resultado).toBe("BLOQUEADO");
    expect(r.alertas).toHaveLength(2);
  });

  it("restrição de categoria ausente não gera alerta", () => {
    const r = avaliar({ restricoes: [{ categoria: "OVOS", tipo: "ALERGIA" }], bloqueios: [] }, coxinha, []);
    expect(r.resultado).toBe("COMPATIVEL");
  });
});

describe("textos fixos (doc §4.9)", () => {
  it("notificação e aviso de sintomas", () => {
    expect(textos.notificacao("Ana", 3, "Lactose", 2)).toBe("Ana consumiu 3 itens com Lactose nesta semana. Limite definido: 2.");
    expect(textos.avisoSintomas).toBe(
      "Este registro não é um diagnóstico. Se você sentir falta de ar, aperto na garganta, inchaço na boca ou tontura, avise agora um adulto da escola.",
    );
  });

  it("notificações na plataforma (D2)", () => {
    expect(textos.bloqueioSolicitado("Coxinha", "Ana")).toBe("Novo bloqueio solicitado: Coxinha para Ana.");
    expect(textos.bloqueioDecidido("Coxinha", "Ana", true)).toBe("O bloqueio de Coxinha para Ana foi executado.");
    expect(textos.bloqueioDecidido("Coxinha", "Ana", false)).toBe("O bloqueio de Coxinha para Ana foi recusado.");
    expect(textos.bloqueioCancelado("Coxinha", "Ana")).toBe("O bloqueio de Coxinha para Ana foi cancelado.");
    expect(textos.registrosSolicitados("Bia", "Ana")).toBe("Novo pedido de registros de sintomas: Bia para Ana.");
    expect(textos.registrosDecididos("Ana", true)).toBe("Seu pedido dos registros de sintomas de Ana foi autorizado.");
    expect(textos.registrosDecididos("Ana", false)).toBe("Seu pedido dos registros de sintomas de Ana foi recusado.");
  });
});
