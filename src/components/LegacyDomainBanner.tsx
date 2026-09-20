import { OFFICIAL_ORIGIN } from '../lib/site';

/** Aviso en la dirección vieja de Netlify: la oficial es otra, y los datos no se pasan solos. */
export default function LegacyDomainBanner() {
  return (
    <div className="border-b border-gold/60 bg-raised px-4 py-2.5 text-center text-[12.5px] leading-relaxed text-ink">
      Esta es la dirección de prueba. El sitio oficial es{' '}
      <a href={OFFICIAL_ORIGIN} className="text-gold underline underline-offset-2">
        {OFFICIAL_ORIGIN.replace('https://', '')}
      </a>
      . Tu cuenta funciona en las dos, pero tus registros se guardan por dirección: si ya registraste algo aquí, expórtalo
      en Ajustes antes de pasarte.
    </div>
  );
}
