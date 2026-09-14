import createDOMPurify from 'dompurify';
import {optimize} from 'svgo/browser';
import {palettes, fontFamily} from './theme.mjs';

const purifier = createDOMPurify(window);

/** Preserve SVG presentation while rejecting active content and external assets. */
export function sanitizeSvg(source, {dark = false, hostSanitize} = {}) {
  const palette = palettes[dark ? 'dark' : 'light'];
  source = source.replace(/var\(--md-([a-z0-9]+)\)/g, (value, role) => palette[role] || value);
  const fragment = purifier.sanitize(source, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: {html: true, svg: true, svgFilters: true, mathMl: true},
    ADD_TAGS: ['foreignObject'],
    HTML_INTEGRATION_POINTS: {foreignobject: true},
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
  const normalized = optimize(new window.XMLSerializer().serializeToString(svg), {plugins: [
    {name:'inlineStyles',params:{onlyMatchedOnce:false,removeMatchedSelectors:false}},
    {name:'convertStyleToAttrs',params:{keepImportant:false}},
  ]}).data;
  const ready = new DOMParser().parseFromString(normalized, 'text/html').querySelector('svg');
  ready.querySelectorAll('style').forEach(node => node.remove());
  ready.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
  ready.setAttribute('font-family', fontFamily);
  ready.querySelectorAll('[data-edge]').forEach(edge => edge.setAttribute('vector-effect', 'non-scaling-stroke'));
  const result = hostSanitize ? hostSanitize(ready.outerHTML) : document.createDocumentFragment();
  if (!hostSanitize) result.append(ready);
  const after = result.querySelector('svg');
  const elements = 'rect,path,text,tspan,circle,ellipse,line,polyline,polygon,marker';
  const beforeNodes = [...ready.querySelectorAll(elements)], afterNodes = [...after?.querySelectorAll(elements) || []];
  if (beforeNodes.length !== afterNodes.length) throw new Error('Some diagram elements could not be displayed safely.');
  const attributes = ['fill','stroke','stroke-width','stroke-dasharray','fill-opacity','stroke-opacity','opacity','font-family','font-size','font-weight','text-anchor','marker-start','marker-end','vector-effect'];
  for (const [index,node] of beforeNodes.entries()) for (const name of attributes) {
    if (node.hasAttribute(name) && node.getAttribute(name) !== afterNodes[index].getAttribute(name)) {
      throw new Error(`The host removed a required diagram attribute: ${name}.`);
    }
  }
  const labels = element => [...element.querySelectorAll('text,foreignObject')].map(node => node.textContent).join('').replace(/\s+/g, '');
  const original = new DOMParser().parseFromString(source, 'text/html').querySelector('svg');
  if (labels(after) !== labels(original)) throw new Error('Some labels could not be displayed safely.');
  // Only owned presentation is applied after the host boundary. The eventmodeling
  // renderer always uses this table/cell pair to center its HTML labels.
  after.style.cssText = `display:block;max-width:none;filter:none;color:${palette.ink};font-family:${fontFamily}`;
  for (const box of after.querySelectorAll('.em-box foreignObject')) {
    const table = box.firstElementChild, cell = table?.firstElementChild;
    if (table?.localName === 'div' && cell?.localName === 'span') {
      table.style.cssText = 'display:table;width:100%;height:100%';
      cell.style.cssText = 'display:table-cell;text-align:center;vertical-align:middle';
      cell.querySelectorAll('code').forEach(code => {code.style.cssText='display:block;text-align:left';});
    }
  }
  return result;
}
