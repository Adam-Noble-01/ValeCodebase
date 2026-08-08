# =============================================================================
# NAAUDIO - BUILD UTILITY | AUDIO LIBRARY INDEX
# =============================================================================
#
# FILE       : NaAudio__BuildUtil__AudioLibraryIndex__.py
# NAMESPACE  : NaAudio
# MODULE     : Dev - WebBuildUtils - AudioLibraryIndex
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Walk the shipped audio banks and regenerate their catalogue indexes
# CREATED    : 08-Aug-2026
#
# DESCRIPTION:
# - Scans the three shipped binary banks and writes one generated index each:
#       05__Data__AudioSampleLibrary       -> NaAudio__SampleLibraryIndex__.json
#       06__Data__AudioLoopLibrary         -> NaAudio__LoopLibraryIndex__.json
#       08__Data__ImpulseResponseLibrary   -> NaAudio__ImpulseResponseIndex__.json
# - The index is the runtime's cheap catalogue. AudioSPACE never sweeps a folder
#   at runtime because a static host has no directory listing, so the index IS
#   the library as far as the browser is concerned. Nothing plays that is not in
#   an index.
# - The index carries only what the spatial modules need to LIST, FILTER and BIND
#   an asset. The audio bytes are fetched and decoded on demand by
#   NaAudio__Library__SampleBank__.mjs.
#
# WHERE THE METADATA COMES FROM
# The filename carries the identity - NaAudio__{Kind}__{AssetId}__{ShortName}__.mp3
# - and the folder carries the classification. Everything else that cannot be
# read off disk (voice role, pitch, suggested tempo, licence attribution) comes
# from the declarative rule tables below, keyed by folder name and short name.
# Add a folder, add a rule. Never hand-edit a generated index.
#
# USAGE:
#     python NaAudio__BuildUtil__AudioLibraryIndex__.py
#     python NaAudio__BuildUtil__AudioLibraryIndex__.py --check
#
#     --check    Exit non-zero if the on-disk index differs from a fresh build.
#                Intended for a pre-commit hook.
#
# =============================================================================

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime

# -----------------------------------------------------------------------------
# REGION | Paths and Constants
# -----------------------------------------------------------------------------

APP_ROOT        = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SAMPLE_LIB_DIR  = os.path.join(APP_ROOT, "05__Data__AudioSampleLibrary")
LOOP_LIB_DIR    = os.path.join(APP_ROOT, "06__Data__AudioLoopLibrary")
IR_LIB_DIR      = os.path.join(APP_ROOT, "08__Data__ImpulseResponseLibrary")

SCHEMA_VERSION  = "1.0.0"
GENERATOR_PATH  = "60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py"

ASSET_FILENAME_PATTERN = re.compile(r"^NaAudio__(Sample|Loop|Ir)__([A-Za-z0-9_]+)__(.+?)__\.(mp3|ogg|wav)$")

AUDIO_EXTENSIONS = (".mp3", ".ogg", ".wav")

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Classification Rules
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Sample Library Category Rules
    # ------------------------------------------------------------
    # Keyed by the exact top-level folder name inside 05__Data__AudioSampleLibrary.
    # BankKind tells the runtime how to treat the folder: a 'kit' folder holds one
    # sub-folder per kit and each kit is bound to a sequencer as a unit; a 'pool'
    # folder is a flat bag of one-shots the user picks from.
SAMPLE_CATEGORY_RULES = {
    "10__Drums__ElectronicKits": {
        "CategoryName" : "Electronic Drum Kits",
        "BankKind"     : "kit",
        "SortOrder"    : 10,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Machine drum kits. Six mapped voices per kit, bound to a sequencer as a unit."
    },
    "20__Drums__AcousticKit": {
        "CategoryName" : "Acoustic Drum Kits",
        "BankKind"     : "kit",
        "SortOrder"    : 20,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Recorded acoustic kits, same six-voice map as the electronic kits."
    },
    "30__Perc__HandDrums": {
        "CategoryName" : "Hand Percussion",
        "BankKind"     : "kit",
        "SortOrder"    : 30,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Bongos, congas and djembe. Kit-mapped so a percussion lane drops onto a sequencer unchanged."
    },
    "40__Tonal__GrandPiano": {
        "CategoryName" : "Grand Piano",
        "BankKind"     : "multisample",
        "SortOrder"    : 40,
        "SourceKey"    : "Holm__SalamanderGrandPiano",
        "Description"  : "Salamander Grand Piano sampled at minor thirds. Pitch-shifted between sample points by the sample player."
    },
    "50__Tonal__SynthOneShots": {
        "CategoryName" : "Synth One-Shots",
        "BankKind"     : "pool",
        "SortOrder"    : 50,
        "SourceKey"    : "Berklee__OlpcSoundLibrary",
        "Description"  : "Analogue and FM synth hits, pads and basses. Raw material for the CubeMod and DelayCloud demos."
    },
    "60__Fx__ObjectHits": {
        "CategoryName" : "Object Hits and Effects",
        "BankKind"     : "pool",
        "SortOrder"    : 60,
        "SourceKey"    : "Berklee__OlpcSoundLibrary",
        "Description"  : "Claps, bells, blocks and impacts. Struck-object material for the percussive lanes."
    }
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Loop Library Category Rules
    # ------------------------------------------------------------
LOOP_CATEGORY_RULES = {
    "10__Loops__Breakbeat": {
        "CategoryName" : "Breakbeats",
        "SortOrder"    : 10,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Sampled drum breaks. Tempo-synced by the transport when a loop is bound to a space."
    },
    "20__Loops__Atmospheric": {
        "CategoryName" : "Atmospheric Beds",
        "SortOrder"    : 20,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Long unpitched textures. Intended as the bed a space is built on top of."
    },
    "30__Loops__Tonal": {
        "CategoryName" : "Tonal Loops",
        "SortOrder"    : 30,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Pitched chord and organ loops. Key-tagged so the harmony modules can follow them."
    }
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Impulse Response Category Rules
    # ------------------------------------------------------------
IR_CATEGORY_RULES = {
    "10__Ir__Rooms": {
        "CategoryName" : "Rooms",
        "SortOrder"    : 10,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Plausible room responses. The SpatialReverb module maps its cage volume onto this set."
    },
    "20__Ir__Unnatural": {
        "CategoryName" : "Unnatural Spaces",
        "SortOrder"    : 20,
        "SourceKey"    : "GoogleChromeLabs__WebAudioSamples",
        "Description"  : "Combs, springs, reversals and metallic blooms. Spaces that could not exist."
    }
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Voice Role Map
    # ------------------------------------------------------------
    # Short name to the stable role a sequencer lane binds to. The role must not
    # change when the kit behind it changes, or every saved space breaks.
VOICE_ROLE_MAP = {
    "Kick"    : ("kick",    10),
    "Snare"   : ("snare",   20),
    "HiHat"   : ("hihat",   30),
    "TomLow"  : ("tomLow",  40),
    "TomMid"  : ("tomMid",  50),
    "TomHigh" : ("tomHigh", 60)
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Licence Sources
    # ------------------------------------------------------------
    # Mirrors the SOURCES table in the ingest script, re-keyed by the name that
    # reads best in a catalogue entry. Every generated index carries this block,
    # so attribution travels with the data rather than living only in a README.
LICENCE_SOURCES = {
    "Berklee__OlpcSoundLibrary": {
        "Attribution" : "Berklee College of Music / OLPC Sound Library",
        "Licence"     : "CC BY 3.0",
        "LicenceUrl"  : "https://creativecommons.org/licenses/by/3.0/",
        "SourcedVia"  : "https://github.com/Tonejs/audio"
    },
    "Holm__SalamanderGrandPiano": {
        "Attribution" : "Salamander Grand Piano by Alexander Holm",
        "Licence"     : "CC BY 3.0",
        "LicenceUrl"  : "https://creativecommons.org/licenses/by/3.0/",
        "SourcedVia"  : "https://github.com/Tonejs/audio"
    },
    "GoogleChromeLabs__WebAudioSamples": {
        "Attribution" : "GoogleChromeLabs / web-audio-samples",
        "Licence"     : "Apache-2.0",
        "LicenceUrl"  : "https://www.apache.org/licenses/LICENSE-2.0",
        "SourcedVia"  : "https://github.com/Tonejs/audio"
    }
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Loop Tempo and Bar Hints
    # ------------------------------------------------------------
    # A loop file carries no tempo. These hints came off the ingest curation table
    # and let the transport time-stretch a loop into the project tempo on load.
LOOP_HINTS = {
    "BreakTwelve"      : {"SuggestedBpm": 110, "BarCount": 2, "MusicalKey": None},
    "BreakTwentyEight" : {"SuggestedBpm": 105, "BarCount": 2, "MusicalKey": None},
    "BreakTwentyNine"  : {"SuggestedBpm": 100, "BarCount": 2, "MusicalKey": None},
    "CoolLoopSeven"    : {"SuggestedBpm":  95, "BarCount": 1, "MusicalKey": None},
    "BreakbeatClassic" : {"SuggestedBpm": 120, "BarCount": 2, "MusicalKey": None},
    "HandDrumLoop"     : {"SuggestedBpm": 100, "BarCount": 2, "MusicalKey": None},
    "Ominous"          : {"SuggestedBpm":  90, "BarCount": 4, "MusicalKey": "Cm"},
    "BlueYellow"       : {"SuggestedBpm":  90, "BarCount": 4, "MusicalKey": "Am"},
    "OrganEchoChords"  : {"SuggestedBpm":  90, "BarCount": 4, "MusicalKey": "Am"}
}
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Filename and Metadata Derivation
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Parse a NaAudio Asset Filename
    # ------------------------------------------------------------
def NaAudio__Index__ParseFilename(filename):
    match = ASSET_FILENAME_PATTERN.match(filename)
    if not match:
        return None
    return {
        "Kind"      : match.group(1),
        "AssetId"   : match.group(2),
        "ShortName" : match.group(3),
        "Extension" : match.group(4)
    }
    # ------------------------------------------------------------


    # HELPER FUNCTION | Split a CamelCase Short Name into Display Words
    # ------------------------------------------------------------
    # 'GrandPianoDs4' reads as 'Grand Piano Ds4' rather than being carried through
    # as one run-together token in the UI.
def NaAudio__Index__DisplayNameFromShortName(short_name):
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", short_name)
    spaced = re.sub(r"(?<=[A-Za-z])(?=[0-9])", " ", spaced)
    return spaced.strip()
    # ------------------------------------------------------------


    # HELPER FUNCTION | Derive a Pitch Note From a Multisample Short Name
    # ------------------------------------------------------------
    # 'GrandPianoDs4' -> 'D#4'. Returns None for anything that does not end in a
    # note plus octave, so a pool sample is simply untuned.
def NaAudio__Index__PitchFromShortName(short_name):
    match = re.search(r"([A-G])(s?)(\d)$", short_name)
    if not match:
        return None
    accidental = "#" if match.group(2) == "s" else ""
    return f"{match.group(1)}{accidental}{match.group(3)}"
    # ------------------------------------------------------------


    # HELPER FUNCTION | MIDI Note Number for a Pitch Name
    # ------------------------------------------------------------
def NaAudio__Index__MidiNoteFromPitch(pitch):
    if not pitch:
        return None
    semitones = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
                 "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    match = re.match(r"^([A-G]#?)(\d)$", pitch)
    if not match:
        return None
    return semitones[match.group(1)] + (int(match.group(2)) + 1) * 12          # <-- MIDI 60 = C4
    # ------------------------------------------------------------


    # HELPER FUNCTION | List Audio Files in a Folder, Sorted
    # ------------------------------------------------------------
def NaAudio__Index__ListAudioFiles(folder):
    if not os.path.isdir(folder):
        return []
    names = [name for name in os.listdir(folder) if name.lower().endswith(AUDIO_EXTENSIONS)]
    return sorted(names)
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Sample Library Index
# -----------------------------------------------------------------------------

    # SUB FUNCTION | Build One Sample Entry
    # ------------------------------------------------------------
def NaAudio__Index__SampleEntry(parsed, category_id, rules, json_url, byte_size, kit_id):
    pitch      = NaAudio__Index__PitchFromShortName(parsed["ShortName"])
    role, sort = VOICE_ROLE_MAP.get(parsed["ShortName"], (None, 500))

    return {
        "AssetId"      : parsed["AssetId"],
        "Name"         : NaAudio__Index__DisplayNameFromShortName(parsed["ShortName"]),
        "ShortName"    : parsed["ShortName"],
        "CategoryId"   : category_id,
        "CategoryName" : rules["CategoryName"],
        "KitId"        : kit_id,
        "AudioUrl"     : json_url,
        "VoiceRole"    : role,
        "SortOrder"    : sort,
        "PitchNote"    : pitch,
        "MidiNote"     : NaAudio__Index__MidiNoteFromPitch(pitch),
        "ByteSize"     : byte_size,
        "SourceKey"    : rules["SourceKey"]
    }
    # ------------------------------------------------------------


    # FUNCTION | Build the Sample Library Index
    # ------------------------------------------------------------
def NaAudio__Index__BuildSampleIndex():
    categories = []
    kits       = []
    samples    = []
    warnings   = []

    for category_id in sorted(SAMPLE_CATEGORY_RULES.keys()):
        rules        = SAMPLE_CATEGORY_RULES[category_id]
        category_dir = os.path.join(SAMPLE_LIB_DIR, category_id)
        if not os.path.isdir(category_dir):
            warnings.append(f"Category folder missing on disk: {category_id}")
            continue

        categories.append({
            "CategoryId"   : category_id,
            "CategoryName" : rules["CategoryName"],
            "FolderName"   : category_id,
            "BankKind"     : rules["BankKind"],
            "SortOrder"    : rules["SortOrder"],
            "Description"  : rules["Description"],
            "SourceKey"    : rules["SourceKey"]
        })

        # LOOSE FILES DIRECTLY IN THE CATEGORY FOLDER
        for filename in NaAudio__Index__ListAudioFiles(category_dir):
            parsed = NaAudio__Index__ParseFilename(filename)
            if not parsed:
                warnings.append(f"Unparseable filename skipped: {category_id}/{filename}")
                continue
            samples.append(NaAudio__Index__SampleEntry(
                parsed, category_id, rules,
                f"{category_id}/{filename}",
                os.path.getsize(os.path.join(category_dir, filename)),
                None))

        # KIT SUB-FOLDERS
        for kit_folder in sorted(entry for entry in os.listdir(category_dir)
                                 if os.path.isdir(os.path.join(category_dir, entry))):
            kit_dir   = os.path.join(category_dir, kit_folder)
            kit_files = NaAudio__Index__ListAudioFiles(kit_dir)
            if not kit_files:
                continue

            kit_id = kit_folder.replace("KIT__", "KIT_")
            kits.append({
                "KitId"        : kit_id,
                "Name"         : NaAudio__Index__DisplayNameFromShortName(kit_folder.replace("KIT__", "")),
                "CategoryId"   : category_id,
                "FolderName"   : f"{category_id}/{kit_folder}",
                "VoiceCount"   : len(kit_files),
                "SourceKey"    : rules["SourceKey"]
            })

            for filename in kit_files:
                parsed = NaAudio__Index__ParseFilename(filename)
                if not parsed:
                    warnings.append(f"Unparseable filename skipped: {category_id}/{kit_folder}/{filename}")
                    continue
                samples.append(NaAudio__Index__SampleEntry(
                    parsed, category_id, rules,
                    f"{category_id}/{kit_folder}/{filename}",
                    os.path.getsize(os.path.join(kit_dir, filename)),
                    kit_id))

    samples.sort(key=lambda entry: (entry["CategoryId"], entry["KitId"] or "", entry["SortOrder"], entry["AssetId"]))

    return {
        "NaAudio__SampleLibraryIndex__Meta": {
            "GeneratedBy"    : GENERATOR_PATH,
            "GeneratedDate"  : datetime.now().strftime("%d-%b-%Y at %H:%M"),
            "SchemaVersion"  : SCHEMA_VERSION,
            "LibraryRoot"    : "05__Data__AudioSampleLibrary/",
            "CategoryCount"  : len(categories),
            "KitCount"       : len(kits),
            "SampleCount"    : len(samples),
            "DoNotEditByHand": True,
            "Warnings"       : warnings
        },
        "NaAudio__SampleLibraryIndex__Sources"    : LICENCE_SOURCES,
        "NaAudio__SampleLibraryIndex__Categories" : sorted(categories, key=lambda entry: entry["SortOrder"]),
        "NaAudio__SampleLibraryIndex__Kits"       : kits,
        "NaAudio__SampleLibraryIndex__Samples"    : samples
    }
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Loop Library Index
# -----------------------------------------------------------------------------

    # FUNCTION | Build the Loop Library Index
    # ------------------------------------------------------------
def NaAudio__Index__BuildLoopIndex():
    categories = []
    loops      = []
    warnings   = []

    for category_id in sorted(LOOP_CATEGORY_RULES.keys()):
        rules        = LOOP_CATEGORY_RULES[category_id]
        category_dir = os.path.join(LOOP_LIB_DIR, category_id)
        if not os.path.isdir(category_dir):
            warnings.append(f"Category folder missing on disk: {category_id}")
            continue

        categories.append({
            "CategoryId"   : category_id,
            "CategoryName" : rules["CategoryName"],
            "FolderName"   : category_id,
            "SortOrder"    : rules["SortOrder"],
            "Description"  : rules["Description"],
            "SourceKey"    : rules["SourceKey"]
        })

        for filename in NaAudio__Index__ListAudioFiles(category_dir):
            parsed = NaAudio__Index__ParseFilename(filename)
            if not parsed:
                warnings.append(f"Unparseable filename skipped: {category_id}/{filename}")
                continue

            hints = LOOP_HINTS.get(parsed["ShortName"], {"SuggestedBpm": None, "BarCount": None, "MusicalKey": None})
            loops.append({
                "AssetId"      : parsed["AssetId"],
                "Name"         : NaAudio__Index__DisplayNameFromShortName(parsed["ShortName"]),
                "ShortName"    : parsed["ShortName"],
                "CategoryId"   : category_id,
                "CategoryName" : rules["CategoryName"],
                "AudioUrl"     : f"{category_id}/{filename}",
                "SuggestedBpm" : hints["SuggestedBpm"],
                "BarCount"     : hints["BarCount"],
                "MusicalKey"   : hints["MusicalKey"],
                "ByteSize"     : os.path.getsize(os.path.join(category_dir, filename)),
                "SourceKey"    : rules["SourceKey"]
            })

    loops.sort(key=lambda entry: (entry["CategoryId"], entry["AssetId"]))

    return {
        "NaAudio__LoopLibraryIndex__Meta": {
            "GeneratedBy"    : GENERATOR_PATH,
            "GeneratedDate"  : datetime.now().strftime("%d-%b-%Y at %H:%M"),
            "SchemaVersion"  : SCHEMA_VERSION,
            "LibraryRoot"    : "06__Data__AudioLoopLibrary/",
            "CategoryCount"  : len(categories),
            "LoopCount"      : len(loops),
            "DoNotEditByHand": True,
            "TempoNote"      : "SuggestedBpm and BarCount are hand-declared hints held in the generator, not measured from the audio. A loop with a null SuggestedBpm is played at its recorded rate and is not tempo-synced.",
            "Warnings"       : warnings
        },
        "NaAudio__LoopLibraryIndex__Sources"    : LICENCE_SOURCES,
        "NaAudio__LoopLibraryIndex__Categories" : sorted(categories, key=lambda entry: entry["SortOrder"]),
        "NaAudio__LoopLibraryIndex__Loops"      : loops
    }
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Impulse Response Index
# -----------------------------------------------------------------------------

    # FUNCTION | Build the Impulse Response Index
    # ------------------------------------------------------------
def NaAudio__Index__BuildImpulseResponseIndex():
    categories = []
    responses  = []
    warnings   = []

    for category_id in sorted(IR_CATEGORY_RULES.keys()):
        rules        = IR_CATEGORY_RULES[category_id]
        category_dir = os.path.join(IR_LIB_DIR, category_id)
        if not os.path.isdir(category_dir):
            warnings.append(f"Category folder missing on disk: {category_id}")
            continue

        categories.append({
            "CategoryId"   : category_id,
            "CategoryName" : rules["CategoryName"],
            "FolderName"   : category_id,
            "SortOrder"    : rules["SortOrder"],
            "Description"  : rules["Description"],
            "SourceKey"    : rules["SourceKey"]
        })

        for filename in NaAudio__Index__ListAudioFiles(category_dir):
            parsed = NaAudio__Index__ParseFilename(filename)
            if not parsed:
                warnings.append(f"Unparseable filename skipped: {category_id}/{filename}")
                continue

            responses.append({
                "AssetId"      : parsed["AssetId"],
                "Name"         : NaAudio__Index__DisplayNameFromShortName(parsed["ShortName"]),
                "ShortName"    : parsed["ShortName"],
                "CategoryId"   : category_id,
                "CategoryName" : rules["CategoryName"],
                "AudioUrl"     : f"{category_id}/{filename}",
                "ByteSize"     : os.path.getsize(os.path.join(category_dir, filename)),
                "SourceKey"    : rules["SourceKey"]
            })

    responses.sort(key=lambda entry: (entry["CategoryId"], entry["AssetId"]))

    return {
        "NaAudio__ImpulseResponseIndex__Meta": {
            "GeneratedBy"    : GENERATOR_PATH,
            "GeneratedDate"  : datetime.now().strftime("%d-%b-%Y at %H:%M"),
            "SchemaVersion"  : SCHEMA_VERSION,
            "LibraryRoot"    : "08__Data__ImpulseResponseLibrary/",
            "CategoryCount"  : len(categories),
            "ResponseCount"  : len(responses),
            "DoNotEditByHand": True,
            "Warnings"       : warnings
        },
        "NaAudio__ImpulseResponseIndex__Sources"    : LICENCE_SOURCES,
        "NaAudio__ImpulseResponseIndex__Categories" : sorted(categories, key=lambda entry: entry["SortOrder"]),
        "NaAudio__ImpulseResponseIndex__Responses"  : responses
    }
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Strip the Volatile Fields Before Comparing Two Indexes
    # ------------------------------------------------------------
    # GeneratedDate changes on every run, so a --check that compared raw text
    # would fail every time and teach everybody to ignore it.
def NaAudio__Index__StableForm(document):
    clone = json.loads(json.dumps(document))
    for key in clone:
        if key.endswith("__Meta") and isinstance(clone[key], dict):
            clone[key].pop("GeneratedDate", None)
    return json.dumps(clone, sort_keys=True)
    # ------------------------------------------------------------


    # SUB FUNCTION | Write or Check One Index File
    # ------------------------------------------------------------
def NaAudio__Index__Emit(document, output_path, check_only):
    label = os.path.relpath(output_path, APP_ROOT).replace(os.sep, "/")

    if check_only:
        if not os.path.isfile(output_path):
            print(f"  [STALE] {label} does not exist")
            return False
        with open(output_path, "r", encoding="utf-8") as handle:
            existing = json.load(handle)
        if NaAudio__Index__StableForm(existing) != NaAudio__Index__StableForm(document):
            print(f"  [STALE] {label} differs from a fresh build")
            return False
        print(f"  [OK]    {label}")
        return True

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(document, handle, indent=4)
    print(f"  [WRITE] {label}")
    return True
    # ------------------------------------------------------------


    # FUNCTION | Regenerate Every Audio Library Index
    # ------------------------------------------------------------
def NaAudio__Index__Main():
    parser = argparse.ArgumentParser(description="Regenerate the AudioSPACE shipped audio bank indexes.")
    parser.add_argument("--check", action="store_true", help="Exit non-zero if any index is stale")
    args = parser.parse_args()

    print("=" * 77)
    print(" NAAUDIO - AUDIO LIBRARY INDEX BUILD")
    print("=" * 77)

    outputs = [
        (NaAudio__Index__BuildSampleIndex(),           os.path.join(SAMPLE_LIB_DIR, "NaAudio__SampleLibraryIndex__.json")),
        (NaAudio__Index__BuildLoopIndex(),             os.path.join(LOOP_LIB_DIR,   "NaAudio__LoopLibraryIndex__.json")),
        (NaAudio__Index__BuildImpulseResponseIndex(),  os.path.join(IR_LIB_DIR,     "NaAudio__ImpulseResponseIndex__.json"))
    ]

    all_ok       = True
    all_warnings = []
    for document, output_path in outputs:
        meta_key = next(key for key in document if key.endswith("__Meta"))
        all_warnings.extend(document[meta_key]["Warnings"])
        if not NaAudio__Index__Emit(document, output_path, args.check):
            all_ok = False

    print("-" * 77)
    for document, _ in outputs:
        meta_key = next(key for key in document if key.endswith("__Meta"))
        meta     = document[meta_key]
        counts   = {key: value for key, value in meta.items() if key.endswith("Count")}
        print(f" {meta['LibraryRoot']:<38} {counts}")

    if all_warnings:
        print("-" * 77)
        print(f" WARNINGS ({len(all_warnings)}):")
        for warning in all_warnings:
            print(f"   - {warning}")

    print("=" * 77)
    return 0 if all_ok else 1
    # ------------------------------------------------------------


if __name__ == "__main__":
    sys.exit(NaAudio__Index__Main())

# endregion -------------------------------------------------------------------
