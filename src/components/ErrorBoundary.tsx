import { Component, type ReactNode } from 'react';

/**
 * Evita que un fallo al renderizar una sección tumbe toda la app (aprendido con el
 * bug del bucle de Capi). Muestra un aviso y un botón de reintento en su lugar.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error) {
    console.error('[Zury] error de render', err);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="rounded-xl border border-[var(--danger)] bg-raised p-4 text-[13px] text-ink-soft">
          <p className="text-[var(--danger)]">Algo falló al mostrar {this.props.label ?? 'esta sección'}.</p>
          <p className="mt-1 text-[11px] text-ink-faint">{String(this.state.err.message).slice(0, 200)}</p>
          <button onClick={() => this.setState({ err: null })} className="mt-2 text-[12px] text-gold">
            reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
