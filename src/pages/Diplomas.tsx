import { useEffect, useState } from 'react';
import DiplomaView from '../components/DiplomaView';
import { Card, SectionTitle } from '../components/ui';
import { misDiplomas, type Diploma } from '../lib/diplomas';
import { fechasDiploma } from '../lib/diplomaCanvas';

/** «Mis diplomas»: todos los que le dieron a esta persona, para verlos, guardarlos o compartirlos. */
export default function Diplomas() {
  const [list, setList] = useState<Diploma[] | null>(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    void misDiplomas().then((l) => {
      if (l) {
        setList(l);
        if (l.length > 0) setAbierto(l[0].id);
      } else setError(true);
    });
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle es="Mis diplomas" he="תְּעוּדוֹת" />
      {error && <Card className="p-5 text-[14px] text-ink-faint">No se pudieron cargar tus diplomas. Revisa tu conexión.</Card>}
      {!error && !list && <p className="text-[14px] text-ink-faint">Cargando…</p>}
      {list && list.length === 0 && (
        <Card className="p-5 text-[14px] leading-relaxed text-ink-soft">
          Todavía no tienes diplomas. Cuando el equipo de Avodah te otorgue uno, te llegará un aviso y aparecerá aquí.
        </Card>
      )}
      {list?.map((d) => (
        <Card key={d.id} className="space-y-3 p-4">
          <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setAbierto(abierto === d.id ? null : d.id)}>
            <span className="min-w-0">
              <span className="block text-[16px] text-ink">{d.titulo}</span>
              <span className="block text-[12px] text-ink-faint">{fechasDiploma(d.created_at).es}</span>
            </span>
            <span className="text-ink-faint">{abierto === d.id ? '−' : '+'}</span>
          </button>
          {abierto === d.id && <DiplomaView d={d} fecha={d.created_at} acciones />}
        </Card>
      ))}
    </div>
  );
}
