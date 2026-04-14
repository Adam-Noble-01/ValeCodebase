# =============================================================================
# VALESPEC - HARDWARE DATA INDEX BUILDER
# =============================================================================
#
# FILE       : ValeSpec__Build__HardwareDataIndex__.py
# NAMESPACE  : ValeSpec
# MODULE     : Build - HardwareDataIndex
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Scan hardware JSON files and build a consolidated data index
# CREATED    : 2026
#
# DESCRIPTION:
# - Scans ../03__Data__HardwareDataLibrary/ recursively for *.json files
# - Skips files named ValeSpec__HardwareDataIndex__
# - Reads each JSON and extracts ValeSpec__HardwareItemData section
# - Builds index dict keyed by HardwareItem__Name
# - Writes to ../03__Data__HardwareDataLibrary/ValeSpec__HardwareDataIndex__.json
# - Pretty prints with 4-space indent
# - Reports count of items indexed
#
# =============================================================================

import os
import json
import sys

# -----------------------------------------------------------------------------
# REGION | Configuration Constants
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Paths and Exclusions
    # ------------------------------------------------------------
SCRIPT_DIR       =  os.path.dirname(os.path.abspath(__file__))                   # <-- Directory containing this script
DATA_LIBRARY_DIR =  os.path.normpath(os.path.join(SCRIPT_DIR, '..', '03__Data__HardwareDataLibrary'))
OUTPUT_FILENAME  =  'ValeSpec__HardwareDataIndex__.json'
SKIP_PREFIX      =  'ValeSpec__HardwareDataIndex__'                              # <-- Exclude index file from scan
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Hardware Data Index Builder
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Scan Directory for JSON Files
    # ------------------------------------------------------------
def scan_hardware_json_files(root_dir):
    """Recursively find all .json files, excluding the index file itself."""
    json_files  =  []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if not filename.endswith('.json'):
                continue
            if filename.startswith(SKIP_PREFIX):
                continue                                                         # <-- Skip existing index file
            json_files.append(os.path.join(dirpath, filename))
    return json_files
    # ------------------------------------------------------------


    # HELPER FUNCTION | Extract Hardware Item Data from JSON File
    # ------------------------------------------------------------
def extract_hardware_item(filepath):
    """Read a JSON file and return ValeSpec__HardwareItemData section or None."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data  =  json.load(f)
        return data.get('ValeSpec__HardwareItemData', None)
    except (json.JSONDecodeError, IOError) as e:
        print(f'  WARNING: Could not read {os.path.basename(filepath)}: {e}')
        return None
    # ------------------------------------------------------------


    # FUNCTION | Build Hardware Data Index
    # ------------------------------------------------------------
def build_index():
    """Scan all hardware JSON files and build consolidated index."""
    print(f'Scanning: {DATA_LIBRARY_DIR}')
    print()

    if not os.path.isdir(DATA_LIBRARY_DIR):
        print(f'ERROR: Data library directory not found: {DATA_LIBRARY_DIR}')
        sys.exit(1)

    json_files  =  scan_hardware_json_files(DATA_LIBRARY_DIR)
    print(f'Found {len(json_files)} JSON file(s) to process.')
    print()

    index  =  {}
    skipped_count  =  0

    for filepath in sorted(json_files):
        filename     =  os.path.basename(filepath)
        item_data    =  extract_hardware_item(filepath)

        if item_data is None:
            skipped_count  +=  1
            continue

        item_name  =  item_data.get('HardwareItem__Name', '')
        if not item_name:
            print(f'  WARNING: No HardwareItem__Name in {filename}, skipping.')
            skipped_count  +=  1
            continue

        index[item_name]  =  item_data
        print(f'  Indexed: {item_name} ({filename})')

    output_path  =  os.path.join(DATA_LIBRARY_DIR, OUTPUT_FILENAME)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=4, ensure_ascii=False)

    print()
    print(f'Hardware Data Index built successfully.')
    print(f'  Items indexed : {len(index)}')
    print(f'  Items skipped : {skipped_count}')
    print(f'  Output file   : {output_path}')
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Script Entry Point
# -----------------------------------------------------------------------------

if __name__ == '__main__':
    build_index()

# endregion -------------------------------------------------------------------
