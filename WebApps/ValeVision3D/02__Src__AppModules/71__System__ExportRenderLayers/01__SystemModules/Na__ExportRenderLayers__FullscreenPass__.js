// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - FULL SCREEN DERIVATION PASS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__FullscreenPass__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Full Screen Derivation Pass
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Own the small full-screen scene and orthographic camera that
//              turn structural G-buffer data into display-ready RGBA8 tiles.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - One responsibility: read the structural G-buffer and write the encoded
//   bytes for whichever derived layer was asked for. It never renders scene
//   geometry, never touches materials and never knows about files or the UI.
// - A single shader with a mode uniform rather than several near-identical
//   shaders. One compile, one full-screen triangle, zero per-pass allocation.
// - Every neighbourhood sample stays inside the tile gutter, so a Sobel taken
//   at a tile boundary reads real overscanned geometry rather than a clamped
//   edge. That is what keeps True Canny seam-free across a tiled export.
// - Edge strength is normalised against two documented references rather than
//   raw magic numbers, and both are written into the manifest so a map can be
//   reproduced later:
//     * depth  reference - the normalised-depth step that reads as a full
//                          strength edge (0.4% of the global visible range)
//     * normal reference - the cosine at which a surface turn reads as a full
//                          strength edge (25 degrees)
// - Ambient occlusion reconstructs view-space positions from the tile's own
//   projection matrix, so its sample radius is a real world distance and its
//   result is continuous across tile boundaries.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Derivation Modes
    // ------------------------------------------------------------
    // Registry pass generators reference these by name; the shader
    // branches on the numeric value.
    // ------------------------------------------------------------
    const Na__ErlFullscreen__MODE = {
        DEPTH        : 0,
        NORMAL       : 1,
        CANNY        : 2,       // <-- True Canny; the essential Canny is inverted Line Art
        SILHOUETTE   : 3,
        OCCLUSION    : 4,
        DEPTH_PROBE  : 5        // <-- Internal: R = normalised depth, G = coverage
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Edge Response References
    // ------------------------------------------------------------
    // Recorded in the manifest alongside the configured thresholds so a
    // structural map is reproducible without reading this source file.
    // ------------------------------------------------------------
    const Na__ErlFullscreen__DEPTH_EDGE_REFERENCE  = 0.004;   // <-- Normalised-depth step reading as a full-strength edge
    const Na__ErlFullscreen__NORMAL_EDGE_REFERENCE = 0.906;   // <-- cos(25 deg); surface turn reading as a full-strength edge
    const Na__ErlFullscreen__COVERAGE_THRESHOLD    = 0.5;     // <-- Decoded normal length above which a texel holds real geometry
    const Na__ErlFullscreen__MAX_AO_SAMPLES        = 32;      // <-- Shader loop bound; the uniform selects how many are used
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Source
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Full Screen Vertex Shader
    // ------------------------------------------------------------
    const Na__ErlFullscreen__VertexShader = /* glsl */`
        varying vec2 vNaUv;

        void main() {
            vNaUv       = uv;
            gl_Position = vec4( position.xy, 0.0, 1.0 );      // <-- Clip-space quad; no matrices needed
        }
    `;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Full Screen Derivation Fragment Shader
    // ------------------------------------------------------------
    const Na__ErlFullscreen__FragmentShader = /* glsl */`
        precision highp float;

        #define NA_MAX_AO_SAMPLES ${Na__ErlFullscreen__MAX_AO_SAMPLES}

        uniform sampler2D u_naStructural;
        uniform sampler2D u_naLuminance;

        uniform int   u_naMode;
        uniform vec2  u_naTexel;
        uniform vec2  u_naProjectionScale;   // <-- (P[0][0], P[1][1]) of the tile projection; projects a world radius to uv

        uniform float u_naDepthNear;
        uniform float u_naDepthRange;
        uniform float u_naDepthInvert;

        uniform vec3  u_naBackground;
        uniform vec3  u_naEdgeColour;

        uniform float u_naDepthEdgeReference;
        uniform float u_naNormalEdgeReference;
        uniform float u_naCoverageThreshold;

        uniform float u_naCannyDepthWeight;
        uniform float u_naCannyNormalWeight;
        uniform float u_naCannyLuminanceWeight;
        uniform float u_naCannyThresholdLow;
        uniform float u_naCannyThresholdHigh;

        uniform float u_naAoRadius;
        uniform float u_naAoIntensity;
        uniform int   u_naAoSampleCount;
        uniform mat4  u_naProjectionInverse;

        varying vec2 vNaUv;


        // Decode one structural texel into normal, depth and coverage
        // ------------------------------------
        struct NaSurface {
            vec3  normal;
            float depth;
            float covered;
        };

        NaSurface naReadSurface( vec2 uv ) {
            vec4 texel = texture2D( u_naStructural, uv );
            NaSurface surface;
            surface.normal  = texel.rgb * 2.0 - 1.0;
            surface.depth   = texel.a;
            surface.covered = step( u_naCoverageThreshold, length( surface.normal ) );
            surface.normal  = ( surface.covered > 0.5 ) ? normalize( surface.normal ) : vec3( 0.0, 0.0, 1.0 );
            return surface;
        }


        // Clamp a sample uv into the tile framebuffer so a stray read cannot wrap
        // ------------------------------------
        // The clamp range is the WHOLE tile framebuffer, gutter included. A
        // neighbourhood sample taken next to a tile boundary is meant to read
        // the overscan; only a genuine wrap has to be prevented.
        // ------------------------------------
        vec2 naClampUv( vec2 uv ) {
            return clamp( uv, vec2( 0.0 ), vec2( 1.0 ) - u_naTexel );
        }


        // Structural edge response from depth and normal discontinuities
        // ------------------------------------
        // radiusScale widens the neighbourhood for the soft families without
        // duplicating the sampling code.
        // ------------------------------------
        vec2 naStructuralEdge( vec2 uv, float radiusScale ) {
            vec2 step1 = u_naTexel * radiusScale;

            NaSurface centre = naReadSurface( uv );

            float depthResponse  = 0.0;
            float normalResponse = 0.0;

            for ( int i = 0; i < 4; i++ ) {
                vec2 offset =
                      ( i == 0 ) ? vec2(  step1.x, 0.0 )
                    : ( i == 1 ) ? vec2( -step1.x, 0.0 )
                    : ( i == 2 ) ? vec2( 0.0,  step1.y )
                                 : vec2( 0.0, -step1.y );

                NaSurface neighbour = naReadSurface( naClampUv( uv + offset ) );

                // A covered / uncovered transition is a silhouette: full strength.
                float coverageBreak = abs( centre.covered - neighbour.covered );

                float depthStep = abs( centre.depth - neighbour.depth ) * centre.covered * neighbour.covered;
                depthResponse   = max( depthResponse, max( depthStep / max( u_naDepthEdgeReference, 1e-6 ), coverageBreak ) );

                float alignment = dot( centre.normal, neighbour.normal ) * centre.covered * neighbour.covered;
                float turn      = ( 1.0 - alignment ) / max( 1.0 - u_naNormalEdgeReference, 1e-6 );
                normalResponse  = max( normalResponse, turn * centre.covered * neighbour.covered );
            }

            return vec2( clamp( depthResponse, 0.0, 1.0 ), clamp( normalResponse, 0.0, 1.0 ) );
        }


        // Luminance gradient from the optional greyscale reference image
        // ------------------------------------
        float naLuminanceEdge( vec2 uv, float radiusScale ) {
            vec2 step1 = u_naTexel * radiusScale;

            float centre = dot( texture2D( u_naLuminance, uv ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
            float total  = 0.0;

            for ( int i = 0; i < 4; i++ ) {
                vec2 offset =
                      ( i == 0 ) ? vec2(  step1.x, 0.0 )
                    : ( i == 1 ) ? vec2( -step1.x, 0.0 )
                    : ( i == 2 ) ? vec2( 0.0,  step1.y )
                                 : vec2( 0.0, -step1.y );

                float neighbour = dot( texture2D( u_naLuminance, naClampUv( uv + offset ) ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
                total = max( total, abs( centre - neighbour ) );
            }

            return clamp( total * 4.0, 0.0, 1.0 );
        }


        // Reconstruct a view-space position from uv plus normalised depth
        // ------------------------------------
        vec3 naViewPosition( vec2 uv, float normalisedDepth ) {
            vec4 clipPoint = vec4( uv * 2.0 - 1.0, -1.0, 1.0 );
            vec4 viewPoint = u_naProjectionInverse * clipPoint;
            vec3 ray       = viewPoint.xyz / viewPoint.w;
            ray           /= max( -ray.z, 1e-6 );                       // <-- Normalise so the ray hits z = -1
            return ray * ( u_naDepthNear + normalisedDepth * u_naDepthRange );
        }


        // Screen-space ambient occlusion factor: 1 = open, 0 = fully occluded
        // ------------------------------------
        float naOcclusion( vec2 uv ) {
            NaSurface centre = naReadSurface( uv );
            if ( centre.covered < 0.5 ) return 1.0;

            vec3  centreView = naViewPosition( uv, centre.depth );
            float occlusion  = 0.0;
            float taken      = 0.0;

            float phase = fract( sin( dot( uv, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) * 6.2831853;

            for ( int i = 0; i < NA_MAX_AO_SAMPLES; i++ ) {
                if ( i >= u_naAoSampleCount ) break;

                float index  = float( i ) + 0.5;
                float count  = float( u_naAoSampleCount );
                float angle  = phase + index * 2.39996323;               // <-- Golden angle spiral
                float radius = sqrt( index / count );

                vec2 discOffset = vec2( cos( angle ), sin( angle ) ) * radius;

                // Project the world radius into uv space at this depth. For a
                // perspective projection a world length L at view depth d spans
                // L * P[i][i] / d in NDC, and NDC spans 2 across the frame.
                float depthMetres = u_naDepthNear + centre.depth * u_naDepthRange;
                vec2  uvRadius    = ( u_naAoRadius * u_naProjectionScale ) / ( 2.0 * max( depthMetres, 1e-3 ) );

                vec2      sampleUv = naClampUv( uv + discOffset * uvRadius );
                NaSurface sampled  = naReadSurface( sampleUv );
                if ( sampled.covered < 0.5 ) { taken += 1.0; continue; }

                vec3  sampleView = naViewPosition( sampleUv, sampled.depth );
                vec3  delta      = sampleView - centreView;
                float distance   = length( delta );
                if ( distance < 1e-4 ) { taken += 1.0; continue; }

                float horizon    = max( 0.0, dot( delta / distance, centre.normal ) - 0.05 );
                float falloff    = u_naAoRadius / ( u_naAoRadius + distance );

                occlusion += horizon * falloff;
                taken     += 1.0;
            }

            if ( taken < 1.0 ) return 1.0;
            return clamp( 1.0 - ( occlusion / taken ) * u_naAoIntensity, 0.0, 1.0 );
        }


        void main() {
            NaSurface centre = naReadSurface( vNaUv );


            // DEPTH PROBE | Internal measurement pass, never exported
            // ------------------------------------
            // R carries the raw normalised depth and G carries coverage, so
            // the range finder can build a histogram of the depths that are
            // actually on screen rather than guessing from bounding boxes.
            // ------------------------------------
            if ( u_naMode == ${Na__ErlFullscreen__MODE.DEPTH_PROBE} ) {
                gl_FragColor = vec4( centre.depth, centre.covered, 0.0, 1.0 );
                return;
            }


            // DEPTH | Near white, far black, background black by default
            // ------------------------------------
            if ( u_naMode == ${Na__ErlFullscreen__MODE.DEPTH} ) {
                if ( centre.covered < 0.5 ) { gl_FragColor = vec4( u_naBackground, 1.0 ); return; }
                float value = mix( 1.0 - centre.depth, centre.depth, u_naDepthInvert );
                gl_FragColor = vec4( vec3( value ), 1.0 );
                return;
            }


            // NORMAL | View-space normal encoded straight through
            // ------------------------------------
            if ( u_naMode == ${Na__ErlFullscreen__MODE.NORMAL} ) {
                if ( centre.covered < 0.5 ) { gl_FragColor = vec4( u_naBackground, 1.0 ); return; }
                gl_FragColor = vec4( centre.normal * 0.5 + 0.5, 1.0 );
                return;
            }


            // SILHOUETTE | Binary coverage, no internal detail
            // ------------------------------------
            if ( u_naMode == ${Na__ErlFullscreen__MODE.SILHOUETTE} ) {
                gl_FragColor = vec4( mix( u_naBackground, u_naEdgeColour, centre.covered ), 1.0 );
                return;
            }


            // OCCLUSION | Greyscale AO factor, white open, black occluded
            // ------------------------------------
            if ( u_naMode == ${Na__ErlFullscreen__MODE.OCCLUSION} ) {
                gl_FragColor = vec4( vec3( naOcclusion( vNaUv ) ), 1.0 );
                return;
            }


            // TRUE CANNY | The only derived edge pass left
            // ------------------------------------
            // Depth and normal discontinuities carry the weight; luminance is
            // a low-weight term so a shadow or a glazing reflection cannot
            // dominate the condition.
            // ------------------------------------
            vec2  response   = naStructuralEdge( vNaUv, 1.0 );
            float structural = max( response.x * u_naCannyDepthWeight,
                                    response.y * u_naCannyNormalWeight );

            float luminance = ( u_naCannyLuminanceWeight > 0.0 )
                ? naLuminanceEdge( vNaUv, 1.0 ) * u_naCannyLuminanceWeight
                : 0.0;

            float combined = max( structural, luminance );
            float strength = step( 0.5, smoothstep( u_naCannyThresholdLow, u_naCannyThresholdHigh, combined ) );

            gl_FragColor = vec4( mix( u_naBackground, u_naEdgeColour, strength ), 1.0 );
        }
    `;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Full Screen Pass Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Full Screen Derivation Pass
    // ------------------------------------------------------------
    // Returns:
    //   {
    //     MODE,                    <-- Mode enum for pass generators
    //     material,                <-- Exposed for compileAsync warm-up
    //     configure(options),      <-- Set uniforms once per batch
    //     setPerTile(options),     <-- Set uniforms that change per tile
    //     render(options),         <-- Draw one derived tile into a target
    //     describeThresholds(),    <-- Manifest record of the active tuning
    //     dispose()
    //   }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Fullscreen__Create() {

        // GEOMETRY | One oversized clip-space triangle, reused forever
        // ------------------------------------------------------------
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
        geometry.setAttribute('uv',       new THREE.Float32BufferAttribute([ 0,  0,    2,  0,    0,  2   ], 2));


        // MATERIAL | Single mode-driven derivation shader
        // ------------------------------------------------------------
        const material = new THREE.ShaderMaterial({
            uniforms: {
                u_naStructural            : { value: null },
                u_naLuminance             : { value: null },
                u_naMode                  : { value: Na__ErlFullscreen__MODE.DEPTH },
                u_naTexel                 : { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
                u_naProjectionScale       : { value: new THREE.Vector2(1, 1) },
                u_naDepthNear             : { value: 0.1 },
                u_naDepthRange            : { value: 1.0 },
                u_naDepthInvert           : { value: 0.0 },
                u_naBackground            : { value: new THREE.Color(0x000000) },
                u_naEdgeColour            : { value: new THREE.Color(0xffffff) },
                u_naDepthEdgeReference    : { value: Na__ErlFullscreen__DEPTH_EDGE_REFERENCE },
                u_naNormalEdgeReference   : { value: Na__ErlFullscreen__NORMAL_EDGE_REFERENCE },
                u_naCoverageThreshold     : { value: Na__ErlFullscreen__COVERAGE_THRESHOLD },
                u_naCannyDepthWeight      : { value: 1.0 },
                u_naCannyNormalWeight     : { value: 0.85 },
                u_naCannyLuminanceWeight  : { value: 0.0 },
                u_naCannyThresholdLow     : { value: 0.12 },
                u_naCannyThresholdHigh    : { value: 0.32 },
                u_naAoRadius              : { value: 0.9 },
                u_naAoIntensity           : { value: 1.1 },
                u_naAoSampleCount         : { value: 16 },
                u_naProjectionInverse     : { value: new THREE.Matrix4() }
            },
            vertexShader   : Na__ErlFullscreen__VertexShader,
            fragmentShader : Na__ErlFullscreen__FragmentShader,
            depthTest      : false,
            depthWrite     : false,
            transparent    : false,
            fog            : false
        });
        material.name = 'ExportRenderLayers_FullscreenDerivation';

        const mesh   = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;

        const scene  = new THREE.Scene();
        scene.add(mesh);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const uniforms = material.uniforms;


        return {

            MODE : Na__ErlFullscreen__MODE,
            material,


            // FUNCTION | Apply Batch-Level Uniforms From Config and Depth Range
            // ------------------------------------------------------------
            // options: { config, depthRange, aoRadiusUnits }
            // ------------------------------------------------------------
            configure(options) {
                const { config, depthRange, aoRadiusUnits } = options;

                uniforms.u_naDepthNear.value   = depthRange.nearM;
                uniforms.u_naDepthRange.value  = depthRange.rangeM;
                uniforms.u_naDepthInvert.value = depthRange.invert ? 1.0 : 0.0;

                uniforms.u_naCannyDepthWeight.value     = Na__ErlFullscreen__ReadNumber(config, 'ExportRenderLayers__Config__CannyDepthWeight', 1.0);
                uniforms.u_naCannyNormalWeight.value    = Na__ErlFullscreen__ReadNumber(config, 'ExportRenderLayers__Config__CannyNormalWeight', 0.85);
                uniforms.u_naCannyThresholdLow.value    = Na__ErlFullscreen__ReadNumber(config, 'ExportRenderLayers__Config__CannyThresholdLow', 0.12);
                uniforms.u_naCannyThresholdHigh.value   = Na__ErlFullscreen__ReadNumber(config, 'ExportRenderLayers__Config__CannyThresholdHigh', 0.32);
                uniforms.u_naAoIntensity.value          = Na__ErlFullscreen__ReadNumber(config, 'ExportRenderLayers__Config__AoIntensity', 1.1);
                uniforms.u_naAoSampleCount.value        = Math.min(
                    Na__ErlFullscreen__MAX_AO_SAMPLES,
                    Math.max(4, Math.round(Na__ErlFullscreen__ReadNumber(config, 'ExportRenderLayers__Config__AoSampleCount', 16)))
                );
                uniforms.u_naAoRadius.value             = Number.isFinite(aoRadiusUnits) ? aoRadiusUnits : 0.9;
            },
            // ------------------------------------------------------------


            // FUNCTION | Apply Uniforms That Change With Each Tile
            // ------------------------------------------------------------
            // options: { structuralTexture, luminanceTexture, width, height, camera }
            //
            // The tile camera carries this tile's own sub-frustum, so the
            // reconstructed view positions and the world-radius projection
            // used by ambient occlusion stay continuous across boundaries.
            // ------------------------------------------------------------
            setPerTile(options) {
                const { structuralTexture, luminanceTexture, width, height, camera: tileCamera } = options;

                uniforms.u_naStructural.value = structuralTexture;
                uniforms.u_naLuminance.value  = luminanceTexture || structuralTexture;   // <-- Always bind something; the weights gate real use
                uniforms.u_naTexel.value.set(1 / Math.max(1, width), 1 / Math.max(1, height));

                if (tileCamera) {
                    uniforms.u_naProjectionInverse.value.copy(tileCamera.projectionMatrixInverse);
                    uniforms.u_naProjectionScale.value.set(
                        tileCamera.projectionMatrix.elements[0],                         // <-- P[0][0]
                        tileCamera.projectionMatrix.elements[5]                          // <-- P[1][1]
                    );
                }
            },
            // ------------------------------------------------------------


            // FUNCTION | Render One Derived Tile Into a Target
            // ------------------------------------------------------------
            // options: { renderer, target, mode, background, edgeColour,
            //            luminanceWeight, blending }
            // ------------------------------------------------------------
            render(options) {
                const {
                    renderer, target, mode,
                    background      = 0x000000,
                    edgeColour      = 0xffffff,
                    luminanceWeight = 0,
                    blending        = THREE.NormalBlending
                } = options;

                uniforms.u_naMode.value = mode;

                // BYTE VALUES, NOT SCENE COLOURS
                // ------------------------------------
                // These uniforms are written straight to the output bytes by
                // the shader below, so they must NOT go through Three's sRGB
                // to linear conversion. setHex with the working colour space
                // stores the authored value verbatim; a plain set() would turn
                // the conventional #8080ff normal background into (55, 55, 255).
                // ------------------------------------
                uniforms.u_naBackground.value.setHex(background, THREE.LinearSRGBColorSpace);
                uniforms.u_naEdgeColour.value.setHex(edgeColour, THREE.LinearSRGBColorSpace);
                uniforms.u_naCannyLuminanceWeight.value = (mode === Na__ErlFullscreen__MODE.CANNY) ? luminanceWeight : 0.0;

                material.blending = blending;                            // <-- Blend mode alone never triggers a recompile

                renderer.setRenderTarget(target);
                if (blending === THREE.NormalBlending) {
                    renderer.setClearColor(background, 1.0);
                    renderer.clear(true, false, false);                  // <-- Preserve any depth the caller populated
                }
                renderer.render(scene, camera);
            },
            // ------------------------------------------------------------


            // FUNCTION | Describe the Active Tuning for the Manifest
            // ------------------------------------------------------------
            describeThresholds() {
                return {
                    depthEdgeReference   : uniforms.u_naDepthEdgeReference.value,
                    normalEdgeReference  : uniforms.u_naNormalEdgeReference.value,
                    coverageThreshold    : uniforms.u_naCoverageThreshold.value,
                    cannyDepthWeight     : uniforms.u_naCannyDepthWeight.value,
                    cannyNormalWeight    : uniforms.u_naCannyNormalWeight.value,
                    cannyThresholdLow    : uniforms.u_naCannyThresholdLow.value,
                    cannyThresholdHigh   : uniforms.u_naCannyThresholdHigh.value,
                    aoRadiusSceneUnits   : uniforms.u_naAoRadius.value,
                    aoIntensity          : uniforms.u_naAoIntensity.value,
                    aoSampleCount        : uniforms.u_naAoSampleCount.value
                };
            },
            // ------------------------------------------------------------


            // FUNCTION | Dispose the Quad Geometry and Shader
            // ------------------------------------------------------------
            dispose() {
                geometry.dispose();
                material.dispose();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Numeric Config Value With a Fallback
    // ------------------------------------------------------------
    function Na__ErlFullscreen__ReadNumber(config, key, fallback) {
        const value = config ? config[key] : undefined;
        return Number.isFinite(value) ? value : fallback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Full Screen Derivation Pass API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Fullscreen__Create,
        Na__ErlFullscreen__MODE
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
