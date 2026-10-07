// =============================================================================
// VALEVISION THEIA - QUALITY - POLICY (ONE FILE, FULL QUALITY, NO STALLS)
// =============================================================================
//
// FILE       : Na__Quality__Policy__.js
// NAMESPACE  : Na__Quality
// MODULE     : Quality - Policy
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The rules for the one file a video has: how fast a connection it
//              needs, how much must be on the device before it starts when the
//              connection is slower than that, and whether the device can decode it
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - ONE FILE PER VIDEO, at the size it was made (Adam, 07-Oct-2026): there is no
//   second size to fall back to and no quality menu. Viewers are expected to
//   have a good connection; Theia's cache and buffering do the rest. Nothing
//   below 2K is ever offered (the API holds that floor).
// - THE RUNWAY. When the connection is slower than the video, it would stall
//   partway. Instead Theia holds back the start until enough is on the device
//   to play to the end without stopping:
//       seconds needed = remaining x (1 - connection / bitrate) + safety
//   The player shows the Vale spinner meanwhile.
// - THE WAIT IS SIZED TO THE VIDEO (WaitCapSeconds; Adam, 07-Oct-2026): no
//   longer than a quarter of what is left to watch, between 4 s and 15 s
//   (Player__StartWaitShareOfLength / MinSeconds / MaxSeconds). On a line too
//   slow to save the whole runway in that time, the video starts anyway and the
//   download keeps ahead; it may pause briefly to catch up.
// - CanDecode asks the browser about the file's codec (canPlayType), so a
//   device that cannot play it is told plainly rather than shown a black box.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.1.0
// - WaitCapSeconds: the longest the spinner waits, from the video's length.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build. One file per video: the 4K / 2K choice and the step down on
//   a stall were taken out the same day, on Adam's call.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Policy
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Connection__EstimateMbps } from './Na__Quality__ConnectionMonitor__.js';

    const Na__Quality__Probe = document.createElement('video');


    // HELPER FUNCTION | Can This Browser Decode the File?
    // ------------------------------------------------------------
    function Na__Quality__CanDecode(file) {
        const codec = String((file && file.codec) || 'avc1.640033');
        try { return Na__Quality__Probe.canPlayType(`video/mp4; codecs="${codec}"`) !== ''; }
        catch (error) { return true; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A File's Bitrate in Mbps (from the file; or estimated from its size and length)
    // ------------------------------------------------------------
    function Na__Quality__Mbps(file) {
        if (file.bitrateKbps) return file.bitrateKbps / 1000;
        return file.bytes && file.durationMs ? (file.bytes * 8) / (file.durationMs * 1000) : 30;
    }
    // ------------------------------------------------------------


    // FUNCTION | Seconds That Must Be on the Device Before Playing On, Without Stalls (0 = start now)
    // ------------------------------------------------------------
    function Na__Quality__RunwaySeconds(file, remainingSeconds) {
        const estimate = Na__Connection__EstimateMbps();
        if (estimate === null || !file) return 0;
        const ratio = estimate / Na__Quality__Mbps(file);
        if (ratio >= (Number(Na__AppConfig__Get('Connection__SlowNoticeFactor', 1.05)) || 1.05)) return 0;
        const safety = Number(Na__AppConfig__Get('Connection__SafetySeconds', 4)) || 4;
        return Math.min(Math.max(0, remainingSeconds), Math.max(0, remainingSeconds * (1 - ratio)) + safety);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Longest the Spinner Waits Before Playing (seconds): a share of what is left to watch, within bounds
    // ------------------------------------------------------------
    function Na__Quality__WaitCapSeconds(remainingSeconds) {
        const share = Number(Na__AppConfig__Get('Player__StartWaitShareOfLength', 0.25)) || 0.25;
        const min = Number(Na__AppConfig__Get('Player__StartWaitMinSeconds', 4)) || 4;
        const max = Math.max(min, Number(Na__AppConfig__Get('Player__StartWaitMaxSeconds', 15)) || 15);
        return Math.min(max, Math.max(min, Math.max(0, Number(remainingSeconds) || 0) * share));
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Connection Slower Than This File Needs?
    // ------------------------------------------------------------
    function Na__Quality__IsStruggling(file) {
        const estimate = Na__Connection__EstimateMbps();
        return estimate !== null && !!file &&
               estimate < Na__Quality__Mbps(file) * (Number(Na__AppConfig__Get('Connection__SlowNoticeFactor', 1.05)) || 1.05);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Quality__CanDecode,
        Na__Quality__Mbps,
        Na__Quality__RunwaySeconds,
        Na__Quality__WaitCapSeconds,
        Na__Quality__IsStruggling
    };

// endregion -------------------------------------------------------------------
