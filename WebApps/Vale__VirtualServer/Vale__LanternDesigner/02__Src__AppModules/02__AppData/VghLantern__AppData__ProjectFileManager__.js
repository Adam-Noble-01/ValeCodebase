/* =============================================================================
   VGHLANTERN - PROJECT FILE MANAGER
   =============================================================================

   FILE       : VghLantern__AppData__ProjectFileManager__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - ProjectFileManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Lantern designs in the Vale Projects Master Library, through the
                Lantern Designer API
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - THE MASTER LIBRARY IS THE ONLY HOME OF A DESIGN. Each design lives in its
     library project's LanternDesigner folder, beside that project's ValeVision 3D,
     Gallery and Theia work, and is read and written through api/projects
     (Server__Api/Api__LanternDesigner). Nothing is kept in localStorage.
   - A design's key is its library project id, Metadata LibraryId
     ("57079__Mordaunt"). Metadata ProjectCode stays the job number printed on
     drawings and letters: schemes of one job share it, so it cannot be the key.
   - A newly created design is seeded with one lantern, described by the JSON
     block VghLantern__NewProject__SeedLantern__Config. Without it the Lantern
     Editor opens on an empty configurator, because it only selects a lantern
     when the schedule holds one.
   - Saves send the whole design with the "_rev" the server last confirmed. One
     save per design is in flight at a time; autosaves that arrive meanwhile
     collapse into the newest. A save refused because someone else saved first
     (409) asks the user whose version wins.
   - The project list is light (one record per design); a design is fetched when
     it is opened, and kept for the session until the list says it changed.
   - IMPORTANT: every create/load/save path normalises project JSON through
     AppUtils ProjectSchemaValidator. Do not add IO paths that bypass it.

   -----------------------------------------------------------------------------

   DEVELOPMENT LOG:
   15-Oct-2026 - Version 2.0.0 (the Vale app server)
   - Rewritten for app.valegardenhouses.com: the Master Library through the API
     replaces 07__LocalProjectData on the localhost server, and the in-memory
     session store replaces the localStorage mirror. The site is one origin for
     every Vale app, so a 5 MB mirror would have crowded out ValeVision's own
     storage; it also overflowed Safari's quota on its own.
   - New: CreateProject takes the library target first ({id} or {newProject}),
     FetchProject, SearchLibrary, CanWrite, CanDelete, version checks and the
     conflict dialog. LoadProject now answers from what this session fetched.

   ============================================================================= */

// =============================================================================
// REGION | Project File Manager Module
// =============================================================================

const VghLantern__AppData__ProjectFileManager = (function() {

    // MODULE CONSTANTS | API Paths (relative to the page: /lantern-designer/api/...)
    // ------------------------------------------------------------
    const API_BASE        =  'api/projects';                                 // <-- Designs
    const LIBRARY_API     =  'api/library';                                  // <-- Library projects a design can go in
    const META_KEY        =  'VghLantern__ProjectFile__Metadata';
    const META_PREFIX     =  'VghLantern__ProjectFile__Metadata__';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Seed Lantern Config Keys
    // ------------------------------------------------------------
    // Key names only. Every seed VALUE lives in the JSON block named below.
    const SEED_SECTION        =  'NewProjectSeed';                           // <-- ConfigLoader section name
    const SEED_ENABLED_KEY    =  'VghLantern__NewProject__SeedLantern__Config__SeedLanternOnCreate';
    const SEED_TEMPLATE_KEY   =  'VghLantern__NewProject__SeedLantern__Config__LanternTemplate';
    const SEED_CONFIG_LABEL   =  'VghLantern__AppConfig__Main__.json -> VghLantern__NewProject__SeedLantern__Config';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Session Store
    // ------------------------------------------------------------
    let VghLantern__ProjectFileManager__Manifest       =  [];                // <-- Light records, the server's order (newest first)
    const VghLantern__ProjectFileManager__Designs      =  {};                // <-- LibraryId -> normalised design fetched this session
    const VghLantern__ProjectFileManager__Revs         =  {};                // <-- LibraryId -> _rev the server last confirmed
    const VghLantern__ProjectFileManager__SaveChains   =  {};                // <-- LibraryId -> Promise: saves of one design run in turn
    const VghLantern__ProjectFileManager__PendingSave  =  {};                // <-- LibraryId -> newest save waiting its turn
    const VghLantern__ProjectFileManager__Conflicts    =  {};                // <-- LibraryId -> server reply while the user decides
    let VghLantern__ProjectFileManager__ViewOnlyNoted  =  false;             // <-- The "view only" note is shown once a session
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Timestamp in Vale Storage Format "30-Jul-2026 14:32:07"
    // ------------------------------------------------------------
    // Carries hours/minutes/seconds (not just the day) so that DateCreated and
    // DateModified stay sort-distinct when multiple projects are touched on the
    // same day - a date-only stamp ties every same-day save at midnight, which
    // is what made the project list's Last Modified order look random.
    function VghLantern__ProjectFileManager__GetTodayStamp() {
        return window.VghLantern__AppUtils__DateFormatter
            .VghLantern__DateFormatter__FormatDdMmmYyyyHms(new Date());      // <-- DateFormatter is the date format SSOT
    }
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server Calls, Permissions and Notices
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Through the Shared Sign-In (a 401 re-opens its card)
    // ------------------------------------------------------------
    // Always resolves { status, json }: status 0 means the server was not reached.
    function VghLantern__ProjectFileManager__Call(url, init) {
        var opts     =  init || {};
        opts.credentials  =  'same-origin';
        opts.cache        =  'no-store';
        var Login    =  window.ValeUserLogin;
        var request  =  (Login && Login.Fetch) ? Login.Fetch(url, opts) : fetch(url, opts);

        return request
            .then(function(res) {
                return res.json()
                    .catch(function() { return null; })
                    .then(function(json) { return { status: res.status, json: json }; });
            })
            .catch(function(err) {
                return { status: 0, json: { ok: false, error: 'Cannot reach the server (' + err.message + ').' } };
            });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Error Text of a Failed Call
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ErrorText(result) {
        if (result && result.json && result.json.error) return result.json.error;
        return result && result.status ? ('HTTP ' + result.status) : 'Server unreachable';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise a Toast When the Toast Module Is Loaded
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__Toast(message, variantKey) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(message, variantKey);
        else console.info('[VghLantern__ProjectFileManager] ' + message);
    }
    // ------------------------------------------------------------


    // FUNCTION | May the Signed-In Person Create and Save? (Employee and up)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__CanWrite() {
        var Login  =  window.ValeUserLogin;
        return !!(Login && Login.HasLevel && Login.HasLevel('Employee'));
    }
    // ------------------------------------------------------------


    // FUNCTION | May the Signed-In Person Delete This Design? (its creator, or Management and up)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__CanDelete(manifestEntry) {
        var Login  =  window.ValeUserLogin;
        if (!Login || !Login.User || !Login.User()) return false;
        if (Login.HasLevel('Management')) return true;
        if (!Login.HasLevel('Employee')) return false;
        return !!(manifestEntry && manifestEntry.createdByCode && manifestEntry.createdByCode === Login.User().code);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifest (the project list) Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Design's Library Id (its key)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__LibraryIdOf(projectData) {
        var meta  =  projectData ? projectData[META_KEY] : null;
        return (meta && meta[META_PREFIX + 'LibraryId']) || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Manifest Entry Object
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__BuildManifestEntry(source) {
        var src  =  source || {};
        var safeStatus  =  (typeof src.status === 'string' && src.status.trim()) ? src.status.trim() : 'Draft';

        return {
            libraryId     : src.libraryId     || '',
            year          : src.year          || '',
            projectCode   : src.projectCode   || '',
            projectName   : src.projectName   || '',
            documentName  : src.documentName  || '',
            clientName    : src.clientName    || '',
            status        : safeStatus,
            dateCreated   : src.dateCreated   || '',
            dateModified  : src.dateModified  || src.dateCreated || '',
            lanternCount  : Number(src.lanternCount || 0),
            createdByCode : src.createdByCode || '',
            createdByName : src.createdByName || '',
            rev           : Number(src.rev || 0)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh One Manifest Entry From a Design (adds it if missing)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__UpsertManifestEntry(libraryId, projectData, extra) {
        var meta      =  (projectData && projectData[META_KEY]) || {};
        var lanterns  =  projectData ? projectData['VghLantern__ProjectFile__Lanterns'] : null;
        var index     =  VghLantern__ProjectFileManager__Manifest.findIndex(function(p) { return p.libraryId === libraryId; });
        var previous  =  index >= 0 ? VghLantern__ProjectFileManager__Manifest[index] : {};

        var entry  =  VghLantern__ProjectFileManager__BuildManifestEntry(Object.assign({}, previous, {
            libraryId    : libraryId,
            projectCode  : meta[META_PREFIX + 'ProjectCode']    || previous.projectCode,
            projectName  : meta[META_PREFIX + 'ProjectName']    || previous.projectName,
            documentName : meta[META_PREFIX + 'DocumentName']   || previous.documentName,
            clientName   : meta[META_PREFIX + 'ClientName']     || previous.clientName,
            status       : meta[META_PREFIX + 'DocumentStatus'] || previous.status,
            dateCreated  : meta[META_PREFIX + 'DateCreated']    || previous.dateCreated,
            dateModified : meta[META_PREFIX + 'DateModified']   || previous.dateModified,
            lanternCount : Array.isArray(lanterns) ? lanterns.length : previous.lanternCount,
            rev          : VghLantern__ProjectFileManager__Revs[libraryId] || previous.rev
        }, extra || {}));

        if (index >= 0) VghLantern__ProjectFileManager__Manifest[index]  =  entry;
        else            VghLantern__ProjectFileManager__Manifest.unshift(entry);   // <-- A new design is the newest
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise Project Data to Current Schema
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__NormaliseProjectData(projectData, sourceLabel) {
        var SchemaValidator  =  window.VghLantern__AppUtils__ProjectSchemaValidator;
        if (!SchemaValidator || !SchemaValidator.VghLantern__SchemaValidator__ValidateAndNormaliseProject) return { projectData: projectData, didMutate: false };

        var result  =  SchemaValidator.VghLantern__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel);
        if (!result || !result.ProjectData) return { projectData: projectData, didMutate: false };

        if (result.DidMutate) {
            console.log('[VghLantern__ProjectFileManager] Schema normalised for source:', sourceLabel || 'unknown');
        }

        return { projectData: result.ProjectData, didMutate: !!result.DidMutate };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep a Design the Server Sent (normalised, with its _rev)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__Remember(libraryId, serverData, rev, sourceLabel) {
        var normalised  =  VghLantern__ProjectFileManager__NormaliseProjectData(serverData, sourceLabel).projectData || serverData;
        delete normalised._rev;                                              // <-- The rev lives in Revs: a stale copy in the data can never be sent
        VghLantern__ProjectFileManager__Designs[libraryId]  =  normalised;
        VghLantern__ProjectFileManager__Revs[libraryId]     =  Number(rev || 0);
        VghLantern__ProjectFileManager__UpsertManifestEntry(libraryId, normalised);
        return normalised;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building a New Design
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Copy a Seed Template Over a Lantern Block for Block
    // ------------------------------------------------------------
    // Only keys the template actually carries are written, so the schema default
    // stands for everything the template leaves out - including the generated
    // identity Id, which the template must never supply.
    function VghLantern__ProjectFileManager__ApplySeedTemplate(lanternData, templateData) {
        var blockKey, fieldKey, templateBlock;

        for (blockKey in templateData) {
            if (!Object.prototype.hasOwnProperty.call(templateData, blockKey)) continue;

            templateBlock  =  templateData[blockKey];
            if (!templateBlock || typeof templateBlock !== 'object' || Array.isArray(templateBlock)) continue;

            if (!lanternData[blockKey] || typeof lanternData[blockKey] !== 'object') lanternData[blockKey]  =  {};

            for (fieldKey in templateBlock) {
                if (!Object.prototype.hasOwnProperty.call(templateBlock, fieldKey)) continue;
                lanternData[blockKey][fieldKey]  =  templateBlock[fieldKey];
            }
        }

        return lanternData;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Lantern Schedule a New Project Starts With
    // ------------------------------------------------------------
    // A project created with an empty schedule opens on an empty configurator,
    // because the editor has no lantern to select and only selects one when the
    // array is non-empty. Every new project therefore starts on the seed lantern
    // described in JSON config, built from the schema defaults so it is a fully
    // formed lantern block rather than a partial one. If the seed is switched off
    // or the config block is missing the project is still created, just empty -
    // the error is logged by the Require* read rather than swallowed here.
    function VghLantern__ProjectFileManager__BuildSeedLanterns() {
        var ConfigLoader     =  window.VghLantern__AppCore__ConfigLoader;
        var SchemaValidator  =  window.VghLantern__AppUtils__ProjectSchemaValidator;
        if (!ConfigLoader || !SchemaValidator) return [];

        var seedConfig  =  ConfigLoader.VghLantern__ConfigLoader__GetSection(SEED_SECTION);
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(seedConfig, SEED_ENABLED_KEY, SEED_CONFIG_LABEL)) return [];

        var templateData  =  seedConfig[SEED_TEMPLATE_KEY];
        if (!templateData || typeof templateData !== 'object' || Array.isArray(templateData)) {
            console.error('[VghLantern__ProjectFileManager] Missing seed lantern template "' + SEED_TEMPLATE_KEY +
                '" (' + SEED_CONFIG_LABEL + '). Add it to the JSON config - do not hardcode a fallback in JS.');
            return [];
        }

        var seedLantern  =  SchemaValidator.VghLantern__SchemaValidator__BuildDefaultLantern(0);
        return [VghLantern__ProjectFileManager__ApplySeedTemplate(seedLantern, templateData)];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Fresh Project Data Object
    // ------------------------------------------------------------
    // siteAddress and author are optional; the database-first create flow
    // supplies them from the fetched client record so the single create write
    // already carries them, rather than a second racing save patching them in.
    // LibraryId is left empty: the server sets it from the folder it writes to.
    function VghLantern__ProjectFileManager__BuildNewProjectData(projectCode, projectName, documentName, clientName, siteAddress, author) {
        var now  =  VghLantern__ProjectFileManager__GetTodayStamp();

        return {
            'VghLantern__ProjectFile__Metadata': {
                'VghLantern__ProjectFile__Metadata__Description'     : 'Project identity and document tracking metadata.',
                'VghLantern__ProjectFile__Metadata__ProjectCode'     : projectCode,
                'VghLantern__ProjectFile__Metadata__ProjectName'     : projectName,
                'VghLantern__ProjectFile__Metadata__LibraryId'       : '',
                'VghLantern__ProjectFile__Metadata__DocumentName'    : documentName || (projectName ? projectName + ' Roof Lanterns' : ''),
                'VghLantern__ProjectFile__Metadata__ClientName'      : clientName || '',
                'VghLantern__ProjectFile__Metadata__SiteAddress'     : siteAddress || '',
                'VghLantern__ProjectFile__Metadata__DocumentStatus'  : 'Draft',
                'VghLantern__ProjectFile__Metadata__DateCreated'     : now,
                'VghLantern__ProjectFile__Metadata__DateModified'    : now,
                'VghLantern__ProjectFile__Metadata__DateIssued'      : '',
                'VghLantern__ProjectFile__Metadata__RevisionCode'    : 'A',
                'VghLantern__ProjectFile__Metadata__Author'          : author || ''
            },
            'VghLantern__ProjectFile__GlobalSettings': {
                'VghLantern__ProjectFile__GlobalSettings__Description'      : 'Document-wide settings that cascade to all lanterns.',
                'VghLantern__ProjectFile__GlobalSettings__FrameFinish'      : '',
                'VghLantern__ProjectFile__GlobalSettings__GlazingSpec'      : '',
                'VghLantern__ProjectFile__GlobalSettings__DrawingScaleRef'  : '',
                'VghLantern__ProjectFile__GlobalSettings__JobNotes'         : ''
            },
            'VghLantern__ProjectFile__DrawingLayout': {
                'VghLantern__ProjectFile__DrawingLayout__Description'       : 'Legacy shared sheet seed. Live sheet setup is stored per lantern under Lantern__DrawingLayout__Config; this block only seeds empty lantern layouts on load.',
                'VghLantern__ProjectFile__DrawingLayout__SheetSizeKey'      : null,
                'VghLantern__ProjectFile__DrawingLayout__Orientation'       : null,
                'VghLantern__ProjectFile__DrawingLayout__ScaleDenominator'  : null,
                'VghLantern__ProjectFile__DrawingLayout__ScaleIsManual'     : false,
                'VghLantern__ProjectFile__DrawingLayout__PaperIsManual'     : false,
                'VghLantern__ProjectFile__DrawingLayout__ColumnSharesPct'   : null,
                'VghLantern__ProjectFile__DrawingLayout__RowSharesPct'      : null,
                'VghLantern__ProjectFile__DrawingLayout__SheetZoomFactor'   : 1,
                'VghLantern__ProjectFile__DrawingLayout__ViewCameraStates'  : {}
            },
            'VghLantern__ProjectFile__ClientDocument': {
                'VghLantern__ProjectFile__ClientDocument__Description'      : 'The client-facing welcome letter and this project\'s own terms. Standard terms live in the markdown library; only their on/off state is recorded here.',
                'VghLantern__ProjectFile__ClientDocument__LetterSalutation' : '',
                'VghLantern__ProjectFile__ClientDocument__LetterBody'       : '',
                'VghLantern__ProjectFile__ClientDocument__SignOffName'      : '',
                'VghLantern__ProjectFile__ClientDocument__SignOffRole'      : '',
                'VghLantern__ProjectFile__ClientDocument__CriticalTerms'    : [],
                'VghLantern__ProjectFile__ClientDocument__SpecialTerms'     : [],
                'VghLantern__ProjectFile__ClientDocument__SectionToggles'   : {}
            },
            'VghLantern__ProjectFile__Lanterns': VghLantern__ProjectFileManager__BuildSeedLanterns()
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project CRUD Operations
// -----------------------------------------------------------------------------

    // FUNCTION | List All Designs (the list SyncFromServer last fetched)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ListProjects() {
        return VghLantern__ProjectFileManager__Manifest.slice();
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Design in a Library Project
    // ------------------------------------------------------------
    // libraryTarget: { id: '57079__Mordaunt' } for a library project with no design
    // yet, or { newProject: { code: '57999', name: 'Smith' } } to add the job to the
    // library first (with every folder of the schema project). Resolves
    // { ok: true, projectData, libraryId, createdProject } or { ok: false, status, error, libraryId }.
    function VghLantern__ProjectFileManager__CreateProject(libraryTarget, projectCode, projectName, documentName, clientName, siteAddress, author) {
        if (!VghLantern__ProjectFileManager__CanWrite()) {
            return Promise.resolve({ ok: false, status: 403, error: 'Your account can view designs but not create them.' });
        }

        var projectData  =  VghLantern__ProjectFileManager__BuildNewProjectData(projectCode, projectName, documentName, clientName, siteAddress, author);
        projectData      =  VghLantern__ProjectFileManager__NormaliseProjectData(projectData, 'createProject').projectData || projectData;

        return VghLantern__ProjectFileManager__Call(API_BASE, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json', 'X-VghLantern-UpdateSource': 'manual:createProject' },
            body    : JSON.stringify({ project: projectData, library: libraryTarget || {} })
        }).then(function(result) {
            if (result.status === 200 && result.json && result.json.ok) {
                var libraryId  =  result.json.libraryId;
                var created    =  VghLantern__ProjectFileManager__Remember(libraryId, result.json.data, result.json.rev, 'createProject:server');
                VghLantern__ProjectFileManager__UpsertManifestEntry(libraryId, created, {
                    year          : result.json.year || '',
                    createdByCode : (window.ValeUserLogin && window.ValeUserLogin.User()) ? window.ValeUserLogin.User().code : '',
                    createdByName : (window.ValeUserLogin && window.ValeUserLogin.User()) ? window.ValeUserLogin.User().name : ''
                });
                console.log('[VghLantern__ProjectFileManager] Design created in ' + libraryId);
                return { ok: true, projectData: created, libraryId: libraryId, createdProject: !!result.json.createdProject };
            }
            return {
                ok        : false,
                status    : result.status,
                error     : VghLantern__ProjectFileManager__ErrorText(result),
                libraryId : result.json ? (result.json.libraryId || '') : ''
            };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Design This Session Already Holds (null until FetchProject has run)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__LoadProject(libraryId) {
        return VghLantern__ProjectFileManager__Designs[libraryId] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fetch a Design From the Library (the session copy when it is current)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__FetchProject(libraryId) {
        if (!libraryId) return Promise.resolve(null);

        var held   =  VghLantern__ProjectFileManager__Designs[libraryId];
        var entry  =  VghLantern__ProjectFileManager__Manifest.find(function(p) { return p.libraryId === libraryId; });
        if (held && (!entry || entry.rev === VghLantern__ProjectFileManager__Revs[libraryId])) {
            return Promise.resolve(held);                                    // <-- Nobody has saved it since this session fetched it
        }

        return VghLantern__ProjectFileManager__Call(API_BASE + '/' + encodeURIComponent(libraryId))
            .then(function(result) {
                if (result.status === 200 && result.json && result.json.ok) {
                    return VghLantern__ProjectFileManager__Remember(libraryId, result.json.data, result.json.rev, 'loadProject:server');
                }
                console.warn('[VghLantern__ProjectFileManager] Could not fetch ' + libraryId + ': ' + VghLantern__ProjectFileManager__ErrorText(result));
                return null;
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Save a Design (queued per design; the newest waiting save wins)
    // ------------------------------------------------------------
    // Resolves { ok, rev } or { ok: false, error, conflict? }. Every caller, autosave
    // included, goes through here, so the version check can never be skipped.
    function VghLantern__ProjectFileManager__SaveProject(projectData, updateSource) {
        if (!VghLantern__ProjectFileManager__CanWrite()) {
            if (!VghLantern__ProjectFileManager__ViewOnlyNoted) {
                VghLantern__ProjectFileManager__ViewOnlyNoted  =  true;
                VghLantern__ProjectFileManager__Toast('View only: your account can open designs, but changes are not saved.', 'info');
            }
            return Promise.resolve({ ok: false, error: 'view only' });
        }

        var normalised  =  VghLantern__ProjectFileManager__NormaliseProjectData(projectData, updateSource || 'saveProject').projectData || projectData;
        var libraryId   =  VghLantern__ProjectFileManager__LibraryIdOf(normalised);
        if (!libraryId) return Promise.resolve({ ok: false, error: 'This design has no library project.' });

        var metadata  =  normalised[META_KEY];
        metadata[META_PREFIX + 'DateModified']  =  VghLantern__ProjectFileManager__GetTodayStamp();
        delete normalised._rev;

        VghLantern__ProjectFileManager__Designs[libraryId]  =  normalised;
        VghLantern__ProjectFileManager__UpsertManifestEntry(libraryId, normalised);
        VghLantern__ProjectFileManager__PendingSave[libraryId]  =  { data: normalised, source: updateSource || 'manual:save' };

        var chain  =  VghLantern__ProjectFileManager__SaveChains[libraryId] || Promise.resolve();
        var next   =  chain.then(function() { return VghLantern__ProjectFileManager__FlushSave(libraryId); });
        VghLantern__ProjectFileManager__SaveChains[libraryId]  =  next.catch(function() {});
        return next;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Send the Newest Waiting Save of One Design
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__FlushSave(libraryId) {
        var job  =  VghLantern__ProjectFileManager__PendingSave[libraryId];
        if (!job) return Promise.resolve({ ok: true, coalesced: true });     // <-- A later save in the queue already carried this one

        if (VghLantern__ProjectFileManager__Conflicts[libraryId]) {
            VghLantern__ProjectFileManager__ShowConflict(libraryId);         // <-- Still undecided: ask again rather than overwrite
            return Promise.resolve({ ok: false, conflict: true, error: 'waiting for a decision' });
        }
        delete VghLantern__ProjectFileManager__PendingSave[libraryId];

        var body   =  Object.assign({}, job.data, { _rev: VghLantern__ProjectFileManager__Revs[libraryId] || 0 });
        return VghLantern__ProjectFileManager__Call(API_BASE + '/' + encodeURIComponent(libraryId), {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json', 'X-VghLantern-UpdateSource': job.source },
            body    : JSON.stringify(body)
        }).then(function(result) {
            if (result.status === 200 && result.json && result.json.ok) {
                VghLantern__ProjectFileManager__Revs[libraryId]  =  Number(result.json.rev || 0);
                VghLantern__ProjectFileManager__UpsertManifestEntry(libraryId, job.data);
                console.log('[VghLantern__ProjectFileManager] Saved ' + libraryId + ' (rev ' + result.json.rev + ', ' + job.source + ')');
                return { ok: true, rev: result.json.rev };
            }
            if (result.status === 409 && result.json && result.json.data) {
                if (!VghLantern__ProjectFileManager__PendingSave[libraryId]) {
                    VghLantern__ProjectFileManager__PendingSave[libraryId]  =  job;  // <-- Keep mine until the user decides
                }
                VghLantern__ProjectFileManager__Conflicts[libraryId]  =  result.json;
                VghLantern__ProjectFileManager__ShowConflict(libraryId);
                return { ok: false, conflict: true, error: result.json.error };
            }
            var errorText  =  VghLantern__ProjectFileManager__ErrorText(result);
            console.error('[VghLantern__ProjectFileManager] Save failed for ' + libraryId + ': ' + errorText);
            if (result.status !== 401) {                                     // <-- 401: the sign-in card is already up
                VghLantern__ProjectFileManager__Toast('Not saved: ' + errorText, 'error');
            }
            return { ok: false, error: errorText };
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Someone Else Saved First: Ask Whose Version Wins
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ShowConflict(libraryId) {
        var reply         =  VghLantern__ProjectFileManager__Conflicts[libraryId];
        var ConfirmModal  =  window.VghLantern__AppCore__ConfirmModal;
        if (!reply || !ConfirmModal) return;

        var who   =  reply.savedBy ? String(reply.savedBy).replace(/[&<>"']/g, '') : 'someone else';
        ConfirmModal.VghLantern__ConfirmModal__Show({
            Title        : 'This design changed while you were working',
            Message      : '<strong>' + who + '</strong> saved this design after you opened it. ' +
                           'Load their version (your changes since then are lost), or keep yours (their changes are replaced)?',
            ConfirmLabel : 'Load Their Version',
            CancelLabel  : 'Keep Mine',
            OnConfirm    : function() { VghLantern__ProjectFileManager__ResolveConflict(libraryId, 'theirs'); },
            OnCancel     : function() { VghLantern__ProjectFileManager__ResolveConflict(libraryId, 'mine'); }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Act on the Conflict Decision
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ResolveConflict(libraryId, choice) {
        var reply  =  VghLantern__ProjectFileManager__Conflicts[libraryId];
        delete VghLantern__ProjectFileManager__Conflicts[libraryId];
        if (!reply) return;

        if (choice === 'theirs') {
            delete VghLantern__ProjectFileManager__PendingSave[libraryId];
            var theirs        =  VghLantern__ProjectFileManager__Remember(libraryId, reply.data, reply.rev, 'conflict:theirs');
            var StateManager  =  window.VghLantern__AppCore__StateManager;
            var current       =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
            if (current && VghLantern__ProjectFileManager__LibraryIdOf(current) === libraryId) {
                StateManager.VghLantern__StateManager__SetCurrentProject(theirs);
            }
            VghLantern__ProjectFileManager__Toast('Loaded the latest saved version.', 'info');
            return;
        }

        VghLantern__ProjectFileManager__Revs[libraryId]  =  Number(reply.rev || 0); // <-- Mine wins: save over the version that is there now
        var job  =  VghLantern__ProjectFileManager__PendingSave[libraryId];
        if (job) VghLantern__ProjectFileManager__SaveProject(job.data, 'manual:conflictKeepMine');
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Design (the library project and its other apps' work stay)
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__DeleteProject(libraryId) {
        return VghLantern__ProjectFileManager__Call(API_BASE + '/' + encodeURIComponent(libraryId), {
            method  : 'DELETE',
            headers : { 'X-VghLantern-UpdateSource': 'manual:deleteProject' }
        }).then(function(result) {
            if (result.status === 200 && result.json && result.json.ok) {
                delete VghLantern__ProjectFileManager__Designs[libraryId];
                delete VghLantern__ProjectFileManager__Revs[libraryId];
                delete VghLantern__ProjectFileManager__PendingSave[libraryId];
                VghLantern__ProjectFileManager__Manifest  =  VghLantern__ProjectFileManager__Manifest.filter(function(p) { return p.libraryId !== libraryId; });
                console.log('[VghLantern__ProjectFileManager] Design deleted: ' + libraryId);
                return { ok: true };
            }
            return { ok: false, status: result.status, error: VghLantern__ProjectFileManager__ErrorText(result) };
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server Sync, Library Search and JSON Export
// -----------------------------------------------------------------------------

    // FUNCTION | Refresh the Project List From the Library
    // ------------------------------------------------------------
    // Light records only. A design this session holds is dropped when the list
    // shows a newer version, so the next open fetches it again - unless a save of
    // it is still waiting, in which case the save's version check decides.
    function VghLantern__ProjectFileManager__SyncFromServer() {
        return VghLantern__ProjectFileManager__Call(API_BASE).then(function(result) {
            if (!(result.status === 200 && result.json && result.json.ok && Array.isArray(result.json.data))) {
                console.warn('[VghLantern__ProjectFileManager] Project list unavailable - keeping the last one:', VghLantern__ProjectFileManager__ErrorText(result));
                return VghLantern__ProjectFileManager__ListProjects();
            }

            VghLantern__ProjectFileManager__Manifest  =  result.json.data.map(VghLantern__ProjectFileManager__BuildManifestEntry);

            VghLantern__ProjectFileManager__Manifest.forEach(function(entry) {
                var id  =  entry.libraryId;
                if (VghLantern__ProjectFileManager__Designs[id] && VghLantern__ProjectFileManager__Revs[id] !== entry.rev &&
                    !VghLantern__ProjectFileManager__PendingSave[id]) {
                    delete VghLantern__ProjectFileManager__Designs[id];      // <-- Someone saved it elsewhere: fetch afresh on open
                }
            });

            console.log('[VghLantern__ProjectFileManager] ' + VghLantern__ProjectFileManager__Manifest.length + ' design(s) in the library.');
            return VghLantern__ProjectFileManager__ListProjects();
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Library Projects a Design Can Go In
    // ------------------------------------------------------------
    // query: { code: '57079' } (every library project of that job number) and/or
    // { q: 'mordaunt' }. Resolves { ok, data: [{ id, year, projectName, projectCode,
    // projectType, hasDesign, hasModel, hasImages }] } or { ok: false, error }.
    function VghLantern__ProjectFileManager__SearchLibrary(query) {
        var params  =  [];
        if (query && query.code) params.push('code=' + encodeURIComponent(query.code));
        if (query && query.q)    params.push('q=' + encodeURIComponent(query.q));

        return VghLantern__ProjectFileManager__Call(LIBRARY_API + (params.length ? '?' + params.join('&') : ''))
            .then(function(result) {
                if (result.status === 200 && result.json && result.json.ok) return { ok: true, data: result.json.data || [] };
                return { ok: false, error: VghLantern__ProjectFileManager__ErrorText(result) };
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Export Project as JSON File Download
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ExportProjectAsJson(projectData) {
        var metadata   =  projectData[META_KEY] || {};
        var libraryId  =  metadata[META_PREFIX + 'LibraryId'] || '';
        var code       =  metadata[META_PREFIX + 'ProjectCode'] || 'unknown';
        var name       =  metadata[META_PREFIX + 'ProjectName'] || 'Project';
        var filename   =  libraryId
            ? 'VghLantern__ProjectFile__' + libraryId + '__.json'           // <-- The library's own file name
            : 'VghLantern__ProjectFile__' + code + '__' + name.replace(/[^a-zA-Z0-9]/g, '_') + '__.json';

        var blob  =  new Blob([JSON.stringify(projectData, null, 4)], { type: 'application/json' });
        var url   =  URL.createObjectURL(blob);
        var link  =  document.createElement('a');
        link.href      =  url;
        link.download  =  filename;
        link.click();
        URL.revokeObjectURL(url);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ProjectFileManager__ListProjects         : VghLantern__ProjectFileManager__ListProjects,
        VghLantern__ProjectFileManager__CreateProject        : VghLantern__ProjectFileManager__CreateProject,
        VghLantern__ProjectFileManager__LoadProject          : VghLantern__ProjectFileManager__LoadProject,
        VghLantern__ProjectFileManager__FetchProject         : VghLantern__ProjectFileManager__FetchProject,
        VghLantern__ProjectFileManager__SaveProject          : VghLantern__ProjectFileManager__SaveProject,
        VghLantern__ProjectFileManager__DeleteProject        : VghLantern__ProjectFileManager__DeleteProject,
        VghLantern__ProjectFileManager__SyncFromServer       : VghLantern__ProjectFileManager__SyncFromServer,
        VghLantern__ProjectFileManager__SearchLibrary        : VghLantern__ProjectFileManager__SearchLibrary,
        VghLantern__ProjectFileManager__CanWrite             : VghLantern__ProjectFileManager__CanWrite,
        VghLantern__ProjectFileManager__CanDelete            : VghLantern__ProjectFileManager__CanDelete,
        VghLantern__ProjectFileManager__LibraryIdOf          : VghLantern__ProjectFileManager__LibraryIdOf,
        VghLantern__ProjectFileManager__ExportProjectAsJson  : VghLantern__ProjectFileManager__ExportProjectAsJson
    };

// endregion ===================================================================

})();

window.VghLantern__AppData__ProjectFileManager  =  VghLantern__AppData__ProjectFileManager;
