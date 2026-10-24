import Link from "next/link";
import { Alerta } from "@/components/alerta";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { ErroNegocio } from "@/services/erros";
import { dataHoraNaBahia, registrosLiberados } from "@/services/registros";

// RF20: registros liberados por um pedido autorizado, com o download em PDF.
export default async function RegistrosLiberados({ params }: PageProps<"/registros-sintomas/[id]">) {
  const sessao = await exigirSessaoNaPagina();
  const id = Number((await params).id);
  if (sessao.papel !== "RESPONSAVEL" || !Number.isInteger(id) || id <= 0) return <main className="p-4">Acesso negado.</main>;
  let dados;
  try {
    dados = await registrosLiberados(sessao, id);
  } catch (e) {
    if (e instanceof ErroNegocio) return <main className="p-4">{e.message}.</main>;
    throw e;
  }
  const { pedido, registros } = dados;

  return (
    <main className="flex flex-col gap-4 p-4">
      <Link href="/registros-sintomas" className="text-sm">
        ← Pedidos
      </Link>
      <h1>Registros de sintomas — {pedido.aluno.nome}</h1>
      <p className="text-sm text-secondary">
        Registros gravados até <span className="tabular-nums">{dataHoraNaBahia(pedido.autorizado_em)}</span>, quando a escola autorizou o pedido.
      </p>
      <a href={`/api/registros-sintomas/solicitacoes/${pedido.id}/pdf`} download className="btn-primario self-start">
        Baixar PDF
      </a>
      <Alerta estado="AVISO" role="note">
        Estes registros foram feitos pelo aluno e não são um diagnóstico.
      </Alerta>
      {registros.length === 0 && <p className="text-secondary">Nenhum registro.</p>}
      <ul className="flex flex-col gap-2" data-testid="registros-liberados">
        {registros.map((r) => (
          <li key={r.id} className="cartao py-3">
            <span className="block text-sm text-secondary tabular-nums">{dataHoraNaBahia(r.data_hora)}</span>
            {r.sintoma}
            {r.observacao && `: ${r.observacao}`}
          </li>
        ))}
      </ul>
    </main>
  );
}
