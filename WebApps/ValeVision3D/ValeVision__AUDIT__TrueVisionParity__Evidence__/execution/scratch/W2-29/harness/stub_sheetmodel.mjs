// Stand-in for Na__LayoutEditor__SheetModel__: no sheet open, so no site plan viewport (Vale's case, DR-08 (B)).
export const Na__LeModel__CHANGED_EVENT = 'na-layouteditor-sheets-changed';
export function Na__LeModel__GetActiveSheet() { return null; }
export function Na__LeModel__GetSelectedViewport() { return null; }
export function Na__LeModel__UpdateViewport() { throw new Error('UpdateViewport must not be called with no site plan viewport'); }
export function Na__LeModel__IsSitePlanViewport() { return false; }
