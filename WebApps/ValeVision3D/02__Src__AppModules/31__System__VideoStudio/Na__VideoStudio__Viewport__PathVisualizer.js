// =============================================================================
// VALEVISION3D - VIDEO STUDIO - VIEWPORT PATH VISUALIZER
// =============================================================================
//
// FILE       : Na__VideoStudio__Viewport__PathVisualizer.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Viewport Path Visualizer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw the active video's keyframes and interpolated camera path
//              into the 3D viewport for inspection
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Builds a dedicated THREE.Group holding everything the Video Studio draws
//   into the scene, so the whole overlay can be toggled and disposed cleanly.
// - The camera path is a fat extruded Line2 following the same centripetal
//   CatmullRom curve the exporter samples, so what you inspect is exactly what
//   gets rendered.  A colour gradient runs from the start of the path to the
//   end, and cone arrows sit along it pointing in the direction of travel.
// - Each keyframe gets a wireframe camera frustum oriented to that keyframe's
//   saved rotation (so the look direction is readable at a glance), a look
//   direction stub, and a numbered screen-space sprite label.
// - The currently selected keyframe is drawn in the highlight colour so the
//   Dev menu row and the viewport marker always agree.
// - Everything is drawn with depth testing off and a high render order, so the
//   path stays visible through walls.  That is deliberate: the point of the
//   overlay is inspecting a route through a building you cannot see into.
//
// INTEGRATION:
// - Initialize once with the scene and renderer.
// - Rebuild whenever keyframes change; Toggle from the Dev menu checkbox.
// - The exporter and the preview each call SetSuppressed with their own reason
//   so the overlay never appears in an exported frame, and never sits on the
//   lens while the camera is flying through a waypoint.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fat Line Primitives
    // ------------------------------------------------------------
    import { Line2 }        from 'three/addons/lines/Line2.js';
    import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
    import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Sampler
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__BuildTimeline,
        Na__VideoStudio__PathSampler__GetCurvePoints
    } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Data Accessors
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetActiveVideoId,
        Na__VideoStudio__ProjectJson__GetActiveKeyframeId
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Group Identity and Render Ordering
    // ------------------------------------------------------------
    const Na__VsViz__GROUP_NAME   = 'Na__VideoStudio__PathVizGroup';  // <-- Scene group name
    const Na__VsViz__RENDER_ORDER = 9990;                             // <-- Draw above model geometry
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Palette
    // ------------------------------------------------------------
    const Na__VsViz__PATH_START_COLOR = 0x2ec4b6;   // <-- Teal at the first keyframe
    const Na__VsViz__PATH_END_COLOR   = 0xff9f1c;   // <-- Amber at the last keyframe
    const Na__VsViz__MARKER_COLOR     = 0x2ec4b6;   // <-- Keyframe frustum wireframe
    const Na__VsViz__SELECTED_COLOR   = 0xe71d36;   // <-- Currently selected keyframe
    const Na__VsViz__LOOK_STUB_COLOR  = 0xffffff;   // <-- Look direction stub line
    const Na__VsViz__ARROW_COLOR      = 0xff9f1c;   // <-- Direction of travel cones
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Geometry Sizing (scene units, 1 unit = 1 metre)
    // ------------------------------------------------------------
    const Na__VsViz__LINE_WIDTH_PX      = 4.0;    // <-- Fat line screen-space width
    const Na__VsViz__CURVE_DIVISIONS    = 400;    // <-- Sample count along the path
    const Na__VsViz__FRUSTUM_SIZE       = 0.28;   // <-- Camera marker overall size
    const Na__VsViz__LOOK_STUB_LENGTH   = 0.60;   // <-- Look direction stub length
    const Na__VsViz__ARROW_LENGTH       = 0.24;   // <-- Direction cone length
    const Na__VsViz__ARROW_RADIUS       = 0.075;  // <-- Direction cone base radius
    const Na__VsViz__ARROW_SPACING      = 2.5;    // <-- Target metres between direction cones
    const Na__VsViz__ARROW_MIN_COUNT    = 3;      // <-- Never fewer than this many cones
    const Na__VsViz__ARROW_MAX_COUNT    = 80;     // <-- Never more than this many cones
    const Na__VsViz__LABEL_OFFSET_Y     = 0.42;   // <-- Height of the number label above the marker
    const Na__VsViz__LABEL_SCREEN_SCALE = 0.022;  // <-- Sprite size; screen-constant because sizeAttenuation is off
    const Na__VsViz__LABEL_CANVAS_PX    = 128;    // <-- Label texture resolution
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Drag Feedback and Live Curve Rebuild
    // ------------------------------------------------------------
    const Na__VsViz__HOVER_MARKER_SCALE  = 1.30;          // <-- Frustum growth when grabbable
    const Na__VsViz__HOVER_LABEL_SCALE   = 1.35;          // <-- Numbered label growth when grabbable
    const Na__VsViz__DRAG_DIVISIONS      = 200;           // <-- Coarser than the resting curve; drag stays responsive
    const Na__VsViz__DRAG_CURVE_TYPE     = 'centripetal'; // <-- Must match the sampler or the preview would lie
    const Na__VsViz__DRAG_CURVE_TENSION  = 0.5;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Axis Guide (Constrained Drag)
    // ------------------------------------------------------------
    // Colours follow SKETCHUP, not the Three.js default, because every person
    // using this tool reads SketchUp axes all day and that muscle memory is
    // worth more than internal consistency with the library.
    //
    // SketchUp is Z-up and Three.js is Y-up, so the vertical axis changes name
    // between them but must keep its colour. The mapping is by DIRECTION:
    //
    //   vertical        -> blue    (Three.js Y, SketchUp Z)
    //   ground, X       -> green   (Three.js X, SketchUp Y)
    //   ground, Z       -> red     (Three.js Z, SketchUp X)
    //
    // The two ground axes are the way round they are because that is how this
    // app's SketchUp import actually lands them, confirmed against a real
    // model rather than derived from the conversion on paper. Do not "correct"
    // them to match the Three.js convention: getting these backwards is worse
    // than having no colour at all, because a confidently wrong colour sends
    // someone dragging along the axis they were trying to avoid.
    // ------------------------------------------------------------
    const Na__VsViz__AXIS_GUIDE_LENGTH = 120;       // <-- Half-length in metres; effectively infinite for a building
    const Na__VsViz__AXIS_COLOR_X      = 0x00a000;  // <-- Green : ground axis, reads as SketchUp green
    const Na__VsViz__AXIS_COLOR_Y      = 0x0044dd;  // <-- Blue  : vertical, matches SketchUp blue
    const Na__VsViz__AXIS_COLOR_Z      = 0xee0000;  // <-- Red   : ground axis, reads as SketchUp red
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Aim Guide (Ctrl+Shift Turn)
    // ------------------------------------------------------------
    // Turning a waypoint has no world axis to show, so it gets a ray along the
    // shot's own view direction instead: where this camera is now pointing.
    // Purple deliberately sits outside the SketchUp axis set, because it is not
    // an axis and should not be mistaken for one.
    //
    // Drawn forward only, from the waypoint outward, so it reads as an aim
    // rather than as a line the waypoint happens to sit on.
    // ------------------------------------------------------------
    const Na__VsViz__AIM_GUIDE_LENGTH = 60;         // <-- Metres forward from the waypoint
    const Na__VsViz__AIM_COLOR        = 0x9b4dff;   // <-- Purple: a direction, not an axis
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Scene References and Toggle State
    // ------------------------------------------------------------
    let Na__VsViz__Scene         = null;         // <-- Three.js scene reference
    let Na__VsViz__Renderer      = null;         // <-- Renderer, for fat line resolution
    let Na__VsViz__VizGroup      = null;         // <-- Dedicated group for all overlay objects
    // Default on: a path you cannot see is a path you cannot judge or drag, and
    // the overlay only ever draws once a video is actually open, so this costs
    // nothing until there is something to show.
    let Na__VsViz__IsVisible     = true;         // <-- Dev menu toggle state
    let Na__VsViz__IsInitialized = false;        // <-- Guard double init
    // ------------------------------------------------------------


    // MODULE VARIABLES | Suppression Reasons
    // ------------------------------------------------------------
    // The overlay has to disappear for more than one reason and they overlap:
    // an export renders frames that must not contain markers, and a preview
    // flies the camera THROUGH the waypoints, where a marker sitting on the
    // lens fills the screen. Tracking reasons in a set means whichever ends
    // last cannot switch the overlay back on while the other still needs it.
    // ------------------------------------------------------------
    const Na__VsViz__SuppressionReasons = new Set();
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Material References
    // ------------------------------------------------------------
    let Na__VsViz__LineMaterials = [];      // <-- Fat line materials needing resolution updates
    // ------------------------------------------------------------


    // MODULE VARIABLES | Drag Handles
    // ------------------------------------------------------------
    // Rebuilding the whole overlay on every pointermove would allocate a fresh
    // Line2, sprites and cones sixty times a second, which is exactly the kind
    // of churn that makes a drag feel sticky.  Holding references to the pieces
    // lets a drag move one marker and rewrite the line's vertex buffer in place
    // instead, with the full rebuild deferred to the drop.
    // ------------------------------------------------------------
    let Na__VsViz__DragTargets  = [];       // <-- { index, keyframeId, position } per keyframe
    let Na__VsViz__MarkerGroups = [];       // <-- Frustum marker group per keyframe
    let Na__VsViz__LabelSprites = [];       // <-- Numbered sprite per keyframe
    let Na__VsViz__PathLine     = null;     // <-- The Line2 whose geometry a drag rewrites
    let Na__VsViz__ArrowGroup   = null;     // <-- Direction cones, hidden mid-drag
    let Na__VsViz__ClosedLoop   = false;    // <-- Needed to rebuild the curve during a drag
    let Na__VsViz__HoveredIndex = -1;       // <-- Marker currently under the pointer
    let Na__VsViz__AxisGuide    = null;     // <-- Constraint line shown during a Ctrl drag
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resolution and Disposal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Overlay Suppressed by Any Reason?
    // ------------------------------------------------------------
    function Na__VsViz__IsSuppressed() {
        return Na__VsViz__SuppressionReasons.size > 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Current Drawing Buffer Size for Fat Lines
    // ------------------------------------------------------------
    function Na__VsViz__GetLineResolution() {
        if (!Na__VsViz__Renderer) return new THREE.Vector2(1920, 1080);      // <-- Harmless placeholder

        const size  = Na__VsViz__Renderer.getSize(new THREE.Vector2());
        const ratio = Na__VsViz__Renderer.getPixelRatio();
        return new THREE.Vector2(size.x * ratio, size.y * ratio);            // <-- Physical drawing buffer pixels
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Fat Line Resolution After a Viewport Resize
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__UpdateResolution() {
        if (Na__VsViz__LineMaterials.length === 0) return;

        const resolution = Na__VsViz__GetLineResolution();
        Na__VsViz__LineMaterials.forEach((material) => {
            material.resolution.copy(resolution);                            // <-- Screen-space width stays constant
        });

        if (Na__VsViz__IsVisible) Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispose All Geometries, Materials and Textures in a Group
    // ------------------------------------------------------------
    function Na__VsViz__DisposeGroup(group) {
        if (!group) return;

        group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();

            const materials = Array.isArray(child.material)
                ? child.material
                : (child.material ? [child.material] : []);

            materials.forEach((material) => {
                if (material.map) material.map.dispose();                    // <-- Sprite label canvas textures
                material.dispose();
            });
        });

        Na__VsViz__LineMaterials = [];                                       // <-- Drop stale material references
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Overlay Construction Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Fat Gradient Line Along the Camera Path
    // ------------------------------------------------------------
    function Na__VsViz__BuildPathLine(points) {
        if (!points || points.length < 2) return null;

        const positions = [];
        const colors    = [];
        const startCol  = new THREE.Color(Na__VsViz__PATH_START_COLOR);
        const endCol    = new THREE.Color(Na__VsViz__PATH_END_COLOR);
        const mixed     = new THREE.Color();

        points.forEach((point, index) => {
            positions.push(point.x, point.y, point.z);

            const t = (points.length > 1) ? index / (points.length - 1) : 0;
            mixed.copy(startCol).lerp(endCol, t);                            // <-- Gradient reads as direction of travel
            colors.push(mixed.r, mixed.g, mixed.b);
        });

        const geometry = new LineGeometry();
        geometry.setPositions(positions);
        geometry.setColors(colors);

        const material = new LineMaterial({
            linewidth    : Na__VsViz__LINE_WIDTH_PX,
            resolution   : Na__VsViz__GetLineResolution(),
            worldUnits   : false,                                            // <-- Constant screen-space thickness
            vertexColors : true,
            transparent  : true,
            opacity      : 0.95,
            depthTest    : false,                                            // <-- Visible through walls for inspection
            depthWrite   : false
        });

        const line = new Line2(geometry, material);
        line.computeLineDistances();
        line.renderOrder   = Na__VsViz__RENDER_ORDER;
        line.frustumCulled = false;                                          // <-- LineGeometry bounds are unreliable at this scale

        Na__VsViz__LineMaterials.push(material);                             // <-- Track for resize updates
        return line;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Wireframe Camera Frustum Marker
    // ------------------------------------------------------------
    // Built in local space pointing down -Z, matching Three.js camera
    // convention, then oriented by the keyframe quaternion.
    // ------------------------------------------------------------
    function Na__VsViz__BuildKeyframeMarker(position, quaternion, isSelected) {
        const group = new THREE.Group();
        group.position.copy(position);
        group.quaternion.copy(quaternion);

        const size     = Na__VsViz__FRUSTUM_SIZE * (isSelected ? 1.35 : 1.0);
        const color    = isSelected ? Na__VsViz__SELECTED_COLOR : Na__VsViz__MARKER_COLOR;
        const halfW    = size * 0.55;
        const halfH    = size * 0.36;
        const depth    = -size;                                              // <-- Negative Z is the camera look direction

        const material = new THREE.LineBasicMaterial({
            color       : color,
            transparent : true,
            opacity     : 0.95,
            depthTest   : false,
            depthWrite  : false
        });

        const apex = new THREE.Vector3(0, 0, 0);
        const tl   = new THREE.Vector3(-halfW,  halfH, depth);
        const tr   = new THREE.Vector3( halfW,  halfH, depth);
        const br   = new THREE.Vector3( halfW, -halfH, depth);
        const bl   = new THREE.Vector3(-halfW, -halfH, depth);

        const points = [
            apex, tl,  apex, tr,  apex, br,  apex, bl,                       // <-- Four rays from the lens
            tl, tr,    tr, br,    br, bl,    bl, tl                          // <-- Image plane rectangle
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const frustum  = new THREE.LineSegments(geometry, material);
        frustum.renderOrder   = Na__VsViz__RENDER_ORDER + 1;
        frustum.frustumCulled = false;
        group.add(frustum);

        // LOOK DIRECTION STUB | Short line showing exactly where this shot aims
        const stubMaterial = new THREE.LineBasicMaterial({
            color       : Na__VsViz__LOOK_STUB_COLOR,
            transparent : true,
            opacity     : 0.5,
            depthTest   : false,
            depthWrite  : false
        });
        const stubGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -Na__VsViz__LOOK_STUB_LENGTH)
        ]);
        const stub = new THREE.Line(stubGeometry, stubMaterial);
        stub.renderOrder   = Na__VsViz__RENDER_ORDER + 1;
        stub.frustumCulled = false;
        group.add(stub);

        return group;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Screen-Space Numbered Label Sprite
    // ------------------------------------------------------------
    function Na__VsViz__BuildLabelSprite(position, labelText, isSelected) {
        const px     = Na__VsViz__LABEL_CANVAS_PX;
        const canvas = document.createElement('canvas');
        canvas.width  = px;
        canvas.height = px;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const fill = isSelected ? '#e71d36' : '#2ec4b6';

        ctx.beginPath();
        ctx.arc(px / 2, px / 2, px * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth   = px * 0.06;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle    = '#ffffff';
        ctx.font         = `600 ${Math.round(px * 0.46)}px "Open Sans", Arial, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(labelText), px / 2, px / 2 + px * 0.02);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map         : texture,
            transparent : true,
            depthTest   : false,
            depthWrite  : false,
            sizeAttenuation : false                                          // <-- Constant on-screen size at any distance
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.position.y += Na__VsViz__LABEL_OFFSET_Y;
        sprite.scale.set(Na__VsViz__LABEL_SCREEN_SCALE, Na__VsViz__LABEL_SCREEN_SCALE, 1);
        sprite.renderOrder   = Na__VsViz__RENDER_ORDER + 2;
        sprite.frustumCulled = false;

        return sprite;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Direction-of-Travel Cones Along the Curve
    // ------------------------------------------------------------
    function Na__VsViz__BuildDirectionArrows(curve) {
        if (!curve) return null;

        // COUNT | Roughly one cone every ARROW_SPACING metres, clamped
        let pathLength = 0;
        try {
            pathLength = curve.getLength();
        } catch (lengthError) {
            pathLength = 0;
        }

        // DEGENERATE PATH | Keyframes stacked on one spot give a zero-length
        // curve, and getPointAt would divide by that zero and hand back NaN
        // positions.  There is no direction to show, so draw no arrows.
        if (!Number.isFinite(pathLength) || pathLength < 1e-4) return null;

        const count = Math.max(
            Na__VsViz__ARROW_MIN_COUNT,
            Math.min(Na__VsViz__ARROW_MAX_COUNT, Math.round(pathLength / Na__VsViz__ARROW_SPACING))
        );

        const group    = new THREE.Group();
        const geometry = new THREE.ConeGeometry(Na__VsViz__ARROW_RADIUS, Na__VsViz__ARROW_LENGTH, 8);
        const material = new THREE.MeshBasicMaterial({
            color       : Na__VsViz__ARROW_COLOR,
            transparent : true,
            opacity     : 0.85,
            depthTest   : false,
            depthWrite  : false
        });

        const upAxis  = new THREE.Vector3(0, 1, 0);                          // <-- ConeGeometry points along +Y
        const tangent = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            const u = (i + 0.5) / count;                                     // <-- Offset so no cone sits on a keyframe

            const point = curve.getPointAt(u);
            tangent.copy(curve.getTangentAt(u)).normalize();

            const cone = new THREE.Mesh(geometry, material);                 // <-- Geometry and material shared across cones
            cone.position.copy(point);
            cone.quaternion.setFromUnitVectors(upAxis, tangent);             // <-- Aim the cone down the direction of travel
            cone.renderOrder   = Na__VsViz__RENDER_ORDER + 1;
            cone.frustumCulled = false;
            group.add(cone);
        }

        // The cone geometry and material are shared across every arrow; the
        // traverse-based disposer will call dispose on them once per cone,
        // which three treats as idempotent.
        return group;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visualizer Build and Destroy
// -----------------------------------------------------------------------------

    // FUNCTION | Build (or Rebuild) the Overlay from the Active Video
    // ------------------------------------------------------------
    function Na__VsViz__BuildVisualizer() {
        if (!Na__VsViz__Scene) return;

        // REMOVE EXISTING GROUP
        if (Na__VsViz__VizGroup) {
            Na__VsViz__DisposeGroup(Na__VsViz__VizGroup);
            Na__VsViz__Scene.remove(Na__VsViz__VizGroup);
            Na__VsViz__VizGroup = null;
        }

        const video = Na__VideoStudio__ProjectJson__GetVideoById(
            Na__VideoStudio__ProjectJson__GetActiveVideoId()
        );
        if (!video) return;                                                  // <-- No video selected; nothing to draw

        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        if (!timeline) return;                                               // <-- No usable keyframes yet

        const group = new THREE.Group();
        group.name    = Na__VsViz__GROUP_NAME;
        group.visible = Na__VsViz__IsVisible && !Na__VsViz__IsSuppressed();

        const selectedId = Na__VideoStudio__ProjectJson__GetActiveKeyframeId();

        // DRAG STATE | Reset the handles the dragger picks against
        Na__VsViz__DragTargets  = [];
        Na__VsViz__MarkerGroups = [];
        Na__VsViz__LabelSprites = [];
        Na__VsViz__PathLine     = null;
        Na__VsViz__ArrowGroup   = null;
        Na__VsViz__ClosedLoop   = timeline.closedLoop;

        // PATH | Fat gradient line plus direction cones (needs two or more keys)
        if (timeline.curve) {
            const points = Na__VideoStudio__PathSampler__GetCurvePoints(timeline, Na__VsViz__CURVE_DIVISIONS);

            const pathLine = Na__VsViz__BuildPathLine(points);
            if (pathLine) {
                group.add(pathLine);
                Na__VsViz__PathLine = pathLine;                              // <-- Kept so a drag can rewrite its geometry
            }

            const arrows = Na__VsViz__BuildDirectionArrows(timeline.curve);
            if (arrows) {
                group.add(arrows);
                Na__VsViz__ArrowGroup = arrows;                              // <-- Hidden during a drag, rebuilt on drop
            }
        }

        // KEYFRAMES | Frustum marker, look stub and numbered label per keyframe
        timeline.keyframes.forEach((keyframe, index) => {
            const isSelected = keyframe.VideoStudio__Keyframe__Id === selectedId;
            const position   = timeline.positions[index];
            const quaternion = timeline.quaternions[index];

            const marker = Na__VsViz__BuildKeyframeMarker(position, quaternion, isSelected);
            group.add(marker);
            Na__VsViz__MarkerGroups.push(marker);

            const label = Na__VsViz__BuildLabelSprite(position, index + 1, isSelected);
            if (label) group.add(label);
            Na__VsViz__LabelSprites.push(label || null);

            Na__VsViz__DragTargets.push({
                index      : index,
                keyframeId : keyframe.VideoStudio__Keyframe__Id,
                position   : position.clone()                                // <-- Live copy the dragger mutates
            });
        });

        Na__VsViz__Scene.add(group);
        Na__VsViz__VizGroup = group;

        Na__RenderLoop__RequestRender();                                     // <-- Show the updated overlay immediately
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle Overlay Visibility
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__Toggle(visible) {
        const target = (typeof visible === 'boolean') ? visible : !Na__VsViz__IsVisible;
        Na__VsViz__IsVisible = target;

        if (!Na__VsViz__VizGroup && target) {
            Na__VsViz__BuildVisualizer();                                    // <-- Build lazily on first enable
            return;
        }

        if (Na__VsViz__VizGroup) {
            Na__VsViz__VizGroup.visible = target && !Na__VsViz__IsSuppressed();
            Na__RenderLoop__RequestRender();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Overlay Is Currently Enabled
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__IsVisible() {
        return Na__VsViz__IsVisible;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Overlay After a Data Change
    // ------------------------------------------------------------
    // Cheap to call: no-ops entirely while the overlay is switched off.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__Rebuild() {
        if (!Na__VsViz__IsVisible) return;
        Na__VsViz__BuildVisualizer();
    }
    // ------------------------------------------------------------


    // FUNCTION | Suppress the Overlay for a Named Reason
    // ------------------------------------------------------------
    // Keeps the user's toggle state intact; the overlay returns once every
    // reason has been released.  Reasons in use: 'export', 'preview'.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__SetSuppressed(reason, suppressed) {
        if (suppressed) Na__VsViz__SuppressionReasons.add(reason);
        else            Na__VsViz__SuppressionReasons.delete(reason);

        if (Na__VsViz__VizGroup) {
            Na__VsViz__VizGroup.visible = Na__VsViz__IsVisible && !Na__VsViz__IsSuppressed();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Draggable Keyframe Handles
    // ------------------------------------------------------------
    // Returns the live array, so the dragger reads current positions without
    // a copy each frame.  Empty while the overlay is hidden or unbuilt.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__GetDragTargets() {
        return Na__VsViz__DragTargets;
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight the Marker Under the Pointer
    // ------------------------------------------------------------
    // Pure scale feedback: no geometry or texture is rebuilt, so this is cheap
    // enough to call on every pointermove.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__SetHovered(index) {
        const next = Number.isInteger(index) ? index : -1;
        if (next === Na__VsViz__HoveredIndex) return;

        const applyScale = (target, scale) => {
            if (!target) return;
            target.scale.setScalar(scale);
        };

        // RESTORE | Previous hover back to its resting size
        if (Na__VsViz__HoveredIndex >= 0) {
            applyScale(Na__VsViz__MarkerGroups[Na__VsViz__HoveredIndex], 1.0);
            const previousLabel = Na__VsViz__LabelSprites[Na__VsViz__HoveredIndex];
            if (previousLabel) {
                previousLabel.scale.set(Na__VsViz__LABEL_SCREEN_SCALE, Na__VsViz__LABEL_SCREEN_SCALE, 1);
            }
        }

        Na__VsViz__HoveredIndex = next;

        // APPLY | New hover grows so it reads as grabbable
        if (next >= 0) {
            applyScale(Na__VsViz__MarkerGroups[next], Na__VsViz__HOVER_MARKER_SCALE);
            const label = Na__VsViz__LabelSprites[next];
            if (label) {
                const size = Na__VsViz__LABEL_SCREEN_SCALE * Na__VsViz__HOVER_LABEL_SCALE;
                label.scale.set(size, size, 1);
            }
        }

        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Move One Keyframe Handle and Reflow the Path Live
    // ------------------------------------------------------------
    // Called on every pointermove during a drag.  Moves the marker and its
    // label, then rewrites the fat line's vertex buffer from a curve rebuilt
    // through the updated handle positions.  The direction cones are hidden
    // for the duration because re-aiming them needs a full arc-length pass.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__SetDragPreview(index, positionUnits) {
        const target = Na__VsViz__DragTargets[index];
        if (!target || !positionUnits) return;

        target.position.copy(positionUnits);

        const marker = Na__VsViz__MarkerGroups[index];
        if (marker) marker.position.copy(positionUnits);

        const label = Na__VsViz__LabelSprites[index];
        if (label) {
            label.position.copy(positionUnits);
            label.position.y += Na__VsViz__LABEL_OFFSET_Y;
        }

        if (Na__VsViz__ArrowGroup) Na__VsViz__ArrowGroup.visible = false;

        // PATH | Rebuild the curve through the moved handles and push the new
        // points straight into the existing geometry.
        if (Na__VsViz__PathLine && Na__VsViz__DragTargets.length >= 2) {
            const controlPoints = Na__VsViz__DragTargets.map(handle => handle.position);
            const curve = new THREE.CatmullRomCurve3(
                controlPoints,
                Na__VsViz__ClosedLoop,
                Na__VsViz__DRAG_CURVE_TYPE,
                Na__VsViz__DRAG_CURVE_TENSION
            );

            const points    = curve.getPoints(Na__VsViz__DRAG_DIVISIONS);
            const positions = [];
            points.forEach(point => positions.push(point.x, point.y, point.z));

            Na__VsViz__PathLine.geometry.setPositions(positions);
        }

        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Aim One Keyframe Marker Live During a Rotate Drag
    // ------------------------------------------------------------
    // Only the frustum group turns; the numbered label is a screen-facing
    // sprite and has no meaningful orientation.  The path itself is unaffected,
    // because rotating a waypoint changes where it looks, not where it sits.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__SetDragRotation(index, quaternion) {
        const marker = Na__VsViz__MarkerGroups[index];
        if (!marker || !quaternion) return;

        marker.quaternion.copy(quaternion);
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Read One Keyframe Marker's Current Orientation
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__GetMarkerQuaternion(index) {
        const marker = Na__VsViz__MarkerGroups[index];
        return marker ? marker.quaternion.clone() : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drop Whatever Guide Line Is Currently Drawn
    // ------------------------------------------------------------
    // One slot serves both the axis guides and the aim guide, so a mode change
    // cannot leave two lines fighting for the same meaning.
    // ------------------------------------------------------------
    function Na__VsViz__ClearGuide() {
        if (!Na__VsViz__AxisGuide) return;

        if (Na__VsViz__AxisGuide.parent) Na__VsViz__AxisGuide.parent.remove(Na__VsViz__AxisGuide);
        Na__VsViz__AxisGuide.geometry.dispose();
        Na__VsViz__AxisGuide.material.dispose();
        Na__VsViz__AxisGuide = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Guide Line Between Two Points
    // ------------------------------------------------------------
    // Depth testing off and a high render order, so a guide is readable through
    // the model rather than disappearing inside a wall.
    // ------------------------------------------------------------
    function Na__VsViz__BuildGuide(start, end, color) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({
            color       : color,
            transparent : true,
            opacity     : 0.8,
            depthTest   : false,
            depthWrite  : false
        });

        const guide = new THREE.Line(geometry, material);
        guide.renderOrder   = Na__VsViz__RENDER_ORDER;
        guide.frustumCulled = false;

        Na__VsViz__VizGroup.add(guide);
        Na__VsViz__AxisGuide = guide;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Clear the Axis Constraint Guide
    // ------------------------------------------------------------
    // axis is 'x', 'y', 'z' or null.  Draws a world-aligned line through the
    // origin point so a constrained drag reads as running along a real axis
    // rather than just refusing to move in the other directions.
    //
    // Used by both constrained modes: 'y' for a Shift drag, and 'x' or 'z' for
    // whichever axis a Ctrl drag has committed to.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__SetAxisGuide(axis, originUnits) {
        Na__VsViz__ClearGuide();

        if (!axis || !originUnits || !Na__VsViz__VizGroup) {
            Na__RenderLoop__RequestRender();
            return;
        }

        const direction = new THREE.Vector3(
            axis === 'x' ? 1 : 0,
            axis === 'y' ? 1 : 0,
            axis === 'z' ? 1 : 0
        );

        const color = (axis === 'x') ? Na__VsViz__AXIS_COLOR_X
                    : (axis === 'y') ? Na__VsViz__AXIS_COLOR_Y
                    :                  Na__VsViz__AXIS_COLOR_Z;

        // Both ways from the origin: an axis constraint runs in both directions
        Na__VsViz__BuildGuide(
            originUnits.clone().addScaledVector(direction, -Na__VsViz__AXIS_GUIDE_LENGTH),
            originUnits.clone().addScaledVector(direction,  Na__VsViz__AXIS_GUIDE_LENGTH),
            color
        );

        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Clear the Aim Guide
    // ------------------------------------------------------------
    // A ray from the waypoint along its own view direction, for the Ctrl+Shift
    // turn where there is no world axis to show. Shares the single guide slot
    // with the axis lines, so only one is ever on screen and the two can never
    // be confused for each other.
    //
    // Pass a null quaternion to clear.
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__SetAimGuide(originUnits, quaternion) {
        Na__VsViz__ClearGuide();

        if (!originUnits || !quaternion || !Na__VsViz__VizGroup) {
            Na__RenderLoop__RequestRender();
            return;
        }

        // Negative Z is the Three.js camera look direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

        // Forward only, so it reads as an aim rather than an axis
        Na__VsViz__BuildGuide(
            originUnits.clone(),
            originUnits.clone().addScaledVector(forward, Na__VsViz__AIM_GUIDE_LENGTH),
            Na__VsViz__AIM_COLOR
        );

        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Finish a Drag and Restore the Full Overlay
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__EndDragPreview() {
        Na__VideoStudio__PathVisualizer__SetAxisGuide(null, null);           // <-- Guide never outlives the drag
        if (Na__VsViz__ArrowGroup) Na__VsViz__ArrowGroup.visible = true;
        Na__VsViz__HoveredIndex = -1;
        Na__VsViz__BuildVisualizer();                                        // <-- Full rebuild: cones re-aimed, gradient redone
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize the Path Visualizer
    // ------------------------------------------------------------
    function Na__VideoStudio__PathVisualizer__Initialize(scene, renderer) {
        if (Na__VsViz__IsInitialized) return;
        Na__VsViz__IsInitialized = true;

        Na__VsViz__Scene    = scene;
        Na__VsViz__Renderer = renderer;

        window.addEventListener('resize', Na__VideoStudio__PathVisualizer__UpdateResolution);

        console.log('[ValeVision3D] Video Studio path visualizer initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Path Visualizer API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__PathVisualizer__Initialize,
        Na__VideoStudio__PathVisualizer__Toggle,
        Na__VideoStudio__PathVisualizer__IsVisible,
        Na__VideoStudio__PathVisualizer__Rebuild,
        Na__VideoStudio__PathVisualizer__UpdateResolution,
        Na__VideoStudio__PathVisualizer__SetSuppressed,
        Na__VideoStudio__PathVisualizer__GetDragTargets,
        Na__VideoStudio__PathVisualizer__SetHovered,
        Na__VideoStudio__PathVisualizer__SetDragPreview,
        Na__VideoStudio__PathVisualizer__SetDragRotation,
        Na__VideoStudio__PathVisualizer__GetMarkerQuaternion,
        Na__VideoStudio__PathVisualizer__SetAxisGuide,
        Na__VideoStudio__PathVisualizer__SetAimGuide,
        Na__VideoStudio__PathVisualizer__EndDragPreview
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
