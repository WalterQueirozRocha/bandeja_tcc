-- Desabilitar em vez de apagar o que está em uso; valores da venda gravados no momento da venda.

-- AlterTable
ALTER TABLE "Cardapio" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Ingrediente" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ItemCardapio" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ItemVenda" ADD COLUMN     "carboidrato_disponivel_g" DOUBLE PRECISION,
ADD COLUMN     "categorias_atencao" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cg" DOUBLE PRECISION,
ADD COLUMN     "preco" DECIMAL(10,2);

-- Vendas antigas: o preço vem do item do cardápio; carboidrato e CG ficam nulos.
UPDATE "ItemVenda" iv SET "preco" = ic."preco" FROM "ItemCardapio" ic WHERE ic."id" = iv."item_cardapio_id";
ALTER TABLE "ItemVenda" ALTER COLUMN "preco" SET NOT NULL;

-- AlterTable
ALTER TABLE "Preparacao" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;
