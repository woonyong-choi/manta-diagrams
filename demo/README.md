# README loops

Each product has a six-second, cursor-free loop in its own README. GIFs autoplay and repeat without a player. Light and dark variants match the published Wiki code-block backgrounds (`#ffffff` and `#0d1117`). The MP4 files are editing masters, not the primary README presentation.

[The composition](intro.html) uses the production code imported by [the four media fixtures](runtime/):

- Calendar selects real date cells and renders their agendas.
- Graph reads sample Markdown links, previews neighbours, opens the next note and returns to an outline. Physics samples are condensed in time.
- Code Blocks edits its CodeMirror editor and runs the real JavaScript Web Worker. Output is captured only after the worker returns the expected result.
- Diagrams renders the same source as a flowchart and a loop, verifying every node and connection.

Calendar and Graph replace only the Obsidian host boundary. These are production-view fixtures with public sample data, not recordings of Obsidian. No note writes, remote execution or Google authentication are demonstrated. The original native captures remain linked in each product README.

Keep all four repositories beside one another, install their dependencies, then run:

```sh
npm run media:prepare
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 check .local/loops/diagrams --snapshots
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 render .local/loops/diagrams --fps 60 --quality delivery --workers 2 --output .local/diagrams.mp4
```

Repeat for `calendar`, `graph`, `code-blocks`, `diagrams` and their `-dark` variants. The Woon `demo-video` skill adds GIF encoding, output inspection and SHA-256 receipts. Each composition returns to its exact opening state at 5.6 seconds; the GIF loop count is zero (infinite). Production screen-reader labels and closed diagnostic details have no visible pixels and are omitted from replayed frames. Font size, host icons and framing are presentation choices.

To rebuild one product's light and dark compositions, pass the sibling workspace and product slug: `npm run media:prepare -- .. diagrams`. This leaves the other products' generated compositions unchanged.

This directory contains video sources, not a public website. Generated `.local/` compositions are not deployed. GSAP retains its own [license](assets/gsap-license.txt); HyperFrames is a build tool and is not bundled with the plugin.
