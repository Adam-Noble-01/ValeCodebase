import fitz
import ezdxf

def convert_pdf_to_dxf(pdf_path, dxf_path):
    try:
        document = fitz.open(pdf_path)
    except Exception as error:
        return f"Error opening document: {error}"

    dxf_document = ezdxf.new(dxfversion="R2010")
    model_space = dxf_document.modelspace()

    for page_num in range(len(document)):
        page = document[page_num]
        paths = page.get_drawings()

        for path in paths:
            for item in path["items"]:
                if item[0] == "l":
                    start_point = (item[1].x, -item[1].y)
                    end_point = (item[2].x, -item[2].y)
                    model_space.add_line(start_point, end_point)
                elif item[0] == "re":
                    rect = item[1]
                    points = [
                        (rect.x0, -rect.y0),
                        (rect.x1, -rect.y0),
                        (rect.x1, -rect.y1),
                        (rect.x0, -rect.y1),
                        (rect.x0, -rect.y0)
                    ]
                    for i in range(4):
                        model_space.add_line(points[i], points[i+1])
                elif item[0] == "c":
                    start = (item[1].x, -item[1].y)
                    end = (item[4].x, -item[4].y)
                    model_space.add_line(start, end)

    document.close()
    dxf_document.saveas(dxf_path)
    return f"Successfully saved DXF to {dxf_path}"

source_file = r"C:\Users\adamw\Downloads\7-383(D)007_Prop_Side Elevs_220925.pdf"
destination_file = r"C:\Users\adamw\Downloads\Converted_Elevations.dxf"
print(convert_pdf_to_dxf(source_file, destination_file))