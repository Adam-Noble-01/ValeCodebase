# AURA Handwriting Engine (WebAssembly)

The Vale Handwriting Studio's handwriting, running in the browser on the user's own machine (Adam, 30-Oct-2026:
"Refactor the Handwriting tool from python to WASM so the Vale Server can send the binary for client side to cache
and execute to get realistic handwritten text"). Built for AURA 0.2.1. The Python it came from is the reference in
`../01__Engine__PythonReference`.

## The Parts

| File | What it does |
|---|---|
| `Na__HandwritingEngine__Network__.ts` | The Graves network in AssemblyScript: three peephole LSTMs of 400, the soft window of 10 Gaussians that reads along the words, the mixture of 20 pen movements, and the sampling loop with the toolkit's end-of-words test. Its weights are copied in at start |
| `Na__HandwritingEngine__Network__Simd__.wasm` | Built from it with SIMD (13 KB): about 0.27 ms a pen step, so a 20-letter phrase takes about 0.2 s |
| `Na__HandwritingEngine__Network__Scalar__.wasm` | Built from it without SIMD, for a browser that has none (about 0.9 ms a step). The same strokes, to the bit |
| `Na__HandwritingEngine__Build__.json` | What built the two modules: the compiler, its options, the SHA-256s |
| `Na__HandwritingEngine__Neural__.js` | One phrase through the network: up to four tries (a calmer pen each time), the check that every letter was reached, the path levelled and scaled to a letter's height, cut into strokes. The studio's `neural_strokes` |
| `Na__HandwritingEngine__Layout__.js` | A whole note: the words checked, wrapped to the note's width, numbers and symbols drawn explicitly, each stroke's slant, baseline wave and pen weight, the Catmull-Rom curves. The studio's `validate` and `render` |
| `Na__HandwritingEngine__TechStrokes__.js` | The studio's explicit strokes for numbers, units and drawing symbols |
| `Na__HandwritingEngine__Worker__.js` | The Web Worker: loads the network and the weights, writes the notes the page sends. Started by `../Na__Handwriting__Client__.js` |

## Where Things Come From

- **The network modules and the scripts** are AURA's own files, served by nginx with the app, network first, with a
  copy kept for offline by AURA's service worker.
- **The weights** (15 MB, 32-bit, the checkpoint's own numbers) come from the AURA API, to signed-in Managers and
  App Admins only: `api/handwriting/model` (the manifest) and `api/handwriting/weights/<sha256>`. The worker checks
  their size and SHA-256 and keeps them in the device's cache (`aura-pen-<hash>`), so each device fetches them once.
  They live in `Server__Api/Api__ValeVision__AuraRender/Content__AuraHandwritingModel` (never web-served, never in
  git: trained on IAM-OnDB, an evaluation asset).
- **Nothing is computed on the server** (Adam, 30-Oct-2026: the server is resource constrained).

## The Same Ink Everywhere

The network sums every output in the same order in both builds (a SIMD lane is one output's own sum), uses no fused
multiply-add and no relaxed SIMD, and carries its own maths (musl's `expf`, `tanhf`, `log`, `cos`, `sin`, compiled
in at shrink level 0). So a note's words, settings and seed write the same strokes in every browser, with SIMD or
without. The written ink is still saved with each note in the drawing set, so a later model never changes a note
already written.

## Two Changes From the Studio

1. **No stray dot after each phrase.** The studio's ink ended every phrase with a dot about 3 mm after the last
   letter (the last path of each phrase in its `demo-ink.json`): the pen setting down in the two padding spaces as
   the model stopped. The neural pen drops a last stroke of one or two points: in 347 sampled phrases it was one of
   those in 342, and a written full stop always comes before it.
2. **The explicit m has two arches.** The studio's had three, so "2400 mm" read as "2400 mmm".

The random draws are AURA's own (PCG32 in the network, a hash of the note's seed, phrase and place for each
phrase, mulberry32 for the slants), so a seed writes a different copy than the studio's Python did, of the same
quality. Paths are written to 0.01 mm with relative segments, about half the size of the studio's in the drawing
set.

## Building and Checking (on a PC; `60__Dev__WebBuildUtils`)

```bat
cd Vale__ValeVision__AuraRender\60__Dev__WebBuildUtils
npm ci
node AuraRender__BuildUtil__HandwritingWasm__.mjs
<studio .venv>\Scripts\python.exe AuraRender__BuildUtil__HandwritingWeights__.py
<studio .venv>\Scripts\python.exe AuraRender__BuildUtil__HandwritingParity__.py
node AuraRender__BuildUtil__HandwritingParity__.mjs
node AuraRender__BuildUtil__HandwritingProof__.mjs
```

- `npm ci` installs the pinned compiler (AssemblyScript 0.28.20 and its binaryen, about 106 MB, git-ignored).
- The weights script needs torch (the studio's `.venv`); it writes the `.bin` and its manifest beside the API.
- The parity check runs the toolkit's own network and both WebAssembly builds along the same pen paths; it
  passes when every step agrees with torch within 1e-3 (it was within 2e-5) and the two builds agree to the bit.
- The proof sheet writes the studio's demonstration notes through these very modules and saves an SVG and a PNG in
  `21__Generated__HandwritingParity` to look at.

## Cautions

- The model can misform or leave out letters; the four tries catch a stalled phrase, not a misspelling. Every note
  says so: proofread before a drawing is issued.
- It writes `` !"#%'()+,-./0-9:;?A-Z[a-z ``, curly quotes as straight ones, and the explicit strokes (numbers with
  their units, x between spaces, = ± × ° Ø & ² ³ − – —). Anything else is refused, naming the characters.
- Numbers drawn explicitly are as tall as a whole phrase of handwriting (the studio's sizing), so in a mixed line
  they stand taller than the small letters.
