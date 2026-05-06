// Na__StatusBar__ProgressIndicator
// Tiny façade over the four status bar slots so other modules don't need to
// know which DOM elements live where.

export function Na__StatusBar__Create(elements) {
    const { modelEl, imageEl, focalEl, progressEl } = elements;
    return {
        setModel(text) {
            modelEl.textContent = `Model: ${text}`;
        },
        setImage(text) {
            imageEl.textContent = `Image: ${text}`;
        },
        setFocal(text) {
            focalEl.textContent = `Focal: ${text}`;
        },
        setProgress(text, busy) {
            progressEl.textContent = text;
            progressEl.classList.toggle('Na__StatusBar__Busy', !!busy);
        }
    };
}
