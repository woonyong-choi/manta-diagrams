# Four tools for working with technical notes

Manta Diagrams, Graph, Code Blocks and Calendar should each be useful on their own. Together, they should help a reader explain an idea, follow its evidence, try an example and find the work again. Manta itself is in private development and is not released.

## What to improve first

| Tool | First priority | Usability and design | Planned AI tool |
| --- | --- | --- | --- |
| Diagrams | Preserve Mermaid meaning, authored styles, links and source; make failed layouts explicit. | Readable Korean and long identifiers, consistent surfaces, fit versus reading scale, faithful SVG export. | Validate a selected source and return a preview plus findings before proposing a note edit. |
| Graph | Follow real links, preserve exclusions, and handle moved, missing or renamed notes. | Stable focus and history, readable dense neighborhoods, fast transition between Graph and Outline. | Return existing links and their source locations, with a bounded result size; never invent an edge. |
| Code Blocks | Keep execution explicit, identify the execution environment, and avoid a duplicate run after an uncertain result. | Keep input and output together, explain errors beside the relevant code, retain readable overflow and keyboard focus. | Inspect a fence and its environment first; request execution separately, report actual status and preserve the original example. |
| Calendar | Preserve dates, time zones, all-day meaning, source permissions and conflict recovery. | A useful empty state, direct note links, simple date mapping, clear sync status and accessible day navigation. | Parse existing dates and show proposed changes; require the same revision and sync checks used by the UI. |

These AI interfaces are planned. They are not currently bundled as a four-tool MCP server. The UI and tools should share each feature’s processing and validation code; a skill supplies the instructions and review process.

## A shared design

Use the host’s font and neutral surfaces, one accent for the current action, consistent spacing and visible keyboard focus. Status words should mean the same thing across the four tools: ready, running, completed, cancelled, failed and result unknown.

Keep ordinary Markdown as the durable content. A missing plugin must leave a readable note. Optional integration should pass an existing note path and selection, with a clear return route. Avoid automatic installs, invented dates or links, and background code execution.

The new introduction pages and videos use one visual system. The plugin interfaces will adopt it incrementally after each feature passes its existing checks.

## A release bar that can be checked

- Keep the input note unchanged during read-only work. Verify hashes before and after failures, cancellation and plugin unload.
- Test first installation, upgrade with existing settings, disabling and re-enabling. Keep a rollback path for each released build.
- Exercise the supported Obsidian version and real light/dark screens, plus keyboard navigation and small viewports. A browser layout test does not establish mobile app support.
- Ship no known failure that can lose source content, submit code unexpectedly, invent a relationship or silently show a stale result. Other known limits belong in the guide and release notes.
- Reproduce each reported defect with a focused regression input. Build and release the same commit that passed CI and the relevant runtime checks.

No finite test suite can establish that software will never fail. This bar limits exposure and makes failures visible and recoverable.

## Compare the work, then measure preference

The comparison set is standard Mermaid, [Slick Mermaid](https://github.com/pasevin/obsidian-slick-mermaid) and [Beautiful Mermaid Renderer](https://github.com/qiaoborui/obsidian-beautiful-mermaid) for diagrams; Obsidian’s [Graph view](https://help.obsidian.md/plugins/graph) and normal link navigation for Graph; [Code Emitter](https://github.com/mokeyish/obsidian-code-emitter) for runnable examples; and [Calendar](https://github.com/liamcain/obsidian-calendar-plugin) for dated-note navigation. Official project descriptions were checked on September 14, 2026. This is a proposed comparison, not a completed head-to-head benchmark. Excalidraw’s freeform whiteboard is outside this positioning.

Start with the same public notes: long Korean labels, an ER model, a broken link, a code error, a dated experiment and a time-zone boundary. Measure successful first use, time to find or explain the result, correction count, recovery and whether the participant chooses to use it again.

Initial study targets are at least 9 of 10 new users completing the main task without developer help, no source loss in the tested cases, and fewer manual corrections than the baseline. Record the actual results and missed cases; these targets have not been achieved or measured yet. Follow up after two weeks to see what people kept using.

Only make a “best” or ranking claim when its category, comparison set, date and evidence are clear. Better screenshots, more features, stars and automated directory scores do not establish that claim.
