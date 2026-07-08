// =============================================================================
// WHITECARDOPEDIA - PROJECT EDITOR FORM COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__ProjectEditor__Form.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectEditorForm Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Form for editing project.json fields with R2-first two-phase save
// CREATED    : 2025
//
// DESCRIPTION:
// - Form component for editing project metadata
// - Editable fields: projectName, projectCode, projectNameAlias (display-only
//   override), productionData (incl. designer), scheduleData, sketchUp URL,
//   and gallery visibility (enabled)
// - Production data: input type (dropdown), concept artist (dropdown),
//   designer (dropdown), additional notes
// - Schedule data: timeAllocated, timeTaken, dateReceived, dateFulfilled
// - Dropdown options dynamically loaded from masterConfig.json; any stored
//   value not present in the canonical list (e.g. a legacy template default)
//   is injected as an extra option so it always displays correctly instead
//   of silently rendering blank
// - Read-only "Project Info" panel surfaces master-index fields (asset home,
//   image count, GLB presence, last synced) for transparency
// - Validates input before saving (positive numbers, date format DD-MMM-YYYY)
// - Two-phase save: R2 SSOT first (via Cloudflare Worker), then local mirror (via Flask)
// - Phase 1 (R2) must succeed before Phase 2 (local mirror) runs
// - Worker config (URL + API key) fetched from Flask GET /api/editor-config on mount
// - projectNameAlias (collapsed "Advanced" section, under Project Name) lets
//   Whitecardopedia display a preferred name everywhere without ever moving
//   the live R2 folder/CDN path — always the lower-risk choice vs renaming
// - If the edited Project Code/Name would move the live R2 folder, Save shows
//   an inline confirm-and-rename panel (old -> new path) before proceeding —
//   confirming performs an atomic R2 folder move via the Worker's rename
//   endpoint, then mirrors the move locally via Flask. The proposed folder
//   path is validated against Windows-reserved filename characters before
//   the move is allowed to proceed.
// - Visibility (enabled) changes are applied as an independent phase via the
//   Worker's visibility endpoint, then mirrored locally via Flask
// - Danger Zone: "Delete Project Permanently" opens a centred modal requiring
//   the project code to be typed as confirmation, then deletes all R2/CDN
//   data and the local mirror, verifying both before reporting success
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial implementation.
//
// 08-Jul-2026 - Version 4.0.0
// - Added projectNameAlias: an optional display-name override, collapsed
//   under an "Advanced" disclosure beneath Project Name. Whitecardopedia
//   shows this name everywhere instead of the raw projectName once set, but
//   it never touches projectName/projectCode/folderId, so it can never
//   trigger the rename flow — the preferred, low-risk way to change how a
//   project is displayed. Placed right after projectName/projectCode in the
//   saved JSON via an explicit key-ordered rebuild in buildUpdatedProject().
// - Hardened the rename flow: the proposed new folder path is now validated
//   against Windows-reserved filename characters (< > : " \ | ? *) before a
//   rename is allowed to proceed — closes the exact failure mode where a
//   character like "|" can succeed on R2 but fail to create/move on a
//   Windows local mirror, permanently drifting R2 and local out of step.
// - Added a Danger Zone with "Delete Project Permanently": a centred modal
//   requires typing the project code to confirm, then deletes every R2/CDN
//   object and the local mirror via new Worker/Flask endpoints, verifying
//   both sides (re-listing R2, re-checking the local path) before reporting
//   a final Deleted-and-Verified result.
//
// 07-Jul-2026 - Version 3.0.0
// - Added Designer dropdown (productionData.designer) — was previously
//   readable in project.json and used by the gallery filter but had no
//   field in this form at all.
// - Fixed dropdown-vs-stored-value mismatch: Production Input / Concept
//   Artist / Designer selects now always inject the currently-stored value
//   as a selectable option even when it isn't in the canonical options list
//   (e.g. legacy template defaults like "Default Concept Artist"), so the
//   dropdown never silently shows blank for data that does exist.
// - Added Enabled (gallery visibility) checkbox, applied via the new
//   Worker/Flask visibility endpoints as an independent save phase.
// - Added a read-only Project Info panel (folder path, asset home, image
//   count, GLB presence, last synced) sourced from the master index.
// - Added rename-aware save: Save now detects when the Project Code/Name
//   would move the live folderId, shows an inline confirm panel (with an
//   editable proposed new folder path), and — once confirmed — performs an
//   atomic R2 folder move via the Worker's new rename endpoint followed by
//   a local Flask mirror move. Un-renamed saves are completely unaffected.
//
// 26-Jun-2026 - Version 2.1.0
// - Added floating toast notification system (green/red/amber).
// - Green toast on R2 write success and full project save.
// - Red toast on R2 write failure (hard error).
// - Amber toast when local mirror fails after successful R2 write.
// - Toasts auto-dismiss after 4 seconds.
//
// 26-Jun-2026 - Version 2.0.0
// - R2-first two-phase save implemented.
// - Worker config fetched securely from Flask /api/editor-config on mount.
// - Inline helpers: na_save_project_to_r2, na_mirror_project_to_local.
// - Phase status messages during save ("Saving to cloud...", "Mirroring locally...").
// - Local mirror failure is non-fatal (R2 is the SSOT).
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Worker Client Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Save Project to R2 via Cloudflare Worker (Phase 1 — SSOT)
    // ------------------------------------------------------------
    async function na_save_project_to_r2(workerApiBaseUrl, apiKey, folderId, projectData, timeoutMs) {
        const encodedFolderId = encodeURIComponent(folderId);                // <-- Encode slashes in folderId
        const workerUrl       = `${workerApiBaseUrl}/projects/${encodedFolderId}`; // <-- Full Worker endpoint URL

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), timeoutMs || 15000); // <-- Abort on timeout

        try {
            const response = await fetch(workerUrl, {
                method  : 'POST',
                headers : {
                    'Content-Type'       : 'application/json',
                    'X-Editor-Api-Key'   : apiKey                            // <-- Worker auth header
                },
                body    : JSON.stringify(projectData),
                signal  : controller.signal
            });

            clearTimeout(timeoutId);                                         // <-- Cancel timeout on response

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || `Worker responded with status ${response.status}`);
            }

            return await response.json();                                    // <-- Return Worker success payload
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;                                                     // <-- Rethrow for handleSubmit to catch
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Mirror Saved Project to Local Disk via Flask (Phase 2 — Mirror)
    // ------------------------------------------------------------
    async function na_mirror_project_to_local(folderId, projectData) {
        const response = await fetch(`/api/projects/${folderId}`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify(projectData)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Flask responded with status ${response.status}`);
        }

        return await response.json();                                        // <-- Return Flask success payload
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Rename/Move Project Folder on R2 via Cloudflare Worker (Phase 1 — SSOT)
    // ------------------------------------------------------------
    async function na_rename_project_via_r2(workerApiBaseUrl, apiKey, oldFolderId, newFolderId, updatedProjectData, timeoutMs) {
        const encodedOldFolderId = encodeURIComponent(oldFolderId);          // <-- Encode slashes in the OLD folderId
        const workerUrl          = `${workerApiBaseUrl}/projects/${encodedOldFolderId}/rename`; // <-- Full Worker endpoint URL

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), timeoutMs || 60000); // <-- Renames move more data — longer timeout

        try {
            const response = await fetch(workerUrl, {
                method  : 'POST',
                headers : {
                    'Content-Type'     : 'application/json',
                    'X-Editor-Api-Key' : apiKey                              // <-- Worker auth header
                },
                body    : JSON.stringify({ newFolderId, updatedProjectData }),
                signal  : controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || `Worker responded with status ${response.status}`);
            }

            return await response.json();                                    // <-- Return Worker success payload
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;                                                     // <-- Rethrow for the caller to handle
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Mirror Project Rename to Local Disk via Flask (Phase 2 — Mirror)
    // ------------------------------------------------------------
    async function na_rename_project_mirror_locally(oldFolderId, newFolderId, updatedProjectData) {
        const response = await fetch(`/api/projects/${oldFolderId}/rename`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ newFolderId, updatedProjectData })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Flask responded with status ${response.status}`);
        }

        return await response.json();                                        // <-- Return Flask success payload
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Update Project Gallery Visibility via Cloudflare Worker (Phase 1 — SSOT)
    // ------------------------------------------------------------
    async function na_update_project_visibility_via_r2(workerApiBaseUrl, apiKey, folderId, enabled, timeoutMs) {
        const encodedFolderId = encodeURIComponent(folderId);                // <-- Encode slashes in folderId
        const workerUrl       = `${workerApiBaseUrl}/projects/${encodedFolderId}/visibility`; // <-- Full Worker endpoint URL

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), timeoutMs || 15000);

        try {
            const response = await fetch(workerUrl, {
                method  : 'POST',
                headers : {
                    'Content-Type'     : 'application/json',
                    'X-Editor-Api-Key' : apiKey
                },
                body    : JSON.stringify({ enabled }),
                signal  : controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || `Worker responded with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Mirror Visibility Change to Local Disk via Flask (Phase 2 — Mirror)
    // ------------------------------------------------------------
    async function na_update_project_visibility_mirror(folderId, enabled) {
        const response = await fetch(`/api/projects/${folderId}/visibility`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ enabled })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Flask responded with status ${response.status}`);
        }

        return await response.json();
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Delete Project Permanently from R2 via Cloudflare Worker (Phase 1 — SSOT)
    // ------------------------------------------------------------
    async function na_delete_project_via_r2(workerApiBaseUrl, apiKey, folderId, timeoutMs) {
        const encodedFolderId = encodeURIComponent(folderId);                // <-- Encode slashes in folderId
        const workerUrl       = `${workerApiBaseUrl}/projects/${encodedFolderId}/delete`; // <-- Full Worker endpoint URL

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), timeoutMs || 60000); // <-- Deletes can touch many objects — longer timeout

        try {
            const response = await fetch(workerUrl, {
                method  : 'POST',
                headers : {
                    'Content-Type'     : 'application/json',
                    'X-Editor-Api-Key' : apiKey                              // <-- Worker auth header
                },
                signal  : controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || `Worker responded with status ${response.status}`);
            }

            return await response.json();                                    // <-- Return { r2Verified, remainingObjectCount, ... }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Delete Local Mirror via Flask (Phase 2 — Mirror)
    // ------------------------------------------------------------
    async function na_delete_project_mirror_locally(folderId) {
        const response = await fetch(`/api/projects/${folderId}/delete`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Flask responded with status ${response.status}`);
        }

        return await response.json();                                        // <-- Return { localVerified }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Form Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute the Proposed folderId from Code + Name
    // ------------------------------------------------------------
    // Keeps the existing year segment fixed and rebuilds "Code__Name" from
    // the form's current values, matching the established convention (see
    // e.g. "2025/FN-62104__Fenner Scheme-01" already in the master config).
    // Returns the unchanged currentFolderId whenever code/name are blank so
    // a rename is never proposed from incomplete data.
    // ------------------------------------------------------------
    function na_compute_folder_id(currentFolderId, projectCode, projectName) {
        const year = String(currentFolderId || '').split('/')[0] || '';
        const code = String(projectCode || '').trim();
        const name = String(projectName || '').trim();
        if (!year || !code || !name) return currentFolderId;                 // <-- Insufficient data — never propose a change
        return `${year}/${code}__${name}`;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Validate a Proposed folderId Is Safe for R2 + Windows Paths
    // ------------------------------------------------------------
    // Rejects the Windows-reserved filename characters (< > : " \ | ? *) and
    // control characters. R2 object keys tolerate most of these, but a
    // Windows local mirror does not — a folder name containing e.g. "|" can
    // succeed on R2 while silently failing to create/move locally, drifting
    // R2 and local permanently out of step and baking a broken character
    // into every CDN URL for that project.
    // ------------------------------------------------------------
    function na_validate_folder_id(folderId) {
        if (!/^\d{4}\/.+$/.test(folderId)) {
            return { valid: false, error: 'New folder path must look like "YYYY/Code__Name"' };
        }
        if (!/^\d{4}\/[^<>:"/\\|?*\x00-\x1F]+$/.test(folderId)) {
            return { valid: false, error: 'New folder path contains characters not allowed in file paths: < > : " \\ | ? *' };
        }
        return { valid: true, error: null };
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Ensure a Dropdown's Current Value Is Always Selectable
    // ------------------------------------------------------------
    // If the stored value isn't present in the canonical options list (e.g. a
    // legacy template default like "Default Concept Artist"), inject it as an
    // extra option so the <select> visibly reflects the true saved value
    // instead of silently rendering blank. Never mutates the canonical list.
    // ------------------------------------------------------------
    function na_build_dropdown_options(canonicalOptions, currentValue) {
        const options = Array.isArray(canonicalOptions) ? canonicalOptions.slice() : [];
        if (currentValue && !options.includes(currentValue)) {
            options.unshift(currentValue);                                   // <-- Surface the legacy/custom value first
        }
        return options;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | ProjectEditorForm Component
// -----------------------------------------------------------------------------

    // COMPONENT | Project Data Editor Form
    // ------------------------------------------------------------
    function ProjectEditorForm({ project, onCancel, onSaveSuccess, onDeleteSuccess }) {
        const [formData, setFormData] = React.useState({
            projectName         : project.projectName || '',                 // <-- Project name field
            projectCode         : project.projectCode || '',                 // <-- Project code field
            projectNameAlias    : project.projectNameAlias || '',            // <-- Display-only name override (never renames the folder)
            productionInput     : project.productionData?.input || '',       // <-- Production input field
            conceptArtist       : project.productionData?.conceptArtist || '', // <-- Concept artist field
            designer            : project.productionData?.designer || '',    // <-- Designer field
            productionNotes     : project.productionData?.additionalNotes || '',  // <-- Production notes field
            sketchUpUrl         : project.sketchUpModel?.url || '',          // <-- SketchUp URL field
            timeAllocated       : project.scheduleData?.timeAllocated !== undefined && project.scheduleData?.timeAllocated !== null ? String(project.scheduleData.timeAllocated) : '', // <-- Time expected field (convert number to string)
            timeTaken           : project.scheduleData?.timeTaken !== undefined && project.scheduleData?.timeTaken !== null ? String(project.scheduleData.timeTaken) : '',     // <-- Time taken field (convert number to string)
            dateReceived        : project.scheduleData?.dateReceived || '',  // <-- Date received field
            dateFulfilled       : project.scheduleData?.dateFulfilled || '', // <-- Date fulfilled field
            enabled             : project.enabled !== false                  // <-- Gallery visibility field (masterConfig-owned)
        });

        const [isSaving, setIsSaving]           = React.useState(false);          // <-- Saving state
        const [message, setMessage]             = React.useState(null);           // <-- Inline status message state
        const [savePhase, setSavePhase]         = React.useState(null);           // <-- Current save phase label
        const [workerConfig, setWorkerConfig]   = React.useState(null);           // <-- Cached Worker URL + API key
        const [toasts, setToasts]               = React.useState([]);             // <-- Floating toast notifications
        const [masterIndexEntry, setMasterIndexEntry] = React.useState(null);     // <-- Read-only Project Info panel source
        const [showRenameConfirm, setShowRenameConfirm] = React.useState(false);  // <-- Gate on the rename confirm panel
        const [pendingNewFolderId, setPendingNewFolderId] = React.useState('');   // <-- Editable proposed new folder path
        const [showAliasSection, setShowAliasSection] = React.useState(!!project.projectNameAlias); // <-- Collapsed unless an alias already exists
        const [dropdownOptions, setDropdownOptions] = React.useState({
            inputTypes          : [],                                              // <-- Input type options from config
            artists             : [],                                              // <-- Artist options from config
            designers           : []                                               // <-- Designer options from config
        });

        const initialEnabledRef = React.useRef(project.enabled !== false);        // <-- Detect visibility changes on save

        // DELETE MODAL STATE | Danger Zone — Delete Project Permanently
        const [showDeleteModal, setShowDeleteModal]     = React.useState(false);  // <-- Modal visibility
        const [deleteConfirmText, setDeleteConfirmText] = React.useState('');     // <-- Type-to-confirm input value
        const [isDeleting, setIsDeleting]               = React.useState(false);  // <-- Delete in-flight state
        const [deletePhase, setDeletePhase]             = React.useState(null);   // <-- Current delete phase label
        const [deleteError, setDeleteError]             = React.useState(null);   // <-- Delete hard-failure message
        const [deleteResult, setDeleteResult]           = React.useState(null);   // <-- { r2Verified, remainingObjectCount, localVerified }


        // HELPER FUNCTION | Add a Floating Toast Notification
        // ---------------------------------------------------------------
        const na_add_toast = (text, type) => {
            const id = Date.now() + Math.random();                           // <-- Unique ID for each toast
            setToasts(prev => [...prev, { id, text, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));           // <-- Auto-dismiss after 4 seconds
            }, 4000);
        };
        // ---------------------------------------------------------------


        // EFFECT | Load Dropdown Options and Worker Config on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const loadMountData = async () => {
                // LOAD DROPDOWN OPTIONS FROM MASTER CONFIG
                try {
                    const config = await loadMasterConfig();
                    if (config) {
                        setDropdownOptions({
                            inputTypes  : config.vale__ProductionInput__OptionsList || [],  // <-- Input types list
                            artists     : config.vale__ConceptArtist__OptionsList || [],    // <-- Artists list
                            designers   : config.vale__Designer__OptionsList || []          // <-- Designers list
                        });
                    }
                } catch (error) {
                    console.error('[ProjectEditor] Error loading dropdown options:', error); // <-- Log error
                }

                // LOAD MASTER INDEX ENTRY FOR THE READ-ONLY PROJECT INFO PANEL
                try {
                    await na_load_master_index();                            // <-- Ensure the index map is populated
                    setMasterIndexEntry(na_get_master_index_entry(project.folderId));
                } catch (error) {
                    console.warn('[ProjectEditor] Could not load master index entry:', error); // <-- Non-fatal
                }

                // FETCH WORKER CONFIG (URL + API KEY) FROM FLASK
                try {
                    const configResponse = await fetch('/api/editor-config');
                    if (configResponse.ok) {
                        const config = await configResponse.json();
                        setWorkerConfig(config);                             // <-- Cache: { workerApiBaseUrl, apiKey }
                    } else {
                        console.warn('[ProjectEditor] Worker config unavailable — saves will be local only.');
                    }
                } catch (error) {
                    console.warn('[ProjectEditor] Could not fetch worker config:', error);
                }
            };

            loadMountData();                                                 // <-- Execute on mount
        }, []);
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Input Field Changes
        // ---------------------------------------------------------------
        const handleInputChange = (field, value) => {
            setFormData({
                ...formData,                                                 // <-- Spread existing data
                [field]: value                                               // <-- Update changed field
            });
            setMessage(null);                                                // <-- Clear message on change
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Validate Form Data
        // ---------------------------------------------------------------
        const validateForm = () => {
            if (!formData.projectName.trim()) {
                setMessage({ type: 'error', text: 'Project name is required' });  // <-- Validation error
                return false;
            }

            if (!formData.projectCode.trim()) {
                setMessage({ type: 'error', text: 'Project code is required' });  // <-- Validation error
                return false;
            }

            if (formData.timeAllocated !== '') {
                const timeAllocatedNum = parseFloat(formData.timeAllocated);
                if (isNaN(timeAllocatedNum) || timeAllocatedNum < 0) {
                    setMessage({ type: 'error', text: 'Time expected must be a positive number' });
                    return false;
                }
            }

            if (formData.timeTaken !== '') {
                const timeTakenNum = parseFloat(formData.timeTaken);
                if (isNaN(timeTakenNum) || timeTakenNum < 0) {
                    setMessage({ type: 'error', text: 'Time taken must be a positive number' });
                    return false;
                }
            }

            if (formData.dateReceived !== '') {
                const datePattern = /^\d{1,2}-[A-Za-z]{3}-\d{4}$/;
                if (!datePattern.test(formData.dateReceived.trim())) {
                    setMessage({ type: 'error', text: 'Date received must be in DD-MMM-YYYY format (e.g., 10-Oct-2025)' });
                    return false;
                }
            }

            if (formData.dateFulfilled !== '') {
                const datePattern = /^\d{1,2}-[A-Za-z]{3}-\d{4}$/;
                if (!datePattern.test(formData.dateFulfilled.trim())) {
                    setMessage({ type: 'error', text: 'Date fulfilled must be in DD-MMM-YYYY format (e.g., 12-Oct-2025)' });
                    return false;
                }
            }

            return true;
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Build Updated Project JSON Object
        // ---------------------------------------------------------------
        // Rebuilds the object with projectName / projectCode / projectNameAlias
        // explicitly first (in that order) so a brand-new projectNameAlias key
        // always lands right after the project identity fields in the saved
        // JSON, rather than being appended wherever a spread happens to place
        // it. Every other field keeps its existing relative order via the
        // restOfProject spread.
        // ---------------------------------------------------------------
        const buildUpdatedProject = () => {
            const { projectName: _pn, projectCode: _pc, projectNameAlias: _pna, ...restOfProject } = project;

            const updatedProject = {
                projectName         : formData.projectName.trim(),
                projectCode         : formData.projectCode.trim(),
                projectNameAlias    : formData.projectNameAlias.trim(),
                ...restOfProject,                                            // <-- Every other original field, original order
                productionData      : {
                    ...project.productionData,
                    input           : formData.productionInput.trim(),
                    additionalNotes : formData.productionNotes.trim()
                },
                sketchUpModel       : {
                    ...project.sketchUpModel,
                    url             : formData.sketchUpUrl.trim()
                }
            };

            if (formData.conceptArtist !== '') {
                updatedProject.productionData.conceptArtist = formData.conceptArtist.trim();
            }

            if (formData.designer !== '') {
                updatedProject.productionData.designer = formData.designer.trim();
            }

            if (formData.timeAllocated !== '' || formData.timeTaken !== '' || formData.dateReceived !== '' || formData.dateFulfilled !== '') {
                updatedProject.scheduleData = { ...project.scheduleData };

                if (formData.timeAllocated !== '') {
                    updatedProject.scheduleData.timeAllocated = parseFloat(formData.timeAllocated);
                }
                if (formData.timeTaken !== '') {
                    updatedProject.scheduleData.timeTaken = parseFloat(formData.timeTaken);
                }
                if (formData.dateReceived !== '') {
                    updatedProject.scheduleData.dateReceived = formData.dateReceived.trim();
                }
                if (formData.dateFulfilled !== '') {
                    updatedProject.scheduleData.dateFulfilled = formData.dateFulfilled.trim();
                }
            }

            return updatedProject;
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Apply an Independent Visibility Phase When `enabled` Changed
        // ---------------------------------------------------------------
        const applyVisibilityPhaseIfChanged = async (targetFolderId) => {
            if (formData.enabled === initialEnabledRef.current) return;      // <-- No change — nothing to do

            setSavePhase('Updating gallery visibility...');
            await na_update_project_visibility_via_r2(
                workerConfig.workerApiBaseUrl, workerConfig.apiKey, targetFolderId, formData.enabled, 15000
            );
            try {
                await na_update_project_visibility_mirror(targetFolderId, formData.enabled);
            } catch (mirrorError) {
                console.warn('[ProjectEditor] Visibility local mirror failed:', mirrorError.message);
                na_add_toast('Visibility saved to cloud — local mirror failed', 'warning');
            }
            initialEnabledRef.current = formData.enabled;                    // <-- Reset baseline after a successful apply
        };
        // ---------------------------------------------------------------


        // FUNCTION | Perform the Actual Save — Normal Content Save or Rename+Save
        // ------------------------------------------------------------
        const performSave = async (targetFolderId, isRename) => {
            setIsSaving(true);
            setMessage(null);
            setSavePhase(null);

            const updatedProject = buildUpdatedProject();

            try {
                if (isRename) {
                    // PHASE 1 | R2 SSOT FOLDER MOVE (must succeed before Phase 2)
                    setSavePhase('Renaming project folder on R2...');
                    await na_rename_project_via_r2(
                        workerConfig.workerApiBaseUrl, workerConfig.apiKey,
                        project.folderId, targetFolderId, updatedProject, 60000
                    );
                    na_add_toast('Project folder renamed on R2 ✓', 'success');  // <-- GREEN: R2 move confirmed
                    na_reset_master_index_cache();                          // <-- Force a fresh index fetch next load (folderId changed)

                    // PHASE 2 | LOCAL MIRROR MOVE (best-effort — non-fatal on failure)
                    setSavePhase('Mirroring rename locally...');
                    try {
                        await na_rename_project_mirror_locally(project.folderId, targetFolderId, updatedProject);
                    } catch (mirrorError) {
                        console.warn('[ProjectEditor] Local rename mirror failed:', mirrorError.message);
                        na_add_toast('Renamed on cloud — local mirror failed, restart Flask to resync', 'warning');
                    }
                } else {
                    // PHASE 1 | R2 SSOT WRITE (must succeed before Phase 2)
                    setSavePhase('Saving to cloud...');
                    await na_save_project_to_r2(
                        workerConfig.workerApiBaseUrl, workerConfig.apiKey, targetFolderId, updatedProject, 15000
                    );
                    na_add_toast('Saved to R2 ✓', 'success');               // <-- GREEN: R2 write confirmed

                    // PHASE 2 | LOCAL MIRROR (best-effort — non-fatal on failure)
                    setSavePhase('Mirroring locally...');
                    try {
                        await na_mirror_project_to_local(targetFolderId, updatedProject);
                    } catch (mirrorError) {
                        console.warn('[ProjectEditor] Local mirror failed after R2 write:', mirrorError.message);
                        na_add_toast('Local mirror failed — restart Flask to resync', 'warning'); // <-- AMBER: non-fatal
                    }
                }

                // PHASE 3 | VISIBILITY (independent of content save/rename, only when changed)
                await applyVisibilityPhaseIfChanged(targetFolderId);

                // ALL PHASES SUCCEEDED
                setSavePhase(null);
                setShowRenameConfirm(false);
                na_add_toast(isRename ? 'Project saved and renamed!' : 'Project saved!', 'success');
                setMessage({
                    type : 'success',
                    text : isRename ? `Project saved and moved to ${targetFolderId}` : 'Project saved!'
                });

                if (onSaveSuccess) {
                    const finalProject = { ...updatedProject, folderId: targetFolderId, enabled: formData.enabled };
                    setTimeout(() => onSaveSuccess(finalProject), 1500);
                }

            } catch (error) {
                console.error('[ProjectEditor] Save error:', error);
                setSavePhase(null);
                na_add_toast(`Save failed — ${error.message}`, 'error');    // <-- RED: hard failure
                setMessage({
                    type : 'error',
                    text : `Error: ${error.message}`
                });
            } finally {
                setIsSaving(false);
            }
        };
        // ---------------------------------------------------------------


        // FUNCTION | Handle Form Submission — Detects a Needed Rename Before Saving
        // ------------------------------------------------------------
        const handleSubmit = async (e) => {
            e.preventDefault();

            if (!validateForm()) return;

            if (!workerConfig || !workerConfig.workerApiBaseUrl || !workerConfig.apiKey) {
                setMessage({
                    type : 'error',
                    text : 'Worker config unavailable — cannot write to R2. Check Flask is running and Token__CloudflareAPI.env has EDITOR_WORKER_URL and EDITOR_API_KEY set.'
                });
                return;
            }

            const computedNewFolderId = na_compute_folder_id(project.folderId, formData.projectCode, formData.projectName);

            if (computedNewFolderId !== project.folderId) {
                // RENAME NEEDED | Halt here and let the user review/confirm before anything moves
                setPendingNewFolderId(computedNewFolderId);
                setShowRenameConfirm(true);
                return;
            }

            await performSave(project.folderId, false);
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Confirm the Proposed Rename and Save
        // ---------------------------------------------------------------
        const handleConfirmRename = async () => {
            const targetFolderId = pendingNewFolderId.trim();
            const validation     = na_validate_folder_id(targetFolderId);
            if (!validation.valid) {
                setMessage({ type: 'error', text: validation.error });
                return;
            }
            await performSave(targetFolderId, true);
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Cancel the Proposed Rename (No Changes Made)
        // ---------------------------------------------------------------
        const handleCancelRename = () => {
            setShowRenameConfirm(false);
            setPendingNewFolderId('');
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Open the Delete Confirmation Modal
        // ---------------------------------------------------------------
        const handleOpenDeleteModal = () => {
            setDeleteConfirmText('');
            setDeleteError(null);
            setDeleteResult(null);
            setShowDeleteModal(true);
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Cancel/Close the Delete Modal (No Changes Made)
        // ---------------------------------------------------------------
        const handleCancelDelete = () => {
            if (isDeleting) return;                                          // <-- Never allow closing mid-delete
            setShowDeleteModal(false);
            setDeleteConfirmText('');
            setDeleteError(null);
            setDeleteResult(null);
        };
        // ---------------------------------------------------------------


        // FUNCTION | Confirm Permanent Delete — R2 First, Then Local Mirror, Both Verified
        // ------------------------------------------------------------
        const handleConfirmDelete = async () => {
            if (deleteConfirmText.trim() !== project.projectCode) return;    // <-- Safety net; button is already disabled until this matches

            if (!workerConfig || !workerConfig.workerApiBaseUrl || !workerConfig.apiKey) {
                setDeleteError('Worker config unavailable — cannot delete from R2. Check Flask is running and Token__CloudflareAPI.env has EDITOR_WORKER_URL and EDITOR_API_KEY set.');
                return;
            }

            setIsDeleting(true);
            setDeleteError(null);
            setDeleteResult(null);

            try {
                // PHASE 1 | R2 SSOT DELETE (must succeed before Phase 2)
                setDeletePhase('Deleting from Cloudflare R2...');
                const r2Result = await na_delete_project_via_r2(
                    workerConfig.workerApiBaseUrl, workerConfig.apiKey, project.folderId, 60000
                );
                na_reset_master_index_cache();                               // <-- Force a fresh index fetch next load (entry removed)

                // PHASE 2 | LOCAL MIRROR DELETE (best-effort — R2 is already the source of truth)
                setDeletePhase('Cleaning up local files...');
                let localResult = { localVerified: false };
                try {
                    localResult = await na_delete_project_mirror_locally(project.folderId);
                } catch (localError) {
                    console.warn('[ProjectEditor] Local delete mirror failed:', localError.message);
                    localResult = { localVerified: false, error: localError.message };
                }

                setDeletePhase(null);
                setDeleteResult({
                    r2Verified           : r2Result.r2Verified === true,
                    remainingObjectCount : r2Result.remainingObjectCount ?? 0,
                    localVerified        : localResult.localVerified === true,
                    localError           : localResult.error || null
                });
                na_add_toast(r2Result.r2Verified ? 'Project deleted permanently' : 'Project deletion could not be fully verified', r2Result.r2Verified ? 'success' : 'warning');

            } catch (error) {
                console.error('[ProjectEditor] Delete error:', error);
                setDeletePhase(null);
                setDeleteError(error.message);
                na_add_toast(`Delete failed — ${error.message}`, 'error');
            } finally {
                setIsDeleting(false);
            }
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Finish the Delete Flow — Close Modal and Leave the Editor
        // ---------------------------------------------------------------
        const handleFinishDelete = () => {
            setShowDeleteModal(false);
            if (onDeleteSuccess) {
                onDeleteSuccess(project.folderId);
            }
        };
        // ---------------------------------------------------------------


        // HELPER | Derive save button label from phase and saving state
        // ---------------------------------------------------------------
        const saveBtnLabel = isSaving
            ? (savePhase || 'Saving...')
            : 'Save Changes';
        // ---------------------------------------------------------------


        return (
            <React.Fragment>

                {/* TOAST OVERLAY — floating save-phase feedback */}
                {toasts.length > 0 && (
                    <div className="wcp-toast-container">
                        {toasts.map(t => (
                            <div key={t.id} className={`wcp-toast wcp-toast--${t.type}`}>
                                {t.text}
                            </div>
                        ))}
                    </div>
                )}

                {/* DELETE CONFIRMATION MODAL — centred overlay, gated by typing the project code */}
                {showDeleteModal && (
                    <div className="editor-modal-overlay">
                        <div className="editor-modal editor-modal--danger">

                            {!deleteResult && !deleteError && (
                                <React.Fragment>
                                    <h2 className="editor-modal__title">Delete Project Permanently?</h2>
                                    <p className="editor-modal__text">
                                        This will permanently delete <strong>all</strong> Cloudflare R2/CDN data (images,
                                        thumbnails, 3D models, and the project record) and the local mirror copy for{' '}
                                        <strong>{project.displayName || project.projectName}</strong> ({project.projectCode}).
                                        This cannot be recovered.
                                    </p>
                                    <div className="editor-form__field">
                                        <label className="editor-form__label" htmlFor="deleteConfirmText">
                                            Type <strong>{project.projectCode}</strong> to confirm
                                        </label>
                                        <input
                                            type="text"
                                            id="deleteConfirmText"
                                            className="editor-form__input"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            disabled={isDeleting}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="editor-modal__buttons">
                                        <button
                                            type="button"
                                            className="editor-form__button editor-form__button--secondary"
                                            onClick={handleCancelDelete}
                                            disabled={isDeleting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="editor-form__button editor-form__button--danger"
                                            onClick={handleConfirmDelete}
                                            disabled={isDeleting || deleteConfirmText.trim() !== project.projectCode}
                                        >
                                            {isDeleting ? (deletePhase || 'Deleting...') : 'Delete Permanently'}
                                        </button>
                                    </div>
                                </React.Fragment>
                            )}

                            {deleteError && !deleteResult && (
                                <React.Fragment>
                                    <h2 className="editor-modal__title">Delete Failed</h2>
                                    <p className="editor-modal__text editor-modal__text--error">{deleteError}</p>
                                    <p className="editor-modal__text">
                                        Nothing was deleted — the project is unaffected. You can try again or cancel.
                                    </p>
                                    <div className="editor-modal__buttons">
                                        <button
                                            type="button"
                                            className="editor-form__button editor-form__button--secondary"
                                            onClick={handleCancelDelete}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="editor-form__button editor-form__button--danger"
                                            onClick={handleConfirmDelete}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </React.Fragment>
                            )}

                            {deleteResult && (
                                <React.Fragment>
                                    <h2 className="editor-modal__title">Deletion Complete</h2>
                                    <ul className="editor-modal__checklist">
                                        <li className={`editor-modal__check-item ${deleteResult.r2Verified ? 'editor-modal__check-item--success' : 'editor-modal__check-item--error'}`}>
                                            <span className="editor-modal__check-icon">{deleteResult.r2Verified ? '\u2713' : '\u2717'}</span>
                                            Cloudflare R2 / CDN Data — {deleteResult.r2Verified
                                                ? 'Deleted and Verified'
                                                : `Verification failed (${deleteResult.remainingObjectCount} object(s) remain)`}
                                        </li>
                                        <li className={`editor-modal__check-item ${deleteResult.localVerified ? 'editor-modal__check-item--success' : 'editor-modal__check-item--warning'}`}>
                                            <span className="editor-modal__check-icon">{deleteResult.localVerified ? '\u2713' : '\u26A0'}</span>
                                            Local Mirror Data — {deleteResult.localVerified
                                                ? 'Deleted and Verified'
                                                : 'Not fully verified — restart Flask to resync'}
                                        </li>
                                    </ul>
                                    <div className="editor-modal__buttons">
                                        <button
                                            type="button"
                                            className="editor-form__button editor-form__button--primary"
                                            onClick={handleFinishDelete}
                                        >
                                            Return to Gallery
                                        </button>
                                    </div>
                                </React.Fragment>
                            )}

                        </div>
                    </div>
                )}

            <form className="editor-form" onSubmit={handleSubmit}>
                <h2 className="editor-form__title">
                    Edit Project: {project.projectName}
                    {project.projectNameAlias && (
                        <span className="editor-form__title-alias"> (displayed as "{project.projectNameAlias}")</span>
                    )}
                </h2>

                {/* PROJECT INFO PANEL — READ-ONLY, SOURCED FROM THE MASTER INDEX */}
                <div className="editor-form__info-panel">
                    <h3 className="editor-form__info-panel-title">Project Info (Read-Only)</h3>
                    <dl className="editor-form__info-grid">
                        <dt>Folder Path</dt>
                        <dd>{project.folderId}</dd>
                        <dt>Asset Home</dt>
                        <dd>{masterIndexEntry?.assetHome === 'gh' ? 'GitHub Pages' : 'Cloudflare R2'}</dd>
                        <dt>Image Count</dt>
                        <dd>{masterIndexEntry?.imageCount ?? '—'}</dd>
                        <dt>3D Model (GLB)</dt>
                        <dd>{masterIndexEntry?.hasGlb_R2 ? 'Yes' : 'No'}</dd>
                        <dt>Last Synced</dt>
                        <dd>{masterIndexEntry?.lastSynced || '—'}</dd>
                    </dl>
                </div>

                {message && (
                    <div className={`editor-form__message editor-form__message--${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* PROJECT NAME FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="projectName">
                        Project Name
                    </label>
                    <input
                        type="text"
                        id="projectName"
                        className="editor-form__input"
                        value={formData.projectName}
                        onChange={(e) => handleInputChange('projectName', e.target.value)}
                        disabled={isSaving || showRenameConfirm}
                        required
                    />
                    <span className="editor-form__help-text">
                        Changing this (or Project Code) moves the live folder — Save will ask you to confirm the rename first.
                        Prefer the Display Name Alias below for a simple display-name change instead.
                    </span>
                </div>

                {/* DISPLAY NAME ALIAS — COLLAPSED BY DEFAULT UNLESS ALREADY SET */}
                <div className="editor-form__field">
                    <button
                        type="button"
                        className="editor-form__disclosure-toggle"
                        onClick={() => setShowAliasSection(!showAliasSection)}
                        disabled={isSaving || showRenameConfirm}
                    >
                        <span className={`editor-form__disclosure-arrow ${showAliasSection ? 'editor-form__disclosure-arrow--open' : ''}`}>
                            &#9656;
                        </span>
                        Advanced: Display Name Alias
                    </button>
                    {showAliasSection && (
                        <div className="editor-form__disclosure-content">
                            <label className="editor-form__label" htmlFor="projectNameAlias">
                                Display Name Alias
                            </label>
                            <input
                                type="text"
                                id="projectNameAlias"
                                className="editor-form__input"
                                value={formData.projectNameAlias}
                                onChange={(e) => handleInputChange('projectNameAlias', e.target.value)}
                                placeholder="e.g., Bressard-Kayode Scheme-01"
                                disabled={isSaving || showRenameConfirm}
                            />
                            <span className="editor-form__help-text">
                                Optional. When set, Whitecardopedia shows this name everywhere instead of the Project Name
                                above — in the gallery, search, and this editor. This does NOT rename the live folder or
                                CDN path, so it is the safe way to change how a project is displayed. Leave blank to just
                                use the Project Name.
                            </span>
                        </div>
                    )}
                </div>

                {/* PROJECT CODE FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="projectCode">
                        Project Code
                    </label>
                    <input
                        type="text"
                        id="projectCode"
                        className="editor-form__input"
                        value={formData.projectCode}
                        onChange={(e) => handleInputChange('projectCode', e.target.value)}
                        disabled={isSaving || showRenameConfirm}
                        required
                    />
                </div>

                {/* ENABLED / GALLERY VISIBILITY FIELD */}
                <div className="editor-form__field editor-form__field--checkbox">
                    <label className="editor-form__checkbox-label" htmlFor="enabled">
                        <input
                            type="checkbox"
                            id="enabled"
                            className="editor-form__checkbox"
                            checked={formData.enabled}
                            onChange={(e) => handleInputChange('enabled', e.target.checked)}
                            disabled={isSaving || showRenameConfirm}
                        />
                        Visible in Gallery
                    </label>
                    <span className="editor-form__help-text">
                        Unchecking this hides the project from the public gallery without deleting any data
                    </span>
                </div>

                {/* PRODUCTION INPUT FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="productionInput">
                        Production Input
                    </label>
                    <select
                        id="productionInput"
                        className="editor-form__input"
                        value={formData.productionInput}
                        onChange={(e) => handleInputChange('productionInput', e.target.value)}
                        disabled={isSaving || showRenameConfirm}
                    >
                        <option value="">Select input type...</option>
                        {na_build_dropdown_options(dropdownOptions.inputTypes, formData.productionInput).map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>

                {/* CONCEPT ARTIST FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="conceptArtist">
                        Concept Artist
                    </label>
                    <select
                        id="conceptArtist"
                        className="editor-form__input"
                        value={formData.conceptArtist}
                        onChange={(e) => handleInputChange('conceptArtist', e.target.value)}
                        disabled={isSaving || showRenameConfirm}
                    >
                        <option value="">Not specified</option>
                        {na_build_dropdown_options(dropdownOptions.artists, formData.conceptArtist).map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <span className="editor-form__help-text">
                        Optional - Select the artist who created the concept
                    </span>
                </div>

                {/* DESIGNER FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="designer">
                        Designer
                    </label>
                    <select
                        id="designer"
                        className="editor-form__input"
                        value={formData.designer}
                        onChange={(e) => handleInputChange('designer', e.target.value)}
                        disabled={isSaving || showRenameConfirm}
                    >
                        <option value="">Not specified</option>
                        {na_build_dropdown_options(dropdownOptions.designers, formData.designer).map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <span className="editor-form__help-text">
                        Optional - Select the designer who worked on this project
                    </span>
                </div>

                {/* PRODUCTION NOTES FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="productionNotes">
                        Additional Notes
                    </label>
                    <textarea
                        id="productionNotes"
                        className="editor-form__textarea"
                        value={formData.productionNotes}
                        onChange={(e) => handleInputChange('productionNotes', e.target.value)}
                        placeholder="Additional production notes and details..."
                        disabled={isSaving || showRenameConfirm}
                    />
                </div>

                {/* TIME EXPECTED FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="timeAllocated">
                        Time Expected (Hours)
                    </label>
                    <input
                        type="text"
                        id="timeAllocated"
                        className="editor-form__input"
                        value={formData.timeAllocated}
                        onChange={(e) => handleInputChange('timeAllocated', e.target.value)}
                        placeholder="e.g., 2 or 1.5"
                        disabled={isSaving || showRenameConfirm}
                    />
                    <span className="editor-form__help-text">
                        Optional - Planned time for project in hours (supports decimals, e.g., 0.25 for 15 minutes, 0.5 for 30 minutes)
                    </span>
                </div>

                {/* TIME TAKEN FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="timeTaken">
                        Time Taken (Hours)
                    </label>
                    <input
                        type="text"
                        id="timeTaken"
                        className="editor-form__input"
                        value={formData.timeTaken}
                        onChange={(e) => handleInputChange('timeTaken', e.target.value)}
                        placeholder="e.g., 3 or 1.5"
                        disabled={isSaving || showRenameConfirm}
                    />
                    <span className="editor-form__help-text">
                        Optional - Actual time taken to complete project in hours (supports decimals, e.g., 0.25 for 15 minutes, 0.5 for 30 minutes)
                    </span>
                </div>

                {/* DATE RECEIVED FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="dateReceived">
                        Date Received
                    </label>
                    <input
                        type="text"
                        id="dateReceived"
                        className="editor-form__input"
                        value={formData.dateReceived}
                        onChange={(e) => handleInputChange('dateReceived', e.target.value)}
                        placeholder="DD-MMM-YYYY (e.g., 10-Oct-2025)"
                        disabled={isSaving || showRenameConfirm}
                    />
                    <span className="editor-form__help-text">
                        Optional - Date project was received (DD-MMM-YYYY format)
                    </span>
                </div>

                {/* DATE FULFILLED FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="dateFulfilled">
                        Date Fulfilled
                    </label>
                    <input
                        type="text"
                        id="dateFulfilled"
                        className="editor-form__input"
                        value={formData.dateFulfilled}
                        onChange={(e) => handleInputChange('dateFulfilled', e.target.value)}
                        placeholder="DD-MMM-YYYY (e.g., 12-Oct-2025)"
                        disabled={isSaving || showRenameConfirm}
                    />
                    <span className="editor-form__help-text">
                        Optional - Date project was completed (DD-MMM-YYYY format)
                    </span>
                </div>

                {/* SKETCHUP MODEL URL FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="sketchUpUrl">
                        SketchUp Model URL
                    </label>
                    <input
                        type="text"
                        id="sketchUpUrl"
                        className="editor-form__input"
                        value={formData.sketchUpUrl}
                        onChange={(e) => handleInputChange('sketchUpUrl', e.target.value)}
                        placeholder="https://app.sketchup.com/..."
                        disabled={isSaving || showRenameConfirm}
                    />
                    <span className="editor-form__help-text">
                        Leave blank or set to 'None', 'nil', or 'False' if not available
                    </span>
                </div>

                {/* DANGER ZONE — ALWAYS VISIBLE UNLESS A RENAME IS PENDING */}
                {!showRenameConfirm && (
                    <div className="editor-form__danger-zone">
                        <h3 className="editor-form__danger-zone-title">Danger Zone</h3>
                        <p className="editor-form__danger-zone-text">
                            Need a different display name? Use the Display Name Alias above instead of renaming — it is
                            much lower risk. Deleting a project permanently removes all Cloudflare R2/CDN data and the
                            local mirror copy. This cannot be undone.
                        </p>
                        <button
                            type="button"
                            className="editor-form__button editor-form__button--danger"
                            onClick={handleOpenDeleteModal}
                            disabled={isSaving}
                        >
                            Delete Project Permanently
                        </button>
                    </div>
                )}

                {/* RENAME CONFIRMATION PANEL — ONLY SHOWN WHEN CODE/NAME WOULD MOVE THE LIVE FOLDER */}
                {showRenameConfirm && (
                    <div className="editor-form__rename-panel">
                        <h3 className="editor-form__rename-panel-title">Renaming Project Folder</h3>
                        <p className="editor-form__rename-panel-text">
                            The Project Code and/or Name you entered would move this project's live folder on Cloudflare R2.
                            All images, thumbnails and 3D models will be moved to the new location, and the old folder will
                            be removed once the move completes successfully.
                        </p>

                        <div className="editor-form__field">
                            <label className="editor-form__label">Current Folder</label>
                            <input type="text" className="editor-form__input" value={project.folderId} disabled readOnly />
                        </div>

                        <div className="editor-form__field">
                            <label className="editor-form__label" htmlFor="pendingNewFolderId">New Folder (editable)</label>
                            <input
                                type="text"
                                id="pendingNewFolderId"
                                className="editor-form__input"
                                value={pendingNewFolderId}
                                onChange={(e) => setPendingNewFolderId(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>

                        <p className="editor-form__rename-panel-note">
                            Note: this only moves the live web/R2 copy. If you plan to sync this project again from
                            SketchUp via ValeVision Cloud Sync, also rename the local SketchUp project folder on disk to
                            match — otherwise the next sync will recreate a folder using the old name. If you only want
                            to change how the project is displayed, cancel this and use the Display Name Alias above
                            instead — it never moves the folder.
                        </p>

                        <div className="editor-form__buttons">
                            <button
                                type="button"
                                className="editor-form__button editor-form__button--secondary"
                                onClick={handleCancelRename}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="editor-form__button editor-form__button--danger"
                                onClick={handleConfirmRename}
                                disabled={isSaving}
                            >
                                {isSaving ? (savePhase || 'Working...') : 'Confirm & Save with Rename'}
                            </button>
                        </div>
                    </div>
                )}

                {/* FORM BUTTONS */}
                {!showRenameConfirm && (
                    <div className="editor-form__buttons">
                        <button
                            type="button"
                            className="editor-form__button editor-form__button--secondary"
                            onClick={onCancel}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="editor-form__button editor-form__button--primary"
                            disabled={isSaving}
                        >
                            {saveBtnLabel}
                        </button>
                    </div>
                )}
            </form>

            </React.Fragment>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
