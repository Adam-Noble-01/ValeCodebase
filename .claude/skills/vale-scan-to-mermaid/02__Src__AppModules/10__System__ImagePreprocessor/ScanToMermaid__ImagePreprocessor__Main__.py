# =============================================================================
# SCANTOMERMAID - IMAGE PREPROCESSOR
# =============================================================================
#
# FILE       : ScanToMermaid__ImagePreprocessor__Main__.py
# NAMESPACE  : ScanToMermaid
# MODULE     : ImagePreprocessor - Main
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Lift faint pencil linework out of scanned drawings before reading
# CREATED    : 04-Aug-2026
#
# DESCRIPTION:
# - Accepts a PDF, PNG, JPEG or TIFF scan, or a folder of the same
# - For PDFs, lifts the embedded scan at native resolution where possible
# - Falls back to rasterising the page at a chosen DPI when it is not a plain scan
# - Converts to greyscale, then auto-detects the paper white and ink black points
# - Applies a Photoshop-equivalent midtone gamma (default 0.43) to darken pencil
# - Optionally applies an unsharp mask to crisp up soft graphite edges
# - Writes a full-resolution processed image plus a downscaled reading copy
# - Writes overlapping detail tiles so fine handwriting stays legible when read
# - Writes a manifest JSON describing every artefact produced
#
# =============================================================================

import os
import sys
import json
import argparse

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None                                                    # <-- Architectural scans exceed the default bomb guard

# -----------------------------------------------------------------------------
# REGION | Configuration Constants
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Levels Defaults Matching The Photoshop Preset
    # ------------------------------------------------------------
DEFAULT_GAMMA        =  0.43                                                     # <-- Photoshop midtone slider value, darkens pencil
DEFAULT_BLACK_PCT    =  0.50                                                     # <-- Percentile treated as ink black
DEFAULT_WHITE_PCT    =  99.00                                                    # <-- Percentile treated as paper white
DEFAULT_DPI          =  300                                                      # <-- Rasterise DPI when a PDF page is not a plain scan
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Output Sizing
    # ------------------------------------------------------------
READ_MAX_WIDTH       =  1800                                                     # <-- Whole-sheet reading copy width
TILE_MAX_WIDTH       =  1600                                                     # <-- Per-tile reading width
TILE_OVERLAP_PCT     =  8.0                                                      # <-- Tile overlap so nothing is severed at a seam
DEFAULT_TILE_GRID    =  '3x2'                                                    # <-- Columns x rows for a landscape sheet
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Paths and Recognised Inputs
    # ------------------------------------------------------------
OUTPUT_FOLDER_NAME   =  '03__Processed__Image'                                   # <-- Sits beside 01__Input__Image and 02__Input__PDF
MANIFEST_FILENAME    =  'ScanToMermaid__ProcessedImage__Manifest__.json'
IMAGE_EXTENSIONS     =  ('.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp')
PDF_EXTENSIONS       =  ('.pdf',)
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Page Extraction
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Lift Pages From a PDF at the Best Available Resolution
    # ------------------------------------------------------------
def extract_pdf_pages(pdf_path, dpi):
    """Yield (page_number, PIL.Image) for each page, preferring the embedded scan."""
    try:
        import fitz                                                              # <-- PyMuPDF, imported late so image-only runs need no PDF stack
    except ImportError:
        print('  ERROR: PyMuPDF is required to read PDFs. Install with: pip install pymupdf')
        sys.exit(1)

    document  =  fitz.open(pdf_path)
    for page_index in range(document.page_count):
        page       =  document[page_index]
        page_image =  extract_single_page_scan(document, page)                   # <-- Native-resolution path, no resampling
        if page_image is None:
            zoom       =  dpi / 72.0                                             # <-- PDF user space is 72 units per inch
            pixmap     =  page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            page_image =  Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
        yield page_index + 1, page_image
    document.close()
    # ------------------------------------------------------------


    # HELPER FUNCTION | Return the Embedded Scan When a Page Is Simply One Image
    # ------------------------------------------------------------
def extract_single_page_scan(document, page):
    """Return the embedded image if the page is a lone full-bleed scan, else None."""
    images  =  page.get_images(full=True)
    if len(images) != 1:
        return None                                                              # <-- Composite page, rasterising is safer

    try:
        raw     =  document.extract_image(images[0][0])
        opened  =  Image.open(_bytes_reader(raw['image']))
        opened.load()
        return opened
    except Exception:
        return None                                                              # <-- Unsupported codec, fall back to rasterising
    # ------------------------------------------------------------


    # SUB FUNCTION | Wrap Raw Bytes So Pillow Can Open Them
    # ------------------------------------------------------------
def _bytes_reader(raw_bytes):
    """Return an in-memory binary stream over raw_bytes."""
    import io
    return io.BytesIO(raw_bytes)
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Levels Adjustment
# -----------------------------------------------------------------------------

    # FUNCTION | Apply Auto White Point and Midtone Gamma to a Scan
    # ------------------------------------------------------------
def apply_levels(source_image, gamma, use_auto_white, black_pct, white_pct, sharpen):
    """Return a greyscale image with pencil linework darkened and paper normalised."""
    greyscale  =  source_image.convert('L')
    samples    =  np.asarray(greyscale).astype(np.float32)

    if use_auto_white:
        black_point  =  float(np.percentile(samples, black_pct))
        white_point  =  float(np.percentile(samples, white_pct))
        if white_point - black_point < 1.0:
            black_point, white_point  =  0.0, 255.0                              # <-- Degenerate histogram, leave the scan alone
    else:
        black_point, white_point  =  0.0, 255.0                                  # <-- Fixed Photoshop behaviour, input levels 0 and 255

    normalised  =  (samples - black_point) / (white_point - black_point)
    normalised  =  np.clip(normalised, 0.0, 1.0)
    corrected   =  np.power(normalised, 1.0 / gamma)                             # <-- Gamma below 1.0 darkens the midtones
    result      =  Image.fromarray((corrected * 255.0).astype(np.uint8), mode='L')

    if sharpen:
        result  =  result.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=3))
    return result, black_point, white_point
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reading Copies and Detail Tiles
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Downscale an Image to a Target Width
    # ------------------------------------------------------------
def downscale_to_width(source_image, target_width):
    """Return a LANCZOS-resampled copy no wider than target_width."""
    if source_image.width <= target_width:
        return source_image.copy()
    target_height  =  int(round(target_width * source_image.height / source_image.width))
    return source_image.resize((target_width, target_height), Image.LANCZOS)
    # ------------------------------------------------------------


    # FUNCTION | Cut a Sheet Into Overlapping Tiles for Close Reading
    # ------------------------------------------------------------
def build_detail_tiles(source_image, grid_spec, output_dir, stem):
    """Write overlapping tiles and return their manifest entries."""
    try:
        columns, rows  =  (int(part) for part in grid_spec.lower().split('x'))
    except ValueError:
        print(f'  WARNING: Unreadable tile grid "{grid_spec}", falling back to {DEFAULT_TILE_GRID}')
        columns, rows  =  (int(part) for part in DEFAULT_TILE_GRID.split('x'))

    tile_width   =  source_image.width  / columns
    tile_height  =  source_image.height / rows
    overlap_x    =  tile_width  * (TILE_OVERLAP_PCT / 100.0)
    overlap_y    =  tile_height * (TILE_OVERLAP_PCT / 100.0)

    tile_entries  =  []
    for row in range(rows):
        for column in range(columns):
            left    =  max(0, int(round(column * tile_width  - overlap_x)))
            upper   =  max(0, int(round(row    * tile_height - overlap_y)))
            right   =  min(source_image.width,  int(round((column + 1) * tile_width  + overlap_x)))
            lower   =  min(source_image.height, int(round((row    + 1) * tile_height + overlap_y)))

            cropped   =  source_image.crop((left, upper, right, lower))
            reduced   =  downscale_to_width(cropped, TILE_MAX_WIDTH)
            tile_name =  f'{stem}__Tile__R{row + 1}C{column + 1}__.png'
            tile_path =  os.path.join(output_dir, tile_name)
            reduced.save(tile_path, 'PNG', optimize=True)

            tile_entries.append({
                'Tile__FileName'   : tile_name,
                'Tile__GridRef'    : f'R{row + 1}C{column + 1}',
                'Tile__SourceBox'  : [left, upper, right, lower],
                'Tile__PixelSize'  : [reduced.width, reduced.height]
            })
    return tile_entries
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Output Location Resolution
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Decide Where Processed Images Belong
    # ------------------------------------------------------------
def resolve_output_dir(input_path, explicit_out):
    """Return the processed-image folder, honouring the NN__Input__* project layout."""
    if explicit_out:
        return os.path.abspath(explicit_out)

    input_dir   =  os.path.dirname(os.path.abspath(input_path))
    folder_name =  os.path.basename(input_dir)

    if '__Input__' in folder_name:
        project_root  =  os.path.dirname(input_dir)                              # <-- Sit alongside 01__Input__Image and 02__Input__PDF
    else:
        project_root  =  input_dir
    return os.path.join(project_root, OUTPUT_FOLDER_NAME)
    # ------------------------------------------------------------


    # HELPER FUNCTION | Collect Every Input File To Be Processed
    # ------------------------------------------------------------
def collect_input_files(input_path):
    """Return a sorted list of scan files from a single path or a folder."""
    if os.path.isfile(input_path):
        return [input_path]

    recognised  =  IMAGE_EXTENSIONS + PDF_EXTENSIONS
    collected   =  []
    for entry in sorted(os.listdir(input_path)):
        if entry.lower().endswith(recognised):
            collected.append(os.path.join(input_path, entry))
    return collected
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Pipeline Runner
# -----------------------------------------------------------------------------

    # FUNCTION | Process a Single Scan Page Through the Full Levels Pipeline
    # ------------------------------------------------------------
def process_page(page_image, stem, page_number, output_dir, options):
    """Write processed, reading and tile artefacts for one page, return a manifest entry."""
    page_stem  =  f'{stem}__P{page_number:02d}__Levels__'

    processed, black_point, white_point  =  apply_levels(
        page_image,
        gamma          = options.gamma,
        use_auto_white = not options.no_autowhite,
        black_pct      = options.black_pct,
        white_pct      = options.white_pct,
        sharpen        = not options.no_sharpen
    )

    full_name  =  f'{page_stem}.png'
    full_path  =  os.path.join(output_dir, full_name)
    processed.save(full_path, 'PNG', optimize=True)

    reading      =  downscale_to_width(processed, READ_MAX_WIDTH)
    reading_name =  f'{page_stem}Read__.png'
    reading.save(os.path.join(output_dir, reading_name), 'PNG', optimize=True)

    tile_entries  =  []
    if not options.no_tiles:
        tile_entries  =  build_detail_tiles(processed, options.tiles, output_dir, page_stem.rstrip('_'))

    print(f'  Page {page_number:02d}  {page_image.width} x {page_image.height}px'
          f'  black={black_point:.1f}  white={white_point:.1f}'
          f'  tiles={len(tile_entries)}')

    return {
        'Page__Number'         : page_number,
        'Page__SourcePixels'   : [page_image.width, page_image.height],
        'Page__ProcessedFile'  : full_name,
        'Page__ReadingFile'    : reading_name,
        'Page__BlackPoint'     : round(black_point, 2),
        'Page__WhitePoint'     : round(white_point, 2),
        'Page__GammaApplied'   : options.gamma,
        'Page__Tiles'          : tile_entries
    }
    # ------------------------------------------------------------


    # FUNCTION | Process Every Input File and Write the Manifest
    # ------------------------------------------------------------
def run_pipeline(options):
    """Drive the whole preprocessing pass and return the manifest dictionary."""
    input_files  =  collect_input_files(options.input)
    if not input_files:
        print(f'  ERROR: No PDF or image files found at {options.input}')
        sys.exit(1)

    output_dir  =  resolve_output_dir(input_files[0], options.out)
    os.makedirs(output_dir, exist_ok=True)
    print(f'\nScanToMermaid - Image Preprocessor')
    print(f'  Output   : {output_dir}')
    print(f'  Gamma    : {options.gamma}   AutoWhite: {not options.no_autowhite}   '
          f'Sharpen: {not options.no_sharpen}\n')

    source_entries  =  []
    for input_file in input_files:
        stem       =  os.path.splitext(os.path.basename(input_file))[0].rstrip('_')
        extension  =  os.path.splitext(input_file)[1].lower()
        print(f'  {os.path.basename(input_file)}')

        page_entries  =  []
        if extension in PDF_EXTENSIONS:
            for page_number, page_image in extract_pdf_pages(input_file, options.dpi):
                page_entries.append(process_page(page_image, stem, page_number, output_dir, options))
        else:
            with Image.open(input_file) as opened:
                opened.load()
                page_entries.append(process_page(opened, stem, 1, output_dir, options))

        source_entries.append({
            'Source__FileName'  : os.path.basename(input_file),
            'Source__FullPath'  : os.path.abspath(input_file),
            'Source__PageCount' : len(page_entries),
            'Source__Pages'     : page_entries
        })

    manifest  =  {
        'Manifest__Generator'   : 'ScanToMermaid__ImagePreprocessor__Main__.py',
        'Manifest__OutputDir'   : output_dir,
        'Manifest__Settings'    : {
            'Setting__Gamma'          : options.gamma,
            'Setting__AutoWhitePoint' : not options.no_autowhite,
            'Setting__BlackPercentile': options.black_pct,
            'Setting__WhitePercentile': options.white_pct,
            'Setting__Sharpen'        : not options.no_sharpen,
            'Setting__TileGrid'       : 'none' if options.no_tiles else options.tiles
        },
        'Manifest__Sources'     : source_entries
    }

    manifest_path  =  os.path.join(output_dir, MANIFEST_FILENAME)
    with open(manifest_path, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=4)

    total_pages  =  sum(entry['Source__PageCount'] for entry in source_entries)
    print(f'\n  Done. {total_pages} page(s) processed.')
    print(f'  Manifest : {manifest_path}\n')
    return manifest
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Command Line Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Parse Arguments and Start the Pipeline
    # ------------------------------------------------------------
def main():
    """Parse command line options and run the preprocessing pipeline."""
    parser  =  argparse.ArgumentParser(
        description='Lift faint pencil linework out of scanned drawings before reading.')
    parser.add_argument('input',
                        help='PDF, PNG, JPEG or TIFF scan, or a folder of them')
    parser.add_argument('--out', default=None,
                        help='Output folder (default: 03__Processed__Image beside the input)')
    parser.add_argument('--gamma', type=float, default=DEFAULT_GAMMA,
                        help=f'Midtone gamma, lower darkens more (default {DEFAULT_GAMMA})')
    parser.add_argument('--no-autowhite', action='store_true',
                        help='Disable paper white detection and use fixed 0-255 input levels')
    parser.add_argument('--black-pct', type=float, default=DEFAULT_BLACK_PCT,
                        help=f'Percentile mapped to black (default {DEFAULT_BLACK_PCT})')
    parser.add_argument('--white-pct', type=float, default=DEFAULT_WHITE_PCT,
                        help=f'Percentile mapped to white (default {DEFAULT_WHITE_PCT})')
    parser.add_argument('--no-sharpen', action='store_true',
                        help='Skip the unsharp mask pass')
    parser.add_argument('--tiles', default=DEFAULT_TILE_GRID,
                        help=f'Detail tile grid as ColumnsxRows (default {DEFAULT_TILE_GRID})')
    parser.add_argument('--no-tiles', action='store_true',
                        help='Skip detail tile generation')
    parser.add_argument('--dpi', type=int, default=DEFAULT_DPI,
                        help=f'Rasterise DPI for non-scan PDF pages (default {DEFAULT_DPI})')

    options  =  parser.parse_args()
    run_pipeline(options)
    # ------------------------------------------------------------


if __name__ == '__main__':
    main()

# endregion -------------------------------------------------------------------
