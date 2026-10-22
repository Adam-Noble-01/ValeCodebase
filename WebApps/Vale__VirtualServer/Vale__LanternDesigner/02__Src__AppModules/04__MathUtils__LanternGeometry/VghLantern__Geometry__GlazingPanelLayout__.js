/* =============================================================================
   VGHLANTERN - GLAZING PANEL LAYOUT
   =============================================================================

   FILE       : VghLantern__Geometry__GlazingPanelLayout__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - GlazingPanelLayout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Cut every roof slope into the glazed panels that sit between its bars and hips
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - The one place a lantern's glass is divided into panels. The 3D viewport, the
     projected drawings and the SketchUp export all build their glass from this
     answer, and the glazing schedule will list it, so the panel the glazing
     department cuts is the panel every picture shows.
   - Consumes the SolvedSkeleton (the slopes, the hips and the ridge) and the
     GlazeBarSet (the bars and any transom) and returns pure millimetre data.
     No DOM, no config reads, no state, and nothing it is handed is mutated.
   - The numbers it cuts with come from the system indexes, through their
     loaders, synchronously: the glass build-up and the 3mm clearance from the
     glaze bar index, each core's web from its own index, the eaves glass stop
     from the base frame index. It never measures an asset itself.

   ---------------------------------------------------------------------------

   WHY THE GLASS IS PANELS

   Until v0.9.0 each slope was ONE slab of glass, running straight through every
   bar web, the hip and ridge cores and the eaves extrusion upstand. Adam
   (20-Oct-2026): "we need to make sure each pane is panelised to sit between the
   glaze bars and hips", because the specification's glazing section is to give
   each panel a code (RU01, RU02 ...: GZ until Adam made RU, Roof glazing Unit,
   the standard on 20-Oct-2026) on a plan, and a table of cut sizes and cut angles
   the glazing department can make the units from.

   ---------------------------------------------------------------------------

   HOW A SLOPE IS CUT

   Each slope is worked in its own flat frame, the GLASS PLANE - the plane of the
   glaze bar datum, which the solver's face already lies in:

       x   along the eaves, to the right of somebody standing outside the roof
           looking at the slope
       y   up the slope, in the plane, from the eaves datum line (y = 0)

   Every member that bounds glass is a straight line in that frame. A bar or a
   hip end leg runs square to its eaves (constant x), a transom runs level
   (constant y), and the hips and the ridge are the slope's own edges. A panel is
   the slope between two neighbouring bars - or a bar and a hip, the triangular
   end piece - with every bounding line moved off its member by that member's
   CLEARANCE. Each cut is a half plane and the slope is convex, so every panel is
   a convex polygon however the bars fall: there is no special case for a
   pyramid, for a Mode02 pane straddling the end block, or for a pane a transom
   cuts in two.

   ---------------------------------------------------------------------------

   THE CLEARANCE - "| Rafter | 3mm | Glazing | 3mm | Rafter |"

   Adam (20-Oct-2026): "use a 3mm each side tolerance". The 3mm is measured from
   the upright WEB of the member's aluminium core - the part that actually stands
   between two panes inside the glass - along the glass and square to the panel
   edge. Adam chose the web over the outside of the cap: the glass beds on the
   core's glazing leg and is held under the cap, so it has to run under the cap.

   The GLASS BAND is the slab of space the unit fills: from its bedding face,
   BeddingOffsetMm above the datum, to its outer face, UnitThicknessMm further
   out. A glaze bar's section stands square to the glass, so the bar's web is met
   square and the clearance is simply web half width plus 3. A hip and the ridge
   do not: their sections are cut in the plane normal to their own line with
   their up axis taken from the world rather than from the slope, so their webs
   run through the glass band on the skew, and the corner of the glass that
   reaches furthest towards the web is a corner of the band:

       reach  =  ( W - beta x s ) / c       beta = the band face that maximises it
       c      =  Across . intoPanel         s    = Across . slopeNormal
       W      =  the web half width, on the panel's side of the member

   Across is the member's own section x axis from
   VghLantern__Geometry__GlazeBarAssembly Basis - the frame the 3D sweep and the
   SketchUp sweep are both built in - so the glass clears each member exactly as
   that member is modelled. For a glaze bar c = 1 and s = 0 and the formula is the
   web half width. At 22.5 degrees it gives 3.18mm for the ridge core and 3.98mm
   for the hip core (both 12mm webs), so those glass edges sit 6.18mm and 6.98mm
   off the ridge and hip lines.

   A TRANSOM is swept with its section standing upright rather than square to
   the slope (the sweep's world-up rule for a level member), so this module sees
   its web on the skew and clears it by different amounts above and below. That
   is the transom as modelled; if a transom is meant to sit square to the roof
   like a bar, it is the sweep's basis that changes, and the glass follows.

   ---------------------------------------------------------------------------

   THE EAVES - THE STEPPED EDGE

   The eaves extrusion 46_1002 carries an upstand inside the glass band, its inner
   face GlassStopAlongPitchMm (42.875) down the pitch from the eaves datum. The
   unit's full thickness stops the clearance short of it. Only the TOP PANE runs
   on, over the upstand, out to the glaze bar cap ends (170mm) - the stepped edge
   in Adam's section sketch of 20-Oct-2026 ("the top pane of glass oversails the
   eaves trim"). So every panel publishes two outlines:

       Outline       the unit at full thickness, stopping at the upstand
       OuterOutline  the top pane: the same panel run on to the cap ends

   and the strip between them, LipOutline, is the oversail. The top pane's
   thickness is PROVISIONAL until Adam's panel design diagram; it is a number in
   the glaze bar index, not here. The hip covering still lands on the glass
   corner, because the top pane still reaches the cap end level it was built to.

   ---------------------------------------------------------------------------

   PANEL TYPES AND THEIR CODES

   Two panels are one TYPE when both their outlines match corner for corner within
   half a millimetre once one is slid onto the other, eaves at the bottom. Panels
   are HANDED - a pane and its mirror image are two types (Adam, 20-Oct-2026) -
   because a sealed unit with a stepped edge or a coated face cannot be turned
   over. Types are numbered largest first, RU01 the biggest, the way the cutting
   list numbers its T codes longest first, and every panel carries its type's
   code. Codes are per lantern, as T codes are.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - GlazingPanelSet:

   {
       Meta : {
           PanelCount, TypeCount,
           BeddingOffsetMm, UnitThicknessMm, OuterPaneThicknessMm, OuterPaneOversails,
           EdgeClearanceMm, UnitEavesExtensionMm, OuterEavesExtensionMm,
           WebHalfWidthsMm : { GlazeBar, Hip, Ridge }
       },
       Panels : [ {
           Id, Code, TypeIndex, TypeQuantity,
           FaceId, SlopeKey, Side, PitchDegrees, StripIndex, RowIndex, Ordinal,
           Normal         model unit vector, out through the roof
           Frame          { Origin, AxisX, AxisY } - the glass plane frame, model mm
           Outline2d, OuterOutline2d, LipOutline2d     glass plane mm
           Outline3d, OuterOutline3d, LipOutline3d     model mm, ON the glaze bar datum plane
           Edges          [ { Kind, LengthMm } ] - one per OuterOutline2d edge, starting
                          at its first corner; Kind bar | transom | hip | ridge | eaves
           WidthMm, LengthMm, AreaSqMm                  the top pane (OuterOutline)
           UnitWidthMm, UnitLengthMm, UnitAreaSqMm      the unit at full thickness
           CornerAnglesDegrees                          interior angles of OuterOutline2d
       } ],
       Types : [ { Code, TypeIndex, Quantity, PanelIds, Outline2d, OuterOutline2d,
                   Edges, WidthMm, LengthMm, AreaSqMm, UnitWidthMm, UnitLengthMm,
                   UnitAreaSqMm, CornerAnglesDegrees } ],
       Warnings : []
   }

   Every outline is wound anticlockwise seen from outside the roof, which is
   outward for a fan across it. Lip outlines are empty when the top pane does not
   oversail. Type outlines are slid so their outer outline starts at 0,0.

   A renderer lifts the 3D outlines along Normal: the unit spans BeddingOffsetMm to
   BeddingOffsetMm + UnitThicknessMm above the datum, and the lip the top
   OuterPaneThicknessMm of that.

   ============================================================================= */

// =============================================================================
// REGION | Glazing Panel Layout Module
// =============================================================================

const VghLantern__Geometry__GlazingPanelLayout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Solver and Layout Vocabulary
    // ------------------------------------------------------------
    const FACE_ROLE_GLAZING  =  'glazingFace';
    const BAR_ROLE_GLAZING   =  'glazingBar';
    const BAR_ROLE_TRANSOM   =  'transom';

    const EDGE_KIND_BAR      =  'bar';
    const EDGE_KIND_TRANSOM  =  'transom';
    const EDGE_KIND_HIP      =  'hip';
    const EDGE_KIND_RIDGE    =  'ridge';
    const EDGE_KIND_EAVES    =  'eaves';

    // Roof glazing Unit, one of Vale's standard part codes beside T for a cut length
    // (Adam, 20-Oct-2026: "change the codes from gz as the standard to RU"). A
    // document code rather than geometry, but it is assigned here with the types.
    const CODE_PREFIX        =  'RU';
    const CODE_MIN_DIGITS    =  2;                                           // <-- RU01 .. RU99, then RU100 if a lantern ever needs it
    const ID_PREFIX          =  'panel__';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Tolerances and Guards
    // ------------------------------------------------------------
    const LEVEL_TOLERANCE_MM       =  0.5;                                   // <-- Within this of a level, a vertex IS on it. The setting out checks use the same figure
    const POINT_MERGE_MM           =  0.01;                                  // <-- Two corners closer than this are one corner
    const COLLINEAR_MM             =  0.01;                                  // <-- A corner this close to the line through its neighbours is not a corner
    const ON_LINE_MM               =  0.05;                                  // <-- An outline edge this close to a cut line was made by that cut
    const BAR_SQUARE_TOLERANCE_MM  =  0.5;                                   // <-- A bar whose ends differ by more than this across the slope is not square to its eaves
    const BAR_IN_PLANE_TOLERANCE   =  0.5;                                   // <-- mm off the glass plane before a bar is taken to belong to another slope
    const MIN_PANEL_AREA_SQMM      =  100;                                   // <-- 1 cm2. A cut smaller than this is a clipping crumb, not glass anybody makes
    const TYPE_MATCH_TOLERANCE_MM  =  0.5;                                   // <-- Corners this close are the same panel to a glazier
    const TYPE_AREA_TIE_SQMM       =  1;                                     // <-- Two types within this are ordered by width instead
    const FRAME_MARGIN_MM          =  1000;                                  // <-- The start rectangle reaches this far past the slope on every side
    const DIRECTION_EPSILON        =  1e-9;                                  // <-- Below this a vector has no direction
    const RAD_TO_DEG               =  180 / Math.PI;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallbacks Mirroring the System Indexes
    // ------------------------------------------------------------
    // Used only when a loader is absent or its index has not arrived, which the
    // boot sequence does not allow: Init loads every system index before the first
    // lantern is solved. Each mirrors its index value exactly, so a panel cut early
    // is the panel cut late. Where each number comes from, and why it is what it
    // is, is written beside it in its index rather than here.
    const FALLBACK_BEDDING_OFFSET_MM        =  8;                            // <-- Glaze bar index GlazingInterface
    const FALLBACK_UNIT_THICKNESS_MM        =  28;                           // <-- Glaze bar index GlazingInterface
    const FALLBACK_EDGE_CLEARANCE_MM        =  3;                            // <-- Glaze bar index GlazingInterface
    const FALLBACK_OUTER_PANE_OVERSAILS     =  true;                         // <-- Glaze bar index GlazingInterface
    const FALLBACK_OUTER_PANE_THICKNESS_MM  =  6;                            // <-- Glaze bar index GlazingInterface (provisional)
    const FALLBACK_BAR_WEB_HALF_WIDTH_MM    =  2.5;                          // <-- 45_2011 core, glaze bar index
    const FALLBACK_HIP_WEB_HALF_WIDTH_MM    =  6;                            // <-- 48_2001 core, hip index
    const FALLBACK_RIDGE_WEB_HALF_WIDTH_MM  =  6;                            // <-- 47_2001 core, ridge index
    const FALLBACK_GLASS_STOP_MM            =  42.875;                       // <-- 46_1002 upstand, base frame index EavesInterface
    const FALLBACK_CAP_EXTENSION_MM         =  170;                          // <-- Base frame index EavesInterface
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Numbers the Glass Is Cut With
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number, or the Fallback When It Is Missing
    // ------------------------------------------------------------
    // A blank or missing value falls back; a present zero is honoured, so a
    // deliberate zero is never quietly overridden.
    function VghLantern__GlazingPanelLayout__Number(value, fallbackValue) {
        if (value === null || value === undefined || value === '') return fallbackValue;
        var number  =  Number(value);
        return isFinite(number) ? number : fallbackValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Core's Web Half Width at the Glass
    // ------------------------------------------------------------
    // Each core carries its own measured web on its part entry in its own system
    // index, beside the section extents that were measured the same way.
    function VghLantern__GlazingPanelLayout__CoreWeb(loader, getPartName, fallbackValue) {
        var part  =  (loader && typeof loader[getPartName] === 'function') ? loader[getPartName]('core') : null;
        return VghLantern__GlazingPanelLayout__Number(part ? part.WebHalfWidthAtGlassMm : null, fallbackValue);
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Number the Panels Are Cut With (synchronous)
    // ------------------------------------------------------------
    // Published on the panel set's Meta as well, so a renderer lifts its slabs by
    // the same bedding offset and thickness the outlines were cut for rather than
    // by a copy of them kept somewhere else.
    function VghLantern__GlazingPanelLayout__Interface() {
        var GlazeBar   =  window.VghLantern__AppData__GlazeBarSystemLoader || null;
        var Ridge      =  window.VghLantern__AppData__RidgeSystemLoader    || null;
        var Hip        =  window.VghLantern__AppData__HipSystemLoader      || null;
        var BaseFrame  =  window.VghLantern__Geometry__BaseFrameAssembly   || null;

        var glazing  =  (GlazeBar && typeof GlazeBar.VghLantern__GlazeBarSystemLoader__GlazingInterface === 'function')
            ? (GlazeBar.VghLantern__GlazeBarSystemLoader__GlazingInterface() || {})
            : {};
        var eaves    =  BaseFrame ? (BaseFrame.VghLantern__BaseFrameAssembly__EavesInterface() || {}) : {};
        var Num      =  VghLantern__GlazingPanelLayout__Number;

        return {
            BeddingOffsetMm           : Num(glazing.BeddingOffsetMm,      FALLBACK_BEDDING_OFFSET_MM),
            UnitThicknessMm           : Num(glazing.UnitThicknessMm,      FALLBACK_UNIT_THICKNESS_MM),
            EdgeClearanceMm           : Num(glazing.EdgeClearanceMm,      FALLBACK_EDGE_CLEARANCE_MM),
            OuterPaneOversails        : (typeof glazing.OuterPaneOversails === 'boolean')
                                            ? glazing.OuterPaneOversails : FALLBACK_OUTER_PANE_OVERSAILS,
            OuterPaneThicknessMm      : Num(glazing.OuterPaneThicknessMm, FALLBACK_OUTER_PANE_THICKNESS_MM),
            BarWebHalfWidthMm         : VghLantern__GlazingPanelLayout__CoreWeb(GlazeBar, 'VghLantern__GlazeBarSystemLoader__GetPart', FALLBACK_BAR_WEB_HALF_WIDTH_MM),
            HipWebHalfWidthMm         : VghLantern__GlazingPanelLayout__CoreWeb(Hip,      'VghLantern__HipSystemLoader__GetPart',      FALLBACK_HIP_WEB_HALF_WIDTH_MM),
            RidgeWebHalfWidthMm       : VghLantern__GlazingPanelLayout__CoreWeb(Ridge,    'VghLantern__RidgeSystemLoader__GetPart',    FALLBACK_RIDGE_WEB_HALF_WIDTH_MM),
            GlassStopAlongPitchMm     : Num(eaves.GlassStopAlongPitchMm,            FALLBACK_GLASS_STOP_MM),
            CapExtensionAlongPitchMm  : Num(eaves.GlazeBarCapExtensionAlongPitchMm, FALLBACK_CAP_EXTENSION_MM)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Vector Helpers (Model Millimetres)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Basic 3D Vector Arithmetic
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__Sub(a, b)      { return { x : a.x - b.x, y : a.y - b.y, z : a.z - b.z }; }
    function VghLantern__GlazingPanelLayout__Add(a, b)      { return { x : a.x + b.x, y : a.y + b.y, z : a.z + b.z }; }
    function VghLantern__GlazingPanelLayout__Scale(a, k)    { return { x : a.x * k,   y : a.y * k,   z : a.z * k   }; }
    function VghLantern__GlazingPanelLayout__Dot(a, b)      { return (a.x * b.x) + (a.y * b.y) + (a.z * b.z); }
    function VghLantern__GlazingPanelLayout__Negate(a)      { return { x : -a.x, y : -a.y, z : -a.z }; }

    function VghLantern__GlazingPanelLayout__Cross(a, b) {
        return {
            x : (a.y * b.z) - (a.z * b.y),
            y : (a.z * b.x) - (a.x * b.z),
            z : (a.x * b.y) - (a.y * b.x)
        };
    }

    function VghLantern__GlazingPanelLayout__Normalise(a) {
        var length  =  Math.sqrt(VghLantern__GlazingPanelLayout__Dot(a, a));
        if (!(length > DIRECTION_EPSILON)) return null;
        return VghLantern__GlazingPanelLayout__Scale(a, 1 / length);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Planar Polygon Helpers (Glass Plane Millimetres)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Signed Area of a 2D Ring (positive = anticlockwise)
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__SignedArea(ring) {
        var area  =  0;
        var i, a, b;
        for (i = 0; i < ring.length; i++) {
            a  =  ring[i];
            b  =  ring[(i + 1) % ring.length];
            area  +=  (a.x * b.y) - (b.x * a.y);
        }
        return area / 2;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clip a Convex Ring to One Half Plane
    // ------------------------------------------------------------
    // Keeps the side where Nx.x + Ny.y >= C. One Sutherland-Hodgman pass: a convex
    // ring clipped by a half plane is still convex, so a panel can be cut by any
    // number of these in any order and come out the same.
    function VghLantern__GlazingPanelLayout__ClipRing(ring, cut) {
        var out  =  [];
        var i, a, b, da, db, t;

        for (i = 0; i < ring.length; i++) {
            a   =  ring[i];
            b   =  ring[(i + 1) % ring.length];
            da  =  (cut.Nx * a.x) + (cut.Ny * a.y) - cut.C;
            db  =  (cut.Nx * b.x) + (cut.Ny * b.y) - cut.C;

            if (da >= 0) out.push(a);
            if ((da >= 0) !== (db >= 0)) {
                t  =  da / (da - db);
                out.push({ x : a.x + ((b.x - a.x) * t), y : a.y + ((b.y - a.y) * t) });
            }
        }
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drop Repeated and Collinear Corners
    // ------------------------------------------------------------
    // A clip that lands exactly on a corner can repeat it, and a corner the next
    // clip passes straight through is left standing on a straight edge. Neither is
    // a corner a glazier cuts, and either would count as a corner when two panels
    // are compared, so both go.
    function VghLantern__GlazingPanelLayout__CleanRing(ring) {
        var merged  =  [];
        var i, p, last;

        for (i = 0; i < ring.length; i++) {
            p     =  ring[i];
            last  =  merged.length ? merged[merged.length - 1] : null;
            if (last && Math.hypot(p.x - last.x, p.y - last.y) <= POINT_MERGE_MM) continue;
            merged.push(p);
        }
        while (merged.length > 1
               && Math.hypot(merged[0].x - merged[merged.length - 1].x, merged[0].y - merged[merged.length - 1].y) <= POINT_MERGE_MM) {
            merged.pop();
        }

        var changed  =  true;
        var prev, next, ex, ey, len, offLine;
        while (changed && merged.length > 3) {
            changed  =  false;
            for (i = 0; i < merged.length; i++) {
                prev  =  merged[(i + merged.length - 1) % merged.length];
                p     =  merged[i];
                next  =  merged[(i + 1) % merged.length];
                ex    =  next.x - prev.x;
                ey    =  next.y - prev.y;
                len   =  Math.hypot(ex, ey);
                if (len <= 0) continue;
                offLine  =  Math.abs(((p.x - prev.x) * ey) - ((p.y - prev.y) * ex)) / len;
                if (offLine <= COLLINEAR_MM) {
                    merged.splice(i, 1);
                    changed  =  true;
                    break;
                }
            }
        }
        return merged;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Bounding Box of a 2D Ring
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__Bounds(ring) {
        var box  =  { MinX : Infinity, MaxX : -Infinity, MinY : Infinity, MaxY : -Infinity };
        var i;
        for (i = 0; i < ring.length; i++) {
            if (ring[i].x < box.MinX) box.MinX  =  ring[i].x;
            if (ring[i].x > box.MaxX) box.MaxX  =  ring[i].x;
            if (ring[i].y < box.MinY) box.MinY  =  ring[i].y;
            if (ring[i].y > box.MaxY) box.MaxY  =  ring[i].y;
        }
        return box;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Interior Angle at Every Corner of a Convex Ring
    // ------------------------------------------------------------
    // The angle the glass is cut to at each corner, in the order the corners run.
    function VghLantern__GlazingPanelLayout__CornerAngles(ring) {
        var angles  =  [];
        var i, prev, p, next, ax, ay, bx, by, cosine;

        for (i = 0; i < ring.length; i++) {
            prev    =  ring[(i + ring.length - 1) % ring.length];
            p       =  ring[i];
            next    =  ring[(i + 1) % ring.length];
            ax      =  prev.x - p.x;
            ay      =  prev.y - p.y;
            bx      =  next.x - p.x;
            by      =  next.y - p.y;
            cosine  =  ((ax * bx) + (ay * by)) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
            angles.push(Math.acos(Math.max(-1, Math.min(1, cosine))) * RAD_TO_DEG);
        }
        return angles;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Glass Plane of One Slope
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Drop Repeated Corners From a Solver Face
    // ------------------------------------------------------------
    // A pyramid's long slope arrives as four corners with the ridge collapsed to
    // one point twice over. Taken as it stands that is an edge of no length that
    // would read as a ridge, so the repeat goes before anything else is asked.
    function VghLantern__GlazingPanelLayout__CleanFacePoints(points) {
        var out  =  [];
        var i, p, last, dx, dy, dz;

        for (i = 0; i < points.length; i++) {
            p     =  points[i];
            last  =  out.length ? out[out.length - 1] : null;
            if (last) {
                dx  =  p.x - last.x; dy  =  p.y - last.y; dz  =  p.z - last.z;
                if (Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) <= POINT_MERGE_MM) continue;
            }
            out.push({ x : p.x, y : p.y, z : p.z });
        }
        if (out.length > 1) {
            last  =  out[out.length - 1];
            dx    =  out[0].x - last.x; dy  =  out[0].y - last.y; dz  =  out[0].z - last.z;
            if (Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) <= POINT_MERGE_MM) out.pop();
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Glass Plane Frame of One Slope
    // ------------------------------------------------------------
    // Normal by Newell's method so the corner order does not matter (the solver's
    // rings run clockwise from above when the long axis is Y), turned to point up
    // and out. AxisY lies in the plane square to the eaves, pointing up the slope;
    // AxisX = AxisY x Normal is then the eaves direction running to the right of
    // somebody outside looking at the slope. Origin is the point of the eaves line
    // nearest the lantern centre, so a symmetrical slope is symmetrical about x = 0.
    //
    // Returns null for a face with no single eaves edge, which no solved slope has.
    function VghLantern__GlazingPanelLayout__FaceFrame(points, eavesLevelMm) {
        var nx  =  0, ny  =  0, nz  =  0;
        var i, current, next;

        for (i = 0; i < points.length; i++) {
            current  =  points[i];
            next     =  points[(i + 1) % points.length];
            nx      +=  (current.y - next.y) * (current.z + next.z);
            ny      +=  (current.z - next.z) * (current.x + next.x);
            nz      +=  (current.x - next.x) * (current.y + next.y);
        }

        var normal  =  VghLantern__GlazingPanelLayout__Normalise({ x : nx, y : ny, z : nz });
        if (!normal) return null;
        if (normal.z < 0) normal  =  VghLantern__GlazingPanelLayout__Negate(normal);

        var eavesPoints  =  [];
        for (i = 0; i < points.length; i++) {
            if (Math.abs(points[i].z - eavesLevelMm) <= LEVEL_TOLERANCE_MM) eavesPoints.push(points[i]);
        }
        if (eavesPoints.length !== 2) return null;

        var along  =  VghLantern__GlazingPanelLayout__Normalise(
            VghLantern__GlazingPanelLayout__Sub(eavesPoints[1], eavesPoints[0]));
        if (!along) return null;

        var axisY  =  VghLantern__GlazingPanelLayout__Normalise(VghLantern__GlazingPanelLayout__Cross(normal, along));
        if (!axisY) return null;
        if (axisY.z < 0) axisY  =  VghLantern__GlazingPanelLayout__Negate(axisY);

        var axisX  =  VghLantern__GlazingPanelLayout__Cross(axisY, normal);

        var centre  =  { x : 0, y : 0, z : eavesPoints[0].z };
        var reach   =  VghLantern__GlazingPanelLayout__Dot(VghLantern__GlazingPanelLayout__Sub(centre, eavesPoints[0]), axisX);
        var origin  =  VghLantern__GlazingPanelLayout__Add(eavesPoints[0], VghLantern__GlazingPanelLayout__Scale(axisX, reach));

        return { Origin : origin, AxisX : axisX, AxisY : axisY, Normal : normal };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Model Point in the Glass Plane, and Back
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__To2d(frame, point) {
        var rel  =  VghLantern__GlazingPanelLayout__Sub(point, frame.Origin);
        return {
            x : VghLantern__GlazingPanelLayout__Dot(rel, frame.AxisX),
            y : VghLantern__GlazingPanelLayout__Dot(rel, frame.AxisY)
        };
    }

    function VghLantern__GlazingPanelLayout__To3d(frame, point2d) {
        return VghLantern__GlazingPanelLayout__Add(frame.Origin, VghLantern__GlazingPanelLayout__Add(
            VghLantern__GlazingPanelLayout__Scale(frame.AxisX, point2d.x),
            VghLantern__GlazingPanelLayout__Scale(frame.AxisY, point2d.y)));
    }

    function VghLantern__GlazingPanelLayout__RingTo3d(frame, ring) {
        var out  =  [];
        var i;
        for (i = 0; i < ring.length; i++) out.push(VghLantern__GlazingPanelLayout__To3d(frame, ring[i]));
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Which Way a Slope Faces, in the Card's Words
    // ------------------------------------------------------------
    // Front is -Y and Right is +X (note 03's card), read off the slope's own normal
    // rather than its SlopeKey, which names an axis side and changes meaning when
    // the lantern is deeper than it is wide.
    function VghLantern__GlazingPanelLayout__SideOf(normal) {
        if (Math.abs(normal.x) > Math.abs(normal.y)) return normal.x > 0 ? 'Right' : 'Left';
        return normal.y < 0 ? 'Front' : 'Back';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Clearances
// -----------------------------------------------------------------------------

    // FUNCTION | How Far a Member's Web Reaches Into the Glass Band
    // ------------------------------------------------------------
    // Measured from the member's datum line, along the glass, square to the
    // member, towards the panel. See THE CLEARANCE in the header for the
    // construction. The member frame comes from GlazeBarAssembly Basis, the frame
    // both sweeps are built in; without it the member is taken as square to the
    // glass, which is exactly right for a glaze bar and close for the rest.
    //
    // @param memberStart, memberEnd  The member's datum line, model mm
    // @param intoPanel               Unit vector in the glass plane, square to the member, towards the panel
    // @param slopeNormal             The glass plane's outward unit normal
    // @param webHalfWidthMm          The core's web half width at the glass
    // @param bandInnerMm, bandOuterMm The glass band, above the datum
    function VghLantern__GlazingPanelLayout__WebReachMm(memberStart, memberEnd, intoPanel, slopeNormal, webHalfWidthMm, bandInnerMm, bandOuterMm) {
        var Assembly  =  window.VghLantern__Geometry__GlazeBarAssembly || null;
        var basis     =  Assembly ? Assembly.VghLantern__GlazeBarAssembly__Basis(memberStart, memberEnd) : null;
        if (!basis) return webHalfWidthMm;

        var c  =  VghLantern__GlazingPanelLayout__Dot(basis.Across, intoPanel);
        var s  =  VghLantern__GlazingPanelLayout__Dot(basis.Across, slopeNormal);
        if (Math.abs(c) < DIRECTION_EPSILON) return webHalfWidthMm;          // <-- A member lying across its own glass has no side to clear

        var signedWeb  =  c > 0 ? webHalfWidthMm : -webHalfWidthMm;
        var reachIn    =  (signedWeb - (bandInnerMm * s)) / c;
        var reachOut   =  (signedWeb - (bandOuterMm * s)) / c;

        return Math.max(reachIn, reachOut);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Cut Line Moved Off Its Member Into the Panel
    // ------------------------------------------------------------
    // Takes the member's line in the glass plane (a point on it and the inward
    // unit normal towards the panel) and returns the half plane the glass must
    // stay inside: the member's own clearance plus the edge tolerance.
    function VghLantern__GlazingPanelLayout__Cut(kind, frame, point2d, normal2d, memberStart, memberEnd, webHalfWidthMm, numbers) {
        var intoPanel  =  VghLantern__GlazingPanelLayout__Add(
            VghLantern__GlazingPanelLayout__Scale(frame.AxisX, normal2d.x),
            VghLantern__GlazingPanelLayout__Scale(frame.AxisY, normal2d.y));

        var reach  =  VghLantern__GlazingPanelLayout__WebReachMm(
            memberStart, memberEnd, intoPanel, frame.Normal, webHalfWidthMm,
            numbers.BeddingOffsetMm, numbers.BeddingOffsetMm + numbers.UnitThicknessMm);

        var clearance  =  reach + numbers.EdgeClearanceMm;

        return {
            Kind        : kind,
            Nx          : normal2d.x,
            Ny          : normal2d.y,
            C           : (normal2d.x * point2d.x) + (normal2d.y * point2d.y) + clearance,
            ClearanceMm : clearance
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cutting One Slope
// -----------------------------------------------------------------------------

    // SUB FUNCTION | The Slope's Own Edges as Cuts: the Hips and the Ridge
    // ------------------------------------------------------------
    // The eaves edge is not one of them: the glass runs past the datum, and the
    // two eaves cuts (the unit and the top pane) are made separately.
    function VghLantern__GlazingPanelLayout__BoundaryCuts(points3d, ring2d, frame, skeleton, numbers) {
        var meta        =  skeleton.Meta || {};
        var eavesMm     =  Number(meta.EavesLevelMm);
        var ridgeMm     =  Number(meta.RidgeLevelMm);
        var cuts        =  [];
        var i, j, a3, b3, a2, b2, dx, dy, len, onEaves, onRidge, kind, web;

        for (i = 0; i < ring2d.length; i++) {
            j   =  (i + 1) % ring2d.length;
            a3  =  points3d[i];  b3  =  points3d[j];
            a2  =  ring2d[i];    b2  =  ring2d[j];

            onEaves  =  Math.abs(a3.z - eavesMm) <= LEVEL_TOLERANCE_MM && Math.abs(b3.z - eavesMm) <= LEVEL_TOLERANCE_MM;
            if (onEaves) continue;

            onRidge  =  isFinite(ridgeMm)
                     && Math.abs(a3.z - ridgeMm) <= LEVEL_TOLERANCE_MM && Math.abs(b3.z - ridgeMm) <= LEVEL_TOLERANCE_MM;
            kind     =  onRidge ? EDGE_KIND_RIDGE : EDGE_KIND_HIP;
            web      =  onRidge ? numbers.RidgeWebHalfWidthMm : numbers.HipWebHalfWidthMm;

            dx   =  b2.x - a2.x;
            dy   =  b2.y - a2.y;
            len  =  Math.hypot(dx, dy);
            if (len <= POINT_MERGE_MM) continue;

            // The ring is anticlockwise, so the inside is to the LEFT of each edge.
            cuts.push(VghLantern__GlazingPanelLayout__Cut(kind, frame, a2, { x : -dy / len, y : dx / len },
                a3, b3, web, numbers));
        }
        return cuts;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Bars and Transoms That Lie on One Slope
    // ------------------------------------------------------------
    // Matched on SlopeKey, which is exactly how the layout stamped them, then
    // proved against the plane: a bar must lie in this slope's glass plane and run
    // square to its eaves (or level, for a transom), or it is reported and left
    // out rather than cutting glass where it is not.
    function VghLantern__GlazingPanelLayout__SlopeMembers(face, frame, barSet, warnings) {
        var bars      =  (barSet && Array.isArray(barSet.Bars)) ? barSet.Bars : [];
        var dividers  =  [];
        var transoms  =  [];
        var i, bar, s2, e2, offStart, offEnd;

        for (i = 0; i < bars.length; i++) {
            bar  =  bars[i];
            if (!bar || bar.SlopeKey !== face.SlopeKey) continue;
            if (bar.Role !== BAR_ROLE_GLAZING && bar.Role !== BAR_ROLE_TRANSOM) continue;

            offStart  =  VghLantern__GlazingPanelLayout__Dot(VghLantern__GlazingPanelLayout__Sub(bar.Start, frame.Origin), frame.Normal);
            offEnd    =  VghLantern__GlazingPanelLayout__Dot(VghLantern__GlazingPanelLayout__Sub(bar.End,   frame.Origin), frame.Normal);
            if (Math.abs(offStart) > BAR_IN_PLANE_TOLERANCE || Math.abs(offEnd) > BAR_IN_PLANE_TOLERANCE) {
                warnings.push('Bar ' + bar.Id + ' does not lie in the ' + face.Id + ' glass plane - left out of the glazing panels.');
                continue;
            }

            s2  =  VghLantern__GlazingPanelLayout__To2d(frame, bar.Start);
            e2  =  VghLantern__GlazingPanelLayout__To2d(frame, bar.End);

            if (bar.Role === BAR_ROLE_TRANSOM) {
                if (Math.abs(s2.y - e2.y) > BAR_SQUARE_TOLERANCE_MM) {
                    warnings.push('Transom ' + bar.Id + ' is not level on its slope - left out of the glazing panels.');
                    continue;
                }
                transoms.push({ Bar : bar, Position : (s2.y + e2.y) / 2 });
                continue;
            }

            if (Math.abs(s2.x - e2.x) > BAR_SQUARE_TOLERANCE_MM) {
                warnings.push('Bar ' + bar.Id + ' is not square to its eaves - left out of the glazing panels.');
                continue;
            }
            dividers.push({ Bar : bar, Position : (s2.x + e2.x) / 2 });
        }

        dividers.sort(function(a, b) { return a.Position - b.Position; });
        transoms.sort(function(a, b) { return a.Position - b.Position; });

        return { Dividers : dividers, Transoms : transoms };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Cut Each Side of One Bar or Transom
    // ------------------------------------------------------------
    // side +1 is the panel to the right of a bar (or above a transom), -1 the
    // panel to its left (or below). Measured separately because a member seen on
    // the skew clears its two sides by different amounts.
    function VghLantern__GlazingPanelLayout__MemberCut(kind, member, side, frame, numbers, isTransom) {
        var position  =  member.Position;
        var point2d   =  isTransom ? { x : 0, y : position } : { x : position, y : 0 };
        var normal2d  =  isTransom ? { x : 0, y : side }     : { x : side, y : 0 };

        return VghLantern__GlazingPanelLayout__Cut(kind, frame, point2d, normal2d,
            member.Bar.Start, member.Bar.End, numbers.BarWebHalfWidthMm, numbers);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name Each Edge of a Panel by the Cut That Made It
    // ------------------------------------------------------------
    // The glazing schedule needs to know which edge of a panel meets a bar, a hip,
    // the ridge or the eaves, because that is what decides how it is finished.
    function VghLantern__GlazingPanelLayout__EdgeKinds(ring, cuts) {
        var edges  =  [];
        var i, j, a, b, k, cut, kind;

        for (i = 0; i < ring.length; i++) {
            j     =  (i + 1) % ring.length;
            a     =  ring[i];
            b     =  ring[j];
            kind  =  '';

            for (k = 0; k < cuts.length; k++) {
                cut  =  cuts[k];
                if (Math.abs((cut.Nx * a.x) + (cut.Ny * a.y) - cut.C) <= ON_LINE_MM
                    && Math.abs((cut.Nx * b.x) + (cut.Ny * b.y) - cut.C) <= ON_LINE_MM) {
                    kind  =  cut.Kind;
                    break;
                }
            }

            edges.push({ Kind : kind, LengthMm : Math.hypot(b.x - a.x, b.y - a.y) });
        }
        return edges;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Cut One Cell of a Slope Into a Panel
    // ------------------------------------------------------------
    // The start rectangle is clipped by the slope's own edges, the cell's bars or
    // transoms and one eaves cut. Run twice per cell: once with the unit's eaves
    // cut and once with the top pane's.
    function VghLantern__GlazingPanelLayout__CutCell(startRing, cuts, eavesCut) {
        var ring  =  startRing;
        var i;

        for (i = 0; i < cuts.length; i++) {
            ring  =  VghLantern__GlazingPanelLayout__ClipRing(ring, cuts[i]);
            if (ring.length < 3) return [];
        }
        ring  =  VghLantern__GlazingPanelLayout__ClipRing(ring, eavesCut);
        ring  =  VghLantern__GlazingPanelLayout__CleanRing(ring);

        if (ring.length < 3) return [];
        if (VghLantern__GlazingPanelLayout__SignedArea(ring) < MIN_PANEL_AREA_SQMM) return [];
        return ring;
    }
    // ------------------------------------------------------------


    // FUNCTION | Cut One Solved Slope Into Its Panels
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__CutFace(face, skeleton, barSet, numbers, warnings) {
        var meta      =  skeleton.Meta || {};
        var eavesMm   =  Number(meta.EavesLevelMm);
        var points3d  =  VghLantern__GlazingPanelLayout__CleanFacePoints(face.Points);
        if (points3d.length < 3 || !isFinite(eavesMm)) return [];

        var frame  =  VghLantern__GlazingPanelLayout__FaceFrame(points3d, eavesMm);
        if (!frame) {
            warnings.push('Slope ' + face.Id + ' has no single eaves edge - it has no glazing panels.');
            return [];
        }

        // The slope in its own plane, anticlockwise seen from outside.
        var ring2d  =  points3d.map(function(p) { return VghLantern__GlazingPanelLayout__To2d(frame, p); });
        if (VghLantern__GlazingPanelLayout__SignedArea(ring2d) < 0) {
            ring2d.reverse();
            points3d  =  points3d.slice().reverse();
        }

        var boundaryCuts  =  VghLantern__GlazingPanelLayout__BoundaryCuts(points3d, ring2d, frame, skeleton, numbers);
        var members       =  VghLantern__GlazingPanelLayout__SlopeMembers(face, frame, barSet, warnings);

        // EAVES | The unit stops the clearance short of the extrusion upstand; the
        // top pane, when it oversails, runs on to the glaze bar cap ends.
        var unitExtensionMm   =  numbers.GlassStopAlongPitchMm - numbers.EdgeClearanceMm;
        var outerExtensionMm  =  numbers.OuterPaneOversails ? numbers.CapExtensionAlongPitchMm : unitExtensionMm;
        var unitEavesCut      =  { Kind : EDGE_KIND_EAVES, Nx : 0, Ny : 1, C : -unitExtensionMm };
        var outerEavesCut     =  { Kind : EDGE_KIND_EAVES, Nx : 0, Ny : 1, C : -outerExtensionMm };
        var lipCut            =  { Kind : EDGE_KIND_EAVES, Nx : 0, Ny : -1, C : unitExtensionMm };

        var box        =  VghLantern__GlazingPanelLayout__Bounds(ring2d);
        var startRing  =  [
            { x : box.MinX - FRAME_MARGIN_MM, y : box.MinY - FRAME_MARGIN_MM },
            { x : box.MaxX + FRAME_MARGIN_MM, y : box.MinY - FRAME_MARGIN_MM },
            { x : box.MaxX + FRAME_MARGIN_MM, y : box.MaxY + FRAME_MARGIN_MM },
            { x : box.MinX - FRAME_MARGIN_MM, y : box.MaxY + FRAME_MARGIN_MM }
        ];

        var dividers  =  members.Dividers;
        var transoms  =  members.Transoms;
        var panels    =  [];
        var strip, row, cuts, unitRing, outerRing, lipRing;

        // Strip k lies between divider k-1 and divider k; the first and last run
        // out to the hips, which is where the triangular end pieces come from.
        for (strip = 0; strip <= dividers.length; strip++) {
            for (row = 0; row <= transoms.length; row++) {
                cuts  =  boundaryCuts.slice();

                if (strip > 0)               cuts.push(VghLantern__GlazingPanelLayout__MemberCut(EDGE_KIND_BAR, dividers[strip - 1], 1,  frame, numbers, false));
                if (strip < dividers.length) cuts.push(VghLantern__GlazingPanelLayout__MemberCut(EDGE_KIND_BAR, dividers[strip],     -1, frame, numbers, false));
                if (row > 0)                 cuts.push(VghLantern__GlazingPanelLayout__MemberCut(EDGE_KIND_TRANSOM, transoms[row - 1], 1,  frame, numbers, true));
                if (row < transoms.length)   cuts.push(VghLantern__GlazingPanelLayout__MemberCut(EDGE_KIND_TRANSOM, transoms[row],     -1, frame, numbers, true));

                // A transom row above the bottom never reaches the eaves, so only
                // the bottom row has an eaves edge to step.
                unitRing   =  VghLantern__GlazingPanelLayout__CutCell(startRing, cuts, unitEavesCut);
                if (unitRing.length === 0) continue;

                outerRing  =  VghLantern__GlazingPanelLayout__CutCell(startRing, cuts, outerEavesCut);
                if (outerRing.length === 0) outerRing  =  unitRing;

                lipRing    =  (numbers.OuterPaneOversails && outerExtensionMm > unitExtensionMm)
                    ? VghLantern__GlazingPanelLayout__CutCell(outerRing, [], lipCut)
                    : [];

                panels.push(VghLantern__GlazingPanelLayout__DescribePanel(face, frame, strip, row,
                    unitRing, outerRing, lipRing, cuts.concat([unitEavesCut, outerEavesCut])));
            }
        }

        return panels;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe One Cut Panel
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__DescribePanel(face, frame, strip, row, unitRing, outerRing, lipRing, cuts) {
        var outerBox  =  VghLantern__GlazingPanelLayout__Bounds(outerRing);
        var unitBox   =  VghLantern__GlazingPanelLayout__Bounds(unitRing);

        return {
            Id                   : '',                                       // <-- Numbered once the whole roof is cut
            Code                 : '',                                       // <-- Given once the types are known
            TypeIndex            : -1,
            TypeQuantity         : 0,
            FaceId               : face.Id,
            SlopeKey             : face.SlopeKey,
            Side                 : VghLantern__GlazingPanelLayout__SideOf(frame.Normal),
            PitchDegrees         : face.PitchDegrees,
            StripIndex           : strip,
            RowIndex             : row,
            Ordinal              : 0,
            Normal               : frame.Normal,
            Frame                : { Origin : frame.Origin, AxisX : frame.AxisX, AxisY : frame.AxisY },
            Outline2d            : unitRing,
            OuterOutline2d       : outerRing,
            LipOutline2d         : lipRing,
            Outline3d            : VghLantern__GlazingPanelLayout__RingTo3d(frame, unitRing),
            OuterOutline3d       : VghLantern__GlazingPanelLayout__RingTo3d(frame, outerRing),
            LipOutline3d         : VghLantern__GlazingPanelLayout__RingTo3d(frame, lipRing),
            Edges                : VghLantern__GlazingPanelLayout__EdgeKinds(outerRing, cuts),
            WidthMm              : outerBox.MaxX - outerBox.MinX,
            LengthMm             : outerBox.MaxY - outerBox.MinY,
            AreaSqMm             : VghLantern__GlazingPanelLayout__SignedArea(outerRing),
            UnitWidthMm          : unitBox.MaxX - unitBox.MinX,
            UnitLengthMm         : unitBox.MaxY - unitBox.MinY,
            UnitAreaSqMm         : VghLantern__GlazingPanelLayout__SignedArea(unitRing),
            CornerAnglesDegrees  : VghLantern__GlazingPanelLayout__CornerAngles(outerRing)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Types and Codes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Slide a Ring by an Offset
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__Shift(ring, dx, dy) {
        var out  =  [];
        var i;
        for (i = 0; i < ring.length; i++) out.push({ x : ring[i].x - dx, y : ring[i].y - dy });
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether Two Rings Are One Shape, Corner for Corner
    // ------------------------------------------------------------
    // Both rings are anticlockwise and slid to the same origin, so they match if
    // some rotation of one's corner list lands every corner within the tolerance
    // of the other's. Mirrors are deliberately NOT tried: panels are handed.
    function VghLantern__GlazingPanelLayout__SameRing(a, b) {
        if (a.length !== b.length) return false;
        var n  =  a.length;
        var shift, i, p, q, matches;

        for (shift = 0; shift < n; shift++) {
            matches  =  true;
            for (i = 0; i < n; i++) {
                p  =  a[i];
                q  =  b[(i + shift) % n];
                if (Math.abs(p.x - q.x) > TYPE_MATCH_TOLERANCE_MM || Math.abs(p.y - q.y) > TYPE_MATCH_TOLERANCE_MM) {
                    matches  =  false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Panel Slid to Its Own Origin, Ready to Compare
    // ------------------------------------------------------------
    // The top pane's outline decides the origin and the unit's outline moves with
    // it, so two panels whose top panes match but whose units step at different
    // places are told apart.
    function VghLantern__GlazingPanelLayout__Canonical(panel) {
        var box  =  VghLantern__GlazingPanelLayout__Bounds(panel.OuterOutline2d);
        return {
            Outer : VghLantern__GlazingPanelLayout__Shift(panel.OuterOutline2d, box.MinX, box.MinY),
            Unit  : VghLantern__GlazingPanelLayout__Shift(panel.Outline2d,      box.MinX, box.MinY)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Code for a Type Number
    // ------------------------------------------------------------
    function VghLantern__GlazingPanelLayout__Code(typeNumber) {
        var digits  =  String(typeNumber);
        while (digits.length < CODE_MIN_DIGITS) digits  =  '0' + digits;
        return CODE_PREFIX + digits;
    }
    // ------------------------------------------------------------


    // FUNCTION | Group Identical Panels Into Types and Code Them
    // ------------------------------------------------------------
    // Largest first by top pane area, the way the T codes run longest first; a
    // near tie goes to the wider panel, then to the panel met first round the roof.
    function VghLantern__GlazingPanelLayout__AssignTypes(panels) {
        var groups  =  [];
        var i, j, canonical, group;

        for (i = 0; i < panels.length; i++) {
            canonical  =  VghLantern__GlazingPanelLayout__Canonical(panels[i]);
            group      =  null;

            for (j = 0; j < groups.length; j++) {
                if (VghLantern__GlazingPanelLayout__SameRing(groups[j].Canonical.Outer, canonical.Outer)
                    && VghLantern__GlazingPanelLayout__SameRing(groups[j].Canonical.Unit, canonical.Unit)) {
                    group  =  groups[j];
                    break;
                }
            }

            if (!group) {
                group  =  { Canonical : canonical, First : panels[i], Members : [], FirstSeen : i };
                groups.push(group);
            }
            group.Members.push(panels[i]);
        }

        groups.sort(function(a, b) {
            var areaGap  =  b.First.AreaSqMm - a.First.AreaSqMm;
            if (Math.abs(areaGap) > TYPE_AREA_TIE_SQMM) return areaGap;
            var widthGap  =  b.First.WidthMm - a.First.WidthMm;
            if (Math.abs(widthGap) > TYPE_MATCH_TOLERANCE_MM) return widthGap;
            return a.FirstSeen - b.FirstSeen;
        });

        var types  =  [];
        var code, first;

        for (i = 0; i < groups.length; i++) {
            group  =  groups[i];
            code   =  VghLantern__GlazingPanelLayout__Code(i + 1);
            first  =  group.First;

            for (j = 0; j < group.Members.length; j++) {
                group.Members[j].Code          =  code;
                group.Members[j].TypeIndex     =  i;
                group.Members[j].TypeQuantity  =  group.Members.length;
            }

            types.push({
                Code                 : code,
                TypeIndex            : i,
                Quantity             : group.Members.length,
                PanelIds             : group.Members.map(function(p) { return p.Id; }),
                Outline2d            : group.Canonical.Unit,
                OuterOutline2d       : group.Canonical.Outer,
                Edges                : first.Edges,
                WidthMm              : first.WidthMm,
                LengthMm             : first.LengthMm,
                AreaSqMm             : first.AreaSqMm,
                UnitWidthMm          : first.UnitWidthMm,
                UnitLengthMm         : first.UnitLengthMm,
                UnitAreaSqMm         : first.UnitAreaSqMm,
                CornerAnglesDegrees  : first.CornerAnglesDegrees
            });
        }

        return types;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Layout Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Cut a Solved Lantern's Glass Into Panels
    // ------------------------------------------------------------
    // @param skeleton  SolvedSkeleton
    // @param barSet    GlazeBarSet from VghLantern__Geometry__GlazeBarLayout
    // @param lantern   The lantern block (unused today; taken so a per-lantern
    //                  glazing choice can reach the cut without a signature change)
    // @return          GlazingPanelSet, or null when there is nothing to cut
    function VghLantern__GlazingPanelLayout__Layout(skeleton, barSet, lantern) {
        if (!skeleton || !skeleton.Meta || !Array.isArray(skeleton.Faces)) return null;

        var numbers   =  VghLantern__GlazingPanelLayout__Interface();
        var warnings  =  [];
        var panels    =  [];
        var i, face, facePanels, j;

        for (i = 0; i < skeleton.Faces.length; i++) {
            face  =  skeleton.Faces[i];
            if (!face || face.Role !== FACE_ROLE_GLAZING || !Array.isArray(face.Points)) continue;

            facePanels  =  VghLantern__GlazingPanelLayout__CutFace(face, skeleton, barSet, numbers, warnings);
            for (j = 0; j < facePanels.length; j++) {
                facePanels[j].Ordinal  =  j + 1;
                facePanels[j].Id       =  ID_PREFIX + face.Id + '__' + (j + 1 < 10 ? '0' : '') + (j + 1);
                panels.push(facePanels[j]);
            }
        }

        var types  =  VghLantern__GlazingPanelLayout__AssignTypes(panels);

        return {
            Meta : {
                PanelCount             : panels.length,
                TypeCount              : types.length,
                BeddingOffsetMm        : numbers.BeddingOffsetMm,
                UnitThicknessMm        : numbers.UnitThicknessMm,
                OuterPaneThicknessMm   : numbers.OuterPaneOversails ? numbers.OuterPaneThicknessMm : 0,
                OuterPaneOversails     : numbers.OuterPaneOversails,
                EdgeClearanceMm        : numbers.EdgeClearanceMm,
                UnitEavesExtensionMm   : numbers.GlassStopAlongPitchMm - numbers.EdgeClearanceMm,
                OuterEavesExtensionMm  : numbers.OuterPaneOversails ? numbers.CapExtensionAlongPitchMm
                                                                    : numbers.GlassStopAlongPitchMm - numbers.EdgeClearanceMm,
                WebHalfWidthsMm        : {
                    GlazeBar : numbers.BarWebHalfWidthMm,
                    Hip      : numbers.HipWebHalfWidthMm,
                    Ridge    : numbers.RidgeWebHalfWidthMm
                }
            },
            Panels   : panels,
            Types    : types,
            Warnings : warnings
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__GlazingPanelLayout__Layout       : VghLantern__GlazingPanelLayout__Layout,
        VghLantern__GlazingPanelLayout__Interface    : VghLantern__GlazingPanelLayout__Interface,
        VghLantern__GlazingPanelLayout__WebReachMm   : VghLantern__GlazingPanelLayout__WebReachMm
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__GlazingPanelLayout  =  VghLantern__Geometry__GlazingPanelLayout;
