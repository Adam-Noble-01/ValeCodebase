/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | PHOTO CARDS
   =============================================================================

   FILE       : DistoImageMapper__Env3d__PhotoCards__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - PhotoCards
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Loads every photo onto its point and arranges them in 3D space
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   Three arrangements:
   - On the Point (the default): every photo faces you with its crosshair exactly on
     the point, see-through so the model reads behind it.
   - Atlas: every photo faces you, lifted off its point on a leader, and the photos
     push each other apart so all of them stay readable from any angle.
   - As Shot: every photo faces the tripod, at the distance it was measured and
     the true size of what the Pointfinder saw. Seen from the Tripod view they
     line up with each other as one panorama of the site.

   ---------------------------------------------------------------------------

   THE ATLAS LAYOUT:
   Worked in screen pixels, from the camera, every frame. Each photo keeps an offset
   from its home above its point. Overlapping photos push each other apart along
   whichever axis is the shorter way out, and a weak spring pulls each back toward
   home. Starting each frame from where the last one ended makes this an animation:
   as the view turns the photos slide round each other and settle, and then the
   draw loop stops. Only photos whose point is on screen take part.

   Photos draw without the depth test and in order of distance, so a sheet can
   never slice through one. In As Shot they are real planes in the scene, so they
   take the depth test back.

   ---------------------------------------------------------------------------

   THE TRUE SIZE OF A PHOTO:
   A photo taken with field of view F at distance D shows a square 2 D tan(F / 2)
   across, with the crosshair (the measured point) at the middle.

   ============================================================================= */

import * as THREE from 'three';

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Coords__MmToWorld, DistoImageMapper__Coords__ModelToWorld } from './DistoImageMapper__Env3d__Coordinates__.mjs';
import {
    DistoImageMapper__Env3d__CameraRig__ActiveCamera,
    DistoImageMapper__Env3d__CameraRig__PixelsPerMetre
} from './DistoImageMapper__Env3d__CameraRig__.mjs';
import {
    DistoImageMapper__Env3d__SceneManager__AddFrameTask,
    DistoImageMapper__Env3d__SceneManager__Canvas,
    DistoImageMapper__Env3d__SceneManager__Invalidate,
    DistoImageMapper__Env3d__SceneManager__Renderer,
    DistoImageMapper__Env3d__SceneManager__Scene,
    DistoImageMapper__Env3d__SceneManager__ViewportSize
} from './DistoImageMapper__Env3d__SceneManager__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Arrangement Names and Draw Order
    // ------------------------------------------------------------
    export const DistoImageMapper__Env3d__PhotoCards__Arrangements  =  { Atlas : 'Atlas', OnPoint : 'OnPoint', AsShot : 'AsShot' };

    const ARRANGEMENT      =  DistoImageMapper__Env3d__PhotoCards__Arrangements;
    const DEG_TO_RAD       =  Math.PI / 180;
    const ORDER_LEADERS    =  50;                                            // <-- Over the sheets and the survey line
    const ORDER_CARDS_FROM =  100;                                           // <-- Then the photos, far to near
    const ORDER_CARDS_SPAN =  800;
    const ORDER_FOCUS      =  1000;                                          // <-- The focused photo above them all
    const SETTLED_MOVE_PX  =  0.08;                                          // <-- Less than this per frame and the layout has stopped
    const FONT_FAMILY      =  '"Open Sans", sans-serif';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cards and Settings
    // ------------------------------------------------------------
    let Group           =  null;
    let Cards           =  [];
    let Leaders         =  null;
    let LeaderPositions =  null;
    let LeaderColours   =  null;
    let FocusFrame      =  null;
    let Station         =  null;                                             // <-- World position of the tripod, or null
    let UnitPlane       =  null;

    let Arrangement     =  ARRANGEMENT.OnPoint;
    let SizeScale       =  1;
    let LiftPx          =  22;
    let PhotoOpacity    =  1;
    let FieldOfViewDeg  =  4.1;
    let FocusIndex      =  -1;                                               // <-- Framed in red: hovered, or else the one last expanded
    let GrowIndex       =  -1;                                               // <-- Grown as well: only while hovered, so a framed photo covers nothing
    let LayoutDirty     =  false;
    let StillFrames     =  0;

    const LastCameraWorld       =  new Float64Array(16);
    const LastCameraProjection  =  new Float64Array(16);

    const Raycaster     =  new THREE.Raycaster();
    const Pointer       =  new THREE.Vector2();
    const ViewPosition  =  new THREE.Vector3();
    const WorldRight    =  new THREE.Vector3();
    const WorldUp       =  new THREE.Vector3();
    const ColourNormal  =  new THREE.Color();
    const ColourFocus   =  new THREE.Color();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Card Textures
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Photo File Into Something Drawable
    // ------------------------------------------------------------
    async function DistoImageMapper__Env3d__PhotoCards__ReadImage(file) {
        if (typeof window.createImageBitmap === 'function') {
            try {
                return await window.createImageBitmap(file);
            } catch (error) {
                // <-- Fall through to an image element, which reads more formats
            }
        }

        const url    =  URL.createObjectURL(file);
        const image  =  new Image();
        image.src    =  url;
        await image.decode();
        URL.revokeObjectURL(url);
        return image;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Canvas as a Texture
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__ToTexture(canvas) {
        const texture  =  new THREE.CanvasTexture(canvas);
        texture.colorSpace       =  THREE.SRGBColorSpace;
        texture.generateMipmaps  =  true;
        texture.minFilter        =  THREE.LinearMipmapLinearFilter;
        texture.anisotropy       =  Math.min(4, DistoImageMapper__Env3d__SceneManager__Renderer().capabilities.getMaxAnisotropy());
        return texture;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Framed Card: White Mat, Photo, Number Tag
    // ------------------------------------------------------------
    // The mat is even all round so the photo's centre, and its crosshair, stays the
    // card's centre. The tag covers a corner and never reaches the crosshair.
    function DistoImageMapper__Env3d__PhotoCards__DrawFramed(image, number, config, colours) {
        const imageWidth   =  image ? image.width : 1;
        const imageHeight  =  image ? image.height : 1;
        const aspect       =  imageWidth / imageHeight;
        const long         =  config.TextureLongSidePx;
        const width        =  aspect >= 1 ? long : Math.round(long * aspect);
        const height       =  aspect >= 1 ? Math.round(long / aspect) : long;

        const canvas   =  document.createElement('canvas');
        canvas.width   =  width;
        canvas.height  =  height;
        const context  =  canvas.getContext('2d');

        context.fillStyle  =  '#ffffff';
        context.fillRect(0, 0, width, height);

        const mat  =  config.MatPx;
        if (image) {
            context.imageSmoothingQuality  =  'high';
            context.drawImage(image, mat, mat, width - mat * 2, height - mat * 2);
        } else {
            context.fillStyle  =  '#e4e7ea';
            context.fillRect(mat, mat, width - mat * 2, height - mat * 2);
            context.fillStyle     =  colours.Ink;
            context.font          =  `400 ${Math.round(height * 0.1)}px ${FONT_FAMILY}`;
            context.textAlign     =  'center';
            context.textBaseline  =  'middle';
            context.fillText('No photo', width / 2, height * 0.56);
        }

        const tagHeight  =  Math.round(height * config.TagHeightRatio);
        const fontPx     =  Math.round(tagHeight * 0.76);
        const text       =  String(number);
        context.font     =  `600 ${fontPx}px ${FONT_FAMILY}`;
        const tagWidth   =  Math.round(context.measureText(text).width + fontPx * 0.62);

        context.fillStyle  =  colours.Ink;
        context.fillRect(0, 0, tagWidth, tagHeight);
        context.fillStyle     =  '#ffffff';
        context.textAlign     =  'center';
        context.textBaseline  =  'middle';
        context.fillText(text, tagWidth / 2, tagHeight * 0.53);

        context.strokeStyle  =  colours.Ink;
        context.lineWidth    =  5;
        context.strokeRect(0, 0, width, height);

        return { Canvas : canvas, Aspect : width / height };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Plain Photo, for As Shot
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__DrawPlain(image, framed) {
        if (!image) return framed.Canvas;

        const canvas   =  document.createElement('canvas');
        canvas.width   =  image.width;
        canvas.height  =  image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load One Card's Textures
    // ------------------------------------------------------------
    async function DistoImageMapper__Env3d__PhotoCards__LoadCard(card, generation, config, colours) {
        let image  =  null;
        if (card.Point.ImageFile) {
            try {
                image  =  await DistoImageMapper__Env3d__PhotoCards__ReadImage(card.Point.ImageFile);
            } catch (error) {
                image  =  null;                                              // <-- An unreadable photo shows as No photo, not a failed survey
            }
        }

        if (generation !== card.Generation) return;                          // <-- A new survey opened while this was reading

        const framed  =  DistoImageMapper__Env3d__PhotoCards__DrawFramed(image, card.Point.Number, config, colours);
        card.TextureFramed  =  DistoImageMapper__Env3d__PhotoCards__ToTexture(framed.Canvas);
        card.TexturePlain   =  DistoImageMapper__Env3d__PhotoCards__ToTexture(DistoImageMapper__Env3d__PhotoCards__DrawPlain(image, framed));
        card.Aspect         =  framed.Aspect;

        if (image && typeof image.close === 'function') image.close();

        card.Material.map  =  Arrangement === ARRANGEMENT.AsShot ? card.TexturePlain : card.TextureFramed;
        card.Material.needsUpdate  =  true;
        card.Ready         =  true;
        card.Mesh.visible  =  card.IsKept;
        LayoutDirty        =  true;

        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Atlas Layout
// -----------------------------------------------------------------------------

    // SUB FUNCTION | One Relaxation Pass: Push Apart, Pull Home, Stay on Screen
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__Relax(active, config, halfWidth, halfHeight) {
        const gap  =  config.GapPx;

        for (let pass = 0; pass < config.RelaxIterations; pass++) {

            for (let i = 0; i < active.length; i++) {
                const a  =  active[i];
                for (let j = i + 1; j < active.length; j++) {
                    const b  =  active[j];

                    const dx        =  (a.HomeX + a.OffsetX) - (b.HomeX + b.OffsetX);
                    const overlapX  =  (a.WidthPx + b.WidthPx) / 2 + gap - Math.abs(dx);
                    if (overlapX <= 0) continue;

                    const dy        =  (a.HomeY + a.OffsetY) - (b.HomeY + b.OffsetY);
                    const overlapY  =  (a.HeightPx + b.HeightPx) / 2 + gap - Math.abs(dy);
                    if (overlapY <= 0) continue;

                    if (overlapX < overlapY) {                               // <-- The shorter way out
                        const direction  =  dx !== 0 ? Math.sign(dx) : (a.Index < b.Index ? -1 : 1);
                        const push       =  overlapX * config.RelaxPush * direction;
                        a.OffsetX += push;
                        b.OffsetX -= push;
                    } else {
                        const direction  =  dy !== 0 ? Math.sign(dy) : (a.Index < b.Index ? 1 : -1);
                        const push       =  overlapY * config.RelaxPush * direction;
                        a.OffsetY += push;
                        b.OffsetY -= push;
                    }
                }
            }

            for (const card of active) {
                card.OffsetX *= 1 - config.RelaxSpring;
                card.OffsetY *= 1 - config.RelaxSpring;

                const reach  =  card.SizePx * config.SpreadMaximumRatio;     // <-- Never so far the leader stops explaining it
                card.OffsetX  =  THREE.MathUtils.clamp(card.OffsetX, -reach, reach);
                card.OffsetY  =  THREE.MathUtils.clamp(card.OffsetY, -reach, reach);

                const edgeX   =  Math.max(halfWidth - card.WidthPx / 2, 0);  // <-- A photo whose point is on screen stays on screen, clear of the toolbar
                const floorY  =  card.HeightPx / 2 - halfHeight;
                const roofY   =  Math.max(halfHeight - config.TopReservePx - card.HeightPx / 2, floorY);
                card.OffsetX  =  THREE.MathUtils.clamp(card.HomeX + card.OffsetX, -edgeX, edgeX) - card.HomeX;
                card.OffsetY  =  THREE.MathUtils.clamp(card.HomeY + card.OffsetY, floorY, roofY) - card.HomeY;
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Measure Every Card in Screen Pixels From the Camera
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__MeasureFromCamera(camera, config, halfWidth, halfHeight) {
        const worldSize  =  DistoImageMapper__Coords__MmToWorld(config.WorldSizeMm);
        const liftPx     =  Arrangement === ARRANGEMENT.Atlas ? LiftPx : 0;
        const inverse    =  camera.matrixWorldInverse;
        const margin     =  1.15;
        const minimumPx  =  THREE.MathUtils.clamp(                           // <-- A phone holds the same photos in a third of the width
            config.MinimumPx * halfWidth * 2 / config.MinimumReferenceWidthPx, config.MinimumSmallestPx, config.MinimumPx
        );

        for (const card of Cards) {
            if (!card.Ready || !card.IsKept) continue;

            ViewPosition.copy(card.Anchor).applyMatrix4(inverse);
            card.Depth  =  -ViewPosition.z;

            const isBehind  =  camera.isPerspectiveCamera && card.Depth < 0.02;
            card.Ppm        =  DistoImageMapper__Env3d__CameraRig__PixelsPerMetre(Math.max(card.Depth, 0.02));
            card.AnchorX    =  ViewPosition.x * card.Ppm;
            card.AnchorY    =  ViewPosition.y * card.Ppm;

            const baseScale  =  THREE.MathUtils.clamp(worldSize * card.Ppm * SizeScale, minimumPx * SizeScale, config.MaximumPx);
            card.SizePx      =  baseScale;
            card.WidthPx     =  card.Aspect >= 1 ? baseScale : baseScale * card.Aspect;
            card.HeightPx    =  card.Aspect >= 1 ? baseScale / card.Aspect : baseScale;

            card.HomeX  =  card.AnchorX;
            card.HomeY  =  card.AnchorY + (liftPx > 0 ? liftPx + card.HeightPx / 2 : 0);

            card.IsBehind  =  isBehind;
            card.IsOnScreen =  !isBehind
                && Math.abs(card.AnchorX) < halfWidth * margin
                && Math.abs(card.AnchorY) < halfHeight * margin;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place Every Card for the Screen-Facing Arrangements
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__PlaceFacingCamera(camera, config) {
        WorldRight.setFromMatrixColumn(camera.matrixWorld, 0);
        WorldUp.setFromMatrixColumn(camera.matrixWorld, 1);

        const ready     =  Cards.filter(card => card.Ready && card.IsKept);
        const depths    =  ready.map(card => card.Depth);
        const nearest   =  Math.min(...depths);
        const furthest  =  Math.max(...depths);
        const depthSpan =  Math.max(furthest - nearest, 0.001);

        let leaderCount  =  0;

        for (const card of ready) {
            const eased  =  1 - Math.pow(1 - card.Appear, 3) ;               // <-- Photos ease in as they finish loading
            const focus  =  1 + card.Hover * config.HoverGrowth;

            const x   =  card.HomeX + card.OffsetX;
            const y   =  card.HomeY + card.OffsetY;
            const ppm =  card.Ppm;

            card.Mesh.visible  =  !card.IsBehind;
            card.Mesh.position.copy(card.Anchor)
                .addScaledVector(WorldRight, (x - card.AnchorX) / ppm)
                .addScaledVector(WorldUp, (y - card.AnchorY) / ppm);
            card.Mesh.quaternion.copy(camera.quaternion);
            card.Mesh.scale.set(card.WidthPx / ppm * focus * eased, card.HeightPx / ppm * focus * eased, 1);

            const isFocus  =  card.Index === FocusIndex;
            card.Material.opacity  =  isFocus ? 1 : PhotoOpacity;           // <-- See through to the model, solid when focused
            card.Mesh.renderOrder  =  isFocus
                ? ORDER_FOCUS + 1
                : ORDER_CARDS_FROM + ORDER_CARDS_SPAN * (furthest - card.Depth) / depthSpan;

            if (isFocus) {
                const edge  =  config.HighlightFramePx * 2 / ppm;
                FocusFrame.visible  =  !card.IsBehind && card.Appear > 0.5;
                FocusFrame.position.copy(card.Mesh.position);
                FocusFrame.quaternion.copy(camera.quaternion);
                FocusFrame.scale.set(card.Mesh.scale.x + edge, card.Mesh.scale.y + edge, 1);
            }

            if (Arrangement !== ARRANGEMENT.Atlas || !card.IsOnScreen || card.Appear < 0.3) continue;

            const halfWidth   =  card.WidthPx / 2;
            const halfHeight  =  card.HeightPx / 2;
            const endX  =  THREE.MathUtils.clamp(card.AnchorX, x - halfWidth, x + halfWidth);
            const endY  =  THREE.MathUtils.clamp(card.AnchorY, y - halfHeight, y + halfHeight);
            if (Math.hypot(endX - card.AnchorX, endY - card.AnchorY) < 1) continue;

            const offset  =  leaderCount * 6;
            LeaderPositions[offset]      =  card.Anchor.x;
            LeaderPositions[offset + 1]  =  card.Anchor.y;
            LeaderPositions[offset + 2]  =  card.Anchor.z;
            LeaderPositions[offset + 3]  =  card.Anchor.x + (WorldRight.x * (endX - card.AnchorX) + WorldUp.x * (endY - card.AnchorY)) / ppm;
            LeaderPositions[offset + 4]  =  card.Anchor.y + (WorldRight.y * (endX - card.AnchorX) + WorldUp.y * (endY - card.AnchorY)) / ppm;
            LeaderPositions[offset + 5]  =  card.Anchor.z + (WorldRight.z * (endX - card.AnchorX) + WorldUp.z * (endY - card.AnchorY)) / ppm;

            const colour  =  isFocus ? ColourFocus : ColourNormal;
            for (let v = 0; v < 2; v++) {
                LeaderColours[offset + v * 3]      =  colour.r;
                LeaderColours[offset + v * 3 + 1]  =  colour.g;
                LeaderColours[offset + v * 3 + 2]  =  colour.b;
            }
            leaderCount++;
        }

        Leaders.geometry.setDrawRange(0, leaderCount * 2);
        Leaders.geometry.attributes.position.needsUpdate  =  true;
        Leaders.geometry.attributes.color.needsUpdate     =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place Every Card as It Was Shot
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__PlaceAsShot(config) {
        const halfAngleTan  =  Math.tan(FieldOfViewDeg * DEG_TO_RAD / 2);

        for (const card of Cards) {
            if (!card.Ready || !card.IsKept) continue;

            const eased      =  1 - Math.pow(1 - card.Appear, 3);
            const focus      =  1 + card.Hover * 0.08;
            const footprint  =  2 * card.Anchor.distanceTo(Station) * halfAngleTan;
            const width      =  (card.Aspect >= 1 ? footprint : footprint * card.Aspect) * focus * eased;
            const height     =  (card.Aspect >= 1 ? footprint / card.Aspect : footprint) * focus * eased;

            card.Mesh.visible      =  true;
            card.Material.opacity  =  1;                                     // <-- Solid, so the photos register with each other
            card.Mesh.position.copy(card.Anchor);
            card.Mesh.up.set(0, 1, 0);
            card.Mesh.lookAt(Station);
            card.Mesh.scale.set(width, height, 1);
            card.Mesh.renderOrder  =  card.Index === FocusIndex ? ORDER_FOCUS + 1 : ORDER_CARDS_FROM;

            if (card.Index === FocusIndex) {
                const edge  =  footprint * 0.05;
                FocusFrame.visible  =  card.Appear > 0.5;
                FocusFrame.quaternion.copy(card.Mesh.quaternion);
                FocusFrame.position.copy(card.Anchor).lerp(Station, -0.002);  // <-- Just behind the photo, seen from the tripod
                FocusFrame.scale.set(width + edge, height + edge, 1);
            }
        }

        Leaders.geometry.setDrawRange(0, 0);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Ease a Card's Hover and Appearance
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__StepEasing(elapsedMs, config) {
        let easing  =  false;

        for (const card of Cards) {
            if (!card.Ready) continue;

            if (card.Appear < 1) {
                card.Appear  =  Math.min(card.Appear + elapsedMs / config.AppearEaseMs, 1);
                easing       =  true;
            }

            const goal  =  card.Index === GrowIndex ? 1 : 0;
            if (card.Hover !== goal) {
                const step  =  elapsedMs / config.HoverEaseMs;
                card.Hover  =  goal > card.Hover ? Math.min(card.Hover + step, goal) : Math.max(card.Hover - step, goal);
                easing      =  true;
            }
        }
        return easing;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Has the Camera Changed Since the Last Frame
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__CameraMoved(camera) {
        const world       =  camera.matrixWorld.elements;
        const projection  =  camera.projectionMatrix.elements;
        let moved         =  false;

        for (let i = 0; i < 16; i++) {
            if (world[i] !== LastCameraWorld[i] || projection[i] !== LastCameraProjection[i]) {
                moved                    =  true;
                LastCameraWorld[i]       =  world[i];
                LastCameraProjection[i]  =  projection[i];
            }
        }
        return moved;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Each Frame: Lay Out and Place
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__PhotoCards__FrameTask(elapsedMs) {
        if (!Group || !Group.visible || !Cards.length) return false;

        const config  =  DistoImageMapper__Config__Section('Cards');
        const camera  =  DistoImageMapper__Env3d__CameraRig__ActiveCamera();
        const easing  =  DistoImageMapper__Env3d__PhotoCards__StepEasing(elapsedMs, config);

        FocusFrame.visible  =  false;

        if (Arrangement === ARRANGEMENT.AsShot) {
            DistoImageMapper__Env3d__PhotoCards__PlaceAsShot(config);
            return easing;
        }

        const viewport    =  DistoImageMapper__Env3d__SceneManager__ViewportSize();
        const halfWidth   =  viewport.Width / 2;
        const halfHeight  =  viewport.Height / 2;

        DistoImageMapper__Env3d__PhotoCards__MeasureFromCamera(camera, config, halfWidth, halfHeight);

        const ready   =  Cards.filter(card => card.Ready && card.IsKept);
        const before  =  ready.map(card => [card.OffsetX, card.OffsetY]);

        const cameraMoved  =  DistoImageMapper__Env3d__PhotoCards__CameraMoved(camera);
        StillFrames        =  cameraMoved || LayoutDirty ? 0 : StillFrames + 1;

        if (Arrangement === ARRANGEMENT.Atlas) {
            if (StillFrames < config.SettleFrames) {                         // <-- A crowd that can never quite settle still stops drawing in the end
                DistoImageMapper__Env3d__PhotoCards__Relax(ready.filter(card => card.IsOnScreen), config, halfWidth, halfHeight);
            }
        } else {
            for (const card of ready) {                                      // <-- On the Point: every photo slides back onto its point
                card.OffsetX *= 0.8;
                card.OffsetY *= 0.8;
                if (Math.abs(card.OffsetX) < 0.05) card.OffsetX  =  0;
                if (Math.abs(card.OffsetY) < 0.05) card.OffsetY  =  0;
            }
        }

        let moved  =  0;
        ready.forEach((card, index) => {
            moved  =  Math.max(moved, Math.abs(card.OffsetX - before[index][0]), Math.abs(card.OffsetY - before[index][1]));
        });

        DistoImageMapper__Env3d__PhotoCards__PlaceFacingCamera(camera, config);

        const wasDirty  =  LayoutDirty;
        LayoutDirty     =  false;
        return easing || wasDirty || moved > SETTLED_MOVE_PX;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Register With the Draw Loop (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__Mount() {
        DistoImageMapper__Env3d__SceneManager__AddFrameTask(DistoImageMapper__Env3d__PhotoCards__FrameTask);
        UnitPlane  =  new THREE.PlaneGeometry(1, 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Card per Point (Photos Load Afterward)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__Build(survey) {
        DistoImageMapper__Env3d__PhotoCards__Dispose();

        const colours  =  DistoImageMapper__Config__Section('Colours');

        ColourNormal.set(colours.Ink);
        ColourFocus.set(colours.Highlight);

        Station  =  survey.Station ? DistoImageMapper__Coords__ModelToWorld(survey.Station.PositionMm) : null;
        Group    =  new THREE.Group();
        Group.name  =  'Photo Cards';

        Cards  =  survey.Points.map((point, index) => {
            const material  =  new THREE.MeshBasicMaterial({
                color : 0xffffff, side : THREE.DoubleSide, transparent : true,
                depthTest : false, depthWrite : false, toneMapped : false
            });
            const mesh  =  new THREE.Mesh(UnitPlane, material);
            mesh.visible         =  false;
            mesh.frustumCulled   =  false;
            mesh.userData.Index  =  index;
            Group.add(mesh);

            return {
                Index : index, Point : point, Mesh : mesh, Material : material,
                Anchor : DistoImageMapper__Coords__ModelToWorld(point.PositionMm),
                TextureFramed : null, TexturePlain : null, Aspect : 1,
                Ready : false, Appear : 0, Hover : 0, Generation : 0,
                OffsetX : 0, OffsetY : 0, HomeX : 0, HomeY : 0, AnchorX : 0, AnchorY : 0,
                WidthPx : 1, HeightPx : 1, SizePx : 1, Ppm : 1, Depth : 1,
                IsOnScreen : false, IsBehind : false, IsKept : true
            };
        });

        const vertexCount  =  survey.Points.length * 2;
        LeaderPositions    =  new Float32Array(vertexCount * 3);
        LeaderColours      =  new Float32Array(vertexCount * 3);

        const leaderGeometry  =  new THREE.BufferGeometry();
        leaderGeometry.setAttribute('position', new THREE.BufferAttribute(LeaderPositions, 3).setUsage(THREE.DynamicDrawUsage));
        leaderGeometry.setAttribute('color', new THREE.BufferAttribute(LeaderColours, 3).setUsage(THREE.DynamicDrawUsage));
        leaderGeometry.setDrawRange(0, 0);

        Leaders  =  new THREE.LineSegments(leaderGeometry, new THREE.LineBasicMaterial({
            vertexColors : true, transparent : true, opacity : 0.7, depthTest : false, depthWrite : false, toneMapped : false
        }));
        Leaders.renderOrder    =  ORDER_LEADERS;
        Leaders.frustumCulled  =  false;
        Group.add(Leaders);

        FocusFrame  =  new THREE.Mesh(UnitPlane, new THREE.MeshBasicMaterial({
            color : colours.Highlight, side : THREE.DoubleSide, transparent : true,
            depthTest : false, depthWrite : false, toneMapped : false
        }));
        FocusFrame.visible        =  false;
        FocusFrame.frustumCulled  =  false;
        FocusFrame.renderOrder    =  ORDER_FOCUS;
        Group.add(FocusFrame);

        DistoImageMapper__Env3d__SceneManager__Scene().add(Group);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Every Photo, a Few at a Time
    // ------------------------------------------------------------
    export async function DistoImageMapper__Env3d__PhotoCards__LoadPhotos(onProgress) {
        const config   =  DistoImageMapper__Config__Section('Cards');
        const colours  =  DistoImageMapper__Config__Section('Colours');
        const queue    =  Cards.slice();
        const total    =  queue.length;
        let finished   =  0;

        const worker  =  async () => {
            while (queue.length) {
                const card  =  queue.shift();
                await DistoImageMapper__Env3d__PhotoCards__LoadCard(card, card.Generation, config, colours);
                finished++;
                if (onProgress) onProgress(finished, total);
            }
        };

        await Promise.all(Array.from({ length : Math.max(config.LoadConcurrency, 1) }, worker));
    }
    // ------------------------------------------------------------


    // FUNCTION | Choose the Arrangement
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__SetArrangement(arrangement) {
        Arrangement  =  arrangement === ARRANGEMENT.AsShot && !Station ? ARRANGEMENT.OnPoint : arrangement;

        const isAsShot  =  Arrangement === ARRANGEMENT.AsShot;
        for (const card of Cards) {
            card.Material.depthTest   =  isAsShot;                           // <-- Real planes in the scene, or an overlay on it
            card.Material.depthWrite  =  isAsShot;
            if (card.Ready) card.Material.map  =  isAsShot ? card.TexturePlain : card.TextureFramed;
        }

        if (FocusFrame) {
            FocusFrame.material.depthTest  =  isAsShot;
            FocusFrame.renderOrder         =  ORDER_FOCUS;
        }

        LayoutDirty  =  true;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Current Arrangement
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__GetArrangement() {
        return Arrangement;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Size, Lift, True Field of View and Opacity
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__SetSizing(sizeScale, liftPx, fieldOfViewDegrees, opacity) {
        SizeScale       =  sizeScale;
        LiftPx          =  liftPx;
        FieldOfViewDeg  =  fieldOfViewDegrees;
        PhotoOpacity    =  opacity;
        LayoutDirty     =  true;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Photos
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__SetVisible(isVisible) {
        if (Group) Group.visible  =  isVisible;
        LayoutDirty  =  true;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep Only the Photos the Clipping Box Keeps (mask[i] false hides point i's photo)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__SetKept(mask) {
        for (const card of Cards) {
            card.IsKept  =  !mask || mask[card.Index] !== false;
            card.Mesh.visible  =  card.IsKept && card.Ready;
        }
        LayoutDirty  =  true;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Frame One Photo, and Grow the Hovered One
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__SetFocus(focusIndex, hoveredIndex) {
        FocusIndex   =  focusIndex;
        GrowIndex    =  hoveredIndex;
        LayoutDirty  =  true;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Photo Under a Screen Position, or -1
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__PickAt(clientX, clientY) {
        if (!Group || !Group.visible) return -1;

        const rect  =  DistoImageMapper__Env3d__SceneManager__Canvas().getBoundingClientRect();
        Pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);

        const camera  =  DistoImageMapper__Env3d__CameraRig__ActiveCamera();
        camera.updateMatrixWorld();
        Raycaster.setFromCamera(Pointer, camera);

        const meshes  =  Cards.filter(card => card.Ready && card.Mesh.visible).map(card => card.Mesh);
        const hits    =  Raycaster.intersectObjects(meshes, false);
        if (!hits.length) return -1;

        if (Arrangement === ARRANGEMENT.AsShot) return hits[0].object.userData.Index;  // <-- Real planes: the nearest

        return hits.reduce((top, hit) => (hit.object.renderOrder > top.object.renderOrder ? hit : top)).object.userData.Index;  // <-- Overlay: whichever is drawn on top
    }
    // ------------------------------------------------------------


    // FUNCTION | A Photo's Rectangle on Screen, for the Lightbox's Opening Move
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__ScreenRect(index) {
        const card  =  Cards[index];
        if (!card || !card.Ready || !card.Mesh.visible || !Group.visible) return null;

        const rect    =  DistoImageMapper__Env3d__SceneManager__Canvas().getBoundingClientRect();
        const camera  =  DistoImageMapper__Env3d__CameraRig__ActiveCamera();
        const corner  =  new THREE.Vector3();

        camera.updateMatrixWorld();
        card.Mesh.updateWorldMatrix(true, false);

        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
            corner.set(x, y, 0).applyMatrix4(card.Mesh.matrixWorld).project(camera);
            const screenX  =  rect.left + (corner.x + 1) / 2 * rect.width;
            const screenY  =  rect.top + (1 - corner.y) / 2 * rect.height;
            left    =  Math.min(left, screenX);
            right   =  Math.max(right, screenX);
            top     =  Math.min(top, screenY);
            bottom  =  Math.max(bottom, screenY);
        }

        const isOnScreen  =  right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom;
        return isOnScreen ? { left, top, width : right - left, height : bottom - top } : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Cards and Free Their Memory
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__PhotoCards__Dispose() {
        for (const card of Cards) {
            card.Generation++;                                               // <-- Any photo still reading is now ignored
            card.Material.dispose();
            if (card.TextureFramed) card.TextureFramed.dispose();
            if (card.TexturePlain) card.TexturePlain.dispose();
        }
        Cards  =  [];

        if (Leaders) {
            Leaders.geometry.dispose();
            Leaders.material.dispose();
            Leaders  =  null;
        }
        if (FocusFrame) {
            FocusFrame.material.dispose();
            FocusFrame  =  null;
        }
        if (Group) {
            Group.removeFromParent();
            Group  =  null;
        }
        FocusIndex  =  -1;
        GrowIndex   =  -1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
