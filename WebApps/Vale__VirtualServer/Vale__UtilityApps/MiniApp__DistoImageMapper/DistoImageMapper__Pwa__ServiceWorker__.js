/* =============================================================================
   DISTO IMAGE MAPPER - SERVICE WORKER (INSTALLABLE APP, WORKS OFFLINE)
   =============================================================================

   FILE       : DistoImageMapper__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make the app installable and able to run on site with no connection
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Scope: this app's folder, plus the shared install card it loads from the site's
     common assets.
   - Every app file is cached on install, so it works offline from the first visit.
     Other Vale apps fill their cache as they go, but a survey tool is opened where
     there is often no signal.
   - App files: network first, so an update is never stale. The cached copy answers
     when offline, or when the network has not answered within a moment.
   - Survey files are read straight from the device and never pass through here.
   - Only this worker's own caches (disto-image-mapper-*) are ever deleted: the site
     is one origin for every Vale app, so it must never touch theirs.
   - Bump the version when the list below changes.

   ============================================================================= */

var DISTO_SW_VERSION         = '2026-11-06-3';
var DISTO_SW_SHELL           = 'disto-image-mapper-shell-' + DISTO_SW_VERSION;
var DISTO_SW_NETWORK_WAIT_MS = 2500;                                           // <-- How long the network gets before the cached copy is used

var DISTO_SW_MODULES = '02__AppModules/';
var DISTO_SW_THREE   = '03__VersionLocked__VenderedDependencies/01__Vendor__ThreeJs__v0.184.0/';
var DISTO_SW_ICONS   = '01__AppAssets/UiIcons__MenuIcons__DistoMapper/';
var DISTO_SW_SHARED  = '/AppAssets__CommonApplicationAssets/';
var DISTO_SW_PAGE    = './DistoImageMapper__AppIndex__.html';

var DISTO_SW_APP_FILES = [
    DISTO_SW_PAGE,
    './DistoImageMapper__Pwa__Manifest__.webmanifest',

    '01__AppAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png',
    '01__AppAssets/DistoImageMapper__AppGraphic__DistoDevice__.svg',
    '01__AppAssets/DistoImageMapper__AppIcon__.svg',
    '01__AppAssets/DistoImageMapper__AppIcon__192x192.png',
    '01__AppAssets/DistoImageMapper__AppIcon__512x512.png',
    '01__AppAssets/Fonts__AppFontFiles/FontType_-_OpenSans-Light.ttf',
    '01__AppAssets/Fonts__AppFontFiles/FontType_-_OpenSans-Regular.ttf',
    '01__AppAssets/Fonts__AppFontFiles/FontType_-_OpenSans-SemiBold.ttf',

    DISTO_SW_ICONS + 'Icon__DistoMapper__Close__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Controls__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Elevation__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__FrameAll__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__InstallApp__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Layers__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Measure__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Next__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__OpenFolder__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Panel__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Photos__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Plan__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Previous__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__SaveImage__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Sheets__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__SurveyCheck__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__ClipBox__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__ExportDxf__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__SquareToPoints__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__Tripod__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__View3d__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__ZoomIn__.svg',
    DISTO_SW_ICONS + 'Icon__DistoMapper__ZoomOut__.svg',

    DISTO_SW_SHARED + 'Shared__AppInstall/ValeShared__AppInstall__.css',
    DISTO_SW_SHARED + 'Shared__AppInstall/ValeShared__AppInstall__.js',
    DISTO_SW_SHARED + 'Shared__AppUpdate/ValeShared__AppUpdate__.js',

    DISTO_SW_MODULES + '01__AppCore/DistoImageMapper__AppCore__Config__.mjs',
    DISTO_SW_MODULES + '01__AppCore/DistoImageMapper__AppCore__Format__.mjs',
    DISTO_SW_MODULES + '01__AppCore/DistoImageMapper__AppCore__Init__.mjs',
    DISTO_SW_MODULES + '01__AppCore/DistoImageMapper__AppCore__State__.mjs',
    DISTO_SW_MODULES + '01__AppCore/DistoImageMapper__AppCore__UserConfig__.mjs',
    DISTO_SW_MODULES + '02__AppData/Na__AppConfig__Main.json',
    DISTO_SW_MODULES + '03__DataIntake/DistoImageMapper__Intake__CsvParser__.mjs',
    DISTO_SW_MODULES + '03__DataIntake/DistoImageMapper__Intake__DxfParser__.mjs',
    DISTO_SW_MODULES + '03__DataIntake/DistoImageMapper__Intake__FolderReader__.mjs',
    DISTO_SW_MODULES + '03__DataIntake/DistoImageMapper__Intake__SurveyBuilder__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__AlignmentSheets__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__CameraRig__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__Coordinates__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__PhotoCards__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__SceneManager__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__SurveyLines__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__ControlPanel__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__Filmstrip__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__LandingScreen__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__Lightbox__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__MeasureTool__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__ClipBoxPanel__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__ExportDialog__.mjs',
    DISTO_SW_MODULES + '05__UiPanels/DistoImageMapper__Ui__PanelMenu__.mjs',
    DISTO_SW_MODULES + '04__Env3d/DistoImageMapper__Env3d__ClipBox__.mjs',
    DISTO_SW_MODULES + '07__Export/DistoImageMapper__Export__DxfWriter__.mjs',
    DISTO_SW_MODULES + '07__Export/DistoImageMapper__Export__SurveyDxf__.mjs',
    DISTO_SW_MODULES + '07__Export/DistoImageMapper__Export__ZipWriter__.mjs',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__CoreUi__Styles__BaseLayout__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__CoreUi__Styles__Fonts__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__CoreUi__Styles__Variables__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__UiFeature__Styles__Landing__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__UiFeature__Styles__Lightbox__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__UiFeature__Styles__ClipBox__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__UiFeature__Styles__PanelMenu__.css',
    DISTO_SW_MODULES + '06__Style__AppStylesheets/DistoImageMapper__UiFeature__Styles__Stage__.css',

    DISTO_SW_THREE + 'build/three.core.min.js',
    DISTO_SW_THREE + 'build/three.module.min.js',
    DISTO_SW_THREE + 'examples/jsm/controls/OrbitControls.js',
    DISTO_SW_THREE + 'examples/jsm/lines/LineMaterial.js',
    DISTO_SW_THREE + 'examples/jsm/lines/LineSegments2.js',
    DISTO_SW_THREE + 'examples/jsm/lines/LineSegmentsGeometry.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(caches.open(DISTO_SW_SHELL).then(function(cache) {
        return Promise.all(DISTO_SW_APP_FILES.map(function(file) {
            return cache.add(file).catch(function() {});                       // <-- One missing file must never stop the app installing
        }));
    }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) {
            return k.indexOf('disto-image-mapper-') === 0 && k !== DISTO_SW_SHELL;  // <-- Own caches only
        }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;

    var url   = new URL(req.url);
    var scope = new URL(self.registration.scope);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.indexOf(scope.pathname) !== 0 && url.pathname.indexOf(DISTO_SW_SHARED) !== 0) return;

    event.respondWith(caches.match(req, { ignoreSearch: true }).then(function(hit) {
        var network = fetch(req).then(function(res) {                          // <-- App files: network first
            if (res.ok) { var copy = res.clone(); caches.open(DISTO_SW_SHELL).then(function(c) { c.put(req, copy); }); }
            return res;
        });

        if (!hit) return network.catch(function() {
            if (req.mode !== 'navigate') return Response.error();
            return caches.match(new URL(DISTO_SW_PAGE, scope).href).then(function(page) {  // <-- /disto-app/ offline: the same page under its own name
                return page || Response.error();
            });
        });

        var patience = new Promise(function(resolve) {                         // <-- One bar of signal on site must not stall the app
            setTimeout(function() { resolve(hit); }, DISTO_SW_NETWORK_WAIT_MS);
        });
        return Promise.race([network.catch(function() { return hit; }), patience]);
    }));
});
