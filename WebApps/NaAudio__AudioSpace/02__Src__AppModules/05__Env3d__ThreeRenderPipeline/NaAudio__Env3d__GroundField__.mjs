/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | GROUND FIELD
   =============================================================================

   FILE       : NaAudio__Env3d__GroundField__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - GroundField
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make the ground exist only where the music does
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The floor is no longer a uniform dark plane from horizon to horizon. It is a soft
     field that only appears underneath modules, fading out into empty paper between
     them.
   - Every module contributes a circular influence. Overlapping influences MERGE, so
     three modules in a triangle produce one triangular island with soft blurred edges
     rather than three discs.
   - The grid obeys the same field, so ruled ground and blank ground are the same thing
     seen at two strengths.

   ---------------------------------------------------------------------------

   WHY THE GROUND IS A FIELD AND NOT A SET OF DISCS

   The point of the thing is legibility when zoomed out. A space with four instrument
   clusters should read as four PLACES, and the shape of each place should say something
   about what is in it - a tight cluster is a tight island, a spread arrangement is a
   spread one.

   Summed influence gives that for free. The sum in the middle of a triangle of modules
   clears the threshold even though no single module reaches that far, so the island
   fills in and takes the arrangement's shape. Three separate discs would leave a hole in
   the middle and read as three objects rather than one group.

   It also gives the fluid quality that makes dragging pleasant: the island reshapes
   continuously as a module moves, because the field is evaluated per fragment per frame
   and there is no geometry to rebuild.

   ---------------------------------------------------------------------------

   WHY THIS IS A SHADER INJECTION AND NOT A CUSTOM MATERIAL

   The floor receives the one shadow the lighting rig casts, and a hand-written
   ShaderMaterial would have to reimplement shadow receiving, fog and tone mapping to
   keep it. All three are things three.js already does correctly and none of them are
   interesting to own.

   So the field is injected into the stock material with onBeforeCompile, immediately
   AFTER the fog chunk. That position is deliberate: by then the fragment has been lit,
   tone mapped, converted to output colour space and fogged, so the void colour we mix
   toward is in the same space as the fog colour and the scene background. Mixing any
   earlier means the void is tone mapped and no longer matches the background it is
   pretending to be, and the islands acquire a visible rim.

   ---------------------------------------------------------------------------

   FUTURE - THIS IS WHERE VISUAL GROUPING WILL LIVE

   Sources carry a Pigment field that nothing reads yet. When modules can be grouped, a
   group tints its own island and the regions of the space become colour-coded
   collections rather than merely separate ones. The field maths does not change; only
   the colour that gets mixed in does.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Ground Field
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Shader Symbol Names
    // ------------------------------------------------------------
    // Namespaced inside the GLSL as well as outside it. These identifiers are spliced
    // into a shader three.js also writes into, and a bare 'vWorld' would collide the
    // first time an upstream chunk introduces one.
    //
    // SINGLE underscores, deliberately, and the one place in this codebase that breaks
    // the NaAudio__ convention. GLSL ES reserves any identifier containing two
    // consecutive underscores for future keywords, and the compiler rejects them
    // outright - so the namespace that is correct everywhere else does not compile here.
    const UNIFORM_COUNT      =  'uNaAudioFieldCount';
    const UNIFORM_SOURCES    =  'uNaAudioFieldSources';                      // <-- vec3 array: x, z, radius
    const UNIFORM_VOID       =  'uNaAudioFieldVoidColour';
    const UNIFORM_THRESHOLD  =  'uNaAudioFieldThreshold';
    const UNIFORM_SOFTNESS   =  'uNaAudioFieldSoftness';
    const UNIFORM_CORE       =  'uNaAudioFieldCoreFraction';
    const VARYING_WORLD      =  'vNaAudioFieldWorld';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sources and Bound Materials
    // ------------------------------------------------------------
    const SOURCES    =  new Map();                                           // <-- SourceId -> { Position, Radius, Pigment }
    const MATERIALS  =  [];                                                  // <-- Every material carrying the injection

    let sourceBuffer  =  null;                                               // <-- Float32Array, three floats per slot; uploaded as vec3[]
    let sourceCount   =  0;
    let maxSources    =  0;
    let isEnabled     =  true;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Source
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Vertex Declaration and Assignment
    // ------------------------------------------------------------
    // World position is carried by our own varying rather than reusing three's
    // worldPosition, which only exists when one of several unrelated defines happens to
    // be set. Depending on that would mean the field silently stopped working the day
    // somebody put an environment map on the floor.
    function NaAudio__Env3d__GroundField__VertexChunks() {
        return {
            Declaration : 'varying vec3 ' + VARYING_WORLD + ';\n',
            Assignment  : '\n\t' + VARYING_WORLD + ' = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\n'
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Fragment Declaration and Field Evaluation
    // ------------------------------------------------------------
    // The loop bound is a compile-time constant because GLSL ES 1.00 requires it, and
    // the live count is a uniform that breaks out early. That is why the array length is
    // fixed at compile time and raising FieldMaxSources needs a reload rather than
    // taking effect live.
    function NaAudio__Env3d__GroundField__FragmentChunks(maximum) {
        const declaration  =
            'varying vec3 ' + VARYING_WORLD + ';\n' +
            'uniform int   ' + UNIFORM_COUNT + ';\n' +
            'uniform vec3  ' + UNIFORM_SOURCES + '[' + maximum + '];\n' +
            'uniform vec3  ' + UNIFORM_VOID + ';\n' +
            'uniform float ' + UNIFORM_THRESHOLD + ';\n' +
            'uniform float ' + UNIFORM_SOFTNESS + ';\n' +
            'uniform float ' + UNIFORM_CORE + ';\n';

        // Each source contributes 1.0 at its centre falling to 0.0 at its radius. The
        // contributions SUM, which is what merges neighbouring islands into one shape
        // and fills the middle of a ring of modules.
        const evaluation  =
            '\n' +
            '\tfloat naAudioField = 0.0;\n' +
            '\tfor ( int i = 0; i < ' + maximum + '; i ++ ) {\n' +
            '\t\tif ( i >= ' + UNIFORM_COUNT + ' ) break;\n' +
            '\t\tvec3 naAudioSource = ' + UNIFORM_SOURCES + '[ i ];\n' +
            '\t\tfloat naAudioDistance = distance( ' + VARYING_WORLD + '.xz, naAudioSource.xy );\n' +
            '\t\tnaAudioField += 1.0 - smoothstep( naAudioSource.z * ' + UNIFORM_CORE + ', naAudioSource.z, naAudioDistance );\n' +
            '\t}\n' +
            '\tfloat naAudioPresence = smoothstep( ' + UNIFORM_THRESHOLD + ' - ' + UNIFORM_SOFTNESS + ', ' + UNIFORM_THRESHOLD + ' + ' + UNIFORM_SOFTNESS + ', naAudioField );\n' +
            '\tgl_FragColor.rgb = mix( ' + UNIFORM_VOID + ', gl_FragColor.rgb, naAudioPresence );\n';

        return { Declaration: declaration, Evaluation: evaluation };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attachment
// -----------------------------------------------------------------------------

    // FUNCTION | Prepare the Field From Config
    // ------------------------------------------------------------
    // Called once, before any material is bound. The buffer is allocated at full size
    // and only partly filled, because a uniform array is a fixed allocation in the
    // shader and resizing it would mean recompiling every bound material.
    export function NaAudio__Env3d__GroundField__Prime() {
        isEnabled   =  Env3dBool('GroundField', 'FieldEnabled');
        maxSources  =  Math.max(1, Math.round(Env3dNumber('GroundField', 'FieldMaxSources')));

        sourceBuffer  =  new Float32Array(maxSources * 3);
        sourceCount   =  0;

        SOURCES.clear();
        MATERIALS.length  =  0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Inject the Field Into a Material
    // ------------------------------------------------------------
    // Applied to the floor and to both grid materials. Anything else lying flat on the
    // ground can join simply by being passed here.
    //
    // The material is flagged so a second call is a no-op. Materials are shared by key
    // from the material library, so the floor material could plausibly be handed here
    // twice across a space reload, and a double injection produces a duplicate varying
    // declaration and a shader that fails to compile with a message pointing at
    // three.js rather than at us.
    export function NaAudio__Env3d__GroundField__ApplyToMaterial(material, voidColour) {
        if (!material || !isEnabled) return material;
        if (material.userData.NaAudio__FieldBound) return material;

        const vertexChunks    =  NaAudio__Env3d__GroundField__VertexChunks();
        const fragmentChunks  =  NaAudio__Env3d__GroundField__FragmentChunks(maxSources);

        const uniforms  =  {};
        uniforms[UNIFORM_COUNT]      =  { value: 0 };
        uniforms[UNIFORM_SOURCES]    =  { value: sourceBuffer };
        uniforms[UNIFORM_VOID]       =  { value: new THREE.Color().copy(voidColour) };
        uniforms[UNIFORM_THRESHOLD]  =  { value: Env3dNumber('GroundField', 'FieldThreshold') };
        uniforms[UNIFORM_SOFTNESS]   =  { value: Env3dNumber('GroundField', 'FieldSoftness') };
        uniforms[UNIFORM_CORE]       =  { value: Env3dNumber('GroundField', 'FieldCoreFraction') };

        material.onBeforeCompile  =  function (shader) {
            Object.assign(shader.uniforms, uniforms);

            shader.vertexShader  =  vertexChunks.Declaration + shader.vertexShader;
            shader.vertexShader  =  shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>' + vertexChunks.Assignment
            );

            shader.fragmentShader  =  fragmentChunks.Declaration + shader.fragmentShader;

            // AFTER the fog chunk, deliberately. By that point the fragment is in output
            // colour space, which is the space the void colour and the scene background
            // are already in - so the void is indistinguishable from empty scene rather
            // than being a tone mapped approximation of it.
            shader.fragmentShader  =  shader.fragmentShader.replace(
                '#include <fog_fragment>',
                '#include <fog_fragment>' + fragmentChunks.Evaluation
            );
        };

        // Two materials that differ only in their injected uniforms must not share a
        // compiled program. Without a distinct cache key three.js reuses the first
        // program it built and the second material silently renders with the first
        // material's uniform block.
        material.customProgramCacheKey  =  function () {
            return 'NaAudio__GroundField__' + maxSources;
        };

        material.userData.NaAudio__FieldBound     =  true;
        material.userData.NaAudio__FieldUniforms  =  uniforms;
        material.needsUpdate  =  true;

        MATERIALS.push(material);
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sources
// -----------------------------------------------------------------------------

    // FUNCTION | Add or Update an Influence Source
    // ------------------------------------------------------------
    // Position is read by reference and never copied. That is the point: a module hands
    // over its live position vector once, and the island follows it for the rest of the
    // module's life without anybody having to remember to push an update on a drag.
    export function NaAudio__Env3d__GroundField__SetSource(sourceId, position, radius, pigment) {
        SOURCES.set(sourceId, {
            Position : position,
            Radius   : radius,
            Pigment  : pigment || null                                        // <-- Reserved for group tinting; nothing reads it yet
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove an Influence Source
    // ------------------------------------------------------------
    export function NaAudio__Env3d__GroundField__RemoveSource(sourceId) {
        SOURCES.delete(sourceId);
    }
    // ------------------------------------------------------------


    // FUNCTION | How Many Sources Are Registered
    // ------------------------------------------------------------
    export function NaAudio__Env3d__GroundField__SourceCount() {
        return SOURCES.size;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Upload
// -----------------------------------------------------------------------------

    // FUNCTION | Repack the Source Buffer and Publish the Live Count
    // ------------------------------------------------------------
    // Called once per frame from a scene update hook. The whole job is 3N float writes
    // and one integer, into a buffer every bound material already points at - so the
    // cost does not scale with the number of materials carrying the field, only with
    // the number of modules in the space.
    //
    // Sources past the cap are DROPPED and reported once, rather than being silently
    // ignored. An island that quietly fails to appear under the twenty-fifth module
    // would read as a rendering bug for a long time before anybody suspected a limit.
    export function NaAudio__Env3d__GroundField__Update() {
        if (!isEnabled || MATERIALS.length === 0) return;

        let index  =  0;
        for (const source of SOURCES.values()) {
            if (index >= maxSources) break;

            sourceBuffer[index * 3 + 0]  =  source.Position.x;
            sourceBuffer[index * 3 + 1]  =  source.Position.z;
            sourceBuffer[index * 3 + 2]  =  source.Radius;
            index += 1;
        }

        if (SOURCES.size > maxSources && sourceCount !== SOURCES.size) {
            console.warn('[NaAudio GroundField] ' + SOURCES.size + ' influence sources but only ' + maxSources + ' slots. Modules past the cap sit on bare ground. Raise FieldMaxSources in Na__Env3d__Config.json and reload - the array length is compiled into the shader, so it cannot grow live.');
        }

        sourceCount  =  SOURCES.size;

        for (let i = 0; i < MATERIALS.length; i++) {
            const uniforms  =  MATERIALS[i].userData.NaAudio__FieldUniforms;
            if (uniforms) uniforms[UNIFORM_COUNT].value  =  index;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Field Is Switched On
    // ------------------------------------------------------------
    export function NaAudio__Env3d__GroundField__IsEnabled() {
        return isEnabled;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
