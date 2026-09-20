/*
  La guía de uso sale UNA sola vez por persona y dispositivo. Además de `settings.guideDoneAt`, se
  recuerda aquí, por si una copia de la nube pisa los ajustes y la guía volviera a salir.
*/
import { getSession } from './auth/session';

const key = () => `avodah.guia.v1.${getSession()?.userId ?? 'local'}`;

/** ¿Esta persona ya vio la guía en este dispositivo? (Además de settings.guideDoneAt, por si una copia de la nube lo pisa.) */
export function guiaVista(): boolean {
  try {
    return localStorage.getItem(key()) === '1';
  } catch {
    return false;
  }
}

export function marcarGuiaVista(): void {
  try {
    localStorage.setItem(key(), '1');
  } catch {
    /* sin almacenamiento: queda solo lo guardado en los ajustes */
  }
}
