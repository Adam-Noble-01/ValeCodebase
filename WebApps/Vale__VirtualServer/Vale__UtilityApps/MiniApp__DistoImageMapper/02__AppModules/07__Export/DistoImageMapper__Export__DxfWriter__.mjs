/* =============================================================================
   DISTO IMAGE MAPPER - EXPORT | DXF WRITER
   =============================================================================

   FILE       : DistoImageMapper__Export__DxfWriter__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Export - DxfWriter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Write an AutoCAD R2000 (AC1015) ASCII DXF: layers, points, lines,
                polylines, text and linked raster images
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - R2000, because the IMAGE entity needs it (R12 has none) and every CAD program
     since 2000 reads it. The structure follows the R2000 files ezdxf (the Python
     DXF library) writes, which AutoCAD opens: the four image classes, the nine
     tables, both block records with their layouts, the plot style placeholder,
     the raster variables and the image dictionary.
   - PHOTOS ARE LINKED, NEVER EMBEDDED. A DXF cannot hold a picture: an IMAGEDEF
     only names its file (ezdxf: "The raster image is NOT embedded in the DXF
     file!"), and AutoCAD's only way to carry one inside is an OLE object, which is
     fragile and not read by most other programs. Each IMAGEDEF names the bare
     file name, so AutoCAD finds the photo in the drawing's own folder: the second
     place it looks, after the saved path (Autodesk help, About Changing the Path
     to Raster Images).
   - Text outside printable ASCII is written as \U+XXXX, as AutoCAD writes it, so
     the file stays plain ASCII under its ANSI_1252 code page.
   - HANDLES: the fixed objects take 1 to 3F, as ezdxf numbers them; everything
     added takes 40 up, and $HANDSEED is the next free one.
   - No app imports: Node can run it for the checks against ezdxf, the ODA File
     Converter and DWG TrueView.

   ============================================================================= */


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Fixed Objects' Handles
    // ------------------------------------------------------------
    const H  =  {
        LayerTable      : '1',   LtypeTable      : '2',   AppIdTable    : '3',   DimStyleTable : '4',
        StyleTable      : '5',   UcsTable        : '6',   ViewTable     : '7',   VportTable    : '8',
        BlockRecords    : '9',   RootDict        : 'A',   GroupDict     : 'C',   LayoutDict    : 'D',
        MlineStyleDict  : '10',  PlotSettingDict : '11',  PlotStyleDict : '12',  PlotStyleNone : '13',
        ModelRecord     : '17',  ModelBlock      : '18',  ModelEndBlk   : '19',  ModelLayout   : '1A',
        PaperRecord     : '1B',  PaperBlock      : '1C',  PaperEndBlk   : '1D',  PaperLayout   : '1E',
        MlineStandard   : '22',  VportActive     : '23',  LtByBlock     : '24',  LtByLayer     : '25',
        LtContinuous    : '26',  Layer0          : '27',  StyleStandard : '29',  AppIdAcad     : '2A',
        DimStandard     : '2B',  RasterVars      : '30',  ImageDict     : '31'
    };
    const FIRST_FREE_HANDLE  =  0x40;
    const EOL                =  '\r\n';
    const VIEW_ASPECT        =  1.6;                                         // <-- The opening view's shape; any viewer re-zooms
    const BAD_NAME_CHARS     =  /[<>/\\":;?*|=,'`\u0000-\u001f]/g;           // <-- Not allowed in AutoCAD symbol names
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Dimension Style Every R2000 Drawing Carries (ezdxf's Standard)
    // ------------------------------------------------------------
    const DIMSTYLE_STANDARD  =  [
        [40, '1.0'], [41, '2.5'], [42, '0.625'], [43, '3.75'], [44, '1.25'], [45, '0.0'], [46, '0.0'], [47, '0.0'], [48, '0.0'],
        [140, '2.5'], [141, '2.5'], [142, '0.0'], [143, '0.03937007874'], [144, '1.0'], [145, '0.0'], [146, '1.0'], [147, '0.625'],
        [148, '0.0'], [71, '0'], [72, '0'], [73, '0'], [74, '0'], [75, '0'], [76, '0'], [77, '1'], [78, '8'], [79, '3'], [170, '0'],
        [171, '3'], [172, '1'], [173, '0'], [174, '0'], [175, '0'], [176, '0'], [177, '0'], [178, '0'], [179, '2'], [271, '2'],
        [272, '2'], [273, '2'], [274, '3'], [275, '0'], [276, '0'], [277, '2'], [278, '44'], [279, '0'], [280, '0'], [281, '0'],
        [282, '0'], [283, '0'], [284, '8'], [285, '0'], [286, '0'], [288, '0'], [289, '3'], [371, '-2'], [372, '-2']
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | One Layout's Plot Settings and Frame (ezdxf's R2000 layouts)
    // ------------------------------------------------------------
    function DistoImageMapper__Export__DxfWriter__LayoutPairs(handle, name, plotFlags, tabOrder, blockRecord) {
        return [
            [0, 'LAYOUT'], [5, handle], [330, H.LayoutDict], [100, 'AcDbPlotSettings'], [1, ''], [4, 'A3'], [6, ''],
            [40, '7.5'], [41, '20.0'], [42, '7.5'], [43, '20.0'], [44, '420.0'], [45, '297.0'], [46, '0.0'], [47, '0.0'], [48, '0.0'],
            [49, '0.0'], [140, '0.0'], [141, '0.0'], [142, '1.0'], [143, '1.0'], [70, String(plotFlags)], [72, '1'], [73, '0'],
            [74, '5'], [7, ''], [75, '16'], [76, '0'], [77, '2'], [78, '300'], [147, '1.0'], [148, '0.0'], [149, '0.0'],
            [100, 'AcDbLayout'], [1, name], [70, '1'], [71, String(tabOrder)], [10, '0.0'], [20, '0.0'], [11, '420.0'], [21, '297.0'],
            [12, '0.0'], [22, '0.0'], [32, '0.0'], [14, '1e+20'], [24, '1e+20'], [34, '1e+20'], [15, '-1e+20'], [25, '-1e+20'],
            [35, '-1e+20'], [146, '0.0'], [13, '0.0'], [23, '0.0'], [33, '0.0'], [16, '1.0'], [26, '0.0'], [36, '0.0'], [17, '0.0'],
            [27, '1.0'], [37, '0.0'], [76, '1'], [330, blockRecord]
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Values
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Real as DXF Writes It: Up to Six Decimals, Never an Exponent, Never "-0"
    // ------------------------------------------------------------
    function DistoImageMapper__Export__DxfWriter__Num(value) {
        const number  =  Number(value);
        if (!Number.isFinite(number)) return '0.0';
        const text  =  number.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0');
        return /^-0(\.0+)?$/.test(text) ? '0.0' : text;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Text as AutoCAD Writes It: One Line, Printable ASCII, the Rest as \U+XXXX
    // ------------------------------------------------------------
    export function DistoImageMapper__Export__DxfWriter__Text(text) {
        return Array.from(String(text ?? '').replace(/[\r\n\t]+/g, ' ')).map(character => {
            const code  =  character.codePointAt(0);
            if (code >= 0x20 && code <= 0x7e) return character;
            return code <= 0xffff ? `\\U+${code.toString(16).toUpperCase().padStart(4, '0')}` : '?';
        }).join('');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Name AutoCAD Accepts for a Layer or an Image
    // ------------------------------------------------------------
    export function DistoImageMapper__Export__DxfWriter__SymbolName(name) {
        const cleaned  =  DistoImageMapper__Export__DxfWriter__Text(String(name ?? '').replace(BAD_NAME_CHARS, '_')).replace(/\\U\+[0-9A-F]{4}/g, '_').trim();
        return cleaned.slice(0, 200) || 'Unnamed';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Group Code and Value Pairs as DXF Lines
    // ------------------------------------------------------------
    function DistoImageMapper__Export__DxfWriter__Lines(pairs) {
        let out  =  '';
        for (const [code, value] of pairs) out += `${String(code).padStart(3, ' ')}${EOL}${value}${EOL}`;
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Writer
// -----------------------------------------------------------------------------

    // FUNCTION | Start a Drawing
    // ------------------------------------------------------------
    // const dxf = DistoImageMapper__Export__DxfWriter__Create();
    // dxf.Layer('DISTO_POINTS', 1); dxf.Point('DISTO_POINTS', [x, y, z]); ...
    // const text = dxf.ToText({ PointSizeMm : 100 });
    // Points are [x, y, z] in drawing units (millimetres here).
    // ------------------------------------------------------------
    export function DistoImageMapper__Export__DxfWriter__Create() {
        const N         =  DistoImageMapper__Export__DxfWriter__Num;
        const T         =  DistoImageMapper__Export__DxfWriter__Text;
        let   nextFree  =  FIRST_FREE_HANDLE;
        const layers    =  [];                                               // <-- { Name, Colour, Handle }
        const entities  =  [];                                               // <-- Each a list of pairs, in drawing order
        const imageDefs =  [];                                               // <-- { Name, FileName, Width, Height, Handle, Reactors [{ Handle, Image }] }
        const defsByFile=  new Map();
        const usedImageNames  =  new Set();
        const low       =  [Infinity, Infinity, Infinity];
        const high      =  [-Infinity, -Infinity, -Infinity];

        const newHandle  =  () => (nextFree++).toString(16).toUpperCase();
        const extend     =  point => {
            for (let i = 0; i < 3; i++) {
                const value  =  Number(point[i]) || 0;
                low[i]   =  Math.min(low[i], value);
                high[i]  =  Math.max(high[i], value);
            }
        };
        const header     =  (type, layer) => [[0, type], [5, newHandle()], [330, H.ModelRecord], [100, 'AcDbEntity'], [8, layer]];
        const xyz        =  (codeX, point) => [[codeX, N(point[0])], [codeX + 10, N(point[1])], [codeX + 20, N(point[2] || 0)]];

        const writer  =  {

            // A layer and its colour (AutoCAD Color Index). Returns its name as written.
            Layer(name, colour) {
                const clean  =  DistoImageMapper__Export__DxfWriter__SymbolName(name);
                if (!layers.some(layer => layer.Name === clean)) layers.push({ Name : clean, Colour : Math.max(1, Math.min(255, Math.round(colour) || 7)), Handle : newHandle() });
                return clean;
            },

            // A point, drawn as the header's $PDMODE sets.
            Point(layer, point) {
                entities.push([...header('POINT', layer), [100, 'AcDbPoint'], ...xyz(10, point)]);
                extend(point);
            },

            // A straight line between two points.
            Line(layer, a, b) {
                entities.push([...header('LINE', layer), [100, 'AcDbLine'], ...xyz(10, a), ...xyz(11, b)]);
                extend(a);
                extend(b);
            },

            // A flat polyline on the XY plane (z of the first point), closed or not.
            Polyline(layer, points, isClosed) {
                if (points.length < 2) return;
                const pairs  =  [...header('LWPOLYLINE', layer), [100, 'AcDbPolyline'], [90, String(points.length)], [70, isClosed ? '1' : '0'], [43, '0.0']];
                const elevation  =  Number(points[0][2]) || 0;
                if (elevation) pairs.push([38, N(elevation)]);
                for (const point of points) {
                    pairs.push([10, N(point[0])], [20, N(point[1])]);
                    extend([point[0], point[1], elevation]);
                }
                entities.push(pairs);
            },

            // Single-line text in the Standard style. options: { Align : 'Left' | 'Centre', Rotation (degrees) }
            Text(layer, point, height, text, options = {}) {
                const centred  =  options.Align === 'Centre';
                const pairs    =  [...header('TEXT', layer), [100, 'AcDbText'], ...xyz(10, point), [40, N(height)], [1, T(text)]];
                if (options.Rotation) pairs.push([50, N(options.Rotation)]);
                pairs.push([7, 'Standard']);
                if (centred) pairs.push([72, '1'], ...xyz(11, point));
                pairs.push([100, 'AcDbText']);
                if (centred) pairs.push([73, '2']);                          // <-- Middle centre
                entities.push(pairs);
                extend(point);
            },

            // A linked raster image. insertion: its lower-left corner. uPixel and vPixel: one pixel's
            // vectors along the picture's bottom and up its left side, so they set size and facing.
            Image(layer, fileName, widthPx, heightPx, insertion, uPixel, vPixel) {
                let definition  =  defsByFile.get(fileName);
                if (!definition) {
                    const base  =  DistoImageMapper__Export__DxfWriter__SymbolName(String(fileName).replace(/\.[^.]+$/, ''));
                    let name    =  base;
                    for (let n = 2; usedImageNames.has(name.toUpperCase()); n++) name  =  `${base}_${n}`;
                    usedImageNames.add(name.toUpperCase());
                    definition  =  { Name : name, FileName : fileName, Width : widthPx, Height : heightPx, Handle : newHandle(), Reactors : [] };
                    defsByFile.set(fileName, definition);
                    imageDefs.push(definition);
                }
                const entityHandle   =  newHandle();
                const reactorHandle  =  newHandle();
                definition.Reactors.push({ Handle : reactorHandle, Image : entityHandle });
                entities.push([
                    [0, 'IMAGE'], [5, entityHandle], [330, H.ModelRecord], [100, 'AcDbEntity'], [8, layer], [100, 'AcDbRasterImage'], [90, '0'],
                    ...xyz(10, insertion), ...xyz(11, uPixel), ...xyz(12, vPixel), [13, N(widthPx)], [23, N(heightPx)],
                    [340, definition.Handle], [70, '3'], [280, '0'], [281, '50'], [282, '50'], [283, '0'], [360, reactorHandle],
                    [71, '1'], [91, '2'], [14, '-0.5'], [24, '-0.5'], [14, N(widthPx - 0.5)], [24, N(heightPx - 0.5)]
                ]);
                for (const [u, v] of [[0, 0], [widthPx, 0], [widthPx, heightPx], [0, heightPx]]) {
                    extend([0, 1, 2].map(i => insertion[i] + uPixel[i] * u + vPixel[i] * v));
                }
            },

            // How many entities so far.
            Count() {
                return entities.length;
            },

            // The whole file. options: { PointMode ($PDMODE), PointSizeMm ($PDSIZE) }
            ToText(options = {}) {
                const hasExtent  =  Number.isFinite(low[0]);
                const min  =  hasExtent ? low : [0, 0, 0];
                const max  =  hasExtent ? high : [1000, 1000, 0];
                const width   =  Math.max(max[0] - min[0], 1);
                const height  =  Math.max(max[1] - min[1], 1);
                const viewHeight  =  Math.max(height, width / VIEW_ASPECT) * 1.08;

                const allLayers  =  [{ Name : '0', Colour : 7, Handle : H.Layer0 }, ...layers];
                const layerPairs =  allLayers.flatMap(layer => [
                    [0, 'LAYER'], [5, layer.Handle], [330, H.LayerTable], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbLayerTableRecord'],
                    [2, layer.Name], [70, '0'], [62, String(layer.Colour)], [6, 'Continuous'], [370, '-3'], [390, H.PlotStyleNone]
                ]);
                const ltype      =  (handle, name, description) => [
                    [0, 'LTYPE'], [5, handle], [330, H.LtypeTable], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbLinetypeTableRecord'],
                    [2, name], [70, '0'], [3, description], [72, '65'], [73, '0'], [40, '0.0']
                ];
                const table      =  (name, handle, count, extra = []) => [[0, 'TABLE'], [2, name], [5, handle], [330, '0'], [100, 'AcDbSymbolTable'], [70, String(count)], ...extra];

                const entityText  =  entities.map(DistoImageMapper__Export__DxfWriter__Lines).join('');
                const imageDict   =  imageDefs.flatMap(definition => [[3, definition.Name], [350, definition.Handle]]);
                const imagePairs  =  imageDefs.flatMap(definition => [
                    [0, 'IMAGEDEF'], [5, definition.Handle], [102, '{ACAD_REACTORS'], [330, H.ImageDict],
                    ...definition.Reactors.map(reactor => [330, reactor.Handle]), [102, '}'], [330, H.ImageDict],
                    [100, 'AcDbRasterImageDef'], [90, '0'], [1, T(definition.FileName)], [10, N(definition.Width)], [20, N(definition.Height)],
                    [11, '1.0'], [21, '1.0'], [280, '1'], [281, '0'],
                    ...definition.Reactors.flatMap(reactor => [
                        [0, 'IMAGEDEF_REACTOR'], [5, reactor.Handle], [330, reactor.Image], [100, 'AcDbRasterImageDefReactor'], [90, '2'], [330, reactor.Image]
                    ])
                ]);

                const body  =  [
                    // CLASSES: what an R2000 reader must know before it meets the objects below
                    [0, 'SECTION'], [2, 'CLASSES'],
                    ...[
                        ['ACDBDICTIONARYWDFLT', 'AcDbDictionaryWithDefault', 'ObjectDBX Classes', '0', '0'],
                        ['ACDBPLACEHOLDER', 'AcDbPlaceHolder', 'ObjectDBX Classes', '0', '0'],
                        ['LAYOUT', 'AcDbLayout', 'ObjectDBX Classes', '0', '0'],
                        ['RASTERVARIABLES', 'AcDbRasterVariables', 'ISM', '0', '0'],
                        ['IMAGE', 'AcDbRasterImage', 'ISM', '2175', '1'],
                        ['IMAGEDEF', 'AcDbRasterImageDef', 'ISM', '0', '0'],
                        ['IMAGEDEF_REACTOR', 'AcDbRasterImageDefReactor', 'ISM', '1', '0']
                    ].flatMap(([name, cpp, app, flags, isEntity]) => [[0, 'CLASS'], [1, name], [2, cpp], [3, app], [90, flags], [280, '0'], [281, isEntity]]),
                    [0, 'ENDSEC'],

                    // TABLES
                    [0, 'SECTION'], [2, 'TABLES'],
                    ...table('VPORT', H.VportTable, 1),
                    [0, 'VPORT'], [5, H.VportActive], [330, H.VportTable], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbViewportTableRecord'],
                    [2, '*Active'], [70, '0'], [10, '0.0'], [20, '0.0'], [11, '1.0'], [21, '1.0'],
                    [12, N((min[0] + max[0]) / 2)], [22, N((min[1] + max[1]) / 2)], [13, '0.0'], [23, '0.0'], [14, '10.0'], [24, '10.0'],
                    [15, '10.0'], [25, '10.0'], [16, '0.0'], [26, '0.0'], [36, '1.0'], [17, '0.0'], [27, '0.0'], [37, '0.0'],
                    [40, N(viewHeight)], [41, N(VIEW_ASPECT)], [42, '50.0'], [43, '0.0'], [44, '0.0'], [50, '0.0'], [51, '0.0'],
                    [71, '0'], [72, '1000'], [73, '1'], [74, '3'], [75, '0'], [76, '0'], [77, '0'], [78, '0'], [281, '0'], [65, '0'], [146, '0.0'],
                    [0, 'ENDTAB'],
                    ...table('LTYPE', H.LtypeTable, 3),
                    ...ltype(H.LtByBlock, 'ByBlock', ''), ...ltype(H.LtByLayer, 'ByLayer', ''), ...ltype(H.LtContinuous, 'Continuous', 'Solid line'),
                    [0, 'ENDTAB'],
                    ...table('LAYER', H.LayerTable, allLayers.length), ...layerPairs, [0, 'ENDTAB'],
                    ...table('STYLE', H.StyleTable, 1),
                    [0, 'STYLE'], [5, H.StyleStandard], [330, H.StyleTable], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbTextStyleTableRecord'],
                    [2, 'Standard'], [70, '0'], [40, '0.0'], [41, '1.0'], [50, '0.0'], [71, '0'], [42, '2.5'], [3, 'txt'], [4, ''],
                    [0, 'ENDTAB'],
                    ...table('VIEW', H.ViewTable, 0), [0, 'ENDTAB'],
                    ...table('UCS', H.UcsTable, 0), [0, 'ENDTAB'],
                    ...table('APPID', H.AppIdTable, 1),
                    [0, 'APPID'], [5, H.AppIdAcad], [330, H.AppIdTable], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbRegAppTableRecord'], [2, 'ACAD'], [70, '0'],
                    [0, 'ENDTAB'],
                    ...table('DIMSTYLE', H.DimStyleTable, 1, [[100, 'AcDbDimStyleTable']]),
                    [0, 'DIMSTYLE'], [105, H.DimStandard], [330, H.DimStyleTable], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbDimStyleTableRecord'],
                    [2, 'Standard'], [70, '0'], [3, ''], [4, ''], ...DIMSTYLE_STANDARD,
                    [0, 'ENDTAB'],
                    ...table('BLOCK_RECORD', H.BlockRecords, 2),
                    [0, 'BLOCK_RECORD'], [5, H.ModelRecord], [330, H.BlockRecords], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbBlockTableRecord'], [2, '*Model_Space'], [340, H.ModelLayout],
                    [0, 'BLOCK_RECORD'], [5, H.PaperRecord], [330, H.BlockRecords], [100, 'AcDbSymbolTableRecord'], [100, 'AcDbBlockTableRecord'], [2, '*Paper_Space'], [340, H.PaperLayout],
                    [0, 'ENDTAB'],
                    [0, 'ENDSEC'],

                    // BLOCKS: the two spaces
                    [0, 'SECTION'], [2, 'BLOCKS'],
                    [0, 'BLOCK'], [5, H.ModelBlock], [330, H.ModelRecord], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbBlockBegin'], [2, '*Model_Space'],
                    [70, '0'], [10, '0.0'], [20, '0.0'], [30, '0.0'], [3, '*Model_Space'], [1, ''],
                    [0, 'ENDBLK'], [5, H.ModelEndBlk], [330, H.ModelRecord], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbBlockEnd'],
                    [0, 'BLOCK'], [5, H.PaperBlock], [330, H.PaperRecord], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbBlockBegin'], [2, '*Paper_Space'],
                    [70, '0'], [10, '0.0'], [20, '0.0'], [30, '0.0'], [3, '*Paper_Space'], [1, ''],
                    [0, 'ENDBLK'], [5, H.PaperEndBlk], [330, H.PaperRecord], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbBlockEnd'],
                    [0, 'ENDSEC']
                ];

                const objects  =  [
                    [0, 'SECTION'], [2, 'OBJECTS'],
                    [0, 'DICTIONARY'], [5, H.RootDict], [330, '0'], [100, 'AcDbDictionary'], [281, '1'],
                    [3, 'ACAD_GROUP'], [350, H.GroupDict], [3, 'ACAD_IMAGE_DICT'], [350, H.ImageDict], [3, 'ACAD_IMAGE_VARS'], [350, H.RasterVars],
                    [3, 'ACAD_LAYOUT'], [350, H.LayoutDict], [3, 'ACAD_MLINESTYLE'], [350, H.MlineStyleDict],
                    [3, 'ACAD_PLOTSETTINGS'], [350, H.PlotSettingDict], [3, 'ACAD_PLOTSTYLENAME'], [350, H.PlotStyleDict],
                    [0, 'DICTIONARY'], [5, H.GroupDict], [330, H.RootDict], [100, 'AcDbDictionary'], [281, '1'],
                    [0, 'DICTIONARY'], [5, H.LayoutDict], [330, H.RootDict], [100, 'AcDbDictionary'], [281, '1'],
                    [3, 'Model'], [350, H.ModelLayout], [3, 'Layout1'], [350, H.PaperLayout],
                    [0, 'DICTIONARY'], [5, H.MlineStyleDict], [330, H.RootDict], [100, 'AcDbDictionary'], [281, '1'], [3, 'Standard'], [350, H.MlineStandard],
                    [0, 'DICTIONARY'], [5, H.PlotSettingDict], [330, H.RootDict], [100, 'AcDbDictionary'], [281, '1'],
                    [0, 'ACDBDICTIONARYWDFLT'], [5, H.PlotStyleDict], [330, H.RootDict], [100, 'AcDbDictionary'], [281, '1'],
                    [3, 'Normal'], [350, H.PlotStyleNone], [100, 'AcDbDictionaryWithDefault'], [340, H.PlotStyleNone],
                    [0, 'ACDBPLACEHOLDER'], [5, H.PlotStyleNone], [330, H.PlotStyleDict],
                    ...DistoImageMapper__Export__DxfWriter__LayoutPairs(H.ModelLayout, 'Model', 1024, 0, H.ModelRecord),
                    ...DistoImageMapper__Export__DxfWriter__LayoutPairs(H.PaperLayout, 'Layout1', 0, 1, H.PaperRecord),
                    [0, 'MLINESTYLE'], [5, H.MlineStandard], [102, '{ACAD_REACTORS'], [330, H.MlineStyleDict], [102, '}'], [330, H.MlineStyleDict],
                    [100, 'AcDbMlineStyle'], [2, 'Standard'], [70, '0'], [3, ''], [62, '256'], [51, '90.0'], [52, '90.0'], [71, '2'],
                    [49, '0.5'], [62, '256'], [6, 'BYLAYER'], [49, '-0.5'], [62, '256'], [6, 'BYLAYER'],
                    [0, 'RASTERVARIABLES'], [5, H.RasterVars], [102, '{ACAD_REACTORS'], [330, H.RootDict], [102, '}'], [330, H.RootDict],
                    [100, 'AcDbRasterVariables'], [90, '0'], [70, '1'], [71, '1'], [72, '1'],                // <-- Frames shown, high quality, millimetres
                    [0, 'DICTIONARY'], [5, H.ImageDict], [330, H.RootDict], [100, 'AcDbDictionary'], [281, '1'], ...imageDict,
                    ...imagePairs,
                    [0, 'ENDSEC'],
                    [0, 'EOF']
                ];

                const headerPairs  =  [
                    [0, 'SECTION'], [2, 'HEADER'],
                    [9, '$ACADVER'], [1, 'AC1015'],
                    [9, '$ACADMAINTVER'], [70, '6'],
                    [9, '$DWGCODEPAGE'], [3, 'ANSI_1252'],
                    [9, '$INSBASE'], [10, '0.0'], [20, '0.0'], [30, '0.0'],
                    [9, '$EXTMIN'], ...xyz(10, min),
                    [9, '$EXTMAX'], ...xyz(10, max),
                    [9, '$LIMMIN'], [10, N(min[0])], [20, N(min[1])],
                    [9, '$LIMMAX'], [10, N(max[0])], [20, N(max[1])],
                    [9, '$TEXTSTYLE'], [7, 'Standard'],
                    [9, '$CLAYER'], [8, '0'],
                    [9, '$PDMODE'], [70, String(options.PointMode ?? 34)],
                    [9, '$PDSIZE'], [40, N(options.PointSizeMm ?? 100)],
                    [9, '$LUNITS'], [70, '2'],
                    [9, '$LUPREC'], [70, '0'],
                    [9, '$INSUNITS'], [70, '4'],                                                       // <-- Millimetres
                    [9, '$MEASUREMENT'], [70, '1'],                                                    // <-- Metric
                    [9, '$HANDSEED'], [5, nextFree.toString(16).toUpperCase()],
                    [0, 'ENDSEC']
                ];

                const lines  =  DistoImageMapper__Export__DxfWriter__Lines;
                return lines(headerPairs) + lines(body)
                     + lines([[0, 'SECTION'], [2, 'ENTITIES']]) + entityText + lines([[0, 'ENDSEC']])
                     + lines(objects);
            }
        };

        return writer;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
