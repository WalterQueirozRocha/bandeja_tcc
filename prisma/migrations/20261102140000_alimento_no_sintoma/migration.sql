-- D3 (RF12): o registro de sintoma indica o que o aluno comeu antes: itens das próprias compras e/ou alimento de fora.
-- Os registros antigos ficam sem alimento; a obrigatoriedade vale só para os novos (no serviço).

-- AlterTable
ALTER TABLE "RegistroSintoma" ADD COLUMN     "alimento_externo" VARCHAR(100);

-- CreateTable
CREATE TABLE "RegistroSintomaItem" (
    "registro_id" INTEGER NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "item_cardapio_id" INTEGER NOT NULL,

    CONSTRAINT "RegistroSintomaItem_pkey" PRIMARY KEY ("registro_id","venda_id","item_cardapio_id")
);

-- AddForeignKey
ALTER TABLE "RegistroSintomaItem" ADD CONSTRAINT "RegistroSintomaItem_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "RegistroSintoma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSintomaItem" ADD CONSTRAINT "RegistroSintomaItem_venda_id_item_cardapio_id_fkey" FOREIGN KEY ("venda_id", "item_cardapio_id") REFERENCES "ItemVenda"("venda_id", "item_cardapio_id") ON DELETE CASCADE ON UPDATE CASCADE;
