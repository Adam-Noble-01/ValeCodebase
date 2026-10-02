# Door Animation System - Technical Documentation
# =============================================================================

**Feature:** Click-to-Open Door Animation for ValeVision3D  
**Created:** 14-Feb-2026  
**Author:** Adam Noble - Noble Architecture  
**Module Version:** 1.7.0 (10-Jul-2026)

---

## Current Capabilities

- One panel engine supports `ROT_ONLY`, `ROT_MVE`, `MVE_ONLY`, and `FIXED`.
- Bifold and sliding products animate every MOD in lockstep.
- Signed rotation degrees and signed MVE distances are parsed from MOD names.
- Mirrored ADR transforms and the config-gated interior sign convention are
  resolved at scan time.
- Explicit `ExteriorDoubleDoor` ADRs animate each ROT leaf independently.
- Walk/Fly proximity opens both leaves of an unfixed exterior-double pair
  together; orbit-mode clicks remain independent. FIXED assemblies retain
  nearest-eligible-leaf sensor behavior.
- Interior double doors, bifolds, sliding doors, and unknown ADRs stay lockstep.

---

## Quick Start

**1. Model Setup in SketchUp:**
- Name door assemblies with `ADR` prefix (e.g., `ADR002__InternalDoor__GroundFloor__PorchToLounge`)
- Inside each ADR, use one or more supported MOD patterns:
  - `MOD001__ROT__-90-Deg__DoorPanel` (`ROT_ONLY`)
  - `MOD002__ROT__95-Deg__MVE__X+600-mm__BifoldPanel` (`ROT_MVE`)
  - `MOD001__MVE__X+1200-mm__SlidingPanel` (`MVE_ONLY`)
  - `MOD002__FIXED__SlidingPanel` (`FIXED`)
- Add one `ROT###` sibling per rotating MOD; pairing follows rotating sibling index.
- Place all doors on tag `25__ProposedBuilding__Doors`

**2. Export from SketchUp:**
- Extensions → TrueVision GLB Builder → Export GLBs
- Generates: `*__ProposedDoors__MeshModel__.glb` and `*__ProposedDoors__LineworkModel__.glb`

**3. ValeVision3D loads automatically:**
- Models detected by multi-model loader
- Door animation initializes if config enabled
- Click any door to open/close

---

## Integration (Main Application)

### Module Location
**File:** [`02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`](../02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js)

### Configuration
**File:** [`02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`](../02__Src__AppModules/02__AppData/Na__AppConfig__Main.json)

```json
{
    "3dObject__InteractionsSystem": {
        "3dObject__Interaction__DoorAnimation": {
            "3dObject__Interaction__DoorAnimation__Enabled": true,
            "3dObject__Interaction__DoorAnimation__AnimationDurationMs": 600,
            "3dObject__Interaction__DoorAnimation__BifoldDurationMultiplier": 3.0,
            "3dObject__Interaction__DoorAnimation__DefaultRotationDeg": 90,
            "3dObject__Interaction__DoorAnimation__ClickThresholdPx": 4,
            "3dObject__Interaction__DoorAnimation__MultiPanelEnabled": true,
            "3dObject__Interaction__DoorAnimation__InteriorRotationInverted": false,
            "3dObject__Interaction__DoorAnimation__IndependentPanelsEnabled": true,
            "3dObject__Interaction__DoorAnimation__IndependentPanelAdrNameTokens": [
                "ExteriorDoubleDoor"
            ]
        }
    }
}
```

`MultiPanelEnabled` is an emergency rollback to the first legacy `ROT_ONLY`
panel. `IndependentPanelsEnabled` returns every ADR to whole-door lockstep.
The token list is an explicit allow-list: two `ROT_ONLY` panels alone do not
imply independence because interior double doors use the same structure.

### Main App Integration
**File:** `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`

ValeVision keeps its existing token-based category collection and passes arrays
of mesh/linework roots into `Na__DoorAnimation__Initialize`. The render loop
continues to call `Na__DoorAnimation__Update` and routes ValeVision's existing
Walk/Fly positions through `Na__DoorProximity__Update`. Production Walk/Fly
thresholds remain `6500` mm. The prototype Refresh Models action uses
`Na__DoorAnimation__RebindModelGroups`, avoiding duplicate pointer listeners.

---

## Naming Conventions

### ADR (Door Assembly)
- **Format:** `ADR###__[Description]`
- **Example:** `ADR002__InternalDoor__GroundFloor__PorchToLounge`
- **Purpose:** Top-level container for door assembly
- **3-Digit Code:** Unique identifier (001, 002, 003...)

### MOD (Modifier Object - Door Panel)
- `MOD###__ROT__<signed-deg>-Deg__<tag>` → `ROT_ONLY`
- `MOD###__ROT__<signed-deg>-Deg__MVE__<axis><signed-mm>-mm__<tag>` → `ROT_MVE`
- `MOD###__MVE__<axis><signed-mm>-mm__<tag>` → `MVE_ONLY`
- `MOD###__FIXED__<tag>` → `FIXED`
- Degrees use `/(-?\d+)-Deg/i`; MVE uses
  `/__MVE__([XYZ])([+\-]\d+)-mm/i`.

### ROT (Rotation/Hinge Point)
- **Format:** `ROT###__[Description]`
- **Example:** `ROT001__RotationPoint__DoorHingeCentre`
- **Purpose:** Defines 3D pivot point for rotation (hinge location)
- **Note:** Can be empty (no geometry) — position vector used as pivot
- **Pairing:** Nth rotating MOD pairs with the Nth ROT sibling.

---

## SketchUp Model Setup

```

Exterior double-door independent hierarchy:

```
ADR010__ExteriorDoubleDoor__
├─ MOD001__ROT__-90-Deg__ExteriorDoubleDoorPanel
├─ ROT001__RotationPoint__ExteriorDoubleDoorHingeCentre
├─ MOD002__ROT__90-Deg__ExteriorDoubleDoorPanel
└─ ROT002__RotationPoint__ExteriorDoubleDoorHingeCentre
```

The ADR token opts into independence. Do not add MVE tokens to these leaves.
SketchUp Model
├─ 25__ProposedBuilding__Doors (tag: 25__)
│  └─ ADR002__InternalDoor__GroundFloor__PorchToLounge ← Door assembly
│     ├─ MOD001__ROT__90-Deg__DoorPanel ← Rotating panel
│     │  ├─ [Door panel geometry]
│     │  ├─ [Door handle 1]
│     │  └─ [Door handle 2]
│     ├─ OuterShell ← Fixed frame (not animated)
│     │  └─ [Frame geometry]
│     └─ ROT001__RotationPoint__DoorHingeCentre ← Hinge pivot
```

**Entity Naming in SketchUp:**
1. Select group/component in Outliner
2. Right-click → Entity Info
3. Set **Instance Name** field to ADR/MOD/ROT format

---

## GLB Export Process

### Door Handler Module
**File:** `Na__TrueVision__GlbBuilder__SpecialObject__DoorObjectHandling__.rb`  
**Location:** SketchUp Plugins folder

**Detection:**
- Inline detection during scene graph traversal
- ADR-prefixed entities diverted from virtual flattening
- Hierarchy preserved: ADR > MOD/ROT/OuterShell node structure

**Transform Conjugation:**
```ruby
# Converts SketchUp Z-up to glTF Y-up for local coordinate spaces
M_gltf = Z_UP_TO_Y_UP * M_sketchup * inv(Z_UP_TO_Y_UP)
# Enables (0, 1, 0) Y-axis rotation in Three.js
```

**Output:**
- Mesh GLB: ADR nodes with TRIANGLES primitives
- Linework GLB: ADR nodes with LINES primitives
- Both have identical hierarchy with matching node names

---

## Animation System

### Click Detection
- Tracks pointer movement to distinguish clicks from orbit drags
- Threshold: 4px movement (configurable)
- Raycasts every MOD mesh/linework branch.
- Resolves ADR and nearest MOD ancestors.
- Lockstep products toggle the ADR; exterior double doors toggle only the hit MOD.

### Animation
- Unified progress `[0..1]` drives every panel.
- `ROT_*` panels rotate around their paired ROT pivot on local Y.
- `MVE_*` panels translate along their parsed local axis.
- Mirror and interior signs compose into each rotating descriptor.
- Bifolds use `AnimationDurationMs * BifoldDurationMultiplier`.
- Independent leaves keep separate progress/timing and support mid-motion reversal.
- Mesh and linework MODs remain synchronized.

### States
- `CLOSED` → `OPENING` → `OPEN` → `CLOSING` → `CLOSED`
- Supports clicking during animation to reverse direction
- Duration scales proportionally for partial reversals

---

## Coordinate System

**SketchUp:** Z-up, inches  
**glTF:** Y-up, meters  
**Three.js:** Y-up, meters

**Rotation Axis:**
- Y-axis `(0, 1, 0)` for vertical rotation
- Enabled by transform conjugation in GLB export
- Standard glTF/Three.js convention

---

## Dual Model Animation

ValeVision3D uses separate mesh and linework GLB files:
- **Mesh:** Solid geometry (TRIANGLES primitives)
- **Linework:** Edge geometry (LINES primitives)

Both animate together:
- Door registry links mesh and linework versions
- Single animation state drives both transforms
- Perfect visual synchronization

---

## API Reference

### `Na__DoorAnimation__Initialize(scene, camera, rendererDomElement, modelGroupMesh, modelGroupLinework, config)`

Initializes the door animation system.

**Parameters:**
- `scene` (THREE.Scene) - Three.js scene
- `camera` (THREE.Camera) - Three.js camera
- `rendererDomElement` (HTMLElement) - Canvas for pointer events
- `modelGroupMesh` (THREE.Group | null) - Mesh model group
- `modelGroupLinework` (THREE.Group | null) - Linework model group
- `config` (Object) - Animation configuration

**Config Properties:**
- `3dObject__Interaction__DoorAnimation__AnimationDurationMs` (number) - Base duration
- `3dObject__Interaction__DoorAnimation__BifoldDurationMultiplier` (number)
- `3dObject__Interaction__DoorAnimation__DefaultRotationDeg` (number) - Fallback rotation angle
- `3dObject__Interaction__DoorAnimation__ClickThresholdPx` (number) - Click detection threshold
- `3dObject__Interaction__DoorAnimation__MultiPanelEnabled` (boolean)
- `3dObject__Interaction__DoorAnimation__InteriorRotationInverted` (boolean)
- `3dObject__Interaction__DoorAnimation__IndependentPanelsEnabled` (boolean)
- `3dObject__Interaction__DoorAnimation__IndependentPanelAdrNameTokens` (string[])

---

### `Na__DoorAnimation__Update(deltaMs)`

Updates all door animations. Call every frame in render loop.

**Parameters:**
- `deltaMs` (number) - Time elapsed since last frame in milliseconds

---

### `Na__DoorAnimation__ScanForDoors()`

Re-scans scene graph for door assemblies. Useful for dynamically loaded models.

### `Na__DoorAnimation__RebindModelGroups(meshGroups, lineworkGroups)`

Replaces model roots and rebuilds the registry without registering pointer
listeners again. Used by the ValeVision prototype model refresh.

### `Na__DoorAnim__TogglePanel(doorRecord, panel)`

Starts or reverses one panel only for explicitly independent ADRs.

---

## Troubleshooting

### Door doesn't animate when clicked

**1. Verify hierarchy in GLB:**
- Node graph should show `ADR > MOD/ROT` structure
- If flattened: re-export with updated GLB Builder plugin (v1.5.0+)

**2. Check console during export:**
```
[DoorHandler] Detected door assembly: ADR002__...
[DoorHandler] Building door assembly: ADR002__...
```

**3. Check console during Three.js load:**
```
[DoorAnimation] Registered door (mesh): "ADR002__..." (90 deg)
[DoorAnimation] Linked linework for door: "ADR002__..."
[DoorAnimation] Scan complete. 1 door(s) found.
```

**4. Verify model groups passed to initializer:**
- Must pass both mesh and linework groups separately
- Groups must contain the loaded GLB scenes

### Only mesh animates (linework doesn't move)

**Check linework linking:**
- Console should show: `Linked linework for door: "ADR002__..."`
- If missing: linework GLB not loaded or ADR names don't match

**Verify model group names:**
- Both GLB scenes must have names ending in `__MeshModel__` and `__LineworkModel__`
- Model loader sets these automatically from GLB filenames

---

## Related Files

**SketchUp Plugin (Ruby):**
- `Na__TrueVision__GlbBuilder__SpecialObject__DoorObjectHandling__.rb` - Door export handler
- `Na__TrueVision__GlbBuilder__EngineCore__GeometryHandling__.rb` - Mesh traversal with door detection
- `Na__TrueVision__GlbBuilder__EngineCore__LineworkModelHandling__.rb` - Linework traversal with door detection
- `Na__TrueVision__GlbBuilder__Main__.rb` - TAG_RANGES configuration

**ValeVision3D Application (JavaScript):**
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` - Door animation module
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js` - Walk/Fly proximity
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` - Configuration
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` - Main bootstrap

**Test Environment:**
- `80__Testing__PrototypeEnvironment/` - Imports from main app for testing new features

---

## Performance

- **Raycasting:** O(n) where n = door panel meshes (typically 1-10 per door)
- **Animation:** O(m) where m = actively animating doors
- **Memory:** ~200 bytes per door record (~20 KB for 100 doors)

---

## Future Enhancements

- Audio cues (hinge creak, latch click)
- Collision detection (prevent camera passing through closed doors)
- Door state persistence across sessions
- Per-panel hover highlighting

---

## Version History

**Version 1.7.0** (10-Jul-2026)
- Backported ROT_ONLY/ROT_MVE/MVE_ONLY/FIXED multi-panel discovery.
- Added signed degrees/MVE, MOD/ROT pairing, mirrored/interior signs, and
  bifold duration scaling.
- Added config-gated independent Exterior Double Door click/reversal.
- Added coupled-pair Walk/Fly proximity, independent orbit clicks, and
  model-group rebinding.

**Version 1.0.0** (14-Feb-2026)
- Initial implementation with single model group support

**Version 1.1.0** (14-Feb-2026)
- Dual model support (mesh + linework)
- Y-axis rotation with proper Y-up coordinate space
- Hierarchy-preserving GLB export integration
- Synchronized mesh and linework animation

---

# =============================================================================
# END OF DOCUMENTATION
# =============================================================================
