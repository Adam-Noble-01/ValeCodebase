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
// - THE TRIGGER LIVES IN THE TOP BAR beside the company logo, and only the
//   flyout drops down over the canvas once it is pressed. The menu used to sit
//   permanently over the top-left of the viewport, which is exactly where the
//   model is.
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
// 12-Sep-2026 - Version 1.2.0
// - Ported from TrueVision3D: the menu mounts into the header slot beside the
//   logo, and the resize handle now sizes the dropdown list rather than the
//   container, which is a flex item in the top bar and must not stretch.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import { Na__DevGate__IsAuthoringEnabled } from '../03__AppUtils/Na__AppUtils__DevGate__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Localhost Dev Menu Initialization
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Dev Menu DOM IDs
    // ------------------------------------------------------------
    const Na__DevMenu__ContainerId   = 'naDevToolsMenuContainer';              // <-- Root container for localhost-only menu
    const Na__DevMenu__HeaderSlotId  = 'naHeaderDevToolsSlot';                 // <-- Header slot beside the brand logo
    const Na__DevMenu__ResizeHandleId = 'naDevMenuResizeHandle';               // <-- Drag-resize handle element
    const Na__DevMenu__PanelSelector = '.na-dropdown-menu__list';              // <-- The list is the flyout panel that resizes
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Resize Constraints
    // ------------------------------------------------------------
    const Na__DevMenu__ResizeMinWidth = 220;                                   // <-- Minimum panel width in px
    const Na__DevMenu__ResizeMaxWidth = 640;                                   // <-- Maximum panel width in px
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Menu Into the Header Slot Beside the Logo
    // ------------------------------------------------------------
    // The menu's markup stays where it is in index.html; only its position in
    // the DOM changes, and only once the gate has passed. A shell without the
    // slot keeps the menu exactly where it was, so this cannot break an older
    // page that has not been given a header slot yet.
    // ------------------------------------------------------------
    function Na__DevMenu__MountInHeaderSlot(devMenuContainer) {
        const headerSlot = document.getElementById(Na__DevMenu__HeaderSlotId);
        if (!headerSlot) return;                                                // <-- Older shells without the slot keep the menu where it is

        headerSlot.appendChild(devMenuContainer);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialize Drag-Resize Behaviour
    // ------------------------------------------------------------
    // THE HANDLE SIZES THE PANEL, NOT THE CONTAINER. The container is now a
    // bare flex item in the header; widening it would stretch the top bar and
    // leave the flyout the size it was.
    // ------------------------------------------------------------
    function Na__DevMenu__InitializeResizeHandle(devMenuContainer) {
        const handle = document.getElementById(Na__DevMenu__ResizeHandleId);
        const panel  = devMenuContainer.querySelector(Na__DevMenu__PanelSelector);
        if (!handle || !panel) return;                                         // <-- Exit if handle or panel markup is absent

        let isDragging  = false;                                               // <-- Drag state flag
        let startX      = 0;                                                   // <-- Mouse X at drag start
        let startWidth  = 0;                                                   // <-- Panel width at drag start

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX     = e.clientX;                                            // <-- Record cursor start position
            startWidth = panel.offsetWidth;                                    // <-- Snapshot the PANEL's width
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

            panel.style.width = `${newWidth}px`;                               // <-- Apply new panel width
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

        if (!Na__DevGate__IsAuthoringEnabled()) {
            devMenuContainer.style.display = 'none';                           // <-- Keep hidden on live deployments
            return;
        }

        devMenuContainer.style.display = '';                                   // <-- Reveal on localhost
        Na__DevMenu__MountInHeaderSlot(devMenuContainer);                      // <-- Trigger lives on the top bar beside the logo
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
