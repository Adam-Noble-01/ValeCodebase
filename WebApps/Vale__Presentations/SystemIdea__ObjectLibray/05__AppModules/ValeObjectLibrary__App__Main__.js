/* =============================================================================
 * VALE OBJECT LIBRARY - START THE OBJECT LIBRARY DEMO ONCE EVERY MODULE IS LOADED
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__App__Main__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Core
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Start the Object Library demo once every module is loaded
 * CREATED    : 16-Oct-2026
 *
 * DESCRIPTION:
 * - Part of the Object Library demo
 * - Loaded by ValeObjectLibrary__Demo__2.0.0__.html
 * - Shares state through window.ValeObjectLibrary__Modules
 *
 * -----------------------------------------------------------------------------
 *
 * DEVELOPMENT LOG:
 * 16-Oct-2026 - Version 2.0.0
 * - Separated from ValeObjectLibrary__Demo__2.0.0__.html
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', App.ValeObjectLibrary_Boot);
    } else {
        App.ValeObjectLibrary_Boot();
    }
})(window.ValeObjectLibrary__Modules);
