# README loops

Each product has a six-second, cursor-free loop in its own README. GIFs autoplay and repeat without a player. Light and dark variants match the published Wiki code-block backgrounds (`#ffffff` and `#0d1117`). The MP4 files are editing masters, not the primary README presentation.

[The composition](intro.html) uses the production code imported by [the four media fixtures](runtime/):

- Calendar selects real date cells and renders their agendas.
- Graph reads sample Markdown links, previews neighbours, opens the next note and returns to an outline. Physics samples are condensed in time.
- Code Blocks edits its CodeMirror editor and runs the real JavaScript Web Worker. Output is captured only after the worker returns the expected result.
- Diagrams uses its own [composition](diagrams.html) to show rapid label and connection edits followed by the shared renderer's result. The fixture mirrors the browser preview's 300ms debounce and condenses typing time; it does not claim native Obsidian timing or animate nodes between layouts.

Calendar and Graph replace only the Obsidian host boundary. These are production-view fixtures with public sample data, not recordings of Obsidian. No note writes, remote execution or Google authentication are demonstrated. The original native captures remain linked in each product README.

Keep all four repositories beside one another, install their dependencies, then run:

```sh
npm run media:prepare
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 check .local/loops/diagrams --snapshots
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 render .local/loops/diagrams --fps 60 --quality delivery --workers 2 --output .local/diagrams.mp4
```

Repeat for `calendar`, `graph`, `code-blocks`, `diagrams` and their `-dark` variants. The Woon `demo-video` skill adds GIF encoding, output inspection and SHA-256 receipts. Each composition returns to its exact opening state at 5.6 seconds; the GIF loop count is zero (infinite). Production screen-reader labels and closed diagnostic details have no visible pixels and are omitted from replayed frames. Font size, host icons and framing are presentation choices.

To rebuild one product's light and dark compositions, pass the sibling workspace and product slug: `npm run media:prepare -- .. diagrams`. This leaves the other products' generated compositions unchanged.

For Diagrams, capture lossless PNG frames and encode the GIF directly from those RGB frames. The previous MP4 path converted to limited-range YUV; deriving the GIF from that lossy video added palette and dithering changes. The shared renderer's colors are unchanged. The MP4 is now a lossless RGB editing master, with playback compatibility checked separately from color accuracy. The README uses the GIF.

```sh
npm run media:prepare -- .. diagrams
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 check .local/loops/diagrams --snapshots
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 render .local/loops/diagrams --fps 60 --format png-sequence --workers 2 --output .local/loops/diagrams-frames
python3 tools/encode-diagrams-media.py .local/loops/diagrams-frames --composition .local/loops/diagrams --theme light --output .local/loops/final/manta-diagrams-intro-rgb
```

Repeat with `diagrams-dark`, a different frame/output path and `--theme dark`. The encoder rejects changed flat-background pixels, incorrect duration/frame counts and a changed loop boundary. It uses FFmpeg's [RGB x264 encoder](https://ffmpeg.org/ffmpeg-codecs.html#libx264_002c-libx264rgb) and [full-histogram GIF palette](https://ffmpeg.org/ffmpeg-filters.html#palettegen). PNG sequences are production intermediates; retain verified receipts and final files before removing them. A CLI render check does not establish browser playback or native-app verification.

This directory contains video sources, not a public website. Generated `.local/` compositions are not deployed. GSAP retains its own [license](assets/gsap-license.txt); HyperFrames is a build tool and is not bundled with the plugin.
