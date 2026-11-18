# D3: Version Locked (7.9.0)

Folder: `01__Vendor__D3__v7.9.0`

Downloaded 18-Nov-2026 from the npm registry, `https://registry.npmjs.org/d3/-/d3-7.9.0.tgz`, published by its
author, Mike Bostock (`mbostock`), on 12-Mar-2024. ISC licence (`LICENSE`, kept with the files).

Entry: `dist/d3.min.js` (UMD; sets `window.d3`). `dist/d3.js` is the same build unminified, kept for reading and
debugging; the page never loads it.

## Checked before it was copied here

| What | Value | Checked against |
|---|---|---|
| Tarball sha512 | `e1U46jVP+w7Iut8Jt8ri1YsPOvFpg46k+K8TpCb0P+zjCkjkPnV7WzfDJzMHy1LnA+wj5pLT1wjO901gLXeEhA==` | the registry's `dist.integrity` for 7.9.0 |
| Tarball sha1 | `579e7acb3d749caf8860bd1741ae8d371070cd5d` | the registry's `dist.shasum` |
| `dist/d3.min.js` sha512 | `vc58qvvBdrDR4etbxMdlTt4GBQk1qjvyORR2nrsPsFPyrs+/u5c3+1Ct6upOgdZoIl7eq6k3a1UPDSNAQi/32A==` | cdnjs SRI for d3 7.9.0 |
| `dist/d3.min.js` sha256 | `f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539` | for checking this copy later |
| `dist/d3.js` sha512 | matches cdnjs SRI for d3 7.9.0 | cdnjs SRI |

Trimmed to what the browser loads: the package's `src/index.js` only re-exports the separate d3-* packages, which
are not vendored, so it is left out. `package.json` and the upstream `README.md` are kept as they came.
