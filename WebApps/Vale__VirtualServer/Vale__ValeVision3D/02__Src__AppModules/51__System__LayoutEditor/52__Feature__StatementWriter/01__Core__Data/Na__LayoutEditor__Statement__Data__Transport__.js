// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - STATEMENT DATA - TRANSPORT
// =============================================================================
//
// FILE       : Na__LayoutEditor__Statement__Data__Transport__.js
// NAMESPACE  : Na__LeStmtIo
// MODULE     : Layout Editor - Statement Writer - Transport
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read and write the statement index and the statements themselves, on R2 and on disk
// CREATED    : 20-Sep-2026
//
// DESCRIPTION:
// - TWO KINDS OF THING TRAVEL. The index is one small JSON beside the project
//   data and goes through the sibling-file routes every other ValeVision
//   document uses. A statement is a markdown file inside a folder and goes
//   through the statement routes, which were added for it.
// - WHERE A STATEMENT IS READ FROM, and why in that order:
//     localhost       the copy in the project folder FIRST, because that is
//                     the file Adam edits in Typora and it is the one that is
//                     ahead. R2 is read too, and a cloud copy stamped later
//                     than the local one is offered rather than taken.
//     the web         the CDN copy, which is what Publish put there. Nothing
//                     else exists for a visitor, and nothing else should.
// - WHERE IT IS WRITTEN. Typing writes the local file, quietly and often:
//   that copy is a mirror and costs nothing. R2 is written only by Publish,
//   which is the moment a statement becomes something a client can open.
//   The index follows the statement - a local write on every change, R2 on
//   Publish - so the two can never disagree about which file is the statement.
// - A COPY THAT COULD NOT BE READ IS NOT AN EMPTY STATEMENT. Every read says
//   whether it failed or found nothing, and the two are answered differently:
//   a failure leaves the tab saying so and refuses to publish, where finding
//   nothing offers to start a statement.
// - RELATIVE PICTURE LINKS ARE RESOLVED AT DISPLAY TIME, not rewritten in the
//   file. A statement written in Typora points at ./02_.../x.png, which is
//   right on disk and wrong everywhere else. ImageBase answers the folder
//   those links should hang off for the session that is reading - the project
//   folder on localhost, the CDN on the web - so the same markdown renders
//   correctly in both without being edited for either.
//
// INTEGRATION:
// - Imports the Cloudflare API client, the local project mirror, the config,
//   the project code, the environment and the authoring gate.
// - Imported by Na__LayoutEditor__Statement__Data__, which is what every
//   other module talks to.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js
// - Source version: 1.1.0 (TrueVision3D v2.157.0, 23-Sep-2026; 1.0.0 v2.95.0; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-06}}, inert (the Statement Writer lands
//                   switched off, K1 DR-10; only Na__LayoutEditor__Statement__Data__ imports it)
// - Parity        : adapted
// - Divergences   :
//   - Banner reads ValeVision3D, and DESCRIPTION names this app's documents. (No console output
//     in this file.)
//   - TRANSPORT (K1 DR-27 (A), D-S07b-10 (a)): the Na__CfApi__* and Na__LocalMirror__* names are
//     ValeVision's facade at TrueVision's paths (W0-12) - the statement folder
//     <project>/10__StatementDocs, the index ValeVision__StatementDocs__.json beside project.json,
//     and the ValeVision Gallery server's /api/valevision/statements and
//     /api/projects/<folderId>/files routes (W0-19) - never TrueVision's client. Every read and
//     every local write is TrueVision's body.
//   - ONE STORE (06-Oct-2026): the project folder is on the ValeVision 3D server, so the local writes
//     (Na__LocalMirror__, the statement routes) ARE the published copy. WriteIndexCloud and
//     WriteStatementCloud keep TrueVision's names, parameters and result shape and answer
//     { ok : true, skipped : true }: there is no second copy to write.
//   - A missing file reads as missing, never as an index page: a repository URL is answered by
//     server.py's /ValeVisionGallery/<path> route, a JSON 404 when nothing is there (R6 F.8 C30),
//     and the file it sends carries Last-Modified, which FetchText hands on as modifiedIso.
// - Back-port     : none (the facade is the seam).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 23-Sep-2026 - Version 1.1.0
// - Every read of a statement now carries the file's own date: FetchText
//   answers modifiedIso from the server's Last-Modified header ('' when there
//   is none), and ReadStatement passes it on for the copy in the project
//   folder. It is what the lockstep question shows beside each copy.
// - ReadStatementLocal: the file in the project folder and nothing else, for
//   the lockstep watch. Off localhost it answers skipped - there is no file
//   there to watch.
//
// 20-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Environment, Cloudflare and the Local Mirror
    // ------------------------------------------------------------
    import { Na__LeCfg__GetStatementSetup } from '../../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import {
        Na__CfApi__IsConfigured,
        Na__CfApi__ProjectFileLocation,
        Na__CfApi__ReadProjectFile,
        Na__CfApi__StatementFileLocation,
        Na__CfApi__ReadStatementFile
    } from '../../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
    // @delegate: ../../../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js
    import {
        Na__LocalMirror__WriteSiblingFile,
        Na__LocalMirror__StatementTree,
        Na__LocalMirror__WriteStatementFile,
        Na__LocalMirror__MakeStatementFolder,
        Na__LocalMirror__MoveStatement,
        Na__LocalMirror__DeleteStatement
    } from '../../../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js';
    import { Na__LeStmtLock__FromHttpDate } from './Na__LayoutEditor__Statement__Lockstep__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | One Copy (the server)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Project Folder Is on the Server (06-Oct-2026)
    // ------------------------------------------------------------
    // The statements folder lives in the project's drawings folder on the
    // ValeVision 3D server, written through the statement routes (the "local"
    // writes below, Na__LocalMirror__) and read through the API's userdata
    // route, so a markdown file's relative picture links resolve. The local
    // branches are the ones that run, everywhere; there is no CDN copy.
    // ------------------------------------------------------------
    const Na__LeStmtIo__PROJECT_FOLDER_HERE = true;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | May This Session Read and Write the Cloud Copy Directly
    // ------------------------------------------------------------
    // A signed-in author with a project (Na__CfApi__IsConfigured): the
    // server is the cloud copy.
    // ------------------------------------------------------------
    function Na__LeStmtIo__UsesWorker() {
        return Na__CfApi__IsConfigured();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve After a Time Limit, Whatever the Promise Does
    // ------------------------------------------------------------
    function Na__LeStmtIo__WithTimeout(promise, ms) {
        return Promise.race([
            Promise.resolve(promise).catch((error) => ({ ok : false, error : (error && error.message) || 'error' })),
            new Promise((resolve) => { window.setTimeout(() => resolve({ ok : false, error : 'timed out' }), ms); })
        ]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch a File as Text: { ok, text, missing, modifiedIso, error }
    // ------------------------------------------------------------
    // modifiedIso is the server's Last-Modified for the file, or '' when the
    // server did not say. It explains; it never decides.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__FetchText(url) {
        try {
            const response = await fetch(url, { cache : 'no-store' });
            if (response.status === 404 || response.status === 403) return { ok : true, text : null, missing : true };
            if (!response.ok) return { ok : false, text : null, missing : false, error : 'HTTP ' + response.status };
            const modifiedIso = Na__LeStmtLock__FromHttpDate(response.headers.get('Last-Modified'));
            return { ok : true, text : await response.text(), missing : false, modifiedIso : modifiedIso };
        } catch (error) {
            return { ok : false, text : null, missing : false, error : (error && error.message) || 'unreachable' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch a File as JSON: { ok, data, missing, error }
    // ------------------------------------------------------------
    async function Na__LeStmtIo__FetchJson(url) {
        const read = await Na__LeStmtIo__FetchText(url);
        if (!read.ok || read.missing) return { ok : read.ok, data : null, missing : read.missing === true, error : read.error };
        try {
            const data = JSON.parse(read.text);
            return { ok : true, data : (data && typeof data === 'object') ? data : null, missing : false };
        } catch (error) {
            return { ok : false, data : null, missing : false, error : 'not JSON' };
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | A Statement's Path Inside the Statements Folder
    // ------------------------------------------------------------
    function Na__LeStmtIo__PathOf(record) {
        if (!record || !record.Doc__Folder || !record.Doc__File) return null;
        return record.Doc__Folder + '/' + record.Doc__File;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Index
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Statement Index
    // ------------------------------------------------------------
    // Resolves to { status, data, source, error } where status is 'ready',
    // 'new' or 'failed'. A local copy stamped later than the cloud one is
    // adopted, so an index another session wrote on this machine reaches the
    // tab without a hard refresh.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__ReadIndex() {
        const setup    = Na__LeCfg__GetStatementSetup();
        const location = Na__CfApi__ProjectFileLocation(setup.indexFileName);
        if (!location) return { status : 'failed', data : null, source : null, error : 'no project folder in the URL' };

        const local = Na__LeStmtIo__PROJECT_FOLDER_HERE
            ? await Na__LeStmtIo__FetchJson(location.repoUrl)
            : { ok : true, data : null, missing : true };

        if (Na__LeStmtIo__UsesWorker()) {
            const read = await Na__LeStmtIo__WithTimeout(Na__CfApi__ReadProjectFile(setup.indexFileName), setup.loadTimeoutMs);
            if (read && read.ok) {
                const cloud = (!read.missing && read.data && typeof read.data === 'object') ? read.data : null;
                return Na__LeStmtIo__Reconcile(cloud, local.ok ? local.data : null);
            }
            if (local.ok && local.data) return { status : 'ready', data : local.data, source : 'repository', cloudMissing : true };
            return { status : 'failed', data : null, source : null, error : (read && read.error) || 'The ValeVision 3D server did not answer' };
        }

        const cdn = await Na__LeStmtIo__FetchJson(location.cdnUrl);
        if (cdn.ok && cdn.data)     return { status : 'ready', data : cdn.data, source : 'cdn' };
        if (cdn.ok && cdn.missing)  return { status : 'new',   data : null,     source : 'cdn' };
        return { status : 'failed', data : null, source : null, error : cdn.error || 'CDN unreachable' };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Decide Between the Cloud Index and the Local One
    // ------------------------------------------------------------
    function Na__LeStmtIo__Reconcile(cloud, localCopy) {
        const cloudStamp = (cloud && typeof cloud.Statement__UpdatedIso === 'string') ? cloud.Statement__UpdatedIso : '';
        const localStamp = (localCopy && typeof localCopy.Statement__UpdatedIso === 'string') ? localCopy.Statement__UpdatedIso : '';

        if (!cloud && !localCopy) return { status : 'new', data : null, source : 'cloud', cloudMissing : true };
        if (cloud && !localCopy)  return { status : 'ready', data : cloud, source : 'cloud', seedLocal : true };
        if (!cloud && localCopy)  return { status : 'ready', data : localCopy, source : 'repository', cloudMissing : true };

        if (localStamp && cloudStamp && localStamp > cloudStamp) {
            return { status : 'ready', data : localCopy, source : 'repository', localAhead : true, cloudContent : cloud };
        }
        return { status : 'ready', data : cloud, source : 'cloud', seedLocal : true };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Index to Disk
    // ------------------------------------------------------------
    // Quiet and frequent: the local copy follows every change to the index so
    // that a crash, or a switch to Typora, never loses which file is which.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__WriteIndexLocal(document) {
        const setup = Na__LeCfg__GetStatementSetup();
        return Na__LocalMirror__WriteSiblingFile(setup.indexFileName, document);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Index to R2
    // ------------------------------------------------------------
    async function Na__LeStmtIo__WriteIndexCloud(document) {
        // ONE STORE: the index written by WriteIndexLocal is already the
        // copy on the server.
        void document;
        return { ok : true, skipped : true, error : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Cloud Index Fresh, for the Overwrite Question
    // ------------------------------------------------------------
    async function Na__LeStmtIo__ReadIndexCloud() {
        const setup = Na__LeCfg__GetStatementSetup();
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : 'Sign in as an app admin to publish.' };
        return Na__LeStmtIo__WithTimeout(Na__CfApi__ReadProjectFile(setup.indexFileName), setup.loadTimeoutMs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Statements Themselves
// -----------------------------------------------------------------------------

    // FUNCTION | Read One Statement's Markdown
    // ------------------------------------------------------------
    // Resolves to { ok, text, source, missing, error }. On localhost the file
    // in the project folder is read first - it is the one being edited in
    // Typora - and the cloud copy is only reached for if there is no local one.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__ReadStatement(record) {
        const path = Na__LeStmtIo__PathOf(record);
        if (!path) return { ok : false, text : null, error : 'that statement has no file' };

        const location = Na__CfApi__StatementFileLocation(path);
        if (!location) return { ok : false, text : null, error : `refused statement path "${path}"` };

        if (Na__LeStmtIo__PROJECT_FOLDER_HERE) {
            const local = await Na__LeStmtIo__FetchText(location.repoUrl);
            if (local.ok && !local.missing && typeof local.text === 'string') {
                return { ok : true, text : local.text, source : 'repository', missing : false, modifiedIso : local.modifiedIso || '' };
            }
        }

        if (Na__LeStmtIo__UsesWorker()) {
            const read = await Na__LeStmtIo__WithTimeout(Na__CfApi__ReadStatementFile(path), Na__LeCfg__GetStatementSetup().loadTimeoutMs);
            if (read && read.ok && typeof read.text === 'string') return { ok : true, text : read.text, source : 'cloud', missing : false };
            if (read && read.ok && read.missing) return { ok : true, text : null, source : 'cloud', missing : true };
        }

        const cdn = await Na__LeStmtIo__FetchText(location.cdnUrl);
        if (cdn.ok && !cdn.missing) return { ok : true, text : cdn.text, source : 'cdn', missing : false };
        if (cdn.ok && cdn.missing)  return { ok : true, text : null, source : 'cdn', missing : true };
        return { ok : false, text : null, source : null, error : cdn.error || 'could not be read' };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the File in the Project Folder, and Nothing Else
    // ------------------------------------------------------------
    // For the lockstep watch: the one copy that Typora and agents edit behind
    // the app's back. Resolves to { ok, text, missing, modifiedIso, error }, or
    // { ok : false, skipped : true } off localhost, where there is no file to
    // watch. Never falls back to the cloud: a copy that could not be read here
    // is simply not looked at this time.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__ReadStatementLocal(record) {
        if (!Na__LeStmtIo__PROJECT_FOLDER_HERE) return { ok : false, skipped : true, text : null };
        const path = Na__LeStmtIo__PathOf(record);
        if (!path) return { ok : false, text : null, error : 'that statement has no file' };
        const location = Na__CfApi__StatementFileLocation(path);
        if (!location) return { ok : false, text : null, error : `refused statement path "${path}"` };
        return Na__LeStmtIo__FetchText(location.repoUrl);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One Statement's Markdown to Disk
    // ------------------------------------------------------------
    async function Na__LeStmtIo__WriteStatementLocal(record, text) {
        const path = Na__LeStmtIo__PathOf(record);
        if (!path) return { ok : false, skipped : false, error : 'that statement has no file' };
        return Na__LocalMirror__WriteStatementFile(path, text);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One Statement's Markdown to R2
    // ------------------------------------------------------------
    async function Na__LeStmtIo__WriteStatementCloud(record, text) {
        const path = Na__LeStmtIo__PathOf(record);
        if (!path) return { ok : false, error : 'that statement has no file' };
        // ONE STORE. The markdown written to the project folder
        // (WriteStatementLocal) is already the copy on the server; there is
        // no second, published copy to write.
        void text;
        return { ok : true, skipped : true, error : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Statement's Relative Picture Links Hang Off
    // ------------------------------------------------------------
    // The folder the statement is in, as an absolute URL for THIS session: the
    // project folder beside the app on localhost, the CDN everywhere else. A
    // link in the markdown stays relative; only what it is resolved against
    // changes, which is why the same file renders correctly in Typora, in the
    // app on this machine, and on a client's phone.
    // ------------------------------------------------------------
    function Na__LeStmtIo__ImageBase(record) {
        const path = Na__LeStmtIo__PathOf(record);
        if (!path) return null;
        const location = Na__CfApi__StatementFileLocation(path);
        if (!location) return null;
        const base = Na__LeStmtIo__PROJECT_FOLDER_HERE ? location.repoUrl : location.cdnUrl;
        return base.slice(0, base.lastIndexOf('/') + 1);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Folder
// -----------------------------------------------------------------------------

    // FUNCTION | Everything on Disk Under the Statements Folder
    // ------------------------------------------------------------
    // Off localhost this answers skipped and the caller works from the index
    // alone, which is all a reader needs.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__Tree() {
        return Na__LocalMirror__StatementTree();
    }
    // ------------------------------------------------------------


    // FUNCTION | Make a New Statement's Folders on Disk
    // ------------------------------------------------------------
    // The statement folder and the pictures folder inside it, so a new
    // statement has somewhere to put a dropped image from the first minute.
    // ------------------------------------------------------------
    async function Na__LeStmtIo__MakeFolders(folderName) {
        const setup = Na__LeCfg__GetStatementSetup();
        const first = await Na__LocalMirror__MakeStatementFolder(folderName);
        if (!first.ok) return first;
        return Na__LocalMirror__MakeStatementFolder(folderName + '/' + setup.imagesFolderName);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move or Rename Something Inside the Statements Folder
    // ------------------------------------------------------------
    async function Na__LeStmtIo__Move(fromPath, toPath) {
        return Na__LocalMirror__MoveStatement(fromPath, toPath);
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Statement Folder From Disk
    // ------------------------------------------------------------
    async function Na__LeStmtIo__DeleteFolder(folderName) {
        return Na__LocalMirror__DeleteStatement(folderName);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Statement Transport API
    // ------------------------------------------------------------
    export {
        Na__LeStmtIo__UsesWorker,
        Na__LeStmtIo__PathOf,
        Na__LeStmtIo__ReadIndex,
        Na__LeStmtIo__ReadIndexCloud,
        Na__LeStmtIo__WriteIndexLocal,
        Na__LeStmtIo__WriteIndexCloud,
        Na__LeStmtIo__ReadStatement,
        Na__LeStmtIo__ReadStatementLocal,
        Na__LeStmtIo__WriteStatementLocal,
        Na__LeStmtIo__WriteStatementCloud,
        Na__LeStmtIo__ImageBase,
        Na__LeStmtIo__Tree,
        Na__LeStmtIo__MakeFolders,
        Na__LeStmtIo__Move,
        Na__LeStmtIo__DeleteFolder
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
