# =============================================================================
# VALEDESIGNSUITE - EXTRACT PROJECT DESIGNERS AND ARTISTS
# =============================================================================
#
# FILE       : AutomationUtil__ExtractProjectDesignersAndArtists__Main__.py
# NAMESPACE  : ExtractProjectDesignersAndArtists
# MODULE     : ExtractProjectDesignersAndArtists
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Scan ValeProjects year folders and export Designer/ConceptArtist CSV
# CREATED    : 26-Jun-2026
#
# DESCRIPTION:
# - Recursively scans ValeProjects__2025 and ValeProjects__2026 year roots.
# - Reads each project folder's 00__ProjectData/*__ProjectData__.json file.
# - Extracts Project Name, Code, Concept Artist, and Designer into a CSV report.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 26-Jun-2026 - Version 1.0.0
# - Initial release: scan, parse, and write UTF-8 BOM CSV
#
# =============================================================================

import csv
import json
import sys
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Source and Output Paths
    # ------------------------------------------------------------
YEAR_ROOTS = [
    Path(r"C:\01__ValeProjects\ValeProjects__2025"),
    Path(r"C:\01__ValeProjects\ValeProjects__2026"),
]
OUTPUT_CSV_PATH = Path(__file__).parent / "Project__Data__Query__DesignersAndArtists__.csv"
PROJECT_DATA_GLOB = "*__ProjectData__.json"
CSV_HEADERS = ["Project Name", "Code", "Concept Artist", "Designer"]
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Data Extraction Helpers
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Trim String Value Safely
    # ---------------------------------------------------------------
def na_trim_string(value):
    if value is None:
        return ""
    return str(value).strip()
    # ---------------------------------------------------------------


    # HELPER FUNCTION | Find Project Metadata Block in JSON Array
    # ---------------------------------------------------------------
def na_find_project_metadata(json_data):
    if not isinstance(json_data, list):
        return None

    for section in json_data:
        if isinstance(section, dict) and "Project__MetaData" in section:
            return section["Project__MetaData"]

    return None
    # ---------------------------------------------------------------


    # HELPER FUNCTION | Parse Project Number for Sorting
    # ---------------------------------------------------------------
def na_parse_project_number_sort_key(project_number):
    try:
        return int(na_trim_string(project_number))
    except ValueError:
        return 0
    # ---------------------------------------------------------------


    # FUNCTION | Extract Metadata Row from ProjectData JSON File
    # ------------------------------------------------------------
def na_extract_metadata_row(project_dir, json_path):
    project_name = ""
    project_code = ""
    concept_artist = ""
    designer = ""

    try:
        with json_path.open("r", encoding="utf-8") as json_file:
            json_data = json.load(json_file)

        metadata = na_find_project_metadata(json_data)
        if metadata is None:
            print(f"WARNING: Missing Project__MetaData in {json_path}", file=sys.stderr)
        else:
            project_name = na_trim_string(metadata.get("Project__Name"))
            project_code = na_trim_string(metadata.get("Project__Number"))
            concept_artist = na_trim_string(metadata.get("Project__ConceptArtist"))
            designer = na_trim_string(metadata.get("Project__Designer"))

    except (OSError, json.JSONDecodeError) as error:
        print(f"WARNING: Failed to read {json_path}: {error}", file=sys.stderr)

    return {
        "year_label": project_dir.parent.name,
        "folder_name": project_dir.name,
        "Project Name": project_name,
        "Code": project_code,
        "Concept Artist": concept_artist,
        "Designer": designer,
    }
    # ---------------------------------------------------------------


    # FUNCTION | Collect Rows from All Year Roots
    # ------------------------------------------------------------
def na_collect_project_rows():
    rows = []

    for year_root in YEAR_ROOTS:
        if not year_root.is_dir():
            print(f"WARNING: Year root not found: {year_root}", file=sys.stderr)
            continue

        for project_dir in sorted(year_root.iterdir(), key=lambda path: path.name.lower()):
            if not project_dir.is_dir():
                continue

            project_data_dir = project_dir / "00__ProjectData"
            if not project_data_dir.is_dir():
                continue

            json_files = sorted(project_data_dir.glob(PROJECT_DATA_GLOB))
            if not json_files:
                continue

            rows.append(na_extract_metadata_row(project_dir, json_files[0]))

    rows.sort(
        key=lambda row: (
            row["year_label"],
            na_parse_project_number_sort_key(row["Code"]),
            row["folder_name"].lower(),
        )
    )

    return rows
    # ---------------------------------------------------------------


    # FUNCTION | Write CSV Report
    # ------------------------------------------------------------
def na_write_csv_report(rows):
    OUTPUT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_HEADERS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    # ---------------------------------------------------------------


    # FUNCTION | Main Entry Point
    # ------------------------------------------------------------
def main():
    rows = na_collect_project_rows()
    na_write_csv_report(rows)
    print(f"Wrote {len(rows)} rows to {OUTPUT_CSV_PATH}")
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == "__main__":
    main()
