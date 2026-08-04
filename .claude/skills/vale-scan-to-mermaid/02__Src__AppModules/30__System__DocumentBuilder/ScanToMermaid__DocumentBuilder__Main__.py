# =============================================================================
# SCANTOMERMAID - DOCUMENT BUILDER
# =============================================================================
#
# FILE       : ScanToMermaid__DocumentBuilder__Main__.py
# NAMESPACE  : ScanToMermaid
# MODULE     : DocumentBuilder - Main
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Bake a transcribed sheet into a self-contained Vale branded document
# CREATED    : 04-Aug-2026
#
# DESCRIPTION:
# - Reads a transcription JSON authored from the processed scan
# - Resolves the theme from the project override folder, else the skill default
# - Parses the --ValeMermaid_* tokens so the CSS genuinely drives diagram colour
# - Injects a semantic classDef preamble built from those tokens
# - Inlines the version locked Mermaid renderer so the page works fully offline
# - Embeds the Vale logo and the processed scan as data URIs
# - Writes a single HTML file, plus a Markdown twin using GitHub raw asset URLs
# - Writes a Vale headed index page when more than one sheet is built
#
# =============================================================================

import os
import re
import sys
import json
import base64
import argparse
import datetime

# -----------------------------------------------------------------------------
# REGION | Configuration Constants
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Skill Relative Paths
    # ------------------------------------------------------------
SCRIPT_DIR        =  os.path.dirname(os.path.abspath(__file__))
SKILL_ROOT        =  os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..'))      # <-- vale-scan-to-mermaid folder
THEME_DEFAULT     =  os.path.join(SKILL_ROOT, '03__Style__MermaidTheme', 'Vale__MermaidTheme__.css')
MERMAID_VENDOR    =  os.path.join(SKILL_ROOT, '04__Src__Dependencies__VersionLocked',
                                  '01__Vendor__MermaidJs__v11.16.0', 'mermaid.min.js')
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Project Folder Layout
    # ------------------------------------------------------------
THEME_OVERRIDE_DIR =  '99__Style__MermaidTheme'                                  # <-- Per project override wins over the skill default
THEME_FILENAME     =  'Vale__MermaidTheme__.css'
OUTPUT_FOLDER_NAME =  '05__Output__Document'
MERMAID_FOLDER     =  '04__Output__Mermaid'
INDEX_FILENAME     =  '00__Index__.html'
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Vale Brand Assets
    # ------------------------------------------------------------
GITHUB_RAW_ROOT    =  'https://raw.githubusercontent.com/Adam-Noble-01/ValeCodebase/main'
LOGO_REPO_PATH     =  'Core__BrandAssets/Logos__ValeBrandGraphics/Logo__ValeLogo__HorizontalFormat.png'
LOGO_GITHUB_URL    =  f'{GITHUB_RAW_ROOT}/{LOGO_REPO_PATH}'                      # <-- Used by the Markdown twin
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Semantic Role To Token Mapping
    # ------------------------------------------------------------
SEMANTIC_ROLES     =  [
    ('valeStart',    '--ValeMermaid_StartFill',    '--ValeMermaid_NodeStroke',     '--ValeMermaid_StartText'),
    ('valeProcess',  '--ValeMermaid_NodeFill',     '--ValeMermaid_NodeStroke',     '--ValeMermaid_NodeText'),
    ('valeDecision', '--ValeMermaid_DecisionFill', '--ValeMermaid_DecisionStroke', '--ValeMermaid_NodeText'),
    ('valeStop',     '--ValeMermaid_StopFill',     '--ValeMermaid_StopStroke',     '--ValeMermaid_NodeText'),
    ('valeSla',      '--ValeMermaid_SlaFill',      '--ValeMermaid_SlaStroke',      '--ValeMermaid_NodeText'),
    ('valeDone',     '--ValeMermaid_DoneFill',     '--ValeMermaid_DoneStroke',     '--ValeMermaid_NodeText')
]
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Theme Resolution
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Find the Governing Theme Stylesheet
    # ------------------------------------------------------------
def resolve_theme_path(project_root, explicit_theme):
    """Return the theme path, preferring an explicit flag then the project override."""
    if explicit_theme:
        return os.path.abspath(explicit_theme)

    override  =  os.path.join(project_root, THEME_OVERRIDE_DIR, THEME_FILENAME)
    if os.path.isfile(override):
        return override                                                          # <-- Project override wins
    return THEME_DEFAULT
    # ------------------------------------------------------------


    # HELPER FUNCTION | Seed a Project Theme Override From the Skill Default
    # ------------------------------------------------------------
def seed_project_theme(project_root):
    """Copy the default theme into the project so it is there to be edited."""
    target_dir  =  os.path.join(project_root, THEME_OVERRIDE_DIR)
    target      =  os.path.join(target_dir, THEME_FILENAME)
    if os.path.isfile(target):
        return target                                                            # <-- Never overwrite an edited theme

    os.makedirs(target_dir, exist_ok=True)
    with open(THEME_DEFAULT, 'r', encoding='utf-8') as source:
        content  =  source.read()
    with open(target, 'w', encoding='utf-8') as handle:
        handle.write(content)
    print(f'  Theme seeded : {target}')
    return target
    # ------------------------------------------------------------


    # HELPER FUNCTION | Read The Mermaid Tokens Declared In The Stylesheet
    # ------------------------------------------------------------
def parse_theme_tokens(theme_css):
    """Return a dict of --ValeMermaid_* custom properties to their declared values."""
    tokens   =  {}
    pattern  =  re.compile(r'(--ValeMermaid_[A-Za-z0-9_]+)\s*:\s*([^;]+);')
    for name, value in pattern.findall(theme_css):
        tokens[name]  =  value.strip()
    return tokens
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Mermaid Definition Assembly
# -----------------------------------------------------------------------------

    # FUNCTION | Build the Semantic classDef Preamble From Theme Tokens
    # ------------------------------------------------------------
def build_class_definitions(tokens):
    """Return Mermaid classDef lines coloured entirely from the stylesheet tokens."""
    stroke_width  =  tokens.get('--ValeMermaid_NodeStrokeWidth', '1.6px')
    lines         =  []
    for class_name, fill_token, stroke_token, text_token in SEMANTIC_ROLES:
        fill    =  tokens.get(fill_token,   '#ffffff')
        stroke  =  tokens.get(stroke_token, '#172b3a')
        text    =  tokens.get(text_token,   '#172b3a')
        lines.append(f'    classDef {class_name} fill:{fill},stroke:{stroke},'
                     f'stroke-width:{stroke_width},color:{text}')
    return '\n'.join(lines)
    # ------------------------------------------------------------


    # FUNCTION | Merge The Author's Diagram With The Theme Driven Classes
    # ------------------------------------------------------------
def compose_mermaid_definition(definition, tokens):
    """Append theme classDefs unless the author has already declared their own."""
    if 'classDef' in definition:
        return definition.rstrip()                                               # <-- Author has taken control, leave it alone
    return f'{definition.rstrip()}\n\n{build_class_definitions(tokens)}\n'
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Asset Embedding
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Locate The Vale Logo Inside The Repository
    # ------------------------------------------------------------
def find_repo_logo():
    """Walk up from the skill folder looking for Core__BrandAssets, return the logo path."""
    current  =  SKILL_ROOT
    for _ in range(6):
        candidate  =  os.path.join(current, LOGO_REPO_PATH.replace('/', os.sep))
        if os.path.isfile(candidate):
            return candidate
        parent  =  os.path.dirname(current)
        if parent == current:
            break
        current  =  parent
    return None
    # ------------------------------------------------------------


    # HELPER FUNCTION | Encode A File As A Data URI
    # ------------------------------------------------------------
def encode_data_uri(file_path, mime_type):
    """Return a base64 data URI for the given file, or None when it is missing."""
    if not file_path or not os.path.isfile(file_path):
        return None
    with open(file_path, 'rb') as handle:
        encoded  =  base64.b64encode(handle.read()).decode('ascii')
    return f'data:{mime_type};base64,{encoded}'
    # ------------------------------------------------------------


    # HELPER FUNCTION | Read A Required Text File Or Exit Clearly
    # ------------------------------------------------------------
def read_text_file(file_path, description):
    """Return the file contents, exiting with a clear message when absent."""
    if not os.path.isfile(file_path):
        print(f'  ERROR: {description} not found at {file_path}')
        sys.exit(1)
    with open(file_path, 'r', encoding='utf-8') as handle:
        return handle.read()
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | HTML Fragment Builders
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Escape Text For Safe HTML Embedding
    # ------------------------------------------------------------
def escape_html(value):
    """Return value with HTML control characters neutralised."""
    return (str(value).replace('&', '&amp;').replace('<', '&lt;')
                      .replace('>', '&gt;').replace('"', '&quot;'))
    # ------------------------------------------------------------


    # HELPER FUNCTION | Build A Safe File Stem From A Document Title
    # ------------------------------------------------------------
def build_slug(title):
    """Return a house-style file stem for downloaded exports."""
    words  =  re.findall(r'[A-Za-z0-9]+', str(title))
    if not words:
        return 'ValeDiagram'
    return ''.join(word.capitalize() for word in words)                        # <-- PascalCase, matches the repo naming grammar
    # ------------------------------------------------------------


    # SUB FUNCTION | Render The Transcribed Notes Sections
    # ------------------------------------------------------------
def render_notes(sections):
    """Return HTML panels for each transcribed notes section."""
    if not sections:
        return ''

    blocks  =  []
    for section in sections:
        title  =  escape_html(section.get('Section__Title', 'Notes'))
        items  =  section.get('Section__Items', [])
        rows   =  '\n'.join(f'            <li>{item}</li>' for item in items)     # <-- Items may carry inline markup from the author
        blocks.append(
            '    <section class="doc-panel">\n'
            f'        <h2 class="doc-section-heading">{title}</h2>\n'
            '        <ol class="notes-list">\n'
            f'{rows}\n'
            '        </ol>\n'
            '    </section>'
        )
    return '\n'.join(blocks)
    # ------------------------------------------------------------


    # SUB FUNCTION | Render The Sheet Legend
    # ------------------------------------------------------------
def render_legend(legend_items):
    """Return the legend panel, or an empty string when the sheet had no key."""
    if not legend_items:
        return ''

    entries  =  []
    for item in legend_items:
        label  =  escape_html(item.get('Legend__Label', ''))
        entries.append('            <div class="legend-item">'
                       '<span class="legend-swatch"></span>'
                       f'<span>{label}</span></div>')
    return ('    <section class="doc-panel">\n'
            '        <h2 class="doc-section-heading">Legend</h2>\n'
            '        <div class="legend-grid">\n'
            + '\n'.join(entries) + '\n'
            '        </div>\n'
            '    </section>')
    # ------------------------------------------------------------


    # SUB FUNCTION | Render The Transcription Review Flags
    # ------------------------------------------------------------
def render_review_flags(flags):
    """Return the collapsible low confidence transcription table."""
    if not flags:
        return ''

    rows  =  []
    for flag in flags:
        confidence  =  escape_html(flag.get('Flag__Confidence', 'low')).lower()
        rows.append(
            '                    <tr>\n'
            f'                        <td>{escape_html(flag.get("Flag__Location", ""))}</td>\n'
            f'                        <td>{escape_html(flag.get("Flag__Transcribed", ""))}</td>\n'
            f'                        <td>{escape_html(flag.get("Flag__Alternative", ""))}</td>\n'
            f'                        <td class="confidence-{confidence}">{confidence}</td>\n'
            '                    </tr>'
        )
    return (
        '    <details class="doc-disclosure">\n'
        '        <summary>Transcription review'
        f'<span class="doc-disclosure__count">{len(flags)} item(s) to verify</span></summary>\n'
        '        <div class="doc-disclosure__body">\n'
        '            <div class="review-panel">\n'
        '                <table class="review-table">\n'
        '                    <thead><tr><th>Where</th><th>Transcribed as</th>'
        '<th>Possible alternative</th><th>Confidence</th></tr></thead>\n'
        '                    <tbody>\n'
        + '\n'.join(rows) + '\n'
        '                    </tbody>\n'
        '                </table>\n'
        '            </div>\n'
        '        </div>\n'
        '    </details>'
    )
    # ------------------------------------------------------------


    # SUB FUNCTION | Render The Collapsible Original Scan
    # ------------------------------------------------------------
def render_source_scan(scan_data_uri, source_name):
    """Return the collapsible panel holding the levels corrected original."""
    if not scan_data_uri:
        return ''
    return (
        '    <details class="doc-disclosure">\n'
        '        <summary>View original drawing'
        f'<span class="doc-disclosure__count">{escape_html(source_name)}</span></summary>\n'
        '        <div class="doc-disclosure__body">\n'
        f'            <img class="source-scan" src="{scan_data_uri}" '
        'alt="Levels corrected original scan">\n'
        '        </div>\n'
        '    </details>'
    )
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Page Template
# -----------------------------------------------------------------------------

    # MODULE CONSTANT | Self Contained Document Template
    # ------------------------------------------------------------
HTML_TEMPLATE  =  """<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__DOC_TITLE__</title>
<style>
__THEME_CSS__
</style>
</head>
<body>

<!-- ----------------------------------------------------------------- -->
<!-- REGION | Vale Garden Houses Header                                 -->
<!-- ----------------------------------------------------------------- -->
<header class="app-header">
    <div class="app-header__logo-container app-header__logo-container--left">
        <img src="__LOGO_SRC__" class="app-header__logo-left" alt="Vale Garden Houses">
    </div>
    <div class="app-header__logo-container app-header__logo-container--right">
        <h1 class="app-header__title">__HEADER_TITLE__</h1>
    </div>
</header>
<!-- endregion ----------------------------------------------------------------- -->

<main class="doc-shell">

    <section class="doc-panel">
        <h1 class="doc-title">__DOC_TITLE__</h1>
        <p class="doc-subtitle">__DOC_SUBTITLE__</p>
        <div class="diagram-toolbar">
            <button class="diagram-toolbar__button" id="ValeMermaid__DownloadPng"
                    type="button" disabled>Download PNG</button>
            <button class="diagram-toolbar__button" id="ValeMermaid__DownloadSvg"
                    type="button" disabled>Download SVG</button>
        </div>
        <div class="diagram-host">
            <pre class="mermaid">
__MERMAID_DEFINITION__
            </pre>
        </div>
        <div class="doc-meta">__DOC_META__</div>
    </section>

__NOTES_SECTIONS__

__LEGEND_SECTION__

__SOURCE_SCAN__

__REVIEW_FLAGS__

</main>

<script>
__MERMAID_LIBRARY__
</script>
<script>
// -----------------------------------------------------------------------------
// REGION | Mermaid Bootstrap Driven By The Stylesheet Tokens
// -----------------------------------------------------------------------------

    // FUNCTION | Read A CSS Custom Property With A Fallback
    // ------------------------------------------------------------
    const ValeMermaid__RootStyles = getComputedStyle(document.documentElement);
    function ValeMermaid__Token(name, fallback) {
        const value = ValeMermaid__RootStyles.getPropertyValue(name).trim();
        return value || fallback;                                              // <-- Stylesheet wins, fallback keeps it rendering
    }
    // ------------------------------------------------------------

    // FUNCTION | Initialise And Render Every Diagram On The Page
    // ------------------------------------------------------------
    mermaid.initialize({
        startOnLoad   : false,
        securityLevel : 'strict',
        theme         : 'base',
        themeVariables: {
            fontFamily         : ValeMermaid__Token('--ValeMermaid_FontFamily', 'sans-serif'),
            fontSize           : ValeMermaid__Token('--ValeMermaid_FontSize', '15px'),
            primaryColor       : ValeMermaid__Token('--ValeMermaid_NodeFill', '#ffffff'),
            primaryBorderColor : ValeMermaid__Token('--ValeMermaid_NodeStroke', '#172b3a'),
            primaryTextColor   : ValeMermaid__Token('--ValeMermaid_NodeText', '#172b3a'),
            lineColor          : ValeMermaid__Token('--ValeMermaid_LineStroke', '#2f4a5e'),
            textColor          : ValeMermaid__Token('--ValeMermaid_LineText', '#5a6d7a'),
            clusterBkg         : ValeMermaid__Token('--ValeMermaid_ClusterFill', '#ffffff'),
            clusterBorder      : ValeMermaid__Token('--ValeMermaid_ClusterStroke', '#c9d1d6'),
            edgeLabelBackground: ValeMermaid__Token('--ValeMermaid_LineLabelBackground', '#ffffff')
        },
        flowchart     : {
            curve       : 'linear',                                            // <-- basis swoops and reads as noodles, linear travels directly
            useMaxWidth : true,
            nodeSpacing : 50,
            rankSpacing : 60,
            htmlLabels  : false                                                // <-- Native SVG text, so the diagram can be rasterised for export
        }
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
</script>
<script>
// -----------------------------------------------------------------------------
// REGION | Diagram Export
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Export Settings
    // ------------------------------------------------------------
    const ValeMermaid__SvgNamespace = 'http://www.w3.org/2000/svg';
    const ValeMermaid__ExportSlug   = '__DOC_SLUG__';
    const ValeMermaid__PngScale     = 2;                                       // <-- Retina grade raster, good enough to drop into a deck
    const ValeMermaid__ExportPad    = 24;                                      // <-- White margin around the exported diagram
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mask The Connector Behind Every Edge Label
    // ------------------------------------------------------------
    function ValeMermaid__InjectSvgStyle(svg) {
        const labelBackground = ValeMermaid__Token('--ValeMermaid_LineLabelBackground', '#ffffff');
        const fontFamily      = ValeMermaid__Token('--ValeMermaid_FontFamily', 'sans-serif');
        const style           = document.createElementNS(ValeMermaid__SvgNamespace, 'style');
        style.textContent =
            'text{font-family:' + fontFamily + ';}' +
            '.edgeLabel text,.edgeLabels text,.edgeLabel tspan{' +
            'paint-order:stroke fill;stroke:' + labelBackground + ';' +
            'stroke-width:4px;stroke-linejoin:round;}';                        // <-- Halo replaces the background box a foreignObject label had
        svg.insertBefore(style, svg.firstChild);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Produce A Standalone Copy Of The Rendered Diagram
    // ------------------------------------------------------------
    function ValeMermaid__BuildStandaloneSvg() {
        const source = document.querySelector('.diagram-host svg');
        if (!source) { return null; }

        const viewBox = (source.getAttribute('viewBox') || '').split(/\s+/).map(Number);
        const width   = viewBox.length === 4 ? viewBox[2] : source.getBoundingClientRect().width;
        const height  = viewBox.length === 4 ? viewBox[3] : source.getBoundingClientRect().height;
        const originX = viewBox.length === 4 ? viewBox[0] : 0;
        const originY = viewBox.length === 4 ? viewBox[1] : 0;
        const pad     = ValeMermaid__ExportPad;

        const clone = source.cloneNode(true);
        clone.setAttribute('xmlns', ValeMermaid__SvgNamespace);
        clone.setAttribute('viewBox', (originX - pad) + ' ' + (originY - pad) + ' ' +
                                      (width + pad * 2) + ' ' + (height + pad * 2));
        clone.setAttribute('width',  width  + pad * 2);
        clone.setAttribute('height', height + pad * 2);
        clone.removeAttribute('style');                                        // <-- Drop the on-page max-width so the export is full size

        const background = document.createElementNS(ValeMermaid__SvgNamespace, 'rect');
        background.setAttribute('x', originX - pad);
        background.setAttribute('y', originY - pad);
        background.setAttribute('width',  width  + pad * 2);
        background.setAttribute('height', height + pad * 2);
        background.setAttribute('fill', '#ffffff');
        clone.insertBefore(background, clone.firstChild);

        return { markup: new XMLSerializer().serializeToString(clone),
                 width: width + pad * 2, height: height + pad * 2 };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push A Blob At The Browser As A Download
    // ------------------------------------------------------------
    function ValeMermaid__SaveBlob(blob, fileName) {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    // ------------------------------------------------------------


    // FUNCTION | Download The Diagram As A Vector SVG
    // ------------------------------------------------------------
    function ValeMermaid__ExportSvg() {
        const built = ValeMermaid__BuildStandaloneSvg();
        if (!built) { return; }
        ValeMermaid__SaveBlob(new Blob([built.markup], { type: 'image/svg+xml;charset=utf-8' }),
                              ValeMermaid__ExportSlug + '__Diagram__.svg');
    }
    // ------------------------------------------------------------


    // FUNCTION | Download The Diagram As A Baked PNG
    // ------------------------------------------------------------
    function ValeMermaid__ExportPng() {
        const built = ValeMermaid__BuildStandaloneSvg();
        if (!built) { return; }

        const encoded = 'data:image/svg+xml;base64,' +
                        btoa(unescape(encodeURIComponent(built.markup)));       // <-- Data URI keeps the canvas untainted
        const image   = new Image();

        image.onload = function () {
            const canvas  = document.createElement('canvas');
            canvas.width  = Math.round(built.width  * ValeMermaid__PngScale);
            canvas.height = Math.round(built.height * ValeMermaid__PngScale);

            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(function (blob) {
                if (blob) {
                    ValeMermaid__SaveBlob(blob, ValeMermaid__ExportSlug + '__Diagram__.png');
                }
            }, 'image/png');
        };
        image.onerror = function () {
            window.alert('The diagram could not be rasterised. Use Download SVG instead.');
        };
        image.src = encoded;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render The Diagram Then Enable The Export Buttons
    // ------------------------------------------------------------
    mermaid.run({ querySelector: '.mermaid' }).then(function () {
        const svg = document.querySelector('.diagram-host svg');
        if (svg) { ValeMermaid__InjectSvgStyle(svg); }

        const pngButton = document.getElementById('ValeMermaid__DownloadPng');
        const svgButton = document.getElementById('ValeMermaid__DownloadSvg');
        if (pngButton) { pngButton.disabled = false; pngButton.addEventListener('click', ValeMermaid__ExportPng); }
        if (svgButton) { svgButton.disabled = false; svgButton.addEventListener('click', ValeMermaid__ExportSvg); }
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
</script>

</body>
</html>
"""
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Document Assembly
# -----------------------------------------------------------------------------

    # FUNCTION | Build One Self Contained HTML Document
    # ------------------------------------------------------------
def build_document(content, theme_css, mermaid_library, logo_src, scan_data_uri, tokens):
    """Return the finished HTML string for a single transcribed sheet."""
    definition  =  compose_mermaid_definition(content.get('Diagram__MermaidDefinition', ''), tokens)

    source_file  =  content.get('Document__SourceFile', 'unknown source')
    source_page  =  content.get('Document__SourcePage', 1)
    transcribed  =  content.get('Document__TranscribedDate',
                                datetime.date.today().strftime('%d-%b-%Y'))
    meta_line    =  (f'Transcribed from {escape_html(source_file)}, page {source_page} '
                     f'&middot; {escape_html(transcribed)} &middot; '
                     'Diagram redrawn in Mermaid from the original hand drawn sheet')

    replacements  =  {
        '__DOC_TITLE__'          : escape_html(content.get('Document__Title', 'Untitled Diagram')),
        '__HEADER_TITLE__'       : escape_html(content.get('Document__HeaderTitle',
                                               content.get('Document__Title', 'Diagram'))),
        '__DOC_SUBTITLE__'       : escape_html(content.get('Document__Subtitle', '')),
        '__DOC_META__'           : meta_line,
        '__DOC_SLUG__'           : build_slug(content.get('Document__Title', 'Vale Diagram')),
        '__THEME_CSS__'          : theme_css,
        '__MERMAID_DEFINITION__' : definition,
        '__MERMAID_LIBRARY__'    : mermaid_library,
        '__LOGO_SRC__'           : logo_src,
        '__NOTES_SECTIONS__'     : render_notes(content.get('Notes__Sections', [])),
        '__LEGEND_SECTION__'     : render_legend(content.get('Legend__Items', [])),
        '__SOURCE_SCAN__'        : render_source_scan(scan_data_uri, source_file),
        '__REVIEW_FLAGS__'       : render_review_flags(content.get('Review__Flags', []))
    }

    document  =  HTML_TEMPLATE
    for token, value in replacements.items():
        document  =  document.replace(token, value)
    return document
    # ------------------------------------------------------------


    # FUNCTION | Build The Markdown Twin Using GitHub Raw Asset URLs
    # ------------------------------------------------------------
def build_markdown(content, tokens):
    """Return a Markdown version referencing Vale graphics by GitHub raw URL."""
    definition  =  compose_mermaid_definition(content.get('Diagram__MermaidDefinition', ''), tokens)
    title       =  content.get('Document__Title', 'Untitled Diagram')
    subtitle    =  content.get('Document__Subtitle', '')
    source_file =  content.get('Document__SourceFile', 'unknown source')
    transcribed =  content.get('Document__TranscribedDate',
                               datetime.date.today().strftime('%d-%b-%Y'))

    lines  =  []
    lines.append(f'<img src="{LOGO_GITHUB_URL}" alt="Vale Garden Houses" height="42">')
    lines.append('')
    lines.append(f'# {title}')
    lines.append('')
    if subtitle:
        lines.append(f'_{subtitle}_')
        lines.append('')
    lines.append('```mermaid')
    lines.append(definition)
    lines.append('```')
    lines.append('')

    for section in content.get('Notes__Sections', []):
        lines.append(f'## {section.get("Section__Title", "Notes")}')
        lines.append('')
        for index, item in enumerate(section.get('Section__Items', []), start=1):
            clean  =  re.sub(r'<[^>]+>', '', str(item))                          # <-- Markdown twin carries plain text
            lines.append(f'{index}. {clean}')
        lines.append('')

    legend_items  =  content.get('Legend__Items', [])
    if legend_items:
        lines.append('## Legend')
        lines.append('')
        for item in legend_items:
            lines.append(f'- {item.get("Legend__Label", "")}')
        lines.append('')

    flags  =  content.get('Review__Flags', [])
    if flags:
        lines.append('## Transcription review')
        lines.append('')
        lines.append('| Where | Transcribed as | Possible alternative | Confidence |')
        lines.append('| --- | --- | --- | --- |')
        for flag in flags:
            lines.append(f'| {flag.get("Flag__Location", "")} '
                         f'| {flag.get("Flag__Transcribed", "")} '
                         f'| {flag.get("Flag__Alternative", "")} '
                         f'| {flag.get("Flag__Confidence", "low")} |')
        lines.append('')

    lines.append('---')
    lines.append('')
    lines.append(f'Transcribed from `{source_file}` on {transcribed}. '
                 'Diagram redrawn in Mermaid from the original hand drawn sheet.')
    lines.append('')
    return '\n'.join(lines)
    # ------------------------------------------------------------


    # FUNCTION | Build The Vale Headed Index Page
    # ------------------------------------------------------------
def build_index(built_sheets, theme_css, logo_src, project_name):
    """Return an index page linking every document produced in this run."""
    entries  =  []
    for sheet in built_sheets:
        flag_count  =  sheet['Sheet__FlagCount']
        flag_note   =  f'{flag_count} to verify' if flag_count else ''
        entries.append(
            '            <li><a href="' + escape_html(sheet['Sheet__FileName']) + '">'
            f'<span class="index-list__page">Page {sheet["Sheet__Page"]:02d}</span>'
            f'<span>{escape_html(sheet["Sheet__Title"])}</span>'
            f'<span class="index-list__flags">{flag_note}</span></a></li>'
        )

    body  =  (
        '    <section class="doc-panel">\n'
        f'        <h1 class="doc-title">{escape_html(project_name)}</h1>\n'
        f'        <p class="doc-subtitle">{len(built_sheets)} transcribed sheet(s)</p>\n'
        '        <ul class="index-list">\n'
        + '\n'.join(entries) + '\n'
        '        </ul>\n'
        f'        <div class="doc-meta">Generated {datetime.date.today().strftime("%d-%b-%Y")}</div>\n'
        '    </section>'
    )

    document  =  HTML_TEMPLATE
    for token, value in {
        '__DOC_TITLE__'          : escape_html(project_name),
        '__HEADER_TITLE__'       : 'Diagram Index',
        '__DOC_SUBTITLE__'       : '',
        '__DOC_META__'           : '',
        '__DOC_SLUG__'           : build_slug(project_name),
        '__THEME_CSS__'          : theme_css,
        '__MERMAID_DEFINITION__' : '',
        '__MERMAID_LIBRARY__'    : '',
        '__LOGO_SRC__'           : logo_src,
        '__NOTES_SECTIONS__'     : '',
        '__LEGEND_SECTION__'     : '',
        '__SOURCE_SCAN__'        : '',
        '__REVIEW_FLAGS__'       : ''
    }.items():
        document  =  document.replace(token, value)

    marker  =  '<main class="doc-shell">'
    head, _, tail  =  document.partition('</main>')
    head  =  head[:head.index(marker) + len(marker)]
    return f'{head}\n\n{body}\n\n</main>{tail}'
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Pipeline Runner
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Determine The Project Root From A Transcription File
    # ------------------------------------------------------------
def resolve_project_root(content_path, explicit_root):
    """Return the project root, walking out of any NN__ working folder."""
    if explicit_root:
        return os.path.abspath(explicit_root)

    content_dir  =  os.path.dirname(os.path.abspath(content_path))
    folder_name  =  os.path.basename(content_dir)
    if re.match(r'^\d{2}__', folder_name):
        return os.path.dirname(content_dir)                                      # <-- Step out of 04__Output__Mermaid and friends
    return content_dir
    # ------------------------------------------------------------


    # FUNCTION | Build Every Requested Document
    # ------------------------------------------------------------
def run_builder(options):
    """Load transcriptions, build documents and write the index when needed."""
    content_paths  =  []
    if os.path.isdir(options.content):
        for entry in sorted(os.listdir(options.content)):
            if entry.lower().endswith('.json'):
                content_paths.append(os.path.join(options.content, entry))
    else:
        content_paths.append(options.content)

    if not content_paths:
        print(f'  ERROR: No transcription JSON found at {options.content}')
        sys.exit(1)

    project_root  =  resolve_project_root(content_paths[0], options.project_root)
    theme_path    =  resolve_theme_path(project_root, options.theme)
    theme_css     =  read_text_file(theme_path, 'Theme stylesheet')
    tokens        =  parse_theme_tokens(theme_css)
    mermaid_lib   =  read_text_file(MERMAID_VENDOR, 'Vendored Mermaid renderer')

    logo_src  =  encode_data_uri(find_repo_logo(), 'image/png') or LOGO_GITHUB_URL

    output_dir  =  options.out or os.path.join(project_root, OUTPUT_FOLDER_NAME)
    os.makedirs(output_dir, exist_ok=True)

    print(f'\nScanToMermaid - Document Builder')
    print(f'  Project  : {project_root}')
    print(f'  Theme    : {theme_path}')
    print(f'  Output   : {output_dir}\n')

    if not options.no_seed_theme:
        seed_project_theme(project_root)

    built_sheets  =  []
    for content_path in content_paths:
        with open(content_path, 'r', encoding='utf-8') as handle:
            content  =  json.load(handle)

        scan_uri  =  None
        scan_ref  =  content.get('Source__ProcessedImage')
        if scan_ref and not options.no_scan:
            scan_path  =  scan_ref if os.path.isabs(scan_ref) else \
                          os.path.join(project_root, '03__Processed__Image', scan_ref)
            scan_uri   =  encode_data_uri(scan_path, 'image/png')
            if scan_uri is None:
                print(f'  WARNING: Processed scan not found at {scan_path}')

        document   =  build_document(content, theme_css, mermaid_lib, logo_src, scan_uri, tokens)
        stem       =  os.path.splitext(os.path.basename(content_path))[0].replace('__Content', '')
        html_name  =  f'{stem}.html'
        with open(os.path.join(output_dir, html_name), 'w', encoding='utf-8') as handle:
            handle.write(document)

        markdown  =  build_markdown(content, tokens)
        with open(os.path.join(output_dir, f'{stem}.md'), 'w', encoding='utf-8') as handle:
            handle.write(markdown)

        mermaid_dir  =  os.path.join(project_root, MERMAID_FOLDER)
        os.makedirs(mermaid_dir, exist_ok=True)
        definition  =  compose_mermaid_definition(content.get('Diagram__MermaidDefinition', ''), tokens)
        with open(os.path.join(mermaid_dir, f'{stem}.mmd'), 'w', encoding='utf-8') as handle:
            handle.write(definition)

        flag_count  =  len(content.get('Review__Flags', []))
        built_sheets.append({
            'Sheet__FileName'  : html_name,
            'Sheet__Title'     : content.get('Document__Title', stem),
            'Sheet__Page'      : content.get('Document__SourcePage', 1),
            'Sheet__FlagCount' : flag_count
        })
        flag_note  =  f'  ({flag_count} flagged)' if flag_count else ''
        print(f'  Built    : {html_name}{flag_note}')

    if len(built_sheets) > 1:
        project_name  =  os.path.basename(project_root.rstrip(os.sep))
        index_html    =  build_index(built_sheets, theme_css, logo_src, project_name)
        with open(os.path.join(output_dir, INDEX_FILENAME), 'w', encoding='utf-8') as handle:
            handle.write(index_html)
        print(f'  Built    : {INDEX_FILENAME}')

    print(f'\n  Done. {len(built_sheets)} document(s) written.\n')
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Command Line Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Parse Arguments and Start the Builder
    # ------------------------------------------------------------
def main():
    """Parse command line options and build the branded documents."""
    parser  =  argparse.ArgumentParser(
        description='Bake a transcribed sheet into a self-contained Vale branded document.')
    parser.add_argument('content',
                        help='Transcription JSON file, or a folder of them')
    parser.add_argument('--out', default=None,
                        help='Output folder (default: 05__Output__Document in the project)')
    parser.add_argument('--project-root', default=None,
                        help='Override the detected project root')
    parser.add_argument('--theme', default=None,
                        help='Explicit theme stylesheet path')
    parser.add_argument('--no-seed-theme', action='store_true',
                        help='Do not copy the default theme into the project')
    parser.add_argument('--no-scan', action='store_true',
                        help='Omit the collapsible original scan from the document')

    options  =  parser.parse_args()
    run_builder(options)
    # ------------------------------------------------------------


if __name__ == '__main__':
    main()

# endregion -------------------------------------------------------------------
