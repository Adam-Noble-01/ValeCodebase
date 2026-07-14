// =============================================================================
// VALEVISION3D - CROSS SECTION VIEW UI CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__CrossSectionView__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : Cross Section View - UI Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire the Tools menu Cross Section dropdown to the system logic
// CREATED    : 14-Jul-2026
//
// DESCRIPTION:
// - Initialises the Cross Section sub-panel inside the Tools dropdown (placed
//   directly after the Elevation View section).
// - The whole menu item stays hidden until the feature is enabled — either
//   from project.json (CrossSection__Config, via the loading sequence event)
//   or live from the Dev Tools menu.
// - Wires: Upright/Plan mode toggle, face-click placement, slice depth (m),
//   the global "Show Section Planes" toggle, per-section rows (Flip / Hide /
//   Delete), and the Advanced style panel.
// - Listens for 'na-crosssection-state-changed' to rebuild the section list
//   and keep inputs in sync with the system state.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Jul-2026 - Version 1.1.0
// - Replaced Plan/X/Z spawn buttons with Upright/Plan mode toggle + face pick.
// - Added slice depth (metres) input; blank = infinite SketchUp cut.
//
// 14-Jul-2026 - Version 1.0.0
// - Initial implementation as part of the cross section tool.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Cross Section System Logic
    // ------------------------------------------------------------
    import {
        Na__CrossSection__Initialize,
        Na__CrossSection__ApplyProjectConfig,
        Na__CrossSection__IsFeatureEnabled,
        Na__CrossSection__StartFaceSelection,
        Na__CrossSection__TogglePlacementMode,
        Na__CrossSection__GetPlacementMode,
        Na__CrossSection__SetSliceDepthM,
        Na__CrossSection__RemoveSection,
        Na__CrossSection__FlipSection,
        Na__CrossSection__SetGizmosVisible,
        Na__CrossSection__SetSectionGizmoVisible,
        Na__CrossSection__SetSectionEnabled,
        Na__CrossSection__SetFillColor,
        Na__CrossSection__SetLineColor,
        Na__CrossSection__SetLineWidth,
        Na__CrossSection__ResetAppearance
    } from './Na__CrossSectionView__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__SectUi__MENU_ITEM_ID       = 'naCrossSectionMenuItem';
    const Na__SectUi__TOGGLE_BTN_ID      = 'naCrossSectionToggle';
    const Na__SectUi__PANEL_ID           = 'naCrossSectionPanel';
    const Na__SectUi__MODE_TOGGLE_ID     = 'naCrossSectionModeToggle';
    const Na__SectUi__SELECT_FACE_ID     = 'naCrossSectionSelectFace';
    const Na__SectUi__SLICE_DEPTH_ID     = 'naCrossSectionSliceDepth';
    const Na__SectUi__GIZMO_TOGGLE_ID    = 'naCrossSectionGizmoToggle';
    const Na__SectUi__LIST_WRAP_ID       = 'naCrossSectionListWrap';
    const Na__SectUi__LIST_ID            = 'naCrossSectionList';
    const Na__SectUi__FILL_COLOR_ID      = 'naCrossSectionFillColor';
    const Na__SectUi__LINE_COLOR_ID      = 'naCrossSectionLineColor';
    const Na__SectUi__LINE_WIDTH_ID      = 'naCrossSectionLineWidth';
    const Na__SectUi__LINE_WIDTH_VAL_ID  = 'naCrossSectionLineWidthValue';
    const Na__SectUi__RESET_STYLE_ID     = 'naCrossSectionResetStyle';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Mode Labels
    // ------------------------------------------------------------
    const Na__SectUi__MODE_LABELS = {
        UPRIGHT : 'Mode: Upright Section',
        PLAN    : 'Mode: Plan Section'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Eye Toggle Icons (Section Cutting On/Off)
    // ------------------------------------------------------------
    const Na__SectUi__EYE_ON_ICON  = '\u{1F441}';                              // <-- 👁  Section is actively cutting
    const Na__SectUi__EYE_OFF_ICON = '\u{1F6AB}';                              // <-- 🚫  Section cutting turned off
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Reference Cache
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached DOM Elements
    // ------------------------------------------------------------
    let Na__SectUi__MenuItem     = null;
    let Na__SectUi__Panel        = null;
    let Na__SectUi__ModeToggle   = null;
    let Na__SectUi__SelectFace   = null;
    let Na__SectUi__SliceDepth   = null;
    let Na__SectUi__GizmoToggle  = null;
    let Na__SectUi__ListWrap     = null;
    let Na__SectUi__List         = null;
    let Na__SectUi__FillColor    = null;
    let Na__SectUi__LineColor    = null;
    let Na__SectUi__LineWidth    = null;
    let Na__SectUi__LineWidthVal = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menu Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Show / Hide the Cross Section Tools Menu Section
    // ------------------------------------------------------------
    function Na__UiFeature__CrossSection__SetMenuVisible(visible) {
        if (!Na__SectUi__MenuItem) Na__SectUi__MenuItem = document.getElementById(Na__SectUi__MENU_ITEM_ID);
        if (!Na__SectUi__MenuItem) return;
        Na__SectUi__MenuItem.style.display = visible ? '' : 'none';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section List Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Small Row Action Button
    // ------------------------------------------------------------
    function Na__SectUi__BuildRowButton(label, title, onClick) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.textContent = label;
        button.title       = title;
        button.style.cssText = 'padding:2px 7px;border:1px solid rgba(0,0,0,0.15);border-radius:4px;'
            + 'background:#fff;color:#172b3a;font-family:"Open Sans",sans-serif;font-size:0.72rem;cursor:pointer;';
        button.addEventListener('click', onClick);
        return button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Active Section Rows
    // ------------------------------------------------------------
    function Na__SectUi__RebuildSectionList(sections) {
        if (!Na__SectUi__List || !Na__SectUi__ListWrap) return;

        Na__SectUi__List.textContent = '';
        Na__SectUi__ListWrap.style.display = (sections.length > 0) ? '' : 'none';

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const isEnabled = section.enabled !== false;

            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:3px 0;'
                + (isEnabled ? '' : 'opacity:0.5;');                            // <-- Dim the whole row while cutting is off

            const name = document.createElement('span');
            name.textContent   = section.name;
            name.style.cssText = 'flex:1;font-family:"Open Sans",sans-serif;font-size:0.78rem;color:#172b3a;';
            row.appendChild(name);

            row.appendChild(Na__SectUi__BuildRowButton(
                isEnabled ? Na__SectUi__EYE_ON_ICON : Na__SectUi__EYE_OFF_ICON,
                isEnabled ? 'Turn this section cut off' : 'Turn this section cut on',
                () => { Na__CrossSection__SetSectionEnabled(section.id, !isEnabled); }
            ));

            row.appendChild(Na__SectUi__BuildRowButton('⇄', 'Flip cut direction', () => {
                Na__CrossSection__FlipSection(section.id);
            }));

            row.appendChild(Na__SectUi__BuildRowButton(section.gizmoVisible ? 'Hide' : 'Show', 'Toggle this section plane widget', () => {
                Na__CrossSection__SetSectionGizmoVisible(section.id, !section.gizmoVisible);
            }));

            row.appendChild(Na__SectUi__BuildRowButton('✕', 'Delete this section cut', () => {
                Na__CrossSection__RemoveSection(section.id);
            }));

            Na__SectUi__List.appendChild(row);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync Mode Toggle + Select Face Button Labels
    // ------------------------------------------------------------
    function Na__SectUi__SyncPlacementUi(detail) {
        const mode = detail.placementMode || Na__CrossSection__GetPlacementMode() || 'UPRIGHT';
        if (Na__SectUi__ModeToggle) {
            Na__SectUi__ModeToggle.textContent = Na__SectUi__MODE_LABELS[mode] || Na__SectUi__MODE_LABELS.UPRIGHT;
        }
        if (Na__SectUi__SelectFace) {
            const selecting = detail.isSelecting === true;
            Na__SectUi__SelectFace.disabled = selecting;
            Na__SectUi__SelectFace.textContent = selecting ? 'Click a Face…' : 'Select Section Face';
        }
        if (Na__SectUi__SliceDepth && document.activeElement !== Na__SectUi__SliceDepth) {
            const depth = detail.sliceDepthM;
            Na__SectUi__SliceDepth.value = (depth === null || depth === undefined) ? '' : String(depth);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Cross Section State Changed Event
    // ------------------------------------------------------------
    function Na__SectUi__OnStateChanged(event) {
        const detail = event.detail || {};

        Na__UiFeature__CrossSection__SetMenuVisible(detail.featureEnabled === true);
        Na__SectUi__RebuildSectionList(detail.sections || []);
        Na__SectUi__SyncPlacementUi(detail);

        if (Na__SectUi__GizmoToggle) Na__SectUi__GizmoToggle.checked = detail.gizmosVisible !== false;

        const appearance = detail.appearance;
        if (appearance) {
            if (Na__SectUi__FillColor && Na__SectUi__FillColor.value !== appearance.fillColor) Na__SectUi__FillColor.value = appearance.fillColor;
            if (Na__SectUi__LineColor && Na__SectUi__LineColor.value !== appearance.lineColor) Na__SectUi__LineColor.value = appearance.lineColor;
            if (Na__SectUi__LineWidth) Na__SectUi__LineWidth.value = String(appearance.lineWidthPx);
            if (Na__SectUi__LineWidthVal) Na__SectUi__LineWidthVal.textContent = `${appearance.lineWidthPx.toFixed(1)} px`;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Cross Section View UI Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeCrossSectionControls(scene, camera, renderer, controls, pipelineRef, modelRoot) {

        Na__SectUi__MenuItem     = document.getElementById(Na__SectUi__MENU_ITEM_ID);
        const toggleBtn          = document.getElementById(Na__SectUi__TOGGLE_BTN_ID);
        Na__SectUi__Panel        = document.getElementById(Na__SectUi__PANEL_ID);
        Na__SectUi__ModeToggle   = document.getElementById(Na__SectUi__MODE_TOGGLE_ID);
        Na__SectUi__SelectFace   = document.getElementById(Na__SectUi__SELECT_FACE_ID);
        Na__SectUi__SliceDepth   = document.getElementById(Na__SectUi__SLICE_DEPTH_ID);
        Na__SectUi__GizmoToggle  = document.getElementById(Na__SectUi__GIZMO_TOGGLE_ID);
        Na__SectUi__ListWrap     = document.getElementById(Na__SectUi__LIST_WRAP_ID);
        Na__SectUi__List         = document.getElementById(Na__SectUi__LIST_ID);
        Na__SectUi__FillColor    = document.getElementById(Na__SectUi__FILL_COLOR_ID);
        Na__SectUi__LineColor    = document.getElementById(Na__SectUi__LINE_COLOR_ID);
        Na__SectUi__LineWidth    = document.getElementById(Na__SectUi__LINE_WIDTH_ID);
        Na__SectUi__LineWidthVal = document.getElementById(Na__SectUi__LINE_WIDTH_VAL_ID);
        const resetStyleBtn      = document.getElementById(Na__SectUi__RESET_STYLE_ID);

        if (!Na__SectUi__MenuItem || !toggleBtn || !Na__SectUi__Panel) {
            console.warn('[ValeVision3D] Cross Section DOM elements not found');
            return;
        }

        Na__CrossSection__Initialize(scene, camera, renderer, controls, pipelineRef, modelRoot);

        toggleBtn.addEventListener('click', () => {
            const isOpen = Na__SectUi__Panel.classList.contains('is-open');
            Na__SectUi__Panel.classList.toggle('is-open', !isOpen);
        });

        // PLACEMENT MODE TOGGLE | Upright <-> Plan
        if (Na__SectUi__ModeToggle) {
            Na__SectUi__ModeToggle.addEventListener('click', () => {
                Na__CrossSection__TogglePlacementMode();
            });
        }

        // FACE PICK | Elevation-style click to place section
        if (Na__SectUi__SelectFace) {
            Na__SectUi__SelectFace.addEventListener('click', () => {
                Na__CrossSection__StartFaceSelection();
            });
        }

        // SLICE DEPTH | Empty / 0 = infinite half-space cut
        if (Na__SectUi__SliceDepth) {
            const applySliceDepth = () => {
                const raw = Na__SectUi__SliceDepth.value.trim();
                if (raw === '') {
                    Na__CrossSection__SetSliceDepthM(null);
                    return;
                }
                Na__CrossSection__SetSliceDepthM(parseFloat(raw));
            };
            Na__SectUi__SliceDepth.addEventListener('change', applySliceDepth);
            Na__SectUi__SliceDepth.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') applySliceDepth();
            });
        }

        if (Na__SectUi__GizmoToggle) {
            Na__SectUi__GizmoToggle.addEventListener('change', () => {
                Na__CrossSection__SetGizmosVisible(Na__SectUi__GizmoToggle.checked);
            });
        }

        if (Na__SectUi__FillColor) {
            Na__SectUi__FillColor.addEventListener('input', () => {
                Na__CrossSection__SetFillColor(Na__SectUi__FillColor.value);
            });
        }
        if (Na__SectUi__LineColor) {
            Na__SectUi__LineColor.addEventListener('input', () => {
                Na__CrossSection__SetLineColor(Na__SectUi__LineColor.value);
            });
        }
        if (Na__SectUi__LineWidth) {
            Na__SectUi__LineWidth.addEventListener('input', () => {
                const width = parseFloat(Na__SectUi__LineWidth.value);
                Na__CrossSection__SetLineWidth(width);
                if (Na__SectUi__LineWidthVal) Na__SectUi__LineWidthVal.textContent = `${width.toFixed(1)} px`;
            });
        }
        if (resetStyleBtn) {
            resetStyleBtn.addEventListener('click', () => {
                Na__CrossSection__ResetAppearance();
            });
        }

        window.addEventListener('na-crosssection-state-changed', Na__SectUi__OnStateChanged);

        window.addEventListener('na-crosssection-config-loaded', (event) => {
            const config = event.detail && event.detail.crossSectionConfig;
            if (config) Na__CrossSection__ApplyProjectConfig(config);
        });

        Na__UiFeature__CrossSection__SetMenuVisible(Na__CrossSection__IsFeatureEnabled());
        Na__SectUi__SyncPlacementUi({
            placementMode : Na__CrossSection__GetPlacementMode(),
            isSelecting   : false,
            sliceDepthM   : null
        });

        console.log('[ValeVision3D] Cross Section View UI controls initialized');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Cross Section View Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeCrossSectionControls,
        Na__UiFeature__CrossSection__SetMenuVisible
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
