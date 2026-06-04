import fitz

def analyse_pdf_vectors(file_path):
    try:
        document = fitz.open(file_path)
    except Exception as error:
        return f"Error opening document: {error}"

    results = []

    for page_num in range(len(document)):
        page = document[page_num]
        vector_paths = page.get_drawings()
        raster_images = page.get_images(full=True)

        path_count = len(vector_paths)
        image_count = len(raster_images)

        if path_count > 50:
            classification = "True vector CAD drawing detected"
        elif path_count > 0:
            classification = "Minimal vector data detected"
        else:
            classification = "No vector data detected"

        page_summary = (
            f"Page {page_num + 1}: {classification}. "
            f"Vector paths: {path_count}. "
            f"Raster images: {image_count}."
        )
        results.append(page_summary)

    document.close()
    return "\n".join(results)

# Example usage
# print(analyse_pdf_vectors("architectural_elevation.pdf"))