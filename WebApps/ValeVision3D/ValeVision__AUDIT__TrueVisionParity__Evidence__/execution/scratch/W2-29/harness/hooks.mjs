// W2-29 harness: redirect the Patterns panel's editor imports to recording stubs.
// The hatch library module is the REAL ValeVision one (landed by W1-17), whichever panel is loaded.
const HERE = new URL('./', import.meta.url);
const VV_HATCH = process.env.W229_VV_HATCH;      // file URL of the live VV HatchPatterns module

export async function resolve(specifier, context, next) {
    if (specifier.endsWith('/Na__LayoutEditor__PanelHost__.js'))   return { url : new URL('stub_panelhost.mjs', HERE).href, shortCircuit : true };
    if (specifier.endsWith('/Na__LayoutEditor__SheetModel__.js'))  return { url : new URL('stub_sheetmodel.mjs', HERE).href, shortCircuit : true };
    if (specifier.endsWith('/Na__LayoutEditor__ConfigState__.js')) return { url : new URL('stub_configstate.mjs', HERE).href, shortCircuit : true };
    if (specifier.endsWith('/Na__SitePlan__Store__.js'))           return { url : new URL('stub_spstore.mjs', HERE).href, shortCircuit : true };
    if (specifier.endsWith('Na__LayoutEditor__HatchPatterns__.js') && VV_HATCH) return { url : VV_HATCH, shortCircuit : true };
    return next(specifier, context);
}
