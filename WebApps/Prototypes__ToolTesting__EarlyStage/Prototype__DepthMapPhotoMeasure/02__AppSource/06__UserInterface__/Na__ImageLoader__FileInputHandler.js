// Na__ImageLoader__FileInputHandler
// Glues the file picker, drag-drop, and "Use sample" button to a single
// onImageReady callback. The callback receives:
//   { file: File|Blob, bitmap: ImageBitmap, fileName: string }

export function Na__ImageLoader__FileInputHandler_Wire(elements, samplePhotoUrl, onImageReady, onError) {
    const { fileInput, sampleButton, dropTarget } = elements;

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        await Na__ImageLoader__HandleFile(file, file.name, onImageReady, onError);
    });

    sampleButton.addEventListener('click', async () => {
        try {
            const response = await fetch(samplePhotoUrl);
            if (!response.ok) throw new Error(`Sample fetch HTTP ${response.status}`);
            const blob = await response.blob();
            await Na__ImageLoader__HandleFile(blob, samplePhotoUrl.split('/').pop() || 'sample.jpg', onImageReady, onError);
        } catch (err) {
            onError(err);
        }
    });

    Na__ImageLoader__BindDragDrop(dropTarget, async (file) => {
        await Na__ImageLoader__HandleFile(file, file.name || 'dropped.jpg', onImageReady, onError);
    });
}

async function Na__ImageLoader__HandleFile(fileOrBlob, fileName, onImageReady, onError) {
    try {
        const bitmap = await createImageBitmap(fileOrBlob, { imageOrientation: 'from-image' });
        onImageReady({ file: fileOrBlob, bitmap, fileName });
    } catch (err) {
        onError(err);
    }
}

function Na__ImageLoader__BindDragDrop(target, onFile) {
    target.addEventListener('dragover', (event) => {
        event.preventDefault();
        target.classList.add('Na__Stage__DragOver');
    });
    target.addEventListener('dragleave', () => target.classList.remove('Na__Stage__DragOver'));
    target.addEventListener('drop', (event) => {
        event.preventDefault();
        target.classList.remove('Na__Stage__DragOver');
        const file = event.dataTransfer.files && event.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) onFile(file);
    });
}
