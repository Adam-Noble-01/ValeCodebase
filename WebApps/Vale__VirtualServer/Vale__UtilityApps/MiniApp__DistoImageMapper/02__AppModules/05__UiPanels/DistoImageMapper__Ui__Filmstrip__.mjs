/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | FILMSTRIP
   =============================================================================

   FILE       : DistoImageMapper__Ui__Filmstrip__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Ui - Filmstrip
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every photo in survey order, linked to the 3D view
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Hover a photo here and it grows at its point in the model; hover one in the
     model and it lights up here. Click either to expand it.
   - The wheel scrolls the strip sideways.

   ============================================================================= */

import { DistoImageMapper__State__FocusIndex, DistoImageMapper__State__On, DistoImageMapper__State__SetHovered } from '../01__AppCore/DistoImageMapper__AppCore__State__.mjs';

// -----------------------------------------------------------------------------
// REGION | Filmstrip
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Elements
    // ------------------------------------------------------------
    let Strip       =  null;
    let Items       =  [];
    let FocusShown  =  -1;
    // ------------------------------------------------------------


    // SUB FUNCTION | Light Up the Focused Photo
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__Filmstrip__ShowFocus() {
        const focus  =  DistoImageMapper__State__FocusIndex();
        if (focus === FocusShown) return;

        if (Items[FocusShown]) Items[FocusShown].classList.remove('is-focus');
        FocusShown  =  focus;

        if (!Items[focus]) return;
        Items[focus].classList.add('is-focus');

        if (!Strip.matches(':hover')) {                                      // <-- Never scroll out from under the pointer
            Items[focus].scrollIntoView({ block : 'nearest', inline : 'nearest', behavior : 'smooth' });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Strip (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Filmstrip__Mount(stripElement) {
        Strip  =  stripElement;

        Strip.addEventListener('wheel', event => {
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;    // <-- A sideways scroll already works
            event.preventDefault();
            Strip.scrollLeft += event.deltaY;
        }, { passive : false });

        DistoImageMapper__State__On('FocusChanged', DistoImageMapper__Ui__Filmstrip__ShowFocus);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill the Strip From a Survey
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Filmstrip__Build(survey, onActivate) {
        Strip.replaceChildren();
        FocusShown  =  -1;

        Items  =  survey.Points.map((point, index) => {
            const item  =  document.createElement('button');
            item.type       =  'button';
            item.className  =  'DistoImageMapper__Filmstrip__Item';
            item.title      =  `Point ${point.Number}`;

            if (point.ImageUrl) {
                const image  =  document.createElement('img');
                image.loading   =  'lazy';
                image.decoding  =  'async';
                image.alt       =  `Point ${point.Number}`;
                image.src       =  point.ImageUrl;
                item.appendChild(image);
            }

            const tag  =  document.createElement('span');
            tag.className    =  'DistoImageMapper__Filmstrip__Tag';
            tag.textContent  =  String(point.Number);
            item.appendChild(tag);

            item.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') DistoImageMapper__State__SetHovered(index); });
            item.addEventListener('pointerleave', () => DistoImageMapper__State__SetHovered(-1));
            item.addEventListener('click', () => onActivate(index));

            Strip.appendChild(item);
            return item;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Tiles of the Points the Clipping Box Leaves Out
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__Filmstrip__SetKept(mask) {
        Items.forEach((item, index) => { item.hidden  =  Boolean(mask) && mask[index] === false; });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
