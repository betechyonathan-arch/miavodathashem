/*
  Panel de admin → pestaña Diplomas: elegir a una persona (con sugerencias de los más activos),
  personalizar su diploma viéndolo en vivo, otorgarlo con notificación, y ver o editar los que ya
  se dieron. La persona lo ve en grande al entrar y lo guarda en «Mis diplomas».
*/
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminEvent, AdminUser } from '../lib/admin';
import type { AporteRow } from '../lib/aportes';
import { fechasDiploma } from '../lib/diplomaCanvas';
import {
  TEMAS,
  borrarDiploma,
  guardarDiploma,
  listDiplomasAdmin,
  type DiplomaAdmin,
  type DiplomaDatos,
} from '../lib/diplomas';
import { sendPushDiploma } from '../lib/pushAdmin';
import DiplomaView from './DiplomaView';
import ElegirPersona from './ElegirPersona';
import { Btn, Card, Field, inputCls } from './ui';

/** Puntos de partida: llenan título, título en hebreo y pasuk. Todo se puede cambiar después. */
const PLANTILLAS: { label: string; datos: Partial<DiplomaDatos> }[] = [
  {
    label: 'Honor',
    datos: {
      titulo: 'Diploma de honor',
      titulo_he: 'תְּעוּדַת הוֹקָרָה',
      pasuk_he: 'אֵיזֶהוּ מְכֻבָּד? הַמְכַבֵּד אֶת הַבְּרִיּוֹת',
      pasuk_es: '¿Quién es honrado? El que honra a los demás.',
      pasuk_ref: 'Pirkei Avot 4:1',
    },
  },
  {
    label: 'Constancia',
    datos: {
      titulo: 'Diploma a la constancia',
      titulo_he: 'תְּעוּדַת הַתְמָדָה',
      pasuk_he: 'וְהָיָה כְּעֵץ שָׁתוּל עַל פַּלְגֵי מָיִם',
      pasuk_es: 'Será como un árbol plantado junto a corrientes de agua.',
      pasuk_ref: 'Tehilim 1:3',
    },
  },
  {
    label: 'Torá',
    datos: {
      titulo: 'Diploma al estudio de Torá',
      titulo_he: 'תְּעוּדַת לִמּוּד תּוֹרָה',
      pasuk_he: 'וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה',
      pasuk_es: 'Y meditarás en ella de día y de noche.',
      pasuk_ref: 'Yehoshúa 1:8',
    },
  },
  {
    label: 'Jésed',
    datos: {
      titulo: 'Diploma al jésed',
      titulo_he: 'תְּעוּדַת חֶסֶד',
      pasuk_he: 'עוֹלָם חֶסֶד יִבָּנֶה',
      pasuk_es: 'El mundo se construye con bondad.',
      pasuk_ref: 'Tehilim 89:3',
    },
  },
  {
    label: 'Embajador',
    datos: {
      titulo: 'Diploma de embajador de Avodah',
      titulo_he: 'תְּעוּדַת שַׁגְרִיר',
      pasuk_he: 'וּמַצְדִּיקֵי הָרַבִּים כַּכּוֹכָבִים לְעוֹלָם וָעֶד',
      pasuk_es: 'Y los que acercan a muchos al bien brillarán como las estrellas, para siempre.',
      pasuk_ref: 'Daniel 12:3',
    },
  },
];

const vacio = (): DiplomaDatos => ({
  nombre: '',
  motivo: '',
  mensaje: '',
  firma: 'El equipo de Avodah',
  tema: 'oro',
  titulo: '',
  titulo_he: '',
  pasuk_he: '',
  pasuk_es: '',
  pasuk_ref: '',
  ...PLANTILLAS[0].datos,
});

const ACTIVIDAD = new Set(['kabala_aceptada', 'encuesta_respondida', 'reto_aceptado', 'reto_creado', 'cadena_creada', 'cadena_completada', 'aporte_enviado']);

interface Sugerido {
  u: AdminUser;
  entradas: number;
  invitados: number;
  aportes: number;
  actividad: number;
  puntos: number;
}

export default function DiplomasAdmin({
  users,
  aportes,
  events,
  busy,
  run,
}: {
  users: AdminUser[];
  aportes: AporteRow[] | null;
  events: AdminEvent[] | null;
  busy: boolean;
  run: (action: () => Promise<void>, ok: string) => Promise<void>;
}) {
  const [list, setList] = useState<DiplomaAdmin[] | null | undefined>(undefined); // undefined = cargando; null = falta activar
  const [persona, setPersona] = useState<string | null>(null);
  const [datos, setDatos] = useState<DiplomaDatos>(vacio);
  const [editId, setEditId] = useState<string | null>(null);
  const [notificar, setNotificar] = useState(true);
  const [ver, setVer] = useState<string | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const recargar = useCallback(async () => setList(await listDiplomasAdmin()), []);
  useEffect(() => {
    void recargar();
  }, [recargar]);

  const sugeridos = useMemo<Sugerido[]>(() => {
    return users
      .filter((u) => !u.disabled && u.role !== 'admin')
      .map((u) => {
        const invitados = users.filter((x) => x.referred_by === u.id).length;
        const aps = (aportes ?? []).filter((a) => a.author_id === u.id && a.status === 'aprobado').length;
        const actividad = (events ?? []).filter((e) => e.user_id === u.id && ACTIVIDAD.has(e.kind)).length;
        const entradas = u.login_count ?? 0;
        return { u, entradas, invitados, aportes: aps, actividad, puntos: entradas + invitados * 5 + aps * 5 + actividad * 2 };
      })
      .filter((s) => s.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, verTodos ? 30 : 8);
  }, [users, aportes, events, verTodos]);

  const yaTiene = (id: string) => (list ?? []).filter((d) => d.user_id === id).length;

  function elegir(id: string | null) {
    setPersona(id);
    const u = users.find((x) => x.id === id);
    setDatos((d) => ({ ...d, nombre: u ? u.full_name || u.email : '' }));
  }

  function reiniciar() {
    setPersona(null);
    setDatos(vacio());
    setEditId(null);
    setNotificar(true);
  }

  const listo = !!persona && datos.nombre.trim().length > 0 && datos.titulo.trim().length >= 3 && datos.motivo.trim().length >= 3;

  function otorgar() {
    const p = persona!;
    const d = datos;
    const id0 = editId;
    const avisar = notificar;
    void run(async () => {
      const id = await guardarDiploma(p, d, id0 ?? undefined);
      reiniciar();
      await recargar();
      if (avisar) {
        try {
          await sendPushDiploma(id);
        } catch (err) {
          throw new Error(`El diploma se guardó, pero la notificación no se pudo mandar: ${err instanceof Error ? err.message : 'error desconocido'}.`);
        }
      }
    }, (id0 ? 'Diploma actualizado' : 'Diploma otorgado') + (avisar ? ' y notificación enviada.' : '.'));
  }

  if (list === null) {
    return (
      <Card className="border-[var(--danger)] p-4 text-[14px] leading-relaxed text-ink">
        <strong>Falta activar los diplomas.</strong> Pega <code className="text-gold">supabase/diplomas.sql</code> en el Editor SQL de Supabase y pulsa Run.
      </Card>
    );
  }

  const set = (k: keyof DiplomaDatos) => (ev: { target: { value: string } }) => setDatos({ ...datos, [k]: ev.target.value });

  return (
    <div className="space-y-6">
      {!editId && (
        <Card className="space-y-3 p-5">
          <div>
            <h2 className="text-xl text-ink">Sugeridos: los más activos</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
              Para ayudarte a decidir: cuántas veces entran, a cuántos invitaron, sus aportes aprobados y su actividad reciente
              (kabalot, retos, Tehilim, encuestas). Lo que cada quien escribe en su diario no se ve aquí: se guarda solo en su teléfono.
            </p>
          </div>
          {sugeridos.length === 0 && <p className="text-[13px] text-ink-faint">Todavía no hay actividad para sugerir.</p>}
          <div className="divide-y divide-line">
            {sugeridos.map((s, i) => (
              <div key={s.u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] text-ink">
                    <span className="mr-2 tabular-nums text-ink-faint">{i + 1}.</span>
                    {s.u.full_name || s.u.email}
                    {yaTiene(s.u.id) > 0 && <span className="ml-2 text-[12px] text-gold">🏆 {yaTiene(s.u.id)}</span>}
                  </p>
                  <p className="text-[12px] text-ink-faint">
                    {s.entradas} entradas · {s.invitados} invitados · {s.aportes} aportes · {s.actividad} actividades
                  </p>
                </div>
                <Btn variant="ghost" onClick={() => elegir(s.u.id)}>
                  Elegir
                </Btn>
              </div>
            ))}
          </div>
          <button className="text-[13px] text-gold underline underline-offset-2" onClick={() => setVerTodos(!verTodos)}>
            {verTodos ? 'Ver menos' : 'Ver más'}
          </button>
        </Card>
      )}

      <Card className="space-y-5 p-5">
        <div>
          <h2 className="text-xl text-ink">{editId ? 'Editar diploma' : 'Nuevo diploma'}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
            La persona lo ve en grande al entrar a la app, lo guarda en «Mis diplomas» y lo puede descargar o compartir.
          </p>
        </div>

        <Field label="¿Para quién?">
          <ElegirPersona users={users} value={persona} onChange={elegir} />
        </Field>

        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-ink-soft">Empezar con</span>
          <div className="flex flex-wrap gap-2">
            {PLANTILLAS.map((p) => (
              <Btn key={p.label} variant={datos.titulo === p.datos.titulo ? 'solid' : 'ghost'} onClick={() => setDatos({ ...datos, ...p.datos })}>
                {p.label}
              </Btn>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título en hebreo (opcional)">
            <input className={inputCls + ' hebrew text-right'} dir="rtl" value={datos.titulo_he} maxLength={120} onChange={set('titulo_he')} />
          </Field>
          <Field label="Título">
            <input className={inputCls} value={datos.titulo} maxLength={120} onChange={set('titulo')} />
          </Field>
        </div>
        <Field label="Nombre como se verá en el diploma" hint="Puedes ponerlo completo o con su título, por ejemplo «Sr. David Cohen».">
          <input className={inputCls} value={datos.nombre} maxLength={120} onChange={set('nombre')} />
        </Field>
        <Field label="Motivo" hint="Por qué lo recibe. Sale grande, debajo del nombre.">
          <textarea className={inputCls + ' min-h-[5rem]'} value={datos.motivo} maxLength={600} onChange={set('motivo')} placeholder="Por su constancia ejemplar en la tefilá durante todo el mes de Elul." />
        </Field>
        <Field label="Mensaje personal (opcional)" hint="Unas palabras tuyas para esta persona.">
          <textarea className={inputCls + ' min-h-[5rem]'} value={datos.mensaje} maxLength={1500} onChange={set('mensaje')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pasuk en hebreo (opcional)">
            <input className={inputCls + ' hebrew text-right'} dir="rtl" value={datos.pasuk_he} maxLength={300} onChange={set('pasuk_he')} />
          </Field>
          <Field label="Traducción">
            <input className={inputCls} value={datos.pasuk_es} maxLength={300} onChange={set('pasuk_es')} />
          </Field>
          <Field label="Fuente">
            <input className={inputCls} value={datos.pasuk_ref} maxLength={100} onChange={set('pasuk_ref')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Firma">
            <input className={inputCls} value={datos.firma} maxLength={120} onChange={set('firma')} />
          </Field>
          <div className="space-y-1">
            <span className="block text-[13px] font-medium text-ink-soft">Color</span>
            <div className="flex flex-wrap gap-2">
              {TEMAS.map((t) => (
                <Btn key={t.value} variant={datos.tema === t.value ? 'solid' : 'ghost'} onClick={() => setDatos({ ...datos, tema: t.value })}>
                  {t.label}
                </Btn>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-ink-soft">Así se va a ver</span>
          <div className="mx-auto max-w-sm">
            <DiplomaView d={{ ...datos, nombre: datos.nombre || 'Nombre de la persona', motivo: datos.motivo || 'Aquí va el motivo.' }} fecha={new Date().toISOString()} />
          </div>
        </div>

        <label className="flex items-start gap-2 text-[14px] text-ink-soft">
          <input type="checkbox" className="mt-1" checked={notificar} onChange={(ev) => setNotificar(ev.target.checked)} />
          <span>🔔 Mandarle una notificación («Recibiste un diploma»)</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Btn disabled={busy || !listo} onClick={otorgar}>
            {editId ? 'Guardar cambios' : '🏆 Otorgar diploma'}
          </Btn>
          {(editId || persona) && (
            <Btn variant="quiet" onClick={reiniciar}>
              Cancelar
            </Btn>
          )}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Diplomas otorgados ({list?.length ?? 0})</h2>
        {list === undefined && <p className="text-[14px] text-ink-faint">Cargando…</p>}
        {list?.length === 0 && <Card className="p-5 text-[15px] text-ink-faint">Todavía no has otorgado diplomas.</Card>}
        {list?.map((d) => (
          <Card key={d.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[16px] text-ink">{d.titulo}</p>
                <p className="text-[13px] text-ink-soft">
                  {d.full_name || d.email} · {fechasDiploma(d.created_at).es}
                </p>
              </div>
              <span className={`text-[12px] ${d.visto_at ? 'text-[var(--success)]' : 'text-ink-faint'}`}>{d.visto_at ? '✓ Ya lo vio' : 'Todavía no lo ve'}</span>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-soft">{d.motivo}</p>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Btn variant="ghost" onClick={() => setVer(ver === d.id ? null : d.id)}>
                {ver === d.id ? 'Ocultar' : 'Ver diploma'}
              </Btn>
              <Btn
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditId(d.id);
                  setPersona(d.user_id);
                  setDatos({
                    nombre: d.nombre,
                    titulo: d.titulo,
                    titulo_he: d.titulo_he,
                    motivo: d.motivo,
                    mensaje: d.mensaje,
                    pasuk_he: d.pasuk_he,
                    pasuk_es: d.pasuk_es,
                    pasuk_ref: d.pasuk_ref,
                    firma: d.firma,
                    tema: d.tema,
                  });
                  setNotificar(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Editar
              </Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(async () => void (await sendPushDiploma(d.id)), 'Notificación enviada.')}>
                🔔 Avisar otra vez
              </Btn>
              <Btn
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (confirm('¿Borrar este diploma? La persona ya no lo verá.'))
                    void run(async () => {
                      await borrarDiploma(d.id);
                      await recargar();
                    }, 'Diploma borrado.');
                }}
              >
                Borrar
              </Btn>
            </div>
            {ver === d.id && (
              <div className="mx-auto max-w-sm">
                <DiplomaView d={d} fecha={d.created_at} acciones />
              </div>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
