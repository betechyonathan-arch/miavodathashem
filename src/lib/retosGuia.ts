/*
  La guía de Retos sale UNA sola vez por persona y dispositivo, la primera vez que entra a esa
  sección (no bloquea el resto de la app, como sí lo hace la guía general). Además de
  `settings.guideRetosDoneAt`, se recuerda aquí por si una copia de la nube pisa los ajustes.
*/
import { getSession } from './auth/session';

const key = () => `avodah.guia.retos.v1.${getSession()?.userId ?? 'local'}`;

export function retosGuiaVista(): boolean {
  try {
    return localStorage.getItem(key()) === '1';
  } catch {
    return false;
  }
}

export function marcarRetosGuiaVista(): void {
  try {
    localStorage.setItem(key(), '1');
  } catch {
    /* sin almacenamiento: queda solo lo guardado en los ajustes */
  }
}
