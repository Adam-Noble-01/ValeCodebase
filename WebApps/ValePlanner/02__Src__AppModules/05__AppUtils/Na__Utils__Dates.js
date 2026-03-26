// -----------------------------------------------------------------------------
// REGION | Date Helper Functions
// -----------------------------------------------------------------------------

 // HELPER FUNCTION | Get Monday-Based Week Dates
 // ------------------------------------------------------------
 export function Na__Utils__GetWeekDates(baseDateYyyyMmDd) {
     const [year, month, day] = baseDateYyyyMmDd.split('-').map(Number);
     const sourceDate = new Date(year, month - 1, day);
     const dayOfWeek = sourceDate.getDay();
     const dateOffset = sourceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
     const mondayDate = new Date(year, month - 1, dateOffset);

     return Array.from({ length: 7 }).map((_, index) => {
         const currentDate = new Date(mondayDate);
         currentDate.setDate(mondayDate.getDate() + index);
         const isoDate = currentDate.toISOString().split('T')[0];

         return {
             id: isoDate,
             date: isoDate,
             title: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
             subtitle: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
         };
     });
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Get Week Range Label
 // ------------------------------------------------------------
 export function Na__Utils__GetWeekRangeLabel(baseDateYyyyMmDd) {
     const weekDates = Na__Utils__GetWeekDates(baseDateYyyyMmDd);
     const firstDate = new Date(weekDates[0].date);
     const lastDate = new Date(weekDates[6].date);
     const firstLabel = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     const lastLabel = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     return `${firstLabel} - ${lastLabel}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format Day Label
 // ------------------------------------------------------------
 export function Na__Utils__GetDayLabel(baseDateYyyyMmDd) {
     const dateValue = new Date(baseDateYyyyMmDd);
     return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
