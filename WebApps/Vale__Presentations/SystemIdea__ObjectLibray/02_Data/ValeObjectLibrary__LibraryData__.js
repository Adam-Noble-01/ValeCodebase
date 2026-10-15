/* =============================================================================
   VALE OBJECT LIBRARY - LIBRARY DATA
   =============================================================================

   FILE       : ValeObjectLibrary__LibraryData__.js
   NAMESPACE  : ValeObjectLibrary
   MODULE     : Presentation - Object Library Data (feeds Demo 2.0.0)
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every object the Demo 2.0.0 tree chart draws, in one editable place
   CREATED    : 15-Oct-2026

   DESCRIPTION:
   - The chart in ValeObjectLibrary__Demo__2.0.0__.html is generated from this
     file. Nothing about the objects is written into the HTML: add a record here
     and it appears in the chart, the search, the counts, the bill of materials
     and the inspector panel.
   - The chart has two views of the same records:
       Scheme view  - one configured project (scheme, below) and only what it uses
       Library view - every record in the library, on its category shelf
   - A plain script rather than JSON or a module, so the demo still opens
     straight from disk (file://) as well as from the local server (port 8011)
     and GitHub Pages. Comments are allowed, unlike JSON.
   - Door handles, hinges and ironmongery finishes come from ValeSpec
     (WebApps/ValeSpec/03__Data__HardwareDataLibrary and its app config),
     including its real rules for hinges and door sizes.
   - Other example values (quantities, sizes, the example scheme) are
     illustrative, for the presentation only.

   HOW TO ADD THINGS:
   - A Resource          -> add to "resources", with its group (Profiles,
                            Materials, Finishes or Specifications).
   - A Component/Product -> add to "library" with tier "component" or "product"
                            and list the resource ids it "uses".
   - An Assembly         -> add to "library" with tier "assembly" and list what
                            it "contains" as { ref, qty }. An Assembly may
                            contain other Assemblies (sub-assemblies) as well
                            as Components and Products.
   - A library shelf     -> give the record a "category" (one of "categories"
                            below). Records with a category sit on that shelf in
                            the Library view; records without one (a column
                            base, a door rail) only appear inside the
                            assemblies that contain them.
   - Place anything      -> add { ref, qty } to a Family's "contains" in
                            "scheme.families". A Family can hold Assemblies,
                            Components and Products directly.
   - Ids must be unique. Prefix by tier: RES-, CMP-, PRD-, ASM-, FAM-.
   - Optional on any record: summary, data { "Data Point": "value" } (any
     extra key shows as an extra row), params [ data points the Scheme sets ],
     rules [ { type, text } ], assets [ linked asset types ], worksWith [ ids it
     is compatible with - shown both ways ].
   - A typo in an id is reported on screen and in the browser console, and the
     chart carries on without the broken link.

   TIER COLOURS:
   - Checked for colour-blind separation between neighbouring tiers. Every box
     also carries its tier name in text, so colour is never the only cue.
     Re-check before changing one.

   ============================================================================= */

window.ValeObjectLibrary_LibraryData = {

    // -------------------------------------------------------------------------
    // REGION | Meta
    // -------------------------------------------------------------------------
    meta: {
        title    : 'Object Library',
        subtitle : 'System architecture',
        version  : '2.0.0',
        updated  : '15-Oct-2026'
    },
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Tiers - The Six Object Types and the Data Each One Holds
    // -------------------------------------------------------------------------
    // dataPoints : the fields every object of this tier holds. A value comes
    //              from the object's own "data", from the Resources it uses
    //              (Profile, Material, Finish, Specification), or shows as
    //              "Set by the scheme" when listed in the object's "params".
    // structural : not an object type - the root and shelves of the Library view
    tiers: {
        scheme: {
            code       : '01',
            label      : 'Scheme',
            plural     : 'Schemes',
            colour     : '#4a3aa7',
            summary    : 'The complete, configured project or design option.',
            definition : 'The top level: one complete Vale Garden Houses project or design option. A Scheme holds the selected Families, Assemblies, Components and Products, and is version controlled so several options and revisions can sit side by side.',
            dataPoints : ['Scheme Reference', 'Version', 'Status', 'Overall Length', 'Overall Width', 'Eaves Height', 'Roof Pitch', 'Glazing Specification', 'Finish Selection']
        },
        family: {
            code       : '02',
            label      : 'Family',
            plural     : 'Families',
            colour     : '#2a78d6',
            summary    : 'A large architectural element: a roof, a frame, an elevation.',
            definition : 'Families group related Assemblies into the large architectural elements a client recognises: the roof lantern, the framework, each elevation. They are the main structure used to configure a Scheme.',
            dataPoints : ['Family Code', 'Family Type', 'Location / Orientation']
        },
        assembly: {
            code       : '03',
            label      : 'Assembly',
            plural     : 'Assemblies',
            colour     : '#1baf7a',
            summary    : 'A built-up object made from Components and Products.',
            definition : 'Assemblies are objects built from several Components and Products: a door, a window, a column, a hip. An Assembly can contain other Assemblies (sub-assemblies) where more hierarchy is needed, such as the two leaves of a pair of doors.',
            dataPoints : ['Assembly Code', 'Assembly Type', 'Overall Size', 'Handing / Opening', 'Revision']
        },
        component: {
            code       : '03.01',
            label      : 'Component',
            plural     : 'Components',
            colour     : '#eda100',
            summary    : 'A fabricated element, made to measure for each scheme.',
            definition : 'A Component is a fabricated or configurable element rather than a fixed purchased object. Its length, width, depth or other parameters are set by each Scheme, and it draws its profiles, materials, finishes and specifications from the shared Resources.',
            dataPoints : ['Component Code', 'Profile', 'Material', 'Finish', 'Specification', 'Length', 'Width', 'Depth', 'Manufacturing Method']
        },
        product: {
            code       : '03.02',
            label      : 'Product',
            plural     : 'Products',
            colour     : '#e34948',
            summary    : 'A discrete, catalogued item: bought in or standard.',
            definition : 'A Product is a discrete, identifiable item that exists as a known object, casting, SKU or purchased product: a handle, a hinge, a finial. Assemblies point at a Product without duplicating its record.',
            dataPoints : ['Product Code', 'Supplier / Manufacturer', 'Fixed or Selectable Sizes', 'Material', 'Finish', 'Cost', 'Weight', 'CAD / 3D Asset', 'Availability / Status']
        },
        resource: {
            code       : '04',
            label      : 'Resource',
            plural     : 'Resources',
            colour     : '#008300',
            summary    : 'A reusable definition: a profile, material, finish or specification.',
            definition : 'The lowest level: reusable definitions rather than physical objects. Resources define the profiles, materials, finishes and specifications that Components and Products draw on. One Resource is reused by many objects, so a change made once flows everywhere it is used.',
            dataPoints : ['Resource Code', 'Category', 'Specification / Standard', 'Supplier', 'Notes']
        },
        library: {
            code       : '00',
            label      : 'Object Library',
            plural     : 'Object Library',
            colour     : '#172b3a',
            structural : true,
            summary    : 'Every record we hold, on its category shelf.',
            definition : 'The Object Library is the one shared store of every definition: Assemblies, Components, Products and Resources. Every Scheme is configured from it, so nothing in a Scheme is drawn from scratch and a record is only ever kept once.',
            dataPoints : []
        },
        category: {
            code       : '00',
            label      : 'Category',
            plural     : 'Categories',
            colour     : '#7b8794',
            structural : true,
            summary    : 'A shelf in the library, for finding things.',
            definition : 'Categories are the shelves of the library - columns, finials, crestings and so on - so a record is quick to find. They are for browsing only: a Scheme is built from the records themselves, not from categories.',
            dataPoints : []
        }
    },
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Categories - The Shelves of the Library View, in Order
    // -------------------------------------------------------------------------
    categories: [
        { name: 'Roof Lantern',          summary: 'The ridge, hips, rafters and vents of a glazed roof lantern.' },
        { name: 'Columns',               summary: 'Free-standing columns, each built from a base, a shaft and a capital.' },
        { name: 'Pilasters',             summary: 'Pilasters - built from the same bases, shafts and capitals as the matching columns.' },
        { name: 'Internal Columns',      summary: 'Internal column types, each with its own base, capital and shaft.' },
        { name: 'Framework',             summary: 'Entablatures, ring beams and the structure that frames the building.' },
        { name: 'Doors and Windows',     summary: 'Door and window assemblies, down to their rails, panels and ironmongery.' },
        { name: 'Rainwater',             summary: 'Hoppers, downpipes and their fittings.' },
        { name: 'Tie Bars and Lighting', summary: 'Decorative tie bars and lighting blocks.' },
        { name: 'Framework Sections',    summary: 'The main sections the framework is built from.' },
        { name: 'Cill Nosings',          summary: 'Cill nosings, each sized for the columns it is used with.' },
        { name: 'Joinery',               summary: 'Internal joinery: window boards, skirtings and staff beads.' },
        { name: 'Eaves and Gutters',     summary: 'Gutters and eaves details.' },
        { name: 'Ironmongery',           summary: 'Lever handles, hinges, locks and bolts. Handles and hinges come from ValeSpec.' },
        { name: 'Cabin Hooks',           summary: 'Cabin hooks in every size, including those no longer available.' },
        { name: 'Roof Finials',          summary: 'Cast and timber finials for ridges and lantern ends.' },
        { name: 'Roof Crestings',        summary: 'Cast ridge crestings and decorative strips.' }
    ],
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Resource Groups - The Four Shelves of the Shared Library
    // -------------------------------------------------------------------------
    // field : the tier data point this group fills in, e.g. a Component that
    //         uses "Accoya" shows Material: Accoya without typing it twice.
    resourceGroups: [
        { key: 'Profiles',       singular: 'Profile',       field: 'Profile'       },
        { key: 'Materials',      singular: 'Material',      field: 'Material'      },
        { key: 'Finishes',       singular: 'Finish',        field: 'Finish'        },
        { key: 'Specifications', singular: 'Specification', field: 'Specification' }
    ],
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Configuration Engine and Associated Assets - Reference Lists
    // -------------------------------------------------------------------------
    ruleTypes: [
        'Dimensional Rules', 'Compatibility Rules', 'Quantity Rules', 'Product Selection Rules',
        'Minimum and Maximum Sizes', 'Spacing Rules', 'Manufacturing Constraints', 'Design Constraints'
    ],

    assetTypes: [
        'Manufacturing Data', 'Cost Data', 'CAD', 'SketchUp Models', '3D Models', 'Photographs',
        'PDF Drawings', 'Data Sheets', 'Technical Specifications', 'Supplier Information',
        'Installation Information', 'Historical or Revision Data'
    ],
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Resources - Profiles, Materials, Finishes, Specifications
    // -------------------------------------------------------------------------
    // "Swatch" draws a colour chip in the panel.
    resources: [
        // Profiles
        { id: 'RES-PRF-OGEE',          group: 'Profiles',       name: 'Ogee',                         summary: 'S-shaped moulding used on architraves, capitals and mullions.' },
        { id: 'RES-PRF-ASTRAGAL',      group: 'Profiles',       name: 'Astragal',                     summary: 'Small half-round moulding used on glazing bars and capitals.' },
        { id: 'RES-PRF-BOLECTION',     group: 'Profiles',       name: 'Bolection',                    summary: 'Raised moulding that frames a fielded panel.' },
        { id: 'RES-PRF-CORNICE',       group: 'Profiles',       name: 'Cornice Profile',              summary: 'The projecting crown moulding along the top of the entablature.' },
        { id: 'RES-PRF-TIMBER',        group: 'Profiles',       name: 'Timber Section',               summary: 'Standard planed sections for stiles, rails, cills and beams.' },
        { id: 'RES-PRF-ALU-EXTRUSION', group: 'Profiles',       name: 'Aluminium Extrusion',          summary: 'Extruded sections for the roof lantern bars, caps and vents.' },

        // Materials
        { id: 'RES-MAT-ACCOYA',        group: 'Materials',      name: 'Accoya',                       summary: 'Modified, highly durable timber for external joinery.' },
        { id: 'RES-MAT-OAK',           group: 'Materials',      name: 'Oak',                          summary: 'Hardwood for thresholds and exposed details.' },
        { id: 'RES-MAT-ALUMINIUM',     group: 'Materials',      name: 'Aluminium',                    summary: 'For roof lantern bars, caps, columns and outlets.' },
        { id: 'RES-MAT-LEAD',          group: 'Materials',      name: 'Lead',                         summary: 'For flashings and weatherings.' },
        { id: 'RES-MAT-SHEET',         group: 'Materials',      name: 'Sheet Materials',              summary: 'Sheet goods for friezes, soffits and linings.' },
        { id: 'RES-MAT-BOARD',         group: 'Materials',      name: 'Board Materials',              summary: 'Boards for panels and pilaster faces.' },

        // Finishes - the three ironmongery finishes are ValeSpec's
        { id: 'RES-FIN-RAL',           group: 'Finishes',       name: 'RAL Colours',                  summary: 'The colour reference for painted and powder-coated finishes.' },
        { id: 'RES-FIN-PAINT',         group: 'Finishes',       name: 'Paint Systems',                summary: 'Factory-applied paint systems for joinery.' },
        { id: 'RES-FIN-STAINS',        group: 'Finishes',       name: 'Stains',                       summary: 'Stain finishes for hardwood details.' },
        { id: 'RES-FIN-METAL',         group: 'Finishes',       name: 'Metal Finishes',               summary: 'Finishes for metalwork other than the ironmongery range.' },
        { id: 'RES-FIN-UNLACQUERED-BRASS', group: 'Finishes',   name: 'Unlacquered Brass',            summary: 'Ironmongery finish - one of the three offered in ValeSpec.',
          data: { 'Specification / Standard': 'Material MAT612__Metal__Ironmongery__Brass', 'Swatch': '#c0ae8a', 'Notes': 'From the ValeSpec app config' } },
        { id: 'RES-FIN-SATIN-NICKEL',  group: 'Finishes',       name: 'Satin Nickel',                 summary: 'Ironmongery finish - one of the three offered in ValeSpec.',
          data: { 'Specification / Standard': 'Material MAT614__Metal__Ironmongery__SatinNickle', 'Swatch': '#aaacb0', 'Notes': 'From the ValeSpec app config' } },
        { id: 'RES-FIN-BRONZE',        group: 'Finishes',       name: 'Bronze',                       summary: 'Ironmongery finish - one of the three offered in ValeSpec.',
          data: { 'Specification / Standard': 'Material MAT613__Metal__Ironmongery__Bronze', 'Swatch': '#433d37', 'Notes': 'From the ValeSpec app config' } },

        // Specifications
        { id: 'RES-SPC-GLASS',         group: 'Specifications', name: 'Glass Specification',          summary: 'The glass make-up for each glazed unit.' },
        { id: 'RES-SPC-BOARD',         group: 'Specifications', name: 'Board or Sheet Specification', summary: 'Grade and make-up for boards and sheets.' },
        { id: 'RES-SPC-CASTING',       group: 'Specifications', name: 'Casting Definition',           summary: 'Pattern and alloy for cast items such as finials and crestings.' },
        { id: 'RES-SPC-FIXING',        group: 'Specifications', name: 'Fixing Specification',         summary: 'Fixings and fixing centres for each material.' }
    ],
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Library - Reusable Assemblies, Components and Products
    // -------------------------------------------------------------------------
    library: [

        // =====================================================================
        // ASSEMBLIES
        // =====================================================================

        // Roof Lantern -------------------------------------------------------
        { id: 'ASM-RIDGE',             tier: 'assembly', category: 'Roof Lantern', name: 'Ridge Assembly',    summary: 'The ridge of the roof lantern.',
          contains: [{ ref: 'CMP-RIDGE-BEAM', qty: 1 }, { ref: 'CMP-RIDGE-CAP', qty: 1 }] },
        { id: 'ASM-HIP',               tier: 'assembly', category: 'Roof Lantern', name: 'Hip Assembly',      summary: 'One hip of the roof lantern.',
          contains: [{ ref: 'CMP-HIP-BAR', qty: 1 }, { ref: 'CMP-HIP-CAP', qty: 1 }] },
        { id: 'ASM-RAFTER',            tier: 'assembly', category: 'Roof Lantern', name: 'Rafter Assembly',   summary: 'One glazed bay of the lantern roof.',
          contains: [{ ref: 'CMP-RAFTER-BAR', qty: 1 }, { ref: 'CMP-GLAZING-PANEL', qty: 1 }],
          rules: [{ type: 'Dimensional Rules', text: 'Rafter count and spacing follow the lantern length and roof pitch.' }] },
        { id: 'ASM-ETR-VENT',          tier: 'assembly', category: 'Roof Lantern', name: 'ETR Vent Assembly', summary: 'The opening vent in the lantern roof.',
          contains: [{ ref: 'CMP-VENT-FRAME', qty: 1 }, { ref: 'CMP-GLAZING-PANEL', qty: 1 }, { ref: 'PRD-VENT-ACTUATOR', qty: 1 }] },

        // Columns - each built from a base, a shaft and a capital ------------
        { id: 'ASM-COL-CLASSICAL-300', tier: 'assembly', category: 'Columns', name: 'Classical 300mm Columns', summary: 'A 300mm classical aluminium column.',
          contains: [{ ref: 'CMP-CLASSICAL-300-BASE', qty: 1 }, { ref: 'CMP-CLASSICAL-300-SHAFT', qty: 1 }, { ref: 'CMP-CLASSICAL-300-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-CLASSICAL-250', tier: 'assembly', category: 'Columns', name: 'Classical 250mm Columns', summary: 'A 250mm classical aluminium column.',
          contains: [{ ref: 'CMP-CLASSICAL-250-BASE', qty: 1 }, { ref: 'CMP-CLASSICAL-250-SHAFT', qty: 1 }, { ref: 'CMP-CLASSICAL-250-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-CLASSICAL-200', tier: 'assembly', category: 'Columns', name: 'Classical 200mm Columns', summary: 'A 200mm classical aluminium column.',
          contains: [{ ref: 'CMP-CLASSICAL-200-BASE', qty: 1 }, { ref: 'CMP-CLASSICAL-200-SHAFT', qty: 1 }, { ref: 'CMP-CLASSICAL-200-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-CLASSICAL-175', tier: 'assembly', category: 'Columns', name: 'Classical 175mm Columns', summary: 'A 175mm classical aluminium column.',
          contains: [{ ref: 'CMP-CLASSICAL-175-BASE', qty: 1 }, { ref: 'CMP-CLASSICAL-175-SHAFT', qty: 1 }, { ref: 'CMP-CLASSICAL-175-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-CLASSICAL-150', tier: 'assembly', category: 'Columns', name: 'Classical 150mm Columns', summary: 'A 150mm classical aluminium column.',
          contains: [{ ref: 'CMP-CLASSICAL-150-BASE', qty: 1 }, { ref: 'CMP-CLASSICAL-150-SHAFT', qty: 1 }, { ref: 'CMP-CLASSICAL-150-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-CLASSICAL-102', tier: 'assembly', category: 'Columns', name: 'Classical 102mm Columns', summary: 'A 102mm classical aluminium column.',
          contains: [{ ref: 'CMP-CLASSICAL-102-BASE', qty: 1 }, { ref: 'CMP-CLASSICAL-102-SHAFT', qty: 1 }, { ref: 'CMP-CLASSICAL-102-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-BELTON',        tier: 'assembly', category: 'Columns', name: 'Belton Column',           summary: 'The Belton column - the same base, shaft and capital as the Belton Pilasters.',
          contains: [{ ref: 'CMP-BELTON-COLUMN-BASE', qty: 1 }, { ref: 'CMP-BELTON-COLUMN-SHAFT', qty: 1 }, { ref: 'CMP-BELTON-COLUMN-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-STOP-CHAMFER',  tier: 'assembly', category: 'Columns', name: 'Stop Chamfer Column',     summary: 'The Stop Chamfer column.',
          contains: [{ ref: 'CMP-STOP-CHAMFER-BASE', qty: 1 }, { ref: 'CMP-STOP-CHAMFER-SHAFT', qty: 1 }, { ref: 'CMP-STOP-CHAMFER-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-HARDWICK',      tier: 'assembly', category: 'Columns', name: 'Hardwick Column',         summary: 'The Hardwick column.',
          contains: [{ ref: 'CMP-HARDWICK-BASE', qty: 1 }, { ref: 'CMP-HARDWICK-SHAFT', qty: 1 }, { ref: 'CMP-HARDWICK-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-CRAGSIDE',      tier: 'assembly', category: 'Columns', name: 'Cragside Column',         summary: 'The Cragside column.',
          contains: [{ ref: 'CMP-CRAGSIDE-BASE', qty: 1 }, { ref: 'CMP-CRAGSIDE-SHAFT', qty: 1 }, { ref: 'CMP-CRAGSIDE-CAPITAL', qty: 1 }] },
        { id: 'ASM-COL-GOTHIC',        tier: 'assembly', category: 'Columns', name: 'Gothic Column',           summary: 'The Gothic octagonal column.',
          contains: [{ ref: 'CMP-GOTHIC-BASE', qty: 1 }, { ref: 'CMP-GOTHIC-SHAFT', qty: 1 }, { ref: 'CMP-GOTHIC-CAPITAL', qty: 1 }] },

        // Pilasters - column components become a pilaster when assembled ----
        { id: 'ASM-PILASTER-BELTON',   tier: 'assembly', category: 'Pilasters', name: 'Belton Pilasters', summary: 'Built from the Belton Column base, shaft and capital.',
          contains: [{ ref: 'CMP-BELTON-COLUMN-BASE', qty: 1 }, { ref: 'CMP-BELTON-COLUMN-SHAFT', qty: 1 }, { ref: 'CMP-BELTON-COLUMN-CAPITAL', qty: 1 }],
          assets: ['SketchUp Models', 'PDF Drawings'] },
        { id: 'ASM-PILASTER-ARGORY',   tier: 'assembly', category: 'Pilasters', name: 'Argory Pilasters', summary: 'Built from the Argory Column base, shaft and capital.',
          contains: [{ ref: 'CMP-ARGORY-COLUMN-BASE', qty: 1 }, { ref: 'CMP-ARGORY-COLUMN-SHAFT', qty: 1 }, { ref: 'CMP-ARGORY-COLUMN-CAPITAL', qty: 1 }] },

        // Internal Columns ---------------------------------------------------
        { id: 'ASM-INTERNAL-A',        tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type A',       summary: 'Internal column, Type A.',
          contains: [{ ref: 'CMP-INTERNAL-A-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-A-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-A-CAPITAL', qty: 1 }] },
        { id: 'ASM-INTERNAL-AB',       tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type A/B',     summary: 'Internal column, Type A/B.',
          contains: [{ ref: 'CMP-INTERNAL-AB-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-AB-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-AB-CAPITAL', qty: 1 }] },
        { id: 'ASM-INTERNAL-175',      tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type 175',     summary: 'Internal column, Type 175.',
          contains: [{ ref: 'CMP-INTERNAL-175-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-175-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-175-CAPITAL', qty: 1 }] },
        { id: 'ASM-INTERNAL-B',        tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type B',       summary: 'Internal column, Type B.',
          contains: [{ ref: 'CMP-INTERNAL-B-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-B-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-B-CAPITAL', qty: 1 }] },
        { id: 'ASM-INTERNAL-C',        tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type C',       summary: 'Internal column, Type C.',
          contains: [{ ref: 'CMP-INTERNAL-C-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-C-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-C-CAPITAL', qty: 1 }] },
        { id: 'ASM-INTERNAL-WRIGLEY',  tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type Wrigley', summary: 'Internal column, Type Wrigley.',
          contains: [{ ref: 'CMP-INTERNAL-WRIGLEY-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-WRIGLEY-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-WRIGLEY-CAPITAL', qty: 1 }] },
        { id: 'ASM-INTERNAL-D',        tier: 'assembly', category: 'Internal Columns', name: 'Internal Column Type D',       summary: 'Internal column, Type D.',
          contains: [{ ref: 'CMP-INTERNAL-D-BASE', qty: 1 }, { ref: 'CMP-INTERNAL-D-SHAFT', qty: 1 }, { ref: 'CMP-INTERNAL-D-CAPITAL', qty: 1 }] },

        // Framework ----------------------------------------------------------
        { id: 'ASM-ENTABLATURE',       tier: 'assembly', category: 'Framework', name: 'Entablature Assembly', summary: 'The band carried on the pilasters: architrave, frieze and cornice.',
          contains: [{ ref: 'CMP-ARCHITRAVE', qty: 1 }, { ref: 'CMP-FRIEZE', qty: 1 }, { ref: 'CMP-CORNICE', qty: 1 }] },
        { id: 'ASM-RING-BEAM',         tier: 'assembly', category: 'Framework', name: 'Ring Beam Assembly',   summary: 'The structural ring beam with its fascia, flashing and outlets.',
          contains: [{ ref: 'CMP-RING-BEAM', qty: 1 }, { ref: 'CMP-FASCIA', qty: 1 }, { ref: 'CMP-UPSTAND-FLASHING', qty: 1 },
                     { ref: 'PRD-BRACKET', qty: 6 }, { ref: 'PRD-GUTTER-OUTLET', qty: 2 }] },

        // Doors and Windows (the door holds a sub-assembly) ------------------
        // Rules on the door and its hinges are ValeSpec's own warning rules.
        { id: 'ASM-DOOR-LEAF',         tier: 'assembly', name: 'Door Leaf Assembly', summary: 'One leaf of the door: stiles, rails, panel, glazing and hinges.',
          contains: [{ ref: 'CMP-DOOR-STILE', qty: 2 }, { ref: 'CMP-DOOR-HEAD-RAIL', qty: 1 }, { ref: 'CMP-DOOR-MID-RAIL', qty: 1 }, { ref: 'CMP-DOOR-LOWER-RAIL', qty: 1 },
                     { ref: 'CMP-FIELDED-PANEL', qty: 1 }, { ref: 'CMP-GLAZING-PANEL', qty: 1 }, { ref: 'CMP-GLAZING-BAR', qty: 4 }, { ref: 'PRD-VG-IRN0101', qty: 3 }] },
        { id: 'ASM-DOOR',              tier: 'assembly', category: 'Doors and Windows', name: 'Door Assembly', summary: 'A pair of glazed doors with threshold and ironmongery.',
          contains: [{ ref: 'ASM-DOOR-LEAF', qty: 2 }, { ref: 'CMP-DOOR-THRESHOLD', qty: 1 }, { ref: 'PRD-VG-IRN0001', qty: 1 },
                     { ref: 'PRD-LOCK', qty: 1 }, { ref: 'PRD-SHOOT-BOLT', qty: 2 }],
          data: { 'Assembly Type': 'Double Doors', 'Handing / Opening': 'Outward' },
          params: ['Overall Size'],
          rules: [{ type: 'Minimum and Maximum Sizes', text: 'A door panel over 1050 mm wide needs approval from the Senior Technical Manager (ValeSpec).' },
                  { type: 'Minimum and Maximum Sizes', text: 'A door over 2650 mm high needs written approval from a Senior Architect before it is ordered (ValeSpec).' },
                  { type: 'Design Constraints',        text: 'A single door over 2200 mm high should be considered for an extra top bolt, subject to senior review (ValeSpec).' }],
          assets: ['SketchUp Models', 'PDF Drawings', 'Manufacturing Data', 'Installation Information'] },
        { id: 'ASM-WINDOW',            tier: 'assembly', category: 'Doors and Windows', name: 'Window Assembly', summary: 'A casement window with cill, mullion, glazing and ironmongery.',
          contains: [{ ref: 'CMP-CILL', qty: 1 }, { ref: 'CMP-MULLION', qty: 1 }, { ref: 'CMP-GLAZING-BAR', qty: 4 },
                     { ref: 'CMP-GLAZING-PANEL', qty: 2 }, { ref: 'PRD-ESPAGNOLETTE', qty: 2 }, { ref: 'PRD-VG-IRN0101', qty: 4 }],
          params: ['Overall Size'] },

        // Rainwater ----------------------------------------------------------
        { id: 'ASM-RAINWATER',         tier: 'assembly', category: 'Rainwater', name: 'Rainwater Hopper & Downpipe', summary: 'A hopper head and its downpipe, with elbows and wall brackets.',
          contains: [{ ref: 'PRD-RW-HOPPER', qty: 1 }, { ref: 'CMP-RW-PIPE-SECTION', qty: 1 }, { ref: 'PRD-RW-ELBOW', qty: 2 }, { ref: 'PRD-RW-WALL-BRACKET', qty: 2 }] },

        // Tie Bars and Lighting ----------------------------------------------
        { id: 'ASM-TIE-BAR',           tier: 'assembly', category: 'Tie Bars and Lighting', name: 'Tie Bar Assembly', summary: 'A decorative tie bar with its junction piece and soffit termination blocks.',
          contains: [{ ref: 'CMP-TIE-BAR-16', qty: 1 }, { ref: 'PRD-TIE-BAR-QUATREFOIL', qty: 1 }, { ref: 'CMP-TIE-BAR-SOFFIT-BLOCK', qty: 2 }] },
        { id: 'ASM-LIGHTING-BLOCK',    tier: 'assembly', category: 'Tie Bars and Lighting', name: 'Lighting Block Assembly', summary: 'An octagonal lighting block with its decorative turning and lighting hook.',
          contains: [{ ref: 'CMP-LIGHTING-BLOCK-OCTAGONAL', qty: 1 }, { ref: 'CMP-LIGHTING-BLOCK-TURNING', qty: 1 }, { ref: 'CMP-LIGHTING-BLOCK-HOOK', qty: 1 }] },


        // =====================================================================
        // COMPONENTS
        // =====================================================================

        // Framework ----------------------------------------------------------
        { id: 'CMP-ARCHITRAVE',       tier: 'component', name: 'Architrave',        summary: 'The lowest band of the entablature, spanning between the pilasters.',
          uses: ['RES-PRF-OGEE', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                     params: ['Length'] },
        { id: 'CMP-FRIEZE',           tier: 'component', name: 'Frieze',            summary: 'The flat middle band of the entablature.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-SHEET', 'RES-SPC-BOARD', 'RES-FIN-PAINT', 'RES-FIN-RAL'],   params: ['Length', 'Depth'] },
        { id: 'CMP-CORNICE',          tier: 'component', name: 'Cornice',           summary: 'The projecting top band of the entablature.',
          uses: ['RES-PRF-CORNICE', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                  params: ['Length'] },
        { id: 'CMP-RING-BEAM',        tier: 'component', name: 'Ring Beam',         summary: 'The structural beam the roof lantern sits on.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-SPC-FIXING'],                                 params: ['Length', 'Width', 'Depth'] },
        { id: 'CMP-FASCIA',           tier: 'component', name: 'Fascia',            summary: 'The board finishing the face of the ring beam.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length', 'Depth'] },
        { id: 'CMP-UPSTAND-FLASHING', tier: 'component', name: 'Upstand Flashing',  summary: 'Lead weathering where the lantern upstand meets the roof.',
          uses: ['RES-MAT-LEAD', 'RES-SPC-FIXING'],                                                     params: ['Length'] },

        // Doors and Windows --------------------------------------------------
        { id: 'CMP-DOOR-STILE',       tier: 'component', name: 'Door Stile',        summary: 'The vertical member of a door leaf.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length'],
          assets: ['CAD', 'Manufacturing Data'] },
        { id: 'CMP-DOOR-HEAD-RAIL',   tier: 'component', name: 'Door Head Rail',    summary: 'The top rail of a door leaf.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length'] },
        { id: 'CMP-DOOR-MID-RAIL',    tier: 'component', name: 'Door Mid Rail',     summary: 'The middle rail of a door leaf, between the glazing and the panel.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length'] },
        { id: 'CMP-DOOR-LOWER-RAIL',  tier: 'component', name: 'Door Lower Rail',   summary: 'The bottom rail of a door leaf.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length'] },
        { id: 'CMP-FIELDED-PANEL',    tier: 'component', name: 'Fielded Panel',     summary: 'The raised panel in the lower part of a door leaf.',
          uses: ['RES-PRF-BOLECTION', 'RES-MAT-BOARD', 'RES-SPC-BOARD', 'RES-FIN-PAINT', 'RES-FIN-RAL'], params: ['Length', 'Width'] },
        { id: 'CMP-GLAZING-PANEL',    tier: 'component', name: 'Glazing Panel',     summary: 'A sealed glass unit, sized to its opening.',
          uses: ['RES-SPC-GLASS'],                                                                      params: ['Length', 'Width'],
          rules: [{ type: 'Design Constraints', text: 'Glass make-up follows the Glass Specification for its location.' }] },
        { id: 'CMP-GLAZING-BAR',      tier: 'component', name: 'Glazing Bar',       summary: 'The bar dividing the glazing into panes.',
          uses: ['RES-PRF-ASTRAGAL', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                 params: ['Length'],
          rules: [{ type: 'Spacing Rules', text: 'Bar positions are set from the opening width and the chosen pane pattern.' }],
          assets: ['CAD', 'Manufacturing Data', 'Technical Specifications'] },
        { id: 'CMP-DOOR-THRESHOLD',   tier: 'component', name: 'Door Threshold',    summary: 'The sill at the foot of the door opening.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-OAK', 'RES-FIN-STAINS'],                                    params: ['Length'] },
        { id: 'CMP-CILL',             tier: 'component', name: 'Cill',              summary: 'The sill at the foot of a window.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length'] },
        { id: 'CMP-MULLION',          tier: 'component', name: 'Mullion',           summary: 'The vertical member dividing a window.',
          uses: ['RES-PRF-TIMBER', 'RES-PRF-OGEE', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],   params: ['Length'] },

        // Roof Lantern -------------------------------------------------------
        { id: 'CMP-RIDGE-BEAM',       tier: 'component', name: 'Ridge Beam',        summary: 'The spine of the roof lantern.',
          uses: ['RES-PRF-ALU-EXTRUSION', 'RES-MAT-ALUMINIUM', 'RES-FIN-METAL'],                        params: ['Length'] },
        { id: 'CMP-RIDGE-CAP',        tier: 'component', name: 'Ridge Cap',         summary: 'The cover capping the ridge.',
          uses: ['RES-PRF-ALU-EXTRUSION', 'RES-MAT-ALUMINIUM', 'RES-FIN-RAL'],                          params: ['Length'] },
        { id: 'CMP-HIP-BAR',          tier: 'component', name: 'Hip Bar',           summary: 'The bar running down each hip of the lantern.',
          uses: ['RES-PRF-ALU-EXTRUSION', 'RES-MAT-ALUMINIUM', 'RES-FIN-METAL'],                        params: ['Length'] },
        { id: 'CMP-HIP-CAP',          tier: 'component', name: 'Hip Cap',           summary: 'The cover capping each hip bar.',
          uses: ['RES-PRF-ALU-EXTRUSION', 'RES-MAT-ALUMINIUM', 'RES-FIN-RAL'],                          params: ['Length'] },
        { id: 'CMP-RAFTER-BAR',       tier: 'component', name: 'Rafter Bar',        summary: 'The glazing bar running from ridge to eaves.',
          uses: ['RES-PRF-ALU-EXTRUSION', 'RES-MAT-ALUMINIUM', 'RES-FIN-METAL', 'RES-FIN-RAL'],         params: ['Length'] },
        { id: 'CMP-VENT-FRAME',       tier: 'component', name: 'Vent Frame',        summary: 'The opening frame of the roof vent.',
          uses: ['RES-PRF-ALU-EXTRUSION', 'RES-MAT-ALUMINIUM', 'RES-FIN-RAL'],                          params: ['Length', 'Width'] },

        // Rainwater, Tie Bars and Lighting -----------------------------------
        { id: 'CMP-RW-PIPE-SECTION',  tier: 'component', name: 'Rainwater Pipe Section', summary: 'A length of downpipe, cut to suit.',
          uses: ['RES-FIN-RAL'],                                                                        params: ['Length'] },
        { id: 'CMP-TIE-BAR-16',       tier: 'component', name: '16mm Tie Bar',      summary: 'The 16mm tie bar, cut to the span.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'],                                                    params: ['Length'] },
        { id: 'CMP-TIE-BAR-SOFFIT-BLOCK', tier: 'component', name: 'Tie Bar Soffit Termination Block', summary: 'The block that ends the tie bar at the soffit.' },
        { id: 'CMP-LIGHTING-BLOCK-OCTAGONAL', tier: 'component', name: 'Octagonal Lighting Block', summary: 'The octagonal block of the lighting block assembly.' },
        { id: 'CMP-LIGHTING-BLOCK-TURNING',   tier: 'component', name: 'Lighting Block Decorative Turning', summary: 'The decorative turning below the lighting block.' },
        { id: 'CMP-LIGHTING-BLOCK-HOOK',      tier: 'component', name: 'Lighting Hook', summary: 'The hook a light fitting hangs from.',
          uses: ['RES-FIN-METAL'] },

        // Column parts - classical aluminium columns ------------------------
        { id: 'CMP-CLASSICAL-300-BASE',    tier: 'component', name: 'Classical 300mm Column Base',    uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-300-SHAFT',   tier: 'component', name: 'Classical 300mm Column Shaft',   uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'], params: ['Length'] },
        { id: 'CMP-CLASSICAL-300-CAPITAL', tier: 'component', name: 'Classical 300mm Column Capital', uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-250-BASE',    tier: 'component', name: 'Classical 250mm Column Base',    uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-250-SHAFT',   tier: 'component', name: 'Classical 250mm Column Shaft',   uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'], params: ['Length'] },
        { id: 'CMP-CLASSICAL-250-CAPITAL', tier: 'component', name: 'Classical 250mm Column Capital', uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-200-BASE',    tier: 'component', name: 'Classical 200mm Column Base',    uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-200-SHAFT',   tier: 'component', name: 'Classical 200mm Column Shaft',   uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'], params: ['Length'] },
        { id: 'CMP-CLASSICAL-200-CAPITAL', tier: 'component', name: 'Classical 200mm Column Capital', uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-175-BASE',    tier: 'component', name: 'Classical 175mm Column Base',    uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-175-SHAFT',   tier: 'component', name: 'Classical 175mm Column Shaft',   uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'], params: ['Length'] },
        { id: 'CMP-CLASSICAL-175-CAPITAL', tier: 'component', name: 'Classical 175mm Column Capital', uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-150-BASE',    tier: 'component', name: 'Classical 150mm Column Base',    uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-150-SHAFT',   tier: 'component', name: 'Classical 150mm Column Shaft',   uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'], params: ['Length'] },
        { id: 'CMP-CLASSICAL-150-CAPITAL', tier: 'component', name: 'Classical 150mm Column Capital', uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-102-BASE',    tier: 'component', name: 'Classical 102mm Column Base',    uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'CMP-CLASSICAL-102-SHAFT',   tier: 'component', name: 'Classical 102mm Column Shaft',   uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'], params: ['Length'] },
        { id: 'CMP-CLASSICAL-102-CAPITAL', tier: 'component', name: 'Classical 102mm Column Capital', uses: ['RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },

        // Column parts - the named ranges (materials still to be captured) --
        { id: 'CMP-BELTON-COLUMN-BASE',    tier: 'component', name: 'Belton Column Base',    summary: 'Used by both the Belton Column and the Belton Pilasters.' },
        { id: 'CMP-BELTON-COLUMN-SHAFT',   tier: 'component', name: 'Belton Column Shaft',   summary: 'Used by both the Belton Column and the Belton Pilasters.', params: ['Length'] },
        { id: 'CMP-BELTON-COLUMN-CAPITAL', tier: 'component', name: 'Belton Column Capital', summary: 'Used by both the Belton Column and the Belton Pilasters.' },
        { id: 'CMP-ARGORY-COLUMN-BASE',    tier: 'component', name: 'Argory Column Base' },
        { id: 'CMP-ARGORY-COLUMN-SHAFT',   tier: 'component', name: 'Argory Column Shaft',   params: ['Length'] },
        { id: 'CMP-ARGORY-COLUMN-CAPITAL', tier: 'component', name: 'Argory Column Capital' },
        { id: 'CMP-STOP-CHAMFER-BASE',     tier: 'component', name: 'Stop Chamfer Column Base' },
        { id: 'CMP-STOP-CHAMFER-SHAFT',    tier: 'component', name: 'Stop Chamfer Column Shaft',   params: ['Length'] },
        { id: 'CMP-STOP-CHAMFER-CAPITAL',  tier: 'component', name: 'Stop Chamfer Column Capital' },
        { id: 'CMP-HARDWICK-BASE',         tier: 'component', name: 'Hardwick Column Base' },
        { id: 'CMP-HARDWICK-SHAFT',        tier: 'component', name: 'Hardwick Column Shaft',       params: ['Length'] },
        { id: 'CMP-HARDWICK-CAPITAL',      tier: 'component', name: 'Hardwick Column Capital' },
        { id: 'CMP-CRAGSIDE-BASE',         tier: 'component', name: 'Cragside Column Base' },
        { id: 'CMP-CRAGSIDE-SHAFT',        tier: 'component', name: 'Cragside Column Shaft',       params: ['Length'] },
        { id: 'CMP-CRAGSIDE-CAPITAL',      tier: 'component', name: 'Cragside Column Capital' },
        { id: 'CMP-GOTHIC-BASE',           tier: 'component', name: 'Gothic Column Base' },
        { id: 'CMP-GOTHIC-SHAFT',          tier: 'component', name: 'Gothic Column Shaft',         params: ['Length'] },
        { id: 'CMP-GOTHIC-CAPITAL',        tier: 'component', name: 'Gothic Column Capital' },

        // Column parts - internal columns ------------------------------------
        { id: 'CMP-INTERNAL-A-BASE',          tier: 'component', name: 'Type A Internal Column Base' },
        { id: 'CMP-INTERNAL-A-SHAFT',         tier: 'component', name: 'Type A Internal Column Shaft',       params: ['Length'] },
        { id: 'CMP-INTERNAL-A-CAPITAL',       tier: 'component', name: 'Type A Internal Column Capital' },
        { id: 'CMP-INTERNAL-AB-BASE',         tier: 'component', name: 'Type A/B Internal Column Base' },
        { id: 'CMP-INTERNAL-AB-SHAFT',        tier: 'component', name: 'Type A/B Internal Column Shaft',     params: ['Length'] },
        { id: 'CMP-INTERNAL-AB-CAPITAL',      tier: 'component', name: 'Type A/B Internal Column Capital' },
        { id: 'CMP-INTERNAL-175-BASE',        tier: 'component', name: 'Type 175 Internal Column Base' },
        { id: 'CMP-INTERNAL-175-SHAFT',       tier: 'component', name: 'Type 175 Internal Column Shaft',     params: ['Length'] },
        { id: 'CMP-INTERNAL-175-CAPITAL',     tier: 'component', name: 'Type 175 Internal Column Capital' },
        { id: 'CMP-INTERNAL-B-BASE',          tier: 'component', name: 'Type B Internal Column Base' },
        { id: 'CMP-INTERNAL-B-SHAFT',         tier: 'component', name: 'Type B Internal Column Shaft',       params: ['Length'] },
        { id: 'CMP-INTERNAL-B-CAPITAL',       tier: 'component', name: 'Type B Internal Column Capital' },
        { id: 'CMP-INTERNAL-C-BASE',          tier: 'component', name: 'Type C Internal Column Base' },
        { id: 'CMP-INTERNAL-C-SHAFT',         tier: 'component', name: 'Type C Internal Column Shaft',       params: ['Length'] },
        { id: 'CMP-INTERNAL-C-CAPITAL',       tier: 'component', name: 'Type C Internal Column Capital' },
        { id: 'CMP-INTERNAL-WRIGLEY-BASE',    tier: 'component', name: 'Type Wrigley Internal Column Base' },
        { id: 'CMP-INTERNAL-WRIGLEY-SHAFT',   tier: 'component', name: 'Type Wrigley Internal Column Shaft', params: ['Length'] },
        { id: 'CMP-INTERNAL-WRIGLEY-CAPITAL', tier: 'component', name: 'Type Wrigley Internal Column Capital' },
        { id: 'CMP-INTERNAL-D-BASE',          tier: 'component', name: 'Type D Internal Column Base' },
        { id: 'CMP-INTERNAL-D-SHAFT',         tier: 'component', name: 'Type D Internal Column Shaft',       params: ['Length'] },
        { id: 'CMP-INTERNAL-D-CAPITAL',       tier: 'component', name: 'Type D Internal Column Capital' },

        // Framework Sections -------------------------------------------------
        { id: 'CMP-UPRIGHT-44X94',       tier: 'component', category: 'Framework Sections', name: '44 x 94mm Upright Section',       uses: ['RES-PRF-TIMBER'], data: { 'Width': '44mm', 'Depth': '94mm' },  params: ['Length'] },
        { id: 'CMP-UPRIGHT-56X94',       tier: 'component', category: 'Framework Sections', name: '56 x 94mm Upright Section',       uses: ['RES-PRF-TIMBER'], data: { 'Width': '56mm', 'Depth': '94mm' },  params: ['Length'] },
        { id: 'CMP-UPRIGHT-56X138',      tier: 'component', category: 'Framework Sections', name: '56 x 138mm Upright Section',      uses: ['RES-PRF-TIMBER'], data: { 'Width': '56mm', 'Depth': '138mm' }, params: ['Length'] },
        { id: 'CMP-UPRIGHT-SPLIT-44X94', tier: 'component', category: 'Framework Sections', name: '44 x 94mm Split Upright Section', uses: ['RES-PRF-TIMBER'], data: { 'Width': '44mm', 'Depth': '94mm' },  params: ['Length'] },

        // Cill Nosings - "worksWith" links each to the columns it fits ------
        { id: 'CMP-CILL-NOSING-180', tier: 'component', category: 'Cill Nosings', name: '180mm Cill Nosing', data: { 'For use with': 'Gothic Octagonal Columns' },                    worksWith: ['ASM-COL-GOTHIC'] },
        { id: 'CMP-CILL-NOSING-166', tier: 'component', category: 'Cill Nosings', name: '166mm Cill Nosing', data: { 'For use with': '300mm Aluminium Columns' },                     worksWith: ['ASM-COL-CLASSICAL-300'] },
        { id: 'CMP-CILL-NOSING-132', tier: 'component', category: 'Cill Nosings', name: '132mm Cill Nosing', data: { 'For use with': '250mm Aluminium Columns' },                     worksWith: ['ASM-COL-CLASSICAL-250'] },
        { id: 'CMP-CILL-NOSING-124', tier: 'component', category: 'Cill Nosings', name: '124mm Cill Nosing', data: { 'For use with': '200mm Aluminium Columns' },                     worksWith: ['ASM-COL-CLASSICAL-200'] },
        { id: 'CMP-CILL-NOSING-122', tier: 'component', category: 'Cill Nosings', name: '122mm Cill Nosing', data: { 'For use with': '175mm Aluminium Columns' },                     worksWith: ['ASM-COL-CLASSICAL-175'] },
        { id: 'CMP-CILL-NOSING-119', tier: 'component', category: 'Cill Nosings', name: '119mm Cill Nosing', data: { 'For use with': '152mm Aluminium Columns / 44mm Timber Columns' }, worksWith: ['ASM-COL-CLASSICAL-150'] },
        { id: 'CMP-CILL-NOSING-98',  tier: 'component', category: 'Cill Nosings', name: '98mm Cill Nosing',  data: { 'For use with': 'Belton Bases' },                                worksWith: ['CMP-BELTON-COLUMN-BASE'] },
        { id: 'CMP-CILL-NOSING-95',  tier: 'component', category: 'Cill Nosings', name: '95mm Cill Nosing',  data: { 'For use with': 'Corbel Bases' } },
        { id: 'CMP-CILL-NOSING-85',  tier: 'component', category: 'Cill Nosings', name: '85mm Cill Nosing',  data: { 'For use with': '102mm Aluminium Columns' },                     worksWith: ['ASM-COL-CLASSICAL-102'] },
        { id: 'CMP-CILL-NOSING-75',  tier: 'component', category: 'Cill Nosings', name: '75mm Cill Nosing',  data: { 'For use with': 'Cragside Columns' },                            worksWith: ['ASM-COL-CRAGSIDE'] },
        { id: 'CMP-CILL-NOSING-72',  tier: 'component', category: 'Cill Nosings', name: '72mm Cill Nosing',  data: { 'For use with': 'Stop Chamfer Columns' },                        worksWith: ['ASM-COL-STOP-CHAMFER'] },
        { id: 'CMP-CILL-NOSING-70',  tier: 'component', category: 'Cill Nosings', name: '70mm Cill Nosing',  data: { 'For use with': 'Hardwick Columns' },                            worksWith: ['ASM-COL-HARDWICK'] },
        { id: 'CMP-CILL-NOSING-65',  tier: 'component', category: 'Cill Nosings', name: '65mm Cill Nosing',  data: { 'For use with': 'Stop Chamfer Columns' },                        worksWith: ['ASM-COL-STOP-CHAMFER'] },
        { id: 'CMP-CILL-NOSING-60',  tier: 'component', category: 'Cill Nosings', name: '60mm Cill Nosing',  data: { 'For use with': 'Stop Chamfer Columns' },                        worksWith: ['ASM-COL-STOP-CHAMFER'] },

        // Joinery, Eaves and Gutters -----------------------------------------
        { id: 'CMP-WINDOW-BOARD',        tier: 'component', category: 'Joinery',           name: 'Window Board',        uses: ['RES-PRF-TIMBER'], params: ['Length', 'Depth'] },
        { id: 'CMP-SKIRTING-BOARDS',     tier: 'component', category: 'Joinery',           name: 'Skirting Boards',     uses: ['RES-PRF-TIMBER'], params: ['Length'] },
        { id: 'CMP-STAFF-BEADS',         tier: 'component', category: 'Joinery',           name: 'Staff Beads',         uses: ['RES-PRF-TIMBER'], params: ['Length'] },
        { id: 'CMP-BELTON-EAVES-GUTTER', tier: 'component', category: 'Eaves and Gutters', name: 'Belton Eaves Gutter', params: ['Length'] },


        // =====================================================================
        // PRODUCTS
        // =====================================================================

        // Ironmongery - lever handles and hinges from ValeSpec ---------------
        { id: 'PRD-VG-IRN0001', tier: 'product', category: 'Ironmongery', name: 'Scroll Lever Handle', summary: 'Traditional lever handle.',
          uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'],
          data: { 'Product Code': 'VG_IRN0001', 'Supplier / Manufacturer': 'Croft', 'Fixed or Selectable Sizes': 'Fixed', 'Lever Height': '1000 mm from the floor (ValeSpec default)', 'Complementary': 'Yes', 'Source': 'ValeSpec hardware library' },
          rules: [{ type: 'Product Selection Rules', text: 'One lever type and one finish apply to every door in a ValeSpec project; a door that differs is flagged.' }],
          assets: ['CAD', 'Supplier Information'] },
        { id: 'PRD-VG-IRN0002', tier: 'product', category: 'Ironmongery', name: 'Plain Lever Handle', summary: 'Simple form lever handle.',
          uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'],
          data: { 'Product Code': 'VG_IRN0002', 'Supplier / Manufacturer': 'Croft', 'Fixed or Selectable Sizes': 'Fixed', 'Lever Height': '1000 mm from the floor (ValeSpec default)', 'Complementary': 'Yes', 'Source': 'ValeSpec hardware library' },
          assets: ['CAD', 'Supplier Information'] },
        { id: 'PRD-VG-IRN0003', tier: 'product', category: 'Ironmongery', name: 'Newton Lever Handle', summary: 'Contemporary styled lever handle.',
          data: { 'Product Code': 'VG_IRN0003', 'Supplier / Manufacturer': 'Croft', 'Fixed or Selectable Sizes': 'Fixed', 'Finish': 'None listed in ValeSpec yet', 'Lever Height': '1000 mm from the floor (ValeSpec default)', 'Complementary': 'Yes', 'Source': 'ValeSpec hardware library' },
          assets: ['CAD'] },
        { id: 'PRD-LEVER-FITZROY',  tier: 'product', category: 'Ironmongery', name: 'Fitzroy Lever Handle', summary: 'A lever type offered in ValeSpec, with no hardware record yet.', data: { 'Availability / Status': 'Lever type only - no ValeSpec hardware record yet' } },
        { id: 'PRD-LEVER-EMPIRE',   tier: 'product', category: 'Ironmongery', name: 'Empire Lever Handle',  summary: 'A lever type offered in ValeSpec, with no hardware record yet.', data: { 'Availability / Status': 'Lever type only - no ValeSpec hardware record yet' } },
        { id: 'PRD-LEVER-LINDUM',   tier: 'product', category: 'Ironmongery', name: 'Lindum Lever Handle',  summary: 'A lever type offered in ValeSpec, with no hardware record yet.', data: { 'Availability / Status': 'Lever type only - no ValeSpec hardware record yet' } },
        { id: 'PRD-LEVER-GRIFFIN',  tier: 'product', category: 'Ironmongery', name: 'Griffin Lever Handle', summary: 'A lever type offered in ValeSpec, with no hardware record yet.', data: { 'Availability / Status': 'Lever type only - no ValeSpec hardware record yet' } },
        { id: 'PRD-LEVER-ASPEN',    tier: 'product', category: 'Ironmongery', name: 'Aspen Lever Handle',   summary: 'A lever type offered in ValeSpec, with no hardware record yet.', data: { 'Availability / Status': 'Lever type only - no ValeSpec hardware record yet' } },
        { id: 'PRD-LEVER-LIPSHAM',  tier: 'product', category: 'Ironmongery', name: 'Lipsham Lever Handle', summary: 'A lever type offered in ValeSpec, with no hardware record yet.', data: { 'Availability / Status': 'Lever type only - no ValeSpec hardware record yet' } },
        { id: 'PRD-VG-IRN0101', tier: 'product', category: 'Ironmongery', name: 'Standard Hinge', summary: 'A standard hinge for a door or window.',
          uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'],
          data: { 'Product Code': 'VG_IRN0101', 'Supplier / Manufacturer': 'TBC', 'Fixed or Selectable Sizes': 'Projection: 4, 5, 6 or 8 inch', 'Hinge Style': 'Decorative or Basic', 'Complementary': 'Yes', 'Source': 'ValeSpec hardware library' },
          rules: [{ type: 'Quantity Rules', text: 'Hinges per leaf come from the ValeSpec hinge calculator: 3 as standard; 4 for a door 2200 mm or taller; 4 hung Double Top for a wide door (single 1000 mm or more, double 1800 mm or more overall).' },
                  { type: 'Design Constraints', text: 'An 8-inch projection is non-standard and needs senior architect approval (ValeSpec).' }] },
        { id: 'PRD-VG-IRN0102', tier: 'product', category: 'Ironmongery', name: 'Standard Hinge with Urns', summary: 'A standard hinge for a door or window, with urn finials.',
          uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'],
          data: { 'Product Code': 'VG_IRN0102', 'Supplier / Manufacturer': 'TBC', 'Fixed or Selectable Sizes': 'Projection: 4, 5, 6 or 8 inch', 'Hinge Style': 'Decorative or Basic', 'Complementary': 'Yes', 'Source': 'ValeSpec hardware library' },
          rules: [{ type: 'Quantity Rules', text: 'Hinges per leaf come from the ValeSpec hinge calculator: 3 as standard; 4 for a door 2200 mm or taller; 4 hung Double Top for a wide door (single 1000 mm or more, double 1800 mm or more overall).' },
                  { type: 'Design Constraints', text: 'An 8-inch projection is non-standard and needs senior architect approval (ValeSpec).' }] },
        { id: 'PRD-LOCK',           tier: 'product', category: 'Ironmongery', name: 'Lock',          summary: 'The lock for the active door leaf.',
          uses: ['RES-SPC-FIXING'],
          rules: [{ type: 'Compatibility Rules', text: 'Must suit the leaf thickness and the chosen lever handle.' }] },
        { id: 'PRD-SHOOT-BOLT',     tier: 'product', category: 'Ironmongery', name: 'Shoot Bolt',    summary: 'The bolt securing the second leaf at head and foot.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'] },
        { id: 'PRD-ESPAGNOLETTE',   tier: 'product', category: 'Ironmongery', name: 'Espagnolette',  summary: 'Multi-point locking gear for a casement.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'] },

        // Cabin Hooks - sizes as ValeSpec offers them, plus two unavailable --
        { id: 'PRD-CABIN-HOOK-4IN',   tier: 'product', category: 'Cabin Hooks', name: '4" Cabin Hook',   uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'], data: { 'Fixed or Selectable Sizes': '4 inch' },
          rules: [{ type: 'Quantity Rules', text: 'Hooks and eyes follow the door type in ValeSpec: a single door 1 + 1, a double or bifold door 2 + 2.' }] },
        { id: 'PRD-CABIN-HOOK-6IN',   tier: 'product', category: 'Cabin Hooks', name: '6" Cabin Hook',   uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'], data: { 'Fixed or Selectable Sizes': '6 inch' } },
        { id: 'PRD-CABIN-HOOK-10IN',  tier: 'product', category: 'Cabin Hooks', name: '10" Cabin Hook',  uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'], data: { 'Fixed or Selectable Sizes': '10 inch' } },
        { id: 'PRD-CABIN-HOOK-12IN',  tier: 'product', category: 'Cabin Hooks', name: '12" Cabin Hook',  uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'], data: { 'Fixed or Selectable Sizes': '12 inch' } },
        { id: 'PRD-CABIN-HOOK-350MM', tier: 'product', category: 'Cabin Hooks', name: '350mm Cabin Hook', data: { 'Fixed or Selectable Sizes': '350mm', 'Availability / Status': 'Unavailable' } },
        { id: 'PRD-CABIN-HOOK-400MM', tier: 'product', category: 'Cabin Hooks', name: '400mm Cabin Hook', data: { 'Fixed or Selectable Sizes': '400mm', 'Availability / Status': 'Unavailable' } },
        { id: 'PRD-CABIN-HOOK-18IN',  tier: 'product', category: 'Cabin Hooks', name: '18" Cabin Hook',  uses: ['RES-FIN-UNLACQUERED-BRASS', 'RES-FIN-SATIN-NICKEL', 'RES-FIN-BRONZE'], data: { 'Fixed or Selectable Sizes': '18 inch' } },

        // Roof Finials -------------------------------------------------------
        { id: 'PRD-VG739A',          tier: 'product', category: 'Roof Finials', name: 'Finial',                               data: { 'Product Code': 'VG739A' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG590',           tier: 'product', category: 'Roof Finials', name: 'Finial Wings',                         data: { 'Product Code': 'VG590' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-HARDWICK-FINIAL', tier: 'product', category: 'Roof Finials', name: 'Hardwick Finial',                      uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG724',           tier: 'product', category: 'Roof Finials', name: 'Belton Post and Urn',                  data: { 'Product Code': 'VG724' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VGRJ28',          tier: 'product', category: 'Roof Finials', name: 'Turner Pinnacle (Timber)',             data: { 'Product Code': 'VGRJ28' }, uses: ['RES-FIN-PAINT'] },
        { id: 'PRD-VG715',           tier: 'product', category: 'Roof Finials', name: 'Cragside (Large) Spire Finial',        data: { 'Product Code': 'VG715' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG717',           tier: 'product', category: 'Roof Finials', name: 'Cragside Spire Finial',                data: { 'Product Code': 'VG717' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG726',           tier: 'product', category: 'Roof Finials', name: 'Belton Urn Finial',                    data: { 'Product Code': 'VG726' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG714',           tier: 'product', category: 'Roof Finials', name: 'Belton Ball Finial',                   data: { 'Product Code': 'VG714' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG398',           tier: 'product', category: 'Roof Finials', name: 'Small Ball Finial',                    data: { 'Product Code': 'VG398' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG403',           tier: 'product', category: 'Roof Finials', name: 'Finial',                               data: { 'Product Code': 'VG403' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG506',           tier: 'product', category: 'Roof Finials', name: 'Medium Acorn Finial',                  data: { 'Product Code': 'VG506' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG413',           tier: 'product', category: 'Roof Finials', name: 'Medium Finial',                        data: { 'Product Code': 'VG413' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG401',           tier: 'product', category: 'Roof Finials', name: 'Spire Finial with VG739B Scrolls',     data: { 'Product Code': 'VG401' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG395',           tier: 'product', category: 'Roof Finials', name: 'Small Urn',                            data: { 'Product Code': 'VG395' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG514',           tier: 'product', category: 'Roof Finials', name: 'Small Urn Finial',                     data: { 'Product Code': 'VG514' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG599',           tier: 'product', category: 'Roof Finials', name: 'Large Urn Finial',                     data: { 'Product Code': 'VG599' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG600',           tier: 'product', category: 'Roof Finials', name: 'Medium Urn Finial',                    data: { 'Product Code': 'VG600' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG605',           tier: 'product', category: 'Roof Finials', name: 'Large Acorn Finial',                   data: { 'Product Code': 'VG605' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG390',           tier: 'product', category: 'Roof Finials', name: 'Large Ball Finial',                    data: { 'Product Code': 'VG390' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG391',           tier: 'product', category: 'Roof Finials', name: 'Cone Finial',                          data: { 'Product Code': 'VG391' },  uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },

        // Roof Crestings -----------------------------------------------------
        { id: 'PRD-VG515', tier: 'product', category: 'Roof Crestings', name: 'Belton Ridge Cresting',         data: { 'Product Code': 'VG515' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG331', tier: 'product', category: 'Roof Crestings', name: 'Castle Cresting',               data: { 'Product Code': 'VG331' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG337', tier: 'product', category: 'Roof Crestings', name: 'Gothic Cresting',               data: { 'Product Code': 'VG337' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG381', tier: 'product', category: 'Roof Crestings', name: 'Double Trefoil Crest',          data: { 'Product Code': 'VG381' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG382', tier: 'product', category: 'Roof Crestings', name: 'Small Square Cresting',         data: { 'Product Code': 'VG382' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG384', tier: 'product', category: 'Roof Crestings', name: 'Argyll Crest',                  data: { 'Product Code': 'VG384' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG389', tier: 'product', category: 'Roof Crestings', name: 'Newett Crest',                  data: { 'Product Code': 'VG389' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG405', tier: 'product', category: 'Roof Crestings', name: 'Fletcher Crest',                data: { 'Product Code': 'VG405' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG532', tier: 'product', category: 'Roof Crestings', name: 'Van Maurick Crest',             data: { 'Product Code': 'VG532' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG556', tier: 'product', category: 'Roof Crestings', name: 'Castellated Cresting',          data: { 'Product Code': 'VG556' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG716', tier: 'product', category: 'Roof Crestings', name: 'Ridge Cresting',                data: { 'Product Code': 'VG716' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG589', tier: 'product', category: 'Roof Crestings', name: 'Split Pattern',                 data: { 'Product Code': 'VG589' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG656', tier: 'product', category: 'Roof Crestings', name: 'Castellated Decor Strip',       data: { 'Product Code': 'VG656' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG696', tier: 'product', category: 'Roof Crestings', name: 'A Circled Trefoil Crest',       data: { 'Product Code': 'VG696' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG722', tier: 'product', category: 'Roof Crestings', name: 'Small Audi Crest',              data: { 'Product Code': 'VG722' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG725', tier: 'product', category: 'Roof Crestings', name: 'Two Patterns Rounded',          data: { 'Product Code': 'VG725' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },
        { id: 'PRD-VG559', tier: 'product', category: 'Roof Crestings', name: 'Medieval Decorative Lampshade', data: { 'Product Code': 'VG559' }, uses: ['RES-SPC-CASTING', 'RES-FIN-RAL'] },

        // Products used inside assemblies only -------------------------------
        { id: 'PRD-VENT-ACTUATOR',      tier: 'product', name: 'Vent Actuator',              summary: 'The electric opener for the roof vent.',            uses: ['RES-SPC-FIXING'] },
        { id: 'PRD-BRACKET',            tier: 'product', name: 'Bracket',                    summary: 'A bracket fixing the ring beam to the structure.', uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'] },
        { id: 'PRD-GUTTER-OUTLET',      tier: 'product', name: 'Gutter Outlet',              summary: 'The outlet draining the gutter behind the entablature.', uses: ['RES-MAT-ALUMINIUM', 'RES-SPC-FIXING'] },
        { id: 'PRD-RW-HOPPER',          tier: 'product', name: 'Rainwater Hopper',           summary: 'The hopper head collecting water from the gutter.', uses: ['RES-FIN-RAL'] },
        { id: 'PRD-RW-ELBOW',           tier: 'product', name: 'Rainwater Pipe Elbow',       summary: 'A bend in the downpipe.',                           uses: ['RES-FIN-RAL'] },
        { id: 'PRD-RW-WALL-BRACKET',    tier: 'product', name: 'Rainwater Pipe Wall Bracket', summary: 'Fixes the downpipe to the wall.',                  uses: ['RES-FIN-RAL', 'RES-SPC-FIXING'] },
        { id: 'PRD-TIE-BAR-QUATREFOIL', tier: 'product', name: 'Tie Bar Quatrefoil Junction Piece', summary: 'The decorative quatrefoil piece where tie bars meet.' }
    ],
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Scheme - One Configured Project Built From the Library
    // -------------------------------------------------------------------------
    scheme: {
        id      : 'SCH-ORANGERY-01',
        name    : 'Orangery Option 01',
        summary : 'An example orangery, configured entirely from the Object Library.',
        data    : {
            'Scheme Reference'      : 'Orangery Option 01',
            'Version'               : 'v1.0',
            'Status'                : 'Design option',
            'Overall Length'        : '6.0 m',
            'Overall Width'         : '4.2 m',
            'Eaves Height'          : '2.6 m',
            'Roof Pitch'            : '25°',
            'Glazing Specification' : 'Glass Specification',
            'Finish Selection'      : 'Paint system, RAL to client choice; ironmongery in Satin Nickel'
        },
        assets  : ['SketchUp Models', 'PDF Drawings', 'Cost Data', 'Historical or Revision Data'],

        families: [
            { id: 'FAM-ROOF-LANTERN',    name: 'Roof Lantern',    summary: 'The glazed roof lantern.',
              data: { 'Family Type': 'Roof' },
              contains: [{ ref: 'ASM-RIDGE', qty: 1 }, { ref: 'ASM-HIP', qty: 4 }, { ref: 'ASM-RAFTER', qty: 8 },
                         { ref: 'ASM-ETR-VENT', qty: 1 }, { ref: 'ASM-LIGHTING-BLOCK', qty: 1 },
                         { ref: 'PRD-VG726', qty: 2 }, { ref: 'PRD-VG515', qty: 4 }] },
            { id: 'FAM-FRAMEWORK',       name: 'Framework',       summary: 'The pilasters, entablatures and structure that frame the building.',
              data: { 'Family Type': 'Structure' },
              contains: [{ ref: 'ASM-PILASTER-BELTON', qty: 6 }, { ref: 'ASM-ENTABLATURE', qty: 3 }, { ref: 'ASM-RING-BEAM', qty: 1 },
                         { ref: 'ASM-TIE-BAR', qty: 2 }, { ref: 'ASM-RAINWATER', qty: 2 }] },
            { id: 'FAM-NORTH-ELEVATION', name: 'North Elevation', summary: 'The doors and windows on the north face.',
              data: { 'Family Type': 'Elevation', 'Location / Orientation': 'North' },
              contains: [{ ref: 'ASM-DOOR', qty: 1 }, { ref: 'ASM-WINDOW', qty: 2 }] },
            { id: 'FAM-SOUTH-ELEVATION', name: 'South Elevation', summary: 'The doors and windows on the south face.',
              data: { 'Family Type': 'Elevation', 'Location / Orientation': 'South' },
              contains: [{ ref: 'ASM-DOOR', qty: 1 }, { ref: 'ASM-WINDOW', qty: 3 }] }
        ]
    },
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Guided Tour - The Story Told to a Director, One Step at a Time
    // -------------------------------------------------------------------------
    // view    : 'scheme' (default) or 'library'
    // show    : how far the chart opens - 'scheme', 'family', 'assembly', 'parts', 'all'
    //           (in the library view 'family' opens the category shelves)
    // select  : an id to select (its first place in the view)
    // reveal  : ids whose every placement is opened up on the chart
    // focus   : what the camera frames - 'all', 'selection', 'parent', 'twins',
    //           'uses', 'column:<tier>' or 'column:<tier>,<tier>'
    // dim     : false shows the selection without fading everything else
    // panel   : opens the side panel at a section - 'built', 'bom', 'uses',
    //           'data', 'rules', 'assets', 'used-by'
    // links   : true shows every dashed resource link
    // Tokens in text: {name} {code} {placements} {total} {definitions}
    //                 {records} {categories} {siblings} {schemeTotal}
    tour: [
        { title : 'One scheme, one library',
          text  : 'Everything starts with a Scheme: one complete, configured Vale project, here Orangery Option 01. Every object in it comes from the shared Object Library, so nothing is drawn from scratch.',
          show  : 'family', select: 'SCH-ORANGERY-01', focus: 'all', dim: false },
        { title : 'Families',
          text  : 'The Scheme splits into Families, the big architectural elements a client recognises: the Roof Lantern, the Framework and each Elevation.',
          show  : 'family', select: 'FAM-ROOF-LANTERN', focus: 'column:scheme,family', dim: false },
        { title : 'Assemblies',
          text  : 'Each Family is made of Assemblies, the things we build and install. The ×4 badge is a quantity: four identical Hip Assemblies are one library record placed four times, not four drawings.',
          show  : 'assembly', select: 'ASM-HIP', focus: 'parent', dim: false },
        { title : 'Assemblies inside assemblies',
          text  : 'Assemblies can contain other Assemblies. The Door Assembly holds two Door Leaf Assemblies, each with its own stiles, rails, panel, glazing and hinges.',
          show  : 'assembly', reveal: ['ASM-DOOR-LEAF'], select: 'ASM-DOOR', focus: 'selection', panel: 'built' },
        { title : 'Components: made to measure',
          text  : 'A Component is made in our workshop. The Door Stile is one library definition; each Scheme sets its length, so the same record serves every door we make.',
          show  : 'assembly', reveal: ['ASM-DOOR-LEAF'], select: 'CMP-DOOR-STILE', focus: 'selection', panel: 'data' },
        { title : 'Products: bought in, recorded once',
          text  : 'A Product is bought in or standard: a handle, a hinge, a finial. The {name} comes straight from ValeSpec, code {code}, with its supplier and the three finishes it comes in, and every door simply points at it.',
          show  : 'assembly', reveal: ['PRD-VG-IRN0001'], select: 'PRD-VG-IRN0001', focus: 'twins', panel: 'data' },
        { title : 'Resources: define once, use everywhere',
          text  : '{name} is defined once and used by {definitions} different objects in {placements} places. Change it here and every one of them follows.',
          show  : 'assembly', select: 'RES-MAT-ACCOYA', reveal: ['RES-MAT-ACCOYA'], focus: 'uses' },
        { title : 'Totals roll up on their own',
          text  : 'Quantities multiply down the tree, so the Scheme always knows its totals: {total} hinges across every door leaf and window, ready for costing, ordering and manufacture.',
          show  : 'assembly', reveal: ['PRD-VG-IRN0101'], select: 'PRD-VG-IRN0101', focus: 'twins' },
        { title : 'Rules, data and assets',
          text  : 'The Configuration Engine keeps every option buildable. These door rules are ValeSpec\'s own: a wide panel needs the Senior Technical Manager\'s approval, a very tall door a Senior Architect\'s. Any object can also carry its CAD, SketchUp models, data sheets and photographs.',
          show  : 'assembly', select: 'ASM-DOOR', focus: 'selection', panel: 'rules' },
        { title : 'The library behind every scheme',
          text  : 'Behind every Scheme sits the whole Object Library: {records} records on {categories} shelves, from classical columns to cabin hooks, finials and crestings. A Scheme simply picks from it.',
          view  : 'library', show: 'family', select: 'LIBRARY', focus: 'all', dim: false },
        { title : 'Every record, ready for the next scheme',
          text  : '{name} ({code}) is one of {siblings} roof finials on the shelf. Orangery Option 01 uses {schemeTotal}; the rest are ready for the next scheme, with their codes and data already in place.',
          view  : 'library', show: 'family', reveal: ['PRD-VG726'], select: 'PRD-VG726', focus: 'parent' },
        { title : 'The whole system on one canvas',
          text  : 'Every object and every link, on one canvas. Scroll to zoom, drag to pan, click any box to see what it holds, switch between the Scheme and the whole Library at the top, or press F to fit everything back on screen.',
          show  : 'all', links: true, focus: 'all' }
    ]
    // endregion ---------------------------------------------------------------
};
