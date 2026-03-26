@echo off
REM Install dependencies from cloned repositories to main Python installation

echo Installing ezdxf from cloned repository...
pip install -e "d:\10_CoreLib__ValeCodebase\Root_GeneralDeveloperTools\02_Python\20__Python__PDFTools\Py_PdfUtils__PdfToDxfConverter\01__ExternalDependencies\ezdxf"

echo.
echo Installing PyMuPDF...
echo Note: PyMuPDF requires Visual Studio Build Tools to compile from source.
echo Installing from PyPI (pre-built wheels) instead...
pip install pymupdf

echo.
echo Installation complete!
pause


