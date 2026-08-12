/* =============================================================================
   VGHLANTERN - HIP ASSEMBLY GEOMETRY
   =============================================================================

   FILE       : VghLantern__Geometry__HipAssembly__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - HipAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pure geometry for the Vale hip, its end cuts and its pitch adaptation
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - The one place the hip construction is reasoned about, and deliberately the
     mirror of VghLantern__Geometry__RidgeAssembly in shape.
   - THE DATUM: the hip datum is the hip construction triangle line the skeleton
     solver publishes, running from the eaves datum corner up to the ridge end
     point. Every hip section is authored about it, in the plane NORMAL to that
     line: section 0,0 sits on the datum, -y hangs into the room, +y stacks out
     through the roof.
   - THE STACK, from the datum outwards:
         beam          -213 .. -8    Sapele, seen from the room
         core           -55.5 .. 61  mill aluminium spine
         blocking          32 .. 70.8 timber fillet, substrate for the lead
         flashing        21.8 .. 72.8 lead, the weathering projection
   - END CUTS AT THE HEAD: only the beam is cut back, plumb against the octagonal
     block facet. Everything else runs to the ridge end point and over the block.
   - END CUTS AT THE FOOT: the four parts all stop somewhere different, and the
     differences are the whole eaves detail.

         beam       stops SHORT of the eaves datum corner, 18mm inboard on the
                    corner bisector with a vertical plumb cut - the real joinery
                    cut, so a cutting list length is a length somebody can order
         core       runs 42.5mm PAST the datum along the pitch, square cut,
                    landing on the eaves extrusion it is welded to, exactly as a
                    glaze bar core does
         blocking   OVERSAIL past the datum to the outer edge of the glass, level
         flashing   with the glaze bar cap ends. See OversailFoot: the timber
                    fillet and the lead over it have to see water off the roof
                    rather than deliver it into the corner of the frame, so they
                    run out to the edge of the roof and stop there.

   ---------------------------------------------------------------------------

   THE HIP SECTION ANGLE, AND WHY IT IS APPLIED AS A DELTA

   The hip blocking and hip flashing seat on the roof planes, so their seating
   faces are cut to the angle those planes make in the hip's NORMAL section. For
   a hipped roof of equal pitch the hips run at 45 degrees in plan whatever the
   rectangle's proportions, and that angle works out as

       atan( t / sqrt( (1 + t*t)^2 + 1 ) )      where t = tan(roof pitch)

   At 22.5 degrees that returns 15.045. The CAD standard is drawn at 15.709 -
   the workshop cuts the fillet a little flatter than pure geometry so the lead
   dresses over it without stretching.

   So the formula is never used as an absolute. It is used as a DELTA from the
   authored standard:

       applied  =  15.709  +  ( formula(pitch) - formula(22.5) )

   At 22.5 degrees nothing moves and the drawing office's number survives
   untouched; at any other pitch the section moves by the correct geometric
   increment. Same reference-and-delta discipline the base frame head beam
   re-slope already works to, and for the same reason: the exported asset is the
   authority on itself, and this module's job is to say how far it should travel.

   ============================================================================= */

// =============================================================================
// REGION | Hip Assembly Geometry Module
// =============================================================================

const VghLantern__Geometry__HipAssembly = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Numeric Guards and Fallbacks
    // ------------------------------------------------------------
    const DEG_TO_RAD           =  Math.PI / 180;
    const MIN_HIP_LENGTH_MM    =  1;                                         // <-- Below this a hip is degenerate
    const ROLE_HIP             =  'hip';

    // Mirror the hip system index. Used only if the loader is absent, which a
    // correctly ordered script load never allows.
    const FALLBACK_AUTHORED_PITCH_DEG    =  22.5;
    const FALLBACK_AUTHORED_SECTION_DEG  =  15.709;
    const FALLBACK_FACET_INSET_MM        =  67.5;
    const FALLBACK_PLUMB_INSET_MM        =  18;
    const FALLBACK_CORE_EXTENSION_MM     =  42.5;
    const FALLBACK_CAP_EXTENSION_MM      =  170;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loader Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Modules This One Reads From, if Present
    // ------------------------------------------------------------
    function VghLantern__HipAssembly__Loader() {
        return window.VghLantern__AppData__HipSystemLoader || null;
    }
    function VghLantern__HipAssembly__Stretch() {
        return window.VghLantern__Geometry__StretchTools || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Section Angle Reference (synchronous)
    // ------------------------------------------------------------
    function VghLantern__HipAssembly__AngleReference() {
        var loader     =  VghLantern__HipAssembly__Loader();
        var reference  =  loader ? loader.VghLantern__HipSystemLoader__SectionAngleReference() : null;

        return {
            AuthoredRoofPitchDegrees   : reference ? Number(reference.AuthoredRoofPitchDegrees)   : FALLBACK_AUTHORED_PITCH_DEG,
            AuthoredSectionAngleDegrees: reference ? Number(reference.AuthoredSectionAngleDegrees): FALLBACK_AUTHORED_SECTION_DEG
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Treatment Numbers (synchronous)
    // ------------------------------------------------------------
    // The core extension is read from the BASE FRAME system rather than from the
    // hip index, because it is the same weld to the same eaves extrusion the
    // glaze bar cores make. Restating it here would let the two drift apart the
    // first time somebody changed one of them.
    function VghLantern__HipAssembly__EndTreatments() {
        var loader  =  VghLantern__HipAssembly__Loader();
        var ends    =  loader ? loader.VghLantern__HipSystemLoader__EndTreatments() : null;

        var BaseFrame     =  window.VghLantern__Geometry__BaseFrameAssembly || null;
        var coreExtension =  FALLBACK_CORE_EXTENSION_MM;
        if (BaseFrame) {
            coreExtension  =  Number(BaseFrame.VghLantern__BaseFrameAssembly__EavesInterface().GlazeBarCoreExtensionAlongPitchMm)
                           || FALLBACK_CORE_EXTENSION_MM;
        }

        var capExtension  =  FALLBACK_CAP_EXTENSION_MM;
        if (BaseFrame) {
            capExtension  =  Number(BaseFrame.VghLantern__BaseFrameAssembly__EavesInterface().GlazeBarCapExtensionAlongPitchMm)
                          || FALLBACK_CAP_EXTENSION_MM;
        }

        return {
            BlockFacetInsetMm         : (ends && ends.RidgeEnd) ? Number(ends.RidgeEnd.BlockFacetInsetMm) : FALLBACK_FACET_INSET_MM,
            EavesPlumbCutInsetMm      : (ends && ends.EavesEnd) ? Number(ends.EavesEnd.PlumbCutInsetMm)   : FALLBACK_PLUMB_INSET_MM,
            CoreExtensionAlongPitchMm : coreExtension,
            CapExtensionAlongPitchMm  : capExtension
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Hip Section Angle
// -----------------------------------------------------------------------------

    // FUNCTION | The Roof Plane's Apparent Angle in the Hip's Normal Section
    // ------------------------------------------------------------
    // Derived rather than tabulated. Take the roof plane rising at pitch p, take
    // the hip as its intersection with the neighbouring plane, and take the
    // vector lying in the roof plane and perpendicular to the hip: it rises
    // tan(p) over a horizontal run of sqrt((1 + tan(p)^2)^2 + 1). The angle
    // between them is what a section cut square across the hip actually sees.
    //
    // Used ONLY as a difference against its own value at the authored pitch. On
    // its own it would overwrite a drawing office standard with a textbook.
    function VghLantern__HipAssembly__SectionAngleDegrees(pitchDegrees) {
        var t  =  Math.tan(Number(pitchDegrees) * DEG_TO_RAD);
        if (!isFinite(t) || t <= 0) return 0;

        var horizontalRun  =  Math.sqrt(((1 + (t * t)) * (1 + (t * t))) + 1);
        return Math.atan(t / horizontalRun) / DEG_TO_RAD;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Angle a Hip Section Should Now Be Cut At
    // ------------------------------------------------------------
    function VghLantern__HipAssembly__AppliedSectionAngleDegrees(pitchDegrees) {
        var reference  =  VghLantern__HipAssembly__AngleReference();

        var atPitch     =  VghLantern__HipAssembly__SectionAngleDegrees(pitchDegrees);
        var atAuthored  =  VghLantern__HipAssembly__SectionAngleDegrees(reference.AuthoredRoofPitchDegrees);

        return reference.AuthoredSectionAngleDegrees + (atPitch - atAuthored);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Transforms
// -----------------------------------------------------------------------------

    // FUNCTION | Transform Every Resolved Part's Section for a Roof
    // ------------------------------------------------------------
    // options:
    //     PitchDegrees   the roof pitch, converted here to a hip section angle
    //     BeamDeltaMm    the hip beam stretch, signed along section +y and
    //                    negative for a deeper beam
    //
    // Returns a NEW part list; the loader's memoised faces are never written
    // through. A part with nothing to do passes its faces by reference, so a
    // build at 22.5 degrees with no override allocates nothing.
    function VghLantern__HipAssembly__SectionsForPitch(parts, options) {
        if (!Array.isArray(parts)) return [];

        var Stretch  =  VghLantern__HipAssembly__Stretch();
        if (!Stretch) {
            console.error('[VghLantern__HipAssembly] StretchTools is not loaded - sections drawn as authored.');
            return parts;
        }

        var pitch      =  Number(options && options.PitchDegrees) || FALLBACK_AUTHORED_PITCH_DEG;
        var beamDelta  =  Number(options && options.BeamDeltaMm)  || 0;
        var applied    =  VghLantern__HipAssembly__AppliedSectionAngleDegrees(pitch);

        var out  =  [];
        var i, part, faces, moves;

        for (i = 0; i < parts.length; i++) {
            part   =  parts[i];
            faces  =  part.Faces;

            if (part.DepthStretch && beamDelta !== 0) {
                faces  =  Stretch.VghLantern__StretchTools__StretchFaces2d(faces, {
                    Axis       : part.DepthStretch.StretchAxis || 'y',
                    SplitValue : Number(part.DepthStretch.SplitYMm),
                    Side       : part.DepthStretch.StretchSide || 'below',
                    DeltaMm    : beamDelta
                });
            }

            if (part.PitchAdaptation) {
                moves  =  Stretch.VghLantern__StretchTools__BuildPitchMoveMap(part.PitchAdaptation, applied);
                if (moves.length > 0) faces  =  Stretch.VghLantern__StretchTools__ApplyMoveMap2d(faces, moves);
            }

            out.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                ElementRole      : part.ElementRole,
                SpecMaterial     : part.SpecMaterial,
                FinishPalette    : part.FinishPalette,
                FinishSource     : part.FinishSource,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                Faces            : faces
            });
        }

        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hip Resolution From a Solved Skeleton
// -----------------------------------------------------------------------------

    // FUNCTION | Every Hip Member of a Solved Skeleton
    // ------------------------------------------------------------
    // Each runs from an eaves datum corner (Start) up to a ridge end point or the
    // pyramid apex (End), which is the hip construction triangle the setting out
    // view draws and the line every hip section is authored about.
    function VghLantern__HipAssembly__HipMembers(skeleton) {
        var members  =  (skeleton && skeleton.Members) || [];
        var hips     =  [];
        var i, member, length;

        for (i = 0; i < members.length; i++) {
            member  =  members[i];
            if (!member || member.Role !== ROLE_HIP) continue;

            length  =  Math.hypot(member.End.x - member.Start.x,
                                  member.End.y - member.Start.y,
                                  member.End.z - member.Start.z);
            if (length < MIN_HIP_LENGTH_MM) continue;

            hips.push(member);
        }
        return hips;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Plan Direction a Hip Runs In, Foot to Head
    // ------------------------------------------------------------
    function VghLantern__HipAssembly__PlanDirection(hip) {
        var dx   =  hip.End.x - hip.Start.x;
        var dy   =  hip.End.y - hip.Start.y;
        var len  =  Math.hypot(dx, dy);
        if (len <= 0) return { x : 1, y : 0 };

        return { x : dx / len, y : dy / len };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | End Treatments
// -----------------------------------------------------------------------------

    // FUNCTION | The Two Plumb Cut Planes One Hip Beam Takes
    // ------------------------------------------------------------
    // Returns { Start, End }, each { Point:{x,y,z}, Normal:{x,y,z} } in model mm.
    // Both are vertical planes with a horizontal normal along the hip's plan
    // direction - which on a square corner is the 45 degree corner bisector, and
    // is also the outward normal of the block facet at the other end. One
    // direction, both cuts.
    //
    //     Start  the eaves foot, cut 18mm horizontally inboard of the datum
    //            corner. Same 18mm the glaze bar trim takes, and for the same
    //            reason: it is the real joinery cut, so the cutting list length
    //            is the length of a piece somebody can actually order.
    //     End    the head, cut on the octagonal block facet 67.5mm from the
    //            block centre.
    //
    // A hip climbs, so neither cut is square across the member. That is exactly
    // what makes them plumb cuts and why the extruder is given planes rather than
    // shortened end points.
    function VghLantern__HipAssembly__BeamEndPlanes(hip) {
        if (!hip) return null;

        var direction  =  VghLantern__HipAssembly__PlanDirection(hip);
        var ends       =  VghLantern__HipAssembly__EndTreatments();

        return {
            Start : {
                Point  : { x : hip.Start.x + (direction.x * ends.EavesPlumbCutInsetMm),
                           y : hip.Start.y + (direction.y * ends.EavesPlumbCutInsetMm),
                           z : hip.Start.z },
                Normal : { x : direction.x, y : direction.y, z : 0 }
            },
            End : {
                Point  : { x : hip.End.x - (direction.x * ends.BlockFacetInsetMm),
                           y : hip.End.y - (direction.y * ends.BlockFacetInsetMm),
                           z : hip.End.z },
                Normal : { x : direction.x, y : direction.y, z : 0 }
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Extended Foot the Hip Core Is Welded On
    // ------------------------------------------------------------
    // The core carries on past the eaves datum, down the pitch, and lands on the
    // eaves extrusion it is welded to - the same 42.5mm along the pitch the glaze
    // bar core takes, measured along the hip's OWN slope rather than the common
    // rafter's, because that is the member being extended.
    function VghLantern__HipAssembly__ExtendedCoreFoot(hip) {
        if (!hip) return null;

        var dx   =  hip.Start.x - hip.End.x;
        var dy   =  hip.Start.y - hip.End.y;
        var dz   =  hip.Start.z - hip.End.z;
        var len  =  Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        if (len <= 0) return null;

        var scale  =  VghLantern__HipAssembly__EndTreatments().CoreExtensionAlongPitchMm / len;

        return {
            x : hip.Start.x + (dx * scale),
            y : hip.Start.y + (dy * scale),
            z : hip.Start.z + (dz * scale)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Oversailing Foot the Hip Covering Runs Out To
    // ------------------------------------------------------------
    // The timber fillet and the lead over it do not stop on the eaves datum. They
    // carry on past it and die at the OUTER EDGE OF THE GLASS, because the
    // weathering has to see water off the roof rather than deliver it into the
    // corner of the frame.
    //
    // The construction is a slide down the hip's own axis until the level drops
    // by the glaze bar cap extension times sin(pitch) - that is, until the foot
    // reaches the level the cap ends sit at. Nothing about the distance is
    // authored: it falls out of the roof, and it LENGTHENS as the pitch flattens,
    // because the same vertical drop takes longer to reach along a shallower hip.
    // At 22.5 degrees it is 231.4mm; at 10 it is 238.6 and at 45 it is 208.2.
    //
    // WHY THIS LANDS EXACTLY ON THE GLASS
    // The glazing builder extends each pane's eaves corner along that corner's own
    // upslope boundary edge - which at a hip corner IS the hip - scaled so the
    // slide's down-slope component equals the same cap extension. Sliding to the
    // cap-end LEVEL and sliding until the down-slope component equals the
    // extension are the same construction written two ways, and they agree to the
    // last decimal at every pitch. So the covering finishes on the glass corner
    // rather than near it, which is the whole point of the oversail.
    //
    // Returns null when the hip is level or the pitch is unusable, in which case
    // the caller leaves the part on the datum rather than guessing.
    function VghLantern__HipAssembly__OversailFoot(hip, pitchDegrees) {
        if (!hip) return null;

        var pitch  =  Number(pitchDegrees);
        if (!isFinite(pitch) || pitch <= 0) return null;

        var extension  =  VghLantern__HipAssembly__EndTreatments().CapExtensionAlongPitchMm;
        if (!(extension > 0)) return null;

        var targetDropMm  =  extension * Math.sin(pitch * DEG_TO_RAD);
        var hipDropMm     =  hip.End.z - hip.Start.z;                          // <-- Start is the eaves foot, End the ridge head
        if (!(hipDropMm > 0)) return null;                                     // <-- A level hip has no axis to slide down

        var scale  =  targetDropMm / hipDropMm;                                // <-- As a fraction of the member, so the slide follows the hip exactly

        return {
            x : hip.Start.x + ((hip.Start.x - hip.End.x) * scale),
            y : hip.Start.y + ((hip.Start.y - hip.End.y) * scale),
            z : hip.Start.z + ((hip.Start.z - hip.End.z) * scale)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Run and End Planes One Named Part Takes Along One Hip
    // ------------------------------------------------------------
    // Returns { StartMm, EndMm, Planes }, in the shape the glaze bar composite
    // already answers eaves treatments in, so the mesh builder holds one loop
    // over parts and one over hips and no per-part branching at all.
    //
    //     beam        runs the datum line, plumb cut at both ends
    //     core        runs 42.5mm past the eaves datum, square cut, landing on
    //                 the eaves extrusion it is welded to
    //     blocking    OVERSAIL past the eaves datum to the outer edge of the
    //     flashing    glass, square cut, level with the glaze bar cap ends
    //
    // All four run up to the ridge end point at their head; only the beam is cut
    // back there, on the octagonal block facet.
    //
    // pitchDegrees is the roof pitch, needed only by the two oversailing parts. A
    // caller that omits it gets the datum foot, which is the pre-oversail
    // behaviour rather than a wrong one.
    function VghLantern__HipAssembly__RunForPart(partKey, hip, pitchDegrees) {
        var untouched  =  { StartMm : hip.Start, EndMm : hip.End, Planes : null };

        if (partKey === 'beam') {
            return { StartMm : hip.Start, EndMm : hip.End, Planes : VghLantern__HipAssembly__BeamEndPlanes(hip) };
        }

        if (partKey === 'core') {
            var coreFoot  =  VghLantern__HipAssembly__ExtendedCoreFoot(hip);
            if (!coreFoot) return untouched;
            return { StartMm : coreFoot, EndMm : hip.End, Planes : null };
        }

        if (partKey === 'blocking' || partKey === 'flashing') {
            var oversail  =  VghLantern__HipAssembly__OversailFoot(hip, pitchDegrees);
            if (!oversail) return untouched;
            return { StartMm : oversail, EndMm : hip.End, Planes : null };
        }

        return untouched;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far the Covering Oversails, as a Scalar
    // ------------------------------------------------------------
    // The same distance RunForPart applies, answered as a length so the takeoff
    // can add it to a cutting list without rebuilding the point. Zero when the
    // hip or the pitch cannot support the slide.
    function VghLantern__HipAssembly__OversailLengthMm(hip, pitchDegrees) {
        var foot  =  VghLantern__HipAssembly__OversailFoot(hip, pitchDegrees);
        if (!foot) return 0;

        return Math.sqrt(((foot.x - hip.Start.x) * (foot.x - hip.Start.x))
                       + ((foot.y - hip.Start.y) * (foot.y - hip.Start.y))
                       + ((foot.z - hip.Start.z) * (foot.z - hip.Start.z)));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__HipAssembly__SectionAngleDegrees         : VghLantern__HipAssembly__SectionAngleDegrees,
        VghLantern__HipAssembly__AppliedSectionAngleDegrees  : VghLantern__HipAssembly__AppliedSectionAngleDegrees,
        VghLantern__HipAssembly__AngleReference              : VghLantern__HipAssembly__AngleReference,
        VghLantern__HipAssembly__EndTreatments               : VghLantern__HipAssembly__EndTreatments,
        VghLantern__HipAssembly__SectionsForPitch            : VghLantern__HipAssembly__SectionsForPitch,
        VghLantern__HipAssembly__HipMembers                  : VghLantern__HipAssembly__HipMembers,
        VghLantern__HipAssembly__PlanDirection               : VghLantern__HipAssembly__PlanDirection,
        VghLantern__HipAssembly__BeamEndPlanes               : VghLantern__HipAssembly__BeamEndPlanes,
        VghLantern__HipAssembly__ExtendedCoreFoot            : VghLantern__HipAssembly__ExtendedCoreFoot,
        VghLantern__HipAssembly__OversailFoot                : VghLantern__HipAssembly__OversailFoot,
        VghLantern__HipAssembly__OversailLengthMm            : VghLantern__HipAssembly__OversailLengthMm,
        VghLantern__HipAssembly__RunForPart                  : VghLantern__HipAssembly__RunForPart
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__HipAssembly  =  VghLantern__Geometry__HipAssembly;
