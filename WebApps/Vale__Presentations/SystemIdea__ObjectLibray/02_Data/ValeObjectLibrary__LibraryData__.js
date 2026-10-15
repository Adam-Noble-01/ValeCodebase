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
   - A plain script rather than JSON or a module, so the demo still opens
     straight from disk (file://) as well as from the local server (port 8011)
     and GitHub Pages. Comments are allowed, unlike JSON.
   - Example values (codes, suppliers, sizes, quantities) are illustrative, for
     the presentation only.

   HOW TO ADD THINGS:
   - A Resource          -> add to "resources", with its group (Profiles,
                            Materials, Finishes or Specifications).
   - A Component/Product -> add to "library" with tier "component" or "product"
                            and list the resource ids it "uses".
   - An Assembly         -> add to "library" with tier "assembly" and list what
                            it "contains" as { ref, qty }. An Assembly may
                            contain other Assemblies (sub-assemblies) as well
                            as Components and Products.
   - Place anything      -> add { ref, qty } to a Family's "contains" in
                            "scheme.families". A Family can hold Assemblies,
                            Components and Products directly.
   - Ids must be unique. Prefix by tier: RES-, CMP-, PRD-, ASM-, FAM-.
   - Optional on any record: summary, data { "Data Point": "value" },
     params [ data points the Scheme sets ], rules [ { type, text } ],
     assets [ linked asset types ].
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
            definition : 'Assemblies are objects built from several Components and Products: a door, a window, a pilaster, a hip. An Assembly can contain other Assemblies (sub-assemblies) where more hierarchy is needed, such as the two leaves of a pair of doors.',
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
        }
    },
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
        { id: 'RES-MAT-ALUMINIUM',     group: 'Materials',      name: 'Aluminium',                    summary: 'For roof lantern bars, caps, castings and outlets.' },
        { id: 'RES-MAT-LEAD',          group: 'Materials',      name: 'Lead',                         summary: 'For flashings and weatherings.' },
        { id: 'RES-MAT-SHEET',         group: 'Materials',      name: 'Sheet Materials',              summary: 'Sheet goods for friezes, soffits and linings.' },
        { id: 'RES-MAT-BOARD',         group: 'Materials',      name: 'Board Materials',              summary: 'Boards for panels and pilaster faces.' },

        // Finishes
        { id: 'RES-FIN-RAL',           group: 'Finishes',       name: 'RAL Colours',                  summary: 'The colour reference for painted and powder-coated finishes.' },
        { id: 'RES-FIN-PAINT',         group: 'Finishes',       name: 'Paint Systems',                summary: 'Factory-applied paint systems for joinery.' },
        { id: 'RES-FIN-STAINS',        group: 'Finishes',       name: 'Stains',                       summary: 'Stain finishes for hardwood details.' },
        { id: 'RES-FIN-METAL',         group: 'Finishes',       name: 'Metal Finishes',               summary: 'Finishes for ironmongery and metalwork, such as satin nickel.' },

        // Specifications
        { id: 'RES-SPC-GLASS',         group: 'Specifications', name: 'Glass Specification',          summary: 'The glass make-up for each glazed unit.' },
        { id: 'RES-SPC-BOARD',         group: 'Specifications', name: 'Board or Sheet Specification', summary: 'Grade and make-up for boards and sheets.' },
        { id: 'RES-SPC-CASTING',       group: 'Specifications', name: 'Casting Definition',           summary: 'Pattern and alloy for cast items such as finials and cresting.' },
        { id: 'RES-SPC-FIXING',        group: 'Specifications', name: 'Fixing Specification',         summary: 'Fixings and fixing centres for each material.' }
    ],
    // endregion ---------------------------------------------------------------


    // -------------------------------------------------------------------------
    // REGION | Library - Reusable Assemblies, Components and Products
    // -------------------------------------------------------------------------
    library: [

        // ---------------------------------------------------------------------
        // Components - Framework
        // ---------------------------------------------------------------------
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
        { id: 'CMP-PILASTER-BASE',    tier: 'component', name: 'Pilaster Base',     summary: 'The foot of the pilaster.',
          uses: ['RES-PRF-OGEE', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                     params: ['Width', 'Depth'] },
        { id: 'CMP-PILASTER-SHAFT',   tier: 'component', name: 'Pilaster Shaft',    summary: 'The main body of the pilaster.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-BOARD', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                    params: ['Length', 'Width', 'Depth'],
          rules: [{ type: 'Manufacturing Constraints', text: 'Shaft height is limited by the longest stock length.' }] },
        { id: 'CMP-PILASTER-CAPITAL', tier: 'component', name: 'Pilaster Capital',  summary: 'The head of the pilaster, carrying the entablature.',
          uses: ['RES-PRF-ASTRAGAL', 'RES-PRF-OGEE', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],  params: ['Width', 'Depth'] },

        // ---------------------------------------------------------------------
        // Components - Doors and Windows
        // ---------------------------------------------------------------------
        { id: 'CMP-DOOR-STILE',       tier: 'component', name: 'Door Stile',        summary: 'The vertical member of a door leaf.',
          uses: ['RES-PRF-TIMBER', 'RES-MAT-ACCOYA', 'RES-FIN-PAINT', 'RES-FIN-RAL'],                   params: ['Length'],
          assets: ['CAD', 'Manufacturing Data'] },
        { id: 'CMP-DOOR-RAIL',        tier: 'component', name: 'Door Rail',         summary: 'A horizontal member of a door leaf.',
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

        // ---------------------------------------------------------------------
        // Components - Roof Lantern
        // ---------------------------------------------------------------------
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

        // ---------------------------------------------------------------------
        // Products
        // ---------------------------------------------------------------------
        { id: 'PRD-DOOR-HANDLE',      tier: 'product',   name: 'Door Handle',       summary: 'The lever handle set for the doors.',
          uses: ['RES-FIN-METAL', 'RES-SPC-CASTING'],
          data: { 'Product Code': 'DH-001', 'Supplier / Manufacturer': 'Carlisle Brass', 'Fixed or Selectable Sizes': 'Fixed', 'Material': 'Brass', 'Finish': 'Satin Nickel' },
          rules: [{ type: 'Product Selection Rules', text: 'Finish follows the ironmongery finish chosen for the scheme.' }],
          assets: ['Data Sheets', '3D Models', 'Photographs', 'Supplier Information'] },
        { id: 'PRD-HINGE',            tier: 'product',   name: 'Hinge',             summary: 'A butt hinge for door leaves and casements.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'],
          rules: [{ type: 'Quantity Rules', text: 'Hinges per leaf follow the leaf height and weight.' }] },
        { id: 'PRD-LOCK',             tier: 'product',   name: 'Lock',              summary: 'The lock for the active door leaf.',
          uses: ['RES-SPC-FIXING'],
          rules: [{ type: 'Compatibility Rules', text: 'Must suit the leaf thickness and the chosen handle set.' }] },
        { id: 'PRD-SHOOT-BOLT',       tier: 'product',   name: 'Shoot Bolt',        summary: 'The bolt securing the second leaf at head and foot.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'] },
        { id: 'PRD-ESPAGNOLETTE',     tier: 'product',   name: 'Espagnolette',      summary: 'Multi-point locking gear for a casement.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'] },
        { id: 'PRD-FINIAL',           tier: 'product',   name: 'Finial',            summary: 'The cast ornament at each end of the ridge.',
          uses: ['RES-SPC-CASTING', 'RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'PRD-CRESTING',         tier: 'product',   name: 'Cresting',          summary: 'A decorative cast cresting section along the ridge.',
          uses: ['RES-SPC-CASTING', 'RES-MAT-ALUMINIUM', 'RES-FIN-RAL'] },
        { id: 'PRD-VENT-ACTUATOR',    tier: 'product',   name: 'Vent Actuator',     summary: 'The electric opener for the roof vent.',
          uses: ['RES-SPC-FIXING'] },
        { id: 'PRD-BRACKET',          tier: 'product',   name: 'Bracket',           summary: 'A bracket fixing the ring beam to the structure.',
          uses: ['RES-FIN-METAL', 'RES-SPC-FIXING'] },
        { id: 'PRD-GUTTER-OUTLET',    tier: 'product',   name: 'Gutter Outlet',     summary: 'The outlet draining the gutter behind the entablature.',
          uses: ['RES-MAT-ALUMINIUM', 'RES-SPC-FIXING'] },

        // ---------------------------------------------------------------------
        // Assemblies - Roof Lantern
        // ---------------------------------------------------------------------
        { id: 'ASM-RIDGE',            tier: 'assembly',  name: 'Ridge Assembly',    summary: 'The ridge of the roof lantern.',
          contains: [{ ref: 'CMP-RIDGE-BEAM', qty: 1 }, { ref: 'CMP-RIDGE-CAP', qty: 1 }] },
        { id: 'ASM-HIP',              tier: 'assembly',  name: 'Hip Assembly',      summary: 'One hip of the roof lantern.',
          contains: [{ ref: 'CMP-HIP-BAR', qty: 1 }, { ref: 'CMP-HIP-CAP', qty: 1 }] },
        { id: 'ASM-RAFTER',           tier: 'assembly',  name: 'Rafter Assembly',   summary: 'One glazed bay of the lantern roof.',
          contains: [{ ref: 'CMP-RAFTER-BAR', qty: 1 }, { ref: 'CMP-GLAZING-PANEL', qty: 1 }],
          rules: [{ type: 'Dimensional Rules', text: 'Rafter count and spacing follow the lantern length and roof pitch.' }] },
        { id: 'ASM-ETR-VENT',         tier: 'assembly',  name: 'ETR Vent Assembly', summary: 'The opening vent in the lantern roof.',
          contains: [{ ref: 'CMP-VENT-FRAME', qty: 1 }, { ref: 'CMP-GLAZING-PANEL', qty: 1 }, { ref: 'PRD-VENT-ACTUATOR', qty: 1 }] },

        // ---------------------------------------------------------------------
        // Assemblies - Framework
        // ---------------------------------------------------------------------
        { id: 'ASM-PILASTER',         tier: 'assembly',  name: 'Pilaster Assembly', summary: 'A pilaster column: base, shaft and capital.',
          contains: [{ ref: 'CMP-PILASTER-BASE', qty: 1 }, { ref: 'CMP-PILASTER-SHAFT', qty: 1 }, { ref: 'CMP-PILASTER-CAPITAL', qty: 1 }],
          assets: ['SketchUp Models', 'PDF Drawings'] },
        { id: 'ASM-ENTABLATURE',      tier: 'assembly',  name: 'Entablature Assembly', summary: 'The band carried on the pilasters: architrave, frieze and cornice.',
          contains: [{ ref: 'CMP-ARCHITRAVE', qty: 1 }, { ref: 'CMP-FRIEZE', qty: 1 }, { ref: 'CMP-CORNICE', qty: 1 }] },
        { id: 'ASM-RING-BEAM',        tier: 'assembly',  name: 'Ring Beam Assembly', summary: 'The structural ring beam with its fascia, flashing and outlets.',
          contains: [{ ref: 'CMP-RING-BEAM', qty: 1 }, { ref: 'CMP-FASCIA', qty: 1 }, { ref: 'CMP-UPSTAND-FLASHING', qty: 1 },
                     { ref: 'PRD-BRACKET', qty: 6 }, { ref: 'PRD-GUTTER-OUTLET', qty: 2 }] },

        // ---------------------------------------------------------------------
        // Assemblies - Doors and Windows (the door holds a sub-assembly)
        // ---------------------------------------------------------------------
        { id: 'ASM-DOOR-LEAF',        tier: 'assembly',  name: 'Door Leaf Assembly', summary: 'One leaf of the door: stiles, rails, panel, glazing and hinges.',
          contains: [{ ref: 'CMP-DOOR-STILE', qty: 2 }, { ref: 'CMP-DOOR-RAIL', qty: 3 }, { ref: 'CMP-FIELDED-PANEL', qty: 1 },
                     { ref: 'CMP-GLAZING-PANEL', qty: 1 }, { ref: 'CMP-GLAZING-BAR', qty: 4 }, { ref: 'PRD-HINGE', qty: 3 }] },
        { id: 'ASM-DOOR',             tier: 'assembly',  name: 'Door Assembly',     summary: 'A pair of glazed doors with threshold and ironmongery.',
          contains: [{ ref: 'ASM-DOOR-LEAF', qty: 2 }, { ref: 'CMP-DOOR-THRESHOLD', qty: 1 }, { ref: 'PRD-DOOR-HANDLE', qty: 1 },
                     { ref: 'PRD-LOCK', qty: 1 }, { ref: 'PRD-SHOOT-BOLT', qty: 2 }],
          data: { 'Assembly Type': 'French doors, pair', 'Handing / Opening': 'Outward opening' },
          params: ['Overall Size'],
          rules: [{ type: 'Minimum and Maximum Sizes', text: 'Leaf width and height stay inside the range the workshop can make.' }],
          assets: ['SketchUp Models', 'PDF Drawings', 'Manufacturing Data', 'Installation Information'] },
        { id: 'ASM-WINDOW',           tier: 'assembly',  name: 'Window Assembly',   summary: 'A casement window with cill, mullion, glazing and ironmongery.',
          contains: [{ ref: 'CMP-CILL', qty: 1 }, { ref: 'CMP-MULLION', qty: 1 }, { ref: 'CMP-GLAZING-BAR', qty: 4 },
                     { ref: 'CMP-GLAZING-PANEL', qty: 2 }, { ref: 'PRD-ESPAGNOLETTE', qty: 2 }, { ref: 'PRD-HINGE', qty: 4 }],
          params: ['Overall Size'] }
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
            'Finish Selection'      : 'Paint system, RAL to client choice'
        },
        assets  : ['SketchUp Models', 'PDF Drawings', 'Cost Data', 'Historical or Revision Data'],

        families: [
            { id: 'FAM-ROOF-LANTERN',    name: 'Roof Lantern',    summary: 'The glazed roof lantern.',
              data: { 'Family Type': 'Roof' },
              contains: [{ ref: 'ASM-RIDGE', qty: 1 }, { ref: 'ASM-HIP', qty: 4 }, { ref: 'ASM-RAFTER', qty: 8 },
                         { ref: 'ASM-ETR-VENT', qty: 1 }, { ref: 'PRD-FINIAL', qty: 2 }, { ref: 'PRD-CRESTING', qty: 4 }] },
            { id: 'FAM-FRAMEWORK',       name: 'Framework',       summary: 'The columns, entablatures and structure that frame the building.',
              data: { 'Family Type': 'Structure' },
              contains: [{ ref: 'ASM-PILASTER', qty: 6 }, { ref: 'ASM-ENTABLATURE', qty: 3 }, { ref: 'ASM-RING-BEAM', qty: 1 }] },
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
    // show    : how far the chart opens - 'scheme', 'family', 'assembly', 'parts', 'all'
    // select  : an id to select (its first place in the scheme)
    // reveal  : ids whose every placement is opened up on the chart
    // focus   : what the camera frames - 'all', 'selection', 'parent', 'twins',
    //           'uses', 'column:<tier>' or 'column:<tier>,<tier>'
    // dim     : false shows the selection without fading everything else
    // panel   : opens the side panel at a section - 'built', 'bom', 'uses',
    //           'data', 'rules', 'assets', 'used-by'
    // links   : true shows every dashed resource link
    // Tokens in text: {placements} {total} {definitions} {name}
    tour: [
        { title : 'One scheme, one library',
          text  : 'Everything starts with a Scheme: one complete, configured Vale project, here Orangery Option 01. Every object in it is drawn from the shared Object Library on the right, so nothing is drawn from scratch.',
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
          text  : 'A Product is bought in or standard: a handle, a hinge, a shoot bolt. Its code, supplier, finish and cost are recorded once, and every Assembly simply points at it.',
          show  : 'assembly', reveal: ['PRD-DOOR-HANDLE'], select: 'PRD-DOOR-HANDLE', focus: 'twins', panel: 'data' },
        { title : 'Resources: define once, use everywhere',
          text  : '{name} is defined once and used by {definitions} different objects in {placements} places. Change it here and every one of them follows.',
          show  : 'assembly', select: 'RES-MAT-ACCOYA', reveal: ['RES-MAT-ACCOYA'], focus: 'uses' },
        { title : 'Totals roll up on their own',
          text  : 'Quantities multiply down the tree, so the Scheme always knows its totals: {total} hinges across every door leaf and window, ready for costing, ordering and manufacture.',
          show  : 'assembly', reveal: ['PRD-HINGE'], select: 'PRD-HINGE', focus: 'twins' },
        { title : 'Rules, data and assets',
          text  : 'The Configuration Engine keeps every option buildable with rules for sizes, spacing and compatibility, and any object can carry linked assets: CAD, SketchUp models, data sheets and photographs.',
          show  : 'assembly', reveal: ['CMP-GLAZING-BAR'], select: 'CMP-GLAZING-BAR', focus: 'selection', panel: 'rules' },
        { title : 'The whole system on one canvas',
          text  : 'Every object and every link, on one canvas. Scroll to zoom, drag to pan, click any box to see what it holds, or press F to fit everything back on screen.',
          show  : 'all', links: true, focus: 'all' }
    ]
    // endregion ---------------------------------------------------------------
};
