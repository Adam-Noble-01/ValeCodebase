// =============================================================================
// VALEVISION THEIA - FEATURE - PROJECT INDEX (STAFF, NO PROJECT CHOSEN)
// =============================================================================
//
// FILE       : Na__ProjectIndex__Page__.js
// NAMESPACE  : Na__ProjectIndex
// MODULE     : Feature - Project Index
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : /theia/ on its own: every project that has videos, newest first
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - Staff usually arrive from a project in ValeVision Gallery. Opened without
//   ?project=, Theia lists the projects with videos to watch, with a picture,
//   the number of videos and their running time.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.1
// - The copyright footer, as on the project pages.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Page
// -----------------------------------------------------------------------------

    import { Na__Api__Get } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Duration } from '../03__AppUtils/Na__AppUtils__Format__.js';


    // FUNCTION | Render the Index Into a Container
    // ------------------------------------------------------------
    async function Na__ProjectIndex__Render(container) {
        Na__Dom__Clear(container);
        container.classList.add('theia-index');
        container.appendChild(Na__Dom__El('h1', 'theia-index__title', 'Project videos'));
        container.appendChild(Na__Dom__El('p', 'theia-index__lead', 'Every project with videos to watch. Open a project from ValeVision Gallery to come straight to its videos.'));
        const grid = Na__Dom__El('div', 'theia-index__grid');
        container.appendChild(grid);
        const foot = Na__Dom__El('footer', 'theia-footer');                   // <-- Below the grid, whatever fills it
        foot.appendChild(Na__Dom__El('span', null, '© 2026 Vale Garden Houses. All rights reserved.'));
        container.appendChild(foot);
        let projects = [];
        try {
            projects = (await Na__Api__Get('projects')).projects || [];
        } catch (error) {
            grid.appendChild(Na__Dom__El('p', 'theia-empty', `The project list could not be loaded: ${error.message}`));
            return;
        }
        if (!projects.length) {
            grid.appendChild(Na__Dom__El('p', 'theia-empty', 'No project has videos yet. Publish a path from ValeVision 3D\'s Video Studio (Publish to Theia) and it appears here.'));
            return;
        }
        projects.forEach((p) => {
            const card = Na__Dom__El('a', 'theia-index__card', null, { href: `?project=${encodeURIComponent(p.id)}` });
            const thumb = Na__Dom__El('span', 'theia-index__thumb');
            if (p.thumbUrl) thumb.style.backgroundImage = `url("${p.thumbUrl}")`;
            else thumb.appendChild(Na__Dom__Icon('film'));
            const text = Na__Dom__El('span', 'theia-index__text');
            text.appendChild(Na__Dom__El('span', 'theia-index__name', p.title));
            const bits = [p.code, `${p.count} video${p.count === 1 ? '' : 's'}`, Na__Format__Duration(p.durationMs)].filter(Boolean);
            if (p.hiddenCount) bits.push(`${p.hiddenCount} hidden`);
            text.appendChild(Na__Dom__El('span', 'theia-index__meta', bits.join(' · ')));
            card.append(thumb, text);
            grid.appendChild(card);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__ProjectIndex__Render };

// endregion -------------------------------------------------------------------
