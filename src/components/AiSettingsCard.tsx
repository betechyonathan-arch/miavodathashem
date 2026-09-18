import { useState } from 'react';
import type { Settings } from '../lib/db/schema';
import { AI_MODELS, getAiKey, setAiKey } from '../lib/ai/config';
import { aiPing } from '../lib/ai/tasks';
import { Btn, Card, Field, SectionTitle, inputCls } from './ui';

export default function AiSettingsCard({
  settings,
  set,
}: {
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
}) {
  const [key, setKey] = useState(getAiKey());
  const [ping, setPing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="space-y-3 p-4">
      <SectionTitle es="Módulo de IA (opcional)" he="בינה מלאכותית" />

      <label className="flex items-center gap-2 text-[13px] text-ink-soft">
        <input type="checkbox" checked={settings.aiEnabled} onChange={(e) => set({ aiEnabled: e.target.checked })} />
        Activar el módulo de IA
      </label>
      <p className="text-[11px] text-ink-faint">
        Toda la app funciona sin IA (reglas y estadística). La IA es un extra invisible: sugiere la clasificación de un
        registro, redacta el resumen del día y observa tendencias. <b>Nunca</b> es un chatbot, <b>nunca</b> modifica tu
        texto, <b>nunca</b> da psak ni juzga. Correlación, no causalidad.
      </p>

      {settings.aiEnabled && (
        <>
          <Field
            label="Clave de la API de Anthropic"
            hint="Se guarda SOLO en este dispositivo (no entra en la exportación ni en la nube). La petición sale directa desde tu navegador a api.anthropic.com."
          >
            <input
              type="password"
              className={inputCls}
              value={key}
              placeholder="sk-ant-..."
              onChange={(e) => setKey(e.target.value)}
              onBlur={() => setAiKey(key)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="ghost"
              onClick={() => {
                setAiKey(key);
                setPing('Guardada.');
              }}
            >
              Guardar clave
            </Btn>
            {key && (
              <Btn
                variant="quiet"
                onClick={() => {
                  setAiKey('');
                  setKey('');
                  setPing('Clave borrada.');
                }}
              >
                Borrar clave
              </Btn>
            )}
          </div>

          <Field label="Modelo">
            <select className={inputCls} value={settings.aiModel} onChange={(e) => set({ aiModel: e.target.value })}>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.note}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={settings.aiAutoClassify}
              onChange={(e) => set({ aiAutoClassify: e.target.checked })}
            />
            Sugerir clasificación con IA al registrar
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={settings.aiAutoSummary}
              onChange={(e) => set({ aiAutoSummary: e.target.checked })}
            />
            Redactar el resumen del día con IA
          </label>

          <Btn
            variant="ghost"
            disabled={busy || !key}
            onClick={async () => {
              setBusy(true);
              setPing(null);
              setAiKey(key);
              const r = await aiPing(settings.aiModel);
              setBusy(false);
              setPing(r.ok ? '✓ Conexión correcta.' : `✗ ${r.detail}`);
            }}
          >
            {busy ? 'Probando…' : 'Probar conexión'}
          </Btn>
          {ping && <p className="text-[12px] text-ink-soft">{ping}</p>}

          <p className="text-[11px] text-ink-faint">
            Tú pagas el uso de tu propia clave. Con Haiku 4.5 cada registro clasificado cuesta una fracción de céntimo.
          </p>
        </>
      )}
    </Card>
  );
}
