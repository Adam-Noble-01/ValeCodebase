// =============================================================================
// VALEVISION AURA - ENGINE HOST - GROUND CUT
// =============================================================================
//
// FILE       : Na__EngineHost__GroundCut__.js
// NAMESPACE  : Na__EngineHost
// MODULE     : Engine Host - Ground Cut
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Reach PainterlyNPR's ground cut (72__Paper__SheetComposer: the
//              watercolour swish where an elevation is cut off at the ground)
//              and the engine's own right-click menu, for the sheets'
//              elevation viewports
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE ENGINE PAINTS THE SWISH (PainterlyNPR v0.8.13): its kinds, colours,
//   controls, labels, ranges, readouts and defaults all come from there, and
//   nothing of it is copied here (AuraConfig__App__EngineNote).
// - LOADED WHEN FIRST WANTED, through the import map: a pin older than v0.8.13
//   has no 72__Paper__SheetComposer modules, and a static import of a missing
//   file would stop AURA's whole module graph. With such a pin Engine() stays
//   null and the sheets draw elevations with their plain cut, as before.
// - THE MENU IS THE ENGINE'S (80's ContextMenu Open and Close, in the pin since
//   v0.7.0), reached through its namespace. Its stylesheets are linked from the
//   pin when the Assets drawer has not linked them yet; Escape and a press
//   outside close it even before the engine's menu has been wired.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.10)
// - Initial build, at Adam's word: "create a special effect on elevation
//   viewports when they have the bottom handle brought upwards".
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import * as Na__Engine__Menu from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__ContextMenu__.mjs';   // <-- Through its namespace: checked before each use

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__EngineHostGround__State = {
        engine   : null,                         // <-- { Settings, Swish }: the engine's two ground cut modules, once loaded
        loading  : null,                         // <-- The promise of them (null: not asked yet)
        missing  : false,                        // <-- The pin has no ground cut (older than PainterlyNPR v0.8.13)
        closer   : null                          // <-- The listeners that close a menu this host opened
    };

    // MODULE CONSTANTS | The Engine's Ground Cut Modules, and the Stylesheets Its Menu Reads (from the pin's root)
    // ------------------------------------------------------------
    const Na__EngineHostGround__MODULES = {
        Settings : 'PainterlyNPR/72__Paper__SheetComposer/PainterlyNPR__GroundCut__Settings__.mjs',
        Swish    : 'PainterlyNPR/72__Paper__SheetComposer/PainterlyNPR__GroundCut__Swish__.mjs'
    };
    const Na__EngineHostGround__MENU_STYLES = [
        '03__Style__AppStylesheets/PainterlyNPR__CoreUi__Styles__Variables__.css',
        '02__Src__AppModules/80__System__HudOverlay/PainterlyNPR__Hud__Styles__ContextMenu__.css'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Engine's Ground Cut
// -----------------------------------------------------------------------------

    // FUNCTION | Load It (once): resolves to { Settings, Swish }, or null when the pin has none
    // ------------------------------------------------------------
    function Na__EngineHost__GroundCutLoad() {
        const S = Na__EngineHostGround__State;
        if (S.loading) return S.loading;
        S.loading = Promise.all([import(Na__EngineHostGround__MODULES.Settings), import(Na__EngineHostGround__MODULES.Swish)])
            .then(([settings, swish]) => {
                const ok = typeof settings.PainterlyNPR__GroundCut__Resolve === 'function' && typeof swish.PainterlyNPR__GroundCut__Paint === 'function';
                S.engine = ok ? { Settings: settings, Swish: swish } : null;
                S.missing = !ok;
                return S.engine;
            })
            .catch((error) => {
                S.missing = true;
                console.info('[AURA] The engine pinned here has no ground cut (PainterlyNPR v0.8.13): elevations keep their plain cut.', error && error.message);
                return null;
            });
        return S.loading;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Loaded Modules Now ({ Settings, Swish }), Else Null; Missing: the pin has none
    // ------------------------------------------------------------
    function Na__EngineHost__GroundCut() {
        if (!Na__EngineHostGround__State.loading) Na__EngineHost__GroundCutLoad();
        return Na__EngineHostGround__State.engine;
    }

    function Na__EngineHost__GroundCutMissing() {
        return Na__EngineHostGround__State.missing;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Engine's Right-Click Menu
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Link the Menu's Stylesheets From the Pin (those not linked yet)
    // ------------------------------------------------------------
    function Na__EngineHost__LinkMenuStyles() {
        if (typeof import.meta.resolve !== 'function') return;
        const root = new URL('../', import.meta.resolve('PainterlyNPR/'));
        Na__EngineHostGround__MENU_STYLES.forEach((file) => {
            const href = new URL(file, root).href;
            if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href)) return;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.dataset.engineStyles = 'menu';
            document.head.appendChild(link);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Engine's Menu at a Point: items in its form ({ Label, Hint, Action, Checked, Swatch, Submenu, Disabled } ...)
    // ------------------------------------------------------------
    // True when it opened. A press outside it, Escape, a scroll or the window
    // losing focus close it (the engine's own wiring does too, once the 3D
    // Environment has wired it; doing both is harmless).
    // ------------------------------------------------------------
    function Na__EngineHost__OpenMenu(items, x, y, title) {
        if (typeof Na__Engine__Menu.PainterlyNPR__ContextMenu__Open !== 'function') return false;
        Na__EngineHost__LinkMenuStyles();
        Na__Engine__Menu.PainterlyNPR__ContextMenu__Open(items, x, y, title);
        Na__EngineHost__WatchMenu();
        return true;
    }

    function Na__EngineHost__CloseMenu() {
        if (typeof Na__Engine__Menu.PainterlyNPR__ContextMenu__Close === 'function') Na__Engine__Menu.PainterlyNPR__ContextMenu__Close();
        Na__EngineHost__UnwatchMenu();
    }

    function Na__EngineHost__WatchMenu() {
        const S = Na__EngineHostGround__State;
        Na__EngineHost__UnwatchMenu();
        const open = () => typeof Na__Engine__Menu.PainterlyNPR__ContextMenu__IsOpen !== 'function' || Na__Engine__Menu.PainterlyNPR__ContextMenu__IsOpen();
        S.closer = {
            press  : (e) => { if (!open()) { Na__EngineHost__UnwatchMenu(); return; } if (!(e.target.closest && e.target.closest('.PainterlyNPR__ContextMenu'))) Na__EngineHost__CloseMenu(); },
            key    : (e) => { if (e.key === 'Escape' && open()) { e.preventDefault(); Na__EngineHost__CloseMenu(); } },
            away   : () => Na__EngineHost__CloseMenu()
        };
        window.addEventListener('pointerdown', S.closer.press, true);
        window.addEventListener('keydown', S.closer.key, true);
        window.addEventListener('blur', S.closer.away);
        window.addEventListener('resize', S.closer.away);
    }

    function Na__EngineHost__UnwatchMenu() {
        const S = Na__EngineHostGround__State;
        if (!S.closer) return;
        window.removeEventListener('pointerdown', S.closer.press, true);
        window.removeEventListener('keydown', S.closer.key, true);
        window.removeEventListener('blur', S.closer.away);
        window.removeEventListener('resize', S.closer.away);
        S.closer = null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__EngineHost__GroundCutLoad,
        Na__EngineHost__GroundCut,
        Na__EngineHost__GroundCutMissing,
        Na__EngineHost__OpenMenu,
        Na__EngineHost__CloseMenu
    };

// endregion -------------------------------------------------------------------
