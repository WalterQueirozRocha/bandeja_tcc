import { CONTATO_COZINHA } from "./textos";

export type Presenca = "CONTEM" | "PODE_CONTER";
export type Marcador = { categoria: string; presenca: Presenca };
export type AlergenoDerivado = { categoria: string; presenca: Presenca; origens: string[] };

// RF03: união dos marcadores dos ingredientes + "pode conter" da cozinha; CONTEM prevalece sobre PODE_CONTER.
export function derivarAlergenos(
  itens: { nome: string; marcadores: Marcador[] }[],
  cozinha: string[] = [],
): AlergenoDerivado[] {
  const resultado = new Map<string, { presenca: Presenca; origens: Set<string> }>();
  const somar = (categoria: string, presenca: Presenca, origem: string) => {
    const atual = resultado.get(categoria);
    if (!atual) resultado.set(categoria, { presenca, origens: new Set([origem]) });
    else {
      atual.origens.add(origem);
      if (presenca === "CONTEM") atual.presenca = "CONTEM";
    }
  };
  for (const item of itens) for (const m of item.marcadores) somar(m.categoria, m.presenca, item.nome);
  for (const categoria of cozinha) somar(categoria, "PODE_CONTER", CONTATO_COZINHA);

  // Ordenado para que a ordem dos ingredientes não mude o resultado.
  return [...resultado]
    .map(([categoria, { presenca, origens }]) => ({ categoria, presenca, origens: [...origens].sort() }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria));
}
