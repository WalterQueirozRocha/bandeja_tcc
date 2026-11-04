import { esqueciSenha, lerCorpo } from "@/lib/validacao";
import { pedirNovaSenha } from "@/services/usuarios";

// Público. A resposta não revela se a conta existe.
export async function POST(req: Request) {
  const dados = await lerCorpo(req, esqueciSenha);
  if (dados instanceof Response) return dados;
  await pedirNovaSenha(dados.email);
  return Response.json(
    { mensagem: "Se o e-mail estiver cadastrado, a coordenação recebeu o pedido e vai redefinir a sua senha." },
    { status: 202 },
  );
}
