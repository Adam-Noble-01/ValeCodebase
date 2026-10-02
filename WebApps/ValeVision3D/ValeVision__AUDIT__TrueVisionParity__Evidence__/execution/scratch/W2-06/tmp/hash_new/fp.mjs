
        const flagsOf = (r) => { const s = (r && r.FloorPlan__Styles) || {}; return {
            projectedLinework : s.Styles__ProjectedLinework !== false, hiddenLines : s.Styles__HiddenLines === true, glassOpaque : s.Styles__GlassOpaque === true }; };
        export function Na__FpData__GetFloorPlans() { return globalThis.__PLANS || []; }
        export function Na__FpData__GetCutHeightMm(p) { return Number(p.FloorPlan__CutHeightMm ?? 1200); }
        export function Na__FpData__GetViewDepthMm(p) { const v = p.FloorPlan__ViewDepthMm; return v == null ? null : Number(v); }
        export function Na__FpData__GetStyles(p) { return flagsOf(p); }
        export function Na__FpData__GetExcludeTokens(p) { return Array.isArray(p.FloorPlan__ExcludeCategoryTokens) ? p.FloorPlan__ExcludeCategoryTokens.slice() : null; }