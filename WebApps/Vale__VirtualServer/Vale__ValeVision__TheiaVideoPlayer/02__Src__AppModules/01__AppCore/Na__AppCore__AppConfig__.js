// =============================================================================
// VALEVISION THEIA - APP CORE - APP CONFIG
// =============================================================================
//
// FILE       : Na__AppCore__AppConfig__.js
// NAMESPACE  : Na__AppConfig
// MODULE     : App Core - Config
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The quality, player and caching policy, read once from the API
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - The policy lives in one file, 02__AppData/Na__AppConfig__TheiaVideoPlayer__.json,
//   which the API also enforces. The page asks api/config for its public part;
//   if the API cannot be reached it reads the file itself, and failing that
//   uses the defaults below, so the player always starts.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    import { Na__Api__Get } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';

    const Na__AppConfig__FILE = new URL('../02__AppData/Na__AppConfig__TheiaVideoPlayer__.json', import.meta.url).href;

    const Na__AppConfig__DEFAULTS = {
        TheiaConfig__Quality__MinimumHeightPx        : 1440,
        TheiaConfig__Player__AutoFullscreenOnPlay    : true,
        TheiaConfig__Player__CinemaDimOnPlay         : true,
        TheiaConfig__Player__AutoAdvanceSeconds      : 6,
        TheiaConfig__Player__ControlsHideMs          : 2600,
        TheiaConfig__Player__ResumeMinSeconds        : 8,
        TheiaConfig__Player__SeekStepSeconds         : 5,
        TheiaConfig__Player__StartupBufferSeconds    : 5,
        TheiaConfig__Player__StartupMaxWaitMs        : 8000,
        TheiaConfig__Player__StartWaitShareOfLength  : 0.25,
        TheiaConfig__Player__StartWaitMinSeconds     : 4,
        TheiaConfig__Player__StartWaitMaxSeconds     : 15,
        TheiaConfig__Player__LandscapeInFullscreen   : true,
        TheiaConfig__Player__RotateHintMs            : 4000,
        TheiaConfig__Prefetch__AheadSeconds          : 90,
        TheiaConfig__Prefetch__NextVideosHeadSeconds : 20,
        TheiaConfig__Prefetch__NextVideosHeadCount   : 3,
        TheiaConfig__Prefetch__Concurrency           : 2,
        TheiaConfig__Prefetch__MeteredHeadsOnly      : true,
        TheiaConfig__Cache__MaxBytes                 : 20 * 1024 ** 3,
        TheiaConfig__Cache__MaxQuotaFraction         : 0.6,
        TheiaConfig__Connection__SlowNoticeFactor    : 1.05,
        TheiaConfig__Connection__SafetySeconds       : 4,
        TheiaConfig__Share__ExpiryOptionsDays        : [0, 7, 30, 90, 365]
    };

    let Na__AppConfig__Values = Object.assign({}, Na__AppConfig__DEFAULTS);


    // FUNCTION | Load the Config (never rejects)
    // ------------------------------------------------------------
    async function Na__AppConfig__Load() {
        try {
            const answer = await Na__Api__Get('config');
            Object.assign(Na__AppConfig__Values, answer.config || {});
            return Na__AppConfig__Values;
        } catch (error) { /* the API is not there: read the file */ }
        try {
            const response = await fetch(Na__AppConfig__FILE, { cache: 'no-cache' });
            if (response.ok) Object.assign(Na__AppConfig__Values, await response.json());
        } catch (error) { /* the defaults, then */ }
        return Na__AppConfig__Values;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Value, by Its Key Without the "TheiaConfig__" Prefix
    // ------------------------------------------------------------
    function Na__AppConfig__Get(name, fallback) {
        const value = Na__AppConfig__Values[`TheiaConfig__${name}`];
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
