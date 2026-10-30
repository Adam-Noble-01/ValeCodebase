// =============================================================================
// VALEVISION AURA - APP CORE - APP CONFIG
// =============================================================================
//
// FILE       : Na__AppCore__AppConfig__.js
// NAMESPACE  : Na__AppConfig
// MODULE     : App Core - Config
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : AURA's settings (sheets, title block, viewports, parameters,
//              annotations, saving), read once
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - The settings live in one file, 02__AppData/Na__AppConfig__AuraRender__.json,
//   which the API also reads. The page asks api/config for it; if the API cannot
//   be reached it reads the file itself, so the page always starts.
// - Values are read by key without the "AuraConfig__" prefix:
//   Na__AppConfig__Get('Viewport__Scales').
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build, from ValeVision Theia's config loader.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    import { Na__Api__Get } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';

    const Na__AppConfig__FILE = new URL('../02__AppData/Na__AppConfig__AuraRender__.json', import.meta.url).href;

    let Na__AppConfig__Values = {};


    // FUNCTION | Load the Config (the API's copy, else the file; never rejects)
    // ------------------------------------------------------------
    async function Na__AppConfig__Load() {
        try {
            const answer = await Na__Api__Get('config');
            if (answer && answer.config) {
                Na__AppConfig__Values = Object.assign({}, answer.config);
                return Na__AppConfig__Values;
            }
        } catch (error) { /* the API is not there: read the file */ }
        try {
            const response = await fetch(Na__AppConfig__FILE, { cache: 'no-cache' });
            if (response.ok) Na__AppConfig__Values = await response.json();
        } catch (error) {
            console.error('[AURA] The app config could not be read:', error);
        }
        return Na__AppConfig__Values;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Value, by Its Key Without the "AuraConfig__" Prefix
    // ------------------------------------------------------------
    function Na__AppConfig__Get(name, fallback) {
        const value = Na__AppConfig__Values[`AuraConfig__${name}`];
        return value === undefined ? fallback : value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__AppConfig__Load,
        Na__AppConfig__Get
    };

// endregion -------------------------------------------------------------------
