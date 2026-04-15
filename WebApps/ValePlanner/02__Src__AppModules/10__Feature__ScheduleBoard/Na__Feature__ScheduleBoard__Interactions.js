import { Na__Schedule__PixelsPerMinute, Na__Schedule__SnapMinutes, Na__Schedule__ShiftColourClasses } from './Na__Feature__ScheduleBoard__Constants.js';
import { Na__Utils__MinutesToTime, Na__Utils__SnapMinutes, Na__Utils__TimeToMinutes } from '../05__AppUtils/Na__Utils__Time.js';

// -----------------------------------------------------------------------------
// REGION | Schedule Board Interaction Logic
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Module State and Helper Utilities
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Drag Listener Cleanup Handle
 // ------------------------------------------------------------
 let Na__Schedule__DragListenerCleanup = null;
 // ------------------------------------------------------------


 // HELPER FUNCTION | Get Random Shift Colour Class
 // ------------------------------------------------------------
 function Na__Schedule__GetRandomShiftColourClass() {
     const randomIndex = Math.floor(Math.random() * Na__Schedule__ShiftColourClasses.length);
     return Na__Schedule__ShiftColourClasses[randomIndex];
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interaction Entry Points
// -----------------------------------------------------------------------------


 // FUNCTION | Start Shift Interaction
 // ------------------------------------------------------------
 export function Na__Schedule__StartInteraction(config) {
     const {
         mouseEvent,
         actionType,
         columnId,
         sourceShift,
         state,
         gridElement,
         columns,
         bounds,
         setState
     } = config;

     mouseEvent.stopPropagation();
     if (mouseEvent.button !== 0) return;

     const gridRect = gridElement.getBoundingClientRect();
     const yPosition = mouseEvent.clientY - gridRect.top;
     const hoveredMinutes = bounds.start + (yPosition / Na__Schedule__PixelsPerMinute);
     const snappedMinutes = Na__Utils__SnapMinutes(hoveredMinutes, Na__Schedule__SnapMinutes);
     const selectedColumn = columns.find((columnValue) => columnValue.id === columnId);

     if (!selectedColumn) return;

     if (actionType === 'create') {
         const assignedWorkerId = selectedColumn.workerId || (state.workers[0] ? state.workers[0].id : '');
         if (!assignedWorkerId) return;

         setState({
             selectedShiftId: null,
             dragOffsetMins: 0,
             draftShift: {
                 id: `new-${Date.now()}`,
                 workerId: assignedWorkerId,
                 date: selectedColumn.date,
                 startTime: Na__Utils__MinutesToTime(snappedMinutes),
                 endTime: Na__Utils__MinutesToTime(Math.min(bounds.end, snappedMinutes + 60)),
                 title: 'New Shift',
                 color: Na__Schedule__GetRandomShiftColourClass(),
                 action: 'create'
             }
         });
         return;
     }

     if (!sourceShift) return;

    if (actionType === 'resize') {
        setState({
            selectedShiftId: sourceShift.id,
            pendingDrag: null,
            draftShift: { ...sourceShift, action: 'resize' }
        });
        return;
    }

    setState({
        pendingDrag: {
            action: actionType,
            columnId,
            shift: sourceShift,
            startX: mouseEvent.clientX,
            startY: mouseEvent.clientY,
            mins: hoveredMinutes
        }
    });
 }
 // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drag Lifecycle Handler Wiring
// -----------------------------------------------------------------------------

 // FUNCTION | Setup Drag Handlers
 // ------------------------------------------------------------
 export function Na__Schedule__SetupDragHandlers(config) {
     if (Na__Schedule__DragListenerCleanup) {
         Na__Schedule__DragListenerCleanup();
         Na__Schedule__DragListenerCleanup = null;
     }

    const {
        getState,
        gridElement,
        columns,
        bounds,
        setState,
        applyWorkers
    } = config;

    const state = getState();

     if (!state.draftShift && !state.pendingDrag) return;

     const handleMouseMove = (moveEvent) => {
        const nextState = { ...getState() };

         if (nextState.pendingDrag) {
            const dragActivationPx = nextState.pendingDrag.action === 'resize' ? 0 : 3;
            const hasMovedEnough =
                Math.abs(moveEvent.clientX - nextState.pendingDrag.startX) > dragActivationPx ||
                Math.abs(moveEvent.clientY - nextState.pendingDrag.startY) > dragActivationPx;

             if (!hasMovedEnough) return;

             const dragShift = nextState.pendingDrag.shift;
             nextState.selectedShiftId = dragShift.id;
             nextState.draftShift = { ...dragShift, action: nextState.pendingDrag.action };
             if (nextState.pendingDrag.action === 'move') {
                 nextState.dragOffsetMins = nextState.pendingDrag.mins - Na__Utils__TimeToMinutes(dragShift.startTime);
             }
             nextState.pendingDrag = null;
             setState(nextState);
             return;
         }

         if (!nextState.draftShift) return;

         const gridRect = gridElement.getBoundingClientRect();
         const xPosition = moveEvent.clientX - gridRect.left;
         const yPosition = moveEvent.clientY - gridRect.top;
         const columnWidth = gridRect.width / columns.length;
         const columnIndex = Math.max(0, Math.min(columns.length - 1, Math.floor(xPosition / columnWidth)));
         const hoveredColumn = columns[columnIndex];
         const hoveredMinutes = bounds.start + (yPosition / Na__Schedule__PixelsPerMinute);

        if (nextState.draftShift.action === 'create') {
            const snappedMinutes = Na__Utils__SnapMinutes(hoveredMinutes, Na__Schedule__SnapMinutes);
            const startMins = Na__Utils__TimeToMinutes(nextState.draftShift.startTime);
            const endMins = Math.max(startMins + 15, Math.min(1260, snappedMinutes)); // <-- clamp to 9pm absolute ceiling

            nextState.draftShift = {
                ...nextState.draftShift,
                date: hoveredColumn.date,
                workerId: hoveredColumn.workerId || nextState.draftShift.workerId,
                endTime: Na__Utils__MinutesToTime(endMins)
            };
        } else if (nextState.draftShift.action === 'move') {
            let startMins = Na__Utils__SnapMinutes(hoveredMinutes - nextState.dragOffsetMins, Na__Schedule__SnapMinutes);
            const duration = Na__Utils__TimeToMinutes(nextState.draftShift.endTime) - Na__Utils__TimeToMinutes(nextState.draftShift.startTime);
            startMins = Math.max(420, Math.min(startMins, 1260 - duration)); // <-- clamp to 7am floor / 9pm ceiling

            nextState.draftShift = {
                ...nextState.draftShift,
                date: hoveredColumn.date,
                workerId: hoveredColumn.workerId || nextState.draftShift.workerId,
                startTime: Na__Utils__MinutesToTime(startMins),
                endTime: Na__Utils__MinutesToTime(startMins + duration)
            };
        } else if (nextState.draftShift.action === 'resize') {
            const snappedMinutes = Na__Utils__SnapMinutes(hoveredMinutes, Na__Schedule__SnapMinutes);
            const startMins = Na__Utils__TimeToMinutes(nextState.draftShift.startTime);
            const endMins = Math.max(startMins + 15, Math.min(1260, snappedMinutes)); // <-- clamp to 9pm absolute ceiling
            nextState.draftShift = {
                ...nextState.draftShift,
                endTime: Na__Utils__MinutesToTime(endMins)
            };
        }

         setState(nextState);
     };

     const handleMouseUp = () => {
        const finalState = { ...getState() };

         if (finalState.pendingDrag) {
             finalState.selectedShiftId = finalState.pendingDrag.shift.id;
             finalState.pendingDrag = null;
             setState(finalState);
             return;
         }

         if (!finalState.draftShift) return;

         const draftShift = finalState.draftShift;

         applyWorkers((workersValue) => {
             const nextWorkers = workersValue.map((workerValue) => ({ ...workerValue, shifts: [...workerValue.shifts] }));

             if (draftShift.action === 'create') {
                 const targetWorker = nextWorkers.find((workerValue) => workerValue.id === draftShift.workerId);
                 if (targetWorker) {
                     targetWorker.shifts.push({
                         id: draftShift.id,
                         date: draftShift.date,
                         startTime: draftShift.startTime,
                         endTime: draftShift.endTime,
                         title: draftShift.title,
                         color: draftShift.color
                     });
                 }
             } else {
                 nextWorkers.forEach((workerValue) => {
                     workerValue.shifts = workerValue.shifts.filter((shiftValue) => shiftValue.id !== draftShift.id);
                 });
                 const targetWorker = nextWorkers.find((workerValue) => workerValue.id === draftShift.workerId);
                 if (targetWorker) {
                     targetWorker.shifts.push({
                         id: draftShift.id,
                         date: draftShift.date,
                         startTime: draftShift.startTime,
                         endTime: draftShift.endTime,
                         title: draftShift.title,
                         color: draftShift.color
                     });
                 }
             }

             return nextWorkers;
         });

        setState({
            draftShift: null,
            pendingDrag: null,
            dragOffsetMins: 0
        });
     };

     window.addEventListener('mousemove', handleMouseMove);
     window.addEventListener('mouseup', handleMouseUp);

     Na__Schedule__DragListenerCleanup = function Na__Schedule__CleanupListeners() {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
     };
 }
 // ------------------------------------------------------------


 // FUNCTION | Teardown Drag Handlers
 // ------------------------------------------------------------
 export function Na__Schedule__TeardownDragHandlers() {
     if (Na__Schedule__DragListenerCleanup) {
         Na__Schedule__DragListenerCleanup();
         Na__Schedule__DragListenerCleanup = null;
     }
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------

// endregion ----------------------------------------------------
