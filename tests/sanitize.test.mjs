import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
const {sanitizeSvg} = await import('../src/sanitize.mjs');

const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
<style>.railroad-line{fill:none;stroke:#59636e;stroke-width:2}.label{font-size:14px;text-anchor:middle}</style>
<defs><marker id="arrow" markerWidth="12" markerHeight="12"><path d="M0 0L8 4L0 8" fill="none" stroke="var(--md-muted)"/></marker></defs>
<rect width="100" height="50" fill="var(--md-surface)" stroke="var(--md-border)" opacity="0.8"/>
<path class="railroad-line" d="M0 60L100 60" stroke-dasharray="5 4" marker-end="url(#arrow)"/>
<text class="label" x="50" y="25" fill="var(--md-ink)" font-weight="500" onclick="alert(1)">원문 라벨</text>
<script>alert(1)</script><image href="https://example.com/unrequested.png"/>
<a href="javascript:alert(1)"><text>bad link</text></a></svg>`;

test('SVG sanitization preserves the presentation lost by HTML sanitization', () => {
  for (const dark of [false,true]) {
    const svg = sanitizeSvg(source,{dark}).querySelector('svg');
    assert.equal(svg.querySelector('style,[style]'),null);
    assert.equal(svg.style.filter,'none');
    assert.equal(svg.querySelector('.railroad-line').getAttribute('stroke-width'),'2');
    assert.equal(svg.querySelector('rect').getAttribute('fill'),dark?'#161b22':'#f6f8fa');
    assert.equal(svg.querySelector('rect').getAttribute('opacity'),'0.8');
    assert.equal(svg.querySelector('text').getAttribute('fill'),dark?'#e6edf3':'#1f2328');
    assert.equal(svg.querySelector('text').getAttribute('font-weight'),'500');
    assert.equal(svg.querySelector('text').textContent,'원문 라벨');
    assert.equal(svg.querySelector('.railroad-line').getAttribute('stroke-dasharray'),'5 4');
    assert.equal(svg.querySelector('.railroad-line').getAttribute('marker-end'),'url(#arrow)');
    assert(svg.querySelector('marker#arrow path'));
    assert.equal(svg.querySelector('script,[onclick],[href^="javascript:"],image[href]'),null);
  }
});

test('normalized presentation survives a host that removes all CSS styles', () => {
  const hostSanitize = value => {
    const fragment = document.createRange().createContextualFragment(value);
    fragment.querySelectorAll('style').forEach(node=>node.remove());
    fragment.querySelectorAll('[style]').forEach(node=>node.removeAttribute('style'));
    fragment.querySelectorAll('foreignObject').forEach(node=>node.replaceChildren());
    return fragment;
  };
  const svg = sanitizeSvg(source,{dark:true,hostSanitize}).querySelector('svg');
  assert.equal(svg.querySelector('.railroad-line').getAttribute('fill'),'none');
  assert.equal(svg.querySelector('.railroad-line').getAttribute('stroke'),'#59636e');
  assert.equal(svg.querySelector('.label').getAttribute('font-size'),'14px');
  assert.throws(()=>sanitizeSvg(source,{hostSanitize:value=>{
    const fragment=hostSanitize(value);fragment.querySelector('rect').removeAttribute('fill');return fragment;
  }}),/required diagram attribute: fill/);
});

test('external styles and SVG resource URLs cannot load through the diagram', () => {
  for (const body of [
    '<style>@import "https://example.com/style.css";</style>',
    '<rect style="fill:url(https://example.com/paint.svg)"/>',
    '<rect fill="url(https://example.com/paint.svg)"/>',
    '<style>.node{fill:u\\72l(https://example.com/paint.svg)}</style>',
  ]) assert.throws(()=>sanitizeSvg(`<svg>${body}</svg>`),/external|External/);
});

test('railroad middle baselines become numeric positions before HTML sanitization', () => {
  const svg=sanitizeSvg('<svg><text x="30" y="22" font-size="14px" dominant-baseline="middle">+</text></svg>').querySelector('svg');
  assert.equal(svg.querySelector('text').getAttribute('dominant-baseline'),null);
  assert.equal(svg.querySelector('text').getAttribute('x'),'30');
  assert.equal(svg.querySelector('text').getAttribute('y'),'25.5');
});

test('eventmodeling HTML labels retain bold, line breaks and centering across the host boundary', () => {
  const source = `<svg xmlns="http://www.w3.org/2000/svg"><g class="em-box"><foreignObject x="260" y="25" width="120" height="80"><div style="display:table;width:100%;height:100%"><span style="display:table-cell;text-align:center;vertical-align:middle"><b>장바구니</b><br/><code>item: UUID</code></span></div></foreignObject></g></svg>`;
  const hostSanitize = value => {
    const fragment=document.createRange().createContextualFragment(value);
    fragment.querySelectorAll('style').forEach(node=>node.remove());
    fragment.querySelectorAll('[style]').forEach(node=>node.removeAttribute('style'));
    return fragment;
  };
  for(const dark of [false,true]) {
    const svg=sanitizeSvg(source,{dark,hostSanitize}).querySelector('svg');
    const label=svg.querySelector('[data-event-label]'),rows=[...label.querySelectorAll('text')];
    assert.equal(svg.querySelector('foreignObject'),null);
    assert.equal(label.querySelector('tspan[font-weight="700"]').textContent,'장바구니');
    assert.equal(label.querySelector('tspan[font-family="ui-monospace, monospace"]').textContent,'item: UUID');
    assert.deepEqual(rows.map(row=>row.textContent),['장바구니','item: UUID']);
    assert(Number(rows[1].getAttribute('y'))>Number(rows[0].getAttribute('y')));
    assert.deepEqual(['x','y','width','height'].map(name=>label.getAttribute('data-'+name)),['260','25','120','80']);
    assert.equal(rows[0].getAttribute('text-anchor'),'middle');
    assert.equal(rows[1].getAttribute('text-anchor'),'start');
    assert.equal(svg.style.color,dark?'rgb(230, 237, 243)':'rgb(31, 35, 40)');
  }
  assert.throws(()=>sanitizeSvg(source,{hostSanitize:value=>{
    const fragment=hostSanitize(value);fragment.querySelector('tspan').textContent='';return fragment;
  }}),/labels/);
});
