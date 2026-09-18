import { type ReactNode, useEffect } from 'react';

export function Card({
  children,
  className = '',
  as: As = 'div',
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'button';
  id?: string;
}) {
  return (
    <As
      id={id}
      className={`sefer-frame rounded-2xl border border-line bg-raised ${className}`}
    >
      {children}
    </As>
  );
}

export function SectionTitle({ he, es, extra }: { he?: string; es: string; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {he && <div className="hebrew text-2xl leading-tight text-gold">{he}</div>}
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-ink-faint">{es}</div>
      </div>
      {extra}
    </div>
  );
}

/** Anillo de progreso SVG. value 0..1 */
export function Ring({
  value,
  size = 64,
  stroke = 6,
  label,
  sublabel,
  emoji,
  onClick,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  emoji?: string;
  onClick?: () => void;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, value)));
  // Sin onClick se renderiza como <span> — así un Ring decorativo puede vivir
  // dentro de una <Card> que ya es <button> sin anidar botones.
  const Outer = onClick ? 'button' : 'span';
  return (
    <Outer
      {...(onClick ? { onClick } : {})}
      className="flex flex-col items-center gap-1"
    >
      <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={off}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 700ms ease' }}
          />
        </svg>
        <span className="absolute text-lg">{emoji ?? Math.round(value * 100) + '%'}</span>
      </span>
      {label && <span className="text-[11px] leading-tight text-ink-soft">{label}</span>}
      {sublabel && <span className="text-[10px] leading-none text-ink-faint">{sublabel}</span>}
    </Outer>
  );
}

/** Hoja modal desde abajo (mobile-first). */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative faderise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-bg p-5 safe-bottom sm:max-w-lg sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        {title && <div className="mb-4">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-[15px] text-ink outline-none focus:border-gold placeholder:text-ink-faint';

export function Btn({
  children,
  onClick,
  variant = 'solid',
  className = '',
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'ghost' | 'quiet' | 'danger';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-[filter,background-color,border-color,opacity] duration-300 disabled:opacity-40';
  const styles = {
    solid: 'bg-gold text-[#1a140a] hover:brightness-105',
    ghost: 'border border-line bg-raised text-ink hover:border-gold',
    quiet: 'text-ink-soft hover:text-ink',
    danger: 'border border-[var(--danger)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Scale({
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div className="flex flex-wrap gap-1.5">
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-lg border text-sm transition ${
            value === n ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
