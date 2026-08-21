/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | ENCODERS - GLAZE BARS
   =============================================================================

   FILE       : VghLantern__SketchUpExport__Encoders__GlazeBars__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - Encoders GlazeBars
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Encode the three part Vale glaze bar along every solved bar datum
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - A Vale roof glaze bar is not one section. It is three parts sharing one
     datum, and the exported model says so:

         Glaze Bar Core   45_2011   mill aluminium, the concealed structural
                                    extrusion carrying the glass
         Glaze Bar Cap    45_2021   powder coated aluminium, the decorative
                                    outer capping seen from the garden
         Glaze Bar Trim   45_2031   Douglas fir, the internal moulding seen
                          /1032     from inside the room, in 45, 70 or 90 mm
                          /1033     depth

   - Each part becomes its own prism on every bar, so a lantern with twenty
     bars exports sixty selectable objects. That is the whole point of the
     granularity: a workshop cutting list needs the cap lengths separately from
     the core lengths, and they are not the same number.

   ---------------------------------------------------------------------------

   THE EAVES INTERFACE - WHY THE THREE PARTS ARE DIFFERENT LENGTHS:

   The bar datum the layout solves runs between the eaves datum ring and the
   ridge or hip. None of the three parts actually stops there:

       core   runs 42.5 mm further down the pitch, square cut, to seat on and
              weld to the aluminium eaves extrusion
       cap    runs 170 mm further down the pitch, square cut, to cover the
              eaves junction
       trim   keeps the datum foot but takes a VERTICAL plumb cut, whose plane
              stands 18 mm horizontally inboard of the datum point, so the cut
              reads plumb from inside the room at any roof pitch

   All three numbers come from the base frame system index and are applied by
   VghLantern__Geometry__BaseFrameAssembly, the same module the 3D viewport
   asks. This encoder asks the same questions in the same order and does no
   arithmetic of its own on them.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Glaze Bar Encoders Module
// =============================================================================

const VghLantern__SketchUpExport__Encoders__GlazeBars = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Part Keys and Their Presentation
    // ------------------------------------------------------------
    // Order matches the 3D composite: core first, then cap, then trim, so the
    // SketchUp outliner lists them the way the bar assembles.
    const PART_CORE  =  'core';
    const PART_CAP   =  'cap';
    const PART_TRIM  =  'trim';

    const PART_ORDER  =  [PART_CORE, PART_CAP, PART_TRIM];

    const END_CAP_TAG_KEY       =  'glazeBarEndCap';
    const END_CAP_NAME_KEY      =  'GlazeBarEndCap';
    const END_CAP_MATERIAL_KEY  =  'frameFinish';                            // <-- Welded to the cap, so it takes the cap's own swatch

    const PART_PRESENTATION  =  {
        core : { TagKey: 'glazeBarCore', NameKey: 'GlazeBarCore', MaterialKey: 'millAluminium' },
        cap  : { TagKey: 'glazeBarCap',  NameKey: 'GlazeBarCap',  MaterialKey: 'frameFinish'   },
        trim : { TagKey: 'glazeBarTrim', NameKey: 'GlazeBarTrim', MaterialKey: 'joineryFinish' }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Block Keys
    // ------------------------------------------------------------
    const BARS_BLOCK  =  'Lantern__GlazingBars__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module References
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sweep Geometry Module
    // ------------------------------------------------------------
    function VghLantern__EncodersGlazeBars__Sweep() {
        return window.VghLantern__SketchUpExport__SweepGeometry;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Part Factory Module
    // ------------------------------------------------------------
    function VghLantern__EncodersGlazeBars__Factory() {
        return window.VghLantern__SketchUpExport__PartFactory;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Eaves End Treatment
// -----------------------------------------------------------------------------

    // FUNCTION | The Eaves End Treatment for One Bar of One Part
    // ------------------------------------------------------------
    // Answers where this part's bar actually starts and stops, and whether
    // either end is cut on a plane rather than square. A bar with no eaves end -
    // a transom, or a leg running hip to ridge - passes through untouched, as
    // does any build reaching here without the geometry module.
    //
    // Mirrors VghLantern__Env3d__MeshBuilder__GlazeBarComposite's treatment
    // exactly, minus the conversion to world space that the viewport needs and
    // this exporter does not.
    //
    // @param partKey  'core' | 'cap' | 'trim'
    // @param bar       One bar record from the GlazeBarSet
    // @return          { StartMm, EndMm, StartPlane, EndPlane }
    function VghLantern__EncodersGlazeBars__EavesTreatment(partKey, bar) {
        var untouched  =  { StartMm: bar.Start, EndMm: bar.End, StartPlane: null, EndPlane: null };

        var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        if (!Assembly) return untouched;
        if (bar.EavesEnd !== 'start' && bar.EavesEnd !== 'end') return untouched;

        if (partKey === PART_CORE || partKey === PART_CAP) {
            var iface      =  Assembly.VghLantern__BaseFrameAssembly__EavesInterface();
            var extension  =  (partKey === PART_CORE)
                ? iface.GlazeBarCoreExtensionAlongPitchMm
                : iface.GlazeBarCapExtensionAlongPitchMm;

            var extended  =  Assembly.VghLantern__BaseFrameAssembly__ExtendedEavesPoint(bar, undefined, extension);
            if (!extended) return untouched;

            return {
                StartMm    : (extended.EndKey === 'start') ? extended.Point : bar.Start,
                EndMm      : (extended.EndKey === 'end')   ? extended.Point : bar.End,
                StartPlane : null,
                EndPlane   : null
            };
        }

        if (partKey === PART_TRIM) {
            var planeMm  =  Assembly.VghLantern__BaseFrameAssembly__TrimPlumbPlane(bar, undefined);
            if (!planeMm) return untouched;

            return {
                StartMm    : bar.Start,
                EndMm      : bar.End,
                StartPlane : (bar.EavesEnd === 'start') ? planeMm : null,
                EndPlane   : (bar.EavesEnd === 'end')   ? planeMm : null
            };
        }

        return untouched;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glaze Bar Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode Every Bar in the Set as Three Prisms
    // ------------------------------------------------------------
    // Parts are resolved once for the whole lantern, because the section a bar
    // takes is a decision about the job rather than about the bar. The loop then
    // runs part-major so the outliner groups all the cores together, which is
    // the order somebody counting them reads in.
    //
    // @param barSet   GlazeBarSet from VghLantern__Geometry__GlazeBarLayout
    // @param lantern  The lantern config block
    // @return         Promise resolving to an array of part records
    async function VghLantern__SketchUpExport__Encoders__GlazeBars(barSet, lantern) {
        var Sweep    =  VghLantern__EncodersGlazeBars__Sweep();
        var Factory  =  VghLantern__EncodersGlazeBars__Factory();
        var Loader   =  window.VghLantern__AppData__GlazeBarSystemLoader;
        if (!barSet || !Array.isArray(barSet.Bars) || barSet.Bars.length === 0) return [];
        if (!Sweep || !Factory || !Loader) return [];

        var parts;
        try {
            parts  =  await Loader.VghLantern__GlazeBarSystemLoader__ResolveParts(lantern);
        } catch (resolveError) {
            console.warn('[VghLantern SketchUpExport] Glaze bar parts could not be resolved:', resolveError);
            return [];
        }
        if (!Array.isArray(parts) || parts.length === 0) return [];

        var finishes  =  VghLantern__EncodersGlazeBars__BarFinishes(lantern);
        var records   =  [];
        var p, b, f, partKey, part, look, bar, treatment, prism, record, counters;

        for (p = 0; p < PART_ORDER.length; p++) {
            partKey  =  PART_ORDER[p];
            part     =  VghLantern__EncodersGlazeBars__FindPart(parts, partKey);
            look     =  PART_PRESENTATION[partKey];
            if (!part || !look || !Array.isArray(part.Faces) || part.Faces.length === 0) continue;

            counters  =  {};

            for (b = 0; b < barSet.Bars.length; b++) {
                bar        =  barSet.Bars[b];
                treatment  =  VghLantern__EncodersGlazeBars__EavesTreatment(partKey, bar);

                counters[bar.SlopeKey]  =  (counters[bar.SlopeKey] || 0) + 1;

                for (f = 0; f < part.Faces.length; f++) {
                    prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(
                        part.Faces[f], treatment.StartMm, treatment.EndMm, {
                            StartPlane : treatment.StartPlane,
                            EndPlane   : treatment.EndPlane
                        });

                    record  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
                        Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(look.NameKey, {
                                          SlopeKey : bar.SlopeKey || 'slope',
                                          Index    : VghLantern__EncodersGlazeBars__Pad(counters[bar.SlopeKey])
                                      }) + (part.Faces.length > 1 ? ('__' + (f + 1)) : ''),
                        TagKey      : look.TagKey,
                        MaterialKey : look.MaterialKey,
                        Attributes  : {
                            PartRole      : 'glazeBar' + partKey.charAt(0).toUpperCase() + partKey.slice(1),
                            PartCode      : part.AssetId || '',
                            PartName      : part.PartName || '',
                            BarId         : bar.Id || '',
                            BarRole       : bar.Role || '',
                            SlopeKey      : bar.SlopeKey || '',
                            EavesEnd      : bar.EavesEnd || '',
                            DatumLengthMm : bar.LengthMm,
                            Finish        : VghLantern__EncodersGlazeBars__FinishForPart(partKey, finishes)
                        }
                    });

                    if (record) records.push(record);
                }
            }
        }

        return records;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Two Finishes a Bar Is Specified With
    // ------------------------------------------------------------
    // Cap and trim face opposite ways - the cap out at the garden, the trim in
    // at the room - so they are never one decision. The core takes no finish
    // because it is never seen once the other two are on.
    function VghLantern__SketchUpExport__Encoders__GlazeBars__Finishes(lantern) {
        return VghLantern__EncodersGlazeBars__BarFinishes(lantern);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Cap and Trim Finish Names
    // ------------------------------------------------------------
    function VghLantern__EncodersGlazeBars__BarFinishes(lantern) {
        var block  =  lantern ? lantern[BARS_BLOCK] : null;
        if (!block) return { Cap: '', Trim: '' };

        return {
            Cap  : block['Lantern__GlazingBars__Config__CapFinish']  || '',
            Trim : block['Lantern__GlazingBars__Config__TrimFinish'] || ''
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Finish Name Recorded Against One Part
    // ------------------------------------------------------------
    function VghLantern__EncodersGlazeBars__FinishForPart(partKey, finishes) {
        if (partKey === PART_CAP)  return finishes.Cap;
        if (partKey === PART_TRIM) return finishes.Trim;
        return '';                                                            // <-- The core is never seen, so it carries no finish
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find a Resolved Part by Its Slot Key
    // ------------------------------------------------------------
    function VghLantern__EncodersGlazeBars__FindPart(parts, partKey) {
        var i;
        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two Digit Index for a Part Name
    // ------------------------------------------------------------
    function VghLantern__EncodersGlazeBars__Pad(index) {
        return (index < 10) ? ('0' + index) : String(index);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | End Cap Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Cast Cap on the End of Every Bar
    // ------------------------------------------------------------
    // Answers { Definitions, Parts } rather than a bare list, because the cap is a
    // placed MESH and travels with its own definition - the same shape the ridge
    // block and the components encoder use, merged into the same table.
    //
    // ONE DEFINITION, HOWEVER MANY BARS. Forty bars are forty instances of one
    // component, exactly as the model holds them, so a lantern's worth of caps
    // costs one mesh in the payload rather than forty copies of the same 224
    // vertices.
    //
    // The transform comes straight from the geometry module's placement basis. Its
    // three vectors are already unit length, already right handed and already in
    // model millimetres, which is the frame this payload is written in, so there is
    // nothing to convert and no pair of angles to compose in the right order.
    //
    // @param barSet   SolvedGlazeBarSet
    // @param lantern  The lantern config block
    // @return         Promise resolving to { Definitions, Parts }
    async function VghLantern__SketchUpExport__Encoders__GlazeBarEndCaps(barSet, lantern) {
        var Factory   =  VghLantern__EncodersGlazeBars__Factory();
        var Geometry  =  window.VghLantern__Geometry__GlazeBarAssembly;
        var Loader    =  window.VghLantern__AppData__GlazeBarSystemLoader;
        var MeshCodec =  window.VghLantern__SketchUpExport__Encoders__JoineryAndComponents;

        var result  =  { Definitions : [], Parts : [] };
        if (!barSet || !Factory || !Geometry || !Loader || !MeshCodec) return result;

        var placements  =  Geometry.VghLantern__GlazeBarAssembly__EndCapPlacements(barSet, lantern);
        if (placements.length === 0) return result;

        var relationship  =  Geometry.VghLantern__GlazeBarAssembly__EndCapGeometry();

        var asset;
        try {
            asset  =  await Loader.VghLantern__GlazeBarSystemLoader__LoadEndCapAsset();
        } catch (loadError) {
            console.warn('[VghLantern SketchUpExport] Glaze bar end cap could not be loaded:', loadError);
            return result;
        }
        if (!asset || !asset['Na__Asset__Mesh3D']) return result;

        var definition  =  MeshCodec.VghLantern__SketchUpExport__Encoders__MeshDefinition(
            asset['Na__Asset__Mesh3D'],
            'glazeBarEndCap__' + Factory.VghLantern__SketchUpExport__PartFactory__SafeName(relationship.AssetId),
            relationship.PartName || 'Glaze Bar End Cap',
            relationship.AssetId);

        if (!definition) return result;
        result.Definitions.push(definition);

        var finishes  =  VghLantern__EncodersGlazeBars__BarFinishes(lantern);
        var counters  =  {};
        var i, placement, slopeKey, record;

        for (i = 0; i < placements.length; i++) {
            placement  =  placements[i];
            slopeKey   =  placement.SlopeKey || 'slope';

            counters[slopeKey]  =  (counters[slopeKey] || 0) + 1;

            record  =  Factory.VghLantern__SketchUpExport__PartFactory__Instance(
                definition.Key,
                {
                    Origin      : placement.Point,
                    XAxis       : placement.AxisX,
                    YAxis       : placement.AxisY,
                    ZAxis       : placement.AxisZ,
                    ScaleFactor : 1.0
                },
                {
                    Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(END_CAP_NAME_KEY, {
                                      SlopeKey : slopeKey,
                                      Index    : VghLantern__EncodersGlazeBars__Pad(counters[slopeKey])
                                  }),
                    TagKey      : END_CAP_TAG_KEY,
                    MaterialKey : END_CAP_MATERIAL_KEY,
                    Attributes  : {
                        PartRole    : 'glazeBarEndCap',
                        PartCode    : relationship.AssetId,
                        PartName    : relationship.PartName || '',
                        PlacementId : placement.Id || '',
                        BarId       : placement.BarId || '',
                        SlopeKey    : placement.SlopeKey || '',
                        Finish      : finishes.Cap
                    }
                });

            if (record) result.Parts.push(record);
        }

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
        VghLantern__SketchUpExport__Encoders__GlazeBars           : VghLantern__SketchUpExport__Encoders__GlazeBars,
        VghLantern__SketchUpExport__Encoders__GlazeBarEndCaps     : VghLantern__SketchUpExport__Encoders__GlazeBarEndCaps,
        VghLantern__SketchUpExport__Encoders__GlazeBars__Finishes : VghLantern__SketchUpExport__Encoders__GlazeBars__Finishes
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__Encoders__GlazeBars  =  VghLantern__SketchUpExport__Encoders__GlazeBars;
