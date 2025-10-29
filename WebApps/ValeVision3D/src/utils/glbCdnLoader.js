// =============================================================================
// VALEVISION3D - GLB CDN LOADER UTILITY
// =============================================================================
//
// FILE       : glbCdnLoader.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : GLB CDN Bucket Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load GLB models and associated resources from CDN bucket
// CREATED    : 2025
//
// DESCRIPTION:
// - Specialized loader for GLB files with external texture resources
// - Scans CDN bucket for related files (textures, .rsInfo, etc.)
// - Sequential validation and loading of all resources
// - Progress tracking across multiple large files
// - Handles Cloudflare R2 bucket structure
//
// LOADING ORDER:
// 1. Load GLB file (small, contains geometry and references)
// 2. Parse GLB to identify required external textures
// 3. Load textures in priority order (diffuse maps first)
// 4. Validate each resource before proceeding
// 5. Pass complete asset bundle to Babylon.js
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | GLB CDN Loader Functions
// -----------------------------------------------------------------------------

    // FUNCTION | GLB CDN Loader Module
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.GLBCdnLoader = {
        
        // MODULE VARIABLES | Loading State Management
        // ---------------------------------------------------------------
        cdnBasePath: 'noble-architecture-cdn/VaApps/3dAssets/',          // <-- CDN bucket path
        currentLoadingAssets: [],                                        // <-- Currently loading assets
        loadedResources: {},                                             // <-- Cache of loaded resources
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Complete GLB Asset Bundle from CDN
        // ---------------------------------------------------------------
        async loadGLBBundle(scene, modelConfig, onProgress) {
            
            if (!modelConfig || !modelConfig.glbUrl) {                   // <-- Validate config
                throw new Error('Invalid model configuration');
            }
            
            try {
                // EXTRACT MODEL INFO FROM URL
                const modelInfo = this.parseModelUrl(modelConfig.glbUrl);
                
                // NOTIFY LOADING START
                if (onProgress) {
                    onProgress(0, 0, 0, 'Discovering model resources...');
                }
                
                // STEP 1: DISCOVER ALL RELATED FILES IN CDN BUCKET
                const relatedFiles = await this.discoverRelatedFiles(modelInfo, modelConfig);
                
                console.log(`Discovered ${relatedFiles.length} related files for model`);
                
                // STEP 2: VALIDATE FILE STRUCTURE
                const validation = this.validateFileStructure(relatedFiles);
                
                if (!validation.valid) {                                 // <-- Check validation
                    throw new Error(`Invalid file structure: ${validation.error}`);
                }
                
                // STEP 3: LOAD FILES IN OPTIMAL ORDER
                const loadedAssets = await this.loadFilesSequentially(
                    relatedFiles,
                    onProgress
                );
                
                // STEP 4: LOAD GLB INTO BABYLON.JS SCENE
                const model = await this.loadGLBIntoScene(
                    scene,
                    loadedAssets,
                    onProgress
                );
                
                return model;                                            // <-- Return loaded model
                
            } catch (error) {
                console.error('Error loading GLB bundle:', error);       // <-- Log error
                throw error;                                             // <-- Rethrow error
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Parse Model URL to Extract Base Information
        // ---------------------------------------------------------------
        parseModelUrl(glbUrl) {
            // EXTRACT FILE NAME AND PATH
            const urlParts = glbUrl.split('/');                          // <-- Split URL by slashes
            const fileName = urlParts[urlParts.length - 1];              // <-- Get file name
            const baseName = fileName.replace('.glb', '');               // <-- Remove extension
            
            // EXTRACT CDN PATH
            let cdnPath = this.cdnBasePath;                              // <-- Use default CDN path
            
            if (glbUrl.includes('http')) {                               // <-- Full URL provided
                const urlObj = new URL(glbUrl);
                cdnPath = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
            } else {                                                     // <-- Relative path
                const pathParts = glbUrl.split('/');
                pathParts.pop();                                         // <-- Remove file name
                cdnPath = pathParts.join('/') + '/';
            }
            
            return {
                fileName: fileName,                                      // <-- Full file name with extension
                baseName: baseName,                                      // <-- Base name without extension
                cdnPath: cdnPath,                                        // <-- Full CDN path
                glbUrl: glbUrl                                           // <-- Original URL
            };
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Discover All Related Files in CDN Bucket
        // ---------------------------------------------------------------
        async discoverRelatedFiles(modelInfo, modelConfig) {
            
            const relatedFiles = [];                                     // <-- Array to store files
            
            // CHECK IF MODEL CONFIG HAS EXPLICIT TEXTURE URLS
            if (modelConfig && modelConfig.externalTextures && Array.isArray(modelConfig.externalTextures)) {
                console.log(`Using ${modelConfig.externalTextures.length} explicit texture URLs from config`);
                
                // ADD GLB FILE FIRST
                relatedFiles.push({
                    url: modelInfo.glbUrl,
                    fileName: modelInfo.fileName,
                    type: 'glb',
                    priority: 1,
                    required: true,
                    loaded: false,
                    data: null
                });
                
                // ADD EXPLICIT TEXTURES FROM CONFIG
                modelConfig.externalTextures.forEach((textureUrl, index) => {
                    const filename = textureUrl.split('/').pop();        // <-- Extract filename from URL
                    relatedFiles.push({
                        url: textureUrl,
                        fileName: filename,
                        type: 'texture',
                        priority: 3,
                        required: false,
                        loaded: false,
                        data: null
                    });
                    console.log(`Added explicit texture: ${filename}`);
                });
                
                return relatedFiles;                                     // <-- Return early with explicit textures
            }
            
            // FALLBACK TO AUTO-DISCOVERY USING PATTERNS
            console.log('No explicit textures in config, using auto-discovery');
            
            // DEFINE EXPECTED FILE PATTERNS
            const filePatterns = [
                {
                    pattern: `${modelInfo.baseName}.glb`,                // <-- Main GLB file
                    type: 'glb',
                    priority: 1,
                    required: true
                },
                {
                    pattern: `${modelInfo.baseName}.glb.rsInfo`,         // <-- RealityCapture info
                    type: 'metadata',
                    priority: 2,
                    required: false
                },
                {
                    pattern: `${modelInfo.baseName}___u0_v0_diffuse.png`, // <-- Texture tile 0,0 (3 underscores)
                    type: 'texture',
                    priority: 3,
                    required: false
                },
                {
                    pattern: `${modelInfo.baseName}___u1_v0_diffuse.png`, // <-- Texture tile 1,0 (3 underscores)
                    type: 'texture',
                    priority: 3,
                    required: false
                },
                {
                    pattern: `${modelInfo.baseName}___u0_v1_diffuse.png`, // <-- Texture tile 0,1 (3 underscores)
                    type: 'texture',
                    priority: 3,
                    required: false
                },
                {
                    pattern: `${modelInfo.baseName}___u1_v1_diffuse.png`, // <-- Texture tile 1,1 (3 underscores)
                    type: 'texture',
                    priority: 3,
                    required: false
                }
            ];
            
            // CHECK EACH FILE PATTERN
            for (const pattern of filePatterns) {
                const fileUrl = modelInfo.cdnPath + pattern.pattern;     // <-- Construct full URL
                
                try {
                    // CHECK IF FILE EXISTS
                    const exists = await this.checkFileExists(fileUrl);  // <-- Verify file exists
                    
                    if (exists) {
                        relatedFiles.push({
                            url: fileUrl,                                // <-- File URL
                            fileName: pattern.pattern,                   // <-- File name
                            type: pattern.type,                          // <-- File type
                            priority: pattern.priority,                  // <-- Loading priority
                            required: pattern.required,                  // <-- Required flag
                            loaded: false,                               // <-- Loading status
                            data: null                                   // <-- File data
                        });
                        
                        console.log(`Found: ${pattern.pattern}`);        // <-- Log discovery
                    } else if (pattern.required) {                       // <-- Required file missing
                        throw new Error(`Required file not found: ${pattern.pattern}`);
                    }
                } catch (error) {
                    if (pattern.required) {                              // <-- Required file error
                        throw error;
                    } else {
                        console.warn(`Optional file not found: ${pattern.pattern}`);
                    }
                }
            }
            
            // SORT BY PRIORITY
            relatedFiles.sort((a, b) => a.priority - b.priority);        // <-- Sort by priority
            
            return relatedFiles;                                         // <-- Return discovered files
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Check if File Exists at URL
        // ---------------------------------------------------------------
        async checkFileExists(url) {
            try {
                const response = await fetch(url, { method: 'HEAD' });   // <-- HEAD request (no body)
                return response.ok;                                      // <-- Return status
            } catch (error) {
                return false;                                            // <-- File doesn't exist
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Validate File Structure
        // ---------------------------------------------------------------
        validateFileStructure(relatedFiles) {
            
            // CHECK FOR REQUIRED GLB FILE
            const hasGLB = relatedFiles.some(f => f.type === 'glb');     // <-- Check for GLB
            
            if (!hasGLB) {                                               // <-- GLB file missing
                return {
                    valid: false,
                    error: 'GLB file not found'
                };
            }
            
            // CHECK FILE SIZES ARE REASONABLE
            const textureFiles = relatedFiles.filter(f => f.type === 'texture');
            
            if (textureFiles.length > 0) {                               // <-- Textures found
                console.log(`Model has ${textureFiles.length} external texture files`);
            }
            
            return {
                valid: true,                                             // <-- Validation passed
                glbCount: 1,
                textureCount: textureFiles.length,
                metadataCount: relatedFiles.filter(f => f.type === 'metadata').length
            };
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Files Sequentially with Progress Tracking
        // ---------------------------------------------------------------
        async loadFilesSequentially(relatedFiles, onProgress) {
            
            const totalFiles = relatedFiles.length;                      // <-- Total file count
            let loadedFiles = 0;                                         // <-- Loaded file count
            let totalBytes = 0;                                          // <-- Total bytes to load
            let loadedBytes = 0;                                         // <-- Loaded bytes
            
            // LOAD EACH FILE IN ORDER
            for (const file of relatedFiles) {
                
                try {
                    // NOTIFY FILE LOADING START
                    if (onProgress) {
                        const progress = (loadedFiles / totalFiles) * 100;
                        onProgress(
                            progress,
                            loadedBytes,
                            totalBytes,
                            `Loading ${file.fileName}...`
                        );
                    }
                    
                    // FETCH FILE WITH PROGRESS TRACKING
                    const response = await fetch(file.url);              // <-- Fetch file
                    
                    if (!response.ok) {                                  // <-- Check response
                        throw new Error(`Failed to fetch ${file.fileName}: ${response.status}`);
                    }
                    
                    // GET CONTENT LENGTH
                    const contentLength = parseInt(response.headers.get('content-length') || '0');
                    totalBytes += contentLength;                         // <-- Add to total
                    
                    // READ RESPONSE WITH PROGRESS
                    const reader = response.body.getReader();            // <-- Get reader
                    const chunks = [];                                   // <-- Store chunks
                    let receivedLength = 0;                              // <-- Track received bytes
                    
                    while (true) {
                        const { done, value } = await reader.read();     // <-- Read chunk
                        
                        if (done) break;                                 // <-- Reading complete
                        
                        chunks.push(value);                              // <-- Store chunk
                        receivedLength += value.length;                  // <-- Update received
                        loadedBytes += value.length;                     // <-- Update total loaded
                        
                        // UPDATE PROGRESS
                        if (onProgress && contentLength > 0) {
                            const fileProgress = (receivedLength / contentLength) * 100;
                            const overallProgress = (loadedFiles / totalFiles) * 100 + 
                                                  (fileProgress / totalFiles);
                            
                            onProgress(
                                overallProgress,
                                loadedBytes,
                                totalBytes,
                                `Loading ${file.fileName} (${Math.round(fileProgress)}%)`
                            );
                        }
                    }
                    
                    // COMBINE CHUNKS INTO BLOB
                    const blob = new Blob(chunks);                       // <-- Create blob
                    
                    // STORE FILE DATA BASED ON TYPE
                    if (file.type === 'glb') {
                        file.data = URL.createObjectURL(blob);           // <-- Create object URL
                    } else if (file.type === 'texture') {
                        file.data = URL.createObjectURL(blob);           // <-- Create object URL
                    } else if (file.type === 'metadata') {
                        const text = await blob.text();                  // <-- Read as text
                        file.data = text;
                    }
                    
                    file.loaded = true;                                  // <-- Mark as loaded
                    loadedFiles++;                                       // <-- Increment counter
                    
                    console.log(`Loaded: ${file.fileName} (${this.formatBytes(receivedLength)})`);
                    
                } catch (error) {
                    console.error(`Error loading ${file.fileName}:`, error);
                    
                    if (file.required) {                                 // <-- Required file error
                        throw error;
                    }
                }
            }
            
            return relatedFiles;                                         // <-- Return loaded files
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load GLB Into Babylon.js Scene
        // ---------------------------------------------------------------
        async loadGLBIntoScene(scene, loadedAssets, onProgress) {
            
            // GET GLB FILE
            const glbFile = loadedAssets.find(f => f.type === 'glb');    // <-- Find GLB file
            
            if (!glbFile || !glbFile.data) {                             // <-- GLB not found
                throw new Error('GLB file not loaded');
            }
            
            // NOTIFY GLB LOADING
            if (onProgress) {
                onProgress(95, 0, 0, 'Loading model into scene...');
            }
            
            return new Promise((resolve, reject) => {
                
                // GET TEXTURE FILES AND BUILD MAPPING
                const textureFiles = loadedAssets.filter(f => f.type === 'texture');
                const textureMap = {};                                   // <-- Map filename to blob URL
                
                textureFiles.forEach(file => {
                    textureMap[file.fileName] = file.data;               // <-- Store blob URL by filename
                    console.log(`Texture mapping: ${file.fileName} → ${file.data}`);
                });
                
                // SETUP PLUGIN HOOK BEFORE LOADING
                BABYLON.SceneLoader.OnPluginActivatedObservable.addOnce((plugin) => {
                    if (plugin.name === 'gltf') {
                        console.log('GLTF plugin activated, installing preprocessUrlAsync hook');
                        
                        // INTERCEPT TEXTURE URL REQUESTS
                        plugin.preprocessUrlAsync = (url) => {
                            const filename = url.split('/').pop();       // <-- Extract filename from URL
                            
                            if (textureMap[filename]) {
                                console.log(`Redirecting texture request: ${filename} → blob URL`);
                                return Promise.resolve(textureMap[filename]); // <-- Use pre-loaded blob
                            }
                            
                            console.log(`No pre-loaded texture for: ${filename}, using original URL`);
                            return Promise.resolve(url);                 // <-- Use original URL
                        };
                    }
                });
                
                // LOAD GLB USING BABYLON.JS SCENELOADER
                // NOTE: Blob URLs don't have file extensions, so we must provide .glb hint
                BABYLON.SceneLoader.ImportMesh(
                    '',                                                  // <-- Load all meshes
                    '',                                                  // <-- No base path (using blob URL directly)
                    glbFile.data,                                        // <-- GLB blob URL
                    scene,                                               // <-- Target scene
                    (meshes, particleSystems, skeletons, animationGroups) => {
                        
                        const model = {                                  // <-- Create model object
                            meshes: meshes,
                            particleSystems: particleSystems,
                            skeletons: skeletons,
                            animationGroups: animationGroups,
                            externalTextures: textureFiles.length
                        };
                        
                        console.log(`Model loaded: ${meshes.length} meshes, ${textureFiles.length} external textures applied`);
                        
                        resolve(model);                                  // <-- Resolve with model
                    },
                    null,                                                // <-- No progress (already tracked)
                    (scene, message, exception) => {
                        console.error('Error loading GLB into scene:', message, exception);
                        reject(new Error(`Failed to load GLB: ${message}`));
                    },
                    '.glb'                                               // <-- File extension hint for plugin detection
                );
            });
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Apply External Textures to Meshes
        // ---------------------------------------------------------------
        applyExternalTextures(meshes, textureFiles) {
            
            console.log(`Applying ${textureFiles.length} external textures to model`);
            
            // ITERATE THROUGH MESHES AND APPLY TEXTURES
            meshes.forEach(mesh => {
                if (mesh.material) {                                     // <-- Check if material exists
                    
                    // CHECK IF MATERIAL NEEDS EXTERNAL TEXTURES
                    if (mesh.material.albedoTexture) {                   // <-- PBR material
                        
                        // FIND MATCHING TEXTURE FILE
                        const textureFile = textureFiles[0];            // <-- Use first texture
                        
                        if (textureFile && textureFile.data) {
                            // REPLACE TEXTURE WITH EXTERNAL VERSION
                            const newTexture = new BABYLON.Texture(
                                textureFile.data,                        // <-- Texture URL
                                mesh.getScene(),                         // <-- Scene reference
                                false,                                   // <-- No mipmaps
                                false                                    // <-- No invert Y
                            );
                            
                            mesh.material.albedoTexture = newTexture;    // <-- Apply texture
                        }
                    }
                }
            });
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Format Bytes to Human Readable
        // ---------------------------------------------------------------
        formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';                           // <-- Handle zero
            
            const k = 1024;                                              // <-- Kilobyte constant
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];                   // <-- Size units
            const i = Math.floor(Math.log(bytes) / Math.log(k));        // <-- Calculate unit
            
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Cleanup Object URLs
        // ---------------------------------------------------------------
        cleanup(loadedAssets) {
            if (loadedAssets && Array.isArray(loadedAssets)) {           // <-- Validate input
                loadedAssets.forEach(asset => {
                    if (asset.data && typeof asset.data === 'string') {
                        URL.revokeObjectURL(asset.data);                 // <-- Revoke object URL
                    }
                });
            }
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

