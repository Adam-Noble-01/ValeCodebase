import { Na__Schedule__GridPaddingPx, Na__Schedule__PixelsPerMinute } from './Na__Feature__ScheduleBoard__Constants.js';
import { Na__Schedule__GetAllShifts, Na__Schedule__GetBounds, Na__Schedule__GetColumns, Na__Schedule__GetTimeLabels } from './Na__Feature__ScheduleBoard__DataTransforms.js';
import { Na__Schedule__SetupDragHandlers, Na__Schedule__StartInteraction, Na__Schedule__TeardownDragHandlers } from './Na__Feature__ScheduleBoard__Interactions.js';
import { Na__Utils__FormatHourLabel, Na__Utils__TimeToMinutes } from '../05__AppUtils/Na__Utils__Time.js';


// -----------------------------------------------------------------------------
// REGION | Colour Mapping - Shift Colour Class Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Map Prompt Number to Shift Colour Class
    // ------------------------------------------------------------
    function Na__Schedule__MapPromptNumberToColourClass(colorPromptValue) {
        const colourMap = {
            1: 'na-shift-color-blue',
            2: 'na-shift-color-emerald',
            3: 'na-shift-color-amber',
            4: 'na-shift-color-purple',
            5: 'na-shift-color-rose',
            6: 'na-shift-color-cyan',
            7: 'na-shift-color-lime',
            8: 'na-shift-color-orange',
            9: 'na-shift-color-indigo',
            10: 'na-shift-color-slate'
        };
        return colourMap[colorPromptValue] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Map Shift Colour Class to Prompt Number
    // ------------------------------------------------------------
    function Na__Schedule__MapColourClassToPromptNumber(colourClassValue) {
        const promptMap = {
            'na-shift-color-blue':    '1',
            'na-shift-color-emerald': '2',
            'na-shift-color-amber':   '3',
            'na-shift-color-purple':  '4',
            'na-shift-color-rose':    '5',
            'na-shift-color-cyan':    '6',
            'na-shift-color-lime':    '7',
            'na-shift-color-orange':  '8',
            'na-shift-color-indigo':  '9',
            'na-shift-color-slate':   '10'
        };
        return promptMap[colourClassValue] || '1';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | HTML Templates - Grid and Shift Card Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Render Current Time Indicator
    // ------------------------------------------------------------
    function Na__Schedule__RenderCurrentTimeLine(currentTimeMins, bounds, pad) {
        if (currentTimeMins < bounds.start || currentTimeMins > bounds.end) {
            return '';
        }
        const topOffset = (currentTimeMins - bounds.start) * Na__Schedule__PixelsPerMinute + pad; // <-- offset by top padding
        return `<div class="na-current-time-line" style="top:${topOffset}px;"></div>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Shift Cards for a Single Column
    // ------------------------------------------------------------
    function Na__Schedule__RenderShiftsForColumn(config) {
        const { columnValue, allShifts, bounds, state, pad } = config;
        const columnShifts = allShifts.filter((shiftValue) => {
            const isDateMatch   = shiftValue.date === columnValue.date;
            const isWorkerMatch = columnValue.workerId ? shiftValue.workerId === columnValue.workerId : true;
            return isDateMatch && isWorkerMatch;
        });

        const draft             = state.draftShift;
        const showDraftInColumn = draft && (
            (state.viewMode === 'day'  && draft.workerId === columnValue.workerId) ||
            (state.viewMode === 'week' && draft.date === columnValue.date)
        );

        const realShiftMarkup = columnShifts.map((shiftValue) => {
            if (draft && draft.id === shiftValue.id) return '';

            const startMins      = Na__Utils__TimeToMinutes(shiftValue.startTime);
            const endMins        = Na__Utils__TimeToMinutes(shiftValue.endTime);
            const topOffset      = (startMins - bounds.start) * Na__Schedule__PixelsPerMinute + pad; // <-- offset by top padding
            const heightValue    = (endMins - startMins) * Na__Schedule__PixelsPerMinute;
            const isSelected     = state.selectedShiftId === shiftValue.id;
            const showWorkerInfo = state.viewMode === 'week' && shiftValue.workerName;

            return `
                <div class="na-shift-card ${shiftValue.color} ${isSelected ? 'na-shift-card--selected' : ''}" style="top:${topOffset}px;height:${heightValue}px;">
                    <div class="na-shift-card__main" data-action="move-shift" data-shift-id="${shiftValue.id}" data-column-id="${columnValue.id}">
                        <div class="na-shift-card__edit-target" data-action="edit-shift-meta" data-shift-id="${shiftValue.id}" title="Double-click to edit task and color">Edit</div>
                        ${showWorkerInfo ? `<span class="na-shift-card__worker">${shiftValue.workerName}</span>` : ''}
                        <div class="na-shift-card__title">${shiftValue.title}</div>
                        <div class="na-shift-card__time">${shiftValue.startTime} - ${shiftValue.endTime}</div>
                        <button class="na-shift-card__delete" data-action="delete-shift" data-shift-id="${shiftValue.id}" title="Delete shift">X</button>
                    </div>
                    <div class="na-shift-card__resize" data-action="resize-shift" data-shift-id="${shiftValue.id}" data-column-id="${columnValue.id}">:::</div>
                </div>
            `;
        }).join('');

        if (!showDraftInColumn) {
            return realShiftMarkup;
        }

        const draftStartMins    = Na__Utils__TimeToMinutes(draft.startTime);
        const draftEndMins      = Na__Utils__TimeToMinutes(draft.endTime);
        const draftTopOffset    = (draftStartMins - bounds.start) * Na__Schedule__PixelsPerMinute + pad; // <-- offset by top padding
        const draftHeight       = (draftEndMins - draftStartMins) * Na__Schedule__PixelsPerMinute;
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shift Action Handlers - Delete and Edit
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Handle Shift Delete Request
    // ------------------------------------------------------------
    function Na__Schedule__HandleShiftDeleteRequest(config) {
        const { mouseEvent, phase, shiftId, setWorkers, state, setState } = config;

        if (mouseEvent) {
            mouseEvent.stopPropagation();
            mouseEvent.preventDefault();
        }

        if (phase === 'mousedown') return;
        if (!shiftId || !setWorkers) return;

        setWorkers((workersValue) => workersValue.map((workerValue) => ({
            ...workerValue,
            shifts: workerValue.shifts.filter((shiftValue) => shiftValue.id !== shiftId)
        })));

        if (state && state.selectedShiftId === shiftId && setState) {
            setState({ selectedShiftId: null });
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Shift Meta Edit Request
    // ------------------------------------------------------------
    function Na__Schedule__HandleShiftMetaEditRequest(config) {
        const { mouseEvent, shiftId, allShifts, setWorkers } = config;

        mouseEvent.stopPropagation();
        mouseEvent.preventDefault();

        if (!shiftId) return;

        const sourceShift = allShifts.find((shiftValue) => shiftValue.id === shiftId);
        if (!sourceShift) return;

        const editedTitle = window.prompt('Update shift title', sourceShift.title);
        if (editedTitle === null) return;

        const colorPrompt = [
            'Update shift color class',
            'Options:',
            '1 = blue',
            '2 = emerald',
            '3 = amber',
            '4 = purple',
            '5 = rose',
            '6 = cyan',
            '7 = lime',
            '8 = orange',
            '9 = indigo',
            '10 = slate'
        ].join('\n');
        const colorInput = window.prompt(colorPrompt, Na__Schedule__MapColourClassToPromptNumber(sourceShift.color));
        if (colorInput === null) return;

        const mappedColourClass = Na__Schedule__MapPromptNumberToColourClass(colorInput.trim());

        setWorkers((workersValue) => workersValue.map((workerValue) => ({
            ...workerValue,
            shifts: workerValue.shifts.map((shiftValue) => (
                shiftValue.id === shiftId
                    ? {
                        ...shiftValue,
                        title: editedTitle.trim() || 'Untitled Task',
                        color: mappedColourClass || shiftValue.color
                    }
                    : shiftValue
            ))
        })));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Schedule Board - Render, Bind Events and Destroy
// -----------------------------------------------------------------------------

    // FUNCTION | Build Schedule Board Markup and Bindings
    // ------------------------------------------------------------
    export function Na__Schedule__RenderScheduleBoard(config) {
        const { state, panelElement, setState, setWorkers, getState } = config;
        const columns    = Na__Schedule__GetColumns(state);
        const allShifts  = Na__Schedule__GetAllShifts(state.workers);
        const bounds     = Na__Schedule__GetBounds(columns, allShifts);
        const timeLabels = Na__Schedule__GetTimeLabels(bounds);
        const pad        = Na__Schedule__GridPaddingPx;                                          // <-- breathing room at top and bottom
        const gridHeight = (bounds.end - bounds.start) * Na__Schedule__PixelsPerMinute + pad * 2; // <-- expanded to include padding

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
                                <div class="na-schedule-time-label" style="top:${(minuteValue - bounds.start) * Na__Schedule__PixelsPerMinute + pad}px;">
                                    ${Na__Utils__FormatHourLabel(minuteValue)}
                                </div>
                            `).join('')}
                        </div>

                        <div class="na-schedule-grid-main" id="naScheduleGridMain" style="height:${gridHeight}px;">
                            <div class="na-schedule-grid-lines">
                                ${timeLabels.map((minuteValue) => `
                                    <div class="na-schedule-grid-hour-line" style="top:${(minuteValue - bounds.start) * Na__Schedule__PixelsPerMinute + pad}px;"></div>
                                `).join('')}
                            </div>
                            <div class="na-schedule-grid-columns" style="grid-template-columns: repeat(${columns.length}, minmax(0, 1fr));">
                                ${columns.map(() => '<div class="na-schedule-grid-column-line"></div>').join('')}
                            </div>
                            <div class="na-schedule-grid-cells" style="grid-template-columns: repeat(${columns.length}, minmax(0, 1fr));">
                                ${columns.map((columnValue) => `
                                    <div class="na-schedule-cell" data-action="create-shift" data-column-id="${columnValue.id}">
                                        ${Na__Schedule__RenderShiftsForColumn({ columnValue, allShifts, bounds, state, pad })}
                                    </div>
                                `).join('')}
                            </div>
                            ${Na__Schedule__RenderCurrentTimeLine(state.currentTimeMins, bounds, pad)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const gridElement = panelElement.querySelector('#naScheduleGridMain');
        if (!gridElement) return;

        panelElement.querySelectorAll('[data-action="create-shift"]').forEach((cellElement) => {
            cellElement.addEventListener('mousedown', (mouseEvent) => {
                const targetElement = mouseEvent.target instanceof Element ? mouseEvent.target : null;
                if (targetElement && targetElement.closest('.na-shift-card')) return;

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
                const shiftId  = shiftElement.getAttribute('data-shift-id');
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
                const shiftId = shiftElement.getAttribute('data-shift-id');
                Na__Schedule__HandleShiftMetaEditRequest({
                    mouseEvent,
                    shiftId,
                    allShifts,
                    setWorkers
                });
            });
        });

        panelElement.querySelectorAll('[data-action="edit-shift-meta"]').forEach((editElement) => {
            editElement.addEventListener('mousedown', (mouseEvent) => {
                mouseEvent.stopPropagation();
                mouseEvent.preventDefault();
            });

            editElement.addEventListener('dblclick', (mouseEvent) => {
                const shiftId = editElement.getAttribute('data-shift-id');
                Na__Schedule__HandleShiftMetaEditRequest({
                    mouseEvent,
                    shiftId,
                    allShifts,
                    setWorkers
                });
            });
        });

        panelElement.querySelectorAll('[data-action="resize-shift"]').forEach((resizeElement) => {
            resizeElement.addEventListener('mousedown', (mouseEvent) => {
                mouseEvent.stopPropagation();
                const shiftId  = resizeElement.getAttribute('data-shift-id');
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
            buttonElement.addEventListener('mousedown', (mouseEvent) => {
                Na__Schedule__HandleShiftDeleteRequest({
                    mouseEvent,
                    phase: 'mousedown'
                });
            });

            buttonElement.addEventListener('click', (clickEvent) => {
                const shiftId = buttonElement.getAttribute('data-shift-id');
                Na__Schedule__HandleShiftDeleteRequest({
                    mouseEvent: clickEvent,
                    phase:      'click',
                    shiftId,
                    setWorkers,
                    state,
                    setState
                });
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


    // FUNCTION | Cleanup Schedule Feature
    // ------------------------------------------------------------
    export function Na__Schedule__DestroyScheduleBoard() {
        Na__Schedule__TeardownDragHandlers();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
