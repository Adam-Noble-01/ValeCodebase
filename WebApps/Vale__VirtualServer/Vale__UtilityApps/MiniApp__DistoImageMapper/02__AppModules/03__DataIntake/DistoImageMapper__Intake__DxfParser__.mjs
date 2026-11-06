/* =============================================================================
   DISTO IMAGE MAPPER - DATA INTAKE | DXF PARSER
   =============================================================================

   FILE       : DistoImageMapper__Intake__DxfParser__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Intake - DxfParser
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Reads an ASCII DXF into points, line segments and text labels
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - The DISTO writes AC1009 (R12): POINT, LINE and TEXT on the layers
     LEICA_DISTO_POINT_ENTITY, LEICA_DISTO_2D or LEICA_DISTO_3D, and LEICA_DISTO_ID. Each TEXT
     sits on its point and holds that shot's photo name, which is the key that
     ties the three CAD files, the log and the photos together.
   - POLYLINE, LWPOLYLINE and 3DFACE are read too, so a drawing tidied in CAD
     still opens. Anything else is counted and left out, never an error.
   - Only the ENTITIES section is read. Coordinates come back in the file's units.

   ---------------------------------------------------------------------------

   THE FORMAT:
   A DXF is pairs of lines: a group code, then its value. Code 0 starts a new
   entity, code 8 is its layer, 10/20/30 and 11/21/31 are coordinates, code 1 is
   a text string.

   ============================================================================= */

// -----------------------------------------------------------------------------
// REGION | Group Code Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Split the File Into Group Code Pairs
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__DxfParser__Pairs(text) {
        const lines  =  text.split(/\r\n|\n|\r/);
        const pairs  =  [];

        for (let i = 0; i + 1 < lines.length; i += 2) {
            const code  =  parseInt(lines[i], 10);
            if (Number.isNaN(code)) continue;                                // <-- A stray line never stops the read
            pairs.push([code, lines[i + 1].trim()]);
        }
        return pairs;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Gather the ENTITIES Section Into Entity Records
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__DxfParser__Entities(pairs) {
        const entities  =  [];
        let inEntities  =  false;
        let expectName  =  false;
        let current     =  null;

        for (const [code, value] of pairs) {
            if (code === 0) {
                if (current) entities.push(current);
                current  =  null;

                if (value === 'SECTION') { expectName = true;  continue; }
                if (value === 'ENDSEC')  { inEntities = false; continue; }
                if (inEntities) current  =  { Type : value, Layer : '', Codes : [] };
                continue;
            }

            if (expectName && code === 2) {
                inEntities  =  value === 'ENTITIES';
                expectName  =  false;
                continue;
            }

            if (current) {
                if (code === 8) current.Layer  =  value;
                current.Codes.push([code, value]);
            }
        }

        if (current) entities.push(current);
        return entities;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | First Numeric Value of a Group Code
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__DxfParser__Number(entity, code, fallback = 0) {
        const found  =  entity.Codes.find(pair => pair[0] === code);
        if (!found) return fallback;
        const value  =  parseFloat(found[1]);
        return Number.isFinite(value) ? value : fallback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Entity Conversion
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Add a Run of Vertices as Line Segments
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__DxfParser__AddRun(segments, vertices, isClosed) {
        for (let i = 0; i + 1 < vertices.length; i++) {
            segments.push({ A : vertices[i], B : vertices[i + 1] });
        }
        if (isClosed && vertices.length > 2) {
            segments.push({ A : vertices[vertices.length - 1], B : vertices[0] });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Vertices of a Lightweight Polyline
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__DxfParser__LwVertices(entity) {
        const elevation  =  DistoImageMapper__Intake__DxfParser__Number(entity, 38, 0);
        const vertices   =  [];

        for (const [code, value] of entity.Codes) {
            if (code === 10) vertices.push({ X : parseFloat(value), Y : 0, Z : elevation });
            if (code === 20 && vertices.length) vertices[vertices.length - 1].Y  =  parseFloat(value);
        }
        return vertices;
    }
    // ------------------------------------------------------------


    // FUNCTION | Parse a DXF File's Text
    // ------------------------------------------------------------
    export function DistoImageMapper__Intake__DxfParser__Parse(text) {
        const entities  =  DistoImageMapper__Intake__DxfParser__Entities(DistoImageMapper__Intake__DxfParser__Pairs(text));
        const number    =  DistoImageMapper__Intake__DxfParser__Number;

        const result  =  { Points : [], Segments : [], Texts : [], SkippedCount : 0, EntityCount : entities.length };
        let openRun   =  null;                                               // <-- The POLYLINE waiting for its VERTEX records

        for (const entity of entities) {
            switch (entity.Type) {

                case 'POINT':
                    result.Points.push({ X : number(entity, 10), Y : number(entity, 20), Z : number(entity, 30) });
                    break;

                case 'LINE':
                    result.Segments.push({
                        A : { X : number(entity, 10), Y : number(entity, 20), Z : number(entity, 30) },
                        B : { X : number(entity, 11), Y : number(entity, 21), Z : number(entity, 31) }
                    });
                    break;

                case 'TEXT':
                case 'MTEXT': {
                    const content  =  entity.Codes.find(pair => pair[0] === 1);
                    if (content) {
                        result.Texts.push({ Text : content[1], X : number(entity, 10), Y : number(entity, 20), Z : number(entity, 30) });
                    }
                    break;
                }

                case 'LWPOLYLINE':
                    DistoImageMapper__Intake__DxfParser__AddRun(
                        result.Segments,
                        DistoImageMapper__Intake__DxfParser__LwVertices(entity),
                        (number(entity, 70) & 1) === 1                       // <-- Bit 1 of the flags closes the run
                    );
                    break;

                case 'POLYLINE':
                    openRun  =  { Vertices : [], IsClosed : (number(entity, 70) & 1) === 1 };
                    break;

                case 'VERTEX':
                    if (openRun) openRun.Vertices.push({ X : number(entity, 10), Y : number(entity, 20), Z : number(entity, 30) });
                    break;

                case 'SEQEND':
                    if (openRun) DistoImageMapper__Intake__DxfParser__AddRun(result.Segments, openRun.Vertices, openRun.IsClosed);
                    openRun  =  null;
                    break;

                case '3DFACE':
                    DistoImageMapper__Intake__DxfParser__AddRun(result.Segments, [
                        { X : number(entity, 10), Y : number(entity, 20), Z : number(entity, 30) },
                        { X : number(entity, 11), Y : number(entity, 21), Z : number(entity, 31) },
                        { X : number(entity, 12), Y : number(entity, 22), Z : number(entity, 32) },
                        { X : number(entity, 13), Y : number(entity, 23), Z : number(entity, 33) }
                    ], true);
                    break;

                default:
                    result.SkippedCount++;                                   // <-- Not something a survey needs
            }
        }

        return result;
    }
    // ------------------------------------------------------------


    // FUNCTION | Points With Their Photo Names, in File Order
    // ------------------------------------------------------------
    // Each TEXT sits on its POINT, so the coordinates are the join. A queue per
    // position keeps two shots that landed on exactly one spot apart.
    export function DistoImageMapper__Intake__DxfParser__LabelledPoints(parsed) {
        const coordinateKey  =  item => `${item.X.toFixed(3)}|${item.Y.toFixed(3)}|${item.Z.toFixed(3)}`;

        const labelsAt  =  new Map();
        for (const text of parsed.Texts) {
            const key  =  coordinateKey(text);
            if (!labelsAt.has(key)) labelsAt.set(key, []);
            labelsAt.get(key).push(text.Text);
        }

        return parsed.Points.map(point => {
            const queue  =  labelsAt.get(coordinateKey(point));
            return { ...point, Label : queue && queue.length ? queue.shift() : null };
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
