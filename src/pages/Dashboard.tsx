import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { listEntries } from '../lib/db/repo';
import { db } from '../lib/db/db';
import { DASHBOARD_AREAS, catEmoji, catHe, catLabel } from '../lib/categories';
import { dayProgress } from '../lib/jewishDay';
import { computeDayStats, detectPatterns } from '../lib/adaptiveEngine';
import { accountabilityCallouts } from '../lib/accountability';
import { pickMusar } from '../lib/musar';
import { baseMusarContext } from '../lib/musar/context';
import { computeYehudiCircle } from '../lib/yehudi/circle';
import KabalotCard from '../components/KabalotCard';
import { InstallBanner } from '../components/InstallApp';
import { pendingBoletaPeriod } from '../lib/boleta';
import { timeHM } from '../lib/format';
import { Card, Ring, SectionTitle } from '../components/ui';
import ActivityChart from '../components/ActivityChart';
import MussarLine from '../components/MussarLine';
import QuickRegister from '../components/QuickRegister';
import MitzvotToday from '../components/MitzvotToday';
import YahrzeitToday from '../components/YahrzeitToday';
import type { AreaId, DayRecord, Entry, Goal } from '../lib/db/schema';
import EntryList from '../components/EntryList';

export default function Dashboard() {
  const { day, dayRecord, now, settings } = useZury();
  const navigate = useNavigate();
  const [qrArea, setQrArea] = useState<AreaId | null>(null);

  const pendingBoleta = day && settings ? pendingBoletaPeriod(settings, day.dayId) : null;

  const todayEntries = useLiveQuery(
    () => (day ? listEntries({ dayId: day.dayId }) : Promise.resolve([])),
    [day?.dayId],
    [] as Entry[],
  );

  const recentEntries = useLiveQuery(async () => {
    if (!day) return [] as Entry[];
    const from = new Date(Date.now() - 30 * 864e5).toISOString();
    const rows = await db.entries.where('createdAt').aboveOrEqual(from).toArray();
    return rows.filter((r) => !r.deletedAt && r.dayId !== day.dayId);
  }, [day?.dayId], [] as Entry[]);

  const stats = useMemo(() => computeDayStats(todayEntries), [todayEntries]);
  const patterns = useMemo(() => detectPatterns(recentEntries), [recentEntries]);

  const lifeEntries = useLiveQuery(() => db.entries.toArray(), [], [] as Entry[]);
  const yehudiCircle = useMemo(
    () => (settings ? computeYehudiCircle(settings, lifeEntries) : null),
    [settings, lifeEntries],
  );

  const allGoals = useLiveQuery(() => db.goals.toArray(), [], [] as Goal[]);
  const recentDays = useLiveQuery(async () => {
    if (!day) return [] as DayRecord[];
    const rows = await db.days.orderBy('id').reverse().limit(15).toArray();
    return rows.filter((d) => d.id !== day.dayId);
  }, [day?.dayId], [] as DayRecord[]);

  const activeGoals = useMemo(
    () =>
      allGoals
        .filter((g) => !g.archivedAt && g.status === 'active' && ['day', 'week', 'month'].includes(g.level))
        .sort((a, b) => ['day', 'week', 'month'].indexOf(a.level) - ['day', 'week', 'month'].indexOf(b.level))
        .slice(0, 4),
    [allGoals],
  );

  if (!day || !settings) return null;

  const progress = dayProgress(now, day);
  const callouts = accountabilityCallouts({
    strictness: settings.strictness,
    today: day,
    dayRecord,
    todayEntries,
    recentEntries,
    recentDays,
    goals: allGoals,
    dayProgress: progress,
  });
  const endsAt = new Date(day.endsAt);
  const hoursLeft = (endsAt.getTime() - now.getTime()) / 3.6e6;

  const hasCheckIn = !!dayRecord?.checkIn;
  const hasCheshbon = !!dayRecord?.cheshbon;
  const showCheckIn = !hasCheckIn && progress < 0.6;
  const showCheshbon = !hasCheshbon && (progress > 0.65 || hoursLeft < 4);

  const areaCounts = stats.byArea;
  const cap = 3; // 3 registros en un área = anillo lleno (formula transparente)

  return (
    <div className="space-y-5">
      {/* Mis kabalot: las que la persona creó, o una invitación a empezar la primera */}
      <KabalotCard />

      <InstallBanner />

      {/* Círculo principal */}
      <Card className="relative overflow-hidden p-5">
        <div className="flex items-center gap-4">
          <Ring value={progress} size={104} stroke={8} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Avodat Hashem</div>
            <div className="hebrew text-3xl leading-tight text-gold">לעבוד את ה׳</div>
            <p className="mt-1 text-[13px] text-ink-soft">
              {stats.totalEntries === 0
                ? 'Aún no registras nada hoy. Vive tu día y cuéntaselo al sistema.'
                : `${stats.totalEntries} ${stats.totalEntries === 1 ? 'registro' : 'registros'} hoy · ${stats.victories} 🟢 · ${stats.falls} 🔴`}
            </p>
            <div className="mt-1 text-[11px] text-ink-faint">
              El día judío termina ~{timeHM(day.endsAt, settings.location.tzid)} · progreso {Math.round(progress * 100)}%
            </div>
          </div>
        </div>
        {day.isShabbat && settings.shabbatMode && (
          <div className="mt-4 rounded-xl border border-line bg-sunken p-3 text-center">
            <div className="hebrew text-lg text-gold">שבת</div>
            <p className="text-[12px] text-ink-soft">
              Modo Shabat. La app no te pide nada hoy; si algo llega a tu mente, lo registrarás al terminar.
            </p>
          </div>
        )}
      </Card>

      {/* Círculo יהודי שלם — el camino de por vida, muy exigente */}
      <button onClick={() => navigate('/yehudi')} className="block w-full text-left">
        <Card className="flex items-center gap-4 p-4">
          <Ring value={(yehudiCircle?.percent ?? 0) / 100} size={72} stroke={7} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Ser Yehudí</div>
            <div className="hebrew text-2xl leading-tight text-gold">
              יהודי שלם · {yehudiCircle?.percent ?? 0}%
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
              {settings.yehudi?.onboardedAt
                ? `${yehudiCircle?.catalogKept ?? 0}/${yehudiCircle?.catalogTotal ?? 0} del catálogo · ${yehudiCircle?.lifetimeEntries ?? 0} registros de por vida${
                    yehudiCircle && yehudiCircle.recentFalls > 0 ? ` · ${yehudiCircle.recentFalls} caídas recientes` : ''
                  }`
                : 'Toca para fijar tu punto de partida: ¿qué halajot y jumrot cuidas hoy?'}
            </p>
          </div>
          <span className="text-ink-faint">›</span>
        </Card>
      </button>

      {/* Accesos del día — siempre visibles */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { he: 'כוונה', es: 'Check-in', to: '/check-in', done: hasCheckIn },
          { he: 'חשבון', es: 'Cheshbon', to: '/cheshbon', done: hasCheshbon },
          { he: 'היום', es: 'Ver el día', to: `/dia/${day.dayId}`, done: false },
          { he: 'לוח', es: 'Calendario', to: '/calendario', done: false },
        ].map((a) => (
          <button
            key={a.es}
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-line bg-raised px-1 py-2 text-center"
          >
            <span className="hebrew text-[13px] leading-none text-ink">{a.he}</span>
            <span className="text-[9px] uppercase tracking-[0.1em] leading-none text-ink-faint">
              {a.es}
            </span>
            {a.done && <span className="text-[9px] leading-none text-[var(--success)]">✓ hecho</span>}
          </button>
        ))}
      </div>

      {pendingBoleta && (
        <button onClick={() => navigate('/boleta')} className="block w-full text-left">
          <Card className="flex items-center gap-3 border-gold/40 p-4">
            <span className="hebrew text-2xl text-gold">תְּעוּדָה</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-ink">
                {pendingBoleta.kind === 'year'
                  ? `Rosh Hashaná: tu boleta de ${pendingBoleta.period.label} te espera.`
                  : `Tu boleta de ${pendingBoleta.period.label} está lista.`}
              </span>
              <span className="block text-[11px] text-ink-faint">
                Dónde estuviste bien y mal a detalle, un refuerzo y un musar. Toca para leerla.
              </span>
            </span>
            <span className="text-ink-faint">›</span>
          </Card>
        </button>
      )}

      <YahrzeitToday />

      {settings.musar?.density === 'maximo' && (
        <Card className="p-4">
          <MussarLine
            seed="dashboard"
            extra={{
              fellToday: stats.falls > 0,
              recoveredToday: todayEntries.some((e) => e.valence === 'recovery'),
              emptyDayMidday:
                stats.totalEntries === 0 && progress > 0.4 && !day.isShabbat && !day.isYomTov,
              strongDay: stats.totalEntries >= 4 && stats.falls === 0,
            }}
          />
        </Card>
      )}

      {/* Check-in / Cheshbon contextual */}
      {showCheckIn && !day.isShabbat && (
        <Card className="w-full p-4">
          <button className="w-full text-left" onClick={() => navigate('/check-in')}>
            <SectionTitle es="Inicio del día · ~60s" he="כוונה ליום" />
            <p className="text-[13px] text-ink-soft">
              4 preguntas cortas para entrar al día con un punto de Avodá claro.
            </p>
            <span className="mt-2 inline-block text-[13px] font-medium text-gold">Empezar check-in →</span>
          </button>
        </Card>
      )}
      {showCheshbon && !day.isShabbat && (
        <Card className="w-full p-4">
          <button className="w-full text-left" onClick={() => navigate('/cheshbon')}>
            <SectionTitle es="Final del día" he="חשבון הנפש" />
            <p className="text-[13px] text-ink-soft">
              El sistema ya revisó lo que registraste. Solo te preguntará lo que falta.
            </p>
            <span className="mt-2 inline-block text-[13px] font-medium text-gold">Hacer חשבון הנפש →</span>
          </button>
        </Card>
      )}

      {/* Exigencia — rendición de cuentas */}
      {callouts.length > 0 && (
        <div>
          <SectionTitle es="Sin rodeos" he="דין וחשבון" />
          <Card className="space-y-2 p-4">
            {callouts.map((c) => (
              <p
                key={c.id}
                className={`text-[13px] leading-snug ${
                  c.severity === 'hard'
                    ? 'text-[var(--danger)]'
                    : c.severity === 'warn'
                      ? 'text-ink'
                      : 'text-ink-soft'
                }`}
              >
                {c.severity === 'hard' ? '▶ ' : '· '}
                {c.text}
              </p>
            ))}
            <p className="pt-1 text-[11px] text-ink-faint">
              El sistema te exige. No te juzga ni te condena: te pide la verdad y el regreso. Cambia el nivel en Ajustes.
            </p>
            {settings.musar?.density !== 'pie' &&
              (() => {
                const m = pickMusar(
                  { ...baseMusarContext(settings, day), preferred: ['exigencia', 'teshuva'] },
                  'accountability',
                );
                return (
                  <p className="border-t border-line pt-2 text-[12px] leading-snug text-ink-soft">
                    {m.he ? <span className="hebrew">{m.he}</span> : null}
                    {m.he ? ' — ' : ''}
                    <span className="italic">{m.es}</span>
                    {m.sourceEs ? <span className="text-ink-faint"> · {m.sourceEs}</span> : null}
                  </p>
                );
              })()}
          </Card>
        </div>
      )}

      {/* Anillos por área */}
      <div>
        <SectionTitle
          es="Áreas de hoy"
          he="תחומים"
          extra={
            <button onClick={() => navigate('/areas')} className="text-[12px] text-gold">
              ¿qué es cada una? →
            </button>
          }
        />
        <Card className="grid grid-cols-5 gap-y-4 p-4">
          {DASHBOARD_AREAS.map((a) => (
            <Ring
              key={a}
              value={Math.min(1, (areaCounts[a] ?? 0) / cap)}
              size={52}
              stroke={5}
              emoji={catEmoji(a)}
              label={catLabel(a)}
              sublabel={areaCounts[a] ? `${areaCounts[a]}` : ''}
              onClick={() => setQrArea(a)}
            />
          ))}
        </Card>
        <p className="mt-1 px-1 text-[11px] text-ink-faint">
          Anillo lleno = {cap} registros del área hoy. Es actividad registrada, no un juicio.
        </p>
      </div>

      {/* Actividad — día / semana / mes / año, en rojo/verde por tendencia */}
      <div>
        <SectionTitle es="Actividad" he="מְגַמָּה" />
        <Card className="p-4">
          <ActivityChart anchorKey={day.dayId} />
        </Card>
      </div>

      {!day.isShabbat && <MitzvotToday />}

      {/* Metas activas */}
      {activeGoals.length > 0 && (
        <div>
          <SectionTitle
            es="Metas activas"
            he="מטרות"
            extra={
              <button onClick={() => navigate('/mision')} className="text-[12px] text-gold">
                ver todas →
              </button>
            }
          />
          <Card className="space-y-2 p-4">
            {activeGoals.map((g) => (
              <button key={g.id} onClick={() => navigate('/mision')} className="block w-full text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink">
                    <span className="text-ink-faint">{g.level === 'day' ? 'Hoy' : g.level === 'week' ? 'Semana' : 'Mes'} · </span>
                    {g.title || '(sin título)'}
                  </span>
                  <span className="text-[11px] text-ink-faint">{g.progress}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${g.progress}%` }} />
                </div>
              </button>
            ))}
          </Card>
        </div>
      )}

      {/* Timeline de hoy */}
      <div>
        <SectionTitle
          es="Registros de hoy"
          he="מה קרה היום"
          extra={
            todayEntries.length > 0 ? (
              <button onClick={() => navigate('/dia/' + day.dayId)} className="text-[12px] text-gold">
                ver día →
              </button>
            ) : undefined
          }
        />
        {todayEntries.length === 0 ? (
          <Card className="p-6 text-center text-[13px] text-ink-faint">
            <span className="hebrew mb-1 block text-lg text-gold">עדיין לא נרשם דבר</span>
            Toca <span className="font-semibold text-ink-soft">+ Registrar</span> para contarle al sistema.
          </Card>
        ) : (
          <EntryList entries={todayEntries.slice().reverse()} />
        )}
      </div>

      {/* Patrones observados */}
      {patterns.length > 0 && (
        <div>
          <SectionTitle es="Patrones observados (últimos 30 días)" he="דפוסים" />
          <Card className="space-y-2 p-4">
            {patterns.map((p, i) => (
              <p key={i} className="text-[13px] text-ink-soft">
                • {p.observation}
              </p>
            ))}
            <p className="pt-1 text-[11px] text-ink-faint">
              Son correlaciones observadas en tus registros. No son un diagnóstico ni un “Tikún”.
            </p>
          </Card>
        </div>
      )}

      <QuickRegister
        open={qrArea !== null}
        initialArea={qrArea ?? undefined}
        onClose={() => setQrArea(null)}
      />
    </div>
  );
}

export { catHe };
