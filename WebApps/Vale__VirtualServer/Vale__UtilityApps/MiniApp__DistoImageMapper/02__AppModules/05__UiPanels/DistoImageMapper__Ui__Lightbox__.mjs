/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | LIGHTBOX
   =============================================================================

   FILE       : DistoImageMapper__Ui__Lightbox__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Ui - Lightbox
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Expands a photo out of the 3D view, with what is known about it and
                where it sits on the plan and the elevation
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - The photo grows from its card's own rectangle in the 3D view, and shrinks back
     to it on closing.
   - Beside it: the point's coordinates and shot data, and a small plan and elevation
     with the point ringed. Clicking a dot on either goes to that point.
   - Arrow keys or a swipe step through the survey in order.

   ============================================================================= */

import { DistoImageMapper__State__SetSelected } from '../01__AppCore/DistoImageMapper__AppCore__State__.mjs';
import {
    DistoImageMapper__Format__Angle,
    DistoImageMapper__Format__CoordinateMm,
    DistoImageMapper__Format__Date,
    DistoImageMapper__Format__Length,
    DistoImageMapper__Format__Time
} from '../01__AppCore/DistoImageMapper__AppCore__Format__.mjs';
import { DistoImageMapper__Coords__SheetToModel } from '../04__Env3d/DistoImageMapper__Env3d__Coordinates__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Motion and Marks
    // ------------------------------------------------------------
    const MOVE_MS              =  280;
    const SWIPE_DISTANCE_PX    =  48;
    const SVG_NAMESPACE        =  'http://www.w3.org/2000/svg';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Elements and Current Point
    // ------------------------------------------------------------
    let Elements       =  null;
    let Survey         =  null;
    let Callbacks      =  null;
    let CurrentIndex   =  -1;
    let IsOpenNow      =  false;
    let SwipeStartX    =  null;
    let KeptMask       =  null;                                              // <-- Per point: false when the clipping box leaves it out
    const LocatorRings =  { Plan : null, Elevation : null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Locator Maps
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create an SVG Element
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__Svg(tagName, attributes) {
        const element  =  document.createElementNS(SVG_NAMESPACE, tagName);
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
        return element;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Small Sheet
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__BuildLocator(svgElement, sheet, sheetKey) {
        svgElement.replaceChildren();

        const fit    =  sheet.Fit;
        const toXY   =  (u, v) => {
            const model  =  DistoImageMapper__Coords__SheetToModel(fit, u, v, 0);
            return [model[fit.UAxis], -model[fit.VAxis]];                    // <-- SVG runs downward; the sheet's second axis runs up
        };

        const dots  =  sheet.Coordinates.map(coordinate => (coordinate ? toXY(coordinate.U, coordinate.V) : null));
        const known =  dots.filter(Boolean);
        if (!known.length) return;

        const xs      =  known.map(dot => dot[0]);
        const ys      =  known.map(dot => dot[1]);
        const minX    =  Math.min(...xs);
        const maxX    =  Math.max(...xs);
        const minY    =  Math.min(...ys);
        const maxY    =  Math.max(...ys);
        const span    =  Math.max(maxX - minX, maxY - minY, 1);
        const margin  =  span * 0.07;

        svgElement.setAttribute('viewBox', `${minX - margin} ${minY - margin} ${maxX - minX + margin * 2} ${maxY - minY + margin * 2}`);

        const path  =  sheet.Segments.map(segment => {
            const a  =  toXY(segment[0], segment[1]);
            const b  =  toXY(segment[2], segment[3]);
            return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
        }).join('');
        svgElement.appendChild(DistoImageMapper__Ui__Lightbox__Svg('path', { d : path, class : 'DistoImageMapper__Lightbox__LocatorLine' }));

        const radius  =  span * 0.0085;
        dots.forEach((dot, index) => {
            if (!dot) return;
            const group  =  DistoImageMapper__Ui__Lightbox__Svg('g', { 'data-index' : index, class : 'DistoImageMapper__Lightbox__LocatorDot' });
            group.appendChild(DistoImageMapper__Ui__Lightbox__Svg('circle', { cx : dot[0], cy : dot[1], r : radius * 3, fill : 'transparent' }));
            group.appendChild(DistoImageMapper__Ui__Lightbox__Svg('circle', { cx : dot[0], cy : dot[1], r : radius }));
            svgElement.appendChild(group);
        });

        const ring  =  DistoImageMapper__Ui__Lightbox__Svg('circle', { r : radius * 3, class : 'DistoImageMapper__Lightbox__LocatorRing' });
        svgElement.appendChild(ring);
        ring.userData      =  dots;
        LocatorRings[sheetKey]  =  ring;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Ring the Current Point on Both Maps
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__MoveRings(index) {
        for (const ring of Object.values(LocatorRings)) {
            if (!ring) continue;
            const dot  =  ring.userData[index];
            ring.style.display  =  dot ? '' : 'none';
            if (dot) {
                ring.setAttribute('cx', dot[0]);
                ring.setAttribute('cy', dot[1]);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filling the Details
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Distance Between Two Survey Points
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__Gap(a, b) {
        return Math.hypot(a.PositionMm.X - b.PositionMm.X, a.PositionMm.Y - b.PositionMm.Y, a.PositionMm.Z - b.PositionMm.Z);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Details Table
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__FillDetails(point, index) {
        const points    =  Survey.Points;
        const previous  =  points[index - 1];
        const next      =  points[index + 1];

        const rows  =  [
            ['X', DistoImageMapper__Format__CoordinateMm(point.PositionMm.X)],
            ['Y', DistoImageMapper__Format__CoordinateMm(point.PositionMm.Y)],
            ['Z', DistoImageMapper__Format__CoordinateMm(point.PositionMm.Z)]
        ];

        if (previous) rows.push([`From point ${previous.Number}`, DistoImageMapper__Format__Length(DistoImageMapper__Ui__Lightbox__Gap(point, previous))]);
        if (next)     rows.push([`To point ${next.Number}`, DistoImageMapper__Format__Length(DistoImageMapper__Ui__Lightbox__Gap(point, next))]);

        if (point.DistanceMm !== null) rows.push(['From tripod', DistoImageMapper__Format__Length(point.DistanceMm)]);
        if (point.HzDegrees !== null)  rows.push(['Horizontal angle', DistoImageMapper__Format__Angle(point.HzDegrees)]);
        if (point.VDegrees !== null)   rows.push(['Vertical angle', DistoImageMapper__Format__Angle(point.VDegrees)]);
        if (point.DateText)            rows.push(['Taken', `${DistoImageMapper__Format__Date(point.DateText)}, ${DistoImageMapper__Format__Time(point.TimeText)}`]);

        Elements.Details.replaceChildren();
        for (const [label, value] of rows) {
            const row   =  document.createElement('div');
            row.className  =  'DistoImageMapper__Lightbox__DetailRow';
            const term  =  document.createElement('dt');
            term.textContent  =  label;
            const data  =  document.createElement('dd');
            data.textContent  =  value;
            row.append(term, data);
            Elements.Details.appendChild(row);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show One Point
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__Show(index) {
        const point  =  Survey.Points[index];
        CurrentIndex  =  index;

        Elements.Title.textContent  =  `Point ${point.Number}`;
        const kept   =  Survey.Points.map((entry, i) => i).filter(i => !KeptMask || KeptMask[i] !== false);
        const place  =  kept.indexOf(index);
        Elements.Count.textContent  =  place >= 0 ? `${place + 1} of ${kept.length}` : `${index + 1} of ${Survey.Points.length}`;
        Elements.File.textContent   =  point.ImageName || 'No photo named in the survey';

        Elements.Image.hidden      =  !point.ImageUrl;
        Elements.NoPhoto.hidden    =  Boolean(point.ImageUrl);
        Elements.Size.textContent  =  '';
        if (point.ImageUrl) {
            Elements.Image.alt  =  `Photo at point ${point.Number}`;
            Elements.Image.src  =  point.ImageUrl;
        }

        DistoImageMapper__Ui__Lightbox__FillDetails(point, index);
        DistoImageMapper__Ui__Lightbox__MoveRings(index);
        DistoImageMapper__State__SetSelected(index);

        Elements.Previous.disabled  =  DistoImageMapper__Ui__Lightbox__Neighbour(index, -1) < 0;
        Elements.Next.disabled      =  DistoImageMapper__Ui__Lightbox__Neighbour(index, 1) < 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Opening and Closing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Move the Photo Between a Card's Rectangle and Its Own
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__Move(fromRect, toRect) {
        const image  =  Elements.Image;
        if (!fromRect || !toRect || !toRect.width || image.hidden) return null;

        const motion  =  image.animate([
            {
                transformOrigin : 'top left',
                transform       : `translate(${fromRect.left - toRect.left}px, ${fromRect.top - toRect.top}px) scale(${fromRect.width / toRect.width}, ${fromRect.height / toRect.height})`
            },
            { transformOrigin : 'top left', transform : 'none' }
        ], { duration : MOVE_MS, easing : 'cubic-bezier(0.2, 0.8, 0.2, 1)' });

        return motion;
    }
    // ------------------------------------------------------------


    // FUNCTION | Expand a Photo
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__Open(index, fromRect) {
        DistoImageMapper__Ui__Lightbox__Show(index);

        Elements.Root.hidden  =  false;
        void Elements.Root.offsetWidth;                                      // <-- Lay out first, so the fade starts from nothing
        Elements.Root.classList.add('is-open');
        IsOpenNow  =  true;

        DistoImageMapper__Ui__Lightbox__Move(fromRect, Elements.Image.getBoundingClientRect());
        Elements.Root.focus({ preventScroll : true });                       // <-- Tab starts inside the dialog, with no button ringed for a mouse user
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Lightbox
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__Close(toRect) {
        if (!IsOpenNow) return;
        IsOpenNow  =  false;

        Elements.Root.classList.remove('is-open');

        const image   =  Elements.Image;
        const hide    =  () => { Elements.Root.hidden  =  true; };
        const bounds  =  image.getBoundingClientRect();

        if (!toRect || image.hidden || !bounds.width) {
            window.setTimeout(hide, MOVE_MS * 0.6);
            return;
        }

        const motion  =  image.animate([
            { transformOrigin : 'top left', transform : 'none' },
            {
                transformOrigin : 'top left',
                transform       : `translate(${toRect.left - bounds.left}px, ${toRect.top - bounds.top}px) scale(${toRect.width / bounds.width}, ${toRect.height / bounds.height})`
            }
        ], { duration : MOVE_MS * 0.85, easing : 'cubic-bezier(0.4, 0, 0.6, 1)' });

        motion.onfinish  =  hide;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Next Point Kept by the Clipping Box, This Way, or -1
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__Neighbour(index, delta) {
        for (let i = index + delta; i >= 0 && i < Survey.Points.length; i += delta) {
            if (!KeptMask || KeptMask[i] !== false) return i;
        }
        return -1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Leave Out What the Clipping Box Leaves Out
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__SetKept(mask) {
        KeptMask  =  mask;
        for (const svg of [Elements.Plan, Elements.Elevation]) {
            svg.querySelectorAll('[data-index]').forEach(dot => {
                dot.setAttribute('display', mask && mask[Number(dot.getAttribute('data-index'))] === false ? 'none' : 'inline');
            });
        }
        if (IsOpenNow && CurrentIndex >= 0) DistoImageMapper__Ui__Lightbox__Show(CurrentIndex);
    }
    // ------------------------------------------------------------


    // FUNCTION | Step to the Next or Previous Point
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__Step(delta) {
        if (!IsOpenNow) return;
        const index  =  DistoImageMapper__Ui__Lightbox__Neighbour(CurrentIndex, delta);
        if (index >= 0) DistoImageMapper__Ui__Lightbox__Show(index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Lightbox Open
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__IsOpen() {
        return IsOpenNow;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Point on Show
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__CurrentIndex() {
        return CurrentIndex;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wiring
// -----------------------------------------------------------------------------

    // SUB FUNCTION | A Dot on a Locator Map Goes to Its Point
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Lightbox__HandleLocatorClick(event) {
        const group  =  event.target.closest('[data-index]');
        if (group) DistoImageMapper__Ui__Lightbox__Show(Number(group.getAttribute('data-index')));
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Lightbox (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__Mount(callbacks) {
        const byId  =  id => document.getElementById(`DistoImageMapper__Lightbox__${id}`);
        Callbacks   =  callbacks;

        Elements  =  {
            Root     :  document.getElementById('DistoImageMapper__Lightbox'),
            Scrim    :  byId('Scrim'),
            Figure   :  byId('Figure'),
            Image    :  byId('Image'),
            NoPhoto  :  byId('NoPhoto'),
            Size     :  byId('Size'),
            Title    :  byId('Title'),
            Count    :  byId('Count'),
            File     :  byId('File'),
            Details  :  byId('Details'),
            Plan     :  byId('PlanMap'),
            Elevation:  byId('ElevationMap'),
            Previous :  byId('Previous'),
            Next     :  byId('Next'),
            ShowIn3d :  byId('ShowIn3d'),
            Close    :  byId('Close')
        };

        Elements.Scrim.addEventListener('click', () => Callbacks.OnClose());
        Elements.Close.addEventListener('click', () => Callbacks.OnClose());
        Elements.ShowIn3d.addEventListener('click', () => Callbacks.OnShowIn3d(CurrentIndex));
        Elements.Previous.addEventListener('click', () => DistoImageMapper__Ui__Lightbox__Step(-1));
        Elements.Next.addEventListener('click', () => DistoImageMapper__Ui__Lightbox__Step(1));

        Elements.Plan.addEventListener('click', DistoImageMapper__Ui__Lightbox__HandleLocatorClick);
        Elements.Elevation.addEventListener('click', DistoImageMapper__Ui__Lightbox__HandleLocatorClick);

        Elements.Image.addEventListener('load', () => {
            Elements.Size.textContent  =  `${Elements.Image.naturalWidth} x ${Elements.Image.naturalHeight} px, as the DISTO saved it`;
        });

        Elements.Figure.addEventListener('pointerdown', event => { SwipeStartX  =  event.clientX; });
        Elements.Figure.addEventListener('pointerup', event => {
            if (SwipeStartX === null) return;
            const travelled  =  event.clientX - SwipeStartX;
            SwipeStartX      =  null;
            if (Math.abs(travelled) >= SWIPE_DISTANCE_PX) DistoImageMapper__Ui__Lightbox__Step(travelled < 0 ? 1 : -1);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Prepare for a Survey
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Lightbox__Build(survey) {
        Survey        =  survey;
        CurrentIndex  =  -1;
        KeptMask      =  null;

        DistoImageMapper__Ui__Lightbox__BuildLocator(Elements.Plan, survey.Sheets.Plan, 'Plan');
        DistoImageMapper__Ui__Lightbox__BuildLocator(Elements.Elevation, survey.Sheets.Elevation, 'Elevation');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
