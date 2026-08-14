// =============================================================================
// VALEVISION3D - VIDEO STUDIO - WAYPOINT EDIT UNDO HISTORY
// =============================================================================
//
// FILE       : Na__VideoStudio__Edit__UndoHistory.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Waypoint Edit Undo History
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Undo and redo for waypoint moves and rotations, so fine tuning
//              a camera path is forgiving rather than one-way
// CREATED    : 14-Aug-2026
//
// DESCRIPTION:
// - Records the camera block of a keyframe before and after each committed
//   drag, so a move or a rotation can be stepped back and forward.
// - Positioning a camera path is iterative in the way 3D modelling is: nudge,
//   look, nudge back, try the other way. Without a history every experiment is
//   permanent, which makes people reluctant to experiment at all.
// - Fifty steps deep. Older entries fall off the bottom.
//
// WHAT IS RECORDED, AND IN WHICH OF TWO SHAPES:
// - TRANSFORM. A committed waypoint drag: position from a plain or Shift drag,
//   orientation from a Ctrl+Shift turn. Stored as that one keyframe's camera
//   block before and after, so undoing a move reverts the move and nothing
//   else. A cancelled drag (Escape) never reaches the history because nothing
//   was written.
// - STRUCTURE. A waypoint deletion. Stored as a copy of the whole keyframes
//   array before and after, because putting a keyframe back means restoring
//   its position in the running order too, not just its own record.
//
// - Timing and lens fields are not recorded. They are typed numbers sitting in
//   plain view, trivially retyped, and mixing them in would make a single undo
//   ambiguous about what it was going to put back. This is also why a drag is
//   stored surgically rather than as a whole-array snapshot: an array snapshot
//   would quietly revert any lens or travel value typed after the drag.
//
// WHY THE HISTORY IS PURGED RATHER THAN KEPT:
// - The stack refers to one path in one editing session. Once the session ends
//   or its subject changes, replaying an old entry would write into a path the
//   user is no longer looking at, which is worse than having no undo at all.
// - Purged on: the Video Studio panel closing, the active video changing, and
//   preview playback starting.
// - Adding and reordering keyframes deliberately do NOT purge. Entries are
//   keyed by keyframe id rather than by index, so neither can invalidate them,
//   and an entry whose keyframe has since been deleted is simply skipped.
//
// INTEGRATION:
// - Na__VideoStudio__Viewport__KeyframeDragger.js records an entry on commit.
// - Na__VideoStudio__DevMenu__Controls.js binds Ctrl+Z and Ctrl+Y and calls
//   Clear at each purge point.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Aug-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Video Data Layer
    // @delegate: ./Na__VideoStudio__ProjectJson__VideoData.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__ProjectJson__GetVideoById,
        Na__VideoStudio__ProjectJson__GetKeyframeById
    } from './Na__VideoStudio__ProjectJson__VideoData.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | History Depth
    // ------------------------------------------------------------
    const Na__VsUndo__MAX_ENTRIES = 50;   // <-- Steps kept before the oldest is dropped
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Two Stacks
    // ------------------------------------------------------------
    // undoStack holds committed edits oldest first. redoStack holds entries
    // popped off it, so a fresh edit after an undo discards the redo branch in
    // the usual way.
    // ------------------------------------------------------------
    let Na__VsUndo__UndoStack = [];
    let Na__VsUndo__RedoStack = [];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Snapshot Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Snapshot Everything a Viewpoint Edit Can Change
    // ------------------------------------------------------------
    // The camera block, the lens, and which mode the shot was taken in. A drag
    // only moves the camera block, but Update overwrites the whole viewpoint,
    // and an undo that put the position back while leaving a stale lens beside
    // it would be worse than no undo at all.
    //
    // Deliberately not the timing fields: those are typed numbers in plain
    // view, and reverting one the user typed after the edit would be a
    // surprise.
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__SnapshotKeyframe(keyframe) {
        const camera = keyframe && keyframe.VideoStudio__Keyframe__CameraPosition;
        if (!camera) return null;

        return {
            camera : JSON.parse(JSON.stringify(camera)),                     // <-- Plain data; structured clone is overkill
            lensMm : keyframe.VideoStudio__Keyframe__LensMm,
            mode   : keyframe.VideoStudio__Keyframe__CapturedInMode
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Deep Copy a Video's Whole Keyframes Array
    // ------------------------------------------------------------
    // Used for structural edits, where restoring means putting a record back
    // into the running order rather than editing one that is still there.
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__SnapshotKeyframes(video) {
        const keys = video && video.VideoStudio__Video__Keyframes;
        if (!Array.isArray(keys)) return null;

        return JSON.parse(JSON.stringify(keys));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Viewpoint Snapshot Back onto One Keyframe
    // ------------------------------------------------------------
    // Returns true when the keyframe was found and restored.
    // ------------------------------------------------------------
    function Na__VsUndo__RestoreTransform(videoId, keyframeId, snapshot) {
        if (!snapshot || !snapshot.camera) return false;

        const video    = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        const keyframe = Na__VideoStudio__ProjectJson__GetKeyframeById(video, keyframeId);
        if (!keyframe) return false;                                         // <-- Deleted since; the entry is dead

        keyframe.VideoStudio__Keyframe__CameraPosition = JSON.parse(JSON.stringify(snapshot.camera));

        if (Number.isFinite(snapshot.lensMm)) keyframe.VideoStudio__Keyframe__LensMm = snapshot.lensMm;
        if (snapshot.mode)                    keyframe.VideoStudio__Keyframe__CapturedInMode = snapshot.mode;

        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Replace a Video's Whole Keyframes Array
    // ------------------------------------------------------------
    // Mutates the existing array in place rather than reassigning it, so any
    // reference held elsewhere stays pointing at live data.
    // ------------------------------------------------------------
    function Na__VsUndo__RestoreStructure(videoId, snapshot) {
        if (!Array.isArray(snapshot)) return false;

        const video = Na__VideoStudio__ProjectJson__GetVideoById(videoId);
        if (!video) return false;                                            // <-- Video deleted since; the entry is dead

        if (!Array.isArray(video.VideoStudio__Video__Keyframes)) {
            video.VideoStudio__Video__Keyframes = [];
        }

        const live = video.VideoStudio__Video__Keyframes;
        live.length = 0;
        JSON.parse(JSON.stringify(snapshot)).forEach(record => live.push(record));

        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply One Side of an Entry
    // ------------------------------------------------------------
    function Na__VsUndo__Apply(entry, side) {
        if (entry.kind === 'structure') {
            return Na__VsUndo__RestoreStructure(entry.videoId, entry[side]);
        }
        return Na__VsUndo__RestoreTransform(entry.videoId, entry.keyframeId, entry[side]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Record a Committed Waypoint Transform
    // ------------------------------------------------------------
    // before and after are camera blocks taken either side of a drag. An entry
    // whose two snapshots are identical is dropped, so a click that did not
    // actually move anything does not consume an undo step.
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__Record(entry) {
        const { videoId, keyframeId, before, after, label } = entry || {};
        if (!videoId || !keyframeId || !before || !after) return;

        if (JSON.stringify(before) === JSON.stringify(after)) return;        // <-- Nothing actually changed

        Na__VsUndo__Push({
            kind : 'transform',
            videoId, keyframeId, before, after,
            label: label || 'Move'
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Record a Structural Change to the Keyframe List
    // ------------------------------------------------------------
    // before and after are whole keyframes arrays. Used for deletion, where
    // undoing means putting a record back into the running order.
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__RecordStructure(entry) {
        const { videoId, before, after, label } = entry || {};
        if (!videoId || !Array.isArray(before) || !Array.isArray(after)) return;

        if (JSON.stringify(before) === JSON.stringify(after)) return;

        Na__VsUndo__Push({
            kind : 'structure',
            videoId, before, after,
            label: label || 'Delete waypoint'
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push an Entry and Trim the Stack
    // ------------------------------------------------------------
    function Na__VsUndo__Push(entry) {
        Na__VsUndo__UndoStack.push(entry);

        if (Na__VsUndo__UndoStack.length > Na__VsUndo__MAX_ENTRIES) {
            Na__VsUndo__UndoStack.shift();                                   // <-- Drop the oldest step
        }

        Na__VsUndo__RedoStack = [];                                          // <-- A new edit ends the redo branch
    }
    // ------------------------------------------------------------


    // FUNCTION | Step Back One Edit
    // ------------------------------------------------------------
    // Returns { keyframeId, label, kind } on success, or null when there was
    // nothing to undo. Entries whose subject has since been deleted are
    // discarded and the one below is tried, so a dead entry never wastes a
    // keypress.
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__Undo() {
        while (Na__VsUndo__UndoStack.length > 0) {
            const entry = Na__VsUndo__UndoStack.pop();

            if (Na__VsUndo__Apply(entry, 'before')) {
                Na__VsUndo__RedoStack.push(entry);
                return { keyframeId: entry.keyframeId || null, label: entry.label, kind: entry.kind };
            }
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Step Forward One Edit
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__Redo() {
        while (Na__VsUndo__RedoStack.length > 0) {
            const entry = Na__VsUndo__RedoStack.pop();

            if (Na__VsUndo__Apply(entry, 'after')) {
                Na__VsUndo__UndoStack.push(entry);
                return { keyframeId: entry.keyframeId || null, label: entry.label, kind: entry.kind };
            }
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Discard the Whole History
    // ------------------------------------------------------------
    // reason is logged rather than shown; it exists so a stack that vanished
    // unexpectedly can be traced back to the boundary that cleared it.
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__Clear(reason) {
        if (Na__VsUndo__UndoStack.length === 0 && Na__VsUndo__RedoStack.length === 0) return;

        console.log(`[VideoStudio] Waypoint undo history cleared (${reason || 'unspecified'}).`);

        Na__VsUndo__UndoStack = [];
        Na__VsUndo__RedoStack = [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Report How Many Steps Are Available Each Way
    // ------------------------------------------------------------
    function Na__VideoStudio__UndoHistory__GetDepth() {
        return {
            undo : Na__VsUndo__UndoStack.length,
            redo : Na__VsUndo__RedoStack.length
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Undo History API
    // ------------------------------------------------------------
    export {
        Na__VsUndo__MAX_ENTRIES,
        Na__VideoStudio__UndoHistory__SnapshotKeyframe,
        Na__VideoStudio__UndoHistory__SnapshotKeyframes,
        Na__VideoStudio__UndoHistory__Record,
        Na__VideoStudio__UndoHistory__RecordStructure,
        Na__VideoStudio__UndoHistory__Undo,
        Na__VideoStudio__UndoHistory__Redo,
        Na__VideoStudio__UndoHistory__Clear,
        Na__VideoStudio__UndoHistory__GetDepth
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
