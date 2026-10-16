/* =============================================================================
 * VALE OBJECT LIBRARY - FIND AN OBJECT FROM THE HEADER
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Search__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Search
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Find an object from the header
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
    const State    = App.State;
    const Elements = App.Elements;

    // =====================================================================
    // REGION | Search
    // =====================================================================

    // FUNCTION | Index every placed record and every Resource by name and id
    // ------------------------------------------------------------
    App.ValeObjectLibrary_BuildSearchIndex = function () {
        Model.searchIndex = [];
        Model.defs.forEach(function (def) {
            const shown = def.tier === 'resource' || (def.placementsIn.scheme || []).length || (def.placementsIn.library || []).length;
            if (!shown || def.tier === 'library') {
                return;
            }
            const values = Object.keys(def.data).map(function (key) { return def.data[key]; }).join(' ');   // <-- Codes such as VG726 or VG_IRN0001
            Model.searchIndex.push({
                def  : def,
                name : def.name.toLowerCase(),
                    text : (def.name + ' ' + def.id + ' ' + Data.tiers[def.tier].label + ' ' + (def.group || '') + ' ' + (def.category || '') + ' ' + (def.range || '') + ' ' + values).toLowerCase()
            });
        });
    };

    // SUB FUNCTION | One line on where a search result lives
    App.ValeObjectLibrary_SearchWhere = function (def) {
        if (def.tier === 'resource') {
            return App.ValeObjectLibrary_Plural(def.users.length, 'object uses', 'objects use') + ' it';
        }
        if (def.tier === 'category') {
            return 'Library collection · ' + App.ValeObjectLibrary_Plural((def.placementsIn.library || [])[0].children.length, 'item', 'items');
        }
        if (def.tier === 'range') {
            return 'Range · ' + App.ValeObjectLibrary_Plural((def.placementsIn.library || [])[0].children.length, 'record', 'records');
        }
        const code    = def.data['Product Code'] ? def.data['Product Code'] + ' · ' : '';
        const status  = App.ValeObjectLibrary_IsUnavailable(def) ? ' · unavailable' : '';
        const inView  = def.placementsIn[State.view] || [];
        if (!inView.length) {
            return code + (State.view === 'scheme' ? 'In the library only' : 'In ' + App.ValeObjectLibrary_SchemeName() + ' only') + status;
        }
        if (inView.length > 1) {
            return code + 'In ' + inView.length + ' places' + status;
        }
        return code + (App.ValeObjectLibrary_RouteText(inView[0]) || inView[0].parent && inView[0].parent.def.name || '') + status;
    };

    App.ValeObjectLibrary_Search = function (query) {
        const q = query.trim().toLowerCase();
        if (!q) {
            return [];
        }
        const results = [];
        Model.searchIndex.forEach(function (entry) {
            let score = -1;
            if (entry.name === q) { score = 100; }
            else if (entry.name.indexOf(q) === 0) { score = 80; }
            else if (entry.name.split(/\s+/).some(function (word) { return word.indexOf(q) === 0; })) { score = 60; }
            else if (entry.name.indexOf(q) !== -1) { score = 40; }
            else if (entry.text.indexOf(q) !== -1) { score = 20; }
            if (score >= 0) {
                results.push({ def: entry.def, score: score - TierRank[entry.def.tier] });
            }
        });
        return results.sort(function (a, b) { return b.score - a.score || a.def.name.localeCompare(b.def.name); });
    };
    // ------------------------------------------------------------

    // FUNCTION | Wire up the search box and its results list
    // ------------------------------------------------------------
    App.ValeObjectLibrary_InitSearch = function () {
        const input = Elements.searchInput;
        const list  = Elements.searchResults;
        let results = [];
        let active  = 0;

        function open(show) {
            list.hidden = !show;
            input.setAttribute('aria-expanded', show ? 'true' : 'false');
        }

        function render() {
            list.textContent = '';
            if (!input.value.trim()) {
                open(false);
                return;
            }
            if (!results.length) {
                list.append(App.ValeObjectLibrary_El('li', { class: 'search__empty', text: 'Nothing called "' + input.value.trim() + '" in the library.' }));
                open(true);
                return;
            }
            results.slice(0, 12).forEach(function (result, index) {
                const def   = result.def;
                const where = App.ValeObjectLibrary_SearchWhere(def);
                list.append(App.ValeObjectLibrary_El('li', {
                        class : 'search__result' + (index === active ? ' is-active' : ''),
                        role  : 'option',
                        'aria-selected' : index === active ? 'true' : 'false',
                        onmousedown : function (event) { event.preventDefault(); },
                        onclick     : function () { choose(def); }
                    },
                    App.ValeObjectLibrary_Dot(App.ValeObjectLibrary_TierColour(def.tier)),
                    App.ValeObjectLibrary_El('span', null,
                        App.ValeObjectLibrary_El('span', { class: 'search__result-name', text: def.name }),
                        App.ValeObjectLibrary_El('span', { class: 'search__result-meta', text: where })),
                    App.ValeObjectLibrary_El('span', { class: 'search__result-tier', text: Data.tiers[def.tier].label })));
            });
            open(true);
        }

        function choose(def) {
            input.value = '';
            results = [];
            State.matches = new Set();
            open(false);
            input.blur();
            App.ValeObjectLibrary_ApplyStateClasses();
            App.ValeObjectLibrary_JumpTo(def);                                       // <-- Switches to the other view if that is the only place it shows
        }

        input.addEventListener('input', function () {
            results = App.ValeObjectLibrary_Search(input.value);
            active  = 0;
            State.matches = new Set(results.map(function (result) { return result.def.id; }));
            App.ValeObjectLibrary_ApplyStateClasses();
            render();
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const count = Math.min(results.length, 12);
                if (count) {
                    active = (active + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
                    render();
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (results[active]) {
                    choose(results[active].def);
                }
            } else if (event.key === 'Escape') {
                input.value = '';
                results = [];
                State.matches = new Set();
                App.ValeObjectLibrary_ApplyStateClasses();
                open(false);
                input.blur();
            }
        });
        input.addEventListener('focus', function () {
            if (input.value.trim()) {
                render();
            }
        });
        input.addEventListener('blur', function () {
            window.setTimeout(function () { open(false); }, 120);
        });
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
