/* =============================================================================
   VGHLANTERN - PROFILE INDEX LOADER
   =============================================================================

   FILE       : VghLantern__AppData__ProfileIndexLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - ProfileIndexLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the swept-profile library index and individual profile outlines
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Loads VghLantern__ProfileDataIndex__.json - the generated catalogue of swept
     cross-sections (glazing bars, ridge, hip, eaves/kerb, closing sections).
   - Fetch order: the server API route first (served no-store so the index stays
     live while authoring), then the static file as a fallback.
   - Memoises the parsed index and builds a ProfileId lookup Map.
   - Fetches individual profile JSON on demand and caches each one.
   - Publishes the parsed index into StateManager, emitting 'profileIndexLoaded'.

   WHY PROFILES ARE SEPARATE FROM COMPONENTS:
   - A component is a discrete object placed at a point (a finial on a ridge end).
   - A profile is a cross-section swept along a skeleton polyline (a glazing bar
     running up a rafter). Profiles are consumed by Env2d ProfileTraceRenderer and
     Env3d MeshBuilder__ProfileSweep, both of which need only the outline points.

   IMPORTANT:
   - The index is GENERATED OUTPUT built by 60__Dev__WebBuildUtils. Never edit it
     by hand and never hardcode profile data that belongs in it.
   - This module is the single consumer of the profile index.

   ============================================================================= */

// =============================================================================
// REGION | Profile Index Loader Module
// =============================================================================

const VghLantern__AppData__ProfileIndexLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Index Source Paths
    // ------------------------------------------------------------
    const API_INDEX_PATH     =  '/api/profile-index';                                              // <-- Preferred: live, no-store
    const STATIC_INDEX_PATH  =  '06__Data__LanternProfileLibrary/VghLantern__ProfileDataIndex__.json'; // <-- Fallback: direct file
    const LIBRARY_ROOT_PATH  =  '06__Data__LanternProfileLibrary/';                                // <-- Base for relative profile URLs
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Profile Caches
    // ------------------------------------------------------------
    let VghLantern__ProfileIndexLoader__IndexData    =  null;                // <-- Parsed index document
    let VghLantern__ProfileIndexLoader__EntryMap     =  null;                // <-- Map<ProfileId, indexEntry>
    let VghLantern__ProfileIndexLoader__LoadPromise  =  null;                // <-- In-flight load shared by concurrent callers
    let VghLantern__ProfileIndexLoader__ProfileCache =  {};                  // <-- ProfileId -> fully parsed profile JSON
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Fetching
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch the Index from the Server API Route
    // ------------------------------------------------------------
    async function VghLantern__ProfileIndexLoader__FetchFromApi() {
        var response  =  await fetch(API_INDEX_PATH, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var payload  =  await response.json();
        if (!payload || !payload.ok) throw new Error((payload && payload.error) || 'API returned not-ok');
        return payload.data;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch the Index Directly from the Static File
    // ------------------------------------------------------------
    async function VghLantern__ProfileIndexLoader__FetchFromStaticFile() {
        var response  =  await fetch(STATIC_INDEX_PATH, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the ProfileId Lookup Map
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__BuildEntryMap(indexData) {
        var entryMap  =  new Map();
        var profiles  =  (indexData && indexData['VghLantern__ProfileDataIndex__Profiles']) || [];
        for (var i = 0; i < profiles.length; i++) {
            var entry  =  profiles[i];
            if (entry && entry.ProfileId) entryMap.set(entry.ProfileId, entry);
        }
        return entryMap;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Profile Index (memoised)
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__LoadIndex() {
        if (VghLantern__ProfileIndexLoader__LoadPromise) return VghLantern__ProfileIndexLoader__LoadPromise;

        VghLantern__ProfileIndexLoader__LoadPromise  =  (async function() {
            var indexData  =  null;

            try {
                indexData  =  await VghLantern__ProfileIndexLoader__FetchFromApi();
            } catch (apiError) {
                console.warn('[VghLantern__ProfileIndexLoader] API route unavailable, falling back to static file:', apiError.message);
                try {
                    indexData  =  await VghLantern__ProfileIndexLoader__FetchFromStaticFile();
                } catch (fileError) {
                    console.error('[VghLantern__ProfileIndexLoader] Profile index could not be loaded:', fileError.message);
                    indexData  =  null;
                }
            }

            VghLantern__ProfileIndexLoader__IndexData  =  indexData;
            VghLantern__ProfileIndexLoader__EntryMap   =  VghLantern__ProfileIndexLoader__BuildEntryMap(indexData);

            if (window.VghLantern__AppCore__StateManager) {
                window.VghLantern__AppCore__StateManager.VghLantern__StateManager__SetProfileIndex(indexData);
            }

            if (indexData) {
                console.log('[VghLantern__ProfileIndexLoader] Loaded ' + VghLantern__ProfileIndexLoader__EntryMap.size + ' profile(s).');
            }

            return indexData;
        })();

        return VghLantern__ProfileIndexLoader__LoadPromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Queries
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Parsed Index Document
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__GetIndex() {
        return VghLantern__ProfileIndexLoader__IndexData;
    }
    // ------------------------------------------------------------


    // FUNCTION | List All Profile Categories
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__ListCategories() {
        if (!VghLantern__ProfileIndexLoader__IndexData) return [];
        return VghLantern__ProfileIndexLoader__IndexData['VghLantern__ProfileDataIndex__Categories'] || [];
    }
    // ------------------------------------------------------------


    // FUNCTION | List All Profile Index Entries
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__ListEntries() {
        if (!VghLantern__ProfileIndexLoader__IndexData) return [];
        return VghLantern__ProfileIndexLoader__IndexData['VghLantern__ProfileDataIndex__Profiles'] || [];
    }
    // ------------------------------------------------------------


    // FUNCTION | List Profile Index Entries Within a Category
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__ListEntriesByCategory(categoryId) {
        var allEntries  =  VghLantern__ProfileIndexLoader__ListEntries();
        return allEntries.filter(function(entry) { return entry && entry.CategoryId === categoryId; });
    }
    // ------------------------------------------------------------


    // FUNCTION | List Profile Index Entries Suitable for a Skeleton Role
    // ------------------------------------------------------------
    // Role is one of: glazingBar | ridge | hip | eaves | kerb | closing.
    // Entries declare their applicable roles so the editor can filter option
    // lists without hardcoding which category maps to which skeleton member.
    function VghLantern__ProfileIndexLoader__ListEntriesForRole(roleKey) {
        var allEntries  =  VghLantern__ProfileIndexLoader__ListEntries();
        return allEntries.filter(function(entry) {
            if (!entry || !Array.isArray(entry.ApplicableRoles)) return false;
            return entry.ApplicableRoles.indexOf(roleKey) !== -1;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Index Entry by Profile Id
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__GetEntry(profileId) {
        if (!VghLantern__ProfileIndexLoader__EntryMap) return null;
        return VghLantern__ProfileIndexLoader__EntryMap.get(profileId) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Individual Profile Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve an Index Entry Url Against the Library Root
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__ResolveUrl(relativeUrl) {
        if (!relativeUrl) return null;
        if (/^(https?:)?\/\//.test(relativeUrl) || relativeUrl.charAt(0) === '/') return relativeUrl;
        return LIBRARY_ROOT_PATH + relativeUrl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load a Single Profile JSON by Profile Id
    // ------------------------------------------------------------
    async function VghLantern__ProfileIndexLoader__LoadProfile(profileId) {
        if (!profileId) return null;
        if (VghLantern__ProfileIndexLoader__ProfileCache[profileId]) return VghLantern__ProfileIndexLoader__ProfileCache[profileId];

        await VghLantern__ProfileIndexLoader__LoadIndex();

        var entry  =  VghLantern__ProfileIndexLoader__GetEntry(profileId);
        if (!entry) {
            console.warn('[VghLantern__ProfileIndexLoader] Unknown profile id:', profileId);
            return null;
        }

        var profileUrl  =  VghLantern__ProfileIndexLoader__ResolveUrl(entry.JsonUrl);
        if (!profileUrl) {
            console.warn('[VghLantern__ProfileIndexLoader] Index entry has no JsonUrl:', profileId);
            return null;
        }

        try {
            var response  =  await fetch(profileUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var profileData  =  await response.json();
            VghLantern__ProfileIndexLoader__ProfileCache[profileId]  =  profileData;
            return profileData;
        } catch (e) {
            console.error('[VghLantern__ProfileIndexLoader] Failed to load profile ' + profileId + ':', e.message);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Outline Point List for a Loaded Profile
    // ------------------------------------------------------------
    // Returns the Na__Asset__Profile2D outline in mm, or null when unavailable.
    // Both the SVG trace renderer and the Three.js sweep builder consume this.
    async function VghLantern__ProfileIndexLoader__GetOutlinePoints(profileId) {
        var profileData  =  await VghLantern__ProfileIndexLoader__LoadProfile(profileId);
        if (!profileData) return null;

        var profile2d  =  profileData['Na__Asset__Profile2D'];
        if (!profile2d || !Array.isArray(profile2d['Na__Asset__Profile2D__Points'])) return null;

        return profile2d['Na__Asset__Profile2D__Points'];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Role to Profile Assignment
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Role to Config Field Mapping
    // ------------------------------------------------------------
    // The single definition of which lantern config field names the profile for
    // each skeleton member role. Both render environments resolve through this, so
    // a profile swap updates the SVG trace and the Three.js sweep from one edit.
    const ROLE_PROFILE_FIELDS  =  {
        'ridge'      : ['Lantern__RidgeAndHips__Config',  'Lantern__RidgeAndHips__Config__RidgeProfileId'],
        'hip'        : ['Lantern__RidgeAndHips__Config',  'Lantern__RidgeAndHips__Config__HipProfileId'],
        'verge'      : ['Lantern__RidgeAndHips__Config',  'Lantern__RidgeAndHips__Config__HipProfileId'],
        'eaves'      : ['Lantern__KerbAndBase__Config',   'Lantern__KerbAndBase__Config__EavesProfileId'],
        'kerb'       : ['Lantern__KerbAndBase__Config',   'Lantern__KerbAndBase__Config__KerbProfileId'],
        'kerbPost'   : ['Lantern__KerbAndBase__Config',   'Lantern__KerbAndBase__Config__KerbProfileId'],
        'glazingBar' : ['Lantern__GlazingBars__Config',   'Lantern__GlazingBars__Config__BarProfileId'],
        'transom'    : ['Lantern__GlazingBars__Config',   'Lantern__GlazingBars__Config__BarProfileId']
    };
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Profile Id a Lantern Assigns to a Member Role
    // ------------------------------------------------------------
    function VghLantern__ProfileIndexLoader__ProfileIdForRole(lantern, roleKey) {
        if (!lantern) return '';

        var lookup  =  ROLE_PROFILE_FIELDS[roleKey];
        if (!lookup) return '';

        var block  =  lantern[lookup[0]];
        return (block && block[lookup[1]]) || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Outline Points for Whatever Profile a Role Uses
    // ------------------------------------------------------------
    async function VghLantern__ProfileIndexLoader__GetOutlineForRole(lantern, roleKey) {
        var profileId  =  VghLantern__ProfileIndexLoader__ProfileIdForRole(lantern, roleKey);
        if (!profileId) return null;

        return await VghLantern__ProfileIndexLoader__GetOutlinePoints(profileId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ProfileIndexLoader__LoadIndex              : VghLantern__ProfileIndexLoader__LoadIndex,
        VghLantern__ProfileIndexLoader__GetIndex               : VghLantern__ProfileIndexLoader__GetIndex,
        VghLantern__ProfileIndexLoader__ListCategories         : VghLantern__ProfileIndexLoader__ListCategories,
        VghLantern__ProfileIndexLoader__ListEntries            : VghLantern__ProfileIndexLoader__ListEntries,
        VghLantern__ProfileIndexLoader__ListEntriesByCategory  : VghLantern__ProfileIndexLoader__ListEntriesByCategory,
        VghLantern__ProfileIndexLoader__ListEntriesForRole     : VghLantern__ProfileIndexLoader__ListEntriesForRole,
        VghLantern__ProfileIndexLoader__GetEntry               : VghLantern__ProfileIndexLoader__GetEntry,
        VghLantern__ProfileIndexLoader__LoadProfile            : VghLantern__ProfileIndexLoader__LoadProfile,
        VghLantern__ProfileIndexLoader__GetOutlinePoints       : VghLantern__ProfileIndexLoader__GetOutlinePoints,
        VghLantern__ProfileIndexLoader__ProfileIdForRole       : VghLantern__ProfileIndexLoader__ProfileIdForRole,
        VghLantern__ProfileIndexLoader__GetOutlineForRole      : VghLantern__ProfileIndexLoader__GetOutlineForRole
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__ProfileIndexLoader  =  VghLantern__AppData__ProfileIndexLoader;
