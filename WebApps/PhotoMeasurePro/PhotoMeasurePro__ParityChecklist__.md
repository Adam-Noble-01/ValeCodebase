# PhotoMeasurePro Rebuild - Feature Parity Checklist

## Core user workflows to preserve
- Load an image via file picker and drag-and-drop.
- Auto-seed six setup lines (`x1`, `x2`, `y1`, `y2`, `z1`, `z2`) when none exist.
- Navigate image viewport with wheel zoom and right/middle mouse panning.
- Drag line endpoints with a constant visual pick radius.
- Draw one constraint line in `constraint` mode and measure lines in `measure` mode.
- Select and delete lines from the sidebar.
- Compute vanishing points from setup lines and derive camera basis vectors.
- Compute scale from constraint line + selected constraint plane (`XZ`, `XY`, `YZ`).
- Measure line lengths in plane-aware units and display labels in `mm` or `u`.
- Toggle orthographic mode with plane-dependent matrix transform.
- Export image + svg overlay to PNG.
- Toggle depth-map preview and hidden alignment fallback lines.

## Current math behaviors to preserve
- Homogeneous line intersection for vanishing point estimation.
- Focal length derivation from orthogonal vanishing points with principal point at image center.
- Basis orthogonalization from available two-axis combinations (`Rx/Ry`, `Rx/Rz`, `Ry/Rz`).
- Plane-aware unscaled distance projection using `K^-1` and ray-plane intersection.

## UI mode model to preserve
- `setup` mode for VP alignment and dashed VP extension guides.
- `constraint` mode for scale capture and length input.
- `measure` mode for drawing measurement lines and showing labels.
- `ortho` mode for image warp preview.

## Known legacy quirks intentionally retained in initial rebuild
- Constraint scale uses the first active constraint line.
- Depth-map mode is a grayscale/contrast visualization, not true depth.
- Focal fallback uses metadata when available, otherwise max image dimension.
