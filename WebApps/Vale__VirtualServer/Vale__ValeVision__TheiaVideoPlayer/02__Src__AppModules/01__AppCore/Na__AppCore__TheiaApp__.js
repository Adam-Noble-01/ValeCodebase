// =============================================================================
// VALEVISION THEIA - APP CORE - THE APP (START-UP, PAGES, WIRING)
// =============================================================================
//
// FILE       : Na__AppCore__TheiaApp__.js
// NAMESPACE  : Na__Theia
// MODULE     : App Core
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Start ValeVision Theia: decide who is watching, open the project,
//              and wire the player, the list, the details and the cache together
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - TWO WAYS IN:
//     /theia/?project=<id>&share=<token>   A CLIENT (no account): the player and
//                                          the video list only. No gallery, no
//                                          sign-in, no editing.
//     /theia/?project=<id>[&video=<id>][&t=<seconds>]
//                                          STAFF (Employee and up, signed in with
//                                          the shared Vale sign-in): breadcrumbs
//                                          back to ValeVision Gallery, Share, and
//                                          for managers editing.
//     /theia/                               staff: the projects that have videos.
// - THE MEDIA CACHE STARTS FIRST (Na__MediaCache__Start) and the player waits for
//   it, so the very first video is kept on the device as it plays.
// - THE START-UP SPINNER (index.html, the same one ValeVision 3D shows) stays
//   until the first video has a few seconds on the device
//   (Player__StartupBufferSeconds, never longer than Player__StartupMaxWaitMs),
//   so pressing play starts at once.
// - ONE FILE PER VIDEO (video.file): no quality to choose or switch.
// - The connection estimate is fed by the service worker's chunk timings.
// - Auto-advance: at the end of a video, the next one starts after a countdown
//   (Player__AutoAdvanceSeconds); fullscreen carries on.
// - Edits and reorders return the whole list, which is redrawn; a 409 (someone
//   else saved first) redraws what is on the server and says so.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.5
// - window.ValeAppUpdate__CanReload: after a source push, Theia reloads by itself
//   when it comes back to the screen with no video playing, no dialog and no
//   edit open; otherwise the shared bar offers Reload.
//
// 07-Oct-2026 - Version 1.0.4
// - Escape, or a click on the page outside the player, pauses the video, so the
//   page fades back from cinema (Adam).
//
// 07-Oct-2026 - Version 1.0.3
// - The "Your connection is slower than this video needs" banner is gone
//   (Adam: not helpful, and annoying). A slow connection still fetches ahead
//   as before; it is just no longer announced. The mobile data notice stays.
//
// 07-Oct-2026 - Version 1.0.2
// - The header is ValeVision 3D's: "ValeVision THEIA" at the right in its title
//   style, then the shared user bubble. A client's link gets the bubble's guest
//   state (ValeUserLogin.Guest: "Shared with you by Vale Garden Houses", the
//   link's end date, Copy a link to this video). The project's name and number
//   moved out of the header to above the video's title (Adam's notes).
//
// 07-Oct-2026 - Version 1.0.1
// - Client footer is now a standard copyright line, "(c) 2026 Vale Garden
//   Houses. All rights reserved.", in place of "Shared with you by Vale Garden
//   Houses. Videos play in full quality and are kept on this device...".
//   Shown to signed-in staff as well as on client links, and on the staff
//   project index.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build. The same day, on Adam's notes: one file per video, the
//   start-up spinner, and the player and its details sharing one stage so the
//   title and buttons line up with the video's edges.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Load, Na__AppConfig__Get } from './Na__AppCore__AppConfig__.js';
    import { Na__Api__Get, Na__Api__Patch, Na__Api__Post, Na__Api__SetShareToken } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Clock, Na__Format__Date } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__Prefs__GetResume } from '../03__AppUtils/Na__AppUtils__Prefs__.js';
    import { Na__MediaCache__Start, Na__MediaCache__OnEvent, Na__MediaCache__Cached, Na__MediaCache__PurgeStale,
             Na__MediaCache__Persist, Na__MediaCache__Evict, Na__MediaCache__IsActive } from '../10__System__MediaCache/Na__MediaCache__Client__.js';
    import { Na__Prefetch__Forget, Na__Prefetch__OnChunk } from '../10__System__MediaCache/Na__MediaCache__Prefetcher__.js';
    import { Na__Connection__AddSample, Na__Connection__IsMetered } from '../11__System__Quality/Na__Quality__ConnectionMonitor__.js';
    import { Na__Player__Controller } from '../12__System__Player/Na__Player__Controller__.js';
    import { Na__PlayerUi__Build } from '../12__System__Player/Na__Player__Controls__.js';
    import { Na__Fullscreen__Element, Na__Fullscreen__Enter, Na__Fullscreen__Toggle } from '../12__System__Player/Na__Player__Fullscreen__.js';
    import { Na__Cinema__Attach, Na__Cinema__LeaveOnOutsideClick } from '../12__System__Player/Na__Player__CinemaMode__.js';
    import { Na__Keys__Attach } from '../12__System__Player/Na__Player__Keyboard__.js';
    import { Na__Playlist__Build } from '../20__Feature__Playlist/Na__Playlist__Panel__.js';
    import { Na__Details__Build } from '../21__Feature__VideoDetails/Na__VideoDetails__Panel__.js';
    import { Na__Share__Open, Na__Share__Copy, Na__Share__Url } from '../22__Feature__ShareLinks/Na__ShareLinks__Dialog__.js';
    import { Na__ProjectIndex__Render } from '../23__Feature__ProjectIndex/Na__ProjectIndex__Page__.js';
    import { Na__Posters__FillMissing } from '../24__Feature__Posters/Na__Posters__FromVideo__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Theia__LOGO     = '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
    const Na__Theia__GALLERY  = '/project-gallery/';
    const Na__Theia__Params   = new URLSearchParams(window.location.search);
    const Na__Theia__ViewKey  = 'ValeVisionTheia__CountedViews';

    const Na__Theia__State = {
        mode       : 'staff',       // <-- 'staff' or 'client'
        projectId  : '',
        project    : null,
        videos     : [],            // <-- Everything this audience sees, in order
        schemes    : [],
        can        : {},
        rev        : 0,
        current    : null,
        controller : null,
        ui         : null,
        playlist   : null,
        details    : null,
        playerHost : null,
        persisted  : false
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Only the Videos That Can Play, in Order
    // ------------------------------------------------------------
    function Na__Theia__Playable() {
        return Na__Theia__State.videos.filter((v) => v.playable !== false && v.file && v.visible !== false);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Whole-Page Message (link off, not found, offline)
    // ------------------------------------------------------------
    function Na__Theia__Message(root, title, text, action) {
        Na__Dom__Clear(root);
        if (title !== 'Opening videos…') Na__Theia__Loader.hide();              // <-- A real message: nothing left to wait for
        const box = Na__Dom__El('div', 'theia-message');
        box.appendChild(Na__Dom__Icon('film', 'theia-message__icon'));
        box.appendChild(Na__Dom__El('h1', 'theia-message__title', title));
        box.appendChild(Na__Dom__El('p', 'theia-message__text', text));
        if (action) {
            const button = Na__Dom__El('button', 'theia-button theia-button--primary', action.label, { type: 'button' });
            button.addEventListener('click', action.onClick);
            box.appendChild(button);
        }
        root.appendChild(box);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Start-Up Spinner: change its words, or lift it (index.html draws it)
    // ------------------------------------------------------------
    const Na__Theia__Loader = {
        say(text) {
            const line = document.getElementById('theiaLoadingText');
            if (line && text) line.textContent = text;
        },
        hide() {
            const overlay = document.getElementById('theiaLoadingOverlay');
            if (!overlay || overlay.classList.contains('hidden')) return;
            overlay.classList.add('hidden');                                     // <-- Fades out, as ValeVision 3D's does
            setTimeout(() => overlay.remove(), 700);
        }
    };
    // ------------------------------------------------------------


    // FUNCTION | Lift the Spinner Once the First Video Has a Few Seconds on the Device
    // ------------------------------------------------------------
    async function Na__Theia__LiftWhenBuffered(controller) {
        const want = Number(Na__AppConfig__Get('Player__StartupBufferSeconds', 5)) || 0;
        const maxWait = Number(Na__AppConfig__Get('Player__StartupMaxWaitMs', 8000)) || 8000;
        const video = controller.video;
        const started = performance.now();
        Na__Theia__Loader.say('Preparing the first video…');
        const buffered = () => {
            for (let i = 0; i < video.buffered.length; i++) {
                if (video.buffered.start(i) <= video.currentTime + 0.5) return video.buffered.end(i) - video.currentTime;
            }
            return 0;
        };
        while (want > 0 && performance.now() - started < maxWait && controller.file) {
            const duration = video.duration || ((controller.item && controller.item.durationMs) || 0) / 1000;
            const enough = duration ? Math.min(want, duration - (video.currentTime || 0)) : want;
            const ahead = await controller.aheadSeconds();
            if ((ahead !== null && ahead >= enough) || buffered() >= enough || video.readyState >= 4) break;
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        Na__Theia__Loader.hide();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Guest Bubble on a Client's Link (the shared sign-in's guest state)
    // ------------------------------------------------------------
    // share: the link's details from the API ({ label, expiresIso }), or null
    // before the first answer. The label is staff's own note, so it is not shown.
    // ------------------------------------------------------------
    function Na__Theia__Guest(share) {
        if (!window.ValeUserLogin || typeof window.ValeUserLogin.Guest !== 'function') return;   // <-- An older shared sign-in: no bubble
        window.ValeUserLogin.Guest({
            mountEl   : '#theiaUserSlot',
            name      : 'Guest',
            detail    : 'View only',
            notes     : ['Shared with you by Vale Garden Houses.',
                         share && share.expiresIso ? `This link works until ${Na__Format__Date(share.expiresIso)}.` : ''],
            menuItems : [{ label: 'Copy a link to this video', onClick: () => Na__Share__Copy(window.location.href) }]
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Project's Name and Number, as Under the Video ("Holt - 64135")
    // ------------------------------------------------------------
    function Na__Theia__ProjectLine() {
        const p = Na__Theia__State.project;
        return p ? `${p.code ? `${p.code} - ` : ''}${p.title}` : '';         // <-- "64135 - Holt", ahead of the video's title
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Count a Client's Visit Once per Browser Session
    // ------------------------------------------------------------
    function Na__Theia__FirstVisit(token) {
        try {
            const seen = JSON.parse(window.sessionStorage.getItem(Na__Theia__ViewKey) || '[]');
            if (seen.indexOf(token) >= 0) return false;
            seen.push(token);
            window.sessionStorage.setItem(Na__Theia__ViewKey, JSON.stringify(seen.slice(-20)));
            return true;
        } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep the Address Bar on the Video Being Watched
    // ------------------------------------------------------------
    function Na__Theia__SetUrl(videoId) {
        const url = new URL(window.location.href);
        url.searchParams.set('video', videoId);
        url.searchParams.delete('t');
        window.history.replaceState(null, '', url.href);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Project Page
// -----------------------------------------------------------------------------

    // FUNCTION | Take a Videos Answer From the API Into the Page
    // ------------------------------------------------------------
    function Na__Theia__Apply(answer) {
        const S = Na__Theia__State;
        S.videos = answer.videos || [];
        S.schemes = (answer.library && answer.library.schemes) || [];
        S.rev = (answer.library && answer.library.rev) || 0;
        S.can = answer.can || S.can;
        if (S.playlist) S.playlist.render(S.videos, S.schemes);
        if (S.controller) {
            S.controller.setPlaylist(Na__Theia__Playable());
            const fresh = S.current && S.videos.find((v) => v.id === S.current.id);
            if (fresh) {
                const changed = (fresh.file && fresh.file.url) !== (S.current.file && S.current.file.url);
                S.current = fresh;
                S.controller.item = fresh;
                if (changed) S.controller.reload(fresh);
                if (S.details) S.details.render(fresh);
                if (S.playlist) S.playlist.setCurrent(fresh.id);
            }
        }
        Na__Theia__RefreshCached();
    }
    // ------------------------------------------------------------


    // FUNCTION | Watch a Video: { autoplay, startTime }
    // ------------------------------------------------------------
    function Na__Theia__Select(video, options) {
        const S = Na__Theia__State;
        const opts = options || {};
        if (!video.file) {
            Na__Toast__Show('This video is below the 2K minimum, so it cannot be played. Publish it again at 2K or 4K.', { error: true });
            return;
        }
        S.current = video;
        let startTime = opts.startTime;
        let resumed = false;
        if (startTime === undefined) {
            startTime = Na__Prefs__GetResume(S.projectId, video.id);
            resumed = startTime > 0;
        }
        S.controller.load(video, { startTime, autoplay: !!opts.autoplay });
        S.playlist.setCurrent(video.id);
        S.details.render(video);
        Na__Theia__SetUrl(video.id);
        if (resumed) {
            Na__Toast__Show(`Carrying on from ${Na__Format__Clock(startTime)}`, { action: { label: 'Start over', onClick: () => S.controller.seek(0) } });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Press Play on the Player: play, and fill the screen
    // ------------------------------------------------------------
    function Na__Theia__PrimaryPlay() {
        const S = Na__Theia__State;
        S.controller.play();                                                 // <-- First, inside the click (iPhone, iPad)
        if (Na__AppConfig__Get('Player__AutoFullscreenOnPlay', true) && !Na__Fullscreen__Element()) {
            Na__Fullscreen__Enter(S.playerHost, S.controller.video);
        }
        if (!S.persisted) { S.persisted = true; Na__MediaCache__Persist(); }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Next / Previous Playable Video, or null
    // ------------------------------------------------------------
    function Na__Theia__Neighbour(step) {
        const list = Na__Theia__Playable();
        const at = list.findIndex((v) => Na__Theia__State.current && v.id === Na__Theia__State.current.id);
        return at >= 0 ? list[at + step] || null : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Much of Each Video Is on This Device (the thin line in the list)
    // ------------------------------------------------------------
    let Na__Theia__CachedBusy = false;
    async function Na__Theia__RefreshCached() {
        const S = Na__Theia__State;
        if (!S.controller || !S.playlist || !Na__MediaCache__IsActive() || Na__Theia__CachedBusy) return;
        Na__Theia__CachedBusy = true;
        try {
            const pairs = Na__Theia__Playable().map((v) => [v.id, v.file]).filter(([, f]) => f);
            const cached = await Na__MediaCache__Cached(pairs.map(([, r]) => r.url));
            pairs.forEach(([id, r]) => {
                const info = cached[r.url];
                if (info && info.size) S.playlist.setCached(id, info.cachedBytes / info.size);
            });
        } finally {
            Na__Theia__CachedBusy = false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Project's Videos
    // ------------------------------------------------------------
    async function Na__Theia__OpenProject(root, projectId) {
        const S = Na__Theia__State;
        S.projectId = projectId;
        Na__Theia__Message(root, 'Opening videos…', '');
        let answer;
        try {
            const view = S.mode === 'client' && Na__Theia__FirstVisit(Na__Theia__Params.get('share')) ? '?view=1' : '';
            answer = await Na__Api__Get(`projects/${encodeURIComponent(projectId)}/videos${view}`);
        } catch (error) {
            if (error.data && error.data.shareInvalid) {
                Na__Theia__Message(root, 'This link is no longer active', 'It has expired or been switched off. Ask Vale Garden Houses for a new link.');
            } else if (error.status === 404) {
                Na__Theia__Message(root, 'Project not found', 'There is no project at this address. Check the link you were sent.');
            } else if (error.status === 403) {
                Na__Theia__Message(root, 'Not available', error.message);
            } else {
                Na__Theia__Message(root, 'Videos could not be loaded', error.message, { label: 'Try again', onClick: () => Na__Theia__OpenProject(root, projectId) });
            }
            return;
        }
        S.project = answer.project;
        document.title = S.mode === 'client' ? `${S.project.title} · Vale Garden Houses` : `${S.project.title} · ValeVision Theia`;
        if (S.mode === 'client') Na__Theia__Guest(answer.share || null);      // <-- Now the link's end date is known

        // LAYOUT | Breadcrumbs (staff), player and details, the list
        Na__Dom__Clear(root);
        const page = Na__Dom__El('div', 'theia-page');
        if (S.mode === 'staff') {
            const crumbs = Na__Dom__El('nav', 'theia-crumbs', null, { 'aria-label': 'Breadcrumb' });
            const back = Na__Dom__El('a', 'theia-crumbs__link', null, { href: Na__Theia__GALLERY });
            back.append(Na__Dom__Icon('back', 'theia-crumbs__chevron'), Na__Dom__El('span', null, 'Project Gallery'));
            const projectLink = Na__Dom__El('a', 'theia-crumbs__link', null, { href: S.project.galleryUrl || Na__Theia__GALLERY });
            projectLink.append(Na__Dom__El('strong', null, S.project.title), Na__Dom__El('span', 'theia-crumbs__code', S.project.code ? ` - ${S.project.code}` : ''));
            crumbs.append(back, Na__Dom__El('span', 'theia-crumbs__sep', '/'), projectLink, Na__Dom__El('span', 'theia-crumbs__sep', '/'),
                          Na__Dom__El('span', 'theia-crumbs__current', 'Videos'));
            page.appendChild(crumbs);
        }
        const layout = Na__Dom__El('div', 'theia-layout');
        const main = Na__Dom__El('div', 'theia-layout__main');
        const stage = Na__Dom__El('div', 'theia-stage');                      // <-- The player and its details share its width and edges
        const playerHost = Na__Dom__El('div', 'theia-player-host');
        const detailsHost = Na__Dom__El('div');
        stage.append(playerHost, detailsHost);
        main.appendChild(stage);
        const side = Na__Dom__El('aside', 'theia-layout__side');
        layout.append(main, side);
        page.appendChild(layout);
        const foot = Na__Dom__El('footer', 'theia-footer');                   // <-- Every view, staff and client
        foot.appendChild(Na__Dom__El('span', null, '© 2026 Vale Garden Houses. All rights reserved.'));   // <-- As the Help pages' footer
        page.appendChild(foot);
        root.appendChild(page);

        S.videos = answer.videos || [];
        S.schemes = answer.library.schemes || [];
        S.rev = answer.library.rev || 0;
        S.can = answer.can || {};
        if (!Na__Theia__Playable().length) {
            Na__Theia__Loader.hide();
            Na__Dom__Clear(main).appendChild(Na__Dom__El('div', 'theia-empty',
                S.mode === 'client' ? 'There are no videos to watch here yet.'
                                    : 'No videos for this project yet. Publish a path from ValeVision 3D\'s Video Studio (Publish to Theia), or drop MP4 files of at least 2K into the project\'s ValeVision__TheiaVideo/Content__VideoFiles folder.'));
        }

        // PLAYER
        const video = document.createElement('video');
        S.playerHost = playerHost;
        S.controller = new Na__Player__Controller(video, projectId);
        S.ui = Na__PlayerUi__Build(playerHost, S.controller, { onPrimaryPlay: Na__Theia__PrimaryPlay });
        Na__Cinema__Attach(video);
        Na__Cinema__LeaveOnOutsideClick(stage, () => S.controller.pause());
        window.ValeAppUpdate__CanReload = () =>                               // <-- After a push (ValeShared__AppUpdate__): reload by itself only when nothing is lost
            video.paused && !S.controller.runway && !document.querySelector('.theia-dialog, .theia-details__form');
        Na__Keys__Attach({
            toggle         : () => S.controller.toggle(),
            stop           : () => S.controller.pause(),
            seekBy         : (d) => S.controller.seekBy(d),
            seekTo         : (t) => S.controller.seek(t === Infinity ? (video.duration || 0) : t),
            seekToFraction : (f) => S.controller.seek(f * (video.duration || 0)),
            fullscreen     : () => Na__Fullscreen__Toggle(playerHost, video),
            mute           : () => S.controller.toggleMute(),
            next           : () => { const n = Na__Theia__Neighbour(1); if (n) Na__Theia__Select(n, { autoplay: true, startTime: 0 }); },
            previous       : () => { const p = Na__Theia__Neighbour(-1); if (p) Na__Theia__Select(p, { autoplay: true, startTime: 0 }); }
        });

        // DETAILS AND LIST
        S.details = Na__Details__Build(detailsHost, {
            can        : S.can,
            projectLine: Na__Theia__ProjectLine,
            showScheme : () => S.schemes.length > 1,
            onShare    : () => Na__Share__Open({ project: S.project, videos: S.videos, video: S.current, time: video.currentTime || 0 }),
            onSave     : async (changes) => {
                try {
                    const result = await Na__Api__Patch(`projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(S.current.id)}`,
                                                        Object.assign({ _rev: S.rev }, changes));
                    Na__Theia__Apply(result);
                    Na__Toast__Show(result.valevision3dSynced ? 'Saved, here and in ValeVision 3D' : 'Saved');
                } catch (error) {
                    if (error.status === 409 && error.data.videos) {
                        Na__Theia__Apply(error.data);
                        Na__Toast__Show('Someone else changed these videos first. This is what is on the server now.', { error: true });
                        return;
                    }
                    throw error;
                }
            }
        });
        S.playlist = Na__Playlist__Build(side, {
            canEdit         : !!S.can.edit,
            onSelect        : (v) => Na__Theia__Select(v, { autoplay: true, startTime: Na__Prefs__GetResume(projectId, v.id) }),
            onMove          : async (id, direction) => {
                const ids = S.videos.map((v) => v.id);
                const at = ids.indexOf(id), to = at + direction;
                if (at < 0 || to < 0 || to >= ids.length) return;
                ids.splice(to, 0, ids.splice(at, 1)[0]);
                try { Na__Theia__Apply(await Na__Api__Post(`projects/${encodeURIComponent(projectId)}/videos/order`, { order: ids, _rev: S.rev })); }
                catch (error) { if (error.data && error.data.videos) Na__Theia__Apply(error.data); Na__Toast__Show(error.message, { error: true }); }
            },
            onToggleVisible : async (v) => {
                try {
                    Na__Theia__Apply(await Na__Api__Patch(`projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(v.id)}`, { visible: v.visible === false, _rev: S.rev }));
                    Na__Toast__Show(v.visible === false ? `"${v.title}" is shown again` : `"${v.title}" is hidden from clients and staff`);
                } catch (error) { if (error.data && error.data.videos) Na__Theia__Apply(error.data); Na__Toast__Show(error.message, { error: true }); }
            }
        });
        S.playlist.render(S.videos, S.schemes);
        S.controller.setPlaylist(Na__Theia__Playable());

        // EVENTS | Up next, a step down, connection notices
        S.controller.addEventListener('ended', () => {
            const next = Na__Theia__Neighbour(1);
            const seconds = Number(Na__AppConfig__Get('Player__AutoAdvanceSeconds', 6)) || 0;
            if (next && seconds > 0) S.ui.showUpNext({ item: next, seconds, onPlay: () => Na__Theia__Select(next, { autoplay: true, startTime: 0 }) });
        });
        S.controller.addEventListener('sourcechange', () => Na__Theia__RefreshCached());
        S.controller.addEventListener('fatal', () => Na__Theia__Loader.hide());
        if (Na__Connection__IsMetered()) {
            S.ui.setNotice({ kind: 'metered', text: 'You are on mobile data. Theia\'s videos are full-quality files, so Wi-Fi is recommended; only the start of the next videos is saved ahead.' });
        }

        // FIRST VIDEO | ?video= or the first; ?t= or where the viewer stopped
        const playable = Na__Theia__Playable();
        const wanted = Na__Theia__Params.get('video');
        const first = playable.find((v) => v.id === wanted) || playable[0];
        if (first) {
            const t = Number(Na__Theia__Params.get('t'));
            Na__Theia__Select(first, { autoplay: false, startTime: Number.isFinite(t) && t > 0 && wanted === first.id ? t : undefined });
            Na__Theia__LiftWhenBuffered(S.controller);
        } else {
            Na__Theia__Loader.hide();
        }

        // HOUSEKEEPING | Older copies of these files go; the list shows what is held; pictures for videos without
        Na__MediaCache__PurgeStale(playable.map((v) => v.file.url));
        Na__Prefetch__OnChunk(() => { clearTimeout(Na__Theia__OpenProject.cachedTimer); Na__Theia__OpenProject.cachedTimer = setTimeout(Na__Theia__RefreshCached, 800); });
        setInterval(Na__Theia__RefreshCached, 5000);
        setTimeout(() => Na__Posters__FillMissing(projectId, Na__Theia__Playable(), !!S.can.edit, (v, local, saved) => {
            if (saved) { Na__Theia__Apply(saved); return; }
            S.playlist.setThumb(v.id, local.thumbUrl);
            const live = S.videos.find((x) => x.id === v.id);
            if (live) { live.thumbUrl = live.thumbUrl || local.thumbUrl; live.posterUrl = live.posterUrl || local.posterUrl; }
            if (S.current && S.current.id === v.id && !video.getAttribute('poster')) video.poster = local.posterUrl;
        }), 3000);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start-Up
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What the Service Worker Tells Us
    // ------------------------------------------------------------
    async function Na__Theia__OnWorker(event) {
        const S = Na__Theia__State;
        if (event.type === 'theia-sample') {
            Na__Connection__AddSample(event.bytes, event.ms);
        } else if (event.type === 'theia-media-changed' && S.projectId) {
            Na__Prefetch__Forget(event.url);
            try {
                Na__Theia__Apply(await Na__Api__Get(`projects/${encodeURIComponent(S.projectId)}/videos`));
                Na__Toast__Show('A video was updated on the server; the new version is playing.');
            } catch (error) { /* the next load picks it up */ }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Start the App
    // ------------------------------------------------------------
    async function Na__Theia__Boot() {
        const root = document.getElementById('theiaRoot');
        const S = Na__Theia__State;
        const projectId = (Na__Theia__Params.get('project') || '').trim();
        const share = (Na__Theia__Params.get('share') || '').trim();
        await Na__AppConfig__Load();
        const cacheReady = Na__MediaCache__Start();
        Na__MediaCache__OnEvent(Na__Theia__OnWorker);
        const brand = document.querySelector('.theia-header__brand');

        if (share && projectId) {
            S.mode = 'client';
            document.body.classList.add('theia--client');
            Na__Theia__Guest(null);                                          // <-- The guest bubble at once; its end date follows
            Na__Api__SetShareToken(share);
            await cacheReady;
            await Na__Theia__OpenProject(root, projectId);
            return;
        }

        S.mode = 'staff';
        document.body.classList.add('theia--staff');
        if (brand) brand.setAttribute('href', Na__Theia__GALLERY);
        window.ValeUserLogin.Init({
            appName   : 'ValeVision THEIA',
            logoUrl   : Na__Theia__LOGO,
            apiBase   : 'api/',
            mountEl   : '#theiaUserSlot',
            required  : true,
            menuItems : [
                { label: 'Open ValeVision Gallery', onClick: () => { window.location.href = Na__Theia__GALLERY; } },
                { label: 'All project videos', onClick: () => { window.location.href = Na__Share__Url({}); } },
                ...(projectId ? [
                    { label: 'Copy a staff link to this video', onClick: () => Na__Share__Copy(Na__Share__Url({ project: projectId, video: S.current ? S.current.id : '' }), 'Staff link copied (Vale staff only)') },
                    { label: 'Share with a client…', onClick: () => S.project && Na__Share__Open({ project: S.project, videos: S.videos, video: S.current, time: S.controller ? S.controller.video.currentTime : 0 }) }
                ] : []),
                { label: 'Clear saved videos on this device', adminOnly: true, section: 'Developer tools', onClick: async () => {
                    const r = await Na__MediaCache__Evict([], 0);
                    Na__Toast__Show(`Cleared ${Math.round((r.removedBytes || 0) / 1048576)} MB of saved video`);
                } }
            ],
            onReady   : async () => {
                await cacheReady;
                if (projectId) await Na__Theia__OpenProject(root, projectId);
                else { await Na__ProjectIndex__Render(root); Na__Theia__Loader.hide(); }
            }
        });
    }
    // ------------------------------------------------------------

    Na__Theia__Boot().catch((error) => {
        console.error('[Theia] Start-up failed:', error);
        Na__Theia__Loader.hide();
        Na__Theia__Message(document.getElementById('theiaRoot'), 'Theia could not start', String(error && error.message || error));
    });

// endregion -------------------------------------------------------------------
