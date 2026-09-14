import createDOMPurify from 'dompurify';
import {optimize} from 'svgo/browser';
import {palettes, fontFamily} from './theme.mjs';

const purifier = createDOMPurify(window);

// Mermaid eventmodeling always emits div/span/b/br/code labels, even with
// htmlLabels:false. Obsidian strips their HTML children; keep this one renderer's
// text as SVG, retaining each line and its bold/monospace runs.
function eventLabels(svg, palette) {
  for (const box of svg.querySelectorAll('.em-box foreignObject')) {
    const rows=[[]];
    const collect=(node,bold=false,mono=false)=>{
      if(node.nodeType===3){rows.at(-1).push({text:node.textContent,bold,mono});return;}
      if(node.nodeType!==1)return;
      if(node.localName==='br'){rows.push([]);return;}
      if(!['div','span','b','code'].includes(node.localName)) throw new Error('This event label uses unsupported HTML.');
      for(const child of node.childNodes)collect(child,bold||node.localName==='b',mono||node.localName==='code');
    };
    for(const child of box.childNodes)collect(child);
    const [x,y,width,height]=['x','y','width','height'].map(name=>Number(box.getAttribute(name)));
    const size=parseFloat(svg.getAttribute('font-size'))||15, step=size*1.5;
    if(![x,y,width,height].every(Number.isFinite)||width<=0||height<rows.length*step)throw new Error('This event label needs more room. Review its source.');
    const make=(tag,attrs)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
    const group=make('g',{'data-event-label':'','data-x':x,'data-y':y,'data-width':width,'data-height':height});
    if(box.hasAttribute('transform'))group.setAttribute('transform',box.getAttribute('transform'));
    rows.forEach((row,i)=>{
      const left=row.length&&row.every(run=>run.mono);
      const text=make('text',{x:left?x:x+width/2,y:y+height/2+(i-(rows.length-1)/2)*step,
        'text-anchor':left?'start':'middle','dominant-baseline':'middle','font-size':size,fill:palette.ink,'xml:space':'preserve'});
      for(const run of row){const span=make('tspan',{'font-weight':run.bold?700:400,...(run.mono?{'font-family':'ui-monospace, monospace'}:{})});span.textContent=run.text;text.append(span);}
      group.append(text);
    });
    box.replaceWith(group);
  }
}

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
  eventLabels(ready, palette);
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
  const attributes = ['fill','stroke','stroke-width','stroke-dasharray','fill-opacity','stroke-opacity','opacity','font-family','font-size','font-weight','text-anchor','dominant-baseline','marker-start','marker-end','vector-effect'];
  for (const [index,node] of beforeNodes.entries()) for (const name of attributes) {
    if (node.hasAttribute(name) && node.getAttribute(name) !== afterNodes[index].getAttribute(name)) {
      throw new Error(`The host removed a required diagram attribute: ${name}.`);
    }
  }
  const labels = element => [...element.querySelectorAll('text,foreignObject')].map(node => node.textContent).join('').replace(/\s+/g, '');
  const original = new DOMParser().parseFromString(source, 'text/html').querySelector('svg');
  if (labels(after) !== labels(original)) throw new Error('Some labels could not be displayed safely.');
  // Only owned presentation is applied after the host boundary.
  after.style.cssText = `display:block;max-width:none;filter:none;color:${palette.ink};font-family:${fontFamily}`;
  return result;
}
