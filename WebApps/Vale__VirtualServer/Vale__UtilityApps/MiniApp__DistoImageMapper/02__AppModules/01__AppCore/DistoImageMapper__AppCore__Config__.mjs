/* =============================================================================
   DISTO IMAGE MAPPER - APP CORE | CONFIG ACCESS
   =============================================================================

   FILE       : DistoImageMapper__AppCore__Config__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : AppCore - Config
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Loads Na__AppConfig__Main.json and hands out its sections
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - The one place a tunable number is read from, so nothing is hard coded twice.
   - A missing section throws at once rather than drawing something quietly wrong.

   ============================================================================= */

// -----------------------------------------------------------------------------
// REGION | Config Loading
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Location
    // ------------------------------------------------------------
    const CONFIG_URL      =  new URL('../02__AppData/Na__AppConfig__Main.json', import.meta.url);   // <-- Relative, so it works on any route
    const SECTION_PREFIX  =  'DistoImageMapper__AppConfig__';                                       // <-- Every section key starts with this
    // ------------------------------------------------------------


    // MODULE VARIABLES | Loaded Config
    // ------------------------------------------------------------
    let ConfigRoot  =  null;                                                 // <-- Filled once by the boot sequence
    // ------------------------------------------------------------


    // FUNCTION | Load the Config File
    // ------------------------------------------------------------
    export async function DistoImageMapper__Config__Load() {
        const response  =  await fetch(CONFIG_URL);
        if (!response.ok) throw new Error(`Could not read the app config (${response.status})`);

        const parsed  =  await response.json();
        ConfigRoot    =  parsed.DistoImageMapper__AppConfig;
        if (!ConfigRoot) throw new Error('The app config has no DistoImageMapper__AppConfig root');
    }
    // ------------------------------------------------------------


    // FUNCTION | Read One Config Section
    // ------------------------------------------------------------
    export function DistoImageMapper__Config__Section(sectionName) {
        const section  =  ConfigRoot && ConfigRoot[SECTION_PREFIX + sectionName];
        if (!section) throw new Error(`Config section missing: ${sectionName}`);
        return section;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
