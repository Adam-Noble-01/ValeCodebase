/* =============================================================================
 * VALE OBJECT LIBRARY - TEXT MEASUREMENT, DOM BUILDERS AND TIER LABELS
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Helpers__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Core
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Text measurement, DOM builders and tier labels
 * CREATED    : 16-Oct-2026
 *
 * DESCRIPTION:
 * - Part of the Object Library demo
 * - Loaded by ValeObjectLibrary__Demo__2.0.0__.html
 * - Shares state through window.ValeObjectLibrary__Modules
 *
 * -----------------------------------------------------------------------------
 *
 * DEVELOPMENT LOG:
 * 16-Oct-2026 - Version 2.0.0
 * - Separated from ValeObjectLibrary__Demo__2.0.0__.html
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const Data           = App.Data;
    const Glyph          = App.Glyph;
    const Settings       = App.Settings;
    const Model          = App.Model;
    const TextWidths     = App.TextWidths;
    const MeasureContext = App.MeasureContext;

    // =====================================================================
    // REGION | Small Helpers - Text, DOM, Colours
    // =====================================================================

    // FUNCTION | Build a CSS font string for measuring
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Font = function (size, weight) {
        return weight + ' ' + size + 'px ' + Settings.fontFamily;
    };
    // ------------------------------------------------------------

    // FUNCTION | Measure a string once and remember the width
    // ------------------------------------------------------------
    App.ValeObjectLibrary_TextWidth = function (text, font) {
        const key = font + '|' + text;
        let width = TextWidths.get(key);
        if (width === undefined) {
            MeasureContext.font = font;
            width = MeasureContext.measureText(text).width;
            TextWidths.set(key, width);
        }
        return width;
    };
    // ------------------------------------------------------------

    // FUNCTION | Shorten a string with an ellipsis until it fits a width
    // ------------------------------------------------------------
    App.ValeObjectLibrary_FitText = function (text, font, maxWidth) {
        if (App.ValeObjectLibrary_TextWidth(text, font) <= maxWidth) {
            return text;
        }
        let low = 0;
        let high = text.length;
        while (low < high) {
            const mid = (low + high + 1) >> 1;
            if (App.ValeObjectLibrary_TextWidth(text.slice(0, mid).trimEnd() + '…', font) <= maxWidth) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        return text.slice(0, low).trimEnd() + '…';
    };
    // ------------------------------------------------------------

    // FUNCTION | Fit a zoomed-out name: shrink the type a little before cutting the words
    // ------------------------------------------------------------
    App.ValeObjectLibrary_FitLarge = function (text, size, maxWidth) {
        const width  = App.ValeObjectLibrary_TextWidth(text, App.ValeObjectLibrary_Font(size, 700));
        const fitted = width <= maxWidth ? size : Math.max(size * 0.7, Math.floor(size * maxWidth / width * 10) / 10);
        return { size: fitted, text: App.ValeObjectLibrary_FitText(text, App.ValeObjectLibrary_Font(fitted, 700), maxWidth) };
    };
    // ------------------------------------------------------------

    // FUNCTION | Create a DOM element - text always goes in as text, never as HTML
    // ------------------------------------------------------------
    App.ValeObjectLibrary_El = function (tag, props) {
        const element = document.createElement(tag);
        if (props) {
            Object.keys(props).forEach(function (key) {
                const value = props[key];
                if (value === null || value === undefined || value === false) {
                    return;
                }
                if (key === 'class') {
                    element.className = value;
                } else if (key === 'text') {
                    element.textContent = String(value);
                } else if (key.indexOf('on') === 0 && typeof value === 'function') {
                    element.addEventListener(key.slice(2), value);
                } else {
                    element.setAttribute(key, value === true ? '' : value);
                }
            });
        }
        for (let i = 2; i < arguments.length; i++) {
            App.ValeObjectLibrary_Append(element, arguments[i]);
        }
        return element;
    };
    // ------------------------------------------------------------

    // FUNCTION | Add children to an element, skipping blanks
    // ------------------------------------------------------------
    // Element.append() would write a skipped item out as the word "null".
    App.ValeObjectLibrary_Put = function (parent) {
        for (let i = 1; i < arguments.length; i++) {
            App.ValeObjectLibrary_Append(parent, arguments[i]);
        }
    };
    // ------------------------------------------------------------

    // SUB FUNCTION | Append children, flattening arrays and skipping blanks
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Append = function (element, child) {
        if (child === null || child === undefined || child === false) {
            return;
        }
        if (Array.isArray(child)) {
            child.forEach(function (item) { App.ValeObjectLibrary_Append(element, item); });
            return;
        }
        element.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
    };
    // ------------------------------------------------------------

    // FUNCTION | Create a small line icon for the panel
    // ------------------------------------------------------------
    const ValeObjectLibrary_IconPaths = {
        back   : 'M15 6l-6 6 6 6',
        check  : 'M5 12.5l4.5 4.5L19 7.5',
        target : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'
    };

    App.ValeObjectLibrary_Icon = function (name) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ValeObjectLibrary_IconPaths[name]);
        svg.appendChild(path);
        return svg;
    };
    // ------------------------------------------------------------

    // FUNCTION | Tier colour, label and helpers
    // ------------------------------------------------------------
    App.ValeObjectLibrary_TierColour = function (tier) {
        return (Data.tiers[tier] || {}).colour || '#8a99a8';
    };

    // SUB FUNCTION | A tier's Vale graphic in a round white bubble. The ring and the size are CSS (.glyph-bubble, coloured by the .tier-* class).
    App.ValeObjectLibrary_GlyphBubble = function (tier) {
        return App.ValeObjectLibrary_El('span', { class: 'glyph-bubble tier-' + tier, 'aria-hidden': 'true' },
            App.ValeObjectLibrary_El('img', { class: 'glyph-bubble__img', src: Glyph[tier], alt: '' }));
    };

    // SUB FUNCTION | Which tier a colour belongs to - a panel row is handed a colour, and shows that tier's bubble
    App.ValeObjectLibrary_TierOfColour = function (colour) {
        return Object.keys(Data.tiers).find(function (key) {
            return Glyph[key] && String(Data.tiers[key].colour).toLowerCase() === String(colour).toLowerCase();
        }) || null;
    };

    App.ValeObjectLibrary_TierLabel = function (placement) {
        if (placement.tier === 'assembly' && placement.nest > 0) {
            return 'Sub-assembly';
        }
        return Data.tiers[placement.tier].label;
    };

    App.ValeObjectLibrary_Article = function (word) {
        return /^[aeiou]/i.test(word) ? 'an' : 'a';
    };

    App.ValeObjectLibrary_Plural = function (count, one, many) {
        return count + ' ' + (count === 1 ? one : many);
    };

    App.ValeObjectLibrary_IsPart = function (tier) {
        return tier === 'component' || tier === 'product';
    };

    App.ValeObjectLibrary_OwnsResources = function (tier) {
        return tier === 'assembly' || tier === 'component' || tier === 'product';
    };

    // SUB FUNCTION | What a library category holds, e.g. "Assemblies" or "Components + Products"
    // A category is a browsing group, not an object - its caption says what is in it
    // FUNCTION | Shelf label - "Collection | Roof Finials", "Framework | Cill Nosings"
    // ------------------------------------------------------------
    App.ValeObjectLibrary_ShelfLabel = function (placement) {
        if (placement.tier === 'category') {
            return 'Collection | ' + placement.def.name;
        }
        if (placement.tier === 'range' && placement.parent) {
            return placement.parent.def.name + ' | ' + placement.def.name;
        }
        return placement.def.name;
    };

    App.ValeObjectLibrary_GroupCaption = function (placement) {
        if (placement.tier === 'category') {
            return 'Collection';                                             // <-- First shelf. A Range is the similar set inside it
        }
        const kinds = ['assembly', 'component', 'product'].filter(function (tier) {
            return placement.children.some(function (child) { return child.tier === tier; });
        });
        return kinds.map(function (tier) { return Data.tiers[tier].plural; }).join(' + ') || 'Collection';
    };

    // SUB FUNCTION | The kinds of record a category or range holds, in order
    App.ValeObjectLibrary_GroupKinds = function (placement) {
        const found = [];
        function consider(node) {
            if (node.tier === 'range') {
                node.children.forEach(consider);
                return;
            }
            if ((node.tier === 'assembly' || node.tier === 'component' || node.tier === 'product') && found.indexOf(node.tier) === -1) {
                found.push(node.tier);
            }
        }
        placement.children.forEach(consider);
        return ['assembly', 'component', 'product'].filter(function (tier) { return found.indexOf(tier) !== -1; });
    };

    // SUB FUNCTION | The colour of a bubble's ring: its tier's, or for a category the tier of what it holds
    App.ValeObjectLibrary_NodeRing = function (placement) {
        if (placement.tier === 'category' || placement.tier === 'range') {
            const kinds = App.ValeObjectLibrary_GroupKinds(placement);
            return App.ValeObjectLibrary_TierColour(kinds.length === 1 ? kinds[0] : 'category');
        }
        return App.ValeObjectLibrary_TierColour(placement.tier);
    };

    App.ValeObjectLibrary_IsStructural = function (tier) {
        return tier === 'library' || tier === 'category' || tier === 'range';
    };

    App.ValeObjectLibrary_IsUnavailable = function (def) {
        return /unavailable|discontinued|withdrawn/i.test(String(def.data['Availability / Status'] || ''));
    };

    App.ValeObjectLibrary_SchemeName = function () {
        return Model.trees.scheme ? Model.trees.scheme.root.def.name : 'the scheme';
    };

    App.ValeObjectLibrary_ShortName = function (def) {
        if (def.tier === 'assembly') {
            return def.name.replace(/\s+Assembly$/i, '');                     // <-- Zoomed out, the column already says "Assembly"
        }
        return def.name;
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
