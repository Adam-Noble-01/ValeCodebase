// =============================================================================
// VALEVISION3D - DEV MENU (LOCALHOST ONLY)
// =============================================================================
//
// FILE       : Na__UiFeature__DevMenu__LocalhostOnly.js
// NAMESPACE  : Na__UiFeature
// MODULE     : DevMenu LocalhostOnly
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Reveal local development menu only on localhost
// CREATED    : 11-Mar-2026
//
// DESCRIPTION:
// - Reveals the dedicated Dev Tools dropdown only when ValeVision3D is running
//   on a localhost environment.
// - Keeps developer-facing controls hidden on live deployments.
// - Mirrors the existing TrueVision localhost-only dev menu pattern.
// - Provides a drag-resize handle on the bottom-right corner so the panel
//   width can be adjusted at runtime without page reload.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Mar-2026 - Version 1.0.0
// - Initial extracted localhost-only Dev Tools menu controller.
//
// 11-Mar-2026 - Version 1.1.0
// - Drag-resize handle added to bottom-right corner of the Dev Tools container.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import { Na__AppUtils__IsRunningOnLocalhost } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Localhost Dev Menu Initialization
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Dev Menu DOM IDs
    // ------------------------------------------------------------
    const Na__DevMenu__ContainerId   = 'naDevToolsMenuContainer';              // <-- Root container for localhost-only menu
    const Na__DevMenu__ResizeHandleId = 'naDevMenuResizeHandle';               // <-- Drag-resize handle element
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Resize Constraints
    // ------------------------------------------------------------
    const Na__DevMenu__ResizeMinWidth = 220;                                   // <-- Minimum panel width in px
    const Na__DevMenu__ResizeMaxWidth = 640;                                   // <-- Maximum panel width in px
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialize Drag-Resize Behaviour
    // ------------------------------------------------------------
    function Na__DevMenu__InitializeResizeHandle(devMenuContainer) {
        const handle = document.getElementById(Na__DevMenu__ResizeHandleId);
        if (!handle) return;                                                   // <-- Exit if handle markup is absent

        let isDragging  = false;                                               // <-- Drag state flag
        let startX      = 0;                                                   // <-- Mouse X at drag start
        let startWidth  = 0;                                                   // <-- Container width at drag start

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX     = e.clientX;                                            // <-- Record cursor start position
            startWidth = devMenuContainer.offsetWidth;                         // <-- Snapshot current width
            document.body.style.userSelect = 'none';                          // <-- Prevent text selection while dragging
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const delta    = e.clientX - startX;                               // <-- Horizontal cursor movement
            const newWidth = Math.min(
                Na__DevMenu__ResizeMaxWidth,
                Math.max(Na__DevMenu__ResizeMinWidth, startWidth + delta)      // <-- Clamp within min/max bounds
            );

            devMenuContainer.style.width = `${newWidth}px`;                   // <-- Apply new container width
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = '';                               // <-- Restore text selection
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Localhost Dev Menu Visibility
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeLocalhostDevMenu() {
        const devMenuContainer = document.getElementById(Na__DevMenu__ContainerId);
        if (!devMenuContainer) return;                                         // <-- Exit if the dev menu shell is absent

        if (!Na__AppUtils__IsRunningOnLocalhost()) {
            devMenuContainer.style.display = 'none';                           // <-- Keep hidden on live deployments
            return;
        }

        devMenuContainer.style.display = '';                                   // <-- Reveal on localhost
        Na__DevMenu__InitializeResizeHandle(devMenuContainer);                 // <-- Wire up drag-resize handle
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Localhost Dev Menu API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeLocalhostDevMenu
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
