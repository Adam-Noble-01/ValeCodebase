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
    const MENU_ICON_BASE_PATH   =  '01__AppAssets__ValeSpec/UiIcons__MenuIcons__ToolsMenu/';
    const MENU_SECTION_DEFAULT_STATE  =  {
        diagrams   : true,
        sections   : true,
        actions    : true
    };
    var ValeSpec__PageRenderer__MenuSectionState  =  {
        diagrams   : MENU_SECTION_DEFAULT_STATE.diagrams,
        sections   : MENU_SECTION_DEFAULT_STATE.sections,
        actions    : MENU_SECTION_DEFAULT_STATE.actions
    };
    var ValeSpec__PageRenderer__MenuPositionState  =  {
        left : null,
        top  : null
    };
    var ValeSpec__PageRenderer__MenuDragState  =  {
        isDragging : false,
        offsetX    : 0,
        offsetY    : 0
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__EscapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Side Menu Icon Path
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__GetMenuIconPath(fileName) {
        return MENU_ICON_BASE_PATH + fileName;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Logo Path from Config
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__GetLogoPath() {
        var fallbackLogoPath  =  '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return fallbackLogoPath;
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var config   =  state.appConfig || {};
        var headerConfig  =  config['DocEditor__Header__Config'] || {};
        return headerConfig['DocEditor__Header__Config__LogoPath'] || fallbackLogoPath;
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


    // SUB FUNCTION | Build Side Menu Section HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildSideMenuSection(sectionKey, iconFileName, titleText, bodyHtml) {
        var isOpen        =  ValeSpec__PageRenderer__MenuSectionState[sectionKey] !== false;
        var openClass     =  isOpen ? 'is-open' : '';
        var ariaExpanded  =  isOpen ? 'true' : 'false';

        var html  =  '<section class="ValeSpec__DocPreview__MenuSection">';
        html     +=      '<button type="button" class="ValeSpec__DocPreview__MenuSectionToggle ' + openClass + '" data-menu-section-toggle="' + sectionKey + '" aria-expanded="' + ariaExpanded + '">';
        html     +=          '<img class="ValeSpec__DocPreview__MenuIcon" src="' + ValeSpec__PageRenderer__GetMenuIconPath(iconFileName) + '" alt="" />';
        html     +=          '<span class="ValeSpec__DocPreview__MenuSectionLabel">' + ValeSpec__PageRenderer__EscapeHtml(titleText) + '</span>';
        html     +=          '<span class="ValeSpec__DocPreview__MenuSectionArrow">▾</span>';
        html     +=      '</button>';
        html     +=      '<div class="ValeSpec__DocPreview__MenuSectionPanel ' + openClass + '" data-menu-section-panel="' + sectionKey + '">';
        html     +=          bodyHtml || '';
        html     +=      '</div>';
        html     +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Right-Docked Side Menu HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildSideMenu(viewState) {
        var modeSmallClass  =  viewState.diagramMode === 'small' ? 'ValeSpec__DocPreview__SegmentBtn--active' : '';
        var modeLargeClass  =  viewState.diagramMode === 'large' ? 'ValeSpec__DocPreview__SegmentBtn--active' : '';
        var modeNoneClass   =  viewState.diagramMode === 'none'  ? 'ValeSpec__DocPreview__SegmentBtn--active' : '';
        var menuInlineStyle =  '';
        if (typeof ValeSpec__PageRenderer__MenuPositionState.left === 'number' && typeof ValeSpec__PageRenderer__MenuPositionState.top === 'number') {
            menuInlineStyle  =  ' style="left:' + Math.round(ValeSpec__PageRenderer__MenuPositionState.left) + 'px; top:' + Math.round(ValeSpec__PageRenderer__MenuPositionState.top) + 'px; right:auto;"';
        }

        var diagramBody  =  '';
        diagramBody     +=      '<div class="ValeSpec__DocPreview__ToolbarGroup">';
        diagramBody     +=          '<div class="ValeSpec__DocPreview__ToolbarGroupLabel">Preview Diagrams</div>';
        diagramBody     +=          '<div class="ValeSpec__DocPreview__SegmentControl">';
        diagramBody     +=              '<button class="ValeSpec__DocPreview__SegmentBtn ' + modeSmallClass + '" data-diagram-mode="small">Small</button>';
        diagramBody     +=              '<button class="ValeSpec__DocPreview__SegmentBtn ' + modeLargeClass + '" data-diagram-mode="large">Large</button>';
        diagramBody     +=              '<button class="ValeSpec__DocPreview__SegmentBtn ' + modeNoneClass + '" data-diagram-mode="none">No Diagrams</button>';
        diagramBody     +=          '</div>';
        diagramBody     +=      '</div>';

        var sectionsBody  =  '';
        sectionsBody     +=      '<label class="ValeSpec__DocPreview__ToggleControl">';
        sectionsBody     +=          '<input type="checkbox" id="ValeSpec__DocPreview__TglFullSchedule" ' + (viewState.showFullSchedule ? 'checked' : '') + ' />';
        sectionsBody     +=          '<span>Full Ironmongery Schedule</span>';
        sectionsBody     +=      '</label>';
        sectionsBody     +=      '<label class="ValeSpec__DocPreview__ToggleControl">';
        sectionsBody     +=          '<input type="checkbox" id="ValeSpec__DocPreview__TglSummary" ' + (viewState.showSummary ? 'checked' : '') + ' />';
        sectionsBody     +=          '<span>Ironmongery Summary</span>';
        sectionsBody     +=      '</label>';
        sectionsBody     +=      '<label class="ValeSpec__DocPreview__ToggleControl">';
        sectionsBody     +=          '<input type="checkbox" id="ValeSpec__DocPreview__TglJobNotes" ' + (viewState.showJobNotes ? 'checked' : '') + ' />';
        sectionsBody     +=          '<span>Special Job Notes</span>';
        sectionsBody     +=      '</label>';

        var actionsBody  =  '';
        actionsBody     +=      '<button class="ValeSpec__DocPreview__MenuAction ValeSpec__DocPreview__MenuAction--secondary ValeSpec__DocPreview__BtnEmailPlaceholder" id="ValeSpec__DocPreview__BtnEmailPlaceholder">Auto Email (Coming Soon)</button>';
        actionsBody     +=      '<button class="ValeSpec__DocPreview__MenuAction ValeSpec__DocPreview__MenuAction--primary ValeSpec__DocPreview__BtnExport" id="ValeSpec__DocPreview__BtnExport">Export PDF</button>';

        var html  =  '<aside class="ValeSpec__DocPreview__SideMenuColumn"' + menuInlineStyle + '>';
        html     +=      '<div class="ValeSpec__DocPreview__SideMenuCard">';
        html     +=          '<div class="ValeSpec__DocPreview__SideMenuHeader">';
        html     +=              '<img class="ValeSpec__DocPreview__MenuIcon ValeSpec__DocPreview__MenuIcon--header" src="' + ValeSpec__PageRenderer__GetMenuIconPath('Icon__ToolsMenu__MainMenuIcon__540p__.png') + '" alt="" />';
        html     +=              '<span class="ValeSpec__DocPreview__SideMenuHeaderLabel">Preview Tools &amp; Sections</span>';
        html     +=              '<button type="button" class="ValeSpec__DocPreview__MenuDragHandle" id="ValeSpec__DocPreview__MenuDragHandle" title="Drag menu">⋮⋮</button>';
        html     +=          '</div>';
        html     +=          '<div class="ValeSpec__DocPreview__SideMenuSections">';
        html     +=              ValeSpec__PageRenderer__BuildSideMenuSection('diagrams',   'Icon__ToolsMenu__ElevationView__540p__.png', 'Diagram Layout', diagramBody);
        html     +=              ValeSpec__PageRenderer__BuildSideMenuSection('sections',   'Icon__ToolsMenu__ViewModelLayers__540p__.png', 'Document Sections', sectionsBody);
        html     +=              ValeSpec__PageRenderer__BuildSideMenuSection('actions',    'Icon__ToolsMenu__ExportImage__540p__.png', 'Actions', actionsBody);
        html     +=          '</div>';
        html     +=      '</div>';
        html     +=  '</aside>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Branding Header HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildBrandingHeader(meta) {
        var logoPath     =  ValeSpec__PageRenderer__GetLogoPath();
        var projectName  =  ValeSpec__PageRenderer__EscapeHtml(meta['ValeSpec__ProjectFile__Metadata__ProjectName']  || 'Untitled Project');
        var docName      =  ValeSpec__PageRenderer__EscapeHtml(meta['ValeSpec__ProjectFile__Metadata__DocumentName'] || 'Untitled Document');
        var revision     =  ValeSpec__PageRenderer__EscapeHtml(meta['ValeSpec__ProjectFile__Metadata__RevisionCode'] || '');
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


    // SUB FUNCTION | Build Section Heading HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildSectionHeading(titleText) {
        var safeTitle  =  ValeSpec__PageRenderer__EscapeHtml(titleText || '');
        return '<h2 class="ValeSpec__DocPreview__SectionHeading">' + safeTitle + '</h2>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Assembly Schedule Block HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildAssemblyScheduleBlock(assemblyInfo, includeHr, diagramMode) {
        var SpecTableRenderer  =  window.ValeSpec__DocPreview__SpecTableRenderer;
        var diagramClass       =  'ValeSpec__DocPreview__AssemblyBlock--diagramLarge';
        if (diagramMode === 'small') diagramClass  =  'ValeSpec__DocPreview__AssemblyBlock--diagramSmall';
        if (diagramMode === 'none')  diagramClass  =  'ValeSpec__DocPreview__AssemblyBlock--diagramNone';
        var showDiagram         =  diagramMode !== 'none';

        var html  =  '';
        if (includeHr) html  +=  '<hr class="ValeSpec__DocPreview__AssemblySectionHr" />';
        html      +=  '<div class="ValeSpec__DocPreview__AssemblyBlock ' + diagramClass + '">';
        html      +=      '<div class="ValeSpec__DocPreview__AssemblyTitle">' + ValeSpec__PageRenderer__EscapeHtml(assemblyInfo.title) + '</div>';
        html      +=      '<div class="ValeSpec__DocPreview__AssemblyContentRow">';

        if (showDiagram) {
            html  +=      '<div class="ValeSpec__DocPreview__DrawingContainer" id="ValeSpec__DocPreview__Drawing_' + assemblyInfo.renderIndex + '"></div>';
        }

        html      +=          '<div class="ValeSpec__DocPreview__SpecTableWrap">';
        if (SpecTableRenderer && SpecTableRenderer.ValeSpec__SpecTableRenderer__RenderSpecTable) {
            html  +=              SpecTableRenderer.ValeSpec__SpecTableRenderer__RenderSpecTable(assemblyInfo.assemblyData);
        } else {
            html  +=              '<div class="ValeSpec__DocPreview__InlineEmptyState">Spec table renderer unavailable.</div>';
        }
        html      +=          '</div>';
        html      +=      '</div>';
        html      +=  '</div>';

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Full Schedule Section HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildFullScheduleSection(model, styleTokens) {
        var html  =  '<section class="ValeSpec__DocPreview__Section ValeSpec__DocPreview__Section--fullSchedule">';
        html     +=      ValeSpec__PageRenderer__BuildSectionHeading(styleTokens.sectionTitle01);

        if (!model.orderedAssemblies.length) {
            html  +=  '<div class="ValeSpec__DocPreview__InlineEmptyState">No configured assemblies available.</div>';
            html  +=  '</section>';
            return html;
        }

        for (var i = 0; i < model.orderedAssemblies.length; i++) {
            html  +=  ValeSpec__PageRenderer__BuildAssemblyScheduleBlock(
                model.orderedAssemblies[i],
                i > 0,
                model.viewState.diagramMode
            );
        }

        html  +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Summary Section HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildSummarySection(model, styleTokens) {
        var html  =  '<section class="ValeSpec__DocPreview__Section ValeSpec__DocPreview__Section--summary">';
        html     +=      ValeSpec__PageRenderer__BuildSectionHeading(styleTokens.sectionTitle02);
        html     +=      '<table class="ValeSpec__DocPreview__SummaryTable">';
        html     +=          '<thead><tr>';
        html     +=              '<th>Specification Item</th>';
        html     +=              '<th>Detail</th>';
        html     +=              '<th>Supplier</th>';
        html     +=              '<th>Finish</th>';
        html     +=              '<th>Total Quantity</th>';
        html     +=          '</tr></thead>';
        html     +=          '<tbody>';

        if (!model.summaryRows.length) {
            html  +=          '<tr>';
            html  +=              '<td>N/A</td><td>N/A</td><td>N/A</td><td>N/A</td><td>N/A</td>';
            html  +=          '</tr>';
        } else {
            for (var i = 0; i < model.summaryRows.length; i++) {
                var row  =  model.summaryRows[i] || {};
                html    +=      '<tr>';
                html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.itemName || 'N/A') + '</td>';
                html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.detail || 'N/A') + '</td>';
                html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.supplier || 'N/A') + '</td>';
                html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.finish || 'N/A') + '</td>';
                html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.totalQuantity || 'N/A') + '</td>';
                html    +=      '</tr>';
            }
        }

        html     +=          '</tbody>';
        html     +=      '</table>';
        html     +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Warnings Section HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildWarningsSection(model, styleTokens) {
        if (!model.warningRows.length) return '';

        var html  =  '<section class="ValeSpec__DocPreview__Section ValeSpec__DocPreview__Section--warnings">';
        html     +=      ValeSpec__PageRenderer__BuildSectionHeading(styleTokens.sectionTitle03);
        html     +=      '<div class="ValeSpec__DocPreview__WarningsTableWrap">';
        html     +=          '<table class="ValeSpec__DocPreview__WarningsTable">';
        html     +=              '<thead><tr><th>Assembly</th><th>Warning</th><th>Message</th></tr></thead>';
        html     +=              '<tbody>';

        for (var i = 0; i < model.warningRows.length; i++) {
            var row  =  model.warningRows[i] || {};
            html    +=      '<tr>';
            html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.assemblyTitle || 'N/A') + '</td>';
            html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.warningTitle || 'Warning') + '</td>';
            html    +=          '<td>' + ValeSpec__PageRenderer__EscapeHtml(row.warningMessage || '') + '</td>';
            html    +=      '</tr>';
        }

        html     +=              '</tbody>';
        html     +=          '</table>';
        html     +=      '</div>';
        html     +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Job Notes Section HTML
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BuildJobNotesSection(model, styleTokens) {
        if (!model.jobNotes) return '';

        var escaped  =  ValeSpec__PageRenderer__EscapeHtml(model.jobNotes);
        var html  =  '<section class="ValeSpec__DocPreview__Section ValeSpec__DocPreview__Section--jobNotes">';
        html     +=      ValeSpec__PageRenderer__BuildSectionHeading(styleTokens.sectionTitle04);
        html     +=      '<div class="ValeSpec__DocPreview__JobNotes">';
        html     +=          '<div class="ValeSpec__DocPreview__JobNotesContent">' + escaped + '</div>';
        html     +=      '</div>';
        html     +=  '</section>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render SVG Drawings into Mounted Containers
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__RenderDrawings(model) {
        if (!model || model.viewState.diagramMode === 'none') return;

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (!RenderPipeline) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var hwIndex       =  StateManager ? StateManager.ValeSpec__StateManager__GetState().hardwareIndex : null; // <-- Resolve hardware index for ironmongery rendering

        for (var i = 0; i < model.orderedAssemblies.length; i++) {
            var assemblyInfo      =  model.orderedAssemblies[i];
            var drawingContainer  =  document.getElementById('ValeSpec__DocPreview__Drawing_' + assemblyInfo.renderIndex);
            if (drawingContainer) {
                try {
                    var svgMarkup  =  null;
                    if (model.viewState.diagramMode === 'small') {
                        svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assemblyInfo.assemblyData, hwIndex, 420, 220);
                    } else {
                        svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assemblyInfo.assemblyData, hwIndex);
                    }
                    if (svgMarkup) drawingContainer.innerHTML  =  svgMarkup;
                } catch (e) {
                    console.warn('[ValeSpec__PageRenderer] Drawing render error for index ' + i + ':', e);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Side Menu Section Toggle Events
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BindMenuSectionEvents() {
        var sectionToggles  =  document.querySelectorAll('.ValeSpec__DocPreview__MenuSectionToggle[data-menu-section-toggle]');
        for (var i = 0; i < sectionToggles.length; i++) {
            sectionToggles[i].addEventListener('click', function(e) {
                e.preventDefault();
                var sectionKey  =  e.currentTarget.getAttribute('data-menu-section-toggle') || '';
                if (!sectionKey) return;

                var panelSelector  =  '.ValeSpec__DocPreview__MenuSectionPanel[data-menu-section-panel="' + sectionKey + '"]';
                var panelEl        =  document.querySelector(panelSelector);
                var nextOpenState  =  !(ValeSpec__PageRenderer__MenuSectionState[sectionKey] !== false);
                ValeSpec__PageRenderer__MenuSectionState[sectionKey]  =  nextOpenState;

                if (panelEl) {
                    panelEl.classList.toggle('is-open', nextOpenState);
                }

                e.currentTarget.classList.toggle('is-open', nextOpenState);
                e.currentTarget.setAttribute('aria-expanded', nextOpenState ? 'true' : 'false');
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stop Floating Menu Drag
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__StopMenuDrag() {
        ValeSpec__PageRenderer__MenuDragState.isDragging  =  false;
        document.removeEventListener('mousemove', ValeSpec__PageRenderer__OnMenuDragMove);
        document.removeEventListener('mouseup', ValeSpec__PageRenderer__StopMenuDrag);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Process Floating Menu Drag Move
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__OnMenuDragMove(event) {
        if (!ValeSpec__PageRenderer__MenuDragState.isDragging) return;

        var menuColumn  =  document.querySelector('.ValeSpec__DocPreview__SideMenuColumn');
        if (!menuColumn) return;

        var menuRect       =  menuColumn.getBoundingClientRect();
        var menuWidth      =  menuRect.width  || 320;
        var menuHeight     =  menuRect.height || 420;
        var viewportWidth  =  window.innerWidth  || 0;
        var viewportHeight =  window.innerHeight || 0;

        var minLeft  =  8;
        var minTop   =  8;
        var maxLeft  =  Math.max(minLeft, viewportWidth  - menuWidth  - 8);
        var maxTop   =  Math.max(minTop,  viewportHeight - menuHeight - 8);

        var nextLeft  =  event.clientX - ValeSpec__PageRenderer__MenuDragState.offsetX;
        var nextTop   =  event.clientY - ValeSpec__PageRenderer__MenuDragState.offsetY;
        if (nextLeft < minLeft) nextLeft  =  minLeft;
        if (nextLeft > maxLeft) nextLeft  =  maxLeft;
        if (nextTop  < minTop)  nextTop   =  minTop;
        if (nextTop  > maxTop)  nextTop   =  maxTop;

        ValeSpec__PageRenderer__MenuPositionState.left  =  Math.round(nextLeft);
        ValeSpec__PageRenderer__MenuPositionState.top   =  Math.round(nextTop);
        menuColumn.style.left   =  ValeSpec__PageRenderer__MenuPositionState.left + 'px';
        menuColumn.style.top    =  ValeSpec__PageRenderer__MenuPositionState.top + 'px';
        menuColumn.style.right  =  'auto';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Floating Menu Drag Handle Events
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BindMenuDragEvents() {
        var dragHandle  =  document.getElementById('ValeSpec__DocPreview__MenuDragHandle');
        var menuColumn  =  document.querySelector('.ValeSpec__DocPreview__SideMenuColumn');
        if (!dragHandle || !menuColumn) return;

        dragHandle.addEventListener('mousedown', function(event) {
            if (event.button !== 0) return;
            event.preventDefault();
            var menuRect  =  menuColumn.getBoundingClientRect();
            ValeSpec__PageRenderer__MenuDragState.isDragging  =  true;
            ValeSpec__PageRenderer__MenuDragState.offsetX     =  event.clientX - menuRect.left;
            ValeSpec__PageRenderer__MenuDragState.offsetY     =  event.clientY - menuRect.top;
            document.addEventListener('mousemove', ValeSpec__PageRenderer__OnMenuDragMove);
            document.addEventListener('mouseup', ValeSpec__PageRenderer__StopMenuDrag);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Side Menu Event Listeners
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__BindEvents() {
        var DocumentState  =  window.ValeSpec__DocPreview__DocumentState;
        ValeSpec__PageRenderer__BindMenuSectionEvents();
        ValeSpec__PageRenderer__BindMenuDragEvents();

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

        var emailBtn  =  document.getElementById('ValeSpec__DocPreview__BtnEmailPlaceholder');
        if (emailBtn) {
            emailBtn.addEventListener('click', function() {
                alert('Auto Email integration placeholder. Microsoft Graph integration will be wired in a future update.');
            });
        }

        var diagramButtons  =  document.querySelectorAll('.ValeSpec__DocPreview__SegmentBtn[data-diagram-mode]');
        for (var i = 0; i < diagramButtons.length; i++) {
            diagramButtons[i].addEventListener('click', function(e) {
                e.preventDefault();
                if (!DocumentState) return;
                var mode  =  e.currentTarget.getAttribute('data-diagram-mode') || 'small';
                DocumentState.ValeSpec__DocumentState__SetViewStatePartial({ diagramMode: mode });
                ValeSpec__PageRenderer__Render();
            });
        }

        var tglFullSchedule  =  document.getElementById('ValeSpec__DocPreview__TglFullSchedule');
        if (tglFullSchedule) {
            tglFullSchedule.addEventListener('change', function() {
                if (!DocumentState) return;
                DocumentState.ValeSpec__DocumentState__SetViewStatePartial({ showFullSchedule: !!tglFullSchedule.checked });
                ValeSpec__PageRenderer__Render();
            });
        }

        var tglSummary  =  document.getElementById('ValeSpec__DocPreview__TglSummary');
        if (tglSummary) {
            tglSummary.addEventListener('change', function() {
                if (!DocumentState) return;
                DocumentState.ValeSpec__DocumentState__SetViewStatePartial({ showSummary: !!tglSummary.checked });
                ValeSpec__PageRenderer__Render();
            });
        }

        var tglJobNotes  =  document.getElementById('ValeSpec__DocPreview__TglJobNotes');
        if (tglJobNotes) {
            tglJobNotes.addEventListener('change', function() {
                if (!DocumentState) return;
                DocumentState.ValeSpec__DocumentState__SetViewStatePartial({ showJobNotes: !!tglJobNotes.checked });
                ValeSpec__PageRenderer__Render();
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Shared Style Tokens as CSS Variables
    // ------------------------------------------------------------
    function ValeSpec__PageRenderer__ApplyStyleTokens(container, styleTokens) {
        if (!container || !styleTokens) return;
        container.style.setProperty('--ValeSpec_DocPreview_TableHeaderBg', styleTokens.tableHeaderBg);
        container.style.setProperty('--ValeSpec_DocPreview_TableHeaderFg', styleTokens.tableHeaderFg);
        container.style.setProperty('--ValeSpec_DocPreview_TableAltRowBg', styleTokens.tableAltRowBg);
        container.style.setProperty('--ValeSpec_DocPreview_WarningBg', styleTokens.warningBg);
        container.style.setProperty('--ValeSpec_DocPreview_WarningBorder', styleTokens.warningBorder);
        container.style.setProperty('--ValeSpec_DocPreview_WarningTitle', styleTokens.warningTitle);
        container.style.setProperty('--ValeSpec_DocPreview_WarningText', styleTokens.warningText);
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

        var DocumentState  =  window.ValeSpec__DocPreview__DocumentState;
        var DocumentModel  =  window.ValeSpec__DocPreview__DocumentModel;
        if (!DocumentState || !DocumentModel) {
            container.innerHTML  =  '<div class="ValeSpec__DocPreview__InlineEmptyState">Document preview modules failed to load.</div>';
            return;
        }

        var viewState   =  DocumentState.ValeSpec__DocumentState__GetViewState();
        var model       =  DocumentModel.ValeSpec__DocumentModel__Build(viewState);
        var styleTokens =  DocumentState.ValeSpec__DocumentState__GetStyleTokens();
        var meta        =  model.metadata || {};

        ValeSpec__PageRenderer__ApplyStyleTokens(container, styleTokens);

        var html  =  '<div class="ValeSpec__DocPreview__LayoutShell">';
        html     +=      '<div class="ValeSpec__DocPreview__DocumentColumn">';
        html     +=          '<div class="ValeSpec__DocPreview__Paper">';
        html     +=      ValeSpec__PageRenderer__BuildBrandingHeader(meta);

        var renderedSectionCount  =  0;

        if (viewState.showFullSchedule) {
            html  +=  ValeSpec__PageRenderer__BuildFullScheduleSection(model, styleTokens);
            renderedSectionCount++;
        }

        if (viewState.showSummary) {
            html  +=  ValeSpec__PageRenderer__BuildSummarySection(model, styleTokens);
            renderedSectionCount++;
        }

        if (model.warningRows && model.warningRows.length > 0) {
            html  +=  ValeSpec__PageRenderer__BuildWarningsSection(model, styleTokens);
            renderedSectionCount++;
        }

        if (viewState.showJobNotes && model.jobNotes) {
            html  +=  ValeSpec__PageRenderer__BuildJobNotesSection(model, styleTokens);
            renderedSectionCount++;
        }

        if (renderedSectionCount === 0) {
            html  +=  '<div class="ValeSpec__DocPreview__InlineEmptyState">No sections are currently enabled for preview.</div>';
        }

        html     +=          '</div>';
        html     +=      '</div>';
        html     +=  '</div>';
        html     +=  ValeSpec__PageRenderer__BuildSideMenu(viewState);

        container.innerHTML  =  html;

        ValeSpec__PageRenderer__RenderDrawings(model);
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
