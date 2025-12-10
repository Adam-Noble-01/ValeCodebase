// =============================================================================
// WHITECARDOPEDIA - SHARE BUTTON COMPONENT
// =============================================================================
//
// FILE       : ShareButton.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ShareButton
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Copy project URL to clipboard with visual feedback
// CREATED    : 2025
//
// DESCRIPTION:
// - Share button component for copying project URLs
// - Clipboard API integration for copy functionality
// - Visual feedback animation on successful copy
// - Vale Design Suite styling conventions
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ShareButton Component
// -----------------------------------------------------------------------------

    // COMPONENT | Share Button with Clipboard Functionality
    // ------------------------------------------------------------
    function ShareButton({ projectCode, year = '2025', projectName = 'Project' }) {
        const [copied, setCopied] = React.useState(false);                // <-- Copy success state
        const [copyError, setCopyError] = React.useState(false);          // <-- Copy error state
        
        // SUB FUNCTION | Handle Share Button Click
        // ---------------------------------------------------------------
        const handleShare = async () => {
            try {
                const shareUrl = getShareableUrl(projectCode, year);      // <-- Build shareable URL
                
                // COPY TO CLIPBOARD USING CLIPBOARD API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(shareUrl);        // <-- Copy URL to clipboard
                    
                    setCopied(true);                                      // <-- Set success state
                    setCopyError(false);                                  // <-- Clear error state
                    
                    // RESET SUCCESS STATE AFTER 2 SECONDS
                    setTimeout(() => {
                        setCopied(false);                                 // <-- Clear success state
                    }, 2000);
                    
                } else {
                    // FALLBACK FOR OLDER BROWSERS
                    const textArea = document.createElement('textarea');  // <-- Create temp textarea
                    textArea.value = shareUrl;                            // <-- Set value
                    textArea.style.position = 'fixed';                    // <-- Hide off-screen
                    textArea.style.left = '-999999px';                    // <-- Position off-screen
                    document.body.appendChild(textArea);                  // <-- Append to body
                    textArea.focus();                                     // <-- Focus element
                    textArea.select();                                    // <-- Select text
                    
                    const successful = document.execCommand('copy');      // <-- Execute copy command
                    document.body.removeChild(textArea);                  // <-- Remove temp element
                    
                    if (successful) {
                        setCopied(true);                                  // <-- Set success state
                        setCopyError(false);                              // <-- Clear error state
                        
                        setTimeout(() => {
                            setCopied(false);                             // <-- Clear success state
                        }, 2000);
                    } else {
                        throw new Error('Copy command failed');           // <-- Throw error
                    }
                }
                
            } catch (error) {
                console.error('Failed to copy URL:', error);              // <-- Log error
                setCopyError(true);                                       // <-- Set error state
                
                // RESET ERROR STATE AFTER 2 SECONDS
                setTimeout(() => {
                    setCopyError(false);                                  // <-- Clear error state
                }, 2000);
            }
        };
        // ---------------------------------------------------------------
        
        // RENDER | Share Button with Status Feedback
        // ---------------------------------------------------------------
        return (
            <button 
                className={`share-button ${copied ? 'share-button--copied' : ''} ${copyError ? 'share-button--error' : ''}`}
                onClick={handleShare}
                title={`Share link to ${projectName}`}
                aria-label="Share project link"
            >
                <span className="share-button__icon">
                    {copied ? '✓' : '🔗'}
                </span>
                <span className="share-button__text">
                    {copied ? 'Copied!' : copyError ? 'Error' : 'Share Link'}
                </span>
            </button>
        );
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

