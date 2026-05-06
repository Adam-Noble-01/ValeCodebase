// Na__Measurement__StoreModel
// In-memory store of measurements with subscribe/notify so the UI can stay in
// sync without us pulling in a framework.
//
// Each record:
//   {
//     id:                 string,            // generated
//     pointA:             { x, y },          // image pixels
//     pointB:             { x, y },
//     depthA:             number,            // metres
//     depthB:             number,
//     worldA:             { x, y, z },
//     worldB:             { x, y, z },
//     distanceMeters:     number,
//     deltaMeters:        { dx, dy, dz, horizontal, vertical },
//     intrinsicsSource:   'MODEL'|'EXIF'|'MANUAL'|'CALIBRATION'|'DEFAULT',
//     focalPx:            number,
//     modelId:            string,            // active model when measured
//     createdAt:          number             // ms epoch
//   }

const Na__Measurement__StoreState = {
    items:       [],
    listeners:   new Set(),
    nextNumeric: 1
};

export function Na__Measurement__StoreSubscribe(listener) {
    Na__Measurement__StoreState.listeners.add(listener);
    listener([...Na__Measurement__StoreState.items]);
    return () => Na__Measurement__StoreState.listeners.delete(listener);
}

function Na__Measurement__StoreNotify() {
    const snapshot = [...Na__Measurement__StoreState.items];
    for (const listener of Na__Measurement__StoreState.listeners) {
        try { listener(snapshot); } catch (err) { console.error('[Na__Measurement__Store] listener error', err); }
    }
}

export function Na__Measurement__StoreAdd(record) {
    const id = `m_${Date.now().toString(36)}_${Na__Measurement__StoreState.nextNumeric++}`;
    Na__Measurement__StoreState.items.push({ ...record, id });
    Na__Measurement__StoreNotify();
    return id;
}

export function Na__Measurement__StoreRemove(id) {
    const before = Na__Measurement__StoreState.items.length;
    Na__Measurement__StoreState.items = Na__Measurement__StoreState.items.filter(r => r.id !== id);
    if (Na__Measurement__StoreState.items.length !== before) Na__Measurement__StoreNotify();
}

export function Na__Measurement__StoreClear() {
    if (Na__Measurement__StoreState.items.length === 0) return;
    Na__Measurement__StoreState.items = [];
    Na__Measurement__StoreNotify();
}

export function Na__Measurement__StoreGetAll() {
    return [...Na__Measurement__StoreState.items];
}
