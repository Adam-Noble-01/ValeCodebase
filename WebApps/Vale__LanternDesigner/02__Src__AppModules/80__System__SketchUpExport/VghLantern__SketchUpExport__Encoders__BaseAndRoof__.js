/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | ENCODERS - BASE AND ROOF
   =============================================================================

   FILE       : VghLantern__SketchUpExport__Encoders__BaseAndRoof__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - Encoders BaseAndRoof
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Encode the builders upstand, the base frame, the roof frame and the glass
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - Three assemblies out of the six, grouped here because all three read the
     SolvedSkeleton and nothing else: the base block, the datum ring and the
     member list are all the solver's own output.
   - Computes no geometry. Decides which section goes on which member and hands
     the pair to SweepGeometry, which is the only file that builds vertices.

   ---------------------------------------------------------------------------

   WHAT EACH ENCODER PRODUCES:

       BuildersUpstand   One prism from the Base block: the outer footprint
                         wound counter clockwise with the reveal as a hole
                         through it, extruded from the base level to the
                         upstand top. Built solid when the wall thickness
                         leaves no usable reveal, exactly as the solver reports.

       BaseFrame         Three parts - head beam, eaves extrusion, lead
                         flashing - each swept around all four sides of the
                         eaves datum ring with true plan mitres at the corners.
                         Twelve prisms, one per part per side, so a single
                         length of head beam is one selectable object in the
                         SketchUp outliner.

       RoofFrame         The ridge, hips and verges swept from the profile
                         library. The member roles skipped here are skipped by
                         the 3D viewport for the same reasons: the eaves ring
                         is a datum rather than a part, the upstand reveal is a
                         hole, and glazing bars belong to their own encoder.

       Glazing           One slab per solved glazing face, seated on the
                         bedding face and given its unit thickness outwards.

   ---------------------------------------------------------------------------

   THE EAVES CAP END EXTENSION - WHY NOTHING STOPS ON THE DATUM:

   The solver puts the hips and the glazing faces on the EAVES DATUM. Almost
   nothing physically stops there. The glaze bar cap runs 170mm further down
   the pitch past the datum to cover the eaves junction, and anything beside it
   that stopped at the datum would visibly float short of the roof edge:

       hips           the hip nose would hang in the air above the corner,
                      short of where the caps either side of it finish
       glazing        the pane would stop short of the cap ends, leaving the
                      eaves detail open

   Both are extended here, exactly as the 3D viewport extends them, and both
   for the same number out of the same place - the base frame system index,
   read through VghLantern__Geometry__BaseFrameAssembly.EavesInterface.

   THE SOLVED GEOMETRY IS NEVER MUTATED. Extended copies are swept, and the
   datum length and datum area still travel in each part's attributes, so the
   setting out centrelines, the cutting lengths and the area takeoff all keep
   the datum numbers while the solid reads correctly.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Base and Roof Encoders Module
// =============================================================================

const VghLantern__SketchUpExport__Encoders__BaseAndRoof = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Member Roles Swept Into the Roof Frame
    // ------------------------------------------------------------
    // Everything else the solver emits is either a datum, a hole or another
    // encoder's business. Naming what IS built rather than what is not means a
    // member role added to the solver later is left out until somebody decides
    // what section it takes, which is the safe direction.
    // RIDGE AND HIP LEFT ON 12-Aug-2026. Both were swept here from a single
    // placeholder profile, which is what the retired Ridge Section and Hip
    // Section dropdowns pointed at. A Vale ridge is a stack of up to six sections
    // and a hip is four, so Encoders RidgeAndHips owns them now and sweeping them
    // here as well would put a schematic section inside the real one.
    //
    // Verge stays. A gable's vergeboard IS one swept section, and the roof form
    // that needs it is disabled rather than deleted - so the role keeps working
    // the day somebody enables it.
    const ROOF_FRAME_ROLES  =  {
        verge : { TagKey: 'verge', NameKey: 'Verge', MaterialKey: 'timber' }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Base Frame Part Keys and Their Presentation
    // ------------------------------------------------------------
    const BASE_FRAME_PARTS  =  {
        headBeam       : { TagKey: 'headBeam',       NameKey: 'HeadBeam',       MaterialKey: 'sapele' },
        eavesExtrusion : { TagKey: 'eavesExtrusion', NameKey: 'EavesExtrusion', MaterialKey: 'millAluminium' },
        leadFlashing   : { TagKey: 'leadFlashing',   NameKey: 'LeadFlashing',   MaterialKey: 'leadFlashing' }
    };

    const BASE_FRAME_BUILD_ORDER  =  ['headBeam', 'eavesExtrusion', 'leadFlashing'];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Solver Vocabulary
    // ------------------------------------------------------------
    const FACE_ROLE_GLAZING    =  'glazingFace';
    const MEMBER_ROLE_HIP      =  'hip';
    const GEOMETRY_CONFIG_KEY  =  'VghLantern__SketchUpExport__Config__Geometry';
    const ENV3D_CONFIG_KEY     =  'VghLantern__Env3d__Config';
    const ENV3D_MESH_SECTION   =  'VghLantern__Env3d__Config__MeshBuilders';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Eaves Extension Guards
    // ------------------------------------------------------------
    // Both mirror the 3D builders they are ported from, so an extended hip and
    // an extended pane agree to the millimetre with what the viewport draws.
    const DEG_TO_RAD                =  Math.PI / 180;
    const EAVES_LEVEL_TOLERANCE_MM  =  0.5;                                  // <-- Within this of the eaves level, a vertex IS on the eaves
    const SLOPE_DENOMINATOR_LIMIT   =  0.1;                                  // <-- Below this the boundary edge is too across-slope to scale by
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module References and Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sweep Geometry Module
    // ------------------------------------------------------------
    function VghLantern__EncodersBaseAndRoof__Sweep() {
        return window.VghLantern__SketchUpExport__SweepGeometry;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Part Factory Module
    // ------------------------------------------------------------
    function VghLantern__EncodersBaseAndRoof__Factory() {
        return window.VghLantern__SketchUpExport__PartFactory;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Export Geometry Number
    // ------------------------------------------------------------
    function VghLantern__EncodersBaseAndRoof__GeometryNumber(key) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        var block         =  (appConfig && appConfig[GEOMETRY_CONFIG_KEY]) || {};
        return Number(block[key]) || 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Glazing Number, Preferring the Live 3D Config
    // ------------------------------------------------------------
    // The pane exported has to be the pane the viewport shows, so the 3D
    // MeshBuilders block is asked first and the export config only answers when
    // that block is silent. Both numbers are documented in either file.
    function VghLantern__EncodersBaseAndRoof__GlazingNumber(key) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        var env3dRoot     =  (appConfig && appConfig[ENV3D_CONFIG_KEY]) || {};
        var meshSection   =  env3dRoot[ENV3D_MESH_SECTION] || {};

        if (typeof meshSection[key] === 'number') return meshSection[key];
        return VghLantern__EncodersBaseAndRoof__GeometryNumber(key);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Builders Upstand Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Builders Upstand as One Hollow Prism
    // ------------------------------------------------------------
    // Plan rings are built here rather than read from the solver because the
    // solver reports the upstand as half extents and a reveal flag, which is a
    // smaller and more honest thing to carry than four corner lists that would
    // have to be kept in step with it.
    //
    // @param skeleton  SolvedSkeleton
    // @return          Array of part records
    function VghLantern__SketchUpExport__Encoders__BuildersUpstand(skeleton) {
        var Sweep    =  VghLantern__EncodersBaseAndRoof__Sweep();
        var Factory  =  VghLantern__EncodersBaseAndRoof__Factory();
        if (!skeleton || !skeleton.Base || !Sweep || !Factory) return [];

        var base      =  skeleton.Base;
        var planRings =  [ VghLantern__EncodersBaseAndRoof__PlanRectangle(
                               base.OuterHalfWidthMm, base.OuterHalfDepthMm, false) ];

        if (base.HasReveal && base.InnerHalfWidthMm > 0 && base.InnerHalfDepthMm > 0) {
            planRings.push(VghLantern__EncodersBaseAndRoof__PlanRectangle(
                base.InnerHalfWidthMm, base.InnerHalfDepthMm, true));          // <-- The reveal, wound the other way so it reads as a hole
        }

        var prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismFromPlanRings(
            planRings, base.UpstandBaseLevelMm, base.UpstandTopLevelMm);

        var part  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
            Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name('BuildersUpstand', {}),
            TagKey      : 'buildersUpstand',
            MaterialKey : 'buildersUpstand',
            Attributes  : {
                PartRole          : 'buildersUpstand',
                ScopeNote         : 'Prepared by others - Vale mounts the lantern onto it',
                UpstandHeightMm   : base.UpstandHeightMm,
                UpstandThicknessMm: base.UpstandThicknessMm,
                RevealWidthMm     : base.RevealWidthMm,
                RevealDepthMm     : base.RevealDepthMm
            }
        });

        return part ? [part] : [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Plan Rectangle Ring at Given Half Extents
    // ------------------------------------------------------------
    // Counter clockwise viewed from above for an outer loop, reversed for a
    // hole, which is the winding the importer raises its wall quads from.
    function VghLantern__EncodersBaseAndRoof__PlanRectangle(halfWidthMm, halfDepthMm, isHole) {
        var ring  =  [
            { x: -halfWidthMm, y: -halfDepthMm },
            { x:  halfWidthMm, y: -halfDepthMm },
            { x:  halfWidthMm, y:  halfDepthMm },
            { x: -halfWidthMm, y:  halfDepthMm }
        ];
        return isHole ? ring.slice().reverse() : ring;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Base Frame Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Three Part Base Frame Around the Eaves Datum Ring
    // ------------------------------------------------------------
    // Sections arrive from BaseFrameAssembly already pitched: the eaves
    // extrusion rotated to the roof pitch about the datum, the head beam and
    // flashing with their weathered tops re-sloped. Nothing here reasons about
    // pitch; it places what it is given.
    //
    // @param skeleton  SolvedSkeleton
    // @param lantern   The lantern config block
    // @return          Promise resolving to an array of part records
    async function VghLantern__SketchUpExport__Encoders__BaseFrame(skeleton, lantern) {
        var Sweep     =  VghLantern__EncodersBaseAndRoof__Sweep();
        var Factory   =  VghLantern__EncodersBaseAndRoof__Factory();
        var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        var Loader    =  window.VghLantern__AppData__BaseFrameSystemLoader;
        if (!skeleton || !Sweep || !Factory || !Assembly || !Loader) return [];

        var ring  =  Assembly.VghLantern__BaseFrameAssembly__DatumRing(skeleton);
        if (!ring) return [];

        var resolved  =  await Loader.VghLantern__BaseFrameSystemLoader__ResolveParts(lantern);
        if (!Array.isArray(resolved) || resolved.length === 0) return [];

        var pitched  =  Assembly.VghLantern__BaseFrameAssembly__SectionsForPitch(resolved, ring.PitchDegrees);

        return VghLantern__EncodersBaseAndRoof__SweepPartsAroundRing(
            pitched, ring, BASE_FRAME_BUILD_ORDER, BASE_FRAME_PARTS, ring.DatumLevelMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | Sweep a Set of Resolved Parts Around a Datum Ring
    // ------------------------------------------------------------
    // Shared by the base frame and the interior joinery, which sweep the same
    // ring with the same mitres and differ only in which parts they carry. The
    // joinery encoder imports it rather than owning a second copy.
    //
    // @param parts         Resolved parts carrying Faces in the section frame
    // @param ring          Datum ring from BaseFrameAssembly
    // @param buildOrder    Part keys in the order they should appear
    // @param presentation  Map of part key to { TagKey, NameKey, MaterialKey }
    // @param datumLevelMm  Height the section origin sits at
    // @return              Array of part records
    function VghLantern__EncodersBaseAndRoof__SweepPartsAroundRing(parts, ring, buildOrder, presentation, datumLevelMm) {
        var Sweep    =  VghLantern__EncodersBaseAndRoof__Sweep();
        var Factory  =  VghLantern__EncodersBaseAndRoof__Factory();
        var records  =  [];
        var sideNames  =  Factory.VghLantern__SketchUpExport__PartFactory__SideNames();

        var mitrePlanes  =  [];
        var corner;
        for (corner = 0; corner < 4; corner++) {
            mitrePlanes.push(Sweep.VghLantern__SketchUpExport__SweepGeometry__MitrePlaneAt(ring.Sides, corner));
        }

        var b, s, f, partKey, part, look, side, prism, record;

        for (b = 0; b < buildOrder.length; b++) {
            partKey  =  buildOrder[b];
            part     =  VghLantern__EncodersBaseAndRoof__FindPart(parts, partKey);
            look     =  presentation[partKey];
            if (!part || !look || !Array.isArray(part.Faces)) continue;

            for (s = 0; s < ring.Sides.length; s++) {
                side  =  ring.Sides[s];

                for (f = 0; f < part.Faces.length; f++) {
                    prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongRingSide(
                        part.Faces[f], side,
                        mitrePlanes[s],                                        // <-- Plane at this side's start corner
                        mitrePlanes[(s + 1) % 4],                              // <-- Plane at the corner it runs into
                        datumLevelMm);

                    record  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
                        Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(look.NameKey, {
                                          Side : sideNames[s] || ('Side' + (s + 1))
                                      }) + (part.Faces.length > 1 ? ('__' + (f + 1)) : ''),
                        TagKey      : look.TagKey,
                        MaterialKey : look.MaterialKey,
                        Attributes  : {
                            PartRole        : partKey,
                            PartCode        : part.AssetId || '',
                            PartName        : part.PartName || '',
                            SpecMaterial    : part.SpecMaterial || '',
                            SectionAreaSqMm : part.SectionAreaSqMm || 0,
                            RingSideIndex   : s
                        }
                    });

                    if (record) records.push(record);
                }
            }
        }

        return records;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find One Resolved Part by Its Part Key
    // ------------------------------------------------------------
    function VghLantern__EncodersBaseAndRoof__FindPart(parts, partKey) {
        var i;
        if (!Array.isArray(parts)) return null;

        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Eaves Cap End Extension
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Glaze Bar Cap Extension Along the Pitch
    // ------------------------------------------------------------
    // One number, from the base frame system index, that decides where the roof
    // edge physically finishes. Everything in this region is scaled from it.
    function VghLantern__EncodersBaseAndRoof__CapExtensionMm() {
        var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        if (!Assembly) return 0;

        return Number(Assembly.VghLantern__BaseFrameAssembly__EavesInterface()
            .GlazeBarCapExtensionAlongPitchMm) || 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Extend a Hip Member Down to the Glaze Bar Cap Ends
    // ------------------------------------------------------------
    // The solved hip stops on the eaves datum corner, but the glaze bar caps
    // beside it run the cap extension along the pitch past the datum, so an
    // unextended hip nose floats short of the roof edge.
    //
    // The hip's LOWER end is slid down its own axis until it reaches the LEVEL
    // of the cap ends - datum minus extension times sin(pitch) - which by the
    // roof plane geometry also lands it on the extended eaves line. Sliding
    // along the hip's own axis rather than down the slope is what keeps the
    // nose on the hip line, so the two roof planes still meet on it.
    //
    // Ported from VghLantern__Env3d__MeshBuilder__Skeleton__ExtendHips. The
    // member passed in is never mutated; an extended copy is returned.
    //
    // @param member    One solved skeleton member
    // @param skeleton  SolvedSkeleton, for the roof pitch
    // @return          An extended copy, or the member unchanged
    function VghLantern__EncodersBaseAndRoof__ExtendHip(member, skeleton) {
        if (!member || member.Role !== MEMBER_ROLE_HIP) return member;

        var meta      =  (skeleton && skeleton.Meta) || {};
        var pitchDeg  =  Number(meta.PitchDegrees);
        if (!isFinite(pitchDeg)) return member;

        var extensionMm  =  VghLantern__EncodersBaseAndRoof__CapExtensionMm();
        if (extensionMm <= 0) return member;

        var targetDropMm  =  extensionMm * Math.sin(pitchDeg * DEG_TO_RAD);

        var lowKey  =  (member.Start.z <= member.End.z) ? 'Start' : 'End';
        var low     =  member[lowKey];
        var high    =  (lowKey === 'Start') ? member.End : member.Start;
        var dropMm  =  Math.abs(high.z - low.z);
        var lengthMm =  Number(member.LengthMm) || 0;
        if (dropMm <= 0 || lengthMm <= 0) return member;

        var scale     =  targetDropMm / dropMm;                               // <-- Along-hip extension as a fraction of the member
        var extended  =  {
            Id            : member.Id,
            Role          : member.Role,
            LengthMm      : lengthMm * (1 + scale),
            DatumLengthMm : lengthMm,
            Start         : member.Start,
            End           : member.End
        };

        extended[lowKey]  =  {
            x : low.x + ((low.x - high.x) * scale),
            y : low.y + ((low.y - high.y) * scale),
            z : low.z + ((low.z - high.z) * scale)
        };

        return extended;
    }
    // ------------------------------------------------------------


    // FUNCTION | Run a Glazing Face's Eaves Vertices Down to the Cap Ends
    // ------------------------------------------------------------
    // HOW THE CORNERS MOVE - this is the part that keeps the hips closed.
    // Every eaves vertex slides along its OWN upslope boundary edge, extended:
    // for a corner that edge is the hip, so the pane's mitred side stays
    // collinear with the hip line rather than swinging sideways. The slide is
    // scaled so its down-slope component is exactly the cap extension, which
    // lands the whole eaves edge parallel to the datum at the cap end level.
    //
    // On an equal-pitch hip the two adjacent panes extend along the SAME 3D hip
    // line by the same amount, so their extended corners coincide and no gap
    // can open. Points above the eaves never move.
    //
    // Ported from VghLantern__Env3d__MeshBuilder__Glazing's
    // ExtendPointsToCapEnds. The solved face is never mutated.
    //
    // @param face      One solved glazing face
    // @param skeleton  SolvedSkeleton, for the eaves level
    // @return          A new point array, or the original when nothing applies
    function VghLantern__EncodersBaseAndRoof__ExtendFaceToCapEnds(face, skeleton) {
        var points   =  face.Points;
        var meta     =  (skeleton && skeleton.Meta) || {};
        var eavesMm  =  Number(meta.EavesLevelMm);
        if (!isFinite(eavesMm)) return points;

        var extensionMm  =  VghLantern__EncodersBaseAndRoof__CapExtensionMm();
        if (extensionMm <= 0) return points;

        var count    =  points.length;
        var onEaves  =  [];
        var eavesPts =  [];
        var i;

        for (i = 0; i < count; i++) {
            onEaves[i]  =  Math.abs(points[i].z - eavesMm) <= EAVES_LEVEL_TOLERANCE_MM;
            if (onEaves[i]) eavesPts.push(points[i]);
        }
        if (eavesPts.length < 2 || eavesPts.length >= count) return points;

        // IN-PLANE DOWN-SLOPE UNIT for this face: the horizontal outward normal
        // of the eaves edge, away from the centroid, pitched down by the face
        // pitch. Used to scale each vertex's slide, and as the fallback
        // direction if a boundary edge ever degenerates.
        var pitchRad  =  (Number(face.PitchDegrees) || 0) * DEG_TO_RAD;
        var cx  =  0;
        var cy  =  0;

        for (i = 0; i < count; i++) { cx += points[i].x; cy += points[i].y; }
        cx /= count;
        cy /= count;

        var ex  =  eavesPts[1].x - eavesPts[0].x;
        var ey  =  eavesPts[1].y - eavesPts[0].y;
        var el  =  Math.hypot(ex, ey);
        if (el <= 0) return points;

        var nx  =  ey / el;
        var ny  =  -ex / el;
        if ((((eavesPts[0].x - cx) * nx) + ((eavesPts[0].y - cy) * ny)) < 0) { nx = -nx; ny = -ny; }

        var slopeDir  =  {
            x : nx * Math.cos(pitchRad),
            y : ny * Math.cos(pitchRad),
            z : -Math.sin(pitchRad)
        };

        var out  =  [];
        var point, prev, next, upper, dirX, dirY, dirZ, ux, uy, uz, ul, denominator, slide;

        for (i = 0; i < count; i++) {
            point  =  points[i];

            if (!onEaves[i]) { out.push(point); continue; }

            // The upslope neighbour on the polygon boundary - the hip end or
            // ridge end this vertex's side edge runs up to.
            prev   =  points[(i + count - 1) % count];
            next   =  points[(i + 1) % count];
            upper  =  !onEaves[(i + count - 1) % count] ? prev
                   :  !onEaves[(i + 1) % count]         ? next
                   :  null;

            dirX  =  slopeDir.x;
            dirY  =  slopeDir.y;
            dirZ  =  slopeDir.z;

            if (upper) {
                ux  =  point.x - upper.x;
                uy  =  point.y - upper.y;
                uz  =  point.z - upper.z;
                ul  =  Math.hypot(ux, uy, uz);
                if (ul > 0) { dirX = ux / ul; dirY = uy / ul; dirZ = uz / ul; }
            }

            // Scale so the slide's down-slope component equals the extension.
            denominator  =  (dirX * slopeDir.x) + (dirY * slopeDir.y) + (dirZ * slopeDir.z);
            slide        =  (denominator > SLOPE_DENOMINATOR_LIMIT) ? (extensionMm / denominator) : extensionMm;

            out.push({
                x : point.x + (dirX * slide),
                y : point.y + (dirY * slide),
                z : point.z + (dirZ * slide)
            });
        }

        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Roof Frame Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Ridge, Hips and Verges as Swept Members
    // ------------------------------------------------------------
    // One profile lookup per role rather than per member: a lantern carries one
    // ridge and four hips and they all take the same section, so asking the
    // profile loader once per role keeps this to two awaits however divided the
    // roof is.
    //
    // @param skeleton  SolvedSkeleton
    // @param lantern   The lantern config block
    // @return          Promise resolving to an array of part records
    async function VghLantern__SketchUpExport__Encoders__RoofFrame(skeleton, lantern) {
        var Sweep    =  VghLantern__EncodersBaseAndRoof__Sweep();
        var Factory  =  VghLantern__EncodersBaseAndRoof__Factory();
        var Loader   =  window.VghLantern__AppData__ProfileIndexLoader;
        if (!skeleton || !Array.isArray(skeleton.Members) || !Sweep || !Factory) return [];

        var faces    =  await VghLantern__EncodersBaseAndRoof__RoofSectionFaces(Loader, lantern);
        var counters =  {};
        var records  =  [];
        var i, member, look, face, swept, prism, record, index;

        for (i = 0; i < skeleton.Members.length; i++) {
            member  =  skeleton.Members[i];
            look    =  ROOF_FRAME_ROLES[member.Role];
            face    =  faces[member.Role];
            if (!look || !face) continue;                                     // <-- Role not built, or no section resolved for it

            counters[member.Role]  =  (counters[member.Role] || 0) + 1;
            index                  =  counters[member.Role];

            // Nothing left in this table reaches the eaves, so nothing is
            // extended. The hip extension helper stays because the glazing
            // encoder below still runs its pane feet down to the cap ends with
            // the same construction.
            swept  =  member;

            prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismAlongMember(
                face.Face, swept.Start, swept.End, {});

            record  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
                Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name(look.NameKey, {
                                  Index : VghLantern__EncodersBaseAndRoof__Pad(index)
                              }),
                TagKey      : look.TagKey,
                MaterialKey : look.MaterialKey,
                Attributes  : {
                    PartRole         : member.Role,
                    MemberId         : member.Id || '',
                    ProfileId        : face.ProfileId || '',
                    DatumLengthMm    : member.LengthMm,                       // <-- The set-out length; the swept solid may be longer
                    EavesExtendedMm  : (swept !== member)
                                           ? (swept.LengthMm - member.LengthMm)
                                           : 0
                }
            });

            if (record) records.push(record);
        }

        return records;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve One Section Face per Roof Frame Role
    // ------------------------------------------------------------
    // A role with no profile assigned falls back to a plain rectangle of the
    // configured size, matching the viewport's PlaceholderSectionOnMissingProfile
    // behaviour: a member that reads as the wrong section is a question somebody
    // asks, a member that silently vanishes is not.
    async function VghLantern__EncodersBaseAndRoof__RoofSectionFaces(Loader, lantern) {
        var Sweep   =  VghLantern__EncodersBaseAndRoof__Sweep();
        var faces   =  {};
        var roleKey, outline, profileId;

        for (roleKey in ROOF_FRAME_ROLES) {
            if (!Object.prototype.hasOwnProperty.call(ROOF_FRAME_ROLES, roleKey)) continue;

            outline    =  null;
            profileId  =  '';

            if (Loader) {
                try {
                    outline    =  await Loader.VghLantern__ProfileIndexLoader__GetOutlineForRole(lantern, roleKey);
                    profileId  =  Loader.VghLantern__ProfileIndexLoader__ProfileIdForRole(lantern, roleKey) || '';
                } catch (loadError) {
                    console.warn('[VghLantern SketchUpExport] Profile lookup failed for role "' + roleKey + '":', loadError);
                }
            }

            if (!Array.isArray(outline) || outline.length < 3) {
                outline    =  VghLantern__EncodersBaseAndRoof__FallbackOutline();
                profileId  =  profileId || 'fallbackRectangle';
            }

            faces[roleKey]  =  {
                Face      : Sweep.VghLantern__SketchUpExport__SweepGeometry__FaceFromOutline(outline),
                ProfileId : profileId
            };
        }

        return faces;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Placeholder Rectangular Section
    // ------------------------------------------------------------
    function VghLantern__EncodersBaseAndRoof__FallbackOutline() {
        var widthMm  =  VghLantern__EncodersBaseAndRoof__GeometryNumber('FallbackBarWidthMm');
        var depthMm  =  VghLantern__EncodersBaseAndRoof__GeometryNumber('FallbackBarDepthMm');
        var halfW    =  widthMm / 2;

        return [
            { x: -halfW, y: 0 },
            { x:  halfW, y: 0 },
            { x:  halfW, y: depthMm },
            { x: -halfW, y: depthMm }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two Digit Index for a Part Name
    // ------------------------------------------------------------
    // Zero padded so the SketchUp outliner sorts Hip__02 before Hip__10.
    function VghLantern__EncodersBaseAndRoof__Pad(index) {
        return (index < 10) ? ('0' + index) : String(index);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glazing Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode Each Solved Glazing Face as a Sealed Unit Slab
    // ------------------------------------------------------------
    // The slab's inner face sits the bedding offset ABOVE the glaze bar datum -
    // the depth of the core's glazing leg and the setting tape - and the unit
    // thickness is measured outward from there, so a thicker unit moves the
    // outer surface up under the cap and leaves the bedded face where the bar
    // put it. That is how the real unit behaves on the roof.
    //
    // @param skeleton  SolvedSkeleton
    // @return          Array of part records
    function VghLantern__SketchUpExport__Encoders__Glazing(skeleton) {
        var Sweep    =  VghLantern__EncodersBaseAndRoof__Sweep();
        var Factory  =  VghLantern__EncodersBaseAndRoof__Factory();
        if (!skeleton || !Array.isArray(skeleton.Faces) || !Sweep || !Factory) return [];

        var offsetMm     =  VghLantern__EncodersBaseAndRoof__GlazingNumber('GlazingInnerFaceOffsetMm');
        var thicknessMm  =  VghLantern__EncodersBaseAndRoof__GlazingNumber('GlazingThicknessMm');
        var records      =  [];
        var i, face, points, prism, record;

        for (i = 0; i < skeleton.Faces.length; i++) {
            face  =  skeleton.Faces[i];
            if (!face || face.Role !== FACE_ROLE_GLAZING) continue;
            if (!Array.isArray(face.Points) || face.Points.length < 3) continue;

            // The pane runs past the datum to the cap ends before anything else
            // is done to it, so the winding pass and the slab both work on the
            // ring the glass actually occupies.
            points  =  VghLantern__EncodersBaseAndRoof__ExtendFaceToCapEnds(face, skeleton);
            points  =  VghLantern__EncodersBaseAndRoof__OutwardWound(points);

            prism  =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismFromPolygon(
                points, offsetMm, thicknessMm);

            record  =  Factory.VghLantern__SketchUpExport__PartFactory__Prism(prism, {
                Name        : Factory.VghLantern__SketchUpExport__PartFactory__Name('Glazing', {
                                  SlopeKey : face.SlopeKey || ('face' + (i + 1))
                              }),
                TagKey      : 'glazing',
                MaterialKey : 'glazing',
                Attributes  : {
                    PartRole        : 'glazingUnit',
                    FaceId          : face.Id || '',
                    SlopeKey        : face.SlopeKey || '',
                    PitchDegrees    : face.PitchDegrees || 0,
                    DatumAreaSqMm   : face.AreaSqMm || 0,                     // <-- The set-out area; the built pane runs past the datum
                    UnitThicknessMm : thicknessMm,
                    BeddingOffsetMm : offsetMm,
                    EavesExtendedMm : VghLantern__EncodersBaseAndRoof__CapExtensionMm()
                }
            });

            if (record) records.push(record);
        }

        return records;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wind a Roof Face So Its Normal Points Up and Out
    // ------------------------------------------------------------
    // Every glazing face on a lantern slopes up and away, so a normal with a
    // negative Z component means the solver handed the ring back the other way
    // round for this slope. Reversing the ring rather than negating the normal
    // keeps the offset direction and the ring winding in agreement, which is
    // what the importer needs to raise its edge band the right way out.
    function VghLantern__EncodersBaseAndRoof__OutwardWound(points) {
        var Sweep   =  VghLantern__EncodersBaseAndRoof__Sweep();
        var prism   =  Sweep.VghLantern__SketchUpExport__SweepGeometry__PrismFromPolygon(points, 0, 1);
        if (!prism || !prism.Normal) return points;

        return (prism.Normal.z < 0) ? points.slice().reverse() : points;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__Encoders__BuildersUpstand    : VghLantern__SketchUpExport__Encoders__BuildersUpstand,
        VghLantern__SketchUpExport__Encoders__BaseFrame          : VghLantern__SketchUpExport__Encoders__BaseFrame,
        VghLantern__SketchUpExport__Encoders__RoofFrame          : VghLantern__SketchUpExport__Encoders__RoofFrame,
        VghLantern__SketchUpExport__Encoders__Glazing            : VghLantern__SketchUpExport__Encoders__Glazing,
        VghLantern__SketchUpExport__Encoders__SweepPartsAroundRing : VghLantern__EncodersBaseAndRoof__SweepPartsAroundRing,

        // The eaves cap end extension, exposed because it is a named geometric
        // operation rather than a private detail: the DXF exporter next door
        // needs the same extended outlines for its plan and elevations, and a
        // second copy of it would be a second thing to keep in step.
        VghLantern__SketchUpExport__Encoders__ExtendHip          : VghLantern__EncodersBaseAndRoof__ExtendHip,
        VghLantern__SketchUpExport__Encoders__ExtendFaceToCapEnds : VghLantern__EncodersBaseAndRoof__ExtendFaceToCapEnds,
        VghLantern__SketchUpExport__Encoders__CapExtensionMm     : VghLantern__EncodersBaseAndRoof__CapExtensionMm
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__Encoders__BaseAndRoof  =  VghLantern__SketchUpExport__Encoders__BaseAndRoof;
