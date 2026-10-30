/* =============================================================================
   PAINTERLYNPR - SYSTEM | PROJECT PERSISTENCE - SAVED SETTINGS
   =============================================================================

   FILE       : PainterlyNPR__Saves__SavedSettings__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - ProjectPersistence - SavedSettings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Named set-ups: saved in this browser and, through the local
                server, as files in 21__Generated__UserProjects - with a history
                and a bin
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Nothing is erased: a replaced save goes to the history, a removed one to the
     bin.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Saved Settings - named set-ups, in this
                   browser and in 21__Generated__UserProjects
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import SavesConfig from './Na__ProjectPersistence__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__ENGINE_VERSION as ENGINE_VERSION } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import {
    PainterlyNPR__Interface__ApplySettingsJson,
    PainterlyNPR__Interface__SettingsObject,
} from './PainterlyNPR__Interface__SettingsJson__.mjs';
import { PainterlyNPR__RefreshGuard__MarkSaved, PainterlyNPR__RefreshGuard__Wire } from './PainterlyNPR__Saves__RefreshGuard__.mjs';

// =============================================================================
// REGION | Project Persistence - Saved Settings
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__ProjectPersistence__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const SAVES_CONFIG  =  PainterlyNPR__ConfigAccess__Section(SavesConfig, 'PainterlyNPR__ProjectPersistence__Config', 'Saves', ['StorageKey', 'Api', 'Folder', 'NameRule', 'ArmMs']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saved Settings - named set-ups, in this browser and in 21__Generated__UserProjects
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Where a Save Goes
    // ------------------------------------------------------------
    // A save is the settings JSON (the Export tab's - the whole drawing, seed
    // included) with a name and a time, so Load puts the drawing back exactly.
    // It always goes to this browser's localStorage, which works from file://
    // too, and - when the page is served by PainterlyNPR__LocalServer__Localhost__.py
    // - to <name>.json in the repo's 21__Generated__UserProjects: module 85's
    // saves folder, git-ignored like AudioSPACE's. The server keeps a replaced
    // save in its history and moves a removed one to its bin: nothing is erased.
    const SAVES_STORAGE_KEY  =  SAVES_CONFIG.StorageKey;                        // <-- { Name: { Saved, Settings } }
    const SAVES_API          =  SAVES_CONFIG.Api;                                // <-- The local server's routes, named as AudioSPACE's
    const SAVES_FOLDER       =  SAVES_CONFIG.Folder;
    const SAVES_NAME_RULE    =  new RegExp(SAVES_CONFIG.NameRule.Pattern, SAVES_CONFIG.NameRule.Flags);   // <-- AudioSPACE's rule: letters, digits, spaces, _ . -
    const SAVES_ARM_MS       =  SAVES_CONFIG.ArmMs;                              // <-- A Remove needs a second click within this
    // ------------------------------------------------------------


    // MODULE STATE | The Saves Panel
    // ------------------------------------------------------------
    const Saves  =  { Files: null, Armed: '', ArmedTimer: 0 };                  // <-- Files: the folder's list; null when no server answers
    // ------------------------------------------------------------


    // FUNCTION | A Name Fit to Save Under, or Null
    // ------------------------------------------------------------
    function PainterlyNPR__Saves__CleanName(text) {
        const name  =  String(text || '').trim().replace(/\.json$/i, '');
        return SAVES_NAME_RULE.test(name) && !name.includes('..') ? name : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | This Browser's Saves - storage can be refused, so both ways sit in try
    // ------------------------------------------------------------
    function PainterlyNPR__Saves__BrowserRead() {
        try {
            const all  =  JSON.parse(localStorage.getItem(SAVES_STORAGE_KEY) || '{}');
            return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
        } catch (error) { return {}; }
    }

    function PainterlyNPR__Saves__BrowserWrite(all) {
        try { localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(all)); return true; }
        catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Folder's Saves - null when no local server answers
    // ------------------------------------------------------------
    async function PainterlyNPR__Saves__FetchFiles() {
        if (location.protocol === 'file:') return null;
        try {
            const response  =  await fetch(SAVES_API, { cache: 'no-store' });
            if (!response.ok) return null;
            const data  =  await response.json();
            return Array.isArray(data.Saves) ? data.Saves : null;
        } catch (error) { return null; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Say What Happened, Under the Name Box
    // ------------------------------------------------------------
    function PainterlyNPR__Saves__Say(text) {
        const line  =  $('#PainterlyNPR__App__SaveStatus');
        if (line) line.textContent = text;
    }

    function PainterlyNPR__Saves__When(iso) {
        const date  =  new Date(iso);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Save Holds - the settings object, named and dated
    // ------------------------------------------------------------
    function PainterlyNPR__Saves__Record(name) {
        return Object.assign({ Name: name, Saved: new Date().toISOString() }, PainterlyNPR__Interface__SettingsObject());
    }
    // ------------------------------------------------------------


    // FUNCTION | Save - to this browser, and to the folder when a server answers
    // ------------------------------------------------------------
    // True when it was saved somewhere (the refresh guard refreshes only then).
    async function PainterlyNPR__Saves__Save(text) {
        const name  =  PainterlyNPR__Saves__CleanName(text);
        if (!name) { PainterlyNPR__Saves__Say('A name takes letters, digits, spaces, _ . and -, and starts with a letter or digit.'); return false; }
        const record     =  PainterlyNPR__Saves__Record(name);
        const all        =  PainterlyNPR__Saves__BrowserRead();
        const had        =  !!all[name] || !!(Saves.Files && Saves.Files.some(save => save.Name === name));
        all[name]        =  { Saved: record.Saved, Settings: record };
        const inBrowser  =  PainterlyNPR__Saves__BrowserWrite(all);
        let inFolder     =  false;
        if (Saves.Files) {
            try {
                const response  =  await fetch(`${SAVES_API}/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record, null, 2) });
                inFolder  =  response.ok;
            } catch (error) { inFolder = false; }
        }
        const where   =  [inBrowser ? 'this browser' : '', inFolder ? SAVES_FOLDER : ''].filter(Boolean).join(' and ');
        const missed  =  Saves.Files && !inFolder ? ` ${SAVES_FOLDER} did not take it.` : '';
        PainterlyNPR__Saves__Say(where ? `${had ? 'Replaced' : 'Saved'} "${name}" in ${where}.${missed}` : `"${name}" was not saved - storage was refused.${missed}`);
        if (where) PainterlyNPR__RefreshGuard__MarkSaved(name);                  // <-- Nothing unsaved now, for the refresh guard
        await PainterlyNPR__Saves__Render();
        return !!where;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load - put a saved drawing back exactly
    // ------------------------------------------------------------
    async function PainterlyNPR__Saves__Load(where, name) {
        try {
            let settings  =  null;
            if (where === 'File') {
                const response  =  await fetch(`${SAVES_API}/${encodeURIComponent(name)}`, { cache: 'no-store' });
                if (!response.ok) throw new Error(`the server answered ${response.status}`);
                settings  =  await response.json();
            } else {
                const entry  =  PainterlyNPR__Saves__BrowserRead()[name];
                if (!entry || !entry.Settings) throw new Error('it is no longer in this browser');
                settings  =  entry.Settings;
            }
            PainterlyNPR__Interface__ApplySettingsJson(JSON.stringify(settings));
            $('#PainterlyNPR__App__SaveName').value  =  name;
            PainterlyNPR__RefreshGuard__MarkSaved(name);                         // <-- The loaded drawing is the saved one, for the refresh guard
            const older  =  settings.EngineVersion && settings.EngineVersion !== ENGINE_VERSION ? ` - saved by engine ${settings.EngineVersion}` : '';
            PainterlyNPR__Saves__Say(`Loaded "${name}"${older}.`);
        } catch (error) {
            PainterlyNPR__Saves__Say(`"${name}" was not loaded - ${error.message}.`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove - the first click arms the button, a second within three seconds removes
    // ------------------------------------------------------------
    async function PainterlyNPR__Saves__Remove(where, name, button) {
        const key  =  `${where}:${name}`;
        clearTimeout(Saves.ArmedTimer);
        if (Saves.Armed !== key) {
            for (const other of $$('.PainterlyNPR__SaveList__Remove--armed')) PainterlyNPR__Saves__Disarm(other);
            Saves.Armed  =  key;
            button.classList.add('PainterlyNPR__SaveList__Remove--armed');
            button.textContent  =  'Remove?';
            Saves.ArmedTimer  =  setTimeout(() => { Saves.Armed = ''; PainterlyNPR__Saves__Disarm(button); }, SAVES_ARM_MS);
            return;
        }
        Saves.Armed  =  '';
        if (where === 'File') {
            try {
                const response  =  await fetch(`${SAVES_API}/${encodeURIComponent(name)}`, { method: 'DELETE' });
                PainterlyNPR__Saves__Say(response.ok ? `Moved "${name}" into the bin in ${SAVES_FOLDER}.` : `"${name}" was not removed - the server answered ${response.status}.`);
            } catch (error) { PainterlyNPR__Saves__Say(`"${name}" was not removed - ${error.message}.`); }
        } else {
            const all  =  PainterlyNPR__Saves__BrowserRead();
            delete all[name];
            PainterlyNPR__Saves__Say(PainterlyNPR__Saves__BrowserWrite(all) ? `Removed "${name}" from this browser.` : 'This browser refused the change.');
        }
        await PainterlyNPR__Saves__Render();
    }

    function PainterlyNPR__Saves__Disarm(button) {
        button.classList.remove('PainterlyNPR__SaveList__Remove--armed');
        button.textContent  =  '×';
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Lists - the folder's saves when a server answers, then this browser's
    // ------------------------------------------------------------
    async function PainterlyNPR__Saves__Render() {
        Saves.Files  =  await PainterlyNPR__Saves__FetchFiles();
        const browser  =  Object.entries(PainterlyNPR__Saves__BrowserRead()).map(([name, entry]) => ({ Name: name, Saved: entry && entry.Saved }));
        browser.sort((a, b) => String(b.Saved).localeCompare(String(a.Saved)));
        PainterlyNPR__Saves__DrawList('File', `In ${SAVES_FOLDER}`, Saves.Files, 'Needs the page served by Start__PainterlyNPR__Localhost__8020__.bat.');
        PainterlyNPR__Saves__DrawList('Browser', 'In this browser', browser, '');
    }

    function PainterlyNPR__Saves__DrawList(where, title, saves, absent) {
        const box   =  $(`[data-save-list="${where}"]`);
        if (!box) return;
        const make  =  (tag, className, text) => { const node = document.createElement(tag); node.className = className; if (text != null) node.textContent = text; return node; };
        box.replaceChildren(make('h4', 'PainterlyNPR__SaveList__Title', title));
        if (!saves || !saves.length) { box.appendChild(make('p', 'PainterlyNPR__SaveList__Empty', saves ? 'Nothing saved yet.' : absent)); return; }
        const list  =  make('ul', 'PainterlyNPR__SaveList', null);
        for (const save of saves) {
            const row     =  make('li', 'PainterlyNPR__SaveList__Row', null);
            const name    =  make('span', 'PainterlyNPR__SaveList__Name', save.Name);
            const when    =  make('span', 'PainterlyNPR__SaveList__When', PainterlyNPR__Saves__When(save.Saved || save.Modified));
            const load    =  make('button', 'PainterlyNPR__Button PainterlyNPR__SaveList__Load', 'Load');
            const remove  =  make('button', 'PainterlyNPR__IconButton PainterlyNPR__SaveList__Remove', '×');
            name.title    =  save.Name;
            load.type     =  remove.type = 'button';
            remove.title  =  where === 'File' ? `Move into the bin in ${SAVES_FOLDER}` : 'Remove from this browser';
            remove.setAttribute('aria-label', `Remove ${save.Name}`);
            Object.assign(load.dataset, { saveLoad: where, saveName: save.Name });
            Object.assign(remove.dataset, { saveRemove: where, saveName: save.Name });
            row.append(name, when, load, remove);
            list.appendChild(row);
        }
        box.appendChild(list);
    }
    // ------------------------------------------------------------


    // FUNCTION | Download and Open - the same file, by hand
    // ------------------------------------------------------------
    function PainterlyNPR__Saves__Download() {
        const name    =  PainterlyNPR__Saves__CleanName($('#PainterlyNPR__App__SaveName').value) || `PainterlyNPR Settings ${State.Seed}`;
        const url     =  URL.createObjectURL(new Blob([JSON.stringify(PainterlyNPR__Saves__Record(name), null, 2)], { type: 'application/json' }));
        const link    =  document.createElement('a');
        link.href      =  url;
        link.download  =  `${name}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        PainterlyNPR__Saves__Say(`Downloaded "${name}.json".`);
    }

    function PainterlyNPR__Saves__Open(file) {
        const reader  =  new FileReader();
        reader.onload  =  () => {
            try {
                PainterlyNPR__Interface__ApplySettingsJson(String(reader.result));
                const name  =  PainterlyNPR__Saves__CleanName(file.name);
                if (name) $('#PainterlyNPR__App__SaveName').value = name;
                PainterlyNPR__Saves__Say(`Opened "${file.name}".`);
            } catch (error) { PainterlyNPR__Saves__Say(`"${file.name}" was not opened - ${error.message}.`); }
        };
        reader.onerror  =  () => PainterlyNPR__Saves__Say(`"${file.name}" could not be read.`);
        reader.readAsText(file);
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Group - once, at boot; Ctrl+S saves under the name in the box
    // ------------------------------------------------------------
    function PainterlyNPR__Saves__Wire() {
        const group  =  $('#PainterlyNPR__App__Saves');
        if (!group) return;
        const name    =  $('#PainterlyNPR__App__SaveName');
        const picker  =  $('#PainterlyNPR__App__OpenSettingsFile');
        $('#PainterlyNPR__App__SaveButton').addEventListener('click', () => PainterlyNPR__Saves__Save(name.value));
        name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); PainterlyNPR__Saves__Save(name.value); } });
        group.addEventListener('click', (e) => {
            const load    =  e.target.closest('[data-save-load]');
            const remove  =  e.target.closest('[data-save-remove]');
            if (load) PainterlyNPR__Saves__Load(load.dataset.saveLoad, load.dataset.saveName);
            else if (remove) PainterlyNPR__Saves__Remove(remove.dataset.saveRemove, remove.dataset.saveName, remove);
        });
        $('#PainterlyNPR__App__DownloadSettings').addEventListener('click', PainterlyNPR__Saves__Download);
        $('#PainterlyNPR__App__OpenSettings').addEventListener('click', () => picker.click());
        picker.addEventListener('change', () => { if (picker.files[0]) PainterlyNPR__Saves__Open(picker.files[0]); picker.value = ''; });
        window.addEventListener('keydown', (e) => {
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 's') return;
            e.preventDefault();                                                  // <-- Not the browser's Save page as
            if (PainterlyNPR__Saves__CleanName(name.value)) { PainterlyNPR__Saves__Save(name.value); return; }
            const section  =  $('[data-panel="Export"]');
            if (section) section.open = true;                                    // <-- The Export section, where the tab was (v0.7.2)
            name.focus();
            PainterlyNPR__Saves__Say('Name this set-up, then press Enter.');
        });
        PainterlyNPR__Saves__Render();
        PainterlyNPR__RefreshGuard__Wire({                                       // <-- Ctrl + R and F5 ask first: save, cancel or abandon (v0.7.1)
            Save       :  PainterlyNPR__Saves__Save,
            CleanName  :  PainterlyNPR__Saves__CleanName,
            NameNow    :  () => name.value,
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Saves__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
