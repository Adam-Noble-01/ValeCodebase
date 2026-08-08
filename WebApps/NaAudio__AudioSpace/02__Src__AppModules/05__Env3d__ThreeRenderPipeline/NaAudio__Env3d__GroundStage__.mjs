/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | GROUND STAGE
   =============================================================================

   FILE       : NaAudio__Env3d__GroundStage__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - GroundStage
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the room - floor, grid, centre datum and backdrop composition
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Everything that is the SPACE rather than the CONTENTS. Built once into the
     Environment group and never cleared by a space load.
   - Four parts:
       * The floor plane, which receives the one shadow the rig casts.
       * A faint grid, as a spatial aid for judging module positions.
       * The centre datum ring, marking the listener position and the master bus.
       * The backdrop composition - large flat shapes far behind everything.

   ---------------------------------------------------------------------------

   THE BACKDROP IS THE KANDINSKY

   Composition A is a small number of decisive flat shapes on a pale ground, with
   thin dark linework holding them together. Dialled back for a working
   environment, that becomes: five large shapes, ringed well outside the working
   area, at fourteen to twenty-two percent opacity, unlit, fading into fog.

   They are scenery and nothing else. Never pickable, never audible, never a
   control. Their entire job is to give the space a composition so it reads as a
   place with a character rather than as an empty grid, and to give the eye
   something to orient against when the camera swings round.

   The arrangement is random but SEEDED from config, so it is identical on every
   load. A composition that reshuffles on refresh cannot be learned, and spatial
   memory is the whole premise of the application.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dBool }             from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import { NaAudio__SeededRandom__Create }      from '../03__AppUtils/NaAudio__AppUtils__SeededRandom__.mjs';
import * as Palette                           from './NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials                         from './NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes                            from './NaAudio__Env3d__ShapeFactory__.mjs';
import { NaAudio__Env3d__SceneGroup }         from './NaAudio__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | Ground Stage
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Object Names and Layering Offsets
    // ------------------------------------------------------------
    const NAME_FLOOR      =  'NaAudio__Env3d__Floor';
    const NAME_GRID       =  'NaAudio__Env3d__Grid';
    const NAME_DATUM      =  'NaAudio__Env3d__CentreDatum';
    const NAME_BACKDROP   =  'NaAudio__Env3d__Backdrop';

    // Everything flat lives at a slightly different height so coplanar surfaces
    // never z-fight. Two millimetre steps are invisible at working distance and
    // completely reliable.
    const HEIGHT_FLOOR    =  0.000;
    const HEIGHT_GRID     =  0.002;
    const HEIGHT_DATUM    =  0.004;

    const DATUM_INNER     =  0.34;                                           // <-- Listener position marker, in metres
    const DATUM_OUTER     =  0.40;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Floor
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Floor Plane
    // ------------------------------------------------------------
    function NaAudio__Env3d__GroundStage__BuildFloor() {
        const extent    =  Env3dNumber('GroundStage', 'FloorExtent');
        const geometry  =  new THREE.PlaneGeometry(extent, extent);
        geometry.rotateX(-Math.PI / 2);

        const floor  =  new THREE.Mesh(geometry, Materials.NaAudio__Materials__Floor());
        floor.name             =  NAME_FLOOR;
        floor.position.y       =  HEIGHT_FLOOR;
        floor.receiveShadow    =  true;
        floor.castShadow       =  false;
        floor.userData.NaAudio__Pickable  =  false;                           // <-- The floor is a drag plane, not a target

        return floor;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Grid
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Faint Ground Grid
    // ------------------------------------------------------------
    // Hand-built as two LineSegments rather than a THREE.GridHelper, because the
    // helper draws every line in one geometry with one material and the major and
    // minor lines need different opacities to read correctly at this contrast.
    function NaAudio__Env3d__GroundStage__BuildGrid() {
        if (!Env3dBool('GroundStage', 'GridEnabled')) return null;

        const extent      =  Env3dNumber('GroundStage', 'GridExtent');
        const spacing     =  Env3dNumber('GroundStage', 'GridSpacing');
        const majorEvery  =  Env3dNumber('GroundStage', 'GridMajorEvery');

        const half   =  extent / 2;
        const lines  =  Math.round(extent / spacing);

        const minorPoints  =  [];
        const majorPoints  =  [];

        for (let i = 0; i <= lines; i++) {
            const offset   =  -half + i * spacing;
            const isMajor  =  (i % majorEvery === 0);
            const target   =  isMajor ? majorPoints : minorPoints;

            target.push(-half, 0, offset,  half, 0, offset);                   // <-- Line running along X
            target.push(offset, 0, -half,  offset, 0, half);                   // <-- Line running along Z
        }

        const group  =  new THREE.Group();
        group.name       =  NAME_GRID;
        group.position.y =  HEIGHT_GRID;

        const buildSegments  =  function (points, isMajor) {
            if (points.length === 0) return;
            const geometry  =  new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

            const segments  =  new THREE.LineSegments(geometry, Materials.NaAudio__Materials__Grid(isMajor));
            segments.userData.NaAudio__Pickable  =  false;
            group.add(segments);
        };

        buildSegments(minorPoints, false);
        buildSegments(majorPoints, true);

        return group;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Centre Datum
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Centre Datum Ring
    // ------------------------------------------------------------
    // Marks the listener position at the middle of the module ring. The layout
    // config keeps this area clear of modules on purpose, and without a mark the
    // user has no idea the centre means anything.
    function NaAudio__Env3d__GroundStage__BuildCentreDatum() {
        const geometry  =  Shapes.NaAudio__Env3d__ShapeFactory__FlatAnnulus(DATUM_INNER, DATUM_OUTER);

        const datum  =  new THREE.Mesh(geometry, Materials.NaAudio__Materials__Line('InkFaint', 0.55));
        datum.name              =  NAME_DATUM;
        datum.position.y        =  HEIGHT_DATUM;
        datum.userData.NaAudio__Pickable  =  false;

        return datum;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Backdrop Composition
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Backdrop Prop
    // ------------------------------------------------------------
    function NaAudio__Env3d__GroundStage__BuildBackdropProp(declaration, random) {
        const geometry  =  Shapes.NaAudio__Env3d__ShapeFactory__FlatShape(declaration.Shape);
        const material  =  Materials.NaAudio__Materials__Backdrop(declaration.Pigment, declaration.Opacity);

        const prop  =  new THREE.Mesh(geometry, material);

        const radius     =  random.Range(Env3dNumber('GroundStage', 'BackdropRingRadiusMin'), Env3dNumber('GroundStage', 'BackdropRingRadiusMax'));
        const azimuth    =  random.Range(0, Math.PI * 2);
        const height     =  random.Range(Env3dNumber('GroundStage', 'BackdropHeightMin'), Env3dNumber('GroundStage', 'BackdropHeightMax'));
        const scale      =  random.Range(Env3dNumber('GroundStage', 'BackdropScaleMin'),  Env3dNumber('GroundStage', 'BackdropScaleMax'));

        prop.position.set(Math.sin(azimuth) * radius, height, Math.cos(azimuth) * radius);
        prop.scale.setScalar(scale);
        prop.rotation.z  =  random.Range(-0.30, 0.30);                         // <-- A slight tilt; perfectly upright reads as a UI element

        prop.lookAt(0, height, 0);                                            // <-- Always face the centre of the space
        prop.rotateZ(random.Spread(0.22));

        prop.castShadow                   =  false;
        prop.receiveShadow                =  false;
        prop.userData.NaAudio__Pickable   =  false;                           // <-- Scenery. Never a target.
        prop.renderOrder                  =  -1;                              // <-- Drawn before everything, so it can never overlay a control

        return prop;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Whole Backdrop Composition
    // ------------------------------------------------------------
    function NaAudio__Env3d__GroundStage__BuildBackdrop() {
        if (!Env3dBool('GroundStage', 'BackdropEnabled')) return null;

        const declarations  =  Palette.NaAudio__Palette__BackdropShapes();
        if (declarations.length === 0) return null;

        const random  =  NaAudio__SeededRandom__Create(Env3dNumber('GroundStage', 'BackdropSeed'));
        const count   =  Math.min(Env3dNumber('GroundStage', 'BackdropShapeCount'), declarations.length);

        const group  =  new THREE.Group();
        group.name   =  NAME_BACKDROP;

        for (let i = 0; i < count; i++) {
            group.add(NaAudio__Env3d__GroundStage__BuildBackdropProp(declarations[i], random));
        }

        return group;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Stage Assembly
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Ground Stage Into a Surface's Environment Group
    // ------------------------------------------------------------
    export function NaAudio__Env3d__GroundStage__Build(surface) {
        if (!surface) return null;

        const environment  =  surface.Groups[NaAudio__Env3d__SceneGroup.Environment];

        const floor     =  NaAudio__Env3d__GroundStage__BuildFloor();
        const grid      =  NaAudio__Env3d__GroundStage__BuildGrid();
        const datum     =  NaAudio__Env3d__GroundStage__BuildCentreDatum();
        const backdrop  =  NaAudio__Env3d__GroundStage__BuildBackdrop();

        environment.add(floor);
        if (grid)     environment.add(grid);
        environment.add(datum);
        if (backdrop) environment.add(backdrop);

        return { Floor: floor, Grid: grid, Datum: datum, Backdrop: backdrop };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Floor Mesh From a Surface
    // ------------------------------------------------------------
    // The interaction module raycasts against this to turn a pointer position into
    // a point on the ground plane while dragging a module.
    export function NaAudio__Env3d__GroundStage__FloorMesh(surface) {
        if (!surface) return null;
        return surface.Groups[NaAudio__Env3d__SceneGroup.Environment].getObjectByName(NAME_FLOOR) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Ground Grid
    // ------------------------------------------------------------
    // Addressed by name rather than by group, because the Environment group also
    // holds the light rig and hiding that group would render the whole space as an
    // unlit black silhouette.
    export function NaAudio__Env3d__GroundStage__SetGridVisible(surface, isVisible) {
        if (!surface) return;
        const grid  =  surface.Groups[NaAudio__Env3d__SceneGroup.Environment].getObjectByName(NAME_GRID);
        if (grid) grid.visible  =  isVisible === true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
