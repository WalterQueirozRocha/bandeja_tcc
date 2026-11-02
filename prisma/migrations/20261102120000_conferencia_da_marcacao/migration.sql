-- D6 (FC-02, RF01): conferência dupla da marcação no ingrediente, inclusive "conferido, sem alergênico".
-- Nulo = marcação não conferida; a ficha técnica recusa alimento da TACO assim.

-- AlterTable
ALTER TABLE "Ingrediente" ADD COLUMN     "marcacao_conferida_em" TIMESTAMP(3),
ADD COLUMN     "marcacao_conferida_por_1" TEXT,
ADD COLUMN     "marcacao_conferida_por_2" TEXT;
