/* =============================================================================
   VGHLANTERN - GLAZE BAR ASSEMBLY GEOMETRY
   =============================================================================

   FILE       : VghLantern__Geometry__GlazeBarAssembly__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - GlazeBarAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Where the decorative cap on the end of a glaze bar sits
   CREATED    : 21-Aug-2026

   DESCRIPTION:
   - The glaze bar layout says WHERE THE BARS RUN. This module says where the
     things fixed to the end of one go, in millimetre space, so the 3D viewport,
     the projected drawings and the SketchUp exporter all place them from one
     answer rather than three.
   - Contains no DOM access and no fetches, and nothing it is handed is mutated.

   ---------------------------------------------------------------------------

   THE END CAP

   45_1001 closes the cut end of the glaze bar CAP at the eaves - the bare
   extrusion section that is otherwise left on show at the bottom of every bar -
   and is welded to 45_2021. One per bar that HAS an eaves end; a bar running
   ridge to hip has none and takes none, which the layout already answers by
   publishing EavesEnd as null.

   THE ANCHOR is the station the cap extrusion itself ends at, which is the bar's
   eaves point run on along the pitch by the cap's own eaves extension. That is
   the same number the composite builder extends the cap by, read from the same
   place, so the two cannot end up in different spots.

   THE SEATING is section y 36.908 - the BASE of the cap section, which 45_2021
   declares as its own SectionMinYMm. The asset is authored from that plane
   upwards: its 26.5mm shield covers the cap's 20.792mm height and its return lip
   passes just clear of the cap apex at 57.7.

   THE FRAME is published as three unit vectors rather than as angles, because a
   glaze bar is turned in plan AND tilted to its slope, and two angles applied in
   an order nobody wrote down is how a part ends up mirrored:

       Along    runs down the bar towards the eaves
       Across   runs across the bar
       Up       runs out through the roof

   They are built exactly as the section sweep builds its own basis, so the cap
   lands in the frame the extrusion it caps was swept in.

   HOW THE ASSET IS TURNED WITHIN THAT FRAME IS DECLARED IN THE INDEX, as three
   angles in degrees: RotationDegrees.LocalX, LocalY and LocalZ, applied in that
   order and named for the asset's OWN axes rather than for the bar's, because the
   part is what somebody is looking at when they reach for the number. An asset's authored orientation is a fact about the SketchUp file
   it came out of, and a mesh builder cannot work it out - it can only be told.
   Told in data, correcting it is a number in a JSON file; told in code, it is a
   round trip through three modules.

   ANGLES RATHER THAN AN AXIS MAPPING, deliberately. A mapping is exact but it is
   not something anybody can nudge: reading a render and deciding whether the fix
   is '-Across' or 'Up' is a puzzle, where reading one and deciding to try another
   ninety degrees is not. Angles also cannot express a mirror, so a whole class of
   inverted-normal fault is simply unreachable.

   At 0, 0, 0 the asset sits exactly as authored: its own X down the bar, its Y
   across it, its Z out through the roof. Each angle turns it about one of those
   REST axes rather than about wherever the previous turn left it, so one number
   always means the same thing however the other two are set - which is the whole
   reason these are adjustable by eye. The placement publishes the resulting
   AxisX, AxisY and AxisZ for a renderer to drop straight into a rotation matrix.

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bar Assembly Geometry Module
// =============================================================================

const VghLantern__Geometry__GlazeBarAssembly = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Numeric Guards and Fallbacks
    // ------------------------------------------------------------
    const VERTICAL_DOT_LIMIT  =  0.999;                                      // <-- Above this a bar is effectively vertical
    const MIN_BAR_LENGTH_MM   =  0.5;                                        // <-- Below this a bar is degenerate

    // Mirror the glaze bar system index. Used only if the loader is absent, which
    // a correctly ordered script load never allows.
    const FALLBACK_SEAT_SECTION_Y_MM  =  36.908;
    const FALLBACK_END_CAP_ASSET_ID   =  '45_1001';

    const DEG_TO_RAD  =  Math.PI / 180;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loader Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Modules This One Reads From, if Present
    // ------------------------------------------------------------
    function VghLantern__GlazeBarAssembly__Loader() {
        return window.VghLantern__AppData__GlazeBarSystemLoader || null;
    }
    function VghLantern__GlazeBarAssembly__BaseFrame() {
        return window.VghLantern__Geometry__BaseFrameAssembly || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Cap Relationship Numbers (synchronous)
    // ------------------------------------------------------------
    // Answered from the system index so this module stays synchronous and needs
    // no asset fetch to reason about where the cap sits, exactly as the ridge
    // assembly reads its own block and end cap relationships.
    function VghLantern__GlazeBarAssembly__EndCapGeometry() {
        var loader  =  VghLantern__GlazeBarAssembly__Loader();
        var cap     =  loader ? loader.VghLantern__GlazeBarSystemLoader__EndCapRelationship() : null;

        return {
            AssetId           : cap ? (cap.AssetId || FALLBACK_END_CAP_ASSET_ID) : FALLBACK_END_CAP_ASSET_ID,
            PartName          : cap ? (cap.PartName || 'Glaze Bar End Cap')      : 'Glaze Bar End Cap',
            SeatSectionYMm    : cap && isFinite(Number(cap.SeatSectionYMm))
                                    ? Number(cap.SeatSectionYMm) : FALLBACK_SEAT_SECTION_Y_MM,
            RotationDegrees   : VghLantern__GlazeBarAssembly__RotationOf(cap),
            AlongBarOffsetMm  : cap && isFinite(Number(cap.AlongBarOffsetMm)) ? Number(cap.AlongBarOffsetMm) : 0,
            ElementType       : cap ? (cap.ElementType  || 'Trim')       : 'Trim',
            ElementRole       : cap ? (cap.ElementRole  || 'Decoration') : 'Decoration',
            SpecMaterial      : cap ? (cap.SpecMaterial || 'Powder Coated Aluminium') : 'Powder Coated Aluminium'
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bar Frame
// -----------------------------------------------------------------------------

    // FUNCTION | The Orientation Basis of One Bar, in Model Millimetres
    // ------------------------------------------------------------
    // The same construction Env3d's SectionSolid MemberBasis uses, written here
    // in MODEL space where +z is up rather than in world space where +y is. World
    // up projected perpendicular to the member is what makes a common rafter, a
    // hip and a level ridge all read correctly without any of them being a special
    // case: on a sloping bar that projection is the slope normal, which is exactly
    // where a cap has to point.
    //
    // fromPoint to toPoint sets which way Along runs. Callers pass the INBOARD end
    // first and the eaves end second, so Along runs down the roof.
    function VghLantern__GlazeBarAssembly__Basis(fromPoint, toPoint) {
        var dx   =  toPoint.x - fromPoint.x;
        var dy   =  toPoint.y - fromPoint.y;
        var dz   =  toPoint.z - fromPoint.z;
        var len  =  Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        if (len < MIN_BAR_LENGTH_MM) return null;

        var along  =  { x : dx / len, y : dy / len, z : dz / len };

        // A bar this steep has nothing useful to cross world up with, so the model
        // depth axis stands in - the same fallback the 3D basis takes.
        var reference  =  Math.abs(along.z) > VERTICAL_DOT_LIMIT
            ? { x : 0, y : -1, z : 0 }
            : { x : 0, y :  0, z : 1 };

        var across  =  VghLantern__GlazeBarAssembly__Normalise(
            VghLantern__GlazeBarAssembly__Cross(reference, along));
        if (!across) return null;

        var up  =  VghLantern__GlazeBarAssembly__Normalise(
            VghLantern__GlazeBarAssembly__Cross(along, across));
        if (!up) return null;

        return { Along : along, Across : across, Up : up };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Three Declared Angles, in Degrees
    // ------------------------------------------------------------
    // All three default to zero, which places the asset exactly as authored. A
    // missing block is therefore not an error, it is 'do not turn it'.
    function VghLantern__GlazeBarAssembly__RotationOf(cap) {
        var block  =  (cap && cap.RotationDegrees) ? cap.RotationDegrees : {};

        return {
            LocalX : Number(block.LocalX) || 0,
            LocalY : Number(block.LocalY) || 0,
            LocalZ : Number(block.LocalZ) || 0
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn the Asset Within a Bar's Frame
    // ------------------------------------------------------------
    // Starts the asset square to the bar - its own X down the bar, Y across it,
    // Z out through the roof - then applies LocalX, LocalY and LocalZ in that order.
    //
    // ABOUT THE REST AXES, NOT THE PART'S CURRENT ONES. Turning about wherever the
    // previous angle left the part means each number changes what the next one does,
    // so nudging one moves the part in a way that depends on the other two. Turning
    // about the rest frame means a number always means the same thing, which is what
    // makes these adjustable by eye at all. At rest those axes ARE the bar's, which
    // is why the basis directions appear below.
    //
    // Rotations cannot mirror, so unlike an axis mapping this cannot produce an
    // inverted part however the numbers are set. The result is always right
    // handed and there is nothing to validate.
    function VghLantern__GlazeBarAssembly__ResolveRotation(rotation, basis) {
        var axes  =  {
            AxisX : basis.Along,
            AxisY : basis.Across,
            AxisZ : basis.Up
        };

        axes  =  VghLantern__GlazeBarAssembly__TurnAbout(axes, basis.Along,  rotation.LocalX);
        axes  =  VghLantern__GlazeBarAssembly__TurnAbout(axes, basis.Across, rotation.LocalY);
        axes  =  VghLantern__GlazeBarAssembly__TurnAbout(axes, basis.Up,     rotation.LocalZ);

        return axes;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Turn All Three Axes About One Direction
    // ------------------------------------------------------------
    function VghLantern__GlazeBarAssembly__TurnAbout(axes, axis, degrees) {
        if (!degrees) return axes;

        return {
            AxisX : VghLantern__GlazeBarAssembly__Rotate(axes.AxisX, axis, degrees),
            AxisY : VghLantern__GlazeBarAssembly__Rotate(axes.AxisY, axis, degrees),
            AxisZ : VghLantern__GlazeBarAssembly__Rotate(axes.AxisZ, axis, degrees)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rodrigues Rotation of One Vector About a Unit Axis
    // ------------------------------------------------------------
    // Positive is anticlockwise looking back down the axis towards the part, which
    // is the ordinary right hand rule. Exact multiples of a quarter turn are
    // snapped, so 90 gives a clean zero rather than 6.1e-17 and a placement that
    // should be square reads as square in a debugger.
    function VghLantern__GlazeBarAssembly__Rotate(v, axis, degrees) {
        var radians  =  degrees * DEG_TO_RAD;
        var cos      =  VghLantern__GlazeBarAssembly__Snap(Math.cos(radians));
        var sin      =  VghLantern__GlazeBarAssembly__Snap(Math.sin(radians));

        var cross  =  VghLantern__GlazeBarAssembly__Cross(axis, v);
        var dot    =  (axis.x * v.x) + (axis.y * v.y) + (axis.z * v.z);
        var blend  =  dot * (1 - cos);

        return {
            x : (v.x * cos) + (cross.x * sin) + (axis.x * blend),
            y : (v.y * cos) + (cross.y * sin) + (axis.y * blend),
            z : (v.z * cos) + (cross.z * sin) + (axis.z * blend)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Snap a Trigonometric Value That Should Be Exact
    // ------------------------------------------------------------
    function VghLantern__GlazeBarAssembly__Snap(value) {
        if (Math.abs(value)     < 1e-12) return 0;
        if (Math.abs(value - 1) < 1e-12) return 1;
        if (Math.abs(value + 1) < 1e-12) return -1;
        return value;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cross Product
    // ------------------------------------------------------------
    function VghLantern__GlazeBarAssembly__Cross(a, b) {
        return {
            x : (a.y * b.z) - (a.z * b.y),
            y : (a.z * b.x) - (a.x * b.z),
            z : (a.x * b.y) - (a.y * b.x)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise, or Null on a Degenerate Vector
    // ------------------------------------------------------------
    function VghLantern__GlazeBarAssembly__Normalise(v) {
        var len  =  Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
        if (!(len > 0)) return null;
        return { x : v.x / len, y : v.y / len, z : v.z / len };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | End Cap Placement
// -----------------------------------------------------------------------------

    // FUNCTION | Where Every Glaze Bar End Cap Sits
    // ------------------------------------------------------------
    // One placement per bar with an eaves end. Each carries the point its origin
    // goes on and the three unit vectors its local axes map onto:
    //
    //     { Id, BarId, SlopeKey, Point, Along, Across, Up }
    //
    // A bar with no eaves end - one running ridge to hip - yields nothing, and a
    // bar whose eaves extension cannot be resolved yields nothing rather than a
    // guess, so a cap never appears at a station the extrusion does not reach.
    //
    // THE SEAT is applied along Up, not along world z. The cap sits on the base
    // plane of the cap SECTION, and that plane tilts with the bar; measuring it
    // vertically would leave every cap on a sloping bar sitting proud on one side.
    function VghLantern__GlazeBarAssembly__EndCapPlacements(barSet, lantern) {
        var bars  =  (barSet && Array.isArray(barSet.Bars)) ? barSet.Bars : [];
        if (bars.length === 0) return [];

        var BaseFrame  =  VghLantern__GlazeBarAssembly__BaseFrame();
        if (!BaseFrame) {
            console.error('[VghLantern__GlazeBarAssembly] BaseFrameAssembly is not loaded - no end cap placed.');
            return [];
        }

        var relationship  =  VghLantern__GlazeBarAssembly__EndCapGeometry();
        var extensionMm   =  VghLantern__GlazeBarAssembly__CapExtensionMm(lantern);
        if (extensionMm === null) return [];

        var placements  =  [];
        var i, bar, extended, inboard, basis, axes, seat, point;

        for (i = 0; i < bars.length; i++) {
            bar  =  bars[i];
            if (!bar || (bar.EavesEnd !== 'start' && bar.EavesEnd !== 'end')) continue;

            // THE STATION | The bar's eaves point run on by the cap's own eaves
            // extension, which is where the cap extrusion is cut. The declared
            // offset is added to the same extension so a weld gap is one number in
            // the index rather than a second call with a different distance.
            extended  =  BaseFrame.VghLantern__BaseFrameAssembly__ExtendedEavesPoint(
                bar, undefined, extensionMm + relationship.AlongBarOffsetMm);
            if (!extended) continue;

            inboard  =  extended.EndKey === 'start' ? bar.End : bar.Start;
            basis    =  VghLantern__GlazeBarAssembly__Basis(inboard, extended.Point);
            if (!basis) continue;

            seat   =  relationship.SeatSectionYMm;
            point  =  {
                x : extended.Point.x + (basis.Up.x * seat),
                y : extended.Point.y + (basis.Up.y * seat),
                z : extended.Point.z + (basis.Up.z * seat)
            };

            axes  =  VghLantern__GlazeBarAssembly__ResolveRotation(relationship.RotationDegrees, basis);

            placements.push({
                Id       : 'glazeBarEndCap__' + (bar.Id || String(i)),
                BarId    : bar.Id || '',
                Role     : bar.Role || '',
                SlopeKey : bar.SlopeKey || '',
                Point    : point,

                // The asset's own axes after the declared turn. A renderer drops
                // these three straight into a rotation matrix and is done.
                AxisX    : axes.AxisX,
                AxisY    : axes.AxisY,
                AxisZ    : axes.AxisZ,

                // The bar's frame, kept alongside so a caller reasoning about the
                // BAR rather than about the part does not have to unpick the map.
                Along    : basis.Along,
                Across   : basis.Across,
                Up       : basis.Up
            });
        }

        return placements;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Far the Cap Extrusion Runs Past the Eaves Datum
    // ------------------------------------------------------------
    // Read from the base frame's eaves interface, which is the same source the
    // composite builder extends the cap by. Null when the interface is not
    // available, which stops a cap being placed at a station nothing else agrees
    // with rather than placing it at the datum and letting it float.
    function VghLantern__GlazeBarAssembly__CapExtensionMm(lantern) {
        var BaseFrame  =  VghLantern__GlazeBarAssembly__BaseFrame();
        if (!BaseFrame) return null;

        var iface  =  BaseFrame.VghLantern__BaseFrameAssembly__EavesInterface(lantern);
        var value  =  iface ? Number(iface.GlazeBarCapExtensionAlongPitchMm) : NaN;

        if (!isFinite(value)) {
            console.error('[VghLantern__GlazeBarAssembly] The eaves interface declares no glaze bar cap '
                + 'extension - no end cap placed.');
            return null;
        }
        return value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__GlazeBarAssembly__EndCapGeometry    : VghLantern__GlazeBarAssembly__EndCapGeometry,
        VghLantern__GlazeBarAssembly__ResolveRotation   : VghLantern__GlazeBarAssembly__ResolveRotation,
        VghLantern__GlazeBarAssembly__EndCapPlacements  : VghLantern__GlazeBarAssembly__EndCapPlacements,
        VghLantern__GlazeBarAssembly__Basis             : VghLantern__GlazeBarAssembly__Basis
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__GlazeBarAssembly  =  VghLantern__Geometry__GlazeBarAssembly;
