-- CreateEnum
CREATE TYPE "SituacaoRegistros" AS ENUM ('SOLICITADA', 'AUTORIZADA', 'RECUSADA');

-- AlterTable
ALTER TABLE "RegistroSintoma" ADD COLUMN     "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "SolicitacaoRegistros" (
    "id" SERIAL NOT NULL,
    "responsavel_id" INTEGER NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "situacao" "SituacaoRegistros" NOT NULL DEFAULT 'SOLICITADA',
    "solicitada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidida_por" INTEGER,
    "decidida_em" TIMESTAMP(3),

    CONSTRAINT "SolicitacaoRegistros_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SolicitacaoRegistros" ADD CONSTRAINT "SolicitacaoRegistros_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoRegistros" ADD CONSTRAINT "SolicitacaoRegistros_decidida_por_fkey" FOREIGN KEY ("decidida_por") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoRegistros" ADD CONSTRAINT "SolicitacaoRegistros_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
