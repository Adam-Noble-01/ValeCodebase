#!/usr/bin/env python3
"""
=============================================================================
 VALEPLANNER - RETROSPECTIVE TIMECARD EDITOR
=============================================================================
Purpose:
- Load the ValePlanner timecard JSON file.
- Allow retrospective edit of clock-in/clock-out values for an existing day row.
- Inject a nested admin override block on the edited row.
- Reset Timecard__AuthHash so the web app can re-backfill a current hash.
- Allow safe deletion of accidental rows with backup and hash repair.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk


# -----------------------------------------------------------------------------
# REGION | Constants and Datatypes
# -----------------------------------------------------------------------------

def Na__Retro__ResolveAppRootPath() -> Path:
    script_dir = Path(__file__).resolve().parent
    for candidate_root in [script_dir, *script_dir.parents]:
        has_index_file = (candidate_root / "index.html").exists()
        has_src_modules = (candidate_root / "02__Src__AppModules").exists()
        if has_index_file and has_src_modules:
            return candidate_root
    return script_dir.parent


NA__RETRO__APP_ROOT_PATH = Na__Retro__ResolveAppRootPath()
NA__RETRO__LIST_FONT = ("Consolas", 10)
NA__RETRO__LIST_DATE_COL_WIDTH = 12
NA__RETRO__LIST_TIME_COL_WIDTH = 5
NA__RETRO__LIST_MONTH_COL_WIDTH = 10
NA__RETRO__DEFAULT_TIMECARD_PATH = (
    NA__RETRO__APP_ROOT_PATH
    / "02__Src__AppModules"
    / "12__Feature__TimecardSystem"
    / "Na__Feature__Data__TimecardData__.json"
)


@dataclass(frozen=True)
class Na__Retro__EntryRef:
    month_key: str
    row_index: int
    date_value: str
    clock_in_value: str
    clock_out_value: str

    @property
    def label(self) -> str:
        date_display = Na__Retro__FormatDateForDisplay(self.date_value)
        clock_in_display = Na__Retro__FormatClockForDisplay(self.clock_in_value)
        clock_out_display = Na__Retro__FormatClockForDisplay(self.clock_out_value)
        month_display = str(self.month_key).replace("Timecard__", "")
        return (
            f"{date_display:<{NA__RETRO__LIST_DATE_COL_WIDTH}} | "
            f"{clock_in_display:>{NA__RETRO__LIST_TIME_COL_WIDTH}} | "
            f"{clock_out_display:>{NA__RETRO__LIST_TIME_COL_WIDTH}} | "
            f"{month_display:<{NA__RETRO__LIST_MONTH_COL_WIDTH}} | "
            f"Row {self.row_index:>2}"
        )


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Validation Helpers
# -----------------------------------------------------------------------------

def Na__Retro__IsValidClockText(clock_text: str) -> bool:
    time_text = str(clock_text or "").strip()
    if not time_text:
        return True
    parts = time_text.split(":")
    if len(parts) != 2:
        return False
    if not parts[0].isdigit() or not parts[1].isdigit():
        return False
    hour_value = int(parts[0])
    minute_value = int(parts[1])
    return 0 <= hour_value <= 23 and 0 <= minute_value <= 59 and len(parts[1]) == 2


def Na__Retro__UtcIsoNow() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def Na__Retro__TryParseCanonicalDate(date_text: str) -> datetime | None:
    value = str(date_text or "").strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def Na__Retro__FormatDateForDisplay(date_text: str) -> str:
    parsed_date = Na__Retro__TryParseCanonicalDate(date_text)
    if parsed_date is None:
        return str(date_text or "").strip() or "--"
    return parsed_date.strftime("%d-%b-%Y")


def Na__Retro__FormatClockForDisplay(clock_text: str) -> str:
    value = str(clock_text or "").strip()
    return value if value else "--:--"


def Na__Retro__ClockTextToSortMinutes(clock_text: str) -> int:
    value = str(clock_text or "").strip()
    if not Na__Retro__IsValidClockText(value) or not value:
        return -1
    hour_value, minute_value = value.split(":")
    return (int(hour_value) * 60) + int(minute_value)


def Na__Retro__BuildListHeaderText() -> str:
    return (
        f"{'Date':<{NA__RETRO__LIST_DATE_COL_WIDTH}} | "
        f"{'In':>{NA__RETRO__LIST_TIME_COL_WIDTH}} | "
        f"{'Out':>{NA__RETRO__LIST_TIME_COL_WIDTH}} | "
        f"{'Month':<{NA__RETRO__LIST_MONTH_COL_WIDTH}} | "
        f"Row"
    )


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Hash Integrity Helpers
# -----------------------------------------------------------------------------

def Na__Retro__BuildCanonicalHashInput(month_key: str, row_index: int, row_payload: dict) -> str:
    month_key_value = str(month_key or "").strip()
    row_index_value = str(row_index).strip()
    date_value = str(row_payload.get("Timecard__Date", "")).strip()
    clock_in_value = str(row_payload.get("Timcard__Clock-In__", "")).strip()
    clock_out_value = str(row_payload.get("Timcard__Clock-Out__", "")).strip()
    return f"{month_key_value}|{row_index_value}|{date_value}|{clock_in_value}|{clock_out_value}"


def Na__Retro__CreateAuthHash(month_key: str, row_index: int, row_payload: dict) -> str:
    canonical_input = Na__Retro__BuildCanonicalHashInput(month_key, row_index, row_payload)
    digest_hex = hashlib.sha256(canonical_input.encode("utf-8")).hexdigest()
    return f"sha256__{digest_hex}"


def Na__Retro__RepairAllAuthHashes(timecard_data: dict) -> int:
    repaired_count = 0
    for month_key, month_rows in timecard_data.items():
        if not isinstance(month_rows, list):
            continue
        for row_index, row_payload in enumerate(month_rows):
            if not isinstance(row_payload, dict):
                continue
            repaired_hash = Na__Retro__CreateAuthHash(month_key, row_index, row_payload)
            if row_payload.get("Timecard__AuthHash") != repaired_hash:
                row_payload["Timecard__AuthHash"] = repaired_hash
                repaired_count += 1
    return repaired_count


def Na__Retro__CreateTimestampedBackupFile(source_path: Path) -> Path:
    timestamp_label = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = source_path.with_name(f"{source_path.stem}__Backup__{timestamp_label}.bak.json")
    shutil.copy2(source_path, backup_path)
    return backup_path


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Tkinter App
# -----------------------------------------------------------------------------

class Na__RetrospectiveEditor__App:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("ValePlanner Retrospective Timecard Editor")
        self.root.geometry("1060x640")

        self.timecard_file_path = NA__RETRO__DEFAULT_TIMECARD_PATH
        self.timecard_data: dict = {}
        self.entry_refs: list[Na__Retro__EntryRef] = []

        self.file_path_var = tk.StringVar(value=str(self.timecard_file_path))
        self.status_var = tk.StringVar(value="Ready")
        self.clock_in_var = tk.StringVar()
        self.clock_out_var = tk.StringVar()
        self.reason_var = tk.StringVar(value="Retrospective correction")
        self.edited_by_var = tk.StringVar(value="Admin")
        self.selected_label_var = tk.StringVar(value="No day selected")
        self.list_header_var = tk.StringVar(value=Na__Retro__BuildListHeaderText())
        self.is_sort_descending = True
        self.sort_button_var = tk.StringVar(value="Sort: Newest First")

        self.Na__Retro__BuildUi()
        self.Na__Retro__LoadTimecardData()

    # SUB FUNCTION | Build Tkinter UI Layout
    # ------------------------------------------------------------
    def Na__Retro__BuildUi(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(2, weight=1)

        file_frame = ttk.LabelFrame(self.root, text="Timecard JSON")
        file_frame.grid(row=0, column=0, sticky="ew", padx=12, pady=(12, 8))
        file_frame.columnconfigure(0, weight=1)

        file_entry = ttk.Entry(file_frame, textvariable=self.file_path_var)
        file_entry.grid(row=0, column=0, sticky="ew", padx=(8, 6), pady=8)

        ttk.Button(
            file_frame,
            text="Reload",
            command=self.Na__Retro__LoadTimecardData
        ).grid(row=0, column=1, padx=(0, 8), pady=8)

        editor_frame = ttk.LabelFrame(self.root, text="Retrospective Editor")
        editor_frame.grid(row=1, column=0, sticky="ew", padx=12, pady=(0, 8))
        for column_index in range(4):
            editor_frame.columnconfigure(column_index, weight=1)

        ttk.Label(editor_frame, text="Selected Day").grid(row=0, column=0, sticky="w", padx=8, pady=(8, 2))
        ttk.Label(editor_frame, textvariable=self.selected_label_var).grid(
            row=1, column=0, columnspan=4, sticky="w", padx=8, pady=(0, 8)
        )

        ttk.Label(editor_frame, text="Clock In (HH:MM)").grid(row=2, column=0, sticky="w", padx=8, pady=(0, 2))
        ttk.Entry(editor_frame, textvariable=self.clock_in_var).grid(row=3, column=0, sticky="ew", padx=8, pady=(0, 8))

        ttk.Label(editor_frame, text="Clock Out (HH:MM or blank)").grid(row=2, column=1, sticky="w", padx=8, pady=(0, 2))
        ttk.Entry(editor_frame, textvariable=self.clock_out_var).grid(row=3, column=1, sticky="ew", padx=8, pady=(0, 8))

        ttk.Label(editor_frame, text="Reason").grid(row=2, column=2, sticky="w", padx=8, pady=(0, 2))
        ttk.Entry(editor_frame, textvariable=self.reason_var).grid(row=3, column=2, sticky="ew", padx=8, pady=(0, 8))

        ttk.Label(editor_frame, text="Edited By").grid(row=2, column=3, sticky="w", padx=8, pady=(0, 2))
        ttk.Entry(editor_frame, textvariable=self.edited_by_var).grid(row=3, column=3, sticky="ew", padx=8, pady=(0, 8))

        ttk.Button(
            editor_frame,
            text="Save Retrospective Edit",
            command=self.Na__Retro__SaveSelectedEntry
        ).grid(row=4, column=0, columnspan=2, sticky="ew", padx=8, pady=(0, 8))

        ttk.Button(
            editor_frame,
            text="Delete Selected Row",
            command=self.Na__Retro__DeleteSelectedEntry
        ).grid(row=4, column=2, columnspan=2, sticky="ew", padx=8, pady=(0, 8))

        list_frame = ttk.LabelFrame(self.root, text="Available Day Rows")
        list_frame.grid(row=2, column=0, sticky="nsew", padx=12, pady=(0, 8))
        list_frame.columnconfigure(0, weight=1)
        list_frame.rowconfigure(1, weight=1)

        list_toolbar = ttk.Frame(list_frame)
        list_toolbar.grid(row=0, column=0, columnspan=2, sticky="ew", padx=8, pady=(8, 4))
        list_toolbar.columnconfigure(0, weight=1)
        ttk.Label(
            list_toolbar,
            text="Date display format: DD-MMM-YYYY | Time format: HH:MM"
        ).grid(row=0, column=0, sticky="w")
        ttk.Button(
            list_toolbar,
            textvariable=self.sort_button_var,
            command=self.Na__Retro__ToggleSortOrder
        ).grid(row=0, column=1, sticky="e")

        ttk.Label(
            list_frame,
            textvariable=self.list_header_var,
            font=NA__RETRO__LIST_FONT
        ).grid(row=1, column=0, sticky="w", padx=(8, 0), pady=(0, 4))

        self.entry_listbox = tk.Listbox(
            list_frame,
            activestyle="dotbox",
            font=NA__RETRO__LIST_FONT
        )
        self.entry_listbox.grid(row=2, column=0, sticky="nsew", padx=(8, 0), pady=(0, 8))
        self.entry_listbox.bind("<<ListboxSelect>>", self.Na__Retro__OnListSelectionChanged)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.entry_listbox.yview)
        scrollbar.grid(row=2, column=1, sticky="ns", padx=(0, 8), pady=(0, 8))
        self.entry_listbox.configure(yscrollcommand=scrollbar.set)

        status_frame = ttk.Frame(self.root)
        status_frame.grid(row=3, column=0, sticky="ew", padx=12, pady=(0, 12))
        status_frame.columnconfigure(0, weight=1)
        ttk.Label(status_frame, textvariable=self.status_var).grid(row=0, column=0, sticky="w")
    # ------------------------------------------------------------

    # SUB FUNCTION | Load JSON and Populate Entry List
    # ------------------------------------------------------------
    def Na__Retro__LoadTimecardData(self) -> None:
        target_path = Path(self.file_path_var.get().strip())
        if not target_path.exists():
            messagebox.showerror("File Not Found", f"Could not find file:\n{target_path}")
            self.status_var.set("Load failed: file not found")
            return

        try:
            with target_path.open("r", encoding="utf-8") as json_file:
                payload = json.load(json_file)
        except json.JSONDecodeError as json_error:
            messagebox.showerror("JSON Error", f"Failed to parse JSON:\n{json_error}")
            self.status_var.set("Load failed: JSON parse error")
            return
        except OSError as io_error:
            messagebox.showerror("Read Error", f"Failed to read file:\n{io_error}")
            self.status_var.set("Load failed: file read error")
            return

        if not isinstance(payload, dict):
            messagebox.showerror("Invalid Data", "Timecard file must contain a JSON object at root.")
            self.status_var.set("Load failed: invalid JSON root")
            return

        self.timecard_file_path = target_path
        self.timecard_data = payload
        self.Na__Retro__RebuildEntryRefs()
        self.Na__Retro__RefreshListbox()
        sort_direction_label = "newest first" if self.is_sort_descending else "oldest first"
        self.status_var.set(
            f"Loaded {len(self.entry_refs)} day row(s) from {target_path.name} ({sort_direction_label})."
        )
    # ------------------------------------------------------------

    # SUB FUNCTION | Rebuild Flat Entry References
    # ------------------------------------------------------------
    def Na__Retro__RebuildEntryRefs(self) -> None:
        refs: list[Na__Retro__EntryRef] = []
        month_keys = sorted(self.timecard_data.keys(), reverse=True)
        for month_key in month_keys:
            month_rows = self.timecard_data.get(month_key)
            if not isinstance(month_rows, list):
                continue
            for row_index, row_value in enumerate(month_rows):
                if not isinstance(row_value, dict):
                    continue
                refs.append(
                    Na__Retro__EntryRef(
                        month_key=month_key,
                        row_index=row_index,
                        date_value=str(row_value.get("Timecard__Date", "")).strip(),
                        clock_in_value=str(row_value.get("Timcard__Clock-In__", "")).strip(),
                        clock_out_value=str(row_value.get("Timcard__Clock-Out__", "")).strip(),
                    )
                )
        self.entry_refs = self.Na__Retro__SortEntryRefs(refs)
    # ------------------------------------------------------------

    # SUB FUNCTION | Sort Entry References By Date and Time
    # ------------------------------------------------------------
    def Na__Retro__SortEntryRefs(self, refs: list[Na__Retro__EntryRef]) -> list[Na__Retro__EntryRef]:
        minimum_date_value = datetime(1970, 1, 1)

        def build_sort_key(entry_ref: Na__Retro__EntryRef) -> tuple:
            date_value = Na__Retro__TryParseCanonicalDate(entry_ref.date_value) or minimum_date_value
            clock_in_mins = Na__Retro__ClockTextToSortMinutes(entry_ref.clock_in_value)
            return (date_value, clock_in_mins, entry_ref.month_key, entry_ref.row_index)

        return sorted(refs, key=build_sort_key, reverse=self.is_sort_descending)
    # ------------------------------------------------------------

    # SUB FUNCTION | Toggle Date Sort Direction
    # ------------------------------------------------------------
    def Na__Retro__ToggleSortOrder(self) -> None:
        self.is_sort_descending = not self.is_sort_descending
        self.sort_button_var.set("Sort: Newest First" if self.is_sort_descending else "Sort: Oldest First")
        self.entry_refs = self.Na__Retro__SortEntryRefs(self.entry_refs)
        self.Na__Retro__RefreshListbox()
    # ------------------------------------------------------------

    # SUB FUNCTION | Refresh Listbox Content
    # ------------------------------------------------------------
    def Na__Retro__RefreshListbox(self) -> None:
        self.entry_listbox.delete(0, tk.END)
        for entry_ref in self.entry_refs:
            self.entry_listbox.insert(tk.END, entry_ref.label)
        self.selected_label_var.set("No day selected")
        self.clock_in_var.set("")
        self.clock_out_var.set("")
    # ------------------------------------------------------------

    # SUB FUNCTION | Handle Entry Selection
    # ------------------------------------------------------------
    def Na__Retro__OnListSelectionChanged(self, _event) -> None:
        entry_ref = self.Na__Retro__GetSelectedEntryRef()
        if entry_ref is None:
            return

        self.selected_label_var.set(entry_ref.label)
        self.clock_in_var.set(entry_ref.clock_in_value)
        self.clock_out_var.set(entry_ref.clock_out_value)
    # ------------------------------------------------------------

    # SUB FUNCTION | Resolve Currently Selected Entry Ref
    # ------------------------------------------------------------
    def Na__Retro__GetSelectedEntryRef(self) -> Na__Retro__EntryRef | None:
        selection = self.entry_listbox.curselection()
        if not selection:
            return None
        selected_index = selection[0]
        if selected_index < 0 or selected_index >= len(self.entry_refs):
            return None
        return self.entry_refs[selected_index]
    # ------------------------------------------------------------

    # SUB FUNCTION | Save Retrospective Edit to JSON
    # ------------------------------------------------------------
    def Na__Retro__SaveSelectedEntry(self) -> None:
        entry_ref = self.Na__Retro__GetSelectedEntryRef()
        if entry_ref is None:
            messagebox.showwarning("No Selection", "Select a day row before saving.")
            return

        new_clock_in = self.clock_in_var.get().strip()
        new_clock_out = self.clock_out_var.get().strip()
        reason_value = self.reason_var.get().strip() or "Retrospective correction"
        edited_by_value = self.edited_by_var.get().strip() or "Admin"

        if not Na__Retro__IsValidClockText(new_clock_in):
            messagebox.showerror("Invalid Time", "Clock In must be HH:MM (24-hour format).")
            return
        if not Na__Retro__IsValidClockText(new_clock_out):
            messagebox.showerror("Invalid Time", "Clock Out must be HH:MM (24-hour format) or blank.")
            return

        month_rows = self.timecard_data.get(entry_ref.month_key)
        if not isinstance(month_rows, list) or entry_ref.row_index >= len(month_rows):
            messagebox.showerror("Data Error", "Selected row no longer exists in loaded data.")
            return

        row_payload = month_rows[entry_ref.row_index]
        if not isinstance(row_payload, dict):
            messagebox.showerror("Data Error", "Selected row has invalid JSON structure.")
            return

        previous_clock_in = str(row_payload.get("Timcard__Clock-In__", "")).strip()
        previous_clock_out = str(row_payload.get("Timcard__Clock-Out__", "")).strip()
        previous_override = row_payload.get("Timecard__AdminOverride__")
        previous_original_clock_in = (
            str(previous_override.get("Timecard__OriginalClockIn", "")).strip()
            if isinstance(previous_override, dict)
            else ""
        )
        previous_original_clock_out = (
            str(previous_override.get("Timecard__OriginalClockOut", "")).strip()
            if isinstance(previous_override, dict)
            else ""
        )

        row_payload["Timcard__Clock-In__"] = new_clock_in
        row_payload["Timcard__Clock-Out__"] = new_clock_out
        row_payload["Timecard__AuthHash"] = ""
        row_payload["Timecard__AdminOverride__"] = {
            "Timecard__IsRetrospectiveEdit": True,
            "Timecard__EditedAtUtcIso": Na__Retro__UtcIsoNow(),
            "Timecard__Reason": reason_value,
            "Timecard__EditedBy": edited_by_value,
            "Timecard__OriginalClockIn": previous_original_clock_in or previous_clock_in,
            "Timecard__OriginalClockOut": previous_original_clock_out or previous_clock_out,
        }

        try:
            with self.timecard_file_path.open("w", encoding="utf-8", newline="\n") as json_file:
                json.dump(self.timecard_data, json_file, indent=2, ensure_ascii=False)
                json_file.write("\n")
        except OSError as io_error:
            messagebox.showerror("Write Error", f"Failed to write file:\n{io_error}")
            self.status_var.set("Save failed: file write error")
            return

        self.Na__Retro__RebuildEntryRefs()
        self.Na__Retro__RefreshListbox()
        self.status_var.set(
            f"Saved retrospective edit for {entry_ref.date_value} ({entry_ref.month_key}, row {entry_ref.row_index})."
        )
        messagebox.showinfo(
            "Saved",
            "Retrospective edit saved.\n\n"
            "- Times were updated.\n"
            "- Timecard__AdminOverride__ was injected.\n"
            "- Timecard__AuthHash was reset for app-side revalidation."
        )
    # ------------------------------------------------------------

    # SUB FUNCTION | Delete Selected Entry From JSON
    # ------------------------------------------------------------
    def Na__Retro__DeleteSelectedEntry(self) -> None:
        entry_ref = self.Na__Retro__GetSelectedEntryRef()
        if entry_ref is None:
            messagebox.showwarning("No Selection", "Select a day row before deleting.")
            return

        month_rows = self.timecard_data.get(entry_ref.month_key)
        if not isinstance(month_rows, list) or entry_ref.row_index >= len(month_rows):
            messagebox.showerror("Data Error", "Selected row no longer exists in loaded data.")
            return

        row_payload = month_rows[entry_ref.row_index]
        if not isinstance(row_payload, dict):
            messagebox.showerror("Data Error", "Selected row has invalid JSON structure.")
            return

        date_display = Na__Retro__FormatDateForDisplay(entry_ref.date_value)
        clock_in_display = Na__Retro__FormatClockForDisplay(entry_ref.clock_in_value)
        clock_out_display = Na__Retro__FormatClockForDisplay(entry_ref.clock_out_value)
        confirm_message = (
            "Delete this timecard row?\n\n"
            f"Date: {date_display}\n"
            f"Clock In: {clock_in_display}\n"
            f"Clock Out: {clock_out_display}\n"
            f"Month Key: {entry_ref.month_key}\n"
            f"Row Index: {entry_ref.row_index}\n\n"
            "A backup JSON file will be created before the row is removed."
        )
        if not messagebox.askyesno("Confirm Safe Delete", confirm_message, icon="warning"):
            return

        try:
            backup_path = Na__Retro__CreateTimestampedBackupFile(self.timecard_file_path)
        except OSError as io_error:
            messagebox.showerror("Backup Error", f"Failed to create backup file:\n{io_error}")
            self.status_var.set("Delete failed: backup could not be created")
            return

        deleted_row = month_rows.pop(entry_ref.row_index)
        repaired_count = Na__Retro__RepairAllAuthHashes(self.timecard_data)

        try:
            with self.timecard_file_path.open("w", encoding="utf-8", newline="\n") as json_file:
                json.dump(self.timecard_data, json_file, indent=2, ensure_ascii=False)
                json_file.write("\n")
        except OSError as io_error:
            month_rows.insert(entry_ref.row_index, deleted_row)
            Na__Retro__RepairAllAuthHashes(self.timecard_data)
            messagebox.showerror(
                "Write Error",
                "Failed to write updated file.\n\n"
                f"The original file was backed up here:\n{backup_path}\n\n"
                f"Error:\n{io_error}"
            )
            self.status_var.set("Delete failed: file write error")
            return

        self.Na__Retro__RebuildEntryRefs()
        self.Na__Retro__RefreshListbox()
        self.status_var.set(
            f"Deleted {entry_ref.date_value} ({entry_ref.month_key}, row {entry_ref.row_index}). "
            f"Repaired {repaired_count} hash value(s). Backup: {backup_path.name}"
        )
        messagebox.showinfo(
            "Deleted",
            "Selected timecard row deleted safely.\n\n"
            f"- Backup created: {backup_path.name}\n"
            f"- Repaired hashes: {repaired_count}\n"
            "- Remaining rows now match their current row indices."
        )
    # ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

def main() -> int:
    root = tk.Tk()
    Na__RetrospectiveEditor__App(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# endregion ----------------------------------------------------
