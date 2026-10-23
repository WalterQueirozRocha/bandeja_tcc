// Data de hoje (AAAA-MM-DD) no fuso da escola.
export function hojeNaBahia(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(agora);
}

// 00:00 em Salvador do dia `iso` (+ `dias`). ponytail: UTC−3 fixo, como em `semanaDe` no domínio.
export function inicioDoDiaNaBahia(iso: string, dias = 0) {
  return new Date(new Date(`${iso}T03:00:00Z`).getTime() + dias * 86_400_000);
}
