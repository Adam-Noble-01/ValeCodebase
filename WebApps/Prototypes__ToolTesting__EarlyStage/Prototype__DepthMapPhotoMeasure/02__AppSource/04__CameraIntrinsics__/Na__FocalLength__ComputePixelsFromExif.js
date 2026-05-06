// Na__FocalLength__ComputePixelsFromExif
// Converts EXIF focal-length metadata into a pixel focal length on the *current
// image*, using either the 35mm-equivalent value (preferred, no sensor-size
// guesswork) or the physical focal length combined with a sensor preset.
//
// Inputs:
//   exif              - object from Na__ExifReader__ParseFocalLength
//   imageWidthPx      - actual image pixel width
//   imageHeightPx     - actual image pixel height
//   sensorPresetsMm   - map of presetId -> { sensorWidth, sensorHeight }
//
// Returns:
//   {
//     focalPx: number | null,
//     method:  '35mm' | 'sensorPreset' | null,
//     details: { ... }
//   }

const Na__FocalLength__SensorWidth35mm = 36.0;

export function Na__FocalLength__ComputePixelsFromExif(exif, imageWidthPx, imageHeightPx, sensorPresetsMm) {
    if (!exif) return Na__FocalLength__BuildEmpty();

    if (Na__FocalLength__IsValidPositive(exif.focalLengthIn35mmFilm)) {
        const focalPx = (imageWidthPx * exif.focalLengthIn35mmFilm) / Na__FocalLength__SensorWidth35mm;
        return {
            focalPx,
            method: '35mm',
            details: {
                focalLengthIn35mmFilm: exif.focalLengthIn35mmFilm,
                sensorWidthMm:         Na__FocalLength__SensorWidth35mm,
                imageWidthPx
            }
        };
    }

    if (Na__FocalLength__IsValidPositive(exif.focalLengthMm)) {
        const sensor = Na__FocalLength__PickSensorPreset(exif.make, exif.model, sensorPresetsMm);
        if (sensor) {
            const focalPx = (imageWidthPx * exif.focalLengthMm) / sensor.sensorWidth;
            return {
                focalPx,
                method: 'sensorPreset',
                details: {
                    focalLengthMm:  exif.focalLengthMm,
                    sensorPresetId: sensor.id,
                    sensorWidthMm:  sensor.sensorWidth,
                    imageWidthPx
                }
            };
        }
    }

    return Na__FocalLength__BuildEmpty();
}

function Na__FocalLength__BuildEmpty() {
    return { focalPx: null, method: null, details: {} };
}

function Na__FocalLength__IsValidPositive(value) {
    return typeof value === 'number' && isFinite(value) && value > 0;
}

function Na__FocalLength__PickSensorPreset(make, model, presets) {
    if (!presets) return null;
    const haystack = `${make || ''} ${model || ''}`.toLowerCase();

    if (haystack.includes('iphone')) {
        if (haystack.includes('ultra wide') || haystack.includes('ultrawide') || haystack.includes('0.5x')) {
            return Na__FocalLength__WrapPreset('iPhone15ProUltraWide', presets.iPhone15ProUltraWide);
        }
        return Na__FocalLength__WrapPreset('iPhone15ProMain', presets.iPhone15ProMain);
    }
    if (haystack.includes('canon'))      return Na__FocalLength__WrapPreset('APSC_Canon',     presets.APSC_Canon);
    if (haystack.includes('sony'))       return Na__FocalLength__WrapPreset('APSC_Sony',      presets.APSC_Sony);
    if (haystack.includes('olympus') ||
        haystack.includes('panasonic'))  return Na__FocalLength__WrapPreset('MicroFourThirds', presets.MicroFourThirds);
    if (haystack.includes('oneplus'))    return Na__FocalLength__WrapPreset('OnePlus_Generic_Phone', presets.OnePlus_Generic_Phone);

    return null;
}

function Na__FocalLength__WrapPreset(id, preset) {
    if (!preset) return null;
    return { id, sensorWidth: preset.sensorWidth, sensorHeight: preset.sensorHeight };
}
