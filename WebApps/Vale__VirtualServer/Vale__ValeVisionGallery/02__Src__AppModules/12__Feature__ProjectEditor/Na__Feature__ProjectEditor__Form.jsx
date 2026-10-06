// =============================================================================
// VALEVISION GALLERY - PROJECT EDITOR FORM
// =============================================================================
//
// FILE       : Na__Feature__ProjectEditor__Form.jsx
// NAMESPACE  : ValeVisionGallery
// MODULE     : ProjectEditor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Edit a project's gallery fields and its gallery visibility
// CREATED    : 2025
//
// DESCRIPTION:
// - Edits projectName, projectCode, projectNameAlias (display name),
//   productionData (input, designer, concept artist, notes), scheduleData
//   (times, dates, time adjustments) and gallery visibility.
// - Saves through the Gallery API to the Projects Master Library on the
//   server (Management permission). The API writes only these fields, so
//   ValeVision 3D's data in the same record is never touched, keeps a revision
//   copy, and refuses a save made from an older version ("_rev") with a clear
//   message.
// - Projects are never renamed, moved or deleted here: a library folder is
//   shared by every app. Name and code changes update the record only.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0 (app server)
// - Saves go to api/projects/<id> (and /visibility) with the _rev check.
// - Removed: Cloudflare Worker + R2 writes, the local Flask mirror, the
//   worker key fetch, folder rename and permanent delete, the R2 master index
//   info panel (now a library info panel).
//
// 2025 to 08-Jul-2026 - Versions 0.x
// - Two-phase R2 + local saves, rename via R2 folder move, delete, visibility,
//   display name alias, dropdown lists, time adjustments (see the legacy app).
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Gallery API Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | POST JSON to the Gallery API (signed-in session cookie)
    // ------------------------------------------------------------
    // Saves go to the server's Projects Master Library through the Gallery API
    // (api/projects/<id>, Management permission). The API writes only the
    // Gallery's own fields, keeps a revision copy, and answers 409 when the
    // project was saved by someone else since it was loaded (the "_rev" check).
    // ------------------------------------------------------------
    async function na_gallery_api_post(url, body) {
        const doFetch  = window.ValeUserLogin ? window.ValeUserLogin.Fetch : window.fetch.bind(window);
        const response = await doFetch(url, {
            method      : 'POST',
            credentials : 'same-origin',
            headers     : { 'Content-Type': 'application/json' },
            body        : JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
            const error = new Error(data.error || `The server answered ${response.status}`);
            error.status = response.status;
            error.current = data.project || null;
            throw error;
        }
        return data;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Save the Gallery's Fields of a Project
    // ------------------------------------------------------------
    async function na_save_project(folderId, projectData, expectedRev) {
        return na_gallery_api_post(`api/projects/${encodeURIComponent(folderId)}`, { project: projectData, _rev: expectedRev });
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Show or Hide a Project in the Gallery
    // ------------------------------------------------------------
    async function na_update_project_visibility(folderId, enabled, expectedRev) {
        return na_gallery_api_post(`api/projects/${encodeURIComponent(folderId)}/visibility`, { enabled, _rev: expectedRev });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Form Helper Functions
// -----------------------------------------------------------------------------

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
    function ProjectEditorForm({ project, onCancel, onSaveSuccess }) {
        const [formData, setFormData] = React.useState({
            projectName         : project.projectName || '',                 // <-- Project name field
            projectCode         : project.projectCode || '',                 // <-- Project code field
            projectNameAlias    : project.projectNameAlias || '',            // <-- Display-only name override (never renames the folder)
            productionInput     : project.productionData?.input || '',       // <-- Production input field
            conceptArtist       : project.productionData?.conceptArtist || '', // <-- Concept artist field
            designer            : project.productionData?.designer || '',    // <-- Designer field
            productionNotes     : project.productionData?.additionalNotes || '',  // <-- Production notes field
            timeAllocated       : project.scheduleData?.timeAllocated !== undefined && project.scheduleData?.timeAllocated !== null ? String(project.scheduleData.timeAllocated) : '', // <-- Time expected field (convert number to string)
            timeTaken           : project.scheduleData?.timeTaken !== undefined && project.scheduleData?.timeTaken !== null ? String(project.scheduleData.timeTaken) : '',     // <-- Time taken field (convert number to string)
            dateReceived        : project.scheduleData?.dateReceived || '',  // <-- Date received field
            dateFulfilled       : project.scheduleData?.dateFulfilled || '', // <-- Date fulfilled field
            enabled             : project.enabled !== false                  // <-- Gallery visibility field (masterConfig-owned)
        });

        const [timeAdjustments, setTimeAdjustments] = React.useState(            // <-- Advanced Time Data offset fields
            () => na_seed_time_adjustment_fields(project.scheduleData)
        );
        const [showAdvancedTime, setShowAdvancedTime] = React.useState(          // <-- Advanced Time Data section open state
            () => na_read_time_adjustments(project.scheduleData).hasAny          // <-- Auto open when the job already uses offsets
        );

        const [isSaving, setIsSaving]           = React.useState(false);          // <-- Saving state
        const [message, setMessage]             = React.useState(null);           // <-- Inline status message state
        const [savePhase, setSavePhase]         = React.useState(null);           // <-- Current save phase label
        const [toasts, setToasts]               = React.useState([]);             // <-- Floating toast notifications
        const showRenameConfirm = false;                                          // <-- Renames are not done from the Gallery
        const [showAliasSection, setShowAliasSection] = React.useState(!!project.projectNameAlias); // <-- Collapsed unless an alias already exists
        const [dropdownOptions, setDropdownOptions] = React.useState({
            inputTypes          : [],                                              // <-- Input type options from config
            artists             : [],                                              // <-- Artist options from config
            designers           : []                                               // <-- Designer options from config
        });

        const initialEnabledRef = React.useRef(project.enabled !== false);        // <-- Detect visibility changes on save
        const revRef            = React.useRef(project._rev || 0);               // <-- The version this form was loaded from

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


        // EFFECT | Load Dropdown Options on Mount
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


        // SUB FUNCTION | Handle Advanced Time Data Field Change
        // ---------------------------------------------------------------
        const handleTimeAdjustmentChange = (categoryKey, value) => {
            setTimeAdjustments({
                ...timeAdjustments,                                          // <-- Spread existing offsets
                [categoryKey]: value                                         // <-- Update changed category
            });
            setMessage(null);                                                // <-- Clear message on change
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Compute Live Time Card Preview From Current Form State
        // ---------------------------------------------------------------
        // Mirrors exactly what will be written on save, so the readout under
        // the Advanced Time Data section always matches the saved result.
        // ---------------------------------------------------------------
        const computeTimeCardPreview = () => {
            const absolute = formData.timeTaken !== '' ? parseFloat(formData.timeTaken) : NaN;  // <-- Recorded time card hours
            const block    = na_build_time_adjustments_block(timeAdjustments);                   // <-- Offsets as they will be saved

            return na_calculate_net_time({
                timeTaken       : isNaN(absolute) ? undefined : absolute,
                timeAdjustments : block || undefined
            });
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

            for (const category of NA_TIME_ADJUSTMENT_CATEGORIES) {
                const raw = timeAdjustments[category.key];
                if (raw === '' || raw === undefined || raw === null) continue;   // <-- Blank is a valid "unused" value
                const hours = parseFloat(raw);
                if (isNaN(hours) || hours < 0) {
                    setMessage({ type: 'error', text: `${category.label} must be a positive number of hours` });
                    return false;
                }
            }

            const preview = computeTimeCardPreview();                            // <-- Check offsets against the time card
            if (preview.overRecorded) {
                setMessage({
                    type: 'error',
                    text: `Offset hours total more than the ${formData.timeTaken}h recorded in Time Taken. Reduce the offsets or raise Time Taken.`
                });
                return false;
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
                }
            };

            delete updatedProject.sketchUpModel;                             // <-- Legacy SketchUp URL system: never write it back

            if (formData.conceptArtist !== '') {
                updatedProject.productionData.conceptArtist = formData.conceptArtist.trim();
            }

            if (formData.designer !== '') {
                updatedProject.productionData.designer = formData.designer.trim();
            }

            const adjustmentsBlock = na_build_time_adjustments_block(timeAdjustments);  // <-- Null when every category is blank or zero

            if (formData.timeAllocated !== '' || formData.timeTaken !== '' || formData.dateReceived !== '' || formData.dateFulfilled !== '' || adjustmentsBlock) {
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

                if (adjustmentsBlock) {                                          // <-- Write the block only when offsets are in use
                    updatedProject.scheduleData[NA_TIME_ADJUSTMENTS_BLOCK_KEY] = adjustmentsBlock;
                } else {                                                         // <-- All offsets cleared: drop the block entirely
                    delete updatedProject.scheduleData[NA_TIME_ADJUSTMENTS_BLOCK_KEY];
                }
            }

            return updatedProject;
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Apply the Visibility Change (only when `enabled` changed)
        // ---------------------------------------------------------------
        const applyVisibilityPhaseIfChanged = async (expectedRev) => {
            if (formData.enabled === initialEnabledRef.current) return expectedRev;
            setSavePhase('Updating gallery visibility...');
            const res = await na_update_project_visibility(project.folderId, formData.enabled, expectedRev);
            initialEnabledRef.current = formData.enabled;
            return res._rev;
        };
        // ---------------------------------------------------------------


        // FUNCTION | Save to the Projects Master Library
        // ------------------------------------------------------------
        const performSave = async () => {
            setIsSaving(true);
            setMessage(null);
            setSavePhase('Saving...');
            const updatedProject = buildUpdatedProject();
            try {
                const saved = await na_save_project(project.folderId, updatedProject, revRef.current);
                revRef.current = saved.project._rev;
                revRef.current = await applyVisibilityPhaseIfChanged(revRef.current);
                setSavePhase(null);
                na_add_toast('Project saved!', 'success');
                setMessage({ type: 'success', text: 'Project saved!' });
                if (onSaveSuccess) {
                    const finalProject = { ...saved.project, enabled: formData.enabled, _rev: revRef.current };
                    setTimeout(() => onSaveSuccess(finalProject), 1500);
                }
            } catch (error) {
                console.error('[ProjectEditor] Save error:', error);
                setSavePhase(null);
                const text = error.status === 409
                    ? 'Someone else saved this project since you opened it. Go back, reopen it, and make your change again.'
                    : `Error: ${error.message}`;
                na_add_toast(error.status === 409 ? 'Not saved: changed by someone else' : `Save failed — ${error.message}`, 'error');
                setMessage({ type: 'error', text });
            } finally {
                setIsSaving(false);
            }
        };
        // ---------------------------------------------------------------


        // FUNCTION | Handle Form Submission
        // ------------------------------------------------------------
        // Project name and code are saved as fields only: the library folder is
        // shared by every app and is never renamed or deleted from the Gallery.
        // ------------------------------------------------------------
        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!validateForm()) return;
            await performSave();
        };
        // ---------------------------------------------------------------


        // HELPER | Derive save button label from phase and saving state
        // ---------------------------------------------------------------
        const saveBtnLabel = isSaving
            ? (savePhase || 'Saving...')
            : 'Save Changes';
        // ---------------------------------------------------------------


        // HELPER | Live time card figures for the Advanced Time Data readout
        // ---------------------------------------------------------------
        const timeCardPreview = computeTimeCardPreview();                        // <-- Absolute / offsets / net as they will be saved
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
                    {project.projectNameAlias && (
                        <span className="editor-form__title-alias"> (displayed as "{project.projectNameAlias}")</span>
                    )}
                </h2>

                {/* PROJECT INFO PANEL — READ-ONLY, FROM THE PROJECTS MASTER LIBRARY */}
                <div className="editor-form__info-panel">
                    <h3 className="editor-form__info-panel-title">Project Info (Read-Only)</h3>
                    <dl className="editor-form__info-grid">
                        <dt>Library Folder</dt>
                        <dd>ValeProjects__{project.year}/{project.folderId}</dd>
                        <dt>Images</dt>
                        <dd>{(project.images || []).length}{(project.missingImages || []).length ? ` (${project.missingImages.length} listed but missing)` : ''}</dd>
                        <dt>3D Model (GLB)</dt>
                        <dd>{project.hasGlb ? 'Yes' : 'No'}</dd>
                        <dt>Saved Version</dt>
                        <dd>{revRef.current}</dd>
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
                        Saved in the project record only: the library folder keeps its name. For a different display
                        name, use the Display Name Alias below.
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
                                Optional. When set, ValeVision Gallery shows this name everywhere instead of the Project Name
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

                {/* ADVANCED TIME DATA SECTION | Offsettable Out Of Scope Hours */}
                <div className="editor-form__field editor-form__advanced-time">
                    <button
                        type="button"
                        className="editor-form__advanced-time-toggle"
                        onClick={() => setShowAdvancedTime(!showAdvancedTime)}
                        disabled={isSaving || showRenameConfirm}
                        aria-expanded={showAdvancedTime}
                    >
                        <span className="editor-form__advanced-time-caret">{showAdvancedTime ? '▾' : '▸'}</span>
                        <span>Advanced Time Data</span>
                        {timeCardPreview.hasAdjustments && (
                            <span className="editor-form__advanced-time-badge">{timeCardPreview.offsets}h offset</span>
                        )}
                    </button>

                    {showAdvancedTime && (
                        <div className="editor-form__advanced-time-body">
                            <p className="editor-form__help-text editor-form__advanced-time-intro">
                                Record hours inside Time Taken that fall outside the original job scope. These are
                                deducted from Time Taken to give the net in-scope figure used for KPI reporting.
                                The absolute time card keeps the full Time Taken value. Leave blank where not applicable.
                            </p>

                            {NA_TIME_ADJUSTMENT_CATEGORIES.map(category => (
                                <div className="editor-form__field" key={category.key}>
                                    <label className="editor-form__label" htmlFor={`timeAdjust_${category.key}`}>
                                        <span
                                            className="editor-form__advanced-time-swatch"
                                            style={{ backgroundColor: category.color }}
                                        ></span>
                                        {category.label}
                                    </label>
                                    <input
                                        type="text"
                                        id={`timeAdjust_${category.key}`}
                                        className="editor-form__input"
                                        value={timeAdjustments[category.key] || ''}
                                        onChange={(e) => handleTimeAdjustmentChange(category.key, e.target.value)}
                                        placeholder="Hours, e.g., 3 or 1.5"
                                        disabled={isSaving || showRenameConfirm}
                                    />
                                    <span className="editor-form__help-text">{category.help}</span>
                                </div>
                            ))}

                            <div className="editor-form__time-card">
                                <div className="editor-form__time-card-row">
                                    <span className="editor-form__time-card-label">Absolute Time Card</span>
                                    <span className="editor-form__time-card-value">
                                        {timeCardPreview.hasAbsolute ? `${timeCardPreview.absolute}h` : 'Not recorded'}
                                    </span>
                                </div>
                                <div className="editor-form__time-card-row">
                                    <span className="editor-form__time-card-label">Offset Hours</span>
                                    <span className="editor-form__time-card-value">
                                        {timeCardPreview.offsets > 0 ? `-${timeCardPreview.offsets}h` : '0h'}
                                    </span>
                                </div>
                                <div className="editor-form__time-card-row editor-form__time-card-row--total">
                                    <span className="editor-form__time-card-label">Net In Scope Hours</span>
                                    <span className="editor-form__time-card-value">
                                        {timeCardPreview.hasAbsolute ? `${timeCardPreview.net}h` : 'Not recorded'}
                                    </span>
                                </div>
                                {formData.timeAllocated !== '' && timeCardPreview.hasAbsolute && timeCardPreview.net > 0 && (
                                    <div className="editor-form__time-card-row editor-form__time-card-row--note">
                                        <span className="editor-form__time-card-label">Scope Efficiency</span>
                                        <span className="editor-form__time-card-value">
                                            {Math.round((parseFloat(formData.timeAllocated) / timeCardPreview.net) * 100)}%
                                        </span>
                                    </div>
                                )}
                                {timeCardPreview.overRecorded && (
                                    <div className="editor-form__time-card-warning">
                                        Offsets total more than the recorded Time Taken. Reduce the offsets or raise Time Taken before saving.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
