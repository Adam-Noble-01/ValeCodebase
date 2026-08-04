# =============================================================================
# Reference__TranscriptionMethod__.md
# =============================================================================
# Description : How to read a scanned hand-drawn sheet and record what it says
# Author      : Adam Noble
# Created     : 04-Aug-2026
# Version     : 1.0.0
# =============================================================================

## Reading order

1. Open the `..._Read__.png` whole-sheet copy. Work out the **structure** only —
   how many distinct regions the sheet has, where the flow starts, whether there
   is a notes panel, a legend, a title box.
2. Open **every** tile. Read the words there. Whole-sheet resolution is enough to
   see that a cloud contains three words; it is not enough to know what they are.
3. Only then write the transcription.

Skipping straight from the whole-sheet view to transcription is the single
biggest source of error. If you find yourself unsure what a word says, the answer
is to open the tile it sits in, not to guess from context.

## What to capture

Everything with meaning on it, not just the flowchart:

| Element | Goes to |
| --- | --- |
| Boxes / clouds and the arrows between them | `Diagram__MermaidDefinition` |
| Text sitting on an arrow | Mermaid edge label |
| Timing written beside a node (`48 HRS`) | Edge label into that node, or an SLA-classed node |
| Numbered notes panel | `Notes__Sections` |
| Key or legend with symbols | `Legend__Items` |
| Title box | `Document__Title` |
| Marginal annotations and callouts | Edge label or note, whichever the arrow implies |

A callout with a line pointing at a node is an annotation on that node. A callout
with an arrowhead is a flow step. Look at whether the line terminates in an arrow.

## Hand-drawn shape conventions

These are conventions, not rules — check the drawing rather than assuming:

- **Cloud / blob** — an ordinary process step.
- **Hard rectangle** — often a terminal state (`FILE CLOSE`) or a standalone
  marker such as a boxed duration.
- **A node with two labelled exits** — a decision, even when drawn as a cloud.
  `CLIENT CONTACT` with `MADE` and `NOT MADE` leaving it is a decision; render it
  as one and phrase the label as a question.
- **Double-headed or reversed arrows** — read the arrowhead carefully. Sheets
  often snake, so a second row may genuinely flow right-to-left.

## Letterforms that mislead

Block capitals written at speed collapse in predictable ways. When a word looks
wrong, these are the usual culprits:

`a`/`o` · `n`/`r` · `u`/`v` · `m`/`rn` · `c`/`e` · `t`/`f` · `5`/`S` · `1`/`7`
· `0`/`O`

Terminal `-ed`, `-er` and `-ment` frequently degrade into a single hook. Words
ending in a scribble are usually the longest plausible candidate, not the
shortest.

## Using domain vocabulary

Vale Garden Houses designs and manufactures garden buildings, orangeries,
conservatories and roof lanterns. Sheets from this business will use words like:

> enquiry · designer · management · survey · site visit · factory visit · concept
> · costing · specification · quote · lantern · orangery · touch point ·
> allocation · service agreement

A shape that reads as `CONCOPT` is `CONCEPT`. `COSTINA` is `COSTING`. Use the
vocabulary to resolve degraded letterforms — but only where the reading is
genuinely ambiguous, never to overwrite something clearly written.

## When to flag

Add a `Review__Flags` entry whenever you would not bet on the reading. Concretely:

**Always flag**

- Proper names of people (`Sharon`, `Val`) — spelling cannot be inferred.
- Abbreviations not written out anywhere on the sheet (`SV`).
- Any figure or duration you cannot read cleanly — a wrong SLA is worse than a
  flagged one.
- Text that overflows into a second column, where which item it belongs to is
  inferred from line position rather than stated.
- Words obscured by an overlapping line, smudge or scan artefact.

**Do not flag**

- Ordinary business vocabulary you read clearly.
- Your own tidying of capitalisation or punctuation.
- Expanding an abbreviation that the sheet itself writes out elsewhere.

Set `Flag__Confidence` to `low` when you genuinely cannot tell, `medium` when you
are fairly confident but a second pair of eyes is warranted.

Also mark the doubtful word inline in the body text:

```html
<span class="uncertain" title="Name read as Sharon — please confirm spelling">Sharon's</span>
```

## What never to do

- **Never invent structure.** If two clouds have no line between them, they are
  not connected, however logical a connection would be.
- **Never silently drop something you cannot read.** Transcribe your best reading
  and flag it. A gap in the output is invisible; a flag is not.
- **Never smooth over a contradiction.** If the sheet says 24hrs in one place and
  48hrs in another, record both and flag it — that is a real finding about the
  process, not a transcription problem.
- **Never expand an ambiguous abbreviation into the diagram as if it were
  certain.** Put the literal text in the node and the expansion in the flag.
