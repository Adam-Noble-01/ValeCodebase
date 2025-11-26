precision highp float;

// Shader inputs
// ------------------------------------
varying vec2 vUV;                                                                  // <-- Screen UV coordinates

// Uniforms
// ------------------------------------
uniform sampler2D textureSampler;                                                  // <-- Input scene texture
uniform vec2 screenSize;                                                          // <-- Screen width and height
uniform float quantizationLevels;                                                // <-- Number of color quantization bands (2.0 to 16.0)
uniform float edgeThreshold;                                                       // <-- Edge detection threshold (0.0 to 1.0, higher = more edges)
uniform float edgeIntensity;                                                      // <-- Edge darkening intensity (0.0 to 1.0)
uniform float smoothGradient;                                                      // <-- Smooth gradient preservation (0.0 = hard bands, 1.0 = smooth)


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Color Processing Utilities
// --------------------------------------------------------

// FUNCTION | Calculate Luminance
// --------------------------------------------------------
float luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));                                  // <-- Perceptual luminance calculation
}
// --------------------------------------------------------

// FUNCTION | Quantize Color - Reduces color precision for posterization
// --------------------------------------------------------
vec3 quantizeColor(vec3 color, float levels) {
    float step = 1.0 / max(levels, 2.0);                                           // <-- Calculate quantization step size
    return floor(color / step) * step;                                             // <-- Quantize each channel
}
// --------------------------------------------------------

// FUNCTION | Smooth Quantize - Preserves gradients while quantizing
// --------------------------------------------------------
vec3 smoothQuantizeColor(vec3 color, float levels, float smoothness) {
    float step = 1.0 / max(levels, 2.0);                                           // <-- Calculate quantization step size
    vec3 quantized = floor(color / step) * step;                                   // <-- Hard quantized value
    vec3 originalColor = color;                                                    // <-- Original smooth value
    
    return mix(quantized, originalColor, smoothness);                              // <-- Blend between quantized and smooth
}
// --------------------------------------------------------

// FUNCTION | Edge Detection - Detects edges using Sobel operator
// --------------------------------------------------------
float detectEdge(sampler2D tex, vec2 uv, vec2 screenSize) {
    // Validate screen size to prevent division by zero
    // ------------------------------------
    if (screenSize.x <= 0.0 || screenSize.y <= 0.0) {
        return 0.0;                                                                 // <-- Return no edge if invalid screen size
    }
    
    vec2 texelSize = 1.0 / screenSize;                                             // <-- Calculate texel size
    
    // Sample surrounding pixels for Sobel edge detection with clamped UVs
    // ------------------------------------
    float tl = luminance(texture2D(tex, clamp(uv + vec2(-texelSize.x, -texelSize.y), 0.0, 1.0)).rgb);  // <-- Top-left (clamped)
    float tm = luminance(texture2D(tex, clamp(uv + vec2(0.0, -texelSize.y), 0.0, 1.0)).rgb);         // <-- Top-middle (clamped)
    float tr = luminance(texture2D(tex, clamp(uv + vec2(texelSize.x, -texelSize.y), 0.0, 1.0)).rgb);   // <-- Top-right (clamped)
    float ml = luminance(texture2D(tex, clamp(uv + vec2(-texelSize.x, 0.0), 0.0, 1.0)).rgb);          // <-- Middle-left (clamped)
    float mm = luminance(texture2D(tex, clamp(uv, 0.0, 1.0)).rgb);                                    // <-- Middle (center, clamped)
    float mr = luminance(texture2D(tex, clamp(uv + vec2(texelSize.x, 0.0), 0.0, 1.0)).rgb);           // <-- Middle-right (clamped)
    float bl = luminance(texture2D(tex, clamp(uv + vec2(-texelSize.x, texelSize.y), 0.0, 1.0)).rgb);   // <-- Bottom-left (clamped)
    float bm = luminance(texture2D(tex, clamp(uv + vec2(0.0, texelSize.y), 0.0, 1.0)).rgb);           // <-- Bottom-middle (clamped)
    float br = luminance(texture2D(tex, clamp(uv + vec2(texelSize.x, texelSize.y), 0.0, 1.0)).rgb);   // <-- Bottom-right (clamped)
    
    // Sobel operator kernels
    // ------------------------------------
    float gx = (-1.0 * tl) + (-2.0 * ml) + (-1.0 * bl) +                           // <-- Horizontal gradient X
               (1.0 * tr) + (2.0 * mr) + (1.0 * br);
    float gy = (-1.0 * tl) + (-2.0 * tm) + (-1.0 * tr) +                           // <-- Vertical gradient Y
               (1.0 * bl) + (2.0 * bm) + (1.0 * br);
    
    float edgeMagnitude = sqrt(gx * gx + gy * gy);                                 // <-- Calculate edge magnitude
    
    // Normalize edge magnitude to 0-1 range
    // Maximum Sobel value for 3x3 kernel with luminance range 0-1 is approximately 4*sqrt(2) ≈ 5.66
    // ------------------------------------
    float normalizedMagnitude = clamp(edgeMagnitude / 6.0, 0.0, 1.0);              // <-- Normalize to 0-1 range with safety margin
    return normalizedMagnitude;                                                     // <-- Return normalized edge strength
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// TOON SHADING FUNCTIONS
// --------------------------------------------------------

// FUNCTION | Apply Toon Shading - Main toon effect with quantization and edges
// --------------------------------------------------------
vec3 applyToonShading(vec3 color, float levels, float edgeThresh, float edgeInt, float smoothGrad) {
    // Quantize color based on smoothness parameter
    // ------------------------------------
    vec3 quantizedColor = smoothQuantizeColor(color, levels, smoothGrad);           // <-- Apply quantization with smoothness
    
    return quantizedColor;                                                          // <-- Return quantized color
}
// --------------------------------------------------------

// FUNCTION | Apply Edge Darkening - Darkens detected edges
// --------------------------------------------------------
vec3 applyEdgeDarkening(vec3 color, float edgeStrength, float threshold, float intensity) {
    float edgeFactor = step(threshold, edgeStrength);                              // <-- Binary edge detection (0 or 1)
    float darkenAmount = edgeFactor * intensity;                                   // <-- Calculate darkening amount
    
    return color * (1.0 - darkenAmount);                                            // <-- Darken edges
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// MAIN SHADER
// --------------------------------------------------------

void main(void) {
    // Validate screen size before processing
    // ------------------------------------
    if (screenSize.x <= 0.0 || screenSize.y <= 0.0) {
        vec4 baseColor = texture2D(textureSampler, vUV);                           // <-- Sample scene color as fallback
        gl_FragColor = baseColor;                                                    // <-- Return original color if invalid screen size
        return;                                                                      // <-- Early exit
    }
    
    // Sample input color
    // ------------------------------------
    vec4 baseColor = texture2D(textureSampler, clamp(vUV, 0.0, 1.0));              // <-- Sample scene color with clamped UV
    vec3 color = baseColor.rgb;                                                    // <-- Extract RGB
    
    // Detect edges in the scene (edgeStrength is now normalized 0-1)
    // ------------------------------------
    float edgeStrength = detectEdge(textureSampler, vUV, screenSize);              // <-- Calculate normalized edge strength
    
    // Apply toon shading (quantization)
    // ------------------------------------
    color = applyToonShading(color, quantizationLevels, edgeThreshold, edgeIntensity, smoothGradient);  // <-- Apply toon quantization
    
    // Apply edge darkening (edgeStrength is normalized, threshold comparison works correctly)
    // ------------------------------------
    color = applyEdgeDarkening(color, edgeStrength, edgeThreshold, edgeIntensity);  // <-- Darken detected edges
    
    // Clamp to valid range
    // ------------------------------------
    color = clamp(color, 0.0, 1.0);                                                // <-- Prevent out-of-range values
    
    // Output final color
    // ------------------------------------
    gl_FragColor = vec4(color, baseColor.a);                                       // <-- Preserve alpha
}

// #endregion ---------------------------------------------

