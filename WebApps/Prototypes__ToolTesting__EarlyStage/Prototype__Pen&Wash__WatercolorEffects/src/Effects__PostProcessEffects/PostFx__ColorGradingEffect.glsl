// =============================================================================
// COLOR GRADING POST-PROCESS SHADER
// =============================================================================
//
// FILE       : PostFx__ColorGradingEffect.glsl
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Color grading shader with brightness, contrast, saturation, vibrance, and color temperature
// CREATED    : 2025
//
// DESCRIPTION:
// - Comprehensive color grading controls for final image adjustment
// - Brightness: Linear intensity adjustment (-1.0 to 1.0)
// - Contrast: S-curve contrast enhancement (0.0 to 2.0)
// - Saturation: Global color intensity (0.0 to 2.0)
// - Vibrance: Smart saturation that protects skin tones (0.0 to 2.0)
// - Color Temperature: Warm/cool color shift (2000K to 10000K)
// - Applied as top layer for final image polish
//
// =============================================================================

precision highp float;

// Shader inputs
// ------------------------------------
varying vec2 vUV;                                                            // <-- Screen UV coordinates

// Uniforms
// ------------------------------------
uniform sampler2D textureSampler;                                            // <-- Input scene texture

uniform float brightness;                                                    // <-- Brightness adjustment (-1.0 to 1.0)
uniform float contrast;                                                      // <-- Contrast adjustment (0.0 to 2.0, 1.0 = neutral)
uniform float saturation;                                                    // <-- Saturation adjustment (0.0 to 2.0, 1.0 = neutral)
uniform float vibrance;                                                      // <-- Vibrance adjustment (0.0 to 2.0, 1.0 = neutral)
uniform float colorTemperature;                                              // <-- Color temperature in Kelvin (2000 to 10000)


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Color Space Conversions
// --------------------------------------------------------

// FUNCTION | RGB to HSL Conversion
// --------------------------------------------------------
vec3 rgb2hsl(vec3 rgb) {
    float maxVal = max(max(rgb.r, rgb.g), rgb.b);                            // <-- Find maximum channel
    float minVal = min(min(rgb.r, rgb.g), rgb.b);                            // <-- Find minimum channel
    float delta = maxVal - minVal;                                           // <-- Calculate delta
    
    float h = 0.0;                                                           // <-- Hue
    float s = 0.0;                                                           // <-- Saturation
    float l = (maxVal + minVal) / 2.0;                                       // <-- Lightness
    
    if (delta > 0.0001) {                                                    // <-- Check if not grayscale
        s = l < 0.5 ? delta / (maxVal + minVal) : delta / (2.0 - maxVal - minVal);
        
        if (rgb.r == maxVal) {
            h = (rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6.0 : 0.0);      // <-- Red is max
        } else if (rgb.g == maxVal) {
            h = (rgb.b - rgb.r) / delta + 2.0;                               // <-- Green is max
        } else {
            h = (rgb.r - rgb.g) / delta + 4.0;                               // <-- Blue is max
        }
        h /= 6.0;                                                            // <-- Normalize to 0-1
    }
    
    return vec3(h, s, l);                                                    // <-- Return HSL
}
// --------------------------------------------------------

// FUNCTION | HSL to RGB Conversion
// --------------------------------------------------------
vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;                                                         // <-- Hue
    float s = hsl.y;                                                         // <-- Saturation
    float l = hsl.z;                                                         // <-- Lightness
    
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;                                // <-- Chroma
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));                      // <-- Intermediate value
    float m = l - c / 2.0;                                                   // <-- Match lightness
    
    vec3 rgb = vec3(0.0);                                                    // <-- Initialize RGB
    
    if (h < 1.0/6.0) {
        rgb = vec3(c, x, 0.0);                                               // <-- Red to yellow
    } else if (h < 2.0/6.0) {
        rgb = vec3(x, c, 0.0);                                               // <-- Yellow to green
    } else if (h < 3.0/6.0) {
        rgb = vec3(0.0, c, x);                                               // <-- Green to cyan
    } else if (h < 4.0/6.0) {
        rgb = vec3(0.0, x, c);                                               // <-- Cyan to blue
    } else if (h < 5.0/6.0) {
        rgb = vec3(x, 0.0, c);                                               // <-- Blue to magenta
    } else {
        rgb = vec3(c, 0.0, x);                                               // <-- Magenta to red
    }
    
    return rgb + m;                                                          // <-- Add match value
}
// --------------------------------------------------------

// FUNCTION | Calculate Luminance
// --------------------------------------------------------
float luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));                            // <-- Perceptual luminance
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// COLOR GRADING FUNCTIONS
// --------------------------------------------------------

// FUNCTION | Apply Brightness
// --------------------------------------------------------
vec3 applyBrightness(vec3 color, float amount) {
    return color + amount;                                                   // <-- Simple linear adjustment
}
// --------------------------------------------------------

// FUNCTION | Apply Contrast
// --------------------------------------------------------
vec3 applyContrast(vec3 color, float amount) {
    return ((color - 0.5) * amount) + 0.5;                                   // <-- S-curve around mid-gray
}
// --------------------------------------------------------

// FUNCTION | Apply Saturation
// --------------------------------------------------------
vec3 applySaturation(vec3 color, float amount) {
    float lum = luminance(color);                                            // <-- Calculate luminance
    return mix(vec3(lum), color, amount);                                    // <-- Mix grayscale with color
}
// --------------------------------------------------------

// FUNCTION | Apply Vibrance (Smart Saturation)
// --------------------------------------------------------
vec3 applyVibrance(vec3 color, float amount) {
    float lum = luminance(color);                                            // <-- Calculate luminance
    vec3 hsl = rgb2hsl(color);                                               // <-- Convert to HSL
    
    // Calculate saturation boost based on current saturation
    // Less saturated colors get more boost (protects skin tones)
    // ------------------------------------
    float satBoost = (1.0 - hsl.y) * (amount - 1.0);                         // <-- Inverse saturation boost
    hsl.y = clamp(hsl.y + satBoost, 0.0, 1.0);                               // <-- Apply boost
    
    return hsl2rgb(hsl);                                                     // <-- Convert back to RGB
}
// --------------------------------------------------------

// FUNCTION | Apply Color Temperature
// --------------------------------------------------------
vec3 applyColorTemperature(vec3 color, float temperature) {
    // Normalize temperature to 0-1 range (neutral at 0.5)
    // ------------------------------------
    float temp = (temperature - 6500.0) / 4500.0;                            // <-- Normalize around 6500K
    
    // Warm shift (lower temperature = warmer = more orange)
    // ------------------------------------
    vec3 warm = vec3(1.0, 0.9, 0.8);                                         // <-- Warm tint
    
    // Cool shift (higher temperature = cooler = more blue)
    // ------------------------------------
    vec3 cool = vec3(0.8, 0.9, 1.0);                                         // <-- Cool tint
    
    // Blend between warm and cool
    // ------------------------------------
    vec3 tint = temp > 0.0 ? mix(vec3(1.0), cool, temp) : mix(vec3(1.0), warm, -temp);
    
    return color * tint;                                                     // <-- Apply tint
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// MAIN SHADER
// --------------------------------------------------------

void main(void) {
    // Sample input color
    // ------------------------------------
    vec4 baseColor = texture2D(textureSampler, vUV);                         // <-- Sample scene color
    vec3 color = baseColor.rgb;                                              // <-- Extract RGB
    
    // Apply color grading operations in order
    // ------------------------------------
    color = applyBrightness(color, brightness);                              // <-- Apply brightness first
    color = applyContrast(color, contrast);                                  // <-- Apply contrast
    color = applySaturation(color, saturation);                              // <-- Apply saturation
    color = applyVibrance(color, vibrance);                                  // <-- Apply vibrance
    color = applyColorTemperature(color, colorTemperature);                  // <-- Apply color temperature
    
    // Clamp to valid range
    // ------------------------------------
    color = clamp(color, 0.0, 1.0);                                          // <-- Prevent out-of-range values
    
    // Output final color
    // ------------------------------------
    gl_FragColor = vec4(color, baseColor.a);                                 // <-- Preserve alpha
}

// #endregion ---------------------------------------------

