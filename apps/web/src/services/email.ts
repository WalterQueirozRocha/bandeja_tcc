export type Email = { para: string; assunto: string; texto: string };

// Sem RESEND_API_KEY (desenvolvimento, testes, CI) os e-mails ficam aqui em vez de sair.
export const caixaDeSaida: Email[] = [];

export async function enviarEmail(email: Email) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    caixaDeSaida.push(email);
    if (process.env.NODE_ENV !== "test") console.info(`[e-mail não enviado: sem RESEND_API_KEY] ${email.para}: ${email.texto}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_REMETENTE, to: [email.para], subject: email.assunto, text: email.texto }),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${await res.text()}`);
}
