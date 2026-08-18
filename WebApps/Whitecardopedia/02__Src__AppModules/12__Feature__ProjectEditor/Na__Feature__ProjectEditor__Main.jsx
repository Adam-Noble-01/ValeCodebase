// =============================================================================
// WHITECARDOPEDIA - PROJECT EDITOR COMPONENT
// =============================================================================
//
// FILE       : ProjectEditor.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectEditor Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Main view for Project Editor tool
// CREATED    : 2025
//
// DESCRIPTION:
// - Main view component for Project Editor tool
// - Gallery-style project selection interface
// - Includes search and filter controls for easy project selection
// - Displays editor form when project is selected
// - Back to Gallery navigation in header
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial implementation.
//
// 07-Jul-2026 - Version 1.1.0
// - Picker now uses loadAllProjectsIncludingDisabled() so disabled projects
//   can be found and re-enabled; shows a "Hidden from Gallery" badge.
// - handleSaveSuccess forces a full picker reload when a rename changed the
//   folderId, instead of patching in place under a now-stale key.
// - Cards prefer project.displayName (alias-aware) over projectName.
//
// 08-Jul-2026 - Version 1.2.0
// - Added handleDeleteSuccess + onDeleteSuccess wiring: after a permanent
//   delete, resets the master index cache and reloads the full picker list,
//   since the deleted project's folderId key no longer exists anywhere.
//
// 08-Jul-2026 - Version 1.3.0
// - handleSaveSuccess / handleDeleteSuccess no longer patch state in place or
//   soft-reload the picker list — both now close the form and trigger the
//   same "Purge App Cache" mechanism used by the hamburger menu (via the new
//   na_trigger_cache_purge_and_return_to_editor), landing back on this view
//   after a full reload (na_set_reopen_editor_flag). This guarantees every
//   save/delete is reflected immediately, closing the staleness gap that
//   remained even after the project.json cache-busting fixes.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ProjectEditor Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Editor View States
    // ------------------------------------------------------------
    const EDITOR_VIEWS = {
        SELECTION           : 'SELECTION',                                   // <-- Project selection view
        EDITING             : 'EDITING',                                     // <-- Project editing view
    };
    // ------------------------------------------------------------


    // COMPONENT | Project Editor Main View
    // ------------------------------------------------------------
    function ProjectEditor({ onBack }) {
        const [editorView, setEditorView] = React.useState(EDITOR_VIEWS.SELECTION);  // <-- Current editor view
        const [projects, setProjects] = React.useState([]);                  // <-- Projects array state
        const [loading, setLoading] = React.useState(true);                  // <-- Loading state
        const [sortBy, setSortBy] = React.useState('date-newest');           // <-- Sort option state
        const [searchTerm, setSearchTerm] = React.useState('');              // <-- Search term state
        const [selectedProject, setSelectedProject] = React.useState(null);  // <-- Selected project state
        
        
        // EFFECT | Load Projects on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            async function fetchProjects() {
                const loadedProjects = await loadAllProjectsIncludingDisabled();  // <-- Editor sees disabled projects too
                setProjects(loadedProjects);                                 // <-- Update projects state
                setLoading(false);                                           // <-- Set loading to false
            }
            
            fetchProjects();                                                 // <-- Execute fetch function
        }, []);
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Project Selection
        // ---------------------------------------------------------------
        const handleSelectProject = (project) => {
            setSelectedProject(project);                                     // <-- Set selected project
            setEditorView(EDITOR_VIEWS.EDITING);                             // <-- Switch to editing view
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Cancel Editing
        // ---------------------------------------------------------------
        const handleCancelEdit = () => {
            setSelectedProject(null);                                        // <-- Clear selected project
            setEditorView(EDITOR_VIEWS.SELECTION);                           // <-- Return to selection view
        };
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Trigger Cache Purge + Reload, Returning to This Editor View
        // ---------------------------------------------------------------
        // Reuses the exact same mechanism as the "Purge App Cache" hamburger menu
        // item (Cache Storage + Service Worker + storage wipe, auth preserved) so
        // a save's R2 write is guaranteed visible on the very next paint, rather
        // than risking the browser's HTTP cache or a stale Service Worker bucket
        // shadowing the fresh data — see the cache-busting fixes in
        // Na__AppData__ProjectLoader.js and the Cloudflare Worker for the root
        // cause this complements. Sets the reopen-editor flag first so a full
        // page reload lands back on the editor's selection view instead of the
        // main gallery, since reload otherwise resets all in-memory view state.
        // ---------------------------------------------------------------
        const na_trigger_cache_purge_and_return_to_editor = () => {
            na_set_reopen_editor_flag();                                     // <-- Survive the reload, land back on the editor
            const registrar = window.Whitecardopedia__Pwa__ServiceWorker__Registrar;
            if (registrar && typeof registrar.purgeAppCache === 'function') {
                registrar.purgeAppCache();                                   // <-- Brutal full purge via shared registrar (preserves auth)
            } else {
                window.location.reload();                                    // <-- Fallback: plain reload if registrar unavailable
            }
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Save Success — Close Form, Then Purge Cache and Reload
        // ---------------------------------------------------------------
        const handleSaveSuccess = () => {
            setSelectedProject(null);                                        // <-- Close the form
            setEditorView(EDITOR_VIEWS.SELECTION);                           // <-- Return to the editor's selection view

            // Give the form's "Project saved!" toast a moment to be seen before the
            // guaranteed-fresh reload takes over.
            setTimeout(na_trigger_cache_purge_and_return_to_editor, 1200);
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Delete Success — Close Form, Then Purge Cache and Reload
        // ---------------------------------------------------------------
        const handleDeleteSuccess = () => {
            setSelectedProject(null);                                        // <-- Close the form
            setEditorView(EDITOR_VIEWS.SELECTION);                           // <-- Return to the editor's selection view
            setTimeout(na_trigger_cache_purge_and_return_to_editor, 1200);
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Sort Option Change
        // ---------------------------------------------------------------
        const handleSortChange = (newSortBy) => {
            setSortBy(newSortBy);                                            // <-- Update sort option state
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Search Term Change
        // ---------------------------------------------------------------
        const handleSearchChange = (newSearchTerm) => {
            setSearchTerm(newSearchTerm);                                    // <-- Update search term state
        };
        // ---------------------------------------------------------------
        
        
        // RENDER | Loading State
        // ---------------------------------------------------------------
        if (loading) {
            return (
                <>
                    <Header />
                    <Breadcrumbs
                        trail={[{ label: 'Whitecardopedia', onClick: onBack }]}
                        current="Project Editor"
                    />
                    <div className="project-editor">
                        <div className="project-editor__content">
                            <p style={{ textAlign: 'center', fontSize: '18px' }}>
                                Loading projects...
                            </p>
                        </div>
                    </div>
                </>
            );
        }
        // ---------------------------------------------------------------
        
        
        // RENDER | Editing View
        // ---------------------------------------------------------------
        if (editorView === EDITOR_VIEWS.EDITING && selectedProject) {
            return (
                <>
                    <Header />
                    <Breadcrumbs
                        trail={[
                            { label: 'Whitecardopedia', onClick: onBack },
                            { label: 'Project Editor',  onClick: handleCancelEdit }
                        ]}
                        current={(selectedProject.projectNameAlias || '').trim() || selectedProject.projectName || 'Project'}
                    />
                    <div className="project-editor">
                        <div className="project-editor__content">
                            <ProjectEditorForm 
                                project={selectedProject}
                                onCancel={handleCancelEdit}
                                onSaveSuccess={handleSaveSuccess}
                                onDeleteSuccess={handleDeleteSuccess}
                            />
                        </div>
                    </div>
                </>
            );
        }
        // ---------------------------------------------------------------
        
        
        // RENDER | Selection View
        // ---------------------------------------------------------------
        const sortedProjects = sortProjects(projects, sortBy);              // <-- Apply sorting to projects
        const filteredProjects = filterProjects(sortedProjects, searchTerm);  // <-- Apply search filtering
        
        return (
            <>
                <Header />

                <Breadcrumbs
                    trail={[{ label: 'Whitecardopedia', onClick: onBack }]}
                    current="Project Editor"
                />
                
                <div className="project-editor">
                    <div className="project-editor__content">
                        <h1 className="project-editor__title">
                            Select a Project to Edit
                        </h1>
                        
                        <div className="project-gallery__controls">
                            <SearchBox 
                                searchTerm={searchTerm}
                                onSearchChange={handleSearchChange}
                            />
                            <SortControls 
                                sortBy={sortBy}
                                onSortChange={handleSortChange}
                            />
                        </div>
                        
                        <div className="project-gallery__grid">
                            {filteredProjects.length === 0 ? (
                                <p style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '18px', color: 'var(--Vale_TextSecondary)' }}>
                                    No projects match your search
                                </p>
                            ) : (
                                filteredProjects.map((project) => (
                                <div 
                                    key={project.folderId}
                                    className={`project-card ${project.enabled === false ? 'project-card--disabled' : ''}`}
                                    onClick={() => handleSelectProject(project)}
                                >
                                    <div className={`project-card__image-container ${getImageEffectClass(project)}`}>
                                        <img 
                                            src={getThumbnailImage(project)} 
                                            alt={project.displayName || project.projectName}
                                            className="project-card__image"
                                        />
                                        {isHandDrawnProject(project) && (
                                            <div className="project-card__white-overlay"></div>
                                        )}
                                        {project.enabled === false && (
                                            <span className="project-card__disabled-badge">Hidden from Gallery</span>
                                        )}
                                    </div>
                                    
                                    <div className="project-card__content">
                                        <h3 className="project-card__name">{project.displayName || project.projectName}</h3>
                                        <p className="project-card__code">{project.projectCode}</p>
                                        {project.scheduleData?.dateFulfilled && (
                                            <p className="project-card__date">{formatProjectDate(project.scheduleData.dateFulfilled)}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

