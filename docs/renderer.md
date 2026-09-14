# Renderer development

`src/document.mjs` is the shared entry point for ordinary `mermaid` note blocks, the full viewer, development preview and demo. Supported inputs use Manta without rewriting the source. Authored styles, links and directives stay on the bundled Mermaid path; unsupported Manta layouts try Mermaid and display a fallback notice. Invalid inputs retain their source and show an error.

`src/renderer.mjs` returns SVG, a normalized model, dimensions and counts. `verify(result)` compares labels, relationships and values against that model. `src/types.mjs` defines 31 layout families; `src/cases.mjs` holds basic, complex and error inputs. This is a tested input set, not complete Mermaid grammar coverage. Keep source direction, fields, relationship markers, values and units intact. ER uses a horizontal layout when the source does not specify a direction.

The renderer uses the shared role palette and font from `src/theme.mjs`. `src/sanitize.mjs` resolves SVG presentation, preserves label text and applies the final host sanitizer. Obsidian supplies `sanitizeHTMLToDom`; required attributes or labels lost at this boundary produce an error. Event-model labels retain bold and code runs as SVG text, measured with their displayed fonts. Browser, viewer and demo use this same normalization path.

`src/viewer.mjs` owns the disposable Obsidian reader. Ordinary note blocks expose Open diagram and, where an alternate Manta view exists, Original view. The full viewer also provides reading size, explicit Fit, zoom and SVG export. `diagramViewport` defaults to one CSS pixel per diagram unit; readers pan large diagrams or choose Fit themselves.

`npm run build:preview` builds the development comparison harness with bundled dependencies and checks both themes. The public demo and introduction fixtures also bundle the shared renderer; they are not native Obsidian recordings. Private corpus inputs and local screenshots under `.local/` stay outside Git and default tests. Real host screenshots and source hashes supplement automated checks before release.
