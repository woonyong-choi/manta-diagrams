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

test('ordinary diagrams use the same Manta renderer as explicit layouts', async () => {
  for (const source of [
    'flowchart LR\nA[원문] -->|보존| B[문서]',
    'classDiagram\nclass Animal {\n +String name\n}\nclass Habitat\nAnimal --> Habitat : lives',
    'erDiagram\nACCOUNT ||--o{ ENTRY : "1. 기록"\nENTRY }o..|| SOURCE : "2. 원문"\nACCOUNT {\n string id PK "식별자"\n}\nENTRY {\n string account_id FK "소유 계정"\n}',
  ]) {
    const result = await renderDocument(source, {id: 'ordinary-diagram'});
    assert.equal(result.engine, 'Manta');
    assert(result.svg.includes('data-node='));
    if (result.type === 'er') {
      assert.equal(result.model.direction, 'LR');
      assert.deepEqual(result.model.edges.map(edge => [edge.label, edge.startMark, edge.endMark, edge.dashed]),
        [['1. 기록', 'only_one', 'zero_or_more', false], ['2. 원문', 'zero_or_more', 'only_one', true]]);
      assert.deepEqual(result.model.nodes.flatMap(node => node.fields || []).map(field => [field.type,field.name,field.keys,field.comment]),
        [['string','id',['PK'],'식별자'],['string','account_id',['FK'],'소유 계정']]);
      const vertical = await renderDocument(source.replace('erDiagram', 'erDiagram\ndirection TB'), {id:'explicit-direction'});
      assert.equal(vertical.model.direction, 'TB');
    }
  }
});

test('authored styles and links remain with standard Mermaid and keep the exact source', async () => {
  const rendered = [];
  const stub = mock.method(mermaid, 'render', async (id, source) => {
    rendered.push(source);
    return {svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>'};
  });
  try {
    for (const source of [
      'classDiagram\nclass Animal\ncssClass "Animal" custom',
      'flowchart LR\nA-->B\nclass A custom',
      'classDiagram\nclass Animal\nstyle Animal fill:#abc',
      'flowchart LR\nA-->B\nclick A "https://example.com"',
      'flowchart LR\nA@{shape:cloud, label:"원문 보존"}',
    ]) {
      const result = await renderDocument(source, {id: 'authored-class', dark: true});
      assert.equal(result.engine, 'Mermaid');
      assert.equal(mermaid.mermaidAPI.getConfig().theme, 'dark');
      assert.equal(mermaid.mermaidAPI.getConfig().securityLevel, 'strict');
      assert.equal(rendered.at(-1), source);
    }
    const source = 'pie\n "원문" : 2';
    const result = await renderDocument(source, {id:'unsupported-layout'});
    assert.equal(result.engine, 'Mermaid');
    assert.equal(rendered.at(-1), source);
    assert(result.notice.includes('standard Mermaid'));
  } finally {stub.mock.restore();}
});
