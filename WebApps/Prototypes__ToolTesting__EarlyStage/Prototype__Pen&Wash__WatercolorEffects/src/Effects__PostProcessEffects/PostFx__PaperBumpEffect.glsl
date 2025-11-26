precision highp float;

// Uniforms
uniform sampler2D textureSampler;                                                         // <-- Scene color texture
uniform sampler2D depthSampler;                                                            // <-- Depth texture sampler
uniform sampler2D paperSampler;                                                            // <-- Paper texture sampler (used for bump)
uniform vec2 screenSize;                                                                   // <-- Screen width and height
uniform float bumpStrength;                                                                // <-- Overall bump displacement strength
uniform vec2 cameraOffset;                                                                 // <-- Camera movement offset for parallax
uniform float paperScale;                                                                  // <-- Paper texture scale factor
uniform float saturationMultiplier;                                                        // <-- How much saturation affects bump strength
uniform float bumpStrengthMin;                                                             // <-- Minimum bump strength (white areas)
uniform float bumpStrengthMax;                                                             // <-- Maximum bump strength (colored areas)
uniform float cameraNear;                                                                  // <-- Camera near plane
uniform float cameraFar;                                                                   // <-- Camera far plane
uniform float distanceStrengthMin;                                                         // <-- Bump strength at far distance
uniform float distanceStrengthMax;                                                         // <-- Bump strength at near distance
uniform float distanceFalloffPower;                                                        // <-- Distance falloff curve power

// Varying
varying vec2 vUV;                                                                          // <-- Screen-space UV coordinates

void main(void) {
    // Calculate paper UV coordinates (same logic as overlay effect)
    // ------------------------------------
    vec2 paperUV = vUV * paperScale;                                                       // <-- Scale UV for paper tiling
    
    if (screenSize.x > 0.0 && screenSize.y > 0.0) {
        float aspectRatio = screenSize.x / screenSize.y;                                   // <-- Calculate aspect ratio
        
        if (aspectRatio > 1.0) {
            paperUV.x = paperUV.x * aspectRatio;                                           // <-- Scale X to maintain square tiling
        } else {
            paperUV.y = paperUV.y / aspectRatio;                                           // <-- Scale Y to maintain square tiling
        }
    }
    
    paperUV += cameraOffset;                                                               // <-- Apply parallax offset
    
    // Sample paper texture for bump information
    // ------------------------------------
    vec4 paperColor = texture2D(paperSampler, paperUV);                                    // <-- Sample paper texture
    float paperHeight = dot(paperColor.rgb, vec3(0.333, 0.333, 0.333));                  // <-- Convert to grayscale height
    
    // Calculate bump gradient (normal) by sampling neighboring pixels
    // ------------------------------------
    float pixelSize = 1.0 / 1024.0;                                                        // <-- Approximate pixel size for paper texture
    float heightRight = dot(texture2D(paperSampler, paperUV + vec2(pixelSize, 0.0)).rgb, vec3(0.333, 0.333, 0.333));  // <-- Right sample
    float heightUp = dot(texture2D(paperSampler, paperUV + vec2(0.0, pixelSize)).rgb, vec3(0.333, 0.333, 0.333));     // <-- Up sample
    
    vec2 bumpGradient = vec2(paperHeight - heightRight, paperHeight - heightUp);          // <-- Calculate gradient
    
    // Sample scene color at current UV to determine saturation
    // ------------------------------------
    vec4 sceneColorOriginal = texture2D(textureSampler, vUV);                              // <-- Sample original scene color
    
    // Sample depth buffer and calculate distance from camera
    // ------------------------------------
    float depth = texture2D(depthSampler, vUV).r;                                          // <-- Sample depth value
    float linearDepth = cameraNear * cameraFar / (cameraFar + depth * (cameraNear - cameraFar));  // <-- Convert to linear depth
    float normalizedDistance = clamp(linearDepth / cameraFar, 0.0, 1.0);                  // <-- Normalize to 0-1 range
    
    // Calculate distance-based bump multiplier (closer = stronger)
    // ------------------------------------
    float distanceMultiplier = pow(1.0 - normalizedDistance, distanceFalloffPower);        // <-- Inverse distance with power curve
    float distanceBasedStrength = mix(distanceStrengthMin, distanceStrengthMax, distanceMultiplier);  // <-- Interpolate between min/max
    
    // Calculate saturation for adaptive bump strength
    // ------------------------------------
    float maxChannel = max(max(sceneColorOriginal.r, sceneColorOriginal.g), sceneColorOriginal.b);  // <-- Find brightest channel
    float minChannel = min(min(sceneColorOriginal.r, sceneColorOriginal.g), sceneColorOriginal.b);  // <-- Find darkest channel
    float saturation = maxChannel - minChannel;                                            // <-- Saturation = color range
    
    // Calculate adaptive bump strength based on saturation and distance
    // ------------------------------------
    float saturationBasedStrength = mix(bumpStrengthMin, bumpStrengthMax, saturation * saturationMultiplier);  // <-- More bump on colored areas
    float adaptiveBumpStrength = saturationBasedStrength * distanceBasedStrength;          // <-- Combine saturation and distance effects
    
    // Apply bump displacement to UV coordinates
    // ------------------------------------
    vec2 displacedUV = vUV + (bumpGradient * adaptiveBumpStrength * bumpStrength);        // <-- Displace UV based on bump gradient
    displacedUV = clamp(displacedUV, 0.0, 1.0);                                            // <-- Clamp to valid UV range
    
    // Sample scene color at displaced UV
    // ------------------------------------
    vec4 finalColor = texture2D(textureSampler, displacedUV);                              // <-- Sample scene with displaced UVs
    
    gl_FragColor = finalColor;                                                             // <-- Output final color
}


