// -----------------------------------------------------------------------------
// REGION | Time Helper Functions
// -----------------------------------------------------------------------------

 // HELPER FUNCTION | Convert HH:mm to Total Minutes
 // ------------------------------------------------------------
 export function Na__Utils__TimeToMinutes(timeValue) {
     const [hours, minutes] = String(timeValue).split(':').map(Number);
     return (hours * 60) + minutes;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Convert Total Minutes to HH:mm
 // ------------------------------------------------------------
 export function Na__Utils__MinutesToTime(totalMinutes) {
     const hours = Math.floor(totalMinutes / 60);
     const minutes = Math.floor(totalMinutes % 60);
     return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Snap Minutes to Interval
 // ------------------------------------------------------------
 export function Na__Utils__SnapMinutes(totalMinutes, intervalMinutes) {
     return Math.round(totalMinutes / intervalMinutes) * intervalMinutes;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format Time Axis Label
 // ------------------------------------------------------------
 export function Na__Utils__FormatHourLabel(totalMinutes) {
     const hour = Math.floor(totalMinutes / 60);
     const isPm = hour >= 12;
     const displayHour = hour % 12 || 12;
     return `${displayHour} ${isPm ? 'PM' : 'AM'}`;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
