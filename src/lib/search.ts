// Lower-cases and strips accents, so searching "questionari" finds
// "Qüestionari" and "practica" finds "Pràctica".
export function normalizeSearchText(value: string, locale: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(locale);
}
