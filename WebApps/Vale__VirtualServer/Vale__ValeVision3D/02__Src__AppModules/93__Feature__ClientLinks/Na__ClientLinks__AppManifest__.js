// =============================================================================
// VALEVISION3D - CLIENT LINKS - ONE INSTALLABLE APP PER CLIENT PROJECT
// =============================================================================
//
// FILE       : Na__ClientLinks__AppManifest__.js
// NAMESPACE  : Na__ClientLinks__AppManifest
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Give the page its one web app manifest: on a client link, a
//              manifest of that client's own (their project's name, their link
//              as the launch address); on the staff page, the staff app's file
// CREATED    : 29-Oct-2026
//
// DESCRIPTION:
// - WHY (Adam, 29-Oct-2026: on an iPhone, Add to Home Screen from a client link
//   installed "ValeVision 3D", and the icon opened the staff sign-in. "Take a
//   look how I deal with this on TrueVision ... an individualised PWA named for
//   their project with no cross access to the others"). TrueVision's answer,
//   ported: 30__TrueVision__CoreAppCode/02__Src__AppModules/
//   62__Feature__AppInstallability/TrueVision__Pwa__Manifest__Builder__.js.
// - WHAT THE ICON OPENS IS THE MANIFEST'S start_url, NOT THE PAGE. Safari (since
//   15.4, WebKit bug 229059) fetches the FIRST <link rel="manifest"> it parses
//   and keeps it for the life of the page; a later change or removal does
//   nothing. index.html used to carry the staff manifest as a static link
//   (start_url "./", the staff page), so every client icon opened the staff
//   sign-in. So:
//       * index.html carries NO static manifest link. This script, blocking in
//         <head>, makes the only one, its href set BEFORE it joins the page.
//       * On a client link (?project=<id>&share=<token>) the manifest is built
//         here, per client, as a data: URL:
//             id, start_url  https://.../valevision/?project=<id>&share=<token>
//             name           "Thrower - ValeVision 3D"
//             short_name     "Thrower 3D"  (the Home Screen label)
//         Because id differs per link, every client project installs as its OWN
//         app, side by side with any other, never as the staff app. The icon
//         opens that client's model and nothing else: the share token is the
//         only key it holds, and the server opens that one project to it.
//       * On the staff page the link points at ValeVision3D__Pwa__Manifest__.webmanifest,
//         exactly as before.
// - Every URL inside a data: manifest is absolute (a data: URL has no base).
// - The name comes from the library id, synchronously (63403__Thrower ->
//   "Thrower"; 3256__MordorOrangery -> "Mordor Orangery"), so it is in place
//   before anything can install. The Apple meta tags carry the same label.
// - A Home Screen app gets storage of its own on Apple devices: every first
//   launch is a first visit, and the share token in start_url is all it needs.
// - The browser's address is never changed here, and no other manifest link
//   may ever be added to index.html above or below this script.
// - ON A CLIENT LINK it also holds Chrome / Edge's install prompt
//   (beforeinstallprompt) from the very start, for the install card
//   (Na__ClientLinks__InstallApp__), and notes an install (appinstalled).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.82.0), from TrueVision's per-project builder.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Staff App, the Icons, the Look
    // ------------------------------------------------------------
    var Na__AppManifest__STAFF_FILE     = 'ValeVision3D__Pwa__Manifest__.webmanifest';     // <-- The staff app (beside index.html)
    var Na__AppManifest__ICON_192       = '/AppAssets__CommonApplicationAssets/AppIcons/Na__AppInstallability__Icon__192x192.png';
    var Na__AppManifest__ICON_512       = '/AppAssets__CommonApplicationAssets/AppIcons/Na__AppInstallability__Icon__512x512.png';
    var Na__AppManifest__THEME          = '#172b3a';
    var Na__AppManifest__BACKGROUND     = '#f5f5f5';
    var Na__AppManifest__PRODUCT        = 'ValeVision 3D';
    var Na__AppManifest__SHORT_MAX      = 12;                                          // <-- Home Screen labels are cut at about this length
    var Na__AppManifest__LINK_ID        = 'naClientLinksAppManifest';
    var Na__AppManifest__DATA_PREFIX    = 'data:application/manifest+json,';
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Built Manifest and the Held Install Prompt
    // ------------------------------------------------------------
    var Na__AppManifest__LastBuilt      = null;                                        // <-- The client manifest object, for the console
    var Na__AppManifest__InstallPrompt  = null;                                        // <-- Chrome / Edge's beforeinstallprompt, held for the install card
    var Na__AppManifest__INSTALLED_KEY  = 'ValeVision3D__ClientApp__Installed__';      // <-- localStorage, + the project id: installed from this browser
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Client Link and Its Name
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Project and Token in the Address, or Null (the staff page)
    // ------------------------------------------------------------
    function Na__AppManifest__ReadLink() {
        try {
            var params = new URLSearchParams(window.location.search);
            var project = (params.get('project') || params.get('project-folder') || '').trim();
            var token = (params.get('share') || '').trim();
            return project && token ? { project: project, token: token } : null;   // <-- The same rule as index.html's na-client-mode
        } catch (error) { return null; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Readable Name from the Library Id (63403__Thrower -> "Thrower")
    // ------------------------------------------------------------
    function Na__AppManifest__DisplayName(projectId) {
        var text = String(projectId || '');
        text = text.replace(/^\d+[_\-\s]*/, '');                                       // <-- The job number
        text = text.replace(/[_\-]+/g, ' ');
        text = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2');                            // <-- MordorOrangery -> Mordor Orangery
        text = text.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
        text = text.replace(/\s+/g, ' ').trim();
        return text || 'Your design';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Home Screen Label: "<Name> 3D" when it fits, else the shortest that does
    // ------------------------------------------------------------
    function Na__AppManifest__ShortName(displayName) {
        var first = displayName.split(' ')[0];
        var options = [displayName + ' 3D', first + ' 3D', displayName, first];
        for (var i = 0; i < options.length; i++) {
            if (options[i].length <= Na__AppManifest__SHORT_MAX) return options[i];
        }
        return first;                                                                   // <-- A long single word: the device trims it
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Client Manifest
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Manifest for This Client Link (every URL absolute)
    // ------------------------------------------------------------
    function Na__AppManifest__Build(link) {
        var appRoot = new URL('./', window.location.href).href;                       // <-- https://.../valevision/
        var launch = appRoot + '?project=' + encodeURIComponent(link.project) + '&share=' + encodeURIComponent(link.token);
        var origin = window.location.origin;
        var displayName = Na__AppManifest__DisplayName(link.project);
        return {
            id               : launch,                                                  // <-- ONE APP PER CLIENT LINK (the key line)
            name             : displayName + ' - ' + Na__AppManifest__PRODUCT,
            short_name       : Na__AppManifest__ShortName(displayName),
            description      : 'Your ' + displayName + ' design from Vale Garden Houses, in 3D.',
            start_url        : launch,                                                  // <-- The icon opens this client's model, nothing else
            scope            : appRoot,
            display          : 'standalone',
            display_override : ['standalone', 'minimal-ui', 'browser'],
            orientation      : 'landscape',                                             // <-- Android honours it; iOS asks with the turn screen
            lang             : 'en-GB',
            dir              : 'ltr',
            theme_color      : Na__AppManifest__THEME,
            background_color : Na__AppManifest__BACKGROUND,
            prefer_related_applications : false,
            launch_handler   : { client_mode: 'navigate-existing' },
            icons            : [
                { src: origin + Na__AppManifest__ICON_192, sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: origin + Na__AppManifest__ICON_512, sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: origin + Na__AppManifest__ICON_512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
            ]
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Into the Page
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Set a Meta Tag's Content (the static ones sit just above this script)
    // ------------------------------------------------------------
    function Na__AppManifest__SetMeta(name, content) {
        var meta = document.querySelector('meta[name="' + name + '"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Add THE Manifest Link: href first, then into the page (Safari keeps the first it meets)
    // ------------------------------------------------------------
    function Na__AppManifest__AddLink(href) {
        var existing = document.querySelector('link[rel="manifest"]');
        if (existing) {
            console.warn('[ValeVision3D] A manifest link was already in the page: Safari has kept it, so a client icon '
                       + 'would open the wrong app. Remove it from index.html.');
            return existing;
        }
        var link = document.createElement('link');
        link.setAttribute('rel', 'manifest');
        link.id = Na__AppManifest__LINK_ID;
        link.setAttribute('href', href);                                               // <-- href first...
        document.head.appendChild(link);                                               // <-- ...then into the document, complete
        return link;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply: the Client's Own Manifest, or the Staff App's
    // ------------------------------------------------------------
    function Na__AppManifest__Apply() {
        var link = Na__AppManifest__ReadLink();
        if (!link) {
            Na__AppManifest__AddLink(Na__AppManifest__STAFF_FILE);                     // <-- Staff: unchanged
            return;
        }
        try {
            var manifest = Na__AppManifest__Build(link);
            Na__AppManifest__LastBuilt = manifest;
            Na__AppManifest__AddLink(Na__AppManifest__DATA_PREFIX + encodeURIComponent(JSON.stringify(manifest)));
            Na__AppManifest__SetMeta('apple-mobile-web-app-title', manifest.short_name);   // <-- The Home Screen label on an iPhone or iPad
            Na__AppManifest__SetMeta('application-name', manifest.short_name);
            Na__AppManifest__SetMeta('apple-mobile-web-app-capable', 'yes');
            Na__AppManifest__SetMeta('mobile-web-app-capable', 'yes');
        } catch (error) {
            // NEVER THE STAFF APP ON A CLIENT LINK: with no manifest at all, Add to
            // Home Screen keeps the address the client is on, share token and all.
            console.warn('[ValeVision3D] Client app manifest could not be built; none added.', error);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Browser's Own Install Prompt (Chrome, Edge, Samsung Internet)
// -----------------------------------------------------------------------------

    // FUNCTION | Hold the Install Prompt for the Install Card (client links only)
    // ------------------------------------------------------------
    // beforeinstallprompt can fire before any module has loaded, so it is held
    // here, from the first moment. preventDefault() keeps the browser's own
    // mini-bar away: Na__ClientLinks__InstallApp__ offers it at the right time
    // and calls prompt() inside the client's own tap. appinstalled notes the
    // install for this link, so the offer never comes back.
    // ------------------------------------------------------------
    function Na__AppManifest__HoldInstallPrompt(link) {
        window.addEventListener('beforeinstallprompt', function (event) {
            event.preventDefault();
            Na__AppManifest__InstallPrompt = event;
            window.dispatchEvent(new CustomEvent('na-install-prompt-ready'));
        });
        window.addEventListener('appinstalled', function () {
            Na__AppManifest__InstallPrompt = null;
            try { window.localStorage.setItem(Na__AppManifest__INSTALLED_KEY + link.project, String(Date.now())); } catch (error) { /* this visit only */ }
            window.dispatchEvent(new CustomEvent('na-app-installed'));
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start (blocking, in <head>)
// -----------------------------------------------------------------------------

    var Na__AppManifest__Link = Na__AppManifest__ReadLink();

    window.Na__ClientLinks__AppManifest = {
        getLastBuilt     : function () { return Na__AppManifest__LastBuilt; },        // <-- Console: the client manifest in force, or null on the staff page
        getProjectName   : function () { return Na__AppManifest__Link ? Na__AppManifest__DisplayName(Na__AppManifest__Link.project) : ''; },
        getLaunchUrl     : function () { return Na__AppManifest__LastBuilt ? Na__AppManifest__LastBuilt.start_url : ''; },
        getInstallPrompt : function () { return Na__AppManifest__InstallPrompt; },    // <-- The held beforeinstallprompt, or null
        clearInstallPrompt : function () { Na__AppManifest__InstallPrompt = null; },   // <-- A prompt() can be used once
        wasInstalledHere : function () {                                               // <-- This browser installed this link's app
            if (!Na__AppManifest__Link) return false;
            try { return !!window.localStorage.getItem(Na__AppManifest__INSTALLED_KEY + Na__AppManifest__Link.project); } catch (error) { return false; }
        },
        displayName      : Na__AppManifest__DisplayName,
        shortName        : Na__AppManifest__ShortName
    };

    Na__AppManifest__Apply();
    if (Na__AppManifest__Link) Na__AppManifest__HoldInstallPrompt(Na__AppManifest__Link);

// endregion -------------------------------------------------------------------

})();
