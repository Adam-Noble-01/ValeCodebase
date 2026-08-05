/* =============================================================================
   VGHLANTERN - CLIENT DOC | LAYOUT
   =============================================================================

   FILE       : VghLantern__ClientDoc__Layout__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - Layout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The Client Document mode shell, its render lifecycle and its bindings
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Owns the two-column mode: the edit column on the left, the live document preview
     on the right, and the render lifecycle that keeps them in step.
   - Binds one delegated listener set to the persistent container, once, and routes
     every event to whichever editor owns the panel it came from. The editors never
     bind anything themselves, so a rebuilt card can never lose its handler.
   - Materialises the letter from the template the first time a project is opened here.

   -----------------------------------------------------------------------------

   WHY THE EDIT COLUMN IS REBUILT AND THE PREVIEW IS REBUILT SEPARATELY:
   Typing into a card must not rebuild the card, or the caret jumps to the end on every
   keystroke. Text edits therefore refresh only the preview; structural changes - add,
   delete, reorder, reset, section toggle - rebuild the edit column too, because those
   are exactly the changes that renumber the cards.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Layout Module
// =============================================================================

const VghLantern__ClientDoc__Layout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers
    // ------------------------------------------------------------
    const DOM_MODE_PANEL   =  'VghLantern__App__ModeClientDocument';
    const DOM_CONTAINER    =  'VghLantern__ClientDoc__Container';
    const DOM_EDIT_COLUMN  =  'VghLantern__ClientDoc__EditColumn';
    const DOM_PREVIEW      =  'VghLantern__ClientDoc__PreviewColumn';
    const DOM_TERMS_ANCHOR =  'VghLantern__ClientDoc__TermsAnchor';
    const DOM_SPLIT        =  'VghLantern__ClientDoc__SplitHost';
    const DOM_SPLITTER     =  'VghLantern__ClientDoc__SplitHandle';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_HEADER        =  'VghLantern__ClientDoc__Header';
    const CSS_TITLE         =  'VghLantern__ClientDoc__Title';
    const CSS_SUBTITLE      =  'VghLantern__ClientDoc__Subtitle';
    const CSS_SPLIT         =  'VghLantern__ClientDoc__Split';
    const CSS_COLUMN        =  'VghLantern__ClientDoc__Column';
    const CSS_COLUMN_LABEL  =  'VghLantern__ClientDoc__ColumnLabel';
    const CSS_PREVIEW_PAGE  =  'VghLantern__ClientDoc__PreviewPage';
    const CSS_EMPTY         =  'VghLantern__ClientDoc__EmptyState';
    const CSS_SPLITTER      =  'VghLantern__ClientDoc__Splitter';
    const CSS_IS_DRAGGING   =  'VghLantern__ClientDoc__Split--dragging';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Split Bounds
    // ------------------------------------------------------------
    // The edit column may take between a quarter and three quarters of the width.
    // Beyond those the other column stops being usable, and a splitter that can be
    // dragged to zero is a splitter that gets dragged to zero by accident.
    const SPLIT_MIN_FRACTION  =  0.25;
    const SPLIT_MAX_FRACTION  =  0.75;
    const SPLIT_STORAGE_KEY   =  'VghLantern__ClientDoc__SplitFraction';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const MODE_LABEL  =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__Mode';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Binding Guard
    // ------------------------------------------------------------
    let VghLantern__ClientDocLayout__IsBound  =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Mode Config Block
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var clientCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        return clientCfg['VghLantern__ClientDocument__Config__Mode'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Current Project
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__Project() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        return StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report Whether the Mode Panel Is Active
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__IsModeVisible() {
        var panel  =  document.getElementById(DOM_MODE_PANEL);
        return !!(panel && panel.classList.contains('VghLantern__App__ModePanel--active'));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Mode Header
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__BuildHeader(project) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var metadata      =  (project && project['VghLantern__ProjectFile__Metadata']) || {};

        var subtitle  =  [
            metadata['VghLantern__ProjectFile__Metadata__ProjectCode'],
            metadata['VghLantern__ProjectFile__Metadata__ProjectName'],
            metadata['VghLantern__ProjectFile__Metadata__ClientName']
        ].filter(function(part) { return !!part; }).join('  |  ');

        return '<div class="' + CSS_HEADER + '">' +
               '<h2 class="' + CSS_TITLE + '">' +
               VghLantern__ClientDocLayout__Escape(
                   ConfigLoader.VghLantern__ConfigLoader__RequireString(
                       VghLantern__ClientDocLayout__Config(), 'ModeTitle', MODE_LABEL)) +
               '</h2>' +
               '<span class="' + CSS_SUBTITLE + '">' +
               VghLantern__ClientDocLayout__Escape(subtitle) + '</span>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Preview Column Only
    // ------------------------------------------------------------
    // The cheap refresh. Called on every debounced text write, so the preview follows
    // the typing without the edit column being torn down under the caret.
    function VghLantern__ClientDoc__Layout__RefreshPreview() {
        var host  =  document.getElementById(DOM_PREVIEW);
        if (!host) return;

        var LetterRenderer  =  window.VghLantern__ClientDoc__LetterScreenRenderer;
        var TermsRenderer   =  window.VghLantern__Terms__ScreenRenderer;

        var letterHtml  =  LetterRenderer
            ? LetterRenderer.VghLantern__ClientDoc__LetterScreenRenderer__BuildFromState()
            : '';
        var termsHtml   =  TermsRenderer
            ? TermsRenderer.VghLantern__Terms__ScreenRenderer__BuildFromState()
            : '';

        host.innerHTML  =  '<div class="' + CSS_PREVIEW_PAGE + '">' + letterHtml + '</div>' +
                           '<div class="' + CSS_PREVIEW_PAGE + '" id="' + DOM_TERMS_ANCHOR + '">' + termsHtml + '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Edit Column and the Preview
    // ------------------------------------------------------------
    // The full refresh, for structural changes. Textareas are re-sized after the
    // markup lands because a textarea cannot size itself to its content in CSS.
    function VghLantern__ClientDoc__Layout__RefreshEditor() {
        var host  =  document.getElementById(DOM_EDIT_COLUMN);
        if (!host) return;

        var LetterEditor  =  window.VghLantern__ClientDoc__LetterEditor;
        var TermsEditor   =  window.VghLantern__ClientDoc__TermsEditor;
        var BlockEditor   =  window.VghLantern__ClientDoc__BlockEditor;

        host.innerHTML  =  (LetterEditor ? LetterEditor.VghLantern__ClientDoc__LetterEditor__BuildHtml() : '') +
                           (TermsEditor  ? TermsEditor.VghLantern__ClientDoc__TermsEditor__BuildHtml()   : '');

        if (BlockEditor) BlockEditor.VghLantern__ClientDoc__BlockEditor__AutoGrowAll(host);
        VghLantern__ClientDoc__Layout__RefreshPreview();
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Whole Mode
    // ------------------------------------------------------------
    async function VghLantern__ClientDoc__Layout__Render() {
        var container  =  document.getElementById(DOM_CONTAINER);
        if (!container) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var LetterModel   =  window.VghLantern__ClientDoc__LetterModel;
        var Loader        =  window.VghLantern__Terms__MarkdownLoader;
        var project       =  VghLantern__ClientDocLayout__Project();

        if (!project) {
            container.innerHTML  =  '<p class="' + CSS_EMPTY + '">' +
                VghLantern__ClientDocLayout__Escape(
                    ConfigLoader.VghLantern__ConfigLoader__RequireString(
                        VghLantern__ClientDocLayout__Config(), 'NoProjectMessage', MODE_LABEL)) +
                '</p>';
            return;
        }

        // The terms library is fetched before the first paint so section switches can
        // report real clause counts rather than zero on the way in.
        if (Loader) await Loader.VghLantern__Terms__MarkdownLoader__EnsureLoaded();

        if (LetterModel) LetterModel.VghLantern__ClientDoc__LetterModel__EnsureMaterialised(project);

        var config  =  VghLantern__ClientDocLayout__Config();

        container.innerHTML  =
            VghLantern__ClientDocLayout__BuildHeader(project) +
            '<div class="' + CSS_SPLIT + '" id="' + DOM_SPLIT + '">' +
            '<div class="' + CSS_COLUMN + '">' +
            '<span class="' + CSS_COLUMN_LABEL + '">' +
            VghLantern__ClientDocLayout__Escape(
                ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'EditColumnLabel', MODE_LABEL)) +
            '</span>' +
            '<div id="' + DOM_EDIT_COLUMN + '"></div>' +
            '</div>' +

            '<div class="' + CSS_SPLITTER + '" id="' + DOM_SPLITTER + '" role="separator" ' +
            'aria-orientation="vertical" tabindex="0" title="Drag to resize"></div>' +

            '<div class="' + CSS_COLUMN + '">' +
            '<span class="' + CSS_COLUMN_LABEL + '">' +
            VghLantern__ClientDocLayout__Escape(
                ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'PreviewColumnLabel', MODE_LABEL)) +
            '</span>' +
            '<div id="' + DOM_PREVIEW + '"></div>' +
            '</div>' +
            '</div>';

        VghLantern__ClientDocLayout__ApplySplitFraction(VghLantern__ClientDocLayout__ReadSplitFraction());
        VghLantern__ClientDoc__Layout__RefreshEditor();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Saved Split Fraction
    // ------------------------------------------------------------
    // A UI preference for this browser, not document state, so it goes to
    // localStorage rather than onto the project file. Nothing about a quotation
    // depends on how wide someone likes their edit column.
    function VghLantern__ClientDocLayout__ReadSplitFraction() {
        var stored  =  parseFloat(window.localStorage.getItem(SPLIT_STORAGE_KEY));
        if (isNaN(stored)) return null;

        return Math.max(SPLIT_MIN_FRACTION, Math.min(SPLIT_MAX_FRACTION, stored));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Split Fraction to the Grid
    // ------------------------------------------------------------
    // Written as an inline grid-template-columns so the CSS keeps ownership of the
    // default and this only ever overrides it once the user has dragged something.
    function VghLantern__ClientDocLayout__ApplySplitFraction(fraction) {
        var split  =  document.getElementById(DOM_SPLIT);
        if (!split || fraction === null) return;

        split.style.gridTemplateColumns  =
            (fraction * 100) + '% auto ' + ((1 - fraction) * 100) + '%';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Draggable Column Splitter
    // ------------------------------------------------------------
    // Pointer events rather than mouse events, so the handle works under touch and
    // pen as well, and setPointerCapture keeps the drag alive when the pointer leaves
    // the four-pixel handle - which it does immediately on any real drag.
    function VghLantern__ClientDocLayout__BindSplitter(container) {
        var isDragging  =  false;

        // HELPER | Convert a pointer x into a bounded split fraction
        function fractionFromPointer(clientX) {
            var split  =  document.getElementById(DOM_SPLIT);
            if (!split) return null;

            var bounds  =  split.getBoundingClientRect();
            if (bounds.width <= 0) return null;

            return Math.max(SPLIT_MIN_FRACTION,
                   Math.min(SPLIT_MAX_FRACTION, (clientX - bounds.left) / bounds.width));
        }

        container.addEventListener('pointerdown', function(e) {
            if (!e.target || e.target.id !== DOM_SPLITTER) return;

            isDragging  =  true;
            e.target.setPointerCapture(e.pointerId);

            var split  =  document.getElementById(DOM_SPLIT);
            if (split) split.classList.add(CSS_IS_DRAGGING);

            e.preventDefault();                                                // <-- Stops the drag selecting text in both columns
        });

        container.addEventListener('pointermove', function(e) {
            if (!isDragging) return;

            var fraction  =  fractionFromPointer(e.clientX);
            if (fraction !== null) VghLantern__ClientDocLayout__ApplySplitFraction(fraction);
        });

        container.addEventListener('pointerup', function(e) {
            if (!isDragging) return;
            isDragging  =  false;

            var split  =  document.getElementById(DOM_SPLIT);
            if (split) split.classList.remove(CSS_IS_DRAGGING);

            var fraction  =  fractionFromPointer(e.clientX);
            if (fraction !== null) window.localStorage.setItem(SPLIT_STORAGE_KEY, String(fraction));
        });

        // Keyboard nudges, because a separator that only responds to a pointer is a
        // control some people cannot reach at all.
        container.addEventListener('keydown', function(e) {
            if (!e.target || e.target.id !== DOM_SPLITTER) return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

            var current  =  VghLantern__ClientDocLayout__ReadSplitFraction() || 0.5;
            var next     =  Math.max(SPLIT_MIN_FRACTION,
                            Math.min(SPLIT_MAX_FRACTION, current + (e.key === 'ArrowLeft' ? -0.02 : 0.02)));

            VghLantern__ClientDocLayout__ApplySplitFraction(next);
            window.localStorage.setItem(SPLIT_STORAGE_KEY, String(next));
            e.preventDefault();
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Scroll the Preview to the Terms Document
    // ------------------------------------------------------------
    // The landing point for a scanned drawing QR code.
    function VghLantern__ClientDoc__Layout__ScrollToTerms() {
        var anchor  =  document.getElementById(DOM_TERMS_ANCHOR);
        if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ behavior : 'smooth', block : 'start' });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Route a Block Card Action to the Editor That Owns It
    // ------------------------------------------------------------
    // Only the terms panels use block cards now. The letter is one field, and its
    // controls carry the letter editor's own action attribute instead.
    function VghLantern__ClientDocLayout__RouteAction(button) {
        var BlockEditor  =  window.VghLantern__ClientDoc__BlockEditor;
        var TermsEditor  =  window.VghLantern__ClientDoc__TermsEditor;
        if (!BlockEditor || !TermsEditor) return false;

        var action    =  button.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__ActionAttribute);
        var panelKey  =  button.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__PanelAttribute);
        var blockId   =  button.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__BlockIdAttribute);

        if (!TermsEditor.VghLantern__ClientDoc__TermsEditor__OwnsPanel(panelKey)) return false;
        return TermsEditor.VghLantern__ClientDoc__TermsEditor__HandleAction(panelKey, action, blockId);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Delegated Input Listener
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__BindInput(container) {
        container.addEventListener('input', function(e) {
            var LetterEditor  =  window.VghLantern__ClientDoc__LetterEditor;
            var TermsEditor   =  window.VghLantern__ClientDoc__TermsEditor;

            if (TermsEditor && TermsEditor.VghLantern__ClientDoc__TermsEditor__HandleInput(e.target)) return;
            if (LetterEditor) LetterEditor.VghLantern__ClientDoc__LetterEditor__HandleInput(e.target);
        });

        // Leaving a field is an explicit end of editing, so the debounce is not waited
        // out. The preview is refreshed after, because the flush may have changed it.
        container.addEventListener('focusout', function() {
            VghLantern__ClientDoc__Layout__Flush();
            VghLantern__ClientDoc__Layout__RefreshPreview();
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Delegated Click and Change Listeners
    // ------------------------------------------------------------
    function VghLantern__ClientDocLayout__BindClicks(container) {
        var BlockEditor  =  window.VghLantern__ClientDoc__BlockEditor;

        container.addEventListener('click', function(e) {
            var LetterEditor  =  window.VghLantern__ClientDoc__LetterEditor;
            if (!BlockEditor) return;

            var blockButton  =  e.target.closest
                ? e.target.closest('[' + BlockEditor.VghLantern__ClientDoc__BlockEditor__ActionAttribute + ']')
                : null;
            if (blockButton) {
                if (VghLantern__ClientDocLayout__RouteAction(blockButton)) {
                    VghLantern__ClientDoc__Layout__RefreshEditor();
                }
                return;
            }

            // Letter-only controls, such as the one-click author fill, carry their own
            // action attribute rather than the block editor's.
            if (!LetterEditor) return;
            var letterButton  =  e.target.closest
                ? e.target.closest('[' + LetterEditor.VghLantern__ClientDoc__LetterEditor__ActionAttribute + ']')
                : null;
            if (!letterButton) return;

            if (LetterEditor.VghLantern__ClientDoc__LetterEditor__HandleAction(
                    letterButton.getAttribute(LetterEditor.VghLantern__ClientDoc__LetterEditor__ActionAttribute))) {
                VghLantern__ClientDoc__Layout__RefreshEditor();
            }
        });

        container.addEventListener('change', function(e) {
            var TermsEditor  =  window.VghLantern__ClientDoc__TermsEditor;
            if (!TermsEditor) return;

            if (TermsEditor.VghLantern__ClientDoc__TermsEditor__HandleSectionToggle(e.target)) {
                VghLantern__ClientDoc__Layout__RefreshEditor();
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind Every Delegated Listener, Once
    // ------------------------------------------------------------
    // Attached to the persistent mode container, which survives every innerHTML
    // rebuild inside it, so this runs at boot and never again.
    function VghLantern__ClientDoc__Layout__Init() {
        if (VghLantern__ClientDocLayout__IsBound) return;

        var container  =  document.getElementById(DOM_CONTAINER);
        if (!container) return;

        var BlockEditor  =  window.VghLantern__ClientDoc__BlockEditor;

        VghLantern__ClientDocLayout__BindInput(container);
        VghLantern__ClientDocLayout__BindClicks(container);
        VghLantern__ClientDocLayout__BindSplitter(container);

        // Only the terms panels reorder. The letter is one field, and a paragraph in
        // it moves by being cut and pasted like any other prose.
        if (BlockEditor) {
            BlockEditor.VghLantern__ClientDoc__BlockEditor__BindDragReorder(container, function(panelKey, blockId, targetIndex) {
                var TermsEditor  =  window.VghLantern__ClientDoc__TermsEditor;
                if (!TermsEditor || !TermsEditor.VghLantern__ClientDoc__TermsEditor__OwnsPanel(panelKey)) return;

                if (TermsEditor.VghLantern__ClientDoc__TermsEditor__HandleReorder(panelKey, blockId, targetIndex)) {
                    VghLantern__ClientDoc__Layout__RefreshEditor();
                }
            });
        }

        // A project loaded or changed while this mode is open must repaint, because
        // every panel in it is a view of the project record.
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) {
            StateManager.VghLantern__StateManager__On('projectChanged', function() {
                if (VghLantern__ClientDocLayout__IsModeVisible()) void VghLantern__ClientDoc__Layout__Render();
            });
        }

        VghLantern__ClientDocLayout__IsBound  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Every Pending Editor Write
    // ------------------------------------------------------------
    // Called on field exit and on mode exit, so leaving the tab mid-sentence keeps the
    // sentence in both editors.
    function VghLantern__ClientDoc__Layout__Flush() {
        var LetterEditor  =  window.VghLantern__ClientDoc__LetterEditor;
        var TermsEditor   =  window.VghLantern__ClientDoc__TermsEditor;

        if (LetterEditor) LetterEditor.VghLantern__ClientDoc__LetterEditor__Flush();
        if (TermsEditor)  TermsEditor.VghLantern__ClientDoc__TermsEditor__Flush();
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Leaving the Mode
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__Layout__OnModeExit() {
        VghLantern__ClientDoc__Layout__Flush();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__Layout__Init            : VghLantern__ClientDoc__Layout__Init,
        VghLantern__ClientDoc__Layout__Render          : VghLantern__ClientDoc__Layout__Render,
        VghLantern__ClientDoc__Layout__RefreshEditor   : VghLantern__ClientDoc__Layout__RefreshEditor,
        VghLantern__ClientDoc__Layout__RefreshPreview  : VghLantern__ClientDoc__Layout__RefreshPreview,
        VghLantern__ClientDoc__Layout__ScrollToTerms   : VghLantern__ClientDoc__Layout__ScrollToTerms,
        VghLantern__ClientDoc__Layout__Flush           : VghLantern__ClientDoc__Layout__Flush,
        VghLantern__ClientDoc__Layout__OnModeExit      : VghLantern__ClientDoc__Layout__OnModeExit
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__Layout  =  VghLantern__ClientDoc__Layout;
