// =============================================================================
// VALEVISION3D - FEATURE - FULL SCREEN MODE - BROWSER SUPPORT LOGIC
// =============================================================================
//
// FILE       : Na__Feature__FullScreenMode__BrowserSupportLogic__.js
// NAMESPACE  : Na__Feature__FullScreenMode
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Detect and execute cross-browser Fullscreen API methods
// CREATED    : 20-Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | API Resolver - Cross Browser Fullscreen Method Mapping
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Browser Fullscreen API Map
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__ResolveApiMap() {
        const documentRef = document;
        const elementRef = document.documentElement;

        if (elementRef && typeof elementRef.requestFullscreen === 'function') {
            return {
                requestMethodName : 'requestFullscreen',
                exitMethodName    : 'exitFullscreen',
                elementPropName   : 'fullscreenElement',
                enabledPropName   : 'fullscreenEnabled',
                changeEventName   : 'fullscreenchange'
            };
        }

        if (elementRef && typeof elementRef.webkitRequestFullscreen === 'function') {
            return {
                requestMethodName : 'webkitRequestFullscreen',
                exitMethodName    : 'webkitExitFullscreen',
                elementPropName   : 'webkitFullscreenElement',
                enabledPropName   : 'webkitFullscreenEnabled',
                changeEventName   : 'webkitfullscreenchange'
            };
        }

        if (elementRef && typeof elementRef.mozRequestFullScreen === 'function') {
            return {
                requestMethodName : 'mozRequestFullScreen',
                exitMethodName    : 'mozCancelFullScreen',
                elementPropName   : 'mozFullScreenElement',
                enabledPropName   : 'mozFullScreenEnabled',
                changeEventName   : 'mozfullscreenchange'
            };
        }

        if (elementRef && typeof elementRef.msRequestFullscreen === 'function') {
            return {
                requestMethodName : 'msRequestFullscreen',
                exitMethodName    : 'msExitFullscreen',
                elementPropName   : 'msFullscreenElement',
                enabledPropName   : 'msFullscreenEnabled',
                changeEventName   : 'MSFullscreenChange'
            };
        }

        const hasStandardDocumentSupport = Boolean(
            typeof documentRef.exitFullscreen === 'function'
            || typeof documentRef.webkitExitFullscreen === 'function'
            || typeof documentRef.mozCancelFullScreen === 'function'
            || typeof documentRef.msExitFullscreen === 'function'
        );

        if (hasStandardDocumentSupport) {
            return {
                requestMethodName : null,
                exitMethodName    : 'exitFullscreen',
                elementPropName   : 'fullscreenElement',
                enabledPropName   : 'fullscreenEnabled',
                changeEventName   : 'fullscreenchange'
            };
        }

        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Browser Support Query Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Fullscreen Browser Support Available
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__IsBrowserSupported() {
        const apiMap = Na__Feature__FullScreenMode__ResolveApiMap();
        if (!apiMap) return false;

        if (apiMap.enabledPropName && apiMap.enabledPropName in document) {
            return Boolean(document[apiMap.enabledPropName]);
        }

        return Boolean(apiMap.requestMethodName);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fullscreen Active State
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__IsFullScreenActive() {
        const apiMap = Na__Feature__FullScreenMode__ResolveApiMap();
        if (!apiMap) return false;

        if (!apiMap.elementPropName) return false;
        return Boolean(document[apiMap.elementPropName]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Browser API Invocation Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalise Fullscreen API Result to Promise
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__AsPromise(result) {
        if (result && typeof result.then === 'function') {
            return result;
        }
        return Promise.resolve();
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Fullscreen
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__EnterFullScreen(targetElement) {
        const apiMap = Na__Feature__FullScreenMode__ResolveApiMap();
        if (!apiMap || !apiMap.requestMethodName) {
            return Promise.reject(new Error('Fullscreen API is not supported in this browser.'));
        }

        const elementToUse = targetElement || document.documentElement;
        const requestMethod = elementToUse[apiMap.requestMethodName];

        if (typeof requestMethod !== 'function') {
            return Promise.reject(new Error('Fullscreen request method is unavailable on target element.'));
        }

        return Na__Feature__FullScreenMode__AsPromise(requestMethod.call(elementToUse));
    }
    // ------------------------------------------------------------


    // FUNCTION | Exit Fullscreen
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__ExitFullScreen() {
        const apiMap = Na__Feature__FullScreenMode__ResolveApiMap();
        if (!apiMap || !apiMap.exitMethodName) {
            return Promise.reject(new Error('Fullscreen exit method is not supported in this browser.'));
        }

        const exitMethod = document[apiMap.exitMethodName];
        if (typeof exitMethod !== 'function') {
            return Promise.reject(new Error('Fullscreen exit method is unavailable.'));
        }

        return Na__Feature__FullScreenMode__AsPromise(exitMethod.call(document));
    }
    // ------------------------------------------------------------


    // FUNCTION | Add Fullscreen Change Listener
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__AddChangeListener(handler) {
        const apiMap = Na__Feature__FullScreenMode__ResolveApiMap();
        if (!apiMap || !apiMap.changeEventName || typeof handler !== 'function') {
            return () => {};
        }

        document.addEventListener(apiMap.changeEventName, handler);
        return () => {
            document.removeEventListener(apiMap.changeEventName, handler);
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__FullScreenMode__IsBrowserSupported,
        Na__Feature__FullScreenMode__IsFullScreenActive,
        Na__Feature__FullScreenMode__EnterFullScreen,
        Na__Feature__FullScreenMode__ExitFullScreen,
        Na__Feature__FullScreenMode__AddChangeListener
    };

// endregion -------------------------------------------------------------------
