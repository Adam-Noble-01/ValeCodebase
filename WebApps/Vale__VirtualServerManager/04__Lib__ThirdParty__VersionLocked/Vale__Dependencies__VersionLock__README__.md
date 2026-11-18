# Vale Virtual Server Manager: Version-Locked Vendor Dependencies

Pinned 18-Nov-2026. The page loads these copies from the local manager server (127.0.0.1:8020), never a CDN,
so tab 06 works offline and nothing outside this PC can change the code it runs.

| # | Folder | Package | Version | Browser entry |
|---|--------|---------|---------|---------------|
| 01 | `01__Vendor__D3__v7.9.0` | d3 | 7.9.0 (12-Mar-2024) | `dist/d3.min.js` (UMD: one `<script>` tag, sets `window.d3`) |

**Live wiring (three places, change all three together):**
- `VirtualServerManager__App__.html`: the `<script>` tag before `VirtualServerManager__Ui__AnalyticsCharts__.js`.
- `VirtualServerManager__Pwa__ServiceWorker__.js`: the `VSM_SHELL` list (with a new `VSM_CACHE` name).
- `VirtualServerManager__LocalServer__.py`: `NA__SERVER__STATIC_DIRS` serves this folder (`04__Lib__ThirdParty__VersionLocked`).

**Read by:** tab 06, User analytics (`VirtualServerManager__Ui__AnalyticsCharts__.js`, namespace `Vsm.Charts`, and
`VirtualServerManager__Ui__Analytics__.js`). No other tab uses D3. If the file fails to load, tab 06 says so and every
other tab carries on.

## Upgrading

Add a new folder beside the old one (`01__Vendor__D3__v<x.y.z>`), point the three places above at it, test tab 06,
then delete the old folder. Never overwrite a pinned folder in place: the version in the folder name is the lock.

## Upgrade history

- 18-Nov-2026: d3 7.9.0 added for tab 06 (manager 0.17.0). Downloaded from the npm registry
  (`https://registry.npmjs.org/d3/-/d3-7.9.0.tgz`), checked twice: the tarball against the registry's own integrity
  value (sha512 and sha1), and both `dist` files against cdnjs's published SRI hashes. 7.9.1 and 7.9.2 were left
  out on purpose: both appeared on 03-Nov-2026 from a new CI publishing pipeline, 15 days before this pin. 7.9.0 is
  the release its author, Mike Bostock, published himself, unchanged since March 2024.
