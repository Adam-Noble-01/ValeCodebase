/* =============================================================================
   PAINTERLYNPR - ATMOSPHERE | VOLUMETRIC CLOUDS - GPU
   =============================================================================

   FILE       : PainterlyNPR__VolumetricClouds__Gpu__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Atmos - VolumetricClouds - Gpu
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The few WebGL 2 tools the cloud passes need - programs, uniforms by
                their declared type, colour targets, 3D volumes, a fullscreen draw
   CREATED    : 29-Oct-2026

   DESCRIPTION:
   - The module owns its GPU objects and borrows nothing from its host but the
     WebGL 2 context, so any host - the experiment today, 21__System__GpuResources
     tomorrow - can call it.
   - Uniforms are set by the type the shader declares (read back from the linked
     program), so a value is a number, an array or a texture and never says what
     kind of uniform it is.
   - Every draw leaves the context as a host expects to find it: no framebuffer,
     no program, no vertex array bound; blending, depth and culling off.

   ============================================================================= */

// =============================================================================
// REGION | Volumetric Clouds - Gpu
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Programs and Uniforms
// -----------------------------------------------------------------------------

    // FUNCTION | Compile One Shader, Throwing Its Log With the Program's Name
    // ------------------------------------------------------------
    function PainterlyNPR__CloudGpu__Shader(gl, name, type, source) {
        const shader  =  gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log  =  gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Volumetric clouds: ${name} (${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'}) did not compile - ${log}`);
        }
        return shader;
    }
    // ------------------------------------------------------------


    // FUNCTION | Link a Program, and Read Back Every Uniform It Declares
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudGpu__Program(gl, name, vertexSource, fragmentSource) {
        const vs  =  PainterlyNPR__CloudGpu__Shader(gl, name, gl.VERTEX_SHADER, vertexSource);
        const fs  =  PainterlyNPR__CloudGpu__Shader(gl, name, gl.FRAGMENT_SHADER, fragmentSource);
        const program  =  gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const log  =  gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Volumetric clouds: ${name} did not link - ${log}`);
        }
        const uniforms  =  new Map();
        const count     =  gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info  =  gl.getActiveUniform(program, i);
            uniforms.set(info.name.replace(/\[0\]$/, ''), { Location: gl.getUniformLocation(program, info.name), Type: info.type, Size: info.size });
        }
        return { Name: name, Program: program, Uniforms: uniforms };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Uniforms by Their Declared Type - names the shader dropped are skipped
    // ------------------------------------------------------------
    // Textures take units in the order given. A value for a uniform the compiler
    // optimised away is ignored, so a shader can be simplified without its callers.
    export function PainterlyNPR__CloudGpu__Uniforms(gl, program, values) {
        let unit  =  0;
        for (const [name, value] of Object.entries(values)) {
            const u  =  program.Uniforms.get(name);
            if (!u) continue;
            switch (u.Type) {
                case gl.FLOAT       :  u.Size > 1 ? gl.uniform1fv(u.Location, value) : gl.uniform1f(u.Location, value); break;
                case gl.FLOAT_VEC2  :  gl.uniform2fv(u.Location, value); break;
                case gl.FLOAT_VEC3  :  gl.uniform3fv(u.Location, value); break;
                case gl.FLOAT_VEC4  :  gl.uniform4fv(u.Location, value); break;
                case gl.INT         :
                case gl.BOOL        :  gl.uniform1i(u.Location, value); break;
                case gl.FLOAT_MAT4  :  gl.uniformMatrix4fv(u.Location, false, value); break;
                case gl.SAMPLER_2D  :
                case gl.SAMPLER_3D  :
                    gl.activeTexture(gl.TEXTURE0 + unit);
                    gl.bindTexture(u.Type === gl.SAMPLER_3D ? gl.TEXTURE_3D : gl.TEXTURE_2D, value);
                    gl.uniform1i(u.Location, unit);
                    unit++;
                    break;
                default        :  throw new Error(`Volumetric clouds: ${program.Name} - uniform ${name} has a type this module does not set (${u.Type})`);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Targets and Volumes
// -----------------------------------------------------------------------------

    // FUNCTION | A Colour Target - half float where the context can render to it
    // ------------------------------------------------------------
    // RGBA16F needs EXT_color_buffer_float to render into; without it the target is
    // RGBA8 and the module still runs, with the buffer's distances clamped to 1.
    export function PainterlyNPR__CloudGpu__Target(gl, width, height) {
        const half     =  !!gl.getExtension('EXT_color_buffer_float');
        const texture  =  gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, width, height, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo  =  gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const status  =  gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Volumetric clouds: a ${width} x ${height} cloud target is incomplete (${status})`);
        return { Texture: texture, Fbo: fbo, Width: width, Height: height, HalfFloat: half };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Cubic RGBA8 Volume That Tiles, With Mipmaps Once Filled
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudGpu__Volume(gl, size) {
        const texture  =  gl.createTexture();
        gl.bindTexture(gl.TEXTURE_3D, texture);
        gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_3D, null);
        return { Texture: texture, Size: size };
    }
    // ------------------------------------------------------------


    // FUNCTION | Free a Target or a Volume
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudGpu__Free(gl, thing) {
        if (!thing) return;
        if (thing.Fbo) gl.deleteFramebuffer(thing.Fbo);
        if (thing.Texture) gl.deleteTexture(thing.Texture);
        if (thing.Program) gl.deleteProgram(thing.Program);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Fullscreen Vertex Shader - one triangle, no buffers
    // ------------------------------------------------------------
    export const PainterlyNPR__CloudGpu__FullscreenVertex = `#version 300 es
        out vec2 vUv;
        void main() {
            vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
            vUv = p;
            gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        }`;
    // ------------------------------------------------------------


    // FUNCTION | Leave the Context as a Host Expects It
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudGpu__Settle(gl) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);
        gl.useProgram(null);
        gl.activeTexture(gl.TEXTURE0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw a Program Over a Whole Target (or one layer of a volume)
    // ------------------------------------------------------------
    export function PainterlyNPR__CloudGpu__Draw(gl, program, fbo, width, height, values, vao) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.SCISSOR_TEST);
        gl.useProgram(program.Program);
        PainterlyNPR__CloudGpu__Uniforms(gl, program, values);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
