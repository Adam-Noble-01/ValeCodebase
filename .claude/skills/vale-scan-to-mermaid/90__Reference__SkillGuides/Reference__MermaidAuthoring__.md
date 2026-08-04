# =============================================================================
# Reference__MermaidAuthoring__.md
# =============================================================================
# Description : Layout strategy and Vale semantic classes for generated diagrams
# Author      : Adam Noble
# Created     : 04-Aug-2026
# Version     : 1.0.0
# =============================================================================

## Layout is the decision that matters

A drawn sheet snakes across the paper because the paper ran out, not because the
process doubles back. Reproduce the **logic**, not the paper arrangement. But a
naive direction choice produces a diagram nobody can present.

Measured on the 16-node `Key Design Efficiency Flow` sheet, rendered at
Mermaid 11.16:

| Strategy | Rendered size | Aspect ratio | Verdict |
| --- | --- | --- | --- |
| `flowchart TD` flat | 794 x 2062 | 0.39 : 1 | Tall ribbon, endless scrolling |
| `flowchart LR` flat | 4783 x 313 | 15.31 : 1 | Thin strip, unreadable on a slide |
| **`TD` with phase subgraphs, each `direction LR`** | **2945 x 910** | **3.24 : 1** | **Presentable** |

**Rule of thumb.** Count the nodes on the main path:

- **Under about 8 nodes, or genuinely tree-shaped** — plain `flowchart TD` is fine.
- **Over about 8 nodes and largely linear** — group into phase subgraphs with
  `direction LR` inside a `flowchart TD`. This is the default for a business
  process sheet.
- **Never** reach for flat `LR` on a long process. It always degenerates into a
  strip.

Phases should be the ones the process actually has. Read the sheet for its own
groupings — a drawn row, a bracket, a heading — before inventing your own. Name
them `1 - Enquiry and First Contact`, not `Phase 1`.

```
flowchart TD

    subgraph P1["1 - Enquiry and First Contact"]
        direction LR
        N01["Initial Enquiry"]:::valeStart
        N02["Designer / Management"]:::valeProcess
        N01 -- "Allocate / action<br/>within 24hrs" --> N02
    end

    subgraph P2["2 - Visit and Design Readiness"]
        direction LR
        N07["Visit Completed"]:::valeProcess
    end

    %% Cross-phase links and shared exits live outside the subgraphs
    N06["File Close<br/>notify management"]:::valeStop
    N02 -- "No answer from contact" --> N06
```

## Killing noodles

The single worst thing you can do is leave a **shared terminal at top level**. If
two different phases both exit to one `File Close` node declared outside the
subgraphs, Dagre strands it in the margin and routes both exits to it as long
sweeping curves across dead space. That is what "chaotic noodles" looks like, and
it is entirely self-inflicted.

**Duplicate the terminal into each phase instead.** Give each phase its own local
copy of the close or abort state. Every edge then stays short and inside its own
box. Measured on the same sheet:

| Terminal handling | Rendered size | Ratio | Long cross-phase edges |
| --- | --- | --- | --- |
| One shared `File Close` at top level | 3124 x 1107 | 2.82 : 1 | 2 sweeping arcs across the full height |
| A `File Close` inside each phase | 2288 x 1081 | 2.12 : 1 | none |

Duplicating a terminal is ordinary flowchart practice and does not misrepresent
the sheet — but say so in the review flags, because the drawn original had one
box and the diagram now shows two.

The rest of the rule still holds: put every ordinary node **inside** the phase it
belongs to, and never leave a node at top level just because it was drawn in the
margin.

Two further settings matter:

- **`curve: 'linear'`**, not `basis`. Basis swoops wide of the direct path and
  reads as a noodle even on a short edge.
- **Keep edge labels under about 25 characters.** A long label is laid out as a
  block, occupies a rank of its own and reads as a node. `Maximum of 5 days to
  produce sufficient design from having necessary info` becomes `within 5 days`,
  and the full sentence goes in the notes section where it belongs.

## Why cluster fill must match the label background

A Mermaid edge label paints a filled rectangle behind its text so the connector
does not strike through the words. If that fill differs from whatever sits behind
it, every label turns into a visible box and the diagram reads as twice as many
nodes as it has.

So `--ValeMermaid_ClusterFill` and `--ValeMermaid_LineLabelBackground` are both
white, and subgraphs are grouped by their **outline** rather than by a fill. If
you ever tint a cluster, tint the label background to match or the boxes come
straight back. Making the label background transparent instead is not a fix —
the connector then runs visibly through the text.

## Vale semantic classes

Apply with `:::className`. The builder generates the `classDef` block from the
stylesheet, so never hard-code a colour.

| Class | Use for | Reads as |
| --- | --- | --- |
| `valeStart` | The single entry point | Solid Vale blue, white text |
| `valeProcess` | An ordinary step | White, Vale blue outline |
| `valeDecision` | A branch point — use `{"..."}` diamond shape | Grey, accent blue outline |
| `valeStop` | Close, abort, reject, terminate | Red tint |
| `valeSla` | A step defined by a time constraint | Amber tint |
| `valeDone` | Successful completion or client delivery | Green tint |

Use `valeSla` sparingly — for a step whose *identity* is the deadline, such as
`Val Follow Up — within 48hrs allocation`. A step that merely has a duration on
its incoming arrow is a `valeProcess`; put the duration on the edge label.

Do not declare your own `classDef` unless you deliberately want to override the
theme — the builder skips injection entirely if it finds the word `classDef`
anywhere in the definition, and you will lose every Vale colour at once.

## Syntax that bites

- **Quote every label.** `N01["Initial Enquiry"]` — unquoted labels break on
  brackets, slashes, commas and full stops, all of which appear constantly in
  transcribed text.
- **Line breaks are `<br/>`**, not `\n`. Use them to keep nodes squarish; a node
  wider than about 40 characters distorts the whole rank.
- **Edge labels** use `A -- "text" --> B`. Quote these too.
- **Avoid `&`** in labels; write `and`. Avoid `#` and `;` entirely — Mermaid reads
  them as entity syntax.
- **Node IDs** `N01`…`Nnn` in flow order. Never reuse an ID; never start one with
  a digit. Keep IDs stable if the diagram is later edited by hand.
- **`%%` comments** are free and worth using to mark phases in the source.
- **A syntax error renders a visible error block rather than throwing**, so always
  open the built HTML and look at it. A broken diagram does not fail the build.

## Fidelity rules

- Every node, arrow and arrow label on the sheet appears in the diagram.
- Never merge two drawn nodes into one because they read similarly.
- Never add a connection the sheet does not draw.
- A drawn node with no outgoing arrow is a terminal state — class it `valeStop`
  or `valeDone` as the wording implies, and leave it terminal.
- Where the sheet writes a duration in a box of its own between two nodes, that
  is an edge label, not a node.
