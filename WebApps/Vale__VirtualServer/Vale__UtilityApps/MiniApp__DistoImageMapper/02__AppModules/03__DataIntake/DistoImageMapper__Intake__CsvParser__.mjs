/* =============================================================================
   DISTO IMAGE MAPPER - DATA INTAKE | CSV LOG PARSER
   =============================================================================

   FILE       : DistoImageMapper__Intake__CsvParser__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Intake - CsvParser
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Reads the DISTO's shot log: one row per shot, in survey order
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Columns: POINT, Date, Time, File name, Horizontal angle, Unit, Vertical angle,
     Unit, Distance, Unit, X, Y, Z. Three columns share the name Unit, so each
     unit is read by its place straight after its value.
   - The log is the only file with the shot's angles and distance, which is what
     locates the tripod itself.
   - Every length comes back in millimetres and every angle in degrees, whatever
     the DISTO was set to. A comma or semicolon delimiter both read.

   ============================================================================= */

// -----------------------------------------------------------------------------
// REGION | Text Splitting
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Unit Conversion
    // ------------------------------------------------------------
    const LENGTH_TO_MM  =  { mm : 1, cm : 10, m : 1000, in : 25.4, ft : 304.8, yd : 914.4 };
    const ANGLE_TO_DEG  =  { deg : 1, gon : 0.9, grad : 0.9, rad : 180 / Math.PI };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Split One Row, Honouring Quotes
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__CsvParser__SplitRow(row, delimiter) {
        const cells  =  [];
        let cell     =  '';
        let quoted   =  false;

        for (let i = 0; i < row.length; i++) {
            const character  =  row[i];
            if (character === '"') {
                if (quoted && row[i + 1] === '"') { cell += '"'; i++; }      // <-- A doubled quote is a literal quote
                else quoted  =  !quoted;
            } else if (character === delimiter && !quoted) {
                cells.push(cell.trim());
                cell  =  '';
            } else {
                cell += character;
            }
        }
        cells.push(cell.trim());
        return cells;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Number, Allowing a Decimal Comma
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__CsvParser__Number(text, delimiter) {
        const cleaned  =  delimiter === ',' ? text : String(text).replace(',', '.');
        const value    =  parseFloat(cleaned);
        return Number.isFinite(value) ? value : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The File Name Without Its Tripod Path
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__CsvParser__BaseName(path) {
        return String(path || '').split(/[\\/]/).pop().trim();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Log Parsing
// -----------------------------------------------------------------------------

    // FUNCTION | Parse the Log's Text
    // ------------------------------------------------------------
    export function DistoImageMapper__Intake__CsvParser__Parse(text) {
        const lines  =  text.split(/\r\n|\n|\r/).filter(line => line.trim().length);
        if (lines.length < 2) return { Rows : [], LengthUnit : 'mm' };

        const headerLine  =  lines[0];
        const delimiter   =  [',', ';', '\t'].reduce((best, candidate) =>        // <-- Whichever splits the header most
            headerLine.split(candidate).length > headerLine.split(best).length ? candidate : best, ',');

        const header  =  DistoImageMapper__Intake__CsvParser__SplitRow(headerLine, delimiter).map(name => name.toLowerCase());
        const column  =  name => header.indexOf(name);

        const columns  =  {
            Point      :  column('point'),
            Date       :  column('date'),
            Time       :  column('time'),
            File       :  Math.max(column('file name'), column('filename')),
            Horizontal :  column('horizontal angle'),
            Vertical   :  column('vertical angle'),
            Distance   :  column('distance'),
            X          :  column('x'),
            Y          :  column('y'),
            Z          :  column('z')
        };

        const number  =  (cells, index) => (index >= 0 ? DistoImageMapper__Intake__CsvParser__Number(cells[index], delimiter) : null);
        const unitOf  =  (cells, index) => (index >= 0 && header[index + 1] === 'unit' ? String(cells[index + 1] || '').toLowerCase() : '');

        const rows      =  [];
        let lengthUnit  =  'mm';

        for (const line of lines.slice(1)) {
            const cells  =  DistoImageMapper__Intake__CsvParser__SplitRow(line, delimiter);
            if (cells.length < 2) continue;

            const distanceUnit  =  unitOf(cells, columns.Distance) || 'mm';
            const lengthFactor  =  LENGTH_TO_MM[distanceUnit] || 1;              // <-- The log's X, Y and Z share the distance's unit
            lengthUnit          =  distanceUnit;

            const angleFactor   =  name => ANGLE_TO_DEG[unitOf(cells, columns[name]) || 'deg'] || null;
            const scaled        =  (value, factor) => (value === null || factor === null ? null : value * factor);

            const x  =  number(cells, columns.X);
            const y  =  number(cells, columns.Y);
            const z  =  number(cells, columns.Z);

            const imageName  =  columns.File >= 0 ? DistoImageMapper__Intake__CsvParser__BaseName(cells[columns.File]) : '';

            rows.push({
                Number      :  number(cells, columns.Point),
                DateText    :  columns.Date >= 0 ? cells[columns.Date] : '',
                TimeText    :  columns.Time >= 0 ? cells[columns.Time] : '',
                ImageName   :  imageName,
                ImageKey    :  imageName.toLowerCase(),
                HzDegrees   :  scaled(number(cells, columns.Horizontal), angleFactor('Horizontal')),
                VDegrees    :  scaled(number(cells, columns.Vertical), angleFactor('Vertical')),
                DistanceMm  :  scaled(number(cells, columns.Distance), lengthFactor),
                LengthFactor:  lengthFactor,
                PositionMm  :  x === null || y === null || z === null ? null : { X : x * lengthFactor, Y : y * lengthFactor, Z : z * lengthFactor }
            });
        }

        return { Rows : rows, LengthUnit : lengthUnit };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
