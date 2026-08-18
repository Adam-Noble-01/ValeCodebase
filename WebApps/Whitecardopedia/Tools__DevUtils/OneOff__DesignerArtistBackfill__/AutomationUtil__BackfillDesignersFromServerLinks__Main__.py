#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - BACKFILL DESIGNERS FROM VALE SERVER LINK PATHS
# =============================================================================
#
# FILE       : AutomationUtil__BackfillDesignersFromServerLinks__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Designer Backfill Tool (Server Link Source)
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Fill the missing productionData.designer field on Whitecardopedia
#              project.json files by mining the Vale production project folders
#              for the designer's name.
# CREATED    : 18-Aug-2026
#
# DESCRIPTION:
# - The earlier backfill tool (AutomationUtil__ApplyDesignersToWhitecardopedia)
#   sourced designers from a CSV built out of *__ProjectData__.json metadata,
#   which only covers jobs that had a ProjectData file created. That left a
#   large block of legacy jobs with no designer recorded.
# - This tool adds the missing source: the auto generated Vale server links.
#   Every job folder carries a link into the office file server, and the target
#   path always contains the designer's own sales folder:
#       N:\Sales\Gary Hood\Gary 2026\Lawrence62430 NEW DB
#   The first path segment after "Sales" is the designer.
#
# SOURCES, IN PRIORITY ORDER:
#   1. 00__ProjectData\*__ProjectData__.json
#        -> Project__MetaData.Project__Designer            (already a first name)
#   2. 00__ProjectData\*__ProjectData__.json
#        -> Project__PrivateLinksIndex
#           .Link__ValeServerProjectDirectory.Link__WindowsPath
#   3. 60__ValeServerLinks\*.lnk  (binary Windows shortcut, path scraped)
#   4. 60__ValeServerLinks\*.url  (plain text internet shortcut)
#   5. Any other .lnk / .url anywhere in the job folder (last resort)
#
# SAFETY:
# - Dry run by default. Nothing is written without --apply.
# - Only ever fills a MISSING designer. An existing real value is never
#   overwritten, so hand-entered corrections always win.
# - Writes local project.json only. Run the R2 sync utility afterwards to push
#   the change to the live bucket, otherwise the next sync will pull the old
#   value back down.
#
# USAGE:
#   python AutomationUtil__BackfillDesignersFromServerLinks__Main__.py
#   python AutomationUtil__BackfillDesignersFromServerLinks__Main__.py --apply
#   python AutomationUtil__BackfillDesignersFromServerLinks__Main__.py --apply --overwrite
#   python AutomationUtil__BackfillDesignersFromServerLinks__Main__.py --report-csv out.csv
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 18-Aug-2026 - Version 1.0.0
# - Initial release: four source strategies, full name mapping, dry run report.
#
# =============================================================================

import os
import re
import csv
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# -----------------------------------------------------------------------------
# REGION | Module Constants
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Paths
# ------------------------------------------------------------
WCP_PROJECTS_ROOT   = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects")   # <-- Whitecardopedia project.json root
WCP_DESIGNERS_LIST  = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\02__Src__AppModules\03__AppData\Na__AppData__ValeDesignersList__Main.json")  # <-- Canonical designer options
VALE_PROJECT_ROOTS  = [                                                                        # <-- Vale production job folders by year
    Path(r"C:\01__ValeProjects\ValeProjects__2025"),
    Path(r"C:\01__ValeProjects\ValeProjects__2026"),
]
# ------------------------------------------------------------

# MODULE CONSTANTS | Folder Name Normalisation
# ------------------------------------------------------------
# Vale job folders carry a work-type suffix that the Whitecardopedia folder
# does not, so both sides are normalised down to code + name + scheme before
# they are compared.
# ------------------------------------------------------------
JOB_TYPE_SUFFIXES = [                                                                          # <-- Suffixes stripped during matching
    "InteriorWhitecard", "InternalWhitecard", "DigitalConcept", "RealityScan",
    "Whitecard", "WhiteCard", "Blockout", "MaxModel", "Survey", "CGI",
    "3dDetails", "ParapetOptions", "FullVersion", "OnHold", "SpecialJob",
]
SCHEME_PATTERN    = re.compile(r"Scheme[-\s]?0?(\d+)", re.IGNORECASE)                          # <-- Scheme / variant marker
CODE_PATTERN      = re.compile(r"(\d{3,6})")                                                   # <-- Vale job number
SALES_PATTERN     = re.compile(r"Sales[\\/]+([^\\/]+)")                                        # <-- Designer folder after "Sales"
# ------------------------------------------------------------

# MODULE CONSTANTS | Designer Full Name Mapping
# ------------------------------------------------------------
# The server folders use full names; the app stores first names. Anything not
# listed here is reported as unmapped rather than guessed, so a new designer
# joining the team surfaces as an explicit action rather than silent bad data.
# ------------------------------------------------------------
DESIGNER_FULL_NAME_MAP = {
    "gary hood"             : "Gary",
    "dan featherstone"      : "Dan",
    "steve burkin"          : "Steve",
    "tom ramsden"           : "Tom",
    "martin stevens"        : "Martin",
    "andy moth"             : "Andy",
    "sharon o callaghan"    : "Sharon",
    "sharon ocallaghan"     : "Sharon",
    "ted marris"            : "Ted",
    "james watchorn"        : "James",
    "jo"                    : "Jo",
    "house"                 : "House",
}
# ------------------------------------------------------------

# MODULE CONSTANTS | Placeholder Detection
# ------------------------------------------------------------
PLACEHOLDER_VALUES = {                                                                         # <-- Values treated as "not set"
    "", "nil", "n/a", "na", "tbc", "unknown", "none",
    "not yet reviewed", "default designer", "fetchfrom",
}
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Value Helpers
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Test Whether a Stored Field Value Is a Real Entry
# ---------------------------------------------------------------
def na_is_placeholder(value: Optional[str]) -> bool:
    if value is None:
        return True
    cleaned = str(value).strip().lower()
    if cleaned in PLACEHOLDER_VALUES:
        return True
    return "placeholder" in cleaned or cleaned.startswith("fetchfrom")
# ---------------------------------------------------------------


# HELPER FUNCTION | Load the Canonical Designer Options List
# ---------------------------------------------------------------
def na_load_designer_options() -> List[str]:
    try:
        with open(WCP_DESIGNERS_LIST, encoding="utf-8") as fh:
            data = json.load(fh)
        return list(data.get("vale__Designer__OptionsList") or [])
    except Exception as exc:
        print(f"  WARNING: could not read designer options list ({exc})")
        return []
# ---------------------------------------------------------------


# HELPER FUNCTION | Map a Raw Server Folder Name Onto an App Designer Name
# ---------------------------------------------------------------
# Returns (mappedName, wasMapped). Trailing ")" is stripped because the .lnk
# binary stores display strings such as "Gary 2026 (N:\Sales\Gary Hood)".
# ---------------------------------------------------------------
def na_map_designer_name(raw: str, options: List[str]) -> Tuple[Optional[str], bool]:
    if not raw:
        return None, False

    cleaned = raw.strip().rstrip(")").strip()
    lowered = cleaned.lower()

    if lowered in DESIGNER_FULL_NAME_MAP:                                                      # <-- Known full name
        return DESIGNER_FULL_NAME_MAP[lowered], True

    for option in options:                                                                     # <-- Already an app first name
        if option.lower() == lowered:
            return option, True

    first = cleaned.split()[0] if cleaned.split() else ""                                      # <-- Fall back to the first token
    for option in options:
        if option.lower() == first.lower():
            return option, True

    return cleaned, False                                                                      # <-- Unmapped: report, do not write
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Folder Name Matching
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Reduce a Folder Name to a Comparable Match Key
# ---------------------------------------------------------------
# "2026/62430__Lawrence__Whitecard"  -> ("62430", "lawrence", "")
# "2025/BX-61511__Baxter__Scheme-02__Whitecard" -> ("61511", "baxter", "2")
# ---------------------------------------------------------------
def na_build_match_key(folder_name: str) -> Tuple[str, str, str]:
    name = folder_name.replace("/", "\\").split("\\")[-1]                                      # <-- Leaf folder only

    scheme_match = SCHEME_PATTERN.search(name)                                                 # <-- Capture scheme number
    scheme       = scheme_match.group(1) if scheme_match else ""
    name         = SCHEME_PATTERN.sub("", name)                                                # <-- Remove the scheme marker

    code_match = CODE_PATTERN.search(name)                                                     # <-- Capture the Vale job number
    code       = code_match.group(1) if code_match else ""

    tokens = [t for t in re.split(r"__+|\s+|-", name) if t]                                    # <-- Split on the Vale separators
    words  = []
    for token in tokens:
        if token.isdigit():                                                                    # <-- Drop the job number token
            continue
        if len(token) <= 2 and token.isalpha() and token.isupper():                             # <-- Drop the legacy "BX-" style prefix
            continue
        if token.lower() in (s.lower() for s in JOB_TYPE_SUFFIXES):                             # <-- Drop the work-type suffix
            continue
        words.append(token.lower())

    return code, "".join(words), scheme
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Designer Extraction Sources
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Scrape Every Readable String Out of a Shortcut File
# ---------------------------------------------------------------
# .lnk files are binary and store paths as both ASCII and UTF-16LE runs, so
# both encodings are swept. .url files are plain text and fall out of the
# ASCII sweep for free.
# ---------------------------------------------------------------
def na_scrape_shortcut_strings(path: Path) -> List[str]:
    try:
        raw = path.read_bytes()
    except Exception:
        return []

    texts = []
    for match in re.findall(rb"(?:[\x20-\x7e]\x00){4,}", raw):                                 # <-- UTF-16LE runs
        texts.append(match.decode("utf-16-le", errors="ignore"))
    for match in re.findall(rb"[\x20-\x7e]{4,}", raw):                                         # <-- ASCII runs
        texts.append(match.decode("ascii", errors="ignore"))
    return texts
# ---------------------------------------------------------------


# HELPER FUNCTION | Pull the Designer Folder Out of Any Path-Like String
# ---------------------------------------------------------------
def na_designer_from_path_string(text: str) -> Optional[str]:
    if not text:
        return None
    normalised = text.replace("\\\\", "\\").replace("%20", " ")                                # <-- Undo JSON escaping and URL encoding
    match = SALES_PATTERN.search(normalised)
    return match.group(1).strip() if match else None
# ---------------------------------------------------------------


# FUNCTION | Extract the Designer for a Single Vale Job Folder
# ------------------------------------------------------------
# Returns (rawDesignerName, sourceLabel) or (None, None).
# ------------------------------------------------------------
def na_extract_designer_for_job(job_dir: Path) -> Tuple[Optional[str], Optional[str]]:
    project_data_dir = job_dir / "00__ProjectData"

    # SOURCE 1 + 2 | The job's own ProjectData JSON
    # ---------------------------------------------------------------
    if project_data_dir.is_dir():
        for entry in sorted(project_data_dir.glob("*.json")):
            try:
                with open(entry, encoding="utf-8") as fh:
                    data = json.load(fh)
            except Exception:
                continue

            blocks = data if isinstance(data, list) else [data]

            for block in blocks:                                                               # <-- SOURCE 1: explicit metadata field
                if not isinstance(block, dict):
                    continue
                metadata = block.get("Project__MetaData")
                if isinstance(metadata, dict):
                    designer = metadata.get("Project__Designer")
                    if not na_is_placeholder(designer):
                        return str(designer).strip(), "ProjectData metadata"

            for block in blocks:                                                               # <-- SOURCE 2: private server link path
                if not isinstance(block, dict):
                    continue
                links = block.get("Project__PrivateLinksIndex")
                if isinstance(links, dict):
                    server = links.get("Link__ValeServerProjectDirectory") or {}
                    found  = na_designer_from_path_string(str(server.get("Link__WindowsPath", "")))
                    if found:
                        return found, "ProjectData server path"
    # ---------------------------------------------------------------

    # SOURCE 3 + 4 | The generated server link files
    # ---------------------------------------------------------------
    links_dir = job_dir / "60__ValeServerLinks"
    if links_dir.is_dir():
        for entry in sorted(links_dir.iterdir()):
            if entry.suffix.lower() not in (".lnk", ".url"):
                continue
            for text in na_scrape_shortcut_strings(entry):
                found = na_designer_from_path_string(text)
                if found:
                    return found, f"server link ({entry.suffix.lower()})"
    # ---------------------------------------------------------------

    # SOURCE 5 | Any other shortcut anywhere in the job folder
    # ---------------------------------------------------------------
    for dirpath, _dirs, files in os.walk(job_dir):
        for filename in files:
            if not filename.lower().endswith((".lnk", ".url")):
                continue
            for text in na_scrape_shortcut_strings(Path(dirpath) / filename):
                found = na_designer_from_path_string(text)
                if found:
                    return found, "shortcut elsewhere in job folder"
    # ---------------------------------------------------------------

    return None, None
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Index Building
# -----------------------------------------------------------------------------

# FUNCTION | Build the Designer Lookup From Every Vale Job Folder
# ------------------------------------------------------------
def na_build_vale_designer_index(options: List[str]) -> Tuple[Dict[Tuple[str, str, str], dict], List[dict]]:
    index: Dict[Tuple[str, str, str], dict] = {}
    unmapped: List[dict] = []

    for root in VALE_PROJECT_ROOTS:
        if not root.is_dir():
            print(f"  WARNING: Vale project root not found: {root}")
            continue

        year = root.name.replace("ValeProjects__", "")

        for job_dir in sorted(root.iterdir()):
            if not job_dir.is_dir():
                continue

            raw, source = na_extract_designer_for_job(job_dir)
            if not raw:
                continue

            mapped, was_mapped = na_map_designer_name(raw, options)
            record = {
                "year"      : year,
                "folder"    : job_dir.name,
                "raw"       : raw,
                "designer"  : mapped,
                "source"    : source,
                "mapped"    : was_mapped,
            }

            if not was_mapped:
                unmapped.append(record)
                continue

            key = na_build_match_key(job_dir.name)
            if key[0] or key[1]:                                                               # <-- Ignore folders with no usable key
                index.setdefault(key, record)

    return index, unmapped
# ---------------------------------------------------------------


# FUNCTION | Collect Every Whitecardopedia project.json Path
# ------------------------------------------------------------
def na_collect_wcp_projects() -> List[Path]:
    skip = ("__BACKUP__", "01__TemplateProject", "00__ExampleProject")
    found = []
    for path in sorted(WCP_PROJECTS_ROOT.glob("*/*/project.json")):
        if any(token in str(path) for token in skip):
            continue
        found.append(path)
    return found
# ---------------------------------------------------------------


# FUNCTION | Resolve One Whitecardopedia Folder Against the Vale Index
# ------------------------------------------------------------
# Tries the exact key first (code + name + scheme), then relaxes the scheme,
# then falls back to a code-only match when exactly one candidate shares it.
# ------------------------------------------------------------
def na_resolve_designer(folder_name: str, index: Dict[Tuple[str, str, str], dict]) -> Tuple[Optional[dict], str]:
    key = na_build_match_key(folder_name)

    if key in index:
        return index[key], "exact"

    relaxed = [rec for k, rec in index.items() if k[0] == key[0] and k[1] == key[1]]
    if len(relaxed) == 1:
        return relaxed[0], "name and code"

    if key[0]:
        by_code = [rec for k, rec in index.items() if k[0] == key[0]]
        distinct = {rec["designer"] for rec in by_code}
        if by_code and len(distinct) == 1:                                                     # <-- All candidates agree on the designer
            return by_code[0], "code only"

    if key[1]:
        by_name = [rec for k, rec in index.items() if k[1] == key[1]]
        distinct = {rec["designer"] for rec in by_name}
        if by_name and len(distinct) == 1:
            return by_name[0], "name only"

    return None, "no match"
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reporting and Main
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Print a Section Header
# ---------------------------------------------------------------
def na_print_section(title: str) -> None:
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
# ---------------------------------------------------------------


# HELPER FUNCTION | Parse Command Line Arguments
# ---------------------------------------------------------------
def na_parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill productionData.designer from Vale server link paths."
    )
    parser.add_argument("--apply", action="store_true",
                        help="Write the changes. Without this flag the tool reports only.")
    parser.add_argument("--overwrite", action="store_true",
                        help="Also replace designers that already have a real value. Off by default.")
    parser.add_argument("--report-csv", metavar="PATH",
                        help="Write the full per project report to a CSV file.")
    return parser.parse_args()
# ---------------------------------------------------------------


# FUNCTION | Tool Entry Point
# ------------------------------------------------------------
def na_main() -> None:
    args = na_parse_args()

    na_print_section("WHITECARDOPEDIA - DESIGNER BACKFILL FROM SERVER LINKS")
    print(f"  Mode                : {'APPLY (files will be written)' if args.apply else 'DRY RUN (no files written)'}")
    print(f"  Overwrite existing  : {'yes' if args.overwrite else 'no'}")

    options = na_load_designer_options()
    print(f"  Designer options    : {', '.join(options) if options else '(none loaded)'}")

    na_print_section("SCANNING VALE PROJECT FOLDERS")
    index, unmapped = na_build_vale_designer_index(options)
    print(f"  Job folders with a resolvable designer : {len(index)}")
    print(f"  Job folders with an unmapped name      : {len(unmapped)}")

    source_counts: Dict[str, int] = {}
    designer_counts: Dict[str, int] = {}
    for record in index.values():
        source_counts[record["source"]] = source_counts.get(record["source"], 0) + 1
        designer_counts[record["designer"]] = designer_counts.get(record["designer"], 0) + 1

    print()
    print("  By source:")
    for source, count in sorted(source_counts.items(), key=lambda kv: -kv[1]):
        print(f"    {count:4d}  {source}")
    print()
    print("  By designer:")
    for designer, count in sorted(designer_counts.items(), key=lambda kv: -kv[1]):
        print(f"    {count:4d}  {designer}")

    if unmapped:
        print()
        print("  UNMAPPED NAMES (add these to DESIGNER_FULL_NAME_MAP and re-run):")
        for record in unmapped:
            print(f"    {record['year']}/{record['folder']}  ->  {record['raw']!r}")

    na_print_section("MATCHING AGAINST WHITECARDOPEDIA PROJECTS")
    project_paths = na_collect_wcp_projects()
    print(f"  Whitecardopedia projects found : {len(project_paths)}")

    rows        = []
    filled      = 0
    overwritten = 0
    already     = 0
    unmatched   = 0
    written     = 0

    for path in project_paths:
        rel_folder = str(path.parent.relative_to(WCP_PROJECTS_ROOT)).replace("\\", "/")

        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception as exc:
            print(f"  ERROR reading {rel_folder}: {exc}")
            continue

        production = data.get("productionData") or {}
        current    = production.get("designer")
        has_real   = not na_is_placeholder(current)

        record, how = na_resolve_designer(rel_folder, index)

        if record is None:
            unmatched += 1
            action = "no source found"
            proposed = ""
        elif has_real and not args.overwrite:
            already += 1
            action = "kept existing"
            proposed = record["designer"]
        elif has_real and record["designer"] == current:
            already += 1
            action = "already correct"
            proposed = record["designer"]
        else:
            proposed = record["designer"]
            action   = "overwrite" if has_real else "fill"
            if has_real:
                overwritten += 1
            else:
                filled += 1

            if args.apply:
                data.setdefault("productionData", {})["designer"] = proposed
                try:
                    with open(path, "w", encoding="utf-8") as fh:
                        json.dump(data, fh, indent=4, ensure_ascii=False)
                        fh.write("\n")
                    written += 1
                except Exception as exc:
                    print(f"  ERROR writing {rel_folder}: {exc}")

        rows.append({
            "folder"        : rel_folder,
            "currentValue"  : current if current is not None else "",
            "proposed"      : proposed,
            "action"        : action,
            "matchType"     : how,
            "sourceFolder"  : record["folder"] if record else "",
            "sourceRawName" : record["raw"] if record else "",
            "sourceKind"    : record["source"] if record else "",
        })

    na_print_section("RESULT")
    print(f"  Would fill missing designer   : {filled}")
    print(f"  Would overwrite existing      : {overwritten}")
    print(f"  Left unchanged                : {already}")
    print(f"  No source found               : {unmatched}")
    if args.apply:
        print(f"  Files written                 : {written}")
    else:
        print()
        print("  DRY RUN - nothing was written. Re-run with --apply to write.")

    if filled or overwritten:
        na_print_section("PROPOSED CHANGES")
        for row in rows:
            if row["action"] in ("fill", "overwrite"):
                current_text = row["currentValue"] or "(empty)"
                print(f"  {row['folder']:<52} {current_text:>14}  ->  {row['proposed']:<10}"
                      f"  [{row['matchType']}, {row['sourceKind']}]")

    still_missing = [r for r in rows if r["action"] == "no source found"
                     and na_is_placeholder(r["currentValue"])]
    if still_missing:
        na_print_section(f"STILL MISSING A DESIGNER ({len(still_missing)})")
        for row in still_missing:
            print(f"  {row['folder']}")

    if args.report_csv:
        try:
            with open(args.report_csv, "w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ["folder"])
                writer.writeheader()
                writer.writerows(rows)
            print()
            print(f"  Report written to {args.report_csv}")
        except Exception as exc:
            print(f"  ERROR writing report CSV: {exc}")

    if args.apply and written:
        na_print_section("NEXT STEP")
        print("  Local project.json files were updated. Push them to R2 so the live")
        print("  bucket does not overwrite the change on the next sync:")
        print("    Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__.bat")

    print()
# ---------------------------------------------------------------


if __name__ == "__main__":
    na_main()

# endregion -------------------------------------------------------------------
