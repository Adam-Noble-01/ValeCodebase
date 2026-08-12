/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET BAKER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetBaker__.js
   NAMESPACE  : VghLantern
   MODULE     : DrawingEditor - SheetBaker
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Compose a drawing sheet for every lantern on a project, offscreen
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Produces one composed sheet descriptor per lantern, so a document pack can carry
     four drawings without a person clicking through the lantern selector four times.
   - Each sheet is composed exactly as the Drawing Editor would compose it: that
     lantern's own recorded paper, scale, gutter shares and camera, its own solved
     geometry, and the same SheetSurface and ViewPlacement the editor itself uses.
   - Results are held for the session and re-baked only when that lantern's inputs
     change, because rasterising a 3D view is the most expensive thing this
     application does and a toggle flick in Preview and Send must not pay for it.

   -----------------------------------------------------------------------------

   WHY THE ACTIVE LANTERN IS NEVER SWITCHED:
   The obvious implementation walks the schedule calling SetCurrentLanternIndex. That
   fires lanternSelected, which re-solves the published geometry, repaints the Lantern
   Editor and both viewports, and re-runs the Drawing Editor's own render - three modes
   rebuilt per lantern to compose a page none of them are showing. Worse, it leaves the
   user's selection somewhere they did not put it if anything throws part way through.
   The baker instead borrows the sheet setup, solves each lantern itself, and hands the
   session state back. Nothing outside this file observes that a bake happened.

   WHY OFFSCREEN RATHER THAN HIDDEN:
   The sheet has to be in the document for ViewPlacement to mount surfaces into its
   frames. display:none gives an element no measurable size, and the 3D pipeline needs
   real dimensions to size its buffer, so the host is parked off-canvas instead - the
   same trick, for the same reason, that ViewPlacement already uses for its snapshot
   stage.

   WHY THE CACHE KEY IS THE LANTERN ITSELF:
   A sheet is a pure function of the lantern config and its recorded sheet setup, both
   of which live on the lantern. Serialising it is therefore a complete description of
   what the sheet would look like, and comparing that against the last bake answers
   "has anything changed" without a single invalidation call anywhere in the codebase.
   ViewPlacement's own snapshot cache is keyed the same way for the same reason, so a
   re-bake that changes only the paper size still reuses the 3D image.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Editor Sheet Baker Module
// =============================================================================

const VghLantern__DrawingEditor__SheetBaker = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const PROJECT_LANTERNS  =  'VghLantern__ProjectFile__Lanterns';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Offscreen Host Identification
    // ------------------------------------------------------------
    const HOST_ELEMENT_ID   =  'VghLantern__DrawingEditor__BakeStage';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Bake Cache and Lifecycle
    // ------------------------------------------------------------
    // Keyed by lantern index, each entry holding the descriptor and the signature it
    // was baked from. Cleared wholesale when the project changes, because indices mean
    // nothing across projects.
    let VghLantern__SheetBaker__Cache        =  {};
    let VghLantern__SheetBaker__CachedFor    =  null;                          // <-- Project code the cache belongs to
    let VghLantern__SheetBaker__HostElement  =  null;
    let VghLantern__SheetBaker__InFlight     =  null;                          // <-- The one bake pass; concurrent callers await it
    let VghLantern__SheetBaker__IsBound      =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Current Project and Its Lantern Schedule
    // ------------------------------------------------------------
    function VghLantern__SheetBaker__ReadProject() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return { Project : null, Lanterns : [] };

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns  =  (project && Array.isArray(project[PROJECT_LANTERNS])) ? project[PROJECT_LANTERNS] : [];

        return { Project : project, Lanterns : lanterns };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Identify the Project a Cache Belongs To
    // ------------------------------------------------------------
    function VghLantern__SheetBaker__ProjectKey(project) {
        var metadata  =  (project && project['VghLantern__ProjectFile__Metadata']) || {};
        return metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name One Lantern for a Progress Report
    // ------------------------------------------------------------
    // Its own title where it has one, its schedule position otherwise. Only ever shown
    // to a person watching a bake, so a lantern with a blank title reads as "Lantern 3"
    // rather than as a gap.
    function VghLantern__SheetBaker__LanternLabel(lantern, lanternIndex) {
        var identity  =  (lantern && lantern['Lantern__Identity__Config']) || {};
        return identity['Lantern__Identity__Config__Title'] || ('Lantern ' + (lanternIndex + 1));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report Bake Progress to an Optional Listener
    // ------------------------------------------------------------
    // Optional because the baker is useful without anyone watching, and a listener that
    // throws must not take a pack down with it - the drawings matter, the commentary
    // does not.
    function VghLantern__SheetBaker__ReportProgress(onProgress, lantern, lanternIndex, total) {
        if (typeof onProgress !== 'function') return;

        try {
            onProgress({
                Index   : lanternIndex + 1,
                Total   : total,
                Label   : VghLantern__SheetBaker__LanternLabel(lantern, lanternIndex),
                Lantern : lantern
            });
        } catch (listenerError) {
            console.warn('[VghLantern__DrawingEditor__SheetBaker] Progress listener threw:', listenerError);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fingerprint Everything One Lantern's Sheet Depends On
    // ------------------------------------------------------------
    // The lantern config and its recorded sheet setup are the whole input, and both
    // live on the lantern, so the lantern serialised is the fingerprint. An
    // unserialisable lantern returns null, which is read as "never reuse" rather than
    // as "unchanged".
    function VghLantern__SheetBaker__Signature(lantern) {
        try {
            return JSON.stringify(lantern || null);
        } catch (e) {
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Solve One Lantern's Geometry
    // ------------------------------------------------------------
    // Solved here rather than read from StateManager, which publishes the ACTIVE
    // lantern only. The solver is pure, so this answer is the same one the editor
    // would publish if this lantern were selected.
    function VghLantern__SheetBaker__SolveGeometry(lantern) {
        var SkeletonSolver  =  window.VghLantern__Geometry__SkeletonSolver;
        var GlazeBarLayout  =  window.VghLantern__Geometry__GlazeBarLayout;
        if (!SkeletonSolver || !lantern) return null;

        var skeleton  =  SkeletonSolver.VghLantern__SkeletonSolver__Solve(lantern);
        if (!skeleton) return null;

        return {
            Skeleton : skeleton,
            BarSet   : GlazeBarLayout ? GlazeBarLayout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern) : null
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get or Create the Offscreen Sheet Stage
    // ------------------------------------------------------------
    // Off-canvas rather than display:none, because a hidden element has no measurable
    // size and the render pipelines need real dimensions. Left in the document between
    // bakes so a second pass reuses it rather than thrashing the DOM.
    function VghLantern__SheetBaker__EnsureHost() {
        if (VghLantern__SheetBaker__HostElement && VghLantern__SheetBaker__HostElement.isConnected) {
            return VghLantern__SheetBaker__HostElement;
        }

        var host  =  document.createElement('div');
        host.id             =  HOST_ELEMENT_ID;
        host.style.cssText  =  'position:absolute;left:-20000px;top:0;width:4000px;height:3000px;' +
                               'overflow:hidden;pointer-events:none;';
        document.body.appendChild(host);

        VghLantern__SheetBaker__HostElement  =  host;
        return host;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Empty the Offscreen Stage
    // ------------------------------------------------------------
    function VghLantern__SheetBaker__ClearHost() {
        if (VghLantern__SheetBaker__HostElement) VghLantern__SheetBaker__HostElement.innerHTML  =  '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Baking One Sheet
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Compose One Lantern's Sheet on the Offscreen Stage
    // ------------------------------------------------------------
    // Returns a sheet descriptor of the same shape SheetManager DescribeSheet returns,
    // so every consumer downstream - the preview page, the PDF painter, the titleblock
    // chrome - reads a baked sheet exactly as it reads a live one.
    //
    // Assumes the caller has already adopted this lantern's sheet setup; that is the
    // caller's job because the setup has to be handed back afterwards whatever
    // happens here.
    async function VghLantern__SheetBaker__ComposeSheet(project, lantern, lanternIndex, layout, geometry) {
        var SheetSurface   =  window.VghLantern__DrawingEditor__SheetSurface;
        var SheetChrome    =  window.VghLantern__DrawingEditor__SheetChrome;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        if (!SheetSurface || !ViewPlacement || !layout) return null;

        var host  =  VghLantern__SheetBaker__EnsureHost();

        // Cleared before this lantern is placed, not after. The placement layer's
        // caches are keyed by slot, so anything the previous lantern left in them
        // would survive a slot that fails to render here and be collected below as
        // though it were this lantern's drawing.
        ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__ResetComposedOutput();

        // Frames are built empty and ViewPlacement mounts live surfaces into them, the
        // same way the on-screen editor does. Baking the slot content instead would
        // mean rendering each view twice.
        host.innerHTML  =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__BuildHtml(layout, {
            Project           : project,
            Lantern           : lantern,
            LanternIndex      : lanternIndex,
            LogoAsset         : SheetChrome
                                    ? SheetChrome.VghLantern__DrawingEditor__SheetChrome__CachedLogo() : null,
            SlotContentHtml   : null,
            ShowResizeHandles : false                                          // <-- Nothing is dragged on a stage nobody can see
        });

        var sheetEl  =  host.firstElementChild;
        if (!sheetEl) return null;

        var placedCount  =  await ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__PlaceAll(
            sheetEl, geometry, lantern, layout
        );

        // Collected while the surfaces are still mounted. Both collectors return
        // copies, which is what lets the next lantern overwrite the shared caches
        // without reaching back into a descriptor already built.
        var descriptor  =  {
            Layout           : layout,
            ScaleDenominator : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator() : null,
            ScaleLabel       : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel() : '',
            ViewSvgMarkup    : ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectSvgMarkup(),
            ViewSnapshots    : ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectSnapshots(),
            IsComposed       : placedCount > 0,
            Project          : project,
            Lantern          : lantern,
            LanternIndex     : lanternIndex,
            Skeleton         : geometry ? geometry.Skeleton : null
        };

        VghLantern__SheetBaker__ClearHost();                                   // <-- Surfaces are disposed by the next PlaceAll; the markup is not needed
        return descriptor;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Baking the Whole Schedule
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Walk the Schedule and Compose Every Stale Sheet
    // ------------------------------------------------------------
    async function VghLantern__SheetBaker__RunBake(onProgress) {
        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        var SheetChrome   =  window.VghLantern__DrawingEditor__SheetChrome;
        var read          =  VghLantern__SheetBaker__ReadProject();
        if (!SheetManager || !read.Project || !read.Lanterns.length) return [];

        // Awaited once for the whole pass rather than per sheet, so a four-lantern
        // bake fetches the titleblock logo once.
        if (SheetChrome) await SheetChrome.VghLantern__DrawingEditor__SheetChrome__LoadLogo();

        var projectKey  =  VghLantern__SheetBaker__ProjectKey(read.Project);
        if (VghLantern__SheetBaker__CachedFor !== projectKey) {
            VghLantern__SheetBaker__Cache      =  {};                          // <-- Indices mean nothing across projects
            VghLantern__SheetBaker__CachedFor  =  projectKey;
        }

        var restoreSetup  =  SheetManager.VghLantern__DrawingEditor__SheetManager__CaptureSessionSetup();
        var results       =  [];
        var i, lantern, signature, cached, geometry, layout, descriptor;

        try {
            for (i = 0; i < read.Lanterns.length; i++) {
                lantern    =  read.Lanterns[i];
                signature  =  VghLantern__SheetBaker__Signature(lantern);
                cached     =  VghLantern__SheetBaker__Cache[i];

                // Reported before the cache is consulted, so a pass that reuses three
                // sheets and composes one still counts through all four. The count is
                // how far through the SCHEDULE the pass is, not how much work it did.
                VghLantern__SheetBaker__ReportProgress(onProgress, lantern, i, read.Lanterns.length);

                if (cached && signature !== null && cached.Signature === signature) {
                    results.push(cached.Sheet);                                // <-- Nothing about this lantern has moved since it was last composed
                    continue;
                }

                geometry  =  VghLantern__SheetBaker__SolveGeometry(lantern);
                if (!geometry) {
                    // An unsolvable lantern yields no sheet rather than taking the
                    // whole pack down. Preview and Send reports it against that
                    // lantern, which is more use than a pack that refuses to build.
                    console.warn('[VghLantern__DrawingEditor__SheetBaker] Lantern ' + i + ' could not be solved; its drawing is omitted.');
                    results.push(null);
                    continue;
                }

                layout  =  SheetManager.VghLantern__DrawingEditor__SheetManager__AdoptLanternForBake(lantern, geometry);
                if (!layout) {
                    results.push(null);
                    continue;
                }

                descriptor  =  await VghLantern__SheetBaker__ComposeSheet(read.Project, lantern, i, layout, geometry);
                results.push(descriptor);

                if (descriptor && signature !== null) {
                    VghLantern__SheetBaker__Cache[i]  =  { Signature : signature, Sheet : descriptor };
                }
            }
        } finally {
            // Handed back whatever happened above, so a lantern that throws mid-bake
            // cannot leave the Drawing Editor set to someone else's paper.
            SheetManager.VghLantern__DrawingEditor__SheetManager__RestoreSessionSetup(restoreSetup);
            VghLantern__SheetBaker__ClearHost();

            // The placement caches now hold the LAST lantern baked. Left there, a
            // Drawing Editor asked to describe its sheet before its next render would
            // hand back that lantern's views under the active lantern's titleblock.
            // Cleared, it reports itself uncomposed instead, which is the honest
            // answer and one the editor already knows how to recover from by
            // rendering.
            var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
            if (ViewPlacement) ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__ResetComposedOutput();
        }

        // Entries for lanterns removed since the last bake would otherwise sit in the
        // cache forever, holding a rasterised image each.
        var key;
        for (key in VghLantern__SheetBaker__Cache) {
            if (!Object.prototype.hasOwnProperty.call(VghLantern__SheetBaker__Cache, key)) continue;
            if (Number(key) >= read.Lanterns.length) delete VghLantern__SheetBaker__Cache[key];
        }

        return results;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Compose a Sheet for Every Lantern on the Current Project
    // ------------------------------------------------------------
    // Returns an array index-aligned with the project's lantern schedule, holding a
    // sheet descriptor per lantern or null where one could not be composed.
    //
    // Concurrent callers share one pass. Preview and Send renders on several signals -
    // entering the mode, a geometry solve, a toggle - and two overlapping bakes would
    // fight over the session sheet setup they both borrow.
    //
    // onProgress belongs to whichever caller STARTS the pass. A caller that joins one
    // already running is watching work it did not commission, and re-pointing the
    // listener mid-pass would report the same schedule to two different overlays.
    async function VghLantern__DrawingEditor__SheetBaker__BakeAll(onProgress) {
        if (VghLantern__SheetBaker__InFlight) return VghLantern__SheetBaker__InFlight;

        VghLantern__SheetBaker__InFlight  =  (async function() {
            try {
                return await VghLantern__SheetBaker__RunBake(onProgress);
            } catch (bakeError) {
                console.error('[VghLantern__DrawingEditor__SheetBaker] Bake failed:', bakeError);
                return [];
            } finally {
                VghLantern__SheetBaker__InFlight  =  null;
            }
        })();

        return VghLantern__SheetBaker__InFlight;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Cached Sheets Without Baking
    // ------------------------------------------------------------
    // The synchronous read for renderers that must paint now. Returns a sparse array
    // whose holes are lanterns not yet composed, which the caller shows as a pending
    // page rather than blocking the whole preview on a rasterise.
    function VghLantern__DrawingEditor__SheetBaker__PeekAll() {
        var read     =  VghLantern__SheetBaker__ReadProject();
        var results  =  [];
        var i, cached;

        if (VghLantern__SheetBaker__CachedFor !== VghLantern__SheetBaker__ProjectKey(read.Project)) return results;

        for (i = 0; i < read.Lanterns.length; i++) {
            cached  =  VghLantern__SheetBaker__Cache[i];
            results.push((cached && cached.Signature === VghLantern__SheetBaker__Signature(read.Lanterns[i]))
                ? cached.Sheet
                : null);
        }

        return results;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether Every Lantern Has a Current Baked Sheet
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetBaker__IsComplete() {
        var sheets  =  VghLantern__DrawingEditor__SheetBaker__PeekAll();
        var read    =  VghLantern__SheetBaker__ReadProject();
        var i;

        if (!read.Lanterns.length) return false;
        if (sheets.length !== read.Lanterns.length) return false;

        for (i = 0; i < sheets.length; i++) {
            if (!sheets[i]) return false;
        }

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Discard Every Baked Sheet
    // ------------------------------------------------------------
    // Rarely needed - the signature check already re-bakes anything that has moved -
    // but a project close should not leave a schedule's worth of rasters in memory.
    function VghLantern__DrawingEditor__SheetBaker__Clear() {
        VghLantern__SheetBaker__Cache      =  {};
        VghLantern__SheetBaker__CachedFor  =  null;
        VghLantern__SheetBaker__ClearHost();
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to the Project Lifecycle
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetBaker__Init() {
        if (VghLantern__SheetBaker__IsBound) return;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('projectChanged', function() {
            VghLantern__DrawingEditor__SheetBaker__Clear();
        });

        VghLantern__SheetBaker__IsBound  =  true;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetBaker__Init       : VghLantern__DrawingEditor__SheetBaker__Init,
        VghLantern__DrawingEditor__SheetBaker__BakeAll    : VghLantern__DrawingEditor__SheetBaker__BakeAll,
        VghLantern__DrawingEditor__SheetBaker__PeekAll    : VghLantern__DrawingEditor__SheetBaker__PeekAll,
        VghLantern__DrawingEditor__SheetBaker__IsComplete : VghLantern__DrawingEditor__SheetBaker__IsComplete,
        VghLantern__DrawingEditor__SheetBaker__Clear      : VghLantern__DrawingEditor__SheetBaker__Clear
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetBaker  =  VghLantern__DrawingEditor__SheetBaker;
