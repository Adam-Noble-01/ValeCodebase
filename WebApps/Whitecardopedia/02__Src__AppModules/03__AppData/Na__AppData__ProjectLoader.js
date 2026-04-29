// =============================================================================
// WHITECARDOPEDIA - PROJECT LOADER UTILITY
// =============================================================================
//
// FILE       : projectLoader.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dynamic project data loading utility
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility functions for loading project data from folder structure
// - Reads masterConfig.json for project index
// - Loads individual project.json files for project metadata
// - Handles image path resolution for project galleries
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Project Loading Functions
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Project Loading State
    // ------------------------------------------------------------
    const PROJECT_LOADER_CONFIG = {
        masterConfigPath    : '02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json', // <-- Master configuration file path
        designersListPath   : '02__Src__AppModules/03__AppData/Na__AppData__ValeDesignersList__Main.json', // <-- Dedicated designers options file
        artistsListPath     : '02__Src__AppModules/03__AppData/Na__AppData__ValeConceptArtistsList__Main.json', // <-- Dedicated concept artists options file
        projectBasePath     : 'Projects',                                // <-- Base path for projects (year comes from folderId)
    };
    // ------------------------------------------------------------

    // HELPER FUNCTION | Load Option List from Dedicated Data File
    // ---------------------------------------------------------------
    async function loadOptionsListFromFile(filePath, keyName) {
        try {
            const response = await fetch(filePath);                      // <-- Fetch dedicated options file

            if (!response.ok) {
                return null;                                             // <-- Return null if file missing/unreadable
            }

            const data = await response.json();                          // <-- Parse JSON response
            const optionsList = data[keyName];                           // <-- Read expected list key

            return Array.isArray(optionsList) ? optionsList : null;      // <-- Return list or null if invalid shape
        } catch (error) {
            console.warn(`Warning loading ${keyName} from ${filePath}:`, error); // <-- Log non-blocking warning
            return null;                                                 // <-- Return null on any fetch/parse error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Master Configuration
    // ------------------------------------------------------------
    async function loadMasterConfig() {
        try {
            const response = await fetch(PROJECT_LOADER_CONFIG.masterConfigPath);  // <-- Fetch master config
            
            if (!response.ok) {
                throw new Error('Failed to load master configuration');  // <-- Handle fetch error
            }
            
            const config = await response.json();                        // <-- Parse JSON response

            // LOAD DEDICATED LIST FILES | Canonical source with masterConfig fallback
            const designersList = await loadOptionsListFromFile(
                PROJECT_LOADER_CONFIG.designersListPath,
                'vale__Designer__OptionsList'
            );
            const artistsList = await loadOptionsListFromFile(
                PROJECT_LOADER_CONFIG.artistsListPath,
                'vale__ConceptArtist__OptionsList'
            );

            if (designersList !== null) {
                config.vale__Designer__OptionsList = designersList;      // <-- Prefer dedicated designers list when available
            }

            if (artistsList !== null) {
                config.vale__ConceptArtist__OptionsList = artistsList;    // <-- Prefer dedicated concept artists list when available
            }

            return config;                                               // <-- Return configuration object
            
        } catch (error) {
            console.error('Error loading master config:', error);        // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Individual Project Data
    // ------------------------------------------------------------
    async function loadProjectData(folderId) {
        const projectPath = `${PROJECT_LOADER_CONFIG.projectBasePath}/${folderId}`;  // <-- Construct project path
        
        try {
            const response = await fetch(`${projectPath}/project.json`);  // <-- Fetch project metadata
            
            if (!response.ok) {
                throw new Error(`Failed to load project: ${folderId}`);  // <-- Handle fetch error
            }
            
            const projectData = await response.json();                   // <-- Parse JSON response
            projectData.folderId = folderId;                             // <-- Add folder ID to data
            projectData.basePath = projectPath;                          // <-- Add base path to data
            
            // PRE-PROCESS IMAGES | Build pairs map from JSON images array
            if (projectData.images && projectData.images.length > 0) {
                const { baseImages, pairsMap } = buildImagePairsMap(projectData.images);  // <-- Build pairs map
                projectData.displayImages = baseImages;                  // <-- Base images for carousel
                projectData.artPairsMap = pairsMap;                      // <-- Pre-built pairs map
                projectData.allImages = projectData.images;              // <-- Keep original for downloads
            }
            
            return projectData;                                          // <-- Return project data object
            
        } catch (error) {
            console.error(`Error loading project ${folderId}:`, error);  // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load All Projects from Master Config
    // ------------------------------------------------------------
    async function loadAllProjects() {
        const masterConfig = await loadMasterConfig();                   // <-- Load master configuration
        
        if (!masterConfig || !masterConfig.projects) {
            return [];                                                   // <-- Return empty array on error
        }
        
        const projectPromises = masterConfig.projects
            .filter(project => project.enabled)                          // <-- Filter enabled projects only
            .map(project => loadProjectData(project.folderId));          // <-- Map to load promises
        
        const projects = await Promise.all(projectPromises);             // <-- Wait for all projects to load
        
        return projects.filter(project => project !== null);             // <-- Filter out failed loads
    }
    // ---------------------------------------------------------------


    // MODULE CONSTANTS | Batch Loading Configuration
    // ------------------------------------------------------------
    const GALLERY_INITIAL_BATCH_SIZE     = 20;                           // <-- First batch revealed to user (fast first paint)
    const GALLERY_SUBSEQUENT_BATCH_SIZE  = 20;                           // <-- Each follow-up batch streamed in background
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Year Prefix From Folder Identifier
    // ---------------------------------------------------------------
    function extractFolderIdYear(folderId) {
        const yearMatch = typeof folderId === 'string'
            ? folderId.match(/^(\d{4})\//)                               // <-- Match 4-digit year prefix before slash
            : null;
        return yearMatch ? parseInt(yearMatch[1], 10) : 0;               // <-- Return 0 if folderId is malformed
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Order Projects Newest-First For Batched Loading
    // ---------------------------------------------------------------
    // The masterConfig keeps newly-added projects at the end of the
    // list, so reverse-original-order within each year approximates
    // "newest first" - which matches the gallery's default
    // date-newest sort and gets the most-relevant cards on screen
    // during the very first batch of fetches.
    // ---------------------------------------------------------------
    function sortProjectEntriesNewestFirst(projectEntries) {
        const indexed = projectEntries.map((project, originalIndex) => ({
            project,                                                     // <-- Preserve original entry
            originalIndex                                                // <-- Preserve original position
        }));

        indexed.sort((a, b) => {
            const yearA = extractFolderIdYear(a.project.folderId);       // <-- Year of project A
            const yearB = extractFolderIdYear(b.project.folderId);       // <-- Year of project B
            if (yearA !== yearB) return yearB - yearA;                   // <-- Newer year first
            return b.originalIndex - a.originalIndex;                    // <-- Within same year: newest-appended first
        });

        return indexed.map(item => item.project);                        // <-- Return reordered entries
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Projects Progressively in Batches
    // ------------------------------------------------------------
    // Streams enabled projects to the caller in chunks via onBatchLoaded
    // so the gallery can render the first batch immediately while
    // subsequent batches continue loading in the background. Projects
    // are ordered newest-first so the initial batch matches the
    // gallery's default date-newest sort and the user sees the most
    // relevant cards as soon as they appear.
    // ---------------------------------------------------------------
    async function loadProjectsInBatches(initialBatchSize, subsequentBatchSize, onBatchLoaded) {
        const masterConfig = await loadMasterConfig();                   // <-- Load master configuration
        
        if (!masterConfig || !masterConfig.projects) {
            return [];                                                   // <-- Return empty array on error
        }
        
        const enabledProjects = sortProjectEntriesNewestFirst(
            masterConfig.projects.filter(project => project.enabled)     // <-- Filter enabled projects only
        );                                                               // <-- Reorder so newest entries load first
        
        const totalEnabled    = enabledProjects.length;                  // <-- Total projects to load
        const allLoaded       = [];                                      // <-- Aggregate of every loaded project
        let cursor            = 0;                                       // <-- Position in enabled list
        
        while (cursor < enabledProjects.length) {
            const batchSize = cursor === 0 ? initialBatchSize : subsequentBatchSize;  // <-- First batch may differ from rest
            const chunk     = enabledProjects.slice(cursor, cursor + batchSize);       // <-- Slice next chunk
            
            const chunkPromises = chunk.map(project => loadProjectData(project.folderId));  // <-- Fetch project.json per item
            const chunkResults  = (await Promise.all(chunkPromises))
                .filter(project => project !== null);                    // <-- Drop failed loads
            
            allLoaded.push(...chunkResults);                             // <-- Append to aggregate
            
            if (typeof onBatchLoaded === 'function') {
                onBatchLoaded(chunkResults, allLoaded.length, totalEnabled);  // <-- Notify caller with progress
            }
            
            cursor += batchSize;                                         // <-- Advance cursor
        }
        
        return allLoaded;                                                // <-- Return full list when done
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Image URL for Project
    // ------------------------------------------------------------
    function getImageUrl(projectData, imageName) {
        return `${projectData.basePath}/${imageName}`;                   // <-- Construct full image URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Thumbnail Image for Project
    // ------------------------------------------------------------
    function getThumbnailImage(projectData) {
        if (projectData && projectData.thumbnailImage) {
            return getImageUrl(projectData, projectData.thumbnailImage); // <-- Prefer the 524p thumbnail when available
        }

        if (!projectData.images || projectData.images.length === 0) {
            return null;                                                 // <-- Return null if no images
        }

        return getImageUrl(projectData, projectData.images[0]);          // <-- Fallback to first full-resolution image
    }
    // ---------------------------------------------------------------


    // FUNCTION | Parse Image Filename to Extract Details
    // ------------------------------------------------------------
    function parseImageFileName(filename) {
        const artPattern = /^IMG(\d{2})_ART(\d{2})__/;                   // <-- Pattern for ART images
        const normalPattern = /^IMG(\d{2})__/;                           // <-- Pattern for normal images
        
        const artMatch = filename.match(artPattern);                     // <-- Check for ART pattern
        if (artMatch) {
            return {
                imageNumber : artMatch[1],                               // <-- Image number (01, 02, etc.)
                artCode     : artMatch[2],                               // <-- ART code (00, 05, 10, 20)
                isArtImage  : true                                       // <-- Flag as ART image
            };
        }
        
        const normalMatch = filename.match(normalPattern);               // <-- Check for normal pattern
        if (normalMatch) {
            return {
                imageNumber : normalMatch[1],                            // <-- Image number
                artCode     : null,                                      // <-- No ART code
                isArtImage  : false                                      // <-- Flag as normal image
            };
        }
        
        return null;                                                     // <-- Return null if no match
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Image Pairs Map from JSON Images Array
    // ------------------------------------------------------------
    function buildImagePairsMap(images) {
        const pairsMap = new Map();                                      // <-- Map: base image -> ART data
        const baseImages = [];                                           // <-- Array of base images only
        
        for (const imageName of images) {
            const parsed = parseImageFileName(imageName);                // <-- Parse filename
            
            if (!parsed) continue;                                       // <-- Skip invalid filenames
            
            if (parsed.isArtImage) {
                // ART VARIANT - Find its base image in the map
                const baseImgNum = parsed.imageNumber;                   // <-- Get image number (01, 02, etc)
                
                // Find the base image this ART variant belongs to
                const baseImage = images.find(img => {
                    const baseParsed = parseImageFileName(img);
                    return baseParsed && !baseParsed.isArtImage && baseParsed.imageNumber === baseImgNum;
                });
                
                if (baseImage) {
                    const artData = {
                        filename : imageName,                            // <-- ART filename
                        artCode  : parsed.artCode,                       // <-- ART code (20, 10, etc)
                        label    : getArtCodeLabel(parsed.artCode)       // <-- Human readable label
                    };
                    pairsMap.set(baseImage, artData);                    // <-- Map base -> ART
                }
            } else {
                // BASE IMAGE
                baseImages.push(imageName);                              // <-- Add to base images array
            }
        }
        
        return { baseImages, pairsMap };                                 // <-- Return structured data
    }
    // ---------------------------------------------------------------

    // -----------------------------------------------------------------------------
    // REGION | ART Image Loading Functions
    // -----------------------------------------------------------------------------

    // FUNCTION | Get ART Code Label Description
    // ------------------------------------------------------------
    function getArtCodeLabel(artCode) {
        const ART_CODE_LABELS = {
            '00' : 'Preliminary Sketch',                                 // <-- ART00 label
            '05' : '2D CAD Drafting',                                    // <-- ART05 label
            '10' : 'Hand Drawn Technical Pen Linework',                  // <-- ART10 label
            '20' : 'Hand Drawn Watercolour Painting'                     // <-- ART20 label
        };
        
        return ART_CODE_LABELS[artCode] || 'Artistic Rendering';         // <-- Return label or default
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get ART Pair for Base Image (Direct Lookup)
    // ------------------------------------------------------------
    function getArtPairForImage(projectData, baseImageName) {
        if (!projectData.artPairsMap) {
            return null;                                                 // <-- No pairs map available
        }
        
        const artData = projectData.artPairsMap.get(baseImageName);      // <-- Direct map lookup
        
        if (artData) {
            return {
                filename : artData.filename,
                artCode  : artData.artCode,
                label    : artData.label,
                url      : `${projectData.basePath}/${artData.filename}`
            };
        }
        
        return null;                                                     // <-- No ART pair exists
    }
    // ---------------------------------------------------------------

    // endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------

