# Manta Diagrams roadmap

The aim is a diagram people can read and reuse with less repair. These are priorities, not shipped claims or a guarantee that every input will work.

1. **Compatibility first.** Keep native Mermaid available. Expand regression inputs for authored styles, links, long Korean labels, nested groups, exports and theme changes. Release only after source preservation and failure recovery pass in Obsidian.
2. **A consistent reading experience.** Share type sizes, spacing, focus states and neutral surfaces across Manta. Preserve relationship markers, directions, values and units. Compare the same documents with standard Mermaid, Slick Mermaid and Beautiful Mermaid Renderer.
3. **A useful first minute.** Offer a small example at the point of use, make the open command easy to find, and retain a readable scale when moving between a note and a large diagram.
4. **AI authoring through the same engine.** Plan a source-to-preview tool that returns validation findings and an SVG before any note change. A companion skill should choose a suitable diagram and inspect the rendered result. Model output must pass the same adapter as the Obsidian UI.
5. **Measured integration.** Carry the current note and selected range into Graph, Code Blocks and Calendar through public APIs. Each plugin remains optional. Mobile support follows real device tests.

Before calling an improvement successful, compare completion time, manual corrections, missing labels or relationships, recovery success and repeat use with the same inputs. Popularity and automated review grades are separate signals.

[The four-plugin plan](docs/product-direction.md) · [Current release checks](docs/validation.md)
