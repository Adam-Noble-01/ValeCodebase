/* =============================================================================
 WHITECARDVISION - SHARED ELEMENT - API LOGGER
=============================================================================
 Uniform console logging around every Gemini / Flask API hop.
 Line format: [Wv API | 22-Apr-2026 13:45:02] SENT     POST /api/generate/render
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Log a request-sent event */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ApiLogger__LogSent(endpointString, payloadMeta) {
        console.info(
            Wv__SharedElements__ApiLogger__BuildPrefix() + ' SENT      ' + endpointString,
            payloadMeta || {}
        );
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Log a response-received event */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ApiLogger__LogReceived(endpointString, responseMeta, elapsedMilliseconds) {
        const elapsedSecondsText = ((elapsedMilliseconds || 0) / 1000).toFixed(2) + 's';
        console.info(
            Wv__SharedElements__ApiLogger__BuildPrefix() + ' RECEIVED  ' + endpointString + '  (' + elapsedSecondsText + ')',
            responseMeta || {}
        );
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Log an error response */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ApiLogger__LogError(endpointString, errorValue, elapsedMilliseconds) {
        const elapsedSecondsText = ((elapsedMilliseconds || 0) / 1000).toFixed(2) + 's';
        console.warn(
            Wv__SharedElements__ApiLogger__BuildPrefix() + ' ERROR     ' + endpointString + '  (' + elapsedSecondsText + ')',
            (errorValue && errorValue.message) ? errorValue.message : errorValue
        );
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Log an arbitrary informational line */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ApiLogger__LogInfo(eventTag, detailsObject) {
        console.info(
            Wv__SharedElements__ApiLogger__BuildPrefix() + ' ' + eventTag.padEnd(9, ' '),
            detailsObject || {}
        );
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Build the shared prefix string */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ApiLogger__BuildPrefix() {
        const dateFormatter = (window.Wv__AppUtils__DateFormat && window.Wv__AppUtils__DateFormat.Wv__DateFormat__FormatToDayMonYearTimeLocal)
            ? window.Wv__AppUtils__DateFormat.Wv__DateFormat__FormatToDayMonYearTimeLocal
            : null;
        const timestampText = dateFormatter ? dateFormatter(new Date()) : new Date().toISOString();
        return '[Wv API | ' + timestampText + ']';
    }
    /* ------------------------------------------------------------ */


    window.Wv__SharedElements__ApiLogger = {
        Wv__SharedElements__ApiLogger__LogSent,
        Wv__SharedElements__ApiLogger__LogReceived,
        Wv__SharedElements__ApiLogger__LogError,
        Wv__SharedElements__ApiLogger__LogInfo
    };

})();
