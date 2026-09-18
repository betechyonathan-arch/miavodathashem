/** "1 día" / "3 días" — sin el paréntesis "(s)" que ensucia el texto. */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Hora en formato 24 h ("19:20"), sin a. m. / p. m. */
export function timeHM(iso: string | Date, tz?: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(tz ? { timeZone: tz } : {}),
  });
}

export function civilLong(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function civilShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

/** "hace 3 h", "ayer", "hace 2 días" */
export function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `hace ${mo} mes${mo > 1 ? 'es' : ''}`;
  return `hace ${count(Math.round(mo / 12), 'año', 'años')}`;
}

const HEB_MONTH_ES: Record<string, string> = {
  Nisan: 'Nisán', Iyyar: 'Iyar', Sivan: 'Siván', Tamuz: 'Tamuz', "Tammuz": 'Tamuz',
  Av: 'Av', Elul: 'Elul', Tishrei: 'Tishrei', Cheshvan: 'Jeshván', Kislev: 'Kislev',
  Tevet: 'Tevet', "Sh'vat": 'Shevat', Shvat: 'Shevat', "Adar I": 'Adar I', "Adar II": 'Adar II',
  Adar: 'Adar', "Adar 1": 'Adar I', "Adar 2": 'Adar II',
};

/** "17 Elul 5786" -> "17 de Elul de 5786" */
export function hebrewDateEs(s: string): string {
  const m = s.match(/^(\d+)\s+(.+?)\s+(\d+)$/);
  if (!m) return s;
  const [, day, month, year] = m;
  return `${day} de ${HEB_MONTH_ES[month] ?? month} de ${year}`;
}
