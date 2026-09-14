# Product introductions

The four introductions share [one HTML composition](intro.html) and [reviewed product copy and capture hashes](products.json). HyperFrames 0.8.38 renders a 1600 × 900, 60fps MP4. FFmpeg derives a 1200 × 675, 25fps GIF with uniform frame timing.

Calendar, Graph and Code Blocks use actual public sample captures from the recorded versions. The camera and transitions are presentation edits, not measured application animation. Diagrams uses output from the same renderer as the plugin. No UI actions or successful saves are fabricated.

Keep the four repositories beside one another, install this repository’s dependencies, then run:

```sh
npm run media:prepare
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 check .local/intros/diagrams --snapshots
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.38 render .local/intros/diagrams --fps 60 --quality delivery --workers 2 --output .local/diagrams.mp4
```

The Woon `demo-video` skill adds output checks and a hash receipt. Source clips and input hashes remain under `.local/intros/`; finished assets and portable receipts live in each product’s `docs/assets/` directory. Inspect the start, transition, middle and end of each render, then watch the actual MP4. Generated files in `.local/` are not published.

GSAP’s distribution retains its own [license and copyright](assets/gsap-license.txt); it is used only to author the introductions. HyperFrames is an external build tool, not bundled into the Obsidian plugin.
