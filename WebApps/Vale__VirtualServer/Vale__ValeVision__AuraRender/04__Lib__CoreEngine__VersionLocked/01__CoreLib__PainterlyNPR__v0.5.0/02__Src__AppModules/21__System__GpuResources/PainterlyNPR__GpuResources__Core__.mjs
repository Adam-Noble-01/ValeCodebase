/* =============================================================================
   PAINTERLYNPR - SYSTEM | GPU RESOURCES
   =============================================================================

   FILE       : PainterlyNPR__GpuResources__Core__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - GpuResources
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The context, programs, render targets and the shadow map, sized to
                the sheet and resized for an export, and what the CPU holds
                between passes
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Gpu holds the context and every program, vertex array and target; Cpu the
     truth read back.
   - Targets are sized in millimetres of sheet: an export multiplies the pixels,
     never the drawing.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region GPU Resources
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import GpuConfig from './Na__GpuResources__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Engine__BASE_PX_PER_MM   as  BASE_PX_PER_MM,
    PainterlyNPR__Engine__SHADOW_MAP_SIZE  as  SHADOW_MAP_SIZE,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__FloatBuilder } from './PainterlyNPR__GpuResources__FloatBuilder__.mjs';

// =============================================================================
// REGION | Gpu Resources
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__GpuResources__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const TARGETS  =  PainterlyNPR__ConfigAccess__Section(GpuConfig, 'PainterlyNPR__GpuResources__Config', 'Targets', ['Formats']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | GPU Resources
// -----------------------------------------------------------------------------

    // MODULE STATE | The Context, Programs, Buffers and Targets
    // ------------------------------------------------------------
    const Gpu  =  {
        Gl        :  null,
        Programs  :  {},
        Vaos      :  {},
        Buffers   :  {},
        Targets   :  {},
        Width     :  0,
        Height    :  0,
        PxPerMm   :  BASE_PX_PER_MM,
        Scale     :  1,
        MaxSize   :  0,
    };
    // ------------------------------------------------------------


    // FUNCTION | Compile and Link a Program
    // ------------------------------------------------------------
    // A compile error names the program and quotes the log, so a broken pass is
    // obvious in the console rather than a black sheet.
    function PainterlyNPR__GpuResources__Program(name, vertexSource, fragmentSource) {
        const gl       =  Gpu.Gl;
        const compile  =  (type, source) => {
            const shader  =  gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Shader "${name}" (${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'}) failed: ${gl.getShaderInfoLog(shader)}`);
            return shader;
        };
        const program  =  gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Program "${name}" failed to link: ${gl.getProgramInfoLog(program)}`);
        const locations  =  new Map();
        return {
            Name     : name,
            Handle   : program,
            Location : (uniform) => {
                if (!locations.has(uniform)) locations.set(uniform, gl.getUniformLocation(program, uniform));
                return locations.get(uniform);
            },
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Use a Program and Set Its Uniforms and Textures
    // ------------------------------------------------------------
    // Uniform values are typed by a one-letter prefix in the key's value object:
    // { f: x } float, { v2 | v3 | v4: [...] }, { i: n } int, { m4: matrix },
    // { m3: matrix }, { v4a: Float32Array } a vec4 array, { v3a: ... }, { t: texture }.
    function PainterlyNPR__GpuResources__Use(program, uniforms) {
        const gl  =  Gpu.Gl;
        gl.useProgram(program.Handle);
        let unit  =  0;
        for (const [name, value] of Object.entries(uniforms || {})) {
            const loc  =  program.Location(name);
            if ('t' in value) {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, value.t);
                if (loc) gl.uniform1i(loc, unit);
                unit++;
                continue;
            }
            if (!loc) continue;
            if ('f' in value)        gl.uniform1f(loc, value.f);
            else if ('i' in value)   gl.uniform1i(loc, value.i);
            else if ('v2' in value)  gl.uniform2fv(loc, value.v2);
            else if ('v3' in value)  gl.uniform3fv(loc, value.v3);
            else if ('v4' in value)  gl.uniform4fv(loc, value.v4);
            else if ('v4a' in value) gl.uniform4fv(loc, value.v4a);
            else if ('fa' in value)  gl.uniform1fv(loc, value.fa);
            else if ('v3a' in value) gl.uniform3fv(loc, value.v3a);
            else if ('m4' in value)  gl.uniformMatrix4fv(loc, false, value.m4);
            else if ('m3' in value)  gl.uniformMatrix3fv(loc, false, value.m3);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Render Target
    // ------------------------------------------------------------
    // Formats are chosen per buffer (manifest section 05): RGBA8 where a byte is
    // enough, RGBA16F for fields and colour in linear light, RGBA32F only for the
    // truth data the CPU reads back (depth to the millimetre, exact IDs).
    const FORMATS  =  TARGETS.Formats;

    function PainterlyNPR__GpuResources__CreateTarget(name, width, height, formatKeys, withDepth) {
        const gl        =  Gpu.Gl;
        const fbo       =  gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        const textures  =  formatKeys.map((key, i) => {
            const format  =  FORMATS[key];
            const tex     =  gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texStorage2D(gl.TEXTURE_2D, 1, gl[format.Internal], width, height);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[format.Filter]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[format.Filter]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0);
            return tex;
        });
        gl.drawBuffers(formatKeys.map((key, i) => gl.COLOR_ATTACHMENT0 + i));
        let depth  =  null;
        if (withDepth) {
            depth  =  gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
        }
        const status  =  gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Render target "${name}" is incomplete (0x${status.toString(16)}) at ${width} x ${height}`);
        return { Name: name, Width: width, Height: height, Fbo: fbo, Textures: textures, Depth: depth, Formats: formatKeys };
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose a Render Target - stale high-resolution textures go at once
    // ------------------------------------------------------------
    function PainterlyNPR__GpuResources__DisposeTarget(target) {
        if (!target) return;
        const gl  =  Gpu.Gl;
        for (const tex of target.Textures) gl.deleteTexture(tex);
        if (target.Depth) gl.deleteRenderbuffer(target.Depth);
        gl.deleteFramebuffer(target.Fbo);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Shadow Map - a depth texture compared in hardware
    // ------------------------------------------------------------
    function PainterlyNPR__GpuResources__CreateShadowTarget() {
        const gl    =  Gpu.Gl;
        const size  =  Math.min(SHADOW_MAP_SIZE, Gpu.MaxSize);
        Gpu.ShadowSize  =  size;
        const tex   =  gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        const fbo  =  gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        const status  =  gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Shadow map target is incomplete (0x${status.toString(16)})`);
        return { Name: 'ShadowMap', Width: size, Height: size, Fbo: fbo, Textures: [tex], Depth: null, Formats: [] };
    }
    // ------------------------------------------------------------


    // FUNCTION | Size Every Sheet-Sized Target
    // ------------------------------------------------------------
    // Called at boot and for an export. Everything sheet-sized is released and
    // made again; nothing is kept at two sizes at once.
    function PainterlyNPR__GpuResources__SetScale(scale) {
        const width   =  Math.round(SHEET_WIDTH_MM * BASE_PX_PER_MM * scale);
        const height  =  Math.round(SHEET_HEIGHT_MM * BASE_PX_PER_MM * scale);
        if (width > Gpu.MaxSize || height > Gpu.MaxSize) throw new Error(`${width} x ${height} is past this GPU's ${Gpu.MaxSize} px limit`);
        const T  =  Gpu.Targets;
        for (const key of ['GBuffer', 'Field', 'Regions', 'SeedsA', 'SeedsB', 'Paper', 'Wash', 'Ink', 'Accent', 'Accent2', 'Marker', 'Composite']) {
            PainterlyNPR__GpuResources__DisposeTarget(T[key]);
            T[key]  =  null;
        }
        Gpu.Width    =  width;
        Gpu.Height   =  height;
        Gpu.Scale    =  scale;
        Gpu.PxPerMm  =  BASE_PX_PER_MM * scale;
        T.GBuffer    =  PainterlyNPR__GpuResources__CreateTarget('Truth buffers', width, height, ['RGBA8', 'RGBA16F', 'RGBA32F', 'RGBA16F'], true);
        T.Field      =  PainterlyNPR__GpuResources__CreateTarget('Art direction field', width, height, ['RGBA8', 'RGBA8', 'RGBA8', 'RGBA8'], false);   // <-- 0: the field the passes read; 1: each point type's influence, for Show influence; 2 and 3: the line field
        T.Accent2    =  PainterlyNPR__GpuResources__CreateTarget('Accents 2', width, height, ['RGBA8'], false);                  // <-- More flowers: calendula (R), white chamomile (G), cornflower and catmint (B)
        T.Accent     =  PainterlyNPR__GpuResources__CreateTarget('Accents', width, height, ['RGBA8'], false);                    // <-- Picked bricks and tiles (R), flowers (G rose, B lavender, A cream)
        T.Marker     =  PainterlyNPR__GpuResources__CreateTarget('Shadow lines', width, height, ['RGBA8'], false);               // <-- R: a marker stroke's density / 2
        T.Regions    =  PainterlyNPR__GpuResources__CreateTarget('Wash regions', width, height, ['RGBA16N'], false);
        T.SeedsA     =  PainterlyNPR__GpuResources__CreateTarget('Jump flood A', width, height, ['RGBA16N'], false);
        T.SeedsB     =  PainterlyNPR__GpuResources__CreateTarget('Jump flood B', width, height, ['RGBA16N'], false);
        T.Paper      =  PainterlyNPR__GpuResources__CreateTarget('Paper', width, height, ['RGBA16F'], false);
        T.Wash       =  PainterlyNPR__GpuResources__CreateTarget('Washes', width, height, ['RGBA16F', 'RGBA16F'], false);   // <-- 0 the washes; 1 their base, without the embellishments (the Kuwahara's source)
        T.Ink        =  PainterlyNPR__GpuResources__CreateTarget('Ink', width, height, ['RGBA8'], false);
        T.Composite  =  PainterlyNPR__GpuResources__CreateTarget('Composite', width, height, ['RGBA8'], false);
        Cpu.Geo      =  new Float32Array(width * height * 4);
        Cpu.Field    =  new Uint8Array(width * height * 4);
        Cpu.FieldB   =  new Uint8Array(width * height * 4);
        Cpu.FieldC   =  new Uint8Array(width * height * 4);
        Cpu.Valid    =  false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wait for a Target - honest pass timings
    // ------------------------------------------------------------
    // Reading one pixel waits for the GPU to finish the work that wrote it, so the
    // time on a pass's node is its real cost, not the time to queue it.
    function PainterlyNPR__GpuResources__Sync(target) {
        const gl  =  Gpu.Gl;
        if (!target || !target.Formats.length) return;
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.Fbo);
        if (FORMATS[target.Formats[0]].Type === 'FLOAT') gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, Cpu.SyncFloat);
        else gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, Cpu.SyncByte);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw a Fullscreen Pass Into a Target
    // ------------------------------------------------------------
    function PainterlyNPR__GpuResources__Fullscreen(target, program, uniforms) {
        const gl  =  Gpu.Gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.Fbo : null);
        gl.viewport(0, 0, target ? target.Width : gl.canvas.width, target ? target.Height : gl.canvas.height);
        PainterlyNPR__GpuResources__Use(program, uniforms);
        gl.bindVertexArray(Gpu.Vaos.Empty);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
    }
    // ------------------------------------------------------------


    // MODULE STATE | What the CPU Holds Between Passes
    // ------------------------------------------------------------
    const Cpu  =  {
        Geo        :  null,                                                  // <-- Truth data read back: depth, object ID, material ID, light
        Field      :  null,                                                  // <-- Art direction field read back: presence, weight, looseness, indication
        FieldB     :  null,                                                  // <-- The line field: wobble, break-up, silhouette emphasis, overdraw
        FieldC     :  null,                                                  // <-- ... and hatch density, hatch owner, pressure, detail
        Valid      :  false,
        SyncFloat  :  new Float32Array(4),
        SyncByte   :  new Uint8Array(4),
        Ribbons    :  new PainterlyNPR__FloatBuilder(1 << 20),
        Debug      :  new PainterlyNPR__FloatBuilder(1 << 16),
        DebugInd   :  new PainterlyNPR__FloatBuilder(1 << 14),               // <-- Material indication's marks, for its own view
        RibbonVerts:  0,
        DebugVerts :  0,
        DebugIndVerts : 0,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__GpuResources__CreateShadowTarget,
        PainterlyNPR__GpuResources__CreateTarget,
        PainterlyNPR__GpuResources__DisposeTarget,
        PainterlyNPR__GpuResources__Fullscreen,
        PainterlyNPR__GpuResources__Program,
        PainterlyNPR__GpuResources__SetScale,
        PainterlyNPR__GpuResources__Sync,
        PainterlyNPR__GpuResources__Use,
        Cpu  as  PainterlyNPR__GpuResources__Cpu,
        Gpu  as  PainterlyNPR__GpuResources__Gpu,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
