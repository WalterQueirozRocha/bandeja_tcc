-- Venda de mais de uma unidade do mesmo item; as vendas antigas ficam com 1.

-- AlterTable
ALTER TABLE "ItemVenda" ADD COLUMN     "quantidade" INTEGER NOT NULL DEFAULT 1;
