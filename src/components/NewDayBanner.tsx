import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';

/** "היום מתחיל מחדש" — se muestra cuando el día judío cambia con la app abierta. */
export default function NewDayBanner() {
  const newDayAt = useZury((s) => s.newDayAt);
  const dismiss = useZury((s) => s.dismissNewDay);
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!newDayAt) {
      setShow(false);
      return;
    }
    if (Date.now() - newDayAt > 120_000) {
      dismiss();
      return;
    }
    setShow(true);
    const t = window.setTimeout(() => {
      setShow(false);
      dismiss();
    }, 12_000);
    return () => window.clearTimeout(t);
  }, [newDayAt, dismiss]);

  if (!show) return null;

  return (
    <button
      onClick={() => {
        setShow(false);
        dismiss();
        navigate('/check-in');
      }}
      className="faderise sticky top-[64px] z-40 mx-4 mt-2 flex items-center justify-between gap-3 rounded-xl border border-gold bg-[color-mix(in_srgb,var(--gold)_12%,var(--bg))] px-4 py-3 text-left"
    >
      <span>
        <span className="hebrew block text-lg text-gold">היום מתחיל מחדש</span>
        <span className="text-[12px] text-ink-soft">Un nuevo día de Avodá. Empieza con el check-in →</span>
      </span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setShow(false);
          dismiss();
        }}
        className="shrink-0 text-[18px] text-ink-faint"
      >
        ×
      </span>
    </button>
  );
}
