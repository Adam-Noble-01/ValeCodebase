// =============================================================================
// WHITECARDOPEDIA - PROJECT GALLERY COMPONENT
// =============================================================================
//
// FILE       : ProjectGallery.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectGallery Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Grid view of all available projects with Whitecard/Blockout mode toggle
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays grid of project cards with thumbnails
// - Shows project name, code, and star ratings
// - Handles project selection and navigation to project viewer
// - Loads all projects dynamically from configuration
// - Supports gallery mode toggle between Whitecard and Blockout views
// - Filters projects by ProjectType field in project.json
// - Shows warning banner when in Blockout mode
// - Supports filtering by concept artist and designer via productionData fields
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ProjectGallery Component
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Filter Projects by Gallery Mode
    // ------------------------------------------------------------
    function filterProjectsByGalleryMode(projects, galleryMode) {
        if (galleryMode === 'maxmodel') {
            return projects.filter(p => p.ProjectType === 'MaxModel');        // <-- Show only MaxModel projects
        }
        if (galleryMode === 'blockout') {
            return projects.filter(p => p.ProjectType === 'Blockout');        // <-- Show only Blockout projects
        }
        return projects.filter(p => p.ProjectType === 'Whitecard' || !p.ProjectType);  // <-- Show Whitecard or untagged projects
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Filter Projects by Concept Artist
    // ------------------------------------------------------------
    function filterByArtist(projects, filterArtist) {
        if (filterArtist === 'all') return projects;                          // <-- Skip filter when set to all
        return projects.filter(p => p.productionData?.conceptArtist === filterArtist);  // <-- Match artist name
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Filter Projects by Designer
    // ------------------------------------------------------------
    function filterByDesigner(projects, filterDesigner) {
        if (filterDesigner === 'all') return projects;                        // <-- Skip filter when set to all
        return projects.filter(p => p.productionData?.designer === filterDesigner);     // <-- Match designer name
    }
    // ---------------------------------------------------------------


    // COMPONENT | Project Gallery Grid View
    // ------------------------------------------------------------
    function ProjectGallery({ onSelectProject, onOpenProjectEditor, onOpenTimeAnalysis, onPurgeCacheClick }) {
        const [projects, setProjects] = React.useState([]);              // <-- Projects array state
        const [loading, setLoading] = React.useState(true);              // <-- Loading state (true until first batch arrives)
        const [loadProgress, setLoadProgress] = React.useState({ loaded: 0, total: 0 });  // <-- Progressive load progress
        const [sortBy, setSortBy] = React.useState('date-newest');       // <-- Sort option state
        const [searchTerm, setSearchTerm] = React.useState('');          // <-- Search term state
        const [galleryMode, setGalleryMode] = React.useState('whitecard');  // <-- Gallery mode state (whitecard or blockout)
        const [filterArtist, setFilterArtist] = React.useState('all');   // <-- Active concept artist filter ('all' = unfiltered)
        const [filterDesigner, setFilterDesigner] = React.useState('all');  // <-- Active designer filter ('all' = unfiltered)
        const [artistOptions, setArtistOptions] = React.useState([]);    // <-- Artist names from master config
        const [designerOptions, setDesignerOptions] = React.useState([]); // <-- Designer names from master config
        
        // EFFECT | Load Projects Progressively in Batches
        // ---------------------------------------------------------------
        React.useEffect(() => {
            let cancelled = false;                                       // <-- Guard against setState after unmount
            
            setProjects([]);                                             // <-- Reset list on (re)mount
            setLoading(true);                                            // <-- Show loading spinner until first batch
            setLoadProgress({ loaded: 0, total: 0 });                    // <-- Reset progress counter
            
            loadProjectsInBatches(10, 10, (batch, loaded, total) => {
                if (cancelled) return;                                   // <-- Skip if component already unmounted
                setProjects(prev => [...prev, ...batch]);                // <-- Append newly loaded batch
                setLoading(false);                                       // <-- Reveal grid as soon as first batch lands
                setLoadProgress({ loaded, total });                      // <-- Update progress indicator
            });
            
            return () => { cancelled = true; };                          // <-- Cleanup on unmount
        }, []);
        // ---------------------------------------------------------------


        // EFFECT | Load Artist and Designer Option Lists from Master Config
        // ---------------------------------------------------------------
        React.useEffect(() => {
            loadMasterConfig().then(config => {
                if (!config) return;                                     // <-- Bail if config unavailable
                setArtistOptions(config.vale__ConceptArtist__OptionsList || []);   // <-- Populate artist dropdown
                setDesignerOptions(config.vale__Designer__OptionsList   || []);    // <-- Populate designer dropdown
            });
        }, []);
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Sort Option Change
        // ---------------------------------------------------------------
        const handleSortChange = (newSortBy) => {
            setSortBy(newSortBy);                                        // <-- Update sort option state
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Search Term Change
        // ---------------------------------------------------------------
        const handleSearchChange = (newSearchTerm) => {
            setSearchTerm(newSearchTerm);                                // <-- Update search term state
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Concept Artist Filter Change
        // ---------------------------------------------------------------
        const handleArtistChange = (newArtist) => {
            setFilterArtist(newArtist);                                  // <-- Update artist filter state
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Designer Filter Change
        // ---------------------------------------------------------------
        const handleDesignerChange = (newDesigner) => {
            setFilterDesigner(newDesigner);                              // <-- Update designer filter state
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Gallery Mode Change
        // ---------------------------------------------------------------
        const handleModeChange = (newMode) => {
            setGalleryMode(newMode);                                     // <-- Update gallery mode state
            setSearchTerm('');                                           // <-- Clear search when switching modes
            setFilterArtist('all');                                      // <-- Reset artist filter when switching modes
            setFilterDesigner('all');                                    // <-- Reset designer filter when switching modes
        };
        // ---------------------------------------------------------------
        
        if (loading) {
            return (
                <div className="project-gallery">
                    <p style={{ textAlign: 'center', fontSize: '18px' }}>Loading projects...</p>
                </div>
            );
        }
        
        if (projects.length === 0) {
            return (
                <div className="project-gallery">
                    <p style={{ textAlign: 'center', fontSize: '18px' }}>No projects available</p>
                </div>
            );
        }
        
        const modeFilteredProjects     = filterProjectsByGalleryMode(projects, galleryMode);          // <-- Filter by gallery mode
        const artistFilteredProjects   = filterByArtist(modeFilteredProjects, filterArtist);          // <-- Filter by concept artist
        const designerFilteredProjects = filterByDesigner(artistFilteredProjects, filterDesigner);    // <-- Filter by designer
        const sortedProjects           = sortProjects(designerFilteredProjects, sortBy);              // <-- Apply sorting
        const filteredProjects         = filterProjects(sortedProjects, searchTerm);                  // <-- Apply search filtering
        
        return (
            <>
                <Header galleryMode={galleryMode} />
                
                <div className="project-gallery">
                    <div className="project-gallery__controls">
                        <div className="project-gallery__controls-left">
                            <HamburgerMenu 
                                onProjectEditorClick={onOpenProjectEditor}
                                onTimeAnalysisClick={onOpenTimeAnalysis}
                                onPurgeCacheClick={onPurgeCacheClick}
                            />
                            <GalleryModeToggle
                                galleryMode={galleryMode}
                                onModeChange={handleModeChange}
                            />
                            <SearchBox 
                                searchTerm={searchTerm}
                                onSearchChange={handleSearchChange}
                            />
                            <FilterControls
                                filterArtist={filterArtist}
                                filterDesigner={filterDesigner}
                                artistOptions={artistOptions}
                                designerOptions={designerOptions}
                                onArtistChange={handleArtistChange}
                                onDesignerChange={handleDesignerChange}
                            />
                            <SortControls 
                                sortBy={sortBy}
                                onSortChange={handleSortChange}
                            />
                        </div>
                    </div>

                    {galleryMode === 'blockout' && (
                        <BlockoutWarningBanner />
                    )}

                    {galleryMode === 'maxmodel' && (
                        <MaxModelInfoBanner />
                    )}
                    
                    <div className="project-gallery__grid">
                        {filteredProjects.length === 0 ? (
                            <p style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '18px', color: 'var(--Vale_TextSecondary)' }}>
                                {galleryMode === 'maxmodel'
                                    ? 'No Max Models available — tag a project with __MaxModel suffix in the WCP builder'
                                    : galleryMode === 'blockout'
                                    ? 'No blockout models available'
                                    : 'No projects match your search'}
                            </p>
                        ) : (
                            filteredProjects.map((project) => (
                            <div 
                                key={project.folderId}
                                className="project-card"
                                onClick={() => onSelectProject(project)}
                            >
                                <div className={`project-card__image-container ${getImageEffectClass(project)}`}>
                                    {(() => {
                                        const thumbPair = getThumbnailImagePair(project);  // <-- { primary, fallback }
                                        return (
                                    <img 
                                        src={thumbPair ? thumbPair.primary : ''} 
                                        data-fallback-src={thumbPair ? thumbPair.fallback : ''}
                                        onError={Na__AssetUrls__HandleImgError}
                                        alt={project.projectName}
                                        className="project-card__image"
                                        loading="lazy"
                                        decoding="async"
                                        onContextMenu={(e) => e.preventDefault()}
                                        draggable="false"
                                    />
                                        );
                                    })()}
                                    {isHandDrawnProject(project) && (
                                        <div className="project-card__white-overlay"></div>
                                    )}
                                </div>
                                
                                <div className="project-card__content">
                                    <div className="project-card__text-content">
                                        <h3 className="project-card__name">{project.projectName}</h3>
                                        <p className="project-card__code">{project.projectCode}</p>
                                    </div>
                                    <ContentIndicatorIcons project={project} />
                                </div>
                            </div>
                        ))
                        )}
                    </div>

                    {loadProgress.total > 0 && loadProgress.loaded < loadProgress.total && (
                        <p
                            className="project-gallery__load-progress"
                            style={{
                                textAlign: 'center',
                                fontSize: '14px',
                                color: 'var(--Vale_TextSecondary)',
                                margin: 'var(--Vale_Spacing_Medium) 0 0 0'
                            }}
                        >
                            Loading more projects... {loadProgress.loaded} / {loadProgress.total}
                        </p>
                    )}
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Content Indicator Icon Components
// -----------------------------------------------------------------------------

    // COMPONENT | Content Indicator Icons for Project Cards
    // ------------------------------------------------------------
    function ContentIndicatorIcons({ project }) {
        const showWatercolorIcon = hasWatercolorContent(project);            // <-- Check if project has watercolor content
        const show3DModelIcon = has3DModelContent(project);                  // <-- Check if project has 3D model content
        
        // Only render container if at least one icon should be shown
        if (!showWatercolorIcon && !show3DModelIcon) {
            return null;                                                     // <-- Return null if no icons to display
        }
        
        return (
            <div className="project-card__content-icons">
                {showWatercolorIcon && (
                    <img 
                        src="../assets__CommonApplicationAssets/Icons__ProjectGallery__ContentIndicatorIcons/Icon__ProjectGallery__ContentIndicatorIcon__WatercolourPainting__512px__.png"
                        alt="Watercolor Artwork Available"
                        className="project-card__content-icon"
                        title="Watercolor Artwork Available"
                        loading="lazy"
                        decoding="async"
                    />
                )}
                {show3DModelIcon && (
                    <img 
                        src="../assets__CommonApplicationAssets/Icons__ProjectGallery__ContentIndicatorIcons/Icon__ProjectGallery__ContentIndicatorIcon__ValeVision3d__512px__10PcWhiteFilter__.png"
                        alt="3D Model Available"
                        className="project-card__content-icon"
                        title="3D Model Available"
                        loading="lazy"
                        decoding="async"
                    />
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
