/* =============================================================================
   PAINTERLYNPR - SCENE | MATERIAL ASSIGNMENT - APPLY
   =============================================================================

   FILE       : PainterlyNPR__MaterialAssignment__Apply__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - MaterialAssignment - Apply
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A drawing's material assignments carried into its scene package:
                each object or face given its class, and its courses made to
                follow - laid in the new pattern, laid fresh on a face that had
                none, or left off
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "make a new assets tab for materials and built a
     materials application system which can handle per object and per face
     material asignment".
   - An assignment is data in the drawing (State.Materials, the settings object's
     Materials): { Uid, Target: 'Object' or 'Face', Object: its key, Face: the
     picked triangle's place, Material }. The scene is rebuilt from the drawing,
     so they are applied after every build, in the order they were made: a later
     one wins.
   - What follows the class at once: the truth buffers carry each pixel's class,
     so the wash, the hatching's take and the hover all read the new one. What
     this module makes follow: the object's own record, and material indication's
     surfaces and flagstone paths (Rules.Patterns).
   - Stones (v0.8.20) come last: LayPainted lays a rubble surface on every wall
     whose triangles end up in that class, however they came by it. On a project's
     own model (GLB, which carries no surfaces) it lays every patterned class the
     same way since v0.8.22: brick, roof tiles and paving as well.

   ============================================================================= */

import AssignConfig from './Na__MaterialAssignment__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Maths__V3Dot as V3Dot } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__MaterialAssignment__FaceFrame,
    PainterlyNPR__MaterialAssignment__FaceMask,
    PainterlyNPR__MaterialAssignment__FaceSuits,
    PainterlyNPR__MaterialAssignment__FaceTriangles,
    PainterlyNPR__MaterialAssignment__FlatFaces,
    PainterlyNPR__MaterialAssignment__ResolveObject,
    PainterlyNPR__MaterialAssignment__Triangles,
} from './PainterlyNPR__MaterialAssignment__Faces__.mjs';

// =============================================================================
// REGION | Material Assignment - Apply
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialAssignment__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const RULES  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Rules', ['Excluded', 'Patterns', 'Laid', 'LayMaxTriangles', 'SoldierNeeds', 'FlagNeeds']);
    const FACES  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Faces', ['NormalDot', 'PlaneM']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rules
// -----------------------------------------------------------------------------

    // FUNCTION | Can a Class Be Given, and Which Courses It Lays
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Assignable(key) {
        return !!MATERIAL_BY_KEY[key] && !RULES.Excluded.includes(key);
    }

    function PainterlyNPR__MaterialAssignment__PatternOf(key) {
        return RULES.Patterns[key] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Surface Follows Its New Class - re-patterned, or left without courses
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Follow(surface, key) {
        const pattern  =  PainterlyNPR__MaterialAssignment__PatternOf(key);
        if (surface.Pattern === 'Soldier') { surface.Suppressed = key !== RULES.SoldierNeeds; return; }
        if (pattern) { surface.Pattern = pattern; surface.Suppressed = false; }
        else surface.Suppressed = true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Patterns Are Laid on Faces in This Package
    // ------------------------------------------------------------
    // A project's own model carries no surfaces, so it lays them all; a demo scene's
    // brick and tile come from its builders, and only stone is laid there.
    function PainterlyNPR__MaterialAssignment__LaidHere(pkg) {
        const own  =  pkg.Source && pkg.Source.Kind === 'Glb';
        const out  =  {};
        for (const [pattern, rule] of Object.entries(RULES.Laid)) if (own || rule.Everywhere) out[pattern] = rule;
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Apply
// -----------------------------------------------------------------------------

    // FUNCTION | Give One Object or Face Its Class, in a Packed Package
    // ------------------------------------------------------------
    // Returns false when what it names is gone (a plop since removed, a face no
    // longer there), and the assignment is passed over.
    function PainterlyNPR__MaterialAssignment__ApplyOne(pkg, a) {
        const material  =  MATERIAL_BY_KEY[a.Material];
        if (!material || !PainterlyNPR__MaterialAssignment__Assignable(a.Material)) return false;
        const object  =  PainterlyNPR__MaterialAssignment__ResolveObject(pkg, a.Object);
        if (!object) return false;
        const face  =  a.Target === 'Face' ? PainterlyNPR__MaterialAssignment__FaceTriangles(pkg, object.Id, a.Face) : null;
        if (a.Target === 'Face' && !face) return false;
        const triangles  =  face ? face.Triangles : PainterlyNPR__MaterialAssignment__Triangles(pkg).get(object.Id) || [];
        const V  =  pkg.Vertices;
        for (const t of triangles) { V[t * 24 + 7] = material.Id; V[t * 24 + 15] = material.Id; V[t * 24 + 23] = material.Id; }
        if (!face) {
            object.MaterialId   =  material.Id;
            object.MaterialKey  =  a.Material;
        }

        // The object's surfaces (or those on the face) follow; a patterned class on a
        // face with none gets courses of its own, laid within the face's outline.
        // What LayPainted lays waits for it: only a face's final class counts. A path's
        // flags stay with the path (Flags), so its faces take no flagstones as well
        const onFace  =  (s) => !face || (V3Dot(s.N, face.Plane.N) >= FACES.NormalDot && Math.abs(V3Dot(s.Origin, face.Plane.N) - face.Plane.D) <= FACES.PlaneM + 0.003);
        const mine    =  pkg.Surfaces.filter(s => s.ObjectId === object.Id && onFace(s));
        for (const surface of mine) PainterlyNPR__MaterialAssignment__Follow(surface, a.Material);
        const pattern  =  PainterlyNPR__MaterialAssignment__PatternOf(a.Material);
        const isPath  =  pattern === 'Flagstone' && pkg.Paths.some(p => p.ObjectId === object.Id);
        if (face && pattern && !mine.length && !isPath && !PainterlyNPR__MaterialAssignment__LaidHere(pkg)[pattern]) {
            const frame  =  PainterlyNPR__MaterialAssignment__FaceFrame(pkg, face);
            if (frame.Width > 0.05 && frame.Height > 0.05) {
                pkg.Surfaces.push(Object.assign({ Id: pkg.Surfaces.length + 1, ObjectId: object.Id, Pattern: pattern, Holes: [], Corners: true, Top: true, Base: true, Assigned: a.Uid }, frame));
            }
        }
        if (!face) for (const path of pkg.Paths) if (path.ObjectId === object.Id) path.Suppressed = a.Material !== RULES.FlagNeeds;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Material's Marks on Every Face of That Class - however it came by it
    // ------------------------------------------------------------
    // Run after the assignments, on the triangles' final classes, so a wall takes
    // its stones or a plinth its courses whether it was given the class as a whole
    // object or a face in the Materials tab, painted with its swatch in SketchUp
    // (10, GlbBase), given it by a rule, or named so by a host's scene file; and a
    // face given something else since keeps none. A whitecard is one mesh, so this
    // walks its flat faces, each judged by its pattern's rule (Laid: slope and
    // size). A surface already on the face (a builder's, with its holes) stays,
    // re-patterned by Follow; a surface from an earlier assignment gives way to one
    // that knows what the face's linework leaves clear. A placed asset lays only
    // what is laid Everywhere: it was drawn as it is.
    function PainterlyNPR__MaterialAssignment__LayPainted(pkg) {
        const here      =  PainterlyNPR__MaterialAssignment__LaidHere(pkg);
        const patterns  =  new Map();
        for (const [key, pattern] of Object.entries(RULES.Patterns)) {
            if (here[pattern] && MATERIAL_BY_KEY[key]) patterns.set(MATERIAL_BY_KEY[key].Id, pattern);
        }
        const V        =  pkg.Vertices;
        const objects  =  new Map();                                          // <-- Each with whether anything laid Everywhere is on it
        for (let o = 0; o < V.length; o += 24) {
            const pattern  =  patterns.get(V[o + 7]);
            if (pattern) objects.set(V[o + 6], objects.get(V[o + 6]) || here[pattern].Everywhere);
        }
        if (!objects.size) return 0;
        for (const surface of pkg.Surfaces) {
            if (surface.Assigned && here[surface.Pattern]) surface.Suppressed = true;
        }
        const byObject  =  PainterlyNPR__MaterialAssignment__Triangles(pkg);
        let laid  =  0;
        for (const [id, everywhere] of objects) {
            const object  =  pkg.ObjectById.get(id);
            if (!object) continue;
            if (!everywhere && (object.Uid || byObject.get(id).length > RULES.LayMaxTriangles)) continue;
            const built   =  pkg.Surfaces.filter(s => s.ObjectId === id && !s.Suppressed);   // <-- Before any laid here: two faces may share a plane, each with its own marks
            for (const flat of PainterlyNPR__MaterialAssignment__FlatFaces(pkg, id)) {
                const painted  =  flat.Triangles.filter(t => patterns.has(V[t * 24 + 7]));
                if (!painted.length) continue;
                const pattern  =  patterns.get(V[painted[0] * 24 + 7]);
                const rule     =  here[pattern];
                if ((object.Uid && !rule.Everywhere) || !PainterlyNPR__MaterialAssignment__FaceSuits(flat, rule)) continue;
                const onFace   =  built.some(s => V3Dot(s.N, flat.Plane.N) >= FACES.NormalDot && Math.abs(V3Dot(s.Origin, flat.Plane.N) - flat.Plane.D) <= FACES.PlaneM + 0.003);
                if (onFace) continue;
                const face     =  Object.assign({}, flat, { Triangles: painted });
                const frame    =  PainterlyNPR__MaterialAssignment__FaceFrame(pkg, face);
                if (!(frame.Width > 0.05 && frame.Height > 0.05)) continue;
                const where    =  (v) => v.map(x => Math.round(x * 100)).join(',');   // <-- Its identity is where it lies, never its place in the list: giving one face a material leaves every other face's marks as they were
                pkg.Surfaces.push(Object.assign({ Id: `laid:${where(frame.N)}:${where(frame.Origin)}`, ObjectId: id, Pattern: pattern, Holes: [], Corners: true, Top: true, Base: true, Painted: true, Mask: PainterlyNPR__MaterialAssignment__FaceMask(pkg, face, frame, rule) }, frame));
                laid++;
            }
        }
        return laid;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Assignment of a Drawing, in the Order They Were Made
    // ------------------------------------------------------------
    // Called by PainterlyNPR__ScenePackage__Build (10) once the package is packed.
    // Returns how many were applied.
    function PainterlyNPR__MaterialAssignment__ApplyAll(pkg, assignments) {
        let applied  =  0;
        for (const a of assignments || []) if (PainterlyNPR__MaterialAssignment__ApplyOne(pkg, a)) applied++;
        PainterlyNPR__MaterialAssignment__LayPainted(pkg);                    // <-- Even with none: a model's own swatches can ask for a material
        return applied;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__MaterialAssignment__ApplyAll,
        PainterlyNPR__MaterialAssignment__ApplyOne,
        PainterlyNPR__MaterialAssignment__Assignable,
        PainterlyNPR__MaterialAssignment__PatternOf,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
