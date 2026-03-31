import Na__Timecard__DataSeed from './Na__Feature__Data__TimecardData__.json' with { type: 'json' };
import { Na__Timecard__CreateAuthHashAsync, Na__Timecard__ValidateAuthHashAsync } from './Na__Feature__TimecardSystem__UniqueHashGenerator__.js';
import { Na__Persistence__LoadTimecardAsync, Na__Persistence__SaveTimecardAsync } from '../70__System__DevTools/Na__System__PersistenceApi.js';
import { Na__System__IsRunningOnLocalhost } from '../70__System__DevTools/Na__System__DevTools__LocalhostGuard.js';

// -----------------------------------------------------------------------------
// REGION | Timecard Core Logic
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Mutable Store and Cached View Model
 // ------------------------------------------------------------
 let Na__Timecard__DataStore = null;
 let Na__Timecard__CachedViewModel = null;
 const Na__Timecard__ClockInGracePeriodMins = 6;
 // ------------------------------------------------------------


 // FUNCTION | Build Timecard View Model
 // ------------------------------------------------------------
 export async function Na__Timecard__BuildTimecardViewModel() {
     if (Na__Timecard__CachedViewModel) {
         return Na__Timecard__CachedViewModel;
     }

    const sourceData = await Na__Timecard__GetDataStore();
    const monthKeys = Object.keys(sourceData).sort((monthA, monthB) => Na__Timecard__ParseMonthKeyToSortValue(monthB) - Na__Timecard__ParseMonthKeyToSortValue(monthA));
     const monthGroups = [];
     const flatEntries = [];
     let totalMinutesValue = 0;
     let invalidEntryCount = 0;
    let openShiftCount = 0;
    let hasHashBackfillUpdates = false;

     for (const monthKey of monthKeys) {
         const rawEntries = Array.isArray(sourceData[monthKey]) ? sourceData[monthKey] : [];
         const normalizedEntries = [];

         for (let rowIndex = 0; rowIndex < rawEntries.length; rowIndex += 1) {
             const rawEntry = rawEntries[rowIndex];
             const dateValue = String(rawEntry?.Timecard__Date || '').trim();
             const clockInValue = String(rawEntry?.['Timcard__Clock-In__'] || '').trim();
             const clockOutValue = String(rawEntry?.['Timcard__Clock-Out__'] || '').trim();
            const normalizedClockInValue = Na__Timecard__NormalizeClockInTextWithGracePeriod(clockInValue);

             const hashPayload = {
                 monthKey,
                 rowIndex,
                 dateValue,
                 clockInValue,
                 clockOutValue
             };

             const expectedHash = await Na__Timecard__CreateAuthHashAsync(hashPayload);
             const storedHashValue = String(rawEntry?.Timecard__AuthHash || '').trim() || expectedHash;
             const isHashValid = await Na__Timecard__ValidateAuthHashAsync(hashPayload, storedHashValue);
            const workedMinutesValue = Na__Timecard__CalculateWorkedMinutes(normalizedClockInValue, clockOutValue);
            const isOpenShift = Boolean(clockInValue) && !clockOutValue;

            if (sourceData[monthKey][rowIndex].Timecard__AuthHash !== storedHashValue) {
                sourceData[monthKey][rowIndex].Timecard__AuthHash = storedHashValue;
                hasHashBackfillUpdates = true;
            }
             totalMinutesValue += workedMinutesValue;
             invalidEntryCount += isHashValid ? 0 : 1;
            openShiftCount += isOpenShift ? 1 : 0;

             const normalizedEntry = {
                 Timecard__Date: dateValue,
                'Timcard__Clock-In__': normalizedClockInValue,
                'Timcard__Clock-Out__': clockOutValue || '--',
                 Timecard__AuthHash: storedHashValue,
                 Timecard__ExpectedAuthHash: expectedHash,
                 Timecard__WorkedMinutes: workedMinutesValue,
                Timecard__WorkedHoursLabel: workedMinutesValue > 0 ? Na__Timecard__FormatMinutesLabel(workedMinutesValue) : '--',
                Timecard__IsHashValid: isHashValid,
                Timecard__IsOpenShift: isOpenShift
             };

             normalizedEntries.push(normalizedEntry);
             flatEntries.push(normalizedEntry);
         }

        if (normalizedEntries.length > 0) {
            monthGroups.push({
                Timecard__MonthKey: monthKey,
                Timecard__Entries: normalizedEntries
            });
        }
     }

    if (hasHashBackfillUpdates) {
        await Na__Timecard__PersistDataStoreAsync();
    }

    Na__Timecard__CachedViewModel = {
         Timecard__Data: sourceData,
         Timecard__MonthGroups: monthGroups,
         Timecard__Summary: {
             Timecard__TotalEntries: flatEntries.length,
             Timecard__TotalWorkedMinutes: totalMinutesValue,
             Timecard__TotalWorkedHoursLabel: Na__Timecard__FormatMinutesLabel(totalMinutesValue),
            Timecard__InvalidHashCount: invalidEntryCount,
            Timecard__OpenShiftCount: openShiftCount
         }
     };

     return Na__Timecard__CachedViewModel;
 }
 // ------------------------------------------------------------


 // FUNCTION | Clear Timecard Cache
 // ------------------------------------------------------------
 export function Na__Timecard__ClearTimecardCache() {
     Na__Timecard__CachedViewModel = null;
 }
 // ------------------------------------------------------------


 // FUNCTION | Record New Clock In Entry For Current Time
 // ------------------------------------------------------------
export async function Na__Timecard__ClockInNow() {
     const nowValue = new Date();
    const normalizedClockInDate = Na__Timecard__ApplyClockInGracePeriod(nowValue);
     const monthKey = Na__Timecard__BuildMonthKey(normalizedClockInDate);
     const dateLabel = Na__Timecard__FormatDateLabel(normalizedClockInDate);
     const timeLabel = Na__Timecard__FormatTimeLabel(normalizedClockInDate);
    const sourceData = await Na__Timecard__GetDataStore();

     if (!Array.isArray(sourceData[monthKey])) {
         sourceData[monthKey] = [];
     }

     const alreadyOpenForDate = sourceData[monthKey].some((entryValue) => {
         const dateValue = String(entryValue?.Timecard__Date || '').trim();
         const clockInValue = String(entryValue?.['Timcard__Clock-In__'] || '').trim();
         const clockOutValue = String(entryValue?.['Timcard__Clock-Out__'] || '').trim();
         return dateValue === dateLabel && Boolean(clockInValue) && !clockOutValue;
     });
     if (alreadyOpenForDate) {
         return { ok: false, message: 'There is already an open clock-in for today.' };
     }

     sourceData[monthKey].push({
         Timecard__Date: dateLabel,
         'Timcard__Clock-In__': timeLabel,
         'Timcard__Clock-Out__': '',
         Timecard__AuthHash: ''
     });

    await Na__Timecard__PersistDataStoreAsync();
     Na__Timecard__ClearTimecardCache();
     return { ok: true, message: `Clocked in at ${timeLabel}` };
 }
 // ------------------------------------------------------------


 // FUNCTION | Close Most Recent Open Clock In Entry
 // ------------------------------------------------------------
export async function Na__Timecard__ClockOutNow() {
     const nowValue = new Date();
    const sourceData = await Na__Timecard__GetDataStore();
     const monthKeys = Object.keys(sourceData).sort((monthA, monthB) => Na__Timecard__ParseMonthKeyToSortValue(monthB) - Na__Timecard__ParseMonthKeyToSortValue(monthA));

     for (const monthKey of monthKeys) {
         const monthEntries = Array.isArray(sourceData[monthKey]) ? sourceData[monthKey] : [];
         for (let rowIndex = monthEntries.length - 1; rowIndex >= 0; rowIndex -= 1) {
             const entryValue = monthEntries[rowIndex];
             const hasClockIn = Boolean(String(entryValue?.['Timcard__Clock-In__'] || '').trim());
             const hasClockOut = Boolean(String(entryValue?.['Timcard__Clock-Out__'] || '').trim());
             if (!hasClockIn || hasClockOut) continue;

             const timeLabel = Na__Timecard__FormatTimeLabel(nowValue);
             sourceData[monthKey][rowIndex]['Timcard__Clock-Out__'] = timeLabel;
             sourceData[monthKey][rowIndex].Timecard__AuthHash = '';
            await Na__Timecard__PersistDataStoreAsync();
             Na__Timecard__ClearTimecardCache();
             return { ok: true, message: `Clocked out at ${timeLabel}` };
         }
     }

     return { ok: false, message: 'No open clock-in entry was found to clock out.' };
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Calculate Worked Minutes Between Clock Times
 // ------------------------------------------------------------
 function Na__Timecard__CalculateWorkedMinutes(clockInValue, clockOutValue) {
     const clockInMins = Na__Timecard__ParseClockTimeToMinutes(clockInValue);
     const clockOutMins = Na__Timecard__ParseClockTimeToMinutes(clockOutValue);
     if (clockInMins === null || clockOutMins === null || clockOutMins < clockInMins) {
         return 0;
     }

     return clockOutMins - clockInMins;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Parse HH:MM Text Into Minutes
 // ------------------------------------------------------------
 function Na__Timecard__ParseClockTimeToMinutes(clockValue) {
     const timeText = String(clockValue || '').trim();
     const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText);
     if (!timeMatch) return null;

     const hourValue = Number(timeMatch[1]);
     const minuteValue = Number(timeMatch[2]);
     if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return null;
     if (hourValue < 0 || hourValue > 23 || minuteValue < 0 || minuteValue > 59) return null;

     return (hourValue * 60) + minuteValue;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format Total Minutes as Hours Label
 // ------------------------------------------------------------
 function Na__Timecard__FormatMinutesLabel(totalMinutesValue) {
     const minutesSafe = Math.max(0, Number(totalMinutesValue) || 0);
     const hourValue = Math.floor(minutesSafe / 60);
     const remainderMins = minutesSafe % 60;
     return `${hourValue}h ${String(remainderMins).padStart(2, '0')}m`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Get Mutable Data Store Instance
 // ------------------------------------------------------------
async function Na__Timecard__GetDataStore() {
     if (!Na__Timecard__DataStore) {
        const persistedValue = await Na__Persistence__LoadTimecardAsync();
        Na__Timecard__DataStore = persistedValue && typeof persistedValue === 'object'
            ? structuredClone(persistedValue)
            : structuredClone(Na__Timecard__DataSeed);
     }

     return Na__Timecard__DataStore;
 }
 // ------------------------------------------------------------


// HELPER FUNCTION | Persist Timecard Data Store To Localhost API
// ------------------------------------------------------------
async function Na__Timecard__PersistDataStoreAsync() {
    if (!Na__Timecard__DataStore) return false;
    const didSave = await Na__Persistence__SaveTimecardAsync(Na__Timecard__DataStore);
    if (!didSave && Na__System__IsRunningOnLocalhost()) {
        console.warn('ValePlanner timecard save request failed.');
    }
    return didSave;
}
// ------------------------------------------------------------


 // HELPER FUNCTION | Build Month Key String From Date
 // ------------------------------------------------------------
 function Na__Timecard__BuildMonthKey(dateValue) {
     const monthLabel = dateValue.toLocaleString('en-GB', { month: 'long' });
     return `Timecard__${monthLabel}-${dateValue.getFullYear()}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Convert Month Key Into Sort Number
 // ------------------------------------------------------------
 function Na__Timecard__ParseMonthKeyToSortValue(monthKey) {
     const monthMatch = /^Timecard__([A-Za-z]+)-(\d{4})$/.exec(String(monthKey || '').trim());
     if (!monthMatch) return 0;

     const monthName = monthMatch[1].toLowerCase();
     const yearValue = Number(monthMatch[2]);
     const monthMap = {
         january: 0,
         february: 1,
         march: 2,
         april: 3,
         may: 4,
         june: 5,
         july: 6,
         august: 7,
         september: 8,
         october: 9,
         november: 10,
         december: 11
     };
     const monthValue = monthMap[monthName];
     if (typeof monthValue !== 'number') return 0;
     return (yearValue * 100) + monthValue;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Format Date as DD-MMM-YYYY
 // ------------------------------------------------------------
 function Na__Timecard__FormatDateLabel(dateValue) {
     const dayValue = String(dateValue.getDate()).padStart(2, '0');
     const monthLabel = dateValue.toLocaleString('en-GB', { month: 'short' });
     const yearValue = dateValue.getFullYear();
     return `${dayValue}-${monthLabel}-${yearValue}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Apply Grace Period to Clock In Timestamp
 // ------------------------------------------------------------
 function Na__Timecard__ApplyClockInGracePeriod(dateValue) {
     const normalizedDate = new Date(dateValue);
     const minuteValue = normalizedDate.getMinutes();
     if (minuteValue <= Na__Timecard__ClockInGracePeriodMins) {
         normalizedDate.setMinutes(0, 0, 0);
     }
     return normalizedDate;
 }
 // ------------------------------------------------------------


// HELPER FUNCTION | Normalize Clock-In Time Text With Grace Period
// ------------------------------------------------------------
function Na__Timecard__NormalizeClockInTextWithGracePeriod(clockInValue) {
    const clockInMins = Na__Timecard__ParseClockTimeToMinutes(clockInValue);
    if (clockInMins === null) return clockInValue;

    const hourValue = Math.floor(clockInMins / 60);
    const minuteValue = clockInMins % 60;
    const normalizedMinuteValue = minuteValue <= Na__Timecard__ClockInGracePeriodMins ? 0 : minuteValue;
    return `${String(hourValue).padStart(2, '0')}:${String(normalizedMinuteValue).padStart(2, '0')}`;
}
// ------------------------------------------------------------


 // HELPER FUNCTION | Format Time as HH:MM
 // ------------------------------------------------------------
 function Na__Timecard__FormatTimeLabel(dateValue) {
     const hoursValue = String(dateValue.getHours()).padStart(2, '0');
     const minsValue = String(dateValue.getMinutes()).padStart(2, '0');
     return `${hoursValue}:${minsValue}`;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
