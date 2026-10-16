/* =============================================================================
   VALE OBJECT LIBRARY - BUILD RESOURCE LIBRARIES
   =============================================================================

   FILE       : Build__ValeResourceLibraries__.js
   NAMESPACE  : ValeObjectLibrary
   MODULE     : Presentation - Resource schema and library builder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Read the resource libraries and write the derived costing records
   CREATED    : 16-Oct-2026

   DESCRIPTION:
   - The authored libraries are JSON, one file per resource type, in
     01__ResourceLibraries. Edit those. Do not put the colour card or the
     timber list back into this script.
   - This build derives the hex, the nearest RAL and the illustrative prices,
     then writes the expanded libraries and the runtime script the demo loads.
   - Re-run after a library change: node Build__ValeResourceLibraries__.js
   - Prices are illustrative, for the presentation, dated 01-Oct-2026.
   - Paint__RAL is the nearest RAL Classic to the Vale RGB. It is derived,
     not a Vale specification.

   ============================================================================= */

'use strict';

const fs   = require('fs');
const path = require('path');

const Here = __dirname;
const Data = path.join(Here, '..', '02_Data', 'ValeObjectLibrary__ResourceLibraries__.js');

// -----------------------------------------------------------------------------
// REGION | Source Libraries - JSON, one file per resource type
// -----------------------------------------------------------------------------
// Authored records live in 01__ResourceLibraries. Edit those JSON files.
// This script derives the hex, the nearest RAL, the illustrative prices,
// and the price per finished linear metre.

const Libraries = path.join(Here, '01__ResourceLibraries');

function readLibrary(fileName, rootKey) {
    const document = JSON.parse(fs.readFileSync(path.join(Libraries, fileName), 'utf8'));
    const library  = document[rootKey];
    if (!library) {
        throw new Error(fileName + ' has no ' + rootKey);
    }
    return Object.keys(library)
        .filter(function (key) { return key.indexOf('Resource__') === 0; })
        .map(function (key) { return library[key]; });
}

collapseLibraryFile('ValeObjectLibrary__Library__PaintColours__.json');
collapseLibraryFile('ValeObjectLibrary__Library__RalClassic__.json');

const PaintSources = readLibrary('ValeObjectLibrary__Library__PaintColours__.json', 'Vale__PaintLibrary')
    .sort(function (a, b) { return a.Resource__CardOrder - b.Resource__CardOrder; });

const Paints = PaintSources.map(function (resource) {
    const channels = colourChannels(resource.Resource__Attributes.Resource__ColourData);
    return [resource.Resource__Number, resource.Resource__Name, channels[0], channels[1], channels[2]];
});

const Ral = readLibrary('ValeObjectLibrary__Library__RalClassic__.json', 'Vale__RalLibrary').map(function (resource) {
    const channels = colourChannels(resource.Resource__Attributes.Resource__ColourData);
    return [resource.Resource__Code.replace('RAL ', ''), resource.Resource__Name, channels[0], channels[1], channels[2]];
});

function boardPair(label) {
    const match = String(label).match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (!match) {
        throw new Error('Board size needs "length x width": ' + label);
    }
    return { length: Number(match[1]), width: Number(match[2]), label: match[1] + ' x ' + match[2] + ' mm' };
}

function thicknessLabel(mm) {
    return String(mm).replace(/\.0$/, '');
}

const SheetFamilies = readLibrary('ValeObjectLibrary__Library__SheetMaterials__.json', 'Vale__SheetLibrary');
const Sheets = [];
SheetFamilies.forEach(function (family) {
    const size = family.Resource__Attributes.Resource__SizeData;
    size.Size__Boards.forEach(function (boardLabel) {
        const board = boardPair(boardLabel);
        size['Size__Thicknesses__mm'].forEach(function (thickness) {
            const thick = thicknessLabel(thickness);
            const code  = family.Resource__CodePrefix + '__l' + board.length + 'xw' + board.width + '__t' + thick + 'mm';
            Sheets.push({
                id         : code,
                code       : code,
                token      : family.Resource__LibraryToken,
                prefix     : family.Resource__CodePrefix,
                family     : family.Resource__Name,
                name       : family.Resource__Name + ' ' + board.length + ' x ' + board.width + ' x ' + thick + ' mm',
                length     : board.length,
                width      : board.width,
                thickness  : thick,
                group      : family.Resource__Name === 'OSB' ? 'OSB' : family.Resource__Name.replace(' Sheet', '') + ' Sheets',
                summary    : family.Resource__Summary,
                attributes : family.Resource__Attributes,
                cardOrder  : Sheets.length + 1
            });
        });
    });
});

const Timbers = readLibrary('ValeObjectLibrary__Library__TimberMaterials__.json', 'Vale__TimberLibrary').map(function (resource) {
    const species     = resource.Resource__Attributes.Resource__SpeciesData;
    const purchase    = resource.Resource__Attributes.Resource__PurchaseData;
    const processing  = resource.Resource__Attributes.Resource__ProcessingData;
    const procurement = resource.Resource__Attributes.Resource__ProcurementData;
    return {
        id           : resource.Resource__LibraryId,
        code         : resource.Resource__Code,
        name         : resource.Resource__Name,
        species      : species.Species__BotanicalName,
        grade        : species.Species__Grade,
        bought       : species.Species__BoughtAs,
        example      : processing.Processing__FinishedSection__Example,
        widthMm      : processing['Processing__SectionWidth__mm'],
        depthMm      : processing['Processing__SectionDepth__mm'],
        pricePerM3   : purchase['Purchase__Price__Per-m3'],
        yield        : processing.Processing__Yield,
        supplier     : procurement.Procurement__Supplier,
        manufacturer : procurement.Procurement__Manufacturer,
        lead         : procurement.Procurement__AverageLeadTime,
        dateAdded    : processing.Price__DateAdded,
        summary      : resource.Resource__Summary
    };
});

// endregion -------------------------------------------------------------------
// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

function pad2(number) {
    return String(number).padStart(2, '0');
}

function hexByte(value) {
    return value.toString(16).toUpperCase().padStart(2, '0');
}

function hexOf(r, g, b) {
    return '#' + hexByte(r) + hexByte(g) + hexByte(b);
}

function gbp(amount) {
    return '£' + amount.toFixed(2);
}

function nearestRal(r, g, b) {
    let best = null;
    let bestDistance = Infinity;
    Ral.forEach(function (row) {
        const distance = (row[2] - r) * (row[2] - r) + (row[3] - g) * (row[3] - g) + (row[4] - b) * (row[4] - b);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = row;
        }
    });
    return { code: 'RAL ' + best[0], name: best[1], distance: Math.sqrt(bestDistance) };
}

// Sibling keys in one object share one colon column. Nested objects align on their own.
function formatJson(value, indent) {
    const level = indent || 0;
    const pad   = '    '.repeat(level);
    const inner = '    '.repeat(level + 1);

    if (value === null) {
        return 'null';
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        if (!value.length) {
            return '[]';
        }
        const items = value.map(function (item) {
            return inner + formatJson(item, level + 1);
        });
        return '[\n' + items.join(',\n') + '\n' + pad + ']';
    }

    const keys = Object.keys(value);
    if (!keys.length) {
        return '{}';
    }
    const keyWidth = keys.reduce(function (widest, key) {
        return Math.max(widest, key.length);
    }, 0);
    const lines = keys.map(function (key, index) {
        const gap   = ' '.repeat(keyWidth - key.length);
        const comma = index === keys.length - 1 ? '' : ',';
        return inner + JSON.stringify(key) + gap + ' : ' + formatJson(value[key], level + 1) + comma;
    });
    return '{\n' + lines.join('\n') + '\n' + pad + '}';
}

// One "R, G, B" string is the colour. The separate channel fields are not stored.
function colourChannels(colour) {
    const parts = String(colour.Paint__RGB || '').split(',').map(function (part) { return Number(part.trim()); });
    if (parts.length === 3 && parts.every(function (channel) { return channel >= 0 && channel <= 255; })) {
        return parts;
    }
    throw new Error('Colour data needs Paint__RGB as "R, G, B", not separate channel fields.');
}

function collapseColourData(colour) {
    if (!colour || (colour.Paint__R === undefined && colour.Paint__G === undefined && colour.Paint__B === undefined)) {
        return;
    }
    if (!colour.Paint__RGB) {
        colour.Paint__RGB = colour.Paint__R + ', ' + colour.Paint__G + ', ' + colour.Paint__B;
    }
    delete colour.Paint__R;
    delete colour.Paint__G;
    delete colour.Paint__B;
}

function walkCollapseColour(value) {
    if (!value || typeof value !== 'object') {
        return;
    }
    if (value.Resource__ColourData) {
        collapseColourData(value.Resource__ColourData);
    }
    Object.keys(value).forEach(function (key) { walkCollapseColour(value[key]); });
}

function collapseLibraryFile(fileName) {
    const file     = path.join(Libraries, fileName);
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    walkCollapseColour(document);
    fs.writeFileSync(file, formatJson(document) + '\n', 'utf8');
}

function moneySpread(r, g, b) {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const depth     = 1 - luminance;
    return {
        material : 5.40 + depth * 3.80,
        applied  : 20.50 + depth * 9.50,
        tin      : 46.00 + depth * 32.00,
        coverage : 18.5 - depth * 4.0,
        lead     : luminance < 0.35 ? '8 working days, tinted to order' : '5 working days'
    };
}

function processedPrice(timber) {
    const area          = (timber.widthMm / 1000) * (timber.depthMm / 1000);
    const processedPerM3 = timber.pricePerM3 / timber.yield;
    const perMetre       = processedPerM3 * area;
    return {
        area            : area,
        processedPerM3  : processedPerM3,
        roughM3PerMetre : area / timber.yield,
        perMetre        : perMetre
    };
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paint Records
// -----------------------------------------------------------------------------

function paintRecord(row, cardOrder) {
    const number = row[0];
    const name   = row[1];
    const r      = row[2];
    const g      = row[3];
    const b      = row[4];
    const hex    = hexOf(r, g, b);
    const ral    = nearestRal(r, g, b);
    const price  = moneySpread(r, g, b);
    const code   = PaintSources[cardOrder - 1].Resource__Code;                          // <-- The code is authored in the paint library
    const basis  = 'Nearest RAL Classic (' + ral.name + '), derived from the RGB'
        + (ral.distance > 18 ? '. A loose match: check a physical card before specifying it as a RAL' : '')
        + '. The Vale colour is not specified as a RAL.';
    const attributes = {
        Resource__ColourData : {
            Paint__RGB        : r + ', ' + g + ', ' + b,
            Paint__RAL        : ral.code,
            Paint__RAL__Basis : basis,
            Paint__Hex        : hex
        },
        Resource__CostingData : {
            'Price__Material__Per-m2' : gbp(price.material),
            'Price__Applied__Per-m2'  : gbp(price.applied),
            Price__PerTin             : gbp(price.tin),
            Price__TinSize            : '2.5 L',
            Price__TinCoverage        : price.coverage.toFixed(1) + ' m2 per tin, two coats',
            Price__Currency           : 'GBP',
            Price__DateAdded          : '14-Feb-2024',
            Price__DateReviewed       : '01-Oct-2026',
            Price__Basis              : 'Illustrative factory cost for the costing department. Not a live price book.'
        },
        Resource__ProcurementData : {
            Procurement__Supplier         : 'Paint Pot PLC',
            Procurement__Manufacturer     : 'Eggshell Works Ltd',
            Procurement__ProductLine      : 'Factory opaque joinery eggshell',
            Procurement__AverageLeadTime  : price.lead
        }
    };
    return {
        code         : code,
        number       : number,
        cardOrder    : cardOrder,
        name         : name,
        hex          : hex,
        ral          : ral.code,
        attributes   : attributes,
        runtime      : {
            id           : code,
            group        : 'Paint Finishes',
            resourceType : 'PaintFinish',
            name         : name,
            paintNumber  : number,
            cardOrder    : cardOrder,
            summary      : 'Vale paint card no. ' + pad2(number) + '. Objects name ' + code + ' and do not copy the colour or the price.',
            attributes   : [
                { key: 'Resource__ColourData',      label: 'Colour',      data: attributes.Resource__ColourData },
                { key: 'Resource__CostingData',     label: 'Costing',     data: attributes.Resource__CostingData },
                { key: 'Resource__ProcurementData', label: 'Procurement', data: attributes.Resource__ProcurementData }
            ],
            data : {
                Swatch            : hex,
                'Resource Code'   : code,
                'Paint Number'    : pad2(number)
            }
        }
    };
}

const PaintRecords = Paints.map(function (row, index) {
    return paintRecord(row, index + 1);
});

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Timber Records
// -----------------------------------------------------------------------------

function timberAttributes(timber) {
    const cost = processedPrice(timber);
    return {
        Resource__SpeciesData : {
            Species__BotanicalName : timber.species,
            Species__Grade         : timber.grade,
            Species__BoughtAs      : timber.bought
        },
        Resource__PurchaseData : {
            'Purchase__Unit'            : 'm3',
            'Purchase__Price__Per-m3'   : gbp(timber.pricePerM3),
            Purchase__Grade             : timber.grade,
            Purchase__Form              : timber.bought
        },
        Resource__ProcessingData : {
            Processing__Yield                     : timber.yield,
            Processing__Yield__Note               : 'Share of the bought cubic metre that remains as finished section after planing and waste.',
            Processing__FinishedSection__Example  : timber.example,
            'Processing__SectionWidth__mm'        : timber.widthMm,
            'Processing__SectionDepth__mm'        : timber.depthMm,
            'Processing__SectionArea__m2'         : cost.area.toFixed(6),
            'Processing__Price__Processed__Per-m3': gbp(cost.processedPerM3),
            'Processing__Rough-m3__Per-LinearMetre': cost.roughM3PerMetre.toFixed(6),
            'Processing__Price__Per-LinearMetre'  : gbp(cost.perMetre),
            Processing__Formula                   : 'Price per linear metre = (price per m3 / yield) x finished width in metres x finished depth in metres. For any other section, use the processed price per m3 and that section\'s area.'
        },
        Resource__CostingData : {
            'Price__Material__Per-m3'                 : gbp(timber.pricePerM3),
            'Price__Processed__Per-m3'                : gbp(cost.processedPerM3),
            'Price__Per-LinearMetre__ExampleSection'  : gbp(cost.perMetre),
            Price__ExampleSection                     : timber.example,
            Price__Currency                           : 'GBP',
            Price__DateAdded                          : timber.dateAdded,
            Price__DateReviewed                       : '01-Oct-2026',
            Price__Basis                              : 'Illustrative bought and machined cost for the costing department. Not a live price book.'
        },
        Resource__ProcurementData : {
            Procurement__Supplier          : timber.supplier,
            Procurement__AverageLeadTime   : timber.lead,
            Procurement__ProcessedAt       : 'Vale Garden Houses joinery shop, Grantham'
        }
    };
}

function timberRuntime(timber) {
    const attributes = timberAttributes(timber);
    return {
        id           : timber.id,
        group        : 'Materials',
        resourceType : 'TimberMaterial',
        name         : timber.name,
        summary      : timber.summary + ' Costing code ' + timber.code + '.',
        attributes   : [
            { key: 'Resource__SpeciesData',      label: 'Species',      data: attributes.Resource__SpeciesData },
            { key: 'Resource__PurchaseData',     label: 'Purchase',     data: attributes.Resource__PurchaseData },
            { key: 'Resource__ProcessingData',   label: 'Processing',   data: attributes.Resource__ProcessingData },
            { key: 'Resource__CostingData',      label: 'Costing',      data: attributes.Resource__CostingData },
            { key: 'Resource__ProcurementData',  label: 'Procurement',  data: attributes.Resource__ProcurementData }
        ],
        data : { 'Resource Code': timber.code }
    };
}

function sheetRuntime(sheet) {
    const shared = sheet.attributes;
    const size = {
        'Board__Length__mm'     : sheet.length,
        'Board__Width__mm'      : sheet.width,
        'Board__Thickness__mm'  : sheet.thickness
    };
    return {
        id           : sheet.id,
        group        : sheet.group,
        resourceType : 'SheetMaterial',
        libraryToken : sheet.token,
        name         : sheet.name,
        cardOrder    : sheet.cardOrder,
        summary      : sheet.family + ' board ' + sheet.length + ' x ' + sheet.width + ' mm, ' + sheet.thickness + ' mm thick. Objects name ' + sheet.code + '.',
        attributes   : [
            { key: 'Resource__MaterialData',    label: 'Material',    data: shared.Resource__MaterialData },
            { key: 'Resource__SizeData',        label: 'This board',  data: size },
            { key: 'Resource__PurchaseData',    label: 'Purchase',    data: shared.Resource__PurchaseData },
            { key: 'Resource__ProcurementData', label: 'Procurement', data: shared.Resource__ProcurementData }
        ],
        data : { 'Resource Code': sheet.code, 'Board': sheet.length + ' x ' + sheet.width + ' x ' + sheet.thickness + ' mm' }
    };
}

function sheetRecord(sheet) {
    return {
        Resource__Code       : sheet.code,
        Resource__Type       : 'SheetMaterial',
        Resource__Name       : sheet.name,
        Resource__Library    : sheet.token,
        Resource__Attributes : {
            Resource__MaterialData : sheet.attributes.Resource__MaterialData,
            Resource__SizeData : {
                'Board__Length__mm'    : sheet.length,
                'Board__Width__mm'     : sheet.width,
                'Board__Thickness__mm' : sheet.thickness
            },
            Resource__PurchaseData    : sheet.attributes.Resource__PurchaseData,
            Resource__ProcurementData : sheet.attributes.Resource__ProcurementData
        }
    };
}

function sheetLibraryDocument(token, title, purpose) {
    const boards = Sheets.filter(function (sheet) { return sheet.token === token; });
    const library = {
        Library__Name    : title,
        Library__Purpose : purpose
    };
    boards.forEach(function (sheet) {
        library['Resource__' + sheet.code] = sheetRecord(sheet);
    });
    return { [token]: library };
}

const SheetLibraries = [
    {
        token   : 'Vale__AluminiumSheetLibrary',
        title   : 'Aluminium sheet',
        file    : 'ValeObjectLibrary__Library__AluminiumSheetData__.json',
        purpose : 'One resource for each standard blank and thickness. A component names one code, such as AluminiumSheet__l2000xw1000__t1.2mm. Naming Vale__AluminiumSheetLibrary means every aluminium sheet.'
    },
    {
        token   : 'Vale__PlywoodSheetLibrary',
        title   : 'Plywood sheet',
        file    : 'ValeObjectLibrary__Library__PlywoodSheetData__.json',
        purpose : 'One resource for each standard board and thickness. PlywoodSheet__l2440xw1220__t18mm is the 2440 x 1220 mm board at 18 mm. Naming Vale__PlywoodSheetLibrary means every plywood sheet.'
    },
    {
        token   : 'Vale__OsbSheetLibrary',
        title   : 'OSB sheet',
        file    : 'ValeObjectLibrary__Library__OsbSheetData__.json',
        purpose : 'OSB is one board size, 2440 x 1220 mm, in 6, 9, 12 and 18 mm. Each thickness is its own resource. Naming Vale__OsbSheetLibrary means every OSB sheet.'
    }
];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | JSON Documents
// -----------------------------------------------------------------------------

const PriceNote = 'Illustrative figures for the costing department, reviewed 01-Oct-2026. Not a live price book.';

const AttributesSchema = {
    Schema__Name    : 'Resource attributes',
    Schema__Purpose : 'A Resource is one reusable definition. It carries one or more attribute blocks. A Component, Product or Assembly stores only the resource code. It does not copy the attributes. Open that object to see the resources attached to it, and no others.',
    Resource__Example : {
        Resource__Code : 'ValePaintFinish__no01-ValeWhite__',
        Resource__Type : 'PaintFinish',
        Resource__Name : 'Vale White',
        Resource__Attributes : {
            Resource__ColourData : {
                Paint__RGB : '',
                Paint__RAL : '',
                Paint__Hex : ''
            },
            Resource__CostingData : {
                'Price__Material__Per-m2' : '',
                'Price__Applied__Per-m2'  : '',
                Price__PerTin             : '',
                Price__TinCoverage        : '',
                Price__DateAdded          : '',
                Price__DateReviewed       : ''
            },
            Resource__ProcurementData : {
                Procurement__Supplier         : '',
                Procurement__Manufacturer     : '',
                Procurement__AverageLeadTime  : ''
            }
        }
    },
    Schema__Notes : [
        'Different resource types carry different attribute blocks. A paint finish has colour, costing and procurement. A timber has species, purchase, processing, costing and procurement. A sheet material lists its standard board sizes and thicknesses.',
        'Purchase and processing are attributes of the timber, not a second resource. One resource, several attributes.',
        'On the chart, resources are drawn only for the Component, Product or Assembly you have open, and only the resources that object names.'
    ]
};

const PaintSkeleton = {
    Schema__Name        : 'Paint finish',
    Schema__ResourceType: 'PaintFinish',
    Schema__Purpose     : 'One colour on the Vale Garden Houses paint card. Copy this block for a new colour. Leave the values blank until costing fills them.',
    'Vale__PaintLibrary' : {
        'Resource__PaintFinish-00' : {
            Resource__Code   : 'ValePaintFinish__no00-Name__',
            Resource__Type   : 'PaintFinish',
            Resource__Name   : '',
            Resource__Number : '',
            Resource__Attributes : {
                Resource__ColourData : {
                    Paint__RGB        : '',
                    Paint__RAL        : '',
                    Paint__RAL__Basis : 'Nearest RAL Classic, derived from the RGB. Not a Vale specification.',
                    Paint__Hex        : ''
                },
                Resource__CostingData : {
                    'Price__Material__Per-m2' : '',
                    'Price__Applied__Per-m2'  : '',
                    Price__PerTin             : '',
                    Price__TinSize            : '2.5 L',
                    Price__TinCoverage        : '',
                    Price__Currency           : 'GBP',
                    Price__DateAdded          : '',
                    Price__DateReviewed       : '',
                    Price__Basis              : PriceNote
                },
                Resource__ProcurementData : {
                    Procurement__Supplier         : '',
                    Procurement__Manufacturer     : '',
                    Procurement__ProductLine      : '',
                    Procurement__AverageLeadTime  : ''
                }
            }
        }
    }
};

function paintLibraryDocument() {
    const library = {
        Library__Name      : 'Vale Garden Houses paint finishes',
        Library__Purpose   : 'Single source of truth for the joinery paint card. A Component or Product names ValePaintFinish__no01-ValeWhite__ and does not repeat the colour or the price.',
        Library__PriceBasis: PriceNote,
        Library__CardOrder : PaintRecords.map(function (paint) { return paint.code; }),
        Library__Count     : PaintRecords.length
    };
    PaintRecords.slice().sort(function (a, b) { return a.number - b.number; }).forEach(function (paint) {
        library['Resource__PaintFinish-' + pad2(paint.number)] = {
            Resource__Code       : paint.code,
            Resource__Type       : 'PaintFinish',
            Resource__Name       : paint.name,
            Resource__Number     : pad2(paint.number),
            Resource__Attributes : paint.attributes
        };
    });
    return { Vale__PaintLibrary: library };
}

function timberDocument() {
    const library = {
        Library__Name      : 'Vale timber, bought by volume',
        Library__Purpose   : 'Hardwood and softwood bought by the cubic metre. Vale machines it, and costing prices the finished linear metre from the yield and the section.',
        Library__PriceBasis: PriceNote,
        Library__Formula    : 'Price per linear metre = (price per m3 / yield) x finished width in metres x finished depth in metres.',
        'Resource__TimberMaterial__Skeleton' : {
            Resource__Code : 'ValeTimber__Name__',
            Resource__Type : 'TimberMaterial',
            Resource__Name : '',
            Resource__Attributes : {
                Resource__SpeciesData : {
                    Species__BotanicalName : '',
                    Species__Grade         : '',
                    Species__BoughtAs      : ''
                },
                Resource__PurchaseData : {
                    'Purchase__Unit'          : 'm3',
                    'Purchase__Price__Per-m3' : '',
                    Purchase__Grade           : '',
                    Purchase__Form            : ''
                },
                Resource__ProcessingData : {
                    Processing__Yield                      : '',
                    Processing__FinishedSection__Example   : '',
                    'Processing__Price__Processed__Per-m3' : '',
                    'Processing__Price__Per-LinearMetre'   : '',
                    Processing__Formula                    : 'Price per linear metre = (price per m3 / yield) x finished width in metres x finished depth in metres.'
                },
                Resource__CostingData : {
                    'Price__Material__Per-m3'                : '',
                    'Price__Processed__Per-m3'               : '',
                    'Price__Per-LinearMetre__ExampleSection' : '',
                    Price__DateAdded                         : '',
                    Price__DateReviewed                      : ''
                },
                Resource__ProcurementData : {
                    Procurement__Supplier         : '',
                    Procurement__AverageLeadTime  : ''
                }
            }
        }
    };
    Timbers.forEach(function (timber) {
        const key = 'Resource__' + timber.code.replace(/^ValeTimber__/, 'Timber__').replace(/__$/, '');
        library[key] = {
            Resource__Code       : timber.code,
            Resource__Type       : 'TimberMaterial',
            Resource__LibraryId  : timber.id,
            Resource__Name       : timber.name,
            Resource__Attributes : timberAttributes(timber)
        };
    });
    return { Vale__TimberLibrary: library };
}

const ValeWhite = PaintRecords.filter(function (paint) { return paint.number === 1; })[0];
const ValeWhiteBlock = {
    Vale__PaintLibrary : {
        'Resource__PaintFinish-01' : {
            Resource__Code       : ValeWhite.code,
            Resource__Type       : 'PaintFinish',
            Resource__Name       : ValeWhite.name,
            Resource__Number     : '01',
            Resource__Attributes : ValeWhite.attributes
        }
    }
};

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Write the Files
// -----------------------------------------------------------------------------

const Files = {
    'ValeObjectLibrary__Schema__ResourceAttributes__.json' : AttributesSchema,
    'ValeObjectLibrary__Schema__PaintFinish__.json'        : PaintSkeleton,
    'ValeObjectLibrary__Library__PaintFinishes__.json'     : paintLibraryDocument(),
    'ValeObjectLibrary__Schema__TimberMaterial__.json'     : timberDocument()
};
SheetLibraries.forEach(function (library) {
    Files[library.file] = sheetLibraryDocument(library.token, library.title, library.purpose);
});

Object.keys(Files).forEach(function (name) {
    fs.writeFileSync(path.join(Here, name), formatJson(Files[name]) + '\n', 'utf8');
});

// The authored libraries are the source. Rewrite them in the same columns.
['ValeObjectLibrary__Library__PaintColours__.json',
 'ValeObjectLibrary__Library__RalClassic__.json',
 'ValeObjectLibrary__Library__TimberMaterials__.json',
 'ValeObjectLibrary__Library__SheetMaterials__.json'].forEach(function (name) {
    const file = path.join(Libraries, name);
    fs.writeFileSync(file, formatJson(JSON.parse(fs.readFileSync(file, 'utf8'))) + '\n', 'utf8');
});

const Schemes = [
    {
        id    : 'attributes',
        title : 'A resource carries attributes',
        file  : '04__JsonSchemas__Master/ValeObjectLibrary__Schema__ResourceAttributes__.json',
        lead  : 'One resource, several attribute blocks. Colour, cost and procurement stay on the resource. A door stile stores the code only. Open that stile to see its resources. Open the door and you do not also get the stile\'s resources: each level shows what it names.',
        code  : formatJson(AttributesSchema)
    },
    {
        id    : 'paint-skeleton',
        title : 'Paint finish: empty block',
        file  : '04__JsonSchemas__Master/ValeObjectLibrary__Schema__PaintFinish__.json',
        lead  : 'The shape costing fills in for a paint. RGB, the nearest RAL, and the hex are three separate colour values.',
        code  : formatJson(PaintSkeleton)
    },
    {
        id    : 'paint-example',
        title : 'Paint finish: Vale White, filled in',
        file  : '04__JsonSchemas__Master/ValeObjectLibrary__Library__PaintFinishes__.json',
        lead  : 'Vale White is ValePaintFinish__no01-ValeWhite__. The full card, ' + PaintRecords.length + ' finishes in colour-card order, is in the paint library file. The chart names that code. It does not copy this block.',
        code  : formatJson(ValeWhiteBlock)
    },
    {
        id    : 'timber',
        title : 'Timber: bought by the cubic metre',
        file  : '04__JsonSchemas__Master/ValeObjectLibrary__Schema__TimberMaterial__.json',
        lead  : 'Sapele, Douglas fir and tulipwood are bought in cubic metres. After Vale machines them, the price per linear metre is the bought price divided by the yield, times the finished section. The skeleton is first, then the three timbers.',
        code  : formatJson(timberDocument())
    },
];
SheetLibraries.forEach(function (library) {
    const boards = Sheets.filter(function (sheet) { return sheet.token === library.token; });
    Schemes.push({
        id       : library.token,
        title    : library.title,
        file     : '04__JsonSchemas__Master/' + library.file,
        lead     : library.purpose,
        sections : boards.map(function (sheet) {
            return {
                title : sheet.length + ' x ' + sheet.width + ' mm, ' + sheet.thickness + ' mm thick',
                code  : sheet.code,
                body  : formatJson(sheetRecord(sheet))
            };
        })
    });
});

const runtimePaints  = PaintRecords.map(function (paint) { return paint.runtime; });
const runtimeTimbers = {};
Timbers.forEach(function (timber) {
    runtimeTimbers[timber.id] = timberRuntime(timber);
});
const runtimeSheets = Sheets.map(sheetRuntime);

const runtime = [
    '/* =============================================================================',
    '   VALE OBJECT LIBRARY - RESOURCE LIBRARIES',
    '   =============================================================================',
    '',
    '   FILE       : ValeObjectLibrary__ResourceLibraries__.js',
    '   NAMESPACE  : ValeObjectLibrary',
    '   MODULE     : Presentation - Paint card and timber costs',
    '   AUTHOR     : Adam Noble - Noble Architecture',
    '   PURPOSE    : Runtime copy of the JSON resource libraries, so the demo opens from disk',
    '   CREATED    : 16-Oct-2026',
    '',
    '   DESCRIPTION:',
    '   - Generated by 04__JsonSchemas__Master/Build__ValeResourceLibraries__.js.',
    '     Edit the builder and re-run it. Do not edit this file by hand.',
    '   - The JSON files are the costing source of truth. This script is the same',
    '     records, loaded before the chart so the page still works from file://.',
    '   - Vale__PaintLibrary on a Component or Product expands to every paint code.',
    '',
    '   ============================================================================= */',
    '(function () {',
    "    'use strict';",
    '    var data = window.ValeObjectLibrary_LibraryData;',
    '    if (!data) { return; }',
    '',
    '    var paints = ' + JSON.stringify(runtimePaints) + ';',
    '    var timbers = ' + JSON.stringify(runtimeTimbers) + ';',
    '    var sheets = ' + JSON.stringify(runtimeSheets) + ';',
    '    var sheetTokens = {};',
    '    sheets.forEach(function (sheet) {',
    '        if (!sheetTokens[sheet.libraryToken]) { sheetTokens[sheet.libraryToken] = []; }',
    '        sheetTokens[sheet.libraryToken].push(sheet.id);',
    '    });',
    '    var drop = {',
    "        'RES-FIN-PAINT': 1, 'RES-FIN-NEUTRAL-WHITE': 1, 'RES-FIN-FB-WEVET': 1,",
    "        'RES-FIN-FB-AMMONITE': 1, 'RES-FIN-FB-FRENCH-GRAY': 1, 'RES-FIN-FB-CARD-ROOM-GREEN': 1,",
    "        'RES-FIN-FB-PIGEON': 1, 'RES-FIN-FB-RAILINGS': 1",
    '    };',
    '    var paintIds = paints.map(function (paint) { return paint.id; });',
    '',
    '    data.resources = (data.resources || []).filter(function (resource) { return !drop[resource.id]; });',
    '    data.resources.forEach(function (resource) {',
    '        var timber = timbers[resource.id];',
    '        if (!timber) { return; }',
    '        resource.resourceType = timber.resourceType;',
    '        resource.summary      = timber.summary;',
    '        resource.attributes   = timber.attributes;',
    '        resource.data         = Object.assign({}, resource.data || {}, timber.data);',
    '        delete timbers[resource.id];',
    '    });',
    '    Object.keys(timbers).forEach(function (id) { data.resources.push(timbers[id]); });',
    '    sheets.forEach(function (sheet) { data.resources.push(sheet); });',
    '    paints.forEach(function (paint) { data.resources.push(paint); });',
    '',
    '    function expand(list) {',
    '        if (!list) { return list; }',
    '        var out = [];',
    '        list.forEach(function (id) {',
    "            if (id === 'Vale__PaintLibrary') {",
    '                paintIds.forEach(function (paintId) { out.push(paintId); });',
    '            } else if (sheetTokens[id]) {',
    '                sheetTokens[id].forEach(function (sheetId) { out.push(sheetId); });',
    '            } else if (!drop[id]) {',
    '                out.push(id);',
    '            }',
    '        });',
    '        return out;',
    '    }',
    '    (data.library || []).forEach(function (record) { record.uses = expand(record.uses); });',
    '    data.resourceSchemes = ' + JSON.stringify(Schemes) + ';',
    '    data.paintCardCount  = paints.length;',
    '})();',
    ''
].join('\n');

fs.writeFileSync(Data, runtime, 'utf8');

console.log('Paints: ' + PaintRecords.length);
PaintRecords.forEach(function (paint) {
    console.log(pad2(paint.number) + '  ' + paint.name.padEnd(18) + '  ' + paint.hex + '  ' + paint.ral + '  ' + paint.code);
});
console.log('Wrote ' + Object.keys(Files).length + ' JSON files and the runtime script.');

// endregion -------------------------------------------------------------------
