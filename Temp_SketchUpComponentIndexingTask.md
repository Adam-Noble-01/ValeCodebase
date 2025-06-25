# Temp_SketchUpComponentIndexingTask.md


Study This folder
01_-_Core-Lib_-_SU-Components

Full Windows Dir Path
D:\02_-_Core-Lib_-_SketchUp\01_-_Core-Lib_-_SU-Components

Context
It contains my SketchUp components

List the components in this folder like so:

01 Series
Item 01
Item 02
Item 03

02 Series
Item 01
Item 02
Item 03

03 Series
Item 01
Item 02
Item 03

04 Series
Item 01
Item 02
Item 03


# INDEX OF CURRENT SKETCHUP COMPONENTS

00 Series - Core Modelling Elements
00_01_-_Core-Modelling-Elements-Library.skp - Core Modelling Elements Library
00_31_-_3D-Mirror-Plane_-_X-Plane_-_x10m_x_z10m.skp - 3D Mirror Plane X-Plane (10m x 10m)
00_32_-_3D-Mirror-Plane_-_Y-Plane_-_x10m_x_z10m.skp - 3D Mirror Plane Y-Plane (10m x 10m)

10 Series - Site & Host Building Elements
85_00_-_Temp-Velux-Roof-Windows/ - Temporary Velux Roof Windows (folder)

20 Series - Vale Orangery Elements
20_10_01_-_Window-Bottom-Frame-Standard-Profile.skp - Window Bottom Frame Standard Profile
20_10_02_-_Window-Board-Standard-Profile.skp - Window Board Standard Profile
20_10_00_-_Window-Cill-Standard-Profile.skp - Window Cill Standard Profile
20_10_40_-_Argory-Range_-_Window-Cill-Profile.skp - Argory Range Window Cill Profile
20_20_10_-_Exterior-Column_-_Core-w290mm_-_Type-01.skp - Exterior Column Core 290mm Type 01
20_20_20_-_Exterior-Corner-Column_-_Core-w290mm_-_Var-01.skp - Exterior Corner Column Core 290mm Variant 01
20_60_00_-_Entablature-Standard-Profile.skp - Entablature Standard Profile

30 Series - Vale Interiors Elements
30_11_-_Lounge-Seating_-_1-Seat-Armchair_-_Outdoor_Living_-_Var01.skp - Lounge Seating 1-Seat Armchair Outdoor Living Variant 01
30_11_-_Lounge-Seating_-_2-Seat-Sofa_-_Outdoor_Living_-_Var01.skp - Lounge Seating 2-Seat Sofa Outdoor Living Variant 01
30_11_-_Lounge-Seating_-_3-Seat-Sofa_-_Outdoor_Living_-_Var01.skp - Lounge Seating 3-Seat Sofa Outdoor Living Variant 01
30_18_-_Area-Rug_-_Beige-With-Border_-_Var01.skp - Area Rug Beige With Border Variant 01
30_20_-_Dining-Stool-Chair-Back_-_Var01.skp - Dining Stool Chair Back Variant 01
32_01_-_Side-Table_-_Traditional-Sideboard-Var-01.skp - Side Table Traditional Sideboard Variant 01
33_01_-_Dining-Table_-_Rounded-Var-01.skp - Dining Table Rounded Variant 01
33_01_-_Dining-Table_-_Rounded-Var-02_-_1650mm-dia.skp - Dining Table Rounded Variant 02 (1650mm diameter)
33_01_-_Dining-Table_-_Rounded-Var-02_-_2000mm-dia_-_8-Chairs.skp - Dining Table Rounded Variant 02 (2000mm diameter with 8 Chairs)
34_01_-_Dining-Chair_-_Classic-Contemporary_-_Var-01.skp - Dining Chair Classic Contemporary Variant 01
35_01_-_Floor_Lamp_-_Tripod-Floor-Lamp_-_Var01.skp - Floor Lamp Tripod Floor Lamp Variant 01
39_01_-_Light-Fixture_-_Orbital-Var-01.skp - Light Fixture Orbital Variant 01
30_50_-_Appliance_-_Oven_-_Miele-H7440-BMX_-_Obsidian-Black.skp - Appliance Oven Miele H7440-BMX Obsidian Black
30_50_-_Appliance_-_Oven_-_Miele-H7464-BPX_-_Obsidian-Black.skp - Appliance Oven Miele H7464-BPX Obsidian Black
30_50_-_Appliance_-_Warming-Drawer_-_Miele-ESW-7020_-_Obsidian-Black.skp - Appliance Warming Drawer Miele ESW-7020 Obsidian Black

40 Series - Decoration And Vegetation Elements
40_01_-_House-Plant-01.skp - House Plant 01
40_02_-_House-Plant-02.skp - House Plant 02
40_21_-_Decoration_-_Flowers-In-Glass-Vase.skp - Decoration Flowers In Glass Vase

50 Series - Scene Context Elements
(Empty folder)

70 Series - Standard Vale Profiles Library
85_00_-_Temp_-_Door-Moulding.skp - Temporary Door Moulding
20_10_40_-_Argory-Range_-_Window-Cill-Profile.skp - Argory Range Window Cill Profile

90 Series - Superseded Elements Archive
10_10_-_Column.skp - Column (Legacy)


# JSON TEMPLATE FOR TYPICAL COMPONENT

```json
{
  "componentInfo": {
    "id": "30_11_01",
    "fileName": "30_11_-_Lounge-Seating_-_1-Seat-Armchair_-_Outdoor_Living_-_Var01.skp",
    "displayName": "Lounge Seating 1-Seat Armchair Outdoor Living Variant 01",
    "shortName": "1-Seat Armchair Outdoor",
    "series": {
      "number": "30",
      "name": "Vale Interiors Elements",
      "category": "Interior Furniture"
    },
    "version": "1.0.1",
    "variant": "01",
    "status": "active",
    "dateCreated": "2024-01-15",
    "dateModified": "2024-03-10"
  },
  "specifications": {
    "type": "furniture",
    "subtype": "seating",
    "style": "outdoor_living",
    "dimensions": {
      "width": 800,
      "depth": 850,
      "height": 780,
      "units": "mm"
    },
    "weight": {
      "value": 15.5,
      "units": "kg"
    },
    "materials": [
      {
        "name": "Teak Wood Frame",
        "finish": "Natural Oil",
        "color": "#8B4513"
      },
      {
        "name": "Outdoor Cushion",
        "fabric": "Weather Resistant",
        "color": "#F5F5DC"
      }
    ]
  },
  "usage": {
    "environment": ["outdoor", "conservatory", "orangery"],
    "function": "seating",
    "capacity": 1,
    "suitableFor": ["residential", "hospitality", "commercial"]
  },
  "technical": {
    "fileSize": "428KB",
    "lineCount": 1735,
    "complexity": "medium",
    "renderQuality": "high",
    "hasTextures": true,
    "hasAnimations": false,
    "polyCount": 12500
  },
  "relationships": {
    "partOf": "Outdoor Living Collection",
    "compatibleWith": [
      "30_11_-_Lounge-Seating_-_2-Seat-Sofa_-_Outdoor_Living_-_Var01",
      "30_11_-_Lounge-Seating_-_3-Seat-Sofa_-_Outdoor_Living_-_Var01"
    ],
    "alternativeVariants": [
      "30_11_-_Lounge-Seating_-_1-Seat-Armchair_-_Indoor_Living_-_Var01"
    ]
  },
  "metadata": {
    "tags": ["seating", "armchair", "outdoor", "teak", "comfortable", "weather-resistant"],
    "keywords": ["garden furniture", "patio seating", "outdoor armchair"],
    "designer": "Vale Design Team",
    "manufacturer": "Vale Orangery",
    "modelNumber": "VOL-AC-001",
    "sku": "30-11-OL-AC-01",
    "priceCategory": "premium"
  },
  "assets": {
    "thumbnail": "30_11_armchair_thumb.jpg",
    "renderImages": [
      "30_11_armchair_front.jpg",
      "30_11_armchair_side.jpg",
      "30_11_armchair_back.jpg"
    ],
    "documentationFiles": [
      "30_11_armchair_assembly.pdf",
      "30_11_armchair_care.pdf"
    ]
  }
}
```

Example

# JSON TEMPLATE FOR SKETCHUP MATERIALS FOLDER INDEX

```json
{
  "materialInfo": {
    "id": "70_10_01",
    "materialName": "Vale_Oak_Natural_Grain_01",
    "displayName": "Vale Oak Natural Grain Variant 01",
    "shortName": "Oak Natural",
    "series": {
      "number": "70",
      "name": "Standard Vale Materials Library",
      "category": "Wood Materials"
    },
    "version": "1.2.0",
    "variant": "01",
    "status": "active",
    "dateCreated": "2024-01-10",
    "dateModified": "2024-04-15"
  },
  "specifications": {
    "materialType": "wood",
    "subtype": "hardwood",
    "species": "quercus_robur",
    "finish": "natural_oil",
    "treatment": "UV_protected",
    "grade": "premium",
    "origin": "european_oak",
    "sustainability": {
      "certified": "FSC",
      "rating": "A+",
      "renewable": true
    }
  },
  "visualProperties": {
    "baseColor": {
      "hex": "#B8860B",
      "rgb": [184, 134, 11],
      "name": "Warm Golden Brown"
    },
    "texture": {
      "pattern": "wood_grain",
      "direction": "vertical",
      "scale": "1:1",
      "seamless": true,
      "resolution": "2048x2048"
    },
    "surface": {
      "roughness": 0.7,
      "reflectivity": 0.15,
      "metallic": 0.0,
      "specular": 0.3,
      "glossiness": 0.25,
      "bump": 0.4
    },
    "transparency": {
      "alpha": 1.0,
      "opacity": 100,
      "translucent": false
    }
  },
  "physicalProperties": {
    "density": {
      "value": 720,
      "units": "kg/m³"
    },
    "hardness": {
      "janka": 1360,
      "units": "lbf"
    },
    "moisture": {
      "content": 8,
      "units": "percent"
    },
    "thermal": {
      "conductivity": 0.17,
      "expansion": 0.00004,
      "units": "W/mK"
    }
  },
  "usage": {
    "applications": ["flooring", "furniture", "structural", "decorative"],
    "environments": ["interior", "covered_exterior"],
    "components": ["columns", "beams", "panels", "trim"],
    "suitableFor": ["residential", "commercial", "heritage"],
    "restrictions": ["not_fully_exterior", "requires_maintenance"]
  },
  "technical": {
    "textureFiles": [
      {
        "type": "diffuse",
        "fileName": "Vale_Oak_Natural_Diffuse_2K.jpg",
        "resolution": "2048x2048",
        "format": "JPEG",
        "size": "1.2MB"
      },
      {
        "type": "normal",
        "fileName": "Vale_Oak_Natural_Normal_2K.jpg",
        "resolution": "2048x2048",
        "format": "JPEG",
        "size": "1.8MB"
      },
      {
        "type": "roughness",
        "fileName": "Vale_Oak_Natural_Roughness_2K.jpg",
        "resolution": "2048x2048",
        "format": "JPEG",
        "size": "0.9MB"
      },
      {
        "type": "bump",
        "fileName": "Vale_Oak_Natural_Bump_2K.jpg",
        "resolution": "2048x2048",
        "format": "JPEG",
        "size": "1.1MB"
      }
    ],
    "sketchupProperties": {
      "materialFile": "Vale_Oak_Natural_01.skm",
      "fileSize": "4.8MB",
      "colorByLayer": false,
      "backFaceSameAs": "front",
      "uvMapping": "projected",
      "renderEngine": ["vray", "enscape", "lumion"]
    },
    "quality": {
      "seamTiling": "perfect",
      "photoRealism": "high",
      "scalability": "excellent",
      "performanceImpact": "medium"
    }
  },
  "relationships": {
    "partOf": "Vale Classic Wood Collection",
    "compatibleWith": [
      "70_10_02_Vale_Oak_Natural_Grain_02",
      "70_10_03_Vale_Oak_Weathered_Grain_01",
      "70_11_01_Vale_Oak_Stained_Dark_01"
    ],
    "alternativeFinishes": [
      "Vale_Oak_Oiled_01",
      "Vale_Oak_Lacquered_01",
      "Vale_Oak_Waxed_01"
    ],
    "complementaryMaterials": [
      "70_20_01_Vale_Limestone_Natural",
      "70_30_01_Vale_Steel_Brushed",
      "70_40_01_Vale_Glass_Clear"
    ]
  },
  "metadata": {
    "tags": ["wood", "oak", "natural", "grain", "premium", "sustainable"],
    "keywords": ["hardwood flooring", "furniture grade", "architectural timber"],
    "designer": "Vale Materials Team",
    "supplier": "Premium Timber Solutions Ltd",
    "materialCode": "VTM-OAK-NAT-001",
    "sku": "70-10-OAK-NAT-01",
    "priceCategory": "premium",
    "maintenance": "medium",
    "lifespan": "50+ years"
  },
  "assets": {
    "swatchImage": "Vale_Oak_Natural_Swatch.jpg",
    "materialPreview": "Vale_Oak_Natural_Preview_4K.jpg",
    "renderSamples": [
      "Vale_Oak_Natural_Floor_Render.jpg",
      "Vale_Oak_Natural_Furniture_Render.jpg",
      "Vale_Oak_Natural_Paneling_Render.jpg"
    ],
    "installationImages": [
      "Vale_Oak_Natural_Installation_01.jpg",
      "Vale_Oak_Natural_Installation_02.jpg"
    ],
    "documentationFiles": [
      "Vale_Oak_Natural_TechnicalSpecs.pdf",
      "Vale_Oak_Natural_Installation.pdf",
      "Vale_Oak_Natural_Maintenance.pdf",
      "Vale_Oak_Natural_Sustainability.pdf"
    ]
  },
  "certification": {
    "fireRating": "Class_C",
    "environmentalRating": "A+",
    "healthSafety": "E1_Emission_Standard",
    "qualityStandards": ["ISO_9001", "CE_Marking", "FSC_Certified"],
    "testingLab": "British Timber Testing Institute",
    "certificationDate": "2024-02-20"
  },
  "availability": {
    "inStock": true,
    "leadTime": "2-3 weeks",
    "minimumOrder": "50 sqm",
    "regions": ["UK", "EU", "North_America"],
    "seasonalVariations": false,
    "customization": {
      "available": true,
      "options": ["custom_staining", "custom_dimensions", "custom_grading"]
    }
  }
}
```
