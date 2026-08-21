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
// - Supports storey-based exports (Storey__{Name}__{Element}) producing distinct
//   per-element category keys — TrueVision parity for MaxModel projects.
// - Loads models sequentially in priority order defined by the GLB Builder tag ranges;
//   storey and unrecognised-but-valid categories load via the unordered second pass.
// - Indexed MAT###__ materials are preserved at load so the render-engine materials
//   swap pass can match them by name (glass, mirrors, etc.).
// - Transparent MAT000E__ exempt materials are preserved at load as glazing so the
//   SketchUp Opacity slider carried in the GLB survives into both render engines.
// - Each category gets its own THREE.Group for future per-category toggling.
// - Material config and linework config are read from AppConfig (passed in).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Aug-2026 - Version 1.2.2
// - LoadSingleMesh preserves transparent MAT000E__ exempt materials (clone +
//   transparent + depthWrite false) instead of collapsing them into the opaque
//   shared whitecard, so exempt glazing reads as see-through under PureEngine.
//
// 10-Jun-2026 - Version 1.1.0
// - Added Na__ModelUrl__StoreyParseRegex + storey branch in ParseModelUrl (before
//   the legacy fallback) so storey GLB sets no longer collapse into the single
//   ValeVision__LegacyModel bucket (was causing 5-of-13 file loads).
// - LoadSingleMesh now preserves indexed MAT###__ materials (clone + polygon
//   offset only) instead of whitecard-replacing them, and handles multi-material
//   arrays. Non-indexed materials keep the exact previous whitecard treatment.
//
// 11-Jun-2026 - Version 1.2.0
// - PWA stability fix: LoadSingleMesh, LoadSingleLinework, LoadOrbitHelperCube
//   now use Na__ResilientLoad__GltfLoadWithTimeout (timeout + retry) instead of
//   bare loader.loadAsync, preventing stalled iOS connections from hanging the
//   pipeline indefinitely.
// - LoadAllModels accepts resilienceConfig parameter and uses
//   Na__ResilientLoad__RunWithConcurrencyCap to load categories in parallel
//   (default cap 3) instead of fully sequential. Mesh+linework within each
//   category remain sequential. Results are ordered to preserve Map insertion
//   order matching priority order.
//
// 25-Jun-2026 - Version 1.2.1
// - Orbit Helper Cube visibility regression fix (ValeVision3D v2.9.1): strip ?query
//   from filename before OrbitHelperCube regex and ParseModelUrl classification so
//   v2.9.0 build-version cache-bust (?v=) no longer prevents cube separation.
//
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';

// MODULE IMPORTS | Resilient Load Helpers (timeout, retry, concurrency cap)
// @delegate: ../03__AppUtils/Na__AppUtils__ResilientLoad__.js
import {
    Na__ResilientLoad__GltfLoadWithTimeout,
    Na__ResilientLoad__RunWithConcurrencyCap
} from '../03__AppUtils/Na__AppUtils__ResilientLoad__.js';


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
        "ValeVision__SiteBoundaries",                // <-- Tag 08: Site boundaries (fences, walls, site lines)
        "ValeVision__LandscapeEnvironment",          // <-- Tag 07, 09: Landscape & environment
        "ValeVision__GroundFloorFurniture",          // <-- Tag 30-38: Ground floor furniture
        "ValeVision__GroundFloorDecor",              // <-- Tag 39:    Ground floor high detail
        "ValeVision__FirstFloorFurniture",           // <-- Tag 40-48: First floor furniture
        "ValeVision__FirstFloorDecor",               // <-- Tag 49:    First floor high detail
        "ValeVision__Vegetation",                    // <-- Tag 50-59: Vegetation
        "ValeVision__SceneContextual"                // <-- Tag 61-70: Scene context
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | URL Parsing Regex
    // ------------------------------------------------------------
    // Primary: Accepts __ValeVision__ (CDN rebranded) and __NaModel__ (raw SketchUp export).
    // Supports optional project prefix (e.g., DeLisle__ValeVision__).
    // Captures: [1] namespace (ValeVision|NaModel), [2] category, [3] model type.
    // Storey:  Matches storey-based exports (e.g. Bagot__Storey__GroundFloor__ProposedWindows__MeshModel__.glb).
    // Captures: [1] storey name (GroundFloor), [2] element type (ProposedWindows), [3] model type.
    // Legacy:  Matches older __Layer-XX__BaseMeshModel__ / __LineworkModel__ patterns.
    // Captures: [1] model type indicator (BaseMeshModel|LineworkModel).
    // OrbitHelperCube: Matches OrbitHelperCube GLB files exported from SketchUp for orbit target positioning.
    // ------------------------------------------------------------
    const Na__ModelUrl__ParseRegex        = /(?:.*?__)?(ValeVision|NaModel|TrueVision)__(.+?)__(MeshModel|LineworkModel)__\.glb/i;
    const Na__ModelUrl__StoreyParseRegex  = /(?:.*?__)?Storey__([A-Za-z]+)__([A-Za-z]+)__(MeshModel|LineworkModel)__\.glb/i;  // <-- Storey-based export naming (TrueVision parity)
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

        const filename  = url.split('/').pop().split('?')[0];            // <-- Filename without any ?query (robust to cache-bust tokens)

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

        // STOREY REGEX | Storey-based exports (TrueVision parity — MUST run before legacy fallback)
        // Produces distinct category keys per storey element (e.g. Storey__GroundFloor__ProposedDoors)
        // so multi-storey GLB sets do not collapse into the single legacy bucket.
        const storeyMatch = Na__ModelUrl__StoreyParseRegex.exec(filename);
        if (storeyMatch) {
            const storeyName  = storeyMatch[1];                          // <-- e.g. GroundFloor
            const elementType = storeyMatch[2];                          // <-- e.g. ProposedWindows
            const modelType   = storeyMatch[3];                          // <-- MeshModel or LineworkModel

            const storeyCategory = `Storey__${storeyName}__${elementType}`;  // <-- Distinct per storey element

            return {
                url            : url,                                    // <-- Original full URL
                category       : storeyCategory,                         // <-- Storey-scoped category key
                modelType      : modelType,                              // <-- MeshModel or LineworkModel
                rawNamespace   : 'Storey'                                // <-- Flag as storey for logging
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

            const filename = url.split('/').pop().split('?')[0];  // <-- Strip ?v= cache-bust token before matching
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
    async function Na__ModelLoader__LoadOrbitHelperCube(orbitCubeUrl, loader, resilienceConfig) {
        if (!orbitCubeUrl || typeof orbitCubeUrl !== 'string') {
            return null;                                      // <-- Guard against invalid input
        }

        const gltfTimeoutMs = (resilienceConfig && resilienceConfig.LoadResilience__Config__GltfTimeoutMs)   || 45000;
        const retries       = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryCount)       || 2;
        const retryDelayMs  = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryBaseDelayMs) || 1000;

        try {
            const gltf = await Na__ResilientLoad__GltfLoadWithTimeout(loader, orbitCubeUrl, { timeoutMs: gltfTimeoutMs, retries, retryDelayMs }); // <-- Bounded load
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
    async function Na__ModelLoader__LoadSingleMesh(modelUrl, baseMeshConfig, loader, resilienceConfig) {
        const gltfTimeoutMs    = (resilienceConfig && resilienceConfig.LoadResilience__Config__GltfTimeoutMs)   || 45000;
        const retries          = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryCount)       || 2;
        const retryDelayMs     = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryBaseDelayMs) || 1000;
        const gltf             = await Na__ResilientLoad__GltfLoadWithTimeout(loader, modelUrl, { timeoutMs: gltfTimeoutMs, retries, retryDelayMs }); // <-- Bounded load
        const meshRoot     = gltf.scene;                                 // <-- Extract scene graph

        const indexedNameRegex = /^MAT\d{3}__/;                          // <-- Indexed materials that survive to the swap pass (TrueVision parity)
        const exemptNameRegex  = /^MAT000E__/;                           // <-- MAT000E__ "Material Exempt" one-off materials (never SSOT enriched)

        const Na__Material__WhiteMat = new THREE.MeshStandardMaterial({
            color               : baseMeshConfig.material.whiteColor,    // <-- White base color
            roughness           : baseMeshConfig.material.roughness,     // <-- Surface roughness
            metalness           : baseMeshConfig.material.metalness,     // <-- Metallic factor
            side                : THREE.DoubleSide,                      // <-- Render both faces
            polygonOffset       : true,                                  // <-- Enable polygon offset
            polygonOffsetFactor : baseMeshConfig.material.polygonOffsetFactor,
            polygonOffsetUnits  : baseMeshConfig.material.polygonOffsetUnits
        });

        let indexedMaterialsSeen = 0;                                    // <-- Diagnostics: indexed materials preserved
        let exemptGlazingSeen    = 0;                                    // <-- Diagnostics: transparent MAT000E__ materials preserved

        // SUB HELPER FUNCTION | Resolve Prepared Material for a Mesh Node
        // ------------------------------------------------------------
        // Indexed MAT###__ materials are PRESERVED (cloned + polygon offset only)
        // so the engine materials swap pass can match them by name (glass etc.).
        // Transparent MAT000E__ exempt materials are PRESERVED as glazing — the
        // GLB carries the SketchUp Opacity slider as alphaMode BLEND, and the
        // shared whitecard below is opaque, so collapsing them would block the
        // view out. Everything else keeps the exact pre-existing whitecard
        // treatment: textured -> emissive prep, untextured -> shared whitecard.
        // ------------------------------------------------------------
        const Na__ModelLoader__PrepareMeshMaterial = (sourceMaterial) => {
            if (!sourceMaterial || !sourceMaterial.isMaterial) {
                return Na__Material__WhiteMat;                           // <-- Missing material; apply shared whitecard
            }

            if (indexedNameRegex.test(sourceMaterial.name || '')) {
                indexedMaterialsSeen++;
                const preparedMaterial               = sourceMaterial.clone();  // <-- Preserve indexed material for swap pass
                preparedMaterial.side                = THREE.DoubleSide;
                preparedMaterial.polygonOffset       = true;
                preparedMaterial.polygonOffsetFactor = baseMeshConfig.material.polygonOffsetFactor;
                preparedMaterial.polygonOffsetUnits  = baseMeshConfig.material.polygonOffsetUnits;
                return preparedMaterial;
            }

            // EXEMPT GLAZING | MAT000E__ + SketchUp opacity < 100% -> see-through
            const sourceIsTransparent = sourceMaterial.transparent === true
                || (typeof sourceMaterial.opacity === 'number' && sourceMaterial.opacity < 1.0);

            if (sourceIsTransparent && exemptNameRegex.test(sourceMaterial.name || '')) {
                exemptGlazingSeen++;
                const preparedMaterial               = sourceMaterial.clone();  // <-- Preserve GLB alpha (SketchUp Opacity slider)
                preparedMaterial.side                = THREE.DoubleSide;
                preparedMaterial.polygonOffset       = true;
                preparedMaterial.polygonOffsetFactor = baseMeshConfig.material.polygonOffsetFactor;
                preparedMaterial.polygonOffsetUnits  = baseMeshConfig.material.polygonOffsetUnits;
                preparedMaterial.transparent         = true;             // <-- Blend even when only opacity < 1 survived the GLB
                preparedMaterial.depthWrite          = false;            // <-- Glazing must not occlude geometry behind it
                preparedMaterial.userData            = Object.assign({}, preparedMaterial.userData, { na_exemptGlazing: true });  // <-- Tag for the shadow-cast opt-out below

                if (preparedMaterial.map && !preparedMaterial.emissiveMap) {
                    preparedMaterial.emissiveMap       = preparedMaterial.map;  // <-- Textured glazing keeps the emissive prep path
                    preparedMaterial.emissive          = new THREE.Color(baseMeshConfig.material.textureEmissive);
                    preparedMaterial.emissiveIntensity = 0.0;
                }

                return preparedMaterial;
            }

            if (sourceMaterial.map || sourceMaterial.emissiveMap) {
                const preparedMaterial               = sourceMaterial.clone();  // <-- Textured: emissive whitecard treatment (unchanged)
                preparedMaterial.side                = THREE.DoubleSide;
                preparedMaterial.polygonOffset       = true;
                preparedMaterial.polygonOffsetFactor = baseMeshConfig.material.polygonOffsetFactor;
                preparedMaterial.polygonOffsetUnits  = baseMeshConfig.material.polygonOffsetUnits;
                preparedMaterial.emissive            = new THREE.Color(baseMeshConfig.material.textureEmissive);
                preparedMaterial.emissiveIntensity   = 0.0;

                if (preparedMaterial.map && !preparedMaterial.emissiveMap) {
                    preparedMaterial.emissiveMap = preparedMaterial.map; // <-- Use diffuse as emissive fallback
                }

                preparedMaterial.roughness = 1.0;                        // <-- Override roughness for textured
                preparedMaterial.metalness = 0.0;                        // <-- Override metalness for textured
                return preparedMaterial;
            }

            return Na__Material__WhiteMat;                               // <-- Untextured non-indexed: shared whitecard (unchanged)
        };
        // ------------------------------------------------------------

        meshRoot.traverse((node) => {
            if (!node.isMesh) return;                                    // <-- Skip non-mesh nodes

            node.castShadow    = true;                                   // <-- Enable shadow casting
            node.receiveShadow = true;                                   // <-- Enable shadow receiving

            if (Array.isArray(node.material)) {
                node.material = node.material.map((mat) => Na__ModelLoader__PrepareMeshMaterial(mat));  // <-- Multi-material meshes
            } else {
                node.material = Na__ModelLoader__PrepareMeshMaterial(node.material);
            }

            // EXEMPT GLAZING | Shadow maps ignore opacity, so glass would drop a
            // solid silhouette onto whatever sits behind it. Opt these meshes out.
            const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
            if (nodeMaterials.some((mat) => mat && mat.userData && mat.userData.na_exemptGlazing === true)) {
                node.castShadow = false;                                 // <-- Glazing lets light through
            }
        });

        if (indexedMaterialsSeen > 0 || exemptGlazingSeen > 0) {
            const modelNameForLog = (typeof modelUrl === 'string') ? modelUrl.split('/').pop() : 'UnknownModel.glb';
            console.log(`[ValeVision3D] Mesh material prep ${modelNameForLog}: preserved ${indexedMaterialsSeen} indexed material(s) for swap pass, ${exemptGlazingSeen} transparent MAT000E__ glazing material(s)`);
        }

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
    async function Na__ModelLoader__LoadSingleLinework(modelUrl, lineworkConfig, loader, lineResolution, resilienceConfig) {
        const gltfTimeoutMs = (resilienceConfig && resilienceConfig.LoadResilience__Config__GltfTimeoutMs)   || 45000;
        const retries       = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryCount)       || 2;
        const retryDelayMs  = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryBaseDelayMs) || 1000;
        const gltf          = await Na__ResilientLoad__GltfLoadWithTimeout(loader, modelUrl, { timeoutMs: gltfTimeoutMs, retries, retryDelayMs }); // <-- Bounded load
        const lineworkRoot = gltf.scene;                                 // <-- Extract scene graph
        return Na__ModelLoader__UpgradeLineworkRoot(lineworkRoot, lineworkConfig, lineResolution);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Multi-Model Orchestration
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispatch Red Error Toast for a Failed GLB Load
    // ------------------------------------------------------------
    function Na__ModelLoader__DispatchLoadErrorToast(assetLabel) {
        window.dispatchEvent(new CustomEvent('na-show-toast', {
            detail: { message: `Model file failed to load: ${assetLabel}. Check console for details.`, isError: true }
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Load All Models — Concurrency-Capped Parallel Categories
    // ------------------------------------------------------------
    // Main entry point. Accepts an array of CDN URLs, classifies them by
    // category and type, then loads all category pairs (Mesh + Linework)
    // in parallel with a concurrency cap from resilienceConfig. Within each
    // category, Mesh is loaded before Linework (Linework references Mesh for
    // profile-line colour application). Individual file failures are caught,
    // logged, and toasted — they do not abort sibling categories.
    // Returns a Map of category -> THREE.Group for future toggling support.
    //
    // resilienceConfig {object} - LoadResilience__Config block (timeouts, retries, cap).
    //   Expected key: LoadResilience__Config__GlbConcurrencyCap {number}
    // ------------------------------------------------------------
    async function Na__ModelLoader__LoadAllModels(modelUrls, modelGroupRoot, config, lineResolution, statusCallback, resilienceConfig) {
        const concurrencyCap  = (resilienceConfig && resilienceConfig.LoadResilience__Config__GlbConcurrencyCap) || 3; // <-- Max simultaneous category loads
        const loader          = new GLTFLoader();                         // <-- Shared GLB loader instance
        const categoryMap     = Na__ModelLoader__ClassifyUrls(modelUrls); // <-- Classify URLs by category
        const loadedGroups    = new Map();                                // <-- Ordered result Map (category -> Group)

        // LOG DISCOVERY SUMMARY
        const discoveredCategories = Object.keys(categoryMap);
        console.log(`[ValeVision3D] Discovered ${discoveredCategories.length} model categories (concurrency cap: ${concurrencyCap}):`);
        discoveredCategories.forEach((cat) => {
            const entry = categoryMap[cat];
            console.log(`  - ${cat}: Mesh=${entry.meshUrl ? 'YES' : 'NO'}, Linework=${entry.lineworkUrl ? 'YES' : 'NO'}`);
        });

        // BUILD ORDERED CATEGORY LIST (priority order first, then unordered)
        const orderedCategories = [
            ...Na__ModelCategories__LoadOrder.filter((cat) => !!categoryMap[cat]),       // <-- Priority categories in order
            ...Object.keys(categoryMap).filter((cat) => !Na__ModelCategories__LoadOrder.includes(cat)) // <-- Remaining (unordered)
        ];

        // SUB HELPER FUNCTION | Load a Single Category (Mesh then Linework, sequential within)
        // ---------------------------------------------------------------
        async function Na__ModelLoader__LoadCategory(category) {
            const entry           = categoryMap[category];
            const categoryGroup   = new THREE.Group();
            categoryGroup.name    = category;
            const shortName       = category.replace('ValeVision__', '').replace('Storey__', 'Storey.');

            // LOAD MESH
            if (entry.meshUrl) {
                if (statusCallback) statusCallback(`Loading ${shortName} Mesh...`);
                try {
                    const meshRoot = await Na__ModelLoader__LoadSingleMesh(entry.meshUrl, config.baseMesh, loader, resilienceConfig);
                    meshRoot.userData.Na__ModelType = 'mesh';             // <-- Tag for render passes & collision filters
                    categoryGroup.add(meshRoot);
                    console.log(`[ValeVision3D] Loaded Mesh: ${shortName}`);
                } catch (error) {
                    console.error(`[ValeVision3D] Failed to load Mesh for ${shortName}:`, error);
                    Na__ModelLoader__DispatchLoadErrorToast(`${shortName} (Mesh)`);
                }
            }

            // LOAD LINEWORK (after mesh; references mesh for profile colour application)
            if (entry.lineworkUrl) {
                if (statusCallback) statusCallback(`Loading ${shortName} Linework...`);
                try {
                    const lineworkRoot = await Na__ModelLoader__LoadSingleLinework(entry.lineworkUrl, config.RenderConfig__Linework, loader, lineResolution, resilienceConfig);
                    lineworkRoot.userData.Na__ModelType = 'linework';     // <-- Tag for render passes & collision filters
                    categoryGroup.add(lineworkRoot);
                    Na__ModelLoader__ApplyProfileLineColoursToMeshRoot(categoryGroup.children.find((child) => child !== lineworkRoot), lineworkRoot);
                    console.log(`[ValeVision3D] Loaded Linework: ${shortName}`);
                } catch (error) {
                    console.error(`[ValeVision3D] Failed to load Linework for ${shortName}:`, error);
                    Na__ModelLoader__DispatchLoadErrorToast(`${shortName} (Linework)`);
                }
            }

            return { category, categoryGroup };                           // <-- Return for ordered map insertion
        }
        // ---------------------------------------------------------------

        // RUN CATEGORIES VIA CONCURRENCY-CAPPED POOL
        const taskFactories = orderedCategories.map((cat) => () => Na__ModelLoader__LoadCategory(cat)); // <-- Zero-arg factories
        const results       = await Na__ResilientLoad__RunWithConcurrencyCap(taskFactories, concurrencyCap);

        // COLLECT RESULTS INTO ORDERED MAP (preserves priority order)
        for (const result of results) {
            if (!result || result instanceof Error) continue;             // <-- Skip pool-level failures (task errors are already caught inside)
            const { category, categoryGroup } = result;
            modelGroupRoot.add(categoryGroup);                            // <-- Add to scene
            loadedGroups.set(category, categoryGroup);                    // <-- Store for toggling
        }

        console.log(`[ValeVision3D] Multi-model loading complete. ${loadedGroups.size} categories loaded.`);
        return loadedGroups;
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
