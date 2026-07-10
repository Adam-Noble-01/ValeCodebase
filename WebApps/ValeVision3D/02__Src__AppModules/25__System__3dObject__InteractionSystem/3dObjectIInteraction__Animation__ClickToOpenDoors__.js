// =============================================================================
// VALEVISION3D - CLICK TO OPEN DOORS ANIMATION
// =============================================================================
//
// FILE       : 3dObjectIInteraction__Animation__ClickToOpenDoors__.js
// NAMESPACE  : ValeVision3D
// MODULE     : 3D Object Interactions - Door Animation (Click to Open/Close)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Animate doors open/closed on click via scene graph naming convention
// CREATED    : 14-Feb-2026
//
// DESCRIPTION:
// - Scans the loaded GLB scene graph for door assemblies (ADR prefix).
// - Classifies MOD children as ROT_ONLY, ROT_MVE, MVE_ONLY, or FIXED.
// - Builds one panel descriptor per MOD and pairs rotating MODs to ROT siblings.
// - Parses signed degrees and signed MVE axis/magnitude values from node names.
// - Registers pointer event handlers for click detection (with orbit drag filtering).
// - Animates legacy products in lockstep while explicitly configured exterior
//   double-door ADRs support independent per-panel click and proximity motion.
// - Supports mirrored instances, interior rotation inversion, bifold timing,
//   mid-animation reversal, and model-group rebinding.
// - Dual model support: animates both mesh and linework models simultaneously.
//
// NAMING CONVENTION (Scene Graph):
// - ADR = Door Assembly (e.g. ADR002__InteriorDoor or ADR007__BifoldDoor)
// - MOD patterns:
//     * MOD###__ROT__<deg>-Deg__<tag>                              -> ROT_ONLY
//     * MOD###__ROT__<deg>-Deg__MVE__<axis><signed-mm>-mm__<tag>  -> ROT_MVE
//     * MOD###__MVE__<axis><signed-mm>-mm__<tag>                  -> MVE_ONLY
//     * MOD###__FIXED__<tag>                                      -> FIXED
// - ROT = Rotation/Hinge Point marker paired to rotating MODs by sibling index.
// - MVE = Informational movement marker; canonical movement comes from MOD name.
//
// INTEGRATION:
// - Requires door models exported with hierarchy preservation from SketchUp
//   GLB Builder Utility (v1.5.0+) with door handler module.
// - Expects glTF nodes in Y-up coordinate space with conjugated transforms.
// - Call Na__DoorAnimation__Initialize() after GLB models are loaded.
// - Call Na__DoorAnimation__Update(deltaMs) every frame in render loop.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jul-2026 - Version 1.7.0
// - Backported the complete multi-panel engine from the current TrueVision
//   reference while retaining ValeVision imports, bootstrap, and thresholds.
// - Added config-gated independent ExteriorDoubleDoor leaves for click and
//   nearest-leaf Walk/Fly proximity, including per-panel reversal state.
// - Added model-group rebinding for the prototype sandbox refresh flow.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Three.js Core Imports
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------


    // MODULE IMPORTS | Math / Unit Conversion (mm -> Three.js units)
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Naming Convention Prefixes
    // ------------------------------------------------------------
    const Na__DoorAnim__PREFIX_ADR             = 'ADR';                          // <-- Door assembly prefix
    const Na__DoorAnim__PREFIX_MOD             = 'MOD';                          // <-- Modifier object prefix
    const Na__DoorAnim__PREFIX_ROT             = 'ROT';                          // <-- Rotation point prefix
    const Na__DoorAnim__MOD_ROT_TAG            = '__ROT__';                      // <-- Rotation modifier tag in MOD name
    const Na__DoorAnim__MOD_MVE_TAG            = '__MVE__';                      // <-- Translation modifier tag in MOD name
    const Na__DoorAnim__MOD_FIXED_TAG          = '__FIXED__';                    // <-- Fixed modifier tag in MOD name
    const Na__DoorAnim__DEG_REGEX              = /(-?\d+)-Deg/i;                 // <-- Signed rotation degrees
    const Na__DoorAnim__MVE_REGEX              = /__MVE__([XYZ])([+\-]\d+)-mm/i; // <-- Signed axis movement
    const Na__DoorAnim__Y_AXIS                 = new THREE.Vector3(0, 1, 0);     // <-- Vertical rotation axis (Y-up from GLB Builder export)
    const Na__DoorAnim__X_AXIS                 = new THREE.Vector3(1, 0, 0);     // <-- Local X translation axis
    const Na__DoorAnim__Z_AXIS                 = new THREE.Vector3(0, 0, 1);     // <-- Local Z translation axis
    // ------------------------------------------------------------


    // MODULE CONSTANTS | MOD Animation Types
    // ------------------------------------------------------------
    const Na__DoorAnim__MOD_TYPE_ROT_ONLY      = 'ROT_ONLY';
    const Na__DoorAnim__MOD_TYPE_ROT_MVE       = 'ROT_MVE';
    const Na__DoorAnim__MOD_TYPE_MVE_ONLY      = 'MVE_ONLY';
    const Na__DoorAnim__MOD_TYPE_FIXED         = 'FIXED';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Door State Enum
    // ------------------------------------------------------------
    const Na__DoorAnim__STATE_CLOSED           = 'CLOSED';                       // <-- Door is fully closed
    const Na__DoorAnim__STATE_OPENING          = 'OPENING';                      // <-- Door is animating open
    const Na__DoorAnim__STATE_OPEN             = 'OPEN';                         // <-- Door is fully open
    const Na__DoorAnim__STATE_CLOSING          = 'CLOSING';                      // <-- Door is animating closed
    // ------------------------------------------------------------


    // MODULE VARIABLES | Configuration Defaults (overridden by config)
    // ------------------------------------------------------------
    let Na__DoorAnim__Config__AnimationDurationMs       = 600;                   // <-- Base animation duration
    let Na__DoorAnim__Config__BifoldDurationMultiplier  = 3.0;                   // <-- Bifold-only duration scaler
    let Na__DoorAnim__Config__DefaultRotationDeg        = 90;                    // <-- Default rotation if parse fails
    let Na__DoorAnim__Config__ClickThresholdPx          = 4;                     // <-- Max pointer movement for click
    let Na__DoorAnim__Config__MultiPanelEnabled         = true;                  // <-- Multi-panel kill-switch
    let Na__DoorAnim__Config__InteriorRotationInverted  = true;                  // <-- Legacy interior sign adapter
    let Na__DoorAnim__Config__IndependentPanelsEnabled  = true;                  // <-- Independent-panel kill-switch
    let Na__DoorAnim__Config__IndependentPanelAdrNameTokens = ['ExteriorDoubleDoor'];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Product Tokens and Coupling Modes
    // ------------------------------------------------------------
    const Na__DoorAnim__INTERIOR_DOOR_NAME_TOKEN = 'InteriorDoor';
    const Na__DoorAnim__BIFOLD_DOOR_NAME_TOKEN   = 'BifoldDoor';
    const Na__DoorAnim__SLIDING_DOOR_NAME_TOKEN  = 'SlidingDoor';
    const Na__DoorAnim__COUPLING_LOCKSTEP        = 'LOCKSTEP';
    const Na__DoorAnim__COUPLING_INDEPENDENT     = 'INDEPENDENT';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Core References
    // ------------------------------------------------------------
    let Na__DoorAnim__Scene               = null;                                // <-- Three.js scene reference
    let Na__DoorAnim__Camera              = null;                                // <-- Three.js camera reference
    let Na__DoorAnim__RendererDomElement  = null;                                // <-- Renderer canvas DOM element
    let Na__DoorAnim__ModelGroupsMesh     = [];                                  // <-- Array of mesh model groups (solid geometry)
    let Na__DoorAnim__ModelGroupsLinework = [];                                  // <-- Array of linework model groups (edges)
    let Na__DoorAnim__Initialized         = false;                               // <-- Module initialization flag
    // ------------------------------------------------------------


    // MODULE VARIABLES | Raycaster and Pointer State
    // ------------------------------------------------------------
    const Na__DoorAnim__Raycaster        = new THREE.Raycaster();                // <-- Reusable raycaster
    const Na__DoorAnim__PointerNDC       = new THREE.Vector2();                  // <-- Normalized device coordinates
    let Na__DoorAnim__PointerDownX       = 0;                                    // <-- Pointer X at pointerdown
    let Na__DoorAnim__PointerDownY       = 0;                                    // <-- Pointer Y at pointerdown
    let Na__DoorAnim__PointerIsDown      = false;                                // <-- Pointer currently pressed
    // ------------------------------------------------------------


    // MODULE VARIABLES | Door Registry
    // ------------------------------------------------------------
    const Na__DoorAnim__DoorRegistry     = new Map();                            // <-- Map<adrName, doorRecord>
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Graph Scanning and Name Parsing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Rotation Degrees from MOD Object Name
    // ------------------------------------------------------------
    // Supports signed values: 'MOD001__ROT__110-Deg__DoorPanel' opens +110deg,
    // 'MOD001__ROT__-110-Deg__DoorPanel' opens -110deg (the opposite way).
    // The pivot rotation applies the angle directly via setFromAxisAngle, so a
    // negative value naturally reverses the swing direction.
    // ------------------------------------------------------------
    function Na__DoorAnim__ParseDegreesFromName(modName) {
        const match = Na__DoorAnim__DEG_REGEX.exec(modName);                     // <-- Match signed XX-Deg pattern

        if (match && match[1]) {
            const degrees = parseInt(match[1], 10);                              // <-- Parse signed integer degrees
            if (Number.isFinite(degrees) && degrees !== 0) {
                return degrees;                                                  // <-- Return parsed value (negative = reversed swing)
            }
        }

        console.warn(`[DoorAnimation] Could not parse degrees from MOD name: "${modName}", using default ${Na__DoorAnim__Config__DefaultRotationDeg}`);
        return Na__DoorAnim__Config__DefaultRotationDeg;                         // <-- Fallback to config default
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check if Object Name Starts with Prefix
    // ------------------------------------------------------------
    function Na__DoorAnim__NameStartsWith(object, prefix) {
        return object.name && object.name.startsWith(prefix);                    // <-- Simple prefix check
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find Child Object by Name Prefix
    // ------------------------------------------------------------
    function Na__DoorAnim__FindChildByPrefix(parentObject, prefix) {
        for (const child of parentObject.children) {
            if (Na__DoorAnim__NameStartsWith(child, prefix)) {
                return child;                                                    // <-- Return first match
            }
        }
        return null;                                                             // <-- No match found
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Readable Scene Path for Diagnostics
    // ------------------------------------------------------------
    function Na__DoorAnim__BuildDiagnosticPath(object, stopRoot) {
        const pathParts = [];
        let current = object;

        while (current) {
            pathParts.unshift(current.name || current.type || '[unnamed]');
            if (current === stopRoot) break;
            current = current.parent;
        }

        return pathParts.join(' > ');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | List Direct Child Names for Diagnostics
    // ------------------------------------------------------------
    function Na__DoorAnim__ListDirectChildNames(object) {
        if (!object || !Array.isArray(object.children)) return '(no children)';
        return object.children
            .map((child) => child.name || child.type || '[unnamed]')
            .join(', ');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Classify a MOD Object by its Name
    // ------------------------------------------------------------
    function Na__DoorAnim__ClassifyMod(modName) {
        if (!modName) return null;

        const hasRot   = modName.indexOf(Na__DoorAnim__MOD_ROT_TAG) !== -1;
        const hasMve   = modName.indexOf(Na__DoorAnim__MOD_MVE_TAG) !== -1;
        const hasFixed = modName.indexOf(Na__DoorAnim__MOD_FIXED_TAG) !== -1;

        if (hasRot && hasMve) return Na__DoorAnim__MOD_TYPE_ROT_MVE;
        if (hasRot) return Na__DoorAnim__MOD_TYPE_ROT_ONLY;
        if (hasMve) return Na__DoorAnim__MOD_TYPE_MVE_ONLY;
        if (hasFixed) return Na__DoorAnim__MOD_TYPE_FIXED;
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse MVE Axis and Signed Magnitude
    // ------------------------------------------------------------
    function Na__DoorAnim__ParseMveFromName(modName) {
        const match = Na__DoorAnim__MVE_REGEX.exec(modName);
        if (!match) return null;

        const axis = match[1].toUpperCase();
        const signedMm = parseInt(match[2], 10);
        if (!Number.isFinite(signedMm)) return null;
        return { axis: axis, signedMm: signedMm };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve SketchUp Axis Letter to Three.js Local Axis
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveAxisVector(axisLetter) {
        switch (axisLetter) {
            case 'X': return Na__DoorAnim__X_AXIS;
            case 'Y': return Na__DoorAnim__Y_AXIS;
            case 'Z': return Na__DoorAnim__Z_AXIS;
            default:
                console.warn(`[DoorAnimation] Unknown axis letter "${axisLetter}", defaulting to X`);
                return Na__DoorAnim__X_AXIS;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find All Animatable MOD Children
    // ------------------------------------------------------------
    function Na__DoorAnim__FindAllAnimatableMods(adrObject) {
        const descriptors = [];

        for (const child of adrObject.children) {
            if (!Na__DoorAnim__NameStartsWith(child, Na__DoorAnim__PREFIX_MOD)) continue;
            const type = Na__DoorAnim__ClassifyMod(child.name);
            if (type) descriptors.push({ mod: child, type: type });
        }

        if (Na__DoorAnim__Config__MultiPanelEnabled !== true) {
            const firstRotOnly = descriptors.find((descriptor) =>
                descriptor.type === Na__DoorAnim__MOD_TYPE_ROT_ONLY
            );
            return firstRotOnly ? [firstRotOnly] : [];
        }

        return descriptors;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detect Bifold Structure
    // ------------------------------------------------------------
    function Na__DoorAnim__IsBifoldDoor(panels) {
        return Array.isArray(panels)
            && panels.some((panel) => panel.type === Na__DoorAnim__MOD_TYPE_ROT_MVE);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check ADR Name for a Configured Token
    // ------------------------------------------------------------
    function Na__DoorAnim__AdrNameContainsToken(adrName, tokens) {
        if (typeof adrName !== 'string' || !Array.isArray(tokens)) return false;
        return tokens.some((token) =>
            typeof token === 'string' && token.length > 0 && adrName.indexOf(token) !== -1
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Door Panel Coupling Mode
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveCouplingMode(adrName, panels) {
        const hasIndependentToken = Na__DoorAnim__AdrNameContainsToken(
            adrName,
            Na__DoorAnim__Config__IndependentPanelAdrNameTokens
        );

        if (Na__DoorAnim__Config__IndependentPanelsEnabled === true && hasIndependentToken) {
            return Na__DoorAnim__COUPLING_INDEPENDENT;
        }
        if (Na__DoorAnim__IsBifoldDoor(panels)) return Na__DoorAnim__COUPLING_LOCKSTEP;
        if (Na__DoorAnim__AdrNameContainsToken(adrName, [Na__DoorAnim__INTERIOR_DOOR_NAME_TOKEN])) {
            return Na__DoorAnim__COUPLING_LOCKSTEP;
        }
        if (Na__DoorAnim__AdrNameContainsToken(adrName, [Na__DoorAnim__BIFOLD_DOOR_NAME_TOKEN])) {
            return Na__DoorAnim__COUPLING_LOCKSTEP;
        }
        if (Na__DoorAnim__AdrNameContainsToken(adrName, [Na__DoorAnim__SLIDING_DOOR_NAME_TOKEN])) {
            return Na__DoorAnim__COUPLING_LOCKSTEP;
        }
        return Na__DoorAnim__COUPLING_LOCKSTEP;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Effective Door Duration
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveEffectiveDurationMs(panels) {
        if (!Na__DoorAnim__IsBifoldDoor(panels)) {
            return Na__DoorAnim__Config__AnimationDurationMs;
        }

        const multiplier = Number.isFinite(Na__DoorAnim__Config__BifoldDurationMultiplier)
            && Na__DoorAnim__Config__BifoldDurationMultiplier > 0
            ? Na__DoorAnim__Config__BifoldDurationMultiplier
            : 1.0;
        return Math.round(Na__DoorAnim__Config__AnimationDurationMs * multiplier);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Mirrored Instance Rotation Sign
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveMirrorSign(adrObject) {
        if (!adrObject) return 1;
        adrObject.updateWorldMatrix(true, false);
        return adrObject.matrixWorld.determinant() < 0 ? -1 : 1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Interior-Door Rotation Inversion
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveInteriorInversionSign(adrObject) {
        if (Na__DoorAnim__Config__InteriorRotationInverted !== true) return 1;
        if (!adrObject || !adrObject.name) return 1;
        return adrObject.name.indexOf(Na__DoorAnim__INTERIOR_DOOR_NAME_TOKEN) !== -1 ? -1 : 1;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Find Matching ROT Sibling for a Rotating MOD
    // ------------------------------------------------------------
    function Na__DoorAnim__FindMatchingRotSibling(adrObject, modObject) {
        const allRotSiblings = [];
        const rotatingModSiblings = [];

        for (const child of adrObject.children) {
            if (Na__DoorAnim__NameStartsWith(child, Na__DoorAnim__PREFIX_ROT)) {
                allRotSiblings.push(child);
                continue;
            }
            if (!Na__DoorAnim__NameStartsWith(child, Na__DoorAnim__PREFIX_MOD)) continue;

            const type = Na__DoorAnim__ClassifyMod(child.name);
            if (type === Na__DoorAnim__MOD_TYPE_ROT_ONLY || type === Na__DoorAnim__MOD_TYPE_ROT_MVE) {
                rotatingModSiblings.push(child);
            }
        }

        const modIndex = rotatingModSiblings.indexOf(modObject);
        if (modIndex === -1) return null;
        if (modIndex < allRotSiblings.length) return allRotSiblings[modIndex];
        return allRotSiblings.length > 0 ? allRotSiblings[0] : null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Panel Descriptor
    // ------------------------------------------------------------
    function Na__DoorAnim__BuildPanelDescriptor(adrObject, descriptor) {
        const modObject = descriptor.mod;
        const type = descriptor.type;
        const panel = {
            type               : type,
            modObjectMesh      : modObject,
            modObjectLinework  : null,
            rotObjectMesh      : null,
            rotObjectLinework  : null,
            initialPosition    : modObject.position.clone(),
            initialQuaternion  : modObject.quaternion.clone(),
            targetAngleRad     : 0,
            pivotLocalPosition : null,
            rotationSign       : 1,
            mveAxisVector      : null,
            mveDistanceUnits   : 0,
            state              : Na__DoorAnim__STATE_CLOSED,
            currentProgress    : 0,
            animStartProgress  : 0,
            animEndProgress    : 0,
            animElapsedMs      : 0,
            animDurationMs     : Na__DoorAnim__Config__AnimationDurationMs,
            proximityIsNear    : false
        };

        if (type === Na__DoorAnim__MOD_TYPE_ROT_ONLY || type === Na__DoorAnim__MOD_TYPE_ROT_MVE) {
            panel.targetAngleRad = THREE.MathUtils.degToRad(
                Na__DoorAnim__ParseDegreesFromName(modObject.name)
            );
            panel.rotationSign = Na__DoorAnim__ResolveMirrorSign(adrObject)
                * Na__DoorAnim__ResolveInteriorInversionSign(adrObject);

            const rotSibling = Na__DoorAnim__FindMatchingRotSibling(adrObject, modObject);
            if (rotSibling) {
                panel.rotObjectMesh = rotSibling;
                panel.pivotLocalPosition = rotSibling.position.clone();
            } else {
                console.warn(`[DoorAnimation] No ROT sibling found for MOD "${modObject.name}" - falling back to MOD origin`);
                panel.pivotLocalPosition = new THREE.Vector3(0, 0, 0);
            }
        }

        if (type === Na__DoorAnim__MOD_TYPE_ROT_MVE || type === Na__DoorAnim__MOD_TYPE_MVE_ONLY) {
            const mve = Na__DoorAnim__ParseMveFromName(modObject.name);
            if (mve) {
                panel.mveAxisVector = Na__DoorAnim__ResolveAxisVector(mve.axis);
                panel.mveDistanceUnits = Na__Math__ConvertMmToUnits(mve.signedMm);
            } else {
                console.warn(`[DoorAnimation] Could not parse MVE from MOD name "${modObject.name}"`);
            }
        }

        return panel;
    }
    // ------------------------------------------------------------


    // FUNCTION | Scan Scene Graph and Build Door Registry
    // ------------------------------------------------------------
    function Na__DoorAnimation__ScanForDoors() {
        Na__DoorAnim__DoorRegistry.clear();

        if (Na__DoorAnim__ModelGroupsMesh.length === 0 && Na__DoorAnim__ModelGroupsLinework.length === 0) {
            console.warn('[DoorAnimation] No model groups set, cannot scan for doors');
            return;
        }

        for (const meshGroup of Na__DoorAnim__ModelGroupsMesh) {
            if (!meshGroup || typeof meshGroup.traverse !== 'function') continue;

            meshGroup.traverse((object) => {
                if (!Na__DoorAnim__NameStartsWith(object, Na__DoorAnim__PREFIX_ADR)) return;

                const adrName = object.name;
                const modDescriptors = Na__DoorAnim__FindAllAnimatableMods(object);
                if (modDescriptors.length === 0) {
                    const diagnosticPath = Na__DoorAnim__BuildDiagnosticPath(object, meshGroup);
                    const childNames = Na__DoorAnim__ListDirectChildNames(object);
                    console.warn(`[DoorAnimation] ADR "${adrName}" (mesh) has no animatable MOD children, skipping. Path="${diagnosticPath}". Direct children=[${childNames}]`);
                    return;
                }

                const panels = modDescriptors.map((descriptor) =>
                    Na__DoorAnim__BuildPanelDescriptor(object, descriptor)
                );
                const firstRotObject = Na__DoorAnim__FindChildByPrefix(object, Na__DoorAnim__PREFIX_ROT);
                const primaryRotPanel = panels.find((panel) =>
                    panel.type === Na__DoorAnim__MOD_TYPE_ROT_ONLY
                    || panel.type === Na__DoorAnim__MOD_TYPE_ROT_MVE
                );
                const targetAngleRad = primaryRotPanel ? primaryRotPanel.targetAngleRad : 0;
                const isBifold = Na__DoorAnim__IsBifoldDoor(panels);
                const effectiveDurationMs = Na__DoorAnim__ResolveEffectiveDurationMs(panels);
                const couplingMode = Na__DoorAnim__ResolveCouplingMode(adrName, panels);
                const isIndependentPanels = couplingMode === Na__DoorAnim__COUPLING_INDEPENDENT;

                panels.forEach((panel) => {
                    panel.animDurationMs = effectiveDurationMs;
                });
                const primaryPanel = primaryRotPanel || panels[0];

                // Build door record
                const doorRecord = {
                    adrObjectMesh      : object,
                    adrObjectLinework  : null,
                    adrName            : adrName,
                    panels             : panels,
                    rotObjectMesh      : firstRotObject,
                    rotObjectLinework  : null,
                    isBifold           : isBifold,
                    effectiveDurationMs: effectiveDurationMs,
                    couplingMode       : couplingMode,
                    isIndependentPanels: isIndependentPanels,
                    legacyPrimaryPanel : primaryPanel,
                    modObjectMesh      : primaryPanel.modObjectMesh,
                    modObjectLinework  : null,
                    targetAngleRad     : targetAngleRad,
                    initialPosition    : primaryPanel.initialPosition.clone(),
                    initialQuaternion  : primaryPanel.initialQuaternion.clone(),
                    pivotLocalPosition : primaryRotPanel
                        ? primaryRotPanel.pivotLocalPosition.clone()
                        : new THREE.Vector3(0, 0, 0),
                    state              : Na__DoorAnim__STATE_CLOSED,
                    currentProgress    : 0,
                    animStartProgress  : 0,
                    animEndProgress    : 0,
                    currentAngleRad    : 0,
                    animStartAngleRad  : 0,
                    animEndAngleRad    : 0,
                    animElapsedMs      : 0,
                    animDurationMs     : effectiveDurationMs
                };

                Na__DoorAnim__DoorRegistry.set(adrName, doorRecord);

                const summary = panels.map((panel) => panel.type).join('+');
                const durationTag = isBifold
                    ? `BIFOLD ${effectiveDurationMs}ms`
                    : `${effectiveDurationMs}ms`;
                console.log(`[DoorAnimation] Registered door (mesh): "${adrName}" panels=[${summary}] coupling=${couplingMode} primary=${THREE.MathUtils.radToDeg(targetAngleRad).toFixed(0)}deg duration=${durationTag}`);
            });
        }

        for (const lineworkGroup of Na__DoorAnim__ModelGroupsLinework) {
            if (!lineworkGroup || typeof lineworkGroup.traverse !== 'function') continue;

            lineworkGroup.traverse((object) => {
                if (!Na__DoorAnim__NameStartsWith(object, Na__DoorAnim__PREFIX_ADR)) return;

                const adrName = object.name;
                const doorRecord = Na__DoorAnim__DoorRegistry.get(adrName);
                if (!doorRecord) {
                    console.warn(`[DoorAnimation] Linework door "${adrName}" has no mesh counterpart, skipping`);
                    return;
                }

                const lineworkDescriptors = Na__DoorAnim__FindAllAnimatableMods(object);
                lineworkDescriptors.forEach((descriptor) => {
                    const matchingPanel = doorRecord.panels.find((panel) =>
                        panel.modObjectMesh.name === descriptor.mod.name
                    );
                    if (!matchingPanel) return;

                    matchingPanel.modObjectLinework = descriptor.mod;
                    matchingPanel.rotObjectLinework = Na__DoorAnim__FindMatchingRotSibling(
                        object,
                        descriptor.mod
                    );
                });

                doorRecord.adrObjectLinework = object;
                doorRecord.rotObjectLinework = Na__DoorAnim__FindChildByPrefix(
                    object,
                    Na__DoorAnim__PREFIX_ROT
                );
                doorRecord.modObjectLinework = doorRecord.legacyPrimaryPanel
                    ? doorRecord.legacyPrimaryPanel.modObjectLinework
                    : null;

                console.log(`[DoorAnimation] Linked linework for door: "${adrName}" (${lineworkDescriptors.length} panel(s))`);
            });
        }

        console.log(`[DoorAnimation] Scan complete. ${Na__DoorAnim__DoorRegistry.size} door(s) found.`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Raycaster Click Detection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Walk Up Scene Graph to Find ADR Ancestor
    // ------------------------------------------------------------
    function Na__DoorAnim__FindAdrAncestor(object) {
        let current = object;                                                    // <-- Start from clicked mesh

        while (current) {
            if (Na__DoorAnim__NameStartsWith(current, Na__DoorAnim__PREFIX_ADR)) {
                return current;                                                  // <-- Found ADR ancestor
            }
            current = current.parent;                                            // <-- Walk up the tree
        }

        return null;                                                             // <-- No ADR ancestor found
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Walk Up Scene Graph to Find Nearest MOD Ancestor
    // ------------------------------------------------------------
    function Na__DoorAnim__FindNearestModAncestor(object) {
        let current = object;

        while (current) {
            if (Na__DoorAnim__NameStartsWith(current, Na__DoorAnim__PREFIX_MOD)) {
                return current;
            }
            if (Na__DoorAnim__NameStartsWith(current, Na__DoorAnim__PREFIX_ADR)) {
                return null;
            }
            current = current.parent;
        }

        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Raycast Hit to a Panel Descriptor
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveHitPanel(doorRecord, hitObject) {
        if (!doorRecord || !Array.isArray(doorRecord.panels)) return null;

        const modAncestor = Na__DoorAnim__FindNearestModAncestor(hitObject);
        if (!modAncestor) return null;

        return doorRecord.panels.find((panel) =>
            panel.modObjectMesh === modAncestor
            || panel.modObjectLinework === modAncestor
            || (panel.modObjectMesh && panel.modObjectMesh.name === modAncestor.name)
            || (panel.modObjectLinework && panel.modObjectLinework.name === modAncestor.name)
        ) || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Collect All Meshes from Both Mesh and Linework Door Models
    // ------------------------------------------------------------
    function Na__DoorAnim__CollectDoorMeshes() {
        const meshes = [];                                                       // <-- Array of intersectable meshes

        Na__DoorAnim__DoorRegistry.forEach((doorRecord) => {
            for (const panel of doorRecord.panels) {
                if (panel.modObjectMesh) {
                    panel.modObjectMesh.traverse((child) => {
                        if (child.isMesh) meshes.push(child);
                    });
                }
                if (panel.modObjectLinework) {
                    panel.modObjectLinework.traverse((child) => {
                        if (child.isMesh) meshes.push(child);
                    });
                }
            }
        });

        return meshes;                                                           // <-- Return all door meshes
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Pointer Down Event
    // ------------------------------------------------------------
    function Na__DoorAnim__OnPointerDown(event) {
        Na__DoorAnim__PointerDownX = event.clientX;                              // <-- Record pointer X
        Na__DoorAnim__PointerDownY = event.clientY;                              // <-- Record pointer Y
        Na__DoorAnim__PointerIsDown = true;                                      // <-- Mark pointer as pressed
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Pointer Up Event (Click Detection)
    // ------------------------------------------------------------
    function Na__DoorAnim__OnPointerUp(event) {
        if (!Na__DoorAnim__PointerIsDown) return;                                // <-- Ignore if no prior pointerdown
        Na__DoorAnim__PointerIsDown = false;                                     // <-- Reset pointer state

        // Check pointer movement to distinguish click from orbit drag
        const deltaX = Math.abs(event.clientX - Na__DoorAnim__PointerDownX);    // <-- Horizontal movement
        const deltaY = Math.abs(event.clientY - Na__DoorAnim__PointerDownY);    // <-- Vertical movement

        if (deltaX > Na__DoorAnim__Config__ClickThresholdPx ||
            deltaY > Na__DoorAnim__Config__ClickThresholdPx) {
            return;                                                              // <-- Too much movement, not a click
        }

        // Calculate NDC from pointer position
        const rect = Na__DoorAnim__RendererDomElement.getBoundingClientRect();   // <-- Canvas bounds
        Na__DoorAnim__PointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;   // <-- NDC X [-1, 1]
        Na__DoorAnim__PointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;  // <-- NDC Y [-1, 1]

        // Perform raycast against door meshes
        Na__DoorAnim__Raycaster.setFromCamera(Na__DoorAnim__PointerNDC, Na__DoorAnim__Camera);

        const doorMeshes = Na__DoorAnim__CollectDoorMeshes();                    // <-- Get all door meshes
        if (doorMeshes.length === 0) return;                                     // <-- No doors to check

        const intersections = Na__DoorAnim__Raycaster.intersectObjects(doorMeshes, false);

        if (intersections.length === 0) return;                                  // <-- No intersection

        // Walk up from the hit mesh to find the ADR ancestor
        const hitObject = intersections[0].object;                               // <-- First intersection
        const adrObject = Na__DoorAnim__FindAdrAncestor(hitObject);

        if (!adrObject) return;                                                  // <-- Not part of a registered door

        // Look up door record and toggle
        const doorRecord = Na__DoorAnim__DoorRegistry.get(adrObject.name);
        if (!doorRecord) return;                                                 // <-- Not in registry

        if (doorRecord.isIndependentPanels === true) {
            const hitPanel = Na__DoorAnim__ResolveHitPanel(doorRecord, hitObject);
            if (hitPanel) {
                Na__DoorAnim__TogglePanel(doorRecord, hitPanel);
                return;
            }
        }

        Na__DoorAnim__ToggleDoor(doorRecord);                                    // <-- Lockstep fallback
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Animation Engine
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ease In-Out Cubic
    // ------------------------------------------------------------
    function Na__DoorAnim__EaseInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t                                                     // <-- Ease in (accelerate)
            : 1 - Math.pow(-2 * t + 2, 3) / 2;                                 // <-- Ease out (decelerate)
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check Whether an Animation State Is Active
    // ------------------------------------------------------------
    function Na__DoorAnim__IsAnimatingState(state) {
        return state === Na__DoorAnim__STATE_OPENING || state === Na__DoorAnim__STATE_CLOSING;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Opposite Target Progress
    // ------------------------------------------------------------
    function Na__DoorAnim__ResolveToggleEndProgress(animationTarget) {
        if (animationTarget.state === Na__DoorAnim__STATE_CLOSED) return 1;
        if (animationTarget.state === Na__DoorAnim__STATE_OPEN) return 0;
        if (animationTarget.state === Na__DoorAnim__STATE_OPENING) return 0;
        if (animationTarget.state === Na__DoorAnim__STATE_CLOSING) return 1;
        return animationTarget.currentProgress >= 0.5 ? 0 : 1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Start or Reverse One Animation Target
    // ------------------------------------------------------------
    function Na__DoorAnim__AnimateTargetToProgress(animationTarget, endProgress, baseDurationMs) {
        const startProgress = Number.isFinite(animationTarget.currentProgress)
            ? animationTarget.currentProgress
            : 0;
        const remainingTravel = Math.abs(endProgress - startProgress);

        animationTarget.animStartProgress = startProgress;
        animationTarget.animEndProgress = endProgress;
        animationTarget.animElapsedMs = 0;
        animationTarget.animDurationMs = baseDurationMs * remainingTravel;
        animationTarget.state = endProgress === 1
            ? Na__DoorAnim__STATE_OPENING
            : Na__DoorAnim__STATE_CLOSING;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle One Animation Target
    // ------------------------------------------------------------
    function Na__DoorAnim__ToggleAnimationTarget(animationTarget, baseDurationMs) {
        const endProgress = Na__DoorAnim__ResolveToggleEndProgress(animationTarget);
        Na__DoorAnim__AnimateTargetToProgress(animationTarget, endProgress, baseDurationMs);
        return endProgress;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Synchronize ADR-Level Compatibility State
    // ------------------------------------------------------------
    function Na__DoorAnim__SyncLegacyDoorState(doorRecord) {
        if (!doorRecord || doorRecord.isIndependentPanels !== true) return;

        const primaryPanel = doorRecord.legacyPrimaryPanel || doorRecord.panels[0];
        if (!primaryPanel) return;

        doorRecord.state = primaryPanel.state;
        doorRecord.currentProgress = primaryPanel.currentProgress;
        doorRecord.animStartProgress = primaryPanel.animStartProgress;
        doorRecord.animEndProgress = primaryPanel.animEndProgress;
        doorRecord.animElapsedMs = primaryPanel.animElapsedMs;
        doorRecord.animDurationMs = primaryPanel.animDurationMs;
        doorRecord.currentAngleRad = doorRecord.targetAngleRad * primaryPanel.currentProgress;
        doorRecord.animStartAngleRad = doorRecord.targetAngleRad * primaryPanel.animStartProgress;
        doorRecord.animEndAngleRad = doorRecord.targetAngleRad * primaryPanel.animEndProgress;
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Door Open or Closed
    // ------------------------------------------------------------
    function Na__DoorAnim__ToggleDoor(doorRecord) {
        const baseDurationMs = Number.isFinite(doorRecord.effectiveDurationMs)
            && doorRecord.effectiveDurationMs > 0
            ? doorRecord.effectiveDurationMs
            : Na__DoorAnim__Config__AnimationDurationMs;

        if (doorRecord.isIndependentPanels === true) {
            const endProgress = Na__DoorAnim__ResolveToggleEndProgress(doorRecord);
            doorRecord.panels.forEach((panel) => {
                if (panel.type !== Na__DoorAnim__MOD_TYPE_FIXED) {
                    Na__DoorAnim__AnimateTargetToProgress(panel, endProgress, baseDurationMs);
                }
            });
            Na__DoorAnim__SyncLegacyDoorState(doorRecord);
            console.log(`[DoorAnimation] ${endProgress === 1 ? 'Opening' : 'Closing'} all independent panels: "${doorRecord.adrName}"`);
        } else {
            const wasAnimating = Na__DoorAnim__IsAnimatingState(doorRecord.state);
            const endProgress = Na__DoorAnim__ToggleAnimationTarget(doorRecord, baseDurationMs);
            const actionLabel = wasAnimating
                ? 'Reversed mid-animation'
                : (endProgress === 1 ? 'Opening' : 'Closing');
            console.log(`[DoorAnimation] ${actionLabel}: "${doorRecord.adrName}" (${baseDurationMs}ms)`);
        }

        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle One Independently Coupled Panel
    // ------------------------------------------------------------
    function Na__DoorAnim__TogglePanel(doorRecord, panel) {
        if (!doorRecord || !panel || doorRecord.isIndependentPanels !== true) return false;
        if (!doorRecord.panels.includes(panel) || panel.type === Na__DoorAnim__MOD_TYPE_FIXED) {
            return false;
        }

        const baseDurationMs = Number.isFinite(doorRecord.effectiveDurationMs)
            && doorRecord.effectiveDurationMs > 0
            ? doorRecord.effectiveDurationMs
            : Na__DoorAnim__Config__AnimationDurationMs;
        const wasAnimating = Na__DoorAnim__IsAnimatingState(panel.state);
        const endProgress = Na__DoorAnim__ToggleAnimationTarget(panel, baseDurationMs);
        const actionLabel = wasAnimating
            ? 'Reversed panel mid-animation'
            : (endProgress === 1 ? 'Opening panel' : 'Closing panel');

        Na__DoorAnim__SyncLegacyDoorState(doorRecord);
        Na__RenderLoop__RequestRender();
        console.log(`[DoorAnimation] ${actionLabel}: "${doorRecord.adrName}" / "${panel.modObjectMesh.name}"`);
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Progress to One Panel MOD
    // ------------------------------------------------------------
    function Na__DoorAnim__ApplyPanelTransform(modObject, panel, progress) {
        if (!modObject) return;

        modObject.position.copy(panel.initialPosition);
        modObject.quaternion.copy(panel.initialQuaternion);

        if (panel.type === Na__DoorAnim__MOD_TYPE_ROT_ONLY
            || panel.type === Na__DoorAnim__MOD_TYPE_ROT_MVE) {
            const angleRad = panel.targetAngleRad * progress * panel.rotationSign;
            const rotQuat = new THREE.Quaternion().setFromAxisAngle(
                Na__DoorAnim__Y_AXIS,
                angleRad
            );
            const pivot = panel.pivotLocalPosition;

            modObject.position.sub(pivot);
            modObject.position.applyQuaternion(rotQuat);
            modObject.position.add(pivot);
            modObject.quaternion.premultiply(rotQuat);
        }

        if (panel.type === Na__DoorAnim__MOD_TYPE_ROT_MVE
            || panel.type === Na__DoorAnim__MOD_TYPE_MVE_ONLY) {
            if (panel.mveAxisVector) {
                modObject.position.addScaledVector(
                    panel.mveAxisVector,
                    panel.mveDistanceUnits * progress
                );
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Lockstep Progress to Every Panel
    // ------------------------------------------------------------
    function Na__DoorAnim__ApplyAllPanels(doorRecord, progress) {
        for (const panel of doorRecord.panels) {
            Na__DoorAnim__ApplyPanelTransform(panel.modObjectMesh, panel, progress);
            Na__DoorAnim__ApplyPanelTransform(panel.modObjectLinework, panel, progress);
        }

        doorRecord.currentProgress = progress;
        doorRecord.currentAngleRad = doorRecord.targetAngleRad * progress;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Advance One Animation State
    // ------------------------------------------------------------
    function Na__DoorAnim__AdvanceAnimationState(animationTarget, deltaMs) {
        animationTarget.animElapsedMs += deltaMs;

        const durationMs = Number.isFinite(animationTarget.animDurationMs)
            && animationTarget.animDurationMs > 0
            ? animationTarget.animDurationMs
            : 0;
        const rawT = durationMs > 0
            ? Math.min(animationTarget.animElapsedMs / durationMs, 1.0)
            : 1.0;
        const easedT = Na__DoorAnim__EaseInOutCubic(rawT);
        const progress = animationTarget.animStartProgress
            + (animationTarget.animEndProgress - animationTarget.animStartProgress) * easedT;

        animationTarget.currentProgress = progress;
        return { rawT: rawT, progress: progress };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Complete One Animation State
    // ------------------------------------------------------------
    function Na__DoorAnim__CompleteAnimationState(animationTarget, restDurationMs) {
        if (animationTarget.state === Na__DoorAnim__STATE_OPENING) {
            animationTarget.state = Na__DoorAnim__STATE_OPEN;
        } else if (animationTarget.state === Na__DoorAnim__STATE_CLOSING) {
            animationTarget.state = Na__DoorAnim__STATE_CLOSED;
        }
        animationTarget.currentProgress = animationTarget.animEndProgress;
        animationTarget.animDurationMs = restDurationMs;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Update Independently Coupled Panels
    // ------------------------------------------------------------
    function Na__DoorAnim__UpdateIndependentPanels(doorRecord, deltaMs) {
        let updatedPanelCount = 0;
        const restDurationMs = Number.isFinite(doorRecord.effectiveDurationMs)
            && doorRecord.effectiveDurationMs > 0
            ? doorRecord.effectiveDurationMs
            : Na__DoorAnim__Config__AnimationDurationMs;

        doorRecord.panels.forEach((panel) => {
            if (!Na__DoorAnim__IsAnimatingState(panel.state)) return;

            const frame = Na__DoorAnim__AdvanceAnimationState(panel, deltaMs);
            Na__DoorAnim__ApplyPanelTransform(panel.modObjectMesh, panel, frame.progress);
            Na__DoorAnim__ApplyPanelTransform(panel.modObjectLinework, panel, frame.progress);
            updatedPanelCount++;

            if (frame.rawT >= 1.0) {
                Na__DoorAnim__CompleteAnimationState(panel, restDurationMs);
                console.log(`[DoorAnimation] Panel ${panel.state === Na__DoorAnim__STATE_OPEN ? 'opened' : 'closed'}: "${doorRecord.adrName}" / "${panel.modObjectMesh.name}"`);
            }
        });

        if (updatedPanelCount > 0) Na__DoorAnim__SyncLegacyDoorState(doorRecord);
    }
    // ------------------------------------------------------------


    // FUNCTION | Update All Door Animations (called per frame)
    // ------------------------------------------------------------
    function Na__DoorAnimation__Update(deltaMs) {
        if (!Na__DoorAnim__Initialized) return;                                  // <-- Skip if not initialized
        if (Na__DoorAnim__DoorRegistry.size === 0) return;                       // <-- No doors to animate

        Na__DoorAnim__DoorRegistry.forEach((doorRecord) => {
            if (doorRecord.isIndependentPanels === true) {
                Na__DoorAnim__UpdateIndependentPanels(doorRecord, deltaMs);
                return;
            }

            if (!Na__DoorAnim__IsAnimatingState(doorRecord.state)) return;

            const frame = Na__DoorAnim__AdvanceAnimationState(doorRecord, deltaMs);
            Na__DoorAnim__ApplyAllPanels(doorRecord, frame.progress);

            if (frame.rawT >= 1.0) {
                const restDurationMs = Number.isFinite(doorRecord.effectiveDurationMs)
                    && doorRecord.effectiveDurationMs > 0
                    ? doorRecord.effectiveDurationMs
                    : Na__DoorAnim__Config__AnimationDurationMs;
                Na__DoorAnim__CompleteAnimationState(doorRecord, restDurationMs);
                console.log(`[DoorAnimation] ${doorRecord.state === Na__DoorAnim__STATE_OPEN ? 'Opened' : 'Closed'}: "${doorRecord.adrName}"`);
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Door Animation System
    // ------------------------------------------------------------
    // Accepts arrays of model groups for multi-storey support.
    // Backward-compatible: a single Group passed for meshGroups or lineworkGroups
    // is automatically wrapped in an array.
    // ------------------------------------------------------------
    function Na__DoorAnimation__Initialize(scene, camera, rendererDomElement, meshGroups, lineworkGroups, config) {
        if (Na__DoorAnim__Initialized) {
            console.warn('[DoorAnimation] Already initialized, skipping');
            return;
        }

        // Store references
        Na__DoorAnim__Scene               = scene;                               // <-- Scene reference
        Na__DoorAnim__Camera              = camera;                              // <-- Camera reference
        Na__DoorAnim__RendererDomElement  = rendererDomElement;                  // <-- Canvas DOM element

        // Normalize inputs: wrap single groups in arrays for backward compatibility
        Na__DoorAnim__ModelGroupsMesh     = Array.isArray(meshGroups)     ? meshGroups     : (meshGroups     ? [meshGroups]     : []);
        Na__DoorAnim__ModelGroupsLinework = Array.isArray(lineworkGroups) ? lineworkGroups  : (lineworkGroups ? [lineworkGroups] : []);

        // Apply config overrides
        if (config) {
            if (Number.isFinite(config['3dObject__Interaction__DoorAnimation__AnimationDurationMs'])) {
                Na__DoorAnim__Config__AnimationDurationMs = config['3dObject__Interaction__DoorAnimation__AnimationDurationMs'];
            }
            if (Number.isFinite(config['3dObject__Interaction__DoorAnimation__BifoldDurationMultiplier'])
                && config['3dObject__Interaction__DoorAnimation__BifoldDurationMultiplier'] > 0) {
                Na__DoorAnim__Config__BifoldDurationMultiplier = config['3dObject__Interaction__DoorAnimation__BifoldDurationMultiplier'];
            }
            if (Number.isFinite(config['3dObject__Interaction__DoorAnimation__DefaultRotationDeg'])) {
                Na__DoorAnim__Config__DefaultRotationDeg = config['3dObject__Interaction__DoorAnimation__DefaultRotationDeg'];
            }
            if (Number.isFinite(config['3dObject__Interaction__DoorAnimation__ClickThresholdPx'])) {
                Na__DoorAnim__Config__ClickThresholdPx = config['3dObject__Interaction__DoorAnimation__ClickThresholdPx'];
            }
            if (typeof config['3dObject__Interaction__DoorAnimation__MultiPanelEnabled'] === 'boolean') {
                Na__DoorAnim__Config__MultiPanelEnabled = config['3dObject__Interaction__DoorAnimation__MultiPanelEnabled'];
            }
            if (typeof config['3dObject__Interaction__DoorAnimation__InteriorRotationInverted'] === 'boolean') {
                Na__DoorAnim__Config__InteriorRotationInverted = config['3dObject__Interaction__DoorAnimation__InteriorRotationInverted'];
            }
            if (typeof config['3dObject__Interaction__DoorAnimation__IndependentPanelsEnabled'] === 'boolean') {
                Na__DoorAnim__Config__IndependentPanelsEnabled = config['3dObject__Interaction__DoorAnimation__IndependentPanelsEnabled'];
            }
            if (Array.isArray(config['3dObject__Interaction__DoorAnimation__IndependentPanelAdrNameTokens'])) {
                const normalizedTokens = config['3dObject__Interaction__DoorAnimation__IndependentPanelAdrNameTokens']
                    .filter((token) => typeof token === 'string')
                    .map((token) => token.trim())
                    .filter((token) => token.length > 0);
                if (normalizedTokens.length > 0) {
                    Na__DoorAnim__Config__IndependentPanelAdrNameTokens = normalizedTokens;
                }
            }
        }

        // Scan scene graph for door assemblies (both mesh and linework)
        Na__DoorAnimation__ScanForDoors();                                       // <-- Build door registry

        // Register pointer event handlers for click detection
        rendererDomElement.addEventListener('pointerdown', Na__DoorAnim__OnPointerDown);  // <-- Pointer down
        rendererDomElement.addEventListener('pointerup',   Na__DoorAnim__OnPointerUp);    // <-- Pointer up

        Na__DoorAnim__Initialized = true;                                        // <-- Mark as initialized
        Na__RenderLoop__RequestRender();
        console.log('[DoorAnimation] Door animation system initialized');
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebind Door Model Groups After Scene Reload
    // ------------------------------------------------------------
    function Na__DoorAnimation__RebindModelGroups(meshGroups, lineworkGroups) {
        if (!Na__DoorAnim__Initialized) {
            console.warn('[DoorAnimation] Cannot rebind before initialization');
            return false;
        }

        Na__DoorAnim__ModelGroupsMesh = Array.isArray(meshGroups)
            ? meshGroups
            : (meshGroups ? [meshGroups] : []);
        Na__DoorAnim__ModelGroupsLinework = Array.isArray(lineworkGroups)
            ? lineworkGroups
            : (lineworkGroups ? [lineworkGroups] : []);

        Na__DoorAnimation__ScanForDoors();
        Na__RenderLoop__RequestRender();
        console.log(`[DoorAnimation] Rebound model groups (${Na__DoorAnim__ModelGroupsMesh.length} mesh, ${Na__DoorAnim__ModelGroupsLinework.length} linework)`);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check If Any Door Is Currently Animating
    // ------------------------------------------------------------
    function Na__DoorAnimation__HasActiveAnimations() {
        if (!Na__DoorAnim__Initialized || Na__DoorAnim__DoorRegistry.size === 0) return false;

        for (const [, doorRecord] of Na__DoorAnim__DoorRegistry) {
            if (doorRecord.isIndependentPanels === true) {
                if (doorRecord.panels.some((panel) => Na__DoorAnim__IsAnimatingState(panel.state))) {
                    return true;
                }
            } else if (Na__DoorAnim__IsAnimatingState(doorRecord.state)) {
                return true;
            }
        }
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Door Animation Public API
    // ------------------------------------------------------------
    export {
        Na__DoorAnimation__Initialize,                                           // <-- Initialize system
        Na__DoorAnimation__RebindModelGroups,                                    // <-- Rebind groups after reload
        Na__DoorAnimation__Update,                                               // <-- Per-frame update
        Na__DoorAnimation__HasActiveAnimations,                                  // <-- Query active animations (for render loop)
        Na__DoorAnimation__ScanForDoors,                                         // <-- Re-scan scene graph
        Na__DoorAnim__DoorRegistry,                                              // <-- Door registry Map (for proximity system)
        Na__DoorAnim__ToggleDoor,                                                // <-- Toggle whole door
        Na__DoorAnim__TogglePanel                                                // <-- Toggle independent panel
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
