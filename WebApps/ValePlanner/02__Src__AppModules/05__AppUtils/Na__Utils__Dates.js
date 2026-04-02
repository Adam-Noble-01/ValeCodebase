// -----------------------------------------------------------------------------
// REGION | Date Helper Functions
// -----------------------------------------------------------------------------

 // HELPER FUNCTION | Parse YYYY-MM-DD Into Local Calendar Date
 // ------------------------------------------------------------
 export function Na__Utils__ParseYyyyMmDdToLocalDate(yyyyMmDd) {
     const parts = String(yyyyMmDd || '').trim().split('-').map(Number);
     const yearValue = parts[0];
     const monthValue = parts[1];
     const dayValue = parts[2];
     if (!yearValue || !monthValue || !dayValue) {
         return new Date(NaN);
     }
     return new Date(yearValue, monthValue - 1, dayValue);
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format Local Date as YYYY-MM-DD (No UTC Shift)
 // ------------------------------------------------------------
 export function Na__Utils__FormatLocalDateAsYyyyMmDd(dateValue) {
     const yearStr = String(dateValue.getFullYear());
     const monthStr = String(dateValue.getMonth() + 1).padStart(2, '0');
     const dayStr = String(dateValue.getDate()).padStart(2, '0');
     return `${yearStr}-${monthStr}-${dayStr}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format UK Long Date (e.g. 31 Mar 2026)
 // ------------------------------------------------------------
 export function Na__Utils__FormatUkDateLong(yyyyMmDd) {
     const dateValue = Na__Utils__ParseYyyyMmDdToLocalDate(yyyyMmDd);
     if (Number.isNaN(dateValue.getTime())) {
         return String(yyyyMmDd || '').trim();
     }
     return dateValue.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format UK Hyphenated Date (e.g. 31-Mar-2026)
 // ------------------------------------------------------------
 export function Na__Utils__FormatUkDateHyphen(yyyyMmDd) {
     const dateValue = Na__Utils__ParseYyyyMmDdToLocalDate(yyyyMmDd);
     if (Number.isNaN(dateValue.getTime())) {
         return String(yyyyMmDd || '').trim();
     }
     const dayPart = String(dateValue.getDate()).padStart(2, '0');
     const monthPart = dateValue.toLocaleString('en-GB', { month: 'short' });
     const yearPart = dateValue.getFullYear();
     return `${dayPart}-${monthPart}-${yearPart}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Ordinal Suffix for Day of Month (1st, 2nd, 3rd…)
 // ------------------------------------------------------------
 function Na__Utils__OrdinalSuffix(dayValue) {
     const daySafe = Math.floor(Math.abs(Number(dayValue)) || 0);
     const mod100 = daySafe % 100;
     if (mod100 >= 11 && mod100 <= 13) {
         return 'th';
     }
     switch (daySafe % 10) {
         case 1:
             return 'st';
         case 2:
             return 'nd';
         case 3:
             return 'rd';
         default:
             return 'th';
     }
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format UK Ordinal Date (e.g. 31ˢᵗ March 2026)
 // ------------------------------------------------------------
 export function Na__Utils__FormatUkDateOrdinal(yyyyMmDd) {
     const dateValue = Na__Utils__ParseYyyyMmDdToLocalDate(yyyyMmDd);
     if (Number.isNaN(dateValue.getTime())) {
         return String(yyyyMmDd || '').trim();
     }
     const dayNum = dateValue.getDate();
     const suffixPlain = Na__Utils__OrdinalSuffix(dayNum);
     const superscriptMap = { st: 'ˢᵗ', nd: 'ⁿᵈ', rd: 'ʳᵈ', th: 'ᵗʰ' };
     const suffixSuper = superscriptMap[suffixPlain] || suffixPlain;
     const monthLong = dateValue.toLocaleString('en-GB', { month: 'long' });
     const yearPart = dateValue.getFullYear();
     return `${dayNum}${suffixSuper} ${monthLong} ${yearPart}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | UK Weekday Short From YYYY-MM-DD
 // ------------------------------------------------------------
 export function Na__Utils__FormatUkWeekdayShort(yyyyMmDd) {
     const dateValue = Na__Utils__ParseYyyyMmDdToLocalDate(yyyyMmDd);
     if (Number.isNaN(dateValue.getTime())) {
         return '';
     }
     return dateValue.toLocaleDateString('en-GB', { weekday: 'short' });
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format UK Compact Date for Chart Labels (e.g. "Mon 31 Mar")
 // ------------------------------------------------------------
 export function Na__Utils__FormatUkDateCompact(yyyyMmDd) {
     const dateValue = Na__Utils__ParseYyyyMmDdToLocalDate(yyyyMmDd);
     if (Number.isNaN(dateValue.getTime())) {
         return String(yyyyMmDd || '').trim();
     }
     const weekdayPart = dateValue.toLocaleDateString('en-GB', { weekday: 'short' });
     const dayPart     = dateValue.getDate();
     const monthPart   = dateValue.toLocaleDateString('en-GB', { month: 'short' });
     return `${weekdayPart} ${dayPart} ${monthPart}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Compare Two YYYY-MM-DD Strings (Sort)
 // ------------------------------------------------------------
 export function Na__Utils__CompareYyyyMmDd(dateA, dateB) {
     const timeA = Na__Utils__ParseYyyyMmDdToLocalDate(dateA).getTime();
     const timeB = Na__Utils__ParseYyyyMmDdToLocalDate(dateB).getTime();
     return timeA - timeB;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Get Monday-Based Week Dates
 // ------------------------------------------------------------
 export function Na__Utils__GetWeekDates(baseDateYyyyMmDd) {
     const sourceDate = Na__Utils__ParseYyyyMmDdToLocalDate(baseDateYyyyMmDd);
     const dayOfWeek = sourceDate.getDay();
     const dateOffset = sourceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
     const mondayDate = new Date(sourceDate.getFullYear(), sourceDate.getMonth(), dateOffset);

     return Array.from({ length: 7 }).map((_, index) => {
         const currentDate = new Date(mondayDate);
         currentDate.setDate(mondayDate.getDate() + index);
         const isoDate = Na__Utils__FormatLocalDateAsYyyyMmDd(currentDate);

         return {
             id: isoDate,
             date: isoDate,
             title: currentDate.toLocaleDateString('en-GB', { weekday: 'short' }),
             subtitle: currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
         };
     });
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Get Week Range Label
 // ------------------------------------------------------------
 export function Na__Utils__GetWeekRangeLabel(baseDateYyyyMmDd) {
     const weekDates = Na__Utils__GetWeekDates(baseDateYyyyMmDd);
     const firstLabel = Na__Utils__FormatUkDateLong(weekDates[0].date);
     const lastLabel = Na__Utils__FormatUkDateLong(weekDates[6].date);
     return `${firstLabel} - ${lastLabel}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format Day Label
 // ------------------------------------------------------------
 export function Na__Utils__GetDayLabel(baseDateYyyyMmDd) {
     return Na__Utils__FormatUkDateLong(baseDateYyyyMmDd);
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Shift Date by N Days
 // ------------------------------------------------------------
 export function Na__Utils__ShiftDateByDays(baseDateYyyyMmDd, daysDelta) {
     const sourceDate = Na__Utils__ParseYyyyMmDdToLocalDate(baseDateYyyyMmDd);
     sourceDate.setDate(sourceDate.getDate() + daysDelta);
     return Na__Utils__FormatLocalDateAsYyyyMmDd(sourceDate);
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Get Today as YYYY-MM-DD String
 // ------------------------------------------------------------
 export function Na__Utils__GetTodayDateString() {
     const nowValue = new Date();
     return Na__Utils__FormatLocalDateAsYyyyMmDd(nowValue);
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Redundant / Legacy Date Helpers (commented)
// -----------------------------------------------------------------------------

/*
 // LEGACY | Previous implementations (en-US + toISOString for calendar day)

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

 export function Na__Utils__GetWeekRangeLabel(baseDateYyyyMmDd) {
     const weekDates = Na__Utils__GetWeekDates(baseDateYyyyMmDd);
     const firstDate = new Date(weekDates[0].date);
     const lastDate = new Date(weekDates[6].date);
     const firstLabel = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     const lastLabel = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     return `${firstLabel} - ${lastLabel}`;
 }

 export function Na__Utils__GetDayLabel(baseDateYyyyMmDd) {
     const dateValue = new Date(baseDateYyyyMmDd);
     return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
 }

 export function Na__Utils__ShiftDateByDays(baseDateYyyyMmDd, daysDelta) {
     const [year, month, day] = baseDateYyyyMmDd.split('-').map(Number);
     const sourceDate = new Date(year, month - 1, day);
     sourceDate.setDate(sourceDate.getDate() + daysDelta);
     return sourceDate.toISOString().split('T')[0];
 }

 export function Na__Utils__GetTodayDateString() {
     const nowValue  = new Date();
     const yearStr   = String(nowValue.getFullYear());
     const monthStr  = String(nowValue.getMonth() + 1).padStart(2, '0');
     const dayStr    = String(nowValue.getDate()).padStart(2, '0');
     return `${yearStr}-${monthStr}-${dayStr}`;
 }
*/

// endregion ----------------------------------------------------
