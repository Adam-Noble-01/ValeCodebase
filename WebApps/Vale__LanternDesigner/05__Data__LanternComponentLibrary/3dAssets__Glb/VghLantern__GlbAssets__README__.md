# 3D GLB Assets

Heavier component meshes referenced by URL rather than inlined into the asset
JSON. A component points at a file here through
`Na__Asset__Glb3D__Url` and sets `Na__Asset__Has3d: true`.

File naming: `VghLantern__Glb__{AssetId}__{ShortName}__.glb`

Example — `VGH_FIN0001` would reference:

```json
"Na__Asset__Glb3D__Url" : "3dAssets__Glb/VghLantern__Glb__VGH_FIN0001__BallAndSpikeFinial__.glb",
"Na__Asset__Has3d"      : true
```

The URL is resolved against the library root by
`VghLantern__ComponentIndexLoader__GetGlbUrl()`, so it stays relative here and
never hardcodes a base path.

## Authoring rules

- Export from SketchUp via `65__Dev__CadObjectBuilder`, not by hand.
- Model in millimetres with the origin at the component's seating point, matching
  the `Na__Asset__Profile2D` origin convention for that role — otherwise the 2D
  and 3D placements disagree.
- Y up, +Z toward the viewer, to match the loader's expected orientation.
- Keep meshes lean: these load inside an interactive viewport alongside the swept
  frame geometry.
- Small components do not belong here — inline them in `Na__Asset__Mesh3D`
  instead and avoid the extra fetch.

Until a GLB exists, `VghLantern__Env3d__ComponentLoader__Glb__.mjs` draws a
correctly sized placeholder box from the asset's declared extents, so the model
still reads at the right scale.
