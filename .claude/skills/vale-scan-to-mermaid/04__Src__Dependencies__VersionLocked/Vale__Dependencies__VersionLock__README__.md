# =============================================================================
# Vale__Dependencies__VersionLock__README__.md
# =============================================================================
# Description : Version locked vendor dependencies for the scan to Mermaid skill
# Author      : Adam Noble
# Created     : 04-Aug-2026
# Version     : 1.0.0
# =============================================================================

## Why these are vendored

Built documents are inlined and self-contained on purpose — they are opened in
meeting rooms, emailed to clients and carried on memory sticks. Nothing may be
fetched from a CDN at open time, so the renderer ships in the repository and is
pinned.

## Locked versions

| Folder | Package | Version | Source |
| --- | --- | --- | --- |
| `01__Vendor__MermaidJs__v11.16.0` | `mermaid` | 11.16.0 | `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js` |

`mermaid.min.js` is 3.56MB and is inlined verbatim into every built HTML
document, which is what makes a document roughly 4MB. That is the intended
trade — one self-sufficient file beats a small file that needs the internet.

## Upgrading

1. Download the new minified build from jsDelivr or unpkg.
2. Create a **new** sibling folder named `01__Vendor__MermaidJs__v<version>`.
   Never overwrite an existing pinned folder — old documents are not rebuilt and
   the folder records what they were built against.
3. Update `MERMAID_VENDOR` in
   `02__Src__AppModules/30__System__DocumentBuilder/ScanToMermaid__DocumentBuilder__Main__.py`.
4. Rebuild a known-good sheet and confirm in a browser that the diagram still
   renders. Mermaid shows a syntax or version error as a visible block inside the
   page rather than failing the build, so the check must be a visual one.
5. Record the change in `ScanToMermaid__DEVLOG__.md`.

# =============================================================================
# End of File
# =============================================================================
