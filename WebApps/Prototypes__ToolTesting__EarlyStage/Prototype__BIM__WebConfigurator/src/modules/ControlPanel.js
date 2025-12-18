// -----------------------------------------------------------------------------
// REGION | Control Panel Component Module
// -----------------------------------------------------------------------------

import React from 'react';

console.log('🎛️ ControlPanel module loading...');

const { useState } = React;

// FUNCTION | Parameter Slider with Double-Click Input
// ------------------------------------------------------------
function ParameterSlider({ label, value, min, max, unit, onChange }) {
    const [showInput, setShowInput] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    
    const handleDoubleClick = () => {
        setShowInput(true);
        setInputValue(value);
    };
    
    const handleInputSubmit = () => {
        const numValue = parseInt(inputValue);
        if (!isNaN(numValue) && numValue >= min && numValue <= max) {
            onChange(numValue);
        }
        setShowInput(false);
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleInputSubmit();
        else if (e.key === 'Escape') setShowInput(false);
    };
    
    return React.createElement('div', { className: 'parameter-control' },
        React.createElement('div', { className: 'parameter-header' },
            React.createElement('label', null, label),
            React.createElement('span', {
                className: 'parameter-value',
                onDoubleClick: handleDoubleClick
            }, `${value}${unit}`)
        ),
        React.createElement('input', {
            type: 'range',
            min,
            max,
            value,
            onChange: (e) => onChange(parseInt(e.target.value)),
            className: 'parameter-slider'
        }),
        React.createElement('div', { className: 'parameter-range' },
            React.createElement('span', null, `${min}${unit}`),
            React.createElement('span', null, `${max}${unit}`)
        ),
        showInput && React.createElement('div', {
            className: 'input-modal-overlay',
            onClick: () => setShowInput(false)
        },
            React.createElement('div', {
                className: 'input-modal',
                onClick: (e) => e.stopPropagation()
            },
                React.createElement('h3', null, `Enter ${label}`),
                React.createElement('input', {
                    type: 'number',
                    value: inputValue,
                    min,
                    max,
                    onChange: (e) => setInputValue(e.target.value),
                    onKeyDown: handleKeyPress,
                    autoFocus: true,
                    className: 'input-modal-field'
                }),
                React.createElement('div', { className: 'input-modal-buttons' },
                    React.createElement('button', {
                        onClick: handleInputSubmit,
                        className: 'btn-primary'
                    }, 'Apply'),
                    React.createElement('button', {
                        onClick: () => setShowInput(false),
                        className: 'btn-secondary'
                    }, 'Cancel')
                ),
                React.createElement('p', { className: 'input-modal-hint' },
                    `Range: ${min} - ${max}${unit}`
                )
            )
        )
    );
}

// FUNCTION | Casement Type Toggle
// ------------------------------------------------------------
function CasementTypeToggle({ value, onChange }) {
    return React.createElement('div', { className: 'parameter-control' },
        React.createElement('div', { className: 'parameter-header' },
            React.createElement('label', null, 'Casement Type')
        ),
        React.createElement('div', { className: 'toggle-container' },
            React.createElement('button', {
                className: `toggle-button ${value === 'fixed' ? 'active' : ''}`,
                onClick: () => onChange('fixed')
            }, 'Fixed'),
            React.createElement('button', {
                className: `toggle-button ${value === 'opening' ? 'active' : ''}`,
                onClick: () => onChange('opening')
            }, 'Opening')
        )
    );
}

// FUNCTION | Main Control Panel Component
// ------------------------------------------------------------
export function ControlPanel({ params, onUpdate }) {
    console.log('🎛️ ControlPanel rendering');
    
    return React.createElement('div', { className: 'control-panel' },
        React.createElement('div', { className: 'control-panel-header' },
            React.createElement('h2', null, 'Window Parameters'),
            React.createElement('p', null, 'Adjust values with sliders or double-click for precise input')
        ),
        React.createElement('div', { className: 'control-panel-content' },
            React.createElement(ParameterSlider, {
                label: 'Window Width',
                value: params.windowWidth,
                min: 600,
                max: 3000,
                unit: 'mm',
                onChange: (val) => onUpdate('windowWidth', val)
            }),
            React.createElement(ParameterSlider, {
                label: 'Window Height',
                value: params.windowHeight,
                min: 600,
                max: 2500,
                unit: 'mm',
                onChange: (val) => onUpdate('windowHeight', val)
            }),
            React.createElement(ParameterSlider, {
                label: 'Number of Casements',
                value: params.casements,
                min: 1,
                max: 6,
                unit: '',
                onChange: (val) => onUpdate('casements', val)
            }),
            React.createElement(ParameterSlider, {
                label: 'Horizontal Glaze Bars',
                value: params.glazeBarsHorizontal,
                min: 0,
                max: 5,
                unit: '',
                onChange: (val) => onUpdate('glazeBarsHorizontal', val)
            }),
            React.createElement(ParameterSlider, {
                label: 'Vertical Glaze Bars',
                value: params.glazeBarsVertical,
                min: 0,
                max: 5,
                unit: '',
                onChange: (val) => onUpdate('glazeBarsVertical', val)
            }),
            React.createElement(CasementTypeToggle, {
                value: params.casementType,
                onChange: (val) => onUpdate('casementType', val)
            })
        ),
        React.createElement('div', { className: 'control-panel-footer' },
            React.createElement('p', { className: 'hint-text' },
                '💡 Double-click any value for keyboard input'
            )
        )
    );
}

console.log('✅ ControlPanel module loaded');

// endregion -------------------------------------------------------------------
