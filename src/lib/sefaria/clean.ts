/*
  Limpia el HTML que devuelve Sefaria antes de mostrarlo. Sus textos traen notas al
  pie, enlaces y estilos; aquí se conserva solo negrita, cursiva y saltos de línea, y se
  descarta todo lo demás. Se reconstruye desde el DOM con una lista blanca, así que
  nada ejecutable del texto original llega a la pantalla.
*/

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'BIG', 'SMALL']);

function walk(node: Node, out: string[]): void {
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out.push(escapeHtml(n.textContent ?? ''));
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    const tag = el.tagName;
    // Notas al pie y sus marcadores: fuera.
    if (tag === 'SUP' || (tag === 'I' && el.classList.contains('footnote'))) return;
    if (KEEP.has(tag)) {
      const t = tag.toLowerCase();
      if (t === 'br') {
        out.push('<br>');
        return;
      }
      out.push(`<${t}>`);
      walk(el, out);
      out.push(`</${t}>`);
      return;
    }
    walk(el, out); // etiqueta no permitida: se descarta la etiqueta, se conserva su texto
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: string[] = [];
  walk(doc.body, out);
  return out.join('').trim();
}
