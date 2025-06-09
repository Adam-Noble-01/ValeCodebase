// ----------------------------------------
// Download All Images Over 250px
// ----------------------------------------

// Find all images in the document
const images = Array.from(document.querySelectorAll('img'));

// Filter to only include images >= 250px in width or height (natural size)
const largeImages = images.filter(img => {
    // Use naturalWidth/naturalHeight for full-size, fallback to width/height attribute
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    return w >= 250 || h >= 250;
});

// Helper: Download function for blobs and cross-origin images
function downloadImage(url, filename) {
    fetch(url, {mode: 'cors'})
        .then(response => response.blob())
        .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        })
        .catch(() => {
            // Fallback: open in new tab if blob fetch fails (cross-origin etc.)
            window.open(url, '_blank');
        });
}

// Download all filtered images, avoiding duplicates
const seen = new Set();
largeImages.forEach((img, i) => {
    let url = img.src;
    if (!url || seen.has(url)) return;
    seen.add(url);
    // Extract filename or use index
    let filename = url.split('/').pop().split('?')[0] || `image_${i + 1}.jpg`;
    downloadImage(url, filename);
});
