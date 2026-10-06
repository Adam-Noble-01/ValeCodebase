// =============================================================================
// VALEVISION GALLERY - MAIN APPLICATION COMPONENT
// =============================================================================
//
// FILE       : Na__AppCore__ValeVisionGalleryApp.jsx
// NAMESPACE  : ValeVisionGallery
// MODULE     : AppCore
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Root component: views, navigation, permissions
// CREATED    : 2025
//
// DESCRIPTION:
// - Starts only after the shared Vale sign-in (ValeUserLogin, loaded from
//   /AppAssets__CommonApplicationAssets/Shared__UserLogin/) has a user: there
//   is no PIN and no home page any more. The initials avatar (top right)
//   carries sign out, change password and, for App Admins, Developer tools.
// - Views: Gallery, Viewer, Editor, Time Analysis.
// - Permission levels decide the tools: Management and up open the Project
//   Editor and the 3D Production KPI Report; App Admins also get Developer
//   tools (purge the app cache). Everyone signed in can browse.
// - Deep link: ?id=<project> opens a project; the id is its library folder
//   name (64135__Washington). Old links with a project code still resolve.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0
// - Rebuilt for the app server: shared sign-in replaces the PIN and the home
//   page; permission levels replace the localhost checks; the KPI report
//   opens in the app for Management (no separate public page).
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | App Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Application View States
    // ------------------------------------------------------------
    const APP_VIEWS = {
        GALLERY             : 'GALLERY',                                 // <-- Project gallery grid
        VIEWER              : 'VIEWER',                                  // <-- Individual project viewer
        EDITOR              : 'EDITOR',                                  // <-- Project editor tool (Management)
        TIME_ANALYSIS       : 'TIME_ANALYSIS',                           // <-- 3D Production KPI report (Management)
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Permission Checks (the API checks again on every save)
    // ------------------------------------------------------------
    function na_can_manage()  { return !!(window.ValeUserLogin && window.ValeUserLogin.HasLevel('Management')); }
    function na_is_app_admin() { return !!(window.ValeUserLogin && window.ValeUserLogin.IsAppAdmin()); }
    // ------------------------------------------------------------


    // FUNCTION | Purge the App Cache (Developer tools, App Admins)
    // ------------------------------------------------------------
    async function na_purge_app_cache() {
        if (!window.confirm('Purge App Cache?\n\nClears the cached app files and reloads. You stay signed in.')) return;
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.filter(k => k.startsWith('valevision-gallery-')).map(k => caches.delete(k)));
            }
            if (navigator.serviceWorker) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.filter(r => r.scope.startsWith(new URL('./', window.location.href).href)).map(r => r.unregister()));
            }
        } catch (error) {
            console.warn('[ValeVisionGallery] Cache purge incomplete:', error);
        }
        window.location.reload();
    }
    // ------------------------------------------------------------


    // COMPONENT | Main Application Root
    // ------------------------------------------------------------
    function App() {
        const [currentView, setCurrentView] = React.useState(APP_VIEWS.GALLERY);
        const [selectedProject, setSelectedProject] = React.useState(null);
        const [lastSelectedProject, setLastSelectedProject] = React.useState(null);  // <-- For the forward hotkey
        const [isLoadingUrlProject, setIsLoadingUrlProject] = React.useState(false);

        // EFFECT | Open the Project Named in the URL (or the editor after a reload)
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const projectIdFromUrl = getProjectIdFromUrl();
            const toolFromUrl = new URLSearchParams(window.location.search).get('tool');   // <-- ?tool=kpi from the KPI email
            if (toolFromUrl === 'kpi' && na_can_manage()) {
                setCurrentView(APP_VIEWS.TIME_ANALYSIS);
                return;
            }
            if (na_get_and_clear_reopen_editor_flag() && na_can_manage()) {
                setCurrentView(APP_VIEWS.EDITOR);
                return;
            }
            if (!projectIdFromUrl) return;
            setIsLoadingUrlProject(true);
            loadAllProjects().then(projects => {
                const wanted = String(projectIdFromUrl);
                const matchingProject = projects.find(p => p.folderId === wanted)
                    || projects.find(p => wanted.endsWith('/' + p.folderId))         // <-- Old "2026/<folder>" ids
                    || projects.find(p => p.projectCode === wanted);                 // <-- Old links by project code
                if (matchingProject) {
                    setSelectedProject(matchingProject);
                    setLastSelectedProject(matchingProject);
                    setCurrentView(APP_VIEWS.VIEWER);
                } else {
                    console.error(`Project not found: ${wanted}`);
                    clearProjectIdFromUrl();
                }
                setIsLoadingUrlProject(false);
            });
        }, []);
        // ---------------------------------------------------------------

        // SUB FUNCTION | Navigation
        // ---------------------------------------------------------------
        const handleSelectProject = (project) => {
            setSelectedProject(project);
            setLastSelectedProject(project);
            setCurrentView(APP_VIEWS.VIEWER);
            updateUrlWithProjectId(project.folderId);                    // <-- Share links use the library id
        };

        const handleBackToGallery = () => {
            setSelectedProject(null);
            setCurrentView(APP_VIEWS.GALLERY);
            clearProjectIdFromUrl();
        };

        const handleOpenProjectEditor = () => {
            if (!na_can_manage()) {
                alert('The Project Editor needs Management permission. Ask Adam or Shane if you need it.');
                return;
            }
            setCurrentView(APP_VIEWS.EDITOR);
        };

        const handleOpenTimeAnalysis = () => {
            if (!na_can_manage()) {
                alert('The 3D Production KPI Report needs Management permission.');
                return;
            }
            setCurrentView(APP_VIEWS.TIME_ANALYSIS);
        };
        // ---------------------------------------------------------------

        // EFFECT | Open a Tool From the Avatar Menu
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const onOpenTool = (evt) => {
                if (evt.detail === 'editor') handleOpenProjectEditor();
                if (evt.detail === 'kpi') handleOpenTimeAnalysis();
            };
            window.addEventListener('vvg-open-tool', onOpenTool);
            return () => window.removeEventListener('vvg-open-tool', onOpenTool);
        }, []);
        // ---------------------------------------------------------------

        // EFFECT | Register Global Keyboard Hotkeys
        // ---------------------------------------------------------------
        React.useEffect(() => {
            initHotkeys({
                NAVIGATE_BACK: () => {
                    if (currentView !== APP_VIEWS.GALLERY) handleBackToGallery();
                },
                NAVIGATE_FORWARD: () => {
                    if (currentView === APP_VIEWS.GALLERY && lastSelectedProject) handleSelectProject(lastSelectedProject);
                },
            });
            return () => destroyHotkeys();
        }, [currentView, lastSelectedProject]);
        // ---------------------------------------------------------------

        // RENDER | Conditional View Rendering
        // ---------------------------------------------------------------
        if (isLoadingUrlProject) {
            return <div className="loading-container"><div className="loading-spinner"></div><p>Opening project…</p></div>;
        }
        return (
            <>
                {currentView === APP_VIEWS.GALLERY && (
                    <ProjectGallery
                        onSelectProject={handleSelectProject}
                        onOpenProjectEditor={handleOpenProjectEditor}
                        onOpenTimeAnalysis={handleOpenTimeAnalysis}
                        onPurgeCacheClick={na_purge_app_cache}
                    />
                )}
                {currentView === APP_VIEWS.VIEWER && (
                    <ProjectViewer project={selectedProject} onBack={handleBackToGallery} />
                )}
                {currentView === APP_VIEWS.EDITOR && (
                    <ProjectEditor onBack={handleBackToGallery} />
                )}
                {currentView === APP_VIEWS.TIME_ANALYSIS && (
                    <TimeAnalysisTool onBack={handleBackToGallery} />
                )}
            </>
        );
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------


    // INITIALIZATION | Sign In, Then Render
    // ------------------------------------------------------------
    window.ValeUserLogin.Init({
        appName   : 'ValeVision Gallery',
        logoUrl   : '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png',
        apiBase   : 'api/',
        menuItems : [
            { label: 'Project Editor',            minLevel: 'Management', onClick: () => window.dispatchEvent(new CustomEvent('vvg-open-tool', { detail: 'editor' })) },
            { label: '3D Production KPI Report',  minLevel: 'Management', onClick: () => window.dispatchEvent(new CustomEvent('vvg-open-tool', { detail: 'kpi' })) },
            { label: 'Purge app cache',           adminOnly: true, section: 'Developer tools', onClick: na_purge_app_cache }
        ],
        onReady   : () => {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App />);
        }
    });
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
