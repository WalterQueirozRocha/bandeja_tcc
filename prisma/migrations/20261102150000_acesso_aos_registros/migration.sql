-- D4 (DF-03, RF20): "pedido, decisão e envio ficam registrados"; o envio passa a ser cada acesso do responsável
-- aos registros liberados (abrir a tela ou baixar o PDF).

-- CreateEnum
CREATE TYPE "TipoAcessoRegistros" AS ENUM ('TELA', 'PDF');

-- CreateTable
CREATE TABLE "AcessoRegistros" (
    "id" SERIAL NOT NULL,
    "solicitacao_id" INTEGER NOT NULL,
    "tipo" "TipoAcessoRegistros" NOT NULL,
    "acessado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcessoRegistros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcessoRegistros_solicitacao_id_idx" ON "AcessoRegistros"("solicitacao_id");

-- AddForeignKey
ALTER TABLE "AcessoRegistros" ADD CONSTRAINT "AcessoRegistros_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "SolicitacaoRegistros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
