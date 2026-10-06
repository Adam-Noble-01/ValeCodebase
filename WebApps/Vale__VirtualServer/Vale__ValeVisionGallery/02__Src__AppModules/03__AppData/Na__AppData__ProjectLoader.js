// =============================================================================
// VALEVISION GALLERY - PROJECT LOADER UTILITY
// =============================================================================
//
// FILE       : Na__AppData__ProjectLoader.js
// NAMESPACE  : ValeVisionGallery
// MODULE     : ProjectLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load projects from the Vale Projects Master Library through the
//              Gallery API, and build every image URL
// CREATED    : 2025
//
// DESCRIPTION:
// - Projects come from the Gallery API (api/projects, relative to the app):
//   one call lists every visible project; api/projects/<id> gives one in full.
//   The API reads Vale__Projects__MasterLibrary on the server.
// - A project's id (folderId) is its library folder name, e.g. 64135__Washington.
// - Images are served straight from the library by nginx; the API gives each
//   project's folders: basePath (full quality), thumbBasePath (524p webp)
//   and jpg524BasePath (524p jpg, the thumbnail fallback).
// - Function names and signatures are unchanged from the pre-server loader,
//   so the gallery, viewer, editor and KPI tools work as before.
// - No GitHub Pages, no Cloudflare R2, no master index, no build manifest.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0
// - Rewritten for the app server: API + library instead of R2 / GitHub Pages /
//   the R2 master index and build manifest. Same public functions.
//
// 08-Jul-2026 - Version 0.2.8 (last pre-server version)
// - R2-first loading with GH Pages fallback, master index, build manifest.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants & State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Loader Configuration
    // ------------------------------------------------------------
    const PROJECT_LOADER_CONFIG = {
        apiProjects         : 'api/projects',                            // <-- Gallery API, relative to the app
        masterConfigPath    : '02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json', // <-- App settings and option lists
        designersListPath   : '02__Src__AppModules/03__AppData/Na__AppData__ValeDesignersList__Main.json', // <-- Designers options file
        artistsListPath     : '02__Src__AppModules/03__AppData/Na__AppData__ValeConceptArtistsList__Main.json', // <-- Concept artists options file
    };
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Thumbnail Naming Convention (mirrors the generator script)
    // ------------------------------------------------------------
    const THUMBNAIL_SUFFIX_TOKEN   = '__Thumbnail__524p__';              // <-- Appended to source image base name
    const THUMBNAIL_WEBP_EXTENSION = '.webp';                            // <-- Thumbnail file extension
    // ------------------------------------------------------------

    // MODULE VARIABLES | Cached Config
    // ------------------------------------------------------------
    let Na__ProjectLoader__ConfigPromise = null;                         // <-- Master config + option lists, loaded once
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | API Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | GET JSON From the Gallery API (a 401 re-opens the sign-in card)
    // ---------------------------------------------------------------
    async function na_api_get(url) {
        const doFetch = window.ValeUserLogin ? window.ValeUserLogin.Fetch : window.fetch.bind(window);
        const response = await doFetch(url, { cache: 'no-store', credentials: 'same-origin' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        return data;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Add the Client-Side Image Fields to an API Record
    // ---------------------------------------------------------------
    function na_prepare_project(projectData) {
        if (!projectData) return null;
        projectData.displayName = (projectData.projectNameAlias || '').trim() || projectData.projectName || projectData.folderId;
        projectData.r2BasePath = null;                                   // <-- Kept for old callers: there is no R2 any more
        if (projectData.images && projectData.images.length > 0) {
            const { baseImages, pairsMap } = buildImagePairsMap(projectData.images);
            projectData.displayImages = baseImages;                      // <-- Base images for carousel
            projectData.artPairsMap   = pairsMap;                        // <-- Base image -> ART overlay
            projectData.allImages     = projectData.images;              // <-- Every image, for downloads
        } else {
            projectData.displayImages = [];
            projectData.artPairsMap   = new Map();
            projectData.allImages     = [];
        }
        return projectData;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Master Config & Options Lists Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Option List from Dedicated Data File
    // ---------------------------------------------------------------
    async function loadOptionsListFromFile(filePath, keyName) {
        try {
            const response = await fetch(filePath, { cache: 'no-cache' });
            if (!response.ok) return null;
            const data = await response.json();
            const optionsList = data[keyName];
            return Array.isArray(optionsList) ? optionsList : null;
        } catch (error) {
            console.warn(`Warning loading ${keyName} from ${filePath}:`, error);
            return null;
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Master Configuration (app settings and option lists; loaded once)
    // ---------------------------------------------------------------
    async function loadMasterConfig() {
        if (!Na__ProjectLoader__ConfigPromise) {
            Na__ProjectLoader__ConfigPromise = (async () => {
                try {
                    const response = await fetch(PROJECT_LOADER_CONFIG.masterConfigPath, { cache: 'no-cache' });
                    if (!response.ok) throw new Error('Failed to load master configuration');
                    const config = await response.json();
                    const designersList = await loadOptionsListFromFile(PROJECT_LOADER_CONFIG.designersListPath, 'vale__Designer__OptionsList');
                    const artistsList   = await loadOptionsListFromFile(PROJECT_LOADER_CONFIG.artistsListPath, 'vale__ConceptArtist__OptionsList');
                    if (designersList !== null) config.vale__Designer__OptionsList = designersList;
                    if (artistsList !== null)   config.vale__ConceptArtist__OptionsList = artistsList;
                    return config;
                } catch (error) {
                    console.error('Error loading master config:', error);
                    Na__ProjectLoader__ConfigPromise = null;             // <-- Allow a retry next time
                    return null;
                }
            })();
        }
        return Na__ProjectLoader__ConfigPromise;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Data Loading - Individual & Batched
// -----------------------------------------------------------------------------

    // FUNCTION | Load One Project in Full (every field, including other apps' data)
    // ---------------------------------------------------------------
    async function loadProjectData(folderId) {
        try {
            const data = await na_api_get(`${PROJECT_LOADER_CONFIG.apiProjects}/${encodeURIComponent(folderId)}`);
            return na_prepare_project(data.project);
        } catch (error) {
            console.error(`Error loading project ${folderId}:`, error);
            return null;
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | The Project List From the API (light records)
    // ---------------------------------------------------------------
    async function na_load_project_list(includeHidden) {
        const data = await na_api_get(PROJECT_LOADER_CONFIG.apiProjects + (includeHidden ? '?all=1' : ''));
        return (data.projects || []).map(na_prepare_project);
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load All Visible Projects
    // ---------------------------------------------------------------
    async function loadAllProjects() {
        try {
            return await na_load_project_list(false);
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load All Projects Including Hidden Ones (Project Editor, Management only)
    // ---------------------------------------------------------------
    async function loadAllProjectsIncludingDisabled() {
        try {
            return await na_load_project_list(true);
        } catch (error) {
            console.error('Error loading projects (including hidden):', error);
            return [];
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Year of a Project ("2026" from the record, or a legacy "2026/..." id)
    // ---------------------------------------------------------------
    function extractFolderIdYear(folderIdOrProject) {
        if (folderIdOrProject && typeof folderIdOrProject === 'object') {
            return parseInt(folderIdOrProject.year, 10) || 0;
        }
        const yearMatch = typeof folderIdOrProject === 'string' ? folderIdOrProject.match(/^(\d{4})\//) : null;
        return yearMatch ? parseInt(yearMatch[1], 10) : 0;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Projects, Handed Over in Batches
    // ---------------------------------------------------------------
    // One API call returns every visible project, newest year first. They
    // are still handed to the caller in chunks so the gallery's progressive
    // rendering keeps working unchanged.
    // ---------------------------------------------------------------
    async function loadProjectsInBatches(initialBatchSize, subsequentBatchSize, onBatchLoaded) {
        const projects = await loadAllProjects();
        const total = projects.length;
        let cursor = 0;
        while (cursor < total) {
            const size  = cursor === 0 ? initialBatchSize : subsequentBatchSize;
            const chunk = projects.slice(cursor, cursor + size);
            cursor += size;
            if (typeof onBatchLoaded === 'function') onBatchLoaded(chunk, Math.min(cursor, total), total);
        }
        if (total === 0 && typeof onBatchLoaded === 'function') onBatchLoaded([], 0, 0);
        return projects;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Image URL Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Full-Quality Image URL
    // ---------------------------------------------------------------
    function getImageUrl(projectData, imageName) {
        if (!projectData || !imageName || !projectData.basePath) return '';
        return `${projectData.basePath}/${encodeURIComponent(imageName)}`;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Image URL Pair (kept for old callers: primary and fallback are the same file)
    // ---------------------------------------------------------------
    function getImageUrlPair(projectData, imageName) {
        const url = getImageUrl(projectData, imageName);
        return url ? { primary: url, fallback: url } : null;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Thumbnail File Name for a Source Image
    // ---------------------------------------------------------------
    function na_derive_thumbnail_filename(filename, extension) {
        if (!filename) return null;
        const base = filename.includes(THUMBNAIL_SUFFIX_TOKEN)
            ? filename.slice(0, filename.indexOf(THUMBNAIL_SUFFIX_TOKEN))
            : filename.replace(/\.[^.]+$/, '');
        return `${base}${THUMBNAIL_SUFFIX_TOKEN}${extension || THUMBNAIL_WEBP_EXTENSION}`;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Card Thumbnail URL Pair: 524p webp, falling back to the 524p jpg
    // ---------------------------------------------------------------
    function getThumbnailImagePair(projectData) {
        if (!projectData) return null;
        const sourceFile = projectData.thumbnailImage
            || (projectData.images && projectData.images.length > 0 ? projectData.images[0] : null);
        if (!sourceFile || !projectData.thumbBasePath) return null;
        return {
            primary  : `${projectData.thumbBasePath}/${encodeURIComponent(na_derive_thumbnail_filename(sourceFile, '.webp'))}`,
            fallback : `${projectData.jpg524BasePath}/${encodeURIComponent(na_derive_thumbnail_filename(sourceFile, '.jpg'))}`
        };
    }

    function getThumbnailImage(projectData) {
        const pair = getThumbnailImagePair(projectData);
        return pair ? pair.primary : null;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Shared <img> onError Handler: try data-fallback-src once
    // ---------------------------------------------------------------
    function Na__AssetUrls__HandleImgError(event) {
        const img = event && event.currentTarget;
        if (!img || img.dataset.fallbackTried === '1') return;
        const fallback = img.getAttribute('data-fallback-src');
        if (!fallback || fallback === img.getAttribute('src')) return;
        img.dataset.fallbackTried = '1';
        img.src = fallback;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Image Filename Parsing & ART Overlay Pairs
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Image Filename to Extract Image Number & ART Code
    // ---------------------------------------------------------------
    function parseImageFileName(filename) {
        const artPattern    = /^IMG(\d{2})_ART(\d{2})__/;               // <-- Pattern for ART images
        const normalPattern = /^IMG(\d{2})__/;                           // <-- Pattern for normal images

        const artMatch = filename.match(artPattern);
        if (artMatch) {
            return { imageNumber: artMatch[1], artCode: artMatch[2], isArtImage: true };
        }

        const normalMatch = filename.match(normalPattern);
        if (normalMatch) {
            return { imageNumber: normalMatch[1], artCode: null, isArtImage: false };
        }

        return null;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Get Human-Readable Label for ART Code
    // ---------------------------------------------------------------
    function getArtCodeLabel(artCode) {
        const ART_CODE_LABELS = {
            '00' : 'Preliminary Sketch',
            '05' : '2D CAD Drafting',
            '10' : 'Hand Drawn Technical Pen Linework',
            '20' : 'Hand Drawn Watercolour Painting'
        };
        return ART_CODE_LABELS[artCode] || 'Artistic Rendering';
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Image Pairs Map from JSON Images Array
    // ---------------------------------------------------------------
    function buildImagePairsMap(images) {
        const pairsMap   = new Map();                                    // <-- Map: base image -> ART data
        const baseImages = [];                                           // <-- Array of base images only

        for (const imageName of images) {
            const parsed = parseImageFileName(imageName);
            if (!parsed) continue;

            if (parsed.isArtImage) {
                const baseImage = images.find(img => {
                    const baseParsed = parseImageFileName(img);
                    return baseParsed && !baseParsed.isArtImage && baseParsed.imageNumber === parsed.imageNumber;
                });
                if (baseImage) {
                    pairsMap.set(baseImage, { filename: imageName, artCode: parsed.artCode, label: getArtCodeLabel(parsed.artCode) });
                }
            } else {
                baseImages.push(imageName);
            }
        }

        return { baseImages, pairsMap };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get ART Pair for Base Image (Direct Lookup)
    // ---------------------------------------------------------------
    function getArtPairForImage(projectData, baseImageName) {
        if (!projectData.artPairsMap) return null;
        const artData = projectData.artPairsMap.get(baseImageName);
        if (!artData) return null;
        return { filename: artData.filename, artCode: artData.artCode, label: artData.label, url: getImageUrl(projectData, artData.filename) };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
