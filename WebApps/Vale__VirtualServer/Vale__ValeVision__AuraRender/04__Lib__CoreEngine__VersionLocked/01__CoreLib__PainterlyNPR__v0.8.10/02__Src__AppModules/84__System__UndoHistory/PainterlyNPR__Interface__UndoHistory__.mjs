/* =============================================================================
   PAINTERLYNPR - SYSTEM | UNDO HISTORY - UNDO AND REDO
   =============================================================================

   FILE       : PainterlyNPR__Interface__UndoHistory__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - UndoHistory - Interface
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Undo and redo for the whole drawing: the last 100 changes back and
                100 forward again, from Ctrl + Z and Ctrl + Y or the meta strip's
                two buttons
   CREATED    : 30-Oct-2026 (v0.7.4)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "Add a comprehensive user undo / redo caching system to
     both The NPR Demo Environment and Aura so to both apps to store 100 undos
     and 100 redos then add control +z and control + y as keyboard mappings".
     His calls: the camera is left out (Ctrl + Z never moves it, as in
     SketchUp); buttons as well as keys; kept for this visit only.
   - A STEP IS THE SETTINGS OBJECT (85's deterministic recall in one object)
     without its camera: every control, choice, preset and the seed, the art
     direction points, the placed assets and the materials given. Whatever
     goes into the settings object later is undone with nothing to add here.
     An object's point moves on the paper with the camera, so for those points
     their World stands for them and their PaperMm is left out.
   - AN EDIT IS A STEP ONCE IT HAS SETTLED: nothing changed for SettleMs and no
     pointer button held (TypingSettleMs in a text box, or when the box is
     left), so a drag or a run of typing is one step. Clicks, keys, inputs and
     pointer releases ask for a look; a quiet look every CheckMs finds the rest
     (a save that loaded after its click). A change before the first key or
     pointer press is the drawing booting: taken into the starting point.
   - UNDO PUTS THE STEP BACK THROUGH ApplySettingsJson, as loading a save does,
     the camera left where it is; object points are placed again for it, and a
     selected point stays selected while it is there. What the apply makes of
     the step is the step from then on, so a restore never leaves a difference
     the next look would take for a new edit.
   - Never a step: the asset factory's stage (Factory.Running), a restore.
   - KEPT by 84's Store: whole snapshots, their repeated parts once.
   - The pattern of ValeVision 3D's Layout Editor history
     (Na__LayoutEditor__History__ 1.7.0: whole snapshots of announced changes,
     a cap, restores never recorded) and its key map's Edit__Undo, Edit__Redo
     and Edit__RedoShift.

   ============================================================================= */

import UndoConfig from './Na__UndoHistory__Config.json' with { type: 'json' };
import ControlsConfig from '../80__System__HudOverlay/Na__Interface__Controls__Config.json' with { type: 'json' };
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__ArtDirection__PlaceObjectPoints } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';
import {
    PainterlyNPR__Interface__PointById,
    PainterlyNPR__Interface__SelectPoint,
} from '../65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointControls__.mjs';
import {
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import {
    PainterlyNPR__UndoHistory__Drop,
    PainterlyNPR__UndoHistory__Keep,
    PainterlyNPR__UndoHistory__Read,
    PainterlyNPR__UndoHistory__SetChunkSize,
} from './PainterlyNPR__UndoHistory__Store__.mjs';
import {
    PainterlyNPR__Interface__ApplySettingsJson,
    PainterlyNPR__Interface__SettingsObject,
    PainterlyNPR__Interface__UpdateSettingsJson,
} from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';
import { PainterlyNPR__AssetFactory__Factory as Factory } from '../88__Export__AssetFactory/PainterlyNPR__AssetFactory__Run__.mjs';

// =============================================================================
// REGION | System - Undo History - Undo and Redo
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__UndoHistory__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ROOT     =  'PainterlyNPR__UndoHistory__Config';
    const HISTORY  =  PainterlyNPR__ConfigAccess__Section(UndoConfig, ROOT, 'History', ['MaxUndo', 'MaxRedo', 'SettleMs', 'TypingSettleMs', 'CheckMs', 'ChunkMinChars']);
    const KEYS     =  PainterlyNPR__ConfigAccess__Section(UndoConfig, ROOT, 'Keys', ['IgnoreWhenTyping', 'Bindings', 'RepeatMs']);
    const LABELS   =  PainterlyNPR__ConfigAccess__Section(UndoConfig, ROOT, 'Labels', ['Undo', 'Redo', 'NothingToUndo', 'NothingToRedo', 'Sections', 'Several',
                                                                                     'PointAdded', 'PointRemoved', 'PointChanged', 'AssetAdded', 'AssetRemoved',
                                                                                     'AssetMoved', 'AssetTurned', 'AssetResized', 'AssetSwapped', 'AssetReshaped',
                                                                                     'AssetChanged', 'Assets', 'MaterialAdded', 'MaterialRemoved', 'MaterialChanged']);
    const ICONS    =  PainterlyNPR__ConfigAccess__Section(UndoConfig, ROOT, 'Icons', ['Undo', 'Redo']);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Each Control's Label by Its State Path, and the Keys as Words
    // ------------------------------------------------------------
    const CONTROL_LABELS  =  new Map(Object.values(PainterlyNPR__ConfigAccess__Section(ControlsConfig, 'PainterlyNPR__InterfaceControls__Config', 'Controls', ['Controls']).Controls)
        .filter(spec => Array.isArray(spec.Path) && spec.Label)
        .map(spec => [spec.Path.join('.'), spec.Label]));
    const KEY_WORDS       =  Object.fromEntries(['Undo', 'Redo'].map(action => {
        const binding  =  KEYS.Bindings.find(b => b.Enabled && b.Action === action);
        return [action, binding ? [...binding.Modifiers, binding.Keys[0].toUpperCase()].join(' + ') : ''];
    }));
    const TEXT_INPUTS     =  ['text', 'search', 'number', 'email', 'url', 'tel', 'password'];
    const MODIFIER_KEYS   =  ['Control', 'Shift', 'Alt', 'AltGraph', 'Meta'];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State
// -----------------------------------------------------------------------------

    // MODULE STATE | The Steps
    // ------------------------------------------------------------
    // A step is { Id, Label }: its snapshot's name in the store, and the edit
    // that made it, so the step being undone names itself.
    const History  =  {
        Undo       :  [],                        // <-- Steps back, the oldest first
        Redo       :  [],                        // <-- Steps forward again, the next one last
        Current    :  null,                      // <-- The drawing as it stands
        Last       :  null,                      // <-- Current's snapshot as data: the next step is named by what moved from it
        Timer      :  0,                         // <-- A look is due
        Held       :  false,                     // <-- A pointer button is down: a drag is under way
        Touched    :  false,                     // <-- A key or a pointer has been pressed: until then a change is the boot's
        Restoring  :  false,
        KeyAt      :  0,                         // <-- When a key last undid or redid (RepeatMs)
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Snapshots and Their Names
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Drawing as a Step - the settings object without its camera
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Snapshot() {
        const settings  =  PainterlyNPR__Interface__SettingsObject();
        delete settings.Camera;                                                  // <-- Adam's call: Ctrl + Z never moves the camera
        for (const point of settings.ArtDirectionPoints || []) {
            if (point.Anchor === 'Object' && point.World) point.PaperMm = null;  // <-- On the paper it follows the camera: its World stands for it
        }
        return settings;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Words for a Sentence's Middle ("Mature oak" -> "mature oak")
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Lower(text) {
        return text ? text.charAt(0).toLowerCase() + text.slice(1) : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | More, Fewer or the Same - which of three names
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Count(before, after, added, removed, changed) {
        const was  =  (before || []).length, now = (after || []).length;
        return now > was ? added : (now < was ? removed : changed);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Happened to the Placed Assets - one plop placed, removed, moved ...
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__AssetName(before, after) {
        const was      =  new Map((before || []).map(a => [a.Uid, a]));
        const now      =  new Map((after || []).map(a => [a.Uid, a]));
        const added    =  [...now.values()].filter(a => !was.has(a.Uid));
        const removed  =  [...was.values()].filter(a => !now.has(a.Uid));
        const changed  =  [...now.values()].filter(a => was.has(a.Uid) && JSON.stringify(a) !== JSON.stringify(was.get(a.Uid)));
        const named    =  (template, a) => template.replace('{name}', PainterlyNPR__UndoHistory__Lower(a.Name || a.AssetId || 'asset'));
        if (added.length === 1 && !removed.length && !changed.length) return named(LABELS.AssetAdded, added[0]);
        if (removed.length === 1 && !added.length && !changed.length) return named(LABELS.AssetRemoved, removed[0]);
        if (removed.length === 1 && added.length === 1 && !changed.length) return named(LABELS.AssetSwapped, removed[0]);
        if (changed.length !== 1 || added.length || removed.length) return LABELS.Assets;
        const a  =  was.get(changed[0].Uid), b = changed[0];
        if (a.AssetId !== b.AssetId) return named(LABELS.AssetSwapped, a);
        if (JSON.stringify(a.Position) !== JSON.stringify(b.Position)) return named(LABELS.AssetMoved, b);
        if (a.RotationDeg !== b.RotationDeg) return named(LABELS.AssetTurned, b);
        if (a.Scale !== b.Scale) return named(LABELS.AssetResized, b);
        if (a.Seed !== b.Seed) return named(LABELS.AssetReshaped, b);
        return named(LABELS.AssetChanged, b);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a Step Is Called - by what moved between two snapshots
    // ------------------------------------------------------------
    // One control moved: its own label under its part of the drawing ("Wash
    // strength"). One part: that part ("Paper"). More: Several settings.
    function PainterlyNPR__UndoHistory__Name(before, after) {
        if (!before || !after) return LABELS.Several;
        if (before.Seed !== after.Seed) return LABELS.Sections.Seed;             // <-- A new seed reseeds every point with it: one change
        const same    =  (a, b) => JSON.stringify(a) === JSON.stringify(b);
        const leaves  =  [];
        const walk    =  (a, b, path) => {
            if (same(a, b)) return;
            const objects  =  a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b);
            if (!objects) { leaves.push(path); return; }
            for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], [...path, key]);
        };
        const styles  =  [before.Style || {}, after.Style || {}];
        for (const key of new Set([...Object.keys(styles[0]), ...Object.keys(styles[1])])) walk(styles[0][key], styles[1][key], [key]);   // <-- The Style keys are State's own: Pen, Wash, Discipline ...
        for (const key of ['Sun', 'Paper', 'Composition']) walk(before[key], after[key], [key]);
        const parts  =  new Set(leaves.map(path => path[0]));
        if (!same(before.ArtDirectionPoints, after.ArtDirectionPoints)) parts.add('Points');
        if (!same(before.Assets, after.Assets)) parts.add('Assets');
        if (!same(before.Materials, after.Materials)) parts.add('Materials');
        const preset  =  parts.has('PenPreset') && styles[1].PenPreset !== 'Custom';
        if (parts.size > 1) parts.delete('PenPreset');                           // <-- A pen slider or the ink marks the preset Custom as it goes
        if (parts.size !== 1) return LABELS.Several;
        const [part]  =  parts;
        if (part === 'Points') return PainterlyNPR__UndoHistory__Count(before.ArtDirectionPoints, after.ArtDirectionPoints, LABELS.PointAdded, LABELS.PointRemoved, LABELS.PointChanged);
        if (part === 'Assets') return PainterlyNPR__UndoHistory__AssetName(before.Assets, after.Assets);
        if (part === 'Materials') return PainterlyNPR__UndoHistory__Count(before.Materials, after.Materials, LABELS.MaterialAdded, LABELS.MaterialRemoved, LABELS.MaterialChanged);
        if (part === 'Pen' && preset) return LABELS.Sections.PenPreset;
        const section  =  LABELS.Sections[part] || part;
        const named    =  [...new Set(leaves.filter(path => path[0] === part).map(path => CONTROL_LABELS.get(path.join('.')) || ''))];
        if (named.length !== 1 || !named[0]) return section;
        return named[0].toLowerCase().startsWith(section.toLowerCase()) ? named[0] : `${section} ${PainterlyNPR__UndoHistory__Lower(named[0])}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Recording
// -----------------------------------------------------------------------------

    // FUNCTION | Take the Drawing as a Step if It Moved - true when it did
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Commit() {
        clearTimeout(History.Timer);
        History.Timer  =  0;
        if (!History.Current || History.Restoring || Factory.Running) return false;
        const id  =  PainterlyNPR__UndoHistory__Keep(PainterlyNPR__UndoHistory__Snapshot());
        if (id === History.Current.Id) { PainterlyNPR__UndoHistory__Drop(id); return false; }   // <-- Looked: nothing moved
        const next  =  PainterlyNPR__UndoHistory__Read(id);
        if (!History.Touched) {                                                  // <-- Booting, or settling after a restore: part of the drawing as it stands, never a step
            PainterlyNPR__UndoHistory__Drop(History.Current.Id);
            History.Current.Id  =  id;
            History.Last        =  next;
            return false;
        }
        History.Undo.push(History.Current);
        while (History.Undo.length > HISTORY.MaxUndo) PainterlyNPR__UndoHistory__Drop(History.Undo.shift().Id);   // <-- The 101st step: the oldest goes
        for (const step of History.Redo) PainterlyNPR__UndoHistory__Drop(step.Id);
        History.Redo.length  =  0;                                               // <-- A new edit after an undo: the steps forward are gone, as everywhere
        History.Current  =  { Id: id, Label: PainterlyNPR__UndoHistory__Name(History.Last, next) };
        History.Last     =  next;
        PainterlyNPR__UndoHistory__Render(null);
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Look Again Once the Edit Has Settled
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Soon(ms) {
        clearTimeout(History.Timer);
        History.Timer  =  setTimeout(() => {
            History.Timer  =  0;
            if (!History.Held) PainterlyNPR__UndoHistory__Commit();              // <-- Mid-drag: the release asks again
        }, ms);
    }

    function PainterlyNPR__UndoHistory__Look() {
        PainterlyNPR__UndoHistory__Soon(PainterlyNPR__UndoHistory__Typing() ? HISTORY.TypingSettleMs : HISTORY.SettleMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Has a Text Box the Keyboard? (then its own undo works on its words)
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Typing() {
        const focus  =  document.activeElement;
        if (!focus) return false;
        if (focus.isContentEditable || focus.tagName === 'TEXTAREA') return true;
        return focus.tagName === 'INPUT' && TEXT_INPUTS.includes(focus.type);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Undo and Redo
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Put the Current Step Back on the Sheet
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Apply(direction) {
        const step      =  History.Current;
        const settings  =  PainterlyNPR__UndoHistory__Read(step.Id);
        const selected  =  PainterlyNPR__Interface__PointById(Ui.SelectedPointId);
        const keep      =  selected ? { Type: selected.Type, Seed: selected.Seed } : null;   // <-- Points are made afresh: a point is known again by its type and seed
        for (const point of settings.ArtDirectionPoints || []) {
            if (!Array.isArray(point.PaperMm)) point.PaperMm = [0, 0];           // <-- Placed for the live camera below
        }
        History.Restoring  =  true;
        try {
            PainterlyNPR__Interface__ApplySettingsJson(JSON.stringify(settings));    // <-- No Camera in it: the camera stays where it is
            PainterlyNPR__ArtDirection__PlaceObjectPoints();
            const again  =  keep ? State.Points.find(p => p.Type === keep.Type && p.Seed === keep.Seed) : null;
            if (again || Ui.SelectedPointId !== null) PainterlyNPR__Interface__SelectPoint(again ? again.Id : null);
            PainterlyNPR__Interface__UpdateSettingsJson();
            const actual  =  PainterlyNPR__UndoHistory__Keep(PainterlyNPR__UndoHistory__Snapshot());   // <-- What the apply made of the step is the step now
            if (actual !== step.Id) { PainterlyNPR__UndoHistory__Drop(step.Id); step.Id = actual; }
            else PainterlyNPR__UndoHistory__Drop(actual);
            History.Last  =  PainterlyNPR__UndoHistory__Read(step.Id);
        } finally {
            History.Restoring  =  false;
            History.Touched    =  false;                                         // <-- Until the next key or press, what the drawing does as it settles is the restore's
        }
        PainterlyNPR__UndoHistory__Render(direction);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Can a Step Be Taken Now? (not mid-drag, mid-restore or while the factory runs)
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Ready() {
        return !!History.Current && !History.Restoring && !History.Held && !Factory.Running;
    }
    // ------------------------------------------------------------


    // FUNCTION | Step Back - the last change undone, true when there was one
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Undo() {
        if (!PainterlyNPR__UndoHistory__Ready()) return false;
        PainterlyNPR__UndoHistory__Commit();                                     // <-- An edit not yet settled is the one undone
        if (!History.Undo.length) return false;
        History.Redo.push(History.Current);                                      // <-- The step being undone is the one that made the drawing as it stands
        while (History.Redo.length > HISTORY.MaxRedo) PainterlyNPR__UndoHistory__Drop(History.Redo.shift().Id);
        History.Current  =  History.Undo.pop();
        PainterlyNPR__UndoHistory__Apply('Undo');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Step Forward Again - the change just undone redone, true when there was one
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Redo() {
        if (!PainterlyNPR__UndoHistory__Ready()) return false;
        PainterlyNPR__UndoHistory__Commit();                                     // <-- An edit since the undo clears the redos: then there is nothing to redo
        if (!History.Redo.length) return false;
        History.Undo.push(History.Current);
        while (History.Undo.length > HISTORY.MaxUndo) PainterlyNPR__UndoHistory__Drop(History.Undo.shift().Id);
        History.Current  =  History.Redo.pop();
        PainterlyNPR__UndoHistory__Apply('Redo');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | What Undo or Redo Would Do Now - its words, or null; and whether it can
    // ------------------------------------------------------------
    // For the buttons and the sheet's menu. A change still settling is taken
    // first, so a menu opened straight after an edit offers to undo it.
    function PainterlyNPR__UndoHistory__Label(direction) {
        if (History.Timer && !History.Held) PainterlyNPR__UndoHistory__Commit();
        if (direction === 'Redo') return History.Redo.length ? (History.Redo[History.Redo.length - 1].Label || LABELS.Several) : null;
        return History.Undo.length ? (History.Current.Label || LABELS.Several) : null;
    }

    function PainterlyNPR__UndoHistory__CanUndo() { return PainterlyNPR__UndoHistory__Label('Undo') !== null; }
    function PainterlyNPR__UndoHistory__CanRedo() { return PainterlyNPR__UndoHistory__Label('Redo') !== null; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Buttons and Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Two Buttons: lit when there is a step, titled with it; flash: the one just used
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Render(flash) {
        for (const button of $$('[data-history]')) {
            const action  =  button.dataset.history;
            const steps   =  action === 'Undo' ? History.Undo : History.Redo;
            const label   =  action === 'Undo' ? (History.Current && History.Current.Label) : (steps.length ? steps[steps.length - 1].Label : null);
            const words   =  steps.length ? LABELS[action].replace('{step}', label || LABELS.Several) : LABELS[action === 'Undo' ? 'NothingToUndo' : 'NothingToRedo'];
            button.disabled  =  !steps.length;
            button.title     =  words.replace('{keys}', KEY_WORDS[action]);
            button.setAttribute('aria-label', button.title);
            if (flash !== action) continue;
            button.classList.remove('PainterlyNPR__History__Button--flash');
            void button.offsetWidth;                                             // <-- Restarts the flash when the same button is used twice in a row
            button.classList.add('PainterlyNPR__History__Button--flash');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a Key Press Means - 'Undo', 'Redo' or null (the modifiers exactly as listed)
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__MatchKey(e) {
        for (const binding of KEYS.Bindings) {
            if (!binding.Enabled || !binding.Keys.includes(e.key)) continue;
            const named  =  binding.Modifiers;
            if (named.includes('Ctrl') === e.ctrlKey && named.includes('Shift') === e.shiftKey && named.includes('Alt') === e.altKey && named.includes('Meta') === e.metaKey) return binding.Action;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Keys, the Buttons and the Looks, and Take the Starting Point
    // ------------------------------------------------------------
    // The looks listen in the capture phase, so a control that stops its own
    // events is still seen; the keys in the bubble phase, after the sheet's.
    function PainterlyNPR__UndoHistory__Wire() {
        PainterlyNPR__UndoHistory__SetChunkSize(HISTORY.ChunkMinChars);
        History.Current  =  { Id: PainterlyNPR__UndoHistory__Keep(PainterlyNPR__UndoHistory__Snapshot()), Label: null };
        History.Last     =  PainterlyNPR__UndoHistory__Read(History.Current.Id);

        for (const button of $$('[data-history]')) {
            button.innerHTML  =  ICONS[button.dataset.history] || '';
            button.addEventListener('click', () => { if (button.dataset.history === 'Undo') PainterlyNPR__UndoHistory__Undo(); else PainterlyNPR__UndoHistory__Redo(); });
        }

        window.addEventListener('keydown', (e) => {
            const action  =  PainterlyNPR__UndoHistory__MatchKey(e);
            if (!action || e.defaultPrevented || e.isComposing || (KEYS.IgnoreWhenTyping && PainterlyNPR__UndoHistory__Typing())) {
                if (!MODIFIER_KEYS.includes(e.key)) History.Touched = true;      // <-- Any other key, or a box's own undo on its words: the user at work (Ctrl on its way to a Z is not)
                return;
            }
            e.preventDefault();
            const now  =  performance.now();
            if (e.repeat && now - History.KeyAt < KEYS.RepeatMs) return;
            History.KeyAt  =  now;
            if (action === 'Undo') PainterlyNPR__UndoHistory__Undo();
            else PainterlyNPR__UndoHistory__Redo();
        });

        window.addEventListener('pointerdown', (e) => {
            History.Held  =  true;
            if (!(e.target && e.target.closest && e.target.closest('[data-history]'))) History.Touched = true;   // <-- Pressing Undo or Redo is not an edit
        }, true);
        window.addEventListener('pointerup', () => { History.Held = false; PainterlyNPR__UndoHistory__Look(); }, true);
        window.addEventListener('pointercancel', () => { History.Held = false; PainterlyNPR__UndoHistory__Look(); }, true);
        window.addEventListener('pointermove', (e) => { if (History.Held && e.buttons === 0) { History.Held = false; PainterlyNPR__UndoHistory__Look(); } }, true);   // <-- A release outside the window
        window.addEventListener('blur', () => { History.Held = false; });
        for (const type of ['input', 'change', 'click', 'keyup']) window.addEventListener(type, () => PainterlyNPR__UndoHistory__Look(), true);
        window.addEventListener('focusout', (e) => {
            const box  =  e.target;
            if (box && (box.isContentEditable || box.tagName === 'TEXTAREA' || box.tagName === 'INPUT')) PainterlyNPR__UndoHistory__Soon(0);   // <-- Leaving a box ends its edit
        }, true);
        setInterval(() => {
            if (!History.Timer && !History.Held && document.visibilityState !== 'hidden') PainterlyNPR__UndoHistory__Commit();
        }, HISTORY.CheckMs);

        PainterlyNPR__UndoHistory__Render(null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__UndoHistory__CanRedo,
        PainterlyNPR__UndoHistory__CanUndo,
        PainterlyNPR__UndoHistory__Label,
        PainterlyNPR__UndoHistory__Redo,
        PainterlyNPR__UndoHistory__Undo,
        PainterlyNPR__UndoHistory__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
