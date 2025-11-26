precision highp float;

// Uniforms
uniform sampler2D textureSampler;                                                         // <-- Scene color texture
uniform sampler2D paperSampler;                                                            // <-- Paper texture sampler
uniform vec2 screenSize;                                                                   // <-- Screen width and height
uniform float paperIntensity;                                                              // <-- Paper overlay intensity
uniform vec2 cameraOffset;                                                                 // <-- Camera movement offset for parallax
uniform float paperScale;                                                                  // <-- Paper texture scale factor
uniform float paperIntensityMin;                                                            // <-- Minimum paper intensity (bright areas)
uniform float paperIntensityMax;                                                            // <-- Maximum paper intensity (dark areas)
uniform float luminanceThreshold;                                                           // <-- Brightness threshold for masking
uniform float luminanceContrast;                                                            // <-- Mask contrast factor

// Varying
varying vec2 vUV;                                                                          // <-- Screen-space UV coordinates

void main(void) {
    // Sample scene color
    // ------------------------------------
    vec4 sceneColor = texture2D(textureSampler, vUV);                                      // <-- Sample scene color
    
    // Calculate luminance (brightness) of scene color
    // ------------------------------------
    float luminance = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));                      // <-- Standard RGB to luminance conversion
    
    // Create mask based on luminance (darker = more paper, brighter = less paper)
    // ------------------------------------
    float normalizedLuminance = clamp((luminance - luminanceThreshold) * luminanceContrast, 0.0, 1.0);  // <-- Normalize and apply contrast
    float adaptiveIntensity = mix(paperIntensityMax, paperIntensityMin, normalizedLuminance);  // <-- Interpolate intensity based on brightness
    
    // Calculate aspect ratio corrected UV coordinates
    // ------------------------------------
    vec2 paperUV = vUV * paperScale;                                                       // <-- Scale UV for paper tiling
    
    if (screenSize.x > 0.0 && screenSize.y > 0.0) {
        float aspectRatio = screenSize.x / screenSize.y;                                   // <-- Calculate aspect ratio
        
        // Scale UV to maintain square texture tiling
        // ------------------------------------
        if (aspectRatio > 1.0) {
            paperUV.x = paperUV.x * aspectRatio;                                           // <-- Scale X to maintain square tiling
        } else {
            paperUV.y = paperUV.y / aspectRatio;                                           // <-- Scale Y to maintain square tiling
        }
    }
    
    // Apply parallax offset for depth effect
    // ------------------------------------
    paperUV += cameraOffset;                                                               // <-- Offset UV based on camera movement
    
    // Sample paper texture
    // ------------------------------------
    vec4 paperColor = texture2D(paperSampler, paperUV);                                    // <-- Sample paper texture
    
    // Apply multiply blend mode
    // ------------------------------------
    vec4 finalColor = sceneColor * paperColor;                                              // <-- Multiply scene with paper texture
    
    // Blend with original scene based on adaptive intensity (more on dark areas, less on bright)
    // ------------------------------------
    finalColor = mix(sceneColor, finalColor, adaptiveIntensity);                          // <-- Blend based on adaptive intensity
    
    gl_FragColor = finalColor;                                                             // <-- Output final color
}

