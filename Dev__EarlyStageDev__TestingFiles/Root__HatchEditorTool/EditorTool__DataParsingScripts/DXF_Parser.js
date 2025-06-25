// =============================================================================
// VALEDESIGNSUITE - DXF PARSER MODULE
// =============================================================================
//
// FILE       : DXF_Parser.js
// NAMESPACE  : DXFParser
// MODULE     : DXFParser
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Parse DXF files and extract line geometry for hatch tools
// CREATED    : 2025
//
// DESCRIPTION:
// - Parses DXF files (ASCII) and extracts LINE entities as line segments.
// - Returns array of { x1, y1, x2, y2 } for each line.
// - Designed for use in Vale Hatch Editor Tool UI.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 27-Jun-2025 - Version 1.0.0
// - Initial stable version for DXF line extraction.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | DXF Parser - Line Entity Extraction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse DXF Text and Extract LINE Entities
    // ------------------------------------------------------------
    function parseDXFLines(dxfText) {
        const lines = dxfText.split(/\r?\n/);                          // <-- Split DXF into lines
        const segments = [];                                            // <-- Store extracted line segments
        let i = 0;
        while (i < lines.length) {
            if (lines[i].trim() === 'LINE') {                           // <-- Found LINE entity
                let x1 = null, y1 = null, x2 = null, y2 = null;
                // Parse next ~20 lines for coordinates
                for (let j = i + 1; j < i + 20 && j < lines.length; j++) {
                    if (lines[j].trim() === '10') x1 = parseFloat(lines[j + 1]);
                    if (lines[j].trim() === '20') y1 = parseFloat(lines[j + 1]);
                    if (lines[j].trim() === '11') x2 = parseFloat(lines[j + 1]);
                    if (lines[j].trim() === '21') y2 = parseFloat(lines[j + 1]);
                    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) break;
                }
                if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                    segments.push({ x1, y1, x2, y2 });                  // <-- Store segment
                }
            }
            i++;
        }
        return segments;                                                // <-- Return array of line segments
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | DXF Parser - Module Export
// -----------------------------------------------------------------------------

    // FUNCTION | Export DXF Line Parser
    // ------------------------------------------------------------
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { parseDXFLines };
    } else {
        window.DXFParser = { parseDXFLines };
    }
    // ------------------------------------------------------------

// endregion ---------------------------------------------------- 