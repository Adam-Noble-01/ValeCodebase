# TKINTER FILE PICKER + WINDOWS FILETIMES UPDATER
# Sets Date Created, Date Modified, and Date Accessed to the target local time.
# Target default: 26/09/2025 11:00am (edit TARGET_DATE and TARGET_TIME).
# Windows only. No external dependencies.

import os
import sys
import ctypes
from ctypes import wintypes
from datetime import datetime, timezone
import tkinter as tk
from tkinter import filedialog, messagebox

# ----------------------------
# Configuration
# ----------------------------
TARGET_DATE = "26/09/2025"
TARGET_TIME = "10:56am"  # 12 hour format with am or pm
# ----------------------------

if os.name != "nt":
    raise SystemExit("This script only runs on Windows.")

# Windows API setup
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

FILE_WRITE_ATTRIBUTES = 0x00000100
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
FILE_SHARE_DELETE = 0x00000004
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x00000080
INVALID_HANDLE_VALUE = wintypes.HANDLE(-1).value

class FILETIME(ctypes.Structure):
    _fields_ = [
        ("dwLowDateTime", wintypes.DWORD),
        ("dwHighDateTime", wintypes.DWORD),
    ]

kernel32.CreateFileW.argtypes = [
    wintypes.LPCWSTR,  # lpFileName
    wintypes.DWORD,    # dwDesiredAccess
    wintypes.DWORD,    # dwShareMode
    wintypes.LPVOID,   # lpSecurityAttributes
    wintypes.DWORD,    # dwCreationDisposition
    wintypes.DWORD,    # dwFlagsAndAttributes
    wintypes.HANDLE,   # hTemplateFile
]
kernel32.CreateFileW.restype = wintypes.HANDLE

kernel32.SetFileTime.argtypes = [
    wintypes.HANDLE,                   # hFile
    ctypes.POINTER(FILETIME),          # lpCreationTime
    ctypes.POINTER(FILETIME),          # lpLastAccessTime
    ctypes.POINTER(FILETIME),          # lpLastWriteTime
]
kernel32.SetFileTime.restype = wintypes.BOOL

kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.CloseHandle.restype = wintypes.BOOL

def to_windows_filetime(dt_utc: datetime) -> FILETIME:
    """Convert an aware UTC datetime to a Windows FILETIME structure."""
    if dt_utc.tzinfo is None or dt_utc.tzinfo.utcoffset(dt_utc) is None:
        raise ValueError("dt_utc must be timezone aware in UTC.")
    # 11644473600 seconds between 1601-01-01 and 1970-01-01
    EPOCH_AS_FILETIME = 116444736000000000  # 100 ns ticks
    filetime_int = EPOCH_AS_FILETIME + int(dt_utc.timestamp() * 10_000_000)
    return FILETIME(filetime_int & 0xFFFFFFFF, filetime_int >> 32)

def set_file_times(path: str, dt_utc: datetime) -> None:
    """Set creation, last access, and last write times to dt_utc."""
    ft = to_windows_filetime(dt_utc)

    handle = kernel32.CreateFileW(
        path,
        FILE_WRITE_ATTRIBUTES,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None,
    )

    if handle == INVALID_HANDLE_VALUE:
        error = ctypes.get_last_error()
        raise OSError(error, f"CreateFileW failed for {path} (err={error})")

    try:
        ok = kernel32.SetFileTime(handle, ctypes.byref(ft), ctypes.byref(ft), ctypes.byref(ft))
        if not ok:
            error = ctypes.get_last_error()
            raise OSError(error, f"SetFileTime failed for {path} (err={error})")
    finally:
        kernel32.CloseHandle(handle)

def parse_target_local_datetime(date_str: str, time_str: str) -> datetime:
    """Parse target date and time as local time and return UTC aware datetime."""
    # Normalise am or pm
    t_norm = time_str.strip().lower().replace(" ", "")
    if t_norm.endswith("a.m.") or t_norm.endswith("p.m."):
        t_norm = t_norm.replace(".", "")
    # Build naive local time
    dt_local_naive = datetime.strptime(f"{date_str} {t_norm.upper()}", "%d/%m/%Y %I:%M%p")
    # Attach system local timezone and convert to UTC
    local_tz = datetime.now().astimezone().tzinfo
    dt_local = dt_local_naive.replace(tzinfo=local_tz)
    return dt_local.astimezone(timezone.utc)

def main():
    # Tk root first so message boxes work even on early errors
    root = tk.Tk()
    root.withdraw()

    try:
        dt_utc = parse_target_local_datetime(TARGET_DATE, TARGET_TIME)
    except Exception as exc:
        messagebox.showerror("Invalid Date or Time", f"Could not parse the target date or time.\n{exc}")
        sys.exit(1)

    filetypes = [
        ("Image files", "*.jpg;*.jpeg;*.png;*.gif;*.tif;*.tiff;*.bmp;*.heic;*.webp"),
        ("All files", "*.*"),
    ]
    paths = filedialog.askopenfilenames(
        title="Select image files to timestamp",
        filetypes=filetypes,
    )
    if not paths:
        return

    updated = 0
    errors = []

    for p in paths:
        try:
            set_file_times(p, dt_utc)
            updated += 1
        except Exception as e:
            errors.append((p, str(e)))

    msg = [f"Updated {updated} file(s) to {TARGET_DATE} {TARGET_TIME}."]
    if errors:
        msg.append("")
        msg.append("Errors:")
        for path, err in errors[:10]:
            msg.append(f"- {path}: {err}")
        if len(errors) > 10:
            msg.append(f"- and {len(errors) - 10} more.")

    messagebox.showinfo("Finished", "\n".join(msg))

if __name__ == "__main__":
    main()
