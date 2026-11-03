/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - RESIZE
   =============================================================================

   FILE       : PainterlyNPR__Interface__Resize__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Resize
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Drag handles on each side of the sheet: pull the Assets drawer
                wider or narrower on the left, the controls on the right
   CREATED    : 30-Oct-2026 (v0.7.3)

   DESCRIPTION:
   - Each column is already as wide as one CSS variable (--PainterlyNPR_DrawerWidth,
     --PainterlyNPR_PanelWidth, read by the layout's grid); a drag sets that
     variable on the app's root, so the grid, the meta strip and every rule that
     reads it follow. The sheet keeps its 3:2 and grows into what is left; the
     desk's resize observer re-places the point handles.
   - The handles sit in the gutters either side of the stage. The drawer's shows
     only while the drawer is out; the panel's hides while the panel is folded.
     Neither shows in the one-column layout under 1100 px.
   - A double-click, or Home on a focused handle, puts a column back to its
     default; arrow keys move a focused handle (Shift: four times as far).
   - Widths are remembered per viewer (Na__Interface__Resize__Config.json).
   - A drag stops a column growing where the sheet's column would fall under
     StageMin, so the drawing is never squeezed away.

   ============================================================================= */

import ResizeConfig from './Na__Interface__Resize__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Interface__Query  as  $,
    PainterlyNPR__Interface__Ui     as  Ui,
} from './PainterlyNPR__Interface__Dom__.mjs';

// =============================================================================
// REGION | Interface - Resize
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__Resize__Config.json
    // ------------------------------------------------------------
    const RESIZE_ROOT  =  'PainterlyNPR__InterfaceResize__Config';
    const COLUMNS      =  PainterlyNPR__ConfigAccess__Section(ResizeConfig, RESIZE_ROOT, 'Columns', ['Drawer', 'Panel']);
    const LIMITS       =  PainterlyNPR__ConfigAccess__Section(ResizeConfig, RESIZE_ROOT, 'Limits', ['StageMin', 'KeyStep', 'Store']);
    const ELEMENTS     =  Object.freeze({ Drawer: '.PainterlyNPR__AssetDrawer', Panel: '.PainterlyNPR__Panel' });   // <-- The column each handle sizes
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Widths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read and Write the Remembered Widths
    // ------------------------------------------------------------
    function PainterlyNPR__Resize__Stored() {
        try { return JSON.parse(localStorage.getItem(LIMITS.Store) || '{}') || {}; }
        catch (error) { return {}; }                                         // <-- Private window or blocked storage: the default widths
    }

    function PainterlyNPR__Resize__Remember() {
        const widths  =  {};
        for (const key of Object.keys(COLUMNS)) {
            const value  =  Ui.Root.style.getPropertyValue(COLUMNS[key].Variable);
            if (value) widths[key] = parseFloat(value);
        }
        try { localStorage.setItem(LIMITS.Store, JSON.stringify(widths)); }
        catch (error) { /* <-- Not remembered: the drag still works */ }
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Column's Width - clamped to its range and the sheet's minimum
    // ------------------------------------------------------------
    // width null puts the column back to its stylesheet default.
    function PainterlyNPR__Resize__Set(key, width) {
        const column  =  COLUMNS[key];
        if (width === null) {
            Ui.Root.style.removeProperty(column.Variable);
            return;
        }
        const element  =  $(ELEMENTS[key]);
        const stage    =  $('.PainterlyNPR__Stage');
        let w  =  Math.min(column.Max, Math.max(column.Min, width));
        if (element && stage && element.offsetWidth > 0) {
            const room  =  stage.getBoundingClientRect().width - LIMITS.StageMin;   // <-- What the sheet's column can give up
            w  =  Math.min(w, Math.max(column.Min, element.getBoundingClientRect().width + room));
        }
        Ui.Root.style.setProperty(column.Variable, `${Math.round(w)}px`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handles
// -----------------------------------------------------------------------------

    // FUNCTION | One Handle: drag, double-click, keys
    // ------------------------------------------------------------
    function PainterlyNPR__Resize__Handle(key) {
        const column  =  COLUMNS[key];
        const left    =  column.Side === 'Left';
        const handle  =  document.createElement('div');
        handle.className  =  `PainterlyNPR__Resize PainterlyNPR__Resize--${key.toLowerCase()}`;
        handle.tabIndex   =  0;
        handle.title      =  `${column.Label}: drag, or double-click for the default width`;
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical');
        handle.setAttribute('aria-label', column.Label);

        // The column's own edge: the drawer is measured from its left side, the
        // panel from its right, so the edge follows the pointer exactly
        const widthAt  =  (clientX) => {
            const rect  =  $(ELEMENTS[key]).getBoundingClientRect();
            return left ? clientX - rect.left : rect.right - clientX;
        };

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);
            Ui.Root.classList.add('PainterlyNPR--resizing');
            const move  =  (ev) => PainterlyNPR__Resize__Set(key, widthAt(ev.clientX));
            const end   =  () => {
                handle.removeEventListener('pointermove', move);
                Ui.Root.classList.remove('PainterlyNPR--resizing');
                PainterlyNPR__Resize__Remember();
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', end, { once: true });
            handle.addEventListener('pointercancel', end, { once: true });
        });

        handle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            PainterlyNPR__Resize__Set(key, null);
            PainterlyNPR__Resize__Remember();
        });

        handle.addEventListener('keydown', (e) => {
            const step  =  LIMITS.KeyStep * (e.shiftKey ? 4 : 1);
            const now   =  $(ELEMENTS[key]).getBoundingClientRect().width;
            let next;
            if (e.key === 'ArrowLeft') next = left ? now - step : now + step;
            else if (e.key === 'ArrowRight') next = left ? now + step : now - step;
            else if (e.key === 'Home') next = null;
            else return;
            e.preventDefault();
            e.stopPropagation();                                             // <-- Arrow keys here never reach the camera's
            PainterlyNPR__Resize__Set(key, next);
            PainterlyNPR__Resize__Remember();
        });
        return handle;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add the Handles and Restore the Remembered Widths - once, at boot
    // ------------------------------------------------------------
    // After the panel and the drawer are built: a remembered width is clamped
    // against the sheet's column as it now stands.
    function PainterlyNPR__Resize__Wire() {
        const stage  =  $('.PainterlyNPR__Stage');
        if (!stage || stage.querySelector('.PainterlyNPR__Resize')) return;
        for (const key of Object.keys(COLUMNS)) stage.appendChild(PainterlyNPR__Resize__Handle(key));
        const stored  =  PainterlyNPR__Resize__Stored();
        for (const key of Object.keys(COLUMNS)) {
            if (Number.isFinite(stored[key])) Ui.Root.style.setProperty(COLUMNS[key].Variable, `${Math.round(Math.min(COLUMNS[key].Max, Math.max(COLUMNS[key].Min, stored[key])))}px`);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Resize__Set,
        PainterlyNPR__Resize__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
