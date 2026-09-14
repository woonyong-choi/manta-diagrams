import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {pretendToBeVisual:true});
for (const name of ['window','document','DOMParser','HTMLElement','SVGElement','Element','Node']) globalThis[name] = dom.window[name];
const {diagramAt, renderDocument} = await import('../src/document.mjs');
const {default: mermaid} = await import('mermaid');

test('selects the exact complete fenced source around the cursor', () => {
  const note = '# Source\n\n```mermaid\nflowchart LR\n A[one] --> B[two]\n```\ntext\n~~~manta\npie\n "A" : 2\n~~~';
  assert.equal(diagramAt(note, 3), 'flowchart LR\n A[one] --> B[two]');
  assert.equal(diagramAt(note, 8), 'pie\n "A" : 2');
  assert.equal(diagramAt(note, 6), null);
  assert.equal(diagramAt('```mermaid\nA-->B', 1), null);
  assert.equal(diagramAt('````mermaid\n```\nA-->B\n````', 2), '```\nA-->B');
  assert.equal(diagramAt('````text\n```mermaid\nA-->B\n```\n````', 2), null);
});

test('ordinary class declarations use the Manta palette while authored styles stay intact', async () => {
  const rendered = [];
  const stub = mock.method(mermaid, 'render', async (id, source) => {
    rendered.push(source);
    return {svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>'};
  });
  try {
    for (const dark of [false, true]) {
      const source = 'classDiagram\nclass Animal {\n +String name\n}\nclass Habitat\nAnimal --> Habitat : lives';
      await renderDocument(source, {id: 'plain-class-' + dark, dark});
      assert.equal(mermaid.mermaidAPI.getConfig().theme, 'base');
      assert.equal(mermaid.mermaidAPI.getConfig().themeVariables.primaryTextColor, dark ? '#e6edf3' : '#1f2328');
      assert.equal(rendered.at(-1), source);
    }
    for (const source of [
      'classDiagram\nclass Animal\ncssClass "Animal" custom',
      'flowchart LR\nA-->B\nclass A custom',
      'classDiagram\nclass Animal\nstyle Animal fill:#abc',
    ]) {
      await renderDocument(source, {id: 'authored-class', dark: true});
      assert.equal(mermaid.mermaidAPI.getConfig().theme, 'dark');
      assert.equal(rendered.at(-1), source);
    }
  } finally {stub.mock.restore();}
});
