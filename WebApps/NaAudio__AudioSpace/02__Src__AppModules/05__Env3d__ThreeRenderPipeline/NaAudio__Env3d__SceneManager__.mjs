/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | SCENE MANAGER
   =============================================================================

   FILE       : NaAudio__Env3d__SceneManager__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - SceneManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own the renderer, the group stack and the draw loop
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Factory module. One call to Create returns an independent 3D surface holding
     its own renderer, scene, group stack and animation loop.
   - Publishes the group vocabulary so no builder ever names a group with a string
     literal. Add a group here and it is created, drawn, cleared and raycast in
     the right order everywhere, because every consumer takes its list from the
     sets published below.

   ---------------------------------------------------------------------------

   GROUP STACK (created and drawn in this order, cleared independently):
       Environment      floor, grid, backdrop props, light rig. Never cleared on a
                        space reload - it is the room, not the contents.
       ModuleShells     pads, cages, selection rings, name plates
       ModuleBodies     the working geometry each spatial module builds
       PatchCables      the 3D noodles between module ports
       Overlay          drag handles, ghost previews, anything transient

   ---------------------------------------------------------------------------

   WHY THIS LOOP DRAWS EVERY FRAME

   The Lantern Designer's equivalent renders on demand and idles at zero GPU cost,
   which is right for a CAD viewport that only changes when a value changes.

   AudioSPACE is the opposite case. A sequencer marker sweeping, a step decaying
   out of its pulse, a sphere falling inside a DelayCloud - something is moving
   whenever the transport runs, and most of it is moving between user actions
   rather than because of one. An invalidate-driven loop would end up invalidating
   on every frame anyway, with the bookkeeping on top.

   Frame cost is instead managed the way the design manifest specifies: by locking
   modules that are not being worked on, which stops their animation and their
   audio together. That is a user-facing decision about attention, not a hidden
   optimisation, and it is the mechanism the whole application is built around.

   ---------------------------------------------------------------------------

   RESOURCE OWNERSHIP

   Geometry created by a module builder is disposed here when its group is cleared.
   Materials are disposed only if NaAudio__Materials__IsShared says they are not
   library-owned - see the shared versus owned note in the material library.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dBool, Env3dString }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                             from './NaAudio__Env3d__PaletteLibrary__.mjs';
import { NaAudio__Materials__IsShared }         from './NaAudio__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | Scene Manager
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Scene Group Vocabulary
    // ------------------------------------------------------------
    export const NaAudio__Env3d__SceneGroup  =  Object.freeze({
        Environment   : 'environment',
        ModuleShells  : 'moduleShells',
        ModuleBodies  : 'moduleBodies',
        PatchCables   : 'patchCables',
        Overlay       : 'overlay'
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Meaningful Sets of Groups
    // ------------------------------------------------------------
    export const NaAudio__Env3d__SceneGroupOrder  =  Object.freeze([          // <-- Creation and draw order
        NaAudio__Env3d__SceneGroup.Environment,
        NaAudio__Env3d__SceneGroup.ModuleShells,
        NaAudio__Env3d__SceneGroup.ModuleBodies,
        NaAudio__Env3d__SceneGroup.PatchCables,
        NaAudio__Env3d__SceneGroup.Overlay
    ]);

    export const NaAudio__Env3d__SceneGroupSet__SpaceContents  =  Object.freeze([  // <-- Replaced when a space is loaded
        NaAudio__Env3d__SceneGroup.ModuleShells,
        NaAudio__Env3d__SceneGroup.ModuleBodies,
        NaAudio__Env3d__SceneGroup.PatchCables,
        NaAudio__Env3d__SceneGroup.Overlay
    ]);

    export const NaAudio__Env3d__SceneGroupSet__Pickable  =  Object.freeze([       // <-- Raycast roots, nearest first
        NaAudio__Env3d__SceneGroup.Overlay,
        NaAudio__Env3d__SceneGroup.ModuleBodies,
        NaAudio__Env3d__SceneGroup.ModuleShells
    ]);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Canvas Classes and Guards
    // ------------------------------------------------------------
    const CSS_CANVAS       =  'NaAudio__Env3d__Canvas';                      // <-- Styled by NaAudio__Env3d__Styles__Main__.css
    const CSS_HOST_ACTIVE  =  'NaAudio__Env3d__Host--active';
    const MIN_CANVAS_PX    =  2;                                             // <-- Below this the host is not laid out yet

    const MAX_FRAME_DELTA  =  0.10;                                          // <-- Seconds. Clamps the delta after a tab returns from background
    const MAX_FRAME_DELTA_NOTE = 'A backgrounded tab produces a multi-second delta on its first frame back. Unclamped, every physics integrator in the space teleports its objects through a wall.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resource Disposal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Dispose a Single Object's Owned Resources
    // ------------------------------------------------------------
    function NaAudio__Env3d__SceneManager__DisposeObject(object3d) {
        if (object3d.geometry && typeof object3d.geometry.dispose === 'function') {
            object3d.geometry.dispose();                                      // <-- Geometry is always builder-owned
        }

        if (!object3d.material) return;

        const materials  =  Array.isArray(object3d.material) ? object3d.material : [object3d.material];
        for (let i = 0; i < materials.length; i++) {
            const material  =  materials[i];
            if (!material) continue;
            if (NaAudio__Materials__IsShared(material)) continue;             // <-- Library-owned, disposed only on teardown

            if (material.map && typeof material.map.dispose === 'function') {
                material.map.dispose();                                       // <-- Label sprites carry their own canvas texture
            }
            if (typeof material.dispose === 'function') material.dispose();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recursively Empty a Group and Free Its Resources
    // ------------------------------------------------------------
    function NaAudio__Env3d__SceneManager__EmptyGroup(group) {
        if (!group) return;

        for (let i = group.children.length - 1; i >= 0; i--) {
            const child  =  group.children[i];
            child.traverse(NaAudio__Env3d__SceneManager__DisposeObject);
            group.remove(child);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove One Object From the Scene and Free Its Resources
    // ------------------------------------------------------------
    // For removing a single module rather than clearing a whole group. Exported so the
    // spatial framework does not have to reimplement the shared-versus-owned rule -
    // getting that wrong double-disposes a library material and turns every mesh using
    // it black.
    export function NaAudio__Env3d__SceneManager__DisposeSubtree(object3d) {
        if (!object3d) return;

        object3d.traverse(NaAudio__Env3d__SceneManager__DisposeObject);
        if (object3d.parent) object3d.parent.remove(object3d);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear One Named Group on a Surface
    // ------------------------------------------------------------
    export function NaAudio__Env3d__SceneManager__ClearGroup(surface, groupName) {
        if (!surface || surface.IsDestroyed) return;
        NaAudio__Env3d__SceneManager__EmptyGroup(surface.Groups[groupName]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear Every Group That a Space Load Replaces
    // ------------------------------------------------------------
    // Environment is deliberately excluded: reloading a space must not tear down
    // and rebuild the floor, the grid and the light rig, which would produce a
    // visible flash and pointlessly rebuild geometry that never changed.
    export function NaAudio__Env3d__SceneManager__ClearSpaceContents(surface) {
        if (!surface || surface.IsDestroyed) return;

        for (let i = 0; i < NaAudio__Env3d__SceneGroupSet__SpaceContents.length; i++) {
            NaAudio__Env3d__SceneManager__EmptyGroup(surface.Groups[NaAudio__Env3d__SceneGroupSet__SpaceContents[i]]);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Renderer Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Configured Tone Mapping Curve
    // ------------------------------------------------------------
    // Named in config rather than numbered, because THREE's tone mapping constants
    // are integers whose meaning is invisible in a JSON file. An unrecognised name
    // falls back to Neutral and says so, which is safer than silently reverting to
    // NoToneMapping and clipping every pigment.
    function NaAudio__Env3d__SceneManager__ToneMapping() {
        const curves  =  {
            'None'       : THREE.NoToneMapping,
            'Linear'     : THREE.LinearToneMapping,
            'Reinhard'   : THREE.ReinhardToneMapping,
            'Cineon'     : THREE.CineonToneMapping,
            'ACESFilmic' : THREE.ACESFilmicToneMapping,
            'AGX'        : THREE.AgXToneMapping,
            'Neutral'    : THREE.NeutralToneMapping
        };

        const name   =  Env3dString('Renderer', 'ToneMapping');
        const curve  =  curves[name];

        if (curve === undefined) {
            console.warn('[NaAudio Env3d] Unknown ToneMapping "' + name + '" in Na__Env3d__Config.json - using Neutral.');
            return THREE.NeutralToneMapping;
        }
        return curve;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build and Configure the WebGL Renderer
    // ------------------------------------------------------------
    function NaAudio__Env3d__SceneManager__BuildRenderer() {
        const renderer  =  new THREE.WebGLRenderer({
            antialias : Env3dBool('Renderer', 'Antialias'),
            alpha     : false                                                 // <-- The scene always paints a full paper background
        });

        renderer.domElement.className  =  CSS_CANVAS;
        renderer.toneMapping           =  NaAudio__Env3d__SceneManager__ToneMapping();
        renderer.toneMappingExposure   =  Env3dNumber('Renderer', 'ToneMappingExposure');

        if (Env3dBool('Renderer', 'ShadowsEnabled')) {
            renderer.shadowMap.enabled  =  true;

            // PCF rather than PCFSoft. PCFSoftShadowMap is deprecated as of r184, and
            // the softness this scene wants comes from the light's own shadow radius
            // anyway - see KeyShadowRadius in Na__Env3d__Config.json.
            renderer.shadowMap.type     =  THREE.PCFShadowMap;
        }

        return renderer;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Scene, Its Background and Its Fog
    // ------------------------------------------------------------
    function NaAudio__Env3d__SceneManager__BuildScene() {
        const scene  =  new THREE.Scene();

        scene.background  =  Palette.NaAudio__Palette__Ground('Paper').clone();

        // The fog colour MUST match the background exactly. Fog in any other colour makes
        // the far edge of the floor fade to one value while the sky behind it sits at
        // another, and the horizon becomes a hard visible seam across the whole scene -
        // which is precisely the artefact fog was added to remove.
        if (Env3dBool('GroundStage', 'FogEnabled')) {
            scene.fog  =  new THREE.Fog(
                scene.background.clone(),
                Env3dNumber('GroundStage', 'FogNear'),
                Env3dNumber('GroundStage', 'FogFar')
            );
        }

        return scene;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create an Independent 3D Surface Inside a Host Element
    // ------------------------------------------------------------
    export function NaAudio__Env3d__SceneManager__Create(hostElement) {
        if (!hostElement) return null;

        const renderer  =  NaAudio__Env3d__SceneManager__BuildRenderer();
        const scene     =  NaAudio__Env3d__SceneManager__BuildScene();

        hostElement.appendChild(renderer.domElement);
        hostElement.classList.add(CSS_HOST_ACTIVE);

        const groups  =  {};
        for (let i = 0; i < NaAudio__Env3d__SceneGroupOrder.length; i++) {
            const groupName  =  NaAudio__Env3d__SceneGroupOrder[i];
            const group      =  new THREE.Group();
            group.name       =  'NaAudio__Env3d__Group__' + groupName;
            scene.add(group);
            groups[groupName]  =  group;
        }

        const surface  =  {
            HostElement  : hostElement,
            Renderer     : renderer,
            Scene        : scene,
            Groups       : groups,
            Camera       : null,                                              // <-- Assigned by CameraRig
            Controls     : null,                                              // <-- Assigned by CameraRig
            LastFrameAt  : 0,                                                 // <-- performance.now() reading of the previous frame
            ElapsedTime  : 0,
            FrameDelta   : 0,
            FrameMs      : 0,
            FrameCount   : 0,
            IsDestroyed  : false,
            FrameHandle  : 0,
            ResizeObs    : null,
            UpdateHooks  : []                                                 // <-- Per-frame callbacks, see AddUpdateHook
        };

        NaAudio__Env3d__SceneManager__AttachResizeObserver(surface);
        NaAudio__Env3d__SceneManager__Resize(surface);

        return surface;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register a Per-Frame Update Hook
    // ------------------------------------------------------------
    // The one sanctioned way into the draw loop. Each hook is called with
    // (deltaSeconds, elapsedSeconds, surface) before the render.
    //
    // Hooks are the reason nothing in this application needs its own
    // requestAnimationFrame. Several competing animation loops is how a scene ends
    // up with objects updated twice in one frame and not at all in the next.
    export function NaAudio__Env3d__SceneManager__AddUpdateHook(surface, hook) {
        if (!surface || typeof hook !== 'function') return () => {};
        surface.UpdateHooks.push(hook);

        return function NaAudio__Env3d__SceneManager__RemoveUpdateHook() {
            const index  =  surface.UpdateHooks.indexOf(hook);
            if (index >= 0) surface.UpdateHooks.splice(index, 1);
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sizing
// -----------------------------------------------------------------------------

    // FUNCTION | Resize the Renderer and Camera to the Host Element
    // ------------------------------------------------------------
    export function NaAudio__Env3d__SceneManager__Resize(surface) {
        if (!surface || surface.IsDestroyed) return;

        const width   =  surface.HostElement.clientWidth;
        const height  =  surface.HostElement.clientHeight;
        if (width < MIN_CANVAS_PX || height < MIN_CANVAS_PX) return;          // <-- Host not laid out yet

        const pixelRatio  =  Math.min(window.devicePixelRatio || 1, Env3dNumber('Renderer', 'MaxPixelRatio'));
        surface.Renderer.setPixelRatio(pixelRatio);
        surface.Renderer.setSize(width, height, false);

        if (surface.Camera) {
            surface.Camera.aspect  =  width / height;
            surface.Camera.updateProjectionMatrix();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Watch the Host Element for Size Changes
    // ------------------------------------------------------------
    function NaAudio__Env3d__SceneManager__AttachResizeObserver(surface) {
        if (typeof ResizeObserver !== 'function') {
            window.addEventListener('resize', () => NaAudio__Env3d__SceneManager__Resize(surface));
            return;
        }

        surface.ResizeObs  =  new ResizeObserver(() => NaAudio__Env3d__SceneManager__Resize(surface));
        surface.ResizeObs.observe(surface.HostElement);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Draw Loop
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Continuous Draw Loop
    // ------------------------------------------------------------
    export function NaAudio__Env3d__SceneManager__StartLoop(surface) {
        if (!surface || surface.IsDestroyed || surface.FrameHandle) return;

        surface.LastFrameAt  =  performance.now();

        const frame  =  function NaAudio__Env3d__SceneManager__Frame() {
            if (surface.IsDestroyed) return;

            const frameStart  =  performance.now();

            // Timed from performance.now() rather than THREE.Clock, which is deprecated
            // as of r184. The wall clock is the correct source here in any case: this
            // delta drives ANIMATION only, and every audio event is stamped against the
            // audio clock in the transport instead.
            const rawDelta       =  (frameStart - surface.LastFrameAt) / 1000;
            surface.LastFrameAt  =  frameStart;

            surface.FrameDelta   =  Math.min(rawDelta, MAX_FRAME_DELTA);       // <-- See MAX_FRAME_DELTA_NOTE
            surface.ElapsedTime += surface.FrameDelta;
            surface.FrameCount  += 1;

            const hooks  =  surface.UpdateHooks;
            for (let i = 0; i < hooks.length; i++) {
                try {
                    hooks[i](surface.FrameDelta, surface.ElapsedTime, surface);
                } catch (error) {
                    console.error('[NaAudio Env3d] Update hook threw and was removed:', error);
                    hooks.splice(i, 1);                                        // <-- A hook throwing every frame would bury the console
                    i -= 1;
                }
            }

            if (surface.Camera) surface.Renderer.render(surface.Scene, surface.Camera);

            surface.FrameMs      =  performance.now() - frameStart;
            surface.FrameHandle  =  requestAnimationFrame(frame);
        };

        surface.FrameHandle  =  requestAnimationFrame(frame);
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop the Draw Loop Without Destroying the Surface
    // ------------------------------------------------------------
    export function NaAudio__Env3d__SceneManager__StopLoop(surface) {
        if (!surface || !surface.FrameHandle) return;
        cancelAnimationFrame(surface.FrameHandle);
        surface.FrameHandle  =  0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Destroy a Surface and Release Its GPU Resources
    // ------------------------------------------------------------
    export function NaAudio__Env3d__SceneManager__Destroy(surface) {
        if (!surface || surface.IsDestroyed) return;

        NaAudio__Env3d__SceneManager__StopLoop(surface);
        surface.IsDestroyed  =  true;
        surface.UpdateHooks.length  =  0;

        if (surface.ResizeObs) surface.ResizeObs.disconnect();
        if (surface.Controls && typeof surface.Controls.dispose === 'function') surface.Controls.dispose();

        for (let i = 0; i < NaAudio__Env3d__SceneGroupOrder.length; i++) {
            NaAudio__Env3d__SceneManager__EmptyGroup(surface.Groups[NaAudio__Env3d__SceneGroupOrder[i]]);
        }

        surface.Renderer.dispose();
        if (surface.Renderer.domElement.parentNode) {
            surface.Renderer.domElement.parentNode.removeChild(surface.Renderer.domElement);
        }
        surface.HostElement.classList.remove(CSS_HOST_ACTIVE);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
