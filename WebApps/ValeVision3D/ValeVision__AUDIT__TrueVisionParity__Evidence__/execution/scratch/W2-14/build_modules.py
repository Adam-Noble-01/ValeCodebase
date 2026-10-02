"""W2-14 builder: TrueVision's three site plan client files at b2aa9151 -> ValeVision copies (written to scratch/out).

Every change is an exact, asserted replacement on TrueVision's bytes, so any difference from TV is listed here.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)


def read(name):
    with open(os.path.join(TV, name), 'rb') as fh:
        text = fh.read().decode('utf-8')
    assert '\r\n' not in text
    return text


def sub(text, old, new, count=1):
    found = text.count(old)
    assert found == count, (found, count, old[:120])
    return text.replace(old, new)


def write(name, text):
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(text.encode('utf-8'))
    print('wrote', name, len(text))


RULE = '// -----------------------------------------------------------------------------\n'

# ---------------------------------------------------------------------------------------------------------------------
# 1. GLB PARSER - verbatim; banner and a PORT NOTE block (TV's file has none)
# ---------------------------------------------------------------------------------------------------------------------
g = read('Na__SitePlan__GlbParse__.js')
g = sub(g, '// TRUEVISION3D - SITE PLAN DATA - GLB PARSER\n', '// VALEVISION3D - SITE PLAN DATA - GLB PARSER\n')
g = sub(g, "// - Imported by Na__SitePlan__Store__.js.\n//\n" + RULE + "//\n// DEVELOPMENT LOG:\n",
        "// - Imported by Na__SitePlan__Store__.js.\n//\n" + RULE + "//\n"
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__GlbParse__.js\n"
        "// - Source version: 1.0.0 (TrueVision3D v2.48.0, 14-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-14}}\n"
        "// - Parity        : verbatim, and dormant: ValeVision has no site plan data yet (DR-08 (B)). Taken whole on\n"
        "//                   purpose, overriding TrueVision's composites plan section 3.5 ('a surgical merge of the\n"
        "//                   non-site-plan parts only'), so the site plan store and painter can come across whole.\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none.\n"
        "//\n" + RULE + "//\n// DEVELOPMENT LOG:\n")
write('Na__SitePlan__GlbParse__.js', g)

# ---------------------------------------------------------------------------------------------------------------------
# 2. PANEL - verbatim; banner and PORT NOTE
# ---------------------------------------------------------------------------------------------------------------------
p = read('Na__LayoutEditor__Panel__SitePlanComposites__.js')
p = sub(p, '// TRUEVISION3D - LAYOUT EDITOR - PANEL: SITE PLAN RENDER COMPOSITES\n',
        '// VALEVISION3D - LAYOUT EDITOR - PANEL: SITE PLAN RENDER COMPOSITES\n')
p = sub(p,
        "// PORT NOTE:\n"
        "// - Ported from   : none (TrueVision-only: site plan drawings)\n"
        "// - Parity        : n/a\n"
        "// - Divergences   : n/a\n"
        "// - Back-port     : goes to ValeVision3D with the site plan feature, if that is ever ported\n",
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js\n"
        "// - Source version: 1.0.0 (TrueVision3D v2.89.0, 20-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-14}}\n"
        "// - Parity        : verbatim, and dormant (DR-08 (B)): the mode controller registers it with the viewport\n"
        "//                   convergence (W2-16), and it shows only on a site plan sheet, which a Vale author cannot\n"
        "//                   make while LayoutEditor__Sheet__SitePlanDrawingsEnabled is false. Taken whole on purpose,\n"
        "//                   overriding TrueVision's composites plan section 3.5 ('a surgical merge of the\n"
        "//                   non-site-plan parts only').\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none.\n")
write('Na__LayoutEditor__Panel__SitePlanComposites__.js', p)

# ---------------------------------------------------------------------------------------------------------------------
# 3. STORE - adapted: VV identity, the VV facade, R2 then the repository copy, build token, stems renamed on read
# ---------------------------------------------------------------------------------------------------------------------
s = read('Na__SitePlan__Store__.js')
s = sub(s, '// TRUEVISION3D - SITE PLAN DATA - STORE\n', '// VALEVISION3D - SITE PLAN DATA - STORE\n')

# DESCRIPTION: the NA content folder, the ProjectVision build and the TrueVision literals are ValeVision's here (K2 V2, K3)
s = sub(s,
        "// - A project holds up to TWO site plan stores under 30__TrueVision__AppContent:\n",
        "// - A project holds up to TWO site plan stores in its project folder\n"
        "//   (VaApps/Projects/<folderId>/ on R2, and the repository copy beside it):\n")
s = sub(s,
        "//   Each holds a linework GLB per site plan tag (71-75), a fill GLB for a fill\n"
        "//   tag with faces, and TrueVision__SitePlanData__Manifest__.json, all written\n"
        "//   by the GLB Builder's Site Plan Export.\n",
        "//   Each holds a linework GLB per site plan tag (71-75), a fill GLB for a fill\n"
        "//   tag with faces, and the site plan manifest (the GLB Builder's own name, or\n"
        "//   ValeVision__SitePlanData__Manifest__.json), all written by the GLB\n"
        "//   Builder's Site Plan Export. The exporter's layer stems are renamed to\n"
        "//   ValeVision__SitePlan__ as they are read, as the model loader renames the\n"
        "//   namespace of every model GLB.\n")
s = sub(s,
        "//   (TrueVision__SitePlan__OsMapping) and the existing store's carry a suffix\n"
        "//   (TrueVision__SitePlan__OsMapping@existing). Every viewport saved before the\n",
        "//   (ValeVision__SitePlan__OsMapping) and the existing store's carry a suffix\n"
        "//   (ValeVision__SitePlan__OsMapping@existing). Every viewport saved before the\n")
s = sub(s,
        "//   Both forms still begin TrueVision__SitePlan__, which is what\n",
        "//   Both forms still begin ValeVision__SitePlan__, which is what\n")
s = sub(s,
        "// - WHERE THE LAYER LIST COMES FROM, per store. The ProjectVision build\n",
        "// - WHERE THE LAYER LIST COMES FROM, per store. The project build\n")

# PORT NOTE (TV's file has none): between INTEGRATION and the DEVELOPMENT LOG
s = sub(s,
        "// - Read by the Layout Editor's site plan viewports.\n//\n" + RULE + "//\n// DEVELOPMENT LOG:\n",
        "// - Read by the Layout Editor's site plan viewports.\n//\n" + RULE + "//\n"
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js\n"
        "// - Source version: 1.2.0 (TrueVision3D v2.132.0, 21-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-14}}\n"
        "// - Parity        : adapted, and dormant: ValeVision has no site plan data pipeline yet (DR-08 (B); the\n"
        "//                   pipeline is W5-06, held), so every store resolves empty. Taken whole on purpose,\n"
        "//                   overriding TrueVision's composites plan section 3.5 ('a surgical merge of the\n"
        "//                   non-site-plan parts only'). Everything outside the seams below is TrueVision's.\n"
        "// - Divergences   :\n"
        "//   - Banner and console prefix read ValeVision3D.\n"
        "//   - Where the stores live (DR-29 (A), D-S04a-03): TrueVision's folder names SitePlan__DrawingData__Existing,\n"
        "//     __Proposed and the legacy SitePlan__DrawingData sit directly in ValeVision's project folder,\n"
        "//     VaApps/Projects/<folderId>/, with no content folder between. The folder and its four-digit year are the\n"
        "//     master-index entry the ?project= token names (Na__AppUtils__GetProjectFolderFromUrl / GetYearFromUrl).\n"
        "//     TrueVision's portal CDN base, repository folder and content folder constants are not carried.\n"
        "//   - Transport (W0-12): the R2 URL of a store folder is Na__CfApi__BuildContentCdnUrl's; the repository copy\n"
        "//     of any URL under it is the fallback Na__AppUtils__ResolveAssetUrl names (Na__SpStore__RepoCopy) - the\n"
        "//     Whitecardopedia Flask static path on localhost, tried FIRST as TrueVision tries its repository copy, and\n"
        "//     GitHub Pages on the live site, tried AFTER R2. FolderUrls, Candidates and the remote half of Find are\n"
        "//     built on those two names.\n"
        "//   - Build token: the remote manifest URL carries ValeVision's build version as ?v= (from\n"
        "//     Na__AppUtils__InitBuildManifest), so a sync's new manifest is never served stale by the CDN edge; GLB\n"
        "//     URLs keep TrueVision's export-time ?v=. The local manifest is read unversioned, no-store, as in TrueVision.\n"
        "//   - Manifest names (D-S04a-03): both are read, the shared GLB Builder's own TrueVision__SitePlanData__\n"
        "//     Manifest__.json first (composed from Na__SpStore__EXPORTER_TOKEN), then ValeVision__SitePlanData__\n"
        "//     Manifest__.json, which is Na__SpStore__MANIFEST's value here.\n"
        "//   - Stems renamed on read (S04a-V04): a layer stem TrueVision__SitePlan__X is read as ValeVision__SitePlan__X\n"
        "//     (Na__SpStore__VvStem), as the model loader renames model GLB namespaces, so category keys and the red\n"
        "//     line stem begin ValeVision__SitePlan__, the prefix SheetRecords and EdgeStyles test. A ValeVision__ stem\n"
        "//     is read as it is.\n"
        "//   - DESCRIPTION names the project folder, the project build and ValeVision__ stems where TrueVision's\n"
        "//     names its content folder, its ProjectVision build and TrueVision__ stems.\n"
        "//   - Private helpers only this app has: Na__SpStore__VvStem, Na__SpStore__RepoCopy, Na__SpStore__RemoteUrls;\n"
        "//     no export is added or removed.\n"
        "//   - TODO(OVH-MIGRATION): the R2 / GitHub Pages candidates and the localhost test go when ValeVision moves to\n"
        "//     the single OVH VPS (October 2026); the store then reads the same-origin copy only. Not built here.\n"
        "// - Back-port     : none (the folder layout, the transport and the stem rename are the seam; an exporter token in\n"
        "//                   config could be offered with DR-42).\n"
        "//\n" + RULE + "//\n// DEVELOPMENT LOG:\n")

# Imports: the VV facade and ProjectLoader names (all exported in VV)
s = sub(s,
        "    // MODULE IMPORTS | Project Data, Project URL and the GLB Parser\n"
        "    // ------------------------------------------------------------\n"
        "    import { Na__CfApi__GetLoadedProjectData } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n"
        "    import {\n"
        "        Na__AppUtils__IsRunningOnLocalhost,\n"
        "        Na__AppUtils__GetProjectFolderFromUrl,\n"
        "        Na__AppUtils__GetYearFromUrl\n"
        "    } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';\n",
        "    // MODULE IMPORTS | Project Data, Project URL and the GLB Parser\n"
        "    // ------------------------------------------------------------\n"
        "    import { Na__CfApi__GetLoadedProjectData, Na__CfApi__BuildContentCdnUrl } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';\n"
        "    import {\n"
        "        Na__AppUtils__IsRunningOnLocalhost,\n"
        "        Na__AppUtils__GetProjectFolderFromUrl,\n"
        "        Na__AppUtils__GetYearFromUrl,\n"
        "        Na__AppUtils__InitBuildManifest,\n"
        "        Na__AppUtils__ResolveAssetUrl\n"
        "    } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';\n")

# Constants: no NA base, repository folder or content folder; VV manifest name, exporter token, stem prefix
s = sub(s,
        "    // MODULE CONSTANTS | Event, Project Data Keys and Paths (mirror the build and Na__AppUtils__ProjectLoader)\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__SpStore__CHANGED_EVENT = 'na-siteplan-store-changed';\n"
        "    const Na__SpStore__DATA_KEY      = 'SitePlan__DataStore';                   // <-- Legacy single-store key (ProjectVision 0.2.0)\n"
        "    const Na__SpStore__DATA_KEY_MANY = 'SitePlan__DataStores';                  // <-- Array of stores\n"
        "    const Na__SpStore__CDN_BASE      = 'https://cdn.noble-architecture.com/NaProjectPortal';\n"
        "    const Na__SpStore__PORTAL_DIR    = 'na-project-portal';                     // <-- Repository folder the projects live under\n"
        "    const Na__SpStore__CONTENT_DIR   = '30__TrueVision__AppContent';\n"
        "    const Na__SpStore__FOLDER        = 'SitePlan__DrawingData';                 // <-- The original single folder, read as Proposed\n"
        "    const Na__SpStore__MANIFEST      = 'TrueVision__SitePlanData__Manifest__.json';\n"
        "    const Na__SpStore__SCHEMA        = 1;                                       // <-- Manifest schema this module reads\n"
        "    const Na__SpStore__RED_LINE_STEM = 'TrueVision__SitePlan__RedLineBoundary'; // <-- The layer a new viewport centres on\n"
        "    // ------------------------------------------------------------\n",
        "    // MODULE CONSTANTS | Event, Project Data Keys and Paths (mirror the build and Na__AppUtils__ProjectLoader)\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__SpStore__CHANGED_EVENT = 'na-siteplan-store-changed';\n"
        "    const Na__SpStore__DATA_KEY      = 'SitePlan__DataStore';                   // <-- Legacy single-store key (ProjectVision 0.2.0)\n"
        "    const Na__SpStore__DATA_KEY_MANY = 'SitePlan__DataStores';                  // <-- Array of stores\n"
        "    const Na__SpStore__FOLDER        = 'SitePlan__DrawingData';                 // <-- The original single folder, read as Proposed\n"
        "    const Na__SpStore__MANIFEST      = 'ValeVision__SitePlanData__Manifest__.json';\n"
        "    const Na__SpStore__SCHEMA        = 1;                                       // <-- Manifest schema this module reads\n"
        "    const Na__SpStore__RED_LINE_STEM = 'ValeVision__SitePlan__RedLineBoundary'; // <-- The layer a new viewport centres on\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "    // MODULE CONSTANTS | The Shared Exporter's Names, and This App's (ValeVision only)\n"
        "    // ------------------------------------------------------------\n"
        "    // The GLB Builder's Site Plan Export is shared with TrueVision and writes\n"
        "    // its own token into the manifest name and every layer stem. Both are\n"
        "    // read here and the stems take this app's token, so one constant names\n"
        "    // the exporter and one names this app's stem prefix.\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__SpStore__EXPORTER_TOKEN = 'TrueVision';                          // <-- The token the shared exporter writes\n"
        "    const Na__SpStore__STEM_PREFIX    = 'ValeVision__SitePlan__';              // <-- Every site plan category key here begins with this\n"
        "    const Na__SpStore__EXPORTER_STEM  = new RegExp('^' + Na__SpStore__EXPORTER_TOKEN + '__SitePlan__');\n"
        "    const Na__SpStore__MANIFESTS      = [                                      // <-- Tried in order in every folder\n"
        "        Na__SpStore__EXPORTER_TOKEN + '__SitePlanData__Manifest__.json',\n"
        "        Na__SpStore__MANIFEST\n"
        "    ];\n"
        "    // ------------------------------------------------------------\n")

# Helpers: FolderUrls on the facade, Candidates on the repository copy (R2 first on the live site)
s = sub(s,
        "    // HELPER FUNCTION | One Store's Folder URLs: [{ folder, local, cdn }] (local only on localhost; [] with no project)\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__FolderUrls(storeId) {\n"
        "        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();\n"
        "        if (!projectFolder) return [];\n"
        "        const year = Na__AppUtils__GetYearFromUrl();\n"
        "        const onLocalhost = Na__AppUtils__IsRunningOnLocalhost();\n"
        "\n"
        "        return Na__SpStore__Def(storeId).Store__Folders.map((folder) => {\n"
        "            const path = `${year}-Projects/${projectFolder}/${Na__SpStore__CONTENT_DIR}/${folder}`;\n"
        "            return {\n"
        "                folder : folder,\n"
        "                local  : onLocalhost ? `${window.location.origin}/${Na__SpStore__PORTAL_DIR}/${path}` : null,\n"
        "                cdn    : `${Na__SpStore__CDN_BASE}/${path}`\n"
        "            };\n"
        "        });\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | Where One File Is Read From, In Order\n"
        "    // ------------------------------------------------------------\n"
        "    // On localhost a CDN URL is tried first as the repository copy the export\n"
        "    // wrote, then on the CDN itself; anywhere else only the URL given.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__Candidates(url) {\n"
        "        if (!url) return [];\n"
        "        const list = [];\n"
        "        if (Na__AppUtils__IsRunningOnLocalhost() && url.indexOf(Na__SpStore__CDN_BASE + '/') === 0) {\n"
        "            list.push(`${window.location.origin}/${Na__SpStore__PORTAL_DIR}/` + url.slice(Na__SpStore__CDN_BASE.length + 1));\n"
        "        }\n"
        "        list.push(url);\n"
        "        return list;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n",
        "    // HELPER FUNCTION | A Layer Stem in This App's Token (ValeVision only)\n"
        "    // ------------------------------------------------------------\n"
        "    // The exporter's TrueVision stems are read as ValeVision__SitePlan__<X>,\n"
        "    // as the model loader reads every model GLB's namespace. A stem already\n"
        "    // in this app's token, or any other, is read as it is.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__VvStem(stem) {\n"
        "        return (typeof stem === 'string') ? stem.replace(Na__SpStore__EXPORTER_STEM, Na__SpStore__STEM_PREFIX) : stem;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | The Repository Copy of One of This Project's R2 URLs, or null (ValeVision only)\n"
        "    // ------------------------------------------------------------\n"
        "    // TODO(OVH-MIGRATION): the R2 URL and its GitHub Pages / localhost twin are\n"
        "    // the pre-VPS transport; on the VPS the same-origin copy is the only one.\n"
        "    // A URL under this project's VaApps/Projects/<folderId>/ on R2 has a twin\n"
        "    // at the same relative path in the repository copy, which\n"
        "    // Na__AppUtils__ResolveAssetUrl names as its fallback: the Whitecardopedia\n"
        "    // Flask static path on localhost, GitHub Pages on the live site. Any\n"
        "    // other URL has none.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__RepoCopy(url) {\n"
        "        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();\n"
        "        const year          = Na__AppUtils__GetYearFromUrl();\n"
        "        if (!url || !projectFolder || !year) return null;\n"
        "        const prefix = Na__CfApi__BuildContentCdnUrl(projectFolder, year, '');  // <-- .../VaApps/Projects/<folderId>/ (segments encoded)\n"
        "        if (url.indexOf(prefix) !== 0) return null;\n"
        "        const folderId = encodeURIComponent(year) + '/' + encodeURIComponent(projectFolder);\n"
        "        return Na__AppUtils__ResolveAssetUrl(folderId, url.slice(prefix.length)).fallback;\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | One Store's Folder URLs: [{ folder, local, cdn }] (local only on localhost; [] with no project)\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__FolderUrls(storeId) {\n"
        "        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();\n"
        "        if (!projectFolder) return [];\n"
        "        const year = Na__AppUtils__GetYearFromUrl();\n"
        "        const onLocalhost = Na__AppUtils__IsRunningOnLocalhost();\n"
        "\n"
        "        return Na__SpStore__Def(storeId).Store__Folders.map((folder) => {\n"
        "            const cdn = Na__CfApi__BuildContentCdnUrl(projectFolder, year, folder);   // <-- VaApps/Projects/<folderId>/<folder> on the CDN\n"
        "            return {\n"
        "                folder : folder,\n"
        "                local  : onLocalhost ? Na__SpStore__RepoCopy(cdn) : null,         // <-- The repository copy the local server serves\n"
        "                cdn    : cdn\n"
        "            };\n"
        "        });\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | Where One File Is Read From, In Order\n"
        "    // ------------------------------------------------------------\n"
        "    // On localhost a CDN URL is tried first as the repository copy the export\n"
        "    // wrote, then on the CDN itself. On the live site the CDN comes first and\n"
        "    // the repository copy on GitHub Pages after it. A URL that is not under\n"
        "    // this project's folder is read only as given.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__Candidates(url) {\n"
        "        if (!url) return [];\n"
        "        const copy = Na__SpStore__RepoCopy(url);\n"
        "        if (!copy) return [ url ];\n"
        "        return Na__AppUtils__IsRunningOnLocalhost() ? [ copy, url ] : [ url, copy ];\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // HELPER FUNCTION | A Remote Manifest URL and Its Fallback, With the Build Token (ValeVision only)\n"
        "    // ------------------------------------------------------------\n"
        "    // On localhost the repository copy has already been read, unversioned,\n"
        "    // so only the CDN is left; on the live site the CDN, then GitHub Pages.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__SpStore__RemoteUrls(url, buildToken) {\n"
        "        const versioned = Na__SpStore__Versioned(url, buildToken);\n"
        "        return Na__AppUtils__IsRunningOnLocalhost() ? [ versioned ] : Na__SpStore__Candidates(versioned);\n"
        "    }\n"
        "    // ------------------------------------------------------------\n")

# Layer: stems in this app's token
s = sub(s, "        const stem  = raw.Layer__CategoryKey;\n",
        "        const stem  = Na__SpStore__VvStem(raw.Layer__CategoryKey);              // <-- ValeVision__SitePlan__<X>, whichever token the exporter wrote\n")

# Find: both manifest names, the remote half over R2 then the repository copy, with the build token
s = sub(s,
        "        const fromManifest = async (manifestUrl, folderUrl) => {\n"
        "            try {\n"
        "                const manifest = await Na__SpStore__FetchFirst([ manifestUrl ], true);\n",
        "        const fromManifest = async (manifestUrls, folderUrl) => {\n"
        "            const manifestUrl = manifestUrls[0];\n"
        "            try {\n"
        "                const manifest = await Na__SpStore__FetchFirst(manifestUrls, true);\n")
s = sub(s,
        "        for (const folderUrl of folderUrls) {                                   // <-- Named folder first, then the original one\n"
        "            if (!folderUrl.local) continue;\n"
        "            const local = await fromManifest(`${folderUrl.local}/${Na__SpStore__MANIFEST}`, folderUrl);\n"
        "            if (local) return { descriptor : local, note : null };\n"
        "        }\n",
        "        for (const folderUrl of folderUrls) {                                   // <-- Named folder first, then the original one\n"
        "            if (!folderUrl.local) continue;\n"
        "            for (const manifestName of Na__SpStore__MANIFESTS) {                // <-- The exporter's name first, then this app's\n"
        "                const local = await fromManifest([ `${folderUrl.local}/${manifestName}` ], folderUrl);\n"
        "                if (local) return { descriptor : local, note : null };\n"
        "            }\n"
        "        }\n")
s = sub(s,
        "        if (folderUrls.length) {\n"
        "            for (const folderUrl of folderUrls) {\n"
        "                const remote = await fromManifest(`${folderUrl.cdn}/${Na__SpStore__MANIFEST}`, folderUrl);\n"
        "                if (remote) return { descriptor : remote, note : null };\n"
        "            }\n"
        "        } else {\n",
        "        if (folderUrls.length) {\n"
        "            const buildToken = await Na__AppUtils__InitBuildManifest();         // <-- Memoised, never throws; '' leaves the URL as it is\n"
        "            for (const folderUrl of folderUrls) {\n"
        "                for (const manifestName of Na__SpStore__MANIFESTS) {\n"
        "                    const remote = await fromManifest(Na__SpStore__RemoteUrls(`${folderUrl.cdn}/${manifestName}`, buildToken), folderUrl);\n"
        "                    if (remote) return { descriptor : remote, note : null };\n"
        "                }\n"
        "            }\n"
        "        } else {\n")

# Console prefix (K2 C1)
s = sub(s, "[TrueVision3D]", "[ValeVision3D]", count=s.count("[TrueVision3D]"))
write('Na__SitePlan__Store__.js', s)

# Leak guard: outside the PORT NOTE and DEVELOPMENT LOG nothing of TrueVision's or NA's identity remains
for name, text in (('GlbParse', g), ('Panel', p), ('Store', s)):
    head, rest = text.split('// DEVELOPMENT LOG:', 1)
    body = rest.split('// =============================================================================', 1)[1]
    pre = head.split('// PORT NOTE:')[0]
    for bad in ('TrueVision__', 'TRUEVISION3D', '[TrueVision3D', 'NaProjectPortal', '30__TrueVision', 'na-project-portal', 'noble-architecture.com'):
        assert bad not in pre and bad not in body, (name, bad)
print('leak guard ok')
