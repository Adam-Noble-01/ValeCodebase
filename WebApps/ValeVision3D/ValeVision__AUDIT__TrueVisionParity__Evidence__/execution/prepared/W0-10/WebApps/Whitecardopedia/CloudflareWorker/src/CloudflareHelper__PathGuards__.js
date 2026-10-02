// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - SHARED PATH GUARDS HELPER
// =============================================================================
//
// FILE       : src/CloudflareHelper__PathGuards__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Shared Path Guards Helper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The server-side rules for what the ValeVision editor may read and
//              write under one project's R2 folder: the folderId check, the six
//              project-file families and the editor-owned project.json keys
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - ONE PLACE FOR EVERY PATH RULE. index.js checks the URL folderId here for
//   every /projects/ route; the ProjectFiles handler asks here which family a
//   path is in and what may be done to it; the ProjectMerge handler asks here
//   whether a top-level project.json key is the editor's.
// - THE BUCKET IS SHARED. noble-architecture-cdn also holds TrueVision's own
//   content under another prefix, so isolation is by prefix alone: every key
//   built here starts VaApps/Projects/{folderId}/, and a path that could leave
//   it (a leading slash, a backslash, an empty, "." or ".." segment, a control
//   character) is refused before any family is looked at. R2 keys are literal
//   strings, so that check is the whole of the fence.
// - SIX FAMILIES, EACH WITH ITS OWN OPERATIONS (paths relative to the project
//   folder):
//     F-SIB    ValeVision__DrawingNotes__.json, ValeVision__StatementDocs__.json   read, write
//     F-THUMB  PresentationMode/Thumbnails/<name>.webp|png                         read, write, upload
//     F-ASSET  LayoutEditor/Linework|Snapshots/<name>.webp|png|json               read, write, upload
//     F-IMG    05__Layout__DrawingDocs__Images/<document id>/<picture>            all six
//     F-PUB    06__Layout__PublishedDocuments/<one to six segments>               all six
//     F-STMT   10__StatementDocs/<one to five segments>                          read, write, upload, list
//   (the six operations: read, write, upload, list, copy, delete). project.json
//   is in no family - only the save route and merge-keys write it - and no
//   family can name anything under VaApps/Index/, so no files route can touch
//   the build manifest.
// - ARCHIVES NEVER LEAVE THE MACHINE. 05__.../00__Archive and
//   06__.../00__Archive__Revisions are refused, and so is a statements folder
//   whose name starts 00__Archive or 00__Deleted (the local-only archive and
//   delete quarantine).
// - A SHEET PICTURE'S NAME IS ITS CONTENT. Only a managed name -
//   <slug>__<first ten hex digits of its SHA-256>.webp|jpg|png - may be
//   written, copied or deleted, and na_check_sheet_picture() refuses bytes that
//   do not hash to their name or are not the picture type the extension says.
//   That is what lets every sheet picture be served immutable for a year.
// - THE STORED TYPE AND CACHE POLICY ARE DECIDED HERE, never by the caller.
//   Sibling documents, thumbnails, assets and statements: no-cache, max-age=0.
//   Sheet pictures and hash-named published files: public, max-age=31536000,
//   immutable. Every other published file: public, max-age=60,
//   must-revalidate. The content type follows the extension.
// - THE EDITOR-OWNED KEYS ARE ONE LIST. merge-keys may set or remove only the
//   keys ProjectData__EditorOwnedKeys names in ValeVision's app config
//   (WebApps/ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json).
//   wrangler bundles that file into the worker when it builds it, so the
//   worker, the Whitecardopedia sync (which keeps those keys from R2) and the
//   localhost load overlay all read the same list; a key added there reaches
//   the worker at its next deploy. A key absent from the list is refused even
//   when it shares a prefix with listed keys. remove alone may also name the
//   legacy valeVision_Camera__DefaultPosition that ValeVision's camera saver
//   deletes. A missing or malformed list refuses every merge (fails closed),
//   and so does a list naming a pipeline key.
//
// R2 KEY PATHS:
//   project files : VaApps/Projects/{folderId}/{path}
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation for worker 1.6.0: the folderId check, the six
//   project-file families, the list-prefix rule, the sheet-picture check and
//   the editor-owned key guard read from ValeVision's app config.
//
// =============================================================================

// @delegate: ../../../ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json

import Na__ValeVisionAppConfig from '../../../ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json';

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project Prefix and the folderId Rule
    // ------------------------------------------------------------
    // "YYYY/" then a folder segment free of the Windows-reserved set and of
    // control characters: the rename handler's own pattern
    // (CloudflareHandler__ProjectRename__.js), which every master-index
    // folderId and every local project folder passes. The folder segment may
    // hold spaces (2025/FN-62104__Fenner Scheme-01).
    // ------------------------------------------------------------
    const Na__PathGuards__PROJECTS_PREFIX   = 'VaApps/Projects';                  // <-- Every project key this worker builds starts here
    const Na__PathGuards__FOLDER_ID_PATTERN = /^\d{4}\/[^<>:"/\\|?*\x00-\x1F]+$/;
    const Na__PathGuards__MAX_PATH_CHARS    = 1024;                               // <-- Longer than any real path; stops a runaway one
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Cache Policies, Size Caps and Content Types
    // ------------------------------------------------------------
    const Na__PathGuards__CACHE_NO_CACHE    = 'no-cache, max-age=0';                    // <-- Replaced in place: every read revalidates
    const Na__PathGuards__CACHE_IMMUTABLE   = 'public, max-age=31536000, immutable';    // <-- The name carries the content hash
    const Na__PathGuards__CACHE_MUTABLE_60  = 'public, max-age=60, must-revalidate';    // <-- Fixed names a re-publish rewrites
    const Na__PathGuards__MAX_BYTES         = 25 * 1024 * 1024;                         // <-- Read whole in the worker: the asset route's cap
    const Na__PathGuards__MAX_STREAM_BYTES  = 95 * 1024 * 1024;                         // <-- Streamed to R2; Cloudflare refuses a body over 100 MB

    const Na__PathGuards__CONTENT_TYPES = Object.freeze({
        json : 'application/json',
        md   : 'text/markdown; charset=utf-8',
        html : 'text/html; charset=utf-8',
        txt  : 'text/plain; charset=utf-8',
        svg  : 'image/svg+xml',
        webp : 'image/webp',
        png  : 'image/png',
        jpg  : 'image/jpeg',
        jpeg : 'image/jpeg',
        gif  : 'image/gif',
        tif  : 'image/tiff',
        tiff : 'image/tiff',
        bmp  : 'image/bmp',
        pdf  : 'application/pdf'
    });
    const Na__PathGuards__TEXT_EXTENSIONS = Object.freeze(['json', 'md', 'html', 'txt', 'svg']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Six Families and What Each May Do
    // ------------------------------------------------------------
    const Na__PathGuards__FAMILIES = Object.freeze({
        'F-SIB'   : Object.freeze({ label : 'sibling project documents',            ops : Object.freeze(['read', 'write']) }),
        'F-THUMB' : Object.freeze({ label : 'presentation scene thumbnails',        ops : Object.freeze(['read', 'write', 'upload']) }),
        'F-ASSET' : Object.freeze({ label : 'Layout Editor linework and snapshots', ops : Object.freeze(['read', 'write', 'upload']) }),
        'F-IMG'   : Object.freeze({ label : 'sheet pictures',                       ops : Object.freeze(['read', 'write', 'upload', 'list', 'copy', 'delete']) }),
        'F-PUB'   : Object.freeze({ label : 'published documents',                  ops : Object.freeze(['read', 'write', 'upload', 'list', 'copy', 'delete']) }),
        'F-STMT'  : Object.freeze({ label : 'statements',                           ops : Object.freeze(['read', 'write', 'upload', 'list']) })
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | F-SIB, F-THUMB and F-ASSET
    // ------------------------------------------------------------
    const Na__PathGuards__SIBLING_FILES = Object.freeze([
        'ValeVision__DrawingNotes__.json',                                      // <-- The Layout Editor's drawing notes
        'ValeVision__StatementDocs__.json'                                      // <-- The statement index
    ]);
    const Na__PathGuards__THUMB_PATTERN = /^PresentationMode\/Thumbnails\/[A-Za-z0-9_.-]+\.(webp|png)$/;
    const Na__PathGuards__ASSET_PATTERN = /^LayoutEditor\/(Linework|Snapshots)\/[A-Za-z0-9_.-]+\.(webp|png|json)$/;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | F-IMG - Sheet Pictures
    // ------------------------------------------------------------
    // One level of document-id folders and a flat file name, the archive
    // folder refused (it is the local save's own). A managed name ends in the
    // first ten hex digits of the picture's SHA-256.
    // ------------------------------------------------------------
    const Na__PathGuards__IMAGES_DIR     = '05__Layout__DrawingDocs__Images';
    const Na__PathGuards__IMAGES_ARCHIVE = '00__Archive';
    const Na__PathGuards__IMAGE_FOLDER   = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$/;
    const Na__PathGuards__IMAGE_FILE     = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}\.(webp|jpe?g|png)$/i;
    const Na__PathGuards__IMAGE_MANAGED  = /^[A-Za-z0-9][A-Za-z0-9_\-.]*__([0-9a-f]{10})\.(webp|jpg|png)$/;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | F-PUB - Published Documents
    // ------------------------------------------------------------
    // The index and share-link record at the root, each document in a folder
    // named after its document id, shared tiles in 01__Shared__* folders. The
    // revisions archive is local only. Pictures, vectors and PDFs stream
    // straight into R2; JSON and markdown are read whole so JSON can be checked.
    // ------------------------------------------------------------
    const Na__PathGuards__PUBLISHED_DIR          = '06__Layout__PublishedDocuments';
    const Na__PathGuards__PUBLISHED_ARCHIVE      = '00__Archive__Revisions';
    const Na__PathGuards__PUBLISHED_SEGMENT      = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$/;
    const Na__PathGuards__PUBLISHED_FILE         = /\.(json|svg|webp|png|pdf|md)$/i;
    const Na__PathGuards__PUBLISHED_HASHED       = /__[0-9a-f]{10}\.(svg|webp|png|pdf)$/;
    const Na__PathGuards__PUBLISHED_MAX_SEGMENTS = 6;                                // <-- Below the published folder, file included
    const Na__PathGuards__PUBLISHED_STREAMED     = Object.freeze(['svg', 'webp', 'png', 'pdf']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | F-STMT - Statements
    // ------------------------------------------------------------
    // TrueVision's statement rules: up to five segments below the statements
    // folder (file included), each from a small safe set that allows spaces
    // and & ( ) [ ], and only the writer's text and picture types.
    // ------------------------------------------------------------
    const Na__PathGuards__STATEMENTS_DIR          = '10__StatementDocs';
    const Na__PathGuards__STATEMENT_SEGMENT       = /^[A-Za-z0-9_\-. &()\[\]]{1,140}$/;
    const Na__PathGuards__STATEMENT_FILE          = /\.(md|html|json|txt|jpe?g|png|webp|gif|tiff?|bmp|svg)$/i;
    const Na__PathGuards__STATEMENT_MAX_SEGMENTS  = 5;
    const Na__PathGuards__STATEMENT_LOCAL_ONLY    = /^00__(Archive|Deleted)/;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Top-Level project.json Keys Outside the Editor's List
    // ------------------------------------------------------------
    // Pipeline keys are written only by the SketchUp sync and the project
    // editor's save; the sync tools refuse an editor list naming any of them
    // (AutomationUtil__R2Common__Lib__.py), and so does this guard. The
    // legacy camera key may be REMOVED (ValeVision's camera saver deletes it
    // from 35 of 155 projects) but never set.
    // ------------------------------------------------------------
    const Na__PathGuards__PIPELINE_KEYS = Object.freeze([
        'projectCode', 'projectName', 'folderId', 'basePath',
        'images', 'allImages', 'displayImages', 'thumbnailImage',
        'valeVision_ModelUrls', 'valeVision_ModelUrl', 'ValeVison3D__SketchUpCameraData'
    ]);
    const Na__PathGuards__REMOVE_ONLY_KEYS = Object.freeze(['valeVision_Camera__DefaultPosition']);
    const Na__PathGuards__KEY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | folderId and R2 Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Refusal (400 unless another status is given)
    // ------------------------------------------------------------
    function na_refuse(error, status) {
        return { ok : false, status : status || 400, error : error };
    }
    // ------------------------------------------------------------


    // FUNCTION | Check the folderId Taken From a /projects/ URL
    // ------------------------------------------------------------
    // The rename pattern, plus three things a Windows folder cannot be either:
    // "." or "..", a name starting or ending with a space, a name ending with a
    // dot. No existing project is any of them.
    // ------------------------------------------------------------
    function na_validate_folder_id(folderId) {
        if (typeof folderId !== 'string' || !Na__PathGuards__FOLDER_ID_PATTERN.test(folderId)) {
            return na_refuse('folderId must be in the form "YYYY/Code__Name" and must not contain any of the characters < > : " / \\ | ? * or control characters in its folder name');
        }
        const folder = folderId.slice(5);                                        // <-- After "YYYY/"
        if (folder === '.' || folder === '..' || /^ | $|\.$/.test(folder)) {
            return na_refuse('folderId\'s folder name must not be "." or "..", start or end with a space, or end with a dot');
        }
        return { ok : true, folderId : folderId, year : folderId.slice(0, 4), folder : folder };
    }
    // ------------------------------------------------------------


    // FUNCTION | The R2 Prefix Every Key of One Project Starts With
    // ------------------------------------------------------------
    function na_project_r2_prefix(folderId) {
        return `${Na__PathGuards__PROJECTS_PREFIX}/${folderId}/`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The R2 Key of a Path Relative to the Project Folder
    // ------------------------------------------------------------
    function na_project_r2_key(folderId, relativePath) {
        return na_project_r2_prefix(folderId) + relativePath;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project-File Families
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What Is Wrong With a Relative Path, or null
    // ------------------------------------------------------------
    function na_check_relative_path(path, label) {
        const what = label || 'path';
        if (typeof path !== 'string' || path.length === 0) return `${what} must be a non-empty string`;
        if (path.length > Na__PathGuards__MAX_PATH_CHARS) return `${what} is longer than ${Na__PathGuards__MAX_PATH_CHARS} characters`;
        if (/[\x00-\x1F\x7F]/.test(path)) return `${what} must not contain control characters`;
        if (path.indexOf('\\') !== -1) return `${what} must use forward slashes only`;
        if (path.charAt(0) === '/') return `${what} must be relative to the project folder (no leading slash)`;
        const segments = path.split('/');
        for (const segment of segments) {
            if (segment === '') return `${what} must not contain an empty segment`;
            if (segment === '.' || segment === '..') return `${what} must not contain a "." or ".." segment`;
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Lower-Case Extension of a File Name
    // ------------------------------------------------------------
    function na_extension_of(name) {
        const dot = name.lastIndexOf('.');
        return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Family Guard With the Family's Defaults
    // ------------------------------------------------------------
    function na_file_guard(family, path, segments, overrides) {
        const extension = na_extension_of(segments[segments.length - 1]);
        const guard = {
            ok             : true,
            family         : family,
            label          : Na__PathGuards__FAMILIES[family].label,
            ops            : Na__PathGuards__FAMILIES[family].ops,
            path           : path,
            segments       : segments,
            extension      : extension,
            contentType    : Na__PathGuards__CONTENT_TYPES[extension] || 'application/octet-stream',
            cacheControl   : Na__PathGuards__CACHE_NO_CACHE,
            isJson         : extension === 'json',
            isText         : Na__PathGuards__TEXT_EXTENSIONS.indexOf(extension) !== -1,
            maxBytes       : Na__PathGuards__MAX_BYTES,
            streamed       : false,
            maxStreamBytes : 0,
            managed        : false,
            hashPrefix     : null,
            documentFolder : null
        };
        return Object.assign(guard, overrides || {});
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Family a Path Is In, and What May Be Done to It
    // ------------------------------------------------------------
    // Returns a guard { ok: true, family, ops, path, contentType, cacheControl,
    // maxBytes, streamed, managed, hashPrefix, documentFolder, ... } or a
    // refusal { ok: false, status, error }.
    // ------------------------------------------------------------
    function na_resolve_project_file(path) {
        const problem = na_check_relative_path(path, 'path');
        if (problem) return na_refuse(problem);

        const segments = path.split('/');
        const head     = segments[0];

        // F-SIB | Whole JSON documents beside project.json, listed by name
        if (segments.length === 1) {
            if (Na__PathGuards__SIBLING_FILES.indexOf(path) !== -1) return na_file_guard('F-SIB', path, segments);
            if (path === 'project.json') return na_refuse('project.json is written only by the save route and merge-keys, never through files');
            return na_refuse(`"${path}" is not a file the editor may touch beside project.json (only ${Na__PathGuards__SIBLING_FILES.join(' and ')})`);
        }

        // F-THUMB | Presentation scene thumbnails
        if (head === 'PresentationMode') {
            if (Na__PathGuards__THUMB_PATTERN.test(path)) return na_file_guard('F-THUMB', path, segments);
            return na_refuse(`"${path}" is not a scene thumbnail (PresentationMode/Thumbnails/<name>.webp or .png)`);
        }

        // F-ASSET | Baked linework and sheet snapshots
        if (head === 'LayoutEditor') {
            if (Na__PathGuards__ASSET_PATTERN.test(path)) return na_file_guard('F-ASSET', path, segments);
            return na_refuse(`"${path}" is not a Layout Editor asset (LayoutEditor/Linework or LayoutEditor/Snapshots, then <name>.webp, .png or .json)`);
        }

        // F-IMG | Sheet pictures, filed by document id
        if (head === Na__PathGuards__IMAGES_DIR) {
            if (segments.length !== 3) {
                return na_refuse(`"${path}" is not a sheet picture (${Na__PathGuards__IMAGES_DIR}/<document id>/<file>)`);
            }
            const folder = segments[1];
            const file   = segments[2];
            if (folder === Na__PathGuards__IMAGES_ARCHIVE) {
                return na_refuse(`"${path}" is in the local-only archive folder ${Na__PathGuards__IMAGES_ARCHIVE}`);
            }
            if (!Na__PathGuards__IMAGE_FOLDER.test(folder) || folder.indexOf('..') !== -1) {
                return na_refuse(`"${folder}" is not a sheet-picture document folder`);
            }
            if (!Na__PathGuards__IMAGE_FILE.test(file) || file.indexOf('..') !== -1) {
                return na_refuse(`"${file}" is not a sheet-picture file name (.webp, .jpg, .jpeg or .png)`);
            }
            const managed = Na__PathGuards__IMAGE_MANAGED.exec(file);
            return na_file_guard('F-IMG', path, segments, {
                cacheControl   : Na__PathGuards__CACHE_IMMUTABLE,
                managed        : !!managed,
                hashPrefix     : managed ? managed[1] : null,
                documentFolder : folder
            });
        }

        // F-PUB | Published documents
        if (head === Na__PathGuards__PUBLISHED_DIR) {
            const rest = segments.slice(1);
            if (rest.length > Na__PathGuards__PUBLISHED_MAX_SEGMENTS) {
                return na_refuse(`"${path}" is deeper than ${Na__PathGuards__PUBLISHED_MAX_SEGMENTS} segments below ${Na__PathGuards__PUBLISHED_DIR}`);
            }
            if (rest[0] === Na__PathGuards__PUBLISHED_ARCHIVE) {
                return na_refuse(`"${path}" is in the local-only revisions archive ${Na__PathGuards__PUBLISHED_ARCHIVE}`);
            }
            for (const segment of rest) {
                if (!Na__PathGuards__PUBLISHED_SEGMENT.test(segment)) return na_refuse(`"${segment}" is not a published-document path segment`);
            }
            const last = rest[rest.length - 1];
            if (!Na__PathGuards__PUBLISHED_FILE.test(last)) {
                return na_refuse(`"${last}" is not a published file (.json, .svg, .webp, .png, .pdf or .md)`);
            }
            const hashed = Na__PathGuards__PUBLISHED_HASHED.test(last);
            return na_file_guard('F-PUB', path, segments, {
                cacheControl   : hashed ? Na__PathGuards__CACHE_IMMUTABLE : Na__PathGuards__CACHE_MUTABLE_60,
                hashed         : hashed,
                streamed       : Na__PathGuards__PUBLISHED_STREAMED.indexOf(na_extension_of(last)) !== -1,
                maxStreamBytes : Na__PathGuards__MAX_STREAM_BYTES,
                documentFolder : rest.length >= 2 ? rest[0] : null
            });
        }

        // F-STMT | Statements
        if (head === Na__PathGuards__STATEMENTS_DIR) {
            const rest = segments.slice(1);
            if (rest.length > Na__PathGuards__STATEMENT_MAX_SEGMENTS) {
                return na_refuse(`"${path}" is deeper than ${Na__PathGuards__STATEMENT_MAX_SEGMENTS} segments below ${Na__PathGuards__STATEMENTS_DIR}`);
            }
            if (Na__PathGuards__STATEMENT_LOCAL_ONLY.test(rest[0])) {
                return na_refuse(`"${path}" is in a local-only statements folder (00__Archive or 00__Deleted)`);
            }
            for (const segment of rest) {
                if (!Na__PathGuards__STATEMENT_SEGMENT.test(segment)) return na_refuse(`"${segment}" is not a statement path segment`);
            }
            const last = rest[rest.length - 1];
            if (!Na__PathGuards__STATEMENT_FILE.test(last)) {
                return na_refuse(`"${last}" is not a statement file (.md, .html, .json, .txt or a picture)`);
            }
            return na_file_guard('F-STMT', path, segments);
        }

        return na_refuse(`"${path}" is in no project-file family the editor may touch`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Family Allows an Operation
    // ------------------------------------------------------------
    function na_family_allows(guard, operation) {
        return !!(guard && guard.ok && guard.ops.indexOf(operation) !== -1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Family a List Prefix Is the Root (or a Folder) of
    // ------------------------------------------------------------
    // Only the three folder families can be listed, at their root or at a
    // folder inside them, and the prefix must end in "/".
    // ------------------------------------------------------------
    function na_resolve_list_prefix(prefix) {
        if (typeof prefix !== 'string' || prefix.length < 2 || prefix.charAt(prefix.length - 1) !== '/') {
            return na_refuse(`prefix must be a folder ending in "/": ${Na__PathGuards__IMAGES_DIR}/, ${Na__PathGuards__PUBLISHED_DIR}/ or ${Na__PathGuards__STATEMENTS_DIR}/, or a folder inside one`);
        }
        const folders = prefix.slice(0, -1);
        const problem = na_check_relative_path(folders, 'prefix');
        if (problem) return na_refuse(problem);

        const segments = folders.split('/');
        const head     = segments[0];
        const rest     = segments.slice(1);

        if (head === Na__PathGuards__IMAGES_DIR) {
            if (rest.length > 1) return na_refuse('Sheet pictures are filed one folder deep');
            if (rest.length === 1 && (rest[0] === Na__PathGuards__IMAGES_ARCHIVE || !Na__PathGuards__IMAGE_FOLDER.test(rest[0]) || rest[0].indexOf('..') !== -1)) {
                return na_refuse(`"${rest[0]}" is not a sheet-picture document folder that can be listed`);
            }
            return { ok : true, family : 'F-IMG', prefix : prefix };
        }

        if (head === Na__PathGuards__PUBLISHED_DIR) {
            if (rest.length > Na__PathGuards__PUBLISHED_MAX_SEGMENTS - 1) return na_refuse('That published folder is deeper than any published file');
            if (rest.length > 0 && rest[0] === Na__PathGuards__PUBLISHED_ARCHIVE) return na_refuse(`${Na__PathGuards__PUBLISHED_ARCHIVE} is local only`);
            for (const segment of rest) {
                if (!Na__PathGuards__PUBLISHED_SEGMENT.test(segment)) return na_refuse(`"${segment}" is not a published-document folder`);
            }
            return { ok : true, family : 'F-PUB', prefix : prefix };
        }

        if (head === Na__PathGuards__STATEMENTS_DIR) {
            if (rest.length > Na__PathGuards__STATEMENT_MAX_SEGMENTS - 1) return na_refuse('That statements folder is deeper than any statement file');
            if (rest.length > 0 && Na__PathGuards__STATEMENT_LOCAL_ONLY.test(rest[0])) return na_refuse('00__Archive and 00__Deleted statement folders are local only');
            for (const segment of rest) {
                if (!Na__PathGuards__STATEMENT_SEGMENT.test(segment)) return na_refuse(`"${segment}" is not a statements folder`);
            }
            return { ok : true, family : 'F-STMT', prefix : prefix };
        }

        return na_refuse(`"${prefix}" cannot be listed: only the sheet-picture, published-document and statement folders can`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet-Picture Check (type and content hash)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Picture Type the Bytes Actually Are, or null
    // ------------------------------------------------------------
    function na_sniff_picture(bytes) {
        if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
            && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';   // <-- RIFF....WEBP
        if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
            && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) return 'png';      // <-- \x89PNG\r\n\x1a\n
        if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpg';       // <-- JPEG SOI marker
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Refuse a Sheet Picture Whose Bytes Do Not Match Its Name
    // ------------------------------------------------------------
    // The name must be managed, the bytes must be the picture type the
    // extension says, and the first ten hex digits of their SHA-256 must be
    // the ones in the name. Any other family passes untouched.
    // ------------------------------------------------------------
    async function na_check_sheet_picture(guard, bytes) {
        if (!guard || guard.family !== 'F-IMG') return { ok : true };
        if (!guard.managed) {
            return na_refuse(`"${guard.path}" is not a managed sheet-picture name (<name>__<first ten hex digits of its SHA-256>.webp, .jpg or .png)`);
        }
        const kind = na_sniff_picture(bytes);
        if (!kind) return na_refuse('Those bytes are not a WebP, PNG or JPEG picture');
        if (kind !== guard.extension) return na_refuse(`The picture is a ${kind.toUpperCase()} but is named .${guard.extension}`);
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
        let hex = '';
        for (let i = 0; i < digest.length; i++) hex += digest[i].toString(16).padStart(2, '0');
        if (hex.slice(0, 10) !== guard.hashPrefix) return na_refuse('The bytes do not match the hash in the picture\'s name');
        return { ok : true, sha256 : hex };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Editor-Owned project.json Keys
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Key Guard From an Editor-Owned Key List
    // ------------------------------------------------------------
    // Refuses (ok: false) a list that is missing, empty, holds a malformed or
    // repeated name, or names a pipeline key or the legacy remove-only key -
    // the same refusals the sync tools make of the same list.
    // ------------------------------------------------------------
    function na_build_editor_key_guard(keyList) {
        const refused = (error) => ({ ok : false, error : error, keys : Object.freeze([]), setAllowed : new Set(), removeAllowed : new Set() });
        if (!Array.isArray(keyList) || keyList.length === 0) {
            return refused('ProjectData__EditorOwnedKeys__Keys is missing or empty in the ValeVision app config');
        }
        const seen = new Set();
        for (const key of keyList) {
            if (typeof key !== 'string' || !Na__PathGuards__KEY_NAME_PATTERN.test(key)) {
                return refused(`ProjectData__EditorOwnedKeys__Keys holds a malformed key name: ${JSON.stringify(key)}`);
            }
            if (seen.has(key)) return refused(`ProjectData__EditorOwnedKeys__Keys lists ${key} twice`);
            if (Na__PathGuards__PIPELINE_KEYS.indexOf(key) !== -1) return refused(`ProjectData__EditorOwnedKeys__Keys names the pipeline key ${key}`);
            if (Na__PathGuards__REMOVE_ONLY_KEYS.indexOf(key) !== -1) return refused(`ProjectData__EditorOwnedKeys__Keys names the legacy remove-only key ${key}`);
            seen.add(key);
        }
        const keys = Object.freeze(keyList.slice());
        return {
            ok            : true,
            error         : null,
            keys          : keys,
            setAllowed    : new Set(keys),
            removeAllowed : new Set(keys.concat(Na__PathGuards__REMOVE_ONLY_KEYS))
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Key List Inside an App Config Object
    // ------------------------------------------------------------
    function na_config_editor_key_list(config) {
        const block = (config && typeof config === 'object') ? config.ProjectData__EditorOwnedKeys : null;
        return (block && typeof block === 'object') ? block.ProjectData__EditorOwnedKeys__Keys : undefined;
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Guard Built From ValeVision's App Config
    // ------------------------------------------------------------
    const Na__PathGuards__EDITOR_KEY_GUARD = na_build_editor_key_guard(na_config_editor_key_list(Na__ValeVisionAppConfig));
    // ------------------------------------------------------------


    // FUNCTION | The Guard merge-keys Uses
    // ------------------------------------------------------------
    function na_editor_key_guard() {
        return Na__PathGuards__EDITOR_KEY_GUARD;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Editor-Owned Keys, as Bundled
    // ------------------------------------------------------------
    function na_editor_owned_keys() {
        return Na__PathGuards__EDITOR_KEY_GUARD.keys;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Why a Key Is Refused
    // ------------------------------------------------------------
    function na_key_refusal_reason(key, operation) {
        if (Na__PathGuards__PIPELINE_KEYS.indexOf(key) !== -1) return 'pipeline-owned: written only by the SketchUp sync and the project editor';
        if (operation === 'set' && Na__PathGuards__REMOVE_ONLY_KEYS.indexOf(key) !== -1) return 'legacy key: it may be removed, never set';
        return 'not on ProjectData__EditorOwnedKeys';
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Every Key a Merge Would Set or Remove
    // ------------------------------------------------------------
    // Returns { ok: true } or { ok: false, status, error, refused: [{ key, op, reason }] }.
    // A guard that could not be built refuses everything with a 500.
    // ------------------------------------------------------------
    function na_check_merge_keys(setKeys, removeKeys, guard) {
        const active = guard || Na__PathGuards__EDITOR_KEY_GUARD;
        if (!active.ok) {
            return { ok : false, status : 500, error : `Merge refused: ${active.error}`, refused : [] };
        }
        const refused = [];
        for (const key of setKeys) {
            if (!active.setAllowed.has(key)) refused.push({ key : key, op : 'set', reason : na_key_refusal_reason(key, 'set') });
        }
        for (const key of removeKeys) {
            if (!active.removeAllowed.has(key)) refused.push({ key : key, op : 'remove', reason : na_key_refusal_reason(key, 'remove') });
        }
        if (refused.length > 0) {
            return {
                ok      : false,
                status  : 400,
                error   : `Refused key(s): ${refused.map((one) => one.key).join(', ')} - merge-keys sets and removes only the editor-owned keys (ProjectData__EditorOwnedKeys)`,
                refused : refused
            };
        }
        return { ok : true };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shared Path Guards Helper API
    // ------------------------------------------------------------
    export {
        Na__PathGuards__PROJECTS_PREFIX,
        Na__PathGuards__FAMILIES,
        Na__PathGuards__SIBLING_FILES,
        Na__PathGuards__PIPELINE_KEYS,
        Na__PathGuards__REMOVE_ONLY_KEYS,
        Na__PathGuards__CACHE_NO_CACHE,
        Na__PathGuards__CACHE_IMMUTABLE,
        Na__PathGuards__CACHE_MUTABLE_60,
        Na__PathGuards__MAX_BYTES,
        Na__PathGuards__MAX_STREAM_BYTES,
        na_validate_folder_id,
        na_project_r2_prefix,
        na_project_r2_key,
        na_check_relative_path,
        na_resolve_project_file,
        na_resolve_list_prefix,
        na_family_allows,
        na_sniff_picture,
        na_check_sheet_picture,
        na_build_editor_key_guard,
        na_editor_key_guard,
        na_editor_owned_keys,
        na_check_merge_keys
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
