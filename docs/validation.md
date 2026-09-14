# Release verification

Status: local release candidate for 0.1.0. Community approval is separate.

- Automated renderer checks: 31 basic inputs, 31 complex inputs, 31 error inputs and 10 legacy aliases pass.
- Reader checks cover exact fenced-source selection, labels lost during sanitization, source visibility, zoom and disposal during an unfinished render.
- Ordinary ER, flowchart and class inputs use the shared Manta renderer. Regression checks cover ER relation labels, both endpoint cardinalities, dashed relationships, field types, keys, comments and explicit direction; authored styling, links and unsupported layouts keep the exact source on the standard Mermaid route.
- Inline reader checks cover opening the full viewer, source preservation and following the host's light/dark mode.
- The shared browser viewer was exercised with flowchart, ER, sequence, loop, Korean labels, authored style and link, pie, mindmap, Git graph and invalid input. Direct inspection found and fixed missing HTML labels and SVG parsing with links.
- The isolated native vault and browser were compared in both themes for selected ER, Korean flow/class, event fields and mindmap inputs. Mindmap checks cover final edge paint and center-label alignment. The example's Font Awesome book icon is not drawn; preserving 15 nodes and 14 relations does not establish icon support. Other native types remain under review.
- Further native checks cover the basic one-column Kanban input in Manta/Original views, authored C4 colors in the inspected top region, and Architecture's four services, three connections and group border in both themes. The full viewer's icons retain their size under host button styles; an exported Architecture SVG preserves its font stack, labels and dark background when opened separately. These are bounded input checks, not completion of the native type matrix.
- Obsidian runtime installation, source preservation, enabled/disabled behavior and release artifact comparison must be recorded before publication.
- Mobile Obsidian is not verified or supported by this first desktop release.

These checks cover the stated inputs and environment; they do not guarantee every Mermaid diagram or third-party theme.
