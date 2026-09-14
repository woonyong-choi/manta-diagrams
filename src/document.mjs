import mermaid from 'mermaid';
import {render, verify} from './renderer.mjs';

let queue = Promise.resolve();

/** Locate a complete Mermaid fence without changing its contents. */
export function diagramAt(text, line) {
  const lines = text.split('\n');
  let fence;
  for (let i = 0; i < lines.length; i++) {
    if (!fence) {
      const match = lines[i].match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (match) fence = {mark: match[1][0], length: match[1].length, start: i,
        diagram: /^(mermaid|manta)$/.test(match[2].trim())};
    } else if (new RegExp('^ {0,3}' + fence.mark + '{' + fence.length + ',}\\s*$').test(lines[i])) {
      if (fence.diagram && line >= fence.start && line <= i) return lines.slice(fence.start + 1, i).join('\n');
      fence = undefined;
    }
  }
  return null;
}

/** Ordinary Mermaid uses its own renderer; layout hints explicitly opt into Manta. */
export function renderDocument(source, {id, dark = false, original = false} = {}) {
  const next = queue.catch(() => {}).then(async () => {
    if (typeof source !== 'string' || source.length > 50000) throw new Error('Use a diagram of at most 50,000 characters. Split larger diagrams into sections.');
    if (!/^[a-zA-Z][\w-]*$/.test(id || '')) throw new Error('Invalid diagram identifier.');
    // Links, authored styling and directives must stay with Mermaid, not a partial model.
    const authoredFeatures = /^\s*(?:click\s|style\s|classDef\s|linkStyle\s|class\s|---\s*$|%%\{)|:::|@\{/m.test(source);
    let fallback;
    if (!original && !authoredFeatures && /^\s*%%\s*layout\s*:/m.test(source)) {
      try {
        const result = await render(source, {id});
        verify(result);
        return {...result, engine: 'Manta', notice: ''};
      } catch (error) {
        fallback = error instanceof Error ? error.message : String(error);
      }
    }
    mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
      theme: dark ? 'dark' : 'neutral', htmlLabels: false, maxTextSize: 50000, maxEdges: 500,
      fontFamily: 'system-ui, sans-serif',
      flowchart: {htmlLabels: false, useMaxWidth: false, nodeSpacing: 36, rankSpacing: 56},
    });
    const result = await mermaid.render(id, source);
    // Mermaid may include HTML entities or xlink attributes; parse like the host DOM.
    const doc = new DOMParser().parseFromString(result.svg, 'text/html');
    const box = doc.querySelector('svg')?.getAttribute('viewBox')?.split(/[ ,]+/).map(Number);
    if (!box || box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) throw new Error('Mermaid returned an unreadable diagram.');
    return {svg: result.svg, width: box[2], height: box[3], x: box[0], y: box[1], engine: 'Mermaid',
      notice: fallback ? 'This layout uses the standard Mermaid view. Your source is unchanged.' : ''};
  });
  queue = next;
  return next;
}
