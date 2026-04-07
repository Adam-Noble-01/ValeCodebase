// =============================================================================
// VALEPLANNER - TIME BALANCE CALCULATOR
// =============================================================================
//
// FILE       : Na__Feature__TimecardSystem__TimeBalanceCalculator__.js
// NAMESPACE  : ValePlanner
// MODULE     : TimeBalanceCalculator
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Calculate time credit/debt from timecard data and contracted hours
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Pure calculation module with no side effects or DOM access.
// - Counts completed days (entries with both clock-in and clock-out).
// - Computes expected hours from completedDays x contractedHoursPerDay.
// - Derives a balance (positive = credit, negative = debt).
// - Provides per-month breakdowns for UI rendering.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Time Balance Calculation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format Signed Minutes as Hours and Minutes Label
    // ------------------------------------------------------------
    function Na__TimeBalance__FormatSignedMinutesLabel(totalMinutesValue) {
        const absoluteMinutes = Math.abs(totalMinutesValue);
        const hourValue       = Math.floor(absoluteMinutes / 60);
        const remainderMins   = absoluteMinutes % 60;
        const sign            = totalMinutesValue < 0 ? '-' : '+';
        return `${sign}${hourValue}h ${String(remainderMins).padStart(2, '0')}m`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Unsigned Minutes as Hours and Minutes Label
    // ------------------------------------------------------------
    function Na__TimeBalance__FormatUnsignedMinutesLabel(totalMinutesValue) {
        const minutesSafe   = Math.max(0, Number(totalMinutesValue) || 0);
        const hourValue     = Math.floor(minutesSafe / 60);
        const remainderMins = minutesSafe % 60;
        return `${hourValue}h ${String(remainderMins).padStart(2, '0')}m`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Calculate Time Balance From Timecard View Model
    // ------------------------------------------------------------
    export function Na__TimeBalance__CalculateBalanceFromViewModel(viewModel, contractedHoursPerDay) {
        const contractedMinutesPerDay = (Number(contractedHoursPerDay) || 0) * 60;
        const monthGroups             = viewModel?.Timecard__MonthGroups || [];
        const monthBreakdowns         = [];

        let grandTotalWorkedMins   = 0;
        let grandTotalExpectedMins = 0;
        let grandCompletedDays     = 0;

        for (const monthGroup of monthGroups) {
            const entries          = monthGroup?.Timecard__Entries || [];
            let monthWorkedMins    = 0;
            let monthCompletedDays = 0;

            for (const entry of entries) {
                if (entry.Timecard__IsOpenShift) continue;

                const workedMins = Number(entry.Timecard__WorkedMinutes) || 0;
                if (workedMins <= 0) continue;

                monthWorkedMins    += workedMins;
                monthCompletedDays += 1;
            }

            const monthExpectedMins = monthCompletedDays * contractedMinutesPerDay;
            const monthBalanceMins  = monthWorkedMins - monthExpectedMins;

            monthBreakdowns.push({
                monthKey     : monthGroup.Timecard__MonthKey,
                expectedMins : monthExpectedMins,
                workedMins   : monthWorkedMins,
                completedDays: monthCompletedDays,
                balanceMins  : monthBalanceMins,
                balanceLabel : Na__TimeBalance__FormatSignedMinutesLabel(monthBalanceMins),
                isCredit     : monthBalanceMins >= 0
            });

            grandTotalWorkedMins   += monthWorkedMins;
            grandTotalExpectedMins += monthExpectedMins;
            grandCompletedDays     += monthCompletedDays;
        }

        const grandBalanceMins = grandTotalWorkedMins - grandTotalExpectedMins;

        return {
            TimeBalance__TotalExpectedMinutes  : grandTotalExpectedMins,
            TimeBalance__TotalWorkedMinutes    : grandTotalWorkedMins,
            TimeBalance__BalanceMinutes        : grandBalanceMins,
            TimeBalance__BalanceLabel          : Na__TimeBalance__FormatSignedMinutesLabel(grandBalanceMins),
            TimeBalance__ExpectedLabel         : Na__TimeBalance__FormatUnsignedMinutesLabel(grandTotalExpectedMins),
            TimeBalance__WorkedLabel           : Na__TimeBalance__FormatUnsignedMinutesLabel(grandTotalWorkedMins),
            TimeBalance__IsCredit              : grandBalanceMins >= 0,
            TimeBalance__CompletedDayCount     : grandCompletedDays,
            TimeBalance__ContractedHoursPerDay : Number(contractedHoursPerDay) || 0,
            TimeBalance__MonthBreakdowns       : monthBreakdowns
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
