# Renderer development

`src/document.mjs` selects the standard Mermaid renderer unless a source explicitly asks for a Manta layout. Authored styles, links and directives keep their standard renderer. `src/viewer.mjs` owns the disposable reader used by both the Obsidian plugin and public demo.

The lower-level `render(source, {id})` in `src/renderer.mjs` returns SVG, a normalized model, dimensions and counts. `verify(result)` compares the rendered labels, relationships and values with that model. `src/types.mjs` defines layout families; `src/cases.mjs` holds the public basic, complex and error inputs.

There are 31 special families, including architecture, sequence, ER, UML, matrices and charts. This is a tested input set, not complete coverage of Mermaid grammar. Use the standard adapter for ordinary Mermaid. Keep direction, relationship markers, values and units from the source; presentation must not invent or omit them.

The older development preview (`npm run build:preview`) includes family-wide comparison controls. It loads pinned dependencies from a CDN and is a development aid. The production plugin and public demo bundle their renderer. Private corpus inputs under `.local/` are excluded from Git and are never read by the default tests.
