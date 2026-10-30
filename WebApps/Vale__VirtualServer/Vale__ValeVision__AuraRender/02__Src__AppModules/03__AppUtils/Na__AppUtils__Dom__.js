// =============================================================================
// VALEVISION AURA - APP UTILS - DOM
// =============================================================================
//
// FILE       : Na__AppUtils__Dom__.js
// NAMESPACE  : Na__Dom
// MODULE     : App Utils - DOM
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Small builders for the page: elements, line icons, icon buttons,
//              SVG elements in paper millimetres
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Icons are 24 x 24 line drawings stroked in currentColor, so every button
//   takes its colour from the stylesheet (ValeVision Theia's builders).
// - Na__Dom__Svg makes an SVG element with its attributes in one call: the
//   drawing sheets are SVG in millimetres.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build, from ValeVision Theia's DOM builders.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Icon Paths (24 x 24, stroked in currentColor)
    // ------------------------------------------------------------
    const Na__Dom__ICONS = {
        cube        : '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
        sheet       : '<rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="M15.5 5.5v13M15.5 14.5h5"/>',
        plus        : '<path d="M12 5v14M5 12h14"/>',
        close       : '<path d="M6 6l12 12M18 6L6 18"/>',
        check       : '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        trash       : '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
        pointer     : '<path d="M6 3.5l12 8.2-5.3 1.2 3.2 6.1-2.3 1.2-3.2-6.1L6 17.5z"/>',
        hand        : '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L3.6 14a1.5 1.5 0 0 1 2.4-1.8L8 15"/>',
        frame       : '<rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="M3.5 9.5h17"/><circle cx="6" cy="7.5" r=".6" fill="currentColor"/>',
        perspective : '<path d="M3 18l6-12h6l6 12z"/><path d="M9 6l-2 12M15 6l2 12M5.5 13h13"/>',
        elevation   : '<path d="M4 20V10l8-6 8 6v10z"/><path d="M10 20v-5h4v5M3 20h18"/>',
        plan        : '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4l-8 8 8 8 8-8z"/>',
        note        : '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l2 2"/>',
        leader      : '<path d="M5 19L15 9"/><circle cx="5" cy="19" r="1.4" fill="currentColor"/><path d="M15 9h5"/>',
        camera      : '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/>',
        dice        : '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
        refresh     : '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>',
        zoomIn      : '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20M10.5 7.5v6M7.5 10.5h6"/>',
        zoomOut     : '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20M7.5 10.5h6"/>',
        fit         : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
        save        : '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
        info        : '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
        back        : '<path d="M14.5 6l-6 6 6 6"/>',
        down        : '<path d="M6 9.5l6 6 6-6"/>',
        up          : '<path d="M6 14.5l6-6 6 6"/>',
        lock        : '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
        brush       : '<path d="M14 4l6 6-8.5 8.5a3 3 0 0 1-2.1.9H5v-4.4a3 3 0 0 1 .9-2.1z"/><path d="M12 6l6 6"/>'
    };
    const Na__Dom__SVG_NS = 'http://www.w3.org/2000/svg';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Build an Element: tag, class names, text, attributes
    // ------------------------------------------------------------
    function Na__Dom__El(tag, className, text, attributes) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined && text !== null && text !== '') element.textContent = String(text);
        if (attributes) {
            Object.entries(attributes).forEach(([name, value]) => {
                if (value === false || value === null || value === undefined) return;
                if (name === 'dataset') Object.assign(element.dataset, value);
                else element.setAttribute(name, value === true ? '' : String(value));
            });
        }
        return element;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Icon as an <svg> Element
    // ------------------------------------------------------------
    function Na__Dom__Icon(name, className) {
        const holder = document.createElement('span');
        holder.className = `aura-icon${className ? ' ' + className : ''}`;
        holder.setAttribute('aria-hidden', 'true');
        holder.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" `
                         + `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${Na__Dom__ICONS[name] || ''}</svg>`;
        return holder;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Button With an Icon, an Optional Label, and a Title
    // ------------------------------------------------------------
    function Na__Dom__IconButton(icon, className, label, title) {
        const button = Na__Dom__El('button', className || 'aura-button', null, { type: 'button', title: title || label || '', 'aria-label': title || label || icon });
        button.appendChild(Na__Dom__Icon(icon));
        if (label) button.appendChild(Na__Dom__El('span', 'aura-button__label', label));
        return button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Empty an Element
    // ------------------------------------------------------------
    function Na__Dom__Clear(element) {
        while (element && element.firstChild) element.removeChild(element.firstChild);
        return element;
    }
    // ------------------------------------------------------------


    // FUNCTION | An SVG Element With Its Attributes (numbers rounded to 0.01 mm)
    // ------------------------------------------------------------
    function Na__Dom__Svg(tag, attributes, parent) {
        const element = document.createElementNS(Na__Dom__SVG_NS, tag);
        if (attributes) {
            Object.entries(attributes).forEach(([name, value]) => {
                if (value === null || value === undefined || value === false) return;
                element.setAttribute(name, typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value));
            });
        }
        if (parent) parent.appendChild(element);
        return element;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Labelled Field Row: label, then the control, then an optional readout
    // ------------------------------------------------------------
    function Na__Dom__Field(labelText, control, readout) {
        const row = Na__Dom__El('label', 'aura-field');
        row.appendChild(Na__Dom__El('span', 'aura-field__label', labelText));
        row.appendChild(control);
        if (readout) row.appendChild(readout);
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Select From [{ value, label }]
    // ------------------------------------------------------------
    function Na__Dom__Select(options, value, className) {
        const select = Na__Dom__El('select', className || 'aura-select');
        options.forEach((o) => {
            const option = Na__Dom__El('option', null, o.label, { value: o.value });
            if (String(o.value) === String(value)) option.selected = true;
            select.appendChild(option);
        });
        return select;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Dom__ICONS,
        Na__Dom__SVG_NS,
        Na__Dom__El,
        Na__Dom__Icon,
        Na__Dom__IconButton,
        Na__Dom__Clear,
        Na__Dom__Svg,
        Na__Dom__Field,
        Na__Dom__Select
    };

// endregion -------------------------------------------------------------------
