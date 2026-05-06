// Na__ExportPng__DownloadComposite
// Renders a modal that lets the user pick which canvas layers (base photo,
// depth overlay, measurement annotations) to bake into a PNG, then composites
// them at source-image resolution and triggers a download.
//
// All canvases are already pixel-1:1 with the source image (see
// Na__ImageCanvas__RenderBaseImage), so compositing is a flat sequence of
// drawImage() calls onto a same-sized offscreen canvas.

export function Na__ExportPng__Wire(deps) {
    const { modalElements, openButton, downloadAnchor, getExportContext, exportConfig } = deps;
    const cfg = Na__ExportPng__NormaliseConfig(exportConfig);
    const state = { lastSuggestedFileName: '' };

    Na__ExportPng__InitDefaultLayers(modalElements.layerCheckboxes, cfg.defaultLayers);

    openButton.addEventListener('click', () => {
        const ctx = getExportContext();
        if (!ctx || !ctx.hasImage) {
            Na__ExportPng__ShowStatus(modalElements.statusEl, 'Load an image first.', true);
            return;
        }
        Na__ExportPng__ShowStatus(modalElements.statusEl, '', false);
        state.lastSuggestedFileName    = Na__ExportPng__SuggestFileName(cfg.defaultFilenamePrefix, ctx.suggestedFileStem);
        modalElements.filenameInput.value = state.lastSuggestedFileName;
        Na__ExportPng__OpenModal(modalElements.backdrop, modalElements.filenameInput);
    });

    modalElements.cancelButton.addEventListener('click', () => Na__ExportPng__CloseModal(modalElements.backdrop));

    modalElements.backdrop.addEventListener('click', (event) => {
        if (event.target === modalElements.backdrop) Na__ExportPng__CloseModal(modalElements.backdrop);
    });

    document.addEventListener('keydown', (event) => {
        if (modalElements.backdrop.hidden) return;
        if (event.key === 'Escape') Na__ExportPng__CloseModal(modalElements.backdrop);
    });

    modalElements.downloadButton.addEventListener('click', async () => {
        const ctx = getExportContext();
        if (!ctx || !ctx.hasImage) {
            Na__ExportPng__ShowStatus(modalElements.statusEl, 'Image is no longer available.', true);
            return;
        }
        const selection = Na__ExportPng__ReadLayerSelection(modalElements.layerCheckboxes);
        if (!selection.base && !selection.depth && !selection.measurements) {
            Na__ExportPng__ShowStatus(modalElements.statusEl, 'Pick at least one layer to export.', true);
            return;
        }
        const fileName = Na__ExportPng__SanitiseFileName(modalElements.filenameInput.value, state.lastSuggestedFileName);
        try {
            Na__ExportPng__ShowStatus(modalElements.statusEl, 'Rendering composite...', false);
            const blob = await Na__ExportPng__RenderCompositeBlob(ctx.canvases, selection);
            Na__ExportPng__TriggerDownload(downloadAnchor, blob, fileName);
            Na__ExportPng__ShowStatus(modalElements.statusEl, `Saved ${fileName}`, false);
            setTimeout(() => Na__ExportPng__CloseModal(modalElements.backdrop), 600);
        } catch (err) {
            console.error('[Na__ExportPng] composite failed:', err);
            Na__ExportPng__ShowStatus(modalElements.statusEl, `Export failed: ${err.message}`, true);
        }
    });

    return {
        setEnabled(enabled) { openButton.disabled = !enabled; }
    };
}

function Na__ExportPng__NormaliseConfig(exportConfig) {
    return {
        defaultFilenamePrefix: exportConfig?.defaultFilenamePrefix ?? 'Annotated__',
        defaultLayers: {
            base:         exportConfig?.defaultLayers?.base         ?? true,
            depth:        exportConfig?.defaultLayers?.depth        ?? false,
            measurements: exportConfig?.defaultLayers?.measurements ?? true
        }
    };
}

function Na__ExportPng__InitDefaultLayers(checkboxes, defaults) {
    if (checkboxes.base)         checkboxes.base.checked         = !!defaults.base;
    if (checkboxes.depth)        checkboxes.depth.checked        = !!defaults.depth;
    if (checkboxes.measurements) checkboxes.measurements.checked = !!defaults.measurements;
}

function Na__ExportPng__ReadLayerSelection(checkboxes) {
    return {
        base:         !!(checkboxes.base         && checkboxes.base.checked),
        depth:        !!(checkboxes.depth        && checkboxes.depth.checked),
        measurements: !!(checkboxes.measurements && checkboxes.measurements.checked)
    };
}

// ============================== MODAL OPEN / CLOSE ==============================
function Na__ExportPng__OpenModal(backdrop, filenameInput) {
    backdrop.hidden = false;
    setTimeout(() => {
        if (filenameInput) {
            filenameInput.focus();
            filenameInput.select();
        }
    }, 0);
}

function Na__ExportPng__CloseModal(backdrop) {
    backdrop.hidden = true;
}

function Na__ExportPng__ShowStatus(statusEl, text, isError) {
    if (!statusEl) return;
    if (!text) {
        statusEl.hidden       = true;
        statusEl.textContent  = '';
        statusEl.classList.remove('Na__ExportPng__StatusError');
        return;
    }
    statusEl.hidden       = false;
    statusEl.textContent  = text;
    statusEl.classList.toggle('Na__ExportPng__StatusError', !!isError);
}

// ============================== FILENAME HELPERS ==============================
function Na__ExportPng__SuggestFileName(prefix, fileStem) {
    const stamp = Na__ExportPng__BuildTimestampSegment();
    const stem  = (fileStem || 'image').replace(/[^A-Za-z0-9._-]+/g, '_');
    return `${prefix}${stem}__${stamp}`;
}

function Na__ExportPng__BuildTimestampSegment() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function Na__ExportPng__SanitiseFileName(rawValue, fallback) {
    const cleaned = (rawValue || '').trim().replace(/[\\/:*?"<>|]+/g, '_');
    const stem    = cleaned || fallback || 'export';
    return stem.toLowerCase().endsWith('.png') ? stem : `${stem}.png`;
}

// ============================== COMPOSITE RENDERING ==============================
async function Na__ExportPng__RenderCompositeBlob(canvases, selection) {
    const { base, depth, measurement } = canvases;
    if (!base || !base.width || !base.height) {
        throw new Error('Base canvas not initialised yet.');
    }
    const width  = base.width;
    const height = base.height;

    const target = document.createElement('canvas');
    target.width  = width;
    target.height = height;
    const ctx = target.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D context for export canvas.');

    if (selection.base) {
        ctx.drawImage(base, 0, 0, width, height);
    }
    if (selection.depth && depth && depth.width) {
        const opacity = Na__ExportPng__ResolveCanvasOpacity(depth);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(depth, 0, 0, width, height);
        ctx.restore();
    }
    if (selection.measurements && measurement && measurement.width) {
        ctx.drawImage(measurement, 0, 0, width, height);
    }

    return await Na__ExportPng__CanvasToPngBlob(target);
}

function Na__ExportPng__ResolveCanvasOpacity(canvas) {
    const cssOpacity = parseFloat(getComputedStyle(canvas).opacity);
    if (Number.isFinite(cssOpacity)) return Math.max(0, Math.min(1, cssOpacity));
    return 1;
}

function Na__ExportPng__CanvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('toBlob returned null.'));
                resolve(blob);
            }, 'image/png');
        } catch (err) {
            reject(err);
        }
    });
}

// ============================== DOWNLOAD TRIGGER ==============================
function Na__ExportPng__TriggerDownload(anchor, blob, fileName) {
    const url = URL.createObjectURL(blob);
    anchor.href     = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
