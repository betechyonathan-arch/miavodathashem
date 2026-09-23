import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useZury } from '../state/zury';
import { useSync } from '../state/sync';
import { exportAll, importAll, wipeAll } from '../lib/db/repo';
import { download } from '../lib/exportFile';
import { zmanimForKey, boundaryForKey } from '../lib/jewishDay';
import { timeHM, relative } from '../lib/format';
import { isConfigured, projectLabel } from '../lib/sync/config';
import { syncNow } from '../lib/sync/cloud';
import { Btn, Card, Field, SectionTitle, inputCls } from '../components/ui';
import AiSettingsCard from '../components/AiSettingsCard';
import RemindersCard from '../components/RemindersCard';
import PushSettingsCard from '../components/PushSettingsCard';
import { InstallSection } from '../components/InstallApp';
import { SCHEMA_VERSION } from '../lib/db/schema';
import { getSession } from '../lib/auth/session';
import { logout, updateGender } from '../lib/auth/accounts';
import { useT } from '../lib/i18n';

const MUSAR_THEME_CHIPS: [string, string][] = [
  ['prioridad', 'Hashem primero'],
  ['exigencia', 'Exigencia / prisa'],
  ['teshuva', 'El regreso'],
  ['zman', 'El tiempo y el fin'],
  ['simja', 'Alegría en la avodá'],
  ['anava', 'Humildad / no seguir a la masa'],
];

const SYNC_TEXT: Record<string, string> = {
  disabled: 'Sin configurar — la app guarda solo en este dispositivo.',
  connecting: 'Conectando con la nube…',
  online: 'Sincronizado con la nube.',
  syncing: 'Guardando cambios en la nube…',
  offline: 'Sin conexión. Se sincronizará al volver la red.',
  error: 'Error de sincronización.',
};

export default function Settings() {
  const t = useT();
  const { settings, saveSettings, day } = useZury();
  const { status: syncStatus, lastSyncAt, error: syncError } = useSync();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [msg, setMsg] = useState('');
  const session = getSession();
  const { hash } = useLocation();

  // Llega desde el Menú con #ancla: desplázate a esa sección y resáltala un instante.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-gold');
    const t = setTimeout(() => el.classList.remove('ring-2', 'ring-gold'), 1800);
    return () => clearTimeout(t);
  }, [hash]);

  const zmanim = useMemo(() => {
    if (!settings || !day) return null;
    try {
      return { z: zmanimForKey(day.dayId, settings), b: boundaryForKey(day.dayId, settings) };
    } catch {
      return null;
    }
  }, [settings, day]);

  if (!settings || !day) return null;
  const loc = settings.location;

  const set = (patch: Parameters<typeof saveSettings>[0]) => saveSettings(patch);
  const setLoc = (p: Partial<typeof loc>) => saveSettings({ location: { ...loc, ...p } });

  const INDEX = [
    ['ubicacion', t('Ubicación')],
    ['dia', t('Día judío')],
    ['ambiente', t('Ambiente')],
    ['exigencia', t('Exigencia del sistema')],
    ['musar', t('Musar')],
    ['boleta', t('Boletas')],
    ['recordatorios', t('Recordatorios')],
    ['instalar', t('Instalar')],
    ['ia', t('IA')],
    ['nube', t('Nube')],
    ['cuenta', t('Cuenta')],
    ['datos', t('Datos')],
  ];

  return (
    <div className="space-y-4">
      <SectionTitle es={t('Ajustes')} he="הגדרות" />

      {/* Índice — salta a cualquier sección */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5">
          {INDEX.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="whitespace-nowrap rounded-lg border border-line bg-raised px-2.5 py-1 text-[12px] text-ink-soft"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <Card className="space-y-3 p-4">
        <Field label={t('Nombre para mostrar (privado, solo en tu dispositivo)')}>
          <input className={inputCls} value={settings.displayName} onChange={(e) => set({ displayName: e.target.value })} />
        </Field>
      </Card>

      <Card as="section" id="ubicacion" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Ubicación (cálculos halájicos)')} he="מיקום" />
        <Field label={t('Etiqueta')}>
          <input className={inputCls} value={loc.label} onChange={(e) => setLoc({ label: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('Latitud')}>
            <input
              type="number"
              step="0.0001"
              className={inputCls}
              value={loc.latitude}
              onChange={(e) => setLoc({ latitude: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('Longitud')}>
            <input
              type="number"
              step="0.0001"
              className={inputCls}
              value={loc.longitude}
              onChange={(e) => setLoc({ longitude: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('Zona horaria (tzid)')}>
            <input className={inputCls} value={loc.tzid} onChange={(e) => setLoc({ tzid: e.target.value })} />
          </Field>
          <Field label={t('Elevación (m)')}>
            <input
              type="number"
              className={inputCls}
              value={loc.elevation}
              onChange={(e) => setLoc({ elevation: Number(e.target.value) })}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" checked={loc.israel} onChange={(e) => setLoc({ israel: e.target.checked })} />
          {t('Estoy en Eretz Israel (afecta Yom Tov de un día vs. dos)')}
        </label>
        <button
          className="text-[12px] text-gold"
          onClick={() => {
            navigator.geolocation?.getCurrentPosition((pos) => {
              const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone || loc.tzid;
              const alt = pos.coords.altitude;
              setLoc({
                latitude: +pos.coords.latitude.toFixed(4),
                longitude: +pos.coords.longitude.toFixed(4),
                tzid,
                israel: tzid === 'Asia/Jerusalem' || tzid === 'Asia/Hebron' || tzid === 'Asia/Tel_Aviv',
                elevation: alt != null && Number.isFinite(alt) ? Math.max(0, Math.round(alt)) : 0,
                label: loc.label && loc.label !== 'ירושלים · Jerusalén' ? loc.label : (tzid.split('/').pop() || tzid).replace(/_/g, ' '),
              });
            });
          }}
        >
          {t('Usar mi ubicación actual')}
        </button>
      </Card>

      <Card as="section" id="dia" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Límite del día judío')} he="גבול היום" />
        <Field
          label="Fecha hebrea que se MUESTRA"
          hint="Solo afecta el número de fecha en el calendario, el encabezado y los yahrzeits. Shabat, festivos, el tema y el día bajo el que se guardan los registros siempre cambian al anochecer."
        >
          <select
            className={inputCls}
            value={settings.dateDisplayMode}
            onChange={(e) => set({ dateDisplayMode: e.target.value as typeof settings.dateDisplayMode })}
          >
            <option value="anochecer">Cambia al anochecer (halajá)</option>
            <option value="medianoche">Cambia a la medianoche civil</option>
            <option value="despertar">Cambia a mi hora de despertar</option>
          </select>
        </Field>
        {settings.dateDisplayMode === 'despertar' && (
          <Field label="Mi hora de despertar" hint="0–23. Hasta esa hora sigues viendo la fecha del día anterior.">
            <input
              type="number"
              min="0"
              max="23"
              className={inputCls}
              value={settings.wakeHour}
              onChange={(e) => set({ wakeHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </Field>
        )}
        <Field label="El nuevo día empieza en:">
          <select className={inputCls} value={settings.boundaryMode} onChange={(e) => set({ boundaryMode: e.target.value as 'shkia' | 'tzeit' })}>
            <option value="tzeit">צאת הכוכבים · anochecer (tzet)</option>
            <option value="shkia">שקיעה · puesta del sol (shkiá)</option>
          </select>
        </Field>
        <Field label="Ángulo para tzet (grados bajo el horizonte)" hint="8.5° ≈ tres estrellas medianas. Ajusta según tu costumbre.">
          <input
            type="number"
            step="0.1"
            className={inputCls}
            value={settings.tzeitAngle}
            onChange={(e) => set({ tzeitAngle: Number(e.target.value) })}
          />
        </Field>
        {zmanim && (
          <div className="rounded-xl bg-sunken p-3 text-[12px] text-ink-soft">
            <div>Amanecer: {timeHM(zmanim.z.sunrise, loc.tzid)}</div>
            <div>Shkiá: {timeHM(zmanim.z.sunset, loc.tzid)}</div>
            <div>Tzet ({settings.tzeitAngle}°): {timeHM(zmanim.z.tzeit, loc.tzid)}</div>
            <div className="mt-1 text-gold">Fin del día judío de hoy: {timeHM(zmanim.b, loc.tzid)}</div>
            <div className="mt-1 text-ink-faint">Zona horaria: {loc.tzid}</div>
          </div>
        )}
        <Field label="Corrección manual del fin del día de HOY" hint="Solo para hoy. Deja vacío para usar el cálculo.">
          <input
            type="datetime-local"
            className={inputCls}
            value={
              settings.dayBoundaryOverrides[day.dayId]
                ? new Date(settings.dayBoundaryOverrides[day.dayId]).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) => {
              const overrides = { ...settings.dayBoundaryOverrides };
              if (e.target.value) overrides[day.dayId] = new Date(e.target.value).toISOString();
              else delete overrides[day.dayId];
              set({ dayBoundaryOverrides: overrides });
            }}
          />
        </Field>
      </Card>

      <Card as="section" id="ambiente" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Ambiente')} he="מראה" />
        <Field label={t('Tema día / noche')}>
          <select
            className={inputCls}
            value={settings.themeOverride}
            onChange={(e) => set({ themeOverride: e.target.value as 'auto' | 'day' | 'night' })}
          >
            <option value="auto">Automático (sigue el día judío)</option>
            <option value="day">Siempre día</option>
            <option value="night">Siempre noche</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" checked={settings.shabbatMode} onChange={(e) => set({ shabbatMode: e.target.checked })} />
          {t('Modo Shabat: la app no pide nada en Shabat/Yom Tov')}
        </label>
      </Card>

      <Card as="section" id="exigencia" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Exigencia del sistema')} he="דין" />
        <Field label={t('¿Qué tan duro contigo?')}>
          <select
            className={inputCls}
            value={settings.strictness}
            onChange={(e) => set({ strictness: e.target.value as typeof settings.strictness })}
          >
            <option value="gentle">Suave — acompaña sin presionar</option>
            <option value="firm">Firme — honesto, sin adular</option>
            <option value="demanding">Exigente — te confronta sin rodeos</option>
          </select>
        </Field>
        <p className="text-[11px] text-ink-faint">
          En modo exigente el sistema te señala las excusas, la autoindulgencia y lo que dejas caer, y te pide el
          regreso ahora mismo. <b>Nunca</b> te llama fracaso, <b>nunca</b> da psak ni habla de castigo: la caída se
          responde con la vuelta, no con culpa (§60).
        </p>
      </Card>

      <Card as="section" id="musar" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Musar — frases al hueso')} he="מוסר" />
        <Field label={t('¿Cuánta presencia?')}>
          <select
            className={inputCls}
            value={settings.musar.density}
            onChange={(e) =>
              set({ musar: { ...settings.musar, density: e.target.value as typeof settings.musar.density } })
            }
          >
            <option value="pie">Solo al pie de cada pantalla</option>
            <option value="clave">Al pie y en los momentos clave (entrada, check-in, cierre, avisos)</option>
            <option value="maximo">Máximo: además, una tarjeta en el tablero</option>
          </select>
        </Field>
        <div>
          <span className="mb-1 block text-[13px] font-medium text-ink-soft">Temas que quieres oír más</span>
          <div className="flex flex-wrap gap-1.5">
            {MUSAR_THEME_CHIPS.map(([id, label]) => {
              const on = settings.musar.themes.includes(id);
              return (
                <button
                  key={id}
                  onClick={() =>
                    set({
                      musar: {
                        ...settings.musar,
                        themes: on
                          ? settings.musar.themes.filter((t) => t !== id)
                          : [...settings.musar.themes, id],
                      },
                    })
                  }
                  className={`rounded-lg border px-2.5 py-1 text-[12px] ${
                    on ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            Sin marcar ninguno, el sistema rota entre todos según el día. Marcar sesga la elección, sin
            silenciar el contexto (una caída sigue trayendo teshuvá).
          </p>
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.musar.sefariaParashaEnabled ?? true}
            onChange={(e) => set({ musar: { ...settings.musar, sefariaParashaEnabled: e.target.checked } })}
          />
          <span className="text-[13px] text-ink-soft">
            Musar de la parashá — trae en vivo, cada día, un comentario real (Kli Yakar / Or HaChaim /
            Sforno / Rashi) de la API pública de Sefaria sobre la parashá de la semana. Necesita internet
            la primera vez del día; si no hay, simplemente no aparece.
          </span>
        </label>
        <Link to="/musar" className="inline-block text-[13px] font-medium text-gold">
          Abrir la pantalla de Musar →
        </Link>
      </Card>

      <Card as="section" id="boleta" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Boletas')} he="תעודות" />
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.boleta.autoOnNewWeek}
            onChange={(e) => set({ boleta: { ...settings.boleta, autoOnNewWeek: e.target.checked } })}
          />
          <span className="text-[13px] text-ink-soft">
            <b>Semanal</b> — generar sola al abrir la app cuando cierre una semana hebrea.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.boleta.autoOnNewMonth}
            onChange={(e) => set({ boleta: { ...settings.boleta, autoOnNewMonth: e.target.checked } })}
          />
          <span className="text-[13px] text-ink-soft">
            <b>Mensual</b> — generar sola al abrir la app cuando cierre un mes hebreo.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.boleta.autoOnRoshHashana}
            onChange={(e) => set({ boleta: { ...settings.boleta, autoOnRoshHashana: e.target.checked } })}
          />
          <span className="text-[13px] text-ink-soft">
            <b>Anual</b> — generar sola al abrir la app en Rosh Hashaná, con todo el año que cerró: meses
            fuertes/difíciles, midot predominantes y tus propios aprendizajes, a detalle.
          </span>
        </label>
        <p className="text-[12px] leading-relaxed text-ink-faint">
          Cada boleta dice dónde estuviste bien y mal a detalle, un refuerzo concreto y un musar. Usa el
          módulo de IA si está activo; si no, va por reglas. Todas se pueden exportar a PDF.
        </p>
        <Link to="/boleta" className="inline-block text-[13px] font-medium text-gold">
          Ver mis boletas →
        </Link>
      </Card>

      <section id="recordatorios" className="scroll-mt-24 rounded-2xl">
        <RemindersCard settings={settings} set={set} />
      </section>

      <PushSettingsCard />

      <InstallSection />

      <section id="ia" className="scroll-mt-24 rounded-2xl">
        <AiSettingsCard settings={settings} set={set} />
      </section>

      <Card as="section" id="nube" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Copia en la nube')} he="גיבוי בענן" />
        <div className="rounded-xl bg-sunken p-3 text-[12px]">
          <div className={syncStatus === 'error' ? 'text-[var(--danger)]' : 'text-ink-soft'}>
            {SYNC_TEXT[syncStatus] ?? syncStatus}
          </div>
          {isConfigured && (
            <div className="mt-1 text-ink-faint">
              Proyecto: {projectLabel}
              {lastSyncAt ? ` · última: ${relative(new Date(lastSyncAt).toISOString())}` : ''}
            </div>
          )}
          {syncError && <div className="mt-1 text-[var(--danger)]">{syncError}</div>}
        </div>
        {isConfigured ? (
          <Btn variant="ghost" onClick={() => void syncNow()}>
            {t('Sincronizar ahora')}
          </Btn>
        ) : (
          <p className="text-[11px] text-ink-faint">
            Respaldo gratuito en la nube (Firebase Realtime Database, sin tarjeta, sin caducidad).
            Actívalo con dos comandos: <code>npm run cloud:login</code> y luego{' '}
            <code>npm run cloud:setup</code> (crea proyecto, base de datos, reglas y{' '}
            <code>.env.local</code>). Detalles en <code>SETUP_FIREBASE.md</code>. Se guarda un único
            nodo con todo tu historial y se sincroniza entre tus dispositivos.
          </p>
        )}
        <p className="text-[11px] text-ink-faint">
          La base local de este dispositivo sigue siendo la copia de trabajo; la nube es el respaldo
          y el puente entre dispositivos. Gana siempre la última versión guardada.
        </p>
      </Card>

      <Card as="section" id="cuenta" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Tu cuenta')} he="החשבון שלך" />
        <p className="text-[14px] text-ink">
          {session?.name} <span className="text-ink-faint">· {session?.email}</span>
          {session?.isAdmin && <span className="ms-2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#1a140a]">admin</span>}
        </p>
        {session?.isAdmin && (
          <Link to="/admin" className="inline-block text-[13px] font-medium text-gold">
            {t('Abrir el panel de administración ›')}
          </Link>
        )}
        <Field label={t('Eres')} hint="Cambia qué mitzvot, caídas y preguntas ves. La app se recarga.">
          <select
            className={inputCls}
            value={session?.gender ?? 'hombre'}
            onChange={async (e) => {
              try {
                await updateGender(e.target.value as 'hombre' | 'mujer');
                window.location.replace('/ajustes');
              } catch {
                setMsg('No se pudo guardar el género. Intenta de nuevo.');
              }
            }}
          >
            <option value="hombre">{t('Hombre')}</option>
            <option value="mujer">{t('Mujer')}</option>
          </select>
        </Field>
        <Btn
          variant="ghost"
          onClick={async () => {
            await logout();
            window.location.replace('/');
          }}
        >
          {t('Cerrar sesión')}
        </Btn>
      </Card>

      <Card as="section" id="datos" className="scroll-mt-24 space-y-3 p-4">
        <SectionTitle es={t('Tus datos')} he="הנתונים שלך" />
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={async () => download(await exportAll(), `zury-avodah-${new Date().toISOString().slice(0, 10)}.json`)}>
            {t('Exportar todo (JSON)')}
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            {t('Importar')}
          </Btn>
          <select className={inputCls + ' w-auto'} value={importMode} onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}>
            <option value="merge">{t('Fusionar')}</option>
            <option value="replace">{t('Reemplazar')}</option>
          </select>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const res = await importAll(await f.text(), importMode);
              setMsg(`Importado: ${res.imported} ${res.imported === 1 ? 'registro' : 'registros'}. Recarga la app.`);
            } catch (err) {
              setMsg('Error al importar: ' + (err as Error).message);
            }
            e.target.value = '';
          }}
        />
        {msg && <p className="text-[12px] text-gold">{msg}</p>}
        <Btn
          variant="danger"
          onClick={async () => {
            if (confirm('Esto borra TODO en este dispositivo. ¿Exportaste antes? Escribe aceptar para continuar.')) {
              await wipeAll();
              location.reload();
            }
          }}
        >
          {t('Borrar todo')}
        </Btn>
        <p className="text-[11px] text-ink-faint">
          Tus datos viven solo en este dispositivo (IndexedDB). Exporta con frecuencia para no perder tu historia.
        </p>
      </Card>

      <p className="text-center text-[11px] text-ink-faint">
        Zury Avodah · esquema v{SCHEMA_VERSION} · לעבוד את ה׳ בכל דרכיך
      </p>
    </div>
  );
}
