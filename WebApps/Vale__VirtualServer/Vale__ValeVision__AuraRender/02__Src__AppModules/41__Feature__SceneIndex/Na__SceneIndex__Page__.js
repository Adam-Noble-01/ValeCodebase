// =============================================================================
// VALEVISION AURA - FEATURE - SCENE INDEX (NO PROJECT CHOSEN)
// =============================================================================
//
// FILE       : Na__SceneIndex__Page__.js
// NAMESPACE  : Na__SceneIndex
// MODULE     : Feature - Scene Index
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : /aura/ on its own: a card for every project switched on for
//              AURA, then AURA's own scenes this person may open
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - As ValeVision Theia's project index (Adam, 30-Oct-2026: "show aura scenes
//   here like TheiaVideo"): GET api/projects (AuraRender__Api__Index__) gives
//   the cards, and each opens AURA at ?project=<id>.
// - Projects come first, with the Gallery's thumbnail, number, sheets and when
//   the drawing set was last saved. AURA's own scenes follow (Example Cottage
//   for managers, directors and admins; Test for Adam alone, marked "Only
//   you"). Both draw the engine's demo cottage.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.5.8).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Imports
// -----------------------------------------------------------------------------

    import { Na__Api__Get } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards
// -----------------------------------------------------------------------------

    const Na__SceneIndex__MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


    // HELPER FUNCTION | A Date as Adam Writes It: 30-Oct-2026
    // ------------------------------------------------------------
    function Na__SceneIndex__Date(iso) {
        const when = new Date(iso);
        if (Number.isNaN(when.getTime())) return '';
        return `${String(when.getDate()).padStart(2, '0')}-${Na__SceneIndex__MONTHS[when.getMonth()]}-${when.getFullYear()}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Card: a picture, the name, a line of facts, a scene's note
    // ------------------------------------------------------------
    function Na__SceneIndex__Card(p) {
        const scene = p.kind === 'scene';
        const card = Na__Dom__El('a', `aura-index__card${scene ? ' aura-index__card--scene' : ''}`, null, { href: `?project=${encodeURIComponent(p.id)}` });
        const thumb = Na__Dom__El('span', 'aura-index__thumb');
        if (p.thumbUrl) thumb.style.backgroundImage = `url("${p.thumbUrl}")`;
        else thumb.appendChild(Na__Dom__Icon(scene ? 'brush' : 'cube', 'aura-index__thumb-icon'));
        if (scene && p.audience === 'Owner') {                                   // <-- Nobody else sees it: say so on the card
            const tag = Na__Dom__El('span', 'aura-index__tag');
            tag.append(Na__Dom__Icon('lock'), Na__Dom__El('span', null, 'Only you'));
            thumb.appendChild(tag);
        }
        const text = Na__Dom__El('span', 'aura-index__text');
        text.appendChild(Na__Dom__El('span', 'aura-index__name', p.title));
        const facts = [scene ? 'AURA scene' : p.code,
                       `${p.sheets} sheet${p.sheets === 1 ? '' : 's'}`,
                       p.savedAt ? `saved ${Na__SceneIndex__Date(p.savedAt)}` : 'not saved yet'];
        if (!scene && !p.hasModel) facts.push('the demo cottage until its whitecard is synced');
        text.appendChild(Na__Dom__El('span', 'aura-index__meta', facts.filter(Boolean).join(' · ')));
        if (p.note) text.appendChild(Na__Dom__El('span', 'aura-index__note', p.note));
        card.append(thumb, text);
        return card;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Index in AURA's Main Area
    // ------------------------------------------------------------
    async function Na__SceneIndex__Render(root) {
        let section = document.getElementById('auraIndex');
        if (!section) {
            section = Na__Dom__El('section', 'aura-index', null, { id: 'auraIndex', 'aria-label': 'AURA scenes' });
            root.appendChild(section);
        }
        Na__Dom__Clear(section);
        section.hidden = false;
        section.appendChild(Na__Dom__El('h1', 'aura-index__title', 'AURA scenes'));
        section.appendChild(Na__Dom__El('p', 'aura-index__lead', 'Every project switched on for AURA, then AURA\'s own scenes. A project appears here once it is ticked "Available in ValeVision AURA" in ValeVision Gallery\'s Project Editor.'));
        const grid = Na__Dom__El('div', 'aura-index__grid');
        section.appendChild(grid);
        const foot = Na__Dom__El('footer', 'aura-index__footer');               // <-- Below the grid, whatever fills it
        foot.appendChild(Na__Dom__El('span', null, '© 2026 Vale Garden Houses. All rights reserved.'));
        section.appendChild(foot);
        let cards = [];
        try {
            cards = (await Na__Api__Get('projects')).projects || [];
        } catch (error) {
            grid.appendChild(Na__Dom__El('p', 'aura-index__empty', `The list could not be loaded: ${error.message}`));
            return;
        }
        if (!cards.length) {
            grid.appendChild(Na__Dom__El('p', 'aura-index__empty', 'Nothing is switched on for AURA yet. Tick "Available in ValeVision AURA" in a project\'s Project Editor in ValeVision Gallery.'));
            return;
        }
        cards.forEach((p) => grid.appendChild(Na__SceneIndex__Card(p)));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__SceneIndex__Render };

// endregion -------------------------------------------------------------------
