import Link from "next/link";
import { Selo } from "@/components/alerta";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { alunosDoResponsavel } from "@/repositories/alunos";
import { dataHoraNaBahia, verPedidos } from "@/services/registros";
import { DecisaoPedido, NovoPedido } from "./acoes";

// RF20: o responsável pede e acompanha; a coordenação autoriza ou recusa sem ver os registros.
export default async function RegistrosSintomas() {
  const sessao = await exigirSessaoNaPagina();
  if (sessao.papel !== "RESPONSAVEL" && sessao.papel !== "COORDENACAO") return <main className="p-4">Acesso negado.</main>;
  const responsavel = sessao.papel === "RESPONSAVEL";
  const [pedidos, alunos] = await Promise.all([verPedidos(sessao), responsavel ? alunosDoResponsavel(sessao.id) : []]);

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>{responsavel ? "Registros de sintomas" : "Pedidos de registros de sintomas"}</h1>
      <p className="text-sm text-secondary">
        {responsavel
          ? "Peça à escola os registros de sintomas do aluno. Depois da autorização, você vê os registros gravados até aquele momento e pode baixar em PDF."
          : "Confira se quem pediu é responsável vinculado ao aluno. A escola não vê o conteúdo dos registros."}
      </p>
      {responsavel && <NovoPedido alunos={alunos} />}
      {pedidos.length === 0 && <p className="text-secondary">Nenhum pedido.</p>}
      <ul className="flex flex-col gap-2">
        {pedidos.map((p) => (
          <li key={p.id} className="cartao flex flex-wrap items-center gap-3 py-3" data-testid="pedido-registros">
            <span className="flex-1">
              <span className="font-semibold">{p.aluno.nome}</span>
              <span className="block text-sm text-secondary">
                {!responsavel && `${p.responsavel.nome} (${p.responsavel.email}) · `}
                pedido em <span className="tabular-nums">{dataHoraNaBahia(p.solicitada_em)}</span>
              </span>
              {p.situacao === "AUTORIZADA" && (
                <span className="block text-sm text-secondary" data-testid="ultimo-acesso">
                  {p.ultimo_acesso ? (
                    <>
                      Último acesso em <span className="tabular-nums">{dataHoraNaBahia(p.ultimo_acesso)}</span>
                    </>
                  ) : (
                    "Ainda não acessado"
                  )}
                </span>
              )}
              {!responsavel && !p.vinculado && <span className="block text-sm font-medium text-bloqueado-texto">Não está mais vinculado ao aluno</span>}
            </span>
            {/* Autorizado libera o acesso; as outras situações não têm cor semântica. */}
            {p.situacao === "AUTORIZADA" ? (
              <Selo estado="COMPATIVEL">{p.situacao}</Selo>
            ) : (
              <span className="rounded-full border border-borda px-2.5 py-0.5 text-xs font-bold text-secondary">{p.situacao}</span>
            )}
            {responsavel && p.situacao === "AUTORIZADA" && (
              <Link href={`/registros-sintomas/${p.id}`} className="btn-primario py-1 text-sm">
                Ver registros
              </Link>
            )}
            {!responsavel && p.situacao === "SOLICITADA" && <DecisaoPedido id={p.id} />}
          </li>
        ))}
      </ul>
    </main>
  );
}
