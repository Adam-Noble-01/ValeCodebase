// =============================================================================
// VALEVISION3D - PRESENTATION MODE - DEV MENU SCENE ROW BUILDERS
// =============================================================================
//
// FILE       : Na__PresentationMode__DevMenu__SceneRowBuilders__.js
// NAMESPACE  : Na__PmRows
// MODULE     : PresentationMode - Dev Menu Scene Row Builders
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the per-scene editor row (header, name, group, FOV, move
//              speed, easing, position and action buttons) for the Dev menu
//              Presentation Scenes panel
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Purely presentational. Every state change is handed back to the scene
//   editor through the handlers object, so this module holds no working
//   array, never saves and never talks to R2. Splitting it out keeps the scene
//   editor inside the house line budget now that grouping, reordering and drag
//   and drop live there.
// - A ROW FOLDS. Collapsed it is a header strip (drag handle, "#N - Name"
//   where N is the position WITHIN the scene's group, a LAYOUT chip when the
//   scene is hidden from the viewer, and the move up/down arrows). The body is
//   built either way and hidden by a class, which is what lets the editor
//   re-point the panel from a carousel click without rebuilding it.
// - Open, a row reads: the scene's saved thumbnail beside the Name field and
//   the Group dropdown; the FOV slider with live viewport preview and the move
//   speed value box on the same line; then Advanced (collapsed) holding
//   Position, the Nav Mode switch, Easing and the layout-editor-only flag;
//   then Preview, Update Scene and Delete.
// - The drag handle is the ONLY thing that arms a drag on the row, so the
//   sliders stay usable and selecting text in the name field never starts a
//   drag.
//
// HANDLERS CONTRACT (all optional except onMutate):
// - handlers.camera                      : live perspective camera for the FOV preview
// - handlers.focusedSceneId              : the one scene id whose row is open
// - handlers.onFocusToggle(sceneId|null) : the title was clicked; open that scene, or fold everything
// - handlers.isAdvancedOpen(sceneId)     : should this row's Advanced section start open?
// - handlers.onAdvancedToggle(id, open)  : remember an Advanced fold across rebuilds
// - handlers.onPreview(sceneId)          : fly to this scene (routed, so drawings open their own mode)
// - handlers.onMoveByOffset(sceneId, +-1): reorder arrows
// - handlers.onMoveToPosition(sceneId, n): Position field, 1-based within the group
// - handlers.onMutate(action, scene)     : 'regroup' | 'update' | 'flag' | 'delete'
//
// INTEGRATION:
// - Consumed only by Na__PresentationMode__DevMenu__SceneEditor.js.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js
//                   (Na__PmDev__BuildSceneRow, BuildGroupRow, BuildFovRow, BuildTransitionRow, BuildEasingRow,
//                   and the Position field) plus the pre-port ValeVision row builders
// - Source version: TrueVision v2.19.0 scene editor (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.17.0
// - Parity        : adapted (split out of the editor)
// - Divergences   :
//   - Nav Mode reads Orbit | Fly | Walk left to right like the Video Studio menu; TrueVision reads
//     Orbit | Walk | Fly.
//   - No layer-timing row. TrueVision offers a per-scene "switch layers before the camera move"
//     choice; this app applies model layers instantly at the start of a flight ON PURPOSE - an
//     instant cut reads better than a mid-flight pop-out - so the choice would control nothing.
// - Back-port     : the split itself is worth carrying to TrueVision, whose editor is over budget.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.2.0 (Presentation Scenes alignment with TrueVision)
// - Rows fold. The header title is the fold control; the editor decides which
//   single row is open.
// - Each open row shows the scene's saved thumbnail beside Name and Group,
//   which is the only picture a layout-editor-only scene has anywhere.
// - Move Speed lost its slider and became a value box on the FOV line. Two
//   sliders for two settings, one of which is set once a project, was most of
//   the height of every row.
// - Added an Advanced fold holding Position, Nav Mode, Easing and the new
//   layout-editor-only flag.
// - Update Camera, Regen Thumb and Save Scene collapsed into one Update Scene,
//   matching TrueVision: three presses for one gesture, with every ordering of
//   them saving a slightly different subset. Preview took the space.
//

// 11-Sep-2026 - Version 1.1.0
// - Nav Mode switch (Orbit | Fly | Walk) under the Group dropdown. Writes
//   PresentationMode__Scene__NavigationMode on the working copy ('walk' or
//   'fly'; orbit deletes the key). Not shown on drawing cards.
//
// 09-Sep-2026 - Version 1.0.1 (port Phase 2)
// - Update Camera is withheld on floor plan and elevation scenes.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation (port Phase 1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Scene Group Data Layer
    // @delegate: ./Na__PresentationMode__SceneGroups__Data__.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__SceneGroups__IsEnabled,
        Na__PresentationMode__SceneGroups__GetEnabledGroups,
        Na__PresentationMode__SceneGroups__ResolveSceneGroupId
    } from './Na__PresentationMode__SceneGroups__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Data Accessors
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__ResolveThumbnailUrl,
        Na__PresentationMode__ProjectJson__LAYOUT_ONLY_KEY
    } from './Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation (FOV slider live preview)
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Per-Scene Navigation Mode (key and resolution)
    // @delegate: ./Na__PresentationMode__Camera__SceneTransition.js
    // @delegate: ../10__NavigationAndCameras/Na__NavigationModes__Switcher.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__KEY__NAVIGATION_MODE,
        Na__PresentationMode__Camera__ResolveSceneNavigationMode
    } from './Na__PresentationMode__Camera__SceneTransition.js';
    import {
        Na__NavigationModes__IsModeAvailable,
        Na__NavigationModes__GetModeLabel
    } from '../10__NavigationAndCameras/Na__NavigationModes__Switcher.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing Rename (a drawing card's name is not ours)
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js
    // ------------------------------------------------------------
    import {
        Na__DrawRename__OwnsScene,
        Na__DrawRename__RenameSceneCard
    } from '../42__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Slider Ranges and Defaults
    // ------------------------------------------------------------
    const Na__PmRows__FOV_MIN            = 5;     // <-- Minimum FOV degrees
    const Na__PmRows__FOV_MAX            = 90;    // <-- Maximum FOV degrees
    const Na__PmRows__FOV_DEFAULT        = 30;    // <-- Default FOV when not set
    const Na__PmRows__TRANSITION_MIN_MS  = 300;   // <-- Minimum transition duration
    const Na__PmRows__TRANSITION_MAX_MS  = 8000;  // <-- Maximum transition duration
    const Na__PmRows__TRANSITION_DEFAULT = 1800;  // <-- Default transition duration
    const Na__PmRows__SENSOR_HEIGHT_MM   = 24;    // <-- Full-frame sensor height (matches cameraLens AppConfig)
    const Na__PmRows__EASING_OPTIONS     = ['easeInOutCubic', 'easeInOutQuad', 'linear']; // <-- Available easing names
    const Na__PmRows__NAV_MODES          = ['orbit', 'fly', 'walk'];  // <-- Switch order, left to right, as in the Video Studio menu
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lens Conversion Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert FOV Degrees to Focal Length MM
    // ------------------------------------------------------------
    function Na__PmRows__FovToFocalMm(fovDegrees) {
        const fovRad = (fovDegrees * Math.PI) / 180;
        return Na__PmRows__SENSOR_HEIGHT_MM / (2 * Math.tan(fovRad / 2)); // <-- Inverse tangent formula
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Focal Length MM to FOV Degrees
    // ------------------------------------------------------------
    function Na__PmRows__FocalMmToFov(focalMm) {
        return (2 * Math.atan(Na__PmRows__SENSOR_HEIGHT_MM / (2 * focalMm)) * 180) / Math.PI; // <-- Arctangent formula
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sub-Row Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Labelled Row Shell
    // ------------------------------------------------------------
    function Na__PmRows__BuildLabelledRow(labelText, className) {
        const row = document.createElement('div');
        row.className = className || 'na-pm-dev__row';

        const label = document.createElement('label');
        label.className   = 'na-pm-dev__label';
        label.textContent = labelText;
        row.appendChild(label);

        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Move Speed Value Box
    // ------------------------------------------------------------
    // A NUMBER BOX, NOT A SLIDER, AND IT SHARES THE FOV'S ROW.
    //
    // Move speed is a transition duration in seconds. It is set once for a
    // project, if ever - almost every scene in every project is on the 1.8s
    // default - and yet it was carrying a full-width slider of its own on
    // every row, which is a whole line of panel height per scene spent on a
    // number nobody changes. FOV keeps its slider because framing a view is
    // exactly the kind of thing you want to drag and watch.
    //
    // Seconds in, milliseconds out: the JSON field is milliseconds, and the
    // author thinks in seconds because that is what the readout has always
    // said. Clamped to the same bounds the slider enforced, so a typo cannot
    // write a forty-second flight into the project.
    // ------------------------------------------------------------
    function Na__PmRows__BuildMoveSpeedBox(scene, onChange) {
        const currentMs = Number.isFinite(scene.PresentationMode__Scene__TransitionTimeToNextSceneMs)
            ? scene.PresentationMode__Scene__TransitionTimeToNextSceneMs
            : Na__PmRows__TRANSITION_DEFAULT;

        const wrap = document.createElement('span');
        wrap.className = 'na-pm-dev__inline-field';
        wrap.title     = 'Move speed: how long the camera takes to fly to this scene, in seconds';

        const label = document.createElement('span');
        label.className   = 'na-pm-dev__inline-label';
        label.textContent = 'Move';
        wrap.appendChild(label);

        const input = document.createElement('input');
        input.type      = 'number';
        input.className = 'na-pm-dev__input na-pm-dev__input--tiny';
        input.min       = (Na__PmRows__TRANSITION_MIN_MS / 1000).toFixed(1);
        input.max       = (Na__PmRows__TRANSITION_MAX_MS / 1000).toFixed(1);
        input.step      = '0.1';
        input.value     = (currentMs / 1000).toFixed(1);
        wrap.appendChild(input);

        const suffix = document.createElement('span');
        suffix.className   = 'na-pm-dev__inline-suffix';
        suffix.textContent = 's';
        wrap.appendChild(suffix);

        input.addEventListener('change', () => {
            const seconds = parseFloat(input.value);
            if (!Number.isFinite(seconds)) {
                input.value = (currentMs / 1000).toFixed(1);                // <-- Reject junk, restore what is stored
                return;
            }
            const ms = Math.round(
                Math.max(Na__PmRows__TRANSITION_MIN_MS, Math.min(seconds * 1000, Na__PmRows__TRANSITION_MAX_MS))
            );
            input.value = (ms / 1000).toFixed(1);                           // <-- Show the clamped value back
            onChange(ms);
        });

        return wrap;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the FOV Slider Row, With Move Speed Beside It
    // ------------------------------------------------------------
    function Na__PmRows__BuildFovRow(scene, onFovChange, onMoveSpeedChange) {
        const currentFov = (scene.PresentationMode__Scene__CameraPosition
            && scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc
            && scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc.Camera__DefaultMisc__Fov)
            || Na__PmRows__FOV_DEFAULT;

        const currentMm = Math.round(Na__PmRows__FovToFocalMm(currentFov));

        const row = Na__PmRows__BuildLabelledRow('FOV', 'na-pm-dev__slider-row na-pm-dev__slider-row--fov');
        const label = row.querySelector('.na-pm-dev__label');
        if (label) label.classList.add('na-pm-dev__label--inline');

        const slider = document.createElement('input');
        slider.type      = 'range';
        slider.className = 'na-pm-dev__slider';
        slider.min       = Na__PmRows__FOV_MIN;
        slider.max       = Na__PmRows__FOV_MAX;
        slider.step      = '0.1';
        slider.value     = currentFov.toFixed(1);
        slider.title     = 'Field of view for this scene, with the equivalent full-frame lens beside it';

        const valueDisplay = document.createElement('span');
        valueDisplay.className   = 'na-pm-dev__value';
        valueDisplay.textContent = `${currentFov.toFixed(1)}° / ${currentMm}mm`;   // <-- Degree glyph: the row shares its width with the move speed box

        slider.addEventListener('input', () => {
            const fov   = parseFloat(slider.value);
            const lenMm = Math.round(Na__PmRows__FovToFocalMm(fov));
            valueDisplay.textContent = `${fov.toFixed(1)}° / ${lenMm}mm`;          // <-- Live readout
            onFovChange(fov);
        });

        row.appendChild(slider);
        row.appendChild(valueDisplay);
        row.appendChild(Na__PmRows__BuildMoveSpeedBox(scene, onMoveSpeedChange));
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Layout-Editor-Only Checkbox Row
    // ------------------------------------------------------------
    // OFF BY DEFAULT, and off means the key is absent rather than false, so
    // ticking this is the only thing that ever writes it.
    //
    // A drawing sheet needs framings a viewer should never be flown to - a
    // facade square-on at a focal length that makes a building read as an
    // elevation, a corner cropped tight enough to show a cill. Those are real
    // scenes with real cameras and they belong in the project; they just do
    // not belong in a strip of thumbnails somebody is browsing. Ticked, the
    // scene keeps its place here and in the Layout Editor's viewport picker,
    // stays reachable through Preview, and leaves the carousel.
    // ------------------------------------------------------------
    function Na__PmRows__BuildLayoutOnlyRow(scene, onChange) {
        const isLayoutOnly = scene[Na__PresentationMode__ProjectJson__LAYOUT_ONLY_KEY] === true;

        const row = document.createElement('div');
        row.className = 'na-pm-dev__row na-pm-dev__row--checkbox';

        const label = document.createElement('label');
        label.className = 'na-pm-dev__checkbox-label';
        label.title     = 'Keep this scene for drawing sheets only. It stays in this menu, stays available to the '
                        + 'Layout Editor and can still be previewed - it just never appears in the viewer carousel.';

        const checkbox = document.createElement('input');
        checkbox.type      = 'checkbox';
        checkbox.className = 'na-pm-dev__checkbox';
        checkbox.checked   = isLayoutOnly;

        const text = document.createElement('span');
        text.className   = 'na-pm-dev__checkbox-text';
        text.textContent = 'Layout editor only - hide from the viewer carousel';

        checkbox.addEventListener('change', () => {
            onChange(checkbox.checked === true);
        });

        label.appendChild(checkbox);
        label.appendChild(text);
        row.appendChild(label);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Thumbnail + Identity Block for an Open Row
    // ------------------------------------------------------------
    // The scene's own saved thumbnail, at the size a card would be if it had
    // one. Two reasons it earns the space:
    //
    //  - It is the visual confirmation that the row you are editing is the
    //    view you think it is, without flying anywhere to check.
    //  - For a layout-editor-only scene it is the ONLY picture of that scene
    //    anywhere in the app. Those scenes have no card, so without this the
    //    panel was asking you to author a view you could not see.
    //
    // A scene with no thumbnail yet gets the same frame with a hint in it,
    // rather than a broken image or a gap that reads as a layout bug.
    // ------------------------------------------------------------
    function Na__PmRows__BuildThumbBlock(scene, onPreview) {
        const frame = document.createElement('button');
        frame.type      = 'button';
        frame.className = 'na-pm-dev__thumb';
        frame.title     = 'Fly to this scene';

        const thumbUrl = Na__PresentationMode__ProjectJson__ResolveThumbnailUrl(scene);

        if (thumbUrl) {
            const img = document.createElement('img');
            img.className = 'na-pm-dev__thumb-img';
            img.src       = thumbUrl;
            img.alt       = scene.PresentationMode__Scene__Name || '';
            img.loading   = 'lazy';
            img.addEventListener('error', () => {
                img.remove();                                                // <-- Stored path exists, image does not (yet)
                frame.classList.add('na-pm-dev__thumb--empty');
                frame.textContent = 'No image';
            });
            frame.appendChild(img);
        } else {
            frame.classList.add('na-pm-dev__thumb--empty');
            frame.textContent = 'No image';
        }

        frame.addEventListener('click', () => { if (typeof onPreview === 'function') onPreview(); });
        return frame;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Easing Dropdown Row
    // ------------------------------------------------------------
    function Na__PmRows__BuildEasingRow(scene, onChange) {
        const currentEasing = scene.PresentationMode__Scene__TransitionEasing || 'easeInOutCubic';

        const row = Na__PmRows__BuildLabelledRow('Easing');

        const select = document.createElement('select');
        select.className = 'na-pm-dev__select';

        Na__PmRows__EASING_OPTIONS.forEach((opt) => {
            const option    = document.createElement('option');
            option.value    = opt;
            option.text     = opt;
            option.selected = opt === currentEasing;
            select.appendChild(option);
        });

        select.addEventListener('change', () => onChange(select.value));

        row.appendChild(select);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Per-Scene Group Dropdown Row
    // ------------------------------------------------------------
    // Lists only ENABLED groups, which is what makes "a scene assigned to a
    // switched-off group" impossible to author rather than something the
    // viewer has to be protected from at runtime. A scene that has never been
    // assigned shows the group it currently falls back into, so the dropdown
    // always tells the truth about where the scene actually is.
    //
    // Returns null when the project has no groups, so an ungrouped project's
    // rows look exactly as they did before this feature existed.
    // ------------------------------------------------------------
    function Na__PmRows__BuildGroupRow(scene, onChange) {
        if (!Na__PresentationMode__SceneGroups__IsEnabled()) return null;

        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const groups = Na__PresentationMode__SceneGroups__GetEnabledGroups(config);
        if (groups.length === 0) return null;                                // <-- Ungrouped project

        const currentGroupId = Na__PresentationMode__SceneGroups__ResolveSceneGroupId(scene, config);

        const row = Na__PmRows__BuildLabelledRow('Group');

        const select = document.createElement('select');
        select.className = 'na-pm-dev__select';
        select.title     = 'Which group of the carousel this scene appears in';

        groups.forEach((group) => {
            const groupId   = group.PresentationMode__Group__Id;
            const option    = document.createElement('option');
            option.value    = groupId;
            option.text     = group.PresentationMode__Group__Name || groupId;
            option.selected = groupId === currentGroupId;
            select.appendChild(option);
        });

        select.addEventListener('change', () => onChange(select.value));

        row.appendChild(select);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Per-Scene Navigation Mode Switch Row
    // ------------------------------------------------------------
    // Orbit | Fly | Walk, the same switch as the Video Studio keyframe menu.
    // It is the mode the Views carousel lands the camera in when this scene is
    // picked, and Update Camera resets it to whatever mode the camera is in.
    // Like the other fields here it edits the working copy; Save Scene keeps it.
    //
    // Modes switched off for the model are shown disabled rather than hidden,
    // so the switch keeps its shape on every project and says why.
    //
    // Returns null for a floor plan or elevation card: a drawing is never
    // walked or flown, and its camera belongs to the drawing.
    // ------------------------------------------------------------
    function Na__PmRows__BuildNavigationModeRow(scene, onChange) {
        if (scene.PresentationMode__Scene__FloorPlanId || scene.PresentationMode__Scene__ElevationId) return null;

        const row   = Na__PmRows__BuildLabelledRow('Nav Mode');
        const group = document.createElement('div');
        group.className = 'na-pm-dev__segmented';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Navigation mode');

        const currentMode = Na__PresentationMode__Camera__ResolveSceneNavigationMode(scene);
        const buttons     = [];

        Na__PmRows__NAV_MODES.forEach((mode) => {
            const label  = Na__NavigationModes__GetModeLabel(mode);
            const button = document.createElement('button');
            button.type        = 'button';
            button.className   = 'na-pm-dev__segment';
            button.textContent = label;

            if (!Na__NavigationModes__IsModeAvailable(mode)) {
                button.disabled = true;
                button.title    = `${label} mode is switched off for this model`;
            } else {
                button.title    = `Show this scene in ${label} mode`;
            }

            const isActive = (mode === currentMode);
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));

            button.addEventListener('click', () => {
                if (button.classList.contains('is-active')) return;          // <-- Already this mode

                buttons.forEach((other) => {
                    const nowActive = (other === button);
                    other.classList.toggle('is-active', nowActive);
                    other.setAttribute('aria-pressed', String(nowActive));
                });
                onChange(mode);
            });

            buttons.push(button);
            group.appendChild(button);
        });

        row.appendChild(group);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Position Field Row (1-based within the group)
    // ------------------------------------------------------------
    // Always shows the visible #N, never a stale sparse Order value, and asks
    // the editor to move the scene when a different position is typed.
    // ------------------------------------------------------------
    function Na__PmRows__BuildPositionRow(sceneId, indexInGroup, countInGroup, onMoveToPosition) {
        const row = Na__PmRows__BuildLabelledRow('Position');

        const input = document.createElement('input');
        input.type      = 'number';
        input.className = 'na-pm-dev__input na-pm-dev__input--short';
        input.min       = 1;
        input.max       = countInGroup;
        input.value     = indexInGroup + 1;
        input.title     = 'Type a position to move this scene there (within its group)';

        input.addEventListener('change', () => {
            const requested = parseInt(input.value, 10);
            if (!Number.isFinite(requested)) {
                input.value = indexInGroup + 1;                              // <-- Reject junk, restore displayed position
                return;
            }
            const clamped = Math.max(1, Math.min(requested, countInGroup));
            if (clamped === indexInGroup + 1) {
                input.value = clamped;                                       // <-- No move needed, just tidy the field
                return;
            }
            if (typeof onMoveToPosition === 'function') onMoveToPosition(sceneId, clamped); // <-- Reorder, renumber, save, rebuild
        });

        row.appendChild(input);
        return row;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Row Builder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Header Strip (drag handle, fold title, reorder arrows)
    // ------------------------------------------------------------
    // The title is the FOLD CONTROL for this row. Everything below the header
    // is built but hidden until this row is the focused one.
    // ------------------------------------------------------------
    function Na__PmRows__BuildHeader(wrapper, scene, indexInGroup, countInGroup, handlers, isFocused) {
        const sceneId      = scene.PresentationMode__Scene__Id;
        const isLayoutOnly = scene[Na__PresentationMode__ProjectJson__LAYOUT_ONLY_KEY] === true;

        const header = document.createElement('div');
        header.className = 'na-pm-dev__scene-header';
        header.setAttribute('aria-expanded', String(isFocused));

        // DRAG HANDLE | Only the handle arms dragging, so sliders stay usable
        const dragHandle = document.createElement('span');
        dragHandle.className   = 'na-pm-dev__drag-handle';
        dragHandle.textContent = '≡';                                   // <-- Grip glyph (identical-to sign)
        dragHandle.title       = 'Drag to reorder this scene within its group';
        dragHandle.setAttribute('aria-hidden', 'true');
        dragHandle.addEventListener('mousedown', () => { wrapper.draggable = true;  });
        dragHandle.addEventListener('mouseup',   () => { wrapper.draggable = false; });
        header.appendChild(dragHandle);

        // FOLD BUTTON | The title IS the control that opens this scene
        const titleBtn = document.createElement('button');
        titleBtn.type      = 'button';
        titleBtn.className = 'na-pm-dev__scene-title-btn';
        titleBtn.title     = 'Open this scene for editing (closes the others)';

        const arrow = document.createElement('span');
        arrow.className = 'na-pm-dev__scene-arrow';
        arrow.innerHTML = '&#9662;';
        arrow.setAttribute('aria-hidden', 'true');
        titleBtn.appendChild(arrow);

        const titleEl = document.createElement('strong');
        titleEl.className   = 'na-pm-dev__scene-title';
        titleEl.textContent = `#${indexInGroup + 1} - ${scene.PresentationMode__Scene__Name || sceneId}`;
        titleBtn.appendChild(titleEl);

        // LAYOUT-ONLY BADGE | Readable on a FOLDED row, which is the only place
        // it can do its job: telling you at a glance which of twenty collapsed
        // scenes are the ones the viewer never sees.
        if (isLayoutOnly) {
            const badge = document.createElement('span');
            badge.className   = 'na-pm-dev__scene-badge';
            badge.textContent = 'LAYOUT';
            badge.title       = 'Layout editor only - hidden from the viewer carousel';
            titleBtn.appendChild(badge);
        }

        titleBtn.addEventListener('click', () => {
            if (typeof handlers.onFocusToggle === 'function') {
                handlers.onFocusToggle(wrapper.classList.contains('is-open') ? null : sceneId);
            }
        });
        header.appendChild(titleBtn);

        // MOVE UP / MOVE DOWN | Keyboard-reachable alternative to dragging
        const moveUpBtn = document.createElement('button');
        moveUpBtn.type        = 'button';
        moveUpBtn.className   = 'na-pm-dev__reorder-btn';
        moveUpBtn.textContent = '▲';
        moveUpBtn.title       = 'Move this scene one position earlier';
        moveUpBtn.disabled    = indexInGroup === 0;                          // <-- Already first in its group
        moveUpBtn.addEventListener('click', () => {
            if (typeof handlers.onMoveByOffset === 'function') handlers.onMoveByOffset(sceneId, -1);
        });
        header.appendChild(moveUpBtn);

        const moveDownBtn = document.createElement('button');
        moveDownBtn.type        = 'button';
        moveDownBtn.className   = 'na-pm-dev__reorder-btn';
        moveDownBtn.textContent = '▼';
        moveDownBtn.title       = 'Move this scene one position later';
        moveDownBtn.disabled    = indexInGroup === countInGroup - 1;         // <-- Already last in its group
        moveDownBtn.addEventListener('click', () => {
            if (typeof handlers.onMoveByOffset === 'function') handlers.onMoveByOffset(sceneId, 1);
        });
        header.appendChild(moveDownBtn);

        wrapper.appendChild(header);
        return titleEl;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Action Buttons Row
    // ------------------------------------------------------------
    // THREE BUTTONS, NOT FOUR. Update Camera, Regen Thumb and Save Scene were
    // three presses for one gesture - "I have reframed this view" - and every
    // ordering of those presses saved a slightly different subset. They are
    // now one Update Scene that recaptures the pose, the FOV, the model layers
    // and the navigation mode, re-renders the thumbnail and saves, matching
    // TrueVision. Preview takes the place they left.
    //
    // A DRAWING SCENE'S CAMERA IS DERIVED, NOT CAPTURED. A floor plan or
    // elevation scene holds the pose its own definition produces, and that
    // pose is rewritten by the drawing's own editor whenever its datum or
    // plane moves. Recapturing the live view into one would overwrite it with
    // wherever the perspective camera happened to be parked. Blocked here and
    // signposted, rather than left as a button that quietly does damage.
    // ------------------------------------------------------------
    function Na__PmRows__BuildActions(scene, onMutate, onPreview) {
        const actionsRow = document.createElement('div');
        actionsRow.className = 'na-pm-dev__actions';

        const isDrawingScene = Boolean(scene.PresentationMode__Scene__FloorPlanId || scene.PresentationMode__Scene__ElevationId);

        // PREVIEW | Go and look at it
        const previewBtn = document.createElement('button');
        previewBtn.type        = 'button';
        previewBtn.className   = 'na-pm-dev__btn';
        previewBtn.textContent = 'Preview';
        previewBtn.title       = 'Fly the viewport to this scene without changing anything';
        previewBtn.addEventListener('click', () => { if (typeof onPreview === 'function') onPreview(); });
        actionsRow.appendChild(previewBtn);

        // UPDATE SCENE | The single "update scene" gesture
        const updateBtn = document.createElement('button');
        updateBtn.type        = 'button';
        updateBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--primary';
        updateBtn.textContent = 'Update Scene';
        updateBtn.title       = 'Recapture the live view into this scene - camera, FOV, model layers, navigation mode and thumbnail - then save';

        if (isDrawingScene) {
            updateBtn.disabled = true;
            updateBtn.title    = 'This is a drawing scene. Its camera is set by the drawing that owns it, '
                               + 'not by the live 3D view - use that drawing\'s own panel instead.';
        }

        updateBtn.addEventListener('click', () => {
            if (updateBtn.disabled) return;
            onMutate('update', scene);                                       // <-- The editor confirms, captures and saves
        });
        actionsRow.appendChild(updateBtn);

        // DELETE | Given its own line so it is never the button beside the one
        // that was aimed at.
        const deleteBtn = document.createElement('button');
        deleteBtn.type        = 'button';
        deleteBtn.className   = 'na-pm-dev__btn na-pm-dev__btn--danger na-pm-dev__btn--trailing';
        deleteBtn.textContent = 'Delete';
        deleteBtn.title       = 'Delete this scene from the project';
        deleteBtn.addEventListener('click', () => onMutate('delete', scene));
        actionsRow.appendChild(deleteBtn);

        return actionsRow;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Single Scene Editor Row
    // ------------------------------------------------------------
    // A FOLDED ROW IS A HEADER AND NOTHING ELSE. The body - every field and
    // every button - is built but hidden until this row is the focused one.
    // Building it regardless keeps the fold a pure class toggle, which is what
    // lets a carousel click re-point the panel without a rebuild.
    // ------------------------------------------------------------
    function Na__PresentationMode__DevMenu__BuildSceneRow(scene, indexInGroup, countInGroup, handlers) {
        const sceneId      = scene.PresentationMode__Scene__Id;
        const onMutate     = (handlers && typeof handlers.onMutate === 'function') ? handlers.onMutate : () => {};
        const safeHandlers = handlers || {};
        const isFocused    = safeHandlers.focusedSceneId === sceneId;
        const isLayoutOnly = scene[Na__PresentationMode__ProjectJson__LAYOUT_ONLY_KEY] === true;

        const wrapper = document.createElement('div');
        wrapper.className       = 'na-pm-dev__scene-row';
        wrapper.dataset.sceneId = sceneId;
        wrapper.classList.toggle('is-open', isFocused);
        wrapper.classList.toggle('na-pm-dev__scene-row--layout-only', isLayoutOnly);

        // PREVIEW | Routed by the editor so a drawing scene still opens its own
        // drawing mode, and a layout-editor-only scene stays reachable.
        const previewScene = () => {
            if (typeof safeHandlers.onPreview === 'function') safeHandlers.onPreview(sceneId);
        };

        // HEADER STRIP
        const titleEl = Na__PmRows__BuildHeader(wrapper, scene, indexInGroup, countInGroup, safeHandlers, isFocused);

        // SCENE BODY | Everything the fold hides
        const body = document.createElement('div');
        body.className = 'na-pm-dev__scene-body';

        // IDENTITY BLOCK | Thumbnail beside Name and Group
        const identity = document.createElement('div');
        identity.className = 'na-pm-dev__identity';
        identity.appendChild(Na__PmRows__BuildThumbBlock(scene, previewScene));

        const identityFields = document.createElement('div');
        identityFields.className = 'na-pm-dev__identity-fields';

        // NAME INPUT | A DRAWING CARD'S NAME IS NOT THIS EDITOR'S TO KEEP.
        // A floor plan or elevation card is a view of a drawing record that
        // holds the same name inside LayoutEditor__DrawingsData, a block this
        // editor's save never writes. Editing the card in place and saving
        // would persist the new name here and leave the record on the old one
        // for good. So a drawing card commits through the drawing rename
        // path, which writes both blocks and the section binding in one save;
        // an ordinary 3D card keeps the live in-place edit it always had.
        const ownedByDrawing = Na__DrawRename__OwnsScene(scene);

        const nameRow   = Na__PmRows__BuildLabelledRow('Name');
        const nameLabel = nameRow.querySelector('.na-pm-dev__label');
        if (nameLabel) nameLabel.classList.add('na-pm-dev__label--inline');

        const nameInput = document.createElement('input');
        nameInput.type      = 'text';
        nameInput.className = 'na-pm-dev__input';
        nameInput.value     = scene.PresentationMode__Scene__Name || '';
        if (ownedByDrawing) nameInput.title = 'This card belongs to a drawing. Renaming it renames the drawing and saves both.';

        const showTitle = () => { titleEl.textContent = `#${indexInGroup + 1} - ${nameInput.value || sceneId}`; };

        nameInput.addEventListener('input', () => {
            showTitle();
            if (ownedByDrawing) return;                                      // <-- Committed on change, not per keystroke
            scene.PresentationMode__Scene__Name = nameInput.value;           // <-- Update working copy directly
        });

        nameInput.addEventListener('change', () => {
            if (!ownedByDrawing) return;
            const next = nameInput.value.trim();
            const settle = () => {
                nameInput.value    = scene.PresentationMode__Scene__Name || '';
                nameInput.disabled = false;
                showTitle();
            };
            if (next.length === 0 || next === scene.PresentationMode__Scene__Name) { settle(); return; }

            nameInput.disabled = true;
            Promise.resolve(Na__DrawRename__RenameSceneCard(scene, next, safeHandlers.showToast)).then(settle);
        });

        nameRow.appendChild(nameInput);
        identityFields.appendChild(nameRow);

        // GROUP DROPDOWN | The only control that moves a scene between groups
        const groupRow = Na__PmRows__BuildGroupRow(scene, (newGroupId) => {
            scene.PresentationMode__Scene__GroupId = newGroupId;             // <-- Explicit assignment
            onMutate('regroup', scene);                                      // <-- Renumbers both groups, persists, rebuilds
        });
        if (groupRow) {
            groupRow.querySelectorAll('.na-pm-dev__label').forEach(el => el.classList.add('na-pm-dev__label--inline'));
            identityFields.appendChild(groupRow);
        }

        identity.appendChild(identityFields);
        body.appendChild(identity);

        // FOV SLIDER | With the move speed value box on the same line
        body.appendChild(Na__PmRows__BuildFovRow(
            scene,
            (newFov) => {
                if (!scene.PresentationMode__Scene__CameraPosition) {
                    scene.PresentationMode__Scene__CameraPosition = {};
                }
                if (!scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc) {
                    scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc = {};
                }
                scene.PresentationMode__Scene__CameraPosition.Camera__DefaultMisc.Camera__DefaultMisc__Fov = newFov;
                scene.PresentationMode__Scene__LensMm = Math.round(Na__PmRows__FovToFocalMm(newFov)); // <-- Keep lens mm in sync
                if (safeHandlers.camera) {
                    safeHandlers.camera.fov = newFov;
                    safeHandlers.camera.updateProjectionMatrix();            // <-- Live preview in viewport
                    Na__RenderLoop__RequestRender();                         // <-- Redraw frame so FOV change is visible
                }
            },
            (newMs) => {
                scene.PresentationMode__Scene__TransitionTimeToNextSceneMs = newMs;
            }
        ));

        // ADVANCED SECTION | Collapsed by default to keep each row readable
        // ------------------------------------------------------------
        // Holds the settings that are set once and rarely revisited: exact
        // position, navigation mode, easing curve and whether the viewer sees
        // this scene at all. Open/closed state is remembered across panel
        // rebuilds so a reorder or a save does not collapse the section the
        // user is working in.
        //
        // There is deliberately NO layer-timing row here, unlike TrueVision.
        // This app applies a scene's model layers instantly at the start of a
        // flight on purpose - an instant cut reads better than a mid-flight
        // pop-out - so a before/after choice would be a control with nothing
        // to control.
        // ------------------------------------------------------------
        const advanced = document.createElement('div');
        advanced.className = 'na-pm-dev__advanced';

        const advancedToggle = document.createElement('button');
        advancedToggle.type      = 'button';
        advancedToggle.className = 'na-pm-dev__advanced-toggle';

        const advancedBody = document.createElement('div');
        advancedBody.className = 'na-pm-dev__advanced-body';

        const isAdvancedOpen = Boolean(safeHandlers.isAdvancedOpen && safeHandlers.isAdvancedOpen(sceneId));
        advancedBody.classList.toggle('is-open', isAdvancedOpen);
        advancedToggle.setAttribute('aria-expanded', String(isAdvancedOpen));
        advancedToggle.innerHTML = `Advanced <span class="na-pm-dev__advanced-arrow">&#9662;</span>`;

        advancedToggle.addEventListener('click', () => {
            const willOpen = !advancedBody.classList.contains('is-open');
            advancedBody.classList.toggle('is-open', willOpen);
            advancedToggle.setAttribute('aria-expanded', String(willOpen));
            if (typeof safeHandlers.onAdvancedToggle === 'function') {
                safeHandlers.onAdvancedToggle(sceneId, willOpen);            // <-- Remembered across rebuilds
            }
        });

        // POSITION FIELD | 1-based within the group
        advancedBody.appendChild(
            Na__PmRows__BuildPositionRow(sceneId, indexInGroup, countInGroup, safeHandlers.onMoveToPosition)
        );

        // NAV MODE SWITCH | Orbit is the absent key, so older scenes read as orbit
        const navModeRow = Na__PmRows__BuildNavigationModeRow(scene, (newMode) => {
            if (newMode === 'walk' || newMode === 'fly') {
                scene[Na__PresentationMode__KEY__NAVIGATION_MODE] = newMode;
            } else {
                delete scene[Na__PresentationMode__KEY__NAVIGATION_MODE];
            }
        });
        if (navModeRow) advancedBody.appendChild(navModeRow);

        // EASING DROPDOWN
        advancedBody.appendChild(Na__PmRows__BuildEasingRow(scene, (newEasing) => {
            scene.PresentationMode__Scene__TransitionEasing = newEasing;
        }));

        // LAYOUT EDITOR ONLY TOGGLE
        // ------------------------------------------------------------
        // Saved the instant it is toggled, unlike its neighbours in Advanced.
        // Those change how a scene BEHAVES when you arrive at it; this one
        // changes whether the scene is in the carousel at all, and a flag
        // whose whole effect is "the strip looks different now" has to make
        // the strip look different now or you cannot tell it worked.
        // ------------------------------------------------------------
        advancedBody.appendChild(Na__PmRows__BuildLayoutOnlyRow(scene, (layoutOnly) => {
            if (layoutOnly) {
                scene[Na__PresentationMode__ProjectJson__LAYOUT_ONLY_KEY] = true;
            } else {
                delete scene[Na__PresentationMode__ProjectJson__LAYOUT_ONLY_KEY]; // <-- Omit key when default
            }
            onMutate('flag', scene);
        }));

        advanced.appendChild(advancedToggle);
        advanced.appendChild(advancedBody);
        body.appendChild(advanced);

        // ACTION BUTTONS
        body.appendChild(Na__PmRows__BuildActions(scene, onMutate, previewScene));

        wrapper.appendChild(body);
        return wrapper;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Row Builder API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__DevMenu__BuildSceneRow,
        Na__PmRows__FovToFocalMm   as Na__PresentationMode__DevMenu__FovToFocalMm,
        Na__PmRows__FocalMmToFov   as Na__PresentationMode__DevMenu__FocalMmToFov,
        Na__PmRows__TRANSITION_DEFAULT as Na__PresentationMode__DevMenu__TRANSITION_DEFAULT_MS
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
