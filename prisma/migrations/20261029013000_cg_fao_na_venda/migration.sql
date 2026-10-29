-- FC-01 (RF04): CG da FAO/OMS gravada no item da venda, para a CG da refeição pelos dois modelos.
-- Vendas antigas ficam nulas (não calculável).

-- AlterTable
ALTER TABLE "ItemVenda" ADD COLUMN     "cg_fao" DOUBLE PRECISION;
