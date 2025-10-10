# Example Project - Garden House Alpha

This is an example project folder demonstrating the structure for Whitecardopedia.

## Required Files

Each project folder should contain:

1. **project.json** - Project metadata and configuration
2. **Image files** - Whitecard/massing model images (JPG or PNG format)

## Project JSON Schema

```json
{
    "projectName": "Garden House Alpha",
    "projectCode": "VGH-2025-001",
    "ratings": {
        "quality": 4,
        "prestige": 5,
        "value": 3
    },
    "productionData": {
        "input": "CAD File",
        "duration": 2,
        "additionalNotes": "Preliminary design phase complete"
    },
    "sketchUpModel": {
        "url": "https://3dwarehouse.sketchup.com/model/example"
    },
    "images": [
        "view_01_front.jpg",
        "view_02_side.jpg",
        "view_03_rear.jpg",
        "view_04_aerial.jpg"
    ],
    "description": "Optional project description"
}
```

## Rating System

All ratings use 1-5 star scale:
- **Quality** - Build quality and design execution
- **Prestige** - Brand positioning and market perception
- **Value** - Cost effectiveness and market competitiveness

## Production Data Fields

Additional production information:
- **Input** - Source material type (e.g., "CAD File", "Hand Sketch", "3D Scan")
- **Duration** - Production time in hours (displayed as "X Hours")
- **Additional Notes** - Free-form text for production notes and comments

## SketchUp Model Link

Optional link to SketchUp 3D Warehouse or other model hosting:
- **url** - URL to SketchUp model
- If omitted or set to "None", "nil", "Nil", or "False", the button will not display
- Button opens model in new tab when clicked

## Image Requirements

- **Format**: JPG or PNG
- **Naming**: Descriptive filenames (e.g., view_01_front.jpg)
- **Content**: Whitecard (massing model) renderings
- **Minimum**: At least 1 image per project
- **Recommended**: 3-6 images showing different views

## Adding New Projects

1. Create new folder in `Projects/2025/[ProjectName]`
2. Add `project.json` with required fields
3. Add project image files
4. Update `src/data/masterConfig.json` to include the new project folder ID
5. Set `enabled: true` in masterConfig.json

## Example MasterConfig Entry

```json
{
    "folderId": "ExampleProject_GardenHouse_Alpha",
    "enabled": true
}
```

