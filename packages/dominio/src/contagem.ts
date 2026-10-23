// ponytail: America/Bahia não tem horário de verão desde 2012 → UTC−3 fixo; trocar por Intl se o fuso mudar.
const FUSO_ESCOLA_MIN = -180;
const DIA_MS = 86_400_000;

// P8: semana de calendário, de segunda a domingo, no fuso da escola.
export function semanaDe(instante: Date): { inicio: Date; fim: Date; segunda: string } {
  const local = new Date(instante.getTime() + FUSO_ESCOLA_MIN * 60_000);
  const diasDesdeSegunda = (local.getUTCDay() + 6) % 7;
  const segunda = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - diasDesdeSegunda);
  const inicio = new Date(segunda - FUSO_ESCOLA_MIN * 60_000);
  return { inicio, fim: new Date(inicio.getTime() + 7 * DIA_MS), segunda: new Date(segunda).toISOString().slice(0, 10) };
}

// Doc §4.7: notifica quando o limite é ultrapassado (3º consumo com o padrão 2), uma vez por categoria na semana.
export function deveNotificar(consumos: number, limite: number, jaNotificada: boolean): boolean {
  return consumos > limite && !jaNotificada;
}
