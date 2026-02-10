// =============================================================================
// VALEVISION3D - MULTI-MODEL LOADER
// =============================================================================
//
// FILE       : Na__ModelLoader__MultiModel.js
// NAMESPACE  : Na__ModelLoader
// MODULE     : MultiModel
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load multiple categorized GLB model pairs (Mesh + Linework)
// CREATED    : 10-Feb-2026
//
// DESCRIPTION:
// - Loads multiple GLB model pairs from an array of CDN URLs.
// - Classifies each URL by parsing the ValeVision category and model type.
// - Accepts both __ValeVision__ (preferred) and __NaModel__ (backstop) namespaces.
// - Loads models sequentially in priority order defined by the GLB Builder tag ranges.
// - Each category gets its own THREE.Group for future per-category toggling.
// - Material config and linework config are read from AppConfig (passed in).
//
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';


// -----------------------------------------------------------------------------
// REGION | Module Constants and Category Registry
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Model Category Loading Priority Order
    // ------------------------------------------------------------
    // Matches GLB Builder tag range definitions, rebranded to ValeVision namespace.
    // Building models load first, then environment, furniture, vegetation, context.
    // ------------------------------------------------------------
    const Na__ModelCategories__LoadOrder = [
        "ValeVision__MainBuildingModel__Existing",   // <-- Tag 10-19: Existing building
        "ValeVision__MainBuildingModel__Proposed",   // <-- Tag 20-29: Proposed building
        "ValeVision__LandscapeEnvironment",          // <-- Tag 07-09: Landscape & environment
        "ValeVision__GroundFloorFurniture",          // <-- Tag 30-38: Ground floor furniture
        "ValeVision__GroundFloorDecor",              // <-- Tag 39:    Ground floor high detail
        "ValeVision__FirstFloorFurniture",           // <-- Tag 40-48: First floor furniture
        "ValeVision__FirstFloorDecor",               // <-- Tag 49:    First floor high detail
        "ValeVision__Vegetation",                    // <-- Tag 50-59: Vegetation
        "ValeVision__SceneContextual"                // <-- Tag 60-70: Scene context
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | URL Parsing Regex
    // ------------------------------------------------------------
    // Primary: Accepts __ValeVision__ (CDN rebranded) and __NaModel__ (raw SketchUp export).
    // Supports optional project prefix (e.g., DeLisle__ValeVision__).
    // Captures: [1] namespace (ValeVision|NaModel), [2] category, [3] model type.
    // Legacy:  Matches older __Layer-XX__BaseMeshModel__ / __LineworkModel__ patterns.
    // Captures: [1] model type indicator (BaseMeshModel|LineworkModel).
    // ------------------------------------------------------------
    const Na__ModelUrl__ParseRegex        = /(?:.*?__)?(ValeVision|NaModel)__(.+?)__(MeshModel|LineworkModel)__\.glb/i;
    const Na__ModelUrl__LegacyParseRegex  = /__(BaseMeshModel|LineworkModel|MeshModel)__/i;
    const Na__ModelUrl__LegacyCategoryKey = "ValeVision__LegacyModel";   // <-- Fallback category for legacy URLs
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | URL Classification Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Single Model URL Into Category and Type
    // ------------------------------------------------------------
    function Na__ModelLoader__ParseModelUrl(url) {
        if (!url || typeof url !== 'string') return null;                // <-- Guard against invalid input

        const filename  = url.split('/').pop();                          // <-- Extract filename from URL

        // PRIMARY REGEX | New ValeVision / NaModel naming convention
        const match = Na__ModelUrl__ParseRegex.exec(filename);           // <-- Run primary regex
        if (match) {
            const namespace = match[1];                                  // <-- ValeVision or NaModel
            const category  = match[2];                                  // <-- e.g. MainBuildingModel__Existing
            const modelType = match[3];                                  // <-- MeshModel or LineworkModel

            // NORMALIZE NAMESPACE | NaModel -> ValeVision (backstop support)
            const normalizedCategory = `ValeVision__${category}`;        // <-- Always use ValeVision prefix

            return {
                url            : url,                                    // <-- Original full URL
                category       : normalizedCategory,                     // <-- Normalized category key
                modelType      : modelType,                              // <-- MeshModel or LineworkModel
                rawNamespace   : namespace                               // <-- Original namespace for logging
            };
        }

        // LEGACY REGEX | Older __Layer-XX__BaseMeshModel__ / __LineworkModel__ patterns
        const legacyMatch = Na__ModelUrl__LegacyParseRegex.exec(filename);
        if (legacyMatch) {
            const legacyType = legacyMatch[1];                           // <-- BaseMeshModel, MeshModel, or LineworkModel
            const modelType  = (legacyType === 'LineworkModel')
                ? 'LineworkModel'                                        // <-- Map to LineworkModel
                : 'MeshModel';                                           // <-- BaseMeshModel and MeshModel -> MeshModel

            return {
                url            : url,                                    // <-- Original full URL
                category       : Na__ModelUrl__LegacyCategoryKey,        // <-- Fallback legacy category
                modelType      : modelType,                              // <-- MeshModel or LineworkModel
                rawNamespace   : 'Legacy'                                // <-- Flag as legacy for logging
            };
        }

        return null;                                                     // <-- No match at all
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Classify All Model URLs Into Category Map
    // ------------------------------------------------------------
    function Na__ModelLoader__ClassifyUrls(modelUrls) {
        const categoryMap = {};                                          // <-- { category: { meshUrl, lineworkUrl } }

        for (const url of modelUrls) {
            const parsed = Na__ModelLoader__ParseModelUrl(url);          // <-- Parse each URL
            if (!parsed) {
                console.warn('[ValeVision3D] Unrecognized model URL, skipping:', url);
                continue;                                                // <-- Skip unrecognized URLs
            }

            if (!categoryMap[parsed.category]) {
                categoryMap[parsed.category] = {
                    meshUrl     : null,                                  // <-- MeshModel URL slot
                    lineworkUrl : null                                   // <-- LineworkModel URL slot
                };
            }

            if (parsed.modelType === 'MeshModel') {
                categoryMap[parsed.category].meshUrl = parsed.url;       // <-- Assign mesh URL
            } else if (parsed.modelType === 'LineworkModel') {
                categoryMap[parsed.category].lineworkUrl = parsed.url;   // <-- Assign linework URL
            }
        }

        return categoryMap;                                              // <-- Return classified map
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Single Model Loading Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Load Single Base Mesh GLB (Faces)
    // ------------------------------------------------------------
    async function Na__ModelLoader__LoadSingleMesh(modelUrl, baseMeshConfig, loader) {
        const gltf         = await loader.loadAsync(modelUrl);           // <-- Load GLB file
        const meshRoot     = gltf.scene;                                 // <-- Extract scene graph

        const Na__Material__WhiteMat = new THREE.MeshStandardMaterial({
            color               : baseMeshConfig.material.whiteColor,    // <-- White base color
            roughness           : baseMeshConfig.material.roughness,     // <-- Surface roughness
            metalness           : baseMeshConfig.material.metalness,     // <-- Metallic factor
            side                : THREE.DoubleSide,                      // <-- Render both faces
            polygonOffset       : true,                                  // <-- Enable polygon offset
            polygonOffsetFactor : baseMeshConfig.material.polygonOffsetFactor,
            polygonOffsetUnits  : baseMeshConfig.material.polygonOffsetUnits
        });

        meshRoot.traverse((node) => {
            if (!node.isMesh) return;                                    // <-- Skip non-mesh nodes

            node.castShadow    = true;                                   // <-- Enable shadow casting
            node.receiveShadow = true;                                   // <-- Enable shadow receiving

            if (node.material && (node.material.map || node.material.emissiveMap)) {
                node.material                    = node.material.clone();
                node.material.side               = THREE.DoubleSide;
                node.material.polygonOffset      = true;
                node.material.polygonOffsetFactor = baseMeshConfig.material.polygonOffsetFactor;
                node.material.polygonOffsetUnits  = baseMeshConfig.material.polygonOffsetUnits;
                node.material.emissive           = new THREE.Color(baseMeshConfig.material.textureEmissive);
                node.material.emissiveIntensity  = 0.0;

                if (node.material.map && !node.material.emissiveMap) {
                    node.material.emissiveMap = node.material.map;       // <-- Use diffuse as emissive fallback
                }

                node.material.roughness = 1.0;                          // <-- Override roughness for textured
                node.material.metalness = 0.0;                          // <-- Override metalness for textured
            } else {
                node.material = Na__Material__WhiteMat;                  // <-- Apply white material
            }
        });

        return meshRoot;                                                 // <-- Return processed mesh root
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Single Linework GLB (Fat Lines)
    // ------------------------------------------------------------
    async function Na__ModelLoader__LoadSingleLinework(modelUrl, lineworkConfig, loader, lineResolution) {
        const gltf         = await loader.loadAsync(modelUrl);           // <-- Load GLB file
        const lineworkRoot = gltf.scene;                                 // <-- Extract scene graph
        const nodesToReplace = [];                                       // <-- Collect line nodes for replacement

        lineworkRoot.traverse((node) => {
            if (node.isLineSegments || node.isLine) {
                nodesToReplace.push(node);                               // <-- Queue for fat-line replacement
            }
        });

        nodesToReplace.forEach((node) => {
            const positions = node.geometry.attributes.position.array;   // <-- Get vertex positions

            const fatLineGeometry = new LineSegmentsGeometry();
            fatLineGeometry.setPositions(positions);                     // <-- Set line segment positions

            const fatLineMaterial = new LineMaterial({
                color               : lineworkConfig.edgeColor,          // <-- Line color from config
                linewidth           : lineworkConfig.lineWidth,          // <-- Line width from config
                resolution          : lineResolution,                    // <-- Screen resolution for line width
                worldUnits          : false,                             // <-- Screen-space line width
                depthTest           : true,                              // <-- Enable depth testing
                depthWrite          : true,                              // <-- Enable depth writing
                polygonOffset       : true,                              // <-- Enable polygon offset
                polygonOffsetFactor : lineworkConfig.polygonOffsetFactor,
                polygonOffsetUnits  : lineworkConfig.polygonOffsetUnits
            });

            const fatLineSegment = new LineSegments2(fatLineGeometry, fatLineMaterial);
            fatLineSegment.computeLineDistances();                       // <-- Compute for proper rendering
            fatLineSegment.frustumCulled = false;                        // <-- Always render (no culling)
            fatLineSegment.renderOrder   = lineworkConfig.renderOrder;   // <-- Render order from config

            fatLineSegment.position.copy(node.position);                 // <-- Copy transform from original
            fatLineSegment.rotation.copy(node.rotation);
            fatLineSegment.scale.copy(node.scale);
            fatLineSegment.matrix.copy(node.matrix);
            fatLineSegment.matrixAutoUpdate = node.matrixAutoUpdate;

            if (node.parent) {
                node.parent.add(fatLineSegment);                         // <-- Replace in parent
                node.parent.remove(node);
            } else {
                lineworkRoot.add(fatLineSegment);                        // <-- Add to root fallback
            }

            node.geometry.dispose();                                     // <-- Clean up original geometry
        });

        lineworkRoot.renderOrder = 100;                                  // <-- Linework always renders on top
        return lineworkRoot;                                             // <-- Return processed linework root
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Multi-Model Orchestration
// -----------------------------------------------------------------------------

    // FUNCTION | Load All Models in Priority Order
    // ------------------------------------------------------------
    // Main entry point. Accepts an array of CDN URLs, classifies them by
    // category and type, then loads each category pair (Mesh + Linework)
    // sequentially in the priority order defined by Na__ModelCategories__LoadOrder.
    // Returns a Map of category -> THREE.Group for future toggling support.
    // ------------------------------------------------------------
    async function Na__ModelLoader__LoadAllModels(modelUrls, modelGroupRoot, config, lineResolution, statusCallback) {
        const loader      = new GLTFLoader();                            // <-- Create shared GLB loader
        const categoryMap = Na__ModelLoader__ClassifyUrls(modelUrls);    // <-- Classify URLs by category
        const loadedGroups = new Map();                                  // <-- Map of category -> THREE.Group

        // LOG DISCOVERY SUMMARY
        const discoveredCategories = Object.keys(categoryMap);           // <-- List discovered categories
        console.log(`[ValeVision3D] Discovered ${discoveredCategories.length} model categories:`);
        discoveredCategories.forEach((cat) => {
            const entry = categoryMap[cat];
            console.log(`  - ${cat}: Mesh=${entry.meshUrl ? 'YES' : 'NO'}, Linework=${entry.lineworkUrl ? 'YES' : 'NO'}`);
        });

        // LOAD IN PRIORITY ORDER
        for (const category of Na__ModelCategories__LoadOrder) {
            const entry = categoryMap[category];                         // <-- Look up category in classified map
            if (!entry) continue;                                        // <-- Skip categories not in this project

            const categoryGroup       = new THREE.Group();               // <-- Create group for this category
            categoryGroup.name        = category;                        // <-- Name group for debugging
            const shortName           = category.replace('ValeVision__', '');  // <-- Short name for status display

            // LOAD MESH MODEL FOR THIS CATEGORY
            if (entry.meshUrl) {
                if (statusCallback) statusCallback(`Loading ${shortName} Mesh...`);
                try {
                    const meshRoot = await Na__ModelLoader__LoadSingleMesh(
                        entry.meshUrl,
                        config.baseMesh,                                 // <-- Base mesh material config
                        loader
                    );
                    categoryGroup.add(meshRoot);                         // <-- Add mesh to category group
                    console.log(`[ValeVision3D] Loaded Mesh: ${shortName}`);
                } catch (error) {
                    console.error(`[ValeVision3D] Failed to load Mesh for ${shortName}:`, error);
                }
            }

            // LOAD LINEWORK MODEL FOR THIS CATEGORY
            if (entry.lineworkUrl) {
                if (statusCallback) statusCallback(`Loading ${shortName} Linework...`);
                try {
                    const lineworkRoot = await Na__ModelLoader__LoadSingleLinework(
                        entry.lineworkUrl,
                        config.linework,                                 // <-- Linework rendering config
                        loader,
                        lineResolution
                    );
                    categoryGroup.add(lineworkRoot);                     // <-- Add linework to category group
                    console.log(`[ValeVision3D] Loaded Linework: ${shortName}`);
                } catch (error) {
                    console.error(`[ValeVision3D] Failed to load Linework for ${shortName}:`, error);
                }
            }

            modelGroupRoot.add(categoryGroup);                           // <-- Add category group to scene root
            loadedGroups.set(category, categoryGroup);                   // <-- Store reference for toggling
        }

        // HANDLE UNCATEGORIZED URLS (not in load order but still valid)
        for (const [category, entry] of Object.entries(categoryMap)) {
            if (loadedGroups.has(category)) continue;                    // <-- Already loaded in priority pass

            const categoryGroup       = new THREE.Group();
            categoryGroup.name        = category;
            const shortName           = category.replace('ValeVision__', '');

            if (entry.meshUrl) {
                if (statusCallback) statusCallback(`Loading ${shortName} Mesh...`);
                try {
                    const meshRoot = await Na__ModelLoader__LoadSingleMesh(entry.meshUrl, config.baseMesh, loader);
                    categoryGroup.add(meshRoot);
                    console.log(`[ValeVision3D] Loaded Mesh (unordered): ${shortName}`);
                } catch (error) {
                    console.error(`[ValeVision3D] Failed to load Mesh for ${shortName}:`, error);
                }
            }

            if (entry.lineworkUrl) {
                if (statusCallback) statusCallback(`Loading ${shortName} Linework...`);
                try {
                    const lineworkRoot = await Na__ModelLoader__LoadSingleLinework(entry.lineworkUrl, config.linework, loader, lineResolution);
                    categoryGroup.add(lineworkRoot);
                    console.log(`[ValeVision3D] Loaded Linework (unordered): ${shortName}`);
                } catch (error) {
                    console.error(`[ValeVision3D] Failed to load Linework for ${shortName}:`, error);
                }
            }

            modelGroupRoot.add(categoryGroup);
            loadedGroups.set(category, categoryGroup);
        }

        console.log(`[ValeVision3D] Multi-model loading complete. ${loadedGroups.size} categories loaded.`);
        return loadedGroups;                                             // <-- Return loaded groups map
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Multi-Model Loader API
    // ------------------------------------------------------------
    export {
        Na__ModelLoader__LoadAllModels,
        Na__ModelLoader__ClassifyUrls,
        Na__ModelLoader__ParseModelUrl,
        Na__ModelCategories__LoadOrder
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
