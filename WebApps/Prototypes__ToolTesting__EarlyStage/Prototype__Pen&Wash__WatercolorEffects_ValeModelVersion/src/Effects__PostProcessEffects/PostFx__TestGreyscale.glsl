precision highp float;

// Uniforms
uniform sampler2D textureSampler;                                                         // <-- Scene color texture
uniform vec2 screenSize;                                                                   // <-- Screen width and height
uniform float kuwaharaRadius;                                                              // <-- Kernel radius in pixels (not used, fixed at 4)
uniform float kuwaharaIntensity;                                                           // <-- Effect blend intensity (0.0 to 1.0)

// Varying
varying vec2 vUV;                                                                          // <-- Screen-space UV coordinates

void main(void) {
    // Sample original scene color
    // ------------------------------------
    vec4 originalColor = texture2D(textureSampler, vUV);                                   // <-- Original unfiltered color
    
    // SIMPLE GREYSCALE TEST - Comment this out and uncomment Kuwahara code below when testing is done
    // ------------------------------------
    float grey = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));                       // <-- Convert to greyscale using luminance
    vec3 greyColor = vec3(grey, grey, grey);                                               // <-- Create greyscale color
    vec3 finalColor = mix(originalColor.rgb, greyColor, kuwaharaIntensity);               // <-- Blend based on intensity
    gl_FragColor = vec4(finalColor, originalColor.a);                                      // <-- Output greyscale result
    
    /* KUWAHARA ALGORITHM - COMMENTED OUT FOR TESTING
    // Calculate pixel size in UV space
    // ------------------------------------
    vec2 pixelSize = vec2(1.0) / screenSize;                                               // <-- Pixel size in UV coordinates
    
    // Initialize accumulator variables for 4 quadrants
    // ------------------------------------
    vec3 sum1 = vec3(0.0), sum2 = vec3(0.0), sum3 = vec3(0.0), sum4 = vec3(0.0);          // <-- Color sums
    vec3 sumSq1 = vec3(0.0), sumSq2 = vec3(0.0), sumSq3 = vec3(0.0), sumSq4 = vec3(0.0);  // <-- Squared color sums
    
    // Fixed radius of 4 pixels, each quadrant samples 4x4 = 16 pixels
    // ------------------------------------
    vec3 c;                                                                                // <-- Temporary color variable
    
    // TOP-LEFT QUADRANT: Sample pixels from (-4,-4) to (-1,-1)
    // ------------------------------------
    c = texture2D(textureSampler, vUV + vec2(-4.0, -4.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, -4.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, -4.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, -4.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(-4.0, -3.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, -3.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, -3.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, -3.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(-4.0, -2.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, -2.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, -2.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, -2.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(-4.0, -1.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, -1.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, -1.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, -1.0) * pixelSize).rgb; sum1 += c; sumSq1 += c * c;
    
    // TOP-RIGHT QUADRANT: Sample pixels from (0,-4) to (3,-1)
    // ------------------------------------
    c = texture2D(textureSampler, vUV + vec2(0.0, -4.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, -4.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, -4.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, -4.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(0.0, -3.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, -3.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, -3.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, -3.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(0.0, -2.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, -2.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, -2.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, -2.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(0.0, -1.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, -1.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, -1.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, -1.0) * pixelSize).rgb; sum2 += c; sumSq2 += c * c;
    
    // BOTTOM-LEFT QUADRANT: Sample pixels from (-4,0) to (-1,3)
    // ------------------------------------
    c = texture2D(textureSampler, vUV + vec2(-4.0, 0.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, 0.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, 0.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, 0.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(-4.0, 1.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, 1.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, 1.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, 1.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(-4.0, 2.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, 2.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, 2.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, 2.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(-4.0, 3.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-3.0, 3.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-2.0, 3.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    c = texture2D(textureSampler, vUV + vec2(-1.0, 3.0) * pixelSize).rgb; sum3 += c; sumSq3 += c * c;
    
    // BOTTOM-RIGHT QUADRANT: Sample pixels from (0,0) to (3,3)
    // ------------------------------------
    c = texture2D(textureSampler, vUV + vec2(0.0, 0.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, 0.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, 0.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, 0.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(0.0, 1.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, 1.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, 1.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, 1.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(0.0, 2.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, 2.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, 2.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, 2.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    
    c = texture2D(textureSampler, vUV + vec2(0.0, 3.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(1.0, 3.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(2.0, 3.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    c = texture2D(textureSampler, vUV + vec2(3.0, 3.0) * pixelSize).rgb; sum4 += c; sumSq4 += c * c;
    
    // Calculate mean and variance for each quadrant
    // ------------------------------------
    const float sampleCount = 16.0;                                                        // <-- 4x4 samples per quadrant
    
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
    */
}
