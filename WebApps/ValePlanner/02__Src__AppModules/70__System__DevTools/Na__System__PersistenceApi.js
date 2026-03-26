import { Na__System__IsRunningOnLocalhost } from './Na__System__DevTools__LocalhostGuard.js';

// -----------------------------------------------------------------------------
// REGION | Localhost Persistence API Client
// -----------------------------------------------------------------------------

const Na__Persistence__WorkersApiPath = 'api/data/workers';
const Na__Persistence__TimecardApiPath = 'api/data/timecard';

// FUNCTION | Load Workers Data From Localhost API
// ------------------------------------------------------------
export async function Na__Persistence__LoadWorkersAsync() {
    const payload = await Na__Persistence__FetchDataAsync(Na__Persistence__WorkersApiPath);
    if (!payload || !Array.isArray(payload.workers)) return null;
    return payload.workers;
}
// ------------------------------------------------------------


// FUNCTION | Save Workers Data To Localhost API
// ------------------------------------------------------------
export async function Na__Persistence__SaveWorkersAsync(workersValue) {
    if (!Array.isArray(workersValue)) return false;
    return Na__Persistence__PutDataAsync(Na__Persistence__WorkersApiPath, { workers: workersValue });
}
// ------------------------------------------------------------


// FUNCTION | Load Timecard Data From Localhost API
// ------------------------------------------------------------
export async function Na__Persistence__LoadTimecardAsync() {
    const payload = await Na__Persistence__FetchDataAsync(Na__Persistence__TimecardApiPath);
    return payload && typeof payload === 'object' ? payload : null;
}
// ------------------------------------------------------------


// FUNCTION | Save Timecard Data To Localhost API
// ------------------------------------------------------------
export async function Na__Persistence__SaveTimecardAsync(timecardValue) {
    if (!timecardValue || typeof timecardValue !== 'object') return false;
    return Na__Persistence__PutDataAsync(Na__Persistence__TimecardApiPath, timecardValue);
}
// ------------------------------------------------------------


// HELPER FUNCTION | Fetch JSON Payload From API Endpoint
// ------------------------------------------------------------
async function Na__Persistence__FetchDataAsync(urlPath) {
    if (!Na__System__IsRunningOnLocalhost()) return null;

    try {
        const responseValue = await fetch(urlPath, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (!responseValue.ok) return null;
        const bodyValue = await responseValue.json();
        if (!bodyValue?.ok) return null;
        return bodyValue.data || null;
    } catch (errorValue) {
        console.warn('ValePlanner persistence load failed:', errorValue);
        return null;
    }
}
// ------------------------------------------------------------


// HELPER FUNCTION | Send JSON Payload To API Endpoint
// ------------------------------------------------------------
async function Na__Persistence__PutDataAsync(urlPath, payload) {
    if (!Na__System__IsRunningOnLocalhost()) return false;

    try {
        const responseValue = await fetch(urlPath, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!responseValue.ok) return false;
        const bodyValue = await responseValue.json();
        return Boolean(bodyValue?.ok);
    } catch (errorValue) {
        console.warn('ValePlanner persistence save failed:', errorValue);
        return false;
    }
}
// ------------------------------------------------------------

// endregion ----------------------------------------------------
