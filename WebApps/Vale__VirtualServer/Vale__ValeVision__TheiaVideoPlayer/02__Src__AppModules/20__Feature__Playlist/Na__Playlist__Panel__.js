// =============================================================================
// VALEVISION THEIA - FEATURE - PLAYLIST (THE "IN THIS PROJECT" LIST)
// =============================================================================
//
// FILE       : Na__Playlist__Panel__.js
// NAMESPACE  : Na__Playlist
// MODULE     : Feature - Playlist
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The project's videos beside the player, in playing order: a picture,
//              a title and the length of each
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - Order: as published from ValeVision 3D's Video Studio, or as a manager set
//   it in Theia (the data file's order). Several schemes are shown under their
//   own headings.
// - A thin line under each picture shows how much of that video is already on
//   this device (the media cache), so a full line means it plays offline.
// - Managers see hidden and below-2K videos, greyed and labelled, and can move
//   a video up or down and hide or show it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Playlist
// -----------------------------------------------------------------------------

    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Duration, Na__Format__Scheme } from '../03__AppUtils/Na__AppUtils__Format__.js';


    // FUNCTION | Build the Panel: { onSelect(video), canEdit, onMove(id, direction), onToggleVisible(video) }
    // ------------------------------------------------------------
    function Na__Playlist__Build(container, options) {
        const opts = options || {};
        container.classList.add('theia-playlist');
        const heading = Na__Dom__El('h2', 'theia-playlist__title', 'In this project');
        const list = Na__Dom__El('div', 'theia-playlist__list', null, { role: 'list' });
        container.append(heading, list);
        const rows = new Map();
        let currentId = null;

        const render = (videos, schemes) => {
            Na__Dom__Clear(list);
            rows.clear();
            const grouped = (schemes || []).length > 1;
            let lastScheme = null;
            videos.forEach((video, index) => {
                if (grouped && video.scheme !== lastScheme) {
                    lastScheme = video.scheme;
                    list.appendChild(Na__Dom__El('div', 'theia-playlist__scheme', Na__Format__Scheme(video.scheme)));
                }
                const row = Na__Dom__El('div', 'theia-playlist__item', null, { role: 'listitem' });
                row.classList.toggle('is-hidden-video', video.visible === false);
                row.classList.toggle('is-below-floor', !!video.belowMinimum);
                const button = Na__Dom__El('button', 'theia-playlist__button', null, { type: 'button', title: video.title });
                const thumb = Na__Dom__El('span', 'theia-playlist__thumb');
                if (video.thumbUrl) thumb.style.backgroundImage = `url("${video.thumbUrl}")`;
                else thumb.appendChild(Na__Dom__Icon('film', 'theia-playlist__thumb-icon'));
                const playing = Na__Dom__El('span', 'theia-playlist__now', 'Playing');
                const cached = Na__Dom__El('span', 'theia-playlist__cached');
                const cachedFill = Na__Dom__El('span', 'theia-playlist__cached-fill');
                cached.appendChild(cachedFill);
                thumb.append(playing, cached);
                const text = Na__Dom__El('span', 'theia-playlist__text');
                text.appendChild(Na__Dom__El('span', 'theia-playlist__name', video.title));
                const meta = Na__Dom__El('span', 'theia-playlist__meta', Na__Format__Duration(video.durationMs));
                if (video.file) meta.appendChild(Na__Dom__El('span', 'theia-playlist__quality', video.file.quality));
                text.appendChild(meta);
                if (video.visible === false) text.appendChild(Na__Dom__El('span', 'theia-tag', 'Hidden'));
                if (video.belowMinimum) text.appendChild(Na__Dom__El('span', 'theia-tag theia-tag--warn', 'Below 2K'));
                button.append(thumb, text);
                button.addEventListener('click', () => { if (video.playable !== false && typeof opts.onSelect === 'function') opts.onSelect(video); });
                row.appendChild(button);

                if (opts.canEdit) {
                    const tools = Na__Dom__El('div', 'theia-playlist__tools');
                    const up = Na__Dom__IconButton('up', 'theia-playlist__tool', null, 'Move up');
                    const down = Na__Dom__IconButton('down', 'theia-playlist__tool', null, 'Move down');
                    const eye = Na__Dom__IconButton(video.visible === false ? 'eyeOff' : 'eye', 'theia-playlist__tool', null,
                                                    video.visible === false ? 'Hidden from clients and staff: show it' : 'Hide this video');
                    up.disabled = index === 0;
                    down.disabled = index === videos.length - 1;
                    up.addEventListener('click', () => opts.onMove(video.id, -1));
                    down.addEventListener('click', () => opts.onMove(video.id, 1));
                    eye.addEventListener('click', () => opts.onToggleVisible(video));
                    tools.append(up, down, eye);
                    row.appendChild(tools);
                }
                list.appendChild(row);
                rows.set(video.id, { row, thumb, cachedFill });
            });
            if (currentId) setCurrent(currentId);
        };

        const setCurrent = (id) => {
            currentId = id;
            rows.forEach((r, key) => {
                r.row.classList.toggle('is-current', key === id);
                const button = r.row.querySelector('.theia-playlist__button');
                if (key === id) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
            });
        };

        return {
            render,
            setCurrent,
            setCached(id, fraction) {
                const r = rows.get(id);
                if (!r) return;
                r.cachedFill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
                r.row.classList.toggle('is-cached', fraction >= 0.999);
            },
            setThumb(id, url) {
                const r = rows.get(id);
                if (!r || !url) return;
                const icon = r.thumb.querySelector('.theia-playlist__thumb-icon');
                if (icon) icon.remove();
                r.thumb.style.backgroundImage = `url("${url}")`;
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Playlist__Build };

// endregion -------------------------------------------------------------------
