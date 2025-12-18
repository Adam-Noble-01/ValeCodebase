// -----------------------------------------------------------------------------
// REGION | CAD Generator Module
// -----------------------------------------------------------------------------

// Maker.js is loaded globally via script tag in index.html
// Access via global window.makerjs or just makerjs

console.log('🔧 CADGenerator module loading...');
console.log('   - makerjs available:', typeof makerjs);

// Constants
const FRAME_THICKNESS = 50;      // <-- Outer frame thickness in mm
const MULLION_WIDTH = 50;        // <-- Vertical divider width in mm
const GLAZE_BAR_THICKNESS = 20;  // <-- Glaze bar thickness in mm
const HINGE_RADIUS = 10;         // <-- Hinge indicator radius in mm

// FUNCTION | Create Outer Frame
// ------------------------------------------------------------
function createOuterFrame(width, height) {
    return {
        models: {
            outerRect: new makerjs.models.Rectangle(width, height),
            innerRect: new makerjs.models.Rectangle(
                width - (FRAME_THICKNESS * 2),
                height - (FRAME_THICKNESS * 2)
            )
        }
    };
}

// FUNCTION | Create Casement Divisions
// ------------------------------------------------------------
function createCasements(width, height, numCasements) {
    const casements = {};
    const innerWidth = width - (FRAME_THICKNESS * 2);
    const innerHeight = height - (FRAME_THICKNESS * 2);
    const totalMullionWidth = (numCasements - 1) * MULLION_WIDTH;
    const casementWidth = (innerWidth - totalMullionWidth) / numCasements;
    
    for (let i = 0; i < numCasements; i++) {
        const xOffset = FRAME_THICKNESS + (i * (casementWidth + MULLION_WIDTH));
        casements[`casement_${i}`] = {
            models: {
                frame: new makerjs.models.Rectangle(casementWidth, innerHeight)
            },
            origin: [xOffset, FRAME_THICKNESS]
        };
    }
    
    for (let i = 0; i < numCasements - 1; i++) {
        const xOffset = FRAME_THICKNESS + ((i + 1) * casementWidth) + (i * MULLION_WIDTH);
        casements[`mullion_${i}`] = {
            models: {
                rect: new makerjs.models.Rectangle(MULLION_WIDTH, innerHeight)
            },
            origin: [xOffset, FRAME_THICKNESS]
        };
    }
    
    return casements;
}

// FUNCTION | Add Glaze Bars
// ------------------------------------------------------------
function addGlazeBars(casementWidth, casementHeight, hBars, vBars) {
    const bars = {};
    
    if (hBars > 0) {
        const hSpacing = casementHeight / (hBars + 1);
        for (let i = 0; i < hBars; i++) {
            const yPos = hSpacing * (i + 1);
            bars[`hBar_${i}`] = {
                models: {
                    top: new makerjs.paths.Line(
                        [0, yPos + GLAZE_BAR_THICKNESS / 2],
                        [casementWidth, yPos + GLAZE_BAR_THICKNESS / 2]
                    ),
                    bottom: new makerjs.paths.Line(
                        [0, yPos - GLAZE_BAR_THICKNESS / 2],
                        [casementWidth, yPos - GLAZE_BAR_THICKNESS / 2]
                    )
                }
            };
        }
    }
    
    if (vBars > 0) {
        const vSpacing = casementWidth / (vBars + 1);
        for (let i = 0; i < vBars; i++) {
            const xPos = vSpacing * (i + 1);
            bars[`vBar_${i}`] = {
                models: {
                    left: new makerjs.paths.Line(
                        [xPos - GLAZE_BAR_THICKNESS / 2, 0],
                        [xPos - GLAZE_BAR_THICKNESS / 2, casementHeight]
                    ),
                    right: new makerjs.paths.Line(
                        [xPos + GLAZE_BAR_THICKNESS / 2, 0],
                        [xPos + GLAZE_BAR_THICKNESS / 2, casementHeight]
                    )
                }
            };
        }
    }
    
    return bars;
}

// FUNCTION | Add Casement Details
// ------------------------------------------------------------
function addCasementDetails(casementWidth, casementHeight, type) {
    const details = {};
    
    if (type === 'opening') {
        const hingeSpacing = casementHeight / 4;
        
        details.hinge_top = {
            models: {
                circle: new makerjs.models.Ellipse(HINGE_RADIUS, HINGE_RADIUS)
            },
            origin: [HINGE_RADIUS, casementHeight - hingeSpacing]
        };
        
        details.hinge_middle = {
            models: {
                circle: new makerjs.models.Ellipse(HINGE_RADIUS, HINGE_RADIUS)
            },
            origin: [HINGE_RADIUS, casementHeight / 2]
        };
        
        details.hinge_bottom = {
            models: {
                circle: new makerjs.models.Ellipse(HINGE_RADIUS, HINGE_RADIUS)
            },
            origin: [HINGE_RADIUS, hingeSpacing]
        };
        
        const arrowX = casementWidth * 0.75;
        const arrowY = casementHeight / 2;
        const arrowSize = 30;
        
        details.arrow = {
            paths: {
                shaft: new makerjs.paths.Line(
                    [arrowX - arrowSize, arrowY],
                    [arrowX + arrowSize, arrowY]
                ),
                head1: new makerjs.paths.Line(
                    [arrowX + arrowSize, arrowY],
                    [arrowX + arrowSize - 15, arrowY + 15]
                ),
                head2: new makerjs.paths.Line(
                    [arrowX + arrowSize, arrowY],
                    [arrowX + arrowSize - 15, arrowY - 15]
                )
            }
        };
    }
    
    return details;
}

// FUNCTION | Convert Coordinates
// ------------------------------------------------------------
function convertCoordinates(model) {
    const bounds = makerjs.measure.modelExtents(model);
    const height = bounds.high[1] - bounds.low[1];
    const flippedModel = makerjs.model.clone(model);
    makerjs.model.mirror(flippedModel, false, true);
    makerjs.model.moveRelative(flippedModel, [0, height]);
    return flippedModel;
}

// FUNCTION | Main Window CAD Generator
// ------------------------------------------------------------
export function generateWindowCAD(params) {
    console.log('🎨 Generating CAD with params:', params);
    
    const { windowWidth, windowHeight, casements, glazeBarsHorizontal, glazeBarsVertical, casementType } = params;
    
    const windowModel = { models: {} };
    windowModel.models.frame = createOuterFrame(windowWidth, windowHeight);
    
    const casementModels = createCasements(windowWidth, windowHeight, casements);
    const innerWidth = windowWidth - (FRAME_THICKNESS * 2);
    const innerHeight = windowHeight - (FRAME_THICKNESS * 2);
    const totalMullionWidth = (casements - 1) * MULLION_WIDTH;
    const casementWidth = (innerWidth - totalMullionWidth) / casements;
    
    for (let i = 0; i < casements; i++) {
        const casementKey = `casement_${i}`;
        if (casementModels[casementKey]) {
            const glazeBars = addGlazeBars(casementWidth, innerHeight, glazeBarsHorizontal, glazeBarsVertical);
            casementModels[casementKey].models = { ...casementModels[casementKey].models, ...glazeBars };
            
            const details = addCasementDetails(casementWidth, innerHeight, casementType);
            if (Object.keys(details).length > 0) {
                casementModels[casementKey].models.details = details;
            }
        }
    }
    
    windowModel.models = { ...windowModel.models, ...casementModels };
    const finalModel = convertCoordinates(windowModel);
    
    console.log('✅ CAD generated successfully');
    return finalModel;
}

console.log('✅ CADGenerator module loaded');

// endregion -------------------------------------------------------------------
