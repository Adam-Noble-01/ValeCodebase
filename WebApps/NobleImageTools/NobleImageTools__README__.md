# NobleImageTools

Local AI-powered image masking tool using **Meta SAM 2.1** (Segment Anything Model).

## What it does

- Load images from your local machine via an interactive file browser
- Click or drag a box on the image to segment any object using SAM 2.1
- Auto-segment everything in an image with one click
- Build up a layer stack of named mask layers
- Export masks as:
  - **B&W PNG** — white=object, black=background (use as Photoshop layer mask)
  - **RGBA Cutout** — original pixels inside mask, transparent background
  - **Color ID Map** — all objects with unique flat colours (use Select by Color Range in PS)
  - **ZIP Bundle** — all B&W layers + Color ID in one archive

## Quick Start

### 1. Create a Python virtual environment

```powershell
cd D:\10_CoreLib__ValeCodebase\WebApps\NobleImageTools
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

CPU only (works on all Windows machines):
```powershell
pip install -r 05__Server__Sam2Backend\requirements.txt
```

GPU accelerated (NVIDIA CUDA — much faster):
```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install flask flask-cors Pillow numpy sam2
```

### 3. Download the SAM 2.1 model

```powershell
python 00__AiModels\download_models.py
```

Downloads `sam2.1_hiera_large.pt` (~224 MB) from Meta's CDN.

### 4. Launch the app

```powershell
.\NobleImageTools__LaunchServer__Localhost__8005__.ps1
```

Or directly:
```powershell
python NobleImageTools__LaunchServer__Localhost__8005__.py
```

Open: [http://127.0.0.1:8005/NobleImageTools__App__.html](http://127.0.0.1:8005/NobleImageTools__App__.html)

## Using the App

| Control | Action |
|---------|--------|
| Left-click | Add positive prompt point (include this area) |
| Right-click | Add negative prompt point (exclude this area) |
| Drag (Box mode) | Draw a bounding box prompt |
| Scroll wheel | Zoom in/out (centred on cursor) |
| Middle-mouse drag | Pan the canvas |
| Space + drag | Pan the canvas |
| ✓ Accept Mask | Commit the preview mask as a layer |
| ✕ Clear Prompt | Remove current click points / box |
| ⚡ Auto-Segment | Detect all objects automatically |

## SAM 2.1 Model Options

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| hiera_large (default) | 224 MB | Slower | Best |
| hiera_base_plus | 81 MB | Medium | Good |
| hiera_small | 46 MB | Fast | Good |
| hiera_tiny | 38 MB | Fastest | OK |

Download other sizes: `python 00__AiModels\download_models.py --model base_plus`

## Project Structure

```
NobleImageTools/
├── NobleImageTools__App__.html          ← main app
├── NobleImageTools__LaunchServer__Localhost__8005__.ps1
├── 00__AiModels/
│   ├── Sam2__Checkpoints/               ← model .pt files
│   └── download_models.py
├── 02__Src__AppModules/                 ← JavaScript modules
├── 03__Style__AppStylesheets/           ← CSS
├── 05__Server__Sam2Backend/             ← Flask + SAM2 Python
│   ├── requirements.txt
│   └── *.py
└── 06__LocalProjectData/
    └── __MaskExports__/                 ← saved mask PNGs
```

## Notes

- SAM2 on Windows natively works on CPU. For GPU, install CUDA PyTorch variant.
- First SAM2 inference after startup is slower (model initialisation). Subsequent calls are fast.
- The model is loaded lazily on the first `/api/sam2/predict` or `/api/sam2/auto` request.
