
        // FUNCTION | DetectFontLoading - Monitors Open Sans font loading
        // --------------------------------------------------------
        (function detectFontLoading() {
            if ('fonts' in document) {
                // Modern Font Loading API
                // ------------------------------------
                Promise.all([
                    document.fonts.load('400 1em "Open Sans"'),
                    document.fonts.load('600 1em "Open Sans"'),
                    document.fonts.load('300 1em "Open Sans"')
                ]).then(function() {
                    console.log('=== Custom Fonts Loaded ===');
                    console.log('Open Sans Regular (400) - Loaded');
                    console.log('Open Sans SemiBold (600) - Loaded');
                    console.log('Open Sans Light (300) - Loaded');
                    console.log('===========================');
                }).catch(function(error) {
                    console.warn('Font loading failed, using fallback fonts:', error);
                });
                
                // Monitor overall font loading state
                // ------------------------------------
                document.fonts.ready.then(function() {
                    console.log('All fonts ready for use');
                });
                
            } else {
                // Fallback for browsers without Font Loading API
                // ------------------------------------
                console.log('Font Loading API not supported, fonts will load naturally');
            }
        })();
        // --------------------------------------------------------
    