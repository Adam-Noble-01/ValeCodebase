import Na__Timecard__DataSeed from './Na__Feature__Data__TimecardData__.json' with { type: 'json' };
import Na__Workers__AdamW from '../03__AppData/Na__AppData__Workers__AdamW__.json' with { type: 'json' };
import { Na__Timecard__CreateAuthHashAsync, Na__Timecard__ValidateAuthHashAsync } from './Na__Feature__TimecardSystem__UniqueHashGenerator__.js';
import { Na__TimeBalance__CalculateBalanceFromViewModel } from './Na__Feature__TimecardSystem__TimeBalanceCalculator__.js';
import { Na__Persistence__LoadTimecardAsync, Na__Persistence__SaveTimecardAsync } from '../70__System__DevTools/Na__System__PersistenceApi.js';
import { Na__System__IsRunningOnLocalhost } from '../70__System__DevTools/Na__System__DevTools__LocalhostGuard.js';
import { Na__Utils__FormatLocalDateAsYyyyMmDd } from '../05__AppUtils/Na__Utils__Dates.js';


// -----------------------------------------------------------------------------
// REGION | Module State - Mutable Store and Configuration
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Mutable Store and Cached View Model
    // ------------------------------------------------------------
    let Na__Timecard__DataStore                = null; // <-- Live mutable data store (loaded on demand)
    let Na__Timecard__CachedViewModel          = null; // <-- Cached view model (cleared on each mutation)
    const Na__Timecard__ClockInFloorMins       = 5;    // <-- Round clock-in down to this minute interval
    const Na__Timecard__ClockOutFloorMins      = 5;    // <-- Round clock-out down to this minute interval
    const Na__Timecard__ContractedHoursPerDay  = Na__Workers__AdamW?.workers?.[0]?.contractedHoursPerDay ?? 10; // <-- Contracted hours from worker config
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Date and Time Key Formatting
// -----------------------------------------------------------------------------

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
        const monthMap  = {
            january:   0,
            february:  1,
            march:     2,
            april:     3,
            may:       4,
            june:      5,
            july:      6,
            august:    7,
            september: 8,
            october:   9,
            november:  10,
            december:  11
        };
        const monthValue = monthMap[monthName];
        if (typeof monthValue !== 'number') return 0;
        return (yearValue * 100) + monthValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date as YYYY-MM-DD (Canonical Storage)
    // ------------------------------------------------------------
    function Na__Timecard__FormatDateLabel(dateValue) {
        return Na__Utils__FormatLocalDateAsYyyyMmDd(dateValue);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Time as HH:MM
    // ------------------------------------------------------------
    function Na__Timecard__FormatTimeLabel(dateValue) {
        const hoursValue = String(dateValue.getHours()).padStart(2, '0');
        const minsValue  = String(dateValue.getMinutes()).padStart(2, '0');
        return `${hoursValue}:${minsValue}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Time Calculation and Duration Formatting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse HH:MM Text Into Total Minutes
    // ------------------------------------------------------------
    function Na__Timecard__ParseClockTimeToMinutes(clockValue) {
        const timeText  = String(clockValue || '').trim();
        const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText);
        if (!timeMatch) return null;

        const hourValue   = Number(timeMatch[1]);
        const minuteValue = Number(timeMatch[2]);
        if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return null;
        if (hourValue < 0 || hourValue > 23 || minuteValue < 0 || minuteValue > 59) return null;

        return (hourValue * 60) + minuteValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Worked Minutes Between Clock Times
    // ------------------------------------------------------------
    function Na__Timecard__CalculateWorkedMinutes(clockInValue, clockOutValue) {
        const clockInMins  = Na__Timecard__ParseClockTimeToMinutes(clockInValue);
        const clockOutMins = Na__Timecard__ParseClockTimeToMinutes(clockOutValue);
        if (clockInMins === null || clockOutMins === null || clockOutMins < clockInMins) {
            return 0;
        }
        return clockOutMins - clockInMins;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Total Minutes as Hours and Minutes Label
    // ------------------------------------------------------------
    function Na__Timecard__FormatMinutesLabel(totalMinutesValue) {
        const minutesSafe   = Math.max(0, Number(totalMinutesValue) || 0);
        const hourValue     = Math.floor(minutesSafe / 60);
        const remainderMins = minutesSafe % 60;
        return `${hourValue}h ${String(remainderMins).padStart(2, '0')}m`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Admin Override Parsing - Retrospective Edit Metadata
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalize Optional Admin Override Block
    // ------------------------------------------------------------
    function Na__Timecard__NormalizeAdminOverrideBlock(overrideValue) {
        if (!overrideValue || typeof overrideValue !== 'object' || Array.isArray(overrideValue)) {
            return null;
        }

        const isRetrospectiveEdit = Boolean(
            overrideValue.Timecard__IsRetrospectiveEdit
            ?? overrideValue.IsRetrospectiveEdit
        );
        if (!isRetrospectiveEdit) {
            return null;
        }

        return {
            Timecard__IsRetrospectiveEdit: true,
            Timecard__EditedAtUtcIso: String(
                overrideValue.Timecard__EditedAtUtcIso
                ?? overrideValue.Timestamp
                ?? ''
            ).trim(),
            Timecard__Reason: String(
                overrideValue.Timecard__Reason
                ?? overrideValue.Reason
                ?? ''
            ).trim(),
            Timecard__EditedBy: String(
                overrideValue.Timecard__EditedBy
                ?? overrideValue.EditedBy
                ?? ''
            ).trim(),
            Timecard__OriginalClockIn: String(
                overrideValue.Timecard__OriginalClockIn
                ?? ''
            ).trim(),
            Timecard__OriginalClockOut: String(
                overrideValue.Timecard__OriginalClockOut
                ?? ''
            ).trim()
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clock-In Rounding - Floor to Previous 5 Minutes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Floor To Clock In Timestamp
    // ------------------------------------------------------------
    function Na__Timecard__ApplyClockInFloorToFiveMins(dateValue) {
        const normalizedDate = new Date(dateValue);
        const minuteValue    = normalizedDate.getMinutes();
        const minuteRemainder = minuteValue % Na__Timecard__ClockInFloorMins;
        normalizedDate.setMinutes(minuteValue - minuteRemainder, 0, 0);
        return normalizedDate;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Clock-In Time Text With 5-Min Floor
    // ------------------------------------------------------------
    function Na__Timecard__NormalizeClockInTextWithFiveMinFloor(clockInValue) {
        const clockInMins = Na__Timecard__ParseClockTimeToMinutes(clockInValue);
        if (clockInMins === null) return clockInValue;

        const normalizedMins = clockInMins - (clockInMins % Na__Timecard__ClockInFloorMins);
        const hourValue      = Math.floor(normalizedMins / 60);
        const minuteValue    = normalizedMins % 60;
        return `${String(hourValue).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clock-Out Rounding - Floor to Previous 5 Minutes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Floor To Clock Out Timestamp
    // ------------------------------------------------------------
    function Na__Timecard__ApplyClockOutFloorToFiveMins(dateValue) {
        const normalizedDate = new Date(dateValue);
        const minuteValue    = normalizedDate.getMinutes();
        const minuteRemainder = minuteValue % Na__Timecard__ClockOutFloorMins;
        normalizedDate.setMinutes(minuteValue - minuteRemainder, 0, 0);
        return normalizedDate;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Clock-Out Time Text With 5-Min Floor
    // ------------------------------------------------------------
    function Na__Timecard__NormalizeClockOutTextWithFiveMinFloor(clockOutValue) {
        const clockOutMins = Na__Timecard__ParseClockTimeToMinutes(clockOutValue);
        if (clockOutMins === null) return clockOutValue;

        const normalizedMins = clockOutMins - (clockOutMins % Na__Timecard__ClockOutFloorMins);
        const hourValue      = Math.floor(normalizedMins / 60);
        const minuteValue    = normalizedMins % 60;
        return `${String(hourValue).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Legacy Data Migration - DD-MMM-YYYY to YYYY-MM-DD
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Map Legacy Month Token to 0-11 Index
    // ------------------------------------------------------------
    function Na__Timecard__LegacyMonthTokenToIndex(monthToken) {
        const key      = String(monthToken || '').trim().toLowerCase();
        const monthMap = {
            jan:  0,  january:   0,
            feb:  1,  february:  1,
            mar:  2,  march:     2,
            apr:  3,  april:     3,
            may:  4,
            jun:  5,  june:      5,
            jul:  6,  july:      6,
            aug:  7,  august:    7,
            sep:  8,  sept:      8,  september: 8,
            oct:  9,  october:   9,
            nov:  10, november:  10,
            dec:  11, december:  11
        };
        return typeof monthMap[key] === 'number' ? monthMap[key] : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Legacy DD-MMM-YYYY Row Date to YYYY-MM-DD
    // ------------------------------------------------------------
    function Na__Timecard__TryLegacyRowDateToYyyyMmDd(dateText) {
        const legacyMatch = /^(\d{1,2})-([A-Za-z]+)-(\d{4})$/.exec(String(dateText || '').trim());
        if (!legacyMatch) return null;

        const dayValue   = Number(legacyMatch[1]);
        const monthIndex = Na__Timecard__LegacyMonthTokenToIndex(legacyMatch[2]);
        const yearValue  = Number(legacyMatch[3]);
        if (monthIndex === null || Number.isNaN(dayValue) || Number.isNaN(yearValue)) return null;

        const localDate = new Date(yearValue, monthIndex, dayValue);
        if (localDate.getFullYear() !== yearValue || localDate.getMonth() !== monthIndex || localDate.getDate() !== dayValue) {
            return null;
        }
        return Na__Utils__FormatLocalDateAsYyyyMmDd(localDate);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Migrate Legacy Timecard Dates and Reset Hashes
    // ------------------------------------------------------------
    function Na__Timecard__MigrateLegacyTimecardDates(dataStore) {
        if (!dataStore || typeof dataStore !== 'object') return false;

        let didMutate     = false;
        const canonicalRe = /^\d{4}-\d{2}-\d{2}$/;

        Object.keys(dataStore).forEach((monthKey) => {
            const rows = dataStore[monthKey];
            if (!Array.isArray(rows)) return;

            rows.forEach((rowValue, rowIndex) => {
                const rawDate = String(rowValue?.Timecard__Date || '').trim();
                if (!rawDate || canonicalRe.test(rawDate)) return;

                const migrated = Na__Timecard__TryLegacyRowDateToYyyyMmDd(rawDate);
                if (!migrated) return;

                dataStore[monthKey][rowIndex].Timecard__Date     = migrated;
                dataStore[monthKey][rowIndex].Timecard__AuthHash = '';
                didMutate = true;
            });
        });

        return didMutate;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Data Store - Load and Persist
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Mutable Data Store Instance
    // ------------------------------------------------------------
    async function Na__Timecard__GetDataStore() {
        if (!Na__Timecard__DataStore) {
            const persistedValue    = await Na__Persistence__LoadTimecardAsync();
            Na__Timecard__DataStore = persistedValue && typeof persistedValue === 'object'
                ? structuredClone(persistedValue)
                : structuredClone(Na__Timecard__DataSeed);

            const didMigrate = Na__Timecard__MigrateLegacyTimecardDates(Na__Timecard__DataStore);
            if (didMigrate) {
                await Na__Timecard__PersistDataStoreAsync();
            }
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clock-In and Clock-Out Actions
// -----------------------------------------------------------------------------

    // FUNCTION | Record New Clock In Entry For Current Time
    // ------------------------------------------------------------
    export async function Na__Timecard__ClockInNow() {
        const nowValue              = new Date();
        const normalizedClockInDate = Na__Timecard__ApplyClockInFloorToFiveMins(nowValue);
        const monthKey              = Na__Timecard__BuildMonthKey(normalizedClockInDate);
        const dateLabel             = Na__Timecard__FormatDateLabel(normalizedClockInDate);
        const timeLabel             = Na__Timecard__FormatTimeLabel(normalizedClockInDate);
        const sourceData            = await Na__Timecard__GetDataStore();

        if (!Array.isArray(sourceData[monthKey])) {
            sourceData[monthKey] = [];
        }

        const alreadyOpenForDate = sourceData[monthKey].some((entryValue) => {
            const dateValue     = String(entryValue?.Timecard__Date || '').trim();
            const clockInValue  = String(entryValue?.['Timcard__Clock-In__'] || '').trim();
            const clockOutValue = String(entryValue?.['Timcard__Clock-Out__'] || '').trim();
            return dateValue === dateLabel && Boolean(clockInValue) && !clockOutValue;
        });
        if (alreadyOpenForDate) {
            return { ok: false, message: 'There is already an open clock-in for today.' };
        }

        sourceData[monthKey].push({
            Timecard__Date:        dateLabel,
            'Timcard__Clock-In__': timeLabel,
            'Timcard__Clock-Out__': '',
            Timecard__AuthHash:    ''
        });

        await Na__Timecard__PersistDataStoreAsync();
        Na__Timecard__ClearTimecardCache();
        return { ok: true, message: `Clocked in at ${timeLabel}` };
    }
    // ------------------------------------------------------------


    // FUNCTION | Close Most Recent Open Clock In Entry
    // ------------------------------------------------------------
    export async function Na__Timecard__ClockOutNow() {
        const nowValue               = new Date();
        const normalizedClockOutDate = Na__Timecard__ApplyClockOutFloorToFiveMins(nowValue);
        const sourceData             = await Na__Timecard__GetDataStore();
        const monthKeys              = Object.keys(sourceData).sort((monthA, monthB) => Na__Timecard__ParseMonthKeyToSortValue(monthB) - Na__Timecard__ParseMonthKeyToSortValue(monthA));

        for (const monthKey of monthKeys) {
            const monthEntries = Array.isArray(sourceData[monthKey]) ? sourceData[monthKey] : [];
            for (let rowIndex = monthEntries.length - 1; rowIndex >= 0; rowIndex -= 1) {
                const entryValue  = monthEntries[rowIndex];
                const hasClockIn  = Boolean(String(entryValue?.['Timcard__Clock-In__'] || '').trim());
                const hasClockOut = Boolean(String(entryValue?.['Timcard__Clock-Out__'] || '').trim());
                if (!hasClockIn || hasClockOut) continue;

                const timeLabel = Na__Timecard__FormatTimeLabel(normalizedClockOutDate);
                sourceData[monthKey][rowIndex]['Timcard__Clock-Out__'] = timeLabel;
                sourceData[monthKey][rowIndex].Timecard__AuthHash      = '';
                await Na__Timecard__PersistDataStoreAsync();
                Na__Timecard__ClearTimecardCache();
                return { ok: true, message: `Clocked out at ${timeLabel}` };
            }
        }

        return { ok: false, message: 'No open clock-in entry was found to clock out.' };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Model - Build and Cache Timecard View Model
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clear Timecard View Model Cache
    // ------------------------------------------------------------
    export function Na__Timecard__ClearTimecardCache() {
        Na__Timecard__CachedViewModel = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Timecard View Model
    // ------------------------------------------------------------
    export async function Na__Timecard__BuildTimecardViewModel() {
        if (Na__Timecard__CachedViewModel) {
            return Na__Timecard__CachedViewModel;
        }

        const sourceData  = await Na__Timecard__GetDataStore();
        const monthKeys   = Object.keys(sourceData).sort((monthA, monthB) => Na__Timecard__ParseMonthKeyToSortValue(monthB) - Na__Timecard__ParseMonthKeyToSortValue(monthA));
        const monthGroups = [];
        const flatEntries = [];
        let totalMinutesValue      = 0;
        let invalidEntryCount      = 0;
        let openShiftCount         = 0;
        let hasHashBackfillUpdates = false;

        for (const monthKey of monthKeys) {
            const rawEntries        = Array.isArray(sourceData[monthKey]) ? sourceData[monthKey] : [];
            const normalizedEntries = [];

            for (let rowIndex = 0; rowIndex < rawEntries.length; rowIndex += 1) {
                const rawEntry      = rawEntries[rowIndex];
                const dateValue     = String(rawEntry?.Timecard__Date || '').trim();
                const clockInValue  = String(rawEntry?.['Timcard__Clock-In__'] || '').trim();
                const clockOutValue = String(rawEntry?.['Timcard__Clock-Out__'] || '').trim();
                const adminOverrideData = Na__Timecard__NormalizeAdminOverrideBlock(rawEntry?.Timecard__AdminOverride__);
                const normalizedClockInValue  = Na__Timecard__NormalizeClockInTextWithFiveMinFloor(clockInValue);
                const normalizedClockOutValue = Na__Timecard__NormalizeClockOutTextWithFiveMinFloor(clockOutValue);

                const hashPayload = {
                    monthKey,
                    rowIndex,
                    dateValue,
                    clockInValue,
                    clockOutValue
                };

                const expectedHash    = await Na__Timecard__CreateAuthHashAsync(hashPayload);
                const storedHashValue = String(rawEntry?.Timecard__AuthHash || '').trim() || expectedHash;
                const isHashValidFromHash = await Na__Timecard__ValidateAuthHashAsync(hashPayload, storedHashValue);
                // Future admin dashboard versions can use this flag for dedicated colour/state rendering.
                const isRetrospectiveOverride = Boolean(adminOverrideData?.Timecard__IsRetrospectiveEdit);
                const isHashValid = isRetrospectiveOverride ? true : isHashValidFromHash;
                const workedMinutesValue = Na__Timecard__CalculateWorkedMinutes(normalizedClockInValue, normalizedClockOutValue);
                const isOpenShift     = Boolean(clockInValue) && !clockOutValue;

                if (sourceData[monthKey][rowIndex].Timecard__AuthHash !== storedHashValue) {
                    sourceData[monthKey][rowIndex].Timecard__AuthHash = storedHashValue;
                    hasHashBackfillUpdates = true;
                }

                totalMinutesValue += workedMinutesValue;
                invalidEntryCount += isHashValid ? 0 : 1;
                openShiftCount    += isOpenShift ? 1 : 0;

                const normalizedEntry = {
                    Timecard__Date:             dateValue,
                    'Timcard__Clock-In__':      normalizedClockInValue,
                    'Timcard__Clock-Out__':      normalizedClockOutValue || '--',
                    Timecard__AuthHash:          storedHashValue,
                    Timecard__ExpectedAuthHash:  expectedHash,
                    Timecard__WorkedMinutes:     workedMinutesValue,
                    Timecard__WorkedHoursLabel:  workedMinutesValue > 0 ? Na__Timecard__FormatMinutesLabel(workedMinutesValue) : '--',
                    Timecard__IsHashValid:       isHashValid,
                    Timecard__IsOpenShift:       isOpenShift,
                    Timecard__IsRetrospectiveOverride: isRetrospectiveOverride,
                    Timecard__AdminOverride__:   adminOverrideData
                };

                normalizedEntries.push(normalizedEntry);
                flatEntries.push(normalizedEntry);
            }

            if (normalizedEntries.length > 0) {
                monthGroups.push({
                    Timecard__MonthKey: monthKey,
                    Timecard__Entries:  normalizedEntries
                });
            }
        }

        if (hasHashBackfillUpdates) {
            await Na__Timecard__PersistDataStoreAsync();
        }

        Na__Timecard__CachedViewModel = {
            Timecard__Data:        sourceData,
            Timecard__MonthGroups: monthGroups,
            Timecard__Summary: {
                Timecard__TotalEntries:          flatEntries.length,
                Timecard__TotalWorkedMinutes:    totalMinutesValue,
                Timecard__TotalWorkedHoursLabel: Na__Timecard__FormatMinutesLabel(totalMinutesValue),
                Timecard__InvalidHashCount:      invalidEntryCount,
                Timecard__OpenShiftCount:        openShiftCount
            }
        };

        Na__Timecard__CachedViewModel.Timecard__TimeBalance = Na__TimeBalance__CalculateBalanceFromViewModel(
            Na__Timecard__CachedViewModel,
            Na__Timecard__ContractedHoursPerDay
        );

        return Na__Timecard__CachedViewModel;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
