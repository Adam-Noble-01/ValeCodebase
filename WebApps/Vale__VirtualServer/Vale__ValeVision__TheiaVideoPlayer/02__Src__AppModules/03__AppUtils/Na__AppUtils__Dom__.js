// =============================================================================
// VALEVISION THEIA - APP UTILS - DOM HELPERS AND ICONS
// =============================================================================
//
// FILE       : Na__AppUtils__Dom__.js
// NAMESPACE  : Na__Dom
// MODULE     : App Utils - DOM
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build elements in one line, and the player's line icons
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - Na__Dom__El('button', 'class names', 'text', { attributes }) builds an
//   element; text is always set as text, never parsed as HTML.
// - Icons are 24 x 24 line drawings in currentColor, so they take the colour of
//   whatever they sit in, light page or cinema dark.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Icon Paths (24 x 24, stroked in currentColor)
    // ------------------------------------------------------------
    const Na__Dom__ICONS = {
        play        : '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
        pause       : '<path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z" fill="currentColor" stroke="none"/>',
        volumeHigh  : '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
        volumeLow   : '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6"/>',
        volumeMute  : '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
        settings    : '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        fullscreen  : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
        exitFull    : '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
        share       : '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
        edit        : '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l2 2"/>',
        check       : '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        close       : '<path d="M6 6l12 12M18 6L6 18"/>',
        up          : '<path d="M6 14.5l6-6 6 6"/>',
        down        : '<path d="M6 9.5l6 6 6-6"/>',
        eye         : '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        eyeOff      : '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.5 7.6A17 17 0 0 0 2.5 12s3.5 6 9.5 6a9 9 0 0 0 4-.9"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>',
        link        : '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
        copy        : '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
        trash       : '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
        back        : '<path d="M14.5 6l-6 6 6 6"/>',
        film        : '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
        wifi        : '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r="1.2" fill="currentColor" stroke="none"/>',
        phone       : '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10.5 18.5h3"/>',
        next        : '<path d="M6 5.5v13l9-6.5z" fill="currentColor" stroke="none"/><path d="M18 5.5v13"/>',
        replay      : '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/>',
        info        : '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
        client      : '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5c0-4 3.2-6.8 7.2-6.8s7.2 2.8 7.2 6.8"/>',
        staff       : '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/><path d="M12 14.5v2.5"/>'
    };
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
        holder.className = `theia-icon${className ? ' ' + className : ''}`;
        holder.setAttribute('aria-hidden', 'true');
        holder.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" `
                         + `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${Na__Dom__ICONS[name] || ''}</svg>`;
        return holder;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Button With an Icon, an Optional Label, and a Title
    // ------------------------------------------------------------
    function Na__Dom__IconButton(icon, className, label, title) {
        const button = Na__Dom__El('button', className, null, { type: 'button', title: title || label || '', 'aria-label': title || label || icon });
        button.appendChild(Na__Dom__Icon(icon));
        if (label) button.appendChild(Na__Dom__El('span', 'theia-button__label', label));
        return button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Swap a Button's Icon
    // ------------------------------------------------------------
    function Na__Dom__SetIcon(button, icon) {
        const old = button.querySelector('.theia-icon');
        const fresh = Na__Dom__Icon(icon);
        if (old) old.replaceWith(fresh); else button.prepend(fresh);
    }
    // ------------------------------------------------------------


    // FUNCTION | Empty an Element
    // ------------------------------------------------------------
    function Na__Dom__Clear(element) {
        while (element && element.firstChild) element.removeChild(element.firstChild);
        return element;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Dom__El,
        Na__Dom__Icon,
        Na__Dom__IconButton,
        Na__Dom__SetIcon,
        Na__Dom__Clear
    };

// endregion -------------------------------------------------------------------
