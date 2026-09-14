import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {pretendToBeVisual:true});
for (const name of ['window','document','DOMParser','HTMLElement','SVGElement','Element','Node']) globalThis[name] = dom.window[name];
const {diagramAt} = await import('../src/document.mjs');

test('selects the exact complete fenced source around the cursor', () => {
  const note = '# Source\n\n```mermaid\nflowchart LR\n A[one] --> B[two]\n```\ntext\n~~~manta\npie\n "A" : 2\n~~~';
  assert.equal(diagramAt(note, 3), 'flowchart LR\n A[one] --> B[two]');
  assert.equal(diagramAt(note, 8), 'pie\n "A" : 2');
  assert.equal(diagramAt(note, 6), null);
  assert.equal(diagramAt('```mermaid\nA-->B', 1), null);
  assert.equal(diagramAt('````mermaid\n```\nA-->B\n````', 2), '```\nA-->B');
  assert.equal(diagramAt('````text\n```mermaid\nA-->B\n```\n````', 2), null);
});
