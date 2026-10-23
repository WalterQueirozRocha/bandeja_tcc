import { Prisma } from "@bandeja/dados";

export type ResultadoExclusao = { resultado: "APAGADO" | "DESABILITADO" };

// B2: apaga o que nunca foi usado; o que está em uso (chave estrangeira) é desabilitado.
export async function apagarOuDesabilitar(apagar: () => Promise<unknown>, desabilitar: () => Promise<unknown>): Promise<ResultadoExclusao> {
  try {
    await apagar();
    return { resultado: "APAGADO" };
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")) throw e;
    await desabilitar();
    return { resultado: "DESABILITADO" };
  }
}
