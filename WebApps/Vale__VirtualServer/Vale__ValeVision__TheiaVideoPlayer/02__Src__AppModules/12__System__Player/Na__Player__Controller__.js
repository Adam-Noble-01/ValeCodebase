// =============================================================================
// VALEVISION THEIA - PLAYER - CONTROLLER (THE VIDEO ELEMENT AND ITS RULES)
// =============================================================================
//
// FILE       : Na__Player__Controller__.js
// NAMESPACE  : Na__Player
// MODULE     : Player - Controller
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Play a Theia video's one file in full quality without stalling:
//              hold back the start until enough is on the device, wait out a
//              stall the same way, remember where the viewer stopped
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - ONE <video> ELEMENT for every video, so fullscreen and the browser's
//   permission to play carry from one video to the next.
// - ONE FILE PER VIDEO, at the size it was made: there is nothing to switch
//   to, so the player never changes quality. It relies on the media cache and
//   the prefetcher instead.
// - LOAD sets the poster and the file's URL (through the service worker, so
//   every byte is kept), then sets the prefetch plan: this video from the
//   playhead, then the next ones in list order.
// - PLAY starts the element inside the click (iPhone and iPad need that), then
//   checks the RUNWAY (Na__Quality__RunwaySeconds): on a connection slower than
//   the video, it pauses and saves ahead ('runway' and 'runwayend' events: the
//   overlay shows the Vale spinner meanwhile).
// - THE WAIT IS SIZED TO THE VIDEO (Na__Quality__WaitCapSeconds; Adam,
//   07-Oct-2026): it ends when enough is saved to play to the end without
//   stopping, or at a quarter of what is left to watch (4 s to 15 s) once a few
//   seconds are in (Player__StartupBufferSeconds), whichever comes first. The
//   download keeps ahead while it plays; a slow line may pause it briefly.
// - A STALL (waiting longer than 2.5 s while playing) becomes the same wait, for
//   at least 10 s of video ahead, then playback carries on.
// - Pausing (the button, Space, Escape, a click outside the player) while it
//   waits cancels the wait.
// - FALLBACK: if the cached path errors (or nothing arrives in 15 s), the same
//   file is reloaded straight from the server (?theia-direct=1), at the same
//   moment. Without a service worker there is no runway: the browser buffers.
// - RESUME: the position is saved every 5 s (Na__Prefs), cleared at the end.
// - Events (EventTarget): videochange, sourcechange {file, reason}, runway
//   {needSec, aheadSec, capSec}, runwayend, fatal {message}, ended.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.2.0
// - The wait is sized to the video: a quarter of what is left to watch, 4 s to
//   15 s, and at least 5 s saved when that comes first (three times the cap at
//   most). The card and its Play now are gone: the overlay shows the spinner.
//   toggle() while waiting cancels the wait.
//
// 07-Oct-2026 - Version 1.1.0
// - The runway wait is capped at 12 s (Player__StartWaitMaxSeconds), then the
//   video plays while the download keeps ahead.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build. One file per video (the 4K / 2K switching was taken out the
//   same day, on Adam's call).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Prefs__Get, Na__Prefs__Set, Na__Prefs__SetResume } from '../03__AppUtils/Na__AppUtils__Prefs__.js';
    import { Na__MediaCache__IsActive, Na__MediaCache__CachedAhead } from '../10__System__MediaCache/Na__MediaCache__Client__.js';
    import { Na__Prefetch__SetPlan, Na__Prefetch__SetPlayhead } from '../10__System__MediaCache/Na__MediaCache__Prefetcher__.js';
    import { Na__Quality__CanDecode, Na__Quality__Mbps, Na__Quality__RunwaySeconds, Na__Quality__WaitCapSeconds } from '../11__System__Quality/Na__Quality__Policy__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Player__SAVE_EVERY_MS     = 5000;
    const Na__Player__PLAYHEAD_EVERY_MS = 2000;
    const Na__Player__LOAD_WATCHDOG_MS  = 15000;
    const Na__Player__RUNWAY_TICK_MS    = 700;
    const Na__Player__STALL_MS          = 2500;                                   // <-- Waiting this long while playing is a stall
    const Na__Player__STALL_RUNWAY_MIN  = 10;                                     // <-- After a stall, at least this many seconds on the device
    const Na__Player__WAIT_HARD_FACTOR  = 3;                                      // <-- However little is saved, it plays after three times the cap

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Controller
// -----------------------------------------------------------------------------

    // CLASS | The Player Controller
    // ------------------------------------------------------------
    class Na__Player__Controller extends EventTarget {

        constructor(video, projectId) {
            super();
            this.video        = video;
            this.projectId    = projectId;
            this.item         = null;                                         // <-- The video record from the API
            this.file         = null;                                         // <-- Its one file: { quality, width, height, url, ... }
            this.playlist     = [];
            this.direct       = !Na__MediaCache__IsActive();                  // <-- No worker: straight from the server
            this.startedOnce  = false;
            this.stallTimer   = null;
            this.watchdog     = null;
            this.runway       = null;                                         // <-- { resolve } while waiting
            this.lastSave     = 0;
            this.lastPlayhead = 0;

            video.volume = Math.min(1, Math.max(0, Number(Na__Prefs__Get('volume', 1))));
            video.muted  = !!Na__Prefs__Get('muted', false);
            video.preload = 'auto';
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.disablePictureInPicture = false;

            video.addEventListener('volumechange', () => { Na__Prefs__Set('volume', video.volume); Na__Prefs__Set('muted', video.muted); });
            video.addEventListener('timeupdate', () => this._onTime());
            video.addEventListener('waiting', () => this._onWaiting());
            video.addEventListener('playing', () => { this.startedOnce = true; this._clearStall(); });
            video.addEventListener('canplay', () => this._clearStall());
            video.addEventListener('seeking', () => this._clearStall());
            video.addEventListener('loadedmetadata', () => this._clearWatchdog());
            video.addEventListener('error', () => this._onError());
            video.addEventListener('ended', () => {
                if (this.item) Na__Prefs__SetResume(this.projectId, this.item.id, 0);
                this.dispatchEvent(new CustomEvent('ended'));
            });
        }

        // ---------------------------------------------------------------
        // LOADING
        // ---------------------------------------------------------------

        // FUNCTION | The Ordered List the Prefetcher Follows
        setPlaylist(videos) {
            this.playlist = (videos || []).slice();
            this._plan();
        }

        // FUNCTION | Load a Video: { startTime, autoplay }
        load(item, options) {
            const opts = options || {};
            this.cancelRunway();
            this._clearStall();
            this.item = item;
            this.startedOnce = false;
            this.video.poster = item.posterUrl || '';
            this.dispatchEvent(new CustomEvent('videochange', { detail: { item } }));
            if (!item.file) {
                this.dispatchEvent(new CustomEvent('fatal', { detail: { message: 'This video has no file at 2K or above, so it cannot be played.' } }));
                return;
            }
            this._setSource(item.file, opts.startTime || 0, !!opts.autoplay, 'load');
        }

        // HELPER | Point the element at the file, keeping the moment
        _setSource(file, startTime, autoplay, reason) {
            this.file = file;
            const v = this.video;
            v.src = this._url(file);
            v.load();
            const seekTo = Math.max(0, Number(startTime) || 0);
            v.addEventListener('loadedmetadata', () => {
                if (seekTo > 0 && seekTo < (v.duration || Infinity) - 1) v.currentTime = seekTo;
                if (autoplay) this.play();
            }, { once: true });
            this._armWatchdog();
            this.dispatchEvent(new CustomEvent('sourcechange', { detail: { file, reason } }));
            this._plan();
        }

        _url(file) {
            if (!this.direct) return file.url;
            return file.url + (file.url.indexOf('?') >= 0 ? '&' : '?') + 'theia-direct=1';
        }

        // FUNCTION | Reload the current video (its file changed on the server)
        reload(item) {
            const t = this.video.currentTime, playing = !this.video.paused;
            this.load(item || this.item, { startTime: t, autoplay: playing });
        }

        // ---------------------------------------------------------------
        // PLAYING
        // ---------------------------------------------------------------

        // FUNCTION | Play, Through the Runway When the Connection Is Slower Than the Video
        async play() {
            const v = this.video;
            if (!this.file || this.runway) return;
            const started = v.play();                                         // <-- Inside the click: unlocks playback on iPhone and iPad
            if (started && started.catch) started.catch(() => {});
            const need = this._runwayNeed();
            if (need <= 0) return;
            const began = performance.now();                                  // <-- The wait counts from the press of play
            const ahead = await Promise.race([this._aheadSeconds(),           // <-- A slow answer (the file's first chunk still coming) means not enough yet
                                              new Promise((resolve) => setTimeout(() => resolve(-1), 400))]);
            if (ahead >= need) return;
            v.pause();
            const ok = await this._waitRunway(need, began, Math.max(0, ahead));
            if (ok) v.play().catch(() => {});
        }

        pause()            { this.cancelRunway(); this.video.pause(); }
        toggle()           { if (!this.runway && (this.video.paused || this.video.ended)) this.play(); else this.pause(); }   // <-- Waiting counts as playing
        seek(seconds)      { const d = this.video.duration || 0; this.video.currentTime = Math.max(0, Math.min(d ? d - 0.1 : seconds, seconds)); }
        seekBy(delta)      { this.seek((this.video.currentTime || 0) + delta); }
        setVolume(volume)  { this.video.volume = Math.min(1, Math.max(0, volume)); if (volume > 0) this.video.muted = false; }
        toggleMute()       { this.video.muted = !this.video.muted; }

        // FUNCTION | Stop Waiting (pause, a new video)
        cancelRunway() {
            if (!this.runway) return;
            const r = this.runway;
            this.runway = null;
            r.resolve(false);
            this.dispatchEvent(new CustomEvent('runwayend'));
        }

        // FUNCTION | Seconds of the Current Video Held on This Device From the Playhead (null: not known)
        async aheadSeconds() {
            if (!this.file || !Na__MediaCache__IsActive()) return null;
            return this._aheadSeconds();
        }

        // ---------------------------------------------------------------
        // THE RUNWAY
        // ---------------------------------------------------------------

        _remainingSeconds() {
            const v = this.video;
            const duration = v.duration || ((this.item && this.item.durationMs) || 0) / 1000;
            return Math.max(0, duration - (v.currentTime || 0));
        }

        _runwayNeed(minimum) {
            if (this.direct || !Na__MediaCache__IsActive() || !this.file) return 0;
            const remaining = this._remainingSeconds();
            const need = Na__Quality__RunwaySeconds(this.file, remaining);
            return minimum ? Math.min(remaining, Math.max(need, minimum)) : need;
        }

        // Bytes into the file at a moment (the moov box first, then the frames, roughly evenly)
        _byteAt(seconds) {
            const f = this.file;
            const duration = this.video.duration || (f.durationMs || this.item.durationMs || 1) / 1000;
            const head = f.fastStart ? (f.moovOffset || 0) + (f.moovBytes || 0) : 0;
            return Math.floor(head + Math.min(1, Math.max(0, seconds / duration)) * Math.max(0, (f.bytes || 0) - head));
        }

        async _aheadSeconds() {
            const f = this.file;
            const answer = await Na__MediaCache__CachedAhead(f.url, this._byteAt(this.video.currentTime || 0));
            return answer && answer.bytes ? answer.bytes / (Na__Quality__Mbps(f) * 125000) : 0;   // <-- No answer: nothing known ahead
        }

        // Wait until needSec is saved ahead (enough to play to the end without
        // stopping), or until the cap - a share of what is left to watch
        // (Na__Quality__WaitCapSeconds) - once a few seconds are in
        // (Player__StartupBufferSeconds). Counted from began, by timers, so a slow
        // cache check can never stretch it; after three caps it plays regardless.
        _waitRunway(needSec, began, aheadNow) {
            const capSec = Na__Quality__WaitCapSeconds(this._remainingSeconds());
            const floorSec = Math.min(needSec, Math.max(0, Number(Na__AppConfig__Get('Player__StartupBufferSeconds', 5)) || 5));
            const start = began || performance.now();
            const msLeft = (seconds) => Math.max(0, seconds * 1000 - (performance.now() - start));
            return new Promise((resolve) => {
                const runway = { resolve };
                this.runway = runway;
                let ahead = Math.max(0, aheadNow || 0), capped = false, capTimer = null, hardTimer = null;
                const finish = () => {
                    if (this.runway !== runway) return;                     // <-- Already ended: a pause, a new video
                    clearTimeout(capTimer);
                    clearTimeout(hardTimer);
                    this.runway = null;
                    this.dispatchEvent(new CustomEvent('runwayend'));
                    resolve(true);
                };
                capTimer = setTimeout(() => { capped = true; if (ahead >= floorSec) finish(); }, msLeft(capSec));
                hardTimer = setTimeout(finish, msLeft(capSec * Na__Player__WAIT_HARD_FACTOR));
                const tick = async () => {
                    if (this.runway !== runway) return;
                    ahead = await this._aheadSeconds();
                    if (this.runway !== runway) return;
                    if (ahead >= needSec || (capped && ahead >= floorSec)) finish();
                    else setTimeout(tick, Na__Player__RUNWAY_TICK_MS);
                };
                this.dispatchEvent(new CustomEvent('runway', { detail: { needSec, aheadSec: ahead, capSec } }));   // <-- The spinner shows at once
                tick();
            });
        }

        // ---------------------------------------------------------------
        // STALLS, ERRORS, TIME
        // ---------------------------------------------------------------

        _onWaiting() {
            if (this.video.seeking || this.runway || this.video.paused) return;
            this._clearStall();
            this.waitingSince = performance.now();                           // <-- A stall's pause counts from here, not from its detection
            this.stallTimer = setTimeout(() => this._onStall(), Na__Player__STALL_MS);
        }

        async _onStall() {
            this.stallTimer = null;
            const need = this._runwayNeed(Na__Player__STALL_RUNWAY_MIN);
            if (need <= 0) return;
            this.video.pause();
            const ok = await this._waitRunway(need, this.waitingSince || performance.now(), 0);
            if (ok) this.video.play().catch(() => {});
        }

        _clearStall() {
            if (this.stallTimer) { clearTimeout(this.stallTimer); this.stallTimer = null; }
        }

        _armWatchdog() {
            this._clearWatchdog();
            if (this.direct) return;
            this.watchdog = setTimeout(() => { if (navigator.onLine) this._fallBack('Nothing arrived through the media cache'); }, Na__Player__LOAD_WATCHDOG_MS);
        }

        _clearWatchdog() {
            if (this.watchdog) { clearTimeout(this.watchdog); this.watchdog = null; }
        }

        _onError() {
            const error = this.video.error;
            if (!this.file || !error) return;
            if (!this.direct) { this._fallBack(`media error ${error.code}`); return; }
            const f = this.file;
            const tooBig = !Na__Quality__CanDecode(f) || error.code === 3 || error.code === 4;   // <-- Decode or format: the device, not the line
            this.dispatchEvent(new CustomEvent('fatal', { detail: { message: tooBig
                ? `This video is ${f.quality} (${f.width} × ${f.height}) and this device could not play it. Try a computer, or a newer phone or tablet.`
                : 'This video could not be played. Check your connection and try again.' } }));
        }

        _fallBack(why) {
            console.warn(`[Theia] ${why}: playing straight from the server.`);
            this.direct = true;
            this._setSource(this.file, this.video.currentTime, !this.video.paused, 'direct');
        }

        _onTime() {
            const now = performance.now();
            const t = this.video.currentTime || 0;
            if (now - this.lastPlayhead > Na__Player__PLAYHEAD_EVERY_MS) {
                this.lastPlayhead = now;
                Na__Prefetch__SetPlayhead(this._byteAt(t));
            }
            if (!this.video.paused && now - this.lastSave > Na__Player__SAVE_EVERY_MS && this.item) {
                this.lastSave = now;
                const d = this.video.duration || 0;
                const min = Number(Na__AppConfig__Get('Player__ResumeMinSeconds', 8)) || 8;
                Na__Prefs__SetResume(this.projectId, this.item.id, (t > min && t < d - 10) ? t : 0);
            }
        }

        // HELPER | Tell the prefetcher: this video from the playhead, then the rest in order
        _plan() {
            if (!this.item || !this.file) return;
            const toItem = (f) => ({ url: f.url, size: f.bytes || 0, mbps: Na__Quality__Mbps(f), playheadByte: 0,
                                     moovOffset: f.moovOffset || 0, moovBytes: f.moovBytes || 0, fastStart: !!f.fastStart });
            const current = Object.assign(toItem(this.file), { playheadByte: this._byteAt(this.video.currentTime || 0) });
            const at = this.playlist.findIndex((v) => v.id === this.item.id);
            const after = at >= 0 ? this.playlist.slice(at + 1).concat(this.playlist.slice(0, at)) : this.playlist;
            const upcoming = after.map((v) => v.file).filter(Boolean).map(toItem);
            if (current.size) Na__Prefetch__SetPlan({ current, upcoming: upcoming.filter((u) => u.size) });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Player__Controller };

// endregion -------------------------------------------------------------------
