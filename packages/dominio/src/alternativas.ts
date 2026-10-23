import type { Compatibilidade } from "./compatibilidade";

export type ItemAvaliado = { id: number; nome: string; compatibilidade: Compatibilidade; carboidrato_disponivel_g: number };

// RF16: para item em ATENÇÃO ou BLOQUEADO, até 3 itens COMPATÍVEIS do mesmo cardápio,
// os de carboidrato disponível mais próximo primeiro (uma refeição parecida).
export function sugerirAlternativas(item: ItemAvaliado, cardapio: ItemAvaliado[], limite = 3): ItemAvaliado[] {
  if (item.compatibilidade === "COMPATIVEL") return [];
  const distancia = (o: ItemAvaliado) => Math.abs(o.carboidrato_disponivel_g - item.carboidrato_disponivel_g);
  return cardapio
    .filter((o) => o.id !== item.id && o.compatibilidade === "COMPATIVEL")
    .sort((a, b) => distancia(a) - distancia(b) || a.nome.localeCompare(b.nome))
    .slice(0, limite);
}
