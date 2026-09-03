// =============================================================================
// VALEVISION3D - MODEL TOGGLE CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__ModelToggle__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : ModelToggle Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dynamic category visibility toggle buttons for loaded model groups
// CREATED    : 10-Feb-2026
//
// DESCRIPTION:
// - Reads the loaded model groups Map (category -> THREE.Group) from the
//   multi-model loader and dynamically generates toggle buttons for each.
// - Pairs Mesh + Linework models per category into a single toggle.
// - Maps internal category keys to user-friendly display names.
// - Automatically creates buttons for any new categories added in the future
//   (furniture, vegetation, scene context, etc.) without code changes.
// - Integrates into the existing Tools dropdown panel in the ValeVision3D UI.
// - Exposes Na__ModelToggle__ApplySceneLayerVisibility so Presentation Mode
//   scene transitions can drive these same category toggles per tour scene.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Feb-2026 - Version 1.0.0
// - Initial implementation.
//
// 01-Jul-2026 - Version 1.1.0
// - Added Na__ModelToggle__ApplySceneLayerVisibility (exported) so per-scene
//   SketchUp tag/layer state (captured by the Cloud Sync plugin) can drive
//   these category toggles automatically on scene transitions.
// - Toggle buttons now keep a reference to their DOM element in the state map
//   so programmatic visibility changes stay in sync with the active class.
//
// 01-Sep-2026 - Version 1.2.0
// - Added Na__ModelToggle__GetCategories and Na__ModelToggle__CaptureVisibilityMap
//   so the Video Studio can list the loaded categories in its own UI and snapshot
//   the live toggle state into a per-video layer override.
// - BuildButtons now clears the state map before rebuilding. It only rewrote
//   entries before, so a second load left categories from the previous model in
//   the map with dead group references. Harmless while nothing read the map
//   wholesale; not harmless now that a snapshot of it gets saved to a project.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and Category Display Names
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Category Key -> User-Friendly Display Name Map
    // ------------------------------------------------------------
    // Maps ValeVision category keys (from GLB filenames) to readable labels.
    // Any category NOT in this map gets an auto-generated label from its key.
    // ------------------------------------------------------------
    const Na__ModelToggle__DisplayNames = {
        "ValeVision__MainBuildingModel__Existing"      : "Existing Building",      // <-- Tag 10-19
        "ValeVision__MainBuildingModel__Proposed"      : "Design Proposal",        // <-- Tag 20-24
        "ValeVision__MainBuildingModel__ProposedDoors" : "Doors",                  // <-- Tag 25 (interactive ADR assemblies)
        "ValeVision__SiteBoundaries"                   : "Site Boundaries",        // <-- Tag 08 (conditional: shown only when boundary GLBs exist)
        "ValeVision__LandscapeEnvironment"             : "Landscape",              // <-- Tag 07, 09
        "ValeVision__GroundFloorFurniture"             : "Ground Floor Furniture", // <-- Tag 30-38
        "ValeVision__GroundFloorDecor"                 : "Ground Floor Decor",     // <-- Tag 39
        "ValeVision__FirstFloorFurniture"              : "First Floor Furniture",  // <-- Tag 40-48
        "ValeVision__FirstFloorDecor"                  : "First Floor Decor",      // <-- Tag 49
        "ValeVision__Vegetation"                       : "Vegetation",             // <-- Tag 50-59
        "ValeVision__SiteVegetation2D"                 : "Site Vegetation 2D",     // <-- Tag 09 camera-follow billboards
        "ValeVision__SceneEntourage2D"                 : "Scene Entourage 2D",     // <-- Tag 60 camera-follow billboards
        "ValeVision__SceneContextual"                  : "Scene Entourage",        // <-- Tag 61-70
        "ValeVision__LegacyModel"                      : "Model"                   // <-- Legacy fallback
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Toggle Panel DOM IDs
    // ------------------------------------------------------------
    const Na__ModelToggle__PanelId     = "naModelTogglePanel";            // <-- Toggle panel container ID
    const Na__ModelToggle__ListId      = "naModelToggleList";             // <-- Toggle buttons list ID
    const Na__ModelToggle__ButtonClass = "na-model-toggle__button";       // <-- Toggle button CSS class
    const Na__ModelToggle__ActiveClass = "na-model-toggle__button--active";  // <-- Active state CSS class
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Display Name Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Category Key to User-Friendly Display Name
    // ---------------------------------------------------------------
    function Na__ModelToggle__ResolveDisplayName(categoryKey) {
        if (Na__ModelToggle__DisplayNames[categoryKey]) {
            return Na__ModelToggle__DisplayNames[categoryKey];            // <-- Return mapped display name
        }

        // AUTO-GENERATE | Strip ValeVision__ prefix and humanize
        const stripped = categoryKey.replace('ValeVision__', '');         // <-- Remove namespace prefix
        const humanized = stripped
            .replace(/__/g, ' - ')                                       // <-- Double underscores to dashes
            .replace(/([a-z])([A-Z])/g, '$1 $2');                        // <-- CamelCase to spaces
        return humanized;                                                // <-- Return auto-generated label
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Toggle State Management
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Internal Toggle State
    // ------------------------------------------------------------
    let Na__ModelToggle__StateMap = new Map();                            // <-- Map of category -> { group, visible }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Category Visibility
    // ------------------------------------------------------------
    function Na__ModelToggle__SetCategoryVisibility(categoryKey, visible) {
        const state = Na__ModelToggle__StateMap.get(categoryKey);         // <-- Look up state entry
        if (!state) return;                                              // <-- Guard against missing category

        state.visible       = visible;                                   // <-- Update internal state
        state.group.visible = visible;                                   // <-- Set THREE.Group visibility
    }
    // ---------------------------------------------------------------


    // FUNCTION | Toggle Category On/Off (Flip Current State)
    // ------------------------------------------------------------
    function Na__ModelToggle__ToggleCategory(categoryKey) {
        const state = Na__ModelToggle__StateMap.get(categoryKey);         // <-- Look up state entry
        if (!state) return;                                              // <-- Guard against missing category

        const newVisible = !state.visible;                               // <-- Flip visibility
        Na__ModelToggle__SetCategoryVisibility(categoryKey, newVisible);  // <-- Apply new visibility
        return newVisible;                                               // <-- Return new state for button update
    }
    // ---------------------------------------------------------------


    // FUNCTION | Apply A Per-Scene Model Layer Visibility Map
    // ------------------------------------------------------------
    // layerVisibilityMap {object|null} - PresentationMode__Scene__ModelLayerVisibility
    //   from the active scene, e.g. { "ValeVision__SiteBoundaries": false, ... }.
    // Only categories present in the map (AND currently loaded) are changed;
    // categories absent from the map (or not loaded in this project) are left
    // untouched. Safe to call before any groups have loaded (no-op).
    // ------------------------------------------------------------
    function Na__ModelToggle__ApplySceneLayerVisibility(layerVisibilityMap) {
        if (!layerVisibilityMap || typeof layerVisibilityMap !== 'object') return;  // <-- Guard: nothing to apply
        if (Na__ModelToggle__StateMap.size === 0) return;                            // <-- Guard: groups not loaded yet

        Object.entries(layerVisibilityMap).forEach(([categoryKey, visible]) => {
            const state = Na__ModelToggle__StateMap.get(categoryKey);     // <-- Look up state entry
            if (!state) return;                                          // <-- Category not loaded in this project; skip

            const isVisible = Boolean(visible);
            Na__ModelToggle__SetCategoryVisibility(categoryKey, isVisible);  // <-- Apply visibility

            if (state.button) {
                state.button.classList.toggle(Na__ModelToggle__ActiveClass, isVisible);  // <-- Keep button UI in sync
            }
        });

        Na__RenderLoop__RequestRender();
    }
    // ---------------------------------------------------------------


    // FUNCTION | List Every Loaded Category with Its Live Visibility
    // ------------------------------------------------------------
    // Returns [{ key, label, visible }] in load order, so another feature can
    // draw its own list of the same categories the Tools panel shows without
    // reaching into the state map or re-deriving the display names.
    // Returns an empty array before any groups have loaded.
    // ------------------------------------------------------------
    function Na__ModelToggle__GetCategories() {
        const categories = [];

        Na__ModelToggle__StateMap.forEach((state, categoryKey) => {
            categories.push({
                key     : categoryKey,                                        // <-- Category key as saved in project.json
                label   : Na__ModelToggle__ResolveDisplayName(categoryKey),    // <-- Same label the Tools panel button carries
                visible : state.visible === true                              // <-- Live visibility right now
            });
        });

        return categories;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Snapshot the Live Visibility of Every Loaded Category
    // ------------------------------------------------------------
    // Produces a plain object in the same shape ApplySceneLayerVisibility
    // consumes, so a caller can capture the current view, store it, and hand
    // it straight back later to restore exactly this state.
    // ------------------------------------------------------------
    function Na__ModelToggle__CaptureVisibilityMap() {
        const snapshot = {};

        Na__ModelToggle__StateMap.forEach((state, categoryKey) => {
            snapshot[categoryKey] = state.visible === true;                   // <-- Boolean per category
        });

        return snapshot;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dynamic UI Button Generation
// -----------------------------------------------------------------------------

    // FUNCTION | Build Toggle Buttons from Loaded Groups Map
    // ------------------------------------------------------------
    function Na__ModelToggle__BuildButtons(loadedGroups) {
        const listContainer = document.getElementById(Na__ModelToggle__ListId);  // <-- Get button list container
        if (!listContainer) {
            console.warn('[ValeVision3D] Model toggle list container not found');
            return;                                                      // <-- Exit if no container
        }

        listContainer.innerHTML = '';                                    // <-- Clear any existing buttons
        Na__ModelToggle__StateMap.clear();                               // <-- Drop categories from a previously loaded model

        if (!loadedGroups || loadedGroups.size === 0) {
            listContainer.style.display = 'none';                        // <-- Hide if no groups
            return;
        }

        // BUILD STATE MAP AND BUTTONS FOR EACH LOADED CATEGORY
        loadedGroups.forEach((group, categoryKey) => {
            // REGISTER STATE
            Na__ModelToggle__StateMap.set(categoryKey, {
                group   : group,                                         // <-- THREE.Group reference
                visible : true,                                          // <-- Default: visible
                button  : null                                           // <-- Populated below once the button exists
            });

            // CREATE BUTTON ELEMENT
            const displayName = Na__ModelToggle__ResolveDisplayName(categoryKey);  // <-- Resolve friendly name
            const button      = document.createElement('button');        // <-- Create button element
            button.className  = `${Na__ModelToggle__ButtonClass} ${Na__ModelToggle__ActiveClass}`;  // <-- Set classes (active by default)
            button.textContent = displayName;                            // <-- Set button label
            button.dataset.category = categoryKey;                       // <-- Store category key in data attribute
            Na__ModelToggle__StateMap.get(categoryKey).button = button;  // <-- Keep button ref for programmatic UI sync

            // CLICK HANDLER | Toggle visibility and update button state
            button.addEventListener('click', () => {
                const nowVisible = Na__ModelToggle__ToggleCategory(categoryKey);  // <-- Toggle visibility
                if (nowVisible) {
                    button.classList.add(Na__ModelToggle__ActiveClass);   // <-- Add active class
                } else {
                    button.classList.remove(Na__ModelToggle__ActiveClass);  // <-- Remove active class
                }
                Na__RenderLoop__RequestRender();
            });

            listContainer.appendChild(button);                           // <-- Add button to container
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Model Toggle Controls
    // ------------------------------------------------------------
    // Call after Na__ModelLoader__LoadAllModels completes.
    // Accepts the loadedGroups Map returned by the multi-model loader.
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeModelToggleControls(loadedGroups) {
        if (!loadedGroups || loadedGroups.size === 0) {
            console.log('[ValeVision3D] No model groups for toggle controls');
            return;                                                      // <-- Exit if nothing to toggle
        }

        Na__ModelToggle__BuildButtons(loadedGroups);                     // <-- Build dynamic toggle buttons
        
        // INITIALIZE TOGGLE BUTTON
        const toggleButton = document.getElementById('naModelToggleButton');  // <-- Get toggle button element
        const panel = document.getElementById(Na__ModelToggle__PanelId);     // <-- Get panel container
        
        if (toggleButton && panel) {
            toggleButton.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');      // <-- Check current panel state
                panel.classList.toggle('is-open', !isOpen);            // <-- Toggle panel visibility
            });
        }
        
        console.log(`[ValeVision3D] Model toggle controls initialized for ${loadedGroups.size} categories`);
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Model Toggle Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeModelToggleControls,
        Na__ModelToggle__ApplySceneLayerVisibility,
        Na__ModelToggle__GetCategories,
        Na__ModelToggle__CaptureVisibilityMap
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
