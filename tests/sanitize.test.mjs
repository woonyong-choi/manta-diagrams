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
