# =============================================================================
# NAAUDIO - ASSET AUTHORING | SAMPLE LIBRARY INGEST
# =============================================================================
#
# FILE       : NaAudio__AssetAuthoring__SampleLibraryIngest__.py
# NAMESPACE  : NaAudio
# MODULE     : Dev - AssetAuthoring - SampleLibraryIngest
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Pull curated open-licence audio off GitHub into the shipped banks
# CREATED    : 08-Aug-2026
#
# DESCRIPTION:
# - AudioSPACE ships a small starter bank so a first run has something to play
#   before any user library exists. This script is how that bank was built, and
#   is the only sanctioned way to rebuild or extend it.
# - Source material is cloned from public GitHub repositories, curated down to a
#   deliberately tiny subset, then renamed into the NaAudio asset convention:
#       NaAudio__Sample__{AssetId}__{ShortName}__.mp3
#       NaAudio__Loop__{AssetId}__{ShortName}__.mp3
#       NaAudio__Ir__{AssetId}__{ShortName}__.mp3
# - LICENCE IS NOT OPTIONAL. Every entry in the curation table below carries a
#   SourceKey pointing at a SOURCES record, and every SOURCES record carries a
#   licence and an attribution line. Files whose licence forbids commercial use
#   are excluded on purpose - see the EXCLUDED note at the foot of SOURCES.
# - The script only MOVES BYTES AND RENAMES. It does not write the catalogue
#   index; that is generated separately from whatever is on disk by
#   60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py, so the
#   index can never drift from the files.
#
# WHY A CURATION TABLE AND NOT A FOLDER SWEEP
# The upstream repositories are large - the Tone.js audio repo alone is 333 MB,
# and the Berklee collection is 2,398 files. A sweep would drag all of it into a
# git repository that has to stay servable as a static site. The table names
# every single file that ships, so the bank stays a few megabytes and every byte
# in the repo is one somebody chose.
#
# USAGE:
#     python NaAudio__AssetAuthoring__SampleLibraryIngest__.py --clone
#     python NaAudio__AssetAuthoring__SampleLibraryIngest__.py --source <dir>
#
#     --clone            Shallow-clone the source repos into a scratch folder
#     --source <dir>     Reuse an existing clone parent folder instead
#     --scratch <dir>    Where clones live (default: ./__ingest_scratch)
#     --dry-run          Report what would be written, write nothing
#
# =============================================================================

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime

# -----------------------------------------------------------------------------
# REGION | Paths and Constants
# -----------------------------------------------------------------------------

APP_ROOT          = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE_LIB_DIR    = os.path.join(APP_ROOT, "05__Data__AudioSampleLibrary")
LOOP_LIB_DIR      = os.path.join(APP_ROOT, "06__Data__AudioLoopLibrary")
IR_LIB_DIR        = os.path.join(APP_ROOT, "08__Data__ImpulseResponseLibrary")

INGEST_REPORT     = os.path.join(APP_ROOT, "61__Dev__AssetAuthoring__SampleLibraryIngest",
                                 "NaAudio__AssetAuthoring__IngestReport__.json")

SCHEMA_VERSION    = "1.0.0"

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Source Repositories and Licences
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Upstream Sources - One Record Per Licence Boundary
    # ------------------------------------------------------------
    # Attribution is copied verbatim into every bank manifest the build utility
    # writes, and into 05__Data__AudioSampleLibrary/NaAudio__AudioLibrary__ATTRIBUTION__.md.
SOURCES = {
    "TonejsAudio__Berklee": {
        "Repository"    : "https://github.com/Tonejs/audio",
        "RepoFolder"    : "tonejs-audio",
        "SubPath"       : "berklee",
        "Origin"        : "OLPC Berklee Sound Library - http://wiki.laptop.org/go/Sound_samples",
        "Licence"       : "CC BY 3.0",
        "LicenceUrl"    : "https://creativecommons.org/licenses/by/3.0/",
        "Attribution"   : "Berklee College of Music / OLPC Sound Library, CC BY 3.0, via github.com/Tonejs/audio",
        "CommercialOk"  : True
    },
    "TonejsAudio__Salamander": {
        "Repository"    : "https://github.com/Tonejs/audio",
        "RepoFolder"    : "tonejs-audio",
        "SubPath"       : "salamander",
        "Origin"        : "Salamander Grand Piano - Alexander Holm",
        "Licence"       : "CC BY 3.0",
        "LicenceUrl"    : "https://creativecommons.org/licenses/by/3.0/",
        "Attribution"   : "Salamander Grand Piano by Alexander Holm, CC BY 3.0, via github.com/Tonejs/audio",
        "CommercialOk"  : True
    },
    "TonejsAudio__DrumSamples": {
        "Repository"    : "https://github.com/Tonejs/audio",
        "RepoFolder"    : "tonejs-audio",
        "SubPath"       : "drum-samples",
        "Origin"        : "GoogleChromeLabs/web-audio-samples (formerly cwilso/web-audio-samples)",
        "Licence"       : "Apache-2.0",
        "LicenceUrl"    : "https://www.apache.org/licenses/LICENSE-2.0",
        "Attribution"   : "GoogleChromeLabs/web-audio-samples, Apache-2.0, via github.com/Tonejs/audio",
        "CommercialOk"  : True
    },
    "TonejsAudio__ImpulseResponses": {
        "Repository"    : "https://github.com/Tonejs/audio",
        "RepoFolder"    : "tonejs-audio",
        "SubPath"       : "impulse-responses",
        "Origin"        : "GoogleChromeLabs/web-audio-samples (formerly cwilso/web-audio-samples)",
        "Licence"       : "Apache-2.0",
        "LicenceUrl"    : "https://www.apache.org/licenses/LICENSE-2.0",
        "Attribution"   : "GoogleChromeLabs/web-audio-samples, Apache-2.0, via github.com/Tonejs/audio",
        "CommercialOk"  : True
    }
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Deliberate Exclusions
    # ------------------------------------------------------------
    # Kept here rather than deleted, so the next person to look for these knows
    # they were considered and why they are absent.
EXCLUDED = {
    "tonejs-audio/loop"  : "CC BY-NC-SA 4.0 (Yotam Mann) - non-commercial clause. AudioSPACE may ship commercially, so NC material cannot enter the shipped bank.",
    "tonejs-audio/casio" : "CC BY-NC-SA 4.0 (Yotam Mann) - same reason."
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Repositories to Shallow Clone
    # ------------------------------------------------------------
CLONE_TARGETS = {
    "tonejs-audio" : "https://github.com/Tonejs/audio.git"
}
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Curation Table - Every File That Ships
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Drum Kit Layout
    # ------------------------------------------------------------
    # Every kit upstream carries the same six files, so the kit table names the
    # folder once and the voice map is shared. VoiceRole is what the sequencer
    # binds a lane to - it must stay stable even if the kit behind it changes.
KIT_VOICE_MAP = [
    ("kick.mp3",  "Kick",     "kick",     10),
    ("snare.mp3", "Snare",    "snare",    20),
    ("hihat.mp3", "HiHat",    "hihat",    30),
    ("tom1.mp3",  "TomLow",   "tomLow",   40),
    ("tom2.mp3",  "TomMid",   "tomMid",   50),
    ("tom3.mp3",  "TomHigh",  "tomHigh",  60)
]

DRUM_KITS = [
    # (SourceKey,                    UpstreamKit,     TargetCategory,               KitFolder,             KitName,                  IdBlock)
    ("TonejsAudio__DrumSamples",     "CR78",          "10__Drums__ElectronicKits",  "KIT__Cr78",           "CR-78 Electronic Kit",   101),
    ("TonejsAudio__DrumSamples",     "LINN",          "10__Drums__ElectronicKits",  "KIT__Linn",           "LinnDrum Kit",           102),
    ("TonejsAudio__DrumSamples",     "KPR77",         "10__Drums__ElectronicKits",  "KIT__Kpr77",          "KPR-77 Kit",             103),
    ("TonejsAudio__DrumSamples",     "Techno",        "10__Drums__ElectronicKits",  "KIT__Techno",         "Techno Kit",             104),
    ("TonejsAudio__DrumSamples",     "4OP-FM",        "10__Drums__ElectronicKits",  "KIT__FourOpFm",       "Four Operator FM Kit",   105),
    ("TonejsAudio__DrumSamples",     "acoustic-kit",  "20__Drums__AcousticKit",     "KIT__AcousticStudio", "Acoustic Studio Kit",    201),
    ("TonejsAudio__DrumSamples",     "Bongos",        "30__Perc__HandDrums",        "KIT__Bongos",         "Bongo and Hand Kit",     301)
]
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Loose One-Shot Samples
    # ------------------------------------------------------------
    # (SourceKey, UpstreamRelPath, TargetCategory, AssetId, ShortName, DisplayName, VoiceRole, PitchNote)
LOOSE_SAMPLES = [
    ("TonejsAudio__DrumSamples", "Djembe.mp3",                    "30__Perc__HandDrums",      "SMP_PRC0311", "Djembe",            "Djembe",                  "perc",   None),

    ("TonejsAudio__Salamander",  "C2.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0402", "GrandPianoC2",      "Grand Piano - C2",        "tonal",  "C2"),
    ("TonejsAudio__Salamander",  "Ds2.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0403", "GrandPianoDs2",     "Grand Piano - D#2",       "tonal",  "D#2"),
    ("TonejsAudio__Salamander",  "Fs2.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0404", "GrandPianoFs2",     "Grand Piano - F#2",       "tonal",  "F#2"),
    ("TonejsAudio__Salamander",  "A2.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0405", "GrandPianoA2",      "Grand Piano - A2",        "tonal",  "A2"),
    ("TonejsAudio__Salamander",  "C3.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0406", "GrandPianoC3",      "Grand Piano - C3",        "tonal",  "C3"),
    ("TonejsAudio__Salamander",  "Ds3.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0407", "GrandPianoDs3",     "Grand Piano - D#3",       "tonal",  "D#3"),
    ("TonejsAudio__Salamander",  "Fs3.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0408", "GrandPianoFs3",     "Grand Piano - F#3",       "tonal",  "F#3"),
    ("TonejsAudio__Salamander",  "A3.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0409", "GrandPianoA3",      "Grand Piano - A3",        "tonal",  "A3"),
    ("TonejsAudio__Salamander",  "C4.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0410", "GrandPianoC4",      "Grand Piano - C4",        "tonal",  "C4"),
    ("TonejsAudio__Salamander",  "Ds4.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0411", "GrandPianoDs4",     "Grand Piano - D#4",       "tonal",  "D#4"),
    ("TonejsAudio__Salamander",  "Fs4.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0412", "GrandPianoFs4",     "Grand Piano - F#4",       "tonal",  "F#4"),
    ("TonejsAudio__Salamander",  "A4.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0413", "GrandPianoA4",      "Grand Piano - A4",        "tonal",  "A4"),
    ("TonejsAudio__Salamander",  "C5.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0414", "GrandPianoC5",      "Grand Piano - C5",        "tonal",  "C5"),
    ("TonejsAudio__Salamander",  "Ds5.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0415", "GrandPianoDs5",     "Grand Piano - D#5",       "tonal",  "D#5"),
    ("TonejsAudio__Salamander",  "Fs5.mp3",                       "40__Tonal__GrandPiano",    "SMP_PNO0416", "GrandPianoFs5",     "Grand Piano - F#5",       "tonal",  "F#5"),
    ("TonejsAudio__Salamander",  "A5.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0417", "GrandPianoA5",      "Grand Piano - A5",        "tonal",  "A5"),
    ("TonejsAudio__Salamander",  "C6.mp3",                        "40__Tonal__GrandPiano",    "SMP_PNO0418", "GrandPianoC6",      "Grand Piano - C6",        "tonal",  "C6"),

    ("TonejsAudio__Berklee",     "Analogsynth2_low.mp3",          "50__Tonal__SynthOneShots", "SMP_SYN0501", "AnalogueSynthLow",  "Analogue Synth - Low",    "tonal",  None),
    ("TonejsAudio__Berklee",     "Analogsynth2_lowmid.mp3",       "50__Tonal__SynthOneShots", "SMP_SYN0502", "AnalogueSynthLowMid","Analogue Synth - Low Mid","tonal",  None),
    ("TonejsAudio__Berklee",     "Analogsynth2_mid.mp3",          "50__Tonal__SynthOneShots", "SMP_SYN0503", "AnalogueSynthMid",  "Analogue Synth - Mid",    "tonal",  None),
    ("TonejsAudio__Berklee",     "Analogsynth2_highmid.mp3",      "50__Tonal__SynthOneShots", "SMP_SYN0504", "AnalogueSynthHighMid","Analogue Synth - High Mid","tonal", None),
    ("TonejsAudio__Berklee",     "Analogsynth2_high.mp3",         "50__Tonal__SynthOneShots", "SMP_SYN0505", "AnalogueSynthHigh", "Analogue Synth - High",   "tonal",  None),
    ("TonejsAudio__Berklee",     "Shortsynth_low.mp3",            "50__Tonal__SynthOneShots", "SMP_SYN0511", "ShortSynthLow",     "Short Synth - Low",       "tonal",  None),
    ("TonejsAudio__Berklee",     "Shortsynth_mid.mp3",            "50__Tonal__SynthOneShots", "SMP_SYN0512", "ShortSynthMid",     "Short Synth - Mid",       "tonal",  None),
    ("TonejsAudio__Berklee",     "Shortsynth_high.mp3",           "50__Tonal__SynthOneShots", "SMP_SYN0513", "ShortSynthHigh",    "Short Synth - High",      "tonal",  None),
    ("TonejsAudio__Berklee",     "Longsynth2.mp3",                "50__Tonal__SynthOneShots", "SMP_SYN0521", "LongSynthPad",      "Long Synth Pad",          "pad",    None),
    ("TonejsAudio__Berklee",     "Longsynth5.mp3",                "50__Tonal__SynthOneShots", "SMP_SYN0522", "LongSynthDrone",    "Long Synth Drone",        "pad",    None),
    ("TonejsAudio__Berklee",     "FM_doublebass2.mp3",            "50__Tonal__SynthOneShots", "SMP_SYN0531", "FmSubBass",         "FM Sub Bass",             "bass",   None),
    ("TonejsAudio__Berklee",     "FM_dubhit1.mp3",                "50__Tonal__SynthOneShots", "SMP_SYN0532", "FmDubHit",          "FM Dub Hit",              "bass",   None),
    ("TonejsAudio__Berklee",     "Kalimba_1.mp3",                 "50__Tonal__SynthOneShots", "SMP_SYN0541", "KalimbaOne",        "Kalimba - One",           "tonal",  None),
    ("TonejsAudio__Berklee",     "Kalimba_3.mp3",                 "50__Tonal__SynthOneShots", "SMP_SYN0542", "KalimbaThree",      "Kalimba - Three",         "tonal",  None),

    ("TonejsAudio__Berklee",     "Clap1.mp3",                     "60__Fx__ObjectHits",       "SMP_FXH0601", "HandClap",          "Hand Clap",               "clap",   None),
    ("TonejsAudio__Berklee",     "Clap3.mp3",                     "60__Fx__ObjectHits",       "SMP_FXH0602", "HandClapRoom",      "Hand Clap - Room",        "clap",   None),
    ("TonejsAudio__Berklee",     "Pling1.mp3",                    "60__Fx__ObjectHits",       "SMP_FXH0611", "Pling",             "Pling",                   "perc",   None),
    ("TonejsAudio__Berklee",     "bell1a.mp3",                    "60__Fx__ObjectHits",       "SMP_FXH0612", "SmallBell",         "Small Bell",              "perc",   None),
    ("TonejsAudio__Berklee",     "chimes-singlenote.mp3",          "60__Fx__ObjectHits",      "SMP_FXH0613", "ChimeSingleNote",   "Chime - Single Note",     "perc",   None),
    ("TonejsAudio__Berklee",     "woodblock_pitched-do.mp3",       "60__Fx__ObjectHits",       "SMP_FXH0614", "WoodBlock",         "Wood Block",              "perc",   None),
    ("TonejsAudio__Berklee",     "NaturalReverbHit.mp3",          "60__Fx__ObjectHits",       "SMP_FXH0621", "NaturalReverbHit",  "Natural Reverb Hit",      "impact", None),
    ("TonejsAudio__Berklee",     "Resonant_FM_laser1.mp3",        "60__Fx__ObjectHits",       "SMP_FXH0622", "ResonantFmLaser",   "Resonant FM Laser",       "impact", None),
    ("TonejsAudio__Berklee",     "glasshit1.mp3",                 "60__Fx__ObjectHits",       "SMP_FXH0623", "GlassHit",          "Glass Hit",               "impact", None),
    ("TonejsAudio__Berklee",     "cowbell1_big.mp3",              "60__Fx__ObjectHits",       "SMP_FXH0631", "Cowbell",           "Cowbell",                 "perc",   None),
    ("TonejsAudio__Berklee",     "shaker1.mp3",                   "60__Fx__ObjectHits",       "SMP_FXH0632", "Shaker",            "Shaker",                  "perc",   None),
    ("TonejsAudio__Berklee",     "tambourine1.mp3",               "60__Fx__ObjectHits",       "SMP_FXH0633", "Tambourine",        "Tambourine",              "perc",   None)
]
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Loops
    # ------------------------------------------------------------
    # (SourceKey, UpstreamRelPath, TargetCategory, AssetId, ShortName, DisplayName, BarCount, SuggestedBpm)
LOOPS = [
    ("TonejsAudio__DrumSamples", "loops/break12.mp3",             "10__Loops__Breakbeat",   "LOP_BRK1001", "BreakTwelve",     "Break Twelve",        2, 110),
    ("TonejsAudio__DrumSamples", "loops/break28.mp3",             "10__Loops__Breakbeat",   "LOP_BRK1002", "BreakTwentyEight","Break Twenty Eight",  2, 105),
    ("TonejsAudio__DrumSamples", "loops/break29.mp3",             "10__Loops__Breakbeat",   "LOP_BRK1003", "BreakTwentyNine", "Break Twenty Nine",   2, 100),
    ("TonejsAudio__DrumSamples", "loops/coolloop7.mp3",           "10__Loops__Breakbeat",   "LOP_BRK1004", "CoolLoopSeven",   "Cool Loop Seven",     1,  95),
    ("TonejsAudio__DrumSamples", "breakbeat.mp3",                 "10__Loops__Breakbeat",   "LOP_BRK1005", "BreakbeatClassic","Breakbeat - Classic", 2, 120),
    ("TonejsAudio__DrumSamples", "handdrum-loop.mp3",             "10__Loops__Breakbeat",   "LOP_BRK1006", "HandDrumLoop",    "Hand Drum Loop",      2, 100),
    ("TonejsAudio__DrumSamples", "loops/ominous.mp3",             "20__Loops__Atmospheric", "LOP_ATM2001", "Ominous",         "Ominous",             4,  90),
    ("TonejsAudio__DrumSamples", "loops/blueyellow.mp3",          "20__Loops__Atmospheric", "LOP_ATM2002", "BlueYellow",      "Blue Yellow",         4,  90),
    ("TonejsAudio__DrumSamples", "loops/organ-echo-chords.mp3",   "30__Loops__Tonal",       "LOP_TON3001", "OrganEchoChords", "Organ Echo Chords",   4,  90)
]
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Impulse Responses
    # ------------------------------------------------------------
    # (SourceKey, UpstreamRelPath, TargetCategory, AssetId, ShortName, DisplayName, Character)
IMPULSE_RESPONSES = [
    ("TonejsAudio__ImpulseResponses", "matrix-reverb1.mp3",     "10__Ir__Rooms",      "IRS_ROM0101", "MatrixRoomSmall",  "Matrix Room - Small",   "small room"),
    ("TonejsAudio__ImpulseResponses", "matrix-reverb2.mp3",     "10__Ir__Rooms",      "IRS_ROM0102", "MatrixRoomMedium", "Matrix Room - Medium",  "medium room"),
    ("TonejsAudio__ImpulseResponses", "matrix-reverb3.mp3",     "10__Ir__Rooms",      "IRS_ROM0103", "MatrixRoomLarge",  "Matrix Room - Large",   "large room"),
    ("TonejsAudio__ImpulseResponses", "spatialized2.mp3",       "10__Ir__Rooms",      "IRS_ROM0111", "SpatialisedNear",  "Spatialised - Near",    "near field"),
    ("TonejsAudio__ImpulseResponses", "spatialized3.mp3",       "10__Ir__Rooms",      "IRS_ROM0112", "SpatialisedFar",   "Spatialised - Far",     "far field"),
    ("TonejsAudio__ImpulseResponses", "diffusor1.mp3",          "10__Ir__Rooms",      "IRS_ROM0121", "DiffusorSoft",     "Diffusor - Soft",       "diffuse"),
    ("TonejsAudio__ImpulseResponses", "cosmic-ping.mp3",        "20__Ir__Unnatural",  "IRS_UNN0201", "CosmicPing",       "Cosmic Ping",           "metallic bloom"),
    ("TonejsAudio__ImpulseResponses", "backwards-2.mp3",        "20__Ir__Unnatural",  "IRS_UNN0202", "Backwards",        "Backwards",             "reverse swell"),
    ("TonejsAudio__ImpulseResponses", "comb-saw3.mp3",          "20__Ir__Unnatural",  "IRS_UNN0203", "CombSaw",          "Comb Saw",              "comb filter"),
    ("TonejsAudio__ImpulseResponses", "feedback-spring.mp3",    "20__Ir__Unnatural",  "IRS_UNN0204", "FeedbackSpring",   "Feedback Spring",       "spring tank")
]
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Ingest Helpers
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Shallow Clone the Source Repositories
    # ------------------------------------------------------------
def NaAudio__Ingest__CloneSources(scratch_dir):
    os.makedirs(scratch_dir, exist_ok=True)                                   # <-- Scratch parent for every clone
    for folder, url in CLONE_TARGETS.items():
        target = os.path.join(scratch_dir, folder)
        if os.path.isdir(os.path.join(target, ".git")):
            print(f"  [SKIP]  {folder} already cloned")
            continue
        print(f"  [CLONE] {url} -> {target}")
        subprocess.run(["git", "clone", "--depth", "1", url, target], check=True)
    return scratch_dir
    # ------------------------------------------------------------


    # HELPER FUNCTION | Resolve an Upstream File Path From a Source Record
    # ------------------------------------------------------------
def NaAudio__Ingest__UpstreamPath(scratch_dir, source_key, rel_path):
    source = SOURCES[source_key]
    return os.path.join(scratch_dir, source["RepoFolder"], source["SubPath"], rel_path)
    # ------------------------------------------------------------


    # HELPER FUNCTION | Build the NaAudio Asset Filename
    # ------------------------------------------------------------
def NaAudio__Ingest__AssetFilename(kind, asset_id, short_name, extension):
    return f"NaAudio__{kind}__{asset_id}__{short_name}__{extension}"
    # ------------------------------------------------------------


    # SUB FUNCTION | Copy One Curated File Into the Library
    # ------------------------------------------------------------
def NaAudio__Ingest__CopyOne(source_path, target_dir, target_name, dry_run, report):
    if not os.path.isfile(source_path):
        report["Missing"].append(source_path)                                  # <-- Upstream renamed or removed a file
        print(f"  [MISS]  {source_path}")
        return False

    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, target_name)

    if not dry_run:
        shutil.copy2(source_path, target_path)

    report["Written"].append({
        "TargetPath" : os.path.relpath(target_path, APP_ROOT).replace(os.sep, "/"),
        "SourcePath" : source_path,
        "Bytes"      : os.path.getsize(source_path)
    })
    return True
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Ingest Passes
# -----------------------------------------------------------------------------

    # SUB FUNCTION | Ingest the Drum Kits
    # ------------------------------------------------------------
def NaAudio__Ingest__DrumKits(scratch_dir, dry_run, report):
    print("\nDRUM KITS")
    for source_key, upstream_kit, category, kit_folder, kit_name, id_block in DRUM_KITS:
        target_dir = os.path.join(SAMPLE_LIB_DIR, category, kit_folder)
        for index, (upstream_file, short_name, voice_role, sort_order) in enumerate(KIT_VOICE_MAP):
            asset_id     = f"SMP_DRM{id_block}{index + 1:02d}"                # <-- Kit block then voice ordinal, e.g. SMP_DRM10101
            target_name  = NaAudio__Ingest__AssetFilename("Sample", asset_id, short_name, ".mp3")
            source_path  = NaAudio__Ingest__UpstreamPath(scratch_dir, source_key, f"{upstream_kit}/{upstream_file}")
            NaAudio__Ingest__CopyOne(source_path, target_dir, target_name, dry_run, report)
        print(f"  [KIT]   {kit_name} -> {category}/{kit_folder}")
    # ------------------------------------------------------------


    # SUB FUNCTION | Ingest the Loose One-Shot Samples
    # ------------------------------------------------------------
def NaAudio__Ingest__LooseSamples(scratch_dir, dry_run, report):
    print("\nONE-SHOT SAMPLES")
    for source_key, rel_path, category, asset_id, short_name, _display, _role, _note in LOOSE_SAMPLES:
        target_dir   = os.path.join(SAMPLE_LIB_DIR, category)
        target_name  = NaAudio__Ingest__AssetFilename("Sample", asset_id, short_name, ".mp3")
        source_path  = NaAudio__Ingest__UpstreamPath(scratch_dir, source_key, rel_path)
        NaAudio__Ingest__CopyOne(source_path, target_dir, target_name, dry_run, report)
    print(f"  [DONE]  {len(LOOSE_SAMPLES)} one-shots considered")
    # ------------------------------------------------------------


    # SUB FUNCTION | Ingest the Loops
    # ------------------------------------------------------------
def NaAudio__Ingest__Loops(scratch_dir, dry_run, report):
    print("\nLOOPS")
    for source_key, rel_path, category, asset_id, short_name, _display, _bars, _bpm in LOOPS:
        target_dir   = os.path.join(LOOP_LIB_DIR, category)
        target_name  = NaAudio__Ingest__AssetFilename("Loop", asset_id, short_name, ".mp3")
        source_path  = NaAudio__Ingest__UpstreamPath(scratch_dir, source_key, rel_path)
        NaAudio__Ingest__CopyOne(source_path, target_dir, target_name, dry_run, report)
    print(f"  [DONE]  {len(LOOPS)} loops considered")
    # ------------------------------------------------------------


    # SUB FUNCTION | Ingest the Impulse Responses
    # ------------------------------------------------------------
def NaAudio__Ingest__ImpulseResponses(scratch_dir, dry_run, report):
    print("\nIMPULSE RESPONSES")
    for source_key, rel_path, category, asset_id, short_name, _display, _character in IMPULSE_RESPONSES:
        target_dir   = os.path.join(IR_LIB_DIR, category)
        target_name  = NaAudio__Ingest__AssetFilename("Ir", asset_id, short_name, ".mp3")
        source_path  = NaAudio__Ingest__UpstreamPath(scratch_dir, source_key, rel_path)
        NaAudio__Ingest__CopyOne(source_path, target_dir, target_name, dry_run, report)
    print(f"  [DONE]  {len(IMPULSE_RESPONSES)} impulse responses considered")
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Run the Ingest
    # ------------------------------------------------------------
def NaAudio__Ingest__Main():
    parser = argparse.ArgumentParser(description="Ingest curated open-licence audio into the AudioSPACE shipped banks.")
    parser.add_argument("--clone",   action="store_true", help="Shallow-clone the source repositories first")
    parser.add_argument("--source",  default=None,        help="Existing clone parent folder to reuse")
    parser.add_argument("--scratch", default=None,        help="Scratch folder for clones")
    parser.add_argument("--dry-run", action="store_true", help="Report only, write nothing")
    args = parser.parse_args()

    scratch_dir = args.source or args.scratch or os.path.join(os.path.dirname(os.path.abspath(__file__)), "__ingest_scratch")

    print("=" * 77)
    print(" NAAUDIO - SAMPLE LIBRARY INGEST")
    print("=" * 77)
    print(f" Scratch : {scratch_dir}")
    print(f" Target  : {APP_ROOT}")
    print(f" Mode    : {'DRY RUN' if args.dry_run else 'WRITE'}")

    if args.clone:
        NaAudio__Ingest__CloneSources(scratch_dir)

    report = {
        "NaAudio__IngestReport__Meta": {
            "GeneratedBy"   : "61__Dev__AssetAuthoring__SampleLibraryIngest/NaAudio__AssetAuthoring__SampleLibraryIngest__.py",
            "GeneratedDate" : datetime.now().strftime("%d-%b-%Y at %H:%M"),
            "SchemaVersion" : SCHEMA_VERSION,
            "DryRun"        : args.dry_run
        },
        "NaAudio__IngestReport__Sources"  : SOURCES,
        "NaAudio__IngestReport__Excluded" : EXCLUDED,
        "Written"                         : [],
        "Missing"                         : []
    }

    NaAudio__Ingest__DrumKits(scratch_dir, args.dry_run, report)
    NaAudio__Ingest__LooseSamples(scratch_dir, args.dry_run, report)
    NaAudio__Ingest__Loops(scratch_dir, args.dry_run, report)
    NaAudio__Ingest__ImpulseResponses(scratch_dir, args.dry_run, report)

    total_bytes = sum(entry["Bytes"] for entry in report["Written"])
    report["NaAudio__IngestReport__Meta"]["FileCount"]  = len(report["Written"])
    report["NaAudio__IngestReport__Meta"]["TotalBytes"] = total_bytes

    if not args.dry_run:
        with open(INGEST_REPORT, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=4)

    print("\n" + "=" * 77)
    print(f" WRITTEN : {len(report['Written'])} files, {total_bytes / 1024 / 1024:.2f} MB")
    print(f" MISSING : {len(report['Missing'])}")
    for missing in report["Missing"]:
        print(f"   - {missing}")
    print("=" * 77)
    return 0 if not report["Missing"] else 1
    # ------------------------------------------------------------


if __name__ == "__main__":
    sys.exit(NaAudio__Ingest__Main())

# endregion -------------------------------------------------------------------
