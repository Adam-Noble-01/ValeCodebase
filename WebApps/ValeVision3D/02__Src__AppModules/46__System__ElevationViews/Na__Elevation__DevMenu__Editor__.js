// =============================================================================
// VALEVISION3D - ELEVATION VIEWS - DEV MENU EDITOR
// =============================================================================
//
// FILE       : Na__Elevation__DevMenu__Editor__.js
// NAMESPACE  : Na__ElevDev
// MODULE     : Elevation Views - Dev Menu Editor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only authoring UI for creating and tuning elevations and sections
// CREATED    : 07-Sep-2026
//
// DESCRIPTION:
// - The developer-facing half of the feature: add an elevation, name it, point
//   it at a face of the building, slide or drag its drawing plane, preview it,
//   mark it up, style it, capture its thumbnail, and save.
//
// - SEED N / E / S / W is the one-click start. Four elevations of a square-on
//   building is what almost every drawing set actually needs. PICK FACE is the
//   other start: click a wall in the 3D view and a new elevation is aimed at
//   it with its plane through it; Re-pick does the same to an existing row.
//
// - THE GIZMO FOLLOWS THE ROW YOU ARE TOUCHING, and it can be dragged along
//   its own normal. The sliders remain the precise path; the grip is the fast
//   one, and every drag lands in the sliders as numbers before it is saved.
//
// - A section files into the Cross Sections group and a plain elevation into
//   Elevations; flipping the drawing type moves the card straight away.
// - Save writes the drawings block and the scene links through the one
//   drawings save path (Na__DrawView__ProjectData__).
//
// INTEGRATION:
// - Initialized from index.html alongside the other localhost-only dev tools.
// - Drives Na__Elevation__ModeController__ for preview, markup and styles.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js
// - Source version: 1.0.0 (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3)
// - Parity        : adapted
// - Divergences   :
//   - Records read from the drawings block; Save goes through Na__DrawData__Save (D08).
//   - Live cut through Na__DrawView__SectionAdapter__ (D07).
//   - Pick Face and Re-pick (D16) through Na__Elevation__FacePick__; the gizmo grip through Na__Elevation__GizmoGrip__.
//   - Mode changes move the card between the Elevations and Cross Sections groups (D28).
//   - Thumbnails through the R2 asset route; delete prompts use the confirm dialog; style handlers added.
// - Back-port     : Pick Face, the grip and the mode-based group.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Bake before save (port Phase 4)
// - Save bakes every drawing's projected linework asset that is missing or stale before the project save.
//
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D: drawings save path, section adapter, face pick,
//   gizmo grip, mode-based groups, styles.
//
// 07-Sep-2026 - Version 1.0.0
// - Initial implementation for the Elevation Drawings build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog, Presentation Scene Config and Thumbnails
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__BroadcastScenesChanged
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    import { Na__PresentationMode__Thumbnail__CaptureAndUpload } from '../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing View Core (save path, cut, broker, scene row)
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/
    // ------------------------------------------------------------
    import {
        Na__DrawData__Save,
        Na__DrawData__GetProjectCode,
        Na__DrawData__CHANGED_EVENT
    } from '../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__DrawView__SectionAdapter__SetPlaneDistanceMm } from '../42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';
    import { Na__DrawView__IsActive } from '../42__System__DrawingViewCore/Na__DrawView__ActiveView__.js';
    import { Na__DrawSceneRow__Build } from '../42__System__DrawingViewCore/Na__DrawView__SceneLinkRow__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Projected Linework Baking (port Phase 4)
    // ------------------------------------------------------------
    // @delegate: ../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js
    // ------------------------------------------------------------
    import { Na__PlStore__BakeBeforeSave } from '../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Elevation Data, Config, Framing, Gizmo, Grip, Pick, Link and Mode
    // ------------------------------------------------------------
    // @delegate: ./Na__Elevation__ProjectJson__Data__.js
    // @delegate: ./Na__Elevation__Framing__.js
    // @delegate: ./Na__Elevation__PlaneGizmo__.js
    // @delegate: ./Na__Elevation__GizmoGrip__.js
    // @delegate: ./Na__Elevation__FacePick__.js
    // @delegate: ./Na__Elevation__DevMenu__RowBuilders__.js
    // @delegate: ./Na__Elevation__SceneLink__.js
    // @delegate: ./Na__Elevation__ModeController__.js
    // ------------------------------------------------------------
    import {
        Na__ElevData__GetElevations,
        Na__ElevData__CreateElevation,
        Na__ElevData__DeleteElevation,
        Na__ElevData__SetPlaneOriginMm,
        Na__ElevData__SetAzimuthDeg,
        Na__ElevData__SetSeededFrom,
        Na__ElevData__GetPlaneDistanceMm,
        Na__ElevData__IsSection,
        Na__ElevData__FindSceneFor
    } from './Na__Elevation__ProjectJson__Data__.js';
    import {
        Na__ElevCfg__GetDirectionPresets,
        Na__ElevCfg__GetLabel,
        Na__ElevCfg__FormatLabel,
        Na__ElevCfg__GetSceneGroupTarget,
        Na__ElevCfg__GetSectionGroupTarget
    } from './Na__Elevation__ConfigState__.js';
    import {
        Na__ElevFrame__MeasureModel,
        Na__ElevFrame__GetBounds,
        Na__ElevFrame__GetCentredPlaneOriginMm
    } from './Na__Elevation__Framing__.js';
    import {
        Na__ElevGizmo__Show,
        Na__ElevGizmo__Hide,
        Na__ElevGizmo__Dispose
    } from './Na__Elevation__PlaneGizmo__.js';
    import {
        Na__ElevGrip__Arm,
        Na__ElevGrip__Disarm
    } from './Na__Elevation__GizmoGrip__.js';
    import {
        Na__ElevPick__Start,
        Na__ElevPick__Cancel,
        Na__ElevPick__IsActive
    } from './Na__Elevation__FacePick__.js';
    import {
        Na__ElevRow__BuildButton,
        Na__ElevRow__BuildElevationRow
    } from './Na__Elevation__DevMenu__RowBuilders__.js';
    import {
        Na__ElevLink__CreateSceneForElevation,
        Na__ElevLink__SyncSceneGroup,
        Na__ElevLink__RemoveSceneForElevation,
        Na__ElevLink__SyncSceneName,
        Na__ElevLink__SyncSceneCamera
    } from './Na__Elevation__SceneLink__.js';
    import {
        Na__ElevationMode__EnterElevation,
        Na__ElevationMode__ExitElevation,
        Na__ElevationMode__SetEditMode,
        Na__ElevationMode__IsEditMode,
        Na__ElevationMode__IsActive,
        Na__ElevationMode__RefreshActive,
        Na__ElevationMode__ApplyStyles,
        Na__ElevationMode__GetActiveElevation,
        Na__ElevationMode__StoreActiveFraming,
        Na__ElevMode__CHANGED_EVENT
    } from './Na__Elevation__ModeController__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers
    // ------------------------------------------------------------
    const Na__ElevDev__PANEL_ID  = 'naElevationDevPanel';
    const Na__ElevDev__ITEM_ID   = 'naElevationDevItem';
    const Na__ElevDev__TOGGLE_ID = 'naElevationDevToggle';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Section Cut Plane Id Prefix (mirrors the controller)
    // ------------------------------------------------------------
    const Na__ElevDev__CUT_ID_PREFIX = 'ElevationCut__';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Host Context and Pick State
    // ------------------------------------------------------------
    let Na__ElevDev__Panel       = null;
    let Na__ElevDev__ModelRoot   = null;
    let Na__ElevDev__Camera      = null;
    let Na__ElevDev__ShowToast   = null;
    let Na__ElevDev__Initialized = false;
    let Na__ElevDev__PickTarget  = null;   // <-- Row being re-picked, or null for a new elevation; only meaningful while a pick is armed
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Live Presentation Scene Config (scene links live here)
    // ------------------------------------------------------------
    function Na__ElevDev__GetConfig() {
        return Na__PresentationMode__ProjectJson__GetActiveConfig();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show a Toast if the Host Supplied One
    // ------------------------------------------------------------
    function Na__ElevDev__Toast(message, isError) {
        if (typeof Na__ElevDev__ShowToast === 'function') Na__ElevDev__ShowToast(message, isError === true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Field of View of the Live Perspective Camera
    // ------------------------------------------------------------
    function Na__ElevDev__Fov() {
        return Na__ElevDev__Camera ? Na__ElevDev__Camera.fov : 30;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure the Loaded Model for One Elevation
    // ------------------------------------------------------------
    function Na__ElevDev__Measure(elevation) {
        return Na__ElevFrame__MeasureModel(Na__ElevDev__ModelRoot, Na__ElevDev__Camera, elevation);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push an Elevation's Live Plane Position to the Cut
    // ------------------------------------------------------------
    // Only meaningful for a section - a plain elevation has no plane
    // registered at all, which is why this is a no-op in that case.
    // ------------------------------------------------------------
    function Na__ElevDev__PushLiveCut(elevation, liveDrag) {
        if (!Na__ElevationMode__IsActive()) return;
        if (Na__ElevationMode__GetActiveElevation() !== elevation) return;
        if (!Na__ElevData__IsSection(elevation)) return;

        Na__DrawView__SectionAdapter__SetPlaneDistanceMm(
            Na__ElevDev__CUT_ID_PREFIX + elevation.Elevation__Id,
            Na__ElevData__GetPlaneDistanceMm(elevation),
            liveDrag === true
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Gizmo Onto the Row Being Edited and Arm Its Grip
    // ------------------------------------------------------------
    // Suppressed while a drawing is previewing: a translucent plane over the
    // finished elevation would be exactly the thing the gizmo exists to avoid.
    // The grip's live callback recuts a section at the drag throttle and moves
    // the plane; its commit callback re-derives everything and rebuilds the
    // panel so the sliders show where the drag landed.
    // ------------------------------------------------------------
    function Na__ElevDev__ShowGizmo(elevation) {
        if (Na__ElevationMode__IsActive()) return;
        Na__ElevGizmo__Show(elevation, Na__ElevFrame__GetBounds(Na__ElevDev__ModelRoot));
        Na__ElevGrip__Arm(elevation, {
            onLive   : (record) => {
                Na__ElevDev__PushLiveCut(record, true);
                Na__ElevGizmo__Show(record, Na__ElevFrame__GetBounds(Na__ElevDev__ModelRoot));
            },
            onCommit : (record) => {
                Na__ElevDev__PushLiveCut(record, false);
                Na__ElevDev__CommitGeometry(record);
                Na__ElevDev__Render();                                           // <-- Sliders and readout show the landed values
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take the Gizmo and Its Grip Down Together
    // ------------------------------------------------------------
    function Na__ElevDev__HideGizmo() {
        Na__ElevGrip__Disarm();
        Na__ElevGizmo__Hide();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-Derive Everything That Depends on the Plane
    // ------------------------------------------------------------
    // The stored scene pose AND, when the drawing is on screen, the live cut,
    // camera and drawing axes. Called on commit rather than on every input, so
    // dragging stays cheap.
    // ------------------------------------------------------------
    function Na__ElevDev__CommitGeometry(elevation) {
        const config = Na__ElevDev__GetConfig();
        if (config) Na__ElevLink__SyncSceneCamera(config, elevation, Na__ElevDev__Measure(elevation), Na__ElevDev__Fov());

        if (Na__ElevationMode__IsActive() && Na__ElevationMode__GetActiveElevation() === elevation) {
            Na__ElevationMode__RefreshActive();
        } else {
            Na__ElevDev__ShowGizmo(elevation);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move a Row's Card to the Group Its Drawing Type Belongs In
    // ------------------------------------------------------------
    function Na__ElevDev__SyncGroup(elevation) {
        const config = Na__ElevDev__GetConfig();
        if (!config) return;
        if (Na__ElevLink__SyncSceneGroup(config, elevation)) {
            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- The card changes group
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Pick
// -----------------------------------------------------------------------------

    // FUNCTION | Arm (or Cancel) a Face Pick for a New or an Existing Elevation
    // ------------------------------------------------------------
    // target null creates a new elevation from the picked wall; a record
    // re-aims that record. A pick needs the 3D view, so it is refused while
    // any drawing owns the viewport.
    // ------------------------------------------------------------
    function Na__ElevDev__StartPick(target) {
        if (Na__ElevPick__IsActive() && Na__ElevDev__PickTarget === target) {
            Na__ElevPick__Cancel();                                              // <-- Same button again: cancel
            return false;
        }
        if (Na__DrawView__IsActive()) {
            Na__ElevDev__Toast(Na__ElevCfg__GetLabel('PickNeeds3dMessage', 'Leave the drawing first - a face is picked in the 3D view.'), true);
            return false;
        }
        if (!Na__ElevFrame__GetBounds(Na__ElevDev__ModelRoot)) {
            Na__ElevDev__Toast(Na__ElevCfg__GetLabel('NoModelMessage', 'Load a model before adding elevations.'), true);
            return false;
        }

        const armed = Na__ElevPick__Start({
            onPicked    : (result) => Na__ElevDev__ApplyPick(result),
            onCancelled : () => {
                Na__ElevDev__PickTarget = null;
                Na__ElevDev__Render();
            }
        });
        if (!armed) return false;
        Na__ElevDev__PickTarget = target || null;                                // <-- After Start: arming cancels any earlier pick, which clears the target

        Na__ElevDev__Toast(Na__ElevCfg__GetLabel('PickingHint', 'Click a wall in the 3D view to aim the elevation at it. Escape cancels.'));
        Na__ElevDev__Render();                                                   // <-- Buttons flip to their cancel wording
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Picked Wall to the Target Row, or Create One From It
    // ------------------------------------------------------------
    function Na__ElevDev__ApplyPick(result) {
        const target = Na__ElevDev__PickTarget;
        Na__ElevDev__PickTarget = null;

        if (target) {
            Na__ElevData__SetAzimuthDeg(target, result.azimuthDeg);
            Na__ElevData__SetPlaneOriginMm(target, result.originXMm, result.originZMm);
            Na__ElevData__SetSeededFrom(target, 'facepick');
            Na__ElevDev__PushLiveCut(target, false);
            Na__ElevDev__CommitGeometry(target);
            Na__ElevDev__Render();
            return;
        }

        const elevation = Na__ElevDev__AddElevation({
            azimuthDeg : result.azimuthDeg,
            originXMm  : result.originXMm,
            originZMm  : result.originZMm,
            seededFrom : 'facepick'
        });
        if (elevation) Na__ElevDev__ShowGizmo(elevation);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Handler Wiring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Elevation Row With Its Handlers Bound
    // ------------------------------------------------------------
    // The row builder is purely presentational, so everything that actually
    // changes state is assembled here and handed to it.
    // ------------------------------------------------------------
    function Na__ElevDev__BuildRow(elevation) {
        const config   = Na__ElevDev__GetConfig();
        const isActive = Na__ElevationMode__IsActive()
                      && Na__ElevationMode__GetActiveElevation() === elevation;

        return Na__ElevRow__BuildElevationRow(elevation, {
            isActive   : isActive,
            isEditMode : isActive && Na__ElevationMode__IsEditMode(),
            isPicking  : Na__ElevPick__IsActive() && Na__ElevDev__PickTarget === elevation,

            onRename : () => {
                if (config) Na__ElevLink__SyncSceneName(config, elevation);
                Na__PresentationMode__ProjectJson__BroadcastScenesChanged();     // <-- The card carries the elevation name
            },

            // A new bearing changes the camera basis outright, so the drawing
            // has to be rebuilt rather than nudged.
            onDirectionChange : () => {
                Na__ElevData__SetSeededFrom(elevation, 'manual');
                Na__ElevDev__CommitGeometry(elevation);
            },

            // Elevation and section differ only in whether the plane bites,
            // but that IS a change of plane set, so the same full rebuild,
            // and the card moves to the group the new type belongs in.
            onModeChange : () => {
                Na__ElevDev__SyncGroup(elevation);
                Na__ElevDev__CommitGeometry(elevation);
            },

            onRepick : () => Na__ElevDev__StartPick(elevation),

            onPlaneLive   : () => {
                Na__ElevDev__PushLiveCut(elevation, true);
                Na__ElevDev__ShowGizmo(elevation);
            },
            onPlaneCommit : () => {
                Na__ElevDev__PushLiveCut(elevation, false);
                Na__ElevDev__CommitGeometry(elevation);
            },

            onCentrePlane : () => {
                const centred = Na__ElevFrame__GetCentredPlaneOriginMm(Na__ElevDev__Measure(elevation));
                if (!centred) {
                    Na__ElevDev__Toast(Na__ElevCfg__GetLabel('NoModelMessage', 'Load a model before adding elevations.'), true);
                    return;
                }
                Na__ElevData__SetPlaneOriginMm(elevation, centred.xMm, centred.zMm);
                Na__ElevDev__PushLiveCut(elevation, false);
                Na__ElevDev__CommitGeometry(elevation);
            },

            // Depth changes the PLANE SET, not just a constant, so the cut has
            // to be rebuilt rather than nudged.
            onDepthChange : () => Na__ElevDev__CommitGeometry(elevation),

            onStyleChange      : () => { if (isActive) Na__ElevationMode__ApplyStyles(elevation); },
            onExclusionsChange : () => {},

            onPreviewToggle : () => {
                if (isActive) {
                    Na__ElevationMode__ExitElevation(null);
                } else {
                    Na__ElevPick__Cancel();
                    Na__ElevDev__HideGizmo();                                    // <-- Never leave the setup marker on the drawing
                    Na__ElevationMode__EnterElevation(elevation);
                }
            },
            onAnnotate  : () => Na__ElevationMode__SetEditMode(!Na__ElevationMode__IsEditMode()),
            onThumbnail : () => Na__ElevDev__SaveThumbnail(elevation),
            onDelete    : () => Na__ElevDev__DeleteElevation(elevation)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Mutations
// -----------------------------------------------------------------------------

    // FUNCTION | Add One Elevation and Its Scene
    // ------------------------------------------------------------
    // The record goes into the drawings block; the card goes into the
    // presentation block, filed by drawing type.
    // ------------------------------------------------------------
    function Na__ElevDev__AddElevation(options) {
        const elevation = Na__ElevData__CreateElevation(null, options || {});
        if (!elevation) return null;

        const config = Na__ElevDev__GetConfig();
        if (config) {
            Na__ElevLink__CreateSceneForElevation(config, elevation, Na__ElevDev__Measure(elevation), Na__ElevDev__Fov());
            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- Or the new card stays invisible all session
        } else {
            Na__ElevDev__Toast('Elevation created. Add a Presentation scene first so it can have a carousel card.', true);
        }
        Na__ElevDev__Render();
        return elevation;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create One Elevation Per Compass Preset
    // ------------------------------------------------------------
    // Four elevations of a square-on building is what almost every drawing set
    // needs, and their planes are centred on the model so each one is
    // immediately meaningful rather than stranded at the world origin.
    // ------------------------------------------------------------
    function Na__ElevDev__SeedFourSides() {
        const centred = Na__ElevFrame__GetCentredPlaneOriginMm(Na__ElevDev__Measure(null));
        if (!centred) {
            Na__ElevDev__Toast(Na__ElevCfg__GetLabel('NoModelMessage', 'Load a model before adding elevations.'), true);
            return 0;
        }

        const presets = Na__ElevCfg__GetDirectionPresets();

        for (let i = 0; i < presets.length; i++) {
            Na__ElevDev__AddElevation({
                name       : Na__ElevCfg__FormatLabel(
                    'PresetNameFormat', '{preset} Elevation', { preset: presets[i].label }
                ),
                azimuthDeg : presets[i].azimuthDeg,
                originXMm  : centred.xMm,
                originZMm  : centred.zMm,
                seededFrom : 'preset'
            });
        }

        Na__ElevDev__Toast('Created ' + presets.length + ' elevation(s) around the model.');
        return presets.length;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete an Elevation, Its Scene and Its Markup
    // ------------------------------------------------------------
    async function Na__ElevDev__DeleteElevation(elevation) {
        const ok = await Na__AppUtils__ConfirmDialog__Show({
            title         : 'Delete Elevation?',
            message       : Na__ElevCfg__FormatLabel(
                'DeleteElevationPrompt',
                'Delete the elevation "{name}"? Its scene, annotations and dimensions go with it.',
                { name: elevation.Elevation__Name }
            ),
            confirmLabel  : 'Delete',
            isDestructive : true
        });
        if (!ok) return false;

        if (Na__ElevationMode__IsActive() && Na__ElevationMode__GetActiveElevation() === elevation) {
            Na__ElevationMode__ExitElevation(null);                              // <-- Never leave a deleted drawing on screen
        }
        Na__ElevPick__Cancel();
        Na__ElevDev__HideGizmo();

        const orphanedSceneId = Na__ElevData__DeleteElevation(null, elevation.Elevation__Id);
        const config          = Na__ElevDev__GetConfig();
        if (orphanedSceneId && config) Na__ElevLink__RemoveSceneForElevation(config, orphanedSceneId);

        Na__PresentationMode__ProjectJson__BroadcastScenesChanged();             // <-- Drop the card with the elevation
        Na__ElevDev__Render();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture the Drawing on Screen as Its Scene Thumbnail
    // ------------------------------------------------------------
    async function Na__ElevDev__SaveThumbnail(elevation) {
        if (!Na__ElevationMode__IsActive() || Na__ElevationMode__GetActiveElevation() !== elevation) {
            Na__ElevDev__Toast('Preview the elevation before saving its thumbnail.', true);
            return false;
        }

        const config = Na__ElevDev__GetConfig();
        const scene  = config ? Na__ElevData__FindSceneFor(config, elevation) : null;
        if (!scene) {
            Na__ElevDev__Toast('This elevation has no scene to attach a thumbnail to.', true);
            return false;
        }

        // The thumbnail IS the framing. Recording it here means the card and
        // the view it opens at can never disagree.
        Na__ElevationMode__StoreActiveFraming();

        try {
            const result = await Na__PresentationMode__Thumbnail__CaptureAndUpload(
                scene.PresentationMode__Scene__Id,
                Na__DrawData__GetProjectCode(),
                Na__ElevDev__ShowToast
            );
            if (!result || !result.ok) {
                Na__ElevDev__Toast('Thumbnail upload failed: ' + (result ? result.error : 'no result'), true);
                return false;
            }
            scene.PresentationMode__Scene__ThumbnailUrl = result.relUrl;         // <-- Saved with the next Save Elevations
            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- The card picks the new image up
            Na__ElevDev__Toast('Thumbnail saved to R2: ' + result.relUrl);
            return true;
        } catch (error) {
            console.error('[ValeVision3D] Elevation thumbnail error:', error);
            Na__ElevDev__Toast('Thumbnail error - see console.', true);
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Drawings Block and the Scene Links to R2
    // ------------------------------------------------------------
    async function Na__ElevDev__Save() {
        Na__ElevationMode__StoreActiveFraming();                                 // <-- Save what is on screen, not the last gesture

        await Na__PlStore__BakeBeforeSave(Na__ElevDev__ShowToast);                       // <-- Linework assets first, so the records carry their references (D20)

        const saved = await Na__DrawData__Save(Na__ElevDev__ShowToast);
        if (saved) {
            Na__ElevDev__Toast(Na__ElevCfg__GetLabel('SavedMessage', 'Elevations saved to R2.'));
            return true;
        }
        Na__ElevDev__Toast(Na__ElevCfg__GetLabel('SaveFailedMessage', 'Elevation save failed - see console.'), true);
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Render
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Carousel Card Status and Action for One Elevation
    // ------------------------------------------------------------
    function Na__ElevDev__BuildSceneLinkRow(elevation) {
        const config = Na__ElevDev__GetConfig();
        const target = Na__ElevData__IsSection(elevation) ? Na__ElevCfg__GetSectionGroupTarget() : Na__ElevCfg__GetSceneGroupTarget();

        return Na__DrawSceneRow__Build({
            scene       : config ? Na__ElevData__FindSceneFor(config, elevation) : null,
            groupName   : target.groupName,
            drawingWord : Na__ElevData__IsSection(elevation) ? 'section' : 'elevation',
            onCreate    : () => {
                if (!config) {
                    Na__ElevDev__Toast('No presentation scene config loaded.', true);
                    return;
                }
                Na__ElevLink__CreateSceneForElevation(config, elevation, Na__ElevDev__Measure(elevation), Na__ElevDev__Fov());
                Na__PresentationMode__ProjectJson__BroadcastScenesChanged();
                Na__ElevDev__Toast('Added "' + elevation.Elevation__Name + '" to the scene carousel.');
                Na__ElevDev__Render();
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Add / Pick / Seed Actions
    // ------------------------------------------------------------
    function Na__ElevDev__BuildActions() {
        const actions = document.createElement('div');
        actions.className = 'na-pm-dev__actions';

        const picking = Na__ElevPick__IsActive() && Na__ElevDev__PickTarget === null;
        actions.appendChild(Na__ElevRow__BuildButton(
            picking
                ? Na__ElevCfg__GetLabel('PickCancelLabel', 'Cancel Pick')
                : Na__ElevCfg__GetLabel('PickFaceLabel', 'Pick Face'),
            picking ? 'na-pm-dev__btn--danger' : 'na-pm-dev__btn--primary',
            () => Na__ElevDev__StartPick(null)
        ));
        actions.appendChild(Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('AddElevationLabel', '+ Add Elevation'), '',
            () => {
                if (!Na__ElevFrame__GetBounds(Na__ElevDev__ModelRoot)) {
                    Na__ElevDev__Toast(Na__ElevCfg__GetLabel('NoModelMessage', 'Load a model before adding elevations.'), true);
                    return;
                }
                Na__ElevDev__AddElevation({});
            }
        ));
        actions.appendChild(Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('SeedFourSidesLabel', 'Seed N / E / S / W'), '',
            Na__ElevDev__SeedFourSides
        ));
        return actions;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Whole Elevation Panel
    // ------------------------------------------------------------
    function Na__ElevDev__Render() {
        if (!Na__ElevDev__Panel) return;
        Na__ElevDev__Panel.innerHTML = '';

        const title = document.createElement('div');
        title.className   = 'na-dropdown-menu__panel-title';
        title.textContent = Na__ElevCfg__GetLabel('SectionTitle', 'Elevations');
        Na__ElevDev__Panel.appendChild(title);

        const elevations = Na__ElevData__GetElevations();

        for (let i = 0; i < elevations.length; i++) {
            const elevationRow = Na__ElevDev__BuildRow(elevations[i]);
            elevationRow.appendChild(Na__ElevDev__BuildSceneLinkRow(elevations[i]));
            Na__ElevDev__Panel.appendChild(elevationRow);
        }

        const note = document.createElement('p');
        note.className = 'na-fp-dev__empty';
        if (elevations.length === 0) {
            note.textContent = 'No elevations yet. Pick a wall, seed the four sides, or add one and point it where you like.';
        } else {
            note.textContent = Na__ElevCfg__GetLabel('GripHint',
                'The plane in the 3D view shows where the drawing is taken from. It follows whichever elevation you are editing, and you can drag it along its arrows.');
        }
        Na__ElevDev__Panel.appendChild(note);

        Na__ElevDev__Panel.appendChild(Na__ElevDev__BuildActions());

        const saveActions = document.createElement('div');
        saveActions.className = 'na-pm-dev__actions';
        saveActions.appendChild(Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('SaveLabel', 'Save Elevations'),
            'na-pm-dev__btn--primary',
            Na__ElevDev__Save
        ));
        Na__ElevDev__Panel.appendChild(saveActions);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Localhost-Only Elevation Editor
    // ------------------------------------------------------------
    // context: { modelRoot, camera, showToast }
    // Mirrors the Floor Plans section: the wrapper is revealed, the toggle
    // opens the panel, and the panel rebuilds on every open so it can never
    // show data from a previous project.
    // ------------------------------------------------------------
    function Na__Elevation__DevMenu__Initialize(context) {
        const menuItem = document.getElementById(Na__ElevDev__ITEM_ID);
        const toggle   = document.getElementById(Na__ElevDev__TOGGLE_ID);
        const panel    = document.getElementById(Na__ElevDev__PANEL_ID);
        if (!menuItem || !toggle || !panel) return false;                        // <-- Markup absent: nothing to mount into

        Na__ElevDev__Panel       = panel;
        Na__ElevDev__ModelRoot   = (context && context.modelRoot) || null;
        Na__ElevDev__Camera      = (context && context.camera)    || null;
        Na__ElevDev__ShowToast   = (context && context.showToast) || null;
        Na__ElevDev__Initialized = true;

        menuItem.style.display = '';                                             // <-- Reveal alongside the other dev tools

        toggle.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            toggle.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) {
                Na__ElevDev__Render();                                           // <-- Rebuild on each open so data is fresh
            } else {
                Na__ElevPick__Cancel();
                Na__ElevGrip__Disarm();
                Na__ElevGizmo__Dispose();                                        // <-- Authoring is done; release the geometry outright
            }
        });

        // Preview and Annotate button states are derived from mode, so the
        // panel refreshes whenever the controller reports a change.
        window.addEventListener(Na__ElevMode__CHANGED_EVENT, () => {
            if (panel.classList.contains('is-open')) Na__ElevDev__Render();
        });

        // A project switch during the same session replaces the scene config
        // and the drawings block.
        window.addEventListener('na-presentation-mode-scenes-loaded', () => {
            if (panel.classList.contains('is-open')) Na__ElevDev__Render();
        });
        window.addEventListener(Na__DrawData__CHANGED_EVENT, () => {
            if (panel.classList.contains('is-open')) Na__ElevDev__Render();
        });

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Point the Editor at a Different Model Root
    // ------------------------------------------------------------
    function Na__Elevation__DevMenu__SetModelRoot(modelRoot) {
        Na__ElevDev__ModelRoot = modelRoot || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Force a Panel Refresh
    // ------------------------------------------------------------
    function Na__Elevation__DevMenu__Refresh() {
        if (Na__ElevDev__Initialized) Na__ElevDev__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation Dev Menu Editor API
    // ------------------------------------------------------------
    export {
        Na__Elevation__DevMenu__Initialize,
        Na__Elevation__DevMenu__SetModelRoot,
        Na__Elevation__DevMenu__Refresh
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
