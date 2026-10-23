import Link from "next/link";
import type { Papel } from "@bandeja/dados";
import { SeloDesabilitado } from "@/components/acao";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { PAPEL, opcoes } from "@/lib/rotulos";
import { listarUsuarios } from "@/repositories/usuarios";
import { NovoUsuario } from "./formularios";

// B1-M: a coordenação gerencia as contas e os vínculos.
export default async function Usuarios({ searchParams }: PageProps<"/usuarios">) {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "COORDENACAO") return <main className="p-4">Acesso negado.</main>;
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const papel = typeof params.papel === "string" && params.papel in PAPEL ? (params.papel as Papel) : undefined;
  const inativos = params.inativos === "true";
  const lista = await listarUsuarios({ busca: busca || undefined, papel, inativos });

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Usuários</h1>
      <NovoUsuario />
      <form className="flex flex-wrap items-center gap-2">
        <input name="busca" defaultValue={busca} placeholder="Nome ou e-mail" aria-label="Nome ou e-mail" className="campo min-w-0 flex-1" />
        <select name="papel" defaultValue={papel ?? ""} aria-label="Papel" className="campo">
          <option value="">Todos os papéis</option>
          {opcoes(PAPEL).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inativos" value="true" defaultChecked={inativos} />
          Mostrar desabilitados
        </label>
        <button type="submit" className="btn-secundario">
          Filtrar
        </button>
      </form>

      {lista.length === 0 && <p className="text-secondary">Nenhum usuário encontrado.</p>}
      <ul className="grid gap-2 md:grid-cols-2">
        {lista.map((u) => (
          <li key={u.id} className="cartao flex flex-wrap items-center gap-3 py-3">
            <span className="flex-1">
              <Link href={`/usuarios/${u.id}`} className="font-semibold">
                {u.nome}
              </Link>
              <span className="block text-sm text-secondary">
                {PAPEL[u.papel]}
                {u.aluno && ` · ${u.aluno.serie}`} · {u.email}
              </span>
            </span>
            {!u.ativo && <SeloDesabilitado />}
          </li>
        ))}
      </ul>
    </main>
  );
}
