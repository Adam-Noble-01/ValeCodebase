// =============================================================================
// VALEVISION AURA - APP CORE - PARAMETER DUMP (DEVELOPER TOOLS)
// =============================================================================
//
// FILE       : Na__AppCore__ParameterDump__.js
// NAMESPACE  : Na__ParameterDump
// MODULE     : App Core - Parameter Dump
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Every setting the page holds, for everything, saved as one JSON
//              file: for debugging, and for handing a state over to a coding agent
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - FOR DEVELOPERS: the avatar menu's Developer tools, App Admins only
//   (adminOnly, as ValeVision 3D's and Theia's developer tools).
// - READ ONLY: taking a dump changes nothing, saves nothing and draws nothing.
//   The file is made in the browser and downloaded; nothing goes to the server.
// - WHAT IS IN IT, one top-level key a part:
//   Meta (when, who, the app, the browser, the PWA caches), Project, Page (the
//   open tab, selection, tool, unsaved edits, the drawing set's revision, the
//   header's save state), Engine (everything PainterlyNPR holds, read by
//   Na__EngineHost__Dump__: its whole State, every control, the render graph,
//   the GPU), DrawingSet (the whole document: sheets, viewports, notes, saved
//   views, the engine's saved settings), AppConfig (every key), Handwriting
//   (the engine's loading state), BrowserStorage (this browser's AURA and
//   PainterlyNPR keys: panel widths, work mode, open folds).
// - LEFT OUT: the client's address (the dump goes to coding agents) and the
//   user's email; pixels and GPU handles (sizes only).
// - EVERY PART IS TAKEN ON ITS OWN: one that throws is written as
//   { DumpError } and listed in Meta.Errors; the rest still come.
// - PLAIN JSON: Maps become objects, Sets arrays, NaN and Infinity their names
//   as strings, typed arrays their type and length, DOM elements their tag,
//   functions are left out, and a circle is marked "[Circular]".
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.4.8)
// - Initial build. Adam: "add a parameter dump button, this dumps literally
//   all settings for everything to a json file for debugging / handover to
//   coding agents".
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__All, Na__AppConfig__Get } from './Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__ActiveSheet } from './Na__AppCore__AppState__.js';
    import { Na__Dom__El } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__EngineHost__Dump } from '../10__System__EngineHost/Na__EngineHost__Dump__.js';
    import { Na__Handwriting__Loading, Na__Handwriting__Progress } from '../31__System__Handwriting/Na__Handwriting__Client__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__ParameterDump__FORMAT         = 'ValeVisionAura__ParameterDump';
    const Na__ParameterDump__FORMAT_VERSION = '1.0.0';
    const Na__ParameterDump__STORAGE_MATCH  = /aura|painterly/i;                  // <-- This app's and its engine's keys only: never another app's sign-in or settings
    const Na__ParameterDump__PROJECT_SKIP   = ['address'];                       // <-- The client's address: not needed to debug a drawing

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Any Value as Plain JSON Data (undefined: leave it out)
    // ------------------------------------------------------------
    // `path` holds the objects above this one, so an object reached twice by
    // two routes is written twice and only a true circle is marked.
    // ------------------------------------------------------------
    function Na__ParameterDump__Plain(value, path) {
        const above = path || new WeakSet();
        if (value === null) return null;
        const type = typeof value;
        if (type === 'undefined' || type === 'function' || type === 'symbol') return undefined;
        if (type === 'number') return Number.isFinite(value) ? value : String(value);   // <-- NaN and Infinity: JSON has no other way to keep them
        if (type === 'bigint') return value.toString();
        if (type !== 'object') return value;
        if (typeof Node !== 'undefined' && value instanceof Node) return `[${value.nodeName}${value.id ? '#' + value.id : ''}]`;
        if (ArrayBuffer.isView(value)) return { TypedArray: value.constructor.name, Length: value.length };
        if (value instanceof ArrayBuffer) return { ArrayBuffer: true, ByteLength: value.byteLength };
        if (value instanceof Date) return value.toISOString();
        if (above.has(value)) return '[Circular]';
        above.add(value);
        let out;
        if (Array.isArray(value)) out = value.map((v) => { const p = Na__ParameterDump__Plain(v, above); return p === undefined ? null : p; });
        else if (value instanceof Set) out = Array.from(value, (v) => { const p = Na__ParameterDump__Plain(v, above); return p === undefined ? null : p; });
        else if (value instanceof Map) {
            out = {};
            value.forEach((v, k) => { const p = Na__ParameterDump__Plain(v, above); if (p !== undefined) out[String(k)] = p; });
        } else {
            out = {};
            Object.keys(value).forEach((k) => { const p = Na__ParameterDump__Plain(value[k], above); if (p !== undefined) out[k] = p; });
        }
        above.delete(value);
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take One Part: its value, or { DumpError } and a line in the errors
    // ------------------------------------------------------------
    async function Na__ParameterDump__Part(name, errors, fn) {
        try { return await fn(); }
        catch (error) {
            const message = error && error.message ? error.message : String(error);
            errors.push({ Part: name, Error: message });
            console.error(`[AURA] Parameter dump: "${name}" could not be read:`, error);
            return { DumpError: message };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Header Element's Words (null when it is not on the page)
    // ------------------------------------------------------------
    function Na__ParameterDump__Text(id) {
        const el = document.getElementById(id);
        return el ? el.textContent : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The File's Name: ValeVisionAura__ParameterDump__<project>__<yyyymmdd-hhmmss>.json
    // ------------------------------------------------------------
    function Na__ParameterDump__FileName(project, when) {
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}-${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}`;
        const name = String((project && (project.id || project.code)) || 'NoProject').replace(/[^A-Za-z0-9_-]+/g, '_');
        return `${Na__ParameterDump__FORMAT}__${name}__${stamp}.json`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Parts
// -----------------------------------------------------------------------------

    // FUNCTION | Who, the App and the Browser
    // ------------------------------------------------------------
    async function Na__ParameterDump__Meta(when) {
        const u = Na__AppState__Data.user;
        const nav = window.navigator;
        const cacheNames = typeof window.caches !== 'undefined' ? (await window.caches.keys()).filter((k) => k.indexOf('aura-') === 0) : null;
        return {
            Format        : Na__ParameterDump__FORMAT,
            FormatVersion : Na__ParameterDump__FORMAT_VERSION,
            Description   : 'Every setting ValeVision AURA held when this was taken, for debugging and for handing over to a coding agent. Taking it changed nothing.',
            MadeAt        : when.toISOString(),
            MadeAtLocal   : when.toLocaleString('en-GB'),
            TimeZone      : Intl.DateTimeFormat().resolvedOptions().timeZone,
            MadeBy        : u ? { Code: u.code || null, Name: u.name || null, Level: u.level || null, Role: u.role || null } : null,
            App           : {
                Name    : Na__AppConfig__Get('App__Name', 'ValeVision AURA'),
                Version : Na__AppConfig__Get('App__Version', null),
                Page    : window.location.pathname + window.location.search,
                Title   : document.title
            },
            Browser       : {
                UserAgent           : nav.userAgent,
                Platform            : (nav.userAgentData && nav.userAgentData.platform) || nav.platform || null,
                Language            : nav.language,
                Online              : nav.onLine,
                HardwareConcurrency : nav.hardwareConcurrency || null,
                DeviceMemoryGb      : nav.deviceMemory || null,
                DevicePixelRatio    : window.devicePixelRatio,
                Window              : { Width: window.innerWidth, Height: window.innerHeight },
                Screen              : { Width: window.screen.width, Height: window.screen.height },
                ServiceWorker       : nav.serviceWorker && nav.serviceWorker.controller ? nav.serviceWorker.controller.scriptURL : null,
                Caches              : cacheNames                                 // <-- The PWA's shell and engine caches by version: a stale one shows here
            },
            Errors        : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Page: tab, selection, tool, saving
    // ------------------------------------------------------------
    function Na__ParameterDump__Page() {
        const d = Na__AppState__Data;
        const sheet = Na__AppState__ActiveSheet();
        return {
            Tab           : d.tab,
            OpenSheetId   : sheet ? sheet.Sheet__Id : null,
            Selection     : d.selection,
            Tool          : d.tool,
            UnsavedEdits  : d.dirty,
            DrawingSetRev : d.rev,
            SaveState     : Na__ParameterDump__Text('auraSaveState'),
            EngineStatus  : Na__ParameterDump__Text('auraEngineStatus'),
            EngineLabel   : Na__ParameterDump__Text('auraEngineVersion')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Record, Without the Client's Address
    // ------------------------------------------------------------
    function Na__ParameterDump__Project() {
        const project = Na__AppState__Data.project;
        if (!project) return null;
        const out = {};
        Object.keys(project).forEach((k) => { if (!Na__ParameterDump__PROJECT_SKIP.includes(k)) out[k] = project[k]; });
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | This Browser's AURA and PainterlyNPR Keys (JSON values read back as data)
    // ------------------------------------------------------------
    function Na__ParameterDump__Storage() {
        const out = {};
        const store = window.localStorage;
        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (!key || !Na__ParameterDump__STORAGE_MATCH.test(key)) continue;
            const raw = store.getItem(key);
            try { out[key] = JSON.parse(raw); } catch (error) { out[key] = raw; }
        }
        return { LocalStorage: out };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Dump
// -----------------------------------------------------------------------------

    // FUNCTION | Everything, as One Plain Object
    // ------------------------------------------------------------
    async function Na__ParameterDump__Take() {
        const when = new Date();
        const errors = [];
        const meta = await Na__ParameterDump__Part('Meta', errors, () => Na__ParameterDump__Meta(when));
        const dump = {
            AuraParameterDump__Meta           : meta,
            AuraParameterDump__Project        : await Na__ParameterDump__Part('Project', errors, Na__ParameterDump__Project),
            AuraParameterDump__Page           : await Na__ParameterDump__Part('Page', errors, Na__ParameterDump__Page),
            AuraParameterDump__Engine         : await Na__ParameterDump__Part('Engine', errors, Na__EngineHost__Dump),
            AuraParameterDump__DrawingSet     : await Na__ParameterDump__Part('DrawingSet', errors, () => Na__AppState__Data.doc),
            AuraParameterDump__AppConfig      : await Na__ParameterDump__Part('AppConfig', errors, Na__AppConfig__All),
            AuraParameterDump__Handwriting    : await Na__ParameterDump__Part('Handwriting', errors, () => ({ Loading: Na__Handwriting__Loading(), Progress: Na__Handwriting__Progress() })),
            AuraParameterDump__BrowserStorage : await Na__ParameterDump__Part('BrowserStorage', errors, Na__ParameterDump__Storage)
        };
        meta.Errors = errors;                                                    // <-- Meta is always an object: its own failure is { DumpError }
        return { dump: Na__ParameterDump__Plain(dump), when };
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Dump and Save It as a JSON File (the avatar menu's Download a parameter dump)
    // ------------------------------------------------------------
    async function Na__ParameterDump__Download() {
        try {
            const { dump, when } = await Na__ParameterDump__Take();
            const name = Na__ParameterDump__FileName(Na__AppState__Data.project, when);
            const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = Na__Dom__El('a', null, null, { href: url, download: name });
            link.hidden = true;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            const failed = dump.AuraParameterDump__Meta.Errors.length;
            Na__Toast__Show(failed ? `Parameter dump saved (${failed} part${failed === 1 ? '' : 's'} could not be read): ${name}` : `Parameter dump saved: ${name}`, { error: failed > 0 });
        } catch (error) {
            console.error('[AURA] The parameter dump failed:', error);
            Na__Toast__Show(`The parameter dump could not be made: ${error && error.message ? error.message : error}`, { error: true });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ParameterDump__Take,
        Na__ParameterDump__Download
    };

// endregion -------------------------------------------------------------------
