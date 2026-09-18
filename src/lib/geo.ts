/*
  Ubicación por defecto para una instalación nueva: se deduce de la zona horaria
  del dispositivo (Intl). Así el "día judío" cambia al anochecer LOCAL y no al de
  Jerusalén. El usuario siempre puede afinarla en Ajustes → Ubicación (incluido el
  botón "Usar mi ubicación actual", que sí trae latitud/longitud exactas).
*/
export interface GeoLoc {
  label: string;
  latitude: number;
  longitude: number;
  tzid: string;
  israel: boolean;
  elevation: number;
}

export const JERUSALEM: GeoLoc = {
  label: 'ירושלים · Jerusalén',
  latitude: 31.7683,
  longitude: 35.2137,
  tzid: 'Asia/Jerusalem',
  israel: true,
  elevation: 754,
};

/**
 * Zonas IANA frecuentes → ciudad representativa (centro urbano; suficiente para
 * zmanim). Ampliable sin riesgo: si tu zona no está, se usa una estimación por
 * el desfase horario y basta con ajustar la ubicación una vez.
 */
const ZONES: Record<string, Omit<GeoLoc, 'tzid'>> = {
  'Asia/Jerusalem': { label: 'ירושלים · Jerusalén', latitude: 31.7683, longitude: 35.2137, israel: true, elevation: 754 },
  'Asia/Hebron': { label: 'ירושלים · Jerusalén', latitude: 31.7683, longitude: 35.2137, israel: true, elevation: 754 },
  'Asia/Tel_Aviv': { label: 'תל אביב · Tel Aviv', latitude: 32.0853, longitude: 34.7818, israel: true, elevation: 5 },
  'America/Mexico_City': { label: 'Ciudad de México', latitude: 19.4326, longitude: -99.1332, israel: false, elevation: 2240 },
  'America/Monterrey': { label: 'Monterrey', latitude: 25.6866, longitude: -100.3161, israel: false, elevation: 540 },
  'America/Merida': { label: 'Mérida', latitude: 20.9674, longitude: -89.5926, israel: false, elevation: 10 },
  'America/Cancun': { label: 'Cancún', latitude: 21.1619, longitude: -86.8515, israel: false, elevation: 10 },
  'America/Chihuahua': { label: 'Chihuahua', latitude: 28.6353, longitude: -106.0889, israel: false, elevation: 1440 },
  'America/Hermosillo': { label: 'Hermosillo', latitude: 29.0729, longitude: -110.9559, israel: false, elevation: 210 },
  'America/Tijuana': { label: 'Tijuana', latitude: 32.5149, longitude: -117.0382, israel: false, elevation: 20 },
  'America/Guadalajara': { label: 'Guadalajara', latitude: 20.6597, longitude: -103.3496, israel: false, elevation: 1566 },
  'America/New_York': { label: 'Nueva York', latitude: 40.7128, longitude: -74.006, israel: false, elevation: 10 },
  'America/Chicago': { label: 'Chicago', latitude: 41.8781, longitude: -87.6298, israel: false, elevation: 180 },
  'America/Denver': { label: 'Denver', latitude: 39.7392, longitude: -104.9903, israel: false, elevation: 1609 },
  'America/Los_Angeles': { label: 'Los Ángeles', latitude: 34.0522, longitude: -118.2437, israel: false, elevation: 90 },
  'America/Phoenix': { label: 'Phoenix', latitude: 33.4484, longitude: -112.074, israel: false, elevation: 331 },
  'America/Toronto': { label: 'Toronto', latitude: 43.6532, longitude: -79.3832, israel: false, elevation: 76 },
  'America/Argentina/Buenos_Aires': { label: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816, israel: false, elevation: 25 },
  'America/Sao_Paulo': { label: 'São Paulo', latitude: -23.5505, longitude: -46.6333, israel: false, elevation: 760 },
  'America/Bogota': { label: 'Bogotá', latitude: 4.711, longitude: -74.0721, israel: false, elevation: 2640 },
  'America/Lima': { label: 'Lima', latitude: -12.0464, longitude: -77.0428, israel: false, elevation: 154 },
  'America/Santiago': { label: 'Santiago', latitude: -33.4489, longitude: -70.6693, israel: false, elevation: 520 },
  'America/Guatemala': { label: 'Guatemala', latitude: 14.6349, longitude: -90.5069, israel: false, elevation: 1500 },
  'America/Panama': { label: 'Panamá', latitude: 8.9824, longitude: -79.5199, israel: false, elevation: 10 },
  'America/Montevideo': { label: 'Montevideo', latitude: -34.9011, longitude: -56.1645, israel: false, elevation: 40 },
  'America/Caracas': { label: 'Caracas', latitude: 10.4806, longitude: -66.9036, israel: false, elevation: 900 },
  'Europe/London': { label: 'Londres', latitude: 51.5074, longitude: -0.1278, israel: false, elevation: 11 },
  'Europe/Paris': { label: 'París', latitude: 48.8566, longitude: 2.3522, israel: false, elevation: 35 },
  'Europe/Madrid': { label: 'Madrid', latitude: 40.4168, longitude: -3.7038, israel: false, elevation: 667 },
  'Europe/Berlin': { label: 'Berlín', latitude: 52.52, longitude: 13.405, israel: false, elevation: 34 },
  'Europe/Rome': { label: 'Roma', latitude: 41.9028, longitude: 12.4964, israel: false, elevation: 21 },
  'Europe/Amsterdam': { label: 'Ámsterdam', latitude: 52.3676, longitude: 4.9041, israel: false, elevation: 2 },
  'Europe/Moscow': { label: 'Moscú', latitude: 55.7558, longitude: 37.6173, israel: false, elevation: 156 },
  'Australia/Sydney': { label: 'Sídney', latitude: -33.8688, longitude: 151.2093, israel: false, elevation: 20 },
  'Australia/Melbourne': { label: 'Melbourne', latitude: -37.8136, longitude: 144.9631, israel: false, elevation: 30 },
  'Asia/Dubai': { label: 'Dubái', latitude: 25.2048, longitude: 55.2708, israel: false, elevation: 5 },
  'Africa/Johannesburg': { label: 'Johannesburgo', latitude: -26.2041, longitude: 28.0473, israel: false, elevation: 1753 },
};

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

const ISRAEL_TZ = /^Asia\/(Jerusalem|Hebron|Tel_Aviv)$/;

/** ¿La zona horaria del dispositivo es de Israel? */
export function deviceInIsrael(): boolean {
  return ISRAEL_TZ.test(deviceTimezone());
}

/** ¿Esta ubicación es de Israel (por bandera o por tzid)? */
export function isIsraelLocation(l: { israel?: boolean; tzid?: string } | undefined): boolean {
  if (!l) return false;
  return l.israel === true || ISRAEL_TZ.test(l.tzid ?? '');
}

function currentZone(): string {
  return deviceTimezone();
}

/** Ubicación de alta confianza a partir de la zona horaria, o null si es desconocida. */
export function curatedZoneLocation(): GeoLoc | null {
  const tz = currentZone();
  const hit = ZONES[tz];
  return hit ? { ...hit, tzid: tz } : null;
}

/**
 * Mejor estimación de la ubicación para una instalación nueva:
 *  1) tabla de zonas conocidas,
 *  2) si la zona es de Israel, Jerusalén,
 *  3) si no, longitud estimada por el desfase horario (cada hora ≈ 15°) y una
 *     latitud media; el rótulo invita a ajustarla.
 * Nunca lanza; si no hay Intl, cae en Jerusalén.
 */
export function guessLocationFromEnv(): GeoLoc {
  const tz = currentZone();
  if (!tz) return { ...JERUSALEM };

  const curated = ZONES[tz];
  if (curated) return { ...curated, tzid: tz };

  if (tz.startsWith('Asia/') && /Jerusalem|Hebron|Tel_Aviv/.test(tz)) return { ...JERUSALEM, tzid: tz };

  // Desconocida: estima la longitud por el desfase actual del dispositivo.
  const offsetMin = -new Date().getTimezoneOffset(); // minutos al este de UTC
  const longitude = Math.max(-180, Math.min(180, Math.round((offsetMin / 60) * 15 * 10) / 10));
  return {
    label: (tz.split('/').pop() || tz).replace(/_/g, ' '),
    latitude: 31.78, // latitud media; ajústala en Ajustes → Ubicación
    longitude,
    tzid: tz,
    israel: false,
    elevation: 0,
  };
}
