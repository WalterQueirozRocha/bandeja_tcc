-- Um registro passa a ser uma ocorrência com um ou mais sintomas.
-- Cada registro antigo vira uma ocorrência com o seu único sintoma; nada se perde.

-- CreateTable
CREATE TABLE "RegistroSintomaSintoma" (
    "registro_id" INTEGER NOT NULL,
    "sintoma_codigo" TEXT NOT NULL,

    CONSTRAINT "RegistroSintomaSintoma_pkey" PRIMARY KEY ("registro_id","sintoma_codigo")
);

-- Copia o sintoma de cada registro existente
INSERT INTO "RegistroSintomaSintoma" ("registro_id", "sintoma_codigo")
SELECT "id", "sintoma_codigo" FROM "RegistroSintoma";

-- AddForeignKey
ALTER TABLE "RegistroSintomaSintoma" ADD CONSTRAINT "RegistroSintomaSintoma_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "RegistroSintoma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSintomaSintoma" ADD CONSTRAINT "RegistroSintomaSintoma_sintoma_codigo_fkey" FOREIGN KEY ("sintoma_codigo") REFERENCES "Sintoma"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "RegistroSintoma" DROP CONSTRAINT "RegistroSintoma_sintoma_codigo_fkey";

-- AlterTable
ALTER TABLE "RegistroSintoma" DROP COLUMN "sintoma_codigo";
