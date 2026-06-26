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
// - Editable fields: projectName, projectCode, productionData, scheduleData, sketchUp URL
// - Production data: input type (dropdown), concept artist (dropdown), additional notes
// - Schedule data: timeAllocated, timeTaken, dateReceived, dateFulfilled
// - Dropdown options dynamically loaded from masterConfig.json
// - Validates input before saving (positive numbers, date format DD-MMM-YYYY)
// - Two-phase save: R2 SSOT first (via Cloudflare Worker), then local mirror (via Flask)
// - Phase 1 (R2) must succeed before Phase 2 (local mirror) runs
// - Worker config (URL + API key) fetched from Flask GET /api/editor-config on mount
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial implementation.
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | ProjectEditorForm Component
// -----------------------------------------------------------------------------

    // COMPONENT | Project Data Editor Form
    // ------------------------------------------------------------
    function ProjectEditorForm({ project, onCancel, onSaveSuccess }) {
        const [formData, setFormData] = React.useState({
            projectName         : project.projectName || '',                 // <-- Project name field
            projectCode         : project.projectCode || '',                 // <-- Project code field
            productionInput     : project.productionData?.input || '',       // <-- Production input field
            conceptArtist       : project.productionData?.conceptArtist || '', // <-- Concept artist field
            productionNotes     : project.productionData?.additionalNotes || '',  // <-- Production notes field
            sketchUpUrl         : project.sketchUpModel?.url || '',          // <-- SketchUp URL field
            timeAllocated       : project.scheduleData?.timeAllocated !== undefined && project.scheduleData?.timeAllocated !== null ? String(project.scheduleData.timeAllocated) : '', // <-- Time expected field (convert number to string)
            timeTaken           : project.scheduleData?.timeTaken !== undefined && project.scheduleData?.timeTaken !== null ? String(project.scheduleData.timeTaken) : '',     // <-- Time taken field (convert number to string)
            dateReceived        : project.scheduleData?.dateReceived || '',  // <-- Date received field
            dateFulfilled       : project.scheduleData?.dateFulfilled || ''  // <-- Date fulfilled field
        });

        const [isSaving, setIsSaving]           = React.useState(false);          // <-- Saving state
        const [message, setMessage]             = React.useState(null);           // <-- Inline status message state
        const [savePhase, setSavePhase]         = React.useState(null);           // <-- Current save phase label
        const [workerConfig, setWorkerConfig]   = React.useState(null);           // <-- Cached Worker URL + API key
        const [toasts, setToasts]               = React.useState([]);             // <-- Floating toast notifications
        const [dropdownOptions, setDropdownOptions] = React.useState({
            inputTypes          : [],                                              // <-- Input type options from config
            artists             : []                                               // <-- Artist options from config
        });


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
                            artists     : config.vale__ConceptArtist__OptionsList || []     // <-- Artists list
                        });
                    }
                } catch (error) {
                    console.error('[ProjectEditor] Error loading dropdown options:', error); // <-- Log error
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
        const buildUpdatedProject = () => {
            const updatedProject = {
                ...project,                                                  // <-- Spread existing project data
                projectName         : formData.projectName.trim(),
                projectCode         : formData.projectCode.trim(),
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


        // FUNCTION | Handle Form Submission — Two-Phase R2-First Save
        // ------------------------------------------------------------
        const handleSubmit = async (e) => {
            e.preventDefault();

            if (!validateForm()) return;

            setIsSaving(true);
            setMessage(null);
            setSavePhase(null);

            const updatedProject = buildUpdatedProject();
            const folderId       = project.folderId;

            try {
                // PHASE 1 | R2 SSOT WRITE (must succeed before Phase 2)
                if (workerConfig && workerConfig.workerApiBaseUrl && workerConfig.apiKey) {
                    setSavePhase('Saving to cloud...');
                    await na_save_project_to_r2(
                        workerConfig.workerApiBaseUrl,
                        workerConfig.apiKey,
                        folderId,
                        updatedProject,
                        15000
                    );
                    na_add_toast('Saved to R2 ✓', 'success');               // <-- GREEN: R2 write confirmed
                } else {
                    // WORKER CONFIG NOT AVAILABLE — abort with clear error
                    throw new Error('Worker config unavailable — cannot write to R2. Check Flask is running and Token__CloudflareAPI.env has EDITOR_WORKER_URL and EDITOR_API_KEY set.');
                }

                // PHASE 2 | LOCAL MIRROR (best-effort — non-fatal on failure)
                setSavePhase('Mirroring locally...');
                try {
                    await na_mirror_project_to_local(folderId, updatedProject);
                } catch (mirrorError) {
                    // R2 already written — local mirror failure is recoverable
                    console.warn('[ProjectEditor] Local mirror failed after R2 write:', mirrorError.message);
                    na_add_toast('Local mirror failed — restart Flask to resync', 'warning'); // <-- AMBER: non-fatal
                    setMessage({
                        type : 'warning',
                        text : 'Saved to cloud. Local mirror failed — restart Flask to resync.'
                    });
                    setSavePhase(null);
                    if (onSaveSuccess) {
                        setTimeout(() => onSaveSuccess(updatedProject), 2000);
                    }
                    return;
                }

                // BOTH PHASES SUCCEEDED
                setSavePhase(null);
                na_add_toast('Project saved!', 'success');                   // <-- GREEN: full success
                setMessage({ type: 'success', text: 'Project saved!' });

                if (onSaveSuccess) {
                    setTimeout(() => onSaveSuccess(updatedProject), 1500);
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

            <form className="editor-form" onSubmit={handleSubmit}>
                <h2 className="editor-form__title">
                    Edit Project: {project.projectName}
                </h2>

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
                        disabled={isSaving}
                        required
                    />
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
                        disabled={isSaving}
                        required
                    />
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
                        disabled={isSaving}
                    >
                        <option value="">Select input type...</option>
                        {dropdownOptions.inputTypes.map((option) => (
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
                        disabled={isSaving}
                    >
                        <option value="">Not specified</option>
                        {dropdownOptions.artists.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <span className="editor-form__help-text">
                        Optional - Select the designer who created the concept
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
                        disabled={isSaving}
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
                        disabled={isSaving}
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
                        disabled={isSaving}
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
                        disabled={isSaving}
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
                        disabled={isSaving}
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
                        disabled={isSaving}
                    />
                    <span className="editor-form__help-text">
                        Leave blank or set to 'None', 'nil', or 'False' if not available
                    </span>
                </div>

                {/* FORM BUTTONS */}
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
            </form>

            </React.Fragment>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
