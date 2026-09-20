/*
  La dirección oficial de la app. Los enlaces que se comparten (invitaciones) y el enlace
  de "olvidé mi contraseña" siempre apuntan aquí, aunque la persona esté en la dirección
  vieja de Netlify: así hay UNA sola dirección y no se reparten las cuentas y los datos.

  Nota: los registros de cada persona viven en el navegador y son POR DIRECCIÓN. Quien usó
  la app en la dirección vieja tiene sus datos allá; por eso esa dirección muestra un aviso
  para exportarlos antes de pasarse a la oficial.
*/

export const OFFICIAL_ORIGIN = 'https://miavodathashem.com';

/** ¿Está abierta desde la dirección de prueba de Netlify (no la oficial)? */
export function isLegacyHost(): boolean {
  return window.location.hostname.endsWith('.netlify.app');
}

/** El origen que se debe usar en enlaces compartidos: el oficial, salvo en desarrollo local. */
export function siteOrigin(): string {
  return isLegacyHost() ? OFFICIAL_ORIGIN : window.location.origin;
}
