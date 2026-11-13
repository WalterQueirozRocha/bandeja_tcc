import { describe, it } from "vitest";
import fc from "fast-check";
import { derivarAlergenos, type Marcador } from "./alergenos";
import { avaliar, type TipoRestricao } from "./compatibilidade";
import { comporPreparacao, NUTRIENTES } from "./composicao";
import { composicao, item } from "./apoio-testes";
import { igRytz, type CategoriaCarboidrato, type Coeficientes } from "./glicemico";

// Os 4 invariantes obrigatórios (doc §8).
const CATEGORIAS = ["TRIGO", "GLUTEN", "LEITE", "LACTOSE", "OVOS", "AMENDOIM", "SOJA", "SUINA"];
const marcador: fc.Arbitrary<Marcador> = fc.record({
  categoria: fc.constantFrom(...CATEGORIAS),
  presenca: fc.constantFrom("CONTEM", "PODE_CONTER"),
});
const ingrediente = fc.record({ nome: fc.string({ minLength: 1, maxLength: 8 }), marcadores: fc.array(marcador, { maxLength: 4 }) });
const gramas = fc.double({ min: 0, max: 500, noNaN: true });

describe("invariantes", () => {
  it("1. acrescentar um ingrediente nunca remove um alergênico", () => {
    fc.assert(
      fc.property(fc.array(ingrediente), ingrediente, fc.array(fc.constantFrom(...CATEGORIAS)), (itens, novo, cozinha) => {
        const antes = derivarAlergenos(itens, cozinha).map((a) => a.categoria);
        const depois = new Set(derivarAlergenos([...itens, novo], cozinha).map((a) => a.categoria));
        return antes.every((c) => depois.has(c));
      }),
    );
  });

  it("2. a ordem dos ingredientes não muda o resultado", () => {
    const itemComposicao = fc.record({ q: fc.double({ min: 1, max: 500, noNaN: true }), carb: gramas, prot: gramas, fator: fc.double({ min: 0.5, max: 3, noNaN: true }) });
    fc.assert(
      fc.property(
        fc.array(fc.tuple(ingrediente, itemComposicao), { minLength: 1, maxLength: 6 }).chain((lista) =>
          fc.tuple(fc.constant(lista), fc.shuffledSubarray(lista, { minLength: lista.length, maxLength: lista.length })),
        ),
        ([original, embaralhado]) => {
          const alerg = (l: typeof original) => JSON.stringify(derivarAlergenos(l.map(([i]) => i)));
          const comp = (l: typeof original) =>
            comporPreparacao(
              l.map(([i, c]) => item({ nome: i.nome, quantidade_crua_g: c.q, fator_coccao: c.fator, modo: "COZIDO", composicao: composicao({ carboidrato_g: c.carb, proteina_g: c.prot }) })),
              100,
            ).porcao;
          const [a, b] = [comp(original), comp(embaralhado)];
          return alerg(original) === alerg(embaralhado) && NUTRIENTES.every((n) => Math.abs(a[n] - b[n]) < 1e-6);
        },
      ),
    );
  });

  it("3. aluno com exclusão estrita nunca conclui compra de item com a categoria", () => {
    const tipo = fc.constantFrom<TipoRestricao>("ALERGIA", "DOENCA_CELIACA", "INTOLERANCIA", "RELIGIOSA", "PREFERENCIA");
    fc.assert(
      fc.property(
        fc.array(fc.record({ categoria: fc.constantFrom(...CATEGORIAS), tipo })),
        fc.constantFrom(...CATEGORIAS),
        fc.constantFrom<TipoRestricao>("ALERGIA", "DOENCA_CELIACA"),
        fc.array(fc.constantFrom(...CATEGORIAS)),
        (outras, categoria, estrita, presentes) => {
          const perfil = { restricoes: [...outras, { categoria, tipo: estrita }], bloqueios: [] };
          const itens = [...new Set([...presentes, categoria])].map((c) => ({ categoria: c, nome: c }));
          return avaliar(perfil, { id: 1, nome: "X" }, itens).resultado === "BLOQUEADO";
        },
      ),
    );
  });

  it("4. aumentar um coeficiente b_j nunca aumenta o IG", () => {
    const categoria = fc.constantFrom<CategoriaCarboidrato>("GLICOSE", "SACAROSE", "LACTOSE", "AMIDO", "FRUTOSE");
    const componente = fc.record({
      nome: fc.constant("C"),
      carboidrato_disponivel_g: gramas,
      categoria_carboidrato: categoria,
      rds_percentual: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: null }),
      proteina_g: gramas,
      lipideos_g: gramas,
      fibra_g: gramas,
      cinzas_g: gramas,
      ig: fc.constant(null),
    });
    const b = fc.double({ min: 0, max: 1, noNaN: true });
    const coeficientes = fc.record({ proteina: b, gordura: b, fibra: b, cinzas: b });
    fc.assert(
      fc.property(
        fc.array(componente, { minLength: 1, maxLength: 5 }),
        coeficientes,
        fc.constantFrom<keyof Coeficientes>("proteina", "gordura", "fibra", "cinzas"),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (componentes, coef, qual, aumento) => {
          const antes = igRytz(componentes, coef).ig;
          const depois = igRytz(componentes, { ...coef, [qual]: coef[qual] + aumento }).ig;
          return antes === null || depois === null || depois <= antes + 1e-9;
        },
      ),
    );
  });
});
