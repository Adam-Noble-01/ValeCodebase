/* =============================================================================
   DISTO IMAGE MAPPER - DATA INTAKE | FOLDER READER
   =============================================================================

   FILE       : DistoImageMapper__Intake__FolderReader__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Intake - FolderReader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Gets a survey folder from the user and sorts its files by role
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Three ways in: the folder picker (Chrome and Edge), a file input with folder
     selection (Firefox and Safari) or a plain multiple file choice (iPad), and
     dragging a folder onto the window.
   - The chosen folder is remembered, so the installed app can reopen the last
     survey with one click. A browser asks again for permission to read it.
   - Choosing the DISTO's parent folder works: every sub-folder holding a survey
     becomes a choice.
   - Files are only read, in this browser. Nothing is uploaded anywhere.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';

// -----------------------------------------------------------------------------
// REGION | Remembered Folder (IndexedDB)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Local Store
    // ------------------------------------------------------------
    const STORE_DATABASE  =  'DistoImageMapper__LocalStore';
    const STORE_NAME      =  'FolderHandles';
    const STORE_KEY       =  'LastSurveyFolder';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Open the Local Store
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__FolderReader__OpenStore() {
        return new Promise((resolve, reject) => {
            const request  =  window.indexedDB.open(STORE_DATABASE, 1);
            request.onupgradeneeded  =  () => request.result.createObjectStore(STORE_NAME);
            request.onsuccess        =  () => resolve(request.result);
            request.onerror          =  () => reject(request.error);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember a Folder Handle
    // ------------------------------------------------------------
    async function DistoImageMapper__Intake__FolderReader__RememberHandle(handle) {
        try {
            const database  =  await DistoImageMapper__Intake__FolderReader__OpenStore();
            const writing   =  database.transaction(STORE_NAME, 'readwrite');
            writing.objectStore(STORE_NAME).put(handle, STORE_KEY);
            writing.oncomplete  =  () => database.close();
        } catch (error) {
            // <-- Private window or blocked storage: the app just cannot offer Reopen
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Remembered Folder Handle, If Any
    // ------------------------------------------------------------
    export async function DistoImageMapper__Intake__FolderReader__RememberedHandle() {
        try {
            const database  =  await DistoImageMapper__Intake__FolderReader__OpenStore();
            return await new Promise(resolve => {
                const reading  =  database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STORE_KEY);
                reading.onsuccess  =  () => { database.close(); resolve(reading.result || null); };
                reading.onerror    =  () => { database.close(); resolve(null); };
            });
        } catch (error) {
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading Files
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This a File Type a Survey Uses
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__FolderReader__IsRelevant(fileName) {
        const lower  =  fileName.toLowerCase();
        if (lower.endsWith('.csv') || lower.endsWith('.dxf')) return true;
        return DistoImageMapper__Config__Section('FileRules').ImageExtensions.some(extension => lower.endsWith(extension));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Read a Directory Handle Into File Entries
    // ------------------------------------------------------------
    async function DistoImageMapper__Intake__FolderReader__ReadHandle(directoryHandle, prefix = '', depth = 0) {
        const entries     =  [];
        const depthLimit  =  DistoImageMapper__Config__Section('FileRules').FolderDepthLimit;

        for await (const entry of directoryHandle.values()) {
            const path  =  prefix ? `${prefix}/${entry.name}` : entry.name;

            if (entry.kind === 'file') {
                if (DistoImageMapper__Intake__FolderReader__IsRelevant(entry.name)) {
                    entries.push({ Path : path, File : await entry.getFile() });
                }
            } else if (depth < depthLimit) {
                entries.push(...await DistoImageMapper__Intake__FolderReader__ReadHandle(entry, path, depth + 1));
            }
        }
        return entries;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Read a Dragged Directory Entry (Browsers Without Handles)
    // ------------------------------------------------------------
    async function DistoImageMapper__Intake__FolderReader__ReadEntry(fileSystemEntry, prefix = '', depth = 0) {
        const path  =  prefix ? `${prefix}/${fileSystemEntry.name}` : fileSystemEntry.name;

        if (fileSystemEntry.isFile) {
            if (!DistoImageMapper__Intake__FolderReader__IsRelevant(fileSystemEntry.name)) return [];
            const file  =  await new Promise((resolve, reject) => fileSystemEntry.file(resolve, reject));
            return [{ Path : path, File : file }];
        }

        if (depth > DistoImageMapper__Config__Section('FileRules').FolderDepthLimit) return [];

        const reader    =  fileSystemEntry.createReader();
        const children  =  [];
        for (;;) {                                                           // <-- readEntries hands back batches until one is empty
            const batch  =  await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
            if (!batch.length) break;
            children.push(...batch);
        }

        const entries  =  [];
        for (const child of children) {
            entries.push(...await DistoImageMapper__Intake__FolderReader__ReadEntry(child, path, depth + 1));
        }
        return entries;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sorting Files Into Surveys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Does a File Name Start With a CAD Prefix
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__FolderReader__HasPrefix(lowerName, prefix) {
        return lowerName.startsWith(prefix) && /[_\- ]/.test(lowerName.charAt(prefix.length));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Survey Name From Its Files, With No Folder to Go By
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__FolderReader__NameFromFiles(session) {
        const stripExtension  =  name => name.replace(/\.[^.]+$/, '');
        if (session.Csv) return stripExtension(session.Csv.name);
        const anyDxf  =  session.Dxf3d || session.DxfPlan || session.DxfElevation;
        return anyDxf ? stripExtension(anyDxf.name).replace(/^[^_\- ]+[_\- ]/, '') : 'Survey';
    }
    // ------------------------------------------------------------


    // FUNCTION | Sort File Entries Into One Survey per Folder
    // ------------------------------------------------------------
    export function DistoImageMapper__Intake__FolderReader__GroupIntoSessions(entries, rootName) {
        const rules    =  DistoImageMapper__Config__Section('FileRules');
        const folders  =  new Map();

        for (const entry of entries) {
            const cut     =  entry.Path.lastIndexOf('/');
            const folder  =  cut >= 0 ? entry.Path.slice(0, cut) : '';
            if (!folders.has(folder)) folders.set(folder, []);
            folders.get(folder).push(entry.File);
        }

        const sessions  =  [];
        for (const [folder, files] of folders) {
            const session  =  {
                Name : '', Csv : null, Dxf3d : null, DxfPlan : null, DxfElevation : null,
                Images : new Map(), OtherCad : []
            };

            for (const file of files) {
                const lower  =  file.name.toLowerCase();
                if (lower.endsWith('.csv')) {
                    if (!session.Csv) session.Csv  =  file;
                } else if (lower.endsWith('.dxf')) {
                    if      (DistoImageMapper__Intake__FolderReader__HasPrefix(lower, rules.Prefix3d))        session.Dxf3d         =  file;
                    else if (DistoImageMapper__Intake__FolderReader__HasPrefix(lower, rules.PrefixPlan))      session.DxfPlan       =  file;
                    else if (DistoImageMapper__Intake__FolderReader__HasPrefix(lower, rules.PrefixElevation)) session.DxfElevation  =  file;
                    else session.OtherCad.push(file);
                } else {
                    session.Images.set(lower, file);
                }
            }

            if (!session.Csv && !session.Dxf3d && !session.DxfPlan && !session.DxfElevation) continue;  // <-- A folder of photos alone is not a survey

            session.Name  =  folder ? folder.split('/').pop() : (rootName || DistoImageMapper__Intake__FolderReader__NameFromFiles(session));
            sessions.push(session);
        }

        return sessions.sort((a, b) => b.Name.localeCompare(a.Name));        // <-- DISTO folders are dated: newest first
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Ways In
// -----------------------------------------------------------------------------

    // FUNCTION | Can This Browser Show a Real Folder Picker
    // ------------------------------------------------------------
    export function DistoImageMapper__Intake__FolderReader__HasFolderPicker() {
        return typeof window.showDirectoryPicker === 'function';
    }
    // ------------------------------------------------------------


    // FUNCTION | Sessions From the Folder Picker
    // ------------------------------------------------------------
    export async function DistoImageMapper__Intake__FolderReader__PickFolder() {
        const handle  =  await window.showDirectoryPicker({ id : 'disto-survey', mode : 'read' });
        DistoImageMapper__Intake__FolderReader__RememberHandle(handle);
        return DistoImageMapper__Intake__FolderReader__GroupIntoSessions(
            await DistoImageMapper__Intake__FolderReader__ReadHandle(handle), handle.name
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Sessions From the Remembered Folder (Asks Permission Again)
    // ------------------------------------------------------------
    export async function DistoImageMapper__Intake__FolderReader__Reopen(handle) {
        const options  =  { mode : 'read' };
        let permission =  await handle.queryPermission(options);
        if (permission !== 'granted') permission  =  await handle.requestPermission(options);
        if (permission !== 'granted') return [];

        return DistoImageMapper__Intake__FolderReader__GroupIntoSessions(
            await DistoImageMapper__Intake__FolderReader__ReadHandle(handle), handle.name
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Sessions From a File Input
    // ------------------------------------------------------------
    export function DistoImageMapper__Intake__FolderReader__FromFileList(fileList) {
        const entries  =  Array.from(fileList)
            .filter(file => DistoImageMapper__Intake__FolderReader__IsRelevant(file.name))
            .map(file => ({ Path : file.webkitRelativePath || file.name, File : file }));

        return DistoImageMapper__Intake__FolderReader__GroupIntoSessions(entries, '');
    }
    // ------------------------------------------------------------


    // FUNCTION | Sessions From a Drop
    // ------------------------------------------------------------
    // The item list empties when the event ends, so everything that reads it runs
    // before the first await.
    export async function DistoImageMapper__Intake__FolderReader__FromDrop(dataTransfer) {
        const items     =  Array.from(dataTransfer.items || []).filter(item => item.kind === 'file');
        const handles   =  items.map(item => (typeof item.getAsFileSystemHandle === 'function' ? item.getAsFileSystemHandle() : null));
        const fsEntries =  items.map(item => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null));
        const files     =  Array.from(dataTransfer.files || []);

        const entries  =  [];
        let rootName   =  '';

        for (let i = 0; i < items.length; i++) {
            const handle  =  handles[i] ? await handles[i].catch(() => null) : null;

            if (handle && handle.kind === 'directory') {
                DistoImageMapper__Intake__FolderReader__RememberHandle(handle);
                if (items.length === 1) rootName  =  handle.name;
                const prefix  =  items.length === 1 ? '' : handle.name;
                entries.push(...await DistoImageMapper__Intake__FolderReader__ReadHandle(handle, prefix));
            } else if (handle && handle.kind === 'file') {
                if (DistoImageMapper__Intake__FolderReader__IsRelevant(handle.name)) {
                    entries.push({ Path : handle.name, File : await handle.getFile() });
                }
            } else if (fsEntries[i]) {
                entries.push(...await DistoImageMapper__Intake__FolderReader__ReadEntry(fsEntries[i]));
            }
        }

        if (!entries.length && files.length) return DistoImageMapper__Intake__FolderReader__FromFileList(files);
        return DistoImageMapper__Intake__FolderReader__GroupIntoSessions(entries, rootName);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
