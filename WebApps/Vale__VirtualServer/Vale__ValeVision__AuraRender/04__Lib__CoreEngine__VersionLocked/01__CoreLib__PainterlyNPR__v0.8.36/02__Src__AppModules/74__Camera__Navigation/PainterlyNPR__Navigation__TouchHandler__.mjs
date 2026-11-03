/* =============================================================================
   PAINTERLYNPR - CAMERA | NAVIGATION - TOUCH HANDLER
   =============================================================================

   FILE       : PainterlyNPR__Navigation__TouchHandler__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - Navigation - TouchHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fingers on the drawing: one orbits, two pinch nearer or further
                and drag to pan, a tap is a tap
   CREATED    : 30-Oct-2026 (v0.5.4)

   DESCRIPTION:
   - ValeVision's iPad map (OrbitControls touches ONE: ROTATE, TWO: DOLLY_PAN),
     read from the mappings' Touch section, eased to a stop (the mappings'
     Damping: on for fingers).
   - The pinch: the distance is divided by how far the fingers spread since the
     last move, about their midpoint's travel, which pans.
   - Lifting one of two fingers ends the pinch and starts no orbit: the last
     finger does nothing until every finger is up (the sheet's old rule, so the
     end of a pinch never swings the view).
   - A finger that lifts within the tap slop, alone, is a tap (OnTap).
   - The drawing's element needs touch-action: none, or the browser takes the
     drag for scrolling.

   ============================================================================= */

import { PainterlyNPR__Navigation__TOUCH as TOUCH } from './PainterlyNPR__Navigation__Mappings__.mjs';

// =============================================================================
// REGION | Navigation - Touch Handler
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Attach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen for Fingers on the Session's Element - returns a detach function
    // ------------------------------------------------------------
    function PainterlyNPR__NavigationTouch__Attach(session) {
        const el      =  session.Element;
        const points  =  new Map();                                           // <-- pointerId -> { X, Y, StartX, StartY }
        const g       =  { Mode: null, Moved: false, Distance: 0, MidX: 0, MidY: 0 };   // <-- Mode: 'One', 'Two' or 'Done' (a pinch ended, fingers still down)

        const span  =  () => {
            const [a, b]  =  [...points.values()];
            return { Distance: Math.hypot(b.X - a.X, b.Y - a.Y) || 1, MidX: (a.X + b.X) / 2, MidY: (a.Y + b.Y) / 2 };
        };

        const down  =  (e) => {
            if (e.pointerType !== 'touch') return;
            if (!points.size && (e.defaultPrevented || !session.Allowed(e))) return;   // <-- A first finger someone else took (a point being placed)
            if (points.size >= 2) return;                                     // <-- A third finger is ignored
            points.set(e.pointerId, { X: e.clientX, Y: e.clientY, StartX: e.clientX, StartY: e.clientY });
            try { el.setPointerCapture(e.pointerId); } catch (error) { /* no real pointer */ }
            if (points.size === 1) {
                g.Mode   =  'One';
                g.Moved  =  false;
                session.Start();
                session.Grip(1);
                return;
            }
            const s  =  span();                                               // <-- Two fingers: a pinch from here
            Object.assign(g, { Mode: 'Two', Moved: true, Distance: s.Distance, MidX: s.MidX, MidY: s.MidY });
        };

        const move  =  (e) => {
            const p  =  points.get(e.pointerId);
            if (!p) return;
            const dx = e.clientX - p.X, dy = e.clientY - p.Y;
            p.X  =  e.clientX;
            p.Y  =  e.clientY;

            if (g.Mode === 'Two' && points.size === 2) {
                const s  =  span();
                if (TOUCH.TwoFingers === 'DollyPan' || TOUCH.TwoFingers === 'Dolly') session.DollyBy(Math.log(g.Distance / s.Distance));   // <-- Fingers apart: nearer, by the ratio they spread
                if (TOUCH.TwoFingers === 'DollyPan' || TOUCH.TwoFingers === 'Pan') session.Pan(s.MidX - g.MidX, s.MidY - g.MidY, 'touch');
                Object.assign(g, { Distance: s.Distance, MidX: s.MidX, MidY: s.MidY });
                return;
            }
            if (g.Mode !== 'One') return;
            if (!g.Moved) {
                if (Math.hypot(p.X - p.StartX, p.Y - p.StartY) < TOUCH.TapSlopPx) return;
                g.Moved  =  true;
                const fx = p.X - p.StartX, fy = p.Y - p.StartY;                 // <-- The first move is measured from where the finger landed
                if (TOUCH.OneFinger === 'Pan') session.Pan(fx, fy, 'touch'); else session.Rotate(fx, fy, 'touch');
                return;
            }
            if (TOUCH.OneFinger === 'Pan') session.Pan(dx, dy, 'touch'); else session.Rotate(dx, dy, 'touch');
        };

        const up  =  (e) => {
            const p  =  points.get(e.pointerId);
            if (!p) return;
            points.delete(e.pointerId);
            try { el.releasePointerCapture(e.pointerId); } catch (error) { /* already released */ }
            if (points.size === 1) { g.Mode = 'Done'; return; }               // <-- One of two fingers lifted: the pinch is over
            if (points.size) return;
            if (g.Mode === 'One' && !g.Moved && e.type === 'pointerup') session.Tap(e);
            g.Mode  =  null;
            session.Grip(-1);
        };

        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);

        return () => {
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            if (points.size) { points.clear(); g.Mode = null; session.Grip(-1); }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__NavigationTouch__Attach,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
