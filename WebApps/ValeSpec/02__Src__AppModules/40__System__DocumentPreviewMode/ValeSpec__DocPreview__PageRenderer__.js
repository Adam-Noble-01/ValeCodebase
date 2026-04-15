/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW PAGE RENDERER
   =============================================================================

   FILE       : ValeSpec__DocPreview__PageRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - PageRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render read-only document preview with toolbar, branding, and assemblies
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders read-only document preview into #ValeSpec__DocPreview__Container
   - Creates toolbar with "Back to Editor" and disabled "PDF Export" buttons
   - Creates paper container at A4 width with drop shadow
   - Renders Vale branding header, assembly blocks with SVG and spec table
   - Renders job notes section at the end of the document
   - Subscribes to modeChanged event to render when entering preview mode

   ============================================================================= */

// =============================================================================
// REGION | Page Renderer Module
// =============================================================================

const ValeSpec__DocPreview__PageRenderer = (function() {

    // MODULE CONSTANTS | DOM Target ID
    // ------------------------------------------------------------
    const PREVIEW_CONTAINER_ID  =  'ValeSpec__DocPreview__Container';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Logo Path from Config
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__GetLogoPath() {
        var fallbackLogoPath  =  '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return fallbackLogoPath;
        var state   =  StateManager.ValeSpec__StateManager__GetState();
        var config  =  state.appConfig;
        if (!config) return fallbackLogoPath;
        var headerConfig  =  config['DocEditor__Header__Config'];
        if (!headerConfig) return fallbackLogoPath;
        return headerConfig['DocEditor__Header__Config__LogoPath'] || fallbackLogoPath; // <-- Shared logo asset path
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Project Metadata from State
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__GetProjectMeta() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return {};
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state.currentProject;
        if (!project) return {};
        return project['ValeSpec__ProjectFile__Metadata'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Assemblies Array from State
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__GetAssemblies() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return [];
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state.currentProject;
        if (!project) return [];
        return project['ValeSpec__ProjectFile__Assemblies'] || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Job Notes from State
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__GetJobNotes() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return '';
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state.currentProject;
        if (!project) return '';
        var globalSettings  =  project['ValeSpec__ProjectFile__GlobalSettings'] || {};
        return globalSettings['ValeSpec__ProjectFile__GlobalSettings__JobNotes'] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__FormatDate(dateStr) {
        if (!dateStr) return '—';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.ValeSpec__DateFormatter__FormatShort(dateStr);  // <-- "09 Apr 2026" format
        }
        return dateStr;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Assembly Title from Data
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildAssemblyTitle(assembly) {
        var identity  =  assembly['Assembly__Identity__Config'] || {};
        var custom    =  identity['Assembly__Identity__Config__Title'];
        if (custom) return custom;

        var doorCfg     =  assembly['Assembly__DoorType__Config'] || {};
        var doorType    =  doorCfg['Assembly__DoorType__Config__Type']             || 'Door';
        var direction   =  doorCfg['Assembly__DoorType__Config__OpeningDirection'] || '';
        var fullLabel   =  direction ? (direction + ' Opening ' + doorType) : doorType;
        var dimensions  =  assembly['Assembly__Dimensions__Config'] || {};
        var width       =  dimensions['Assembly__Dimensions__Config__WidthMm']  || '\u2014';
        var height      =  dimensions['Assembly__Dimensions__Config__HeightMm'] || '\u2014';
        return fullLabel + ' \u2014 ' + width + ' x ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Toolbar HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildToolbar() {
        var html  =  '<div class="ValeSpec__DocPreview__Toolbar">';
        html     +=      '<button class="ValeSpec__DocPreview__BtnBack" id="ValeSpec__DocPreview__BtnBack">&larr; Back to Editor</button>';
        html     +=      '<button class="ValeSpec__DocPreview__BtnExport" id="ValeSpec__DocPreview__BtnExport">Export PDF</button>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Branding Header HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildBrandingHeader(meta) {
        var logoPath     =  ValeSpec__PageRenderer__GetLogoPath();
        var projectName  =  meta['ValeSpec__ProjectFile__Metadata__ProjectName']  || 'Untitled Project';
        var docName      =  meta['ValeSpec__ProjectFile__Metadata__DocumentName'] || 'Untitled Document';
        var revision     =  meta['ValeSpec__ProjectFile__Metadata__RevisionCode'] || '';
        var dateAuthored =  ValeSpec__PageRenderer__FormatDate(meta['ValeSpec__ProjectFile__Metadata__DateCreated']);

        var html  =  '<div class="ValeSpec__DocPreview__BrandingHeader">';

        if (logoPath) {
            html  +=      '<img class="ValeSpec__DocPreview__BrandingLogo" src="' + logoPath + '" alt="Vale Logo" />';
        }

        html  +=      '<div class="ValeSpec__DocPreview__BrandingMeta">';
        html  +=          '<div class="ValeSpec__DocPreview__BrandingProjectName">' + projectName + '</div>';
        html  +=          '<div class="ValeSpec__DocPreview__BrandingDocName">' + docName;
        if (revision) html  +=  ' — Rev ' + revision;
        html  +=          '</div>';
        html  +=      '</div>';

        html  +=      '<div style="text-align:right; font-size:var(--Vale_FontSize_Small); color:var(--Vale_TextMuted);">';
        html  +=          dateAuthored;
        html  +=      '</div>';

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Single Assembly Block HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildAssemblyBlock(assembly, index) {
        var title  =  ValeSpec__PageRenderer__BuildAssemblyTitle(assembly);

        var html  =  '<div class="ValeSpec__DocPreview__AssemblyBlock">';
        html     +=      '<div class="ValeSpec__DocPreview__AssemblyTitle">' + title + '</div>';
        html     +=      '<div class="ValeSpec__DocPreview__DrawingContainer" id="ValeSpec__DocPreview__Drawing_' + index + '"></div>';

        var SpecTableRenderer  =  window.ValeSpec__DocPreview__SpecTableRenderer;
        if (SpecTableRenderer) {
            html  +=  SpecTableRenderer.ValeSpec__SpecTableRenderer__RenderSpecTable(assembly);  // <-- Hardware schedule table
        }

        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Job Notes Section HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildJobNotesSection(notesText) {
        if (!notesText) return '';

        var escaped  =  notesText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        var html  =  '<div class="ValeSpec__DocPreview__JobNotes">';
        html     +=      '<div class="ValeSpec__DocPreview__JobNotesTitle">Job Notes</div>';
        html     +=      '<div class="ValeSpec__DocPreview__JobNotesContent">' + escaped + '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render SVG Drawings into Mounted Containers
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__RenderDrawings(assemblies) {
        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (!RenderPipeline) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var hwIndex       =  StateManager ? StateManager.ValeSpec__StateManager__GetState().hardwareIndex : null; // <-- Resolve hardware index for ironmongery rendering

        for (var i = 0; i < assemblies.length; i++) {
            var drawingContainer  =  document.getElementById('ValeSpec__DocPreview__Drawing_' + i);
            if (drawingContainer) {
                try {
                    var svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assemblies[i], hwIndex); // <-- Pass hwIndex for handle vector data
                    if (svgMarkup) drawingContainer.innerHTML  =  svgMarkup;
                } catch (e) {
                    console.warn('[ValeSpec__PageRenderer] Drawing render error for index ' + i + ':', e);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Toolbar Event Listeners
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BindEvents() {
        var backBtn  =  document.getElementById('ValeSpec__DocPreview__BtnBack');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                var ModeManager  =  window.ValeSpec__AppCore__ModeManager;
                if (ModeManager) ModeManager.ValeSpec__ModeManager__NavigateBack();  // <-- Return to previous mode
            });
        }

        var exportBtn  =  document.getElementById('ValeSpec__DocPreview__BtnExport');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                var PdfExporter  =  window.ValeSpec__DocPreview__PdfExporter;
                if (PdfExporter) {
                    PdfExporter.ValeSpec__PdfExporter__Export();                     // <-- Launch async PDF export pipeline
                } else {
                    console.error('[ValeSpec__PageRenderer] PdfExporter module not loaded');
                }
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Full Document Preview into DOM
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__Render() {
        var container  =  document.getElementById(PREVIEW_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__PageRenderer] Container not found: #' + PREVIEW_CONTAINER_ID);
            return;
        }

        var meta        =  ValeSpec__PageRenderer__GetProjectMeta();
        var assemblies  =  ValeSpec__PageRenderer__GetAssemblies();
        var jobNotes    =  ValeSpec__PageRenderer__GetJobNotes();

        var html  =  ValeSpec__PageRenderer__BuildToolbar();
        html     +=  '<div class="ValeSpec__DocPreview__Paper">';
        html     +=      ValeSpec__PageRenderer__BuildBrandingHeader(meta);

        for (var i = 0; i < assemblies.length; i++) {
            html  +=      ValeSpec__PageRenderer__BuildAssemblyBlock(assemblies[i], i);
        }

        html     +=      ValeSpec__PageRenderer__BuildJobNotesSection(jobNotes);
        html     +=  '</div>';

        container.innerHTML  =  html;

        ValeSpec__PageRenderer__RenderDrawings(assemblies);
        ValeSpec__PageRenderer__BindEvents();
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to Mode Change Events
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__SubscribeToModeChange() {
        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.ValeSpec__StateManager__On('modeChanged', function(mode) {
                if (mode === 'DocumentPreview') {
                    ValeSpec__PageRenderer__Render();                              // <-- Auto-render when entering preview mode
                }
            });
        }
    }
    // ------------------------------------------------------------


    // BOOT | Initial Subscription
    // ------------------------------------------------------------
    ValeSpec__PageRenderer__SubscribeToModeChange();
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__PageRenderer__Render  : ValeSpec__PageRenderer__Render
    };

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__PageRenderer  =  ValeSpec__DocPreview__PageRenderer;
