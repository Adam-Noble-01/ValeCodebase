/* =============================================================================
   VGHLANTERN - QR ENCODER
   =============================================================================

   FILE       : VghLantern__AppUtils__QrEncoder__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - QrEncoder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Encode a string as a QR module matrix, with no dependencies
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Takes a string and returns a square boolean matrix of QR modules. That is the
     whole of the public surface. No DOM, no canvas, no config, no side effects.
   - Byte mode, error correction level M, versions 1 to 10, which carries up to 213
     bytes - far more than any URL this application encodes.
   - The caller decides what a module looks like. SheetChrome draws them as paper
     millimetre rectangles so the code is vector on screen and vector on paper.

   -----------------------------------------------------------------------------

   WHY THIS IS WRITTEN RATHER THAN INSTALLED:
   04__Src__Dependencies__VersionLocked is a deliberate, CDN-independent set, and the
   application is an installable PWA that has to work offline. Pulling a QR library
   from a CDN would break both of those. The algorithm is fully specified in
   ISO/IEC 18004 and fits in one file, so it is a first-party module.

   WHY ERROR CORRECTION LEVEL M:
   A drawing sheet is printed, folded, and scanned on site in poor light. Level L
   recovers 7 percent of a damaged symbol, M recovers 15 percent for about 20 percent
   more modules. On a 20 mm printed square that extra density costs nothing a phone
   camera cannot resolve, and the robustness is the entire point of putting a code on
   a drawing that lives in a site bag.

   WHY THE VERSION TABLE STOPS AT 10:
   Version 10 holds 213 bytes at level M. A terms URL is well under a hundred. Going
   further would mean carrying the alignment pattern and block structure tables for
   thirty more versions to serve a payload this application will never produce, so an
   over-long string is reported as unencodable rather than silently accommodated.

   ============================================================================= */

// =============================================================================
// REGION | QR Encoder Module
// =============================================================================

const VghLantern__AppUtils__QrEncoder = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants - Specification Tables
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Galois Field Definition
    // ------------------------------------------------------------
    // The field GF(256) modulo x^8 + x^4 + x^3 + x^2 + 1, which is the field the QR
    // specification defines its Reed-Solomon arithmetic over. Not a tunable.
    const GF_PRIMITIVE_POLYNOMIAL  =  0x11D;
    const GF_ORDER                 =  256;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Encoding Mode and Padding
    // ------------------------------------------------------------
    const MODE_INDICATOR_BYTE      =  0x4;                                    // <-- 0100, byte mode
    const TERMINATOR_MAX_BITS      =  4;
    const PAD_CODEWORD_ALTERNATE_A =  0xEC;
    const PAD_CODEWORD_ALTERNATE_B =  0x11;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Format and Version Information Encoding
    // ------------------------------------------------------------
    const FORMAT_BCH_GENERATOR     =  0x537;                                  // <-- BCH(15,5) generator
    const FORMAT_BCH_DEGREE        =  10;                                     // <-- Highest set bit of 0x537
    const FORMAT_DATA_BITS         =  5;                                      // <-- 2 error correction bits plus 3 mask bits
    const FORMAT_XOR_MASK          =  0x5412;                                 // <-- Applied so an all-zero format is never valid
    const VERSION_BCH_GENERATOR    =  0x1F25;                                 // <-- BCH(18,6) generator
    const VERSION_BCH_DEGREE       =  12;                                     // <-- Highest set bit of 0x1F25
    const VERSION_DATA_BITS        =  6;                                      // <-- Version number, 7 to 40
    const ERROR_CORRECTION_BITS_M  =  0x0;                                    // <-- Level M is 00 in the format string
    const VERSION_INFO_MIN_VERSION =  7;                                      // <-- Below this no version block is written
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Block Structure per Version, Error Correction Level M
    // ------------------------------------------------------------
    // ISO/IEC 18004 Table 9, level M rows only. Each entry is
    // [ ecCodewordsPerBlock, group1BlockCount, group1DataCodewords,
    //   group2BlockCount, group2DataCodewords ]. Index 0 is unused so the array
    // can be indexed by version number directly.
    const BLOCK_STRUCTURE_M  =  [
        null,
        [10, 1, 16, 0,  0],
        [16, 1, 28, 0,  0],
        [26, 1, 44, 0,  0],
        [18, 2, 32, 0,  0],
        [24, 2, 43, 0,  0],
        [16, 4, 27, 0,  0],
        [18, 4, 31, 0,  0],
        [22, 2, 38, 2, 39],
        [22, 3, 36, 2, 37],
        [26, 4, 43, 1, 44]
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Byte Mode Payload Capacity per Version, Level M
    // ------------------------------------------------------------
    // Data codewords less the mode indicator and the character count indicator.
    // Index 0 unused, as above.
    const BYTE_CAPACITY_M  =  [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Alignment Pattern Centres per Version
    // ------------------------------------------------------------
    // Row and column coordinates whose intersections carry an alignment pattern,
    // except the three occupied by finder patterns. Index 0 unused, as above.
    const ALIGNMENT_CENTRES  =  [
        null,
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50]
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fixed Pattern Geometry
    // ------------------------------------------------------------
    const FINDER_SIZE            =  7;
    const TIMING_TRACK_INDEX     =  6;                                        // <-- Row and column carrying the timing pattern
    const CHARACTER_COUNT_BITS_SHORT  =  8;                                   // <-- Byte mode, versions 1 to 9
    const CHARACTER_COUNT_BITS_LONG   =  16;                                  // <-- Byte mode, versions 10 and above
    const CHARACTER_COUNT_LONG_FROM_VERSION  =  10;
    const MASK_PATTERN_COUNT     =  8;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Mask Penalty Weights
    // ------------------------------------------------------------
    // ISO/IEC 18004 Table 11. Fixed by the specification, not design values.
    const PENALTY_ADJACENT_BASE      =  3;                                    // <-- Score for the first five same-colour modules in a run
    const PENALTY_ADJACENT_RUN_MIN   =  5;
    const PENALTY_BLOCK              =  3;                                    // <-- Score per 2 x 2 same-colour block
    const PENALTY_FINDER_LIKE        =  40;                                   // <-- Score per finder-like sequence in a line
    const PENALTY_BALANCE_STEP       =  10;                                   // <-- Score per five percent deviation from an even dark ratio
    // ------------------------------------------------------------


    // MODULE VARIABLES | Galois Field Log Tables
    // ------------------------------------------------------------
    // Built once on first use. Every Reed-Solomon multiply below is a table lookup
    // rather than a carry-less multiply, because a sheet redraw can encode a symbol
    // on every gutter drag.
    let VghLantern__QrEncoder__ExpTable  =  null;
    let VghLantern__QrEncoder__LogTable  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Galois Field Arithmetic
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the GF(256) Exponent and Log Tables Once
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__EnsureFieldTables() {
        if (VghLantern__QrEncoder__ExpTable) return;

        var exp  =  new Uint8Array(GF_ORDER * 2);
        var log  =  new Uint8Array(GF_ORDER);
        var value  =  1;
        var i;

        for (i = 0; i < GF_ORDER - 1; i++) {
            exp[i]      =  value;
            log[value]  =  i;
            value       =  value << 1;
            if (value & GF_ORDER) value  =  value ^ GF_PRIMITIVE_POLYNOMIAL;
        }
        for (i = GF_ORDER - 1; i < GF_ORDER * 2; i++) {
            exp[i]  =  exp[i - (GF_ORDER - 1)];                                // <-- Wrapped copy removes a modulo from every multiply
        }

        VghLantern__QrEncoder__ExpTable  =  exp;
        VghLantern__QrEncoder__LogTable  =  log;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Multiply Two Field Elements
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__FieldMultiply(a, b) {
        if (a === 0 || b === 0) return 0;
        VghLantern__QrEncoder__EnsureFieldTables();
        return VghLantern__QrEncoder__ExpTable[
            VghLantern__QrEncoder__LogTable[a] + VghLantern__QrEncoder__LogTable[b]
        ];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Reed-Solomon Generator Polynomial of a Given Degree
    // ------------------------------------------------------------
    // The product of (x - 2^i) for i from 0 to degree-1, in coefficient order with
    // the highest power first.
    function VghLantern__QrEncoder__BuildGeneratorPolynomial(degree) {
        VghLantern__QrEncoder__EnsureFieldTables();

        var generator  =  [1];
        var i, j, next;

        for (i = 0; i < degree; i++) {
            next  =  new Array(generator.length + 1).fill(0);

            for (j = 0; j < generator.length; j++) {
                next[j]      =  next[j] ^ generator[j];
                next[j + 1]  =  next[j + 1] ^ VghLantern__QrEncoder__FieldMultiply(
                    generator[j], VghLantern__QrEncoder__ExpTable[i]);
            }

            generator  =  next;
        }

        return generator;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Compute the Error Correction Codewords for One Data Block
    // ------------------------------------------------------------
    // Polynomial long division of the data block by the generator, in the field.
    // The remainder is the error correction block.
    function VghLantern__QrEncoder__ComputeErrorCorrection(dataBlock, ecCodewordCount) {
        var generator  =  VghLantern__QrEncoder__BuildGeneratorPolynomial(ecCodewordCount);
        var remainder  =  new Array(ecCodewordCount).fill(0);
        var i, j, factor;

        for (i = 0; i < dataBlock.length; i++) {
            factor  =  dataBlock[i] ^ remainder[0];
            remainder.shift();
            remainder.push(0);

            if (factor === 0) continue;

            for (j = 0; j < ecCodewordCount; j++) {
                remainder[j]  =  remainder[j] ^ VghLantern__QrEncoder__FieldMultiply(generator[j + 1], factor);
            }
        }

        return remainder;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Data Encoding
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a String to UTF-8 Bytes
    // ------------------------------------------------------------
    // Byte mode carries raw octets, and a URL with an accented character would be
    // mis-scanned if the string's UTF-16 code units were written straight out.
    function VghLantern__QrEncoder__Utf8Bytes(text) {
        var value  =  String(text === undefined || text === null ? '' : text);
        var bytes  =  [];
        var i, code;

        for (i = 0; i < value.length; i++) {
            code  =  value.charCodeAt(i);

            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length) {
                code  =  0x10000 + ((code - 0xD800) << 10) + (value.charCodeAt(++i) - 0xDC00);
                bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F),
                           0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }

        return bytes;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Choose the Smallest Version That Holds the Payload
    // ------------------------------------------------------------
    // Returns 0 when the payload is too long for the supported range, which the
    // caller reports rather than truncating - a truncated URL scans to the wrong page.
    function VghLantern__QrEncoder__ResolveVersion(byteLength) {
        var version;
        for (version = 1; version < BYTE_CAPACITY_M.length; version++) {
            if (byteLength <= BYTE_CAPACITY_M[version]) return version;
        }
        return 0;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Bit Stream for a Payload at a Given Version
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__BuildBitStream(dataBytes, version, dataCodewordTotal) {
        var bits  =  [];
        var i;

        // HELPER | Append the low n bits of a value, most significant first
        function pushBits(value, bitCount) {
            var b;
            for (b = bitCount - 1; b >= 0; b--) bits.push((value >> b) & 1);
        }

        var countBits  =  (version >= CHARACTER_COUNT_LONG_FROM_VERSION)
            ? CHARACTER_COUNT_BITS_LONG
            : CHARACTER_COUNT_BITS_SHORT;

        pushBits(MODE_INDICATOR_BYTE, 4);
        pushBits(dataBytes.length, countBits);
        for (i = 0; i < dataBytes.length; i++) pushBits(dataBytes[i], 8);

        // Terminator, then pad to a byte boundary, then alternating pad codewords
        // until the version's data capacity is filled exactly.
        var capacityBits  =  dataCodewordTotal * 8;
        var terminator    =  Math.min(TERMINATOR_MAX_BITS, capacityBits - bits.length);
        for (i = 0; i < terminator; i++) bits.push(0);
        while (bits.length % 8 !== 0) bits.push(0);

        var codewords  =  [];
        for (i = 0; i < bits.length; i += 8) {
            codewords.push(
                (bits[i] << 7) | (bits[i + 1] << 6) | (bits[i + 2] << 5) | (bits[i + 3] << 4) |
                (bits[i + 4] << 3) | (bits[i + 5] << 2) | (bits[i + 6] << 1) | bits[i + 7]
            );
        }

        var padIndex  =  0;
        while (codewords.length < dataCodewordTotal) {
            codewords.push((padIndex++ % 2 === 0) ? PAD_CODEWORD_ALTERNATE_A : PAD_CODEWORD_ALTERNATE_B);
        }

        return codewords;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Split Into Blocks, Add Error Correction and Interleave
    // ------------------------------------------------------------
    // Interleaving is what makes the error correction useful: a scratch across the
    // printed symbol damages one codeword in many blocks rather than many codewords
    // in one, and each block can then recover independently.
    function VghLantern__QrEncoder__BuildCodewordSequence(dataCodewords, version) {
        var structure     =  BLOCK_STRUCTURE_M[version];
        var ecPerBlock    =  structure[0];
        var group1Count   =  structure[1];
        var group1Size    =  structure[2];
        var group2Count   =  structure[3];
        var group2Size    =  structure[4];

        var dataBlocks  =  [];
        var ecBlocks    =  [];
        var cursor      =  0;
        var b, size, block;

        for (b = 0; b < group1Count + group2Count; b++) {
            size   =  (b < group1Count) ? group1Size : group2Size;
            block  =  dataCodewords.slice(cursor, cursor + size);
            cursor +=  size;

            dataBlocks.push(block);
            ecBlocks.push(VghLantern__QrEncoder__ComputeErrorCorrection(block, ecPerBlock));
        }

        var sequence  =  [];
        var maxData   =  Math.max(group1Size, group2Size);
        var i;

        for (i = 0; i < maxData; i++) {
            for (b = 0; b < dataBlocks.length; b++) {
                if (i < dataBlocks[b].length) sequence.push(dataBlocks[b][i]);
            }
        }
        for (i = 0; i < ecPerBlock; i++) {
            for (b = 0; b < ecBlocks.length; b++) sequence.push(ecBlocks[b][i]);
        }

        return sequence;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Matrix Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create an Empty Matrix of Unset Modules
    // ------------------------------------------------------------
    // Modules start null rather than false so "reserved by a function pattern" and
    // "a light data module" stay distinguishable while the matrix is being filled.
    function VghLantern__QrEncoder__CreateMatrix(size) {
        var matrix  =  new Array(size);
        var r;
        for (r = 0; r < size; r++) matrix[r]  =  new Array(size).fill(null);
        return matrix;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place One Finder Pattern and Its Separator
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__PlaceFinder(matrix, size, originRow, originCol) {
        var r, c, row, col, isRing, isCore;

        for (r = -1; r <= FINDER_SIZE; r++) {
            for (c = -1; c <= FINDER_SIZE; c++) {
                row  =  originRow + r;
                col  =  originCol + c;
                if (row < 0 || row >= size || col < 0 || col >= size) continue;

                isRing  =  (r === 0 || r === 6 || c === 0 || c === 6);
                isCore  =  (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                matrix[row][col]  =  (r >= 0 && r <= 6 && c >= 0 && c <= 6 && (isRing || isCore));
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place Every Alignment Pattern for a Version
    // ------------------------------------------------------------
    // The three intersections that would collide with a finder pattern are skipped.
    function VghLantern__QrEncoder__PlaceAlignmentPatterns(matrix, size, version) {
        var centres  =  ALIGNMENT_CENTRES[version];
        var last     =  centres.length - 1;
        var i, j, r, c, isCollision;

        for (i = 0; i < centres.length; i++) {
            for (j = 0; j < centres.length; j++) {
                isCollision  =  (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
                if (isCollision) continue;

                for (r = -2; r <= 2; r++) {
                    for (c = -2; c <= 2; c++) {
                        matrix[centres[i] + r][centres[j] + c] =
                            (Math.max(Math.abs(r), Math.abs(c)) !== 1);
                    }
                }
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place the Timing Tracks and the Permanent Dark Module
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__PlaceTimingAndDarkModule(matrix, size, version) {
        var i;
        for (i = FINDER_SIZE + 1; i < size - FINDER_SIZE - 1; i++) {
            if (matrix[TIMING_TRACK_INDEX][i] === null) matrix[TIMING_TRACK_INDEX][i]  =  (i % 2 === 0);
            if (matrix[i][TIMING_TRACK_INDEX] === null) matrix[i][TIMING_TRACK_INDEX]  =  (i % 2 === 0);
        }
        matrix[(4 * version) + 9][8]  =  true;                                 // <-- Always dark, by specification
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Reserve the Cells the Format and Version Blocks Will Occupy
    // ------------------------------------------------------------
    // Reserved before data placement so the zigzag skips them, then written for real
    // once the mask is chosen. Reserving with false rather than null is what keeps
    // them out of the data path.
    function VghLantern__QrEncoder__ReserveInformationAreas(matrix, size, version) {
        var i, r, c;

        for (i = 0; i < 9; i++) {
            if (matrix[8][i] === null) matrix[8][i]  =  false;
            if (matrix[i][8] === null) matrix[i][8]  =  false;
        }
        for (i = 0; i < 8; i++) {
            if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i]  =  false;
            if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8]  =  false;
        }

        if (version < VERSION_INFO_MIN_VERSION) return;

        for (r = 0; r < 6; r++) {
            for (c = 0; c < 3; c++) {
                matrix[r][size - 11 + c]  =  false;
                matrix[size - 11 + c][r]  =  false;
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Walk the Zigzag and Place Every Data Bit
    // ------------------------------------------------------------
    // Two module columns at a time, upward then downward, from the bottom right,
    // skipping the vertical timing track. Any cell already set belongs to a function
    // pattern and is stepped over.
    function VghLantern__QrEncoder__PlaceDataBits(matrix, size, codewords) {
        var bitIndex   =  0;
        var totalBits  =  codewords.length * 8;
        var upward     =  true;
        var col, pair, row, r, targetCol, bit;

        for (col = size - 1; col > 0; col -= 2) {
            if (col === TIMING_TRACK_INDEX) col--;                             // <-- The timing track is not a data column

            for (row = 0; row < size; row++) {
                r  =  upward ? (size - 1 - row) : row;

                for (pair = 0; pair < 2; pair++) {
                    targetCol  =  col - pair;
                    if (matrix[r][targetCol] !== null) continue;

                    bit  =  0;
                    if (bitIndex < totalBits) {
                        bit  =  (codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
                    }
                    matrix[r][targetCol]  =  (bit === 1);
                    bitIndex++;
                }
            }

            upward  =  !upward;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Masking
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Test One Mask Condition at a Cell
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__MaskCondition(maskIndex, row, col) {
        switch (maskIndex) {
            case 0 : return ((row + col) % 2) === 0;
            case 1 : return (row % 2) === 0;
            case 2 : return (col % 3) === 0;
            case 3 : return ((row + col) % 3) === 0;
            case 4 : return ((Math.floor(row / 2) + Math.floor(col / 3)) % 2) === 0;
            case 5 : return (((row * col) % 2) + ((row * col) % 3)) === 0;
            case 6 : return ((((row * col) % 2) + ((row * col) % 3)) % 2) === 0;
            default: return ((((row + col) % 2) + ((row * col) % 3)) % 2) === 0;
        }
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Read One Cell of a Row-Wise or Column-Wise Line
    // ------------------------------------------------------------
    // The two penalty rules below run identically along rows and columns, so the
    // orientation is a flag rather than two near-identical loops.
    function VghLantern__QrEncoder__ReadLineCell(matrix, lineIndex, offset, isRow) {
        return isRow ? matrix[lineIndex][offset] : matrix[offset][lineIndex];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Score Same-Colour Runs Along One Line
    // ------------------------------------------------------------
    function VghLantern__QrEncoder__ScoreLineRuns(matrix, size, lineIndex, isRow) {
        var score      =  0;
        var runColour  =  null;
        var runLength  =  0;
        var i, cell;

        for (i = 0; i < size; i++) {
            cell  =  VghLantern__QrEncoder__ReadLineCell(matrix, lineIndex, i, isRow);

            if (cell === runColour) {
                runLength++;
                continue;
            }
            if (runLength >= PENALTY_ADJACENT_RUN_MIN) {
                score  +=  PENALTY_ADJACENT_BASE + (runLength - PENALTY_ADJACENT_RUN_MIN);
            }
            runColour  =  cell;
            runLength  =  1;
        }

        if (runLength >= PENALTY_ADJACENT_RUN_MIN) {
            score  +=  PENALTY_ADJACENT_BASE + (runLength - PENALTY_ADJACENT_RUN_MIN);
        }

        return score;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Score Finder-Like Sequences Along One Line
    // ------------------------------------------------------------
    // 1011101 with four light modules on one side reads to a scanner like a finder
    // pattern and can cost it the symbol's orientation. 0x5D0 is 10111010000 and
    // 0x05D is 00001011101, the two forms the specification penalises.
    function VghLantern__QrEncoder__ScoreLineFinderLike(matrix, size, lineIndex, isRow) {
        var score    =  0;
        var pattern  =  0;
        var i;

        for (i = 0; i < size; i++) {
            pattern  =  ((pattern << 1) & 0x7FF) |
                        (VghLantern__QrEncoder__ReadLineCell(matrix, lineIndex, i, isRow) ? 1 : 0);
            if (i < 10) continue;
            if (pattern === 0x5D0 || pattern === 0x05D) score  +=  PENALTY_FINDER_LIKE;
        }

        return score;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Score a Masked Matrix Against the Four Penalty Rules
    // ------------------------------------------------------------
    // Lower is better. The rules exist to avoid symbols that a scanner would find
    // hard to lock onto: long same-colour runs, solid blocks, sequences that read
    // like a finder pattern, and a badly skewed dark ratio.
    function VghLantern__QrEncoder__ScoreMatrix(matrix, size) {
        var score      =  0;
        var darkCount  =  0;
        var r, c;

        for (r = 0; r < size; r++) {
            score  +=  VghLantern__QrEncoder__ScoreLineRuns(matrix, size, r, true);
            score  +=  VghLantern__QrEncoder__ScoreLineFinderLike(matrix, size, r, true);
        }
        for (c = 0; c < size; c++) {
            score  +=  VghLantern__QrEncoder__ScoreLineRuns(matrix, size, c, false);
            score  +=  VghLantern__QrEncoder__ScoreLineFinderLike(matrix, size, c, false);
        }

        for (r = 0; r < size - 1; r++) {
            for (c = 0; c < size - 1; c++) {
                if (matrix[r][c] === matrix[r][c + 1] &&
                    matrix[r][c] === matrix[r + 1][c] &&
                    matrix[r][c] === matrix[r + 1][c + 1]) {
                    score  +=  PENALTY_BLOCK;
                }
            }
        }

        for (r = 0; r < size; r++) {
            for (c = 0; c < size; c++) {
                if (matrix[r][c]) darkCount++;
            }
        }

        var darkPercent  =  (darkCount * 100) / (size * size);
        score  +=  Math.floor(Math.abs(darkPercent - 50) / 5) * PENALTY_BALANCE_STEP;

        return score;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Format and Version Information
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute a BCH Remainder for a Value
    // ------------------------------------------------------------
    // Polynomial long division over GF(2). The data value is shifted up by the
    // generator's degree to make room for the check bits, then each data bit position
    // is cleared from the top down. What is left below the shift is the remainder.
    //
    // generatorDegree is the index of the generator's highest set bit: 10 for the
    // format generator 0x537, 12 for the version generator 0x1F25.
    function VghLantern__QrEncoder__BchRemainder(dataValue, generator, generatorDegree, dataBitCount) {
        var remainder  =  dataValue << generatorDegree;
        var bit;

        for (bit = dataBitCount - 1; bit >= 0; bit--) {
            if (remainder & (1 << (bit + generatorDegree))) {
                remainder  =  remainder ^ (generator << bit);
            }
        }

        return remainder;                                                      // <-- Low generatorDegree bits only
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Two Copies of the Format Information
    // ------------------------------------------------------------
    // Written twice, in two places, so a symbol whose corner is damaged is still
    // readable. Both copies carry the same fifteen bits.
    function VghLantern__QrEncoder__WriteFormatInformation(matrix, size, maskIndex) {
        var raw     =  (ERROR_CORRECTION_BITS_M << 3) | maskIndex;
        var format  =  ((raw << FORMAT_BCH_DEGREE) |
                        VghLantern__QrEncoder__BchRemainder(raw, FORMAT_BCH_GENERATOR, FORMAT_BCH_DEGREE, FORMAT_DATA_BITS))
                       ^ FORMAT_XOR_MASK;
        var i, bit;

        for (i = 0; i < 15; i++) {
            bit  =  ((format >> i) & 1) === 1;

            if (i < 6)        matrix[i][8]              =  bit;
            else if (i < 8)   matrix[i + 1][8]          =  bit;
            else if (i === 8) matrix[8][7]              =  bit;
            else              matrix[8][14 - i]         =  bit;

            if (i < 8)        matrix[8][size - 1 - i]   =  bit;
            else              matrix[size - 15 + i][8]  =  bit;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Two Copies of the Version Information
    // ------------------------------------------------------------
    // Only versions 7 and above carry it. Below that a scanner infers the version
    // from the symbol's module count.
    function VghLantern__QrEncoder__WriteVersionInformation(matrix, size, version) {
        if (version < VERSION_INFO_MIN_VERSION) return;

        var info  =  (version << VERSION_BCH_DEGREE) |
                     VghLantern__QrEncoder__BchRemainder(version, VERSION_BCH_GENERATOR, VERSION_BCH_DEGREE, VERSION_DATA_BITS);
        var i, bit, row, col;

        for (i = 0; i < 18; i++) {
            bit  =  ((info >> i) & 1) === 1;
            row  =  Math.floor(i / 3);
            col  =  size - 11 + (i % 3);

            matrix[row][col]  =  bit;
            matrix[col][row]  =  bit;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Encode a String as a QR Module Matrix
    // ------------------------------------------------------------
    // Returns { Size, Modules, Version } on success, or null when the payload is
    // empty or longer than the supported range. Modules is a Size x Size array of
    // booleans, true meaning a dark module. The caller decides how one is drawn.
    function VghLantern__AppUtils__QrEncoder__Encode(text) {
        var dataBytes  =  VghLantern__QrEncoder__Utf8Bytes(text);
        if (!dataBytes.length) return null;

        var version  =  VghLantern__QrEncoder__ResolveVersion(dataBytes.length);
        if (!version) {
            console.error('[VghLantern__AppUtils__QrEncoder] Payload of ' + dataBytes.length +
                ' bytes exceeds the supported capacity of ' + BYTE_CAPACITY_M[BYTE_CAPACITY_M.length - 1] +
                ' bytes. Shorten the encoded string.');
            return null;
        }

        var structure  =  BLOCK_STRUCTURE_M[version];
        var dataTotal  =  (structure[1] * structure[2]) + (structure[3] * structure[4]);
        var size       =  17 + (version * 4);

        var codewords  =  VghLantern__QrEncoder__BuildCodewordSequence(
            VghLantern__QrEncoder__BuildBitStream(dataBytes, version, dataTotal), version
        );

        // The function patterns are identical under every mask, so the base matrix is
        // built once and each candidate mask is applied to a copy of it.
        var base  =  VghLantern__QrEncoder__CreateMatrix(size);
        VghLantern__QrEncoder__PlaceFinder(base, size, 0, 0);
        VghLantern__QrEncoder__PlaceFinder(base, size, 0, size - FINDER_SIZE);
        VghLantern__QrEncoder__PlaceFinder(base, size, size - FINDER_SIZE, 0);
        VghLantern__QrEncoder__PlaceAlignmentPatterns(base, size, version);
        VghLantern__QrEncoder__PlaceTimingAndDarkModule(base, size, version);

        var isFunctionCell  =  VghLantern__QrEncoder__CreateMatrix(size);
        var r, c;
        VghLantern__QrEncoder__ReserveInformationAreas(base, size, version);
        for (r = 0; r < size; r++) {
            for (c = 0; c < size; c++) isFunctionCell[r][c]  =  (base[r][c] !== null);
        }

        VghLantern__QrEncoder__PlaceDataBits(base, size, codewords);

        var bestMatrix  =  null;
        var bestScore   =  Infinity;
        var maskIndex, candidate, score;

        for (maskIndex = 0; maskIndex < MASK_PATTERN_COUNT; maskIndex++) {
            candidate  =  new Array(size);
            for (r = 0; r < size; r++) {
                candidate[r]  =  new Array(size);
                for (c = 0; c < size; c++) {
                    candidate[r][c]  =  isFunctionCell[r][c]
                        ? base[r][c]
                        : (base[r][c] !== VghLantern__QrEncoder__MaskCondition(maskIndex, r, c));
                }
            }

            VghLantern__QrEncoder__WriteFormatInformation(candidate, size, maskIndex);
            VghLantern__QrEncoder__WriteVersionInformation(candidate, size, version);

            score  =  VghLantern__QrEncoder__ScoreMatrix(candidate, size);
            if (score < bestScore) {
                bestScore   =  score;
                bestMatrix  =  candidate;
            }
        }

        return { Size : size, Modules : bestMatrix, Version : version };
    }
    // ------------------------------------------------------------


    // FUNCTION | Merge Horizontal Runs of Dark Modules Into Rectangles
    // ------------------------------------------------------------
    // A 33 x 33 symbol holds around 540 dark modules. Emitting one mark per module
    // means 540 SVG rects and 540 PDF operators on every sheet redraw and every
    // export. Merging each row's consecutive dark modules into one rectangle cuts
    // that to roughly 150 with an identical result on the page.
    //
    // Returns [{ Col, Row, Length }] in module coordinates. The caller scales them.
    function VghLantern__AppUtils__QrEncoder__MergeRuns(encoded) {
        if (!encoded || !encoded.Modules) return [];

        var runs  =  [];
        var size  =  encoded.Size;
        var r, c, runStart;

        for (r = 0; r < size; r++) {
            c  =  0;
            while (c < size) {
                if (!encoded.Modules[r][c]) { c++; continue; }

                runStart  =  c;
                while (c < size && encoded.Modules[r][c]) c++;
                runs.push({ Col : runStart, Row : r, Length : c - runStart });
            }
        }

        return runs;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__AppUtils__QrEncoder__Encode     : VghLantern__AppUtils__QrEncoder__Encode,
        VghLantern__AppUtils__QrEncoder__MergeRuns  : VghLantern__AppUtils__QrEncoder__MergeRuns
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppUtils__QrEncoder  =  VghLantern__AppUtils__QrEncoder;
