/* =============================================================================
   VGHLANTERN - COMPONENT INDEX GALLERY
   =============================================================================

   FILE       : VghLantern__ComponentIndex__Main__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ComponentIndex
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Browsable gallery of lantern components and swept profiles
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders a card gallery of every asset in the two data libraries
   - Two library tabs: Components (finials, bases, cresting, vents) and Profiles
     (glazing bars, ridge, hip, eaves and kerb sections)
   - Category filter chips plus a live text search across id, name and category
   - Each card shows a 2D preview traced from the asset's Na__Asset__Profile2D
     outline, so nothing depends on pre-rendered raster thumbnails
   - Clicking a card opens the DetailView panel for that asset
   - Badges surface the Has2dProfile / Has3d gating flags at a glance

   -----------------------------------------------------------------------------

   DATA ACCESS:
   All reads go through ComponentIndexLoader and ProfileIndexLoader. This module
   never fetches an index or asset JSON directly - see the loaders' headers for
   why they are the single consumers.

   PREVIEW RENDERING:
   Card previews are inline SVG built from outline points. The heavy lifting is
   shared with the 2D environment via Env2d__SvgHelpers, so a profile looks the
   same here as it does on a plan or elevation.

   Every preview draws at one fixed outline weight, frames the section in a
   square viewBox so all cards read at the same proportion, and marks the
   insertion origin with a red diagonal cross. Both the card grid and the
   detail panel come through BuildPreviewSvg, so neither can drift from the
   other.

   The toolbar carries a small / medium / large thumbnail toggle. Grid columns
   are a fixed width per setting rather than a fluid stretch, so a card is the
   same size whatever the viewport.

   ============================================================================= */

// =============================================================================
// REGION | Component Index Module
// =============================================================================

const VghLantern__System__ComponentIndex = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Targets and Library Keys
    // ------------------------------------------------------------
    const ROOT_CONTAINER_ID   =  'VghLantern__ComponentIndex__RootContainer';     // <-- Mode panel root
    const LIBRARY_COMPONENTS  =  'components';                                    // <-- Discrete objects
    const LIBRARY_PROFILES    =  'profiles';                                      // <-- Swept cross-sections
    const CATEGORY_ALL        =  '__all__';                                       // <-- Sentinel for the unfiltered chip
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Card Preview Geometry
    // ------------------------------------------------------------
    // Outline weight is a fixed screen width owned by the stylesheet, never a
    // scaled attribute, so a 120mm eaves reads at the same line weight as a
    // 50mm glazing bar. The origin cross is sized off the framed span for the
    // same reason - identical on every card whatever the section measures.
    const PREVIEW_PADDING_PCT =  0.12;                                            // <-- Breathing room around the outline
    const PREVIEW_ORIGIN_ARM  =  0.09;                                            // <-- Cross arm as a fraction of the framed span
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Thumbnail Size Options
    // ------------------------------------------------------------
    // Keys pair with the .VghLantern__ComponentIndex__Grid--* modifiers that
    // carry the actual pixel widths, so the sizes live in the stylesheet.
    const THUMB_SIZE_DEFAULT  =  'medium';                                        // <-- Size used until the user picks another
    const THUMB_SIZE_OPTIONS  =  [
        { Key : 'small',  Label : 'S', Title : 'Small thumbnails'  },
        { Key : 'medium', Label : 'M', Title : 'Medium thumbnails' },
        { Key : 'large',  Label : 'L', Title : 'Large thumbnails'  }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Active Filter State
    // ------------------------------------------------------------
    let VghLantern__ComponentIndex__ActiveLibrary   =  LIBRARY_COMPONENTS;        // <-- Selected library tab
    let VghLantern__ComponentIndex__ActiveCategory   =  CATEGORY_ALL;             // <-- Selected category chip
    let VghLantern__ComponentIndex__SearchQuery      =  '';                       // <-- Live search text
    let VghLantern__ComponentIndex__ThumbSize        =  THUMB_SIZE_DEFAULT;       // <-- Selected thumbnail size
    let VghLantern__ComponentIndex__IsDelegationBound = false;                    // <-- One-time listener guard
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Loader for the Active Library
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__ActiveLoader() {
        return (VghLantern__ComponentIndex__ActiveLibrary === LIBRARY_PROFILES)
            ? window.VghLantern__AppData__ProfileIndexLoader
            : window.VghLantern__AppData__ComponentIndexLoader;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Asset Id Field for the Active Library
    // ------------------------------------------------------------
    // Component entries key on AssetId, profile entries on ProfileId. Everything
    // downstream works from this single normalised accessor.
    function VghLantern__ComponentIndex__EntryId(entry) {
        if (!entry) return '';
        return entry.AssetId || entry.ProfileId || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Display Name for an Entry
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__EntryName(entry) {
        if (!entry) return '';
        return entry.Name || VghLantern__ComponentIndex__EntryId(entry);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | List Categories for the Active Library
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__ListCategories() {
        var loader  =  VghLantern__ComponentIndex__ActiveLoader();
        if (!loader) return [];

        return (VghLantern__ComponentIndex__ActiveLibrary === LIBRARY_PROFILES)
            ? loader.VghLantern__ProfileIndexLoader__ListCategories()
            : loader.VghLantern__ComponentIndexLoader__ListCategories();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | List Entries for the Active Library
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__ListEntries() {
        var loader  =  VghLantern__ComponentIndex__ActiveLoader();
        if (!loader) return [];

        return (VghLantern__ComponentIndex__ActiveLibrary === LIBRARY_PROFILES)
            ? loader.VghLantern__ProfileIndexLoader__ListEntries()
            : loader.VghLantern__ComponentIndexLoader__ListEntries();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch Outline Points for an Entry
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndex__OutlineFor(entryId) {
        var loader  =  VghLantern__ComponentIndex__ActiveLoader();
        if (!loader || !entryId) return null;

        try {
            return (VghLantern__ComponentIndex__ActiveLibrary === LIBRARY_PROFILES)
                ? await loader.VghLantern__ProfileIndexLoader__GetOutlinePoints(entryId)
                : await loader.VghLantern__ComponentIndexLoader__GetOutlinePoints(entryId);
        } catch (err) {
            console.warn('[VghLantern ComponentIndex] Outline unavailable for ' + entryId + ':', err);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filtering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Test One Entry Against the Active Filters
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__MatchesFilters(entry) {
        if (!entry) return false;

        if (VghLantern__ComponentIndex__ActiveCategory !== CATEGORY_ALL &&
            entry.CategoryId !== VghLantern__ComponentIndex__ActiveCategory) {
            return false;
        }

        if (!VghLantern__ComponentIndex__SearchQuery) return true;

        var query      =  VghLantern__ComponentIndex__SearchQuery.toLowerCase();
        var haystack   =  [
            VghLantern__ComponentIndex__EntryId(entry),
            entry.Name        || '',
            entry.CategoryId  || '',
            entry.CategoryName || ''
        ].join(' ').toLowerCase();

        return haystack.indexOf(query) !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Filtered and Sorted Entry List
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__FilteredEntries() {
        var entries  =  VghLantern__ComponentIndex__ListEntries().filter(
            VghLantern__ComponentIndex__MatchesFilters);

        entries.sort(function(left, right) {
            var leftId   =  VghLantern__ComponentIndex__EntryId(left);
            var rightId  =  VghLantern__ComponentIndex__EntryId(right);
            return leftId.localeCompare(rightId, undefined, { numeric : true });
        });

        return entries;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Card Preview Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute the Bounding Box of an Outline
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__OutlineBounds(points) {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (var i = 0; i < points.length; i++) {
            var point  =  points[i];
            var x      =  Number(point.X_mm !== undefined ? point.X_mm : point.x);
            var y      =  Number(point.Y_mm !== undefined ? point.Y_mm : point.y);
            if (!isFinite(x) || !isFinite(y)) continue;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        if (!isFinite(minX) || !isFinite(minY)) return null;

        return {
            MinX   : minX,
            MinY   : minY,
            Width  : Math.max(maxX - minX, 1),
            Height : Math.max(maxY - minY, 1)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the SVG Path Data for an Outline
    // ------------------------------------------------------------
    // Y is negated so a +Y-up profile reads the right way round in SVG's
    // +Y-down space, matching the convention used across the 2D environment.
    function VghLantern__ComponentIndex__OutlinePathData(points) {
        var pathData  =  '';

        for (var i = 0; i < points.length; i++) {
            var point  =  points[i];
            var x      =  Number(point.X_mm !== undefined ? point.X_mm : point.x);
            var y      =  Number(point.Y_mm !== undefined ? point.Y_mm : point.y);
            if (!isFinite(x) || !isFinite(y)) continue;

            pathData  +=  (pathData ? ' L ' : 'M ') + x.toFixed(2) + ' ' + (-y).toFixed(2);
        }

        return pathData ? (pathData + ' Z') : '';                                 // <-- Outlines are always closed
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Insertion Origin Cross
    // ------------------------------------------------------------
    // Profile skeletons declare their insertion point at (0, 0), which stays at
    // (0, 0) in SVG space because only Y is negated by the path builder. The
    // cross is turned 45 degrees so it never sits along an outline edge, where
    // an upright crosshair would read as part of the section.
    function VghLantern__ComponentIndex__OriginMarker(viewSpan) {
        var armLength  =  viewSpan * PREVIEW_ORIGIN_ARM;                          // <-- Half length of each arm
        var offset     =  armLength / Math.SQRT2;                                 // <-- Diagonal step that preserves the arm length
        var far        =  offset.toFixed(2);
        var near       =  (-offset).toFixed(2);

        var marker  =  '<line class="VghLantern__ComponentIndex__OriginLine"';
        marker     +=      ' x1="' + near + '" y1="' + near + '" x2="' + far + '" y2="' + far + '" />';
        marker     +=  '<line class="VghLantern__ComponentIndex__OriginLine"';
        marker     +=      ' x1="' + near + '" y1="' + far + '" x2="' + far + '" y2="' + near + '" />';

        return marker;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build an Inline SVG Preview from Outline Points
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildPreviewSvg(points) {
        if (!Array.isArray(points) || points.length < 3) return '';

        var bounds  =  VghLantern__ComponentIndex__OutlineBounds(points);
        if (!bounds) return '';

        // A square viewBox centred on the outline, sized off the longer edge, so
        // every section is framed to the same proportion of the square well. A
        // per-axis pad would leave a wide eaves tight to the sides while a
        // narrow glazing bar floated in space.
        var outlineSpan  =  Math.max(bounds.Width, bounds.Height);
        var viewSpan     =  outlineSpan * (1 + PREVIEW_PADDING_PCT * 2);
        var centreX      =  bounds.MinX + bounds.Width  / 2;
        var centreY      =  -(bounds.MinY + bounds.Height / 2);                   // <-- Negated to match the flipped path

        var viewBox  =  [
            (centreX - viewSpan / 2).toFixed(2),
            (centreY - viewSpan / 2).toFixed(2),
            viewSpan.toFixed(2),
            viewSpan.toFixed(2)
        ].join(' ');

        var pathData  =  VghLantern__ComponentIndex__OutlinePathData(points);
        if (!pathData) return '';

        var svg  =  '<svg class="VghLantern__ComponentIndex__PreviewSvg" viewBox="' + viewBox + '"';
        svg     +=      ' preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
        svg     +=      '<path d="' + pathData + '" class="VghLantern__ComponentIndex__PreviewPath" />';
        svg     +=      VghLantern__ComponentIndex__OriginMarker(viewSpan);       // <-- Drawn last, the section fill would otherwise bury it
        svg     +=  '</svg>';

        return svg;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Populate Every Card Preview Asynchronously
    // ------------------------------------------------------------
    // Cards render immediately with a loading shim, then each preview is filled
    // in as its asset JSON arrives. This keeps the grid responsive on a cold
    // cache rather than blocking the whole gallery on the slowest fetch.
    async function VghLantern__ComponentIndex__PopulatePreviews(entryIds) {
        for (var i = 0; i < entryIds.length; i++) {
            var entryId  =  entryIds[i];
            var host     =  document.querySelector(
                '.VghLantern__ComponentIndex__Preview[data-entry-id="' + entryId + '"]');
            if (!host) continue;

            var points  =  await VghLantern__ComponentIndex__OutlineFor(entryId);
            var svg     =  VghLantern__ComponentIndex__BuildPreviewSvg(points);

            host.classList.remove('VghLantern__ComponentIndex__Preview--loading');

            if (svg) {
                host.innerHTML  =  svg;
            } else {
                host.innerHTML  =  '<div class="VghLantern__ComponentIndex__PreviewMissing">3D only</div>';
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markup Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Library Tab Strip
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildLibraryTabs() {
        function tab(libraryKey, labelText) {
            var isActive  =  (VghLantern__ComponentIndex__ActiveLibrary === libraryKey);
            var cssClass  =  'VghLantern__ComponentIndex__LibraryTab' +
                             (isActive ? ' VghLantern__ComponentIndex__LibraryTab--active' : '');
            return '<button class="' + cssClass + '" data-library="' + libraryKey + '">' + labelText + '</button>';
        }

        var html  =  '<div class="VghLantern__ComponentIndex__LibraryTabs">';
        html     +=      tab(LIBRARY_COMPONENTS, 'Components');
        html     +=      tab(LIBRARY_PROFILES,   'Profiles');
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Category Filter Chip Row
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildCategoryChips() {
        var categories  =  VghLantern__ComponentIndex__ListCategories();

        function chip(categoryId, labelText) {
            var isActive  =  (VghLantern__ComponentIndex__ActiveCategory === categoryId);
            var cssClass  =  'VghLantern__ComponentIndex__CategoryChip' +
                             (isActive ? ' VghLantern__ComponentIndex__CategoryChip--active' : '');
            return '<button class="' + cssClass + '" data-category-id="' +
                   VghLantern__ComponentIndex__Escape(categoryId) + '">' +
                   VghLantern__ComponentIndex__Escape(labelText) + '</button>';
        }

        var html  =  '<div class="VghLantern__ComponentIndex__CategoryChips">';
        html     +=      chip(CATEGORY_ALL, 'All');

        for (var i = 0; i < categories.length; i++) {
            var category  =  categories[i];
            if (!category || !category.CategoryId) continue;
            html  +=  chip(category.CategoryId, category.CategoryName || category.CategoryId);
        }

        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Thumbnail Size Toggle
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildSizeToggle() {
        var html  =  '<div class="VghLantern__ComponentIndex__SizeToggle"' +
                     ' role="group" aria-label="Thumbnail size">';

        for (var i = 0; i < THUMB_SIZE_OPTIONS.length; i++) {
            var option    =  THUMB_SIZE_OPTIONS[i];
            var isActive  =  (VghLantern__ComponentIndex__ThumbSize === option.Key);
            var cssClass  =  'VghLantern__ComponentIndex__SizeButton' +
                             (isActive ? ' VghLantern__ComponentIndex__SizeButton--active' : '');

            html  +=  '<button class="' + cssClass + '" data-thumb-size="' + option.Key + '"';
            html  +=      ' title="' + option.Title + '" aria-label="' + option.Title + '"';
            html  +=      ' aria-pressed="' + (isActive ? 'true' : 'false') + '">';
            html  +=      option.Label + '</button>';
        }

        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Class List for the Card Grid
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__GridClass() {
        return 'VghLantern__ComponentIndex__Grid ' +
               'VghLantern__ComponentIndex__Grid--' + VghLantern__ComponentIndex__ThumbSize;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Toolbar - Tabs, Search, and Chips
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildToolbar(visibleCount, totalCount) {
        var html  =  '<div class="VghLantern__ComponentIndex__Toolbar">';
        html     +=      VghLantern__ComponentIndex__BuildLibraryTabs();
        html     +=      '<div class="VghLantern__ComponentIndex__ToolbarRight">';
        html     +=          '<span class="VghLantern__ComponentIndex__Count">' +
                                 visibleCount + ' of ' + totalCount + '</span>';
        html     +=          VghLantern__ComponentIndex__BuildSizeToggle();
        html     +=          '<input type="text" id="VghLantern__ComponentIndex__SearchInput"';
        html     +=              ' class="VghLantern__ComponentIndex__SearchInput"';
        html     +=              ' autocomplete="off" data-vghlantern-noautofill="true"';
        html     +=              ' placeholder="Search by id, name or category..."';
        html     +=              ' value="' + VghLantern__ComponentIndex__Escape(VghLantern__ComponentIndex__SearchQuery) + '">';
        html     +=      '</div>';
        html     +=  '</div>';
        html     +=  VghLantern__ComponentIndex__BuildCategoryChips();
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Capability Badge Row for a Card
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildBadges(entry) {
        var html  =  '<div class="VghLantern__ComponentIndex__Badges">';

        if (entry.Has2dProfile !== false) {
            html  +=  '<span class="VghLantern__ComponentIndex__Badge VghLantern__ComponentIndex__Badge--2d">2D</span>';
        }
        if (entry.Has3d === true || entry.Glb3dUrl) {
            html  +=  '<span class="VghLantern__ComponentIndex__Badge VghLantern__ComponentIndex__Badge--3d">3D</span>';
        }

        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Single Asset Card
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildCard(entry) {
        var entryId  =  VghLantern__ComponentIndex__EntryId(entry);
        var safeId   =  VghLantern__ComponentIndex__Escape(entryId);
        var name     =  VghLantern__ComponentIndex__Escape(VghLantern__ComponentIndex__EntryName(entry));
        var category =  VghLantern__ComponentIndex__Escape(entry.CategoryName || entry.CategoryId || '');

        var html  =  '<button class="VghLantern__ComponentIndex__Card" data-entry-id="' + safeId + '">';
        html     +=      '<div class="VghLantern__ComponentIndex__Preview VghLantern__ComponentIndex__Preview--loading"';
        html     +=          ' data-entry-id="' + safeId + '"></div>';
        html     +=      '<div class="VghLantern__ComponentIndex__CardBody">';
        html     +=          '<div class="VghLantern__ComponentIndex__CardId">'   + safeId   + '</div>';
        html     +=          '<div class="VghLantern__ComponentIndex__CardName">' + name     + '</div>';
        html     +=          '<div class="VghLantern__ComponentIndex__CardCategory">' + category + '</div>';
        html     +=          VghLantern__ComponentIndex__BuildBadges(entry);
        html     +=      '</div>';
        html     +=  '</button>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Empty State Placeholder
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BuildEmptyState(hasAnyEntries) {
        var titleText  =  hasAnyEntries ? 'No Matching Assets' : 'Library Not Built Yet';
        var bodyText   =  hasAnyEntries
            ? 'Adjust the search text or pick a different category.'
            : 'Run the index builder in 60__Dev__WebBuildUtils to generate the data index, then reload.';

        var html  =  '<div class="VghLantern__ComponentIndex__EmptyState">';
        html     +=      '<div class="VghLantern__ComponentIndex__EmptyState__Title">' + titleText + '</div>';
        html     +=      '<div class="VghLantern__ComponentIndex__EmptyState__Text">'  + bodyText  + '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Pipeline
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Ensure Both Library Indexes Are Loaded
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndex__EnsureIndexesLoaded() {
        var ComponentLoader  =  window.VghLantern__AppData__ComponentIndexLoader;
        var ProfileLoader    =  window.VghLantern__AppData__ProfileIndexLoader;

        var pending  =  [];
        if (ComponentLoader) pending.push(ComponentLoader.VghLantern__ComponentIndexLoader__LoadIndex());
        if (ProfileLoader)   pending.push(ProfileLoader.VghLantern__ProfileIndexLoader__LoadIndex());

        await Promise.all(pending);                                               // <-- Both loaders memoise, so this is cheap on repeat entry
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Component Index Gallery
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndex__Render(containerId) {
        var container  =  document.getElementById(containerId || ROOT_CONTAINER_ID);
        if (!container) {
            console.warn('[VghLantern ComponentIndex] Container not found.');
            return;
        }

        await VghLantern__ComponentIndex__EnsureIndexesLoaded();

        var allEntries      =  VghLantern__ComponentIndex__ListEntries();
        var visibleEntries  =  VghLantern__ComponentIndex__FilteredEntries();

        var html  =  VghLantern__ComponentIndex__BuildToolbar(visibleEntries.length, allEntries.length);

        if (visibleEntries.length === 0) {
            html  +=  VghLantern__ComponentIndex__BuildEmptyState(allEntries.length > 0);
            container.innerHTML  =  html;
            VghLantern__ComponentIndex__BindSearchInput();
            return;
        }

        html  +=  '<div class="' + VghLantern__ComponentIndex__GridClass() + '">';

        var entryIds  =  [];
        for (var i = 0; i < visibleEntries.length; i++) {
            html  +=  VghLantern__ComponentIndex__BuildCard(visibleEntries[i]);
            entryIds.push(VghLantern__ComponentIndex__EntryId(visibleEntries[i]));
        }

        html  +=  '</div>';

        container.innerHTML  =  html;

        VghLantern__ComponentIndex__BindSearchInput();
        void VghLantern__ComponentIndex__PopulatePreviews(entryIds);              // <-- Fire and forget; cards are already visible
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Search Input After Each Redraw
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__BindSearchInput() {
        var searchInput  =  document.getElementById('VghLantern__ComponentIndex__SearchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', function(event) {
            VghLantern__ComponentIndex__SearchQuery  =  event.target.value;
            void VghLantern__ComponentIndex__Render();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Delegation and Initialisation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply the Selected Thumbnail Size to the Live DOM
    // ------------------------------------------------------------
    // Swapping classes in place rather than re-rendering keeps every preview
    // SVG on screen - a redraw would drop the grid back to loading shims.
    function VghLantern__ComponentIndex__ApplyThumbSize() {
        var grid  =  document.querySelector('.VghLantern__ComponentIndex__Grid');
        if (grid) grid.className  =  VghLantern__ComponentIndex__GridClass();

        var buttons  =  document.querySelectorAll('.VghLantern__ComponentIndex__SizeButton');
        for (var i = 0; i < buttons.length; i++) {
            var isActive  =  (buttons[i].getAttribute('data-thumb-size') === VghLantern__ComponentIndex__ThumbSize);
            buttons[i].classList.toggle('VghLantern__ComponentIndex__SizeButton--active', isActive);
            buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Route a Delegated Gallery Click
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__OnGalleryClick(event) {
        var sizeButton  =  event.target.closest('.VghLantern__ComponentIndex__SizeButton');
        if (sizeButton) {
            VghLantern__ComponentIndex__ThumbSize  =  sizeButton.getAttribute('data-thumb-size');
            VghLantern__ComponentIndex__ApplyThumbSize();
            return;
        }

        var libraryTab  =  event.target.closest('.VghLantern__ComponentIndex__LibraryTab');
        if (libraryTab) {
            VghLantern__ComponentIndex__ActiveLibrary   =  libraryTab.getAttribute('data-library');
            VghLantern__ComponentIndex__ActiveCategory  =  CATEGORY_ALL;          // <-- Categories differ per library
            void VghLantern__ComponentIndex__Render();
            return;
        }

        var categoryChip  =  event.target.closest('.VghLantern__ComponentIndex__CategoryChip');
        if (categoryChip) {
            VghLantern__ComponentIndex__ActiveCategory  =  categoryChip.getAttribute('data-category-id');
            void VghLantern__ComponentIndex__Render();
            return;
        }

        var card  =  event.target.closest('.VghLantern__ComponentIndex__Card');
        if (card) {
            var entryId  =  card.getAttribute('data-entry-id');
            var DetailView  =  window.VghLantern__ComponentIndex__DetailView;
            if (DetailView && entryId) {
                void DetailView.VghLantern__ComponentIndex__DetailView__Show(
                    entryId, VghLantern__ComponentIndex__ActiveLibrary);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind One Delegated Listener on the Gallery Root
    // ------------------------------------------------------------
    function VghLantern__ComponentIndex__Init() {
        if (VghLantern__ComponentIndex__IsDelegationBound) return;

        var container  =  document.getElementById(ROOT_CONTAINER_ID);
        if (!container) return;

        container.addEventListener('click', VghLantern__ComponentIndex__OnGalleryClick);
        VghLantern__ComponentIndex__IsDelegationBound  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ComponentIndex__Init            : VghLantern__ComponentIndex__Init,
        VghLantern__ComponentIndex__Render          : VghLantern__ComponentIndex__Render,
        VghLantern__ComponentIndex__BuildPreviewSvg : VghLantern__ComponentIndex__BuildPreviewSvg
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__System__ComponentIndex  =  VghLantern__System__ComponentIndex;
