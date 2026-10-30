/* =============================================================================
   PAINTERLYNPR - ATMOS | SKY AND CLOUDS - HOST
   =============================================================================

   FILE       : PainterlyNPR__SkyClouds__Host__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - SkyAndClouds - Host
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The clouds in the render graph: the volumetric module (63) made at
                boot, its buffer rendered, simplified into masses by the Kuwahara
                filter (57), and painted by the wash
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Without the volume the wash paints v0.1.0's clouds, kept as the fallback
     reading.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Volumetric Clouds - the first real
                   modules, 63 and 60
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the cloud modules (63, 60) and the Kuwahara filter (57) are
                   imported, where the experiment found them on
                   window.PainterlyNPR__Modules; otherwise none

   ============================================================================= */

import SkyHostConfig from './Na__SkyCloudsHost__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import * as VolumetricClouds from '../63__Atmos__VolumetricClouds/PainterlyNPR__Module__VolumetricClouds__.mjs';
import * as CloudPaint from './PainterlyNPR__SkyAndClouds__CloudPaint__.mjs';
import * as KuwaharaFilter from '../57__Wash__KuwaharaFilter/PainterlyNPR__Module__KuwaharaFilter__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__Offset,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__LightAndShadow__Compute,
    PainterlyNPR__LightAndShadow__Sun  as  Sun,
} from '../23__Pass__LightAndShadow/PainterlyNPR__LightAndShadow__Pass__.mjs';
import { PainterlyNPR__Watercolour__FS_WATERCOLOUR as FS_WATERCOLOUR } from '../52__Wash__LayerStack/PainterlyNPR__Watercolour__Shader__.mjs';
import { PainterlyNPR__CameraRig__Camera as Camera } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Sky And Clouds - Host
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__SkyCloudsHost__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const MASSES  =  PainterlyNPR__ConfigAccess__Section(SkyHostConfig, 'PainterlyNPR__SkyCloudsHost__Config', 'Masses', ['Masses']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Volumetric Clouds - the first real modules, 63 and 60
// -----------------------------------------------------------------------------

    // MODULE STATE | The Cloud Modules and Their Buffer
    // ------------------------------------------------------------
    // The modules (63, 60, 57) are imported below. If the volume cannot be made,
    // the sky keeps v0.1.0's painted clouds through the same reading function, so
    // the wash cannot tell. Masses is
    // the simplifier (a Kuwahara), Painted the buffer it made - what the wash reads.
    const SkyClouds  =  { Volume: null, Paint: null, Masses: null, Instance: null, Buffer: null, Painted: null, Clear: null, Failure: null };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Modules This Host Calls - imported, where the experiment found them on window
    // ------------------------------------------------------------
    const CLOUD_MODULES  =  Object.freeze({ VolumetricClouds, CloudPaint, KuwaharaFilter });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Painted Clouds - v0.1.0's, kept as the fallback reading
    // ------------------------------------------------------------
    // Returns what the modules' reading returns: x the sky wash multiplier, y the
    // underside density in wash units, z the pooled edge, w the cloud mask.
    const GLSL_PAINTED_CLOUDS = `
        vec4 PainterlyNPR_SkyCloudReading(vec2 pc, vec2 mm, float calm) {
            vec2 cq = mm * vec2(0.011, 0.028) + uSeedC;
            vec2 cw = vec2(fbm(cq * 2.1), fbm(cq * 2.1 + 4.7)) - 0.5;
            float c = fbm(cq + cw * 0.9);
            float cloudMask = smoothstep(0.50, 0.58, c);
            float cBelow = fbm((mm + vec2(0.0, -5.0)) * vec2(0.011, 0.028) + uSeedC + cw * 0.9);
            float under = cloudMask * smoothstep(0.0, 0.05, c - cBelow) * (1.0 - smoothstep(0.58, 0.66, c));
            return vec4(1.0 - cloudMask, under * 0.3, 0.0, cloudMask);
        }`;
    // ------------------------------------------------------------


    // FUNCTION | The Simplifier for the Masses - 57's Kuwahara, an instance of its own
    // ------------------------------------------------------------
    // Optional: without 57 the wash reads the cloud buffer as it is, and a failure
    // here costs only the simplification, never the volumetric sky. Its own
    // instance, never the wash's: a filter remakes its targets when the size it is
    // given changes, which would free the masses under the wash.
    function PainterlyNPR__SkyClouds__MassesCreate(gl, m) {
        const make  =  m.KuwaharaFilter && m.KuwaharaFilter.PainterlyNPR__KuwaharaFilter__Create;
        if (!make) return null;
        try { return make(gl); } catch (error) { console.error(error); return null; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Connect the Modules at Boot - true when the volume is ready
    // ------------------------------------------------------------
    function PainterlyNPR__SkyClouds__Connect(gl) {
        SkyClouds.Clear  =  gl.createTexture();                                  // <-- A 1 x 1 clear sky, for the viewer when there is no buffer
        gl.bindTexture(gl.TEXTURE_2D, SkyClouds.Clear);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 0]));
        gl.bindTexture(gl.TEXTURE_2D, null);
        const m  =  CLOUD_MODULES;
        if (!m || !m.VolumetricClouds || !m.CloudPaint) return false;
        try {
            SkyClouds.Instance  =  m.VolumetricClouds.PainterlyNPR__VolumetricClouds__Create(gl);
            SkyClouds.Volume    =  m.VolumetricClouds;
            SkyClouds.Paint     =  m.CloudPaint;
            SkyClouds.Masses    =  PainterlyNPR__SkyClouds__MassesCreate(gl, m);
            return true;
        } catch (error) {
            SkyClouds.Failure  =  error;
            console.error(error);
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Wash Shader's Source, With the Clouds' Reading Put In
    // ------------------------------------------------------------
    // The modules' reading samples the cloud masses by the sheet's uv, with the
    // paper's relief for its dry edges; its grey comes back in wash units.
    function PainterlyNPR__SkyClouds__WashSource() {
        const reading  =  SkyClouds.Instance ? `${SkyClouds.Paint.PainterlyNPR__CloudPaint__Glsl}
        vec4 PainterlyNPR_SkyCloudReading(vec2 pc, vec2 mm, float calm) {
            float paper = texelFetch(uPaper, ivec2(pc), 0).r;
            return PainterlyNPR_CloudPaint(pc / vec2(textureSize(uRegion, 0)), mm, calm, paper);
        }` : GLSL_PAINTED_CLOUDS;
        return FS_WATERCOLOUR.replace('// @SKY_CLOUD_READING - replaced at boot by PainterlyNPR__SkyClouds__WashSource', reading);
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Masses - how 57's Kuwahara simplifies the cloud buffer
    // ------------------------------------------------------------
    // Masses simplified to millimetres need no finer buffer than a quarter of the
    // sheet: the march costs a quarter and the Kuwahara about a sixteenth of what
    // they would at the module's own half. A soft buffer needs three passes before
    // its masses stand flat; the flow is smoothed over a millimetre and a half, the
    // size of a cloud's edge, not a texel's grain. Simplify (State.Sky) sets the
    // radius.
    const SKY_MASSES  =  Object.freeze(MASSES.Masses);
    // ------------------------------------------------------------


    // FUNCTION | Pass - Render the Cloud Buffer
    // ------------------------------------------------------------
    // The camera as it is, the sun, the drawing's seed and the sky's setting. An
    // elevation gets the module's borrowed perspective sky, its horizon on the
    // elevation's ground line.
    function PainterlyNPR__SkyClouds__Run() {
        if (!SkyClouds.Instance) return;
        PainterlyNPR__LightAndShadow__Compute();
        const s     =  State.Sky;
        const view  =  SkyClouds.Volume.PainterlyNPR__VolumetricClouds__SkyView({
            Eye      :  Camera.Eye,
            Forward  :  Camera.Forward,
            FovYDeg  :  State.Camera.FovY,
            Aspect   :  Gpu.Width / Gpu.Height,
            Ortho    :  Camera.Ortho,
            HorizonV :  Camera.HorizonPx / Gpu.Height,
        });
        SkyClouds.Buffer  =  SkyClouds.Instance.Render({
            Width   :  Gpu.Width,
            Height  :  Gpu.Height,
            View    :  view,
            Sun     :  Sun.Dir,
            Seed    :  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'clouds'),
            Setting :  { Preset: s.Type, Coverage: s.Coverage, ScaleKm: s.ScaleKm, BaseKm: s.BaseKm, DriftKm: s.DriftKm },
            Scale   :  s.SimplifyMm > 0 && SkyClouds.Masses ? SKY_MASSES.Scale : undefined,     // <-- undefined: the module's own (half the sheet)
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Simplify the Cloud Buffer Into Masses
    // ------------------------------------------------------------
    // A painter settles on a few shapes before the brush is wet: 57's Kuwahara
    // flattens the volume's soft gradients into masses with edges - on the buffer,
    // never on the picture. Simplify is millimetres on the sheet; at 0, or without
    // 57, the wash reads the buffer as it is.
    function PainterlyNPR__SkyClouds__Simplify() {
        const b  =  SkyClouds.Buffer;
        if (!b) return;
        SkyClouds.Painted  =  SkyClouds.Masses ? SkyClouds.Masses.Render({
            Source    :  b.Texture,
            Width     :  b.Width,
            Height    :  b.Height,
            PxPerMm   :  b.Width / SHEET_WIDTH_MM,
            Settings  :  { RadiusMm: State.Sky.SimplifyMm, Passes: SKY_MASSES.Passes, Sharpness: SKY_MASSES.Sharpness, TensorSigmaMm: SKY_MASSES.TensorSigmaMm, VarianceWeights: SKY_MASSES.Variance },
        }) : b;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cloud Paint's Uniforms for the Wash - none without the modules
    // ------------------------------------------------------------
    function PainterlyNPR__SkyClouds__PaintUniforms() {
        if (!SkyClouds.Instance || !SkyClouds.Buffer) return {};
        const s  =  State.Sky;
        const masses  =  SkyClouds.Painted || SkyClouds.Buffer;
        return SkyClouds.Paint.PainterlyNPR__CloudPaint__Uniforms({ Undersides: s.Undersides, SoftnessMm: s.SoftnessMm, Crispness: s.Crispness, Pool: s.Pool, Blooms: s.Blooms }, masses.Texture, [SHEET_WIDTH_MM, SHEET_HEIGHT_MM], PainterlyNPR__SeededRandom__Offset(State.Seed, 'cloud-paint'));
    }
    // ------------------------------------------------------------


    // FUNCTION | Choose a Cloud Type - its numbers become the sky's starting point
    // ------------------------------------------------------------
    function PainterlyNPR__SkyClouds__ApplyType(type) {
        State.Sky.Type  =  type;
        if (!SkyClouds.Volume) return;
        const p  =  SkyClouds.Volume.PainterlyNPR__CloudSettings__Preset(type);
        Object.assign(State.Sky, { Type: p.Preset, Coverage: p.Coverage, ScaleKm: p.ScaleKm, BaseKm: p.BaseKm });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__SkyClouds__ApplyType,
        PainterlyNPR__SkyClouds__Connect,
        PainterlyNPR__SkyClouds__PaintUniforms,
        PainterlyNPR__SkyClouds__Run,
        PainterlyNPR__SkyClouds__Simplify,
        PainterlyNPR__SkyClouds__WashSource,
        SkyClouds  as  PainterlyNPR__SkyClouds__SkyClouds,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
