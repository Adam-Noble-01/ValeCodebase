/* =============================================================================
   DISTO IMAGE MAPPER - EXPORT | ZIP WRITER
   =============================================================================

   FILE       : DistoImageMapper__Export__ZipWriter__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Export - ZipWriter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pack files into one .zip, in one flat folder
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - STORED, NOT COMPRESSED: the photos are JPEGs already, the drawings small, and
     a stored zip opens in every unzipper (Windows Explorer, macOS, iPad Files).
   - One folder, so the drawings and their photos land side by side when it is
     extracted: that is where AutoCAD looks for a linked photo.
   - Names that are not plain ASCII are flagged UTF-8 (general purpose bit 11).
   - No app imports: Node can run it for the checks.

   ============================================================================= */


// -----------------------------------------------------------------------------
// REGION | CRC-32
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The CRC Table (polynomial 0xEDB88320)
    // ------------------------------------------------------------
    const CRC_TABLE  =  (() => {
        const table  =  new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c  =  n;
            for (let k = 0; k < 8; k++) c  =  c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            table[n]  =  c >>> 0;
        }
        return table;
    })();
    // ------------------------------------------------------------


    // HELPER FUNCTION | CRC-32 of Some Bytes
    // ------------------------------------------------------------
    function DistoImageMapper__Export__ZipWriter__Crc32(bytes) {
        let crc  =  0xffffffff;
        for (let i = 0; i < bytes.length; i++) crc  =  CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Writer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Date as the Zip's DOS Time and Date
    // ------------------------------------------------------------
    function DistoImageMapper__Export__ZipWriter__DosTime(date) {
        const year  =  Math.max(date.getFullYear(), 1980);
        return {
            Time : (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
            Date : ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Pack Files: [{ Name, Bytes (Uint8Array) }] -> Uint8Array of the Whole Zip
    // ------------------------------------------------------------
    export function DistoImageMapper__Export__ZipWriter__Pack(files, date = new Date()) {
        const encoder  =  new TextEncoder();
        const when     =  DistoImageMapper__Export__ZipWriter__DosTime(date);
        const parts    =  [];
        const central  =  [];
        let   offset   =  0;

        for (const file of files) {
            const name     =  encoder.encode(file.Name);
            const isAscii  =  /^[\x20-\x7e]*$/.test(file.Name);
            const flags    =  isAscii ? 0 : 0x0800;
            const bytes    =  file.Bytes;
            const crc      =  DistoImageMapper__Export__ZipWriter__Crc32(bytes);

            const local  =  new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);                           // <-- Local file header
            local.setUint16(4, 20, true);                                    // <-- Version needed: 2.0
            local.setUint16(6, flags, true);
            local.setUint16(8, 0, true);                                     // <-- Stored
            local.setUint16(10, when.Time, true);
            local.setUint16(12, when.Date, true);
            local.setUint32(14, crc, true);
            local.setUint32(18, bytes.length, true);
            local.setUint32(22, bytes.length, true);
            local.setUint16(26, name.length, true);
            local.setUint16(28, 0, true);
            parts.push(new Uint8Array(local.buffer), name, bytes);

            const entry  =  new DataView(new ArrayBuffer(46));
            entry.setUint32(0, 0x02014b50, true);                           // <-- Central directory header
            entry.setUint16(4, 20, true);                                    // <-- Made by: 2.0
            entry.setUint16(6, 20, true);
            entry.setUint16(8, flags, true);
            entry.setUint16(10, 0, true);
            entry.setUint16(12, when.Time, true);
            entry.setUint16(14, when.Date, true);
            entry.setUint32(16, crc, true);
            entry.setUint32(20, bytes.length, true);
            entry.setUint32(24, bytes.length, true);
            entry.setUint16(28, name.length, true);
            entry.setUint16(30, 0, true);
            entry.setUint16(32, 0, true);
            entry.setUint16(34, 0, true);
            entry.setUint16(36, 0, true);
            entry.setUint32(38, 0, true);
            entry.setUint32(42, offset, true);
            central.push(new Uint8Array(entry.buffer), name);

            offset += 30 + name.length + bytes.length;
        }

        const centralSize  =  central.reduce((sum, part) => sum + part.length, 0);
        const end  =  new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);                                  // <-- End of central directory
        end.setUint16(4, 0, true);
        end.setUint16(6, 0, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);
        end.setUint16(20, 0, true);

        const all    =  [...parts, ...central, new Uint8Array(end.buffer)];
        const total  =  all.reduce((sum, part) => sum + part.length, 0);
        const out    =  new Uint8Array(total);
        let   at     =  0;
        for (const part of all) {
            out.set(part, at);
            at += part.length;
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
