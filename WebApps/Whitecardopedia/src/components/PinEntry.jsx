// =============================================================================
// WHITECARDOPEDIA - PIN ENTRY COMPONENT
// =============================================================================
//
// FILE       : PinEntry.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : PinEntry Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : PIN authentication component for application access
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays modal overlay with PIN entry form
// - Validates 4-digit PIN against configured value (1234)
// - Shows error message for incorrect attempts
// - Calls success callback when PIN is correct
// - Prevents unauthorized access to application
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | PinEntry Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | PIN Configuration
    // ------------------------------------------------------------
    const CORRECT_PIN = '1234';                                          // <-- Placeholder PIN for authentication
    // ------------------------------------------------------------


    // COMPONENT | PIN Entry Modal
    // ------------------------------------------------------------
    function PinEntry({ onSuccess, onCancel }) {
        const [pin, setPin] = React.useState('');                        // <-- PIN input state
        const [error, setError] = React.useState('');                    // <-- Error message state
        const inputRef = React.useRef(null);                             // <-- Reference to input element
        
        // EFFECT | Focus Input on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (inputRef.current) {
                inputRef.current.focus();                                // <-- Auto-focus PIN input
            }
        }, []);
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Input Change
        // ---------------------------------------------------------------
        const handlePinChange = (e) => {
            const value = e.target.value.replace(/\D/g, '');             // <-- Allow only digits
            
            if (value.length <= 4) {
                setPin(value);                                           // <-- Update PIN state
                setError('');                                            // <-- Clear error on input
            }
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Submission
        // ---------------------------------------------------------------
        const handleSubmit = (e) => {
            e.preventDefault();                                          // <-- Prevent form default behavior
            
            if (pin.length !== 4) {
                setError('Please enter a 4-digit PIN');                 // <-- Validate PIN length
                return;
            }
            
            if (pin === CORRECT_PIN) {
                onSuccess();                                             // <-- Call success callback
            } else {
                setError('Incorrect PIN. Please try again.');            // <-- Show error for wrong PIN
                setPin('');                                              // <-- Clear PIN input
                
                if (inputRef.current) {
                    inputRef.current.focus();                            // <-- Re-focus input
                }
            }
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Key Press
        // ---------------------------------------------------------------
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleSubmit(e);                                         // <-- Submit on Enter key
            } else if (e.key === 'Escape' && onCancel) {
                onCancel();                                              // <-- Cancel on Escape key
            }
        };
        // ---------------------------------------------------------------
        
        return (
            <div className="pin-entry-overlay">
                <div className="pin-entry-modal">
                    <h2 className="pin-entry__title">Enter PIN</h2>
                    <p className="pin-entry__subtitle">Please enter your 4-digit PIN to access Whitecardopedia</p>
                    
                    <form onSubmit={handleSubmit} className="pin-entry__form">
                        <input
                            ref={inputRef}
                            type="password"
                            value={pin}
                            onChange={handlePinChange}
                            onKeyDown={handleKeyPress}
                            className="pin-entry__input"
                            placeholder="••••"
                            maxLength="4"
                            inputMode="numeric"
                            pattern="[0-9]*"
                        />
                        
                        {error && (
                            <div className="pin-entry__error">
                                {error}
                            </div>
                        )}
                        
                        <div className="pin-entry__buttons">
                            <button 
                                type="submit" 
                                className="pin-entry__button pin-entry__button--submit"
                                disabled={pin.length !== 4}
                            >
                                Submit
                            </button>
                            
                            {onCancel && (
                                <button 
                                    type="button" 
                                    className="pin-entry__button pin-entry__button--cancel"
                                    onClick={onCancel}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

