/**
 * Splash de entrada: fondo oscuro sobrio, el lema y un botón para continuar.
 * Tocar en cualquier parte continúa.
 */
export default function Splash({ onContinue }: { onContinue: () => void }) {
  return (
    <button
      onClick={onContinue}
      aria-label="Avodah — לעבוד את ה׳ בכל דרכיך. Continuar"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a2318 0%, #0d0b07 75%)' }}
    >
      <span className="hebrew text-3xl leading-snug" style={{ color: '#e3bd6c' }}>
        לעבוד את ה׳ בכל דרכיך
      </span>
      <span className="text-sm" style={{ color: 'rgba(247,241,226,0.7)' }}>
        Servir a Hashem en todos tus caminos
      </span>
      <span className="hebrew mt-8 text-xl" style={{ color: '#f7f1e2' }}>
        המשך
      </span>
    </button>
  );
}
