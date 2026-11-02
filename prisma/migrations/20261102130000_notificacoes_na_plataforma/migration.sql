-- D2 (RF11): a notificação deixa de ser só a trava do e-mail e vira o aviso na plataforma (sino + /notificacoes).
-- As linhas existentes viram LIMITE_SEMANAL com um texto genérico (o número de consumos não estava gravado).

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('LIMITE_SEMANAL', 'BLOQUEIO_SOLICITADO', 'BLOQUEIO_EXECUTADO', 'BLOQUEIO_RECUSADO', 'BLOQUEIO_CANCELADO', 'REGISTROS_SOLICITADOS', 'REGISTROS_AUTORIZADOS', 'REGISTROS_RECUSADOS');

-- AlterTable
ALTER TABLE "Notificacao" RENAME COLUMN "enviada_em" TO "criada_em";
ALTER TABLE "Notificacao" ADD COLUMN     "lida_em" TIMESTAMP(3),
ADD COLUMN     "link" TEXT,
ADD COLUMN     "mensagem" TEXT,
ADD COLUMN     "tipo" "TipoNotificacao",
ALTER COLUMN "aluno_id" DROP NOT NULL,
ALTER COLUMN "categoria_codigo" DROP NOT NULL,
ALTER COLUMN "periodo" DROP NOT NULL;

-- Dados existentes
UPDATE "Notificacao" n SET
  "tipo" = 'LIMITE_SEMANAL',
  "link" = '/historico',
  "mensagem" =
    (SELECT COALESCE(u."nome", 'Aluno ' || a."id") FROM "Aluno" a LEFT JOIN "Usuario" u ON u."id" = a."usuario_id" WHERE a."id" = n."aluno_id")
    || ' passou do limite de ' || (SELECT c."nome" FROM "CategoriaRestricao" c WHERE c."codigo" = n."categoria_codigo")
    || ' na semana de ' || to_char(n."periodo", 'DD/MM/YYYY') || '.';

ALTER TABLE "Notificacao" ALTER COLUMN "tipo" SET NOT NULL,
ALTER COLUMN "mensagem" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Notificacao_destinatario_id_lida_em_idx" ON "Notificacao"("destinatario_id", "lida_em");
