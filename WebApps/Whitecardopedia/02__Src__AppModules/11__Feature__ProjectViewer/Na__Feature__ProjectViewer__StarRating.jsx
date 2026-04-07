// =============================================================================
// WHITECARDOPEDIA - STAR RATING COMPONENT
// =============================================================================
//
// FILE       : StarRating.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : StarRating Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Reusable star rating display component
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays star ratings for project metrics (Quality, Prestige, Value)
// - Accepts rating value (1-5) and renders filled/empty stars
// - Purely presentational component
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | StarRating Component
// -----------------------------------------------------------------------------

    // COMPONENT | Star Rating Display
    // ------------------------------------------------------------
    function StarRating({ rating, maxStars = 5 }) {
        const stars = [];                                                // <-- Array to hold star elements
        
        for (let i = 1; i <= maxStars; i++) {
            const isFilled = i <= rating;                                // <-- Check if star should be filled
            
            stars.push(
                <span 
                    key={i} 
                    className={`star-rating__star ${isFilled ? 'star-rating__star--filled' : ''}`}
                >
                    ★
                </span>
            );
        }
        
        return (
            <div className="star-rating">
                {stars}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

