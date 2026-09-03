# Vale Drive Links

Turns a copied N drive path into a proper clickable hyperlink, pasted straight
into an Outlook message as formatted HTML.

Part of the **Vale Typing Shorthand** hotkey manager. Nothing extra to install
for the basic version. The Python tray app must be running, which it already is
if the startup shortcut is in place.

---

## The 10 second version

1. In Explorer, copy the file or folder.
   Either `Ctrl` + `C` on the item, or `Ctrl` + `Shift` + `C` for Copy as path.
2. In your Outlook message, type `;v_link` then press **space**.
3. A formatted, clickable link appears.

The clipboard is handed straight back to you afterwards, so the path you copied
is still there if you need it again.

### If you copied something else in between

You do not have to re-copy the path. If the live clipboard holds no path, for
example because you grabbed a screenshot since, the tool falls back to the most
recent Vale path still in **Windows clipboard history** (the `Win` + `V` panel).

When that happens a tray balloon tells you exactly which path it used, every
time and regardless of the notification settings. A link built from history was
not the last thing you copied, so it is never inserted silently. Check the
balloon, and if it picked the wrong one, copy the right path and retry.

Turn this off with `UseClipboardHistoryFallback` in the config if you would
rather it only ever used the live clipboard.

---

## Hotstring reference

Every trigger is followed by a **space** to fire it.

| Trigger            | What you get                                                            |
|--------------------|-------------------------------------------------------------------------|
| `;v_link`          | Boxed card. Bold file or folder name, grey path underneath. The default. |
| `;vlink`           | Identical to `;v_link`. Alias for when the underscore is awkward.        |
| `;v_link_min`      | Plain inline link showing just the file or folder name.                  |
| `;v_link_path`     | Plain inline link whose visible text is the full `N:\` path.             |
| `;v_link_web`      | Boxed card using the `valefile` scheme. Needs the handler installed.     |
| `;v_link_web_min`  | Inline link using the `valefile` scheme.                                 |
| `;v_link_both`     | One card carrying both link types. Widest compatibility.                 |
| `;v_link_txt`      | No hyperlink. Pastes the tidy `N:\` path as plain text.                  |
| `;v_unc`           | No hyperlink. Pastes the full `\\vale-fs1\...` server path as text.      |

Add or rename triggers in:
`05__HotString__AutoTypeDictionaries\Py__HotkeyManager__AutoTypeDictionary__ValeDriveLinks__.json`

Then use **Reload Hotstrings** on the tray icon. No restart needed.

---

## Why file:// links do not work, and what does

Tested here on 02-Sep-2026 and confirmed against Microsoft's own documentation.
`file://` links failed in **both** Outlook Classic and the Outlook PWA on this
machine. That is not a fault in the generated HTML: the anchor pastes intact and
renders as a proper blue underlined link. Outlook simply refuses to follow it.

| Client                       | `file://` | Why                                                            |
|------------------------------|-----------|----------------------------------------------------------------|
| New Outlook / Outlook on web | Blocked   | Blocked **by design**. Microsoft states there is no roadmap to restore it and recommends OneDrive or SharePoint links instead. |
| Outlook Classic              | Blocked   | Classic hands the URL to the default browser. Edge and Chrome refuse `file://` navigation. Edge needs the `IntranetFileLinksEnabled` policy before it will open one at all. |
| Teams                        | Blocked   | Browser based, same rule.                                       |

So `file://` is a dead end for internal file links, and getting worse rather
than better as Microsoft migrates everyone onto New Outlook.

**A registered custom URI scheme is the documented workaround**, and is what
Microsoft support threads point people at for exactly this problem. That is what
`valefile:` is. Windows hands the URI to the local handler, which resolves it to
a UNC path and opens it. The browser never has to navigate to a file path, so
nothing is blocked.

### The Edge 133 trap, and why this format avoids it

Edge 133 turned on `StandardCompliantNonSpecialSchemeURLParsing` by default,
which broke a great many custom protocol handlers. There is **no policy to turn
it off**. Handlers broke when their URLs were not valid per the WHATWG URL
standard, typically because they used backslashes, raw spaces, or no real
hostname, for example `myscheme://\\server\path\file name.docx`.

The format used here is deliberately standards clean and verified against the
same parser Edge enforces:

    valefile://vale-fs1/companydata$/Vale/Vale/Clients/2026%20Orders-Bespoke/...

Real hostname, forward slashes, every space percent encoded, no backslashes. It
parses and round trips unchanged. **If you ever hand edit the URL format, keep
those properties** or Edge 133 and later will silently stop opening the links.

**Every link also prints the readable `N:\` path underneath.** Anyone without the
handler installed can still select and copy that into Explorer, so a message is
never useless.

## Confirmed results, 02-Sep-2026

| Compose and read in | `file://` | `valefile:` (handler installed) |
|---------------------|-----------|----------------------------------|
| Outlook Classic     | Dead      | **Works. Confirmed.**            |
| New Outlook / PWA   | Dead      | Dead. Link is stripped on paste, renders as plain black underlined text. |

So this is a **Outlook Classic solution**. In New Outlook the custom protocol
link is removed the same way the file link is, which matches Microsoft's
documented behaviour that New Outlook strips custom protocol hyperlinks.

**Compose these emails in Outlook Classic.** Pasting into the PWA damages the
link before it is ever sent, so a Classic recipient would receive a dead link
too.

## Who can open the links you send

Both of these must be true for a recipient:

1. **They have run the installer on their own machine.** The handler lives on
   the recipient's PC, not in the email. Nothing done at send time changes this.
2. **They read the mail in Outlook Classic.**

Anyone else sees the link text and the readable `N:\` path beneath it, and can
copy that path into Explorer. That fallback is the reason the path sub line
exists, and it is why it should stay switched on.

### Rollout

1. Copy this `30__ValeDriveLinks` folder to a shared location on the N drive.
2. Ask people to double click `ValeDriveLink__ProtocolHandler__Install__.cmd`
   once. No admin rights needed, and it runs in place from N.
3. The registration points back at wherever the folder sits, so do not move it
   afterwards without re-running the installer.

### Known limitation and its shelf life

Microsoft is migrating everyone from Outlook Classic to New Outlook. When a
person is moved, these links stop being clickable for them, and there is no
setting that changes that.

The only link types New Outlook will follow are ordinary `http` and `https`
URLs. Making this survive that migration would mean an internal web address that
redirects to the file share, for example a small intranet endpoint at something
like `http://intranet.vale.local/n/<path>`. That needs a company web server, so
it is an IT decision rather than something this tool can do on its own.

`;v_link_both` exists but its `file://` half is now known to be dead. Prefer
plain `;v_link` plus the path sub line.

---

## Installing the valefile handler

One click, per computer, no administrator rights, nothing machine wide.

Double click:

    ValeDriveLink__ProtocolHandler__Install__.cmd

That writes a single key under `HKEY_CURRENT_USER\Software\Classes\valefile`
pointing at the launcher script sitting beside it.

To remove it again, double click `ValeDriveLink__ProtocolHandler__Remove__.cmd`.

### Rolling it out to the company

Copy this whole `30__ValeDriveLinks` folder somewhere everyone can reach on the
N drive, for example:

    N:\...\IT\ValeDriveLinks\

Then ask people to double click the installer once. The registration points back
at wherever the folder actually sits, so it runs in place from the N drive with
no local copy needed. It can also be pushed silently:

```bash
powershell -ExecutionPolicy Bypass -File "N:\...\ValeDriveLink__ProtocolHandler__Install__.ps1" -Quiet
```

### What people see the first time

The browser or Outlook asks for permission to open the link, naming the handler.
They tick the always allow box and are never asked again on that machine.

---

## Security

The handler is reachable from any email or web page once installed, so it is
deliberately narrow:

- **Server allow list.** Only `vale-fs1` is ever touched. Anything else is
  refused with a message. Edit `AllowedHosts` in the config to change this.
- **No directory traversal.** Any URI containing `..` is rejected outright.
- **No arbitrary execution.** Folders open in Explorer. Recognised document
  types (PDF, video, images, Office, CAD) open normally. Anything else is
  *revealed* in an Explorer window rather than launched, so the person decides.
  The permitted extension list is at the top of the launcher script.
- **Read only in effect.** The handler opens things. It never writes, moves or
  deletes anything.

---

## Configuration

`ValeDriveLink__Config__.json` in this folder. Edit it, then use **Reload
Hotstrings** on the tray icon.

| Key                | Notes                                                                  |
|--------------------|------------------------------------------------------------------------|
| `LinkScheme`       | `file` or `protocol`. The default for triggers that do not override it. Set to `protocol` once the handler is rolled out. |
| `FileUrlStyle`     | `Host` gives `file://vale-fs1/...`. `FiveSlash` gives `file://///vale-fs1/...`, the form Office itself emits. Flip this if file links will not open in your Outlook build. |
| `AllowedHosts`     | Servers the handler is permitted to open.                              |
| `DriveMapFallback` | Used to render the friendly `N:\` path, and as a backup if the live mapped drive query fails. |
| `ShowPathSubLine`  | Set false to drop the grey path line under each link.                  |
| `UseClipboardHistoryFallback` | Fall back to Windows clipboard history when the live clipboard holds no path. On by default. |
| `ClipboardHistoryMaxItems` | How far back through history to search. Default 20.               |
| `NotifyOnSuccess`  | Set true for a tray balloon on every paste. Off by default.            |
| `NotifyOnFailure`  | Tray balloon when the clipboard held nothing usable. On by default.    |

Colours, fonts and sizes are all in the same file.

---

## How it works

1. Reads the clipboard, preferring a copied file object over plain text, so both
   `Ctrl` + `C` and Copy as path work. Strips the quotes Windows adds.
2. Resolves the drive letter to its UNC target by querying the live mapped
   drives, falling back to the config map. Links are therefore written as
   `\\vale-fs1\...`, which works for colleagues whose drive letters differ or who
   have nothing mapped at all.
3. Builds the HTML with fully inline styles, because Outlook discards
   stylesheets, and lays it out in a table, which is the only layout Outlook
   renders predictably.
4. Places it on the clipboard in the Windows **CF_HTML** format alongside a plain
   text version. That is what makes `Ctrl` + `V` produce a live hyperlink instead
   of visible markup. The CF_HTML header carries byte offsets, so the generated
   HTML is deliberately kept to pure ASCII, with accented characters written as
   numeric entities. Anything else risks the offsets drifting and the paste
   arriving as raw text.
5. Deletes the typed trigger, pastes, then restores the path you had copied.

### If nothing happens when you type a trigger

The trigger text stays on screen rather than vanishing, and a tray balloon
explains why. Usually one of:

- Neither the clipboard nor clipboard history held a Vale path. Copy the item in
  Explorer and retry.
- The path was on a local drive such as `C:` or `D:`. Those cannot be shared, so
  no link is produced.
- The tray app is not running. Look for the Vale icon in the system tray.

**After editing `Py__HotkeyManager__ValeTypingShorthand__Main__.py` you must
fully restart the tray app.** Reload Hotstrings only re-reads the JSON
dictionaries, not the Python code itself. Exit from the tray icon, then run
`Launch__ValeTypingShorthand__Invisible__.vbs`.

---

## Files in this folder

| File                                             | Purpose                                    |
|--------------------------------------------------|--------------------------------------------|
| `ValeDriveLink__Config__.json`                    | Shared settings for the hotstrings and the handler |
| `ValeDriveLink__ProtocolHandler__Launcher__.ps1`  | Resolves a `valefile:` URI and opens it    |
| `ValeDriveLink__ProtocolHandler__Install__.ps1`   | Registers or removes the scheme            |
| `ValeDriveLink__ProtocolHandler__Install__.cmd`   | Double click installer                     |
| `ValeDriveLink__ProtocolHandler__Remove__.cmd`    | Double click uninstaller                   |
| `ValeDriveLink__ReadMe__.md`                      | This document                              |

The hotstring definitions live one folder up, in
`05__HotString__AutoTypeDictionaries\Py__HotkeyManager__AutoTypeDictionary__ValeDriveLinks__.json`,
and the engine is in `Py__HotkeyManager__ValeTypingShorthand__Main__.py`.
