import mermaid from 'mermaid';
import {render, verify} from './renderer.mjs';
import {mermaidTheme, palettes, fontFamily} from './theme.mjs';

let queue = Promise.resolve();

/** Use one CSS pixel per diagram unit until the reader explicitly chooses Fit. */
export function diagramViewport(result, width, height, fit = false) {
  const ratio = width / height;
  const w = fit ? Math.max(result.width + 48, (result.height + 48) * ratio) : width;
  return {x:(result.x || 0) + (!fit && result.width + 48 > w ? -24 : (result.width - w) / 2),
    y:(result.y || 0) + (!fit && result.height + 48 > w / ratio ? -24 : (result.height - w / ratio) / 2),
    width:w, height:w / ratio};
}

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

/** Share Manta's layout between the note body and viewer without rewriting source. */
export function renderDocument(source, {id, dark = false, original = false} = {}) {
  const next = queue.catch(() => {}).then(async () => {
    if (typeof source !== 'string' || source.length > 50000) throw new Error('Use a diagram of at most 50,000 characters. Split larger diagrams into sections.');
    if (!/^[a-zA-Z][\w-]*$/.test(id || '')) throw new Error('Invalid diagram identifier.');
    // Links, authored styling and directives must stay with Mermaid, not a partial model.
    const classDiagram = /^\s*classDiagram\b/m.test(source);
    const authoredFeatures = /^\s*(?:click\s|style\s|classDef\s|cssClass\s|linkStyle\s|---\s*$|%%\{)|:::|@\{/m.test(source)
      || (!classDiagram && /^\s*class\s/m.test(source));
    let fallback;
    if (!original && !authoredFeatures) {
      try {
        const result = await render(source, {id});
        verify(result);
        return {...result, engine: 'Manta', notice: ''};
      } catch (error) {
        fallback = error instanceof Error ? error.message : String(error);
      }
    }
    const palette = palettes[dark ? 'dark' : 'light'];
    mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
      theme: original || authoredFeatures ? (dark ? 'dark' : 'neutral') : 'base',
      ...(!original && !authoredFeatures ? {look: 'classic', themeVariables:mermaidTheme(dark),
        // Mermaid derives the same section color for mindmap fills and edges;
        // darkening an already dark surface turns both black. Keep their roles separate.
        themeCSS: /^\s*mindmap\b/m.test(source) ? `
          .mindmap-node rect,.mindmap-node path,.mindmap-node circle,.mindmap-node polygon {fill:${palette.surface}!important;stroke:${palette.border}!important;}
          .mindmap-node text {fill:${palette.ink}!important;}
          .edge {stroke:${palette.muted}!important;}
        ` : '',
      } : {}),
      htmlLabels: false, maxTextSize: 50000, maxEdges: 500,
      fontFamily,
      flowchart: {htmlLabels: false, useMaxWidth: false, nodeSpacing: 36, rankSpacing: 56},
      sequence: {useMaxWidth:false, actorMargin:42, width:130, diagramMarginX:24, diagramMarginY:24, mirrorActors:false},
      railroad: {terminalFill:palette.surface,terminalStroke:palette.border,terminalTextColor:palette.ink,
        nonTerminalFill:palette.paper,nonTerminalStroke:palette.border,nonTerminalTextColor:palette.ink,
        lineColor:palette.muted,markerFill:palette.muted,strokeWidth:1.25,fontSize:14},
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
