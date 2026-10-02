
        // GUARD | Import map support check (requires iOS 16.4+ / Chrome 89+ / Firefox 108+)
        // --------------------------------------------------------
        (function Na__Boot__ImportMapGuard() {
            if (!HTMLScriptElement.supports || !HTMLScriptElement.supports('importmap')) {
                var overlay   = document.getElementById('loadingOverlay');
                var indicator = document.getElementById('loadingIndicator');
                if (indicator) {
                    indicator.style.display = 'block';
                    indicator.style.color   = '#b71c1c';
                    indicator.textContent   = 'Your browser is not supported. ValeVision3D requires iOS 16.4+, Chrome 89+, or Firefox 108+.';
                }
                if (overlay) overlay.classList.add('loading-overlay--error');
            }
        })();
        // --------------------------------------------------------
    