// Na__ExifReader__ParseFocalLength
// Wraps the `exifr` CDN library to extract focal-length-related metadata from
// an image File / Blob / ArrayBuffer. Loaded lazily because we only need it
// when a real photo is supplied.
//
// Returns:
//   {
//     focalLengthMm:           number | null,  // physical focal length
//     focalLengthIn35mmFilm:   number | null,  // 35mm-equivalent focal length
//     make:                    string | null,
//     model:                   string | null,
//     pixelXDimension:         number | null,
//     pixelYDimension:         number | null,
//     raw:                     object         // full exif blob for diagnostics
//   }

let Na__ExifReader__LibraryPromise = null;

async function Na__ExifReader__EnsureLoaded(externalLibrariesConfig) {
    if (globalThis.exifr) return globalThis.exifr;
    if (Na__ExifReader__LibraryPromise) return Na__ExifReader__LibraryPromise;
    Na__ExifReader__LibraryPromise = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src   = externalLibrariesConfig.exifr.scriptUrl;
        tag.async = true;
        tag.addEventListener('load',  () => resolve(globalThis.exifr));
        tag.addEventListener('error', () => reject(new Error('Failed to load exifr from CDN.')));
        document.head.appendChild(tag);
    });
    return Na__ExifReader__LibraryPromise;
}

export async function Na__ExifReader__ParseFocalLength(fileOrBlob, externalLibrariesConfig) {
    const exifr = await Na__ExifReader__EnsureLoaded(externalLibrariesConfig);

    let raw = null;
    try {
        raw = await exifr.parse(fileOrBlob, {
            tiff: true, exif: true, ifd0: true, gps: false, xmp: false, icc: false, iptc: false
        });
    } catch (err) {
        console.warn('[Na__ExifReader] exifr.parse failed:', err);
        return Na__ExifReader__BuildEmptyResult();
    }
    if (!raw) return Na__ExifReader__BuildEmptyResult();

    return {
        focalLengthMm:         Na__ExifReader__CoerceNumber(raw.FocalLength),
        focalLengthIn35mmFilm: Na__ExifReader__CoerceNumber(raw.FocalLengthIn35mmFormat ?? raw.FocalLengthIn35mmFilm),
        make:                  raw.Make  || null,
        model:                 raw.Model || null,
        pixelXDimension:       Na__ExifReader__CoerceNumber(raw.ExifImageWidth  ?? raw.PixelXDimension),
        pixelYDimension:       Na__ExifReader__CoerceNumber(raw.ExifImageHeight ?? raw.PixelYDimension),
        raw
    };
}

function Na__ExifReader__BuildEmptyResult() {
    return {
        focalLengthMm: null,
        focalLengthIn35mmFilm: null,
        make: null,
        model: null,
        pixelXDimension: null,
        pixelYDimension: null,
        raw: null
    };
}

function Na__ExifReader__CoerceNumber(value) {
    if (value == null) return null;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isFinite(num) ? num : null;
}
