// =============================================================================
// VALEVISION3D - PRESENTATION MODE - SCENE CAROUSEL UI
// =============================================================================
//
// FILE       : Na__PresentationMode__UI__SceneCarousel.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Scene Carousel UI
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render and manage the bottom thumbnail carousel for saved camera
//              scenes; handle adaptive layout when Presentation Mode is active
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Listens for 'na-presentation-mode-scenes-loaded' dispatched by the loading
//   sequence (or live dev-editor edits). When received it builds the carousel
//   DOM, applies the top-toolbar adaptive layout class, and shows the carousel
//   when the project asks for it.
// - Each carousel card shows the scene thumbnail (WebP, R2-first with a GH
//   Pages fallback), scene name, and an active highlight ring.
// - The strip shows ONE scene group at a time. The group selector bar is a
//   child of this same container, mounted by its own module; choosing a group
//   there re-aims the strip without moving the camera.
// - Previous / Next chevrons walk the playback order (Group Order, then Scene
//   Order). Running off the end of a group rolls into the next group and the
//   strip rebuilds for it mid-flight; the very end wraps to the very start. A
//   project with no groups behaves exactly as before: one flat strip.
// - Card clicks and chevrons share ONE navigation path, which first offers the
//   scene to any registered navigation router. The 2D drawing systems (floor
//   plans, elevations) register routers in later port phases so their scenes
//   open as drawings instead of flying the perspective camera; a router that
//   declines falls through to the ordinary camera transition.
// - The Views button in the navigation toolbar toggles carousel visibility;
//   this module dispatches 'na-presentation-views-btn-state' so the toolbar
//   module can update button active state.
// - na-presentation-mode-active class on <body> drives the CSS layout switch
//   (toolbar moves from bottom-centre to top, carousel appears at bottom).
//
// INTEGRATION:
// - Initialized from index.html main module after all other UI modules; the
//   group selector bar initialises directly after it and mounts inside
//   #naPresentationCarousel.
// - Requires camera and controls references passed via InitializeSceneCarousel.
// - Reads scene config from Na__PresentationMode__ProjectJson__SceneData.js and
//   group state from Na__PresentationMode__SceneGroups__Data__.js.
// - Calls Na__PresentationMode__Camera__AnimateToScene for transitions.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js
//                   (group filtering, cross-group stepping, navigation router list, empty-group message)
// - Source version: TrueVision v2.18.0 carousel (07-Sep-2026); that file was itself ported from this one on 21-Jun-2026
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.17.0
// - Parity        : adapted
// - Divergences   :
//   - ValeVision keeps its Views-button toggle, the ShowCarouselByDefault gate, the R2 to GH Pages
//     thumbnail fallback and the orbit-pivot re-arm after a flight; TrueVision has none of these.
//   - TrueVision's idle opacity fade and wake flash are not ported; this carousel stays opaque.
//   - Per-scene navigation mode on arrival (added 11-Sep-2026) is handled inside AnimateToScene, so
//     card clicks, chevrons and hotkeys all get it through NavigateToScene with no change here.
// - Back-port     : none pending.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
//
// 10-Jul-2026 - Version 1.1.0
// - Card click / Prev / Next / default-scene navigation each frame the scene
//   to its OWN camera.target (exact SketchUp view) and then re-arm the orbit
//   pivot swap once the transition completes (Na__Navmode__OrbitPivot__
//   InteractionSwap). On the next rotation the OrbitHelperCube becomes the
//   orbit pivot for SketchUp-derived scenes; deliberately human-authored
//   scenes keep their placed target (ShouldTrustSceneOrbitTarget disarms the
//   swap). This replaces a short-lived approach that left the cube as the
//   controls.target during scene switches, which framed the CUBE instead of
//   the shot because OrbitControls.update() runs camera.lookAt(target) every
//   frame.
//
// 09-Sep-2026 - Version 1.2.0
// - Scene groups (port Phase 1). The strip shows only the active group, keeps
//   the group selector bar standing when it rebuilds, steps across group
//   boundaries with the chevrons, and shows a message for an empty group.
// - Navigation router list: Na__PresentationMode__UI__AddSceneNavigationRouter
//   lets the drawing systems take over a scene; card clicks and chevrons now
//   share Na__PresentationMode__UI__NavigateToScene so they cannot diverge.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Helpers
    // @delegate: ./Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__SetActiveConfig,
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__GetSortedScenes,
        Na__PresentationMode__ProjectJson__GetDefaultScene,
        Na__PresentationMode__ProjectJson__GetSceneById,
        Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair,
        Na__PresentationMode__ProjectJson__SetActiveSceneId,
        Na__PresentationMode__ProjectJson__GetActiveSceneId,
        Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget
    } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Group Data Layer
    // @delegate: ./Na__PresentationMode__SceneGroups__Data__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__SceneGroups__IsEnabled,
        Na__PresentationMode__SceneGroups__GetLabels,
        Na__PresentationMode__SceneGroups__GetEnabledGroups,
        Na__PresentationMode__SceneGroups__GetScenesInGroup,
        Na__PresentationMode__SceneGroups__ResolveSceneGroupId,
        Na__PresentationMode__SceneGroups__GetGroupEdgeScene,
        Na__PresentationMode__SceneGroups__GetAdjacentScene,
        Na__PresentationMode__SceneGroups__SetActiveGroupId,
        Na__PresentationMode__SceneGroups__GetActiveGroupId,
        Na__PresentationMode__SceneGroups__ResolveOpeningGroupId
    } from './Na__PresentationMode__SceneGroups__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Asset Fallback Toast Emitter
    // @delegate: ../03__AppUtils/Na__AppUtils__ProjectLoader.js
    // ------------------------------------------------------------
    import { Na__AppUtils__EmitFallbackToast } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Scene Transition
    // @delegate: ./Na__PresentationMode__Camera__SceneTransition.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__Camera__AnimateToScene,
        Na__PresentationMode__Camera__ApplySceneCameraState
    } from './Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Orbit Pivot Interaction Swap (cube pivot kicks in on first rotation)
    // @delegate: ../10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js
    // ------------------------------------------------------------
    import {
        Na__OrbitPivot__Arm,
        Na__OrbitPivot__Disarm
    } from '../10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Configuration Defaults
    // ------------------------------------------------------------
    const Na__PresentationMode__UI__ACTIVE_BODY_CLASS  = 'na-presentation-mode-active';    // <-- Body class that drives top-toolbar layout
    const Na__PresentationMode__UI__CAROUSEL_ID        = 'naPresentationCarousel';         // <-- Root carousel container id
    const Na__PresentationMode__UI__VIEWS_STATE_EVENT  = 'na-presentation-views-btn-state'; // <-- Event to sync Views button
    const Na__PresentationMode__UI__GROUP_EVENT        = 'na-presentation-group-changed';   // <-- Shared with the group selector bar
    const Na__PresentationMode__UI__GROUP_BAR_ID       = 'naPmSceneGroupBar';              // <-- Sibling element this module must not destroy
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Carousel Runtime State
    // ------------------------------------------------------------
    let Na__PresentationMode__UI__Camera          = null;   // <-- Live Three.js PerspectiveCamera reference
    let Na__PresentationMode__UI__Controls        = null;   // <-- Live OrbitControls reference
    let Na__PresentationMode__UI__IsVisible       = false;  // <-- Whether the carousel is currently shown
    let Na__PresentationMode__UI__IsInitialized   = false;  // <-- Guard against double initialization
    let Na__PresentationMode__UI__RenderedGroupId = null;   // <-- Group the strip currently shows; skips redundant rebuilds
    // ------------------------------------------------------------


    // MODULE VARIABLES | Scene Navigation Routers
    // ------------------------------------------------------------
    // The 2D drawing systems register routers here so a plan or elevation
    // scene switches into its own drawing mode instead of flying the
    // perspective camera to a pose it could never read correctly.
    // Registration points INWARD - those systems import this module, never the
    // reverse - so there is no cycle.
    //
    // A LIST rather than a single slot, because more than one system registers
    // and a setter would let whichever initialised last silently unhook the
    // other. Each router declines a scene that is not its own, so the order
    // they register in does not matter.
    // ------------------------------------------------------------
    const Na__PresentationMode__UI__NavigationRouters = [];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Adaptive Layout
// -----------------------------------------------------------------------------

    // FUNCTION | Apply or Remove the Adaptive Presentation Mode Layout Class
    // ------------------------------------------------------------
    // Adding na-presentation-mode-active to <body> triggers the CSS rules
    // that move the toolbar to the top and reveal the carousel at the bottom.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__ApplyAdaptiveLayout(active) {
        if (active) {
            document.body.classList.add(Na__PresentationMode__UI__ACTIVE_BODY_CLASS);     // <-- Switch to top toolbar layout
        } else {
            document.body.classList.remove(Na__PresentationMode__UI__ACTIVE_BODY_CLASS);  // <-- Restore bottom toolbar
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Carousel DOM Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Single Scene Card Element
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__BuildSceneCard(scene, isActive, projectCode) {
        const card = document.createElement('button');
        card.className       = 'na-pm-carousel__card' + (isActive ? ' na-pm-carousel__card--active' : '');
        card.type            = 'button';
        card.dataset.sceneId = scene.PresentationMode__Scene__Id;
        card.title           = scene.PresentationMode__Scene__Name || '';
        card.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        const thumbPair = Na__PresentationMode__ProjectJson__ResolveThumbnailUrlPair(scene, projectCode);  // <-- { primary, fallback }

        if (thumbPair && thumbPair.primary) {
            const img = document.createElement('img');
            img.className = 'na-pm-carousel__thumb';
            img.src       = thumbPair.primary;                              // <-- R2-first primary URL
            img.alt       = scene.PresentationMode__Scene__Name || '';
            img.loading   = 'lazy';

            // R2 -> GH PAGES FALLBACK | Swap once on load failure and notify
            if (thumbPair.fallback && thumbPair.fallback !== thumbPair.primary) {
                img.addEventListener('error', function na_thumb_fallback() {
                    img.removeEventListener('error', na_thumb_fallback);    // <-- Only swap once
                    img.src = thumbPair.fallback;                           // <-- Fall back to GH Pages
                    Na__AppUtils__EmitFallbackToast();                      // <-- Notify the user
                });
            }

            card.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'na-pm-carousel__thumb na-pm-carousel__thumb--placeholder';
            placeholder.textContent = 'IMG';                                 // <-- Placeholder for missing thumbnails
            card.appendChild(placeholder);
        }

        const label = document.createElement('span');
        label.className = 'na-pm-carousel__label';
        label.textContent = scene.PresentationMode__Scene__Name || '';
        card.appendChild(label);

        return card;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render the Placeholder for a Group With No Scenes Yet
    // ------------------------------------------------------------
    // The selector bar is re-mounted into this same container by its own
    // module, so the viewer always keeps a way back out of an empty group.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__RenderEmptyGroupMessage(container) {
        const labels  = Na__PresentationMode__SceneGroups__GetLabels();
        const message = document.createElement('div');
        message.className   = 'na-pm-carousel__empty-group';
        message.textContent = labels.SceneGroups__Labels__EmptyGroupMessage || 'No scenes in this group yet.';
        container.appendChild(message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Scenes the Strip Should Currently Display
    // ------------------------------------------------------------
    // With grouping active the strip shows only the active group's scenes -
    // that is the whole point of the feature, and what stops a project with
    // twenty views from producing an unreadable twenty-card strip. With
    // grouping unavailable or the project ungrouped, every scene is shown, so
    // the carousel behaves exactly as it did before this feature landed.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__GetVisibleScenes() {
        const allScenes = Na__PresentationMode__ProjectJson__GetSortedScenes();
        if (!Na__PresentationMode__SceneGroups__IsEnabled()) return allScenes;

        const config  = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const groupId = Na__PresentationMode__SceneGroups__GetActiveGroupId();
        if (!groupId) return allScenes;                                      // <-- Ungrouped project

        return Na__PresentationMode__SceneGroups__GetScenesInGroup(allScenes, config, groupId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Full Carousel into #naPresentationCarousel
    // ------------------------------------------------------------
    // The group selector bar is a child of this same container (it mounts
    // there so it shows and hides with the carousel). This render therefore
    // clears only ITS OWN children and leaves the bar standing, so the two
    // modules never depend on which one's event listener happens to run first.
    // config.projectCode is optional: the data layer falls back to the project
    // code registered with the active config when it is absent.
    // @delegate: ./Na__PresentationMode__UI__SceneGroupSelector__.js
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__RenderSceneCarousel(config) {
        const container = document.getElementById(Na__PresentationMode__UI__CAROUSEL_ID);
        if (!container) return;

        Array.from(container.children).forEach((child) => {
            if (child.id !== Na__PresentationMode__UI__GROUP_BAR_ID) child.remove(); // <-- Clear the strip, keep the bar
        });

        Na__PresentationMode__UI__RenderedGroupId = Na__PresentationMode__SceneGroups__GetActiveGroupId();

        const scenes = Na__PresentationMode__UI__GetVisibleScenes();
        if (scenes.length === 0) {
            if (Na__PresentationMode__UI__RenderedGroupId) {
                Na__PresentationMode__UI__RenderEmptyGroupMessage(container); // <-- Group exists but holds nothing yet
            }
            return;
        }

        const activeId    = Na__PresentationMode__ProjectJson__GetActiveSceneId();
        const projectCode = (config && config.projectCode) || null;

        // PREV BUTTON
        const prevBtn = document.createElement('button');
        prevBtn.type      = 'button';
        prevBtn.className = 'na-pm-carousel__nav na-pm-carousel__nav--prev';
        prevBtn.innerHTML = '&#8249;';                                       // <-- Single left angle quotation
        prevBtn.setAttribute('aria-label', 'Previous scene');
        prevBtn.addEventListener('click', Na__PresentationMode__UI__HandlePrevClick);
        container.appendChild(prevBtn);

        // CARDS WRAPPER
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'na-pm-carousel__cards';
        cardsWrapper.id        = 'naPmCarouselCards';

        scenes.forEach((scene) => {
            const isActive = scene.PresentationMode__Scene__Id === activeId;
            const card     = Na__PresentationMode__UI__BuildSceneCard(scene, isActive, projectCode);
            card.addEventListener('click', () => Na__PresentationMode__UI__HandleCardClick(scene.PresentationMode__Scene__Id));
            cardsWrapper.appendChild(card);
        });

        container.appendChild(cardsWrapper);

        // NEXT BUTTON
        const nextBtn = document.createElement('button');
        nextBtn.type      = 'button';
        nextBtn.className = 'na-pm-carousel__nav na-pm-carousel__nav--next';
        nextBtn.innerHTML = '&#8250;';                                       // <-- Single right angle quotation
        nextBtn.setAttribute('aria-label', 'Next scene');
        nextBtn.addEventListener('click', Na__PresentationMode__UI__HandleNextClick);
        container.appendChild(nextBtn);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Active Scene Management
// -----------------------------------------------------------------------------

    // FUNCTION | Set Active Scene and Re-Render Carousel Highlights
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__SetActiveScene(sceneId) {
        Na__PresentationMode__ProjectJson__SetActiveSceneId(sceneId);       // <-- Persist in data layer

        // UPDATE CARD HIGHLIGHTS
        const cards = document.querySelectorAll('.na-pm-carousel__card');
        cards.forEach((card) => {
            const isActive = card.dataset.sceneId === sceneId;
            card.classList.toggle('na-pm-carousel__card--active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        // SCROLL ACTIVE CARD INTO VIEW
        const activeCard = document.querySelector(`.na-pm-carousel__card[data-scene-id="${CSS.escape(sceneId)}"]`);
        if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch Which Group the Strip Is Showing
    // ------------------------------------------------------------
    // Called when the chevrons walk off the end of a group and continue into
    // the next one. Rebuilding the strip mid-flight is deliberate: the viewer
    // sees the group name change and the thumbnails swap while the camera is
    // still travelling, which is the cue that there is more here than the set
    // they started in.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__SwitchToGroup(groupId) {
        if (!groupId || groupId === Na__PresentationMode__SceneGroups__GetActiveGroupId()) return;

        Na__PresentationMode__SceneGroups__SetActiveGroupId(groupId);        // <-- Shared state both UI modules read
        Na__PresentationMode__UI__RenderSceneCarousel();                     // <-- Rebuild the strip for the new group

        window.dispatchEvent(new CustomEvent(Na__PresentationMode__UI__GROUP_EVENT, {
            detail : { groupId : groupId, source : 'carousel' }              // <-- Selector bar relabels itself
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Scene Adjacent to the Active Scene by Offset
    // ------------------------------------------------------------
    // Returns { scene, groupId } so the caller knows whether stepping has
    // crossed into a different group. Three cases:
    //
    //  1. Grouping unavailable or project ungrouped - flat wrap over every
    //     scene, exactly the pre-groups behaviour.
    //  2. The active scene sits OUTSIDE the displayed group - which happens
    //     after the viewer re-aims the strip with the dropdown, since that
    //     deliberately leaves the camera parked. Stepping then enters the
    //     displayed group at its own edge rather than resuming a position the
    //     viewer can no longer see.
    //  3. Normal case - step through the (group, scene) playback order, which
    //     rolls into the next group at a group boundary and wraps around the
    //     whole project at the very end.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__GetAdjacentScene(offset) {
        const scenes = Na__PresentationMode__ProjectJson__GetSortedScenes();
        if (scenes.length === 0) return null;

        const config        = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const activeId      = Na__PresentationMode__ProjectJson__GetActiveSceneId();
        const activeGroupId = Na__PresentationMode__SceneGroups__GetActiveGroupId();

        // CASE 1 | No grouping in play
        if (!Na__PresentationMode__SceneGroups__IsEnabled() || !activeGroupId) {
            const currentIdx = scenes.findIndex(s => s.PresentationMode__Scene__Id === activeId);
            const baseIdx    = currentIdx >= 0 ? currentIdx : 0;
            const nextIdx    = (baseIdx + offset + scenes.length) % scenes.length; // <-- Wrap around
            const scene      = scenes[nextIdx];
            return scene ? { scene : scene, groupId : null } : null;
        }

        // CASE 2 | Camera is parked in a group the strip is no longer showing
        const activeScene      = scenes.find(s => s.PresentationMode__Scene__Id === activeId) || null;
        const activeSceneGroup = activeScene
            ? Na__PresentationMode__SceneGroups__ResolveSceneGroupId(activeScene, config)
            : null;

        if (activeSceneGroup !== activeGroupId) {
            const edge  = offset >= 0 ? 'first' : 'last';                    // <-- Enter the group from the matching end
            const scene = Na__PresentationMode__SceneGroups__GetGroupEdgeScene(scenes, config, activeGroupId, edge);
            return scene ? { scene : scene, groupId : activeGroupId } : null;
        }

        // CASE 3 | Ordinary step, crossing group boundaries as it goes
        return Na__PresentationMode__SceneGroups__GetAdjacentScene(scenes, config, activeId, offset);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Navigation Routers
// -----------------------------------------------------------------------------

    // FUNCTION | Register a Scene Navigation Router
    // ------------------------------------------------------------
    // fn(scene) returns true when it has taken ownership of the navigation.
    // Every router returning false falls through to the ordinary camera
    // transition. Registering the same function twice is a no-op rather than
    // a double call, so a re-initialised system cannot route a scene twice.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__AddSceneNavigationRouter(fn) {
        if (typeof fn !== 'function') return false;
        if (Na__PresentationMode__UI__NavigationRouters.indexOf(fn) !== -1) return false;
        Na__PresentationMode__UI__NavigationRouters.push(fn);
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Offer a Scene to Each Router in Turn
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__RouteScene(scene) {
        for (let i = 0; i < Na__PresentationMode__UI__NavigationRouters.length; i++) {
            if (Na__PresentationMode__UI__NavigationRouters[i](scene) === true) return true;
        }
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | User Interaction Handlers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Re-Arm the Cube Pivot Swap After a Scene Is Framed
    // ------------------------------------------------------------
    // Every scene is framed to its OWN camera.target (exact SketchUp view).
    // For SketchUp-derived scenes the cube then becomes the orbit pivot on the
    // first rotation; deliberately human-authored scenes keep their placed
    // orbit target, so the swap is disarmed for them.
    // @delegate: ../10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__ArmOrbitPivotForConfig(config) {
        if (Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget(config)) {
            Na__OrbitPivot__Disarm();                                       // <-- Author's per-scene target stays the pivot
        } else {
            Na__OrbitPivot__Arm();                                          // <-- Cube kicks in on first rotation
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Navigate to One Scene, Honouring Any Router
    // ------------------------------------------------------------
    // The single place a scene is travelled to, so the card click and the
    // prev/next stepper can never diverge in how they handle a scene that a
    // drawing system owns.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__NavigateToScene(scene, sceneId) {
        if (Na__PresentationMode__UI__RouteScene(scene) === true) {
            Na__PresentationMode__UI__SetActiveScene(sceneId);               // <-- A router owns the view; still highlight the card
            return;
        }

        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();

        Na__PresentationMode__Camera__AnimateToScene(
            Na__PresentationMode__UI__Camera,
            Na__PresentationMode__UI__Controls,
            scene,
            {
                onComplete : () => {
                    Na__PresentationMode__UI__SetActiveScene(sceneId);
                    Na__PresentationMode__UI__ArmOrbitPivotForConfig(config); // <-- Re-arm once the scene is framed (not mid-transition)
                }
            }
        );

        Na__PresentationMode__UI__SetActiveScene(sceneId);                  // <-- Update highlight immediately
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Thumbnail Card Click
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__HandleCardClick(sceneId) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const scene  = Na__PresentationMode__ProjectJson__GetSceneById(config, sceneId);
        if (!scene) return;

        Na__PresentationMode__UI__NavigateToScene(scene, sceneId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Step One Scene in Either Direction
    // ------------------------------------------------------------
    // The group is switched BEFORE the highlight is set, so the card the
    // highlight is looking for already exists in the freshly rebuilt strip.
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__StepScene(offset) {
        const step = Na__PresentationMode__UI__GetAdjacentScene(offset);
        if (!step || !step.scene) return;

        const targetScene = step.scene;
        const sceneId     = targetScene.PresentationMode__Scene__Id;

        if (step.groupId) {
            Na__PresentationMode__UI__SwitchToGroup(step.groupId);           // <-- No-op when staying in the same group
        }

        Na__PresentationMode__UI__NavigateToScene(targetScene, sceneId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Previous Button Click
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__HandlePrevClick() {
        Na__PresentationMode__UI__StepScene(-1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Next Button Click
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__HandleNextClick() {
        Na__PresentationMode__UI__StepScene(1);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Carousel Visibility
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle Carousel Visibility
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__ToggleSceneCarousel(forceVisible) {
        const container = document.getElementById(Na__PresentationMode__UI__CAROUSEL_ID);
        if (!container) return;

        const targetVisible = typeof forceVisible === 'boolean'
            ? forceVisible
            : !Na__PresentationMode__UI__IsVisible;                         // <-- Toggle if no explicit value

        Na__PresentationMode__UI__IsVisible = targetVisible;
        container.classList.toggle('na-pm-carousel--visible', targetVisible);

        // NOTIFY VIEWS BUTTON of new state
        window.dispatchEvent(new CustomEvent(Na__PresentationMode__UI__VIEWS_STATE_EVENT, {
            detail : { active : targetVisible }
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Scene Carousel (called from index.html main module)
    // ------------------------------------------------------------
    // camera    {THREE.PerspectiveCamera} - live camera reference
    // controls  {OrbitControls}           - live orbit controls reference
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__InitializeSceneCarousel(camera, controls) {
        if (Na__PresentationMode__UI__IsInitialized) return;               // <-- Guard double init
        Na__PresentationMode__UI__IsInitialized = true;

        Na__PresentationMode__UI__Camera   = camera;                       // <-- Store for transition calls
        Na__PresentationMode__UI__Controls = controls;

        // LISTEN FOR VIEWS BUTTON TOGGLE from navigation toolbar
        window.addEventListener('na-presentation-carousel-toggle', () => {
            Na__PresentationMode__UI__ToggleSceneCarousel();               // <-- Views button was clicked
        });

        // LISTEN FOR SCENES LOADED from loading sequence OR live dev-editor edits
        // detail.skipCameraApply: true when re-dispatched mid-editing, keeps
        // the user's current camera instead of jumping to the default scene.
        window.addEventListener('na-presentation-mode-scenes-loaded', (event) => {
            const detail      = event.detail || {};
            const sceneConfig = detail.sceneConfig;
            if (!sceneConfig) return;

            const projectCode     = detail.projectCode || null;
            const skipCameraApply = detail.skipCameraApply === true;

            Na__PresentationMode__ProjectJson__SetActiveConfig(sceneConfig, projectCode); // <-- Store in data layer

            // SET DEFAULT SCENE
            const defaultScene = Na__PresentationMode__ProjectJson__GetDefaultScene(sceneConfig);

            // RESOLVE OPENING GROUP | The group holding the default scene, so
            // the opening camera position always has its own thumbnail visible
            // and highlighted rather than sitting in a group nobody can see.
            //
            // A still-valid selection is kept, because this same event is
            // re-dispatched on every dev-editor edit: resolving unconditionally
            // would yank the author back to the first group each time they
            // renamed a scene. It only re-resolves when the current selection
            // has gone (fresh load, or the group was deleted or switched off).
            const Na__CurrentGroupId  = Na__PresentationMode__SceneGroups__GetActiveGroupId();
            const Na__GroupStillValid = Na__PresentationMode__SceneGroups__GetEnabledGroups(sceneConfig)
                .some(group => group.PresentationMode__Group__Id === Na__CurrentGroupId);

            if (!Na__GroupStillValid) {
                Na__PresentationMode__SceneGroups__SetActiveGroupId(
                    Na__PresentationMode__SceneGroups__ResolveOpeningGroupId(defaultScene, sceneConfig)
                );
            }

            if (defaultScene) {
                Na__PresentationMode__ProjectJson__SetActiveSceneId(defaultScene.PresentationMode__Scene__Id);
                if (!skipCameraApply) {
                    Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, defaultScene); // <-- Frame the default scene's own view
                    Na__PresentationMode__UI__ArmOrbitPivotForConfig(sceneConfig);                        // <-- Cube kicks in on first rotation (SketchUp scenes)
                }
            }

            // BUILD CAROUSEL UI
            Na__PresentationMode__UI__RenderSceneCarousel({ projectCode });

            // SWITCH TO ADAPTIVE LAYOUT
            Na__PresentationMode__UI__ApplyAdaptiveLayout(true);

            // SHOW CAROUSEL IF CONFIGURED
            const showByDefault = sceneConfig.PresentationMode__SavedCameraScenes__ShowCarouselByDefault;
            Na__PresentationMode__UI__ToggleSceneCarousel(showByDefault === true);

            console.log('[ValeVision3D] Presentation Mode carousel initialized.');
        });

        // LISTEN FOR SCENES CLEARED (dev editor removed all scenes)
        window.addEventListener('na-presentation-mode-scenes-cleared', () => {
            Na__PresentationMode__UI__ToggleSceneCarousel(false);            // <-- Hide carousel
            Na__PresentationMode__UI__ApplyAdaptiveLayout(false);            // <-- Restore bottom-centre toolbar layout
            Na__PresentationMode__SceneGroups__SetActiveGroupId(null);       // <-- Drop the stale selection
            Na__PresentationMode__UI__RenderedGroupId = null;
        });

        // LISTEN FOR A GROUP CHANGE raised by the selector bar
        // ------------------------------------------------------------
        // The camera deliberately does NOT move: re-aiming what you are
        // browsing is not the same as travelling somewhere. Only the strip is
        // rebuilt, and only when the group has actually changed - the guard
        // stops the carousel rebuilding (and losing its scroll position) in
        // response to a change it raised itself.
        // ------------------------------------------------------------
        window.addEventListener(Na__PresentationMode__UI__GROUP_EVENT, (event) => {
            const detail = event.detail || {};
            if (detail.source === 'carousel') return;                        // <-- This module raised it; already rendered
            if (detail.groupId === Na__PresentationMode__UI__RenderedGroupId) return;

            Na__PresentationMode__UI__RenderSceneCarousel();                 // <-- Rebuild the strip for the chosen group
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Hotkey API
// -----------------------------------------------------------------------------

    // FUNCTION | Go to Next Scene (Public - for hotkey dispatch)
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__GoToNextScene()     { Na__PresentationMode__UI__HandleNextClick(); }
    // ------------------------------------------------------------

    // FUNCTION | Go to Previous Scene (Public - for hotkey dispatch)
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__GoToPreviousScene() { Na__PresentationMode__UI__HandlePrevClick(); }
    // ------------------------------------------------------------

    // FUNCTION | Is Carousel Currently Visible (Public - for hotkey guard)
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__IsCarouselVisible() { return Na__PresentationMode__UI__IsVisible; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Carousel UI API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__UI__InitializeSceneCarousel,
        Na__PresentationMode__UI__RenderSceneCarousel,
        Na__PresentationMode__UI__ToggleSceneCarousel,
        Na__PresentationMode__UI__SetActiveScene,
        Na__PresentationMode__UI__AddSceneNavigationRouter,
        Na__PresentationMode__UI__ApplyAdaptiveLayout,
        Na__PresentationMode__UI__GoToNextScene,
        Na__PresentationMode__UI__GoToPreviousScene,
        Na__PresentationMode__UI__IsCarouselVisible
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
