/* =============================================================================
   VALE SHARED - INSTALL THE APP (PROMPT CARD + DEVICE DETECTION)
   =============================================================================

   FILE       : ValeShared__AppInstall__.js
   NAMESPACE  : window.ValeAppInstall
   MODULE     : Shared App Install (ValeVision, ValeVision 3D, any Vale app)
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Ask people using a Vale app in a browser tab to install it, in
                the way their device allows, and send them to the illustrated
                guide (/help/install-app/) for the steps
   CREATED    : 07-Oct-2026

   DESCRIPTION:
   - A card at the bottom of the screen, 4 s after the page opens (after
     signing in: it never covers the shared sign-in card):
       Chrome, Edge, Samsung Internet (Windows, Mac, Linux, ChromeOS, Android):
         "Install" opens the browser's own install box: one click. If the
         browser has not offered it, the card shows the one-more-click steps.
       iPhone / iPad (Safari, other browsers, in-app browsers such as Outlook
       or WhatsApp), Mac Safari, Firefox on Android: the device's steps in the
       card, and "Got it" (or "Copy link" inside another app).
       Every card links "Show me how", opening
       /help/install-app/?app=<key>&device=<device> in a new tab.
   - Never shown inside the installed app, after the app was installed from
     this browser, or where web apps cannot be installed (Firefox on a PC).
   - "Not now" (or the X) snoozes it for this app: 1 hour, then 1 day,
     1 week, then 30 days.
   - Replaces the pre-server ValeVision install stack (13 files in the old
     gallery's 62__Feature__AppInstallability), with its gaps fixed: in-app
     browsers, ChromeOS, a manual fallback on Chromium, "Copied" feedback, and
     "installed" no longer permanent (a fresh browser install offer clears it).

   USAGE (in an app's <head>, before the app's own scripts):
     <link rel="stylesheet" href="/AppAssets__CommonApplicationAssets/Shared__AppInstall/ValeShared__AppInstall__.css">
     <script src="/AppAssets__CommonApplicationAssets/Shared__AppInstall/ValeShared__AppInstall__.js"
             data-app-key="valevision" data-app-name="ValeVision"
             data-app-icon="/AppAssets__CommonApplicationAssets/AppIcons/Na__AppInstallability__Icon__192x192.png"></script>

     data-app-avoid="#barId, .other"   optional: the app's own bars along the bottom. While one is
                                  on screen the card sits 12 px above it (checked every 0.5 s)

     ValeAppInstall.Show()        show the card now (a menu item), ignoring snoozes
     ValeAppInstall.HelpUrl()     the guide for this app and device
     ValeAppInstall.Detect()      { kind, device, ipad, label } for this browser
     Without data-app-key nothing is shown (the help page uses Detect only).

     Open in the app: Na__OpenApps lists the apps that take links (key, name,
     protocol, manifest file name). A page offers to open itself in one when
     getInstalledRelatedApps lists that manifest (both apps' manifests name
     both manifests in related_applications).

     ?install-preview=<kind or device>   show that card at once, never snoozed
       (screenshots and testing): windows, mac, android, ios, ios-other,
       ios-inapp, android-other, android-inapp, mac-safari, fallback;
       open-app = the Open in the app card; off = no card at all

   =============================================================================

   DEVELOPMENT LOG:
   07-Oct-2026 - Version 1.3.0
   - Links open in the app. On a computer with ValeVision installed (Chrome or
     Edge; found with getInstalledRelatedApps), a page opened in a browser tab
     offers "Open in the ValeVision app", with "Always open links in the app".
     The hand-over goes through ValeVision's manifest protocol_handlers
     (web+valevision -> /project-gallery/open.html), into its window
     (launch_handler navigate-existing). With "Always" ticked it happens on
     load; if the browser wants a click first, the card shows. "Stay in
     browser" snoozes like Not now. Phones capture links themselves (Android);
     iPhone and iPad always open Safari.

   07-Oct-2026 - Version 1.2.0
   - Install is always the main button on Chrome, Edge and Samsung: it opens the
     browser's own install box. If the browser has not offered it yet, it waits
     up to 2.5 s for the offer; only then does the card show the one-more-click
     steps (address-bar icon or menu). It no longer opens on those steps.
   - Where nothing can be automated (iPhone, iPad, Mac Safari, Firefox on Android)
     the steps are in the card and the main button is Got it; in-app browsers get
     Copy link. "Show me how" is a small link that opens the guide in a NEW TAB,
     so the app stays where it was.

   07-Oct-2026 - Version 1.1.0
   - data-app-avoid: the card lifts above the app's own bottom bars while they are
     on screen (ValeVision 3D's scene thumbnail strip) and drops back when they go.

   07-Oct-2026 - Version 1.0.0
   - Initial build (ValeVision and ValeVision 3D on app.valegardenhouses.com).

   ============================================================================= */

(function() {

    if (window.ValeAppInstall) return;                                         // <-- Loaded twice: keep the first

// -----------------------------------------------------------------------------
// REGION | Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Timing, Storage, Help Page
    // ------------------------------------------------------------
    var Na__FirstShowMs      = 4000;                                           // <-- Card appears this long after load
    var Na__WaitNativeMs     = 12000;                                          // <-- Chromium: wait this long for the browser's offer
    var Na__SnoozeLadderMs   = [3600e3, 86400e3, 7 * 86400e3, 30 * 86400e3];   // <-- 1 h, 1 day, 1 week, then 30 days
    var Na__StoreKey         = 'ValeAppInstall__State__v1';
    var Na__HelpPath         = '/help/install-app/';
    var Na__Script           = document.currentScript;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Session
    // ------------------------------------------------------------
    var Na__Opts         = null;                                               // <-- { key, name, icon }
    var Na__Platform     = null;
    var Na__Deferred     = null;                                               // <-- beforeinstallprompt event (single use)
    var Na__Preview      = '';
    var Na__MemoryStore  = {};                                                 // <-- When localStorage is blocked
    var Na__Root         = null;
    var Na__Started      = 0;
    var Na__PlaceTimer   = 0;
    var Na__OpenApp      = null;                                               // <-- The installed app this page can open in
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Apps That Take Links (manifest protocol_handlers; scope covers the whole site)
    // ------------------------------------------------------------
    var Na__OpenApps = [
        { key: 'valevision', name: 'ValeVision', protocol: 'web+valevision', manifest: 'ValeVisionGallery__Pwa__Manifest__' }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Platform Detection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Running as the Installed App?
    // ------------------------------------------------------------
    function Na__IsStandalone() {
        var modes = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'];
        for (var i = 0; i < modes.length; i++) {
            if (window.matchMedia && window.matchMedia('(display-mode: ' + modes[i] + ')').matches) return true;
        }
        return window.navigator.standalone === true;                            // <-- iOS home-screen app
    }
    // ------------------------------------------------------------


    // FUNCTION | What Can This Browser Do? (kind) and Which Guide? (device)
    // ------------------------------------------------------------
    //   kind: installed | native (Chromium: the browser's install box) | ios-safari | ios-other |
    //         ios-inapp | android-other | android-inapp | mac-safari | none
    function Na__Detect() {
        var ua = navigator.userAgent || '';
        var ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // <-- iPadOS reports a Mac
        var ios = ipad || /iPhone|iPod/.test(ua);
        var android = /Android/.test(ua);
        var chromium = !ios && /(Chrome|Chromium|CriOS)\/\d|Edg\/|OPR\/|SamsungBrowser\//.test(ua);
        var inApp = /FBAN|FBAV|Instagram|LinkedInApp|Line\/|Twitter|GSA\/|Outlook|MicrosoftTeams|Snapchat|Pinterest|WhatsApp/i.test(ua);
        var out = { kind: 'none', device: 'other', ipad: ipad, label: '' };

        if (ios) {
            out.device = 'ios';
            if (inApp || !/Safari\//.test(ua)) out.kind = 'ios-inapp';          // <-- In-app web views drop "Safari/"
            else if (/CriOS|EdgiOS|FxiOS|OPiOS|DuckDuckGo/.test(ua)) out.kind = 'ios-other';
            else out.kind = 'ios-safari';
        } else if (android) {
            out.device = 'android';
            if (inApp || /; wv\)/.test(ua)) out.kind = 'android-inapp';
            else if (/Firefox\//.test(ua)) out.kind = 'android-other';
            else out.kind = 'native';                                           // <-- Chrome, Samsung Internet, Edge, Opera
        } else {
            out.device = /Windows NT/.test(ua) ? 'windows' : /CrOS/.test(ua) ? 'chromeos'
                       : /Macintosh/.test(ua) ? 'mac' : /Linux/.test(ua) ? 'linux' : 'other';
            if (chromium) out.kind = 'native';
            else if (out.device === 'mac' && /Safari\//.test(ua) && !/Firefox\//.test(ua) &&
                     Number((/Version\/(\d+)/.exec(ua) || [])[1] || 0) >= 17) out.kind = 'mac-safari';
        }
        if (Na__IsStandalone()) out.kind = 'installed';
        out.label = { windows: 'Windows', mac: 'Mac', linux: 'Linux', chromeos: 'Chromebook', ios: ipad ? 'iPad' : 'iPhone',
                      android: 'Android', other: 'this device' }[out.device];
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Preview Variant From ?install-preview= (screenshots, testing)
    // ------------------------------------------------------------
    function Na__PreviewPlatform(value) {
        var map = {
            windows: ['native', 'windows'], mac: ['native', 'mac'], linux: ['native', 'linux'], chromeos: ['native', 'chromeos'],
            android: ['native', 'android'], ios: ['ios-safari', 'ios'], ipad: ['ios-safari', 'ios'],
            'ios-other': ['ios-other', 'ios'], 'ios-inapp': ['ios-inapp', 'ios'], 'android-other': ['android-other', 'android'],
            'android-inapp': ['android-inapp', 'android'], 'mac-safari': ['mac-safari', 'mac'], fallback: ['fallback', 'windows'],
            'open-app': ['native', 'windows']
        }[value];
        if (!map) return null;
        var p = { kind: map[0], device: map[1], ipad: value === 'ipad', label: '' };
        p.label = { windows: 'Windows', mac: 'Mac', linux: 'Linux', chromeos: 'Chromebook', ios: p.ipad ? 'iPad' : 'iPhone', android: 'Android' }[p.device];
        return p;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Remembered State (per app: installed here, snoozes)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read / Write the Whole State (localStorage, else memory)
    // ------------------------------------------------------------
    function Na__Load() {
        try { return JSON.parse(window.localStorage.getItem(Na__StoreKey) || '{}') || {}; }
        catch (e) { return Na__MemoryStore; }
    }

    function Na__Save(state) {
        Na__MemoryStore = state;
        try { window.localStorage.setItem(Na__StoreKey, JSON.stringify(state)); } catch (e) { /* memory only */ }
    }

    function Na__AppState(change) {
        var state = Na__Load();
        var app = state[Na__Opts.key] = state[Na__Opts.key] || { dismissCount: 0, snoozeUntil: 0, installedAt: 0 };
        if (change) { change(app); Na__Save(state); }
        return app;
    }
    // ------------------------------------------------------------


    // FUNCTION | Installed, Snoozed, Dismissed
    // ------------------------------------------------------------
    function Na__MarkInstalled() { Na__AppState(function(a) { a.installedAt = Date.now(); a.snoozeUntil = 0; }); }

    function Na__ClearInstalled() { Na__AppState(function(a) { a.installedAt = 0; }); }

    function Na__Snoozed() {
        var a = Na__AppState();
        return !!a.installedAt || Date.now() < (a.snoozeUntil || 0);
    }

    function Na__RecordDismissal() {
        if (Na__Preview) return;                                                // <-- Previews never snooze
        Na__AppState(function(a) {
            a.snoozeUntil = Date.now() + Na__SnoozeLadderMs[Math.min(a.dismissCount, Na__SnoozeLadderMs.length - 1)];
            a.dismissCount += 1;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Card
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Small Inline Icons (the Share glyph, the menu dots)
    // ------------------------------------------------------------
    var Na__Glyph = {
        share : '<svg class="ValeAppInstall__Glyph" viewBox="0 0 24 24" aria-label="Share"><path d="M8 7l4-4 4 4M12 3v13"/><path d="M7 10H5v11h14V10h-2"/></svg>',
        dots  : '<svg class="ValeAppInstall__Glyph" viewBox="0 0 24 24" aria-label="menu"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>'
    };

    function Na__Esc(text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Words for Each Kind of Browser
    // ------------------------------------------------------------
    function Na__Copy(kind) {
        var name = Na__Esc(Na__Opts.name), p = Na__Platform;
        var appName = Na__OpenApp ? Na__Esc(Na__OpenApp.name) : name;
        var where = p.device === 'android' ? 'from your home screen'
                  : p.device === 'windows' ? 'from your Start menu or taskbar, in its own window'
                  : p.device === 'mac' ? 'from your Dock, in its own window' : 'in its own window';
        return {                                                                // <-- primary: install / done / copy; the guide is a link (new tab)
            'native'        : { title: 'Install ' + name, primary: 'Install', act: 'install', quiet: true,
                                text: 'Open ' + name + ' ' + where + ', like any other app.' },
            'fallback'      : { title: 'One more click to install ' + name, primary: 'Got it', act: 'done',
                                text: 'Your browser asks you to start it: click the install icon at the right of the address bar, or open the browser menu ' + Na__Glyph.dots + ' and choose <b>Install ' + name + '</b>.' },
            'ios-safari'    : { title: 'Add ' + name + ' to your Home Screen', primary: 'Got it', act: 'done',
                                text: 'Tap Share ' + Na__Glyph.share + ', then <b>Add to Home Screen</b>. On newer iPhones Share is in the <b>&middot;&middot;&middot;</b> menu.' },
            'ios-other'     : { title: 'Add ' + name + ' to your Home Screen', primary: 'Got it', act: 'done',
                                text: 'Tap Share ' + Na__Glyph.share + ' in your browser, then <b>Add to Home Screen</b>. Safari works best.' },
            'ios-inapp'     : { title: 'Open in Safari to install ' + name, primary: 'Copy link', act: 'copy', quiet: true,
                                text: 'You are inside another app. Open this page in <b>Safari</b> first, then tap Share ' + Na__Glyph.share + ' and <b>Add to Home Screen</b>.' },
            'android-other' : { title: 'Install ' + name, primary: 'Got it', act: 'done',
                                text: 'Tap the menu ' + Na__Glyph.dots + ', then <b>Install</b> or <b>Add to Home screen</b>.' },
            'android-inapp' : { title: 'Open in Chrome to install ' + name, primary: 'Copy link', act: 'copy', quiet: true,
                                text: 'You are inside another app. Open this page in <b>Chrome</b> first (menu ' + Na__Glyph.dots + ', <b>Open in Chrome</b>), then install it.' },
            'mac-safari'    : { title: 'Add ' + name + ' to your Dock', primary: 'Got it', act: 'done',
                                text: 'In Safari’s menu bar choose <b>File</b>, then <b>Add to Dock</b>.' },
            'open-app'      : { title: 'Open in the ' + appName + ' app', primary: 'Open in app', act: 'open',
                                quiet: 'Stay in browser', quietAct: 'stay', noLink: true, always: true,
                                text: appName + ' is installed on this computer. Open this page there?' },
            'opened'        : { title: 'Opened in the ' + appName + ' app', primary: 'OK', act: 'ok', noLink: true,
                                text: 'You can close this browser tab.' }
        }[kind];
    }
    // ------------------------------------------------------------


    // FUNCTION | Build and Show the Card for a Kind
    // ------------------------------------------------------------
    function Na__ShowCard(kind) {
        var copy = Na__Copy(kind);
        if (!copy || !document.body) return false;
        Na__Hide(true);
        var root = Na__Root = document.createElement('div');
        root.className = 'ValeAppInstall__Card' + (Na__Platform.device === 'ios' || Na__Platform.device === 'android' ? ' is-phone' : '');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', copy.title);
        root.setAttribute('data-kind', kind);
        root.innerHTML =
            '<button type="button" class="ValeAppInstall__Close" data-vai="close" aria-label="Not now">&times;</button>' +
            '<img class="ValeAppInstall__Icon" src="' + Na__Esc(Na__Opts.icon) + '" alt="">' +
            '<div class="ValeAppInstall__Words">' +
                '<div class="ValeAppInstall__Title">' + copy.title + '</div>' +
                '<div class="ValeAppInstall__Text">' + copy.text + '</div>' +
                (copy.always ? '<label class="ValeAppInstall__Always"><input type="checkbox" data-vai-always' +
                               (Na__Load().openInApp ? ' checked' : '') + '> Always open links in the app</label>' : '') +
                '<div class="ValeAppInstall__Buttons">' +
                    '<button type="button" class="ValeAppInstall__Btn is-primary" data-vai="' + copy.act + '">' + copy.primary + '</button>' +
                    (copy.quiet ? '<button type="button" class="ValeAppInstall__Btn is-quiet" data-vai="' + (copy.quietAct || 'close') + '">' +
                                  (copy.quiet === true ? 'Not now' : copy.quiet) + '</button>' : '') +
                    (copy.noLink ? '' : '<a class="ValeAppInstall__Link" href="' + Na__Esc(Api.HelpUrl()) + '" target="_blank" rel="noopener">Show me how &#8599;</a>') +
                '</div>' +                                                       //   ^ New tab: this app stays open here
            '</div>';
        root.addEventListener('click', function(e) {
            var act = e.target.closest && e.target.closest('[data-vai]');
            if (!act) return;
            var v = act.dataset.vai;
            if (v === 'close' || v === 'done') { Na__RecordDismissal(); Na__Hide(); }
            else if (v === 'copy') Na__CopyLink(act);
            else if (v === 'install') Na__NativeInstall(act);
            else if (v === 'ok') Na__Hide();
            else if (v === 'open') {
                var always = root.querySelector('[data-vai-always]');
                var state = Na__Load();
                state.openInApp = always && always.checked ? Na__OpenApp.key : '';    // <-- "Always": later links go straight to the app
                if (!Na__Preview) Na__Save(state);
                Na__OpenInApp();
                Na__ShowCard('opened');
            } else if (v === 'stay') {
                var st = Na__Load();
                st.openInApp = '';
                if (!Na__Preview) Na__Save(st);
                Na__RecordDismissal();
                Na__Hide();
            }
        });
        document.body.appendChild(root);
        Na__Place();
        Na__PlaceTimer = window.setInterval(Na__Place, 500);                  // <-- Follow the app's bottom bars as they come and go
        window.requestAnimationFrame(function() { root.classList.add('is-visible'); });
        return true;
    }

    function Na__Hide(instant) {
        var root = Na__Root;
        Na__Root = null;
        window.clearInterval(Na__PlaceTimer);
        if (!root) return;
        if (instant) { root.remove(); return; }
        root.classList.remove('is-visible');
        window.setTimeout(function() { root.remove(); }, 260);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sit Above the App's Own Bottom Bars (data-app-avoid, e.g. ValeVision 3D's scene strip)
    // ------------------------------------------------------------
    function Na__Place() {
        if (!Na__Root) return;
        var lift = 0;
        (Na__Opts.avoid ? document.querySelectorAll(Na__Opts.avoid) : []).forEach(function(el) {
            var cs = window.getComputedStyle(el), r = el.getBoundingClientRect();
            var shown = cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0 &&
                        r.top < window.innerHeight && r.bottom > window.innerHeight * 0.5;   // <-- On screen, in the lower half
            if (shown) lift = Math.max(lift, window.innerHeight - r.top + 12);
        });
        var bottom = lift ? lift + 'px' : '';
        if (Na__Root.style.bottom !== bottom) Na__Root.style.bottom = bottom;    // <-- Empty: the stylesheet's own bottom
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Copy the Page Link (in-app browsers), With Feedback
    // ------------------------------------------------------------
    function Na__CopyLink(button) {
        var url = window.location.href.replace(/([?&])install-preview=[^&#]*&?/, '$1').replace(/[?&]$/, '');
        var done = function() { button.textContent = 'Copied'; window.setTimeout(function() { button.textContent = 'Copy link'; }, 2500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, function() { Na__CopyFallback(url); done(); });
        } else {
            Na__CopyFallback(url);
            done();
        }
    }

    function Na__CopyFallback(url) {
        var area = document.createElement('textarea');
        area.value = url;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); } catch (e) { /* nothing more to try */ }
        area.remove();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Chromium: the Browser's Own Install Box
// -----------------------------------------------------------------------------

    // FUNCTION | Install Pressed: open the browser's box, remember the answer
    // ------------------------------------------------------------
    function Na__NativeInstall(button, waited) {
        var ev = Na__Deferred;
        if (!ev) {                                                              // <-- The browser's offer may still be on its way
            waited = waited || 0;
            if (button) { button.disabled = true; button.textContent = 'Installing…'; }
            if (waited < 2500 && !Na__Preview) { window.setTimeout(function() { Na__NativeInstall(button, waited + 100); }, 100); return; }
            Na__ShowCard(Na__Platform.device === 'android' ? 'android-other' : 'fallback');   // <-- Not offered: one click in the browser itself
            return;
        }
        Na__Deferred = null;
        Na__Hide();
        ev.prompt();
        ev.userChoice.then(function(choice) {
            if (choice && choice.outcome === 'accepted') Na__MarkInstalled();
            else Na__RecordDismissal();
        }, function() { /* the box failed to open: nothing to record */ });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Listen From the Start (the offer can arrive before the page is built)
    // ------------------------------------------------------------
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();                                                     // <-- Our card instead of the browser's mini bar
        Na__Deferred = e;
        if (Na__Opts) {
            Na__ClearInstalled();                                               // <-- Offered again: it is not installed (any more)
            if (Na__Root && Na__Root.getAttribute('data-kind') === 'fallback' && !Na__Preview) Na__ShowCard('native');
        }
    });

    window.addEventListener('appinstalled', function() {
        Na__Deferred = null;
        if (Na__Opts) { Na__MarkInstalled(); Na__Hide(); }
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Open This Page in the Installed App (links sent by email, Teams, WhatsApp)
// -----------------------------------------------------------------------------

    // FUNCTION | Is an App That Takes Links Installed in This Browser? (computers; phones capture links themselves)
    // ------------------------------------------------------------
    function Na__OpenAppInstalled() {
        if (Na__Preview === 'open-app') return Promise.resolve(Na__OpenApps[0]);
        var desktop = ['windows', 'mac', 'linux', 'chromeos'].indexOf(Na__Platform.device) >= 0;
        if (Na__Preview || Na__Platform.kind !== 'native' || !desktop || !navigator.getInstalledRelatedApps) return Promise.resolve(null);
        return navigator.getInstalledRelatedApps().then(function(list) {
            return Na__OpenApps.find(function(a) {
                return (list || []).some(function(r) { return String(r.url || '').indexOf(a.manifest) >= 0; });
            }) || null;
        }, function() { return null; });
    }
    // ------------------------------------------------------------


    // FUNCTION | Offer (or, when "Always" was ticked, just do) the Hand-Over
    // ------------------------------------------------------------
    function Na__OfferOpen() {
        if (!Na__Preview && Na__Load().openInApp !== Na__OpenApp.key && Date.now() < (Na__AppState().snoozeUntil || 0)) return;   // <-- "Stay in browser" snoozes too
        if (!Na__Preview && Na__Load().openInApp === Na__OpenApp.key) {
            Na__OpenInApp();                                                    // <-- "Always": straight to the app
            window.setTimeout(function() {                                      // <-- Still here with focus: the browser wanted a click
                if (document.hasFocus() && document.visibilityState === 'visible') Na__ShowCard('open-app');
            }, 1500);
            return;
        }
        window.setTimeout(function() { Na__ShowCard('open-app'); }, Na__Preview ? 300 : 800);
    }

    function Na__OpenInApp() {
        var page = window.location.pathname + window.location.search.replace(/([?&])install-preview=[^&#]*&?/, '$1').replace(/[?&]$/, '') +
                   window.location.hash;
        if (Na__Preview) return;
        window.location.href = Na__OpenApp.protocol + ':' + encodeURIComponent(page);   // <-- The app's protocol_handlers opens this page in its window
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start and Public API
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Decide What to Show, When
    // ------------------------------------------------------------
    function Na__TryShow() {
        var p = Na__Platform;
        if (Na__Root || p.kind === 'none' || p.kind === 'installed') return;
        if (!Na__Preview && Na__Snoozed()) return;
        if (Na__Preview) { Na__ShowCard(p.kind); return; }
        if (document.querySelector('.ValeUserLogin__Overlay--visible')) {       // <-- Never over the sign-in card: after signing in
            window.setTimeout(Na__TryShow, 1500);
            return;
        }
        if (p.kind !== 'native') { Na__ShowCard(p.kind); return; }
        if (Na__Deferred) { Na__ShowCard('native'); return; }
        if (Date.now() - Na__Started < Na__WaitNativeMs) { window.setTimeout(Na__TryShow, 1500); return; }
        Na__RelatedInstalled().then(function(installed) {                       // <-- No offer: installed already, or a manual install
            if (installed) Na__MarkInstalled();
            else if (!Na__Root && !Na__Snoozed()) Na__ShowCard('native');          // <-- Install stays the main button; it waits for the offer
        });
    }

    function Na__RelatedInstalled() {
        if (!navigator.getInstalledRelatedApps) return Promise.resolve(false);
        return navigator.getInstalledRelatedApps().then(function(list) { return !!(list && list.length); }, function() { return false; });
    }
    // ------------------------------------------------------------


    // FUNCTION | Start (from the script tag's data-app-* or ValeAppInstall.Init)
    // ------------------------------------------------------------
    function Na__Init(opts) {
        if (Na__Opts || !opts || !opts.key) return;
        Na__Opts = { key: String(opts.key), name: opts.name || 'the app', icon: opts.icon || '', avoid: opts.avoid || '' };
        var match = /[?&]install-preview=([a-z-]+)/.exec(window.location.search);
        Na__Preview = match ? match[1] : '';
        Na__Platform = (Na__Preview && Na__PreviewPlatform(Na__Preview)) || Na__Detect();
        if (Na__Preview === 'off') { Na__Platform.kind = 'none'; return; }   // <-- Help pictures of the app itself
        if (Na__Platform.kind === 'installed') { Na__MarkInstalled(); return; }
        if (window.matchMedia) {
            var mq = window.matchMedia('(display-mode: standalone)');           // <-- Installed from this tab, then opened
            var onChange = function(e) { if (e.matches) { Na__MarkInstalled(); Na__Hide(); } };
            if (mq.addEventListener) mq.addEventListener('change', onChange);
        }
        if (Na__Deferred) Na__ClearInstalled();
        Na__Started = Date.now();
        var start = function() {
            Na__OpenAppInstalled().then(function(app) {                         // <-- The app is here already: offer to open this page in it
                if (app) { Na__OpenApp = app; Na__OfferOpen(); }
                else window.setTimeout(Na__TryShow, Na__Preview ? 300 : Na__FirstShowMs);
            });
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && Na__Root) { Na__RecordDismissal(); Na__Hide(); }
        });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    var Api = window.ValeAppInstall = {
        Init    : Na__Init,
        Detect  : Na__Detect,
        Show    : function() {                                                  // <-- From a menu: ignores snoozes
            if (!Na__Opts) return false;
            var kind = Na__Platform.kind;
            if (kind === 'installed' || kind === 'none') { window.location.href = Api.HelpUrl(); return true; }
            return Na__ShowCard(kind);
        },
        HelpUrl : function() {
            var p = Na__Platform || Na__Detect();
            var device = { windows: 'windows', mac: 'mac', linux: 'windows', chromeos: 'windows', ios: 'ios', android: 'android' }[p.device] || '';
            return Na__HelpPath + '?app=' + encodeURIComponent(Na__Opts ? Na__Opts.key : '') + (device ? '&device=' + device : '');
        }
    };

    if (Na__Script && Na__Script.dataset && Na__Script.dataset.appKey) {        // <-- Self-start from the script tag
        Na__Init({ key: Na__Script.dataset.appKey, name: Na__Script.dataset.appName, icon: Na__Script.dataset.appIcon,
                   avoid: Na__Script.dataset.appAvoid });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
