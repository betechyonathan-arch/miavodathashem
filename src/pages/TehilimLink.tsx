import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TehilimError, getCadenaByCode, type CadenaPorCodigo } from '../lib/tehilim';
import { Btn, Card } from '../components/ui';

/** El enlace de una cadena de Tehilim (/retos/tehilim/:code): la vista previa antes de entrar a apuntarse. */
export default function TehilimLink() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [cadena, setCadena] = useState<CadenaPorCodigo | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    getCadenaByCode(code)
      .then(setCadena)
      .catch((e) => setError(e instanceof TehilimError ? e.message : 'No se pudo abrir esta cadena.'));
  }, [code]);

  if (cadena === undefined && !error) {
    return (
      <div className="grid min-h-full place-items-center px-6">
        <p className="text-[15px] text-ink-faint">Cargando…</p>
      </div>
    );
  }

  if (!cadena) {
    return (
      <div className="grid min-h-full place-items-center px-6 text-center">
        <Card className="max-w-sm space-y-3 p-6">
          <p className="text-[15px] text-ink">{error || 'Este enlace ya no funciona.'}</p>
          <Btn variant="ghost" onClick={() => navigate('/retos?t=tehilim')}>
            Ir a Cadenas de Tehilim
          </Btn>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-8">
      <Card className="space-y-3 p-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.16em] text-gold">Cadena de Tehilim · organiza {cadena.organizador}</div>
        <h1 className="text-2xl text-ink">{cadena.title}</h1>
        {cadena.description && <p className="text-[14px] leading-relaxed text-ink-soft">{cadena.description}</p>}
        <p className="text-[13px] text-ink-faint">
          {cadena.tomados} de 150 capítulos tomados{cadena.status === 'completa' ? ' · círculo completo 🎉' : ''}
        </p>
        <Btn onClick={() => navigate(`/retos?t=tehilim&vt=${cadena.id}`)} className="w-full">
          {cadena.status === 'completa' ? 'Ver la cadena' : 'Ver y apuntarme a un capítulo'}
        </Btn>
      </Card>
    </div>
  );
}
