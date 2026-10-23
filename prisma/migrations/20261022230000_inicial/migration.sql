-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('ALERGENICO', 'LACTOSE', 'GLUTEN', 'ORIGEM_ANIMAL');

-- CreateEnum
CREATE TYPE "OrigemIngrediente" AS ENUM ('TACO', 'ROTULO');

-- CreateEnum
CREATE TYPE "GrupoAlimentar" AS ENUM ('CEREAIS', 'VERDURAS_HORTALICAS', 'FRUTAS', 'GORDURAS_OLEOS', 'PESCADOS_FRUTOS_MAR', 'CARNES', 'LEITE', 'BEBIDAS', 'OVOS', 'PRODUTOS_ACUCARADOS', 'MISCELANEAS', 'OUTROS_INDUSTRIALIZADOS', 'ALIMENTOS_PREPARADOS', 'LEGUMINOSAS', 'NOZES_SEMENTES');

-- CreateEnum
CREATE TYPE "CategoriaCarboidrato" AS ENUM ('GLICOSE', 'FRUTOSE', 'GALACTOSE', 'MALTOSE', 'TREALOSE', 'SACAROSE', 'LACTOSE', 'ISOMALTULOSE', 'MALTOTRIOSE_MALTOTETRAOSE', 'AMIDO', 'MALTODEXTRINA', 'MALTITOL', 'XILITOL', 'NENHUM');

-- CreateEnum
CREATE TYPE "ModoPreparo" AS ENUM ('CRU', 'COZIDO', 'ASSADO', 'GRELHADO', 'FRITO');

-- CreateEnum
CREATE TYPE "Presenca" AS ENUM ('CONTEM', 'PODE_CONTER');

-- CreateEnum
CREATE TYPE "OrigemMarcador" AS ENUM ('MAPEAMENTO', 'ROTULO');

-- CreateEnum
CREATE TYPE "ListaIG" AS ENUM ('LISTA_1', 'LISTA_2');

-- CreateEnum
CREATE TYPE "Periodo" AS ENUM ('MANHA', 'TARDE');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('OPERADOR', 'ALUNO', 'RESPONSAVEL', 'COORDENACAO');

-- CreateEnum
CREATE TYPE "TipoRestricao" AS ENUM ('ALERGIA', 'DOENCA_CELIACA', 'INTOLERANCIA', 'RELIGIOSA', 'PREFERENCIA');

-- CreateEnum
CREATE TYPE "SituacaoBloqueio" AS ENUM ('SOLICITADA', 'EXECUTADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "ResultadoVenda" AS ENUM ('CONCLUIDA', 'BLOQUEADA', 'CANCELADA_PELO_OPERADOR');

-- CreateEnum
CREATE TYPE "Compatibilidade" AS ENUM ('COMPATIVEL', 'ATENCAO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "GrupoSintoma" AS ENUM ('PELE', 'BOCA_GARGANTA', 'BARRIGA', 'RESPIRACAO', 'OUTROS');

-- CreateTable
CREATE TABLE "CategoriaRestricao" (
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "fonte_regulatoria" TEXT NOT NULL,

    CONSTRAINT "CategoriaRestricao_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo_alimentar" "GrupoAlimentar" NOT NULL,
    "origem" "OrigemIngrediente" NOT NULL,
    "codigo_taco" INTEGER,
    "energia_kcal" DOUBLE PRECISION,
    "proteina_g" DOUBLE PRECISION,
    "lipideos_g" DOUBLE PRECISION,
    "carboidrato_g" DOUBLE PRECISION,
    "fibra_g" DOUBLE PRECISION,
    "cinzas_g" DOUBLE PRECISION,
    "umidade_g" DOUBLE PRECISION,
    "categoria_carboidrato" "CategoriaCarboidrato" NOT NULL,
    "rds_percentual" DOUBLE PRECISION,
    "forma_crua_id" INTEGER,
    "modo_preparo" "ModoPreparo",

    CONSTRAINT "Ingrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarcadorIngrediente" (
    "ingrediente_id" INTEGER NOT NULL,
    "categoria_codigo" TEXT NOT NULL,
    "presenca" "Presenca" NOT NULL,
    "origem" "OrigemMarcador" NOT NULL,
    "conferido_por_1" TEXT,
    "conferido_por_2" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarcadorIngrediente_pkey" PRIMARY KEY ("ingrediente_id","categoria_codigo")
);

-- CreateTable
CREATE TABLE "ValorIG" (
    "id" SERIAL NOT NULL,
    "ingrediente_id" INTEGER NOT NULL,
    "ig" DOUBLE PRECISION NOT NULL,
    "item_correspondente" TEXT NOT NULL,
    "lista" "ListaIG" NOT NULL,
    "justificativa" TEXT NOT NULL,
    "conferido_por_1" TEXT,
    "conferido_por_2" TEXT,

    CONSTRAINT "ValorIG_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FatorPreparo" (
    "id" SERIAL NOT NULL,
    "modo_preparo" "ModoPreparo" NOT NULL,
    "grupo_alimentar" "GrupoAlimentar" NOT NULL,
    "fator_coccao" DOUBLE PRECISION NOT NULL,
    "referencia" TEXT NOT NULL,

    CONSTRAINT "FatorPreparo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preparacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "porcao_g" DOUBLE PRECISION NOT NULL,
    "peso_final_calculado" DOUBLE PRECISION,

    CONSTRAINT "Preparacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPreparacao" (
    "preparacao_id" INTEGER NOT NULL,
    "ingrediente_id" INTEGER NOT NULL,
    "quantidade_crua_g" DOUBLE PRECISION NOT NULL,
    "modo_preparo" "ModoPreparo" NOT NULL,

    CONSTRAINT "ItemPreparacao_pkey" PRIMARY KEY ("preparacao_id","ingrediente_id")
);

-- CreateTable
CREATE TABLE "MarcadorPreparacao" (
    "preparacao_id" INTEGER NOT NULL,
    "categoria_codigo" TEXT NOT NULL,
    "presenca" "Presenca" NOT NULL DEFAULT 'PODE_CONTER',
    "motivo" TEXT NOT NULL,

    CONSTRAINT "MarcadorPreparacao_pkey" PRIMARY KEY ("preparacao_id","categoria_codigo")
);

-- CreateTable
CREATE TABLE "Cardapio" (
    "id" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "periodo" "Periodo" NOT NULL,

    CONSTRAINT "Cardapio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCardapio" (
    "id" SERIAL NOT NULL,
    "cardapio_id" INTEGER NOT NULL,
    "preparacao_id" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ItemCardapio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "senha_hash" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "serie" TEXT NOT NULL,
    "consentimento_por" INTEGER,
    "consentimento_em" TIMESTAMP(3),

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VinculoResponsavel" (
    "aluno_id" INTEGER NOT NULL,
    "responsavel_id" INTEGER NOT NULL,

    CONSTRAINT "VinculoResponsavel_pkey" PRIMARY KEY ("aluno_id","responsavel_id")
);

-- CreateTable
CREATE TABLE "RestricaoDeclarada" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "categoria_codigo" TEXT NOT NULL,
    "tipo" "TipoRestricao" NOT NULL,
    "limite_notificacao" INTEGER NOT NULL DEFAULT 2,
    "declarada_por" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestricaoDeclarada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoBloqueio" (
    "id" SERIAL NOT NULL,
    "responsavel_id" INTEGER NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "preparacao_id" INTEGER NOT NULL,
    "situacao" "SituacaoBloqueio" NOT NULL DEFAULT 'SOLICITADA',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoBloqueio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "operador_id" INTEGER NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" "ResultadoVenda" NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "venda_id" INTEGER NOT NULL,
    "item_cardapio_id" INTEGER NOT NULL,
    "compatibilidade" "Compatibilidade" NOT NULL,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("venda_id","item_cardapio_id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "destinatario_id" INTEGER NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "categoria_codigo" TEXT NOT NULL,
    "periodo" DATE NOT NULL,
    "enviada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sintoma" (
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "grupo" "GrupoSintoma" NOT NULL,

    CONSTRAINT "Sintoma_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "RegistroSintoma" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "sintoma_codigo" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "observacao" VARCHAR(100),

    CONSTRAINT "RegistroSintoma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingrediente_codigo_taco_key" ON "Ingrediente"("codigo_taco");

-- CreateIndex
CREATE UNIQUE INDEX "ValorIG_ingrediente_id_key" ON "ValorIG"("ingrediente_id");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_usuario_id_key" ON "Aluno"("usuario_id");

-- CreateIndex
CREATE INDEX "Venda_aluno_id_data_hora_idx" ON "Venda"("aluno_id", "data_hora");

-- AddForeignKey
ALTER TABLE "Ingrediente" ADD CONSTRAINT "Ingrediente_forma_crua_id_fkey" FOREIGN KEY ("forma_crua_id") REFERENCES "Ingrediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcadorIngrediente" ADD CONSTRAINT "MarcadorIngrediente_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "Ingrediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcadorIngrediente" ADD CONSTRAINT "MarcadorIngrediente_categoria_codigo_fkey" FOREIGN KEY ("categoria_codigo") REFERENCES "CategoriaRestricao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorIG" ADD CONSTRAINT "ValorIG_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "Ingrediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPreparacao" ADD CONSTRAINT "ItemPreparacao_preparacao_id_fkey" FOREIGN KEY ("preparacao_id") REFERENCES "Preparacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPreparacao" ADD CONSTRAINT "ItemPreparacao_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "Ingrediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcadorPreparacao" ADD CONSTRAINT "MarcadorPreparacao_preparacao_id_fkey" FOREIGN KEY ("preparacao_id") REFERENCES "Preparacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcadorPreparacao" ADD CONSTRAINT "MarcadorPreparacao_categoria_codigo_fkey" FOREIGN KEY ("categoria_codigo") REFERENCES "CategoriaRestricao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCardapio" ADD CONSTRAINT "ItemCardapio_cardapio_id_fkey" FOREIGN KEY ("cardapio_id") REFERENCES "Cardapio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCardapio" ADD CONSTRAINT "ItemCardapio_preparacao_id_fkey" FOREIGN KEY ("preparacao_id") REFERENCES "Preparacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_consentimento_por_fkey" FOREIGN KEY ("consentimento_por") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoResponsavel" ADD CONSTRAINT "VinculoResponsavel_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoResponsavel" ADD CONSTRAINT "VinculoResponsavel_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestricaoDeclarada" ADD CONSTRAINT "RestricaoDeclarada_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestricaoDeclarada" ADD CONSTRAINT "RestricaoDeclarada_categoria_codigo_fkey" FOREIGN KEY ("categoria_codigo") REFERENCES "CategoriaRestricao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestricaoDeclarada" ADD CONSTRAINT "RestricaoDeclarada_declarada_por_fkey" FOREIGN KEY ("declarada_por") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoBloqueio" ADD CONSTRAINT "SolicitacaoBloqueio_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoBloqueio" ADD CONSTRAINT "SolicitacaoBloqueio_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoBloqueio" ADD CONSTRAINT "SolicitacaoBloqueio_preparacao_id_fkey" FOREIGN KEY ("preparacao_id") REFERENCES "Preparacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_item_cardapio_id_fkey" FOREIGN KEY ("item_cardapio_id") REFERENCES "ItemCardapio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_categoria_codigo_fkey" FOREIGN KEY ("categoria_codigo") REFERENCES "CategoriaRestricao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSintoma" ADD CONSTRAINT "RegistroSintoma_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSintoma" ADD CONSTRAINT "RegistroSintoma_sintoma_codigo_fkey" FOREIGN KEY ("sintoma_codigo") REFERENCES "Sintoma"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

