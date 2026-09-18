/*
  Género — decide QUÉ mitzvot, caídas y preguntas ve cada usuario.

  La halajá no exige lo mismo a hombres y mujeres: las mujeres están exentas de
  las mitzvot positivas atadas al tiempo (tefilín, tzitzit, Shemá, minyán) y
  tienen mitzvot propias (jalá, taharat hamishpajá, énfasis en tzniut). Y
  shmirat einaim / shmirat habrit se le pregunta al hombre; a la mujer se le
  pregunta por lo suyo (lashón hará, tzniut).

  Cada ítem de catálogo puede llevar `for: 'hombre' | 'mujer'`. Sin `for`, es
  para ambos. El género sale de la sesión y solo cambia recargando la app, así
  que los catálogos se filtran una vez, al cargar el módulo.

  Es una guía general basada en el Shulján Aruj; cada cual consulta a su rav.
*/
import { getSession, type Gender } from './auth/session';

export type { Gender };

export function getGender(): Gender {
  return getSession()?.gender ?? 'hombre';
}

export interface GenderTagged {
  for?: Gender;
}

export function forGender<T extends GenderTagged>(items: T[], g: Gender = getGender()): T[] {
  return items.filter((i) => !i.for || i.for === g);
}
