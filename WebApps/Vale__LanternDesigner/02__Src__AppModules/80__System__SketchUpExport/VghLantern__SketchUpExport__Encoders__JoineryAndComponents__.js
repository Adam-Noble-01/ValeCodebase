/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | ENCODERS - JOINERY AND COMPONENTS
   =============================================================================

   FILE       : VghLantern__SketchUpExport__Encoders__JoineryAndComponents__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - Encoders JoineryAndComponents
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Encode the interior joinery ring and the placed finial components
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - The two remaining assemblies, grouped here because both are what the room
     and the skyline see rather than what carries the roof.
   - Interior joinery sweeps the SAME eaves datum ring the base frame does, with
     the same plan mitres, so it borrows that encoder's ring sweep outright
     rather than keeping a second copy of a construction that has to agree with
     it exactly.
   - Components are the only things in a lantern that are not a swept section.
     They arrive as authored meshes and leave as component definitions with an
     instance per anchor.

   ---------------------------------------------------------------------------

   WHY A DEFINITION AND INSTANCES RATHER THAN LOOSE GEOMETRY:

   A ball finial is nine hundred vertices. A hipped ridge lantern carries two of
   them and a pyramid carries one, but a job with four lanterns on one roof can
   easily reach eight. Emitting the mesh once and placing instances keeps the
   payload flat however many anchors there are, and gives SketchUp a real
   ComponentDefinition - so the finials stay linked, count properly in the
   component browser, and can be swapped for a different one in a single edit
   rather than eight.

   ---------------------------------------------------------------------------

   MESH FIDELITY:

   The asset's own face loops are carried through as loops, not as triangles.
   SketchUp then builds n-gon faces with real inner loops where the asset has
   them, which is the difference between a finial you can push-pull and a
   triangle soup you can only look at. Vertex order within a loop is preserved,
   so the authored winding decides the face normal exactly as it did in the
   source model.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Joinery and Components Encoders Module
// =============================================================================

const VghLantern__SketchUpExport__Encoders__JoineryAndComponents = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Interior Joinery Part Keys and Presentation
    // ------------------------------------------------------------
    // Build order matches the 3D assembly: packer first because the cornice
    // lands on it, then the cornice, then the eaves trim over the junction.
    const JOINERY_BUILD_ORDER  =  ['cornicePacker', 'cornice', 'eavesTrim'];

    const JOINERY_PRESENTATION  =  {
        cornicePacker : { TagKey: 'cornicePacker', NameKey: 'CornicePacker', MaterialKey: 'plywood'       },
        cornice       : { TagKey: 'cornice',       NameKey: 'Cornice',       MaterialKey: 'joineryFinish' },
        eavesTrim     : { TagKey: 'eavesTrim',     NameKey: 'EavesTrim',     MaterialKey: 'joineryFinish' }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Anchor and Component Vocabulary
    // ------------------------------------------------------------
    // The solver names an anchor by WHERE it is on the roof; the lantern names
    // a component by WHAT it is. This is the same translation table the 3D
    // component loader keeps, and for the same reason: neither vocabulary
    // should have to know about the other.
    const ANCHOR_ROLE_TO_COMPONENT_ROLE  =  {
        'ridgeEnd'   : 'finial',
        'apex'       : 'finial',
        'finial'     : 'finial',
        'cresting'   : 'cresting'
    };

    const ANCHOR_ROLE_APEX       =  'apex';

    const FINIALS_BLOCK      =  'Lantern__Finials__Config';
    const RIDGE_BLOCK        =  'Lantern__RidgeAndHips__Config';
    const JOINERY_BLOCK      =  'Lantern__InteriorJoinery__Config';
    const FINISH_BLOCK       =  'Lantern__FinishAndGlazing__Config';

    const ASSET_FIELD_MESH   =  'Na__Asset__Mesh3D';
    const FIELD_VERTICES     =  'Na__Geometry__Vertices';
    const FIELD_FACES        =  'Na__Geometry__Faces';
    const FIELD_EDGES        =  'Na__Geometry__Edges';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module References
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Part Factory Module
    // ------------------------------------------------------------
    function VghLantern__EncodersJoinery__Factory() {
        return window.VghLantern__SketchUpExport__PartFactory;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interior Joinery Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Interior Joinery Around the Eaves Datum Ring
    // ------------------------------------------------------------
    // Sections arrive from InteriorJoineryAssembly already pitched: the eaves
    // trim's top edge remapped onto the current roof pitch plane so the board
    // meets the pitched underside rather than clipping through it. Cornice and
    // packer pass through as authored, moved together by whatever height offset
    // the job has set so the export matches what was signed off on screen.
    //
    // @param skeleton  SolvedSkeleton
    // @param lantern   The lantern config block
    // @return          Promise resolving to an array of part records
    async function VghLantern__SketchUpExport__Encoders__InteriorJoinery(skeleton, lantern) {
        var BaseAssembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        var Joinery       =  window.VghLantern__Geometry__InteriorJoineryAssembly;
        var Loader        =  window.VghLantern__AppData__InteriorJoinerySystemLoader;
        var RingSweeper   =  window.VghLantern__SketchUpExport__Encoders__BaseAndRoof;
        if (!skeleton || !BaseAssembly || !Joinery || !Loader || !RingSweeper) return [];

        var ring  =  BaseAssembly.VghLantern__BaseFrameAssembly__DatumRing(skeleton);
        if (!ring) return [];

        var resolved;
        try {
            resolved  =  await Loader.VghLantern__InteriorJoinerySystemLoader__ResolveParts(lantern);
        } catch (resolveError) {
            console.warn('[VghLantern SketchUpExport] Interior joinery parts could not be resolved:', resolveError);
            return [];
        }
        if (!Array.isArray(resolved) || resolved.length === 0) return [];

        var offsetMm  =  Loader.VghLantern__InteriorJoinerySystemLoader__CorniceHeightOffsetMm(lantern);
        var pitched   =  Joinery.VghLantern__InteriorJoineryAssembly__SectionsForPitch(resolved, ring.PitchDegrees, offsetMm);

        return RingSweeper.VghLantern__SketchUpExport__Encoders__SweepPartsAroundRing(
            pitched, ring, JOINERY_BUILD_ORDER, JOINERY_PRESENTATION, ring.DatumLevelMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Joinery Paint Finish the Lantern Is Specified With
    // ------------------------------------------------------------
    // The per element advanced fields win where they are set, falling back to
    // the job's joinery paint finish, which is the same order the 3D assembly
    // resolves them in.
    function VghLantern__SketchUpExport__Encoders__JoineryFinish(lantern) {
        if (!lantern) return '';

        var joineryBlock  =  lantern[JOINERY_BLOCK] || {};
        var finishBlock   =  lantern[FINISH_BLOCK]  || {};

        return joineryBlock['Lantern__InteriorJoinery__Config__CorniceFinish']
            || finishBlock['Lantern__FinishAndGlazing__Config__JoineryPaintFinish']
            || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Component Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode Every Wanted Finial Anchor as a Placed Instance
    // ------------------------------------------------------------
    // Returns both halves of the answer, because a definition without an
    // instance is dead weight in the payload and an instance without a
    // definition is a broken reference. Building them together is the only way
    // neither can happen.
    //
    // @param skeleton  SolvedSkeleton
    // @param lantern   The lantern config block
    // @return          Promise resolving to { Definitions, Parts }
    async function VghLantern__SketchUpExport__Encoders__Components(skeleton, lantern) {
        var Factory  =  VghLantern__EncodersJoinery__Factory();
        var Loader   =  window.VghLantern__AppData__ComponentIndexLoader;
        var result   =  { Definitions: [], Parts: [] };
        if (!skeleton || !Array.isArray(skeleton.FinialAnchors) || !Factory || !Loader) return result;

        var definitionsByAsset  =  {};
        var counters            =  {};
        var i, anchor, componentId, definition, index, record;

        for (i = 0; i < skeleton.FinialAnchors.length; i++) {
            anchor  =  skeleton.FinialAnchors[i];
            if (!anchor || !anchor.Position) continue;
            if (!VghLantern__EncodersJoinery__AnchorWanted(lantern, anchor)) continue;

            componentId  =  VghLantern__EncodersJoinery__ComponentIdForRole(lantern, anchor.Role);
            if (!componentId) continue;

            if (!Object.prototype.hasOwnProperty.call(definitionsByAsset, componentId)) {
                definitionsByAsset[componentId]  =
                    await VghLantern__EncodersJoinery__BuildDefinition(Loader, componentId);
            }

            definition  =  definitionsByAsset[componentId];
            if (!definition) continue;                                        // <-- Asset carries no mesh; the anchor is reported in Meta instead

            counters[anchor.Role]  =  (counters[anchor.Role] || 0) + 1;
            index                  =  counters[anchor.Role];

            record  =  Factory.VghLantern__SketchUpExport__PartFactory__Instance(
                definition.Key,
                VghLantern__EncodersJoinery__UprightTransform(anchor.Position),
                {
                    Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name('Finial', {
                                      Role  : anchor.Role,
                                      Index : (index < 10) ? ('0' + index) : String(index)
                                  }),
                    TagKey      : 'components',
                    MaterialKey : 'ridgeCappingFinish',                       // <-- Welded to the capping, so it is sprayed with it
                    Attributes  : {
                        PartRole    : 'finial',
                        AnchorId    : anchor.Id || '',
                        AnchorRole  : anchor.Role || '',
                        ComponentId : componentId
                    }
                });

            if (record) result.Parts.push(record);
        }

        for (componentId in definitionsByAsset) {
            if (!Object.prototype.hasOwnProperty.call(definitionsByAsset, componentId)) continue;
            if (definitionsByAsset[componentId]) result.Definitions.push(definitionsByAsset[componentId]);
        }

        return result;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load One Component Asset and Encode Its Mesh
    // ------------------------------------------------------------
    // The asset's vertices are keyed by string id and its faces reference those
    // ids, so the ids are collapsed to array indices once here. Anything the
    // importer would otherwise have to look up per face vertex is resolved
    // before the file is written.
    async function VghLantern__EncodersJoinery__BuildDefinition(Loader, componentId) {
        var Factory  =  VghLantern__EncodersJoinery__Factory();
        var asset;

        try {
            asset  =  await Loader.VghLantern__ComponentIndexLoader__LoadAsset(componentId);
        } catch (loadError) {
            console.warn('[VghLantern SketchUpExport] Component "' + componentId + '" could not be loaded:', loadError);
            return null;
        }
        if (!asset) return null;

        return VghLantern__SketchUpExport__Encoders__MeshDefinition(
            asset[ASSET_FIELD_MESH],
            'component__' + Factory.VghLantern__SketchUpExport__PartFactory__SafeName(componentId),
            VghLantern__EncodersJoinery__AssetName(asset, componentId),
            componentId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Encode One Na__Asset__Mesh3D Block Into a Payload Definition
    // ------------------------------------------------------------
    // Split out of the finial path on 12-Aug-2026 because the octagonal ridge
    // block needs the identical encoding from a DIFFERENT source: its mesh is
    // stretched for the ridge beam depth before it is written, so it never comes
    // straight off an asset the component loader can fetch.
    //
    // The asset's vertices are keyed by string id and its faces reference those
    // ids, so the ids are collapsed to array indices once here. Anything the
    // importer would otherwise have to look up per face vertex is resolved before
    // the file is written.
    //
    // @param meshBlock  An Na__Asset__Mesh3D block
    // @param key        Definition key the instances will name
    // @param name       Human readable definition name
    // @param assetId    Recorded on the definition for traceability
    function VghLantern__SketchUpExport__Encoders__MeshDefinition(meshBlock, key, name, assetId) {
        var vertexList =  meshBlock ? meshBlock[FIELD_VERTICES] : null;
        var faceList   =  meshBlock ? meshBlock[FIELD_FACES]    : null;
        if (!Array.isArray(vertexList) || vertexList.length === 0) return null;
        if (!Array.isArray(faceList)   || faceList.length === 0)   return null;

        var indexById  =  {};
        var vertices   =  [];
        var faces      =  [];
        var skipped    =  0;
        var i, vertex, face, outer, inner, encodedInner, k;

        for (i = 0; i < vertexList.length; i++) {
            vertex  =  vertexList[i];
            if (!vertex || !vertex.VertexId) continue;

            indexById[vertex.VertexId]  =  vertices.length;
            vertices.push([
                Number(vertex.PosX_mm) || 0,
                Number(vertex.PosY_mm) || 0,
                Number(vertex.PosZ_mm) || 0
            ]);
        }

        for (i = 0; i < faceList.length; i++) {
            face   =  faceList[i];
            outer  =  face ? VghLantern__EncodersJoinery__LoopToIndices(face['OuterLoop_VertexIds'], indexById) : null;
            if (!outer || outer.length < 3) { skipped++; continue; }

            encodedInner  =  [];
            if (Array.isArray(face.InnerLoops)) {
                for (k = 0; k < face.InnerLoops.length; k++) {
                    inner  =  VghLantern__EncodersJoinery__LoopToIndices(face.InnerLoops[k], indexById);
                    if (inner && inner.length >= 3) encodedInner.push(inner);
                }
            }

            var faceRecord  =  encodedInner.length > 0 ? { Outer: outer, Inner: encodedInner } : { Outer: outer };
            if (VghLantern__EncodersJoinery__FaceIsHidden(face)) faceRecord.Hidden = true;
            faces.push(faceRecord);
        }

        if (faces.length === 0) return null;

        var edges  =  VghLantern__EncodersJoinery__EncodeEdges(
            meshBlock ? meshBlock[FIELD_EDGES] : null, indexById);

        if (skipped > 0) {
            console.warn('[VghLantern SketchUpExport] Definition "' + key + '": '
                + skipped + ' face(s) skipped - a loop referenced a vertex id that is not in the vertex table.');
        }

        var definition  =  {
            Key         : key,
            Name        : name,
            AssetId     : assetId || '',
            VertexCount : vertices.length,
            FaceCount   : faces.length,
            Vertices    : vertices,
            Faces       : faces
        };

        if (edges.length > 0) {
            definition.EdgeCount  =  edges.length;
            definition.Edges      =  edges;
        }

        return definition;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Carry the Authored Edge Style Through to the Payload
    // ------------------------------------------------------------
    // Without this the importer rebuilds every finial as a black wireframe of
    // its own tessellation, because add_face gives each edge SketchUp's
    // defaults and nothing downstream knows any better. The three flags are
    // kept separate rather than collapsed into one "soften" boolean:
    //
    //   Soft    edge not drawn AND its faces merge into a Surface entity
    //   Smooth  shading blends across it - ON ITS OWN THE EDGE STAYS VISIBLE
    //   Hidden  Edit > Hide, no surface merge, shading unchanged
    //
    // Only Soft and Smooth are always written. Hidden, CastsShadows and colour
    // are written only when they differ from what add_face already produces,
    // which keeps a 5,000 edge finial from tripling the payload for fields the
    // importer would read as defaults anyway.
    //
    // Schema 1.1.0 assets carry the flat IsSoft / IsSmooth keys with no
    // Na__Edge__ block, so both spellings are accepted.
    function VghLantern__EncodersJoinery__EncodeEdges(edgeList, indexById) {
        if (!Array.isArray(edgeList) || edgeList.length === 0) return [];

        var out  =  [];
        var i, edge, indexA, indexB, record;

        for (i = 0; i < edgeList.length; i++) {
            edge  =  edgeList[i];
            if (!edge) continue;

            indexA  =  indexById[edge.StartVertex];
            indexB  =  indexById[edge.EndVertex];
            if (indexA === undefined || indexB === undefined) continue;
            if (indexA === indexB) continue;

            record  =  {
                A      : indexA,
                B      : indexB,
                Soft   : !!VghLantern__EncodersJoinery__EdgeFlag(edge, 'IsSoft'),
                Smooth : !!VghLantern__EncodersJoinery__EdgeFlag(edge, 'IsSmooth')
            };

            if (VghLantern__EncodersJoinery__EdgeFlag(edge, 'IsHidden')) record.Hidden = true;
            if (edge['Na__Edge__CastsShadows'] === false)                record.CastsShadows = false;

            if (edge['Na__Edge__HasOwnMaterial']) {
                record.HasOwnMaterial  =  true;
                record.MaterialName    =  edge['Na__Edge__MaterialName'] || '';
                record.ColorHex        =  edge['Na__Edge__ColorHex']     || '';
            }

            out.push(record);
        }

        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Edge Flag Across Both Schema Spellings
    // ------------------------------------------------------------
    function VghLantern__EncodersJoinery__EdgeFlag(edge, shortName) {
        var prefixed  =  edge['Na__Edge__' + shortName];
        if (typeof prefixed === 'boolean') return prefixed;
        return edge[shortName] === true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Was This Face Hidden by Its Author?
    // ------------------------------------------------------------
    // Schema 1.2.0 captures hidden faces rather than dropping them, so the
    // exporter has to carry the flag or the importer would rebuild a face the
    // author deliberately hid. Pre-1.2.0 assets have neither key and report
    // false, which is what they always effectively were.
    function VghLantern__EncodersJoinery__FaceIsHidden(face) {
        if (!face) return false;
        if (face['Na__Face__IsHidden'] === true) return true;
        return face['Na__Face__IsDisplayed'] === false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Map One Vertex Id Loop to Array Indices
    // ------------------------------------------------------------
    function VghLantern__EncodersJoinery__LoopToIndices(loop, indexById) {
        if (!Array.isArray(loop) || loop.length < 3) return null;

        var out  =  [];
        var i, index;

        for (i = 0; i < loop.length; i++) {
            index  =  indexById[loop[i]];
            if (index === undefined) return null;                             // <-- One bad id invalidates the whole loop
            out.push(index);
        }
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Display Name Carried by a Component Asset
    // ------------------------------------------------------------
    function VghLantern__EncodersJoinery__AssetName(asset, componentId) {
        var metadata  =  asset['Na__Asset__Metadata'] || {};
        return metadata['Na__Asset__Metadata__Name'] || componentId;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Upright Transform at One Anchor Point
    // ------------------------------------------------------------
    // Local origin onto the anchor and nothing else, because every component
    // asset is authored standing upright about its own origin. Axes are given
    // rather than an angle so the importer builds one transformation and never
    // has to reason about rotation order.
    function VghLantern__EncodersJoinery__UprightTransform(positionMm) {
        return {
            Origin      : { x: positionMm.x, y: positionMm.y, z: positionMm.z },
            XAxis       : { x: 1, y: 0, z: 0 },
            YAxis       : { x: 0, y: 1, z: 0 },
            ZAxis       : { x: 0, y: 0, z: 1 },
            ScaleFactor : 1.0
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Anchor Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether the Lantern Wants a Component at This Anchor
    // ------------------------------------------------------------
    // Place at Apex is a user choice and defaults off, so a pyramid exports a
    // finial only when it has been asked for. Every other anchor - the two ridge
    // ends - exports one as soon as finials are fitted at all, which is what Fit
    // Finials already said.
    function VghLantern__EncodersJoinery__AnchorWanted(lantern, anchor) {
        var finialBlock  =  lantern ? lantern[FINIALS_BLOCK] : null;
        if (!finialBlock) return false;
        if (finialBlock['Lantern__Finials__Config__Enabled'] !== true) return false;

        if (anchor.Role === ANCHOR_ROLE_APEX) return finialBlock['Lantern__Finials__Config__PlaceAtApex'] !== false;

        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Component Id Assigned to an Anchor Role
    // ------------------------------------------------------------
    function VghLantern__EncodersJoinery__ComponentIdForRole(lantern, anchorRole) {
        if (!lantern) return '';

        var componentRole  =  ANCHOR_ROLE_TO_COMPONENT_ROLE[anchorRole];
        if (!componentRole) return '';

        if (componentRole === 'finial') {
            var finialBlock  =  lantern[FINIALS_BLOCK];
            if (!finialBlock) return '';
            if (finialBlock['Lantern__Finials__Config__Enabled'] !== true) return '';

            return finialBlock['Lantern__Finials__Config__FinialComponentId'] || '';
        }

        if (componentRole === 'cresting') {
            var ridgeBlock  =  lantern[RIDGE_BLOCK];
            if (!ridgeBlock) return '';
            if (ridgeBlock['Lantern__RidgeAndHips__Config__CrestingEnabled'] !== true) return '';

            return ridgeBlock['Lantern__RidgeAndHips__Config__CrestingComponentId'] || '';
        }

        return '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__Encoders__InteriorJoinery : VghLantern__SketchUpExport__Encoders__InteriorJoinery,
        VghLantern__SketchUpExport__Encoders__JoineryFinish   : VghLantern__SketchUpExport__Encoders__JoineryFinish,
        VghLantern__SketchUpExport__Encoders__Components      : VghLantern__SketchUpExport__Encoders__Components,
        VghLantern__SketchUpExport__Encoders__MeshDefinition  : VghLantern__SketchUpExport__Encoders__MeshDefinition
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__Encoders__JoineryAndComponents  =  VghLantern__SketchUpExport__Encoders__JoineryAndComponents;
