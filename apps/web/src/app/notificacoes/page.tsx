import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { dataHoraNaBahia } from "@/services/registros";
import { verNotificacoes } from "@/services/notificacoes";
import { MarcarLida } from "./acoes";

// D2: notificações do próprio usuário (todos os perfis). Só se marca como lida; não se apaga.
export default async function Notificacoes() {
  const sessao = await exigirSessaoNaPagina();
  const { nao_lidas, itens } = await verNotificacoes(sessao);

  return (
    <main className="flex flex-col gap-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-brand-royal">
            <Bell className="size-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">Avisos do Sistema</span>
          </div>
          <h1>Notificações</h1>
          <p className="text-sm text-secondary tabular-nums">{nao_lidas === 1 ? "1 não lida" : `${nao_lidas} não lidas`}</p>
        </div>
        {nao_lidas > 0 && <MarcarLida />}
      </header>

      {itens.length === 0 && (
        <Card className="items-center justify-center py-10 text-center">
          <p className="text-secondary">Nenhuma notificação.</p>
        </Card>
      )}

      {itens.length > 0 && (
        <ul className="flex flex-col gap-2.5" data-testid="notificacoes">
          {itens.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col gap-2.5 rounded-xl border bg-surface-card p-4 shadow-xs transition-opacity ${
                n.lida_em ? "border-borda opacity-75" : "border-brand-royal ring-1 ring-brand-royal/20"
              }`}
            >
              <span className="flex items-center gap-2 text-xs text-secondary tabular-nums">
                {dataHoraNaBahia(n.criada_em)}
                {!n.lida_em && <Badge variant="default">Nova</Badge>}
              </span>
              <span className="text-sm font-medium text-brand-navy">{n.mensagem}</span>
              <span className="flex flex-wrap items-center gap-2.5 pt-1">
                {n.link && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={n.link} className="no-underline">
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      Abrir
                    </Link>
                  </Button>
                )}
                {!n.lida_em && <MarcarLida id={n.id} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
