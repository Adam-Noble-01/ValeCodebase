import { Na__Utils__GetDayLabel, Na__Utils__GetWeekRangeLabel } from '../05__AppUtils/Na__Utils__Dates.js';

// -----------------------------------------------------------------------------
// REGION | Header and Tabs Renderer
// -----------------------------------------------------------------------------

 // FUNCTION | Render Header and Main Shell
 // ------------------------------------------------------------
 export function Na__Header__RenderShell(state, rootElement) {
     const dateLabel = state.viewMode === 'day'
         ? Na__Utils__GetDayLabel(state.currentDate)
         : Na__Utils__GetWeekRangeLabel(state.currentDate);
    const thumbnailImageUrl = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValePlanner/01__AppAssets__ValePlanner/ProfileImage__CorporateHeadshot__AdamW__.png';

     rootElement.innerHTML = `
        <header class="na-app-header">
            <div class="na-app-header__left">
                <div class="na-app-header__brand">
                    <img class="na-app-header__avatar" src="${thumbnailImageUrl}" alt="Profile Thumbnail">
                    <div class="na-app-header__title">Adam's Schedule</div>
                </div>
                <div class="na-pill-group">
                    <button class="na-pill-group__btn ${state.mainTab === 'timecard' ? 'na-pill-group__btn--active' : ''}" data-action="set-main-tab" data-value="timecard">Timecard</button>
                    <button class="na-pill-group__btn ${state.mainTab === 'schedule' ? 'na-pill-group__btn--active' : ''}" data-action="set-main-tab" data-value="schedule">Schedule</button>
                    <button class="na-pill-group__btn ${state.mainTab === 'analytics' ? 'na-pill-group__btn--active' : ''}" data-action="set-main-tab" data-value="analytics">Analytics</button>
                </div>
            </div>
            <div class="na-app-header__right">
                ${state.mainTab === 'schedule' ? `
                    <div class="na-date-pill">${dateLabel}</div>
                    <div class="na-pill-group">
                        <button class="na-pill-group__btn ${state.viewMode === 'day' ? 'na-pill-group__btn--active' : ''}" data-action="set-view-mode" data-value="day">Day</button>
                        <button class="na-pill-group__btn ${state.viewMode === 'week' ? 'na-pill-group__btn--active' : ''}" data-action="set-view-mode" data-value="week">Week</button>
                    </div>
                ` : ''}
                <button class="na-button" data-action="reset-workers">Reset</button>
            </div>
        </header>
        <main class="na-app-main">
            <section class="na-app-main__panel" id="naAppFeaturePanel"></section>
        </main>
     `;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
