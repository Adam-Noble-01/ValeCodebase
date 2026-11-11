// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - LAYOUT STORE (THE JOB'S SAVED LAYOUTS)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__LayoutStore__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Layout Store
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The job's saved layouts on the server (list, open, save, delete),
//              and a layout as the page builds it and puts it back on the sheet
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE SERVER KEEPS THEM (ValeVision3D__Api__PageLayouts__.py): one data file per job,
//   <project>/ValeVision3D/UserData__UserGeneratedContent__Images/ValeVision__PageLayouts__.json,
//   with each layout's picture and a thumbnail of the sheet beside it. The server
//   stamps who made each layout and who changed it last; the page never sends them.
// - A LAYOUT IS: its name, the sheet, the picture's place and trims (mm), the
//   composition guide, the settings the picture was rendered at, and the view it
//   was rendered from (so it re-renders the same next week).
// - SAVING sends the picture only when the server does not have it already (a new
//   layout, Save as New, or a re-render since it was opened), and a fresh
//   thumbnail every time. It names the layout's Rev: if someone saved it since,
//   the server refuses with 409 and the menu says who.
// - OPENING fetches the picture as a blob (the page keeps it, so Save as New can
//   send it on), then puts everything back on the sheet.
// - AN EXPORT IS A SAVE WITH AN ISSUE (v2.94.0, Adam: "a version should always be saved
//   when exported"): Save takes options.issue { kind, fileName } and the server keeps
//   the layout as a numbered version (or adds the export to the last one when nothing
//   changed). The answer's version is the one the PDF belongs to.
// - A VERSION OPENS AS IT WAS EXPORTED (OpenVersion): its frozen blocks and its own
//   picture go on the sheet. The open layout stays the saved one, so Save Changes
//   makes that version the current drawing; until then the page shows which version
//   it is (state.layout.version) and counts as changed unless it is the current one.
// - A RECOVERY COPY GOES BACK ON THE SHEET the same way (Recover), unsaved.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.1.0 (ValeVision3D v2.94.0)
// - Save sends options.issue (the export's kind and file name); the answer says
//   whether nothing had changed (unchanged) and which version the export is.
// - OpenVersion: a version as exported, back on the sheet (state.layout.version).
// - Recover: a recovery copy kept on this computer, back on the sheet, unsaved.
// - PutOnSheet: the one routine Open, OpenVersion and Recover share.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the side menu (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The API, the Sheet, the Guide, Page Events
    // ------------------------------------------------------------
    import { Na__PageLayout__ApiUrl, Na__PageLayout__ApiFetch, Na__PageLayout__SetSaveLevel } from './Na__PageLayoutSystem__UserSession__.js';
    import { Na__PageLayout__DrawImageLayer } from './Na__PageLayoutSystem__CanvasRenderPipeline__.js';
    import { Na__PageLayout__Guide__Serialize, Na__PageLayout__Guide__Apply } from './Na__PageLayoutSystem__CompositionGuide__.js';
    import {
        Na__PageLayout__LoadImageFromBlob,
        Na__PageLayout__SetImage,
        Na__PageLayout__FitImageInDrawingArea,
        Na__PageLayout__FitPageToView
    } from './Na__PageLayoutSystem__SystemLogic__Main__.js';
    import { Na__PageLayout__Emit } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Save Settings
    // ------------------------------------------------------------
    const Na__PageLayout__Store__FALLBACK_NAME          = 'Drawing Layout';
    const Na__PageLayout__Store__FALLBACK_THUMB_WIDTH   = 480;
    const Na__PageLayout__Store__FALLBACK_THUMB_TYPE    = 'image/webp';     // <-- Safari makes a PNG instead; the server takes either
    const Na__PageLayout__Store__FALLBACK_THUMB_QUALITY = 0.85;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Saving Config From State
    // ------------------------------------------------------------
    function Na__PageLayout__Store__ResolveConfig(state) {
        const section = (state && state.config) ? state.config['PageLayout__SavedLayouts__Config'] : null;
        const P       = 'PageLayout__SavedLayouts__Config__';
        const has     = (key, type) => section && typeof section[P + key] === type;
        return {
            defaultName  : has('DefaultName', 'string')       ? section[P + 'DefaultName']       : Na__PageLayout__Store__FALLBACK_NAME,
            thumbWidth   : has('ThumbnailWidthPx', 'number')  ? section[P + 'ThumbnailWidthPx']  : Na__PageLayout__Store__FALLBACK_THUMB_WIDTH,
            thumbType    : has('ThumbnailType', 'string')     ? section[P + 'ThumbnailType']     : Na__PageLayout__Store__FALLBACK_THUMB_TYPE,
            thumbQuality : has('ThumbnailQuality', 'number')  ? section[P + 'ThumbnailQuality']  : Na__PageLayout__Store__FALLBACK_THUMB_QUALITY
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Job's Page Layouts Route ('projects/64135__Holt/page-layouts')
    // ------------------------------------------------------------
    function Na__PageLayout__Store__Route(state, tail) {
        const id = String((state.project && state.project.id) || '').split('/').map(encodeURIComponent).join('/');
        return Na__PageLayout__ApiUrl(`projects/${id}/page-layouts${tail || ''}`);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Refusal From the API as an Error Carrying Its Details
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__Refusal(response, fallback) {
        const answer = await response.json().catch(() => ({}));
        const reason = response.status === 401
            ? 'Sign in to use saved layouts'
            : (answer.error || `${fallback} (HTTP ${response.status})`);
        const error    = new Error(reason);
        error.status   = response.status;
        error.conflict = answer.conflict === true;
        error.missing  = answer.missing === true;
        error.current  = answer.current || null;
        return error;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Round to Thousandths of a mm (What the File Needs to Keep)
    // ------------------------------------------------------------
    function Na__PageLayout__Store__Mm(value) {
        return Math.round((Number(value) || 0) * 1000) / 1000;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Path the API Answered (Relative to api/) as a Full Address
    // ------------------------------------------------------------
    function Na__PageLayout__Store__FileUrl(relative) {
        return relative ? Na__PageLayout__ApiUrl(relative) : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Layout as the Page Builds It
// -----------------------------------------------------------------------------

    // FUNCTION | The Layout's Record, Ready to Send (the Server Adds Its Own Stamps)
    // ------------------------------------------------------------
    function Na__PageLayout__Store__BuildRecord(state, asNew) {
        const cfg    = Na__PageLayout__Store__ResolveConfig(state);
        const record = state.layout.record;
        const it     = state.imageTransform;
        const area   = state.drawingArea;
        const name   = String(state.layout.name || '').trim() || cfg.defaultName;

        const layout = {
            PageLayouts__Layout__Name          : name,
            PageLayouts__Layout__ImageWidthPx  : state.sourceImageMeta.width  || null,
            PageLayouts__Layout__ImageHeightPx : state.sourceImageMeta.height || null,
            PageLayouts__Layout__Sheet         : {
                Sheet__Format              : state.document.format,
                Sheet__WidthMm             : state.a3.widthMm,
                Sheet__HeightMm            : state.a3.heightMm,
                Sheet__TitleBlock          : state.document.titleBlockPath,
                Sheet__DrawingAreaXMm      : area.x,
                Sheet__DrawingAreaYMm      : area.y,
                Sheet__DrawingAreaWidthMm  : area.width,
                Sheet__DrawingAreaHeightMm : area.height
            },
            PageLayouts__Layout__ImagePlacement : {
                Placement__XMm          : Na__PageLayout__Store__Mm(it.x),
                Placement__YMm          : Na__PageLayout__Store__Mm(it.y),
                Placement__WidthMm      : Na__PageLayout__Store__Mm(it.width),
                Placement__HeightMm     : Na__PageLayout__Store__Mm(it.height),
                Placement__ClipTopMm    : Na__PageLayout__Store__Mm(it.clipTop),
                Placement__ClipRightMm  : Na__PageLayout__Store__Mm(it.clipRight),
                Placement__ClipBottomMm : Na__PageLayout__Store__Mm(it.clipBottom),
                Placement__ClipLeftMm   : Na__PageLayout__Store__Mm(it.clipLeft)
            },
            PageLayouts__Layout__Guide          : Na__PageLayout__Guide__Serialize(state)
        };
        if (state.renderSettings) layout.PageLayouts__Layout__RenderSettings = state.renderSettings;   // <-- Left out: the server keeps the stored one
        if (state.sourceView)     layout.PageLayouts__Layout__SourceView     = state.sourceView;
        if (!asNew && record) {
            layout.PageLayouts__Layout__Id  = record.PageLayouts__Layout__Id;
            layout.PageLayouts__Layout__Rev = record.PageLayouts__Layout__Rev;
        }
        return layout;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Small Picture of the Whole Sheet (Title Block and Picture), or Null
    // ------------------------------------------------------------
    function Na__PageLayout__Store__MakeThumbnail(state) {
        const cfg    = Na__PageLayout__Store__ResolveConfig(state);
        const width  = Math.max(64, Math.round(cfg.thumbWidth));
        const ppm    = width / state.a3.widthMm;
        const height = Math.round(state.a3.heightMm * ppm);

        const canvas  = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx     = canvas.getContext('2d');
        if (!ctx) return Promise.resolve(null);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        if (state.titleBlockImage) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(state.titleBlockImage, 0, 0, width, height);
        }
        Na__PageLayout__DrawImageLayer(ctx, state, ppm);                  // <-- The picture and its trims, as on screen

        return new Promise((resolve) => {
            try {
                canvas.toBlob((blob) => resolve(blob || null), cfg.thumbType, cfg.thumbQuality);
            } catch (error) {
                resolve(null);                                              // <-- A layout saves without a thumbnail sooner than not at all
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Server
// -----------------------------------------------------------------------------

    // FUNCTION | The Job's Saved Layouts, Last Changed First
    // ------------------------------------------------------------
    // Resolves { layouts, projectId, saveLevel, deleteAnyLevel }; THROWS with the
    // reason. Not signed in, the API answers 401 and the sign-in card opens.
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__List(state) {
        const response = await Na__PageLayout__ApiFetch(Na__PageLayout__Store__Route(state), { cache : 'no-store' });
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, 'The saved layouts could not be read');
        const answer = await response.json();
        Na__PageLayout__SetSaveLevel(answer.saveLevel);
        if (answer.projectId) state.project.id = answer.projectId;          // <-- The library's own id from now on
        return {
            layouts        : Array.isArray(answer.layouts) ? answer.layouts : [],
            projectId      : answer.projectId || state.project.id,
            saveLevel      : answer.saveLevel || 'Employee',
            deleteAnyLevel : answer.deleteAnyLevel || 'Management'
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Layout on the Page (Update It, or a New One)
    // ------------------------------------------------------------
    // options.asNew: always a new layout (Save as New). Resolves the server's
    // answer { layout, created } and updates the page; THROWS with .status,
    // .conflict (someone saved it since, .current is theirs) and .missing (it was
    // deleted) set, and nothing on the page changes.
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__Save(state, options = {}) {
        if (!state.project || !state.project.id) throw new Error('This page does not know its project, so the layout cannot be saved');
        if (!state.viewportImage) throw new Error('There is no picture on the sheet to save');

        const asNew      = options.asNew === true || !state.layout.record;
        const needsImage = asNew || !state.imageIsSaved;
        if (needsImage && !state.imageBlob) throw new Error('The picture is not available to save: re-render it, then save');

        const form = new FormData();
        form.append('layout', JSON.stringify(Na__PageLayout__Store__BuildRecord(state, asNew)));
        if (options.issue) {
            form.append('issue', JSON.stringify({                           // <-- An export: the server keeps a version
                Issue__Kind     : options.issue.kind,
                Issue__FileName : options.issue.fileName
            }));
        }
        if (needsImage) form.append('image', state.imageBlob, 'image.png');
        const thumbnail = await Na__PageLayout__Store__MakeThumbnail(state);
        if (thumbnail) form.append('thumbnail', thumbnail, 'thumbnail' + (thumbnail.type === 'image/png' ? '.png' : '.webp'));

        const response = await Na__PageLayout__ApiFetch(Na__PageLayout__Store__Route(state), { method : 'POST', body : form });
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, 'The server refused the save');
        const answer = await response.json();

        state.layout.record  = answer.layout;
        state.layout.name    = answer.layout.PageLayouts__Layout__Name;
        state.layout.dirty   = false;
        state.layout.version = null;                                        // <-- The sheet is the current drawing now
        state.imageIsSaved   = true;
        Na__PageLayout__Emit('layout', {
            record     : answer.layout,
            saved      : true,
            created    : answer.created === true,
            unchanged  : answer.unchanged === true,
            version    : answer.version || null,
            newVersion : answer.newVersion === true
        });
        return answer;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Saved Layout for Good (the Server Removes It and Its Pictures, v2.76.2)
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__Delete(state, layoutId) {
        const response = await Na__PageLayout__ApiFetch(
            Na__PageLayout__Store__Route(state, `/${encodeURIComponent(layoutId)}/delete`),
            { method : 'POST' }
        );
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, 'The server refused the delete');

        if (state.layout.record && state.layout.record.PageLayouts__Layout__Id === layoutId) {
            state.layout.record  = null;                                    // <-- The sheet stays: a new, unsaved layout now
            state.layout.dirty   = true;
            state.layout.version = null;
            state.imageIsSaved   = false;
            Na__PageLayout__Emit('layout', { record : null, deleted : layoutId });
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Picture and a Layout's Blocks on the Sheet (Open, OpenVersion and Recover Share It)
    // ------------------------------------------------------------
    // what: { image, blob, imageWidthPx, imageHeightPx, blocks (an object holding
    // the PageLayouts__Layout__* blocks), record (the saved layout, or null), name,
    // imageIsSaved, dirty, version ({ number, isCurrent, ... } or null) }.
    // Emits image and guide; the caller emits layout with what it opened.
    // ------------------------------------------------------------
    function Na__PageLayout__Store__PutOnSheet(state, what) {
        const blocks = what.blocks || {};
        const image  = what.image;

        // The picture first, then its saved place and trims (if they make sense)
        // ------------------------------------------------------------
        Na__PageLayout__SetImage(state, image, {
            width       : what.imageWidthPx  || image.naturalWidth,
            height      : what.imageHeightPx || image.naturalHeight,
            aspectRatio : (blocks.PageLayouts__Layout__RenderSettings && blocks.PageLayouts__Layout__RenderSettings.Render__AspectRatio) || null
        });
        const p   = blocks.PageLayouts__Layout__ImagePlacement || {};
        const num = (value) => Number.isFinite(value) ? value : NaN;
        const placed = {
            x          : num(p.Placement__XMm),
            y          : num(p.Placement__YMm),
            width      : num(p.Placement__WidthMm),
            height     : num(p.Placement__HeightMm),
            clipTop    : Number.isFinite(p.Placement__ClipTopMm)    ? Math.max(0, p.Placement__ClipTopMm)    : 0,
            clipRight  : Number.isFinite(p.Placement__ClipRightMm)  ? Math.max(0, p.Placement__ClipRightMm)  : 0,
            clipBottom : Number.isFinite(p.Placement__ClipBottomMm) ? Math.max(0, p.Placement__ClipBottomMm) : 0,
            clipLeft   : Number.isFinite(p.Placement__ClipLeftMm)   ? Math.max(0, p.Placement__ClipLeftMm)   : 0
        };
        if ([placed.x, placed.y, placed.width, placed.height].every(Number.isFinite) && placed.width > 0 && placed.height > 0) {
            Object.assign(state.imageTransform, placed);
        } else {
            Na__PageLayout__FitImageInDrawingArea(state);
        }

        // Everything else the layout carries
        // ------------------------------------------------------------
        Na__PageLayout__Guide__Apply(state, blocks.PageLayouts__Layout__Guide);
        state.sourceView      = blocks.PageLayouts__Layout__SourceView     || null;
        state.renderSettings  = blocks.PageLayouts__Layout__RenderSettings || null;
        state.imageBlob       = what.blob || null;
        state.imageIsSaved    = what.imageIsSaved === true;
        state.isImageSelected = false;
        state.layout.record   = what.record || null;
        state.layout.name     = what.name || '';
        state.layout.dirty    = what.dirty === true;
        state.layout.version  = what.version || null;

        Na__PageLayout__FitPageToView(state);
        Na__PageLayout__Emit('image', { opened : true });
        Na__PageLayout__Emit('guide', { opened : true });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Picture the API Serves, as a Blob and a Decoded Image
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__FetchPicture(relative, what) {
        const response = await Na__PageLayout__ApiFetch(Na__PageLayout__Store__FileUrl(relative), { cache : 'no-store' });
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, `${what} could not be read`);
        const blob  = await response.blob();
        const image = await Na__PageLayout__LoadImageFromBlob(blob);
        return { blob, image };
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Saved Layout on the Sheet
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__Open(state, record) {
        if (!record || !record.imageUrl) throw new Error('This layout has no picture saved');
        const picture = await Na__PageLayout__Store__FetchPicture(record.imageUrl, 'The layout\'s picture');

        Na__PageLayout__Store__PutOnSheet(state, {
            image         : picture.image,
            blob          : picture.blob,
            imageWidthPx  : record.PageLayouts__Layout__ImageWidthPx,
            imageHeightPx : record.PageLayouts__Layout__ImageHeightPx,
            blocks        : record,
            record        : record,
            name          : record.PageLayouts__Layout__Name || '',
            imageIsSaved  : true,
            dirty         : false,
            version       : null
        });
        Na__PageLayout__Emit('layout', { record : record, opened : true });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open One Version of a Saved Layout, as It Was Exported
    // ------------------------------------------------------------
    // record: the layout as last listed (its current Rev). The version's frozen
    // blocks and its own picture go on the sheet; the layout stays open, so Save
    // Changes makes this version the current drawing. A version that IS the
    // current drawing opens clean. Resolves the version's summary.
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__OpenVersion(state, record, number) {
        if (!record || !record.PageLayouts__Layout__Id) throw new Error('This layout is not saved for the job');
        const route    = Na__PageLayout__Store__Route(state, `/${encodeURIComponent(record.PageLayouts__Layout__Id)}/version?number=${encodeURIComponent(number)}`);
        const response = await Na__PageLayout__ApiFetch(route, { cache : 'no-store' });
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, `Version ${number} could not be read`);
        const answer  = await response.json();
        const version = answer.version || {};
        const content = answer.content || {};
        if (!version.imageUrl) throw new Error(`Version ${number} has no picture saved`);
        const picture = await Na__PageLayout__Store__FetchPicture(version.imageUrl, `Version ${number}'s picture`);

        const isCurrent = version.Version__LayoutRev === record.PageLayouts__Layout__Rev;   // <-- Nothing has changed since it was exported
        Na__PageLayout__Store__PutOnSheet(state, {
            image         : picture.image,
            blob          : picture.blob,
            imageWidthPx  : version.Version__ImageWidthPx  || content.PageLayouts__Layout__ImageWidthPx,
            imageHeightPx : version.Version__ImageHeightPx || content.PageLayouts__Layout__ImageHeightPx,
            blocks        : content,
            record        : record,
            name          : version.Version__Name || content.PageLayouts__Version__Name || record.PageLayouts__Layout__Name || '',
            imageIsSaved  : isCurrent && version.Version__ImageFile === record.PageLayouts__Layout__ImageFile,
            dirty         : !isCurrent,
            version       : {
                number      : version.Version__Number,
                isCurrent   : isCurrent,
                createdBy   : version.Version__CreatedByName || version.Version__CreatedBy || '',
                createdIso  : version.Version__CreatedIso || '',
                latest      : Math.max(0, ...((record.PageLayouts__Layout__Versions || []).map((v) => Number(v.Version__Number) || 0)))
            }
        });
        Na__PageLayout__Emit('layout', { record : record, opened : true, version : version.Version__Number, matchesSaved : isCurrent });
        return version;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Recovery Copy Back on the Sheet (Unsaved)
    // ------------------------------------------------------------
    // draft: what Na__PageLayoutSystem__RecoveryDraft__ kept ({ blob, name, blocks,
    // imageWidthPx, imageHeightPx }). record: the saved layout it was a change of,
    // when that layout is still saved for the job (Save Changes then updates it,
    // and says so if someone saved it since), else null (a new drawing).
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__Recover(state, draft, record) {
        if (!draft || !draft.blob) throw new Error('This recovery copy has no picture');
        const image = await Na__PageLayout__LoadImageFromBlob(draft.blob);
        Na__PageLayout__Store__PutOnSheet(state, {
            image         : image,
            blob          : draft.blob,
            imageWidthPx  : draft.imageWidthPx,
            imageHeightPx : draft.imageHeightPx,
            blocks        : draft.blocks || {},
            record        : record || null,
            name          : draft.name || '',
            imageIsSaved  : false,                                          // <-- The picture goes up again with the next save
            dirty         : true,
            version       : null
        });
        Na__PageLayout__Emit('layout', { record : record || null, opened : true, recovered : true, matchesSaved : false });
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Store API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Store__ResolveConfig,
        Na__PageLayout__Store__FileUrl,
        Na__PageLayout__Store__BuildRecord,
        Na__PageLayout__Store__MakeThumbnail,
        Na__PageLayout__Store__List,
        Na__PageLayout__Store__Save,
        Na__PageLayout__Store__Delete,
        Na__PageLayout__Store__Open,
        Na__PageLayout__Store__OpenVersion,
        Na__PageLayout__Store__Recover
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
