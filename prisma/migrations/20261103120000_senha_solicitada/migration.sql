-- Esqueci a senha (03/11): sem e-mail, o pedido vira notificação para a coordenação, que redefine a senha.
ALTER TYPE "TipoNotificacao" ADD VALUE 'SENHA_SOLICITADA';
