/* =============================================================================
 WHITECARDVISION - ASPECT RATIO MATH UTIL
=============================================================================
 FILE       : WhitecardVision__MathUtils__AspectRatio__.js
 NAMESPACE  : Wv
 MODULE     : MathUtils - AspectRatio
 PURPOSE    : Snap a raw width/height pair to the nearest Gemini-supported
              aspectRatio enum. Mirrors the Python server-side snapper so the
              browser's UI preview matches what the server will accept.
============================================================================= */

// =============================================================================
// REGION | Aspect Ratio Module
// =============================================================================

(function () {
    'use strict';

    const WV__ASPECT_RATIO__SUPPORTED_ENUM = [
        '1:1', '1:4', '1:8',
        '2:3', '3:2',
        '3:4', '4:3',
        '4:5', '5:4',
        '4:1', '8:1',
        '9:16', '16:9',
        '21:9'
    ];


    // FUNCTION | Snap (widthPx, heightPx) to the closest enum entry (log distance)
    // ------------------------------------------------------------
    function Wv__MathUtils__SnapToSupportedAspectRatio(widthPx, heightPx) {
        if (!widthPx || !heightPx) {
            return { rawRatio: 0, snappedAspectRatio: '', snappedDeltaPct: 0, widthPx: widthPx || 0, heightPx: heightPx || 0 };
        }
        const rawRatioValue = widthPx / heightPx;
        const rawLogValue   = Math.log(rawRatioValue);

        let bestDistance         = Infinity;
        let bestRatioString      = WV__ASPECT_RATIO__SUPPORTED_ENUM[0];
        for (const ratioStringCandidate of WV__ASPECT_RATIO__SUPPORTED_ENUM) {
            const [numStr, denStr]      = ratioStringCandidate.split(':');
            const candidateRatioValue   = Number(numStr) / Number(denStr);
            const candidateLogValue     = Math.log(candidateRatioValue);
            const distanceValue         = Math.abs(rawLogValue - candidateLogValue);
            if (distanceValue < bestDistance) {
                bestDistance    = distanceValue;
                bestRatioString = ratioStringCandidate;
            }
        }
        const [bestNumStr, bestDenStr] = bestRatioString.split(':');
        const snappedRatioValue        = Number(bestNumStr) / Number(bestDenStr);
        const deltaPercentage          = Math.abs((rawRatioValue / snappedRatioValue) - 1) * 100;
        return {
            widthPx              : widthPx,
            heightPx             : heightPx,
            rawRatio             : Number(rawRatioValue.toFixed(6)),
            snappedAspectRatio   : bestRatioString,
            snappedDeltaPct      : Number(deltaPercentage.toFixed(3))
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__MathUtils__AspectRatio = {
        Wv__MathUtils__SnapToSupportedAspectRatio,
        WV__ASPECT_RATIO__SUPPORTED_ENUM
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
