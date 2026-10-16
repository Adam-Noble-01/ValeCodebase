/* =============================================================================
 * VALE OBJECT LIBRARY - LIBRARY RECORDS AND THE SCHEME AND LIBRARY TREES
 * =============================================================================
 *
 * FILE       : ValeObjectLibrary__Model__.js
 * NAMESPACE  : ValeObjectLibrary
 * MODULE     : Data Model
 * AUTHOR     : Adam Noble - Noble Architecture
 * PURPOSE    : Library records and the scheme and library trees
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
 * 16-Oct-2026 - Version 2.0.3
 * - A collection keeps the family it belongs to, so the network can sit related shelves together
 *
 * ============================================================================= */

(function (App) {
    'use strict';

    const Data  = App.Data;
    const Model = App.Model;

    // =====================================================================
    // REGION | Data Model - Library Records and Two Placement Trees
    // =====================================================================
    // A definition is one library record (a Door Assembly, a Hinge). A
    // placement is that record at one position in a tree, with its
    // quantity. The chart draws placements; the panel explains definitions.
    // The same Door Assembly placed in the North and South Elevations is one
    // definition with two placements - that is the reuse the chart shows.
    // Two trees are built from the same definitions:
    //   scheme  - Scheme > Families > what the example project uses
    //   library - Object Library > Category shelves > every record, with
    //             assemblies opening up to what they are made of
    // =====================================================================

    // FUNCTION | Report a data problem without stopping the chart
    // ------------------------------------------------------------
    App.ValeObjectLibrary_Issue = function (message) {
        Model.issues.push(message);
        console.warn('[ValeObjectLibrary] ' + message);
    };
    // ------------------------------------------------------------

    // FUNCTION | Register one record from the data file as a definition
    // ------------------------------------------------------------
    // Primary materials are bought, not made, so they name a supplier only.
    App.ValeObjectLibrary_ProcurementNames = function (def) {
        const byId = {
            'RES-MAT-SAPELE'      : { supplier: 'Sapele Sawmills PLC' },
            'RES-MAT-DOUGLAS-FIR' : { supplier: 'Fir Tree Timber PLC' },
            'RES-MAT-TULIPWOOD'   : { supplier: 'Tulipwood Traders Ltd' },
            'RES-MAT-ACCOYA'      : { supplier: 'Accoya Agency Ltd' },
            'RES-MAT-OAK'         : { supplier: 'Acorn Oak Ltd' },
            'RES-MAT-ALUMINIUM'   : { supplier: 'Ingot & Bar PLC' },
            'RES-MAT-LEAD'        : { supplier: 'Heavy Metal Ltd' },
            'RES-MAT-SHEET'       : { supplier: 'Sheet Goods PLC' },
            'RES-MAT-BOARD'       : { supplier: 'Board & Batten Ltd' }
        };
        const byGroup = {
            'Plywood Sheets'    : { supplier: 'Plywood PLC' },
            'Aluminium Sheets'  : { supplier: 'Blank Metal PLC' },
            'OSB'               : { supplier: 'Strand Board PLC' },
            'Paint Finishes'    : { supplier: 'Paint Pot PLC', manufacturer: 'Eggshell Works Ltd' },
            'Profiles'          : { supplier: 'Section Sellers Ltd', manufacturer: 'Profile Pressings Ltd' },
            'Finishes'          : { supplier: 'Swatch & Co', manufacturer: 'Powder Coat Palace' },
            'Specifications'    : { supplier: 'Spec Sheet Ltd', manufacturer: 'Standard & Co' },
            'Ironmongery'       : { supplier: 'Knob & Knock PLC', manufacturer: 'Lever & Latch Ltd' },
            'Roof Finials'      : { supplier: 'Urn & Acorn Ltd', manufacturer: 'Finial Foundry' },
            'Roof Crestings'    : { supplier: 'Crest & Trefoil Ltd', manufacturer: 'Ridge Castings PLC' },
            'Columns'           : { supplier: 'Capital & Base Ltd', manufacturer: 'Column & Co' },
            'Pilasters'         : { supplier: 'Capital & Base Ltd', manufacturer: 'Column & Co' },
            'Internal Columns'  : { supplier: 'Capital & Base Ltd', manufacturer: 'Column & Co' },
            'Doors and Windows' : { supplier: 'Stile & Rail Ltd', manufacturer: 'Door Leaf Works' },
            'Rainwater Goods'   : { supplier: 'Hopper & Pipe PLC', manufacturer: 'Downpipe Foundry' },
            'Roof Lantern'      : { supplier: 'Lantern Bits Ltd', manufacturer: 'Glaze Bar Works' },
            'Entablatures'      : { supplier: 'Frieze & Cornice Ltd', manufacturer: 'Entablature Works' },
            'Tie Bars and Lighting' : { supplier: 'Tie & Hook Ltd', manufacturer: 'Quatrefoil Castings' },
            'Framework'         : { supplier: 'Upright Timber PLC', manufacturer: 'Section Shop Ltd' },
            'Misc Internal Joinery' : { supplier: 'Skirting & Bead Ltd', manufacturer: 'Joinery Bits PLC' },
            'Eaves and Gutters' : { supplier: 'Gutter & Eaves Ltd', manufacturer: 'Belton Gutter Works' }
        };
        const primary = def.resourceType === 'TimberMaterial' || def.resourceType === 'SheetMaterial' || def.group === 'Materials';
        const named   = byId[def.id] || byGroup[def.group] || byGroup[def.category] || byGroup[def.range];
        const house   = named || { supplier: 'General Goods PLC', manufacturer: 'Made Up Manufacturing Ltd' };
        if (primary) {
            return { supplier: house.supplier };
        }
        return {
            supplier     : house.supplier,
            manufacturer : house.manufacturer || 'Made Up Manufacturing Ltd'
        };
    };

    App.ValeObjectLibrary_NamedUses = function (def, groups) {
        const wanted = {};
        groups.forEach(function (group) { wanted[group] = true; });
        const names = [];
        (def.uses || []).forEach(function (id) {
            const resource = Model.defs.get(id);
            if (resource && wanted[resource.group] && names.indexOf(resource.name) === -1) {
                names.push(resource.name);
            }
        });
        return names.length ? names.join(', ') : 'None named';
    };

    App.ValeObjectLibrary_SizeNote = function (def, field) {
        if (def.data[field]) {
            return def.data[field];
        }
        if ((def.params || []).indexOf(field) !== -1) {
            return 'Set by the scheme';
        }
        return 'Not recorded';
    };

    App.ValeObjectLibrary_ApplyStandardSections = function (def) {
        if (def.tier !== 'component' && def.tier !== 'product') {
            return;
        }
        const names = App.ValeObjectLibrary_ProcurementNames(def);
        const procurement = { Procurement__Supplier: names.supplier };
        if (names.manufacturer) {
            procurement.Procurement__Manufacturer = names.manufacturer;
        }
        const finishes = App.ValeObjectLibrary_NamedUses(def, ['Finishes', 'Paint Finishes']);
        const materials = App.ValeObjectLibrary_NamedUses(def, ['Materials', 'Plywood Sheets', 'Aluminium Sheets', 'OSB']);
        const sections = def.tier === 'product'
            ? [
                { key: 'Resource__ProductData', label: 'Product', data: {
                    'Vale ID'                  : def.data['Vale ID'] || '',
                    'Range'                    : def.range || def.category || '',
                    'Product Code'             : def.data['Product Code'] || def.data['ValeSpec Code'] || 'Not recorded',
                    'Fixed or Selectable Sizes': def.data['Fixed or Selectable Sizes'] || 'Not recorded',
                    'Availability / Status'    : def.data['Availability / Status'] || 'Available'
                } },
                { key: 'Resource__ProcurementData', label: 'Procurement', data: procurement },
                { key: 'Resource__FinishData', label: 'Finishes', data: { Finish: finishes } },
                { key: 'Resource__MaterialData', label: 'Material', data: { Material: materials } },
                { key: 'Resource__CostingData', label: 'Costing', data: {
                    Cost   : def.data.Cost || 'Not recorded',
                    Weight : def.data.Weight || 'Not recorded'
                } },
                { key: 'Resource__AssetData', label: 'Assets', data: {
                    'CAD / 3D Asset': (def.assets && def.assets.length) ? def.assets.join(', ') : 'Nothing linked yet'
                } }
            ]
            : [
                { key: 'Resource__ComponentData', label: 'Component', data: {
                    'Vale ID'               : def.data['Vale ID'] || '',
                    'Component Code'        : def.id,
                    'Manufacturing Method'  : def.data['Manufacturing Method'] || 'Not recorded'
                } },
                { key: 'Resource__ProcurementData', label: 'Procurement', data: procurement },
                { key: 'Resource__ProfileData', label: 'Profile', data: {
                    Profile: App.ValeObjectLibrary_NamedUses(def, ['Profiles'])
                } },
                { key: 'Resource__MaterialData', label: 'Material', data: { Material: materials } },
                { key: 'Resource__FinishData', label: 'Finishes', data: {
                    'Finish'       : App.ValeObjectLibrary_NamedUses(def, ['Finishes']),
                    'Paint Finish' : App.ValeObjectLibrary_NamedUses(def, ['Paint Finishes'])
                } },
                { key: 'Resource__SpecificationData', label: 'Specification', data: {
                    Specification: App.ValeObjectLibrary_NamedUses(def, ['Specifications'])
                } },
                { key: 'Resource__SizeData', label: 'Size', data: {
                    Length : App.ValeObjectLibrary_SizeNote(def, 'Length'),
                    Width  : App.ValeObjectLibrary_SizeNote(def, 'Width'),
                    Depth  : App.ValeObjectLibrary_SizeNote(def, 'Depth')
                } }
            ];
        sections.forEach(function (section) {
            let existing = null;
            def.attributes.forEach(function (attribute) {
                if (attribute.key === section.key) {
                    existing = attribute;
                }
            });
            if (existing) {
                Object.keys(section.data).forEach(function (key) {
                    if (existing.data[key] === undefined || existing.data[key] === '') {
                        existing.data[key] = section.data[key];
                    }
                });
            } else {
                def.attributes.push(section);
            }
        });
        def.data.Supplier = names.supplier;
        if (names.manufacturer) {
            def.data.Manufacturer = names.manufacturer;
        }
        delete def.data['Supplier / Manufacturer'];
    };

    App.ValeObjectLibrary_ApplyProcurement = function (def) {
        const names = App.ValeObjectLibrary_ProcurementNames(def);
        let block = null;
        def.attributes.forEach(function (attribute) {
            if (attribute.key === 'Resource__ProcurementData') {
                block = attribute;
            }
        });
        if (block) {
            block.data.Procurement__Supplier = names.supplier;
            if (names.manufacturer) {
                block.data.Procurement__Manufacturer = names.manufacturer;
            } else {
                delete block.data.Procurement__Manufacturer;
            }
        } else if (def.tier === 'resource' || def.tier === 'component' || def.tier === 'product' || def.tier === 'assembly') {
            const data = { Procurement__Supplier: names.supplier };
            if (names.manufacturer) {
                data.Procurement__Manufacturer = names.manufacturer;
            }
            def.attributes.push({ key: 'Resource__ProcurementData', label: 'Procurement', data: data });
        }
        def.data.Supplier = names.supplier;
        if (names.manufacturer) {
            def.data.Manufacturer = names.manufacturer;
        }
        delete def.data['Supplier / Manufacturer'];
    };

    App.ValeObjectLibrary_AddDefinition = function (record, tier) {
        if (!record || !record.id) {
            App.ValeObjectLibrary_Issue('A ' + tier + ' record has no id and was skipped.');
            return null;
        }
        if (Model.defs.has(record.id)) {
            App.ValeObjectLibrary_Issue('The id ' + record.id + ' is used twice - the second record was skipped.');
            return null;
        }
        const def = {
            id          : record.id,
            tier        : tier,
            name        : record.name || record.id,
            summary     : record.summary || '',
            group       : record.group || null,
            category    : record.category || null,
            range       : record.range || null,
            data        : Object.assign({}, record.data || {}),
            attributes  : (record.attributes || []).map(function (attribute) {
                return { key: attribute.key, label: attribute.label, data: Object.assign({}, attribute.data || {}) };
            }),
            cardOrder   : record.cardOrder || 0,
            paintNumber : record.paintNumber || 0,
            resourceType: record.resourceType || '',
            params      : record.params || [],
            uses        : (record.uses || []).slice(),
            contains    : record.contains || [],
            rules       : record.rules || [],
            assets      : record.assets || [],
            worksWith   : record.worksWith || [],
            compatible  : new Set(),                                         // <-- worksWith, both ways round
            containedBy : new Set(),                                         // <-- assemblies whose "contains" list this record
            placementsIn: {},                                                // <-- per tree: every placement of this record
            totalIn     : {},                                                // <-- per tree: quantity, all multiplied up
            placements  : [],                                                // <-- the tree on show (see SetView)
            users       : [],
            totalQty    : 0
        };
        const assigned = Data.valeIds && Data.valeIds[def.id];
        const lantern  = def.data['Lantern Asset ID'];
        const valeId   = def.data['Vale ID'] || assigned || lantern;
        if (valeId) {
            def.data['Vale ID'] = valeId;                                   // <-- Lantern style, one code per record
        }
        App.ValeObjectLibrary_ApplyProcurement(def);
        App.ValeObjectLibrary_ApplyStandardSections(def);
        Model.defs.set(def.id, def);
        return def;
    };
    // ------------------------------------------------------------

    // FUNCTION | Create one placement of a definition under a parent, in one tree
    // ------------------------------------------------------------
    App.ValeObjectLibrary_MakePlacement = function (tree, def, parent, qty, nest) {
        const base = parent ? parent.uid + '/' + def.id : tree.key + ':' + def.id;
        let uid = base;
        let copy = 2;
        while (tree.byUid.has(uid)) {
            uid = base + '~' + (copy++);                                     // <-- Same record twice under one parent
        }
        const placement = {
            uid      : uid,
            tree     : tree.key,
            def      : def,
            tier     : def.tier,
            qty      : qty,
            total    : (parent ? parent.total : 1) * qty,                    // <-- Quantities multiply down the tree
            nest     : nest,
            parent   : parent,
            children : []
        };
        if (parent) {
            parent.children.push(placement);
        }
        tree.byUid.set(uid, placement);
        tree.placements.push(placement);
        (def.placementsIn[tree.key] = def.placementsIn[tree.key] || []).push(placement);
        return placement;
    };
    // ------------------------------------------------------------

    // FUNCTION | Place one { ref, qty } entry, recursing into assemblies
    // ------------------------------------------------------------
    App.ValeObjectLibrary_PlaceEntry = function (tree, entry, parent, nest, chain) {
        const ref = entry && entry.ref;
        const def = Model.defs.get(ref);
        if (!def) {
            if (tree.key === 'scheme') {                                     // <-- Report once, not once per tree
                App.ValeObjectLibrary_Issue(parent.def.name + ' (' + parent.def.id + ') contains "' + ref + '", which is not in the library.');
            }
            return;
        }
        if (def.tier !== 'assembly' && !App.ValeObjectLibrary_IsPart(def.tier)) {
            App.ValeObjectLibrary_Issue(parent.def.name + ' contains ' + def.id + ', a ' + def.tier + ' - only Assemblies, Components and Products can be placed.');
            return;
        }
        if (chain.has(def.id)) {
            App.ValeObjectLibrary_Issue(def.id + ' ends up containing itself - the loop was cut.');
            return;
        }
        const qty = Number(entry.qty) > 0 ? Number(entry.qty) : 1;
        const placement = App.ValeObjectLibrary_MakePlacement(tree, def, parent, qty, def.tier === 'assembly' ? nest : 0);
        if (def.tier === 'assembly') {
            tree.maxNest = Math.max(tree.maxNest, nest);
            const nextChain = new Set(chain);
            nextChain.add(def.id);
            def.contains.forEach(function (child) {
                App.ValeObjectLibrary_PlaceEntry(tree, child, placement, nest + 1, nextChain);
            });
        }
    };
    // ------------------------------------------------------------

    // FUNCTION | Finish a tree - what is inside each box, and the quantity totals
    // ------------------------------------------------------------
    App.ValeObjectLibrary_FinishTree = function (tree) {
        (function collectInside(placement) {
            placement.subtreeUses = new Set(placement.def.uses);
            placement.subtreeDefs = new Set();
            placement.children.forEach(function (child) {
                collectInside(child);
                placement.subtreeDefs.add(child.def.id);
                child.subtreeUses.forEach(function (id) { placement.subtreeUses.add(id); });
                child.subtreeDefs.forEach(function (id) { placement.subtreeDefs.add(id); });
            });
        })(tree.root);
        tree.placements.forEach(function (placement) {
            placement.def.totalIn[tree.key] = (placement.def.totalIn[tree.key] || 0) + placement.total;
        });
    };
    // ------------------------------------------------------------

    // FUNCTION | Build every definition and the placement tree from the data file
    // ------------------------------------------------------------
    // A Range sits between a category and its records, in whole-library
    // view only, so one shelf does not fan every size out at once.
    // Each record is a leaf. Opening an Assembly to see what it contains
    // is the Scheme view. The library is for finding the record.
    App.ValeObjectLibrary_PlaceLibraryRecord = function (tree, def, parent) {
        App.ValeObjectLibrary_MakePlacement(tree, def, parent, 1, 0);
    };

    App.ValeObjectLibrary_LibraryShelf = function (def) {
        if (def.category) {
            return { category: def.category, range: def.range || '' };
        }
        const counts = new Map();
        def.containedBy.forEach(function (owner) {
            if (owner.category) {
                counts.set(owner.category, (counts.get(owner.category) || 0) + 1);
            }
        });
        let category = '';
        let best = 0;
        counts.forEach(function (count, name) {
            if (count > best) {
                category = name;
                best = count;
            }
        });
        return { category: category || 'Other', range: '' };            // <-- A part with no collection of its own sits beside the assemblies that use it
    };

    App.ValeObjectLibrary_PlaceShelfRecords = function (tree, parent, shelf) {
        const groups = new Map();
        const loose  = [];
        shelf.records.forEach(function (entry) {
            const def = entry.def;
            if (!entry.range) {
                loose.push(def);
                return;
            }
            if (!groups.has(entry.range)) {
                groups.set(entry.range, []);
            }
            groups.get(entry.range).push(def);
        });
        const order = shelf.ranges || [];
        Array.from(groups.keys()).sort(function (a, b) {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
        }).forEach(function (name) {
            const list = groups.get(name);
            const slug = (parent.def.id + '-' + name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
            const rangeDef = App.ValeObjectLibrary_AddDefinition({
                id      : 'RNG-' + slug,
                name    : name,
                summary : name + ' in ' + parent.def.name + '.'
            }, 'range');
            if (!rangeDef) {
                return;
            }
            const rangePlacement = App.ValeObjectLibrary_MakePlacement(tree, rangeDef, parent, 1, 0);
            list.forEach(function (def) {
                App.ValeObjectLibrary_PlaceLibraryRecord(tree, def, rangePlacement);
            });
        });
        loose.forEach(function (def) {
            App.ValeObjectLibrary_PlaceLibraryRecord(tree, def, parent);
        });
    };

    App.ValeObjectLibrary_BuildModel = function () {
        (Data.resourceGroups || []).forEach(function (group) {
            Model.groups.set(group.key, { key: group.key, singular: group.singular || group.key, field: group.field || null, items: [] });
        });

        (Data.resources || []).forEach(function (record) {
            const def = App.ValeObjectLibrary_AddDefinition(record, 'resource');
            if (!def) {
                return;
            }
            if (!Model.groups.has(def.group)) {
                App.ValeObjectLibrary_Issue('Resource ' + def.id + ' names the group "' + def.group + '", which is not in resourceGroups.');
                Model.groups.set(def.group, { key: def.group, singular: def.group, field: null, items: [] });
            }
            Model.groups.get(def.group).items.push(def);
        });
        Model.groups.forEach(function (group) {
            group.items.forEach(function (def) { Model.resources.push(def); });   // <-- Library order: group by group
        });

        (Data.library || []).forEach(function (record) {
            if (!record || (record.tier !== 'assembly' && !App.ValeObjectLibrary_IsPart(record.tier))) {
                App.ValeObjectLibrary_Issue('Library record ' + (record && record.id) + ' has the tier "' + (record && record.tier) + '" - use assembly, component or product.');
                return;
            }
            App.ValeObjectLibrary_AddDefinition(record, record.tier);
        });

        Model.defs.forEach(function (def) {
            def.uses = def.uses.filter(function (resourceId) {
                const resource = Model.defs.get(resourceId);
                if (!resource || resource.tier !== 'resource') {
                    App.ValeObjectLibrary_Issue(def.name + ' (' + def.id + ') uses "' + resourceId + '", which is not a Resource.');
                    return false;
                }
                resource.users.push(def);
                return true;
            });
        });

        // Which assemblies contain each record, and what works with what (both ways round)
        Model.defs.forEach(function (def) {
            def.contains.forEach(function (entry) {
                const part = Model.defs.get(entry && entry.ref);
                if (part) {
                    part.containedBy.add(def);
                }
            });
            def.worksWith.forEach(function (id) {
                const other = Model.defs.get(id);
                if (!other || other.tier === 'resource') {
                    App.ValeObjectLibrary_Issue(def.name + ' (' + def.id + ') works with "' + id + '", which is not in the library.');
                    return;
                }
                def.compatible.add(other.id);
                other.compatible.add(def.id);
            });
        });

        // Tree 1 - the example Scheme and only what it uses
        const scheme     = Data.scheme || {};
        const schemeTree = App.ValeObjectLibrary_NewTree('scheme');
        const schemeDef  = App.ValeObjectLibrary_AddDefinition(Object.assign({ id: 'SCHEME', name: 'Scheme' }, scheme), 'scheme');
        schemeTree.root  = App.ValeObjectLibrary_MakePlacement(schemeTree, schemeDef, null, 1, 0);
        (scheme.families || []).forEach(function (record) {
            const familyDef = App.ValeObjectLibrary_AddDefinition(record, 'family');
            if (!familyDef) {
                return;
            }
            const family = App.ValeObjectLibrary_MakePlacement(schemeTree, familyDef, schemeTree.root, 1, 0);
            familyDef.contains.forEach(function (entry) {
                App.ValeObjectLibrary_PlaceEntry(schemeTree, entry, family, 0, new Set());
            });
        });
        App.ValeObjectLibrary_FinishTree(schemeTree);

        // Tree 2 - the whole library: every Assembly, Component and Product
        // sits on a collection so it can be found. Nothing is nested inside
        // an Assembly here. That composition is the Scheme.
        const libraryTree = App.ValeObjectLibrary_NewTree('library');
        const libraryDef  = App.ValeObjectLibrary_AddDefinition({ id: 'LIBRARY', name: 'Vale Object Library', summary: 'Every record in the library, listed by collection so it can be found. A Scheme is where those records are assembled into a project.' }, 'library');
        libraryTree.root  = App.ValeObjectLibrary_MakePlacement(libraryTree, libraryDef, null, 1, 0);
        const familyByName = new Map();
        (Data.collectionFamilies || []).forEach(function (family, index) {
            familyByName.set(family.name, { name: family.name, colour: family.colour || '#e4eaef', index: index });
        });
        const familyOf = function (name) {
            return familyByName.get(name) || familyByName.get('Other') || { name: 'Other', colour: '#e4eaef', index: 99 };
        };
        const shelves = new Map();
        (Data.categories || []).forEach(function (category) {
            const family = familyOf(category.family);
            shelves.set(category.name, { name: category.name, summary: category.summary || '', ranges: category.ranges || [], records: [], family: family });
        });
        const libraryRecords = Array.from(Model.defs.values()).filter(function (def) {
            return def.tier === 'assembly' || App.ValeObjectLibrary_IsPart(def.tier);
        });
        libraryRecords.forEach(function (def) {
            const home = App.ValeObjectLibrary_LibraryShelf(def);
            const shelf = home.category;
            if (!shelves.has(shelf)) {
                shelves.set(shelf, { name: shelf, summary: '', ranges: [], records: [], family: familyOf('Other') });
            }
            shelves.get(shelf).records.push({ def: def, range: home.range });
        });
        shelves.forEach(function (shelf) {
            if (!shelf.records.length) {
                return;
            }
            const slug        = shelf.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
            const categoryDef = App.ValeObjectLibrary_AddDefinition({ id: 'CAT-' + slug, name: shelf.name, summary: shelf.summary }, 'category');
            if (!categoryDef) {
                return;
            }
            categoryDef.shelfFamily = shelf.family.name;                     // <-- Which shaded arc this collection sits on
            categoryDef.shelfWash   = shelf.family.colour;
            categoryDef.shelfOrder  = shelf.family.index;
            const placement = App.ValeObjectLibrary_MakePlacement(libraryTree, categoryDef, libraryTree.root, 1, 0);
            App.ValeObjectLibrary_PlaceShelfRecords(libraryTree, placement, shelf);
        });
        App.ValeObjectLibrary_FinishTree(libraryTree);

        // Resource reach, counted in the Scheme
        Model.resources.forEach(function (resource) {
            resource.placementCount = resource.users.reduce(function (sum, user) { return sum + (user.placementsIn.scheme || []).length; }, 0);
            resource.pieceCount     = resource.users.reduce(function (sum, user) { return sum + (user.totalIn.scheme || 0); }, 0);
        });
    };

    App.ValeObjectLibrary_NewTree = function (key) {
        const tree = { key: key, root: null, placements: [], byUid: new Map(), maxNest: 0 };
        Model.trees[key] = tree;
        return tree;
    };
    // ------------------------------------------------------------

    // FUNCTION | Counts the panel and the column headers quote (whole library)
    // ------------------------------------------------------------
    App.ValeObjectLibrary_LibraryCounts = function () {
        const counts = { scheme: 0, family: 0, assembly: 0, component: 0, product: 0, resource: 0, library: 0, category: 0, range: 0, subassembly: 0 };
        Model.defs.forEach(function (def) {
            counts[def.tier] += 1;
            if (def.tier === 'assembly' && def.containedBy.size) {
                counts.subassembly += 1;
            }
        });
        counts.records = counts.assembly + counts.component + counts.product + counts.resource;
        return counts;
    };

    App.ValeObjectLibrary_PieceCount = function (placement) {
        let pieces = 0;
        (function walk(node, multiplier) {
            node.children.forEach(function (child) {
                const qty = multiplier * child.qty;
                if (App.ValeObjectLibrary_IsPart(child.tier)) {
                    pieces += qty;
                }
                walk(child, qty);
            });
        })(placement, 1);
        return pieces;
    };
    // ------------------------------------------------------------

    // FUNCTION | Bill of materials for one unit of a placement
    // ------------------------------------------------------------
    App.ValeObjectLibrary_RollUp = function (placement) {
        const totals = new Map();
        (function walk(node, multiplier) {
            node.children.forEach(function (child) {
                const qty = multiplier * child.qty;
                if (App.ValeObjectLibrary_IsPart(child.tier)) {
                    const entry = totals.get(child.def.id) || { def: child.def, qty: 0, first: child };
                    entry.qty += qty;
                    totals.set(child.def.id, entry);
                }
                walk(child, qty);
            });
        })(placement, 1);
        return Array.from(totals.values()).sort(function (a, b) {
            return (a.def.tier === b.def.tier ? 0 : a.def.tier === 'component' ? -1 : 1) || a.def.name.localeCompare(b.def.name);
        });
    };
    // ------------------------------------------------------------

    // endregion -----------------------------------------------------------
})(window.ValeObjectLibrary__Modules);
