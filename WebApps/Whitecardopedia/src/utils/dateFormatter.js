// =============================================================================
// WHITECARDOPEDIA - DATE FORMATTING UTILITY
// =============================================================================
//
// FILE       : dateFormatter.js
// NAMESPACE  : Whitecardopedia
// MODULE     : DateFormatter
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Date formatting utilities for project date display
// CREATED    : 2025
//
// DESCRIPTION:
// - Converts DD-MMM-YYYY format to formatted display with ordinal superscripts
// - Handles day ordinals (1st, 2nd, 3rd, etc.) with proper superscript formatting
// - Supports full month name expansion
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Date Formatting Functions
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Month Name Mappings
    // ------------------------------------------------------------
    const MONTH_NAMES = {
        'Jan'       : 'January',
        'Feb'       : 'February',
        'Mar'       : 'March',
        'Apr'       : 'April',
        'May'       : 'May',
        'Jun'       : 'June',
        'Jul'       : 'July',
        'Aug'       : 'August',
        'Sep'       : 'September',
        'Oct'       : 'October',
        'Nov'       : 'November',
        'Dec'       : 'December'
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Ordinal Suffix for Day with Superscript
    // ---------------------------------------------------------------
    function getOrdinalSuffix(day) {
        const lastDigit = day % 10;                                  // <-- Get last digit of day
        const lastTwoDigits = day % 100;                             // <-- Get last two digits for teen check
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return 'ᵗʰ';                                             // <-- Special case for 11th, 12th, 13th (Unicode superscript)
        }
        
        switch (lastDigit) {
            case 1: return 'ˢᵗ';                                     // <-- 1st, 21st, 31st (Unicode superscript)
            case 2: return 'ⁿᵈ';                                     // <-- 2nd, 22nd (Unicode superscript)
            case 3: return 'ʳᵈ';                                     // <-- 3rd, 23rd (Unicode superscript)
            default: return 'ᵗʰ';                                    // <-- All other days (Unicode superscript)
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Format Project Date with Ordinal Superscript
    // ------------------------------------------------------------
    function formatProjectDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return '';                                               // <-- Return empty string for invalid input
        }
        
        try {
            const parts = dateString.split('-');                     // <-- Split DD-MMM-YYYY format
            
            if (parts.length !== 3) {
                return dateString;                                   // <-- Return original if format invalid
            }
            
            const day = parseInt(parts[0], 10);                      // <-- Parse day as integer
            const monthAbbr = parts[1];                              // <-- Get month abbreviation
            const year = parts[2];                                   // <-- Get year string
            
            if (isNaN(day) || !MONTH_NAMES[monthAbbr]) {
                return dateString;                                   // <-- Return original if parsing fails
            }
            
            const monthFull = MONTH_NAMES[monthAbbr];                // <-- Get full month name
            const ordinal = getOrdinalSuffix(day);                   // <-- Get ordinal suffix (st, nd, rd, th)
            
            return `${day}${ordinal} ${monthFull} ${year}`;          // <-- Return formatted date string
            
        } catch (error) {
            console.error('Error formatting date:', error);          // <-- Log formatting errors
            return dateString;                                       // <-- Return original string on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Parse Date String to Date Object for Sorting
    // ------------------------------------------------------------
    function parseProjectDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;                                             // <-- Return null for invalid input
        }
        
        try {
            const parts = dateString.split('-');                     // <-- Split DD-MMM-YYYY format
            
            if (parts.length !== 3) {
                return null;                                         // <-- Return null if format invalid
            }
            
            const day = parseInt(parts[0], 10);                      // <-- Parse day as integer
            const monthAbbr = parts[1];                              // <-- Get month abbreviation
            const year = parseInt(parts[2], 10);                     // <-- Parse year as integer
            
            const monthMap = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            
            const month = monthMap[monthAbbr];                       // <-- Get month index (0-11)
            
            if (isNaN(day) || isNaN(year) || month === undefined) {
                return null;                                         // <-- Return null if parsing fails
            }
            
            return new Date(year, month, day);                       // <-- Return Date object for comparison
            
        } catch (error) {
            console.error('Error parsing date:', error);             // <-- Log parsing errors
            return null;                                             // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

