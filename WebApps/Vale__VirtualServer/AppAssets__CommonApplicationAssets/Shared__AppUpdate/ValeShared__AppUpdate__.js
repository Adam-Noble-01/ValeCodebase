/* =============================================================================
   VALE SHARED - APP UPDATE (REFRESH WHAT A SOURCE PUSH CHANGED)
   =============================================================================

   FILE       : ValeShared__AppUpdate__.js
   NAMESPACE  : window.ValeAppUpdate
   MODULE     : Shared App Update (every Vale app on app.valegardenhouses.com)
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : After a source push, make every browser use the new files at once:
                purge the changed files from the browser's cache and reload
   CREATED    : 07-Oct-2026

   DESCRIPTION:
   - WHY: Cloudflare gives every script and stylesheet a 4-hour browser cache,
     so after a push a browser (above all an installed app on an iPad) kept
     running the old files for up to 4 hours, or a mix of old and new.
   - THE DEPLOY STAMP: after every source push and undo, the Vale Virtual
     Server Manager writes /ValeApps__DeployStamp__.json at the server root:
     the URLs each push changed, newest last (7 days). Never cached.
   - AT START-UP this script reads it. If a push has changed this app's files
     (those under data-app-base, and the shared /AppAssets__CommonApplicationAssets/)
     since this browser last checked, it fetches each changed file again past
     the cache (cache: 'reload'; through the app's service worker too, which
     keeps the new copy) and reloads the page once. A browser that has never
     checked takes the pushes of the last 6 hours (older copies have expired),
     unless this is its first visit (no service worker yet): then it only notes
     the stamp, since everything has just come from the server.
   - WHILE OPEN it checks again when the app comes back to the screen (after
     30 s away), when the connection returns, and every 10 minutes. New files
     are purged at once; then the page reloads only if the app says that is
     safe (window.ValeAppUpdate__CanReload() returns true, e.g. Theia with no
     video playing). Otherwise a small bar offers "Reload" (or "Later").
   - Never in the way: no stamp (a PC dev server, a first push not yet made),
     no network, or blocked storage: it does nothing.

   USAGE (in an app's <head>, before the app's own scripts):
     <script src="/AppAssets__CommonApplicationAssets/Shared__AppUpdate/ValeShared__AppUpdate__.js"
             data-app-base="/theia/" data-app-name="ValeVision Theia"></script>

     data-app-base   the app's public route (the start of every URL it loads)
     data-app-name   the name in the bar ("ValeVision Theia has been updated")

     window.ValeAppUpdate__CanReload = function() { return true when a reload loses nothing; };
     ValeAppUpdate.Check()          check now (returns a Promise of the outcome)
     ?app-update-preview=bar        show the bar at once (screenshots and testing)

   =============================================================================

   DEVELOPMENT LOG:
   07-Oct-2026 - Version 1.0.0
   - Initial build (ValeVision Theia, ValeVision 3D, ValeVision Gallery, ValeVision
     Help), with the Server Manager's deploy stamp (0.9.0).

   ============================================================================= */

(function() {

    if (window.ValeAppUpdate) return;                                          // <-- Loaded twice: keep the first

// -----------------------------------------------------------------------------
// REGION | Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Stamp, Timing, Storage
    // ------------------------------------------------------------
    var Na__StampUrl        = '/ValeApps__DeployStamp__.json';
    var Na__SharedPrefix    = '/AppAssets__CommonApplicationAssets/';
    var Na__FirstRunMs      = 6 * 3600e3;                                      // <-- Never checked: pushes this recent (the cache keeps 4 h)
    var Na__EveryMs         = 10 * 60e3;                                       // <-- Check while open and on screen
    var Na__AwayMs          = 30e3;                                            // <-- Back on screen after this long: check
    var Na__MinGapMs        = 20e3;                                            // <-- Never two checks closer than this
    var Na__Script          = document.currentScript;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Session
    // ------------------------------------------------------------
    var Na__Base     = '';
    var Na__Name     = 'This app';
    var Na__Busy     = null;                                                   // <-- The check running now (a Promise)
    var Na__LastAt   = 0;
    var Na__HiddenAt = 0;
    var Na__Bar      = null;
    var Na__Memory   = {};                                                     // <-- When storage is blocked
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Storage (never throws)
// -----------------------------------------------------------------------------

    function Na__Get(store, key) {
        try { return window[store].getItem(key); }
        catch (e) { return Object.prototype.hasOwnProperty.call(Na__Memory, store + key) ? Na__Memory[store + key] : null; }
    }

    function Na__Set(store, key, value) {
        try { window[store].setItem(key, value); }
        catch (e) { Na__Memory[store + key] = value; }
    }

    function Na__AppliedKey()  { return 'ValeAppUpdate__Applied__' + Na__Base; }
    function Na__ReloadedKey() { return 'ValeAppUpdate__Reloaded__' + Na__Base; }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Check
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Stamp From the Server (null: none, or no network)
    // ------------------------------------------------------------
    function Na__ReadStamp() {
        return fetch(Na__StampUrl, { cache: 'no-store', credentials: 'same-origin' })
            .then(function(res) { return res.ok ? res.json() : null; })
            .catch(function() { return null; });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | This App's URLs Changed by Pushes This Browser Has Not Taken
    // ------------------------------------------------------------
    function Na__Changed(doc, applied) {
        var now = Date.now(), seen = {}, out = [];
        (doc.ValeDeploy__Pushes__Recent || []).forEach(function(push) {
            var stamp = String(push.ValeDeploy__Push__Stamp || '');
            var fresh = applied ? stamp > applied
                                : now - Date.parse(push.ValeDeploy__Push__Utc || 0) < Na__FirstRunMs;
            if (!fresh) return;
            (push.ValeDeploy__Push__Urls || []).forEach(function(url) {
                if (typeof url !== 'string' || seen[url]) return;
                if (url.indexOf(Na__Base) !== 0 && url.indexOf(Na__SharedPrefix) !== 0) return;
                seen[url] = true;
                out.push(url);
            });
        });
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch Each File Again Past the Cache (a deleted one answers 404: that replaces it too)
    // ------------------------------------------------------------
    function Na__Purge(urls) {
        return Promise.all(urls.map(function(url) {
            return fetch(url, { cache: 'reload', credentials: 'same-origin' })
                .then(function(res) { return res.arrayBuffer(); })                 // <-- Read to the end, so the cache keeps it
                .catch(function() { return null; });
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | May the Page Reload Now Without Losing Anything?
    // ------------------------------------------------------------
    function Na__CanReload() {
        try { return typeof window.ValeAppUpdate__CanReload === 'function' && !!window.ValeAppUpdate__CanReload(); }
        catch (e) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reload Once Per Stamp (never a loop)
    // ------------------------------------------------------------
    function Na__Reload(latest) {
        if (Na__Get('sessionStorage', Na__ReloadedKey()) === latest) return false;
        Na__Set('sessionStorage', Na__ReloadedKey(), latest);
        window.location.reload();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check the Stamp; Purge and Reload (or Offer to) When This App Changed
    // ------------------------------------------------------------
    // reason: 'start' (reload at once), 'resume', 'interval', 'online', 'manual'
    // Resolves to 'none', 'current', 'other-apps', 'reloading', 'offered' or 'kept'.
    // ------------------------------------------------------------
    function Na__Check(reason) {
        if (Na__Busy) return Na__Busy;
        if (reason !== 'start' && reason !== 'manual' && Date.now() - Na__LastAt < Na__MinGapMs) return Promise.resolve('current');
        Na__LastAt = Date.now();
        Na__Busy = Na__ReadStamp().then(function(doc) {
            var latest = doc && String(doc.ValeDeploy__Stamp__Latest || '');
            if (!latest) return 'none';
            var applied = Na__Get('localStorage', Na__AppliedKey());
            if (applied === latest) return 'current';
            if (!applied && !(navigator.serviceWorker && navigator.serviceWorker.controller)) {
                Na__Set('localStorage', Na__AppliedKey(), latest);             // <-- A first visit: everything just came from the server
                return 'current';
            }
            var urls = Na__Changed(doc, applied);
            if (!urls.length) {
                Na__Set('localStorage', Na__AppliedKey(), latest);
                return 'other-apps';
            }
            return Na__Purge(urls).then(function() {
                Na__Set('localStorage', Na__AppliedKey(), latest);
                if ((reason === 'start' || Na__CanReload()) && Na__Reload(latest)) return 'reloading';
                if (reason === 'start') return 'kept';                         // <-- Already reloaded for this stamp once
                Na__ShowBar();
                return 'offered';
            });
        }).catch(function(error) {
            console.warn('[ValeAppUpdate] check failed:', error);
            return 'none';
        }).then(function(outcome) {
            Na__Busy = null;
            return outcome;
        });
        return Na__Busy;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Bar ("ValeVision 3D has been updated  [Reload]  Later")
// -----------------------------------------------------------------------------

    function Na__Styles() {
        if (document.getElementById('ValeAppUpdate__Styles')) return;
        var css = document.createElement('style');
        css.id = 'ValeAppUpdate__Styles';
        css.textContent =
            '.ValeAppUpdate__Bar{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);' +
            'z-index:4500;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 32px);box-sizing:border-box;' +
            'padding:10px 10px 10px 18px;border-radius:12px;background:#172b3a;color:#ffffff;' +
            'font:400 14px/1.4 "Open Sans",system-ui,sans-serif;box-shadow:0 10px 32px rgba(0,0,0,0.28);' +
            'animation:ValeAppUpdate__In 0.3s ease-out}' +
            '.ValeAppUpdate__Text{min-width:0}' +
            '.ValeAppUpdate__Reload{flex-shrink:0;border:0;border-radius:8px;padding:7px 14px;background:#ffffff;color:#172b3a;' +
            'font:600 14px "Open Sans",system-ui,sans-serif;cursor:pointer}' +
            '.ValeAppUpdate__Later{flex-shrink:0;border:0;padding:7px 8px;background:transparent;color:rgba(255,255,255,0.75);' +
            'font:400 13px "Open Sans",system-ui,sans-serif;cursor:pointer}' +
            '.ValeAppUpdate__Later:hover{color:#ffffff}' +
            '@keyframes ValeAppUpdate__In{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}' +
            '@media (prefers-reduced-motion: reduce){.ValeAppUpdate__Bar{animation:none}}';
        document.head.appendChild(css);
    }

    function Na__ShowBar() {
        if (Na__Bar || !document.body) return;
        Na__Styles();
        Na__Bar = document.createElement('div');
        Na__Bar.className = 'ValeAppUpdate__Bar';
        Na__Bar.setAttribute('role', 'status');
        var text = document.createElement('span');
        text.className = 'ValeAppUpdate__Text';
        text.textContent = Na__Name + ' has been updated.';
        var reload = document.createElement('button');
        reload.type = 'button';
        reload.className = 'ValeAppUpdate__Reload';
        reload.textContent = 'Reload';
        reload.addEventListener('click', function() { window.location.reload(); });
        var later = document.createElement('button');
        later.type = 'button';
        later.className = 'ValeAppUpdate__Later';
        later.textContent = 'Later';
        later.addEventListener('click', function() { if (Na__Bar) Na__Bar.remove(); Na__Bar = null; });
        Na__Bar.appendChild(text);
        Na__Bar.appendChild(reload);
        Na__Bar.appendChild(later);
        document.body.appendChild(Na__Bar);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start
// -----------------------------------------------------------------------------

    function Na__Start() {
        var data = (Na__Script && Na__Script.dataset) || {};
        Na__Base = String(data.appBase || '').trim();
        Na__Name = String(data.appName || '').trim() || Na__Name;
        if (!Na__Base || Na__Base.charAt(0) !== '/' || !window.fetch || !window.Promise) return;
        if (Na__Base.charAt(Na__Base.length - 1) !== '/') Na__Base += '/';

        window.ValeAppUpdate = {
            Version : '1.0.0',
            Check   : function() { return Na__Check('manual'); }
        };

        if (/[?&]app-update-preview=bar\b/.test(window.location.search)) {
            var show = function() { Na__ShowBar(); };
            if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
            return;
        }

        Na__Check('start');
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') { Na__HiddenAt = Date.now(); return; }
            if (Na__HiddenAt && Date.now() - Na__HiddenAt >= Na__AwayMs) Na__Check('resume');
        });
        window.addEventListener('pageshow', function(e) { if (e.persisted) Na__Check('resume'); });
        window.addEventListener('online', function() { Na__Check('online'); });
        setInterval(function() { if (document.visibilityState === 'visible') Na__Check('interval'); }, Na__EveryMs);
    }

    Na__Start();

// endregion -------------------------------------------------------------------

})();
