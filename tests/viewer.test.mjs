import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>', {pretendToBeVisual:true});
for (const key of ['window','document','DOMParser','Element','Node','HTMLElement','SVGElement','AbortController']) globalThis[key] = dom.window[key];
let observing = 0;
globalThis.ResizeObserver = class {observe(){observing++;} disconnect(){observing--;}};
Object.defineProperties(dom.window.HTMLElement.prototype, {clientWidth:{get(){return 960;}},clientHeight:{get(){return 520;}}});
const {mountViewer} = await import('../src/viewer.mjs');
const svgIn = root => root.querySelector('.manta-reader-stage').shadowRoot.querySelector('svg');
const source = '%% layout: loop\nflowchart LR\n A[Read] --> B[Try] --> C[Review] --> A';
const sanitize = svg => document.createRange().createContextualFragment(svg);
async function ready(root, expected='ready') {
  for(let i=0;i<100 && root.dataset.renderStatus!==expected;i++) await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(root.dataset.renderStatus,expected,root.textContent);
}
test('viewer keeps the source, zooms and releases owned UI on disposal', async () => {
  const root = document.createElement('div'); document.body.append(root);
  const dispose = mountViewer(root, source, {sanitize}); await ready(root);
  assert.equal(root.querySelector('code').textContent, source);
  const svg=svgIn(root), before=svg.getAttribute('viewBox').split(' ').map(Number);
  [...root.querySelectorAll('button')].find(button=>button.textContent==='Zoom in').click();
  assert(Number(svg.getAttribute('viewBox').split(' ')[2]) < before[2]);
  dispose(); assert.equal(root.childElementCount,0); assert.equal(observing,0); root.remove();
});
test('host sanitization cannot silently remove diagram labels', async () => {
  const root = document.createElement('div'); document.body.append(root);
  const dispose = mountViewer(root,source,{sanitize:svg=>{const fragment=sanitize(svg);fragment.querySelector('text').remove();return fragment;}});
  await ready(root,'error'); assert.equal(svgIn(root),null);
  assert.equal(root.querySelector('code').textContent,source); assert(root.querySelector('details').open);
  dispose(); root.remove();
});
test('closing while rendering cannot reinsert a stale diagram', async () => {
  const root = document.createElement('div'); document.body.append(root);
  const dispose = mountViewer(root,source,{sanitize}); dispose();
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(root.childElementCount,0); assert.equal(observing,0); root.remove();
});
test('ordinary note embeds use Manta, open the same source and follow the host theme', async () => {
  const root = document.createElement('div'); document.body.append(root);
  const source = 'erDiagram\nNOTE ||--o{ FILE : contains';
  let opened = false;
  const dispose = mountViewer(root,source,{sanitize,inline:true,open:()=>{opened=true;}});
  await ready(root);
  assert(svgIn(root).querySelector('[data-node]'));
  assert.equal(root.querySelector('code').textContent,source);
  assert(root.querySelector('details').hidden);
  [...root.querySelectorAll('button')].find(button=>button.textContent==='Open diagram').click();
  assert(opened);
  document.body.classList.add('theme-dark');
  await new Promise(resolve=>setTimeout(resolve,10));
  await ready(root);
  assert.equal(root.dataset.theme,'dark');
  dispose(); root.remove(); document.body.classList.remove('theme-dark');
  assert.equal(observing,0);
});
