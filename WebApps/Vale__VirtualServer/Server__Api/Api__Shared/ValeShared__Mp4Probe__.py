"""
=============================================================================
 VALE SHARED API - MP4 PROBE (WHAT IS IN A VIDEO FILE, WITHOUT FFMPEG)
=============================================================================

FILE       : ValeShared__Mp4Probe__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Read an MP4's own boxes to learn its length, frame size, frame
             rate, codec, whether it has sound, whether it is fast-start, and
             whether every frame it lists is really in the file
CREATED    : 07-Oct-2026

DESCRIPTION:
- The server has no ffmpeg, and needs none: an MP4 describes itself in its
  moov box. The top-level boxes are walked by their sizes, seeking past mdat,
  so a file of any size costs a few small reads; moov itself (about 12 bytes
  a frame) is read whole.
- FAST-START means moov comes before mdat, so a browser can start playing
  from the first bytes. ValeVision 3D's Theia publishes are always fast-start;
  a file dropped into a project folder may not be (it still plays: the
  browser asks for the end of the file first).
- COMPLETE means the last frame listed in the sample tables ends inside the
  file. An upload that lost its tail fails this check, so it is never
  published.
- Used by ValeShared__TheiaVideo__.py (ValeVision Theia's data model), the
  Theia API's upload check, and the Gallery API's video summary.

USAGE:
  from ValeShared__Mp4Probe__ import Na__Mp4__Probe
  info = Na__Mp4__Probe(path)        # {"ok": True, "durationMs": 272000, "width": 3240, ...}

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
07-Oct-2026 - Version 1.0.0
- Initial build for ValeVision Theia (published video files, uploads, dropped-in files).

=============================================================================
"""

from __future__ import annotations

import os
import struct
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__MP4__MAX_TOP_BOXES            = 4096                                       # <-- A real file has a handful; this stops a corrupt one looping
NA__MP4__MAX_MOOV_BYTES           = 64 * 1024 * 1024                           # <-- moov is ~12 bytes a frame: 64 MB is hours of 60 fps
NA__MP4__CONTAINERS               = {b"moov", b"trak", b"mdia", b"minf", b"stbl", b"edts", b"dinf", b"mvex"}
NA__MP4__VIDEO_ENTRIES            = {b"avc1", b"avc3", b"hvc1", b"hev1", b"av01", b"vp09"}
NA__MP4__AUDIO_ENTRIES            = {b"mp4a", b"ac-3", b"ec-3", b"Opus", b"fLaC", b"alac"}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Box Walking
# -----------------------------------------------------------------------------

# HELPER FUNCTION | The File's Top-Level Boxes: [(type, offset, header length, box size)]
# ------------------------------------------------------------
def Na__Mp4__TopBoxes(fh, file_size: int) -> list:
    boxes, pos = [], 0
    while pos + 8 <= file_size and len(boxes) < NA__MP4__MAX_TOP_BOXES:
        fh.seek(pos)
        head = fh.read(16)
        if len(head) < 8:
            break
        size32, kind = struct.unpack(">I4s", head[:8])
        header = 8
        if size32 == 1:                                                        # <-- 64-bit largesize follows the type
            if len(head) < 16:
                break
            size = struct.unpack(">Q", head[8:16])[0]
            header = 16
        elif size32 == 0:                                                      # <-- The box runs to the end of the file
            size = file_size - pos
        else:
            size = size32
        if size < header:
            raise ValueError(f"corrupt box {kind!r} at byte {pos}")
        boxes.append((kind, pos, header, size))
        pos += size
    return boxes
# ---------------------------------------------------------------

# HELPER FUNCTION | Child Boxes Inside a Buffer: yields (type, payload start, payload end)
# ------------------------------------------------------------
def Na__Mp4__Children(buf: bytes, start: int, end: int):
    pos = start
    while pos + 8 <= end:
        size32, kind = struct.unpack_from(">I4s", buf, pos)
        header = 8
        if size32 == 1:
            if pos + 16 > end:
                return
            size = struct.unpack_from(">Q", buf, pos + 8)[0]
            header = 16
        elif size32 == 0:
            size = end - pos
        else:
            size = size32
        if size < header or pos + size > end:
            return                                                             # <-- A truncated child ends the walk, never a crash
        yield kind, pos + header, pos + size
        pos += size
# ---------------------------------------------------------------

# HELPER FUNCTION | The First Child of a Type, or None
# ------------------------------------------------------------
def Na__Mp4__Find(buf: bytes, start: int, end: int, kind: bytes):
    for k, s, e in Na__Mp4__Children(buf, start, end):
        if k == kind:
            return s, e
    return None
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Box Readers
# -----------------------------------------------------------------------------

# HELPER FUNCTION | mvhd / mdhd: (timescale, duration) for version 0 or 1
# ------------------------------------------------------------
def Na__Mp4__TimescaleDuration(buf: bytes, s: int) -> tuple:
    version = buf[s]
    if version == 1:
        return struct.unpack_from(">IQ", buf, s + 4 + 16)
    return struct.unpack_from(">II", buf, s + 4 + 8)
# ---------------------------------------------------------------

# HELPER FUNCTION | tkhd: display (width, height) in whole pixels
# ------------------------------------------------------------
def Na__Mp4__TrackSize(buf: bytes, s: int) -> tuple:
    at = s + (88 if buf[s] == 1 else 76)
    w, h = struct.unpack_from(">II", buf, at)
    return w >> 16, h >> 16
# ---------------------------------------------------------------

# HELPER FUNCTION | The Codec String of a Sample Entry ("avc1.640033", "mp4a", ...)
# ------------------------------------------------------------
def Na__Mp4__CodecString(buf: bytes, kind: bytes, s: int, e: int) -> str:
    name = kind.decode("latin-1").strip()
    if kind in (b"avc1", b"avc3"):
        found = Na__Mp4__Find(buf, s + 78, e, b"avcC")                          # <-- 8 bytes SampleEntry + 70 bytes VisualSampleEntry
        if found and found[1] - found[0] >= 4:
            p = found[0]
            return f"{name}.{buf[p + 1]:02X}{buf[p + 2]:02X}{buf[p + 3]:02X}"
    return name
# ---------------------------------------------------------------

# HELPER FUNCTION | One Track: handler, size, timing, codec, samples, data end
# ------------------------------------------------------------
def Na__Mp4__Track(buf: bytes, s: int, e: int) -> dict:
    track = {"handler": "", "width": 0, "height": 0, "timescale": 0, "duration": 0, "codec": "",
             "sampleCount": 0, "fps": 0.0, "dataEnd": 0, "keyframes": 0}
    tkhd = Na__Mp4__Find(buf, s, e, b"tkhd")
    if tkhd:
        track["width"], track["height"] = Na__Mp4__TrackSize(buf, tkhd[0])
    mdia = Na__Mp4__Find(buf, s, e, b"mdia")
    if not mdia:
        return track
    mdhd = Na__Mp4__Find(buf, *mdia, b"mdhd")
    if mdhd:
        track["timescale"], track["duration"] = Na__Mp4__TimescaleDuration(buf, mdhd[0])
    hdlr = Na__Mp4__Find(buf, *mdia, b"hdlr")
    if hdlr:
        track["handler"] = buf[hdlr[0] + 8:hdlr[0] + 12].decode("latin-1")
    minf = Na__Mp4__Find(buf, *mdia, b"minf")
    stbl = Na__Mp4__Find(buf, *minf, b"stbl") if minf else None
    if not stbl:
        return track

    # SAMPLE DESCRIPTION | The codec of the first entry
    stsd = Na__Mp4__Find(buf, *stbl, b"stsd")
    if stsd:
        for kind, cs, ce in Na__Mp4__Children(buf, stsd[0] + 8, stsd[1]):
            track["codec"] = Na__Mp4__CodecString(buf, kind, cs, ce)
            if kind in NA__MP4__VIDEO_ENTRIES and not track["width"]:
                track["width"], track["height"] = struct.unpack_from(">HH", buf, cs + 24)
            break

    # SAMPLE SIZES | stsz: one size for all, or a table
    sizes, uniform, count = [], 0, 0
    stsz = Na__Mp4__Find(buf, *stbl, b"stsz")
    if stsz:
        uniform, count = struct.unpack_from(">II", buf, stsz[0] + 4)
        if uniform == 0 and count:
            sizes = list(struct.unpack_from(f">{count}I", buf, stsz[0] + 12))
    track["sampleCount"] = count

    # FRAME RATE | The most common sample delta, by frames covered
    stts = Na__Mp4__Find(buf, *stbl, b"stts")
    if stts and track["timescale"]:
        n = struct.unpack_from(">I", buf, stts[0] + 4)[0]
        runs = [struct.unpack_from(">II", buf, stts[0] + 8 + 8 * i) for i in range(n)]
        if runs:
            delta = max(runs, key=lambda r: r[0])[1]
            track["fps"] = round(track["timescale"] / delta, 3) if delta else 0.0

    stss = Na__Mp4__Find(buf, *stbl, b"stss")
    track["keyframes"] = struct.unpack_from(">I", buf, stss[0] + 4)[0] if stss else count

    # DATA END | Where the last listed sample stops: chunk offsets + samples per chunk
    offsets = []
    stco = Na__Mp4__Find(buf, *stbl, b"stco")
    co64 = Na__Mp4__Find(buf, *stbl, b"co64")
    if stco:
        n = struct.unpack_from(">I", buf, stco[0] + 4)[0]
        offsets = list(struct.unpack_from(f">{n}I", buf, stco[0] + 8))
    elif co64:
        n = struct.unpack_from(">I", buf, co64[0] + 4)[0]
        offsets = list(struct.unpack_from(f">{n}Q", buf, co64[0] + 8))
    stsc = Na__Mp4__Find(buf, *stbl, b"stsc")
    runs = []
    if stsc:
        n = struct.unpack_from(">I", buf, stsc[0] + 4)[0]
        runs = [struct.unpack_from(">III", buf, stsc[0] + 8 + 12 * i)[:2] for i in range(n)]
    if offsets and runs and count:
        sample, data_end, run = 0, 0, 0
        for ci, chunk_offset in enumerate(offsets, start=1):
            while run + 1 < len(runs) and runs[run + 1][0] <= ci:              # <-- stsc runs are in chunk order: one pass
                run += 1
            per_chunk = runs[run][1]
            end = chunk_offset
            for _ in range(per_chunk):
                if sample >= count:
                    break
                end += sizes[sample] if sizes else uniform
                sample += 1
            data_end = max(data_end, end)
        track["dataEnd"] = data_end
    return track
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Public
# -----------------------------------------------------------------------------

# FUNCTION | Probe One MP4 File (never raises: {"ok": False, "error": ...} instead)
# ------------------------------------------------------------
def Na__Mp4__Probe(path) -> dict:
    path = Path(path)
    try:
        size = path.stat().st_size
        with open(path, "rb") as fh:
            top = Na__Mp4__TopBoxes(fh, size)
            kinds = {k for k, *_ in top}
            if b"ftyp" not in kinds and b"moov" not in kinds:
                return {"ok": False, "error": "not an MP4 file", "sizeBytes": size}
            moov = next((b for b in top if b[0] == b"moov"), None)
            mdat = next((b for b in top if b[0] == b"mdat"), None)
            if not moov:
                return {"ok": False, "error": "no moov box (the file is unfinished or not an MP4)", "sizeBytes": size}
            if moov[3] - moov[2] > NA__MP4__MAX_MOOV_BYTES:
                return {"ok": False, "error": "moov box too large", "sizeBytes": size}
            fh.seek(moov[1] + moov[2])
            buf = fh.read(moov[3] - moov[2])
        if len(buf) < moov[3] - moov[2]:
            return {"ok": False, "error": "the file ends inside its moov box", "sizeBytes": size}

        timescale, duration = 0, 0
        mvhd = Na__Mp4__Find(buf, 0, len(buf), b"mvhd")
        if mvhd:
            timescale, duration = Na__Mp4__TimescaleDuration(buf, mvhd[0])
        tracks = [Na__Mp4__Track(buf, s, e) for k, s, e in Na__Mp4__Children(buf, 0, len(buf)) if k == b"trak"]
        video = next((t for t in tracks if t["handler"] == "vide"), None)
        audio = next((t for t in tracks if t["handler"] == "soun"), None)
        if not video:
            return {"ok": False, "error": "no video track", "sizeBytes": size}

        duration_ms = round(duration * 1000 / timescale) if timescale else 0
        if not duration_ms and video["timescale"]:
            duration_ms = round(video["duration"] * 1000 / video["timescale"])
        data_end = max(t["dataEnd"] for t in tracks)
        return {
            "ok"          : True,
            "sizeBytes"   : size,
            "durationMs"  : duration_ms,
            "width"       : video["width"],
            "height"      : video["height"],
            "fps"         : video["fps"],
            "codec"       : video["codec"],
            "sampleCount" : video["sampleCount"],
            "keyframes"   : video["keyframes"],
            "hasAudio"    : bool(audio),
            "audioCodec"  : audio["codec"] if audio else "",
            "fastStart"   : bool(mdat) and moov[1] < mdat[1],                  # <-- moov first: plays from the first bytes
            "moovOffset"  : moov[1],
            "moovBytes"   : moov[3],
            "complete"    : data_end <= size and data_end > 0,                 # <-- Every listed frame is in the file
            "bitrateKbps" : round(size * 8 / duration_ms) if duration_ms else 0,
        }
    except (OSError, ValueError, struct.error, IndexError) as error:
        return {"ok": False, "error": f"{type(error).__name__}: {error}"}
# ---------------------------------------------------------------

# FUNCTION | Probe With a Cache Keyed by Path, Size and Modified Time
# ------------------------------------------------------------
NA__MP4__CACHE                    = {}                                         # <-- (path, size, mtime_ns) -> probe; this process only
NA__MP4__CACHE_MAX                = 2048

def Na__Mp4__ProbeCached(path) -> dict:
    path = Path(path)
    try:
        st = path.stat()
    except OSError as error:
        return {"ok": False, "error": f"{type(error).__name__}: {error}"}
    key = (str(path), st.st_size, st.st_mtime_ns)
    hit = NA__MP4__CACHE.get(key)
    if hit is None:
        if len(NA__MP4__CACHE) >= NA__MP4__CACHE_MAX:
            NA__MP4__CACHE.clear()
        hit = NA__MP4__CACHE[key] = Na__Mp4__Probe(path)
    return dict(hit, mtimeNs=st.st_mtime_ns)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
