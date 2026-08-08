/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | SHAPE FACTORY
   =============================================================================

   FILE       : NaAudio__Env3d__ShapeFactory__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - ShapeFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The geometric vocabulary of the space, built once and shared
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The whole visual language is a small set of primitives - circle, square,
     triangle, cylinder, cone, octahedron, arc, bar - so this module holds all of
     them and nothing else builds geometry from scratch.
   - Geometries are cached and SHARED between meshes. A sequencer with sixteen
     divisions across four lanes is sixty-four meshes pointing at four geometries.
     Building a geometry per step would be sixty-four buffer uploads for four
     distinct shapes.

   ---------------------------------------------------------------------------

   UNIT GEOMETRY AND SCALING

   Every cached geometry is built at unit size and positioned about its own natural
   origin, then scaled by the mesh transform at the call site. That is what lets a
   step pulse by writing mesh.scale rather than by rebuilding its geometry - the
   pulse is a matrix change, which is free, instead of a buffer rebuild, which is
   not.

   The one deliberate exception is the rounded pad, which is built at its requested
   size. Its corner radius must stay constant in world units as the plate changes
   proportion, and a non-uniform scale on a shared geometry would stretch the
   corners into ellipses.

   ============================================================================= */

import * as THREE from 'three';

// =============================================================================
// REGION | Shape Factory
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tessellation Defaults
    // ------------------------------------------------------------
    // Chosen to look round at working distance without spending vertices. A step
    // node is a few centimetres across on screen; 24 segments is already past the
    // point where more is visible.
    const CIRCLE_SEGMENTS    =  32;
    const CYLINDER_SEGMENTS  =  24;
    const CONE_SEGMENTS      =  20;
    const SPHERE_SEGMENTS    =  20;
    const SPHERE_RINGS       =  14;
    const TORUS_TUBE_SEG     =  10;
    const TORUS_RING_SEG     =  48;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Shape Name Vocabulary
    // ------------------------------------------------------------
    // The names a config file or a space file may use for a shape. Published so a
    // module type can declare its step shapes as data.
    export const NaAudio__Env3d__ShapeName  =  Object.freeze({
        Box         : 'box',
        Cylinder    : 'cylinder',
        Cone        : 'cone',
        Sphere      : 'sphere',
        Octahedron  : 'octahedron',
        Tetrahedron : 'tetrahedron',
        Circle      : 'circle',
        Triangle    : 'triangle',
        Square      : 'square',
        Arc         : 'arc',
        Bar         : 'bar'
    });
    // ------------------------------------------------------------


    // MODULE VARIABLES | Geometry Cache
    // ------------------------------------------------------------
    const GEOMETRY_CACHE  =  new Map();                                      // <-- Cache key -> BufferGeometry
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Plumbing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Look Up or Build a Cached Geometry
    // ------------------------------------------------------------
    function NaAudio__Env3d__ShapeFactory__Cached(cacheKey, factory) {
        let geometry  =  GEOMETRY_CACHE.get(cacheKey);
        if (geometry) return geometry;

        geometry  =  factory();
        geometry.userData.NaAudio__Shared  =  true;                           // <-- Never disposed by a group clear
        GEOMETRY_CACHE.set(cacheKey, geometry);
        return geometry;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Geometry Is Factory-Owned and Must Not Be Disposed
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__IsShared(geometry) {
        return !!(geometry && geometry.userData && geometry.userData.NaAudio__Shared === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Unit Solids
// -----------------------------------------------------------------------------

    // FUNCTION | Unit Cube, One Unit on Each Side, Centred on Its Origin
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitBox() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Cylinder, Standing on the XZ Plane
    // ------------------------------------------------------------
    // Origin at the base rather than the centre, so a step that grows on trigger
    // grows upward out of the ring instead of sinking half of itself through it.
    export function NaAudio__Env3d__ShapeFactory__UnitCylinder() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitCylinder', () => {
            const geometry  =  new THREE.CylinderGeometry(0.5, 0.5, 1, CYLINDER_SEGMENTS, 1, false);
            geometry.translate(0, 0.5, 0);
            return geometry;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Cone, Standing on the XZ Plane
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitCone() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitCone', () => {
            const geometry  =  new THREE.ConeGeometry(0.5, 1, CONE_SEGMENTS, 1, false);
            geometry.translate(0, 0.5, 0);
            return geometry;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Sphere
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitSphere() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitSphere', () => new THREE.SphereGeometry(0.5, SPHERE_SEGMENTS, SPHERE_RINGS));
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Octahedron
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitOctahedron() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitOctahedron', () => new THREE.OctahedronGeometry(0.5, 0));
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Tetrahedron
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitTetrahedron() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitTetrahedron', () => new THREE.TetrahedronGeometry(0.5, 0));
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Solid by Shape Name
    // ------------------------------------------------------------
    // The bridge from a config string to a geometry. An unknown name falls back to
    // the cylinder with a warning rather than throwing: a space file naming a shape
    // this build does not have should still open.
    export function NaAudio__Env3d__ShapeFactory__UnitSolid(shapeName) {
        switch (shapeName) {
            case NaAudio__Env3d__ShapeName.Box         : return NaAudio__Env3d__ShapeFactory__UnitBox();
            case NaAudio__Env3d__ShapeName.Cylinder    : return NaAudio__Env3d__ShapeFactory__UnitCylinder();
            case NaAudio__Env3d__ShapeName.Cone        : return NaAudio__Env3d__ShapeFactory__UnitCone();
            case NaAudio__Env3d__ShapeName.Sphere      : return NaAudio__Env3d__ShapeFactory__UnitSphere();
            case NaAudio__Env3d__ShapeName.Octahedron  : return NaAudio__Env3d__ShapeFactory__UnitOctahedron();
            case NaAudio__Env3d__ShapeName.Tetrahedron : return NaAudio__Env3d__ShapeFactory__UnitTetrahedron();
            default:
                console.warn('[NaAudio Env3d] Unknown shape name "' + shapeName + '" - using cylinder.');
                return NaAudio__Env3d__ShapeFactory__UnitCylinder();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Flat Shapes
// -----------------------------------------------------------------------------

    // FUNCTION | Unit Circle in the XY Plane
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitCircle() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitCircle', () => new THREE.CircleGeometry(0.5, CIRCLE_SEGMENTS));
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Square in the XY Plane
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitSquare() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitSquare', () => new THREE.PlaneGeometry(1, 1));
    }
    // ------------------------------------------------------------


    // FUNCTION | Unit Equilateral Triangle in the XY Plane
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__UnitTriangle() {
        return NaAudio__Env3d__ShapeFactory__Cached('unitTriangle', () => {
            const shape   =  new THREE.Shape();
            const radius  =  0.5;

            for (let i = 0; i < 3; i++) {
                const angle  =  (Math.PI / 2) + (i * 2 * Math.PI / 3);         // <-- Apex up
                const x      =  Math.cos(angle) * radius;
                const y      =  Math.sin(angle) * radius;
                if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
            }
            shape.closePath();
            return new THREE.ShapeGeometry(shape);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Flat Ring Segment - the Kandinsky Arc
    // ------------------------------------------------------------
    // Unit outer radius. Cached per (inner radius, sweep) pair, since those two
    // change the geometry and cannot be recovered by scaling.
    export function NaAudio__Env3d__ShapeFactory__Arc(innerRadiusFraction, sweepRadians) {
        const key  =  'arc:' + innerRadiusFraction.toFixed(3) + ':' + sweepRadians.toFixed(3);

        return NaAudio__Env3d__ShapeFactory__Cached(key, () => new THREE.RingGeometry(
            innerRadiusFraction, 1.0, CIRCLE_SEGMENTS, 1, 0, sweepRadians
        ));
    }
    // ------------------------------------------------------------


    // FUNCTION | Flat Bar in the XY Plane
    // ------------------------------------------------------------
    // Unit length by the given thickness fraction. Used for the sequencer's sweep
    // marker and for the backdrop bars.
    export function NaAudio__Env3d__ShapeFactory__Bar(thicknessFraction) {
        const key  =  'bar:' + thicknessFraction.toFixed(4);
        return NaAudio__Env3d__ShapeFactory__Cached(key, () => new THREE.PlaneGeometry(1, thicknessFraction));
    }
    // ------------------------------------------------------------


    // FUNCTION | Flat Shape by Name
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__FlatShape(shapeName) {
        switch (shapeName) {
            case NaAudio__Env3d__ShapeName.Circle   : return NaAudio__Env3d__ShapeFactory__UnitCircle();
            case NaAudio__Env3d__ShapeName.Square   : return NaAudio__Env3d__ShapeFactory__UnitSquare();
            case NaAudio__Env3d__ShapeName.Triangle : return NaAudio__Env3d__ShapeFactory__UnitTriangle();
            case NaAudio__Env3d__ShapeName.Arc      : return NaAudio__Env3d__ShapeFactory__Arc(0.62, Math.PI * 0.85);
            case NaAudio__Env3d__ShapeName.Bar      : return NaAudio__Env3d__ShapeFactory__Bar(0.16);
            default:
                console.warn('[NaAudio Env3d] Unknown flat shape "' + shapeName + '" - using circle.');
                return NaAudio__Env3d__ShapeFactory__UnitCircle();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rings and Tubes
// -----------------------------------------------------------------------------

    // FUNCTION | A Thin Torus Lying in the XZ Plane
    // ------------------------------------------------------------
    // The sequencer track and the module selection ring. Built at the requested
    // radius rather than at unit size, because scaling a torus non-uniformly turns
    // its circular tube into an ellipse.
    export function NaAudio__Env3d__ShapeFactory__FlatTorus(radius, tubeRadius) {
        const key  =  'flatTorus:' + radius.toFixed(3) + ':' + tubeRadius.toFixed(4);

        return NaAudio__Env3d__ShapeFactory__Cached(key, () => {
            const geometry  =  new THREE.TorusGeometry(radius, tubeRadius, TORUS_TUBE_SEG, TORUS_RING_SEG);
            geometry.rotateX(-Math.PI / 2);                                    // <-- Torus is built in XY; the space wants it flat on the floor
            return geometry;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Flat Annulus Lying in the XZ Plane
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__FlatAnnulus(innerRadius, outerRadius) {
        const key  =  'flatAnnulus:' + innerRadius.toFixed(3) + ':' + outerRadius.toFixed(3);

        return NaAudio__Env3d__ShapeFactory__Cached(key, () => {
            const geometry  =  new THREE.RingGeometry(innerRadius, outerRadius, CIRCLE_SEGMENTS * 2, 1);
            geometry.rotateX(-Math.PI / 2);
            return geometry;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pads
// -----------------------------------------------------------------------------

    // FUNCTION | A Rounded Rectangular Pad Lying Flat on the Floor
    // ------------------------------------------------------------
    // Built at its requested size, not scaled from a unit shape - see the note in
    // the file header on why the corner radius has to stay in world units.
    export function NaAudio__Env3d__ShapeFactory__RoundedPad(width, depth, cornerRadius, cornerSegments) {
        const key  =  'roundedPad:' + width.toFixed(3) + ':' + depth.toFixed(3) + ':' + cornerRadius.toFixed(3);

        return NaAudio__Env3d__ShapeFactory__Cached(key, () => {
            const halfWidth  =  width / 2;
            const halfDepth  =  depth / 2;
            const radius     =  Math.min(cornerRadius, halfWidth, halfDepth);

            const shape  =  new THREE.Shape();
            shape.moveTo(-halfWidth + radius, -halfDepth);
            shape.lineTo( halfWidth - radius, -halfDepth);
            shape.quadraticCurveTo( halfWidth, -halfDepth,  halfWidth, -halfDepth + radius);
            shape.lineTo( halfWidth,  halfDepth - radius);
            shape.quadraticCurveTo( halfWidth,  halfDepth,  halfWidth - radius,  halfDepth);
            shape.lineTo(-halfWidth + radius,  halfDepth);
            shape.quadraticCurveTo(-halfWidth,  halfDepth, -halfWidth,  halfDepth - radius);
            shape.lineTo(-halfWidth, -halfDepth + radius);
            shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + radius, -halfDepth);

            const geometry  =  new THREE.ShapeGeometry(shape, cornerSegments || 8);
            geometry.rotateX(-Math.PI / 2);                                    // <-- Authored in XY, laid flat on the floor
            return geometry;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Circular Pad Lying Flat on the Floor
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__CircularPad(radius) {
        const key  =  'circularPad:' + radius.toFixed(3);

        return NaAudio__Env3d__ShapeFactory__Cached(key, () => {
            const geometry  =  new THREE.CircleGeometry(radius, CIRCLE_SEGMENTS * 2);
            geometry.rotateX(-Math.PI / 2);
            return geometry;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Dispose Every Cached Geometry
    // ------------------------------------------------------------
    // Full application teardown only. Every mesh in the scene points at one of
    // these, so calling it while a scene is live empties the screen.
    export function NaAudio__Env3d__ShapeFactory__DisposeAll() {
        for (const geometry of GEOMETRY_CACHE.values()) {
            if (typeof geometry.dispose === 'function') geometry.dispose();
        }
        GEOMETRY_CACHE.clear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Count of Cached Geometries
    // ------------------------------------------------------------
    export function NaAudio__Env3d__ShapeFactory__CachedCount() {
        return GEOMETRY_CACHE.size;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
