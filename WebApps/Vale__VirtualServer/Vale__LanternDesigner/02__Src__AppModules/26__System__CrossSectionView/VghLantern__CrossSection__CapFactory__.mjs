/* =============================================================================
   VGHLANTERN - CROSS SECTION VIEW | CAP FACTORY
   =============================================================================

   FILE       : VghLantern__CrossSection__CapFactory__.mjs
   NAMESPACE  : VghLantern
   MODULE     : CrossSection - CapFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn computed cap arrays into drawable fill and profile objects
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - The only place this system creates a material. CapGeometry returns numbers,
     SystemLogic decides when, and this module owns everything drawable in between.
   - Materials are cached and shared across rebuilds exactly as MaterialLibrary and
     the setting-out LineFactory do, so a recompute allocates geometry only, and
     are flagged shared so a scene group clear disposes the geometry and leaves
     them alone.

   ---------------------------------------------------------------------------

   WHY THE FILL IS UNLIT

   The cut face is a drawing convention, not a surface. Lighting it would give the
   two halves of one continuous cut different tones depending on which way the
   plane faces, which reads as two different materials rather than one cut. It is
   therefore MeshBasicMaterial with tone mapping off, so the configured hex is the
   hex that lands on screen.

   Double sided deliberately: a reviewer who orbits past the plane sees the same
   face from behind rather than watching the model's insides pop through it.

   ---------------------------------------------------------------------------

   WHY THIS TOUCHES THE FAT LINE ADDON RATHER THAN REUSING SetOut__LineFactory

   That factory is keyed to the setting-out style table - a caller hands it a
   Class__Family key and it looks the appearance up. A section profile has no such
   key; its appearance comes from this system's own config. Every caveat that
   factory documents about the addon applies here too and is honoured the same way.

   ============================================================================= */

import * as THREE from 'three';

import { LineSegments2 }        from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial }         from 'three/addons/lines/LineMaterial.js';

import {
    VghLantern__CrossSection__ConfigAccess__RequireString,
    VghLantern__CrossSection__ConfigAccess__RequireNumber
} from './VghLantern__CrossSection__ConfigAccess__.mjs';

// =============================================================================
// REGION | Cross Section Cap Factory Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cache
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Object Naming
    // ------------------------------------------------------------
    const OBJECT_NAME_FILL     =  'VghLantern__CrossSection__CapFill';
    const OBJECT_NAME_OUTLINE  =  'VghLantern__CrossSection__CapProfile';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Material Cache Keyed by Appearance
    // ------------------------------------------------------------
    let VghLantern__CrossSection__CapFactory__FillCache     =  {};           // <-- 'colour' to MeshBasicMaterial
    let VghLantern__CrossSection__CapFactory__OutlineCache  =  {};           // <-- 'colour|width' to LineMaterial
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Cached Cut Face Material
    // ------------------------------------------------------------
    function VghLantern__CrossSection__CapFactory__FillMaterial() {
        const colourHex  =  VghLantern__CrossSection__ConfigAccess__RequireString('Appearance', 'FillColour');
        if (VghLantern__CrossSection__CapFactory__FillCache[colourHex]) {
            return VghLantern__CrossSection__CapFactory__FillCache[colourHex];
        }

        const material  =  new THREE.MeshBasicMaterial({
            color       : new THREE.Color(colourHex),
            side        : THREE.DoubleSide,                                  // <-- Readable from either side of the plane
            toneMapped  : false,                                             // <-- A drawing convention, not a lit surface
            fog         : false
        });

        material.name  =  'VghLantern__CrossSection__Fill__' + colourHex;
        material.userData.VghLantern__Shared  =  true;                       // <-- SceneManager must not dispose this on a group clear

        VghLantern__CrossSection__CapFactory__FillCache[colourHex]  =  material;
        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Cached Profile Line Material
    // ------------------------------------------------------------
    // depthTest stays ON, unlike the setting-out linework. A section profile
    // belongs to the cut face it outlines, so it must disappear behind the model
    // when the reviewer orbits round to the kept side rather than floating through
    // the lantern the way a construction line is meant to.
    function VghLantern__CrossSection__CapFactory__OutlineMaterial() {
        const colourHex  =  VghLantern__CrossSection__ConfigAccess__RequireString('Appearance', 'LineColour');
        const widthPx    =  VghLantern__CrossSection__ConfigAccess__RequireNumber('Appearance', 'LineWidthPx');
        const cacheKey   =  colourHex + '|' + widthPx;

        if (VghLantern__CrossSection__CapFactory__OutlineCache[cacheKey]) {
            return VghLantern__CrossSection__CapFactory__OutlineCache[cacheKey];
        }

        // Colour is constructed rather than assigned after the fact: the addon's
        // colour setter writes raw into the uniform and skips the colour management
        // conversion, so only the constructor path keeps the hex looking right.
        const material  =  new LineMaterial({
            color       : new THREE.Color(colourHex),
            linewidth   : widthPx,
            worldUnits  : false,                                             // <-- CSS pixels, so the profile holds its weight at any zoom
            dashed      : false,
            depthTest   : true,
            transparent : false,
            toneMapped  : false
        });

        material.name  =  'VghLantern__CrossSection__Profile__' + colourHex;
        material.userData.VghLantern__Shared  =  true;

        VghLantern__CrossSection__CapFactory__OutlineCache[cacheKey]  =  material;
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Object Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Cut Face Fill From World Space Triangle Positions
    // ------------------------------------------------------------
    // insetWorld pushes the fill back along the kept-side normal. It is never zero:
    // the cut is applied at the renderer and takes every material with it, so a
    // fill sitting exactly on the plane is one rounding error away from being
    // clipped along with the model it is meant to close.
    export function VghLantern__CrossSection__CapFactory__BuildFill(positions, planeNormal, insetWorld) {
        if (!positions || positions.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mesh  =  new THREE.Mesh(geometry, VghLantern__CrossSection__CapFactory__FillMaterial());
        mesh.name   =  OBJECT_NAME_FILL;
        mesh.position.copy(planeNormal).multiplyScalar(insetWorld);
        mesh.userData.VghLantern__CrossSection__Helper  =  true;             // <-- Never cut by the next recompute

        return mesh;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Cut Profile Line From World Space Segment Pairs
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__CapFactory__BuildOutline(positions, planeNormal, insetWorld) {
        if (!positions || positions.length === 0) return null;

        const geometry  =  new LineSegmentsGeometry();
        geometry.setPositions(positions);

        const object3d  =  new LineSegments2(geometry, VghLantern__CrossSection__CapFactory__OutlineMaterial());
        object3d.name   =  OBJECT_NAME_OUTLINE;
        object3d.position.copy(planeNormal).multiplyScalar(insetWorld);
        object3d.frustumCulled  =  false;                                    // <-- The bounding sphere carries no line-width margin
        object3d.userData.VghLantern__CrossSection__Helper  =  true;

        return object3d;
    }
    // ------------------------------------------------------------


    // FUNCTION | Seed the Line Width Resolution for a Surface
    // ------------------------------------------------------------
    // Same reasoning as the setting-out factory: the addon refreshes this uniform
    // per object per frame, but the scene draws on demand, so until something
    // invalidates the surface nothing has rendered and the uniform still holds its
    // one-by-one default - which would draw the profile as a screen-filling slab.
    export function VghLantern__CrossSection__CapFactory__SeedResolution(surface) {
        if (!surface || !surface.HostElement) return;

        const widthPx   =  surface.HostElement.clientWidth;
        const heightPx  =  surface.HostElement.clientHeight;
        if (widthPx < 1 || heightPx < 1) return;

        const keys  =  Object.keys(VghLantern__CrossSection__CapFactory__OutlineCache);
        for (let i = 0; i < keys.length; i++) {
            VghLantern__CrossSection__CapFactory__OutlineCache[keys[i]].resolution.set(widthPx, heightPx);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose Every Cached Material
    // ------------------------------------------------------------
    // Called only on full teardown, matching MaterialLibrary and the setting-out
    // LineFactory. Clearing the section group disposes geometry and leaves these.
    export function VghLantern__CrossSection__CapFactory__DisposeMaterials() {
        const caches  =  [
            VghLantern__CrossSection__CapFactory__FillCache,
            VghLantern__CrossSection__CapFactory__OutlineCache
        ];

        for (let c = 0; c < caches.length; c++) {
            const keys  =  Object.keys(caches[c]);
            for (let i = 0; i < keys.length; i++) {
                const material  =  caches[c][keys[i]];
                if (material && typeof material.dispose === 'function') material.dispose();
            }
        }

        VghLantern__CrossSection__CapFactory__FillCache     =  {};
        VghLantern__CrossSection__CapFactory__OutlineCache  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
