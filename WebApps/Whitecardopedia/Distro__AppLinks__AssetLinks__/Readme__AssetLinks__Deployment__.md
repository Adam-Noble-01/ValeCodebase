# Whitecardopedia / ValeVision 3D - Android App Links Deployment

> Lets Android Chrome route emailed ValeVision 3D share-link URLs straight into the
> installed PWA without showing a chooser, by proving that the WebApps origin
> and the WebAPK both belong to Vale Garden Houses / Noble Architecture.

---

## 1. What this folder contains

| File | Purpose |
| --- | --- |
| `Na__AppLinks__AssetLinks__Sources__.json` | Hand-maintained inputs (origins + WebAPK package + cert SHA256). Edit this file. |
| `Na__AppLinks__AssetLinks__Generated__.json` | Auto-generated Digital Asset Links statement list. Do not hand-edit; regenerate via the build step. |
| `Readme__AssetLinks__Deployment__.md` | This file. |

The generator that produces the `Generated__.json` file lives at:

```
Whitecardopedia/Tools__DevUtils/AutomationUtil__GenerateAppLinks__AssetLinks__Main__.py
```

It is also invoked automatically by the main project import build script:

```
Whitecardopedia/Tools__DevUtils/AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py
```

---

## 2. Where the generated file must live publicly

Per the [Digital Asset Links spec](https://developers.google.com/digital-asset-links/v1/getting-started)
and Chrome's WebAPK verifier, the file MUST be served at the **domain root**:

```
https://<your-domain>/.well-known/assetlinks.json
```

For the current production deployment that means:

```
https://adam-noble-01.github.io/.well-known/assetlinks.json
```

GitHub Pages serves repository content under `https://adam-noble-01.github.io/<repo-name>/`,
which is **not** the same as the domain root, so `Whitecardopedia/...` paths cannot
be used. The asset-links file must therefore be deployed via the
[user-pages repository](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#user-and-organization-pages-sites)
located at:

```
https://github.com/adam-noble-01/adam-noble-01.github.io
```

Copy the latest `Na__AppLinks__AssetLinks__Generated__.json` produced by the
build into that repo at:

```
adam-noble-01.github.io/.well-known/assetlinks.json
```

then commit and push. GitHub Pages will pick it up within a couple of minutes.

When a future custom domain (for example `app.valegardenhouses.com`) takes
over from GitHub Pages, deploy the same file at that domain root instead.

---

## 3. How to populate the WebAPK package + cert fingerprint

Until you fill in the real WebAPK package metadata the generator emits a
COMMENT-ONLY artefact so the published file does not assert false ownership.

To obtain the real values:

1. Install the ValeVision 3D PWA on an Android device using Chrome.
2. Open `chrome://webapks` in the same Chrome.
3. Find the entry whose start URL matches the production app.html.
4. Copy the `Package name` value into the `package_name` field of
   `Na__AppLinks__AssetLinks__Sources__.json`.
5. Copy the `Signing cert fingerprint (SHA-256)` value into
   `sha256_cert_fingerprints` (keep the colon-separated hex format).
6. Re-run the generator (`AutomationUtil__GenerateAppLinks__AssetLinks__.bat`)
   to refresh `Na__AppLinks__AssetLinks__Generated__.json`.
7. Copy the regenerated file to the user-pages repo and push.

---

## 4. Verifying it works

After deployment:

- Visit `https://adam-noble-01.github.io/.well-known/assetlinks.json` in a
  browser; you must see the JSON, with `Content-Type: application/json`.
- Use [Google's Digital Asset Links tester](https://developers.google.com/digital-asset-links/tools/generator)
  to confirm both the web -> Android and Android -> web statements verify.
- On an Android device, click an emailed ValeVision 3D share-link URL from
  Gmail or Outlook. With the PWA installed and the asset-links file in place,
  Android should open the URL directly inside the standalone PWA window
  without a chooser.

---

## 5. Local development testing

`Whitecardopedia/server.py` exposes the generated file at
`http://127.0.0.1:8000/.well-known/assetlinks.json` so you can verify the
output shape without needing to push to GitHub. The Android verifier itself
will not check `localhost`, so this is for shape validation only.

---

## 6. Troubleshooting

- **`Verification failed` in chrome://webapks**: re-check that
  `package_name` and `sha256_cert_fingerprints` exactly match the values shown
  for the target WebAPK; even a single character mismatch breaks verification.
- **Old fingerprint after WebAPK update**: Chrome occasionally rebuilds the
  WebAPK and changes the fingerprint. If link-capture stops working on Android,
  re-check `chrome://webapks` and refresh the sources file.
- **Custom domain switch-over**: add the new origin to
  `siteOrigins` in the sources file and regenerate. Both the old and new
  origins can coexist as separate statements during the migration window.
