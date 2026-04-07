import { Na__Timecard__BuildTimecardViewModel, Na__Timecard__ClearTimecardCache, Na__Timecard__ClockInNow, Na__Timecard__ClockOutNow } from './Na__Feature__TimecardSystem__CoreLogic__.js';
import { Na__Utils__FormatUkDateLong } from '../05__AppUtils/Na__Utils__Dates.js';

// -----------------------------------------------------------------------------
// REGION | Timecard Tab Render and Event Handlers
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Render Session and Cleanup Callbacks
 // ------------------------------------------------------------
 let Na__Timecard__ActiveRenderSessionId = 0;
 let Na__Timecard__CleanupCallbacks = [];
 // ------------------------------------------------------------


 // FUNCTION | Render Timecard Feature Into Main Panel
 // ------------------------------------------------------------
 export function Na__Timecard__RenderTimecardSystem(config) {
     const { panelElement } = config;
     if (!panelElement) return;

     Na__Timecard__ActiveRenderSessionId += 1;
     const renderSessionId = Na__Timecard__ActiveRenderSessionId;
     Na__Timecard__RunCleanupCallbacks();

     panelElement.innerHTML = `
        <div class="na-timecard-root">
            <div class="na-timecard-loading">Loading timecard data...</div>
        </div>
     `;

     Na__Timecard__BuildTimecardViewModel()
         .then((viewModel) => {
             if (renderSessionId !== Na__Timecard__ActiveRenderSessionId) return;

             panelElement.innerHTML = Na__Timecard__BuildTimecardMarkup(viewModel);
             Na__Timecard__BindUiActions(panelElement);
         })
         .catch((errorValue) => {
             if (renderSessionId !== Na__Timecard__ActiveRenderSessionId) return;

             panelElement.innerHTML = `
                <div class="na-timecard-root">
                    <div class="na-timecard-error">Timecard failed to load. ${String(errorValue?.message || '')}</div>
                </div>
             `;
         });
 }
 // ------------------------------------------------------------


 // FUNCTION | Destroy Timecard Feature Event Bindings
 // ------------------------------------------------------------
 export function Na__Timecard__DestroyTimecardSystem() {
     Na__Timecard__ActiveRenderSessionId += 1;
     Na__Timecard__RunCleanupCallbacks();
 }
 // ------------------------------------------------------------


 // SUB FUNCTION | Bind Timecard Panel Events
 // ------------------------------------------------------------
 function Na__Timecard__BindUiActions(panelElement) {
    const clockInButton = panelElement.querySelector('[data-action="timecard-clock-in"]');
    const clockOutButton = panelElement.querySelector('[data-action="timecard-clock-out"]');
     const refreshButton = panelElement.querySelector('[data-action="timecard-refresh"]');
     const validateButton = panelElement.querySelector('[data-action="timecard-validate"]');
    const feedbackElement = panelElement.querySelector('#naTimecardFeedback');

    if (clockInButton) {
        const clockInHandler = async () => {
            const clockResult = await Na__Timecard__ClockInNow();
            if (feedbackElement) {
                feedbackElement.textContent = clockResult.message;
                feedbackElement.className = `na-timecard-feedback ${clockResult.ok ? 'na-timecard-feedback--ok' : 'na-timecard-feedback--warn'}`;
            }
            if (clockResult.ok) {
                Na__Timecard__RenderTimecardSystem({ panelElement });
            }
        };
        clockInButton.addEventListener('click', clockInHandler);
        Na__Timecard__CleanupCallbacks.push(() => clockInButton.removeEventListener('click', clockInHandler));
    }

    if (clockOutButton) {
        const clockOutHandler = async () => {
            const clockResult = await Na__Timecard__ClockOutNow();
            if (feedbackElement) {
                feedbackElement.textContent = clockResult.message;
                feedbackElement.className = `na-timecard-feedback ${clockResult.ok ? 'na-timecard-feedback--ok' : 'na-timecard-feedback--warn'}`;
            }
            if (clockResult.ok) {
                Na__Timecard__RenderTimecardSystem({ panelElement });
            }
        };
        clockOutButton.addEventListener('click', clockOutHandler);
        Na__Timecard__CleanupCallbacks.push(() => clockOutButton.removeEventListener('click', clockOutHandler));
    }

     if (refreshButton) {
         const refreshHandler = () => {
             Na__Timecard__ClearTimecardCache();
             Na__Timecard__RenderTimecardSystem({ panelElement });
         };
         refreshButton.addEventListener('click', refreshHandler);
         Na__Timecard__CleanupCallbacks.push(() => refreshButton.removeEventListener('click', refreshHandler));
     }

     if (validateButton) {
         const validateHandler = () => {
             Na__Timecard__ClearTimecardCache();
             Na__Timecard__RenderTimecardSystem({ panelElement });
         };
         validateButton.addEventListener('click', validateHandler);
         Na__Timecard__CleanupCallbacks.push(() => validateButton.removeEventListener('click', validateHandler));
     }
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Build Full Timecard Markup
 // ------------------------------------------------------------
 function Na__Timecard__BuildTimecardMarkup(viewModel) {
     const summaryValue = viewModel.Timecard__Summary;
     const monthCardsMarkup = viewModel.Timecard__MonthGroups
         .map((monthGroup) => Na__Timecard__BuildMonthCardMarkup(monthGroup))
         .join('');

     const integrityLabel = summaryValue.Timecard__InvalidHashCount > 0
         ? `${summaryValue.Timecard__InvalidHashCount} invalid`
         : 'All valid';
     const integrityClassName = summaryValue.Timecard__InvalidHashCount > 0
         ? 'na-timecard-chip--warn'
         : 'na-timecard-chip--ok';

     return `
        <section class="na-timecard-root">
            <header class="na-timecard-toolbar">
                <div class="na-timecard-toolbar__left">
                    <h2 class="na-timecard-title">Timecard</h2>
                    <p class="na-timecard-subtitle">Clock In / Clock Out Records Grouped By Month</p>
                </div>
                <div class="na-timecard-toolbar__right">
                    <button class="na-button na-timecard-button--clock-in" data-action="timecard-clock-in">Clock In</button>
                    <button class="na-button na-timecard-button--clock-out" data-action="timecard-clock-out">Clock Out</button>
                    <button class="na-button" data-action="timecard-refresh">Refresh</button>
                    <button class="na-button" data-action="timecard-validate">Validate Hashes</button>
                </div>
            </header>
            <div class="na-timecard-feedback" id="naTimecardFeedback"></div>

            <div class="na-timecard-summary">
                <div class="na-timecard-summary__item">
                    <span class="na-timecard-summary__label">Entries</span>
                    <span class="na-timecard-summary__value">${summaryValue.Timecard__TotalEntries}</span>
                </div>
                <div class="na-timecard-summary__item">
                    <span class="na-timecard-summary__label">Tracked Time</span>
                    <span class="na-timecard-summary__value">${summaryValue.Timecard__TotalWorkedHoursLabel}</span>
                </div>
                <div class="na-timecard-summary__item">
                    <span class="na-timecard-summary__label">Integrity</span>
                    <span class="na-timecard-chip ${integrityClassName}">${integrityLabel}</span>
                </div>
                <div class="na-timecard-summary__item">
                    <span class="na-timecard-summary__label">Open Shifts</span>
                    <span class="na-timecard-summary__value">${summaryValue.Timecard__OpenShiftCount}</span>
                </div>
            </div>

            ${Na__Timecard__BuildTimeBalanceMarkup(viewModel.Timecard__TimeBalance)}

            <div class="na-timecard-month-grid">
                ${monthCardsMarkup || '<div class="na-timecard-empty-state">No timecard entries yet. Use Clock In to start a new day.</div>'}
            </div>
        </section>
     `;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Build Month Card Markup
 // ------------------------------------------------------------
 function Na__Timecard__BuildMonthCardMarkup(monthGroup) {
     const rowsMarkup = monthGroup.Timecard__Entries.map((entryValue) => {
         const validityClassName = entryValue.Timecard__IsHashValid
             ? 'na-timecard-hash-status--ok'
             : 'na-timecard-hash-status--warn';
         const validityLabel = entryValue.Timecard__IsHashValid ? 'Valid' : 'Mismatch';
        const rowClassName = entryValue.Timecard__IsOpenShift ? 'na-timecard-table__row na-timecard-table__row--open' : 'na-timecard-table__row';

         return `
            <tr class="${rowClassName}">
                <td>${Na__Utils__FormatUkDateLong(entryValue.Timecard__Date)}</td>
                <td>${entryValue['Timcard__Clock-In__']}</td>
                <td>${entryValue['Timcard__Clock-Out__']}</td>
                <td>${entryValue.Timecard__WorkedHoursLabel}</td>
                <td><span class="na-timecard-hash-status ${validityClassName}">${validityLabel}</span></td>
                <td class="na-timecard-hash-cell" title="${entryValue.Timecard__AuthHash}">${entryValue.Timecard__AuthHash}</td>
            </tr>
         `;
     }).join('');

     const emptyMarkup = monthGroup.Timecard__Entries.length === 0
         ? '<tr><td colspan="6" class="na-timecard-table__empty">No entries for this month yet.</td></tr>'
         : rowsMarkup;

     return `
        <article class="na-timecard-month-card">
            <h3 class="na-timecard-month-card__title">${monthGroup.Timecard__MonthKey}</h3>
            <div class="na-timecard-table-wrap">
                <table class="na-timecard-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Auth Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${emptyMarkup}
                    </tbody>
                </table>
            </div>
        </article>
     `;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Build Time Balance Section Markup
 // ------------------------------------------------------------
 function Na__Timecard__BuildTimeBalanceMarkup(balanceData) {
     if (!balanceData) return '';

     const balanceClassName = balanceData.TimeBalance__IsCredit
         ? 'na-timecard-balance__value--credit'
         : 'na-timecard-balance__value--debt';
     const balanceStatusLabel = balanceData.TimeBalance__IsCredit
         ? 'Time Credit'
         : 'Time Debt';
     const sectionTintClassName = balanceData.TimeBalance__BalanceMinutes > 0
         ? 'na-timecard-balance--credit'
         : balanceData.TimeBalance__BalanceMinutes < 0
             ? 'na-timecard-balance--debt'
             : '';

     const monthRows = balanceData.TimeBalance__MonthBreakdowns
         .map((monthValue) => {
             const monthBalanceClassName = monthValue.isCredit
                 ? 'na-timecard-balance__month-value--credit'
                 : 'na-timecard-balance__month-value--debt';
             return `
                <tr>
                    <td>${monthValue.monthKey}</td>
                    <td class="na-timecard-balance__cell-number">${monthValue.completedDays}</td>
                    <td class="na-timecard-balance__cell-number">${monthValue.expectedMins / 60}h</td>
                    <td class="na-timecard-balance__cell-number">${Math.floor(monthValue.workedMins / 60)}h ${String(monthValue.workedMins % 60).padStart(2, '0')}m</td>
                    <td class="na-timecard-balance__cell-number"><span class="${monthBalanceClassName}">${monthValue.balanceLabel}</span></td>
                </tr>
             `;
         })
         .join('');

     return `
        <section class="na-timecard-balance ${sectionTintClassName}">
            <div class="na-timecard-balance__header">
                <h3 class="na-timecard-balance__title">Time Balance</h3>
                <span class="na-timecard-balance__contracted-label">${balanceData.TimeBalance__ContractedHoursPerDay}h contracted per day</span>
            </div>

            <div class="na-timecard-balance__hero">
                <div class="na-timecard-balance__hero-item">
                    <span class="na-timecard-balance__hero-label">Days Worked</span>
                    <span class="na-timecard-balance__hero-value">${balanceData.TimeBalance__CompletedDayCount}</span>
                </div>
                <div class="na-timecard-balance__hero-item">
                    <span class="na-timecard-balance__hero-label">Expected Hours</span>
                    <span class="na-timecard-balance__hero-value">${balanceData.TimeBalance__ExpectedLabel}</span>
                </div>
                <div class="na-timecard-balance__hero-item">
                    <span class="na-timecard-balance__hero-label">Worked Hours</span>
                    <span class="na-timecard-balance__hero-value">${balanceData.TimeBalance__WorkedLabel}</span>
                </div>
                <div class="na-timecard-balance__hero-item">
                    <span class="na-timecard-balance__hero-label">${balanceStatusLabel}</span>
                    <span class="na-timecard-balance__hero-value ${balanceClassName}">${balanceData.TimeBalance__BalanceLabel}</span>
                </div>
            </div>

            <div class="na-timecard-balance__breakdown">
                <table class="na-timecard-balance__table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="na-timecard-balance__cell-number">Days</th>
                            <th class="na-timecard-balance__cell-number">Expected</th>
                            <th class="na-timecard-balance__cell-number">Worked</th>
                            <th class="na-timecard-balance__cell-number">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthRows}
                    </tbody>
                </table>
            </div>
        </section>
     `;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Run and Clear Cleanup Callback List
 // ------------------------------------------------------------
 function Na__Timecard__RunCleanupCallbacks() {
     Na__Timecard__CleanupCallbacks.forEach((cleanupFn) => cleanupFn());
     Na__Timecard__CleanupCallbacks = [];
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
