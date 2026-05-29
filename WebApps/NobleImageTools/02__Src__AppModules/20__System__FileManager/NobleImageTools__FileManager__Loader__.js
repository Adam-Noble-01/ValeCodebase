/* =============================================================================
   NOBLEIMAGETOOLS - FILE MANAGER - LOADER
   =============================================================================

   FILE       : NobleImageTools__FileManager__Loader__.js
   NAMESPACE  : NobleImageTools
   MODULE     : FileManager - Loader
   PURPOSE    : Loads images via the OS native file picker or drag-and-drop.
                Files are POSTed as multipart to /api/files/upload which saves
                them server-side and returns the disk path for SAM2 inference.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Upload API
// =============================================================================

    // FUNCTION | Upload a File object to the server and return image data
    // ------------------------------------------------------------
    async function NobleImageTools__Loader__UploadFile(file) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}/api/files/upload`;

        const formData  = new FormData();
        formData.append('file', file);

        const res       = await fetch(url, { method: 'POST', body: formData });
        const json      = await res.json();

        if (!json.ok) throw new Error(json.error || 'Upload failed');
        return json.data;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Image Application
// =============================================================================

    // FUNCTION | Apply loaded image data to the canvas and state
    // ------------------------------------------------------------
    async function NobleImageTools__Loader__ApplyImageData(data) {
        const state             = window.NobleImageTools__State;
        state.image.path        = data.path;
        state.image.filename    = data.filename;
        state.image.width       = data.width;
        state.image.height      = data.height;
        state.image.base64      = data.data_url;

        state.tool.positivePoints   = [];
        state.tool.negativePoints   = [];
        state.tool.box              = null;

        window.NobleImageTools__MaskingTools__LayerManager.NobleImageTools__LayerManager__ClearAll();
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__ClearPreview();

        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__LoadImage(
            data.data_url,
            function (imgEl) {
                window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__FitToCanvas(
                    imgEl.naturalWidth, imgEl.naturalHeight
                );
                window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
                NobleImageTools__Loader__UpdateImageInfo(data);
            }
        );

        document.getElementById('Nit__CanvasArea__Empty').classList.add('Nit__CanvasArea__Empty--hidden');

        const imgDir    = data.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        window.NobleImageTools__MaskExport__ColorId.NobleImageTools__ColorId__SetExportDir(imgDir);

        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            'Loaded: ' + data.filename, 'success', 2200
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update the sidebar image info widget
    // ------------------------------------------------------------
    function NobleImageTools__Loader__UpdateImageInfo(data) {
        const nameEl    = document.getElementById('Nit__FileSection__ImageName');
        const dimsEl    = document.getElementById('Nit__FileSection__ImageDims');
        const infoEl    = document.getElementById('Nit__FileSection__ImageInfo');

        if (nameEl)  nameEl.textContent  = data.filename;
        if (dimsEl)  dimsEl.textContent  = `${data.width} × ${data.height} px`;
        if (infoEl)  infoEl.classList.remove('Nit__FileSection__ImageInfo--hidden');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Load Trigger Handlers
// =============================================================================

    // FUNCTION | Handle a File object from picker or drag-drop
    // ------------------------------------------------------------
    async function NobleImageTools__Loader__HandleFile(file) {
        if (!file) return;

        const supported = /\.(png|jpg|jpeg|webp|bmp|tiff?|gif)$/i.test(file.name);
        if (!supported) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Unsupported file type. Use PNG, JPG, WebP, BMP, or TIFF.', 'warning'
            );
            return;
        }

        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            'Uploading…', 'info', 4000
        );

        try {
            const data = await NobleImageTools__Loader__UploadFile(file);
            await NobleImageTools__Loader__ApplyImageData(data);
        } catch (err) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Load error: ' + err.message, 'error'
            );
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the OS native file picker
    // ------------------------------------------------------------
    function NobleImageTools__Loader__OpenNativePicker() {
        const input         = document.createElement('input');
        input.type          = 'file';
        input.accept        = 'image/png,image/jpeg,image/webp,image/bmp,image/tiff,image/gif,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif';
        input.style.display = 'none';

        input.addEventListener('change', function () {
            if (input.files && input.files[0]) {
                NobleImageTools__Loader__HandleFile(input.files[0]);
            }
            document.body.removeChild(input);
        });

        document.body.appendChild(input);
        input.click();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Drag and Drop
// =============================================================================

    // FUNCTION | Install drag-and-drop listeners on the drop target element
    // ------------------------------------------------------------
    function NobleImageTools__Loader__InstallDragDrop(dropTarget) {
        let _dragCount = 0;                                          // <-- Track enter/leave pairs

        dropTarget.addEventListener('dragenter', function (e) {
            e.preventDefault();
            _dragCount++;
            dropTarget.classList.add('Nit__CanvasArea--DragOver');
        });

        dropTarget.addEventListener('dragleave', function () {
            _dragCount--;
            if (_dragCount <= 0) {
                _dragCount = 0;
                dropTarget.classList.remove('Nit__CanvasArea--DragOver');
            }
        });

        dropTarget.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        dropTarget.addEventListener('drop', function (e) {
            e.preventDefault();
            _dragCount = 0;
            dropTarget.classList.remove('Nit__CanvasArea--DragOver');

            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) NobleImageTools__Loader__HandleFile(file);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Initialisation
// =============================================================================

    // FUNCTION | Wire load button + drag-drop on the canvas area
    // ------------------------------------------------------------
    function NobleImageTools__Loader__Init() {
        const loadBtn   = document.getElementById('Nit__FileSection__LoadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', NobleImageTools__Loader__OpenNativePicker);
        }

        const dropTarget = document.getElementById('Nit__CanvasArea');
        if (dropTarget) {
            NobleImageTools__Loader__InstallDragDrop(dropTarget);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__FileManager__Loader = {
        NobleImageTools__Loader__Init        : NobleImageTools__Loader__Init,
        NobleImageTools__Loader__HandleFile  : NobleImageTools__Loader__HandleFile,
        NobleImageTools__Loader__OpenNativePicker : NobleImageTools__Loader__OpenNativePicker
    };

// endregion -------------------------------------------------------------------

}());
