/* =============================================================================
   VGHLANTERN - SPECIFICATION | SECTION MANAGER
   =============================================================================

   FILE       : VghLantern__Specification__SectionManager__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - SectionManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orchestrate the Specification mode - build the model, render sections
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Owns the Specification mode. Builds the document model, then renders the header,
     the warning list and every configured section as a collapsible block.
   - Section order, labels and renderer bindings all come from
     Na__Specification__Config.json. Adding a section is a config edit plus a
     renderer key - never a change in here.
   - Publishes DescribeDocument for issue checks and legacy consumers; Preview and
     Send renders print-faithful pages via DocPreview PrintDocumentRenderer instead.
     rather than rebuilding the specification a second way.

   -----------------------------------------------------------------------------

   RENDERER KEY BINDINGS:
   | Key        | Rendered by                                       |
   | schedule   | ScheduleRenderer BuildLanternSchedule             |
   | linear     | ScheduleRenderer BuildPerLantern('linear')        |
   | areas      | ScheduleRenderer BuildPerLantern('areas')         |
   | components | ScheduleRenderer BuildPerLantern('components')    |
   | finish     | ScheduleRenderer BuildFinishSchedule              |
   | notes      | JobNotes host - moved into the section body       |

   An unrecognised renderer key logs a warning and prints nothing, so a config
   typo degrades one section rather than blanking the document.

   ============================================================================= */

// =============================================================================
// REGION | Specification Section Manager Module
// =============================================================================

const VghLantern__Specification__SectionManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers and CSS Classes
    // ------------------------------------------------------------
    const DOM_MODE_PANEL    =  'VghLantern__App__ModeSpecification';
    const DOM_CONTAINER     =  'VghLantern__Specification__Container';
    const DOM_HEADER        =  'VghLantern__Specification__HeaderBlock';
    const DOM_SECTIONS      =  'VghLantern__Specification__SectionsContainer';
    const DOM_NOTES_HOST    =  'VghLantern__Specification__JobNotesContainer';

    const CSS_SECTION       =  'VghLantern__Spec__Section';
    const CSS_SECTION_HEAD  =  'VghLantern__Spec__SectionHeader';
    const CSS_SECTION_BODY  =  'VghLantern__Spec__SectionBody';
    const CSS_CARET         =  'VghLantern__Spec__SectionCaret';
    const CSS_COLLAPSED     =  'VghLantern__Spec__Section--collapsed';
    const CSS_EMPTY_STATE   =  'VghLantern__Spec__EmptyState';

    const ATTR_SECTION_KEY  =  'data-vghlantern-spec-section';
    const VAR_DOC_MAX_WIDTH =  '--VghLantern_SpecDocumentMaxWidth';

    const NOTES_RENDERER    =  'notes';                                        // <-- The one section whose body is a live editor, not static markup
    // ------------------------------------------------------------


    // MODULE VARIABLES | Collapse State and Cached Model
    // ------------------------------------------------------------
    let VghLantern__SectionManager__CollapseState   =  {};                     // <-- sectionKey -> isCollapsed, survives re-renders
    let VghLantern__SectionManager__CachedModel     =  null;                   // <-- Last built document model, reused by DescribeDocument
    let VghLantern__SectionManager__IsBound         =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Specification Config Block
    // ------------------------------------------------------------
    function VghLantern__SectionManager__SpecConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Document Column Width From Config
    // ------------------------------------------------------------
    // A4 + 20% by default so the schedules read as a document, not a full-bleed page.
    function VghLantern__SectionManager__ApplyDocumentWidth() {
        var container  =  document.getElementById(DOM_CONTAINER);
        if (!container) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var docCfg   =  VghLantern__SectionManager__SpecConfig()['VghLantern__Specification__Config__Document'] || {};
        var widthMm  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            docCfg, 'DocumentMaxWidthMm', 'Na__Specification__Config.json -> VghLantern__Specification__Config__Document');

        container.style.setProperty(VAR_DOC_MAX_WIDTH, widthMm + 'mm');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__SectionManager__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report Whether the Specification Panel Is Active
    // ------------------------------------------------------------
    function VghLantern__SectionManager__IsModeVisible() {
        var panel  =  document.getElementById(DOM_MODE_PANEL);
        return !!(panel && panel.classList.contains('VghLantern__App__ModePanel--active'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Collapsed State for a Section
    // ------------------------------------------------------------
    // First visit honours StartExpanded from config; after that the user's own
    // choice wins, so re-solving geometry never re-opens a section they closed.
    function VghLantern__SectionManager__IsCollapsed(section) {
        if (VghLantern__SectionManager__CollapseState[section.Key] === undefined) {
            VghLantern__SectionManager__CollapseState[section.Key]  =  (section.StartExpanded === false);
        }
        return VghLantern__SectionManager__CollapseState[section.Key];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Body Resolution
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Body Markup for One Section
    // ------------------------------------------------------------
    // isStatic distinguishes the on-screen render, where the notes body is a live
    // editor moved in afterwards, from the printed render, where it is plain text.
    function VghLantern__SectionManager__BuildSectionBody(section, documentModel, isStatic) {
        var Schedules  =  window.VghLantern__Specification__ScheduleRenderer;
        if (!Schedules) return '';

        switch (section.Renderer) {
            case 'schedule':
                return Schedules.VghLantern__Specification__ScheduleRenderer__BuildLanternSchedule(documentModel);

            case 'linear':
                return Schedules.VghLantern__Specification__ScheduleRenderer__BuildPerLantern(documentModel, 'linear') +
                       Schedules.VghLantern__Specification__ScheduleRenderer__BuildAggregate(documentModel);

            case 'areas':
                return Schedules.VghLantern__Specification__ScheduleRenderer__BuildPerLantern(documentModel, 'areas');

            case 'components':
                return Schedules.VghLantern__Specification__ScheduleRenderer__BuildPerLantern(documentModel, 'components');

            case 'finish':
                return Schedules.VghLantern__Specification__ScheduleRenderer__BuildFinishSchedule(documentModel);

            case NOTES_RENDERER:
                if (!isStatic) return '';                                      // <-- The live notes host is moved in after render
                var JobNotes  =  window.VghLantern__Specification__JobNotes;
                return JobNotes ? JobNotes.VghLantern__Specification__JobNotes__BuildStatic() : '';

            default:
                console.warn('[VghLantern__Specification__SectionManager] Unknown section renderer "' + section.Renderer + '".');
                return '';
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Markup for One Collapsible Section
    // ------------------------------------------------------------
    function VghLantern__SectionManager__BuildSection(section, documentModel, isStatic) {
        var isCollapsed  =  isStatic ? false : VghLantern__SectionManager__IsCollapsed(section);
        var body         =  VghLantern__SectionManager__BuildSectionBody(section, documentModel, isStatic);

        return '<section class="' + CSS_SECTION + (isCollapsed ? ' ' + CSS_COLLAPSED : '') + '" ' +
               ATTR_SECTION_KEY + '="' + VghLantern__SectionManager__Escape(section.Key) + '">' +
               '<button type="button" class="' + CSS_SECTION_HEAD + '" ' +
               'aria-expanded="' + (isCollapsed ? 'false' : 'true') + '">' +
               '<span class="' + CSS_CARET + '">' + (isCollapsed ? '\u25B8' : '\u25BE') + '</span>' +
               '<span>' + VghLantern__SectionManager__Escape(section.Label) + '</span>' +
               '</button>' +
               '<div class="' + CSS_SECTION_BODY + '">' + body + '</div>' +
               '</section>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Relocate the Live Job Notes Host Into Its Section
    // ------------------------------------------------------------
    // The notes editor is a persistent element with a delegated listener, so it is
    // moved rather than rebuilt. Rebuilding it would drop the binding and any
    // un-committed keystrokes.
    function VghLantern__SectionManager__MountNotesHost(sectionsContainer) {
        var notesHost  =  document.getElementById(DOM_NOTES_HOST);
        if (!notesHost) return;

        var notesSection  =  sectionsContainer.querySelector('[' + ATTR_SECTION_KEY + '="jobNotes"]');
        if (!notesSection) return;

        var body  =  notesSection.querySelector('.' + CSS_SECTION_BODY);
        if (body) body.appendChild(notesHost);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Whole Specification Document
    // ------------------------------------------------------------
    function VghLantern__Specification__SectionManager__Render() {
        var headerHost    =  document.getElementById(DOM_HEADER);
        var sectionsHost  =  document.getElementById(DOM_SECTIONS);
        if (!headerHost || !sectionsHost) return;

        var DocumentModel  =  window.VghLantern__Specification__DocumentModel;
        var Schedules      =  window.VghLantern__Specification__ScheduleRenderer;
        if (!DocumentModel || !Schedules) return;

        var model  =  DocumentModel.VghLantern__Specification__DocumentModel__BuildFromState();
        VghLantern__SectionManager__CachedModel  =  model;

        if (!model || !model.Lanterns.length) {
            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var docCfg  =  VghLantern__SectionManager__SpecConfig()['VghLantern__Specification__Config__Document'] || {};
            headerHost.innerHTML    =  '';
            sectionsHost.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">' +
                                       VghLantern__SectionManager__Escape(ConfigLoader.VghLantern__ConfigLoader__RequireString(
                                           docCfg, 'EmptyStateMessage', 'Na__Specification__Config.json -> VghLantern__Specification__Config__Document')) +
                                       '</p>';
            return;
        }

        headerHost.innerHTML  =  Schedules.VghLantern__Specification__ScheduleRenderer__BuildHeader(model) +
                                 Schedules.VghLantern__Specification__ScheduleRenderer__BuildUserWarnings(model) +
                                 Schedules.VghLantern__Specification__ScheduleRenderer__BuildWarnings(model);

        var sections  =  DocumentModel.VghLantern__Specification__DocumentModel__ListSections();
        var html      =  '';
        var i;

        for (i = 0; i < sections.length; i++) {
            html  +=  VghLantern__SectionManager__BuildSection(sections[i], model);
        }

        sectionsHost.innerHTML  =  html;
        VghLantern__SectionManager__MountNotesHost(sectionsHost);
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe the Document for Preview and Export
    // ------------------------------------------------------------
    // Builds the markup fresh from the same renderers the screen uses rather than
    // scraping the mounted DOM. Preview must work whether or not the user has ever
    // opened the Specification mode, and the printed version needs sections open and
    // the notes as static text.
    function VghLantern__Specification__SectionManager__DescribeDocument() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var docCfg  =  VghLantern__SectionManager__SpecConfig()['VghLantern__Specification__Config__Document'] || {};
        var title   =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            docCfg, 'DocumentTitle', 'Na__Specification__Config.json -> VghLantern__Specification__Config__Document');

        var DocumentModel  =  window.VghLantern__Specification__DocumentModel;
        var Schedules      =  window.VghLantern__Specification__ScheduleRenderer;

        if (!DocumentModel || !Schedules) {
            return { Title: title, Model: null, HeaderHtml: '', SectionsHtml: '', HasContent: false };
        }

        var model  =  DocumentModel.VghLantern__Specification__DocumentModel__BuildFromState();
        VghLantern__SectionManager__CachedModel  =  model;

        if (!model || !model.Lanterns.length) {
            return { Title: title, Model: model, HeaderHtml: '', SectionsHtml: '', HasContent: false };
        }

        var sections  =  DocumentModel.VghLantern__Specification__DocumentModel__ListSections();
        var html      =  '';
        var i;

        for (i = 0; i < sections.length; i++) {
            html  +=  VghLantern__SectionManager__BuildSection(sections[i], model, true);
        }

        return {
            Title        : title,
            Model        : model,
            HeaderHtml   : Schedules.VghLantern__Specification__ScheduleRenderer__BuildHeader(model) +
                           Schedules.VghLantern__Specification__ScheduleRenderer__BuildUserWarnings(model) +
                           Schedules.VghLantern__Specification__ScheduleRenderer__BuildWarnings(model),
            SectionsHtml : html,
            HasContent   : true
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialisation and Event Wiring
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Toggle a Section Open or Closed
    // ------------------------------------------------------------
    function VghLantern__SectionManager__ToggleSection(sectionElement) {
        var key  =  sectionElement.getAttribute(ATTR_SECTION_KEY);
        if (!key) return;

        var isCollapsed  =  !sectionElement.classList.contains(CSS_COLLAPSED);
        VghLantern__SectionManager__CollapseState[key]  =  isCollapsed;

        sectionElement.classList.toggle(CSS_COLLAPSED, isCollapsed);

        var header  =  sectionElement.querySelector('.' + CSS_SECTION_HEAD);
        var caret   =  sectionElement.querySelector('.' + CSS_CARET);
        if (header) header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        if (caret)  caret.textContent  =  isCollapsed ? '\u25B8' : '\u25BE';
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind Listeners for the Specification Mode
    // ------------------------------------------------------------
    function VghLantern__Specification__SectionManager__Init() {
        if (VghLantern__SectionManager__IsBound) return;

        VghLantern__SectionManager__ApplyDocumentWidth();

        var sectionsHost  =  document.getElementById(DOM_SECTIONS);
        var StateManager  =  window.VghLantern__AppCore__StateManager;

        if (sectionsHost) {
            sectionsHost.addEventListener('click', function(e) {
                var header  =  e.target.closest ? e.target.closest('.' + CSS_SECTION_HEAD) : null;
                if (!header) return;

                var section  =  header.closest('.' + CSS_SECTION);
                if (section) VghLantern__SectionManager__ToggleSection(section);
            });
        }

        if (StateManager) {
            // Every takeoff number derives from a solve, so the solve is the only
            // trigger worth listening to. Re-rendering off-screen is wasted work.
            StateManager.VghLantern__StateManager__On('geometrySolved', function() {
                if (VghLantern__SectionManager__IsModeVisible()) VghLantern__Specification__SectionManager__Render();
            });

            StateManager.VghLantern__StateManager__On('projectChanged', function() {
                VghLantern__SectionManager__CachedModel  =  null;
                if (VghLantern__SectionManager__IsModeVisible()) VghLantern__Specification__SectionManager__Render();
            });
        }

        var JobNotes  =  window.VghLantern__Specification__JobNotes;
        if (JobNotes && JobNotes.VghLantern__Specification__JobNotes__Init) {
            JobNotes.VghLantern__Specification__JobNotes__Init();              // <-- Notes binding is delegated and one-shot too
        }

        VghLantern__SectionManager__IsBound  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Release Mode Resources on Exit
    // ------------------------------------------------------------
    function VghLantern__Specification__SectionManager__OnModeExit() {
        var JobNotes  =  window.VghLantern__Specification__JobNotes;
        if (JobNotes && JobNotes.VghLantern__Specification__JobNotes__Flush) {
            JobNotes.VghLantern__Specification__JobNotes__Flush();             // <-- Never lose a half-typed note by switching mode
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Specification__SectionManager__Init             : VghLantern__Specification__SectionManager__Init,
        VghLantern__Specification__SectionManager__Render           : VghLantern__Specification__SectionManager__Render,
        VghLantern__Specification__SectionManager__DescribeDocument : VghLantern__Specification__SectionManager__DescribeDocument,
        VghLantern__Specification__SectionManager__OnModeExit       : VghLantern__Specification__SectionManager__OnModeExit
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__SectionManager  =  VghLantern__Specification__SectionManager;
