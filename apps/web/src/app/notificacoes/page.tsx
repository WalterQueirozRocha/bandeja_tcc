import Link from "next/link";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { dataHoraNaBahia } from "@/services/registros";
import { verNotificacoes } from "@/services/notificacoes";
import { MarcarLida } from "./acoes";

// D2: notificações do próprio usuário (todos os perfis). Só se marca como lida; não se apaga.
export default async function Notificacoes() {
  const sessao = await exigirSessaoNaPagina();
  const { nao_lidas, itens } = await verNotificacoes(sessao);

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>Notificações</h1>
      <p className="text-sm text-secondary tabular-nums">{nao_lidas === 1 ? "1 não lida" : `${nao_lidas} não lidas`}</p>
      {nao_lidas > 0 && <MarcarLida />}
      {itens.length === 0 && <p className="text-secondary">Nenhuma notificação.</p>}
      <ul className="flex flex-col gap-2" data-testid="notificacoes">
        {itens.map((n) => (
          <li key={n.id} className={`cartao flex flex-col gap-2 py-3 ${n.lida_em ? "opacity-70" : "border-brand-royal"}`}>
            <span className="text-sm text-secondary tabular-nums">
              {dataHoraNaBahia(n.criada_em)}
              {!n.lida_em && <strong className="ml-2 uppercase text-brand-royal">Nova</strong>}
            </span>
            <span>{n.mensagem}</span>
            <span className="flex flex-wrap items-center gap-3">
              {n.link && (
                <Link href={n.link} className="text-sm">
                  Abrir
                </Link>
              )}
              {!n.lida_em && <MarcarLida id={n.id} />}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
