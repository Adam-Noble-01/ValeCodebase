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
// - Loads password from masterConfig.json based on deploymentMode
// - Live mode uses passwords: ClosetClown60, Vale1982
// - Dev mode uses password: 1234
// - Supports alphanumeric password input with show/hide toggle
// - Shows error message for incorrect attempts
// - Calls success callback when PIN is correct
// - Prevents unauthorized access to application
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Authentication Token Management
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Authentication Token Configuration
    // ------------------------------------------------------------
    const AUTH_TOKEN_KEY = 'whitecardopedia_auth_token';                 // <-- LocalStorage key for authentication token
    const TOKEN_EXPIRY_KEY = 'whitecardopedia_auth_expiry';              // <-- LocalStorage key for token expiry timestamp
    const TOKEN_VALIDITY_DAYS = 30;                                      // <-- Token validity period (1 month)
    // ------------------------------------------------------------


    // HELPER FUNCTION | Generate Unique Authentication Token
    // ---------------------------------------------------------------
    function generateAuthToken() {
        const timestamp = new Date().getTime();                          // <-- Current timestamp for uniqueness
        const randomValue = Math.random().toString(36).substring(2, 15); // <-- Random alphanumeric string
        const randomValue2 = Math.random().toString(36).substring(2, 15); // <-- Additional random string
        return `${timestamp}-${randomValue}-${randomValue2}`;            // <-- Combined unique token
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Save Authentication Token with Expiry
    // ---------------------------------------------------------------
    function saveAuthToken() {
        const expiryDate = new Date();                                   // <-- Create new date object
        expiryDate.setDate(expiryDate.getDate() + TOKEN_VALIDITY_DAYS); // <-- Set expiry 30 days from now
        
        const token = generateAuthToken();                               // <-- Generate unique token
        localStorage.setItem(AUTH_TOKEN_KEY, token);                     // <-- Save token to localStorage
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryDate.getTime().toString()); // <-- Save expiry timestamp
        
        console.log('Authentication token saved, valid for 30 days');    // <-- Log success
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check if Valid Authentication Token Exists
    // ---------------------------------------------------------------
    function hasValidAuthToken() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);              // <-- Get stored token
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);           // <-- Get stored expiry timestamp
        
        if (!token || !expiry) {
            return false;                                                // <-- No token exists
        }
        
        const expiryDate = new Date(parseInt(expiry));                   // <-- Convert timestamp to date
        const now = new Date();                                          // <-- Current date and time
        
        if (now > expiryDate) {
            clearAuthToken();                                            // <-- Token expired, clear it
            console.log('Authentication token expired');                 // <-- Log expiration
            return false;
        }
        
        return true;                                                     // <-- Token is valid
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Clear Authentication Token
    // ---------------------------------------------------------------
    function clearAuthToken() {
        localStorage.removeItem(AUTH_TOKEN_KEY);                         // <-- Remove token from localStorage
        localStorage.removeItem(TOKEN_EXPIRY_KEY);                       // <-- Remove expiry from localStorage
        console.log('Authentication token cleared');                     // <-- Log clearance
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | PinEntry Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Password Configuration
    // ------------------------------------------------------------
    const PASSWORD_CONFIG = {
        Live                : ['ClosetClown60', 'Vale1982'],             // <-- Live deployment passwords (multiple allowed)
        Dev                 : '1234',                                    // <-- Development deployment password
    };
    // ------------------------------------------------------------


    // COMPONENT | PIN Entry Modal
    // ------------------------------------------------------------
    function PinEntry({ onSuccess, onCancel }) {
        const [pin, setPin] = React.useState('');                        // <-- PIN input state
        const [error, setError] = React.useState('');                    // <-- Error message state
        const [showPassword, setShowPassword] = React.useState(false);   // <-- Password visibility state
        const [validPasswords, setValidPasswords] = React.useState([PASSWORD_CONFIG.Dev]); // <-- Valid passwords array based on deployment mode
        const inputRef = React.useRef(null);                             // <-- Reference to input element
        
        // EFFECT | Load Configuration and Set Password
        // ---------------------------------------------------------------
        React.useEffect(() => {
            loadPasswordFromConfig();                                    // <-- Load password based on deployment mode
        }, []);
        // ---------------------------------------------------------------
        
        // EFFECT | Focus Input on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (inputRef.current) {
                inputRef.current.focus();                                // <-- Auto-focus PIN input
            }
        }, []);
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Load Password Based on Deployment Mode
        // ---------------------------------------------------------------
        const loadPasswordFromConfig = async () => {
            try {
                const response = await fetch('02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json'); // <-- Fetch master config
                
                if (!response.ok) {
                    console.warn('Failed to load config, using Dev password'); // <-- Log warning
                    return;                                              // <-- Use default Dev password
                }
                
                const config = await response.json();                    // <-- Parse JSON response
                const deploymentMode = config.deploymentMode || 'Dev';   // <-- Get deployment mode with fallback
                
                const passwords = PASSWORD_CONFIG[deploymentMode] || PASSWORD_CONFIG.Dev; // <-- Get password(s) for mode
                const passwordArray = Array.isArray(passwords) ? passwords : [passwords]; // <-- Convert to array if single password
                setValidPasswords(passwordArray);                        // <-- Update valid passwords state
                
            } catch (error) {
                console.error('Error loading config:', error);           // <-- Log error
                console.warn('Using Dev password as fallback');          // <-- Log fallback
            }
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Input Change
        // ---------------------------------------------------------------
        const handlePinChange = (e) => {
            const value = e.target.value;                                // <-- Allow alphanumeric input
            setPin(value);                                               // <-- Update PIN state
            setError('');                                                // <-- Clear error on input
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Toggle Password Visibility
        // ---------------------------------------------------------------
        const handleTogglePasswordVisibility = () => {
            setShowPassword(!showPassword);                              // <-- Toggle password visibility state
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Submission
        // ---------------------------------------------------------------
        const handleSubmit = (e) => {
            e.preventDefault();                                          // <-- Prevent form default behavior
            
            if (pin.length === 0) {
                setError('Please enter a PIN');                          // <-- Validate PIN not empty
                return;
            }
            
            if (validPasswords.includes(pin)) {
                saveAuthToken();                                         // <-- Save authentication token for 30-day persistence
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
                    <h2 className="pin-entry__title">Enter Password</h2>
                    <p className="pin-entry__subtitle">Please Enter Your Password To <br /> Access Whitecardopedia</p>
                    
                    <form onSubmit={handleSubmit} className="pin-entry__form">
                        <div className="pin-entry__input-wrapper">
                            <input
                                ref={inputRef}
                                type={showPassword ? 'text' : 'password'}
                                value={pin}
                                onChange={handlePinChange}
                                onKeyDown={handleKeyPress}
                                className="pin-entry__input"
                                placeholder="Enter password"
                            />
                            <button
                                type="button"
                                className="pin-entry__toggle-button"
                                onClick={handleTogglePasswordVisibility}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        
                        {error && (
                            <div className="pin-entry__error">
                                {error}
                            </div>
                        )}
                        
                        <div className="pin-entry__buttons">
                            <button 
                                type="submit" 
                                className="pin-entry__button pin-entry__button--submit"
                                disabled={pin.length === 0}
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

