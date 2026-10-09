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
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
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
        if (needsImage) form.append('image', state.imageBlob, 'image.png');
        const thumbnail = await Na__PageLayout__Store__MakeThumbnail(state);
        if (thumbnail) form.append('thumbnail', thumbnail, 'thumbnail' + (thumbnail.type === 'image/png' ? '.png' : '.webp'));

        const response = await Na__PageLayout__ApiFetch(Na__PageLayout__Store__Route(state), { method : 'POST', body : form });
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, 'The server refused the save');
        const answer = await response.json();

        state.layout.record  = answer.layout;
        state.layout.name    = answer.layout.PageLayouts__Layout__Name;
        state.layout.dirty   = false;
        state.imageIsSaved   = true;
        Na__PageLayout__Emit('layout', { record : answer.layout, saved : true, created : answer.created === true });
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
            state.layout.record = null;                                     // <-- The sheet stays: a new, unsaved layout now
            state.layout.dirty  = true;
            state.imageIsSaved  = false;
            Na__PageLayout__Emit('layout', { record : null, deleted : layoutId });
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Saved Layout on the Sheet
    // ------------------------------------------------------------
    async function Na__PageLayout__Store__Open(state, record) {
        if (!record || !record.imageUrl) throw new Error('This layout has no picture saved');

        const response = await Na__PageLayout__ApiFetch(Na__PageLayout__Store__FileUrl(record.imageUrl), { cache : 'no-store' });
        if (!response.ok) throw await Na__PageLayout__Store__Refusal(response, 'The layout\'s picture could not be read');
        const blob  = await response.blob();
        const image = await Na__PageLayout__LoadImageFromBlob(blob);

        // The picture first, then its saved place and trims (if they make sense)
        // ------------------------------------------------------------
        Na__PageLayout__SetImage(state, image, {
            width       : record.PageLayouts__Layout__ImageWidthPx  || image.naturalWidth,
            height      : record.PageLayouts__Layout__ImageHeightPx || image.naturalHeight,
            aspectRatio : (record.PageLayouts__Layout__RenderSettings && record.PageLayouts__Layout__RenderSettings.Render__AspectRatio) || null
        });
        const p   = record.PageLayouts__Layout__ImagePlacement || {};
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
        Na__PageLayout__Guide__Apply(state, record.PageLayouts__Layout__Guide);
        state.sourceView      = record.PageLayouts__Layout__SourceView     || null;
        state.renderSettings  = record.PageLayouts__Layout__RenderSettings || null;
        state.imageBlob       = blob;
        state.imageIsSaved    = true;
        state.isImageSelected = false;
        state.layout.record   = record;
        state.layout.name     = record.PageLayouts__Layout__Name || '';
        state.layout.dirty    = false;

        Na__PageLayout__FitPageToView(state);
        Na__PageLayout__Emit('image', { opened : true });
        Na__PageLayout__Emit('guide', { opened : true });
        Na__PageLayout__Emit('layout', { record : record, opened : true });
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
        Na__PageLayout__Store__Open
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
