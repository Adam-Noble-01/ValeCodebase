# SketchUp 2026 Ruby API — Scene / Camera Data 
## Core API terms

In the SketchUp Ruby API, what the UI calls a “Scene” is a `Sketchup::Page`. The official `Sketchup::Page` docs explicitly state that pages are called “Scenes” inside the SketchUp UI. `Sketchup.active_model.pages` returns a `Sketchup::Pages` collection containing all pages/scenes in the model. ([SketchUp Ruby API Documentation][1])

| Required data           | Ruby API class / method      | Notes                                                         |        |                         |
| ----------------------- | ---------------------------- | ------------------------------------------------------------- | ------ | ----------------------- |
| Model                   | `Sketchup.active_model`      | Main entry point.                                             |        |                         |
| Scenes collection       | `model.pages`                | Returns `Sketchup::Pages`.                                    |        |                         |
| Iterate scenes          | `model.pages.each {          | page                                                          | ... }` | `Sketchup::Pages#each`. |
| Get by name/index       | `model.pages[index_or_name]` | `Sketchup::Pages#[]`.                                         |        |                         |
| Current selected scene  | `model.pages.selected_page`  | Returns the active `Sketchup::Page`.                          |        |                         |
| Scene object            | `Sketchup::Page`             | UI name is “Scene”.                                           |        |                         |
| Scene camera            | `page.camera`                | Returns `Sketchup::Camera`.                                   |        |                         |
| Current viewport camera | `model.active_view.camera`   | Use only if you want the live viewport, not saved scene data. |        |                         |

## Scene / Page data worth exporting

`Sketchup::Page` exposes the scene tab name, label, description, camera, timing, saved-property flags, hidden visibility state, layers, layer folders, active section planes, style, rendering options, shadow info, axes, and environment. For your TrueVision scene JSON, the highest-value fields are `name`, `description`, `include_in_animation?`, camera data, and the `use_*?` flags so the viewer knows what the SketchUp scene actually stores. ([SketchUp Ruby API Documentation][1])

| Data                        | Method                                | Return                                                   |
| --------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Scene name                  | `page.name`                           | `String`                                                 |
| Scene label                 | `page.label`                          | `String`                                                 |
| Scene description           | `page.description`                    | `String`                                                 |
| Camera                      | `page.camera`                         | `Sketchup::Camera`                                       |
| Animation include flag      | `page.include_in_animation?`          | `Boolean`                                                |
| Scene delay                 | `page.delay_time`                     | `Float`, seconds                                         |
| Scene transition            | `page.transition_time`                | `Float`, seconds                                         |
| Stores camera?              | `page.use_camera?`                    | `Boolean`                                                |
| Stores axes?                | `page.use_axes?`                      | `Boolean`                                                |
| Stores hidden layers?       | `page.use_hidden_layers?`             | `Boolean`                                                |
| Stores hidden objects?      | `page.use_hidden_objects?`            | `Boolean`                                                |
| Stores hidden geometry?     | `page.use_hidden_geometry?`           | `Boolean`                                                |
| Stores section planes?      | `page.use_section_planes?`            | `Boolean`                                                |
| Stores style?               | `page.use_style?`                     | `Boolean`                                                |
| Stores rendering options?   | `page.use_rendering_options?`         | `Boolean`                                                |
| Stores shadows?             | `page.use_shadow_info?`               | `Boolean`                                                |
| Stores environment?         | `page.use_environment?`               | `Boolean`, SketchUp 2025+                                |
| Active section planes       | `page.active_section_planes`          | `Array<Sketchup::SectionPlane>` or `nil`, SketchUp 2026+ |
| Hidden entities             | `page.hidden_entities`                | `Array<Sketchup::Drawingelement>` or `nil`               |
| Hidden / non-default layers | `page.layers`                         | `Array<Sketchup::Layer>` or `nil`                        |
| Hidden layer folders        | `page.layer_folders`                  | `Array<Sketchup::LayerFolder>` or `nil`                  |
| Entity IDs                  | `page.entityID`, `page.persistent_id` | Inherited from `Sketchup::Entity`                        |

`page.use_camera?` is important. It tells you whether the scene is storing camera state. For export, still include the camera block if you want, but also include `camera_stored: page.use_camera?` so TrueVision can decide whether to treat it as an intentional saved viewpoint. ([SketchUp Ruby API Documentation][1])

## Camera data available

`Sketchup::Camera` exposes position and orientation as vectors, not as a direct Euler rotation. The reliable export basis is `eye`, `target`, `up`, `direction`, and optionally `xaxis`, `yaxis`, `zaxis`. For TrueVision / Three.js, prefer exporting `eye + target + up`, then reconstruct with `camera.position`, `camera.up`, and `camera.lookAt(target)`. ([SketchUp Ruby API Documentation][2])

| Camera data                  | Method                  | Return / meaning                                           |
| ---------------------------- | ----------------------- | ---------------------------------------------------------- |
| Position                     | `camera.eye`            | `Geom::Point3d`                                            |
| Look target                  | `camera.target`         | `Geom::Point3d`                                            |
| Up vector                    | `camera.up`             | `Geom::Vector3d`                                           |
| Forward direction            | `camera.direction`      | `Geom::Vector3d`                                           |
| Camera X axis                | `camera.xaxis`          | `Geom::Vector3d`                                           |
| Camera Y axis                | `camera.yaxis`          | `Geom::Vector3d`                                           |
| Camera Z axis                | `camera.zaxis`          | `Geom::Vector3d`; documented as same as `Camera.direction` |
| Perspective mode             | `camera.perspective?`   | `Boolean`; false means orthographic / parallel projection  |
| FOV                          | `camera.fov`            | `Float`, degrees                                           |
| FOV orientation              | `camera.fov_is_height?` | `Boolean`; true means vertical FOV                         |
| Aspect ratio                 | `camera.aspect_ratio`   | `Float`; `0.0` means match the View                        |
| Orthographic height          | `camera.height`         | `Float`, inches; valid only when not perspective           |
| Focal length                 | `camera.focal_length`   | `Float`, mm, for perspective camera                        |
| Image width                  | `camera.image_width`    | `Float`, mm; used for focal-length calculation             |
| Two-point / match-photo mode | `camera.is_2d?`         | `Boolean`                                                  |
| Two-point offset             | `camera.center_2d`      | `Geom::Point3d`, normalised device coordinates             |
| Two-point scale              | `camera.scale_2d`       | `Float`                                                    |
| Camera description           | `camera.description`    | `String`                                                   |

