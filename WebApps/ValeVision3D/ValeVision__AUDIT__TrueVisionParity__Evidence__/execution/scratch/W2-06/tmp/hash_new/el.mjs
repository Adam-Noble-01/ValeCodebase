
        const flagsOf = (r) => { const s = (r && r.Elevation__Styles) || {}; return {
            projectedLinework : s.Styles__ProjectedLinework !== false, hiddenLines : s.Styles__HiddenLines === true, glassOpaque : s.Styles__GlassOpaque === true }; };
        export function Na__ElevData__GetElevations() { return globalThis.__ELEVS || []; }
        export function Na__ElevData__GetAxes(e) { const a = (Number(e.Elevation__AzimuthDeg) || 0) * Math.PI / 180;
            return { Right : { x : Math.cos(a), y : 0, z : -Math.sin(a) }, Up : { x : 0, y : 1, z : 0 }, Normal : { x : Math.sin(a), y : 0, z : Math.cos(a) } }; }
        export function Na__ElevData__GetPlaneDistanceMm(e) { const o = e.Elevation__PlaneOriginMm || {}; return Number(o.x || 0) + Number(o.z || 0); }
        export function Na__ElevData__GetViewDepthMm(e) { const v = e.Elevation__ViewDepthMm; return v == null ? null : Number(v); }
        export function Na__ElevData__IsSection(e) { return e.Elevation__Mode === 'section'; }
        export function Na__ElevData__GetStyles(e) { return flagsOf(e); }
        export function Na__ElevData__GetExcludeTokens(e) { return Array.isArray(e.Elevation__ExcludeCategoryTokens) ? e.Elevation__ExcludeCategoryTokens.slice() : null; }