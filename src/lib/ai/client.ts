/*
  Cliente Claude (Anthropic). Carga perezosa del SDK oficial para que no pese en el
  bundle si la IA está apagada. Devuelve solo texto; los errores se capturan y la
  app cae siempre a las reglas.

  La clave viaja en el navegador (dangerouslyAllowBrowser) — es aceptable en una app
  personal donde el usuario pone SU propia clave y se queda en SU dispositivo.
*/
import { getAiKey } from './config';

export class AiError extends Error {}

interface CallArgs {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}

export async function claudeText({ model, system, user, maxTokens = 1024 }: CallArgs): Promise<string> {
  const apiKey = getAiKey();
  if (!apiKey) throw new AiError('Falta la clave de la API');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    if (!text) throw new AiError('Respuesta vacía');
    return text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    const msg = (e as { message?: string; status?: number }).message ?? 'Error de IA';
    throw new AiError(msg);
  }
}

/** Extrae el primer bloque JSON de una respuesta (por si el modelo añade texto). */
export function parseJsonLoose<T>(raw: string): T | null {
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}
