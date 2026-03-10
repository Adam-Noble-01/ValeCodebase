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
        "ValeVision__MainBuildingModel__Proposed",   // <-- Tag 20-24: Proposed building (non-door)
        "ValeVision__MainBuildingModel__ProposedDoors",  // <-- Tag 25: Proposed building doors (ADR assemblies)
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
    // OrbitHelperCube: Matches OrbitHelperCube GLB files exported from SketchUp for orbit target positioning.
    // ------------------------------------------------------------
    const Na__ModelUrl__ParseRegex        = /(?:.*?__)?(ValeVision|NaModel)__(.+?)__(MeshModel|LineworkModel)__\.glb/i;
    const Na__ModelUrl__LegacyParseRegex  = /__(BaseMeshModel|LineworkModel|MeshModel)__/i;
    const Na__ModelUrl__LegacyCategoryKey = "ValeVision__LegacyModel";   // <-- Fallback category for legacy URLs
    const Na__ModelUrl__OrbitCubeRegex    = /OrbitHelperCube__MeshModel__\.glb$/i;  // <-- Orbit helper cube detection
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
// REGION | Orbit Helper Cube Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Separate OrbitHelperCube URL from Model URLs
    // ------------------------------------------------------------
    // Filters out the OrbitHelperCube URL from the model URLs array.
    // Returns both the orbit cube URL (if found) and the filtered URLs array.
    // ------------------------------------------------------------
    function Na__ModelLoader__SeparateOrbitCubeUrl(modelUrls) {
        if (!Array.isArray(modelUrls) || modelUrls.length === 0) {
            return { orbitCubeUrl: null, filteredUrls: [] };  // <-- Return empty result for invalid input
        }

        const filteredUrls = [];                              // <-- Filtered URLs without orbit cube
        let orbitCubeUrl = null;                              // <-- Extracted orbit cube URL

        for (const url of modelUrls) {
            if (typeof url !== 'string') continue;            // <-- Skip invalid URLs

            const filename = url.split('/').pop();            // <-- Extract filename from URL
            if (Na__ModelUrl__OrbitCubeRegex.test(filename)) {
                orbitCubeUrl = url;                           // <-- Found orbit cube URL
                console.log('[ValeVision3D] Found OrbitHelperCube:', url);
            } else {
                filteredUrls.push(url);                       // <-- Keep non-cube URLs
            }
        }

        return { orbitCubeUrl, filteredUrls };                // <-- Return separated URLs
    }
    // ------------------------------------------------------------


    // FUNCTION | Load OrbitHelperCube GLB and Extract Center Position
    // ------------------------------------------------------------
    // Loads the OrbitHelperCube GLB file and calculates its bounding box center.
    // Returns the loaded mesh root and the center position as a THREE.Vector3.
    // The center position is in 3D units (not millimeters).
    // ------------------------------------------------------------
    async function Na__ModelLoader__LoadOrbitHelperCube(orbitCubeUrl, loader) {
        if (!orbitCubeUrl || typeof orbitCubeUrl !== 'string') {
            return null;                                      // <-- Guard against invalid input
        }

        try {
            const gltf = await loader.loadAsync(orbitCubeUrl);  // <-- Load GLB file
            const meshRoot = gltf.scene;                      // <-- Extract scene graph

            // CALCULATE BOUNDING BOX CENTER
            const box = new THREE.Box3();                     // <-- Create bounding box
            box.setFromObject(meshRoot);                      // <-- Compute bounding box from scene

            const centerPosition = new THREE.Vector3();       // <-- Create center vector
            box.getCenter(centerPosition);                    // <-- Extract center point

            console.log('[ValeVision3D] OrbitHelperCube loaded. Center:', centerPosition);

            return {
                mesh: meshRoot,                               // <-- THREE.Group containing the cube mesh
                centerPosition: centerPosition                // <-- THREE.Vector3 center position
            };
        } catch (error) {
            console.error('[ValeVision3D] Failed to load OrbitHelperCube:', error);
            return null;                                      // <-- Return null on error
        }
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


    // HELPER FUNCTION | Extract Imported Line Vertex Colours
    // ------------------------------------------------------------
    function Na__ModelLoader__ExtractLineColors(geometry) {
        const colorAttribute = geometry && geometry.getAttribute ? geometry.getAttribute('color') : null;
        if (!colorAttribute || colorAttribute.itemSize < 3) {
            return null;                                                     // <-- No usable imported line colours
        }

        const lineColors = [];
        const tempColor  = new THREE.Color();

        for (let vertexIndex = 0; vertexIndex < colorAttribute.count; vertexIndex++) {
            tempColor.fromBufferAttribute(colorAttribute, vertexIndex);      // <-- Reads RGB, safely ignoring alpha if present
            lineColors.push(tempColor.r, tempColor.g, tempColor.b);
        }

        return lineColors;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Quantized Colour Key
    // ------------------------------------------------------------
    function Na__ModelLoader__BuildColorKey(colorTriplet) {
        if (!Array.isArray(colorTriplet) || colorTriplet.length < 3) {
            return null;                                                     // <-- Guard against invalid colour triplets
        }

        const r = Math.round(THREE.MathUtils.clamp(colorTriplet[0], 0, 1) * 255);
        const g = Math.round(THREE.MathUtils.clamp(colorTriplet[1], 0, 1) * 255);
        const b = Math.round(THREE.MathUtils.clamp(colorTriplet[2], 0, 1) * 255);
        return `${r}_${g}_${b}`;                                             // <-- Stable RGB key for vote maps
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Register Colour Vote
    // ------------------------------------------------------------
    function Na__ModelLoader__RegisterColorVote(voteMap, colorTriplet, weight = 1) {
        const colorKey = Na__ModelLoader__BuildColorKey(colorTriplet);
        if (!colorKey) return;                                               // <-- Ignore invalid colours

        const existingVote = voteMap.get(colorKey);
        if (existingVote) {
            existingVote.weight += weight;                                   // <-- Accumulate weight for repeated colours
            return;
        }

        voteMap.set(colorKey, {
            color  : [colorTriplet[0], colorTriplet[1], colorTriplet[2]],    // <-- Store normalized RGB triplet
            weight : weight
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Dominant Colour from Vote Map
    // ------------------------------------------------------------
    function Na__ModelLoader__ResolveDominantColor(voteMap) {
        let dominantVote = null;

        voteMap.forEach((vote) => {
            if (!dominantVote || vote.weight > dominantVote.weight) {
                dominantVote = vote;                                          // <-- Track strongest vote
            }
        });

        return dominantVote ? [...dominantVote.color] : null;                 // <-- Return detached RGB triplet
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Dominant Imported Line Colour
    // ------------------------------------------------------------
    function Na__ModelLoader__ResolveDominantImportedLineColor(importedColors) {
        if (!Array.isArray(importedColors) || importedColors.length < 3) {
            return null;                                                      // <-- No imported colours to resolve
        }

        const colorVotes = new Map();
        for (let colorIndex = 0; colorIndex < importedColors.length; colorIndex += 3) {
            Na__ModelLoader__RegisterColorVote(colorVotes, [
                importedColors[colorIndex],
                importedColors[colorIndex + 1],
                importedColors[colorIndex + 2]
            ]);
        }

        return Na__ModelLoader__ResolveDominantColor(colorVotes);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find Colour by Exact or Prefix Name Match
    // ------------------------------------------------------------
    // Exact match first; otherwise longest prefix match (e.g. linework "CubeInstance1"
    // preferred over "Cube" when mesh is "CubeInstance1").
    // ------------------------------------------------------------
    function Na__ModelLoader__FindColorByName(objectName, colorByName) {
        if (!objectName || typeof objectName !== 'string') return null;

        if (colorByName[objectName]) {
            return colorByName[objectName];                                   // <-- Exact match
        }

        let bestMatch = null;
        let bestLength = 0;
        for (const key of Object.keys(colorByName)) {
            if (!key) continue;
            const objectStartsKey = objectName.startsWith(key);
            const keyStartsObject = key.startsWith(objectName);
            if (objectStartsKey || keyStartsObject) {
                const matchLen = Math.min(key.length, objectName.length);
                if (matchLen > bestLength) {
                    bestLength = matchLen;
                    bestMatch = colorByName[key];
                }
            }
        }
        return bestMatch;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Profile Colour from Named Context
    // ------------------------------------------------------------
    function Na__ModelLoader__ResolveProfileColorForObject(object, colorByName, rootColor) {
        let current = object;

        while (current) {
            const matchedColor = current.name ? Na__ModelLoader__FindColorByName(current.name, colorByName) : null;
            if (matchedColor) {
                return [...matchedColor];                                    // <-- Prefer nearest named colour match (exact or prefix)
            }
            current = current.parent;
        }

        return rootColor ? [...rootColor] : null;                             // <-- Fall back to linework root colour
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Profile Line Colours to Mesh Root
    // ------------------------------------------------------------
    function Na__ModelLoader__ApplyProfileLineColoursToMeshRoot(meshRoot, lineworkRoot) {
        if (!meshRoot || !lineworkRoot) {
            return meshRoot;                                                  // <-- Need both roots to build profile-colour mapping
        }

        const colorByName = lineworkRoot.userData.Na__ProfileLineColorByName || {};
        const rootColor   = lineworkRoot.userData.Na__ProfileLineColorDominant || null;
        if (!rootColor && Object.keys(colorByName).length === 0) {
            return meshRoot;                                                  // <-- No usable linework colours to propagate
        }

        meshRoot.userData.Na__ProfileLineColorDominant = rootColor ? [...rootColor] : null;
        if (rootColor) {
            meshRoot.userData.Na__ProfileLineColor = [...rootColor];           // <-- Set on root so child meshes inherit when no name match
        }

        meshRoot.traverse((node) => {
            if (!node.isMesh) return;                                         // <-- Profile colour is only needed on mesh objects

            const resolvedColor = Na__ModelLoader__ResolveProfileColorForObject(node, colorByName, rootColor);
            if (resolvedColor) {
                node.userData.Na__ProfileLineColor = resolvedColor;            // <-- Store per-mesh dominant colour for profile prepass
            }
        });

        return meshRoot;
    }
    // ------------------------------------------------------------


    // FUNCTION | Upgrade Imported Linework Root to Fat Lines
    // ------------------------------------------------------------
    function Na__ModelLoader__UpgradeLineworkRoot(lineworkRoot, lineworkConfig, lineResolution) {
        if (!lineworkRoot) {
            return lineworkRoot;                                              // <-- Guard against invalid scene roots
        }

        const nodesToReplace = [];                                            // <-- Collect line nodes for replacement
        const rootColorVotes = new Map();                                     // <-- Dominant colour votes for whole linework root
        const colorVotesByName = new Map();                                   // <-- Dominant colour votes keyed by line object name
        lineworkRoot.traverse((node) => {
            if (node.isLineSegments || node.isLine) {
                nodesToReplace.push(node);                                    // <-- Queue for fat-line replacement
            }
        });

        nodesToReplace.forEach((node) => {
            const positions = node.geometry.attributes.position.array;         // <-- Get vertex positions
            const importedColors = Na__ModelLoader__ExtractLineColors(node.geometry);   // <-- Preserve exported SketchUp edge colours when present
            const dominantLineColor = Na__ModelLoader__ResolveDominantImportedLineColor(importedColors);

            const fatLineGeometry = new LineSegmentsGeometry();
            fatLineGeometry.setPositions(positions);                           // <-- Set line segment positions
            if (importedColors) {
                fatLineGeometry.setColors(importedColors);                     // <-- Carry glTF COLOR_0 into fat-line geometry
            }
            fatLineGeometry.computeBoundingBox();                              // <-- Required for frustum culling
            fatLineGeometry.computeBoundingSphere();                           // <-- Required for frustum culling

            const fatLineMaterial = new LineMaterial({
                color               : importedColors ? 0xffffff : lineworkConfig.RenderConfig__Linework__EdgeColor,  // <-- Imported colours use white multiplier; config colour is fallback
                linewidth           : lineworkConfig.RenderConfig__Linework__LineWidth,          // <-- Line width from config
                resolution          : lineResolution,                                            // <-- Screen resolution for line width
                worldUnits          : false,                                                     // <-- Screen-space line width
                vertexColors        : !!importedColors,                                          // <-- Enable per-vertex colours when exported linework provides them
                depthTest           : true,                                                      // <-- Enable depth testing
                depthWrite          : true,                                                      // <-- Enable depth writing
                polygonOffset       : true,                                                      // <-- Enable polygon offset
                polygonOffsetFactor : lineworkConfig.RenderConfig__Linework__PolygonOffsetFactor,
                polygonOffsetUnits  : lineworkConfig.RenderConfig__Linework__PolygonOffsetUnits
            });

            // DEPTH BIAS | Pull line fragments forward when logarithmic depth buffer is used
            // ------------------------------------------------------------
            const depthBias = (lineworkConfig.RenderConfig__Linework__DepthBias != null)
                ? lineworkConfig.RenderConfig__Linework__DepthBias
                : 0.00015;
            fatLineMaterial.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <logdepthbuf_fragment>',
                    `#include <logdepthbuf_fragment>
                    if (gl_FragDepth > 0.0) {
                        gl_FragDepth -= ${depthBias};
                    }`
                );
            };
            // ------------------------------------------------------------

            const fatLineSegment = new LineSegments2(fatLineGeometry, fatLineMaterial);
            fatLineSegment.computeLineDistances();                             // <-- Compute for proper rendering
            fatLineSegment.frustumCulled = true;                               // <-- Allow frustum culling with computed bounds
            fatLineSegment.renderOrder   = lineworkConfig.RenderConfig__Linework__RenderOrder;   // <-- Render order from config
            fatLineSegment.name          = node.name;                          // <-- Preserve original node naming for hierarchy/debug
            fatLineSegment.visible       = node.visible;                       // <-- Preserve visibility state
            fatLineSegment.userData      = { ...node.userData };               // <-- Preserve glTF extras/user data
            if (dominantLineColor) {
                fatLineSegment.userData.Na__ProfileLineColor = [...dominantLineColor];  // <-- Store object-level dominant colour
                Na__ModelLoader__RegisterColorVote(rootColorVotes, dominantLineColor, importedColors.length / 3);

                if (node.name) {
                    if (!colorVotesByName.has(node.name)) {
                        colorVotesByName.set(node.name, new Map());
                    }
                    Na__ModelLoader__RegisterColorVote(colorVotesByName.get(node.name), dominantLineColor, importedColors.length / 3);
                }
            }

            fatLineSegment.position.copy(node.position);                       // <-- Copy transform from original
            fatLineSegment.rotation.copy(node.rotation);
            fatLineSegment.scale.copy(node.scale);
            fatLineSegment.matrix.copy(node.matrix);
            fatLineSegment.matrixAutoUpdate = node.matrixAutoUpdate;

            if (node.parent) {
                node.parent.add(fatLineSegment);                               // <-- Replace in parent
                node.parent.remove(node);
            } else {
                lineworkRoot.add(fatLineSegment);                              // <-- Add to root fallback
            }

            node.geometry.dispose();                                           // <-- Clean up original geometry
        });

        lineworkRoot.renderOrder = 100;                                        // <-- Linework always renders on top
        lineworkRoot.userData.Na__ProfileLineColorDominant = Na__ModelLoader__ResolveDominantColor(rootColorVotes);
        lineworkRoot.userData.Na__ProfileLineColorByName = {};
        colorVotesByName.forEach((voteMap, objectName) => {
            const dominantNamedColor = Na__ModelLoader__ResolveDominantColor(voteMap);
            if (dominantNamedColor) {
                lineworkRoot.userData.Na__ProfileLineColorByName[objectName] = dominantNamedColor;
            }
        });
        return lineworkRoot;                                                   // <-- Return processed linework root
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Single Linework GLB (Fat Lines)
    // ------------------------------------------------------------
    async function Na__ModelLoader__LoadSingleLinework(modelUrl, lineworkConfig, loader, lineResolution) {
        const gltf         = await loader.loadAsync(modelUrl);           // <-- Load GLB file
        const lineworkRoot = gltf.scene;                                 // <-- Extract scene graph
        return Na__ModelLoader__UpgradeLineworkRoot(lineworkRoot, lineworkConfig, lineResolution);
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
                        config.RenderConfig__Linework,                   // <-- Linework rendering config
                        loader,
                        lineResolution
                    );
                    categoryGroup.add(lineworkRoot);                     // <-- Add linework to category group
                    Na__ModelLoader__ApplyProfileLineColoursToMeshRoot(categoryGroup.children.find((child) => child !== lineworkRoot), lineworkRoot);
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
                    const lineworkRoot = await Na__ModelLoader__LoadSingleLinework(entry.lineworkUrl, config.RenderConfig__Linework, loader, lineResolution);
                    categoryGroup.add(lineworkRoot);
                    Na__ModelLoader__ApplyProfileLineColoursToMeshRoot(categoryGroup.children.find((child) => child !== lineworkRoot), lineworkRoot);
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
        Na__ModelLoader__UpgradeLineworkRoot,
        Na__ModelLoader__ApplyProfileLineColoursToMeshRoot,
        Na__ModelLoader__ClassifyUrls,
        Na__ModelLoader__ParseModelUrl,
        Na__ModelLoader__SeparateOrbitCubeUrl,
        Na__ModelLoader__LoadOrbitHelperCube,
        Na__ModelCategories__LoadOrder
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
