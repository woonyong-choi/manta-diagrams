import createDOMPurify from 'dompurify';
import {optimize} from 'svgo/browser';
import {palettes} from './theme.mjs';

const purifier = createDOMPurify(window);

/** Preserve SVG presentation while rejecting active content and external assets. */
export function sanitizeSvg(source, {dark = false, hostSanitize} = {}) {
  const palette = palettes[dark ? 'dark' : 'light'];
  source = source.replace(/var\(--md-([a-z0-9]+)\)/g, (value, role) => palette[role] || value);
  const fragment = purifier.sanitize(source, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: {html: true, svg: true, svgFilters: true, mathMl: true},
    ADD_TAGS: ['foreignObject'],
    FORBID_TAGS: ['script','iframe','object','embed','link','base','meta','form','input','button','video','audio','source'],
    FORBID_ATTR: ['src','srcset'],
  });
  const svg = fragment.querySelector('svg');
  if (!svg) throw new Error('No safe SVG was produced.');
  for (const node of [svg, ...svg.querySelectorAll('*')]) {
    for (const name of ['href','xlink:href']) {
      const href = node.getAttribute(name);
      if (href && !/^#[\w:.-]+$/.test(href)
        && !(node.localName === 'a' && /^(https?:|mailto:|obsidian:)/i.test(href))) node.removeAttribute(name);
    }
    const css = (node.localName === 'style' ? node.textContent : node.getAttribute('style') || '')
      + ['fill','stroke','filter','clip-path','mask','cursor','marker-start','marker-mid','marker-end'].map(name => node.getAttribute(name) || '').join(';');
    if (/\\|@import\b|@font-face\b|image-set\s*\(/i.test(css)) throw new Error('This diagram uses unsupported external or escaped styles.');
    for (const match of css.matchAll(/url\s*\(([^)]*)\)/gi)) {
      if (!/^#[\w:.-]+$/.test(match[1].trim().replace(/^['"]|['"]$/g, ''))) throw new Error('External diagram assets are not loaded.');
    }
  }
  // Keep geometry/IDs intact. Inline CSS using its cascade, then express paint
  // as SVG attributes so Obsidian's HTML sanitizer need not retain styles.
  const normalized = optimize(svg.outerHTML, {plugins: [
    {name:'inlineStyles',params:{onlyMatchedOnce:false,removeMatchedSelectors:false}},
    {name:'convertStyleToAttrs',params:{keepImportant:false}},
  ]}).data;
  const ready = new DOMParser().parseFromString(normalized, 'text/html').querySelector('svg');
  ready.querySelectorAll('style').forEach(node => node.remove());
  ready.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
  const result = hostSanitize ? hostSanitize(ready.outerHTML) : document.createDocumentFragment();
  if (!hostSanitize) result.append(ready);
  const after = result.querySelector('svg');
  const elements = 'rect,path,text,tspan,circle,ellipse,line,polyline,polygon,marker';
  const beforeNodes = [...ready.querySelectorAll(elements)], afterNodes = [...after?.querySelectorAll(elements) || []];
  if (beforeNodes.length !== afterNodes.length) throw new Error('Some diagram elements could not be displayed safely.');
  const attributes = ['fill','stroke','stroke-width','stroke-dasharray','fill-opacity','stroke-opacity','opacity','font-family','font-size','font-weight','text-anchor','marker-start','marker-end'];
  for (const [index,node] of beforeNodes.entries()) for (const name of attributes) {
    if (node.hasAttribute(name) && node.getAttribute(name) !== afterNodes[index].getAttribute(name)) {
      throw new Error(`The host removed a required diagram attribute: ${name}.`);
    }
  }
  return result;
}
