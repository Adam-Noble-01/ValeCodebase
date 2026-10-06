// =============================================================================
// VALEVISION3D - VIDEO STUDIO - MP4 MUXER
// =============================================================================
//
// FILE       : Na__VideoStudio__Export__Mp4Muxer.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - MP4 Muxer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write H.264 encoded chunks into a standards-compliant MP4
//              container with no third-party dependency
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - WebCodecs VideoEncoder emits raw encoded H.264 chunks and an avcC decoder
//   configuration.  Neither is a playable file on its own: something has to
//   write the ISO Base Media File Format boxes around them.  This module is
//   that something.
// - Produces a single-track, video-only MP4 (ISO/IEC 14496-12 and -15) that
//   plays in QuickTime, VLC, Windows Media Player, Premiere, DaVinci Resolve
//   and every browser.
// - Deliberately dependency-free.  ValeVision3D runs from local Flask and from
//   GitHub Pages with no build step, so pulling a muxer off a CDN would add a
//   network failure mode to a feature that otherwise works entirely offline.
//
// BOX LAYOUT PRODUCED:
//   ftyp                          brand isom, compatible with avc1/mp41
//   mdat                          every encoded frame, back to back
//   moov
//     mvhd                        movie header, timescale 1000
//     trak
//       tkhd                      track header with display dimensions
//       mdia
//         mdhd                    media header, timescale 90000
//         hdlr                    'vide' handler
//         minf
//           vmhd                  video media header
//           dinf > dref > url     self-contained data reference
//           stbl
//             stsd > avc1 > avcC  sample description carrying the SPS/PPS
//             stts                per-sample durations, run-length encoded
//             stss                sync sample table (keyframes)
//             stsc                one sample per chunk
//             stsz                per-sample byte sizes
//             stco / co64         chunk byte offsets into the file
//
// WHY MDAT COMES BEFORE MOOV:
// - Sample offsets in stco point into mdat, so mdat's position must be known
//   before moov is written.  Writing mdat first and moov last is the simplest
//   correct ordering.  The file is not progressively streamable as a result,
//   which does not matter for a download.
//
// MEMORY:
// - Encoded chunks are retained until finalize().  A 60 second 4K clip at
//   24 Mbps is roughly 180 MB, which is comfortable; the caller surfaces the
//   running size so long exports are not a surprise.
// - finalize() hands the chunk views straight to the Blob constructor rather
//   than concatenating into one giant ArrayBuffer, so there is no doubling.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Timescales and Fixed Field Values
    // ------------------------------------------------------------
    const Na__VsMp4__MOVIE_TIMESCALE = 1000;        // <-- Movie header ticks per second
    const Na__VsMp4__MEDIA_TIMESCALE = 90000;       // <-- Standard video media timescale
    const Na__VsMp4__TRACK_ID        = 1;           // <-- Single video track
    const Na__VsMp4__LANGUAGE_UND    = 0x55C4;      // <-- ISO-639-2/T packed code for 'und'
    const Na__VsMp4__UINT32_MAX      = 0xFFFFFFFF;  // <-- Threshold for 64-bit fallbacks
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Unity Transformation Matrix (16.16 / 2.30 fixed point)
    // ------------------------------------------------------------
    const Na__VsMp4__UNITY_MATRIX = [
        0x00010000, 0x00000000, 0x00000000,
        0x00000000, 0x00010000, 0x00000000,
        0x00000000, 0x00000000, 0x40000000
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Byte Writer
// -----------------------------------------------------------------------------

    // CLASS | Growable Big-Endian Byte Writer with Box Size Back-Patching
    // ------------------------------------------------------------
    class Na__VsMp4__Writer {

        constructor(initialBytes = 4096) {
            this.buffer = new Uint8Array(initialBytes);
            this.view   = new DataView(this.buffer.buffer);
            this.length = 0;
        }

        // HELPER | Grow the Backing Buffer to Fit n More Bytes
        // ------------------------------------------------------------
        ensure(n) {
            if (this.length + n <= this.buffer.length) return;

            let capacity = this.buffer.length || 1;
            while (capacity < this.length + n) capacity *= 2;

            const grown = new Uint8Array(capacity);
            grown.set(this.buffer.subarray(0, this.length));

            this.buffer = grown;
            this.view   = new DataView(grown.buffer);                        // <-- View must follow the reallocated buffer
        }
        // ------------------------------------------------------------

        u8(value)  { this.ensure(1); this.view.setUint8(this.length, value  & 0xFF);   this.length += 1; }
        u16(value) { this.ensure(2); this.view.setUint16(this.length, value & 0xFFFF); this.length += 2; }
        u32(value) { this.ensure(4); this.view.setUint32(this.length, value >>> 0);    this.length += 4; }

        // HELPER | Write a 64-bit Unsigned Value from a JS Number
        // ------------------------------------------------------------
        u64(value) {
            const high = Math.floor(value / 4294967296);
            const low  = value >>> 0;
            this.u32(high);
            this.u32(low);
        }
        // ------------------------------------------------------------

        // HELPER | Write a Four Character Code
        // ------------------------------------------------------------
        fourcc(code) {
            this.ensure(4);
            for (let i = 0; i < 4; i++) {
                this.view.setUint8(this.length + i, code.charCodeAt(i) & 0xFF);
            }
            this.length += 4;
        }
        // ------------------------------------------------------------

        // HELPER | Write Raw Bytes
        // ------------------------------------------------------------
        bytes(source) {
            if (!source || source.length === 0) return;
            this.ensure(source.length);
            this.buffer.set(source, this.length);
            this.length += source.length;
        }
        // ------------------------------------------------------------

        // HELPER | Write n Zero Bytes
        // ------------------------------------------------------------
        zeros(n) {
            this.ensure(n);
            this.buffer.fill(0, this.length, this.length + n);
            this.length += n;
        }
        // ------------------------------------------------------------

        // HELPER | Open a Box, Reserving Space for Its Size Field
        // ------------------------------------------------------------
        openBox(type) {
            const start = this.length;
            this.u32(0);                                                     // <-- Size placeholder, patched by closeBox
            this.fourcc(type);
            return start;
        }
        // ------------------------------------------------------------

        // HELPER | Close a Box, Patching Its Size Field
        // ------------------------------------------------------------
        closeBox(start) {
            this.view.setUint32(start, this.length - start);
        }
        // ------------------------------------------------------------

        // HELPER | Write a Full Box Version and Flags Word
        // ------------------------------------------------------------
        fullBoxHeader(version, flags) {
            this.u32(((version & 0xFF) << 24) | (flags & 0xFFFFFF));
        }
        // ------------------------------------------------------------

        // HELPER | Return the Written Bytes
        // ------------------------------------------------------------
        result() {
            return this.buffer.subarray(0, this.length);
        }
        // ------------------------------------------------------------
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sample Timing Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Exact Per-Sample Durations for a Frame Rate
    // ------------------------------------------------------------
    // Deriving each delta from the difference of two rounded cumulative
    // timestamps keeps the track exactly in sync even when timescale / fps is
    // not a whole number, so fractional rates stay correct rather than
    // accumulating a rounding drift across the clip.
    // ------------------------------------------------------------
    function Na__VsMp4__BuildSampleDeltas(sampleCount, fps, timescale) {
        const deltas = new Array(sampleCount);
        let previous = 0;

        for (let i = 0; i < sampleCount; i++) {
            const next = Math.round(((i + 1) * timescale) / fps);
            deltas[i]  = next - previous;
            previous   = next;
        }
        return deltas;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run-Length Encode Sample Deltas into stts Entries
    // ------------------------------------------------------------
    function Na__VsMp4__RunLengthEncodeDeltas(deltas) {
        const entries = [];

        deltas.forEach((delta) => {
            const last = entries[entries.length - 1];
            if (last && last.delta === delta) {
                last.count++;                                                // <-- Extend the current run
            } else {
                entries.push({ count: 1, delta });                           // <-- Start a new run
            }
        });

        return entries;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Box Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Write the ftyp Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteFtyp(writer) {
        const start = writer.openBox('ftyp');
        writer.fourcc('isom');                                               // <-- Major brand
        writer.u32(512);                                                     // <-- Minor version
        writer.fourcc('isom');
        writer.fourcc('iso2');
        writer.fourcc('avc1');
        writer.fourcc('mp41');
        writer.closeBox(start);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the mvhd Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteMvhd(writer, movieDuration) {
        const start = writer.openBox('mvhd');
        writer.fullBoxHeader(0, 0);
        writer.u32(0);                                                       // <-- Creation time
        writer.u32(0);                                                       // <-- Modification time
        writer.u32(Na__VsMp4__MOVIE_TIMESCALE);
        writer.u32(movieDuration);
        writer.u32(0x00010000);                                              // <-- Rate 1.0
        writer.u16(0x0100);                                                  // <-- Volume 1.0
        writer.u16(0);                                                       // <-- Reserved
        writer.zeros(8);                                                     // <-- Reserved
        Na__VsMp4__UNITY_MATRIX.forEach(v => writer.u32(v));
        writer.zeros(24);                                                    // <-- Pre-defined
        writer.u32(Na__VsMp4__TRACK_ID + 1);                                 // <-- Next free track id
        writer.closeBox(start);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the tkhd Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteTkhd(writer, movieDuration, width, height) {
        const start = writer.openBox('tkhd');
        writer.fullBoxHeader(0, 0x000007);                                   // <-- Enabled, in movie, in preview
        writer.u32(0);                                                       // <-- Creation time
        writer.u32(0);                                                       // <-- Modification time
        writer.u32(Na__VsMp4__TRACK_ID);
        writer.u32(0);                                                       // <-- Reserved
        writer.u32(movieDuration);
        writer.zeros(8);                                                     // <-- Reserved
        writer.u16(0);                                                       // <-- Layer
        writer.u16(0);                                                       // <-- Alternate group
        writer.u16(0);                                                       // <-- Volume, zero for video
        writer.u16(0);                                                       // <-- Reserved
        Na__VsMp4__UNITY_MATRIX.forEach(v => writer.u32(v));
        writer.u32(width  * 65536);                                          // <-- Display width  as 16.16
        writer.u32(height * 65536);                                          // <-- Display height as 16.16
        writer.closeBox(start);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the mdhd Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteMdhd(writer, mediaDuration) {
        const start = writer.openBox('mdhd');
        writer.fullBoxHeader(0, 0);
        writer.u32(0);                                                       // <-- Creation time
        writer.u32(0);                                                       // <-- Modification time
        writer.u32(Na__VsMp4__MEDIA_TIMESCALE);
        writer.u32(mediaDuration);
        writer.u16(Na__VsMp4__LANGUAGE_UND);
        writer.u16(0);                                                       // <-- Pre-defined
        writer.closeBox(start);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the hdlr Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteHdlr(writer) {
        const start = writer.openBox('hdlr');
        writer.fullBoxHeader(0, 0);
        writer.u32(0);                                                       // <-- Pre-defined
        writer.fourcc('vide');                                               // <-- Handler type
        writer.zeros(12);                                                    // <-- Reserved
        const name = 'ValeVision3D Video Handler';
        for (let i = 0; i < name.length; i++) writer.u8(name.charCodeAt(i));
        writer.u8(0);                                                        // <-- Null terminator
        writer.closeBox(start);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the vmhd Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteVmhd(writer) {
        const start = writer.openBox('vmhd');
        writer.fullBoxHeader(0, 1);                                          // <-- Flags must be 1 per spec
        writer.u16(0);                                                       // <-- Graphics mode: copy
        writer.u16(0);                                                       // <-- Opcolor red
        writer.u16(0);                                                       // <-- Opcolor green
        writer.u16(0);                                                       // <-- Opcolor blue
        writer.closeBox(start);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the dinf Box with a Self-Contained dref
    // ------------------------------------------------------------
    function Na__VsMp4__WriteDinf(writer) {
        const dinfStart = writer.openBox('dinf');

        const drefStart = writer.openBox('dref');
        writer.fullBoxHeader(0, 0);
        writer.u32(1);                                                       // <-- One entry

        const urlStart = writer.openBox('url ');
        writer.fullBoxHeader(0, 1);                                          // <-- Flag 1: media is in this same file
        writer.closeBox(urlStart);

        writer.closeBox(drefStart);
        writer.closeBox(dinfStart);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the stsd Box Containing avc1 and avcC
    // ------------------------------------------------------------
    function Na__VsMp4__WriteStsd(writer, width, height, avcCBytes) {
        const stsdStart = writer.openBox('stsd');
        writer.fullBoxHeader(0, 0);
        writer.u32(1);                                                       // <-- One sample entry

        const avc1Start = writer.openBox('avc1');
        writer.zeros(6);                                                     // <-- Reserved
        writer.u16(1);                                                       // <-- Data reference index
        writer.u16(0);                                                       // <-- Pre-defined
        writer.u16(0);                                                       // <-- Reserved
        writer.zeros(12);                                                    // <-- Pre-defined
        writer.u16(width);
        writer.u16(height);
        writer.u32(0x00480000);                                              // <-- Horizontal resolution 72 dpi
        writer.u32(0x00480000);                                              // <-- Vertical resolution 72 dpi
        writer.u32(0);                                                       // <-- Reserved
        writer.u16(1);                                                       // <-- Frame count per sample

        // COMPRESSOR NAME | 32 byte Pascal-style field: length byte then padding
        const compressor = 'ValeVision3D';
        writer.u8(compressor.length);
        for (let i = 0; i < compressor.length; i++) writer.u8(compressor.charCodeAt(i));
        writer.zeros(31 - compressor.length);

        writer.u16(0x0018);                                                  // <-- Depth: 24-bit colour
        writer.u16(0xFFFF);                                                  // <-- Pre-defined: -1

        const avcCStart = writer.openBox('avcC');
        writer.bytes(avcCBytes);                                             // <-- SPS/PPS record straight from the encoder
        writer.closeBox(avcCStart);

        writer.closeBox(avc1Start);
        writer.closeBox(stsdStart);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Sample Tables into an Open stbl Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteSampleTables(writer, tables) {
        const { sttsEntries, syncSamples, sampleSizes, chunkOffsets, needsCo64 } = tables;

        // STTS | Decoding time to sample
        const sttsStart = writer.openBox('stts');
        writer.fullBoxHeader(0, 0);
        writer.u32(sttsEntries.length);
        sttsEntries.forEach((entry) => {
            writer.u32(entry.count);
            writer.u32(entry.delta);
        });
        writer.closeBox(sttsStart);

        // STSS | Sync sample table, omitted entirely when every frame is a key
        if (syncSamples.length > 0 && syncSamples.length < sampleSizes.length) {
            const stssStart = writer.openBox('stss');
            writer.fullBoxHeader(0, 0);
            writer.u32(syncSamples.length);
            syncSamples.forEach(sampleNumber => writer.u32(sampleNumber));
            writer.closeBox(stssStart);
        }

        // STSC | Sample to chunk: one sample per chunk keeps the mapping trivial
        const stscStart = writer.openBox('stsc');
        writer.fullBoxHeader(0, 0);
        writer.u32(1);                                                       // <-- One run covers every chunk
        writer.u32(1);                                                       // <-- First chunk
        writer.u32(1);                                                       // <-- Samples per chunk
        writer.u32(1);                                                       // <-- Sample description index
        writer.closeBox(stscStart);

        // STSZ | Sample sizes
        const stszStart = writer.openBox('stsz');
        writer.fullBoxHeader(0, 0);
        writer.u32(0);                                                       // <-- Zero means per-sample table follows
        writer.u32(sampleSizes.length);
        sampleSizes.forEach(size => writer.u32(size));
        writer.closeBox(stszStart);

        // STCO or CO64 | Chunk offsets, widened only when the file needs it
        if (needsCo64) {
            const co64Start = writer.openBox('co64');
            writer.fullBoxHeader(0, 0);
            writer.u32(chunkOffsets.length);
            chunkOffsets.forEach(offset => writer.u64(offset));
            writer.closeBox(co64Start);
        } else {
            const stcoStart = writer.openBox('stco');
            writer.fullBoxHeader(0, 0);
            writer.u32(chunkOffsets.length);
            chunkOffsets.forEach(offset => writer.u32(offset));
            writer.closeBox(stcoStart);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Complete moov Box
    // ------------------------------------------------------------
    function Na__VsMp4__WriteMoov(writer, options) {
        const {
            width, height, avcCBytes,
            movieDuration, mediaDuration,
            sttsEntries, syncSamples, sampleSizes, chunkOffsets, needsCo64
        } = options;

        const moovStart = writer.openBox('moov');
        Na__VsMp4__WriteMvhd(writer, movieDuration);

        const trakStart = writer.openBox('trak');
        Na__VsMp4__WriteTkhd(writer, movieDuration, width, height);

        const mdiaStart = writer.openBox('mdia');
        Na__VsMp4__WriteMdhd(writer, mediaDuration);
        Na__VsMp4__WriteHdlr(writer);

        const minfStart = writer.openBox('minf');
        Na__VsMp4__WriteVmhd(writer);
        Na__VsMp4__WriteDinf(writer);

        const stblStart = writer.openBox('stbl');
        Na__VsMp4__WriteStsd(writer, width, height, avcCBytes);
        Na__VsMp4__WriteSampleTables(writer, {
            sttsEntries, syncSamples, sampleSizes, chunkOffsets, needsCo64
        });
        writer.closeBox(stblStart);

        writer.closeBox(minfStart);
        writer.closeBox(mdiaStart);
        writer.closeBox(trakStart);
        writer.closeBox(moovStart);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Muxer API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalise an avcC Description to a Uint8Array
    // ------------------------------------------------------------
    function Na__VsMp4__NormaliseDescription(description) {
        if (!description) return null;
        if (description instanceof Uint8Array) return description;
        if (ArrayBuffer.isView(description)) {
            return new Uint8Array(description.buffer, description.byteOffset, description.byteLength);
        }
        if (description instanceof ArrayBuffer) return new Uint8Array(description);
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create an MP4 Muxer for a Single H.264 Video Track
    // ------------------------------------------------------------
    // options: { width, height, fps }
    //
    // Returns an object with:
    //   setDescription(avcC)   Call once with decoderConfig.description
    //   addChunk(bytes, isKey) Append one encoded frame
    //   getSampleCount()       Frames appended so far
    //   getByteLength()        Encoded payload bytes so far
    //   finalize()             Returns a Blob of type video/mp4
    // ------------------------------------------------------------
    function Na__VideoStudio__Mp4Muxer__Create(options) {
        const width  = Math.max(2, Math.round(options.width));
        const height = Math.max(2, Math.round(options.height));
        const fps    = (Number.isFinite(options.fps) && options.fps > 0) ? options.fps : 30;

        const chunkData   = [];      // <-- Encoded frame payloads, in decode order
        const sampleSizes = [];      // <-- Byte length of each frame
        const syncSamples = [];      // <-- 1-based indices of keyframes
        let   payloadBytes = 0;      // <-- Running mdat payload size
        let   avcCBytes    = null;   // <-- SPS/PPS record from the encoder

        return {

            // FUNCTION | Store the Decoder Configuration Record
            // ------------------------------------------------------------
            setDescription(description) {
                const normalised = Na__VsMp4__NormaliseDescription(description);
                if (normalised) {
                    avcCBytes = new Uint8Array(normalised);                  // <-- Copy: the source buffer is reused by the encoder
                }
            },
            // ------------------------------------------------------------


            // FUNCTION | Report Whether the Decoder Configuration Has Arrived
            // ------------------------------------------------------------
            hasDescription() {
                return avcCBytes !== null && avcCBytes.length > 0;
            },
            // ------------------------------------------------------------


            // FUNCTION | Append One Encoded Frame
            // ------------------------------------------------------------
            addChunk(bytes, isKey) {
                chunkData.push(bytes);
                sampleSizes.push(bytes.byteLength);
                payloadBytes += bytes.byteLength;

                if (isKey) syncSamples.push(sampleSizes.length);             // <-- stss indices are 1-based
            },
            // ------------------------------------------------------------


            // FUNCTION | Report Frames Appended So Far
            // ------------------------------------------------------------
            getSampleCount() {
                return sampleSizes.length;
            },
            // ------------------------------------------------------------


            // FUNCTION | Report Encoded Payload Bytes So Far
            // ------------------------------------------------------------
            getByteLength() {
                return payloadBytes;
            },
            // ------------------------------------------------------------


            // FUNCTION | Assemble the Finished MP4 as a Blob
            // ------------------------------------------------------------
            finalize() {
                if (sampleSizes.length === 0) {
                    throw new Error('No frames were encoded, so there is nothing to write.');
                }
                if (!avcCBytes) {
                    throw new Error('Encoder never supplied an H.264 decoder configuration.');
                }

                // FTYP | Written first so its length is known for the offsets
                const ftypWriter = new Na__VsMp4__Writer(64);
                Na__VsMp4__WriteFtyp(ftypWriter);
                const ftypBytes = new Uint8Array(ftypWriter.result());       // <-- Copy out before the writer is discarded

                // MDAT HEADER | Widened to the 64-bit largesize form if needed
                const mdatWriter   = new Na__VsMp4__Writer(32);
                const useLargeSize = (payloadBytes + 8) > Na__VsMp4__UINT32_MAX;

                if (useLargeSize) {
                    mdatWriter.u32(1);                                       // <-- Size 1 signals a 64-bit largesize field
                    mdatWriter.fourcc('mdat');
                    mdatWriter.u64(payloadBytes + 16);
                } else {
                    mdatWriter.u32(payloadBytes + 8);
                    mdatWriter.fourcc('mdat');
                }
                const mdatHeader = new Uint8Array(mdatWriter.result());

                // OFFSETS | One chunk per sample, laid out back to back in mdat
                const dataStart    = ftypBytes.length + mdatHeader.length;
                const chunkOffsets = new Array(sampleSizes.length);
                let   cursor       = dataStart;

                for (let i = 0; i < sampleSizes.length; i++) {
                    chunkOffsets[i] = cursor;
                    cursor += sampleSizes[i];
                }

                const needsCo64 = cursor > Na__VsMp4__UINT32_MAX;

                // TIMING | Exact per-sample deltas, run-length encoded
                const deltas        = Na__VsMp4__BuildSampleDeltas(sampleSizes.length, fps, Na__VsMp4__MEDIA_TIMESCALE);
                const sttsEntries   = Na__VsMp4__RunLengthEncodeDeltas(deltas);
                const mediaDuration = deltas.reduce((sum, d) => sum + d, 0);
                const movieDuration = Math.round((sampleSizes.length * Na__VsMp4__MOVIE_TIMESCALE) / fps);

                // MOOV | Sample tables now that every offset is known
                const moovWriter = new Na__VsMp4__Writer(8192);
                Na__VsMp4__WriteMoov(moovWriter, {
                    width, height, avcCBytes,
                    movieDuration, mediaDuration,
                    sttsEntries, syncSamples, sampleSizes, chunkOffsets, needsCo64
                });
                const moovBytes = new Uint8Array(moovWriter.result());

                return new Blob(
                    [ftypBytes, mdatHeader, ...chunkData, moovBytes],        // <-- No giant concat; Blob stitches the parts
                    { type: 'video/mp4' }
                );
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | MP4 Muxer API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__Mp4Muxer__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
