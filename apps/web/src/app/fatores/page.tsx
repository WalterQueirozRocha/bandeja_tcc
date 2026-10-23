import { exigirSessaoNaPagina } from "@/lib/acesso";
import { listarFatoresCompletos } from "@/repositories/fatores";
import { LinhaFator, NovoFator } from "./formulario";

// M1: fatores de cocção (Domene, 2018). Sem fator, o modo não é oferecido na ficha técnica (P2).
export default async function Fatores() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "OPERADOR") return <main className="p-4">Acesso negado.</main>;
  const fatores = await listarFatoresCompletos();

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Fatores de cocção</h1>
      <p className="text-sm text-secondary">
        Peso final = peso cru × fator. O modo cru usa sempre o fator 1. Um modo só aparece na ficha técnica se houver fator para o grupo do ingrediente.
      </p>
      <NovoFator />
      {fatores.length === 0 && <p className="text-secondary">Nenhum fator cadastrado: só o modo cru é oferecido.</p>}
      <ul className="flex flex-col gap-2">
        {fatores.map((f) => (
          <LinhaFator key={f.id} fator={f} />
        ))}
      </ul>
    </main>
  );
}
