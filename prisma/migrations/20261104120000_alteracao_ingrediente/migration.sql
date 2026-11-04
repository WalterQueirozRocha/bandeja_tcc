-- 04/11: coordenação e operador cadastram e editam alimentos; cada criação e edição fica registrada.
-- Origem "outra tabela" (ex.: TBCA) com a fonte, e campos não analisados da TACO preenchidos com outra fonte.

-- AlterEnum
ALTER TYPE "OrigemIngrediente" ADD VALUE 'OUTRA_TABELA';

-- CreateEnum
CREATE TYPE "AcaoIngrediente" AS ENUM ('CRIACAO', 'EDICAO');

-- AlterTable
ALTER TABLE "Ingrediente" ADD COLUMN "fonte" TEXT,
ADD COLUMN "complementos" JSONB;

-- CreateTable
CREATE TABLE "AlteracaoIngrediente" (
    "id" SERIAL NOT NULL,
    "ingrediente_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "acao" "AcaoIngrediente" NOT NULL,
    "campos" JSONB NOT NULL,
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlteracaoIngrediente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlteracaoIngrediente_ingrediente_id_criado_em_idx" ON "AlteracaoIngrediente"("ingrediente_id", "criado_em");

-- AddForeignKey
ALTER TABLE "AlteracaoIngrediente" ADD CONSTRAINT "AlteracaoIngrediente_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "Ingrediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlteracaoIngrediente" ADD CONSTRAINT "AlteracaoIngrediente_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
