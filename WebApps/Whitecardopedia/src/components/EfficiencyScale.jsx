// =============================================================================
// WHITECARDOPEDIA - EFFICIENCY SCALE COMPONENT
// =============================================================================
//
// FILE       : EfficiencyScale.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : EfficiencyScale Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Time efficiency visualization for project schedule performance
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays visual scale showing project completion time vs allocated time
// - Calculates efficiency percentage and status category
// - Supports compact mode for gallery cards and full mode for detailed view
// - Renders pictograms, horizontal bar with triangle marker, and status text
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | EfficiencyScale Component
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate Efficiency Position Percentage
    // ---------------------------------------------------------------
    function calculateEfficiencyPosition(timeAllocated, timeTaken) {
        if (!timeAllocated || timeAllocated <= 0) return 50;             // <-- Default to center if invalid
        
        const position = 50 + ((timeAllocated - timeTaken) / timeAllocated) * 50;  // <-- Calculate position
        return Math.max(0, Math.min(100, position));                     // <-- Clamp to 0-100 range
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Determine Status Category from Position
    // ---------------------------------------------------------------
    function getStatusCategory(position) {
        if (position <= 9) {
            return {
                label    : "Significantly Behind Schedule",
                subtext  : "AUDIT REQUIRED",
                category : "critical"
            };
        } else if (position <= 25) {
            return {
                label    : "Behind Schedule",
                subtext  : "",
                category : "behind"
            };
        } else if (position <= 45) {
            return {
                label    : "Slightly Behind Schedule",
                subtext  : "",
                category : "slightly-behind"
            };
        } else if (position <= 54) {
            return {
                label    : "Completed On Schedule",
                subtext  : "",
                category : "on-target"
            };
        } else if (position <= 75) {
            return {
                label    : "Slightly Ahead Of Schedule",
                subtext  : "",
                category : "slightly-ahead"
            };
        } else {
            return {
                label    : "Significantly Ahead Of Schedule",
                subtext  : "",
                category : "ahead"
            };
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Format Status Message
    // ---------------------------------------------------------------
    function formatStatusMessage(timeAllocated, timeTaken) {
        const timeDiffHours = timeAllocated - timeTaken;                 // <-- Calculate time difference in hours
        const timeDiffMinutes = Math.abs(timeDiffHours * 60);            // <-- Convert to absolute minutes
        
        const allocatedText = timeAllocated === 1 ? "Hour was" : "Hours were";  // <-- Grammatical correctness
        const takenText = timeTaken === 1 ? "Hour" : "Hours";            // <-- Grammatical correctness
        
        let performanceText = "";
        
        if (timeDiffHours > 0) {
            // AHEAD OF SCHEDULE
            const minutesText = timeDiffMinutes === 1 ? "minute" : "minutes";  // <-- Grammatical correctness
            performanceText = `${timeDiffMinutes} ${minutesText} faster than expected`;
        } else if (timeDiffHours < 0) {
            // BEHIND SCHEDULE
            const minutesText = timeDiffMinutes === 1 ? "minute" : "minutes";  // <-- Grammatical correctness
            performanceText = `${timeDiffMinutes} ${minutesText} slower than expected`;
        } else {
            // EXACTLY ON TIME
            performanceText = "exactly on time";
        }
        
        return `${timeAllocated} ${allocatedText} allocated, the project took ${timeTaken} ${takenText} meaning the job was completed ${performanceText}.`;
    }
    // ---------------------------------------------------------------


    // COMPONENT | Efficiency Scale Display
    // ------------------------------------------------------------
    function EfficiencyScale({ scheduleData, compact = false }) {
        if (!scheduleData || !scheduleData.timeAllocated || !scheduleData.timeTaken) {
            return null;                                                 // <-- Don't render if no schedule data
        }
        
        const { timeAllocated, timeTaken } = scheduleData;               // <-- Destructure schedule data
        const position = calculateEfficiencyPosition(timeAllocated, timeTaken);  // <-- Calculate marker position
        const status = getStatusCategory(position);                      // <-- Get status category
        const message = formatStatusMessage(timeAllocated, timeTaken);   // <-- Format detailed message
        
        const componentClass = compact 
            ? "efficiency-scale efficiency-scale--compact" 
            : "efficiency-scale";
        
        // DETERMINE PICTOGRAM PATHS BASED ON MODE
        const imageSuffix = compact ? '__LightGreyVersion.png' : '.png';     // <-- Grey for gallery, colored for project page
        const behindScheduleImg = `assets/Element__TimeEfficiencyScale/Pictogram__EfficiencyScale__BehindSchedule${imageSuffix}`;
        const targetTimeImg = `assets/Element__TimeEfficiencyScale/Pictogram__EfficiencyScale__TargetTime${imageSuffix}`;
        const aheadOfScheduleImg = `assets/Element__TimeEfficiencyScale/Pictogram__EfficiencyScale__AheadOfSchedule${imageSuffix}`;
        
        return (
            <div className={componentClass}>
                {/* PICTOGRAMS ROW */}
                <div className="efficiency-scale__pictograms">
                    <img 
                        src={behindScheduleImg}
                        alt="Behind Schedule"
                        className="efficiency-scale__pictogram efficiency-scale__pictogram--left"
                    />
                    <img 
                        src={targetTimeImg}
                        alt="Target Time"
                        className="efficiency-scale__pictogram efficiency-scale__pictogram--center"
                    />
                    <img 
                        src={aheadOfScheduleImg}
                        alt="Ahead Of Schedule"
                        className="efficiency-scale__pictogram efficiency-scale__pictogram--right"
                    />
                </div>
                
                {/* EFFICIENCY BAR WITH MARKER */}
                <div className="efficiency-scale__bar-container">
                    <div className="efficiency-scale__bar">
                        <div 
                            className={`efficiency-scale__marker efficiency-scale__marker--${status.category}`}
                            style={{ left: `${position}%` }}
                        >
                        </div>
                    </div>
                </div>
                
                {/* STATUS TEXT (Full Mode Only) */}
                {!compact && (
                    <div className="efficiency-scale__status">
                        <h4 className="efficiency-scale__status-header">
                            {status.label}
                            {status.subtext && (
                                <><br /><span className="efficiency-scale__status-subtext">{status.subtext}</span></>
                            )}
                        </h4>
                        <p className="efficiency-scale__status-message">
                            {message}
                        </p>
                    </div>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

