// -----------------------------------------------------------------------------
// REGION | Main Application Component Module
// -----------------------------------------------------------------------------

import React from 'react';
import { generateWindowCAD } from './CADGenerator.js';
import { CADCanvas } from './CADCanvas.js';
import { ControlPanel } from './ControlPanel.js';

console.log('📱 App module loading...');

const { useState, useEffect } = React;

// FUNCTION | Main App Component
// ------------------------------------------------------------
export function App() {
    console.log('📱 App rendering...');
    
    // Window parameters state
    const [windowParams, setWindowParams] = useState({
        windowWidth: 1200,           // <-- Default 1200mm
        windowHeight: 1500,          // <-- Default 1500mm
        casements: 2,                // <-- Default 2 casements
        glazeBarsHorizontal: 1,      // <-- Default 1 horizontal bar
        glazeBarsVertical: 1,        // <-- Default 1 vertical bar
        casementType: 'fixed'        // <-- Default fixed type
    });
    
    // Generated CAD model state
    const [cadModel, setCadModel] = useState(null);
    
    // Generate CAD model whenever parameters change
    useEffect(() => {
        console.log('🔄 Parameters changed, regenerating CAD...');
        const model = generateWindowCAD(windowParams);
        setCadModel(model);
        console.log('✅ CAD model state updated');
    }, [windowParams]);
    
    // Update parameter handler
    const handleParamUpdate = (paramName, value) => {
        setWindowParams(prev => ({
            ...prev,
            [paramName]: value
        }));
    };
    
    return React.createElement('div', { className: 'app-container' },
        React.createElement('div', { className: 'app-header' },
            React.createElement('h1', null, 'Window Maker CAD Generator'),
            React.createElement('p', null, 'Parametric 2D Window Design Tool')
        ),
        React.createElement('div', { className: 'app-content' },
            React.createElement('div', { className: 'left-panel' },
                React.createElement(ControlPanel, {
                    params: windowParams,
                    onUpdate: handleParamUpdate
                })
            ),
            React.createElement('div', { className: 'right-panel' },
                React.createElement(CADCanvas, {
                    windowModel: cadModel
                })
            )
        )
    );
}

console.log('✅ App module loaded');

// endregion -------------------------------------------------------------------
