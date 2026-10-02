// W1-02 smoke check (read-only) - paste into the page console, or run with the browser
// javascript tool, once http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous
// has loaded its models. It imports the SAME module instance the app uses (same URL, no query),
// so the registry it reads is the live one. Nothing is changed: DescribeDoors registers nothing
// and adds no listener.
//
// Expected: { registered: n > 0 (Doous ships ProposedDoors mesh + linework GLBs), described: n,
//             allRegistryOwn: true, exportsOk: true }
// The click checks are by hand: a stationary LEFT click on a door toggles it; a stationary RIGHT
// or MIDDLE click leaves it as it was (right-drag still pans).
(async () => {
    const m = await import('/ValeVision3D/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js');
    const reg = m.Na__DoorAnim__DoorRegistry;
    const rootOf = (obj, type) => { let o = obj; while (o && !(o.userData && o.userData.Na__ModelType === type)) o = o.parent; return o || null; };
    const meshGroups = [ ...new Set([ ...reg.values() ].map((r) => rootOf(r.adrObjectMesh, 'mesh')).filter(Boolean)) ];
    const lineGroups = [ ...new Set([ ...reg.values() ].map((r) => rootOf(r.adrObjectLinework, 'linework')).filter(Boolean)) ];
    const records = m.Na__DoorAnim__DescribeDoors(meshGroups, lineGroups);
    const want = [ 'Na__DoorAnim__ApplyPanelTransform', 'Na__DoorAnim__ComputePanelLocalPose', 'Na__DoorAnim__DescribeDoors',
                   'Na__DoorAnim__FindAdrAncestor', 'Na__DoorAnim__GetLiveProgress', 'Na__DoorAnim__IsDoorOpen',
                   'Na__DoorAnim__MOD_TYPE_FIXED', 'Na__DoorAnim__MOD_TYPE_MVE_ONLY', 'Na__DoorAnim__MOD_TYPE_ROT_MVE',
                   'Na__DoorAnim__MOD_TYPE_ROT_ONLY', 'Na__DoorAnim__ResolveHitPanel', 'Na__DoorAnimation__GetBaseDurationMs',
                   'Na__DoorAnimation__GetSpeedScale', 'Na__DoorAnimation__SetSpeedScale', 'Na__DoorAnimation__SnapAllClosed' ];
    return {
        registered     : reg.size,
        described      : records.length,
        allRegistryOwn : records.length === reg.size && records.every((r) => reg.get(r.adrName) === r),
        exportsOk      : want.every((k) => k in m) && Object.keys(m).length === 23
    };
})();
