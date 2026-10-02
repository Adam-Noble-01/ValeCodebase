import io, sys
p = sys.argv[1]
t = open(p, encoding="utf-8").read()
def rep(old, new, count=1):
    global t
    n = t.count(old)
    assert n == count, (n, old[:80])
    t = t.replace(old, new)

rep("""    Na__ModelToggle__BorrowRegistry             : () => ({ token : 1 }),""",
"""    Na__ModelToggle__GetCategoryKeys            : () => Object.keys(S.visibility),
    Na__ModelToggle__BorrowRegistry             : () => ({ token : 1 }),""")
rep("""        if (name === 'Na__ModelToggle__SetCategoryVisibility' && c.args[1] === false && c.args[2] === true) { name = 'HIDE'; args = [ c.args[0] ]; }
        if (name === 'Na__ModelToggle__SetCategoryVisibleByKey' && c.args[1] === false) { name = 'HIDE'; args = [ c.args[0] ]; }""",
"""        if (name === 'Na__ModelToggle__SetCategoryVisibility' && c.args[1] === false && c.args[2] === true) return;   // <-- The hides: compared by what the picture and the end state hold (B8-B10 check the calls)
        if (name === 'Na__ModelToggle__SetCategoryVisibleByKey' && c.args[1] === false) return;
        if (name === 'Na__ModelToggle__GetCategoryKeys') return;""")
rep("""        check(tag + ': no profile-line cache dropped (no design phase staged)', n.invalidations === 0 && o.invalidations === 0);""",
"""        check(tag + ': no extra profile-line cache drop (no design phase staged)', n.invalidations === o.invalidations, [ o.invalidations, n.invalidations ]);""")
rep("""    check('B8.1 Context Layer off: the 8 ValeVision3D context keys, exact and silent', ctxCalls.length === 8 && ctxCalls.every((c) => c.args[1] === false && c.args[2] === true && c.args[0].indexOf('ValeVision__') === 0));""",
"""    check('B8.1 Context Layer off: each LOADED context category, by exact key and silent', J(ctxCalls.map((c) => c.args[0]).sort()) === J([ 'ValeVision__MainBuildingModel__Existing', 'ValeVision__SceneEntourageSilhouette', 'ValeVision__SiteBoundaries', 'ValeVision__Vegetation' ]) && ctxCalls.every((c) => c.args[1] === false && c.args[2] === true), ctxCalls.map((c) => c.args));""")
# B9 rewrite
start = t.index("{   // B9 - the context set")
end = t.index("// -----------------------------------------------------------------------------\n// Part C")
t = t[:start] + r"""{   // B9 - Context Layer off hides what TrueVision3D's token setter would, over every ValeVision3D category key
    const mm   = readFileSync(VVM + '15__ModelLoader/Na__ModelLoader__MultiModel.js', 'utf8');
    const cfg  = readFileSync(VVM + '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__ModelLayers__Config__.json', 'utf8');
    const keys = [ ...new Set([ ...(mm.match(/ValeVision__[A-Za-z0-9_]+/g) || []), ...(cfg.match(/"ValeVision__[A-Za-z0-9_]+"/g) || []).map((s) => s.slice(1, -1)) ]) ].filter((k) => !/__$/.test(k)).sort();
    const tvSrc = execFileSync('git', [ '-C', 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb', 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js' ]).toString('utf8');
    const tvBlock = tvSrc.slice(tvSrc.indexOf('CONTEXT_CATEGORIES = ['), tvSrc.indexOf('];', tvSrc.indexOf('CONTEXT_CATEGORIES = [')));
    const tvContext = (tvBlock.match(/'TrueVision__[A-Za-z0-9_]+'/g) || []).map((s) => s.slice(1, -1).replace(/^TrueVision__/, 'ValeVision__'));
    const tvPlusSilhouette = [ ...tvContext, 'ValeVision__SceneEntourageSilhouette' ];                      // <-- The one declared list difference (WT-04)
    const tvToken = (universe) => universe.filter((k) => tvPlusSilhouette.some((t) => k.toLowerCase().indexOf(t.toLowerCase()) !== -1)).sort();   // <-- TV ModelToggle :444-:460, run over this app's keys
    const hiddenBy = async (mod, universe) => {
        const r = await Run(mod, { before : () => { S.visibility = Object.fromEntries(universe.map((k) => [ k, true ])); }, run : (m) => m.Na__LeSnap__Render2d(planDef, win, { contextLayer : false }, 400, 300, null, 1, null, null) }, 2);
        const pic = r.pictures[0].visibility;
        return { hidden : Object.keys(pic).filter((k) => pic[k] === false).sort(), restored : Object.values(r.end.visibility).every((v) => v === true) };
    };
    check('B9.0 TrueVision3D\'s list at the pin is the 7 keys (no silhouette)', tvContext.length === 7 && !tvContext.includes('ValeVision__SceneEntourageSilhouette'), tvContext);
    const all = await hiddenBy(CAND, keys);
    check('B9.1 every ValeVision3D category key loaded (' + keys.length + '): the new copy hides exactly TrueVision3D\'s token set', J(all.hidden) === J(tvToken(keys)) && all.restored, { hidden : all.hidden, tv : tvToken(keys) });
    const split = [ 'ValeVision__MainBuildingModel__Existing', 'ValeVision__MainBuildingModel__ExistingWalls', 'ValeVision__MainBuildingModel__ExistingRoofs', 'ValeVision__MainBuildingModel__Proposed', 'ValeVision__MainBuildingModel__ProposedWalls', 'ValeVision__SiteBoundaries' ];
    const so = await hiddenBy(OLD, split); const sn = await hiddenBy(CAND, split);
    check('B9.2 (contrast) an export split by tag: the OLD copy left the existing walls and roofs in the picture', !so.hidden.includes('ValeVision__MainBuildingModel__ExistingWalls') && so.hidden.includes('ValeVision__MainBuildingModel__Existing'), so.hidden);
    check('B9.3 ... the new copy takes them out with the existing building, and never the proposal', J(sn.hidden) === J([ 'ValeVision__MainBuildingModel__Existing', 'ValeVision__MainBuildingModel__ExistingRoofs', 'ValeVision__MainBuildingModel__ExistingWalls', 'ValeVision__SiteBoundaries' ]) && sn.restored, sn.hidden);
    // 3047__Doous's own categories (its project.json model list): old and new hide the same set
    const doous = readFileSync('D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json', 'utf8');
    const doousKeys = [ ...new Set((doous.match(/__TrueVision__([A-Za-z0-9]+(?:__[A-Za-z0-9]+)*?)__(?:MeshModel|LineworkModel)__\.glb/g) || []).map((s) => 'ValeVision__' + s.replace(/^__TrueVision__/, '').replace(/__(MeshModel|LineworkModel)__\.glb$/, ''))) ].sort();
    const dO = await hiddenBy(OLD, doousKeys); const dN = await hiddenBy(CAND, doousKeys);
    check('B9.4 3047__Doous\'s ' + doousKeys.length + ' loaded categories: old and new hide exactly the same set', doousKeys.length >= 6 && J(dO.hidden) === J(dN.hidden) && dN.hidden.length === 2, { keys : doousKeys, old : dO.hidden, new : dN.hidden });
}

""" + t[end:]
rep("""import { pathToFileURL } from 'node:url';""", """import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';""")
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
