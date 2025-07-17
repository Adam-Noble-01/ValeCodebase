import os
import pikepdf
import json
from pathlib import Path
from datetime import datetime
import html
from collections import Counter
import re
import tkinter as tk
from tkinter import filedialog
import traceback # For detailed error logging

# --- Configuration ---
# Keys to attempt to extract from PDF metadata, case-insensitive matching will be attempted
COMMON_METADATA_KEYS = [
    "Title", "Author", "Subject", "Keywords",
    "Creator", "Producer", "CreationDate", "ModDate",
    "Trapped", "PTEX.Fullbanner", # Common LaTeX keys
    # XMP Dublin Core
    "dc:title", "dc:creator", "dc:subject", "dc:description",
    "dc:publisher", "dc:contributor", "dc:date", "dc:type",
    "dc:format", "dc:identifier", "dc:source", "dc:language",
    "dc:relation", "dc:coverage", "dc:rights",
    # XMP PDF specific
    "pdf:Keywords", "pdf:PDFVersion", "pdf:Producer",
    # XMP Rights Management
    "xmpRights:Marked", "xmpRights:WebStatement", "xmpRights:UsageTerms",
    # Adobe specific
    "photoshop:Source", "illustrator:StartupProfile"
]

def sanitize_value(value):
    """Sanitizes metadata value for display."""
    if isinstance(value, pikepdf.String):
        return str(value)
    if isinstance(value, pikepdf.Name):
        return str(value)
    if isinstance(value, pikepdf.Array):
        # Prevent excessive recursion or overly long strings for huge arrays
        if len(value) > 20:
            return f"Array[{len(value)} items, showing first 20]: " + ", ".join(sanitize_value(item) for item in value[:20]) + "..."
        return ", ".join(sanitize_value(item) for item in value)
    if isinstance(value, pikepdf.Dictionary):
        # Avoid overly complex dicts in direct display.
        # Could show keys if small, or just a placeholder.
        if len(value) < 5:
            return "{" + ", ".join(f"{str(k)}: {sanitize_value(v)}" for k,v in value.items()) + "}"
        return f"{{Dictionary with {len(value)} keys...}}"
    if isinstance(value, bytes):
        try:
            return value.decode('utf-8', errors='replace')
        except:
            return str(value) # Fallback for non-utf8 bytes
    return str(value)


def get_pdf_metadata(pdf_path: Path):
    """
    Extracts comprehensive metadata from a single PDF file, including deeper content analysis.
    """
    metadata = {
        "filename": pdf_path.name,
        "filepath": str(pdf_path.resolve()),
        "size_bytes": pdf_path.stat().st_size,
        "last_modified": datetime.fromtimestamp(pdf_path.stat().st_mtime).isoformat(),
        "errors": [],
        "docinfo": {},
        "xmp_metadata": {},
        "page_count": None,
        "pdf_version": None,
        "is_encrypted": None,
        "allows_printing": None,
        "allows_copying": None,
        "allows_modification": None,
        "allows_annotation": None,
        # New deep analysis fields
        "machine_identifiers_xmp": [], # Heuristic from XMP
        "contains_vector_graphics": "Unknown", # Yes/No/Restricted/Error
        "contains_solid_fills": "Unknown", # Yes/No/Restricted/Error
        "fonts": [],
        "image_count": 0,
        "image_details": [], # (page_num, name, width, height, colorspace, filter)
        "urls": [],
    }

    try:
        # allow_overwriting_input=False is generally safer for read-only operations
        with pikepdf.Pdf.open(pdf_path, allow_overwriting_input=False) as pdf:
            metadata["page_count"] = len(pdf.pages)
            metadata["pdf_version"] = str(pdf.pdf_version)
            metadata["is_encrypted"] = pdf.is_encrypted
            
            # Standard DocInfo
            if pdf.docinfo:
                for key, value in pdf.docinfo.items():
                    key_str = str(key).lstrip('/')
                    val_str = sanitize_value(value)
                    metadata["docinfo"][key_str] = val_str
            
            # XMP Metadata
            _temp_urls_from_xmp = set()
            try:
                if pdf.xmp: # pdf.xmp gives a dict-like view
                    for key, value in pdf.xmp.items():
                        k_str = str(key).replace("{http://purl.org/dc/elements/1.1/}", "dc:") \
                                      .replace("{http://ns.adobe.com/xap/1.0/}", "xmp:") \
                                      .replace("{http://ns.adobe.com/pdf/1.3/}", "pdf:") \
                                      .replace("{http://ns.adobe.com/xap/1.0/rights/}", "xmpRights:") \
                                      .replace("{http://ns.adobe.com/photoshop/1.0/}", "photoshop:") \
                                      .replace("{http://ns.adobe.com/illustrator/1.0/}", "illustrator:")
                        
                        val_sanitized = sanitize_value(value) if not isinstance(value, list) else [sanitize_value(item) for item in value]
                        metadata["xmp_metadata"][k_str] = val_sanitized
                        
                        # Heuristic check for machine names in XMP keys or values (speculative)
                        check_val_for_machine = []
                        if isinstance(val_sanitized, list): check_val_for_machine.extend(val_sanitized)
                        else: check_val_for_machine.append(val_sanitized)

                        for item_val in check_val_for_machine:
                            if isinstance(item_val, str):
                                if any(term in k_str.lower() for term in ["host", "machine", "computer", "node", "hostname", "workstation"]):
                                    if len(item_val) < 100: # Avoid very long strings
                                      metadata["machine_identifiers_xmp"].append(f"KeyMatch ({html.escape(k_str)}): {html.escape(item_val)}")
                                # ***** THIS IS THE CORRECTED LINE *****
                                if (any(term in item_val.lower() for term in ["host", "machine", "computer", "node", "hostname", "workstation"]) and len(item_val.split()) < 5): # Short value, might be a name
                                    if len(item_val) < 100:
                                        metadata["machine_identifiers_xmp"].append(f"ValueMatch ({html.escape(k_str)}): {html.escape(item_val)}")
                        
                        # Check for URLs in XMP values
                        vals_to_check_url = []
                        if isinstance(val_sanitized, list): vals_to_check_url.extend(val_sanitized)
                        else: vals_to_check_url.append(val_sanitized)
                        
                        for v_item in vals_to_check_url:
                            if isinstance(v_item, str) and (v_item.startswith("http://") or v_item.startswith("https://")):
                                _temp_urls_from_xmp.add(v_item)
            except Exception as e_xmp:
                metadata["errors"].append(f"Error reading XMP metadata: {e_xmp}")

            metadata["urls"].extend(list(_temp_urls_from_xmp)) # Add URLs from XMP

            # Permissions
            if pdf.is_encrypted:
                metadata["errors"].append("PDF is encrypted. Metadata and content analysis might be limited or require a password.")
                try:
                    metadata["allows_printing"] = pdf.allow.print_highres()
                    metadata["allows_copying"] = pdf.allow.copy_accessibility() or pdf.allow.copy_extract()
                    metadata["allows_modification"] = pdf.allow.modify_form() or pdf.allow.modify_general()
                    metadata["allows_annotation"] = pdf.allow.modify_annotation()
                except Exception as e_perm:
                    metadata["errors"].append(f"Could not read permissions for encrypted PDF: {e_perm}")
                
                # Set deep analysis fields to 'Restricted' for encrypted PDFs
                for key in ["contains_vector_graphics", "contains_solid_fills"]:
                    metadata[key] = "Restricted"
            
            else: # Not encrypted - proceed with permissions and deep analysis
                metadata["allows_printing"] = pdf.allow.print_highres()
                metadata["allows_copying"] = pdf.allow.copy_accessibility() or pdf.allow.copy_extract()
                metadata["allows_modification"] = pdf.allow.modify_form() or pdf.allow.modify_general()
                metadata["allows_annotation"] = pdf.allow.modify_annotation()

                # --- Deep Content Analysis ---
                _has_vector = False
                _has_fills = False
                _fonts_set = set()
                _images_found_details = []
                _urls_from_annots = set()

                path_construction_ops = {b'm', b'l', b'c', b'v', b'y', b're', b'h'}
                path_painting_ops = {b'S', b's', b'F', b'f', b'f*', b'B', b'b', b'B*', b'b*', b'n'}
                fill_specific_ops = {b'f', b'F', b'f*', b'B', b'b', b'B*'} # WPDFFill, EOFill, FillStroke...

                for i, page in enumerate(pdf.pages):
                    page_num = i + 1
                    try:
                        # Fonts - Check page resources
                        if page.Resources and page.Resources.get("/Font"):
                            for font_name_obj, font_obj_ref in page.Resources.Font.items():
                                try:
                                    font_obj = font_obj_ref # Resolve if indirect
                                    font_id = font_obj.get("/BaseFont") or font_obj.get("/Name") # Type3 uses /Name
                                    if font_id:
                                        _fonts_set.add(sanitize_value(font_id))
                                except Exception as font_ex:
                                    metadata["errors"].append(f"Page {page_num}: Error reading font resource {str(font_name_obj)}: {font_ex}")
                        
                        # Images (XObjects) - Check page resources
                        if page.Resources and page.Resources.get("/XObject"):
                            for xobj_name_obj, xobj_ref in page.Resources.XObject.items():
                                try:
                                    xobj = xobj_ref # Resolve if indirect
                                    if xobj.get("/Subtype") == pikepdf.Name.Image:
                                        img_detail = {
                                            "page": page_num,
                                            "name": str(xobj_name_obj).lstrip('/'),
                                            "width": sanitize_value(xobj.get("/Width", "N/A")),
                                            "height": sanitize_value(xobj.get("/Height", "N/A")),
                                            "colorspace": sanitize_value(xobj.get("/ColorSpace", "N/A")),
                                            "filter": sanitize_value(xobj.get("/Filter", "N/A"))
                                        }
                                        _images_found_details.append(img_detail)
                                except Exception as img_ex:
                                    metadata["errors"].append(f"Page {page_num}: Error processing XObject {str(xobj_name_obj)}: {img_ex}")
                        
                        # URLs from Annotations
                        if page.get("/Annots"): # Annots is an array
                            for annot_ref in page.Annots:
                                try:
                                    annot = annot_ref # Resolve if indirect
                                    if annot.get("/Subtype") == pikepdf.Name.Link and annot.get("/A"):
                                        action = annot.A
                                        if action.get("/S") == pikepdf.Name.URI and action.get("/URI"):
                                            _urls_from_annots.add(sanitize_value(action.URI))
                                except Exception as annot_ex:
                                    metadata["errors"].append(f"Page {page_num}: Error processing annotation: {annot_ex}")

                        # Vector Graphics / Solid Fills from Content Streams
                        if not (_has_vector and _has_fills): # Optimization: only parse if not already found
                            if page.get('/Contents'):
                                commands = []
                                try:
                                    commands = pikepdf.parse_content_stream(page) # Parses into a list of (operands, operator)
                                    for op_details in commands:
                                        op_name = op_details.operator
                                        if op_name in path_construction_ops or op_name in path_painting_ops:
                                            _has_vector = True
                                        if op_name in fill_specific_ops:
                                            _has_fills = True
                                            _has_vector = True # Fills imply vector
                                        if _has_vector and _has_fills: break # Found both, no need to check more for this page's stream ops
                                except Exception as cs_parse_ex:
                                    metadata["errors"].append(f"Page {page_num}: Could not parse content stream ({cs_parse_ex}). Falling back to raw byte scan for vector ops.")
                                    # Fallback: Raw byte scan if parsing fails or as a supplement
                                    raw_content_bytes = b''
                                    if isinstance(page.Contents, pikepdf.Array):
                                        for stream_ref in page.Contents:
                                            try: raw_content_bytes += stream_ref.read_bytes()
                                            except: pass
                                    elif isinstance(page.Contents, pikepdf.Stream):
                                        try: raw_content_bytes += page.Contents.read_bytes()
                                        except: pass
                                    
                                    if not _has_vector and re.search(rb'\b(m|l|c|v|y|re|h|S|s|F|f|f\*|B|b|B\*|b|n)\b', raw_content_bytes):
                                        _has_vector = True
                                    if not _has_fills and re.search(rb'\b(f|F|f\*|B|b|B\*)\b', raw_content_bytes):
                                        _has_fills = True
                                        _has_vector = True
                                
                    except Exception as page_proc_ex:
                        metadata["errors"].append(f"Page {page_num}: Major error processing: {page_proc_ex}")
                
                metadata["contains_vector_graphics"] = "Yes" if _has_vector else "No"
                metadata["contains_solid_fills"] = "Yes" if _has_fills else "No"
                metadata["fonts"] = sorted(list(_fonts_set))
                metadata["image_count"] = len(_images_found_details)
                metadata["image_details"] = _images_found_details
                metadata["urls"].extend(list(_urls_from_annots))

                # Check AcroForm Default Resources for fonts as well (often for form fields)
                try:
                    if pdf.Root.AcroForm and pdf.Root.AcroForm.get("/DR") and pdf.Root.AcroForm.DR.get("/Font"):
                        form_dr_fonts = set(metadata["fonts"]) # Start with already found fonts
                        for font_name_obj, font_obj_ref in pdf.Root.AcroForm.DR.Font.items():
                            try:
                                font_obj = font_obj_ref
                                font_id = font_obj.get("/BaseFont") or font_obj.get("/Name")
                                if font_id:
                                    form_dr_fonts.add(sanitize_value(font_id))
                            except Exception: pass # Ignore issues with individual form font resources
                        metadata["fonts"] = sorted(list(form_dr_fonts))
                except Exception as e_acro_font:
                    metadata["errors"].append(f"Note: Could not check all AcroForm DR fonts: {e_acro_font}")

            # Final cleanup of URLs and Machine Identifiers (deduplicate)
            metadata["urls"] = sorted(list(set(str(u) for u in metadata["urls"] if isinstance(u, (str, pikepdf.String, bytes))))) # Ensure strings
            metadata["machine_identifiers_xmp"] = sorted(list(set(metadata["machine_identifiers_xmp"])))

    except pikepdf.PasswordError:
        metadata["errors"].append("PDF is password protected and cannot be opened.")
        metadata["is_encrypted"] = True
        for key in ["contains_vector_graphics", "contains_solid_fills"]: metadata[key] = "Restricted"
    except pikepdf.PdfError as e_pdf: # Catch pikepdf specific errors
        metadata["errors"].append(f"Pikepdf library error processing file {pdf_path.name}: {e_pdf}")
    except Exception as e_main:
        metadata["errors"].append(f"Unexpected error processing file {pdf_path.name}: {e_main}")
        tb_str = traceback.format_exc()
        metadata["errors"].append(f"Traceback: {html.escape(tb_str[:1500])}")

    return metadata


def find_common_case_insensitive_key(data_dict, target_key):
    """Finds a key in a dictionary, case-insensitively, and returns its value."""
    if not isinstance(data_dict, dict): return None # Guard against non-dict inputs
    target_key_lower = target_key.lower()
    for k, v in data_dict.items():
        if str(k).lower() == target_key_lower:
            return v
    return None

def extract_meaningful_value(pdf_meta, key_hierarchy):
    """
    Tries to extract a meaningful value by checking multiple potential keys
    in docinfo and then XMP. Handles list results from XMP appropriately.
    """
    final_val = "N/A"
    for key in key_hierarchy:
        val_docinfo = find_common_case_insensitive_key(pdf_meta.get("docinfo", {}), key)
        if val_docinfo and str(val_docinfo).strip():
            final_val = val_docinfo
            break 
        
        val_xmp = find_common_case_insensitive_key(pdf_meta.get("xmp_metadata", {}), key)
        if val_xmp:
            if isinstance(val_xmp, list):
                # Filter out empty strings from list if present, join valid ones
                cleaned_list = [str(item).strip() for item in val_xmp if str(item).strip()]
                if cleaned_list:
                    final_val = ", ".join(cleaned_list) if len(cleaned_list) > 1 else cleaned_list[0]
                    break
            elif str(val_xmp).strip(): # Single string value
                final_val = val_xmp
                break
    return sanitize_value(final_val) if final_val != "N/A" else "N/A"


def generate_html_report(all_pdf_data, output_path: Path):
    """
    Generates a single HTML file report with embedded CSS and JS.
    """
    # --- Aggregate data for charts ---
    authors = Counter()
    creators = Counter()
    producers = Counter()
    keywords_list = []

    for pdf_meta in all_pdf_data:
        if not pdf_meta.get("errors") or not any("password protected" in e.lower() for e in pdf_meta.get("errors", [])):
            author_val_raw = extract_meaningful_value(pdf_meta, ["Author", "dc:creator"])
            if author_val_raw and author_val_raw != "N/A":
                 # Handles if extract_meaningful_value already joined a list or returned single
                authors.update(a.strip() for a in str(author_val_raw).split(',') if a.strip())


            creator_val = extract_meaningful_value(pdf_meta, ["Creator", "xmp:CreatorTool"])
            if creator_val and creator_val != "N/A":
                creators[str(creator_val).strip()] += 1

            producer_val = extract_meaningful_value(pdf_meta, ["Producer", "pdf:Producer"])
            if producer_val and producer_val != "N/A":
                producers[str(producer_val).strip()] += 1
            
            kw_raw = extract_meaningful_value(pdf_meta, ["Keywords", "dc:subject", "pdf:Keywords"])
            if kw_raw and kw_raw != "N/A":
                current_pdf_keywords = [k.strip() for k in re.split(r'[;,]', str(kw_raw)) if k.strip()]
                if current_pdf_keywords:
                    keywords_list.extend(set(current_pdf_keywords))

    common_keywords = Counter(keywords_list)
    top_n = 10
    top_authors_labels = [a[0] for a in authors.most_common(top_n)]
    top_authors_values = [a[1] for a in authors.most_common(top_n)]
    top_creators_labels = [c[0] for c in creators.most_common(top_n)]
    top_creators_values = [c[1] for c in creators.most_common(top_n)]
    top_producers_labels = [p[0] for p in producers.most_common(top_n)]
    top_producers_values = [p[1] for p in producers.most_common(top_n)]
    top_keywords_labels = [k[0] for k in common_keywords.most_common(top_n)]
    top_keywords_values = [k[1] for k in common_keywords.most_common(top_n)]

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deep PDF Metadata Report - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; color: #333; line-height:1.6; }}
        .container {{ max-width: 1300px; margin: 20px auto; padding: 20px; background-color: #fff; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }}
        header {{ background-color: #3498db; color: white; padding: 25px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        header h1 {{ margin: 0; font-size: 2.2em; }}
        header p {{ margin: 8px 0 0; font-size: 0.95em; opacity: 0.9; }}
        nav {{ text-align: center; margin-bottom: 25px; padding: 12px; background-color: #e9ecef; border-radius: 4px; }}
        nav a {{ margin: 0 18px; text-decoration: none; color: #3498db; font-weight: bold; font-size:1.05em; }}
        nav a:hover {{ text-decoration: underline; color: #2980b9; }}
        .summary-section, .pdf-details-section {{ margin-bottom: 35px; }}
        h2 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 8px; margin-top: 35px; font-size:1.8em; }}
        h3 {{ color: #3498db; margin-top: 25px; font-size:1.4em; }}
        .grid-container {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; margin-bottom:25px; }}
        .chart-container {{ padding: 20px; background-color: #f8f9fa; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }}
        .pdf-entry {{ border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px; background-color: #fff;  box-shadow: 0 1px 5px rgba(0,0,0,0.05); }}
        .pdf-header {{ background-color: #f1f1f1; padding: 12px 18px; font-weight: bold; cursor: pointer; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0; }}
        .pdf-header:hover {{ background-color: #e7e7e7; }}
        .pdf-content {{ padding: 18px; display: none; border-top: 1px solid #eee; }}
        .pdf-content table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
        .pdf-content th, .pdf-content td {{ border: 1px solid #e7e7e7; padding: 10px 14px; text-align: left; word-break: break-word; vertical-align: top; }}
        .pdf-content th {{ background-color: #f9f9f9; font-weight: 600; width: 28%; }}
        .pdf-content .value {{ font-family: 'Consolas', 'Courier New', Courier, monospace; font-size:0.9em; }}
        .pdf-content ul {{ margin-top:0; margin-bottom:0; padding-left: 20px; }}
        .pdf-content li {{ margin-bottom: 3px; }}
        .error {{ color: #e74c3c; font-weight: bold; }}
        .error ul {{ list-style-type: none; padding-left:0; }}
        .error li {{ background-color: #fadbd8; border-left: 3px solid #e74c3c; padding: 5px 8px; margin-bottom:4px; font-family: 'Consolas', monospace; font-size:0.85em; }}
        .success {{ color: #2ecc71; }}
        .warning {{ color: #f39c12; }} /* For 'Restricted' status or minor warnings */
        .tag {{ background-color: #3498db; color: white; padding: 4px 10px; border-radius: 15px; font-size: 0.8em; margin-left: 10px; vertical-align: middle; }}
        .tag.encrypted {{ background-color: #e74c3c; }}
        .tag.no-copy {{ background-color: #f39c12; color: #333; }}
        .tag.restricted {{ background-color: #f39c12; color: #333;}}
        .permissions span {{ margin-right: 12px; }}
        .file-path {{ font-size: 0.85em; color: #555; word-break: break-all; margin-bottom:10px; background-color:#f8f9fa; padding:8px; border-radius:4px; border:1px solid #e9ecef;}}
        .empty-state {{ text-align: center; padding: 25px; color: #7f8c8d; font-style: italic; }}
        .arrow {{ transition: transform 0.2s; font-size: 1.2em; }}
        .arrow.down {{ transform: rotate(90deg); }}
        #scrollToTopBtn {{
            display: none; position: fixed; bottom: 25px; right: 35px; z-index: 99;
            font-size: 20px; border: none; outline: none; background-color: #3498db; color: white;
            cursor: pointer; padding: 12px 18px; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        }}
        #scrollToTopBtn:hover {{ background-color: #2980b9; }}
    </style>
</head>
<body>
    <button onclick="scrollToTop()" id="scrollToTopBtn" title="Go to top">&#8679;</button>
    <div class="container">
        <header>
            <h1>Deep PDF Metadata Report</h1>
            <p>Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} | Total PDFs Scanned: {len(all_pdf_data)}</p>
        </header>

        <nav>
            <a href="#summary">Summary</a>
            <a href="#details">File Details</a>
        </nav>

        <section id="summary" class="summary-section">
            <h2><a name="summary"></a>Scan Summary & Infographics</h2>
            """
    if not all_pdf_data:
        html_content += "<p class='empty-state'>No PDF files found or processed.</p>"
    else:
        html_content += """<div class="grid-container">"""
        if top_authors_labels: html_content += f"""<div class="chart-container"><h3>Top Authors</h3><canvas id="authorsChart"></canvas></div>"""
        if top_creators_labels: html_content += f"""<div class="chart-container"><h3>Top Creator Tools</h3><canvas id="creatorsChart"></canvas></div>"""
        if top_producers_labels: html_content += f"""<div class="chart-container"><h3>Top Producers</h3><canvas id="producersChart"></canvas></div>"""
        if top_keywords_labels: html_content += f"""<div class="chart-container"><h3>Top Keywords</h3><canvas id="keywordsChart"></canvas></div>"""
        if not any([top_authors_labels, top_creators_labels, top_producers_labels, top_keywords_labels]):
             html_content += "<p class='empty-state' style='grid-column: 1 / -1;'>Not enough aggregated metadata for summary charts.</p>"
        html_content += "</div>" 
    html_content += """
        </section>

        <section id="details" class="pdf-details-section">
            <h2><a name="details"></a>Individual PDF Details</h2>
            """
    if not all_pdf_data:
        html_content += "<p class='empty-state'>No PDF files found or processed to show details.</p>"
    else:
        for i, pdf_meta in enumerate(all_pdf_data):
            doc_title_display = extract_meaningful_value(pdf_meta, ["dc:title", "Title"])
            if doc_title_display == "N/A" or not doc_title_display.strip():
                doc_title_display = pdf_meta.get("filename", "Untitled PDF")

            html_content += f"""
            <div class="pdf-entry" id="pdf-{i}">
                <div class="pdf-header" onclick="toggleDetails('content-{i}', 'arrow-{i}')">
                    <span>
                        <strong>{html.escape(doc_title_display)}</strong>"""
            if pdf_meta.get("is_encrypted"):
                html_content += f'<span class="tag encrypted">Encrypted</span>'
            else:
                html_content += f'<span class="tag success">Decrypted</span>'
                if not pdf_meta.get("allows_copying", True):
                    html_content += f'<span class="tag no-copy">Copy Restricted</span>'
            
            html_content += f"""
                    </span>
                    <span class="arrow" id="arrow-{i}">&#9654;</span>
                </div>
                <div id="content-{i}" class="pdf-content">
                    <p class="file-path"><strong>File:</strong> {html.escape(pdf_meta.get("filepath", "N/A"))}</p>
                    <table>
                        <tr><td colspan="2" style="background-color:#f0f8ff; font-weight:bold;">General Information</td></tr>
                        <tr><td>Filename</td><td class="value">{html.escape(pdf_meta.get("filename", "N/A"))}</td></tr>
                        <tr><td>Size</td><td class="value">{pdf_meta.get("size_bytes", 0) / (1024*1024):.2f} MB</td></tr>
                        <tr><td>Last Modified</td><td class="value">{html.escape(pdf_meta.get("last_modified", "N/A"))}</td></tr>
                        <tr><td>Page Count</td><td class="value">{pdf_meta.get("page_count", "N/A")}</td></tr>
                        <tr><td>PDF Version</td><td class="value">{html.escape(str(pdf_meta.get("pdf_version", "N/A")))}</td></tr>
                        <tr><td>Encrypted</td><td class="value { 'error' if pdf_meta.get('is_encrypted') else 'success' if pdf_meta.get('is_encrypted') is False else 'warning' }">{pdf_meta.get("is_encrypted", "Unknown")}</td></tr>
            """
            if pdf_meta.get("is_encrypted") is not None:
                perm_html = "<td class='permissions'>"
                perm_items = [
                    ("Print", pdf_meta.get('allows_printing')),
                    ("Copy", pdf_meta.get('allows_copying')),
                    ("Modify", pdf_meta.get('allows_modification')),
                    ("Annotate", pdf_meta.get('allows_annotation'))
                ]
                for p_name, p_val in perm_items:
                    status_class = 'success' if p_val else 'error' if p_val is False else 'warning' 
                    status_text = str(p_val) if p_val is not None else 'Unknown'
                    perm_html += f'<span class="{status_class}">{p_name}: {status_text}</span>'
                perm_html += "</td>"
                html_content += f"<tr><td>Permissions</td>{perm_html}</tr>"

            key_meta_fields = {
                "Title": ["dc:title", "Title"],
                "Author(s)": ["dc:creator", "Author"],
                "Subject/Description": ["dc:description", "Subject"],
                "Keywords": ["dc:subject", "Keywords", "pdf:Keywords"],
                "Creator Tool": ["xmp:CreatorTool", "CreatorApplication", "Creator"],
                "PDF Producer": ["pdf:Producer", "Producer"],
                "Creation Date": ["xmp:CreateDate", "CreationDate", "dc:date"],
                "Modification Date": ["xmp:ModifyDate", "ModDate"],
                "XMP Document ID": ["xmpMM:DocumentID"],
                "XMP Instance ID": ["xmpMM:InstanceID"],
            }
            html_content += "<tr><td colspan='2' style='background-color:#f0f8ff; font-weight:bold;'>Key Metadata</td></tr>"
            for display_name, hierarchy in key_meta_fields.items():
                value = extract_meaningful_value(pdf_meta, hierarchy)
                if value != "N/A":
                    html_content += f"<tr><td>{html.escape(display_name)}</td><td class='value'>{html.escape(value)}</td></tr>"

            if pdf_meta.get("errors"):
                html_content += f'<tr><td>Processing Errors</td><td class="error value"><ul>{"".join(f"<li>{html.escape(e)}</li>" for e in pdf_meta["errors"])}</ul></td></tr>'

            if pdf_meta.get("docinfo"):
                html_content += "<tr><td colspan='2' style='background-color:#e6e6fa; font-weight:bold;'>Raw Document Info (DocInfo)</td></tr>"
                for key, value in sorted(pdf_meta["docinfo"].items()):
                    if not any(key.lower() == h.lower() for h_list in key_meta_fields.values() for h in h_list):
                        html_content += f'<tr><td>{html.escape(str(key))}</td><td class="value">{html.escape(str(value))}</td></tr>'
            
            if pdf_meta.get("xmp_metadata"):
                html_content += "<tr><td colspan='2' style='background-color:#e6e6fa; font-weight:bold;'>Raw XMP Metadata</td></tr>"
                for key, value in sorted(pdf_meta["xmp_metadata"].items()):
                    if not any(key.lower().endswith(h.lower().split(':')[-1]) for h_list in key_meta_fields.values() for h in h_list):
                        display_val_xmp = ""
                        if isinstance(value, list):
                            display_val_xmp = "<ul>" + "".join(f"<li>{html.escape(str(v_item))}</li>" for v_item in value) + "</ul>"
                        else:
                            display_val_xmp = html.escape(str(value))
                        html_content += f'<tr><td>{html.escape(str(key))}</td><td class="value">{display_val_xmp}</td></tr>'

            html_content += "<tr><td colspan='2' style='background-color:#d1eaf0; font-weight:bold;'>Deep Content Analysis</td></tr>"
            vec_status = pdf_meta.get("contains_vector_graphics", "N/A")
            vec_class = 'success' if vec_status == "Yes" else 'error' if vec_status == "No" else 'warning'
            html_content += f"""<tr><td>Contains Vector Graphics</td><td class="value {vec_class}">{html.escape(vec_status)}</td></tr>"""
            
            fill_status = pdf_meta.get("contains_solid_fills", "N/A")
            fill_class = 'success' if fill_status == "Yes" else 'error' if fill_status == "No" else 'warning'
            html_content += f"""<tr><td>Contains Solid Fills</td><td class="value {fill_class}">{html.escape(fill_status)}</td></tr>"""
            
            img_count = pdf_meta.get("image_count", 0)
            img_class = 'success' if img_count > 0 else 'warning' 
            html_content += f"""<tr><td>Image Count</td><td class="value {img_class}">{img_count}</td></tr>"""

            if pdf_meta.get("image_details"):
                html_content += "<tr><td>Image Details</td><td class='value'><ul>"
                for idx, img_det in enumerate(pdf_meta["image_details"]):
                    if idx < 5 : 
                        html_content += f"<li>Pg {img_det['page']}: {html.escape(img_det['name'])} (W:{img_det['width']}, H:{img_det['height']}, CS:{html.escape(img_det['colorspace'])}, Filter:{html.escape(img_det['filter'])})</li>"
                    elif idx == 5:
                         html_content += f"<li>... and {len(pdf_meta['image_details']) - 5} more images.</li>"
                         break
                html_content += "</ul></td></tr>"
            
            if pdf_meta.get("fonts"):
                font_list = pdf_meta["fonts"]
                html_content += "<tr><td>Fonts Detected</td><td class='value'>"
                if font_list:
                    display_fonts = [html.escape(f) for f in font_list[:15]] 
                    html_content += ", ".join(display_fonts)
                    if len(font_list) > 15:
                        html_content += f", ... ({len(font_list) - 15} more)"
                else:
                    html_content += "None detected or analysis restricted."
                html_content += "</td></tr>"
            else:
                html_content += "<tr><td>Fonts Detected</td><td class='value warning'>N/A or analysis restricted.</td></tr>"

            if pdf_meta.get("urls"):
                url_list = pdf_meta["urls"]
                html_content += "<tr><td>Detected URLs</td><td class='value'><ul>"
                if url_list:
                    for idx, u_item in enumerate(url_list):
                        if idx < 10: 
                            html_content += f"<li><a href='{html.escape(str(u_item))}' target='_blank' rel='noopener noreferrer'>{html.escape(str(u_item))}</a></li>"
                        elif idx == 10:
                            html_content += f"<li>... and {len(url_list) - 10} more URLs.</li>"
                            break
                else:
                    html_content += "<li>No URLs detected.</li>"
                html_content += "</ul></td></tr>"
            else:
                html_content += "<tr><td>Detected URLs</td><td class='value warning'>N/A or analysis restricted.</td></tr>"

            if pdf_meta.get("machine_identifiers_xmp"):
                html_content += "<tr><td>Machine Identifiers (XMP Heuristic)</td><td class='value'><ul>"
                for item in pdf_meta["machine_identifiers_xmp"]:
                    html_content += f"<li>{item}</li>" # Item is already escaped if needed by get_pdf_metadata
                html_content += "</ul></td></tr>"

            html_content += """
                    </table>
                </div> 
            </div> 
            """
    html_content += """
        </section> 
    """
    html_content += """
    </div> 
    <script>
        function toggleDetails(contentId, arrowId) {
            const content = document.getElementById(contentId);
            const arrow = document.getElementById(arrowId);
            if (content.style.display === "none" || content.style.display === "") {
                content.style.display = "block";
                arrow.innerHTML = "&#9660;"; 
                arrow.classList.add("down")
            } else {
                content.style.display = "none";
                arrow.innerHTML = "&#9654;"; 
                arrow.classList.remove("down");
            }
        }
        
        const scrollToTopBtn = document.getElementById("scrollToTopBtn");
        window.onscroll = function() {scrollFunction()};
        function scrollFunction() {
            if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
                scrollToTopBtn.style.display = "block";
            } else {
                scrollToTopBtn.style.display = "none";
            }
        }
        function scrollToTop() {
            document.body.scrollTop = 0; 
            document.documentElement.scrollTop = 0; 
        }
        
        const chartColors = [
            'rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)',
            'rgba(255, 206, 86, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(100, 255, 100, 0.7)', 'rgba(255,100,100,0.7)'
        ];

        function createBarChart(canvasId, label, labels, data) {
            if (!document.getElementById(canvasId) || labels.length === 0) return;
            const ctx = document.getElementById(canvasId).getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: data,
                        backgroundColor: chartColors.slice(0, labels.length),
                        borderColor: chartColors.map(c => c.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
        
        """
    if top_authors_labels: html_content += f"""createBarChart('authorsChart', 'Author Count', {json.dumps(top_authors_labels)}, {json.dumps(top_authors_values)});"""
    if top_creators_labels: html_content += f"""createBarChart('creatorsChart', 'Creator Tool Count', {json.dumps(top_creators_labels)}, {json.dumps(top_creators_values)});"""
    if top_producers_labels: html_content += f"""createBarChart('producersChart', 'Producer Count', {json.dumps(top_producers_labels)}, {json.dumps(top_producers_values)});"""
    if top_keywords_labels: html_content += f"""createBarChart('keywordsChart', 'Keyword Count', {json.dumps(top_keywords_labels)}, {json.dumps(top_keywords_values)});"""
    
    html_content += """
    window.onload = function() { 
    """
    if all_pdf_data:
         first_pdf_has_critical_error = any("password protected" in e.lower() or "Pikepdf library error" in e for e in all_pdf_data[0].get("errors",[]))
         if not first_pdf_has_critical_error:
            html_content += "if (document.getElementById('content-0')) { toggleDetails('content-0', 'arrow-0'); }"
    html_content += """
        if(window.location.hash) { 
            const hash = window.location.hash.substring(1);
            const element = document.getElementById(hash);
            if (element) {
                if(element.classList.contains('pdf-entry')) {
                    const contentId = element.querySelector('.pdf-content').id;
                    const arrowId = element.querySelector('.arrow').id;
                    const openContent = document.querySelector('.pdf-content[style*="block"]');
                    if(openContent && openContent.id !== contentId) {
                        const openArrowId = openContent.id.replace('content-', 'arrow-');
                        toggleDetails(openContent.id, openArrowId);
                    }
                    toggleDetails(contentId, arrowId);
                }
                setTimeout(() => { element.scrollIntoView({ behavior: 'smooth' }); }, 100);
            }
        }
    };
    </script>
</body>
</html>
    """
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        return True
    except Exception as e:
        print(f"ERROR: Could not write HTML report to {output_path}: {e}")
        return False


def main():
    root = tk.Tk()
    root.withdraw()

    print("Welcome to the Deep PDF Metadata Scraper!")
    print("Please select the directory containing the PDF files you want to analyze.")
    target_dir_str = filedialog.askdirectory(title="Select Folder Containing PDFs")
    
    if not target_dir_str:
        print("No directory selected. Exiting.")
        return
    target_dir = Path(target_dir_str)
    print(f"Scanning directory: {target_dir}")

    all_pdf_data = []
    pdf_files_found = sorted(list(set( list(target_dir.rglob("*.pdf")) + list(target_dir.rglob("*.PDF")) )))

    if not pdf_files_found:
        print(f"No PDF files found in '{target_dir}' (including subdirectories).")
    else:
        print(f"Found {len(pdf_files_found)} PDF files. Starting metadata extraction (this may take a while for deep analysis)...")
        total_files = len(pdf_files_found)
        progress_bar_width = 40
        for i, pdf_file_path in enumerate(pdf_files_found):
            progress = (i + 1) / total_files
            filled_length = int(progress_bar_width * progress)
            bar = '█' * filled_length + '-' * (progress_bar_width - filled_length)
            # Ensure filename doesn't break console formatting if too long
            display_name = pdf_file_path.name
            if len(display_name) > 30:
                display_name = display_name[:27] + "..."

            print(f'\rProcessing: [{bar}] {i+1}/{total_files} ({display_name:<30})...', end="")
            
            metadata = get_pdf_metadata(pdf_file_path)
            all_pdf_data.append(metadata)
        print("\nMetadata extraction complete.") 

    all_pdf_data.sort(key=lambda x: x.get("filename", "").lower())

    print("\nPlease choose where to save the HTML report.")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    default_filename = f"deep_pdf_metadata_report_{timestamp}.html"
    initial_dir_for_save = target_dir if target_dir.is_dir() else Path.cwd()

    html_report_path_str = filedialog.asksaveasfilename(
        title="Save HTML Report As",
        initialdir=str(initial_dir_for_save),
        initialfile=default_filename,
        defaultextension=".html",
        filetypes=[("HTML files", "*.html"), ("All files", "*.*")]
    )

    if not html_report_path_str:
        print("Report saving was cancelled. Exiting.")
        return
    html_report_path = Path(html_report_path_str)

    print(f"\nGenerating HTML report and saving to: {html_report_path}")
    report_generated_successfully = generate_html_report(all_pdf_data, html_report_path)

    if report_generated_successfully:
        print("\nReport generation successful!")
        try:
            abs_path = html_report_path.resolve()
            url_path = f"file://{abs_path}"
            print(f"HTML Report is located at: {url_path}")

            if os.name == 'nt': os.startfile(abs_path)
            elif os.name == 'posix':
                if 'WSL_DISTRO_NAME' in os.environ: os.system(f'explorer.exe "{url_path.replace("file://", "")}"') 
                elif 'OPEN_BROWSER' in os.environ : os.system(f'{os.environ["OPEN_BROWSER"]} "{url_path}"')
                elif os.system(f'xdg-open "{url_path}"') != 0: os.system(f'open "{url_path}"')
            print("Attempted to open the report in your default browser.")
        except Exception as open_e:
            print(f"Could not automatically open the report (Error: {open_e}). Please open it manually from the path above.")
    else:
        print("Report generation failed. Please check console for errors.")

    print("\nDeep PDF Metadata Scraping Finished.")

if __name__ == "__main__":
    main()