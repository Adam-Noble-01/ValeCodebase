# ValeVision Theia: DEVLOG

## Version 1.6.0, 08-Oct-2026: Share Dialog - Client and Staff Links Can't Be Mixed Up

**Asked by Adam:** the Share dialog was hard to read, and sales could send a client the wrong kind of link. Each
link type is now in its own panel, both closed when the dialog opens:
- **Client link, first:** a person icon on green, the tag "Safe to send to clients", and "For clients and
  anyone outside Vale: the player and the videos only…", plus "N active links for this project". Inside: the
  form, the new link, and the project's client links.
- **Staff link, second:** a lock icon on amber, the tag "Vale staff only", and "Needs a Vale sign-in. Never send
  it to a client." Inside, above the link: "Not for clients: this link asks for a Vale sign-in, so a client
  cannot open it. Use a client link instead."
- **One panel at a time:** opening one closes the other. Opening the client panel puts the cursor in "Who is it
  for?". When the dialog opens, the focus is on the client panel's header, not on a hidden field.
- **Copy says what it copied:** "Client link copied", or "Staff link copied (Vale staff only)". The account
  menu's "Copy a staff link to this video" says the same.

**Changes:**
- `Na__ShareLinks__Dialog__` 1.1.0: `Na__Share__Panel`; `Na__Share__Copy(text, copiedMessage)`.
- `Na__AppUtils__Dom__`: the `client` and `staff` icons.
- `Na__AppCore__TheiaApp__`: the menu item's message.
- The dialog stylesheet: the panels, badges, tags and warning. They use fixed green and amber, so they read the
  same in cinema.

**Checked** on the sandbox: both panels closed on opening, with the right icons, tags and active count; opening
either closes the other; the staff warning shows; the cursor lands in "Who is it for?".

## Version 1.5.2, 08-Oct-2026: More Air Under the Header on a Client's Link

**Asked by Adam.** On the client link (no breadcrumbs) the player sat 18 px under the header, which felt tight. It
now sits 40 px under it (`body.theia--client .theia-main`; 18 px on a phone). The page keeps 22 px more beside the
video's height (`--theia-chrome` 212 px instead of 190 px, used by the box's fit and the stage), so the whole video
and its details still fit the window. The staff view is unchanged: its breadcrumbs row gives it room.

**Checked** on the sandbox client link at 1920 x 960: 40 px from the header to the card; the card ends at 933 px.

## Version 1.5.1, 08-Oct-2026: The Breadcrumbs Sit on the Page

**Asked by Adam.** In 1.5.0 the breadcrumb card stretched across the whole box ("way too wide"): the page is a flex
column, so the inline card became as wide as the page. The breadcrumbs are now plain text on the page background:
no card, border or shadow, only as wide as their words, aligned to the box's left edge. Staff only; a client's link
has no breadcrumbs and already had the 1.5.0 layout (same page, same files).

**Changes:** `Na__CoreUi__Styles__App__` (`.theia-crumbs`). **Checked** on the sandbox at 1600 x 860: the crumbs
are 325 px wide with no background, border or shadow, flush with the box. The client link (guest bubble, no crumbs)
is centred with the divider, the count and the light blue row.

## Version 1.5.0, 08-Oct-2026: Player and List in One Centred Box

**Asked by Adam**, with screenshots and a mockup. On shorter screens a wide empty column opened between the player
and the list. Why: the player's width comes from the window's height, so the whole video shows without scrolling,
but the list sat in a fixed column at the far right of a page 1800 px wide. The shorter the screen, the narrower
the player and the wider the gap. Now:
- **One centred box:** `.theia-page` is exactly the player the height allows, plus the divider, plus the list
  (`--theia-fit`), and it is centred. The breadcrumbs and the footer share its edges. `--theia-aspect` now lives
  on `.theia-page` (set by `Na__Player__Controls__`); the stage inherits it.
- **The divider:** a 1 px line the height of the row, 28 px from the player and 28 px from the list
  (`--Theia_ColumnGap`).
- **"N videos"** at the right of "In this project" (Playlist 1.1.0).
- **The playing video's row:** light blue (`--Theia_ActiveBg` #e9f1f8) with a 3 px navy edge
  (`--Theia_ActiveLine`). In cinema, a muted blue-grey with a light edge.
- One column (1100 px and below, a tablet upright) is unchanged: the list full width under the player.

**Checked** on the sandbox:

| Window | Box centred | Gap player to list |
|---|---|---|
| 1536 x 730 | 192 / 192 px | 57 px (28 + 1 + 28) |
| 1920 x 1000 | 181 / 182 px | 57 px |
| 2560 x 1300 | 404 / 404 px | 57 px |
| 1024 x 1366 | one column, no divider | n/a |

The breadcrumbs and footer line up with the box; the count reads "3 videos"; the cinema colours follow.

## Version 1.4.5, 08-Oct-2026: Space Pauses, Ctrl+Space Stops

**Asked by Adam.**
- **Space pauses and plays, whatever has focus.** After clicking a video in the list, that list button kept the
  focus, and the keyboard module left Space to it, so Space "clicked" the video again instead of pausing. Space now
  always toggles play (its keyup is swallowed, so the focused button is not clicked too); only menus keep Space.
- **Ctrl+Space stops:** pauses and returns to the start. (Cmd+Space is the Mac's Spotlight, so Ctrl only.)

**Changes:** `Na__Player__Keyboard__` 1.2.0; service worker `2026-10-08-2`; README keys line.

## Version 1.4.4, 08-Oct-2026: The Header Bar and Thumbnails Join the Cinema

**Asked by Adam** (from the iPad): while a video plays, the page fades to the cinema grey but the white header bar
stuck out. Keep everything on the bar as it is; only the bar itself should fade with the page. Shade the list
thumbnails slightly too, to draw the eye to the player.

**Changes:**
- `Na__CoreUi__Styles__Variables__`: the cinema header override no longer restates `--Theia_HeaderBg`,
  `--Theia_HeaderLine` or `--Theia_Shadow`, so the bar, its rule and its shadow take the cinema values and fade
  with the page (1.2 s). The logo (a transparent PNG), "ValeVision THEIA" and the user bubble keep the Vale colours.
- `Na__UiFeature__Styles__Playlist__`: every thumbnail has a navy `::after` shade at 0, fading to 0.22 in the
  cinema. The "Playing" badge sits above it.
- Service worker `2026-10-08-1`.

**Checked live** (with transitions off, since a hidden browser pane does not animate): in the cinema the bar is
`#3a3f44`, the same as the page; its rule `#4a5157`; the title stays `#172b3a`. Pushed 07:13 UTC (stamp
`20261008-071355`).

## Version 1.4.3, 07-Oct-2026: Updates Reach Every Browser After a Push

**Asked by Adam:** every Vale app now refreshes the files a source push changed (the Server Manager's
deploy stamp, `/ValeApps__DeployStamp__.json`, read by the shared
`ValeShared__AppUpdate__.js`, loaded first in `index.html` with `data-app-base="/theia/"`).
- At start-up after a push, Theia fetches the changed files past the cache and reloads once.
- While open, it reloads by itself when it comes back to the screen with nothing to lose
  (`window.ValeAppUpdate__CanReload`: no video playing, no dialog, no edit open); otherwise a bar
  offers Reload.

**Changes:** `index.html` (the script); `Na__AppCore__TheiaApp__` 1.0.5 (the hook). Live 15:41 UTC.

## Version 1.4.2, 07-Oct-2026: New Files Reach an Installed App at Once

**Found from Adam's iPad**, still showing the clipped header after 1.4.1 went live. The page itself is served
"no-cache", but its stylesheets and modules reach browsers with a 4-hour `max-age` (Cloudflare's default when the
server names none), and the service worker fetched app files through that cache. So an installed app could keep old
files for up to 4 hours after a push, and could run a new module beside an old one.

**Changes:** service worker `2026-10-07-9`: app files are fetched with `cache: 'no-cache'` (checked with the server
every time; a 304 when unchanged, so it costs little), still falling back to the cached copy offline.

**For a device already holding old files:** open the app, close it fully, and open it again. The first opening
installs this worker (it takes over at once); the second loads everything fresh. Without that, the old files expire
by themselves within 4 hours.

## Version 1.4.1, 07-Oct-2026: iPad Layout, and the Header Under the Status Bar

**Asked by Adam** (from an iPad held upright, installed as an app).
- **One column on a tablet held upright.** At 1024 px wide the page kept two columns: the video was squeezed into
  about 600 px, the list sat beside it, and most of the screen below was empty. The page is now one column at 1100 px
  and below, and on any screen held upright up to 1400 px: the video and its details take the full width, and the
  list sits under them as a grid of cards (300 px or more each; a scheme's heading spans the row). Landscape iPads
  (1133 to 1366 px) keep the two columns, the video sized to the screen's height.
- **The header no longer clips.** In the installed app the page draws under the iPad's status bar; the header took
  that height out of its own 60 px, so the time sat on the logo and the navy rule cut through "HOUSES". The bar now
  grows by the status bar's height (`env(safe-area-inset-top)`) and its sides respect the safe area.

**Changes:** `Na__CoreUi__Styles__App__` (the header's height and padding, the one-column breakpoint);
`Na__UiFeature__Styles__Playlist__` (the grid of cards in one column).

**Checked** on the sandbox at 1024 x 1366 (one column, full-width video, the list as cards) and 1180 x 820 (two
columns); the header rule parses (60 px with no status bar, so 84 px under a 24 px one). The status bar itself is
still to be seen on the iPad.

## Version 1.4.0, 07-Oct-2026: The Spinner Instead of the Card; Escape or a Click Outside Pauses

**Asked by Adam.** The "Getting the video ready" card (the connection speed, the bar, "Starting in 8 s", Play now)
is gone: Theia shows the standard Vale spinner while it saves ahead, waits a sensible time for the video's length
and the connection, plays, and accepts the odd pause to catch up.

**Changes:**
- **The spinner:** the Vale ring of the start-up screen (80 px, 6 px, one turn a second; 56 px on a phone), in white
  over a light shade so it reads over a white render. It shows at once while Theia saves ahead, and half a second
  into any wait for data mid-play (a short hiccup never flashes it). The big play button hides behind it; the bar's
  button reads Pause, and pausing cancels the wait.
- **How long it waits:** until enough is saved to play to the end without stopping (from the video's bitrate and
  the measured connection, as before), or until a quarter of what is left to watch has passed, between 4 and 15
  seconds (`TheiaConfig__Player__StartWaitShareOfLength` 0.25, `StartWaitMinSeconds` 4, `StartWaitMaxSeconds` 15),
  whichever comes first. If that time comes with less than five seconds saved (`StartupBufferSeconds`), it waits
  for five, but never longer than three times the cap. A pause to catch up mid-video follows the same rule.
- **Escape**, or **a click on the page outside the player** (the margins, the list's heading, the footer), pauses
  the video, so the page fades back to the light Vale colours. Clicks on the player's card, the list's videos, the
  header, a dialog or the sign-in do their own job.

**Modules:** `Na__Quality__Policy__` 1.1.0 (WaitCapSeconds); `Na__Player__Controller__` 1.2.0 (the sized wait,
toggle cancels it, playNow removed); `Na__Player__Controls__` 1.2.0 (the spinner and shade; the card, the
connection-speed text and their imports removed); `Na__Player__Keyboard__` 1.1.0 (Escape);
`Na__Player__CinemaMode__` 1.1.0 (LeaveOnOutsideClick); `Na__AppCore__TheiaApp__` 1.0.4 (wires both); the player
stylesheet (the runway card, progress bar and card-meta rules removed); the config file and its defaults; service
worker `2026-10-07-8`.

**Checked** on the sandbox throttled to 9 Mbps: the spinner and shade show at once on play with no card. The wait,
on the controller itself: a fast line played at 2.5 s with all it needed; a slow line at the 15 s cap; a 16 s video
(4 s cap) once 5 s were saved, at 10 s; nothing arriving, at three caps. Escape, a click on the page and a click on
the list's heading each cancelled the wait and paused; a click on the card's details did not; the bar's button
cancelled it. The pane was hidden from Chrome during the test, so playback itself (which Chrome pauses for a hidden
page) is still to be seen on a real screen.

## Version 1.3.1, 07-Oct-2026: The Header Keeps the Vale Colours, and the Footer Moves Away From the Player

**Asked by Adam.**
- **The header bar no longer dims.** While a video plays the page still fades to the mid-dark grey, but the
  header keeps its light Vale look: white bar, navy rule, the navy logo (no longer turned white) and "ValeVision
  THEIA" in navy, and the user bubble as it always is. The header restates the light tokens for itself under
  `body.theia--cinema`, and takes its own text colour, so nothing in it follows the dim.
- **The footer sits at the foot of the window**, not 36 px under the player card where it drew the eye. The body,
  the main column and the watch page are columns the height of the window and the footer's auto margin takes the
  room left over; on a page taller than the window it keeps at least 96 px from what comes before it. The project
  index works the same way.

**Changes:** `Na__CoreUi__Styles__Variables__` (the header's own light tokens in the cinema),
`Na__CoreUi__Styles__App__` (no logo filter or title colour change; the footer layout; main's bottom padding
48 -> 22 px); service worker `2026-10-07-7`.

**Checked** on the sandbox with the cinema class on: header white, logo unfiltered, title navy (#172b3a) over the
dark page; footer 96 px below the player at 1280 x 720 and 1920 x 1200 (the player grows to the window's height,
so on a staff page with the breadcrumbs the footer starts just below the fold).

## Version 1.3.0, 07-Oct-2026: Fullscreen on a Phone Is Landscape

**Asked by Adam.** A video made fullscreen on a phone held upright filled only a strip across the middle of the
screen. Now:

**Changes:**
- **Android turns the screen itself.** A wide video (every one Theia publishes) made fullscreen on a phone or
  tablet locks the screen to landscape, either way round; leaving fullscreen lets it go. The viewer just turns
  the phone to match.
- **Everywhere else, a hint.** Where a page is not allowed to turn the screen (iPad, other browsers), fullscreen
  held upright shows a turning phone and "Turn your phone sideways for a bigger picture" in the middle of the
  picture: a moment after fullscreen starts (so an Android phone that has just turned never sees it), once per
  fullscreen, gone when the phone is turned, at the first touch, or after 4 s. It never takes a tap. With reduced
  motion the phone is drawn already on its side, still.
- **iPhone** is unchanged: fullscreen there is Apple's own player, which turns with the phone, and nothing of
  Theia's can be drawn over it.
- A computer (mouse, not touch) is never turned and never shown the hint.
- Config: `TheiaConfig__Player__LandscapeInFullscreen` (true; false switches both off) and
  `TheiaConfig__Player__RotateHintMs` (4000).

**Modules:** `Na__Player__Fullscreen__` 1.1.0 (WantsLandscape, the lock after fullscreen is granted, the release on
exit); `Na__Player__Controls__` 1.1.0 (the hint); `Na__AppUtils__Dom__` (a phone icon); the player stylesheet;
the config file and its defaults; service worker `2026-10-07-6`.

**Checked** on the sandbox at phone size (touch emulated): a 3240 x 2160 video wants landscape and asks for it
once fullscreen is granted; a browser that refuses (NotSupportedError, as an iPad does) refuses quietly; the
hint's look; at desktop size neither happens. The pane used for testing does not allow real fullscreen, so the
turn itself is still to be seen on an Android phone.

## Version 1.2.1, 07-Oct-2026: No More "Your Connection Is Slower" Banner

**Asked by Adam** (not helpful, and annoying). The banner over the video, "Your connection is slower than this
video needs. Theia is saving it ahead...", with its Got it button, is no longer shown. Nothing else changes: a slow
connection still fetches the window ahead exactly as before, and the "Getting the video ready" card still counts
down while the start is buffered. The "You are on mobile data" notice is unchanged.

**Changes:** `Na__AppCore__TheiaApp__` 1.0.3 (the connection-change listener that raised it is removed);
service worker `2026-10-07-5` (the app shell only; saved videos and pictures are kept).

**Checked:** syntax only.

## Version 1.2.0, 07-Oct-2026: Starts Within Seconds, Fetches a Window Ahead

**Asked by Adam.** Some videos took minutes before they played: Theia saved enough to finish without stopping
before it started, and fetched whole files ahead. With Holt's first videos at about 120 Mbps (4K, 60 fps,
Maximum) that meant most of a 1.7 GB file on a typical line. Adam is republishing at a lower bitrate; Theia now:

**Changes:**
- **The wait is capped at 12 seconds** (`TheiaConfig__Player__StartWaitMaxSeconds`), counted from the press of
  play (or, mid-video, from when it stopped), then the video plays while the download keeps ahead. The card says
  "Getting the video ready", counts down, and shows at once. A rare short pause beats a two-minute spinner.
- **A rolling window instead of whole files** (Prefetcher 1.1.0): 90 seconds ahead of the playhead
  (`TheiaConfig__Prefetch__AheadSeconds`; 60 on mobile data) and the first 20 seconds of the next three videos
  (`NextVideosHeadCount`). `CurrentVideoWholeFile` and `NextVideosWholeFile` are gone.
- **16 MB requests** (service worker `2026-10-07-4`): a missing piece is fetched with the missing pieces after
  it, up to four (16 MB), in one request, never past what was asked for. Pieces stay 4 MB in the cache (nothing
  already saved is lost) and each is played the moment it is in. Each request through Cloudflare costs about
  0.2 s before its first byte; there are now a quarter as many.
- The file's first piece is fetched once on a first visit (the player, the spinner and the prefetcher each
  fetched it: three 4 MB requests).

**Checked** on the sandbox throttled to 9 Mbps: requests of 16 and 12 MB, one first-piece request; a window
worth 11 MB fetched exactly 12 MB, and moving the playhead to 32 MB fetched only the next window; a 25.6 Mbps
video that needed 19 s saved ahead started at 12.0 s, both from play and after a stall.

## Version 1.1.0, 07-Oct-2026: The Player and Its Details Are One Card

**Asked by Adam.** The player and the text under it did not read as one element. The length, quality and
publish date can be inline, and the heading should be "ClientCode - Client Name | Title", then the
description.

**Changes:**
- **One card:** `.theia-stage` has the card's background, border, corners and shadow, and clips the video into
  its top corners. The player itself has no corners or shadow of its own. The details are the card's lower
  half, padded in (22 px; 16 px on a phone), under a hairline. The card follows the cinema colours.
- **One heading line:** "64135 - Holt | Exterior". The project number and name are in the secondary colour,
  then a faint bar, then the video's title in SemiBold. `Na__Theia__ProjectLine` now puts the number first.
- **Inline facts:** "0:25 · 4K · Published 07-Oct-2026" follow the heading on its line, dropping under it only
  when the row is full. The dots are their own elements, so none lands inside the 4K badge.
- Edit and Share stay at the right of the line; the description is under it.

**Checked** in a harness page: the real details panel and Theia's own stylesheets, around a still of Holt. At
1600 px the facts sit on the heading's line; in a narrow pane they wrap under it; the cinema colours apply to
the card.

## Version 1.0.0, 07-Oct-2026: Vale's Own Video Player

**Asked by Adam.** Vale Garden Houses' own video sharing platform, so clients stop watching Vale's work in
Google Drive, Dropbox or YouTube quality. Videos come from ValeVision 3D's Video Studio and are kept in each
project's `ValeVision__TheiaVideo` folder in the Projects Master Library. Staff reach a project's videos from
ValeVision Gallery and go back through breadcrumbs; clients get a simpler view-only page through share links.

**The app** (`Vale__ValeVision__TheiaVideoPlayer`, `/theia/`):
- The player is the page: video list on the right, in the Video Studio's order, each with its title, length and
  quality; details (title, description) under the picture. Pressing play on the picture goes fullscreen.
- Staff: breadcrumbs (Project Gallery / project / Videos), Share (staff links, and client links with a label,
  an expiry and a choice of videos; links can be switched off), the initials menu. Managers: Edit (title and
  description, written into the ValeVision 3D path too), order, hide, and flags for files below 2K or missing.
- Clients: the player and the shared videos only.
- The media cache (service worker): every byte kept in 4 MB pieces, served back in byte ranges; the next videos
  fetched ahead of time; a cached copy can never mix with a newer file (each URL carries the file's size and time).
- The runway: on a connection slower than the video, the start waits until enough is on the device to play to the
  end without stopping; the card says so and recommends Wi-Fi.
- An installable app (manifest, icons), "ValeVision Theia".

**The API** (`Server__Api\Api__ValeVision__TheiaVideoPlayer`, port 8005; the data model is
`Api__Shared\ValeShared__TheiaVideo__.py`, shared with the Gallery API):
- The videos for each audience; edits with `_rev` conflict checks and a revision kept on every write.
- Chunked, resumable uploads with a SHA-256 per chunk and a reserved head (the MP4 index is written last); every
  finished file is checked (a complete MP4, at least 2K) before it can be published.
- Publish (one file per video under a stable name, poster and thumbnail, the ValeVision 3D path stamped), sync from
  ValeVision 3D (newer title wins; order; removal, AppAdmin), delete (AppAdmin), share links.
- Tested with 74 checks against a sandbox library (`theia_api_tests.py`, kept outside the mirror).

**The same day, on Adam's notes:**
- **One file per video** at the path's own export settings, instead of 4K and 2K from one render: no second sizes,
  no quality menu, no switching on a stall (render time and storage; viewers are expected to have a good connection).
  The player's badge just says what the video is. A video published in two sizes by the morning's build still plays
  its larger file until it is published again; the republish deletes the 2K file.
- **Cinema** is a mid-dark grey (it was near-black), and only while a video is actually playing: pausing or the end
  of a video fades the page back to the Vale colours.
- **Layout and type:** the player and its details share one stage, so the title starts at the picture's left edge
  and Edit / Share end at its right, centred on the title's line. Open Sans Regular and SemiBold throughout, at the
  Gallery's sizes (the Baskerville titles are gone).
- **The start-up spinner** from ValeVision 3D, held until the first video has five seconds on the device (eight
  seconds at most).
- A last-edit time more than a day ahead of now (a PC clock far out, a test value) no longer wins the two-way sync.
- Copying a link falls back to the older copy command, then to showing the link to copy by hand; it never uses
  `prompt()`, which some browsers and app windows refuse (it threw an unhandled error there).
- **Header and the client's bubble** (Adam, on the live client view): the top right is ValeVision 3D's header,
  "ValeVision THEIA" in its title style, then the shared user bubble. A client's link gets the shared sign-in's
  new guest state (ValeShared__UserLogin 1.2.0, `ValeUserLogin.Guest`): a person icon, "Guest · View only",
  "Shared with you by Vale Garden Houses", the link's end date, and Copy a link to this video. The project's
  name, now with its number ("Holt - 64135"), moved out of the header to over the video's title.
- **Found going live:** a project whose Theia folder holds Adam's 0-byte placeholder data file
  (`64135__Holt__VideoAppData__.json`) could not be written: the shared JSON writer reads the file it replaces
  and threw on the empty one, so the first publish moved its files but listed nothing, and a title edit failed.
  An empty placeholder is now cleared before the first write, and a published video takes over a dropped-in
  entry written for the same files (so a video retitled before it is published is never listed twice). The API
  suite (82 checks) now starts from a 0-byte placeholder.
- Service worker version `2026-10-07-2`.
