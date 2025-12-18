// -----------------------------------------------------------------------------
// REGION | CAD Canvas Component Module
// -----------------------------------------------------------------------------

import React from 'react';

// Maker.js is loaded globally via script tag in index.html
// Access via global window.makerjs or just makerjs

console.log('🖼️ CADCanvas module loading...');
console.log('   - makerjs available:', typeof makerjs);

const { useRef, useEffect, useState } = React;

// FUNCTION | CAD Canvas Component
// ------------------------------------------------------------
export function CADCanvas({ windowModel }) {
    console.log('🖼️ CADCanvas rendering');
    
    const canvasRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    
    // Handle window resize
    useEffect(() => {
        const updateDimensions = () => {
            if (canvasRef.current) {
                const container = canvasRef.current.parentElement;
                setDimensions({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            }
        };
        
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);
    
    // Render CAD model
    useEffect(() => {
        if (!windowModel || !canvasRef.current) {
            console.log('⚠️ Skipping render - no model or canvas');
            return;
        }
        
        try {
            console.log('🚀 Rendering CAD to SVG...');
            
            const bounds = makerjs.measure.modelExtents(windowModel);
            const modelWidth = bounds.high[0] - bounds.low[0];
            const modelHeight = bounds.high[1] - bounds.low[1];
            
            const padding = 50;
            const scaleX = (dimensions.width - padding * 2) / modelWidth;
            const scaleY = (dimensions.height - padding * 2) / modelHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            
            const scaledWidth = modelWidth * scale;
            const scaledHeight = modelHeight * scale;
            const offsetX = (dimensions.width - scaledWidth) / 2 - bounds.low[0] * scale;
            const offsetY = (dimensions.height - scaledHeight) / 2 - bounds.low[1] * scale;
            
            const svgOptions = {
                stroke: '#000000',
                strokeWidth: '1.5',
                fill: 'none',
                fillOpacity: 0,
                units: makerjs.unitType.Millimeter,
                scale: scale,
                origin: [offsetX / scale, offsetY / scale],
                annotate: false,
                fontSize: '10px',
                useSvgPathOnly: false
            };
            
            const svg = makerjs.exporter.toSVG(windowModel, svgOptions);
            canvasRef.current.innerHTML = svg;
            
            const svgElement = canvasRef.current.querySelector('svg');
            if (svgElement) {
                svgElement.setAttribute('width', dimensions.width);
                svgElement.setAttribute('height', dimensions.height);
                svgElement.style.backgroundColor = '#ffffff';
            }
            
            console.log('✅ CAD rendered to canvas');
        } catch (error) {
            console.error('❌ Render error:', error);
            canvasRef.current.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                    <div>
                        <p>Error rendering CAD model</p>
                        <pre style="font-size: 10px; color: #999;">${error.message}</pre>
                    </div>
                </div>
            `;
        }
    }, [windowModel, dimensions]);
    
    return React.createElement('div', { className: 'cad-canvas-container' },
        React.createElement('div', { className: 'cad-canvas-header' },
            React.createElement('h3', null, '2D CAD View'),
            React.createElement('div', { className: 'cad-info' },
                React.createElement('span', null, 'Units: Millimeters (mm)'),
                windowModel && React.createElement('span', { className: 'cad-status' }, '✓ Model Generated')
            )
        ),
        React.createElement('div', {
            ref: canvasRef,
            className: 'cad-canvas',
            style: {
                width: '100%',
                height: 'calc(100% - 60px)',
                backgroundColor: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                overflow: 'hidden'
            }
        },
            !windowModel && React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#999'
                }
            }, React.createElement('p', null, 'Loading CAD model...'))
        )
    );
}

console.log('✅ CADCanvas module loaded');

// endregion -------------------------------------------------------------------
