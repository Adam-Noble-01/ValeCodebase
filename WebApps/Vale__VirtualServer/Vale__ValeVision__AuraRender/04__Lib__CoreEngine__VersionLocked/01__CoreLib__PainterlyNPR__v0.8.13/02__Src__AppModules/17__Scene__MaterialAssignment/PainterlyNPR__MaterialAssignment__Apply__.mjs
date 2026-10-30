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

   ============================================================================= */

import AssignConfig from './Na__MaterialAssignment__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Maths__V3Dot as V3Dot } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__MaterialAssignment__FaceFrame,
    PainterlyNPR__MaterialAssignment__FaceTriangles,
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
    const RULES  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Rules', ['Excluded', 'Patterns', 'SoldierNeeds', 'FlagNeeds']);
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
        // face with none gets courses of its own, laid within the face's outline
        const onFace  =  (s) => !face || (V3Dot(s.N, face.Plane.N) >= FACES.NormalDot && Math.abs(V3Dot(s.Origin, face.Plane.N) - face.Plane.D) <= FACES.PlaneM + 0.003);
        const mine    =  pkg.Surfaces.filter(s => s.ObjectId === object.Id && onFace(s));
        for (const surface of mine) PainterlyNPR__MaterialAssignment__Follow(surface, a.Material);
        const pattern  =  PainterlyNPR__MaterialAssignment__PatternOf(a.Material);
        if (face && pattern && !mine.length) {
            const frame  =  PainterlyNPR__MaterialAssignment__FaceFrame(pkg, face);
            if (frame.Width > 0.05 && frame.Height > 0.05) {
                pkg.Surfaces.push(Object.assign({ Id: pkg.Surfaces.length + 1, ObjectId: object.Id, Pattern: pattern, Holes: [], Corners: true, Top: true, Base: true, Assigned: a.Uid }, frame));
            }
        }
        if (!face) for (const path of pkg.Paths) if (path.ObjectId === object.Id) path.Suppressed = a.Material !== RULES.FlagNeeds;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Assignment of a Drawing, in the Order They Were Made
    // ------------------------------------------------------------
    // Called by PainterlyNPR__ScenePackage__Build (10) once the package is packed.
    // Returns how many were applied.
    function PainterlyNPR__MaterialAssignment__ApplyAll(pkg, assignments) {
        if (!assignments || !assignments.length) return 0;
        let applied  =  0;
        for (const a of assignments) if (PainterlyNPR__MaterialAssignment__ApplyOne(pkg, a)) applied++;
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
