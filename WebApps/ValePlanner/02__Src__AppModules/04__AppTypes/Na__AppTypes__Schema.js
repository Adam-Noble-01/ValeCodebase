// -----------------------------------------------------------------------------
// REGION | JSDoc Type Schemas
// -----------------------------------------------------------------------------

/**
 * @typedef {Object} Na__Shift
 * @property {string} id
 * @property {string} date
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} title
 * @property {string} color
 */

/**
 * @typedef {Object} Na__Worker
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} avatar
 * @property {Na__Shift[]} shifts
 */

/**
 * @typedef {'schedule' | 'analytics' | 'timecard'} Na__MainTab
 */

/**
 * @typedef {'day' | 'week'} Na__ViewMode
 */

/**
 * @typedef {Object} Na__PlannerState
 * @property {Na__Worker[]} workers
 * @property {Na__Worker[]} defaultWorkers
 * @property {Na__MainTab} mainTab
 * @property {Na__ViewMode} viewMode
 * @property {string} currentDate
 * @property {?string} selectedShiftId
 * @property {?Object} draftShift
 * @property {?Object} pendingDrag
 * @property {number} dragOffsetMins
 * @property {number} currentTimeMins
 */

// endregion ----------------------------------------------------

export {};
