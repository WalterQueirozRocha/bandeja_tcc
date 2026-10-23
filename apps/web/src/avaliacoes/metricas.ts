// Métricas das avaliações do Cap. 4 (§3.5.4). Não são regra do produto: ficam fora do domínio.

export type Acertos = { vp: number; fn: number; fp: number };

export function contarAcertos(gabarito: ReadonlySet<string>, sinalizados: ReadonlySet<string>): Acertos {
  const vp = [...gabarito].filter((c) => sinalizados.has(c)).length;
  return { vp, fn: gabarito.size - vp, fp: [...sinalizados].filter((c) => !gabarito.has(c)).length };
}

export const somarAcertos = (lista: Acertos[]): Acertos =>
  lista.reduce((t, a) => ({ vp: t.vp + a.vp, fn: t.fn + a.fn, fp: t.fp + a.fp }), { vp: 0, fn: 0, fp: 0 });

// Eq. 3.3: T_omissão = FN/(VP+FN) (medida principal); T_falso alarme = FP/(VP+FP).
export function taxas({ vp, fn, fp }: Acertos) {
  return {
    t_omissao: vp + fn > 0 ? fn / (vp + fn) : null,
    t_falso_alarme: vp + fp > 0 ? fp / (vp + fp) : null,
  };
}

// A3: Bland-Altman (diferença média ± 1,96 DP) e correlação de Pearson. Concordância não é exatidão.
export function concordancia(pares: [number, number][]) {
  const n = pares.length;
  const mediaDe = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const dp = (v: number[], m: number) => Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  if (n < 2) return { n, diferenca_media: n ? pares[0]![0] - pares[0]![1] : null, desvio_padrao: null, limite_inferior: null, limite_superior: null, pearson: null };

  const difs = pares.map(([a, b]) => a - b);
  const diferenca_media = mediaDe(difs);
  const desvio_padrao = dp(difs, diferenca_media);
  const [as, bs] = [pares.map((p) => p[0]), pares.map((p) => p[1])];
  const [ma, mb] = [mediaDe(as), mediaDe(bs)];
  const [sa, sb] = [dp(as, ma), dp(bs, mb)];
  const cov = pares.reduce((s, [a, b]) => s + (a - ma) * (b - mb), 0) / (n - 1);
  return {
    n,
    diferenca_media,
    desvio_padrao,
    limite_inferior: diferenca_media - 1.96 * desvio_padrao,
    limite_superior: diferenca_media + 1.96 * desvio_padrao,
    pearson: sa > 0 && sb > 0 ? cov / (sa * sb) : null,
  };
}
