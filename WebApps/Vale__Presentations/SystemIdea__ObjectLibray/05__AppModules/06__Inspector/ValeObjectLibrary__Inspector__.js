/* =============================================================================
 * VALE OBJECT LIBRARY - OVERVIEW, OBJECT DETAILS AND RESOURCE DETAILS
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Inspector__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Inspector
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Overview, object details and resource details
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
    const Model    = App.Model;
    const State    = App.State;
    const Elements = App.Elements;
    const Runtime  = App.Runtime;

    // =====================================================================
    // REGION | Inspector Panel - Overview, Object Details, Resource Details
    // =====================================================================

    // FUNCTION | Redraw the panel for the current selection
    // ------------------------------------------------------------
    // FUNCTION | Attributes column - JSON for the open level only
    // ------------------------------------------------------------
    const AttributeFolded = new Set();                                      // <-- A resource the user has closed. Everything else stays open

    function ValeObjectLibrary_AttributeEntries(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        return Object.keys(value).map(function (key) {
            return { key: key, value: value[key] };
        });
    }

    function ValeObjectLibrary_AttributeNode(value, depth) {
        const E = App.ValeObjectLibrary_El;
        const entries = ValeObjectLibrary_AttributeEntries(value);
        if (!entries) {
            const text = typeof value === 'string' ? JSON.stringify(value) : String(value);
            return E('span', { class: 'attr-json__val', text: text });
        }
        const width = entries.reduce(function (widest, entry) {
            return Math.max(widest, entry.key.length);
        }, 0);
        const rows = entries.map(function (entry, index) {
            const gap = ' '.repeat(width - entry.key.length);
            const comma = index === entries.length - 1 ? '' : ',';
            const key = entry.toggle
                ? E('button', { type: 'button', class: 'attr-json__key' + (entry.open ? ' is-open' : ''), text: '"' + entry.key + '"' + gap, onclick: entry.toggle })
                : E('span', { class: 'attr-json__key', text: '"' + entry.key + '"' + gap });
            return E('div', { class: 'attr-json__row', style: 'padding-left:' + ((depth + 1) * 16) + 'px' },
                key,
                E('span', { class: 'attr-json__colon', text: ' : ' }),
                ValeObjectLibrary_AttributeNode(entry.value, depth + 1),
                comma ? E('span', { text: comma }) : null);
        });
        return E('div', { class: 'attr-json__obj' },
            E('div', { text: '{' }),
            rows,
            E('div', { style: 'padding-left:' + (depth * 16) + 'px', text: '}' }));
    }

    function ValeObjectLibrary_FoldBlock(key, openValue, closedLabel) {
        const foldId = 'dict:' + key;
        const open   = !AttributeFolded.has(foldId);                         // <-- A dictionary starts open. The arrow folds it
        return {
            key    : key,
            value  : open ? openValue : closedLabel,
            toggle : function () {
                if (AttributeFolded.has(foldId)) {
                    AttributeFolded.delete(foldId);
                } else {
                    AttributeFolded.add(foldId);
                }
                App.ValeObjectLibrary_RenderInspector();
            },
            open   : open
        };
    }

    function ValeObjectLibrary_CommonDictionary(resource) {
        if (resource.resourceType === 'PaintFinish' || resource.id.indexOf('ValePaintFinish__') === 0) {
            return {
                id   : 'Vale__PaintLibrary',
                name : 'Vale Paint Library Attribute Dictionary',
                role : 'Common library, and the single source of truth for joinery paint. Any assembly, component or product calls a finish by its code. The colour, the price and the supplier stay in this dictionary and are not copied onto the object.'
            };
        }
        if (resource.resourceType === 'TimberMaterial') {
            return {
                id   : 'Vale__TimberLibrary',
                name : 'Vale Timber Library Attribute Dictionary',
                role : 'Common library, and the single source of truth for timber bought by the cubic metre. The species, the purchase price and the machined rate stay here.'
            };
        }
        const shelves = {
            Profiles : {
                id   : 'Vale__ProfileLibrary',
                name : 'Vale Profile Library Attribute Dictionary',
                role : 'Common library. Shared sections and mouldings, called by code.'
            },
            Materials : {
                id   : 'Vale__MaterialLibrary',
                name : 'Vale Material Library Attribute Dictionary',
                role : 'Common library. Shared materials, called by code. A timber with a full costing block is in the Vale Timber Library instead.'
            },
            Finishes : {
                id   : 'Vale__FinishLibrary',
                name : 'Vale Finish Library Attribute Dictionary',
                role : 'Common library. Shared finishes other than the Vale paint card, such as powder coat and metal finishes.'
            },
            Specifications : {
                id   : 'Vale__SpecificationLibrary',
                name : 'Vale Specification Library Attribute Dictionary',
                role : 'Common library. Shared specifications, called by code.'
            }
        };
        return shelves[resource.group] || {
            id   : 'Vale__ResourceLibrary',
            name : (resource.group || 'Resource') + ' Attribute Dictionary',
            role : 'Common library. A shared resource, called by code.'
        };
    }

    function ValeObjectLibrary_BespokeDictionary(def) {
        const tierName = Data.tiers[def.tier] ? Data.tiers[def.tier].label.toLowerCase() : def.tier;
        const owner = {
            component : 'This component',
            product   : 'This product',
            assembly  : 'This assembly',
            family    : 'This family',
            scheme    : 'This scheme',
            resource  : 'This resource'
        }[def.tier] || 'This object';
        const body = {
            Dictionary__Kind  : 'Bespoke',
            Dictionary__Owner : owner,
            Dictionary__Scope : def.tier === 'resource'
                ? 'A resource does not keep a private copy of a common library. Its attributes live in the library it belongs to.'
                : 'Stored on this ' + tierName + ' only. Not a shared library.'
        };
        let count = 0;
        Object.keys(def.data || {}).forEach(function (key) {
            if (key === 'Swatch') {
                return;
            }
            body[key] = def.data[key];
            count += 1;
        });
        (def.params || []).forEach(function (name) {
            if (body[name] === undefined) {
                body[name] = 'Set by the scheme';
                count += 1;
            }
        });
        (def.rules || []).forEach(function (rule, index) {
            body['Rule__' + String(index + 1).padStart(2, '0')] = (rule.type ? rule.type + '. ' : '') + rule.text;
            count += 1;
        });
        if (!count && def.tier !== 'resource') {
            body.Dictionary__Values = 'None. This ' + tierName + ' has no values of its own.';
        }
        return body;
    }

    function ValeObjectLibrary_AttributeNote() {
        const E = App.ValeObjectLibrary_El;
        return E('aside', { class: 'attributes__note' },
            E('p', { class: 'attributes__note-title', text: 'Attribute dictionaries' }),
            E('p', { text: 'An attribute dictionary stores the attributes of an assembly, a component, a product or a resource.' }),
            E('p', { text: 'A common library is one dictionary kept once and called by code. The Vale Paint Library Attribute Dictionary is that kind of store: many objects name Vale__PaintLibrary, and the colour and the price live only there. That library is the single source of truth.' }),
            E('p', { text: 'A bespoke dictionary belongs to one assembly, component or product. Those values are not in a shared library.' }));
    }
    function ValeObjectLibrary_ResourceJson(resource) {
        const open = !AttributeFolded.has(resource.id);                      // <-- Open unless this level has been folded by hand
        const labels = (resource.attributes || []).map(function (attribute) { return attribute.label; });
        const body = {
            Resource__Code : resource.id,
            Resource__Name : resource.name
        };
        (resource.attributes || []).forEach(function (attribute) {
            body[attribute.key] = attribute.data;
        });
        if (!(resource.attributes || []).length && resource.summary) {
            body.Resource__Summary = resource.summary;
        }
        return {
            key    : resource.id,
            value  : open ? body : (labels.length ? '{ … ' + labels.join(', ') + ' }' : (resource.summary || resource.name)),
            toggle : function () {
                if (AttributeFolded.has(resource.id)) {
                    AttributeFolded.delete(resource.id);
                } else {
                    AttributeFolded.add(resource.id);
                }
                App.ValeObjectLibrary_RenderInspector();
            },
            open   : open
        };
    }

    App.ValeObjectLibrary_RenderInspector = function () {
        const body  = Elements.attributesBody;
        const title = Elements.attributesTitle;
        if (!body || !title) {
            return;
        }
        body.textContent = '';
        const selection = State.selection;
        if (!selection) {
            title.textContent = 'Nothing open';
            body.appendChild(ValeObjectLibrary_AttributeNote());
            body.appendChild(ValeObjectLibrary_AttributeNode({
                Attributes : 'Open a component, product or assembly'
            }, 0));
            body.dataset.level = '';
            App.ValeObjectLibrary_FitAttributesColumn();
            return;
        }

        let def = null;
        let placement = null;
        if (selection.type === 'resource') {
            def = Model.defs.get(selection.id);
        } else {
            placement = Model.byUid.get(selection.uid);
            def = placement && placement.def;
        }
        if (!def) {
            return;
        }
        title.textContent = def.name;
        if (body.dataset.level !== def.id) {
            AttributeFolded.clear();                                         // <-- A new level opens every resource. Arrows fold it from there
        }

        const documentJson = {
            Level__Tier : Data.tiers[def.tier] ? Data.tiers[def.tier].label : def.tier,
            Level__Code : def.id,
            Level__Name : def.name
        };
        if (def.summary) {
            documentJson.Level__Summary = def.summary;
        }

        const bespoke = ValeObjectLibrary_BespokeDictionary(def);
        const bespokeFold = ValeObjectLibrary_FoldBlock(
            'Dictionary__Bespoke',
            bespoke,
            '{ … Bespoke dictionary, ' + bespoke.Dictionary__Owner.toLowerCase() + ' only }'
        );
        documentJson[bespokeFold.key] = bespokeFold;

        const host = placement && App.ValeObjectLibrary_OwnsResources(placement.tier) ? placement : null;
        const uses = host ? host.def.uses : (def.tier === 'resource' ? [def.id] : []);
        const libraries = {};
        const libraryOrder = [];
        uses.forEach(function (id) {
            const resource = Model.defs.get(id);
            if (!resource) {
                return;
            }
            const dictionary = ValeObjectLibrary_CommonDictionary(resource);
            if (!libraries[dictionary.id]) {
                libraries[dictionary.id] = { dictionary: dictionary, items: [] };
                libraryOrder.push(dictionary.id);
            }
            libraries[dictionary.id].items.push(resource);
        });
        const preferred = ['Vale__PaintLibrary', 'Vale__TimberLibrary', 'Vale__ProfileLibrary', 'Vale__MaterialLibrary', 'Vale__FinishLibrary', 'Vale__SpecificationLibrary'];
        libraryOrder.sort(function (a, b) {
            const ia = preferred.indexOf(a);
            const ib = preferred.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });

        if (!libraryOrder.length) {
            documentJson.Dictionaries__CommonLibraries = 'None at this level. A common library is called by the component, product or assembly that uses it.';
        } else {
            const common = {};
            libraryOrder.forEach(function (id) {
                const shelf = libraries[id];
                const list = shelf.items.slice().sort(function (a, b) {
                    return (a.cardOrder || 0) - (b.cardOrder || 0) || a.name.localeCompare(b.name);
                });
                const records = {
                    Dictionary__Kind   : 'Common library',
                    Dictionary__Name   : shelf.dictionary.name,
                    Dictionary__Role   : shelf.dictionary.role,
                    Dictionary__CalledAs : id
                };
                list.forEach(function (resource) {
                    const entry = ValeObjectLibrary_ResourceJson(resource);
                    records[entry.key] = entry;
                });
                const noun = list.length === 1 ? 'record' : 'records';
                const fold = ValeObjectLibrary_FoldBlock(
                    id,
                    records,
                    '{ … ' + shelf.dictionary.name + ', ' + list.length + ' ' + noun + ' }'
                );
                common[fold.key] = fold;
            });
            documentJson.Dictionaries__CommonLibraries = common;
        }

        // Resource entries carry a toggle. Walk them into the renderer by
        // replacing those objects after the plain document is built.
        function lift(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return value;
            }
            const out = {};
            Object.keys(value).forEach(function (key) {
                const item = value[key];
                if (item && item.toggle && item.key) {
                    out[key] = item;
                } else {
                    out[key] = lift(item);
                }
            });
            return out;
        }
        const lifted = lift(documentJson);

        function draw(value, depth) {
            const entries = ValeObjectLibrary_AttributeEntries(value);
            if (!entries) {
                return ValeObjectLibrary_AttributeNode(value, depth);
            }
            const rows = entries.map(function (entry) {
                const item = entry.value;
                if (item && item.toggle) {
                    return { key: entry.key, value: item.open ? item.value : item.value, toggle: item.toggle, open: item.open };
                }
                return { key: entry.key, value: item };
            });
            // Reuse the node builder by passing a plain object, then we need toggles.
            // Build directly so a collapsed resource stays one value.
            const E = App.ValeObjectLibrary_El;
            const width = rows.reduce(function (widest, entry) { return Math.max(widest, entry.key.length); }, 0);
            return E('div', { class: 'attr-json__obj' },
                E('div', { text: '{' }),
                rows.map(function (entry, index) {
                    const gap = ' '.repeat(width - entry.key.length);
                    const comma = index === rows.length - 1 ? '' : ',';
                    const key = entry.toggle
                        ? E('button', {
                            type: 'button',
                            class: 'attr-json__key' + (entry.open ? ' is-open' : ''),
                            'aria-expanded': entry.open ? 'true' : 'false',
                            onclick: entry.toggle
                        },
                            E('span', { class: 'attr-json__arrow', 'aria-hidden': 'true', text: entry.open ? '▾' : '▸' }),
                            E('span', { text: ' "' + entry.key + '"' + gap }))
                        : E('span', { class: 'attr-json__key', text: '"' + entry.key + '"' + gap });
                    const shown = entry.toggle && !entry.open ? entry.value : entry.value;
                    return E('div', { class: 'attr-json__row', style: 'padding-left:' + ((depth + 1) * 16) + 'px' },
                        key,
                        E('span', { class: 'attr-json__colon', text: ' : ' }),
                        (entry.toggle && !entry.open) ? E('span', { class: 'attr-json__val', text: shown }) : draw(shown, depth + 1),
                        comma ? E('span', { text: comma }) : null);
                }),
                E('div', { style: 'padding-left:' + (depth * 16) + 'px', text: '}' }));
        }

        const keptScroll = body.dataset.level === def.id ? body.scrollTop : 0;
        body.appendChild(ValeObjectLibrary_AttributeNote());
        body.appendChild(draw(lifted, 0));
        body.dataset.level = def.id;
        body.scrollTop = keptScroll;
        App.ValeObjectLibrary_FitAttributesColumn();
    };
    // ------------------------------------------------------------

    // FUNCTION | Width of the attributes column - fit the JSON, or the dragged size
    // ------------------------------------------------------------
    App.ValeObjectLibrary_AttributesMaxWidth = function () {
        return Math.min(860, Math.max(420, window.innerWidth - 420));       // <-- Grows with the JSON, and always leaves the chart some room
    };

    App.ValeObjectLibrary_FitAttributesColumn = function () {
        const panel = Elements.attributesPanel;
        const body  = Elements.attributesBody;
        if (!panel || !body) {
            return;
        }
        const min = 320;
        const max = App.ValeObjectLibrary_AttributesMaxWidth();
        let width = State.attributesWidth;
        panel.classList.remove('is-capped');                                 // <-- Measure the lines unwrapped
        panel.style.width     = min + 'px';
        panel.style.flexBasis = min + 'px';
        const needed = body.scrollWidth + 36;
        if (!width) {
            width = needed;
        }
        width = Math.max(min, Math.min(max, width));
        panel.classList.toggle('is-capped', needed > width);                 // <-- At the limit, long values wrap instead of running off
        panel.style.width     = width + 'px';
        panel.style.flexBasis = width + 'px';
    };

    App.ValeObjectLibrary_InitAttributesColumn = function () {
        const grip  = Elements.attributesGrip;
        const panel = Elements.attributesPanel;
        if (!grip || !panel) {
            return;
        }
        grip.addEventListener('pointerdown', function (event) {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            const startX = event.clientX;
            const startW = panel.getBoundingClientRect().width;
            panel.classList.add('is-resizing');
            function move(ev) {
                const next = startW + (startX - ev.clientX);                 // <-- Dragging left widens the column
                const max  = App.ValeObjectLibrary_AttributesMaxWidth();
                State.attributesWidth = Math.max(320, Math.min(max, next));
                panel.style.width     = State.attributesWidth + 'px';
                panel.style.flexBasis = State.attributesWidth + 'px';
            }
            function up() {
                panel.classList.remove('is-resizing');
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
            }
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        });
        grip.addEventListener('dblclick', function () {
            State.attributesWidth = null;                                     // <-- Back to fitting the JSON
            App.ValeObjectLibrary_FitAttributesColumn();
        });
        window.addEventListener('resize', App.ValeObjectLibrary_FitAttributesColumn);
    };
    // ------------------------------------------------------------

    // FUNCTION | Shared panel pieces
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Section = function (title, note) {
        const heading = App.ValeObjectLibrary_El('h3', { class: 'section__title' },
            App.ValeObjectLibrary_El('span', { text: title }),
            note ? App.ValeObjectLibrary_El('span', { class: 'section__note', text: note }) : null);
        const section = App.ValeObjectLibrary_El('section', { class: 'section' }, heading);
        for (let i = 2; i < arguments.length; i++) {
            App.ValeObjectLibrary_Append(section, arguments[i]);
        }
        return section;
    };

    App.ValeObjectLibrary_Keyed = function (section, key) {
        section.setAttribute('data-section', key);                               // <-- A tour step can open the panel at this section
        return section;
    };

    App.ValeObjectLibrary_PaintSwatch = function (resource) {
        const number = resource.paintNumber ? String(resource.paintNumber).padStart(2, '0') : '';
        return App.ValeObjectLibrary_El('button', {
            type: 'button', class: 'paint-swatch', title: resource.id,
            onclick: function () { App.ValeObjectLibrary_Select({ type: 'resource', id: resource.id }, { fly: true }); }
        },
            App.ValeObjectLibrary_El('span', { class: 'paint-swatch__chip', style: 'background:' + (resource.data.Swatch || '#cccccc') }),
            App.ValeObjectLibrary_El('span', { class: 'paint-swatch__no', text: number }),
            App.ValeObjectLibrary_El('span', { class: 'paint-swatch__name', text: resource.name }));
    };

    App.ValeObjectLibrary_ResourceGroups = function (ids) {
        const groups = [];
        const E = App.ValeObjectLibrary_El;
        Model.groups.forEach(function (group) {
            const used = Array.from(ids).map(function (id) { return Model.defs.get(id); }).filter(function (resource) {
                return resource && resource.group === group.key;
            });
            if (!used.length) {
                return;
            }
            used.sort(function (a, b) {
                return (a.cardOrder || 0) - (b.cardOrder || 0) || a.name.localeCompare(b.name);
            });
            const body = group.key === 'Paint Finishes'
                ? E('div', { class: 'paint-grid' }, used.map(App.ValeObjectLibrary_PaintSwatch))
                : E('div', { class: 'chips' }, used.map(App.ValeObjectLibrary_ResourceChip));
            groups.push(E('div', { class: 'chip-group' },
                E('div', { class: 'chip-group__label', text: group.key }),
                body));
        });
        return groups;
    };

    App.ValeObjectLibrary_Tile = function (value, label) {
        return App.ValeObjectLibrary_El('div', { class: 'tile' },
            App.ValeObjectLibrary_El('div', { class: 'tile__value', text: value }),
            App.ValeObjectLibrary_El('div', { class: 'tile__label', text: label }));
    };

    // A tier's colour becomes that tier's graphic bubble; any other colour stays a plain dot
    App.ValeObjectLibrary_Dot = function (colour) {
        const tier = App.ValeObjectLibrary_TierOfColour(colour);
        return tier ? App.ValeObjectLibrary_GlyphBubble(tier)
                    : App.ValeObjectLibrary_El('span', { class: 'dot', style: 'background:' + colour, 'aria-hidden': 'true' });
    };

    App.ValeObjectLibrary_Row = function (options) {
        return App.ValeObjectLibrary_El('button', { type: 'button', class: 'row' + (options.current ? ' is-current' : ''), onclick: options.onClick },
            App.ValeObjectLibrary_Dot(options.colour),
            App.ValeObjectLibrary_El('span', { class: 'row__main' },
                App.ValeObjectLibrary_El('span', { class: 'row__name', text: options.name }),
                options.sub ? App.ValeObjectLibrary_El('span', { class: 'row__sub', text: options.sub }) : null),
            options.qty !== undefined ? App.ValeObjectLibrary_El('span', { class: 'row__qty', text: options.qty }) : App.ValeObjectLibrary_El('span'));
    };

    App.ValeObjectLibrary_BackButton = function () {
        return App.ValeObjectLibrary_El('button', { type: 'button', class: 'insp-back', onclick: function () { App.ValeObjectLibrary_Select(null); } },
            App.ValeObjectLibrary_Icon('back'), 'Overview');
    };

    App.ValeObjectLibrary_ResourceChip = function (resource) {
        return App.ValeObjectLibrary_El('button', { type: 'button', class: 'chip', onclick: function () {
                App.ValeObjectLibrary_Select({ type: 'resource', id: resource.id }, { fly: true });
            } },
            App.ValeObjectLibrary_Dot(App.ValeObjectLibrary_TierColour('resource')), resource.name,
            resource.data.Swatch ? App.ValeObjectLibrary_Swatch(resource.data.Swatch) : null);
    };

    // SUB FUNCTION | A chip for any library record - goes to it, switching view if it has to
    App.ValeObjectLibrary_RecordChip = function (def) {
        return App.ValeObjectLibrary_El('button', { type: 'button', class: 'chip', onclick: function () { App.ValeObjectLibrary_JumpTo(def); } },
            App.ValeObjectLibrary_Dot(App.ValeObjectLibrary_TierColour(def.tier)), def.name);
    };

    App.ValeObjectLibrary_Swatch = function (colour) {
        return App.ValeObjectLibrary_El('span', { class: 'swatch', style: 'background:' + colour, 'aria-hidden': 'true' });
    };

    App.ValeObjectLibrary_RouteText = function (placement) {
        const names = [];
        for (let node = placement.parent; node && node.parent; node = node.parent) {
            names.unshift(node.def.name);
        }
        return names.join(' › ');
    };
    // ------------------------------------------------------------

    // FUNCTION | Resource schemes - the costing blocks, one resource type at a time
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderSchemes = function () {
        const body = Elements.schemesBody;
        if (!body) {
            return;
        }
        const E = App.ValeObjectLibrary_El;
        body.textContent = '';
        const paints = Model.resources.filter(function (resource) { return resource.group === 'Paint Finishes'; })
            .sort(function (a, b) { return (a.cardOrder || 0) - (b.cardOrder || 0); });

        App.ValeObjectLibrary_Put(body,
            E('p', { class: 'schemes__kicker', text: 'Costing department' }),
            E('h2', { class: 'schemes__title', text: 'How a resource is written' }),
            E('p', { class: 'schemes__lead', text: 'A resource is one record with several attribute blocks. Colour, cost and procurement stay on the resource. A component stores only the code, such as ValePaintFinish__no01-ValeWhite__. Open that component to see its resources. Open the assembly around it and those resources stay with the component.' })
        );
        if (paints.length) {
            App.ValeObjectLibrary_Put(body,
                E('h3', { class: 'schemes__heading', text: 'Vale paint card · ' + paints.length }),
                E('div', { class: 'paint-grid paint-grid--board' }, paints.map(App.ValeObjectLibrary_PaintSwatch))
            );
        }
        (Data.resourceSchemes || []).forEach(function (scheme) {
            App.ValeObjectLibrary_Put(body,
                E('h3', { class: 'schemes__heading', text: scheme.title }),
                E('p', { class: 'schemes__lead', text: scheme.lead }),
                scheme.file ? E('p', { class: 'schemes__file', text: scheme.file }) : null,
                E('pre', { class: 'schemes__code' }, E('code', { text: scheme.code }))
            );
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Overview - what the Object Library is, in one panel
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderOverview = function (body) {
        const E       = App.ValeObjectLibrary_El;
        const counts  = App.ValeObjectLibrary_LibraryCounts();
        const scheme  = Model.trees.scheme;
        const shelves = Model.trees.library.root.children.length;
        const pieces  = App.ValeObjectLibrary_PieceCount(scheme.root);
        const top     = Model.resources.slice().sort(function (a, b) { return b.users.length - a.users.length; })[0];
        const meta    = Data.meta || {};

        App.ValeObjectLibrary_Put(body, 
            E('div', { class: 'insp-kicker', text: 'Vale Garden Houses' }),
            E('h2', { class: 'insp-title', text: (meta.title || 'Object Library') + ': how it is built' }),
            E('p', { class: 'insp-lead', text: 'One shared library of objects, from whole Families down to single profiles, materials and finishes. Every Scheme is configured from it, so each object is defined once and reused everywhere.' }),
            E('div', { class: 'tiles tiles--2' },
                App.ValeObjectLibrary_Tile(counts.records, 'records in the library, in ' + shelves + ' collections'),
                App.ValeObjectLibrary_Tile(scheme.placements.length, 'places they are used in ' + scheme.root.def.name),
                App.ValeObjectLibrary_Tile(pieces, 'pieces to make or buy, counted automatically'),
                top ? App.ValeObjectLibrary_Tile(top.users.length, 'objects use ' + top.name + ', the most shared resource') : null)
        );

        // The two views of the same records
        const viewButton = function (view, label) {
            return E('button', { type: 'button', class: 'btn btn--quiet' + (State.view === view ? ' is-current' : ''), onclick: function () {
                    App.ValeObjectLibrary_SetView(view);
                } }, label);
        };
        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Three ways to look', null,
            E('p', { class: 'body-text', text: 'Scheme shows one configured project, ' + scheme.root.def.name + ', and only what it uses. Whole library shows every record around Vale Object Library. Resource schemes shows how costing writes a paint finish and a timber: one resource, several attribute blocks.' }),
            E('div', { class: 'view-buttons' }, viewButton('scheme', 'Show the scheme'), viewButton('library', 'Show the whole library'), viewButton('schemes', 'Show resource schemes'))));

        // The tiers - also the colour legend; a click opens the chart to that level
        const tierRows = ['scheme', 'family', 'assembly', 'component', 'product', 'resource'].map(function (key) {
            const tier  = Data.tiers[key];
            const level = { scheme: 'scheme', family: 'family', assembly: 'assembly', component: 'parts', product: 'parts', resource: 'all' }[key];
            return E('button', { type: 'button', class: 'row row--legend', title: 'Open the chart to this level', onclick: function () {
                    App.ValeObjectLibrary_SetDetail(level);
                    App.ValeObjectLibrary_FitAll();
                } },
                App.ValeObjectLibrary_Dot(tier.colour),
                E('span', { class: 'row__main' },
                    E('span', { class: 'row__name', text: tier.code + '  ' + tier.label }),
                    E('span', { class: 'row__sub', text: tier.summary })),
                E('span', { class: 'row__count', text: counts[key] }));
        });
        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Six kinds of object', 'records', E('div', { class: 'rows' }, tierRows)));

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Reading the chart', null, App.ValeObjectLibrary_ReadingKey()));

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Configuration engine', null,
            E('p', { class: 'body-text', text: 'Rules, parameters and constraints decide how objects can be selected, sized and combined, so every option stays buildable. Each Scheme stores its own sizes and quantities; the library keeps the definitions.' }),
            E('div', { class: 'chips' }, (Data.ruleTypes || []).map(function (rule) { return E('span', { class: 'chip chip--static', text: rule }); }))));

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Linked assets', null,
            E('p', { class: 'body-text', text: 'Any object can link to the files behind it:' }),
            E('div', { class: 'chips' }, (Data.assetTypes || []).map(function (asset) { return E('span', { class: 'chip chip--static', text: asset }); }))));

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Getting around', null,
            E('div', { class: 'controls-list' },
                E('span', null, E('kbd', { text: 'Scroll' })), E('span', { text: 'Runtime.Zoom at the pointer' }),
                E('span', null, E('kbd', { text: 'Drag' })), E('span', { text: 'Pan (left or middle button)' }),
                E('span', null, E('kbd', { text: 'Click' })), E('span', { text: 'Open a box and see its details' }),
                E('span', null, E('kbd', { text: 'F' })), E('span', { text: 'Fit everything on screen' }),
                E('span', null, E('kbd', { text: '/' })), E('span', { text: 'Find an object' }))));

        App.ValeObjectLibrary_Put(body, E('div', { class: 'insp-foot' },
            'Every box is generated from ', E('code', { class: 'code', text: '02_Data/ValeObjectLibrary__LibraryData__.js' }),
            (meta.updated ? ', updated ' + meta.updated : '') + '. Example values are illustrative. ',
            E('a', { href: 'ValeObjectLibrary__Demo__.html', text: 'Demo 1' }), ' is the earlier static page.'));
    };

    // SUB FUNCTION | Small drawn samples of each mark on the chart
    App.ValeObjectLibrary_ReadingKey = function () {
        const E = App.ValeObjectLibrary_El;
        function sample(markup) {
            const holder = document.createElement('span');
            holder.innerHTML = '<svg width="56" height="22" viewBox="0 0 56 22" aria-hidden="true">' + markup + '</svg>';   // <-- Static markup only, no data
            return holder.firstChild;
        }
        const link    = 'stroke="#b2bfcb" stroke-width="1.5" fill="none"';
        const rows = [
            [sample('<path d="M2 4H20Q26 4 26 10V12Q26 18 32 18H54" ' + link + '/>'), 'Contains: each box is made of the boxes to its right'],
            [sample('<path d="M2 16C22 16 34 6 54 6" stroke="' + App.ValeObjectLibrary_TierColour('resource') + '" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>'), 'Uses a shared Resource from the library column'],
            [sample('<rect x="10" y="3" width="30" height="17" rx="8.5" fill="#e9eef3"/><text x="25" y="15.5" text-anchor="middle" font-size="11" font-weight="700" fill="#172b3a">×4</text>'), 'Quantity inside the box to its left'],
            [sample('<rect x="15.5" y="4.5" width="9" height="9" rx="2" fill="#fff" stroke="#5d6d7c" stroke-width="1.3"/><rect x="11.5" y="8.5" width="9" height="9" rx="2" fill="#fff" stroke="#5d6d7c" stroke-width="1.3"/><text x="27" y="17" font-size="11" font-weight="700" fill="#5d6d7c">2</text>'), 'One library record, used in two places'],
            [sample('<rect x="12" y="1" width="32" height="20" rx="10" fill="#172b3a"/><text x="28" y="15" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">+6</text>'), 'Six more inside: click the box to open it']
        ];
        return E('div', null, rows.map(function (row) {
            return E('div', { class: 'key-row' }, row[0], E('span', { text: row[1] }));
        }));
    };
    // ------------------------------------------------------------

    // FUNCTION | Details for one placed object
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderPlacement = function (body, placement) {
        const E          = App.ValeObjectLibrary_El;
        const def        = placement.def;
        const tier       = Data.tiers[placement.tier];
        const colour     = tier.colour;
        const inLibrary  = placement.tree === 'library';
        const schemeName = App.ValeObjectLibrary_SchemeName();
        const inScheme   = def.placementsIn.scheme || [];

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_BackButton());

        const route = [];
        for (let node = placement.parent; node; node = node.parent) {
            route.unshift(node);
        }
        if (route.length) {
            const crumbs = E('nav', { class: 'insp-crumbs', 'aria-label': inLibrary ? 'Where it sits in the library' : 'Where it sits in the scheme' });
            route.forEach(function (node, index) {
                if (index) {
                    crumbs.append(E('span', { text: '›', 'aria-hidden': 'true' }));
                }
                crumbs.append(E('button', { type: 'button', text: node.def.name, onclick: function () { App.ValeObjectLibrary_GoTo(node); } }));
            });
            App.ValeObjectLibrary_Put(body, crumbs);
        }

        if (App.ValeObjectLibrary_IsStructural(placement.tier)) {
            App.ValeObjectLibrary_RenderShelf(body, placement);
            return;
        }

        App.ValeObjectLibrary_Put(body, 
            E('div', { class: 'insp-tier' }, App.ValeObjectLibrary_Dot(colour), E('span', { text: tier.code + ' · ' + App.ValeObjectLibrary_TierLabel(placement) }), E('span', { class: 'insp-id', text: def.id })),
            E('h2', { class: 'insp-title', text: def.name }),
            def.summary ? E('p', { class: 'insp-lead', text: def.summary }) : null
        );

        // Headline numbers - the library view counts across the library and the example scheme
        let tiles;
        if (inLibrary) {
            tiles = [App.ValeObjectLibrary_Tile(def.containedBy.size, def.containedBy.size === 1 ? 'assembly is built with it' : 'assemblies are built with it'),
                     App.ValeObjectLibrary_Tile(inScheme.length, (inScheme.length === 1 ? 'place in ' : 'places in ') + schemeName),
                     App.ValeObjectLibrary_Tile(def.totalIn.scheme || 0, 'in ' + schemeName + ', multiplied up')];
        } else if (placement.tier === 'scheme') {
            tiles = [App.ValeObjectLibrary_Tile(placement.children.length, 'families'),
                     App.ValeObjectLibrary_Tile(Model.placements.length - 1, 'objects placed'),
                     App.ValeObjectLibrary_Tile(App.ValeObjectLibrary_PieceCount(placement), 'pieces to make or buy')];
        } else if (placement.tier === 'family') {
            tiles = [App.ValeObjectLibrary_Tile(placement.children.length, 'items directly inside'),
                     App.ValeObjectLibrary_Tile(App.ValeObjectLibrary_PieceCount(placement), 'pieces to make or buy'),
                     App.ValeObjectLibrary_Tile(App.ValeObjectLibrary_RollUp(placement).length, 'different parts inside')];
        } else {
            tiles = [App.ValeObjectLibrary_Tile('×' + placement.qty, 'in ' + placement.parent.def.name),
                     App.ValeObjectLibrary_Tile(def.placements.length, def.placements.length === 1 ? 'place in the scheme' : 'places in the scheme'),
                     App.ValeObjectLibrary_Tile(def.totalQty, 'in total, all multiplied up')];
        }
        App.ValeObjectLibrary_Put(body, E('div', { class: 'tiles' }, tiles));

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('What is ' + App.ValeObjectLibrary_Article(tier.label) + ' ' + tier.label + '?', null,
            E('p', { class: 'callout', style: '--tier-colour:' + colour, text: tier.definition })), 'definition'));

        // What it is made of, one level down
        if (placement.children.length) {
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('Built from', App.ValeObjectLibrary_Plural(placement.children.length, 'item', 'items'),
                E('div', { class: 'rows' }, placement.children.map(function (child) {
                    const inside = child.children.length ? ' · ' + App.ValeObjectLibrary_Plural(child.children.length, 'item', 'items') + ' inside' : '';
                    return App.ValeObjectLibrary_Row({ colour: App.ValeObjectLibrary_TierColour(child.tier), name: child.def.name, sub: App.ValeObjectLibrary_TierLabel(child) + inside,
                        qty: '×' + child.qty, onClick: function () { App.ValeObjectLibrary_GoTo(child); } });
                }))), 'built'));

            // Everything inside, multiplied out - the bill of materials
            const bill  = App.ValeObjectLibrary_RollUp(placement);
            const total = bill.reduce(function (sum, line) { return sum + line.qty; }, 0);
            const title = placement.tier === 'scheme' ? 'Bill of materials, whole scheme'
                        : placement.tier === 'family' ? 'Everything in the ' + def.name
                        : 'Everything in one ' + def.name;
            if (bill.length) {
                App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section(title, total + ' pieces',
                    E('div', { class: 'rows' }, bill.map(function (line) {
                        return App.ValeObjectLibrary_Row({ colour: App.ValeObjectLibrary_TierColour(line.def.tier), name: line.def.name, sub: Data.tiers[line.def.tier].label,
                            qty: line.qty, onClick: function () { App.ValeObjectLibrary_GoTo(line.first); } });
                    }))), 'bom'));
            }
        }

        // Resources named by this object. What is inside it is not repeated here.
        if (App.ValeObjectLibrary_OwnsResources(placement.tier)) {
            if (def.uses.length) {
                App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('Resources on this ' + tier.label.toLowerCase(), App.ValeObjectLibrary_Plural(def.uses.length, 'resource', 'resources'),
                    E('p', { class: 'body-text', text: 'Only what this ' + tier.label.toLowerCase() + ' names. Open a part inside it to see that part\'s own resources.' }),
                    App.ValeObjectLibrary_ResourceGroups(def.uses)), 'uses'));
            } else {
                App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('Resources on this ' + tier.label.toLowerCase(), null,
                    E('p', { class: 'body-text muted', text: 'None are attached here. Open a component or product inside to see the resources that part names.' })), 'uses'));
            }
        }

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_DataPointsSection(def), 'data'));

        if (def.rules.length) {
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('Rules', 'configuration engine', def.rules.map(function (rule) {
                return E('div', { class: 'rule' }, E('div', { class: 'rule__type', text: rule.type }), E('div', { class: 'rule__text', text: rule.text }));
            })), 'rules'));
        }

        // Compatibility - what it is made to work with, both ways round
        if (def.compatible.size) {
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('Works with', 'compatibility',
                def.data['For use with'] ? E('p', { class: 'body-text', text: 'For use with ' + def.data['For use with'] + '.' }) : null,
                E('div', { class: 'chips' }, Array.from(def.compatible).map(function (id) { return App.ValeObjectLibrary_RecordChip(Model.defs.get(id)); }))), 'works-with'));
        }

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_AssetsSection(def), 'assets'));

        // Library view - what it is part of, and where the example scheme uses it
        if (inLibrary) {
            if (def.containedBy.size) {
                App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Part of', App.ValeObjectLibrary_Plural(def.containedBy.size, 'assembly', 'assemblies'),
                    E('div', { class: 'chips' }, Array.from(def.containedBy).map(App.ValeObjectLibrary_RecordChip))));
            }
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section('In ' + schemeName, inScheme.length ? App.ValeObjectLibrary_Plural(inScheme.length, 'place', 'places') : 'not used',
                inScheme.length
                    ? E('div', { class: 'rows' }, inScheme.map(function (other) {
                        return App.ValeObjectLibrary_Row({ colour: App.ValeObjectLibrary_TierColour(other.parent.tier), name: App.ValeObjectLibrary_RouteText(other) || schemeName,
                            sub: '×' + other.qty + ' here · ' + other.total + ' in the scheme', onClick: function () { App.ValeObjectLibrary_GoTo(other); } });
                    }))
                    : E('p', { class: 'body-text muted', text: 'Not used in ' + schemeName + ' - in the library, ready for the next scheme.' })), 'in-scheme'));
            return;
        }

        // Every place the same record is used
        if (def.placements.length > 1) {
            App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Section('Used in ' + def.placements.length + ' places', 'same record',
                E('div', { class: 'rows' }, def.placements.map(function (other) {
                    return App.ValeObjectLibrary_Row({ colour: App.ValeObjectLibrary_TierColour(other.parent.tier), name: App.ValeObjectLibrary_RouteText(other),
                        sub: '×' + other.qty + ' here · ' + other.total + ' in the scheme', current: other === placement,
                        onClick: function () { App.ValeObjectLibrary_GoTo(other); } });
                })),
                E('button', { type: 'button', class: 'btn btn--quiet btn--block', onclick: function () {
                        const opened = App.ValeObjectLibrary_RevealDef(def.id);
                        if (opened) {
                            App.ValeObjectLibrary_Refresh();
                        }
                        App.ValeObjectLibrary_FitBox(App.ValeObjectLibrary_BoxOf(def.placements.map(function (p) { return App.ValeObjectLibrary_NearestVisible(p).uid; }), []), { maxK: 1 });
                    } },
                    App.ValeObjectLibrary_Icon('target'), 'Show all ' + def.placements.length + ' on the chart')));
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | The library root and its category shelves
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RenderShelf = function (body, placement) {
        const E          = App.ValeObjectLibrary_El;
        const def        = placement.def;
        const tier       = Data.tiers[placement.tier];
        const schemeName = App.ValeObjectLibrary_SchemeName();
        const records    = placement.tier === 'library'
            ? Model.trees.library.placements.filter(function (p) { return p.parent && p.parent.tier === 'category'; })
            : placement.children;
        function inScheme(node) {
            if (node.tier === 'range') {
                return node.children.some(inScheme);
            }
            return (node.def.placementsIn.scheme || []).length > 0;
        }
        const used       = records.filter(inScheme).length;
        const holding    = records[0] && records[0].tier === 'range' ? 'range' : 'record';
        const what       = placement.tier === 'library' ? 'the Object Library' : placement.tier === 'range' ? 'a Range' : 'a Collection';
        const listTitle  = placement.tier === 'library' ? 'Collections' : placement.tier === 'range' ? 'In this range' : (holding === 'range' ? 'Ranges' : 'In this collection');

        App.ValeObjectLibrary_Put(body, 
            E('div', { class: 'insp-tier' }, App.ValeObjectLibrary_Dot(tier.colour), E('span', { text: tier.label })),
            E('h2', { class: 'insp-title', text: def.name }),
            def.summary ? E('p', { class: 'insp-lead', text: def.summary }) : null,
            E('div', { class: 'tiles' },
                placement.tier === 'library'
                    ? App.ValeObjectLibrary_Tile(placement.children.length, 'collections')
                    : App.ValeObjectLibrary_Tile(records.length, records.length === 1 ? holding + ' here' : holding + 's here'),
                App.ValeObjectLibrary_Tile(used, 'used in ' + schemeName),
                App.ValeObjectLibrary_Tile(records.length - used, 'ready for the next scheme')),
            App.ValeObjectLibrary_Section('What is ' + what + '?', null,
                E('p', { class: 'callout', style: '--tier-colour:' + tier.colour, text: tier.definition }))
        );

        App.ValeObjectLibrary_Put(body, App.ValeObjectLibrary_Keyed(App.ValeObjectLibrary_Section(listTitle, App.ValeObjectLibrary_Plural(placement.children.length, 'item', 'items'),
            E('div', { class: 'rows' }, placement.children.map(function (child) {
                const code   = child.def.data['Product Code'];
                const inside = child.children.length ? App.ValeObjectLibrary_Plural(child.children.length, 'item', 'items') + ' inside' : '';
                const sub    = child.tier === 'category' || child.tier === 'range'
                    ? (child.def.summary || '')
                    : [App.ValeObjectLibrary_TierLabel(child), code, inside, App.ValeObjectLibrary_IsUnavailable(child.def) ? 'unavailable' : ''].filter(Boolean).join(' · ');
                return App.ValeObjectLibrary_Row({ colour: App.ValeObjectLibrary_TierColour(child.tier), name: child.def.name, sub: sub,
                    qty: (child.tier === 'category' || child.tier === 'range') ? child.children.length : undefined, onClick: function () { App.ValeObjectLibrary_GoTo(child); } });
            }))), 'built'));
    };
    // ------------------------------------------------------------

    // FUNCTION | Data points - the fields every object of this tier holds
    // ------------------------------------------------------------
    // A value comes from the record's own data, from the Resources it uses
    // (Profile, Material, Finish, Specification), from its id (codes), or
    // reads "Set by the scheme" for a parameter each Scheme decides.
    App.ValeObjectLibrary_DataPointsSection = function (def) {
        const E      = App.ValeObjectLibrary_El;
        const tier   = Data.tiers[def.tier];
        const fields = new Map();
        Model.groups.forEach(function (group) {
            if (group.field) {
                fields.set(group.field, group);
            }
        });
        let filled = 0;
        const fieldList = tier.dataPoints || [];
        const rows = fieldList.map(function (field) {
            let cell;
            const own = def.data[field];
            if (own !== undefined && own !== null && own !== '') {
                cell = E('td', { text: own });
            } else if (fields.has(field) && def.tier !== 'resource') {
                const used = def.uses.map(function (id) { return Model.defs.get(id); }).filter(function (resource) { return resource && resource.group === fields.get(field).key; });
                if (used.length > 8) {
                    cell = E('td', { text: used.length + ' finishes on the Vale paint card. Listed under Resources on this object.' });
                } else {
                    cell = used.length ? E('td', null, E('div', { class: 'chips' }, used.map(App.ValeObjectLibrary_ResourceChip))) : null;
                }
            } else if ((/ Code$/.test(field) && def.tier !== 'product') || field === 'Scheme Reference') {
                cell = E('td', null, E('span', { class: 'code', text: def.id }));   // <-- A product's code is its catalogue code, so no stand-in
            } else if (field === 'Category' && def.tier === 'resource') {
                cell = E('td', { text: def.group });
            } else if (def.params.indexOf(field) !== -1) {
                cell = E('td', null, E('span', { class: 'pill', text: 'Set by the scheme' }));
            }
            if (cell) {
                filled += 1;
            } else {
                cell = E('td', { class: 'muted', text: '—' });
            }
            return E('tr', null, E('th', { scope: 'row', text: field }), cell);
        });

        // Anything else the record holds, e.g. "For use with", "Hinge Style", a colour swatch
        Object.keys(def.data).forEach(function (field) {
            if (fieldList.indexOf(field) !== -1) {
                return;
            }
            const value = def.data[field];
            const cell  = field === 'Swatch'
                ? E('td', null, App.ValeObjectLibrary_Swatch(value), ' ', E('span', { class: 'code', text: value }))
                : E('td', { text: value });
            rows.push(E('tr', { class: 'dp__extra' }, E('th', { scope: 'row', text: field === 'Swatch' ? 'Colour' : field }), cell));
        });
        return App.ValeObjectLibrary_Section('Data points', fieldList.length ? filled + ' of ' + fieldList.length + ' filled' : null,
            E('table', { class: 'dp' }, E('tbody', null, rows)));
    };
    // ------------------------------------------------------------

    // FUNCTION | Linked assets for one record
    // ------------------------------------------------------------
    App.ValeObjectLibrary_AssetsSection = function (def) {
        const E = App.ValeObjectLibrary_El;
        if (!def.assets.length) {
            return App.ValeObjectLibrary_Section('Linked assets', null,
                E('p', { class: 'body-text muted', text: 'Nothing linked yet. Any object can carry CAD, SketchUp models, PDF drawings, data sheets and photographs.' }));
        }
        return App.ValeObjectLibrary_Section('Linked assets', def.assets.length + ' linked',
            E('div', { class: 'chips' }, def.assets.map(function (asset) {
                return E('span', { class: 'chip chip--static chip--linked' }, App.ValeObjectLibrary_Icon('check'), asset);
            })));
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
