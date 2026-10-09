/* =============================================================================
   VALE SHARED - ACTIVITY LOG (WHAT ONLY THE BROWSER SEES)
   =============================================================================

   FILE       : ValeShared__ActivityLog__.js
   NAMESPACE  : window.ValeActivity
   MODULE     : Shared Activity Log (every Vale app on app.valegardenhouses.com)
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Tell the activity ledger what happens in the browser and never
                reaches an API: an app opened (installed or in a tab), a project
                opened, a video played, a link copied, a file downloaded
   CREATED    : 08-Oct-2026

   DESCRIPTION:
   - THE LEDGER is on the server (Api__Shared/ValeShared__Activity__.py); this
     script only reports to it: POST <api base>activity {app, action, ...}. The
     server adds who (the session cookie, or a guest), the IP, the country and
     the device, so the page never says who it is. The Vale Virtual Server
     Manager shows it all in tab 05 (User activity).
   - THE DEVICE ID: a random id kept in the "vale_device" cookie (400 days,
     this site only), set here at once so every API call carries it. It tells
     two people on one IP apart, and one person's visits together; it holds
     nothing about them. ".ipad" is added on an iPad, whose Safari otherwise
     says it is a Mac.
   - WHAT IS REPORTED, with no change to the app's own code:
       app.open      once per page load (installed app or browser tab, the page's
                     project and share link from the address)
       app.resume    back on screen after 30 minutes away (an installed app on an
                     iPad is rarely reloaded)
       project.open  the address's project changed without a reload
                     (pushState / replaceState / back)
       link.copy     a link to this site copied to the clipboard (any "Copy link")
       video.play    a <video> started with its sound on (once per video per page;
                     muted background videos are not people watching)
       file.download a download link clicked
     and ValeActivity.Log(action, {project, target, detail}) for anything else.
   - NEVER IN THE WAY: everything is wrapped; a failed report is dropped. The
     app's own clipboard, history and video calls behave exactly as before.

   USAGE (in an app's <head>, before the app's own scripts):
     <script src="/AppAssets__CommonApplicationAssets/Shared__ActivityLog/ValeShared__ActivityLog__.js"
             data-app="theia" data-api-base="/theia/api/" data-project-param="project"></script>

     data-app            gallery | valevision3d | theia | help (the server's list)
     data-api-base       the API that takes the report (one with /api/activity)
     data-project-param  the query key naming the project (project, id); none: no project

   =============================================================================

   DEVELOPMENT LOG:
   08-Oct-2026 - Version 1.1.0
   - A download within 3 seconds (before or after) of the app's own ValeActivity.Log
     is not reported again: the app's report names it better (the KPI report, a link
     email). Downloads are reported 1.5 seconds after the click for that reason.

   08-Oct-2026 - Version 1.0.0
   - Initial build (ValeVision Gallery, ValeVision 3D, ValeVision Theia, ValeVision
     Help), with the activity ledger and the Server Manager's tab 05.

   ============================================================================= */

(function() {

    if (window.ValeActivity) return;                                           // <-- Loaded twice: keep the first

// -----------------------------------------------------------------------------
// REGION | Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cookie, Timing
    // ------------------------------------------------------------
    var Na__Cookie       = 'vale_device';
    var Na__CookieDays   = 400;                                                // <-- Chrome's ceiling, as the sign-in cookie
    var Na__ResumeMs     = 30 * 60e3;                                          // <-- Away this long, then back: "came back"
    var Na__RepeatMs     = 4e3;                                                // <-- The same copy twice this close: once
    var Na__Script       = document.currentScript;
    var Na__Token        = /^[A-Za-z0-9_-]{16,64}$/;                           // <-- A share token (Theia's are 24 characters)
    // ------------------------------------------------------------


    // MODULE VARIABLES | Session
    // ------------------------------------------------------------
    var Na__App      = '';
    var Na__ApiBase  = '';
    var Na__Param    = '';
    var Na__Project  = '';
    var Na__HiddenAt = 0;
    var Na__Played   = {};                                                     // <-- Videos already reported on this page
    var Na__LastCopy = { text: '', at: 0 };
    var Na__LastAppLog = 0;                                                    // <-- When the app last reported something itself
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Device Id and Display Mode
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This an iPad? (iPadOS Safari says "Macintosh")
    // ------------------------------------------------------------
    function Na__IsIpad() {
        var ua = navigator.userAgent || '';
        return /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Random Id (20 letters and digits)
    // ------------------------------------------------------------
    function Na__NewId() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', out = '';
        var bytes = new Uint8Array(20);
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
        else for (var i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
        for (var j = 0; j < 20; j++) out += chars.charAt(bytes[j] % chars.length);
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Device Id: Read the Cookie, or Set One (before any API call)
    // ------------------------------------------------------------
    function Na__DeviceId() {
        var match = /(?:^|;\s*)vale_device=([A-Za-z0-9]{12,32})(?:\.[a-z]+)?/.exec(document.cookie || '');
        var id = match ? match[1] : Na__NewId();
        var value = id + (Na__IsIpad() ? '.ipad' : '');
        if (!match || match[0].indexOf(value) < 0) {
            try {
                document.cookie = Na__Cookie + '=' + value + '; Path=/; Max-Age=' + (Na__CookieDays * 86400) + '; SameSite=Lax' +
                                  (location.protocol === 'https:' ? '; Secure' : '');
            } catch (e) { /* cookies blocked: reports still go, without the id */ }
        }
        return id;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Installed App or Browser Tab
    // ------------------------------------------------------------
    function Na__Mode() {
        try {
            if (navigator.standalone) return 'standalone';
            var modes = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'];
            for (var i = 0; i < modes.length; i++) {
                if (window.matchMedia && window.matchMedia('(display-mode: ' + modes[i] + ')').matches) return 'standalone';
            }
        } catch (e) { /* old browser: a tab */ }
        return 'browser';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reporting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Query Value From a URL (or the page's own address)
    // ------------------------------------------------------------
    function Na__Query(key, href) {
        try { return new URL(href || window.location.href).searchParams.get(key) || ''; }
        catch (e) { return ''; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Send One Report (fire and forget; survives the page closing)
    // ------------------------------------------------------------
    function Na__Send(action, fields) {
        try {
            fields = fields || {};
            var share = fields.link !== undefined ? fields.link : Na__Query('share');
            var body = {
                app     : Na__App,
                action  : action,
                project : fields.project !== undefined ? fields.project : Na__Project,
                target  : fields.target || '',
                mode    : Na__Mode(),
                path    : fields.path || (window.location.pathname + Na__CleanSearch(window.location.search)),
                link    : Na__Token.test(share || '') ? share : '',
                detail  : fields.detail || undefined
            };
            fetch(Na__ApiBase + 'activity', {
                method      : 'POST',
                credentials : 'same-origin',
                keepalive   : true,
                headers     : { 'Content-Type': 'application/json' },
                body        : JSON.stringify(body)
            }).catch(function() { /* dropped: never in the way */ });
        } catch (e) { /* dropped */ }
    }

    function Na__CleanSearch(search) {                                         // <-- The token is sent as "link", not in the path
        return String(search || '').replace(/([?&])share=[^&]*/g, '$1share=…');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Watchers (no change to the apps' own code)
// -----------------------------------------------------------------------------

    // SUB FUNCTION | The Address's Project Changed Without a Reload
    // ------------------------------------------------------------
    function Na__CheckProject() {
        if (!Na__Param) return;
        var now = Na__Query(Na__Param);
        if (now && now !== Na__Project) {
            Na__Project = now;
            Na__Send('project.open', { project: now });
        } else if (!now) {
            Na__Project = '';
        }
    }

    function Na__WatchHistory() {
        ['pushState', 'replaceState'].forEach(function(name) {
            var original = window.history[name];
            if (typeof original !== 'function') return;
            window.history[name] = function() {
                var result = original.apply(this, arguments);
                try { Na__CheckProject(); } catch (e) { /* never in the way */ }
                return result;
            };
        });
        window.addEventListener('popstate', Na__CheckProject);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Link to This Site Copied (navigator.clipboard, or a copy event)
    // ------------------------------------------------------------
    function Na__OnCopiedText(text) {
        text = String(text || '').trim();
        if (!text || text.length > 2000 || /\s/.test(text)) return;
        var url;
        try { url = new URL(text, window.location.href); } catch (e) { return; }
        if (!/^https?:/.test(url.protocol) || url.origin !== window.location.origin || !/^https?:\/\//i.test(text)) return;
        if (Na__LastCopy.text === text && Date.now() - Na__LastCopy.at < Na__RepeatMs) return;
        Na__LastCopy = { text: text, at: Date.now() };
        var project = url.searchParams.get('project') || url.searchParams.get('id') || '';
        Na__Send('link.copy', { project: project, target: url.pathname, link: url.searchParams.get('share') || '',
                                path: url.pathname + Na__CleanSearch(url.search) });
    }

    function Na__WatchClipboard() {
        var clip = navigator.clipboard;
        if (clip && typeof clip.writeText === 'function') {
            var original = clip.writeText;
            try {
                clip.writeText = function(text) {
                    try { Na__OnCopiedText(text); } catch (e) { /* never in the way */ }
                    return original.apply(clip, arguments);
                };
            } catch (e) { /* read-only in this browser: the copy event still sees most */ }
        }
        document.addEventListener('copy', function() {
            try {
                var el = document.activeElement, text = '';
                if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && typeof el.selectionStart === 'number') {
                    text = el.value.substring(el.selectionStart, el.selectionEnd);
                } else if (window.getSelection) {
                    text = String(window.getSelection());
                }
                Na__OnCopiedText(text);
            } catch (e) { /* never in the way */ }
        }, true);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Video Started With Its Sound On (once per video per page)
    // ------------------------------------------------------------
    function Na__VideoFacts(video) {
        var src = String(video.currentSrc || video.src || '');
        var path = '';
        try { path = decodeURIComponent(new URL(src, window.location.href).pathname); } catch (e) { path = ''; }
        var project = (/\/ValeProjects__\d{4}\/([^/]+)\//.exec(path) || [])[1] || Na__Project;
        var file = path.split('/').pop() || '';
        var id = (/__TheiaVideo__(.+?)__\d+p__/.exec(file) || [])[1] || Na__Query('video') || file.replace(/\.[a-z0-9]+$/i, '');
        var title = '';
        try { title = navigator.mediaSession && navigator.mediaSession.metadata ? navigator.mediaSession.metadata.title : ''; }
        catch (e) { title = ''; }
        return { key: path || src, project: project, target: title || video.getAttribute('aria-label') || video.title || id };
    }

    function Na__WatchVideos() {
        document.addEventListener('play', function(e) {
            var video = e.target;
            if (!video || video.tagName !== 'VIDEO' || video.getAttribute('data-vale-activity') === 'off') return;
            if (video.muted && !video.controls) return;                        // <-- A silent background loop is not someone watching
            window.setTimeout(function() {                                     // <-- The app names it (media session) a moment after
                try {
                    var facts = Na__VideoFacts(video);
                    if (!facts.key || Na__Played[facts.key]) return;
                    Na__Played[facts.key] = true;
                    Na__Send('video.play', { project: facts.project, target: facts.target });
                } catch (err) { /* never in the way */ }
            }, 600);
        }, true);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Download Link Clicked
    // ------------------------------------------------------------
    function Na__WatchDownloads() {
        document.addEventListener('click', function(e) {
            try {
                var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
                if (!a) return;
                var name = a.getAttribute('download') || String(a.getAttribute('href') || '').split('/').pop().split('?')[0];
                var at = Date.now();
                window.setTimeout(function() {                                 // <-- The app may report it itself, just before or after
                    if (Math.abs(Na__LastAppLog - at) < 3000) return;
                    Na__Send('file.download', { target: name.slice(0, 120) });
                }, 1500);
            } catch (err) { /* never in the way */ }
        }, true);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Back on Screen After a Long Time Away
    // ------------------------------------------------------------
    function Na__WatchResume() {
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') { Na__HiddenAt = Date.now(); return; }
            if (Na__HiddenAt && Date.now() - Na__HiddenAt >= Na__ResumeMs) Na__Send('app.resume');
            Na__HiddenAt = 0;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start
// -----------------------------------------------------------------------------

    function Na__Start() {
        var data = (Na__Script && Na__Script.dataset) || {};
        Na__App = String(data.app || '').trim();
        Na__ApiBase = String(data.apiBase || '').trim();
        Na__Param = String(data.projectParam || '').trim();
        if (!Na__App || Na__ApiBase.charAt(0) !== '/' || !window.fetch || !window.URL) return;
        if (Na__ApiBase.charAt(Na__ApiBase.length - 1) !== '/') Na__ApiBase += '/';
        Na__Project = Na__Param ? Na__Query(Na__Param) : '';

        var deviceId = Na__DeviceId();                                         // <-- Before the app's first API call
        window.ValeActivity = {
            Version  : '1.1.0',
            DeviceId : function() { return deviceId; },
            Log      : function(action, fields) { Na__LastAppLog = Date.now(); Na__Send(String(action || ''), fields || {}); }
        };

        try { Na__WatchHistory(); } catch (e) { /* never in the way */ }
        try { Na__WatchClipboard(); } catch (e) { /* never in the way */ }
        try { Na__WatchVideos(); } catch (e) { /* never in the way */ }
        try { Na__WatchDownloads(); } catch (e) { /* never in the way */ }
        try { Na__WatchResume(); } catch (e) { /* never in the way */ }
        Na__Send('app.open');
    }

    Na__Start();

// endregion -------------------------------------------------------------------

})();
