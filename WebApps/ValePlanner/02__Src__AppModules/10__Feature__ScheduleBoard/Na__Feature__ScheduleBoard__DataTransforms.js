import { Na__Utils__GetWeekDates } from '../05__AppUtils/Na__Utils__Dates.js';
import { Na__Utils__TimeToMinutes } from '../05__AppUtils/Na__Utils__Time.js';

// -----------------------------------------------------------------------------
// REGION | Schedule Board Data Transform Helpers
// -----------------------------------------------------------------------------

 // HELPER FUNCTION | Get Header Columns Based on View Mode
 // ------------------------------------------------------------
 export function Na__Schedule__GetColumns(state) {
     if (state.viewMode === 'day') {
         return state.workers.map((worker) => ({
             id: worker.id,
             title: worker.name,
             subtitle: worker.role,
             avatar: worker.avatar,
             workerId: worker.id,
             date: state.currentDate
         }));
     }

     return Na__Utils__GetWeekDates(state.currentDate).map((weekDate) => ({
         ...weekDate,
         avatar: null,
         workerId: null
     }));
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Flatten Shifts for Rendering
 // ------------------------------------------------------------
 export function Na__Schedule__GetAllShifts(workers) {
     return workers.flatMap((worker) => worker.shifts.map((shift) => ({
         ...shift,
         workerId: worker.id,
         workerName: worker.name,
         avatar: worker.avatar
     })));
 }
 // ------------------------------------------------------------


// HELPER FUNCTION | Get Visible Time Bounds
// ------------------------------------------------------------
export function Na__Schedule__GetBounds(columns, allShifts, draftShift = null) {
    let minMinutes = 24 * 60;
    let maxMinutes = 0;
    let hasVisibleShifts = false;

    columns.forEach((column) => {
        const columnShifts = allShifts.filter((shift) => {
            const isDateMatch = shift.date === column.date;
            const isWorkerMatch = column.workerId ? shift.workerId === column.workerId : true;
            return isDateMatch && isWorkerMatch;
        });

        columnShifts.forEach((shift) => {
            hasVisibleShifts = true;
            minMinutes = Math.min(minMinutes, Na__Utils__TimeToMinutes(shift.startTime));
            maxMinutes = Math.max(maxMinutes, Na__Utils__TimeToMinutes(shift.endTime));
        });
    });

    if (draftShift) {
        hasVisibleShifts = true;
        minMinutes = Math.min(minMinutes, Na__Utils__TimeToMinutes(draftShift.startTime)); // <-- include draft start in range
        maxMinutes = Math.max(maxMinutes, Na__Utils__TimeToMinutes(draftShift.endTime));   // <-- include draft end in range
    }

    if (!hasVisibleShifts) {
        return { start: 480, end: 1020 }; // <-- 8am to 5pm fallback
    }

    const DEFAULT_START = 480;  // <-- 8am baseline
    const DEFAULT_END   = 1020; // <-- 5pm baseline
    const HOUR          = 60;

    // Snap content extents to whole-hour boundaries so grid lines stay clean
    const contentStart  = Math.min(minMinutes, DEFAULT_START);
    const contentEnd    = Math.max(maxMinutes, DEFAULT_END);
    const snappedStart  = Math.floor(contentStart / HOUR) * HOUR; // <-- round down to nearest hour
    const snappedEnd    = Math.ceil(contentEnd    / HOUR) * HOUR; // <-- round up to nearest hour

    return {
        start : Math.max(0,    snappedStart), // <-- never before midnight
        end   : Math.min(1440, snappedEnd)    // <-- never after midnight
    };
}
// ------------------------------------------------------------


 // HELPER FUNCTION | Build Hour Labels for Axis and Grid
 // ------------------------------------------------------------
 export function Na__Schedule__GetTimeLabels(bounds) {
     const labels = [];
     for (let minute = bounds.start; minute <= bounds.end; minute += 60) {
         labels.push(minute);
     }
     return labels;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
