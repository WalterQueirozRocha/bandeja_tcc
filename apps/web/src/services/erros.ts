export class ErroNegocio extends Error {
  constructor(message: string, readonly status: 403 | 404 | 422 = 422) {
    super(message);
  }
}

export function respostaDeErro(e: unknown) {
  if (e instanceof ErroNegocio) return Response.json({ erro: e.message }, { status: e.status });
  throw e;
}
