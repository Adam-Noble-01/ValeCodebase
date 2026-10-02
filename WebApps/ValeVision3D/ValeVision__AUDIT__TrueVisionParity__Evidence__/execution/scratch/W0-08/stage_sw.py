# W0-08 scratch: build the STAGED copies of the shared Whitecardopedia service-worker logic and registrar
# (execution policy 2: the live shared files are never edited) and the unified diff against the live files.
#
#   python stage_sw.py            -> writes prepared/W0-08/<repo-relative path> for both files + prepared/W0-08.patch
#
# Each edit is anchored on text that must match exactly once; the live files' SHA-1 must equal the preflight
# pre-image (a file changed under us is a stop condition). Line endings: the logic file is LF, the registrar CRLF;
# each staged copy keeps its live file's own ending (edit_util.LineDoc).
import difflib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from edit_util import LineDoc, pad, sha1  # noqa: E402

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.normpath(os.path.join(HERE, '..', '..'))
PREPARED_ROOT = os.path.join(EXEC, 'prepared', 'W0-08')
PATCH_PATH = os.path.join(EXEC, 'prepared', 'W0-08.patch')

REL_LOGIC = 'WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js'
REL_REGISTRAR = 'WebApps/Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js'

LE = 'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/'
LE_LAZY_SHEETS = [
    LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
    LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
    LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
    LE + '40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
    LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css',
    LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css',
    LE + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css',
    LE + '80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css',
    LE + '56__Feature__ScrapbookCustom/Na__LayoutEditor__Styles__ScrapbookCustom__.css',
    LE + '57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css',
]


def load_live(rel):
    path = os.path.join(VCB, rel.replace('/', os.sep))
    data = open(path, 'rb').read()
    manifest = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
    expected = manifest[rel.replace('/', '\\')]['sha1']
    if sha1(data) != expected:
        raise SystemExit(f'STOP: {rel} changed since the preflight pre-image ({sha1(data)} != {expected})')
    return data


# =============================================================================================
# THE WORKER LOGIC (LF)
# =============================================================================================
def stage_logic(data: bytes) -> bytes:
    doc = LineDoc(data, 'logic')

    # ---- E1 header DESCRIPTION: buckets, the two tokens, the token rule ----------------------
    first = doc.find_one('// - Cache buckets:')
    last = doc.find_one('shared R2 build-version manifest reports a newer build (see ProjectLoader).')
    doc.expect(first + 1, 'pwa-shell-vN')
    doc.replace(first, last, [
        '// - Cache buckets:',
        '//     * wpwa-shell-<token>     : HTML / CSS / JSX / JS / manifest / fonts / icons /',
        '//                                HDRI (stale-while-revalidate on deployed origins,',
        '//                                network-first on localhost; HTML network-first)',
        '//     * wpwa-data-<token>      : project.json / masterConfig.json / app config /',
        '//                                DataLib JSON (network-first)',
        '//     * wpwa-thumbs-<asset>    : 524p gallery thumbnail images',
        '//                                (stale-while-revalidate, capped)',
        '//     * wpwa-models-<asset>    : GLB / GLTF models (network-first with a',
        '//                                slow-network grace window, capped)',
        '//     * wpwa-images-<asset>    : ValeVision3D sheet pictures, filed under',
        '//                                05__Layout__DrawingDocs__Images (cache-first,',
        '//                                capped: each name carries its content hash)',
        '//     * wpwa-published-<asset> : ValeVision3D published drawings, under',
        '//                                06__Layout__PublishedDocuments (hashed files',
        '//                                cache-first, capped; the index, manifests and',
        '//                                element files network-first; PDFs not cached)',
        '// - Full-resolution IMG##__* project images are intentionally NOT cached so',
        '//   the project view always shows the latest delivered art.',
        '// - TWO TOKENS. PWA_SW_VERSION_TOKEN (<token>) names the shell and data',
        '//   buckets; PWA_SW_ASSET_VERSION_TOKEN (<asset>) names the other four. The',
        '//   activate step deletes every owned bucket that is not current, so a shell',
        '//   bump evicts the shell and data buckets only. Nothing in the other four can',
        '//   go stale with a shell change - models are network-first, thumbnails',
        '//   refresh in the background, pictures and published files carry their',
        '//   content hash - so a shell bump no longer re-downloads every client\'s',
        '//   models. Bump the asset token only to empty those four on purpose.',
        '// - TOKEN RULE (ValeVision3D parity plan, decision DR-07, the default in',
        '//   force from 01-Oct-2026): no feature change edits or bumps this worker.',
        '//   Adam bumps PWA_SW_VERSION_TOKEN at deploy - once per deployed',
        '//   ValeVision3D wave or Whitecardopedia release - with one log line naming',
        '//   the versions it covers. A deploy needs it whenever a warm client could',
        '//   hold half of a change: a module renamed or moved, an export renamed or',
        '//   newly imported by name, a changed stylesheet or index.html dependency.',
        '// - The app also evicts the thumbnail and data buckets on its own when the',
        '//   shared R2 build-version manifest reports a newer build (see',
        '//   ProjectLoader). The images and published buckets never need that: their',
        '//   files are content-hashed or network-first, so an editor save that writes',
        '//   them needs no build-manifest bump.',
    ])

    # ---- E2 DEVELOPMENT LOG: new entry on top (this log runs newest first) --------------------
    log = doc.find_one('// DEVELOPMENT LOG:')
    doc.expect(log + 1, '// 18-Sep-2026 - Version 1.0.16')
    doc.insert_after(log, [
        '// 01-Oct-2026 - Version 1.0.17',
        '// - NOT BUMPED: PWA_SW_VERSION_TOKEN stays 2026-09-18-1. Prepared for the',
        '//   ValeVision3D TrueVision-parity programme (package W0-08) and left for',
        '//   Adam to deploy with a shell bump (TOKEN RULE above). Deploy it with or',
        '//   before the ValeVision3D drawing-folder renumber: a warm client holding',
        '//   the old loading sequence beside the new index.html cannot link the app.',
        '// - TOKEN SPLIT. PWA_SW_ASSET_VERSION_TOKEN - also 2026-09-18-1, so no bucket',
        '//   changes name - now names the thumbs and models buckets and the two new',
        '//   ones below. The activate step keeps all six current buckets: it used to',
        '//   delete the CURRENT models bucket on every activation, because its',
        '//   keep-list named only shell, thumbs and data.',
        '// - Stale-while-revalidate refreshes with fetch(request, { cache:',
        '//   \'no-cache\' }), from TrueVision3D\'s worker logic 1.9.54 (29-Sep-2026). A',
        '//   plain fetch(request) took the browser\'s own HTTP-cache copy, fresh for',
        '//   the host\'s max-age after the last download, and wrote it back as new, so',
        '//   a browser that had loaded the app before a deploy kept running the old',
        '//   modules for that long - through a token bump too, since a new bucket',
        '//   fills its misses through the same fetch. The revalidation is a',
        '//   conditional request, answered 304 with no body when nothing changed.',
        '// - PRECACHE. The ten ValeVision3D Layout Editor stylesheets that are linked',
        '//   lazily - the editor loader\'s eight and the Custom and Parametric',
        '//   Scrapbook panels\' own - join the shell list, so the token governs them',
        '//   and a deploy reaches them on the first load (TrueVision3D precaches its',
        '//   lazily linked sheets for the same reason). The DistanceCulling entry',
        '//   follows the module to 05__RenderPipeline/ (ValeVision3D renumber); the',
        '//   old 02__Engine__MaxEngine/ path no longer exists.',
        '// - Two new buckets, after TrueVision3D\'s tv-images (1.9.15) and',
        '//   tv-published (1.9.42): wpwa-images for sheet pictures (cache-first,',
        '//   capped at 160 - a .png picture no longer lands in the uncapped shell',
        '//   bucket) and wpwa-published for published drawings (hashed files',
        '//   cache-first, capped at 240; the index, manifests and element files',
        '//   network-first; PDFs left to the browser). Both are classified before',
        '//   every older pattern - their folders hold nothing else - and both are',
        '//   owned, kept by the activate step and cleared by wpwa-clear-caches.',
        '// - Gallery thumbnail, full-image, data, model, HDRI and HTML rules, and the',
        '//   localhost shell rule, are unchanged.',
        '//',
    ])

    # ---- E3 cache constants: the asset token, two new buckets and their caps -----------------
    first = doc.find_one('const PWA_SW_VERSION_TOKEN')
    last = doc.find_one('const PWA_SW_MODELS_MAX_ENTRIES')
    doc.expect(last + 1, 'const PWA_SW_MODELS_NETWORK_TIMEOUT_MS')
    doc.replace(first, last, [
        pad("    const PWA_SW_VERSION_TOKEN              = '2026-09-18-1';",
            "SHELL TOKEN: names the shell and data buckets. Adam bumps it at deploy, once per deployed wave, with a log line naming the versions covered (TOKEN RULE in the header), whenever shell JS/CSS changes in a way a warm client could hold half of."),
        pad("    const PWA_SW_ASSET_VERSION_TOKEN        = '2026-09-18-1';",
            "ASSET TOKEN: names the thumbs, models, images and published buckets, which a shell bump leaves alone. Bump only to empty them on purpose (every client re-downloads its models)."),
        pad('    const PWA_SW_CACHE_NAME_SHELL           = `wpwa-shell-${PWA_SW_VERSION_TOKEN}`;', 'App shell cache id'),
        pad('    const PWA_SW_CACHE_NAME_THUMBS          = `wpwa-thumbs-${PWA_SW_ASSET_VERSION_TOKEN}`;', 'Gallery thumbnail cache id'),
        pad('    const PWA_SW_CACHE_NAME_DATA            = `wpwa-data-${PWA_SW_VERSION_TOKEN}`;', 'Project JSON cache id'),
        pad('    const PWA_SW_CACHE_NAME_MODELS          = `wpwa-models-${PWA_SW_ASSET_VERSION_TOKEN}`;', 'Model GLB cache id (network-first, offline fallback)'),
        pad('    const PWA_SW_CACHE_NAME_IMAGES          = `wpwa-images-${PWA_SW_ASSET_VERSION_TOKEN}`;', 'ValeVision3D sheet pictures cache id (content-hashed names, cache-first)'),
        pad('    const PWA_SW_CACHE_NAME_PUBLISHED       = `wpwa-published-${PWA_SW_ASSET_VERSION_TOKEN}`;', 'ValeVision3D published drawings cache id (hashed files cache-first, JSON network-first)'),
        pad("    const PWA_SW_CACHE_PREFIXES_OWNED       = ['wpwa-shell-', 'wpwa-thumbs-', 'wpwa-data-', 'wpwa-models-', 'wpwa-images-', 'wpwa-published-'];", 'Owned cache prefixes (for cleanup)', 136),
        pad('    const PWA_SW_THUMBS_MAX_ENTRIES         = 256;', 'LRU cap on thumbnail cache'),
        pad('    const PWA_SW_MODELS_MAX_ENTRIES         = 36;', 'LRU cap on model cache (GLBs are large; ~3-6 projects worth)'),
        pad('    const PWA_SW_IMAGES_MAX_ENTRIES         = 160;', 'LRU cap on the sheet pictures cache (a CGI is a few MB; TrueVision3D uses 160)'),
        pad('    const PWA_SW_PUBLISHED_MAX_ENTRIES      = 240;', 'LRU cap on the published drawings cache (TrueVision3D uses 240)'),
    ])

    # ---- E4 path patterns: the two ValeVision3D content folders ------------------------------
    shell_pat = doc.find_one('const PWA_SW_PATH_PATTERN_SHELL_ASSET')
    doc.expect(shell_pat + 1, 'const PWA_SW_APP_FOLDER_TOKENS')
    doc.insert_after(shell_pat, [
        pad('    const PWA_SW_PATH_PATTERN_SHEET_IMAGE   = /\\/05__Layout__DrawingDocs__Images\\/[^\\/]+\\/[^\\/]+\\.(webp|jpe?g|png)(\\?.*)?$/i;',
            'ValeVision3D sheet pictures (immutable: the name carries the content hash)'),
        pad('    const PWA_SW_PATH_PATTERN_PUBLISHED_ASSET = /\\/06__Layout__PublishedDocuments\\/.+__[0-9a-f]{10}\\.(svg|webp|png)(\\?.*)?$/i;',
            'Published baked files and shared images (immutable: content-hashed names)'),
        pad('    const PWA_SW_PATH_PATTERN_PUBLISHED_DATA  = /\\/06__Layout__PublishedDocuments\\/.+\\.json(\\?.*)?$/i;',
            'Published index, manifests, sheets and element files (fixed names, changed by a re-publish)'),
        pad('    const PWA_SW_PATH_PATTERN_PUBLISHED_PDF   = /\\/06__Layout__PublishedDocuments\\/.+\\.pdf(\\?.*)?$/i;',
            'Published PDFs (downloaded once: left to the browser)'),
    ])

    # ---- E5 precache: DistanceCulling's new path, then the lazily linked LE stylesheets -------
    dc = doc.find_one("'ValeVision3D/02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js',")
    doc.replace(dc, dc, ["        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js',"])
    sheets = doc.find_one("'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css',")
    doc.expect(sheets + 1, '// VALEVISION3D APP CORE MODULES')
    doc.insert_after(sheets, [
        '        // VALEVISION3D LAYOUT EDITOR STYLESHEETS - LINKED LAZILY, PRECACHED ON PURPOSE',
        '        // Not boot-critical: the Layout Editor loader links its eight sheets the first',
        '        // time a drawing opens, and the Custom and Parametric Scrapbook panels link',
        '        // their own on first use. Off this list they are ordinary shell requests, and',
        '        // away from localhost the shell is stale-while-revalidate, so the FIRST load',
        '        // after a deploy painted the editor with the previous release\'s sheet.',
        '        // Precached, the token governs them like everything else and a bump evicts',
        '        // them outright (TrueVision3D precaches its lazily linked sheets for the same',
        '        // reason). Every sheet a later release links lazily joins this group.',
    ] + [f"        '{path}'," for path in LE_LAZY_SHEETS])

    # ---- E6 classifier: the two content folders first ---------------------------------------
    cls = doc.find_one('function Whitecardopedia__Pwa__ServiceWorker__Logic__ClassifyRequest(request) {')
    doc.expect(cls + 1, 'const requestUrl')
    doc.expect(cls + 2, 'PWA_SW_PATH_PATTERN_THUMBNAIL.test(requestUrl)')
    doc.insert_after(cls + 1, [
        '',
        '        // ValeVision3D\'s sheet pictures and published drawings are tested FIRST.',
        '        // Their folders hold nothing else, so no gallery file can match them, and',
        '        // the older patterns would misfile them: a .png or .svg is a shell asset',
        '        // (the uncapped shell bucket) and a picture named IMG01__... a full image.',
        pad("        if (PWA_SW_PATH_PATTERN_SHEET_IMAGE.test(requestUrl)) return 'sheet-image';", 'Content-hashed: download once'),
        pad("        if (PWA_SW_PATH_PATTERN_PUBLISHED_ASSET.test(requestUrl)) return 'published-asset';", 'Content-hashed: download once'),
        pad("        if (PWA_SW_PATH_PATTERN_PUBLISHED_DATA.test(requestUrl)) return 'published-data';", 'Fixed names: network first'),
        pad("        if (PWA_SW_PATH_PATTERN_PUBLISHED_PDF.test(requestUrl)) return 'published-pdf';", 'Left to the browser'),
        '',
    ])

    # ---- E7 strategies: Cache First, Capped (after Cache First) -------------------------------
    swr_head = doc.find_one('// FUNCTION | Stale While Revalidate Strategy')
    doc.insert_before(swr_head, [
        '    // FUNCTION | Cache First, Capped',
        '    // ------------------------------------------------------------',
        '    // Cache first for content that can never change under its name - a sheet',
        '    // picture or a published file whose name ends in its content hash - with',
        '    // the bucket trimmed back to its cap after each new entry lands. The plain',
        '    // fetch is right here: the browser\'s own copy of such a file is never stale.',
        '    // ------------------------------------------------------------',
        '    async function Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirstCapped(request, cacheName, maxEntries) {',
        pad('        const cacheInstance     = await caches.open(cacheName);', 'Open named cache'),
        pad('        const cachedResponse    = await cacheInstance.match(request);', 'Lookup cached entry'),
        pad('        if (cachedResponse) return cachedResponse;', 'Cache hit -> return immediately'),
        '',
        '        try {',
        pad('            const networkResponse = await fetch(request);', 'Network fetch'),
        '            if (networkResponse && networkResponse.ok) {',
        '                cacheInstance.put(request, networkResponse.clone())',
        pad('                    .then(() => Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(cacheName, maxEntries))', 'Keep the bucket under its cap'),
        pad('                    .catch(() => {});', 'Best-effort (quota failures must not break the response)'),
        '            }',
        pad('            return networkResponse;', 'Return live response'),
        '        } catch (error) {',
        pad('            return Response.error();', 'Fail closed when offline + uncached'),
        '        }',
        '    }',
        '    // ---------------------------------------------------------------',
        '',
        '',
    ])

    # ---- E8 stale-while-revalidate: revalidate with the server -------------------------------
    swr_fn = doc.find_one('async function Whitecardopedia__Pwa__ServiceWorker__Logic__StaleWhileRevalidate(request, cacheName) {')
    swr_fetch = doc.find_first('const networkPromise    = fetch(request).then((networkResponse) => {', swr_fn)
    if swr_fetch - swr_fn > 4:
        raise SystemExit('logic: stale-while-revalidate fetch line not where expected')
    doc.expect(swr_fetch - 1, '')
    doc.replace(swr_fetch, swr_fetch, [
        '        // cache:\'no-cache\' makes the background refresh revalidate with the server',
        '        // instead of taking the browser\'s own HTTP-cache copy, which the host marks',
        '        // fresh for its max-age after the last download. With a plain',
        '        // fetch(request) that copy came back unchanged and was written into this',
        '        // bucket as though it were new, so a browser that had loaded the app',
        '        // before a deploy kept running the old files for that long - through a',
        '        // token bump too, since a new bucket fills its misses through this same',
        '        // fetch. A revalidation is a conditional request, answered 304 with no',
        '        // body when the file has not changed. (\'no-store\', as NetworkFirst uses,',
        '        // would download every file in full on every load.)',
        pad("        const networkPromise    = fetch(request, { cache: 'no-cache' }).then((networkResponse) => {", 'Revalidate with the server, never the HTTP cache'),
    ])

    # ---- E9 activate: one keep-list naming all six current buckets ----------------------------
    act = doc.find_one("self.addEventListener('activate', (activateEvent) => {")
    keys_line = doc.find_first('const allCacheNames = await caches.keys();', act)
    doc.insert_before(keys_line, [
        pad('                const keepList      = [', 'Buckets belonging to this version'),
        '                    PWA_SW_CACHE_NAME_SHELL,',
        '                    PWA_SW_CACHE_NAME_DATA,',
        '                    PWA_SW_CACHE_NAME_THUMBS,',
        pad('                    PWA_SW_CACHE_NAME_MODELS,', 'Was missing: every activation deleted the current models bucket'),
        '                    PWA_SW_CACHE_NAME_IMAGES,',
        '                    PWA_SW_CACHE_NAME_PUBLISHED',
        '                ];',
        '',
    ])
    keep_shell = doc.find_one('if (cacheName === PWA_SW_CACHE_NAME_SHELL) return;')
    doc.expect(keep_shell + 1, 'if (cacheName === PWA_SW_CACHE_NAME_THUMBS) return;')
    doc.expect(keep_shell + 2, 'if (cacheName === PWA_SW_CACHE_NAME_DATA) return;')
    doc.expect(keep_shell + 3, 'await caches.delete(cacheName);')
    doc.replace(keep_shell, keep_shell + 2, [
        pad('                    if (keepList.indexOf(cacheName) !== -1) return;', 'Keep every current bucket'),
    ])

    # ---- E10 fetch routing: the new classes ----------------------------------------------------
    full = doc.find_one("if (classification === 'full-image') return;")
    doc.insert_after(full, [
        '',
        "        if (classification === 'sheet-image') {",
        pad('            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirstCapped(', 'Content-hashed: download once, keep the bucket capped'),
        '                request, PWA_SW_CACHE_NAME_IMAGES, PWA_SW_IMAGES_MAX_ENTRIES',
        '            ));',
        '            return;',
        '        }',
        '',
        "        if (classification === 'published-asset') {",
        pad('            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirstCapped(', 'Content-hashed: download once, keep the bucket capped'),
        '                request, PWA_SW_CACHE_NAME_PUBLISHED, PWA_SW_PUBLISHED_MAX_ENTRIES',
        '            ));',
        '            return;',
        '        }',
        '',
        "        if (classification === 'published-data') {",
        pad('            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_PUBLISHED));', 'A re-publish must be seen; the last copy serves offline', 136),
        '            return;',
        '        }',
        '',
        pad("        if (classification === 'published-pdf') return;", 'A baked PDF is downloaded once: left to the browser, never cached'),
    ])

    return doc.to_bytes()


# =============================================================================================
# THE REGISTRAR (CRLF)
# =============================================================================================
def stage_registrar(data: bytes) -> bytes:
    doc = LineDoc(data, 'registrar')

    # ---- R1 header DESCRIPTION: the controllerchange bullet ----------------------------------
    first = doc.find_one('// - Bridges service worker controllerchange events: when a new SW activates')
    last = doc.find_one('//   to avoid yanking a mid-load ValeVision3D session.')
    if last - first != 5:
        raise SystemExit('registrar: DESCRIPTION bullet is not the expected six lines')
    doc.replace(first, last, [
        '// - Bridges service worker controllerchange events: when a NEWER SW takes',
        '//   over a page an older one was already controlling, the page reloads',
        '//   exactly once (guarded by sessionStorage) so the user gets a consistent',
        '//   module graph. The very first SW claiming an uncontrolled page is not an',
        '//   update and does not reload. The reload is deferred while a model load',
        '//   is in flight - window.Na__LoadWatchdog__IsLoadingActive, set by the',
        '//   LoadWatchdog module, so a mid-load ValeVision3D session is not yanked -',
        '//   and while the page holds unsaved work - window.Na__Pwa__HasUnsavedWork,',
        '//   published by the ValeVision3D Layout Editor\'s auto save and absent on',
        '//   Whitecardopedia pages - for up to 30 s, then the update waits for the',
        '//   next fresh load.',
        '// - Registers with updateViaCache \'none\', so every update check revalidates',
        '//   the imported worker logic with the server.',
    ])

    # ---- R2 DEVELOPMENT LOG: new entry at the end (this log runs oldest first) ---------------
    tail = doc.find_one('//   Exposed on the global API as purgeAppCache().')
    doc.expect(tail + 1, '//')
    doc.expect(tail + 2, '// =====')
    doc.insert_after(tail, [
        '//',
        '// 01-Oct-2026 - Version 1.2.1',
        '// - Brought up to TrueVision3D\'s registrar 1.1.0-1.3.0 (19-Sep and',
        '//   29-Sep-2026, read at b2aa9151) for the ValeVision3D Layout Editor, which',
        '//   runs under this worker. Whitecardopedia pages publish no unsaved-work',
        '//   flag, so for them only the second and third points change anything.',
        '//   * UNSAVED WORK HOLDS THE RELOAD. The idle check also waits while',
        '//     window.Na__Pwa__HasUnsavedWork() answers true: sheets not yet saved to',
        '//     the project, or a specification not yet synced. This reload asks',
        '//     nothing before it happens, and the editor\'s close guard would raise the',
        '//     browser\'s leave-site question over the top of it. The poll still gives',
        '//     up after 30 s and the update lands on the next fresh load; a probe that',
        '//     throws counts as nothing unsaved, so it can never wedge updates.',
        '//   * NO RELOAD ON A FIRST INSTALL. clients.claim() raises controllerchange',
        '//     on a page nothing was controlling, and the bridge treated that as an',
        '//     update: every first visit loaded the model, reloaded and loaded it',
        '//     again, and so did every first launch of a Home Screen icon (its storage',
        '//     starts empty). The bridge is now armed before registering and samples',
        '//     navigator.serviceWorker.controller first; the first claim passes, and',
        '//     any change after it is a real update and reloads as before.',
        '//   * updateViaCache \'none\'. The worker logic is a script the stub imports,',
        '//     and with the default (\'imports\') an update check took it from the HTTP',
        '//     cache while the host still called it fresh, so a token bump could go',
        '//     unseen for that long. Every check now revalidates it with the server (a',
        '//     304 when unchanged); a registration made with the default is switched',
        '//     over the next time this runs.',
        '// - Prepared by the ValeVision3D TrueVision-parity package W0-08; Adam deploys',
        '//   it with the worker logic 1.0.17.',
    ])

    # ---- R3 + R4 the unsaved-work probe, and the bridge made first-install aware -------------
    # Minimal in-place edits: every original line of the bridge that does not change keeps its bytes.
    bridge_hdr = doc.find_one('// HELPER FUNCTION | Bridge controllerchange to a Guarded Idle Reload')
    doc.expect(bridge_hdr - 1, '')
    doc.expect(bridge_hdr - 2, '')
    doc.insert_before(bridge_hdr, [
        '    // HELPER FUNCTION | Is There Unsaved Editor Work',
        '    // ---------------------------------------------------------------',
        '    // The ValeVision3D Layout Editor\'s auto save publishes this probe once it',
        '    // knows whether the session may edit at all; unsaved sheets and an',
        '    // unsynced specification both count. Whitecardopedia pages publish',
        '    // nothing, and a page that publishes nothing has nothing to protect.',
        '    // ---------------------------------------------------------------',
        '    function Whitecardopedia__Pwa__ServiceWorker__Registrar__HasUnsavedWork() {',
        pad('        const probe             = window.Na__Pwa__HasUnsavedWork;', 'Published by the Layout Editor auto save'),
        pad("        if (typeof probe !== 'function') return false;", 'No editor on this page: nothing to protect'),
        '',
        pad('        try { return probe() === true; } catch (error) { return false; }', 'A broken probe must not wedge updates forever'),
        '    }',
        '    // ---------------------------------------------------------------',
        '',
        '',
    ])

    # the bridge's explanation: TWO kinds of controllerchange, two hold-off signals
    bridge_hdr = doc.find_one('// HELPER FUNCTION | Bridge controllerchange to a Guarded Idle Reload')
    doc.expect(bridge_hdr + 1, '// -------------------------------------------------------')
    expl_first = bridge_hdr + 2
    expl_last = doc.find_one('// the page becomes idle (or up to 30 s of polling before giving up).', expl_first)
    doc.expect(expl_last + 1, '// -------------------------------------------------------')
    doc.replace(expl_first, expl_last, [
        '    // Armed once, BEFORE the registration, because controllerchange fires for',
        '    // two different reasons and only one of them wants a reload:',
        '    //   UPDATE        - a SW was already controlling this page and a newer one',
        '    //                   has taken over. The page may hold modules from the old',
        '    //                   cache, so it reloads exactly once (the sessionStorage',
        '    //                   guard prevents reload loops).',
        '    //   FIRST INSTALL - nothing was controlling the page and the first SW has',
        '    //                   just claimed it. Everything on screen came straight off',
        '    //                   the network, so a reload would only throw away a model',
        '    //                   the client has just finished downloading.',
        '    // The reload is deferred while a model load is in flight -',
        '    // window.Na__LoadWatchdog__IsLoadingActive - or while the page holds',
        '    // unsaved work - window.Na__Pwa__HasUnsavedWork - polling until the page',
        '    // is idle, for up to 30 s before giving up.',
    ])

    # sample the controller before anything can change it
    interval = doc.find_one('const NA__RELOAD_POLL_INTERVAL_MS = 500;')
    doc.expect(interval + 1, '')
    doc.expect(interval + 2, "navigator.serviceWorker.addEventListener('controllerchange', () => {")
    doc.insert_after(interval, [
        '',
        pad('        let Whitecardopedia__Pwa__PageIsControlled = Boolean(navigator.serviceWorker.controller);', 'Sampled before registration can change it'),
    ])

    # a first claim is not an update
    listener = doc.find_one("navigator.serviceWorker.addEventListener('controllerchange', () => {")
    doc.expect(listener + 1, 'if (sessionStorage.getItem(NA__RELOAD_SESSION_KEY)) return;')
    doc.insert_after(listener, [
        '            if (!Whitecardopedia__Pwa__PageIsControlled) {',
        pad('                Whitecardopedia__Pwa__PageIsControlled = true;', 'Any later change on this page IS an update'),
        "                console.log('[SW Registrar] First service worker has taken control - no reload needed.');",
        pad('                return;', 'First install, not an update'),
        '            }',
        '',
    ])

    # unsaved work is a second hold-off signal beside the load-in-flight flag
    loading = doc.find_one('const isLoading = window.Na__LoadWatchdog__IsLoadingActive === true;')
    doc.expect(loading + 1, '')
    doc.expect(loading + 2, 'if (!isLoading) {')
    doc.insert_after(loading, [
        pad('                const isHolding = Whitecardopedia__Pwa__ServiceWorker__Registrar__HasUnsavedWork();', 'Unsaved editor work holds it too'),
    ])
    cond = doc.find_one('if (!isLoading) {')
    doc.lines[cond] = doc.lines[cond].replace('if (!isLoading) {', 'if (!isLoading && !isHolding) {')

    give_up = doc.find_one("console.warn('[SW Registrar] Controller changed but load still in flight after 30s")
    doc.replace(give_up, give_up, [
        "                    console.warn('[SW Registrar] Controller changed but the page is still loading or holding unsaved work after 30s - skipping reload.');",
    ])

    # ---- R5 register: bridge armed before registering, updateViaCache 'none' ------------------
    reg = doc.find_one('const registration  = await navigator.serviceWorker.register(targets.url, { scope: targets.scope });')
    doc.expect(reg - 1, 'try {')
    doc.expect(reg - 2, '')
    doc.expect(reg - 3, 'if (!targets) return null;')
    doc.expect(reg + 1, 'Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration = registration;')
    doc.expect(reg + 2, 'Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeControllerChange();')
    doc.expect(reg + 3, 'Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeAppInstalled();')
    doc.replace(reg - 2, reg + 2, [
        '',
        pad('        Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeControllerChange();', 'Wire controllerchange -> idle reload, BEFORE registering: it samples whether this page is controlled yet'),
        '',
        '        try {',
        '            // updateViaCache \'none\'. The worker\'s logic is a script the stub imports,',
        '            // and by default (\'imports\') the browser\'s update check - and a new',
        '            // worker\'s install - take imported scripts from the HTTP cache while the',
        '            // host still calls them fresh, so a token bump in the logic file could go',
        '            // unseen for that long: the check compared the unchanged stub and the',
        '            // cached logic and found nothing new. With \'none\' the logic is',
        '            // revalidated with the server on every check, a 304 when it has not',
        '            // changed. A registration made with the default is switched over, and',
        '            // checked, the next time this runs.',
        pad("            const registration  = await navigator.serviceWorker.register(targets.url, { scope: targets.scope, updateViaCache: 'none' });", 'Register service worker', 136),
        pad('            Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration = registration;', 'Persist registration'),
    ])

    return doc.to_bytes()


# =============================================================================================
# WRITE THE STAGED COPIES AND THE PATCH
# =============================================================================================
def write_staged(rel, data):
    dest = os.path.join(PREPARED_ROOT, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as fh:
        fh.write(data)
    return dest


def unified(rel, old: bytes, new: bytes):
    old_lines = old.decode('utf-8').splitlines(keepends=True)
    new_lines = new.decode('utf-8').splitlines(keepends=True)
    return ''.join(difflib.unified_diff(old_lines, new_lines, fromfile=f'a/{rel}', tofile=f'b/{rel}', n=3))


def main():
    live_logic = load_live(REL_LOGIC)
    live_registrar = load_live(REL_REGISTRAR)
    staged_logic = stage_logic(live_logic)
    staged_registrar = stage_registrar(live_registrar)
    p1 = write_staged(REL_LOGIC, staged_logic)
    p2 = write_staged(REL_REGISTRAR, staged_registrar)
    patch = unified(REL_LOGIC, live_logic, staged_logic) + unified(REL_REGISTRAR, live_registrar, staged_registrar)
    with open(PATCH_PATH, 'w', encoding='utf-8', newline='') as fh:
        fh.write(patch)
    for label, live, staged, path in (('logic', live_logic, staged_logic, p1), ('registrar', live_registrar, staged_registrar, p2)):
        print(f'{label}: live {sha1(live)} ({len(live)} B) -> staged {sha1(staged)} ({len(staged)} B)  {path}')
        crlf_n, lf_n = staged.count(b'\r\n'), staged.count(b'\n')
        hi_staged, hi_live = sum(1 for b in staged if b > 127), sum(1 for b in live if b > 127)
        print(f'   staged CRLF={crlf_n} LF={lf_n}  non-ascii-bytes={hi_staged} (live {hi_live})')
    print(f'patch: {PATCH_PATH} ({len(patch)} chars)')


if __name__ == '__main__':
    main()
