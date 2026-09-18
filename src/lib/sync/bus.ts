/**
 * Bus mínimo para avisar de cambios en la base local sin crear ciclos de import.
 * db.ts emite (desde hooks de Dexie, DENTRO de una transacción); los suscriptores
 * se ejecutan siempre FUERA de esa transacción (setTimeout) para no chocar con Dexie.
 */
type Fn = () => void;

const listeners = new Set<Fn>();
let pending = false;

export function onDbChange(fn: Fn): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitDbChange(): void {
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    for (const fn of listeners) {
      try {
        fn();
      } catch {
        /* un suscriptor no debe tumbar a los demás */
      }
    }
  }, 0);
}
