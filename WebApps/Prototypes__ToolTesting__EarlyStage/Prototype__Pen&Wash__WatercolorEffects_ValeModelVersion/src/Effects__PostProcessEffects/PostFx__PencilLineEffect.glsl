precision highp float;

// =============================================================================
// PEN & WASH WATERCOLOR EFFECTS - PENCIL LINE SHADER
// =============================================================================
//
// FILE       : PostFx__PencilLineEffect.glsl
// NAMESPACE  : PenWashWatercolorEffects
// MODULE     : Pencil Line Fragment Shader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : GLSL shader for wavy hand-drawn pencil line rendering
// CREATED    : 2025
//
// DESCRIPTION:
// - Fragment shader implementing organic pencil line effect
// - Multi-octave noise functions for natural hand-drawn appearance
// - Wave distortion applied to edge detection for wobbling lines
// - Variable thickness based on edge strength for expressive linework
// - Multiple sampling passes for richer pencil texture
// - Time-based animation for subtle organic movement
//
// =============================================================================

// -----------------------------------------------------------------------------
// SHADER INPUTS AND UNIFORMS
// -----------------------------------------------------------------------------

    // Shader Inputs
    // ------------------------------------------------------------
    varying vec2 vUV;                                                                  // <-- Screen UV coordinates
    // ------------------------------------------------------------
    
    // Texture Uniforms
    // ------------------------------------------------------------
    uniform sampler2D textureSampler;                                                  // <-- Input scene texture
    // ------------------------------------------------------------
    
    // Screen and Time Uniforms
    // ------------------------------------------------------------
    uniform vec2 screenSize;                                                          // <-- Screen width and height
    uniform float time;                                                               // <-- Time for animation
    // ------------------------------------------------------------
    
    // Wave Distortion Uniforms
    // ------------------------------------------------------------
    uniform float waveFrequency;                                                      // <-- Wave frequency (higher = more waves)
    uniform float waveAmplitude;                                                      // <-- Wave amplitude (higher = more wobble)
    uniform float noiseScale;                                                         // <-- Noise texture scale
    // ------------------------------------------------------------
    
    // Edge Detection Uniforms
    // ------------------------------------------------------------
    uniform float edgeThreshold;                                                      // <-- Edge detection threshold
    uniform float edgeIntensity;                                                      // <-- Edge line darkness
    uniform float edgeThicknessMin;                                                   // <-- Minimum edge thickness
    uniform float edgeThicknessMax;                                                   // <-- Maximum edge thickness
    // ------------------------------------------------------------
    
    // Multi-Pass Uniforms
    // ------------------------------------------------------------
    uniform float multiPassEnabled;                                                   // <-- Enable multiple passes (1.0 = enabled)
    uniform float secondPassOffset;                                                   // <-- Second pass offset multiplier
    uniform float secondPassIntensity;                                                // <-- Second pass intensity
    uniform float secondPassPhaseOffset;                                              // <-- Second pass phase angle offset in radians
    uniform float secondPassTimeOffset;                                               // <-- Second pass time offset for animation
    // ------------------------------------------------------------

// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Noise Functions - Organic Texture Generation
// -----------------------------------------------------------------------------

    // FUNCTION | Hash Function - Pseudo-random hash for noise generation
    // ------------------------------------------------------------
    float hash(vec2 p) {
        float h = dot(p, vec2(127.1, 311.7));                                         // <-- Hash function using dot product
        return fract(sin(h) * 43758.5453123);                                         // <-- Return fractional part for randomness
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Value Noise - Basic value noise function
    // ------------------------------------------------------------
    float valueNoise(vec2 p) {
        vec2 i = floor(p);                                                            // <-- Integer part
        vec2 f = fract(p);                                                            // <-- Fractional part
        
        // Smooth interpolation (smoothstep)
        // ------------------------------------
        vec2 u = f * f * (3.0 - 2.0 * f);                                             // <-- Smoothstep function
        
        // Four corners of the cell
        // ------------------------------------
        float a = hash(i);                                                            // <-- Bottom-left corner
        float b = hash(i + vec2(1.0, 0.0));                                          // <-- Bottom-right corner
        float c = hash(i + vec2(0.0, 1.0));                                          // <-- Top-left corner
        float d = hash(i + vec2(1.0, 1.0));                                          // <-- Top-right corner
        
        // Bilinear interpolation
        // ------------------------------------
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);                              // <-- Interpolate between corners
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Multi-Octave Noise - Layered noise for natural variation
    // ------------------------------------------------------------
    float multiOctaveNoise(vec2 p, int octaves) {
        float value = 0.0;                                                            // <-- Accumulated noise value
        float amplitude = 0.5;                                                        // <-- Initial amplitude
        float frequency = 1.0;                                                        // <-- Initial frequency
        
        for (int i = 0; i < 8; i++) {                                                 // <-- Maximum 8 octaves (loop unrolling friendly)
            if (i >= octaves) break;                                                  // <-- Early exit if fewer octaves requested
            
            value += amplitude * valueNoise(p * frequency);                            // <-- Add octave contribution
            amplitude *= 0.5;                                                         // <-- Reduce amplitude for next octave
            frequency *= 2.0;                                                         // <-- Increase frequency for next octave
        }
        
        return value;                                                                 // <-- Return accumulated noise
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Directional Noise - Noise along a specific direction
    // ------------------------------------------------------------
    vec2 directionalNoise(vec2 p, float time) {
        float noiseX = multiOctaveNoise(p + vec2(time * 0.1, 0.0), 3);               // <-- Noise in X direction with time offset
        float noiseY = multiOctaveNoise(p + vec2(0.0, time * 0.1), 3);               // <-- Noise in Y direction with time offset
        
        return vec2(noiseX, noiseY) * 2.0 - 1.0;                                      // <-- Remap from [0,1] to [-1,1]
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions - Color and Edge Processing
// -----------------------------------------------------------------------------

    // FUNCTION | Calculate Luminance - Perceptual brightness
    // ------------------------------------------------------------
    float luminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));                                 // <-- Perceptual luminance calculation (Rec. 709)
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Safe Texture Sample - Sample texture with boundary clamping
    // ------------------------------------------------------------
    vec3 sampleTextureSafe(sampler2D tex, vec2 uv) {
        vec2 clampedUV = clamp(uv, 0.0, 1.0);                                         // <-- Clamp UV to valid range
        return texture2D(tex, clampedUV).rgb;                                         // <-- Sample and return RGB
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wave Generation - Organic Pencil Wobble
// -----------------------------------------------------------------------------

    // FUNCTION | Generate Wave Offset - Create organic wave distortion
    // ------------------------------------------------------------
    vec2 generateWaveOffset(vec2 uv, float time, float frequency, float amplitude, float noiseScale) {
        // Calculate base wave coordinates
        // ------------------------------------
        vec2 waveCoord = uv * noiseScale;                                              // <-- Scale UV for noise sampling
        
        // Generate directional noise for organic movement
        // ------------------------------------
        vec2 noise = directionalNoise(waveCoord, time);                                // <-- Get directional noise
        
        // Create sine wave variations with screen-space scaling
        // ------------------------------------
        float waveX = sin(uv.y * frequency + time + noise.x * 3.0) * amplitude;       // <-- Horizontal wave with noise
        float waveY = cos(uv.x * frequency + time + noise.y * 3.0) * amplitude;       // <-- Vertical wave with noise
        
        // Add additional noise layers for organic texture
        // ------------------------------------
        waveX += noise.x * amplitude * 0.5;                                            // <-- Add noise to X offset
        waveY += noise.y * amplitude * 0.5;                                            // <-- Add noise to Y offset
        
        return vec2(waveX, waveY) * 0.002;                                             // <-- Scale to visible range (pixel-space)
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Edge Detection - Wavy Pencil Line Detection
// -----------------------------------------------------------------------------

    // FUNCTION | Detect Edge with Wave Distortion - Sobel operator with wavy sampling
    // ------------------------------------------------------------
    float detectEdgeWavy(sampler2D tex, vec2 uv, vec2 screenSize, float thickness, vec2 waveOffset) {
        // Validate screen size to prevent division by zero
        // ------------------------------------
        if (screenSize.x <= 0.0 || screenSize.y <= 0.0) {
            return 0.0;                                                                // <-- Return no edge if invalid screen size
        }
        
        vec2 texelSize = (1.0 / screenSize) * thickness;                              // <-- Calculate texel size with thickness multiplier
        
        // Apply wave distortion directly to UV coordinates for wavy edges
        // ------------------------------------
        vec2 wavyUV = uv + waveOffset;                                                 // <-- Add wave distortion to UV position
        
        // Sample surrounding pixels for Sobel edge detection with wavy offsets
        // ------------------------------------
        float tl = luminance(sampleTextureSafe(tex, wavyUV + vec2(-texelSize.x, -texelSize.y)));  // <-- Top-left
        float tm = luminance(sampleTextureSafe(tex, wavyUV + vec2(0.0, -texelSize.y)));           // <-- Top-middle
        float tr = luminance(sampleTextureSafe(tex, wavyUV + vec2(texelSize.x, -texelSize.y)));   // <-- Top-right
        float ml = luminance(sampleTextureSafe(tex, wavyUV + vec2(-texelSize.x, 0.0)));           // <-- Middle-left
        float mr = luminance(sampleTextureSafe(tex, wavyUV + vec2(texelSize.x, 0.0)));            // <-- Middle-right
        float bl = luminance(sampleTextureSafe(tex, wavyUV + vec2(-texelSize.x, texelSize.y)));   // <-- Bottom-left
        float bm = luminance(sampleTextureSafe(tex, wavyUV + vec2(0.0, texelSize.y)));            // <-- Bottom-middle
        float br = luminance(sampleTextureSafe(tex, wavyUV + vec2(texelSize.x, texelSize.y)));    // <-- Bottom-right
        
        // Sobel operator kernels for gradient calculation
        // ------------------------------------
        float gx = (-1.0 * tl) + (-2.0 * ml) + (-1.0 * bl) +                          // <-- Horizontal gradient
                   (1.0 * tr) + (2.0 * mr) + (1.0 * br);
        float gy = (-1.0 * tl) + (-2.0 * tm) + (-1.0 * tr) +                          // <-- Vertical gradient
                   (1.0 * bl) + (2.0 * bm) + (1.0 * br);
        
        float edgeMagnitude = sqrt(gx * gx + gy * gy);                                // <-- Calculate edge magnitude
        
        // Normalize edge magnitude to 0-1 range
        // ------------------------------------
        float normalizedMagnitude = clamp(edgeMagnitude / 6.0, 0.0, 1.0);             // <-- Normalize to 0-1 range
        
        return normalizedMagnitude;                                                    // <-- Return edge strength
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Calculate Variable Thickness - Edge thickness based on strength
    // ------------------------------------------------------------
    float calculateVariableThickness(float edgeStrength, float minThickness, float maxThickness) {
        return mix(minThickness, maxThickness, edgeStrength);                          // <-- Interpolate thickness based on edge strength
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Apply Phase Rotation - Rotate wave offset by phase angle
    // ------------------------------------------------------------
    vec2 applyPhaseRotation(vec2 waveOffset, float phaseAngle) {
        float cosAngle = cos(phaseAngle);                                             // <-- Calculate cosine of phase angle
        float sinAngle = sin(phaseAngle);                                             // <-- Calculate sine of phase angle
        
        // Apply 2D rotation matrix
        // ------------------------------------
        return vec2(
            waveOffset.x * cosAngle - waveOffset.y * sinAngle,                        // <-- Rotated X component
            waveOffset.x * sinAngle + waveOffset.y * cosAngle                         // <-- Rotated Y component
        );
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Multi-Pass Edge Detection - Multiple passes for richer texture
    // ------------------------------------------------------------
    float detectEdgeMultiPass(sampler2D tex, vec2 uv, vec2 screenSize, vec2 waveOffset, float enabled, float secondOffset, float secondIntensity, float phaseOffset, float timeOffset, float currentTime, float frequency, float amplitude, float noiseScale) {
        // First pass - Primary edge detection
        // ------------------------------------
        float thickness1 = calculateVariableThickness(0.5, edgeThicknessMin, edgeThicknessMax);  // <-- Calculate thickness for first pass
        float edge1 = detectEdgeWavy(tex, uv, screenSize, thickness1, waveOffset);    // <-- First pass edge detection
        
        // Second pass - Secondary edge detection with phase-shifted wave (if enabled)
        // ------------------------------------
        float edge2 = 0.0;                                                             // <-- Initialize second pass edge
        
        if (enabled > 0.5) {                                                           // <-- Check if multi-pass is enabled
            // Generate completely different wave with phase rotation and time offset
            // ------------------------------------
            vec2 secondWaveOffset = generateWaveOffset(                                // <-- Generate new wave for second pass
                uv,                                                                    // <-- Current UV
                currentTime + timeOffset,                                              // <-- Time with offset for different animation
                frequency * 0.8,                                                       // <-- Slightly different frequency
                amplitude * secondOffset,                                              // <-- Scaled amplitude
                noiseScale * 1.3                                                       // <-- Different noise scale for variation
            );
            
            // Apply phase rotation to make wave pattern truly out of phase
            // ------------------------------------
            secondWaveOffset = applyPhaseRotation(secondWaveOffset, phaseOffset);     // <-- Rotate wave direction by phase angle
            
            // Detect edges with phase-shifted wave
            // ------------------------------------
            float thickness2 = calculateVariableThickness(0.3, edgeThicknessMin * 0.8, edgeThicknessMax * 0.8);  // <-- Slightly thinner second pass
            edge2 = detectEdgeWavy(tex, uv, screenSize, thickness2, secondWaveOffset) * secondIntensity;  // <-- Second pass with phase-shifted wave
        }
        
        // Combine passes
        // ------------------------------------
        return clamp(edge1 + edge2, 0.0, 1.0);                                         // <-- Combine and clamp to valid range
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Shader - Pencil Line Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Apply Pencil Lines - Main pencil line rendering function
    // ------------------------------------------------------------
    vec3 applyPencilLines(vec3 baseColor, float edgeStrength, float threshold, float intensity) {
        // Smooth threshold with slight falloff for softer edges
        // ------------------------------------
        float edgeFactor = smoothstep(threshold * 0.8, threshold * 1.2, edgeStrength);  // <-- Smooth edge threshold
        
        // Calculate darkening amount
        // ------------------------------------
        float darkenAmount = edgeFactor * intensity;                                   // <-- Calculate how much to darken
        
        // Apply darkening to create pencil lines
        // ------------------------------------
        vec3 darkenedColor = baseColor * (1.0 - darkenAmount);                         // <-- Darken based on edge strength
        
        // Add subtle texture variation to lines
        // ------------------------------------
        float lineTexture = 1.0 - (edgeFactor * 0.1);                                  // <-- Subtle texture variation
        darkenedColor *= lineTexture;                                                  // <-- Apply texture
        
        return darkenedColor;                                                          // <-- Return pencil line color
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Entry Point
// -----------------------------------------------------------------------------

    void main(void) {
        // Validate screen size before processing
        // ------------------------------------
        if (screenSize.x <= 0.0 || screenSize.y <= 0.0) {
            gl_FragColor = texture2D(textureSampler, vUV);                            // <-- Return original if invalid
            return;                                                                    // <-- Early exit
        }
        
        // Sample base color from scene
        // ------------------------------------
        vec4 baseColor = texture2D(textureSampler, clamp(vUV, 0.0, 1.0));             // <-- Sample scene color
        vec3 color = baseColor.rgb;                                                   // <-- Extract RGB
        
        // Generate wave offset for organic pencil wobble
        // ------------------------------------
        vec2 waveOffset = generateWaveOffset(                                          // <-- Generate wave distortion
            vUV,                                                                       // <-- Current UV
            time,                                                                      // <-- Time for animation
            waveFrequency,                                                             // <-- Wave frequency
            waveAmplitude,                                                             // <-- Wave amplitude
            noiseScale                                                                 // <-- Noise scale
        );
        
        // Detect edges with multi-pass wavy sampling
        // ------------------------------------
        float edgeStrength = detectEdgeMultiPass(                                      // <-- Detect edges with multiple passes
            textureSampler,                                                            // <-- Scene texture
            vUV,                                                                       // <-- Current UV
            screenSize,                                                                // <-- Screen dimensions
            waveOffset,                                                                // <-- Wave distortion offset
            multiPassEnabled,                                                          // <-- Multi-pass enable flag
            secondPassOffset,                                                          // <-- Second pass offset
            secondPassIntensity,                                                       // <-- Second pass intensity
            secondPassPhaseOffset,                                                     // <-- Second pass phase angle
            secondPassTimeOffset,                                                      // <-- Second pass time offset
            time,                                                                      // <-- Current time
            waveFrequency,                                                             // <-- Wave frequency
            waveAmplitude,                                                             // <-- Wave amplitude
            noiseScale                                                                 // <-- Noise scale
        );
        
        // Apply pencil lines based on detected edges
        // ------------------------------------
        color = applyPencilLines(                                                      // <-- Apply pencil line effect
            color,                                                                     // <-- Base color
            edgeStrength,                                                              // <-- Edge strength
            edgeThreshold,                                                             // <-- Edge threshold
            edgeIntensity                                                              // <-- Line darkness
        );
        
        // Clamp to valid color range
        // ------------------------------------
        color = clamp(color, 0.0, 1.0);                                                // <-- Prevent out-of-range values
        
        // Output final color
        // ------------------------------------
        gl_FragColor = vec4(color, baseColor.a);                                      // <-- Preserve alpha
    }

// endregion -------------------------------------------------------------------

