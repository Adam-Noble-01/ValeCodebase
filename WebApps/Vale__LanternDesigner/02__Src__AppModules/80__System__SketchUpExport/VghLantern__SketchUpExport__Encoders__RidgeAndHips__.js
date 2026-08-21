/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | ENCODERS - RIDGE AND HIPS
   =============================================================================

   FILE       : VghLantern__SketchUpExport__Encoders__RidgeAndHips__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - Encoders RidgeAndHips
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Encode the real multi part Vale ridge and hip, and the block they die into
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - A Vale ridge is not one section and neither is a hip. The exported model now
     says so, the same way it already did for the three part glaze bar:

         Ridge Core        47_2001   mill aluminium, the structural spine
         Ridge Beam        47_2021   Sapele, the internal beam seen from the room
         Ridge Blocking    47_2101   Sapele packer, substrate for the lead
         Ridge Flashing    47_2121   lead, the weathering projection
         Capping Block     47_2202   Sapele upstand, capped ridge only
         Ridge Capping     47_2201   powder coated aluminium, capped ridge only

         Hip Core          48_2001   mill aluminium, welded eaves to ridge
         Hip Beam          48_2021   Sapele, the internal beam
         Hip Blocking      48_2101   Sapele fillet, substrate for the lead
         Hip Flashing      48_2121   lead, the weathering projection

   - Plus the octagonal ridge block at each ridge end, placed as a component
     instance the way a finial is, because it is a turned mesh rather than a
     swept section.
   - Each part becomes its own prism on its own member, so a hipped lantern
     exports six ridge parts, sixteen hip parts and two blocks as separate
     selectable objects. A workshop cutting list needs the lead lengths apart
     from the timber lengths and they are not the same number.

   ---------------------------------------------------------------------------

   THIS ENCODER COMPUTES NOTHING

   Every millimetre comes from the two geometry modules the 3D viewport asks:

       VghLantern__Geometry__RidgeAssembly   depth resolution, section
                                             transforms, block placements, the
                                             beam's plumb cut planes, the block
                                             stretch
       VghLantern__Geometry__HipAssembly     section transforms and the run each
                                             part takes along each hip,
                                             including the covering's oversail
                                             out to the glass edge

   Asking rather than repeating is the whole reason a hip beam in SketchUp is cut
   where the hip beam on screen is cut. The pitch adaptation, the timber depth
   stretch and the end treatments are all applied before this file sees them.

   ---------------------------------------------------------------------------

   WHY THE ENDS DIFFER, PART BY PART

       ridge beam     plumb cut 67.5mm short of each block centre, dying on the
                      octagon's facet
       ridge capping  plumb cut 95mm in from each ridge end, into the socket
                      face of the cast end cap that closes it
       ridge others   run the full ridge datum length and pass over the block
       hip beam       plumb cut on the block facet at its head, and 18mm inboard
                      of the eaves datum corner at its foot
       hip core       runs 42.5mm past the eaves datum onto the extrusion it is
                      welded to
       hip covering   OVERSAILS past the eaves datum to the outer edge of the
                      glass, level with the glaze bar cap ends

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Ridge and Hip Encoders Module
// =============================================================================

const VghLantern__SketchUpExport__Encoders__RidgeAndHips = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Part Presentation
    // ------------------------------------------------------------
    // Keyed by the PartKey the system indexes declare, so a part added there
    // needs one row here and nothing else. A part with no row is skipped rather
    // than exported under a guessed tag.
    const RIDGE_PRESENTATION  =  {
        core         : { TagKey: 'ridgeCore',         NameKey: 'RidgeCore',         MaterialKey: 'millAluminium'      },
        beam         : { TagKey: 'ridgeBeam',         NameKey: 'RidgeBeam',         MaterialKey: 'joineryFinish'      },
        blocking     : { TagKey: 'ridgeBlocking',     NameKey: 'RidgeBlocking',     MaterialKey: 'sapele'             },
        flashing     : { TagKey: 'ridgeFlashing',     NameKey: 'RidgeFlashing',     MaterialKey: 'leadFlashing'       },
        cappingBlock : { TagKey: 'ridgeCappingBlock', NameKey: 'RidgeCappingBlock', MaterialKey: 'sapele'             },
        capping      : { TagKey: 'ridgeCapping',      NameKey: 'RidgeCapping',      MaterialKey: 'ridgeCappingFinish' }
    };

    const HIP_PRESENTATION  =  {
        core     : { TagKey: 'hipCore',     NameKey: 'HipCore',     MaterialKey: 'millAluminium' },
        beam     : { TagKey: 'hipBeam',     NameKey: 'HipBeam',     MaterialKey: 'joineryFinish' },
        blocking : { TagKey: 'hipBlocking', NameKey: 'HipBlocking', MaterialKey: 'sapele'        },
        flashing : { TagKey: 'hipFlashing', NameKey: 'HipFlashing', MaterialKey: 'leadFlashing'  }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Block Presentation and Config Keys
    // ------------------------------------------------------------
    const BLOCK_TAG_KEY       =  'ridgeBlock';
    const BLOCK_NAME_KEY      =  'RidgeBlock';
    const BLOCK_MATERIAL_KEY  =  'joineryFinish';

    // The cast cap on the end of the capping. Powder coated rather than painted,
    // so it takes the capping's own material key and moves with it when a lantern
    // diverges the capping to White Painted or Lead.
    const END_CAP_TAG_KEY       =  'ridgeEndCap';
    const END_CAP_NAME_KEY      =  'RidgeEndCap';
    const END_CAP_MATERIAL_KEY  =  'ridgeCappingFinish';

    const FINISH_BLOCK        =  'Lantern__FinishAndGlazing__Config';
    const FIELD_FRAME_FINISH  =  'Lantern__FinishAndGlazing__Config__FrameFinish';
    const FIELD_JOINERY_PAINT =  'Lantern__FinishAndGlazing__Config__JoineryPaintFinish';
    const DEG_TO_RAD          =  Math.PI / 180;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module References
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Modules This Encoder Reads Through
    // ------------------------------------------------------------
    function VghLantern__EncodersRidgeHips__Sweep()        { return window.VghLantern__SketchUpExport__SweepGeometry; }
    function VghLantern__EncodersRidgeHips__Factory()      { return window.VghLantern__SketchUpExport__PartFactory; }
    function VghLantern__EncodersRidgeHips__RidgeGeometry() { return window.VghLantern__Geometry__RidgeAssembly; }
    function VghLantern__EncodersRidgeHips__HipGeometry()   { return window.VghLantern__Geometry__HipAssembly; }
    function VghLantern__EncodersRidgeHips__RidgeLoader()   { return window.VghLantern__AppData__RidgeSystemLoader; }
    function VghLantern__EncodersRidgeHips__HipLoader()     { return window.VghLantern__AppData__HipSystemLoader; }
    function VghLantern__EncodersRidgeHips__Mesh()          { return window.VghLantern__SketchUpExport__Encoders__JoineryAndComponents; }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two Digit Index for a Part Name
    // ------------------------------------------------------------
    // Zero padded so the SketchUp outliner sorts HipBeam__02 before HipBeam__10.
    function VghLantern__EncodersRidgeHips__Pad(index) {
        return (index < 10) ? ('0' + index) : String(index);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finishes
// -----------------------------------------------------------------------------

    // FUNCTION | The Finishes the Ridge and Hip Are Specified With
    // ------------------------------------------------------------
    // Two answers, and they are not the same decision. The beams and the block
    // are interior painted joinery following the master joinery finish. The
    // aluminium capping is exterior powder coating following the exterior finish,
    // unless the lantern has diverged it - which is the one case the ridge
    // carries a finish of its own.
    //
    // Published so the payload builder can put a swatch for each in the material
    // table without re-deriving either.
    function VghLantern__SketchUpExport__Encoders__RidgeAndHips__Finishes(lantern) {
        var block     =  lantern ? lantern[FINISH_BLOCK] : null;
        var joinery   =  (block && block[FIELD_JOINERY_PAINT]) || '';
        var exterior  =  (block && block[FIELD_FRAME_FINISH])  || '';

        var Loader    =  VghLantern__EncodersRidgeHips__RidgeLoader();
        var stored    =  Loader ? (Loader.VghLantern__RidgeSystemLoader__CappingFinish(lantern) || '') : '';

        return { Joinery : joinery, Capping : stored || exterior };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Finish Name Recorded Against One Part
    // ------------------------------------------------------------
    // Empty on every fixed material part. A bare mill extrusion, a concealed
    // Sapele packer and a sheet of lead have no finish to quote, and writing the
    // lantern's paint colour beside one would read as a specification.
    function VghLantern__EncodersRidgeHips__FinishForPart(materialKey, finishes) {
        if (materialKey === 'joineryFinish')      return finishes.Joinery;
        if (materialKey === 'ridgeCappingFinish') return finishes.Capping;
        return '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ridge Encoder
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Encode Every Part of the Ridge Along the Ridge Datum
    // ------------------------------------------------------------
    // The parts arrive in the ridge type's own order - core, beam, blocking,
    // flashing, then the two capping parts on the type that has them - so a
    // leaded only ridge simply produces four prisms instead of six without this
    // function knowing what a ridge type is.
    async function VghLantern__EncodersRidgeHips__Ridge(skeleton, lantern, depths, pitchDeg, finishes, records) {
        var Sweep     =  VghLantern__EncodersRidgeHips__Sweep();
        var Factory   =  VghLantern__EncodersRidgeHips__Factory();
        var Geometry  =  VghLantern__EncodersRidgeHips__RidgeGeometry();
        var Loader    =  VghLantern__EncodersRidgeHips__RidgeLoader();
        if (!Geometry || !Loader) return;

        var member  =  Geometry.VghLantern__RidgeAssembly__RidgeMember(skeleton);
        if (!member) return;                                                  // <-- A pyramid has no ridge, which is a roof form rather than a fault

        var resolved;
        try {
            resolved  =  await Loader.VghLantern__RidgeSystemLoader__ResolveParts(lantern);
        } catch (resolveError) {
            console.warn('[VghLantern SketchUpExport] Ridge parts could not be resolved:', resolveError);
            return;
        }
        if (!Array.isArray(resolved) || resolved.length === 0) return;

        var parts  =  Geometry.VghLantern__RidgeAssembly__SectionsForPitch(resolved, {
            PitchDegrees : pitchDeg,
            BeamDeltaMm  : depths.Ridge.DeltaFromAuthoredMm
        });

        var typeKey  =  Loader.VghLantern__RidgeSystemLoader__TypeKey(lantern);
        var p, f, part, look, planes, prism, record;

        for (p = 0; p < parts.length; p++) {
            part  =  parts[p];
            look  =  RIDGE_PRESENTATION[part.PartKey];
            if (!look || !Array.isArray(part.Faces) || part.Faces.length === 0) continue;

            // Only the beam is cut back; the spine and the covering above it run
            // the full datum length and pass over the block.
            planes  =  Geometry.VghLantern__RidgeAssembly__EndPlanesForPart(part.PartKey, skeleton);

            for (f = 0; f < part.Faces.length; f++) {
                prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(
                    part.Faces[f], member.Start, member.End, {
                        StartPlane : planes ? planes.Start : null,
                        EndPlane   : planes ? planes.End   : null
                    });

                record  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
                    Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(look.NameKey, {
                                      Index : VghLantern__EncodersRidgeHips__Pad(1)
                                  }) + (part.Faces.length > 1 ? ('__' + (f + 1)) : ''),
                    TagKey      : look.TagKey,
                    MaterialKey : look.MaterialKey,
                    Attributes  : {
                        PartRole        : 'ridge' + part.PartKey.charAt(0).toUpperCase() + part.PartKey.slice(1),
                        PartCode        : part.AssetId  || '',
                        PartName        : part.PartName || '',
                        ElementRole     : part.ElementRole || '',
                        SpecMaterial    : part.SpecMaterial || '',
                        MemberId        : member.Id || '',
                        RidgeTypeKey    : typeKey,
                        DatumLengthMm   : member.LengthMm,
                        BeamDepthMm     : (part.PartKey === 'beam') ? depths.Ridge.DepthMm : null,
                        StandardDepthMm : (part.PartKey === 'beam') ? depths.Ridge.StandardDepthMm : null,
                        DepthStandardPitchDeg : depths.SnappedPitchDegrees,
                        Finish          : VghLantern__EncodersRidgeHips__FinishForPart(look.MaterialKey, finishes)
                    }
                });

                if (record) records.push(record);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hip Encoder
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Encode Every Part of Every Hip Along Its Own Datum
    // ------------------------------------------------------------
    // Part major, so the outliner groups all four hip beams together - the order
    // somebody counting them reads in. Each hip answers its own run for each
    // part, because the cut planes depend on that hip's plan direction and every
    // corner points a different way.
    async function VghLantern__EncodersRidgeHips__Hips(skeleton, lantern, depths, pitchDeg, finishes, records, warnings) {
        var Sweep     =  VghLantern__EncodersRidgeHips__Sweep();
        var Factory   =  VghLantern__EncodersRidgeHips__Factory();
        var Geometry  =  VghLantern__EncodersRidgeHips__HipGeometry();
        var Loader    =  VghLantern__EncodersRidgeHips__HipLoader();
        if (!Geometry || !Loader) return;

        var hips  =  Geometry.VghLantern__HipAssembly__HipMembers(skeleton);
        if (hips.length === 0) return;                                        // <-- A roof form with no hips

        var resolved;
        try {
            resolved  =  await Loader.VghLantern__HipSystemLoader__ResolveParts(lantern);
        } catch (resolveError) {
            console.warn('[VghLantern SketchUpExport] Hip parts could not be resolved:', resolveError);
            return;
        }
        if (!resolved || !Array.isArray(resolved.Parts) || resolved.Parts.length === 0) return;

        // A hip type with no geometry yet is drawn as hip beams and SAID SO. A
        // build file that quietly contains something other than what was
        // specified is worse than one that contains nothing.
        if (resolved.BuildType && resolved.BuildType.WasSubstituted && Array.isArray(warnings)) {
            warnings.push(resolved.BuildType.Message);
        }

        var parts  =  Geometry.VghLantern__HipAssembly__SectionsForPitch(resolved.Parts, {
            PitchDegrees : pitchDeg,
            BeamDeltaMm  : depths.Hip.DeltaFromAuthoredMm
        });

        var typeKey  =  Loader.VghLantern__HipSystemLoader__TypeKey(lantern);
        var p, h, f, part, look, hip, run, prism, record;

        for (p = 0; p < parts.length; p++) {
            part  =  parts[p];
            look  =  HIP_PRESENTATION[part.PartKey];
            if (!look || !Array.isArray(part.Faces) || part.Faces.length === 0) continue;

            for (h = 0; h < hips.length; h++) {
                hip  =  hips[h];
                run  =  Geometry.VghLantern__HipAssembly__RunForPart(part.PartKey, hip, pitchDeg);

                for (f = 0; f < part.Faces.length; f++) {
                    prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(
                        part.Faces[f], run.StartMm, run.EndMm, {
                            StartPlane : run.Planes ? run.Planes.Start : null,
                            EndPlane   : run.Planes ? run.Planes.End   : null
                        });

                    record  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
                        Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(look.NameKey, {
                                          Index : VghLantern__EncodersRidgeHips__Pad(h + 1)
                                      }) + (part.Faces.length > 1 ? ('__' + (f + 1)) : ''),
                        TagKey      : look.TagKey,
                        MaterialKey : look.MaterialKey,
                        Attributes  : {
                            PartRole        : 'hip' + part.PartKey.charAt(0).toUpperCase() + part.PartKey.slice(1),
                            PartCode        : part.AssetId  || '',
                            PartName        : part.PartName || '',
                            ElementRole     : part.ElementRole || '',
                            SpecMaterial    : part.SpecMaterial || '',
                            MemberId        : hip.Id || '',
                            HipTypeKey      : typeKey,
                            DatumLengthMm   : hip.LengthMm,
                            BeamDepthMm     : (part.PartKey === 'beam') ? depths.Hip.DepthMm : null,
                            StandardDepthMm : (part.PartKey === 'beam') ? depths.Hip.StandardDepthMm : null,
                            DepthStandardPitchDeg : depths.SnappedPitchDegrees,
                            OversailMm      : (part.PartKey === 'blocking' || part.PartKey === 'flashing')
                                                  ? Geometry.VghLantern__HipAssembly__OversailLengthMm(hip, pitchDeg)
                                                  : 0,
                            Finish          : VghLantern__EncodersRidgeHips__FinishForPart(look.MaterialKey, finishes)
                        }
                    });

                    if (record) records.push(record);
                }
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ridge Block Encoder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Placement Transform for One Block
    // ------------------------------------------------------------
    // Upright, with the plan rotation that squares the octagon's facets to the
    // roof. The block's flats face along its own local axes and both diagonals,
    // so aligning one pair with the ridge lands the hip facets on the 45 degree
    // diagonals for free.
    //
    // Given as three axis vectors rather than an angle because that is what
    // Geom::Transformation.axes takes, and because a rotation angle would have to
    // be signed against an axis convention this payload deliberately does not
    // carry.
    function VghLantern__EncodersRidgeHips__PlacementTransform(placement) {
        var radians  =  (Number(placement.PlanRotationDegrees) || 0) * DEG_TO_RAD;
        var cosA     =  Math.cos(radians);
        var sinA     =  Math.sin(radians);

        return {
            Origin : placement.Point,
            XAxis  : { x :  cosA, y : sinA, z : 0 },
            YAxis  : { x : -sinA, y : cosA, z : 0 },
            ZAxis  : { x : 0,     y : 0,    z : 1 },
            ScaleFactor : 1.0
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Encode the Octagonal Block at Every Ridge End
    // ------------------------------------------------------------
    // One definition, however many placements: both blocks on a hipped ridge are
    // the same turned component at the same depth, and SketchUp shares the
    // definition the way the model does.
    //
    // The mesh is STRETCHED before it is encoded. A ridge beam deeper than the
    // 230mm standard would push its moulded underside through the block's
    // turning, so the straight prism grows by the beam's own depth delta while
    // the turning travels rigid. That is the same transform the 3D viewport
    // applies, asked of the same module.
    async function VghLantern__EncodersRidgeHips__Block(skeleton, lantern, depths, result) {
        var Factory   =  VghLantern__EncodersRidgeHips__Factory();
        var Geometry  =  VghLantern__EncodersRidgeHips__RidgeGeometry();
        var Loader    =  VghLantern__EncodersRidgeHips__RidgeLoader();
        var MeshCodec =  VghLantern__EncodersRidgeHips__Mesh();
        if (!Geometry || !Loader || !MeshCodec) return;

        var placements  =  Geometry.VghLantern__RidgeAssembly__BlockPlacements(skeleton);
        if (placements.length === 0) return;

        var asset;
        try {
            asset  =  await Loader.VghLantern__RidgeSystemLoader__LoadBlockAsset();
        } catch (loadError) {
            console.warn('[VghLantern SketchUpExport] Ridge block could not be loaded:', loadError);
            return;
        }
        if (!asset || !asset['Na__Asset__Mesh3D']) return;

        var relationship  =  Loader.VghLantern__RidgeSystemLoader__BlockRelationship();
        var assetId       =  relationship ? (relationship.BlockAssetId || '') : '';
        var deltaMm       =  depths.Ridge.DeltaFromAuthoredMm;

        var stretched  =  Geometry.VghLantern__RidgeAssembly__StretchBlockMesh(asset['Na__Asset__Mesh3D'], deltaMm);
        var definition =  MeshCodec.VghLantern__SketchUpExport__Encoders__MeshDefinition(
            stretched,
            'ridgeBlock__' + Factory.VghLantern__SketchUpExport__PartFactory__SafeName(assetId || 'octagonal'),
            'Ridge Block - Standard Octagonal Block',
            assetId);

        if (!definition) return;
        result.Definitions.push(definition);

        var finishes  =  VghLantern__SketchUpExport__Encoders__RidgeAndHips__Finishes(lantern);
        var i, record;

        for (i = 0; i < placements.length; i++) {
            record  =  Factory.VghLantern__SketchUpExport__PartFactory__Instance(
                definition.Key,
                VghLantern__EncodersRidgeHips__PlacementTransform(placements[i]),
                {
                    Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(BLOCK_NAME_KEY, {
                                      Index : VghLantern__EncodersRidgeHips__Pad(i + 1)
                                  }),
                    TagKey      : BLOCK_TAG_KEY,
                    MaterialKey : BLOCK_MATERIAL_KEY,
                    Attributes  : {
                        PartRole     : 'ridgeBlock',
                        PartCode     : assetId,
                        PlacementId  : placements[i].Id || '',
                        StretchMm    : deltaMm,
                        Finish       : finishes.Joinery
                    }
                });

            if (record) result.Parts.push(record);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Encode the Cast Cap Closing Every Ridge End
    // ------------------------------------------------------------
    // One definition per VARIANT rather than one for the lot: a hipped ridge uses
    // the ridge end cap twice and never touches the pyramid one, and a pyramid
    // uses the pyramid one once and never touches the other, so in practice this
    // writes a single definition either way.
    //
    // The mesh is encoded as authored. Nothing about the cap is stretched - it
    // does not follow the ridge beam depth the way the block does, because it sits
    // above the capping rather than around the beam - so there is no transform to
    // apply and no depth to key anything on.
    //
    // A Leaded Only ridge carries no capping, so there is nothing for a cap to
    // close and the encoder returns without writing one or warning about it.
    async function VghLantern__EncodersRidgeHips__EndCap(skeleton, lantern, finishes, result) {
        var Factory   =  VghLantern__EncodersRidgeHips__Factory();
        var Geometry  =  VghLantern__EncodersRidgeHips__RidgeGeometry();
        var Loader    =  VghLantern__EncodersRidgeHips__RidgeLoader();
        var MeshCodec =  VghLantern__EncodersRidgeHips__Mesh();
        if (!Geometry || !Loader || !MeshCodec) return;

        if (Loader.VghLantern__RidgeSystemLoader__AllowsEndCaps(lantern) === false) return;

        var placements  =  Geometry.VghLantern__RidgeAssembly__EndCapPlacements(skeleton);
        if (placements.length === 0) return;

        var definitionsByAsset  =  {};
        var i, placement, variant, asset, definition, record;

        for (i = 0; i < placements.length; i++) {
            placement  =  placements[i];
            variant    =  Loader.VghLantern__RidgeSystemLoader__EndCapVariant(placement.Role);
            if (!variant) continue;

            if (!Object.prototype.hasOwnProperty.call(definitionsByAsset, variant.AssetId)) {
                definitionsByAsset[variant.AssetId]  =  null;

                try {
                    asset  =  await Loader.VghLantern__RidgeSystemLoader__LoadEndCapAsset(placement.Role);
                } catch (loadError) {
                    console.warn('[VghLantern SketchUpExport] Ridge end cap could not be loaded:', loadError);
                    asset  =  null;
                }

                if (asset && asset['Na__Asset__Mesh3D']) {
                    definition  =  MeshCodec.VghLantern__SketchUpExport__Encoders__MeshDefinition(
                        asset['Na__Asset__Mesh3D'],
                        'ridgeEndCap__' + Factory.VghLantern__SketchUpExport__PartFactory__SafeName(variant.AssetId),
                        variant.PartName || 'Ridge End Cap',
                        variant.AssetId);

                    if (definition) {
                        definitionsByAsset[variant.AssetId]  =  definition;
                        result.Definitions.push(definition);
                    }
                }
            }

            definition  =  definitionsByAsset[variant.AssetId];
            if (!definition) continue;                                          // <-- Asset carries no mesh; nothing to instance

            record  =  Factory.VghLantern__SketchUpExport__PartFactory__Instance(
                definition.Key,
                VghLantern__EncodersRidgeHips__PlacementTransform(placement),
                {
                    Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(END_CAP_NAME_KEY, {
                                      Index : VghLantern__EncodersRidgeHips__Pad(i + 1)
                                  }),
                    TagKey      : END_CAP_TAG_KEY,
                    MaterialKey : END_CAP_MATERIAL_KEY,
                    Attributes  : {
                        PartRole     : 'ridgeEndCap',
                        PartCode     : variant.AssetId,
                        PlacementId  : placement.Id || '',
                        AnchorRole   : placement.Role || '',
                        Finish       : finishes.Capping
                    }
                });

            if (record) result.Parts.push(record);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Encoder Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Ridge, the Hips and the Block They Die Into
    // ------------------------------------------------------------
    // Returns { Definitions, Parts } rather than a bare part list, because the
    // block is a placed mesh and carries a definition with it - the same shape
    // the components encoder answers in, so the payload builder merges both the
    // same way.
    //
    // @param skeleton  SolvedSkeleton
    // @param lantern   The lantern config block
    // @param warnings  Optional array; a substituted hip type is pushed onto it
    // @return          Promise resolving to { Definitions, Parts }
    async function VghLantern__SketchUpExport__Encoders__RidgeAndHips(skeleton, lantern, warnings) {
        var result  =  { Definitions : [], Parts : [] };

        var Sweep     =  VghLantern__EncodersRidgeHips__Sweep();
        var Factory   =  VghLantern__EncodersRidgeHips__Factory();
        var Geometry  =  VghLantern__EncodersRidgeHips__RidgeGeometry();
        if (!skeleton || !Sweep || !Factory || !Geometry) return result;

        // One depth resolution for the whole roof. The ridge and hip depths are a
        // single decision - the pairing is what holds the two plumb cuts level on
        // the block face - so they are read once and shared rather than asked for
        // twice and hoped to agree.
        var depths    =  Geometry.VghLantern__RidgeAssembly__DepthResolution(lantern, skeleton);
        var pitchDeg  =  Geometry.VghLantern__RidgeAssembly__PitchDegrees(skeleton);
        var finishes  =  VghLantern__SketchUpExport__Encoders__RidgeAndHips__Finishes(lantern);

        if (depths.Ridge.WasClamped && Array.isArray(warnings)) {
            warnings.push('Ridge beam depth override was limited to ' + depths.Ridge.AdjustmentMm
                + 'mm; ' + depths.Ridge.RequestedAdjustmentMm + 'mm was requested.');
        }
        if (depths.Hip.WasClamped && Array.isArray(warnings)) {
            warnings.push('Hip beam depth override was limited to ' + depths.Hip.AdjustmentMm
                + 'mm; ' + depths.Hip.RequestedAdjustmentMm + 'mm was requested.');
        }

        await VghLantern__EncodersRidgeHips__Ridge(skeleton, lantern, depths, pitchDeg, finishes, result.Parts);
        await VghLantern__EncodersRidgeHips__Hips(skeleton, lantern, depths, pitchDeg, finishes, result.Parts, warnings);
        await VghLantern__EncodersRidgeHips__Block(skeleton, lantern, depths, result);
        await VghLantern__EncodersRidgeHips__EndCap(skeleton, lantern, finishes, result);

        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__Encoders__RidgeAndHips           : VghLantern__SketchUpExport__Encoders__RidgeAndHips,
        VghLantern__SketchUpExport__Encoders__RidgeAndHips__Finishes : VghLantern__SketchUpExport__Encoders__RidgeAndHips__Finishes
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__Encoders__RidgeAndHips  =  VghLantern__SketchUpExport__Encoders__RidgeAndHips;
