import { Na__Schedule__PixelsPerMinute } from './Na__Feature__ScheduleBoard__Constants.js';
import { Na__Schedule__GetAllShifts, Na__Schedule__GetBounds, Na__Schedule__GetColumns, Na__Schedule__GetTimeLabels } from './Na__Feature__ScheduleBoard__DataTransforms.js';
import { Na__Schedule__SetupDragHandlers, Na__Schedule__StartInteraction, Na__Schedule__TeardownDragHandlers } from './Na__Feature__ScheduleBoard__Interactions.js';
import { Na__Utils__FormatHourLabel, Na__Utils__TimeToMinutes } from '../05__AppUtils/Na__Utils__Time.js';

// -----------------------------------------------------------------------------
// REGION | Schedule Board Renderer
// -----------------------------------------------------------------------------

 // FUNCTION | Build Schedule Board Markup and Bindings
 // ------------------------------------------------------------
 export function Na__Schedule__RenderScheduleBoard(config) {
     const { state, panelElement, setState, setWorkers, getState } = config;
     const columns = Na__Schedule__GetColumns(state);
     const allShifts = Na__Schedule__GetAllShifts(state.workers);
     const bounds = Na__Schedule__GetBounds(columns, allShifts);
     const timeLabels = Na__Schedule__GetTimeLabels(bounds);
     const gridHeight = (bounds.end - bounds.start) * Na__Schedule__PixelsPerMinute;

     panelElement.innerHTML = `
        <div class="na-schedule-root" id="naScheduleRoot">
            <div class="na-schedule-columns-header">
                <div class="na-schedule-time-axis-header"></div>
                <div class="na-schedule-columns-grid" style="grid-template-columns: repeat(${columns.length}, minmax(0, 1fr));">
                    ${columns.map((columnValue) => `
                        <div class="na-schedule-column-header">
                            <div class="na-schedule-column-title">${columnValue.title}</div>
                            <div class="na-schedule-column-subtitle">${columnValue.subtitle}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="na-schedule-grid-scroll">
                <div class="na-schedule-grid-wrap">
                    <div class="na-schedule-time-axis" style="height:${gridHeight}px;">
                        ${timeLabels.map((minuteValue) => `
                            <div class="na-schedule-time-label" style="top:${(minuteValue - bounds.start) * Na__Schedule__PixelsPerMinute}px;">
                                ${Na__Utils__FormatHourLabel(minuteValue)}
                            </div>
                        `).join('')}
                    </div>

                    <div class="na-schedule-grid-main" id="naScheduleGridMain" style="height:${gridHeight}px;">
                        <div class="na-schedule-grid-lines">
                            ${timeLabels.map((minuteValue) => `
                                <div class="na-schedule-grid-hour-line" style="top:${(minuteValue - bounds.start) * Na__Schedule__PixelsPerMinute}px;"></div>
                            `).join('')}
                        </div>
                        <div class="na-schedule-grid-columns" style="grid-template-columns: repeat(${columns.length}, minmax(0, 1fr));">
                            ${columns.map(() => '<div class="na-schedule-grid-column-line"></div>').join('')}
                        </div>
                        <div class="na-schedule-grid-cells" style="grid-template-columns: repeat(${columns.length}, minmax(0, 1fr));">
                            ${columns.map((columnValue) => `
                                <div class="na-schedule-cell" data-action="create-shift" data-column-id="${columnValue.id}">
                                    ${Na__Schedule__RenderShiftsForColumn({ columnValue, allShifts, bounds, state })}
                                </div>
                            `).join('')}
                        </div>
                        ${Na__Schedule__RenderCurrentTimeLine(state.currentTimeMins, bounds)}
                    </div>
                </div>
            </div>
        </div>
     `;

     const gridElement = panelElement.querySelector('#naScheduleGridMain');
     if (!gridElement) return;

     panelElement.querySelectorAll('[data-action="create-shift"]').forEach((cellElement) => {
         cellElement.addEventListener('mousedown', (mouseEvent) => {
             const columnId = cellElement.getAttribute('data-column-id');
             if (!columnId) return;

             Na__Schedule__StartInteraction({
                 mouseEvent,
                 actionType: 'create',
                 columnId,
                 state,
                 gridElement,
                 columns,
                 bounds,
                 setState
             });
         });
     });

     panelElement.querySelectorAll('[data-action="move-shift"]').forEach((shiftElement) => {
         shiftElement.addEventListener('click', (clickEvent) => {
             clickEvent.stopPropagation();
             const shiftId = shiftElement.getAttribute('data-shift-id');
             if (!shiftId) return;
             setState({ selectedShiftId: shiftId });
         });

         shiftElement.addEventListener('mousedown', (mouseEvent) => {
             const shiftId = shiftElement.getAttribute('data-shift-id');
             const columnId = shiftElement.getAttribute('data-column-id');
             if (!shiftId || !columnId) return;

             const sourceShift = allShifts.find((shiftValue) => shiftValue.id === shiftId);
             if (!sourceShift) return;

             Na__Schedule__StartInteraction({
                 mouseEvent,
                 actionType: 'move',
                 columnId,
                 sourceShift,
                 state,
                 gridElement,
                 columns,
                 bounds,
                 setState
             });
         });

         shiftElement.addEventListener('dblclick', (mouseEvent) => {
             mouseEvent.stopPropagation();
             const shiftId = shiftElement.getAttribute('data-shift-id');
             if (!shiftId) return;

             const sourceShift = allShifts.find((shiftValue) => shiftValue.id === shiftId);
             if (!sourceShift) return;

             const editedTitle = window.prompt('Update shift title', sourceShift.title);
             if (editedTitle === null) return;

             setWorkers((workersValue) => workersValue.map((workerValue) => ({
                 ...workerValue,
                 shifts: workerValue.shifts.map((shiftValue) => (
                     shiftValue.id === shiftId
                         ? { ...shiftValue, title: editedTitle.trim() || 'Untitled Task' }
                         : shiftValue
                 ))
             })));
         });
     });

     panelElement.querySelectorAll('[data-action="resize-shift"]').forEach((resizeElement) => {
         resizeElement.addEventListener('mousedown', (mouseEvent) => {
             mouseEvent.stopPropagation();
             const shiftId = resizeElement.getAttribute('data-shift-id');
             const columnId = resizeElement.getAttribute('data-column-id');
             if (!shiftId || !columnId) return;

             const sourceShift = allShifts.find((shiftValue) => shiftValue.id === shiftId);
             if (!sourceShift) return;

             Na__Schedule__StartInteraction({
                 mouseEvent,
                 actionType: 'resize',
                 columnId,
                 sourceShift,
                 state,
                 gridElement,
                 columns,
                 bounds,
                 setState
             });
         });
     });

     panelElement.querySelectorAll('[data-action="delete-shift"]').forEach((buttonElement) => {
         buttonElement.addEventListener('click', (clickEvent) => {
             clickEvent.stopPropagation();
             const shiftId = buttonElement.getAttribute('data-shift-id');
             if (!shiftId) return;

             setWorkers((workersValue) => workersValue.map((workerValue) => ({
                 ...workerValue,
                 shifts: workerValue.shifts.filter((shiftValue) => shiftValue.id !== shiftId)
             })));
         });
     });

     Na__Schedule__SetupDragHandlers({
        getState,
         gridElement,
         columns,
         bounds,
         setState,
         applyWorkers: setWorkers
     });
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Render Shift Cards for a Single Column
 // ------------------------------------------------------------
 function Na__Schedule__RenderShiftsForColumn(config) {
     const { columnValue, allShifts, bounds, state } = config;
     const columnShifts = allShifts.filter((shiftValue) => {
         const isDateMatch = shiftValue.date === columnValue.date;
         const isWorkerMatch = columnValue.workerId ? shiftValue.workerId === columnValue.workerId : true;
         return isDateMatch && isWorkerMatch;
     });

     const draft = state.draftShift;
     const showDraftInColumn = draft && (
         (state.viewMode === 'day' && draft.workerId === columnValue.workerId) ||
         (state.viewMode === 'week' && draft.date === columnValue.date)
     );

     const realShiftMarkup = columnShifts.map((shiftValue) => {
         if (draft && draft.id === shiftValue.id) return '';

         const startMins = Na__Utils__TimeToMinutes(shiftValue.startTime);
         const endMins = Na__Utils__TimeToMinutes(shiftValue.endTime);
         const topOffset = (startMins - bounds.start) * Na__Schedule__PixelsPerMinute;
         const heightValue = (endMins - startMins) * Na__Schedule__PixelsPerMinute;
         const isSelected = state.selectedShiftId === shiftValue.id;
         const showWorkerInfo = state.viewMode === 'week' && shiftValue.workerName;

         return `
            <div class="na-shift-card ${shiftValue.color} ${isSelected ? 'na-shift-card--selected' : ''}" style="top:${topOffset}px;height:${heightValue}px;">
                <div class="na-shift-card__main" data-action="move-shift" data-shift-id="${shiftValue.id}" data-column-id="${columnValue.id}">
                    ${showWorkerInfo ? `<span class="na-shift-card__worker">${shiftValue.workerName}</span>` : ''}
                    <div class="na-shift-card__title">${shiftValue.title}</div>
                    <div class="na-shift-card__time">${shiftValue.startTime} - ${shiftValue.endTime}</div>
                    ${isSelected ? `<button class="na-shift-card__delete" data-action="delete-shift" data-shift-id="${shiftValue.id}">X</button>` : ''}
                </div>
                <div class="na-shift-card__resize" data-action="resize-shift" data-shift-id="${shiftValue.id}" data-column-id="${columnValue.id}">:::</div>
            </div>
         `;
     }).join('');

     if (!showDraftInColumn) {
         return realShiftMarkup;
     }

     const draftStartMins = Na__Utils__TimeToMinutes(draft.startTime);
     const draftEndMins = Na__Utils__TimeToMinutes(draft.endTime);
     const draftTopOffset = (draftStartMins - bounds.start) * Na__Schedule__PixelsPerMinute;
     const draftHeight = (draftEndMins - draftStartMins) * Na__Schedule__PixelsPerMinute;
     const draftWorkerMarkup = state.viewMode === 'week' ? '<span class="na-shift-card__worker">Draft Shift</span>' : '';

     return `
        ${realShiftMarkup}
        <div class="na-shift-card ${draft.color} na-shift-card--draft" style="top:${draftTopOffset}px;height:${draftHeight}px;">
            <div class="na-shift-card__main">
                ${draftWorkerMarkup}
                <div class="na-shift-card__title">${draft.title}</div>
                <div class="na-shift-card__time">${draft.startTime} - ${draft.endTime}</div>
            </div>
            <div class="na-shift-card__resize">:::</div>
        </div>
     `;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Render Current Time Indicator
 // ------------------------------------------------------------
 function Na__Schedule__RenderCurrentTimeLine(currentTimeMins, bounds) {
     if (currentTimeMins < bounds.start || currentTimeMins > bounds.end) {
         return '';
     }

     const topOffset = (currentTimeMins - bounds.start) * Na__Schedule__PixelsPerMinute;
     return `<div class="na-current-time-line" style="top:${topOffset}px;"></div>`;
 }
 // ------------------------------------------------------------


 // FUNCTION | Cleanup Schedule Feature
 // ------------------------------------------------------------
 export function Na__Schedule__DestroyScheduleBoard() {
     Na__Schedule__TeardownDragHandlers();
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
