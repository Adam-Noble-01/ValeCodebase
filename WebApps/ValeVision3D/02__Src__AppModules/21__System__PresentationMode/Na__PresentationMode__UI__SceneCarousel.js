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
//   sequence.  When received it builds the carousel DOM, applies the top-
//   toolbar adaptive layout class, and (optionally) starts playback.
// - Each carousel card shows the scene thumbnail (WebP), scene name, and an
//   active highlight ring.
// - Previous / Next chevron buttons step through scenes by Order.
// - Pagination dots reflect the total scene count and current position.
// - Play / Pause button runs an automated slideshow using each scene's
//   TransitionTimeToNextSceneMs for the camera move plus a configurable dwell
//   period before advancing.
// - Clicking a thumbnail card triggers an animated camera transition to that
//   scene using Na__PresentationMode__Camera__AnimateToScene.
// - The Views button in the navigation toolbar toggles carousel visibility;
//   this module dispatches 'na-presentation-views-btn-state' so the toolbar
//   module can update button active state.
// - na-presentation-mode-active class on <body> drives the CSS layout switch
//   (toolbar moves from bottom-centre to top, carousel appears at bottom).
//
// INTEGRATION:
// - Initialized from index.html main module after all other UI modules.
// - Requires camera and controls references passed via InitializeSceneCarousel.
// - Reads scene config from Na__PresentationMode__ProjectJson__SceneData.js.
// - Calls Na__PresentationMode__Camera__AnimateToScene for transitions.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
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
        Na__PresentationMode__ProjectJson__ResolveThumbnailUrl,
        Na__PresentationMode__ProjectJson__SetActiveSceneId,
        Na__PresentationMode__ProjectJson__GetActiveSceneId
    } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Scene Transition
    // @delegate: ./Na__PresentationMode__Camera__SceneTransition.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__Camera__AnimateToScene,
        Na__PresentationMode__Camera__ApplySceneCameraState
    } from './Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Configuration Defaults
    // ------------------------------------------------------------
    const Na__PresentationMode__UI__ACTIVE_BODY_CLASS  = 'na-presentation-mode-active'; // <-- Body class that drives top-toolbar layout
    const Na__PresentationMode__UI__CAROUSEL_ID        = 'naPresentationCarousel';      // <-- Root carousel container id
    const Na__PresentationMode__UI__VIEWS_STATE_EVENT  = 'na-presentation-views-btn-state'; // <-- Event to sync Views button
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Carousel Runtime State
    // ------------------------------------------------------------
    let Na__PresentationMode__UI__Camera       = null;   // <-- Live Three.js PerspectiveCamera reference
    let Na__PresentationMode__UI__Controls     = null;   // <-- Live OrbitControls reference
    let Na__PresentationMode__UI__IsVisible    = false;  // <-- Whether the carousel is currently shown
    let Na__PresentationMode__UI__IsInitialized = false; // <-- Guard against double initialization
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

        const thumbUrl = Na__PresentationMode__ProjectJson__ResolveThumbnailUrl(scene, projectCode);

        if (thumbUrl) {
            const img = document.createElement('img');
            img.className = 'na-pm-carousel__thumb';
            img.src       = thumbUrl;
            img.alt       = scene.PresentationMode__Scene__Name || '';
            img.loading   = 'lazy';
            card.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'na-pm-carousel__thumb na-pm-carousel__thumb--placeholder';
            placeholder.textContent = '📷';                                  // <-- Placeholder for missing thumbnails
            card.appendChild(placeholder);
        }

        const label = document.createElement('span');
        label.className = 'na-pm-carousel__label';
        label.textContent = scene.PresentationMode__Scene__Name || '';
        card.appendChild(label);

        return card;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Full Carousel into #naPresentationCarousel
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__RenderSceneCarousel(config) {
        const container = document.getElementById(Na__PresentationMode__UI__CAROUSEL_ID);
        if (!container) return;

        container.innerHTML = '';                                            // <-- Clear any existing carousel

        const scenes      = Na__PresentationMode__ProjectJson__GetSortedScenes();
        if (scenes.length === 0) return;

        const activeId    = Na__PresentationMode__ProjectJson__GetActiveSceneId();
        const projectCode = config && config.projectCode;

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

        scenes.forEach((scene, index) => {
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


    // HELPER FUNCTION | Get Scene Adjacent to the Active Scene by Offset
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__GetAdjacentScene(offset) {
        const scenes  = Na__PresentationMode__ProjectJson__GetSortedScenes();
        if (scenes.length === 0) return null;

        const activeId    = Na__PresentationMode__ProjectJson__GetActiveSceneId();
        const currentIdx  = scenes.findIndex(s => s.PresentationMode__Scene__Id === activeId);
        const baseIdx     = currentIdx >= 0 ? currentIdx : 0;
        const nextIdx     = (baseIdx + offset + scenes.length) % scenes.length; // <-- Wrap around

        return scenes[nextIdx] || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | User Interaction Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Thumbnail Card Click
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__HandleCardClick(sceneId) {
        const config    = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const scene     = Na__PresentationMode__ProjectJson__GetSceneById(config, sceneId);
        if (!scene) return;

        Na__PresentationMode__Camera__AnimateToScene(
            Na__PresentationMode__UI__Camera,
            Na__PresentationMode__UI__Controls,
            scene,
            {
                onComplete : () => Na__PresentationMode__UI__SetActiveScene(sceneId)
            }
        );

        Na__PresentationMode__UI__SetActiveScene(sceneId);                  // <-- Update highlight immediately
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Previous Button Click
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__HandlePrevClick() {
        const prevScene = Na__PresentationMode__UI__GetAdjacentScene(-1);
        if (!prevScene) return;

        const sceneId = prevScene.PresentationMode__Scene__Id;
        Na__PresentationMode__Camera__AnimateToScene(
            Na__PresentationMode__UI__Camera,
            Na__PresentationMode__UI__Controls,
            prevScene,
            { onComplete : () => Na__PresentationMode__UI__SetActiveScene(sceneId) }
        );

        Na__PresentationMode__UI__SetActiveScene(sceneId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Next Button Click
    // ------------------------------------------------------------
    function Na__PresentationMode__UI__HandleNextClick() {
        const nextScene = Na__PresentationMode__UI__GetAdjacentScene(1);
        if (!nextScene) return;

        const sceneId = nextScene.PresentationMode__Scene__Id;
        Na__PresentationMode__Camera__AnimateToScene(
            Na__PresentationMode__UI__Camera,
            Na__PresentationMode__UI__Controls,
            nextScene,
            { onComplete : () => Na__PresentationMode__UI__SetActiveScene(sceneId) }
        );

        Na__PresentationMode__UI__SetActiveScene(sceneId);
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
        // detail.skipCameraApply: true when re-dispatched mid-editing — keeps
        // the user's current camera instead of jumping to the default scene.
        window.addEventListener('na-presentation-mode-scenes-loaded', (event) => {
            const detail      = event.detail || {};
            const sceneConfig = detail.sceneConfig;
            if (!sceneConfig) return;

            const projectCode    = detail.projectCode || null;
            const skipCameraApply = detail.skipCameraApply === true;

            Na__PresentationMode__ProjectJson__SetActiveConfig(sceneConfig, projectCode); // <-- Store in data layer

            // SET DEFAULT SCENE
            const defaultScene = Na__PresentationMode__ProjectJson__GetDefaultScene(sceneConfig);
            if (defaultScene) {
                Na__PresentationMode__ProjectJson__SetActiveSceneId(defaultScene.PresentationMode__Scene__Id);
                if (!skipCameraApply) {
                    Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, defaultScene); // <-- Jump to default scene
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
        });
    }
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
        Na__PresentationMode__UI__ApplyAdaptiveLayout
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
