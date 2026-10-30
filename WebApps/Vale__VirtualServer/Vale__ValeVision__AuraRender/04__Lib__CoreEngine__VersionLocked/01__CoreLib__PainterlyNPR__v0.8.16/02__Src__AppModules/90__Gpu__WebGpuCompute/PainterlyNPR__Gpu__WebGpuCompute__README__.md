# 90__Gpu__WebGpuCompute

**90-99 · Compute and developer** · reserved: a README until real code arrives

WebGPU as a planned engine capability, not an assumption every device supports.

**Belongs here**

- Image-space filtering, pigment field operations, morphology, distance fields, multi-pass compositing, stroke rasterisation.
- Behind the same small, stable pass interface as the WebGL 2 passes, with a documented fallback.
- Profile first: a plain fragment pass may be simpler or faster than compute.
- 91 is reserved for `91__Wasm__RustModules` - "create only when justified" (§13, §15).

**Takes** passes from `20`. **Gives** the same outputs, faster where measured.

**Manifest:** §13 WebGL and WebGPU; Modular Migration Rule.
