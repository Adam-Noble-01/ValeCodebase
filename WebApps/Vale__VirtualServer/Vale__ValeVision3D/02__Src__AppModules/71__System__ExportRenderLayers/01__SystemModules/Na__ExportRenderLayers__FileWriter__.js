// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - FILE WRITER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__FileWriter__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - File Writer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Encode each pass to PNG and write it, preferring a chosen
//              folder on Chromium and falling back to individual downloads.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - A structural export set is a folder of files that belong together. The
//   File System Access API is therefore the preferred path: the developer
//   picks one destination once, and every PNG plus the manifest lands in it
//   with the correct name and no download-bar noise.
// - Where the API is unavailable the writer falls back to the Blob download
//   pattern the image exporter already uses. JSZip is deliberately NOT added;
//   a zip dependency for a localhost developer feature is not a trade worth
//   making.
// - Browsers throttle or block rapid successive downloads. The fallback path
//   spaces them, counts what actually got triggered, and retains completed
//   Blobs so the caller can offer individual saves for anything the browser
//   refused.
// - A canvas that cannot be encoded returns null from toBlob rather than
//   throwing, which historically produced a silent zero-byte file. That case
//   is turned into a real error here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Download Pacing
    // ------------------------------------------------------------
    // Chrome and Firefox both rate-limit programmatic downloads. A short
    // gap between them is the difference between eight saved files and two.
    // ------------------------------------------------------------
    const Na__ErlWriter__DOWNLOAD_GAP_MS = 350;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Encoding
// -----------------------------------------------------------------------------

    // FUNCTION | Encode a Canvas to a PNG Blob, Failing Loudly
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__EncodePng(canvas) {
        return new Promise((resolve, reject) => {
            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('This image could not be encoded on this device. Try a lower export resolution.'));
                    }
                }, 'image/png');
            } catch (encodeError) {
                reject(encodeError);                                     // <-- Synchronous encode failure
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Destination Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Test Whether Folder Writing Is Available
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__CanWriteToFolder() {
        return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask the Developer for an Export Folder
    // ------------------------------------------------------------
    // Returns a FileSystemDirectoryHandle, or null when the API is absent
    // or the picker was dismissed. A dismissed picker is a normal outcome,
    // not an error, so it resolves rather than throwing.
    // ------------------------------------------------------------
    async function Na__ExportRenderLayers__RequestDirectory(preferFolder) {
        if (!preferFolder || !Na__ExportRenderLayers__CanWriteToFolder()) return null;

        try {
            return await window.showDirectoryPicker({ id: 'valevision-render-layers', mode: 'readwrite' });
        } catch (pickerError) {
            if (pickerError && pickerError.name === 'AbortError') return null;    // <-- Developer cancelled the picker
            console.warn('[ExportRenderLayers] Folder picker unavailable; falling back to downloads.', pickerError);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Writing
// -----------------------------------------------------------------------------

    // FUNCTION | Write One Blob Into a Chosen Folder
    // ------------------------------------------------------------
    async function Na__ExportRenderLayers__WriteToDirectory(directoryHandle, filename, blob) {
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable   = await fileHandle.createWritable();

        try {
            await writable.write(blob);
        } finally {
            await writable.close();                                      // <-- Close even on a failed write; an open handle locks the file
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Trigger One Blob as a Browser Download
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__DownloadBlob(blob, filename) {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href     = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);                                        // <-- Free memory as soon as the download is queued
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Writer Bound to One Destination
    // ------------------------------------------------------------
    // options: { directoryHandle {FileSystemDirectoryHandle|null} }
    //
    // Returns:
    //   {
    //     mode,                    <-- 'folder' or 'download'
    //     write(filename, blob),   <-- Promise<void>
    //     getWritten(),            <-- Filenames successfully written
    //     getRetained()            <-- [{ filename, blob }] for manual saving
    //   }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__FileWriter__Create(options) {
        const { directoryHandle = null } = options || {};

        const mode     = directoryHandle ? 'folder' : 'download';
        const written  = [];
        const retained = [];                                             // <-- Only populated in download mode


        // SUB FUNCTION | Space Out Successive Downloads
        // ---------------------------------------------------------------
        function pauseBetweenDownloads() {
            return new Promise((resolve) => setTimeout(resolve, Na__ErlWriter__DOWNLOAD_GAP_MS));
        }
        // ---------------------------------------------------------------


        return {

            mode,


            // FUNCTION | Write One File to the Bound Destination
            // ------------------------------------------------------------
            async write(filename, blob) {
                if (directoryHandle) {
                    await Na__ExportRenderLayers__WriteToDirectory(directoryHandle, filename, blob);
                    written.push(filename);
                    return;
                }

                // FALLBACK | Retain first so a blocked download can still be saved
                retained.push({ filename, blob });
                Na__ExportRenderLayers__DownloadBlob(blob, filename);
                written.push(filename);

                await pauseBetweenDownloads();
            },
            // ------------------------------------------------------------


            // FUNCTION | List the Filenames Written So Far
            // ------------------------------------------------------------
            // Used by the batch exporter's error reporting so a failure part
            // way through a set can say exactly which files already landed.
            // ------------------------------------------------------------
            getWritten() {
                return written.slice();
            },
            // ------------------------------------------------------------


            // FUNCTION | List Retained Blobs for Manual Saving
            // ------------------------------------------------------------
            getRetained() {
                return retained.slice();
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | File Writer API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__FileWriter__Create,
        Na__ExportRenderLayers__RequestDirectory,
        Na__ExportRenderLayers__EncodePng,
        Na__ExportRenderLayers__DownloadBlob
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
