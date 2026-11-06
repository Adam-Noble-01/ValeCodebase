/* =============================================================================
   DISTO IMAGE MAPPER - APP CORE | STATE
   =============================================================================

   FILE       : DistoImageMapper__AppCore__State__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : AppCore - State
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The loaded survey, the point under the cursor, the chosen point,
                and the viewer's remembered settings
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - A small event hub: the 3D view, filmstrip and lightbox all follow the same
     hovered and selected point without knowing about each other.
   - Settings are the Viewer block of the one settings file (AppCore - UserConfig),
     which guards every read and write, so the app runs without storage.

   ============================================================================= */

import { DistoImageMapper__UserConfig__Get, DistoImageMapper__UserConfig__Set } from './DistoImageMapper__AppCore__UserConfig__.mjs';


// -----------------------------------------------------------------------------
// REGION | State and Events
// -----------------------------------------------------------------------------


    // MODULE VARIABLES | Shared State
    // ------------------------------------------------------------
    export const DistoImageMapper__State  =  {
        Survey         :  null,                                              // <-- Output of SurveyBuilder
        HoveredIndex   :  -1,                                                // <-- Point under the cursor
        SelectedIndex  :  -1,                                                // <-- Point chosen in the lightbox or filmstrip
        Prefs          :  null                                               // <-- Viewer settings
    };

    const Listeners  =  new Map();                                           // <-- Event name to array of callbacks
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to a State Event
    // ------------------------------------------------------------
    export function DistoImageMapper__State__On(eventName, callback) {
        if (!Listeners.has(eventName)) Listeners.set(eventName, []);
        Listeners.get(eventName).push(callback);
    }
    // ------------------------------------------------------------


    // FUNCTION | Publish a State Event
    // ------------------------------------------------------------
    export function DistoImageMapper__State__Emit(eventName, payload) {
        (Listeners.get(eventName) || []).forEach(callback => callback(payload));
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Point Under the Cursor
    // ------------------------------------------------------------
    export function DistoImageMapper__State__SetHovered(index) {
        if (DistoImageMapper__State.HoveredIndex === index) return;
        DistoImageMapper__State.HoveredIndex  =  index;
        DistoImageMapper__State__Emit('FocusChanged');
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Chosen Point
    // ------------------------------------------------------------
    export function DistoImageMapper__State__SetSelected(index) {
        if (DistoImageMapper__State.SelectedIndex === index) return;
        DistoImageMapper__State.SelectedIndex  =  index;
        DistoImageMapper__State__Emit('FocusChanged');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Point to Highlight: Hovered First, Then Chosen
    // ------------------------------------------------------------
    export function DistoImageMapper__State__FocusIndex() {
        const { HoveredIndex, SelectedIndex }  =  DistoImageMapper__State;
        return HoveredIndex >= 0 ? HoveredIndex : SelectedIndex;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Viewer Settings
// -----------------------------------------------------------------------------

    // FUNCTION | Load Settings Over Their Defaults
    // ------------------------------------------------------------
    export function DistoImageMapper__State__LoadPrefs(defaults) {
        const stored  =  DistoImageMapper__UserConfig__Get('Viewer');        // <-- The settings file's Viewer block, loaded at boot
        const merged  =  { ...defaults, ...stored };
        merged.Layers =  { ...defaults.Layers, ...(stored.Layers || {}) };
        DistoImageMapper__State.Prefs  =  merged;
        DistoImageMapper__UserConfig__Set('Viewer', merged);                 // <-- From now on the live prefs are that block
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Settings
    // ------------------------------------------------------------
    export function DistoImageMapper__State__SavePrefs() {
        DistoImageMapper__UserConfig__Set('Viewer', DistoImageMapper__State.Prefs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
