/* =============================================================================
 * VALE OBJECT LIBRARY - RESOURCE DETAILS AND THE DETAILS PANEL
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Inspector__ResourcePanel__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Inspector
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Resource details and showing or hiding the details panel
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

    const Data     = App.Data;
    const TierRank = App.TierRank;
    const Model    = App.Model;
    const Elements = App.Elements;

    // FUNCTION | Details for one shared Resource
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderResource = function (body, resource) {
        const E      = App.ValeObjectLibrary_El;
        const tier   = Data.tiers.resource;
        const group  = Model.groups.get(resource.group) || { singular: resource.group };

        App.ValeObjectLibrary_Put(body, 
            App.ValeObjectLibrary_BackButton(),
            E('div', { class: 'insp-tier' }, App.ValeObjectLibrary_Dot(tier.colour), E('span', { text: tier.code + ' · Resource · ' + group.singular }), E('span', { class: 'insp-id', text: resource.id })),
            E('h2', { class: 'insp-title', text: resource.name }),
            resource.summary ? E('p', { class: 'insp-lead', text: resource.summary }) : null,
            E('div', { class: 'tiles' },
                App.ValeObjectLibrary_Tile(resource.users.length, resource.users.length === 1 ? 'object uses it' : 'objects use it'),
                App.ValeObjectLibrary_Tile(resource.placementCount, 'places in the scheme'),
                App.ValeObjectLibrary_Tile(resource.pieceCount, 'pieces depend on it')),
            App.ValeObjectLibrary_Section('What is a Resource?', null, E('p', { class: 'callout', style: '--tier-colour:' + tier.colour, text: tier.definition }))
        );

        (resource.attributes || []).forEach(function (attribute) {
            const rows = Object.keys(attribute.data || {}).map(function (field) {
                const value = attribute.data[field];
                const showSwatch = field === 'Paint__Hex';
                const cell = showSwatch
                    ? E('td', null, App.ValeObjectLibrary_Swatch(value), ' ', E('span', { class: 'code', text: String(value) }))
                    : E('td', { text: value === undefined || value === null ? '' : String(value) });
                return E('tr', null, E('th', { scope: 'row', text: field }), cell);
            });
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section(attribute.label, attribute.key,
                E('table', { class: 'dp' }, E('tbody', null, rows))));
        });

        const users = resource.users.slice().sort(function (a, b) {
            return TierRank[a.tier] - TierRank[b.tier] || a.name.localeCompare(b.name);
        });
        if (users.length) {
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('Used by', App.ValeObjectLibrary_Plural(users.length, 'object', 'objects'),
                E('div', { class: 'rows' }, users.map(function (user) {
                    const places = (user.placementsIn.scheme || []).length;
                    return App.ValeObjectLibrary_Row({ colour: App.ValeObjectLibrary_TierColour(user.tier), name: user.name,
                        sub: Data.tiers[user.tier].label + ' · ' + (places ? App.ValeObjectLibrary_Plural(places, 'place', 'places') + ' in the scheme' : 'library only'),
                        qty: user.totalIn.scheme || 0, onClick: function () { App.ValeObjectLibrary_JumpTo(user); } });
                })),
                E('button', { type: 'button', class: 'btn btn--quiet btn--block', onclick: function () {
                        const opened = App.ValeObjectLibrary_RevealDef(resource.id);
                        App.ValeObjectLibrary_Select({ type: 'resource', id: resource.id }, { refresh: opened });
                        App.ValeObjectLibrary_FitSelection();
                    } },
                    App.ValeObjectLibrary_Icon('target'), 'Show every use on the chart')), 'used-by'));
        } else {
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Used by', null, E('p', { class: 'body-text muted', text: 'Nothing in the library uses this yet.' })));
        }

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_DataPointsSection(resource), 'data'));
    };
    // ------------------------------------------------------------

    // FUNCTION | Show or hide the panel
    // ------------------------------------------------------------
    // instant: skip the slide, so the canvas has its final width straight
    // away (needed at start-up, before the first zoom-to-fit is measured)
    App.ValeObjectLibrary_SetInspectorOpen = function () {
        return;                                                                  // <-- The attributes column stays open; there is no side menu
    };

    App.ValeObjectLibrary_IsNarrow = function () {
        return window.matchMedia('(max-width: 900px)').matches;
    };
    // ------------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
