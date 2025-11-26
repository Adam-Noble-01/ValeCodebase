precision highp float;

// Uniforms
uniform sampler2D textureSampler;                                                         // <-- Scene color texture
uniform vec2 screenSize;                                                                   // <-- Screen width and height
uniform float kuwaharaRadius;                                                              // <-- Kernel radius in pixels (1-8)
uniform float kuwaharaIntensity;                                                           // <-- Effect blend intensity (0.0 to 1.0)

// Varying
varying vec2 vUV;                                                                          // <-- Screen-space UV coordinates

void main(void) {
    // Sample original color from texture
    // ------------------------------------
    vec4 originalColor = texture2D(textureSampler, vUV);                                    // <-- Original scene color
    
    // Calculate pixel size in UV space
    // ------------------------------------
    vec2 pixelSize = vec2(1.0) / screenSize;                                               // <-- Pixel size in UV coordinates
    
    // Get integer radius for loop bounds (max 8 pixels)
    // ------------------------------------
    int radius = int(clamp(kuwaharaRadius, 1.0, 8.0));                                     // <-- Integer radius clamped to valid range
    
    // Initialize accumulator variables for 4 quadrants
    // ------------------------------------
    vec3 sum1 = vec3(0.0), sum2 = vec3(0.0), sum3 = vec3(0.0), sum4 = vec3(0.0);          // <-- Color sums
    vec3 sumSq1 = vec3(0.0), sumSq2 = vec3(0.0), sumSq3 = vec3(0.0), sumSq4 = vec3(0.0);  // <-- Squared color sums
    float sampleCount = 0.0;                                                               // <-- Count samples per quadrant
    
    // Sample all 4 quadrants using dynamic radius
    // ------------------------------------
    vec3 c;                                                                                // <-- Temporary color variable
    
    // Loop through kernel area and accumulate samples for each quadrant
    // Note: GLSL requires constant loop bounds, so we use max radius of 8
    // ------------------------------------
    for (int y = -8; y < 0; y++) {                                                         // <-- Loop through top half
        if (y < -radius) continue;                                                         // <-- Skip if outside radius
        
        for (int x = -8; x < 8; x++) {                                                     // <-- Loop through full width
            if (x < -radius || x >= radius) continue;                                      // <-- Skip if outside radius
            
            vec2 offset = vec2(float(x), float(y)) * pixelSize;                            // <-- Calculate pixel offset
            c = texture2D(textureSampler, vUV + offset).rgb;                               // <-- Sample color
            
            if (x < 0) {                                                                   // <-- Left half
                sum1 += c;                                                                 // <-- Top-left quadrant
                sumSq1 += c * c;
            } else {                                                                       // <-- Right half
                sum2 += c;                                                                 // <-- Top-right quadrant
                sumSq2 += c * c;
            }
        }
    }
    
    for (int y = 0; y < 8; y++) {                                                          // <-- Loop through bottom half
        if (y >= radius) continue;                                                         // <-- Skip if outside radius
        
        for (int x = -8; x < 8; x++) {                                                     // <-- Loop through full width
            if (x < -radius || x >= radius) continue;                                      // <-- Skip if outside radius
            
            vec2 offset = vec2(float(x), float(y)) * pixelSize;                            // <-- Calculate pixel offset
            c = texture2D(textureSampler, vUV + offset).rgb;                               // <-- Sample color
            
            if (x < 0) {                                                                   // <-- Left half
                sum3 += c;                                                                 // <-- Bottom-left quadrant
                sumSq3 += c * c;
            } else {                                                                       // <-- Right half
                sum4 += c;                                                                 // <-- Bottom-right quadrant
                sumSq4 += c * c;
            }
        }
    }
    
    // Calculate sample count: radius * radius samples per quadrant
    // ------------------------------------
    sampleCount = float(radius * radius);                                                  // <-- Samples per quadrant
    // Calculate mean for each quadrant
    // ------------------------------------
    vec3 mean1 = sum1 / sampleCount;                                                       // <-- Mean color of quadrant 1
    vec3 mean2 = sum2 / sampleCount;                                                       // <-- Mean color of quadrant 2
    vec3 mean3 = sum3 / sampleCount;                                                       // <-- Mean color of quadrant 3
    vec3 mean4 = sum4 / sampleCount;                                                       // <-- Mean color of quadrant 4
    
    // Variance = E[X²] - (E[X])²
    // ------------------------------------
    vec3 variance1_rgb = (sumSq1 / sampleCount) - (mean1 * mean1);                        // <-- Variance per channel (quadrant 1)
    vec3 variance2_rgb = (sumSq2 / sampleCount) - (mean2 * mean2);                        // <-- Variance per channel (quadrant 2)
    vec3 variance3_rgb = (sumSq3 / sampleCount) - (mean3 * mean3);                        // <-- Variance per channel (quadrant 3)
    vec3 variance4_rgb = (sumSq4 / sampleCount) - (mean4 * mean4);                        // <-- Variance per channel (quadrant 4)
    
    // Sum variance across RGB channels to get total variance
    // ------------------------------------
    float var1 = variance1_rgb.r + variance1_rgb.g + variance1_rgb.b;                     // <-- Total variance (quadrant 1)
    float var2 = variance2_rgb.r + variance2_rgb.g + variance2_rgb.b;                     // <-- Total variance (quadrant 2)
    float var3 = variance3_rgb.r + variance3_rgb.g + variance3_rgb.b;                     // <-- Total variance (quadrant 3)
    float var4 = variance4_rgb.r + variance4_rgb.g + variance4_rgb.b;                     // <-- Total variance (quadrant 4)
    
    // Find quadrant with minimum variance (most uniform color)
    // ------------------------------------
    vec3 finalMean = mean1;                                                                // <-- Initialize with first quadrant
    float minVariance = var1;                                                              // <-- Initialize with first variance
    
    if (var2 < minVariance) {                                                              // <-- Check second quadrant
        finalMean = mean2;                                                                 // <-- Update to second quadrant mean
        minVariance = var2;                                                                // <-- Update minimum variance
    }
    
    if (var3 < minVariance) {                                                              // <-- Check third quadrant
        finalMean = mean3;                                                                 // <-- Update to third quadrant mean
        minVariance = var3;                                                                // <-- Update minimum variance
    }
    
    if (var4 < minVariance) {                                                              // <-- Check fourth quadrant
        finalMean = mean4;                                                                 // <-- Update to fourth quadrant mean
        minVariance = var4;                                                                // <-- Update minimum variance
    }
    
    // Blend filtered result with original based on intensity
    // ------------------------------------
    vec3 filteredColor = finalMean;                                                        // <-- Kuwahara filtered color
    vec3 blendedColor = mix(originalColor.rgb, filteredColor, kuwaharaIntensity);         // <-- Blend based on intensity parameter
    
    gl_FragColor = vec4(blendedColor, originalColor.a);                                    // <-- Output final color with original alpha
}
