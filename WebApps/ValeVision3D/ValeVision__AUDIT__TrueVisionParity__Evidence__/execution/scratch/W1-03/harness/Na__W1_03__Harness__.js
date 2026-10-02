// =============================================================================
// W1-03 ACCEPTANCE HARNESS (package scratch - never shipped, never imported by the app)
// =============================================================================
//
// Proves W1-03's two acceptance items on a real GPU with ValeVision's real code:
//
// A. ORTHO DEPTH BIAS. A synthetic elevation - a whitecard fascia face with
//    SketchUp lines set back behind it by 0 to 200 mm - is built twice through
//    Na__ModelLoader__UpgradeLineworkRoot: once from the module as it was before
//    W1-03 (harness/old/, the saved pre-image) and once from the live module.
//    Rendered through the elevation camera's range (10 mm to 500 m, stand-off
//    150 m) and through the Layout Editor bake camera's (1 m to 1000 m), the
//    old shader draws every line up to (far - near) x 0.00015 behind the face
//    and the new one only lines within 2 mm. Then perspective renders of the
//    same scene must match to the pixel.
//
// B. SUPERSAMPLER CLAMP. A premultiplied layer written the way the depth fog's
//    bake writes one (TrueVision's fog shader convention on the supersampled
//    road: colour handed over as the linear value plus one step, alpha
//    straight) is supersampled on the TARGET ROUTE with encodeSrgb, with the
//    old and the new module, and read back from an 8-bit target and from the
//    canvas: the new module may leave no pixel whose colour exceeds its alpha.
//    Opaque frames (target route and composer route) must be byte-identical.
//
// Read-only: GETs only (modules, vendored three.js, the app config). Writes
// nothing. Results in window.__W1_03 and the #out block.
// =============================================================================

import * as THREE from 'three';

const NONCE = String(Date.now());
const SRC   = '/ValeVision3D/02__Src__AppModules/';
const URLS  = {
    newMM  : SRC + '15__ModelLoader/Na__ModelLoader__MultiModel.js?w103=' + NONCE,
    oldMM  : new URL('./old/Na__ModelLoader__MultiModel.js?w103=' + NONCE, import.meta.url).href,
    newSS  : SRC + '05__RenderPipeline/Na__RenderEffect__Supersampler__.js?w103=' + NONCE,
    oldSS  : new URL('./old/Na__RenderEffect__Supersampler__.js?w103=' + NONCE, import.meta.url).href,
    config : SRC + '02__AppData/Na__AppConfig__Main.json?w103=' + NONCE
};

const R = { ok: true, done: false, checks: [], data: {}, errors: [] };
window.__W1_03 = R;

function check(name, pass, detail) {
    R.checks.push({ name, pass: !!pass, detail: detail === undefined ? '' : detail });
    if (!pass) R.ok = false;
}

const W = 640;
const H = 360;


// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

function makeRenderer(label) {
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.title  = label;
    document.getElementById('stage').appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({
        canvas, antialias: false, alpha: true, logarithmicDepthBuffer: true,
        preserveDrawingBuffer: true, stencil: true, depth: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping      = THREE.NoToneMapping;
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
        R.errors.push(label + ' shader error: ' + gl.getProgramInfoLog(program) + ' | VS ' + gl.getShaderInfoLog(vs) + ' | FS ' + gl.getShaderInfoLog(fs));
    };
    return renderer;
}

function readCanvas(renderer) {
    const gl = renderer.getContext();
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);                   // <-- Rows bottom-up
    return px;
}

function countDiff(a, b) {
    let pixels = 0;
    for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) pixels++;
    }
    return pixels;
}

function gpuName(renderer) {
    const gl  = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}


// -----------------------------------------------------------------------------
// A. Ortho depth bias
// -----------------------------------------------------------------------------

const SETBACKS_MM = [ 0, 1, 5, 10, 30, 50, 70, 100, 140, 200 ];
const ROW_Y       = (index) => -1.35 + index * 0.3;                            // <-- Metres; one line per row, inside the face
const PX_X        = (x) => Math.round((x + 3.2) * 100);                           // <-- Frustum x -3.2..3.2 over 640 px
const PX_Y        = (y) => Math.round((y + 1.8) * 100);                           // <-- Frustum y -1.8..1.8 over 360 px, from the bottom

function buildElevationScene(mm, lineworkConfig) {
    const scene = new THREE.Scene();

    // THE FASCIA FACE | x -3..2 m, y -1.5..1.5 m, at z = 0; the whitecard's polygon offset
    const faceMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), faceMaterial);
    face.position.set(-0.5, 0, 0);
    scene.add(face);

    // THE SKETCHUP LINES | x -2.5..3 m: behind the face up to x = 2, over open paper beyond it
    const root = new THREE.Group();
    SETBACKS_MM.forEach((setback, index) => {
        const y = ROW_Y(index);
        const z = -setback / 1000;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([ -2.5, y, z, 3.0, y, z ], 3));
        const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial());
        line.name = 'Setback_' + setback + 'mm';
        root.add(line);
    });
    const upgraded = mm.Na__ModelLoader__UpgradeLineworkRoot(root, lineworkConfig, new THREE.Vector2(W, H));
    scene.add(upgraded);
    return { scene, upgraded };
}

function lineCounts(px) {
    return SETBACKS_MM.map((setback, index) => {
        const row = PX_Y(ROW_Y(index));
        let hidden = 0, open = 0;
        for (let y = row - 3; y <= row + 3; y++) {
            for (let x = PX_X(-2.4); x <= PX_X(1.9); x++) { if (px[(y * W + x) * 4] < 128) hidden++; }
            for (let x = PX_X(2.1);  x <= PX_X(2.9); x++) { if (px[(y * W + x) * 4] < 128) open++; }
        }
        return { setback, behindFace: hidden, overPaper: open };
    });
}

async function partA(oldMM, newMM, config) {
    const lineworkConfig = Object.assign({}, config.models.RenderConfig__Linework, {
        RenderConfig__Linework__LineWidth: 2                                    // <-- 2 px instead of 0.8 so every row counts cleanly; nothing else changed
    });

    const renderer = makeRenderer('A: depth bias');
    R.data.gpu = gpuName(renderer);
    renderer.setClearColor(0xffffff, 1);

    const oldBuilt = buildElevationScene(oldMM, lineworkConfig);
    const newBuilt = buildElevationScene(newMM, lineworkConfig);

    // WHICH CODE IS WHICH | The new material's shader edit carries the varying; the old one does not
    let oldMat = null, newMat = null;
    oldBuilt.upgraded.traverse((n) => { if (n.isLineSegments2 && !oldMat) oldMat = n.material; });
    newBuilt.upgraded.traverse((n) => { if (n.isLineSegments2 && !newMat) newMat = n.material; });
    check('A0 old module is the pre-image (no ortho term)', oldMat && oldMat.onBeforeCompile.toString().indexOf('vNaOrthoDepthPerUnit') === -1);
    check('A0 new module carries the ortho term', newMat && newMat.onBeforeCompile.toString().indexOf('vNaOrthoDepthPerUnit') !== -1);

    const renderWith = (built, camera) => {
        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        renderer.render(built.scene, camera);
        return readCanvas(renderer);
    };

    // ORTHO | the elevation camera (10 mm - 500 m, stand-off 150 m) and the LE bake camera's range (1 m - 1000 m)
    const orthoCases = [
        { name: 'elevation camera 10 mm-500 m', near: 0.01, far: 500,  stand: 150, oldReachMm: 0.00015 * (500 - 0.01) * 1000 },
        { name: 'bake camera 1 m-1000 m',      near: 1,    far: 1000, stand: 150, oldReachMm: 0.00015 * (1000 - 1) * 1000 }
    ];
    R.data.ortho = [];
    for (const oc of orthoCases) {
        const camera = new THREE.OrthographicCamera(-3.2, 3.2, 1.8, -1.8, oc.near, oc.far);
        camera.position.set(0, 0, oc.stand);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();

        const before = renderWith(oldBuilt, camera);
        const after  = renderWith(newBuilt, camera);
        const after2 = renderWith(newBuilt, camera);
        const oldRows = lineCounts(before);
        const newRows = lineCounts(after);
        let added = 0, removed = 0;
        for (let i = 0; i < before.length; i += 4) {
            const wasDark = before[i] < 128, isDark = after[i] < 128;
            if (isDark && !wasDark) added++;
            if (wasDark && !isDark) removed++;
        }
        const entry = { name: oc.name, oldReachMm: Math.round(oc.oldReachMm * 10) / 10, rows: [], removedLinePixels: removed, addedLinePixels: added,
                        newVsNewDiff: countDiff(after, after2) };
        SETBACKS_MM.forEach((setback, index) => {
            entry.rows.push({ setback, oldBehind: oldRows[index].behindFace, newBehind: newRows[index].behindFace,
                              oldOpen: oldRows[index].overPaper, newOpen: newRows[index].overPaper });
        });
        R.data.ortho.push(entry);

        check('A1 [' + oc.name + '] new renders are repeatable', entry.newVsNewDiff === 0, entry.newVsNewDiff);
        entry.rows.forEach((row) => {
            const full = row.oldOpen;                                             // <-- What one visible row of this line measures over open paper
            check('A1 [' + oc.name + '] ' + row.setback + ' mm: the line draws over open paper in both', row.oldOpen > 0 && row.newOpen === row.oldOpen, row.oldOpen + '/' + row.newOpen);
            const oldShouldShow = row.setback < oc.oldReachMm - 0.5;
            const oldShouldHide = row.setback > oc.oldReachMm + 0.5;
            if (oldShouldShow) check('A1 [' + oc.name + '] ' + row.setback + ' mm: BEFORE draws through the face (the bleed)', row.oldBehind > 0, row.oldBehind);
            if (oldShouldHide) check('A1 [' + oc.name + '] ' + row.setback + ' mm: BEFORE hides it (beyond ' + entry.oldReachMm + ' mm)', row.oldBehind === 0, row.oldBehind);
            if (row.setback <= 1) check('A1 [' + oc.name + '] ' + row.setback + ' mm: AFTER still draws a line on (or within 2 mm of) its face', row.newBehind > 0, row.newBehind);
            if (row.setback >= 5) check('A1 [' + oc.name + '] ' + row.setback + ' mm: AFTER hides it (2 mm bias)', row.newBehind === 0, row.newBehind);
            void full;
        });
        check('A1 [' + oc.name + '] no line pixel added by the change', added === 0, added);
        check('A1 [' + oc.name + '] line pixels removed by the change', removed > 0, removed);
    }

    // PERSPECTIVE | the 3D view's camera (45 deg, 0.1 - 1000 m): before and after must match to the pixel
    const perspectiveCases = [
        { name: 'near oblique', pos: [ 3, 1, 6 ] },
        { name: 'far oblique',  pos: [ 25, 8, 40 ] },
        { name: 'grazing',      pos: [ 9, 0.2, 0.6 ] }
    ];
    R.data.perspective = [];
    for (const pc of perspectiveCases) {
        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        camera.position.set(pc.pos[0], pc.pos[1], pc.pos[2]);
        camera.lookAt(0, 0, -0.05);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const before = renderWith(oldBuilt, camera);
        const after  = renderWith(newBuilt, camera);
        let dark = 0;
        for (let i = 0; i < after.length; i += 4) if (after[i] < 128) dark++;
        const diff = countDiff(before, after);
        R.data.perspective.push({ name: pc.name, differingPixels: diff, linePixels: dark });
        check('A2 perspective [' + pc.name + '] unchanged to the pixel', diff === 0 && dark > 0, diff + ' differing of ' + (W * H) + ' (' + dark + ' line pixels drawn)');
    }

    R.data.programsA = renderer.info.programs ? renderer.info.programs.length : null;
}


// -----------------------------------------------------------------------------
// B. Supersampler present clamp
// -----------------------------------------------------------------------------

const FOG_LAYER_FRAGMENT = /* glsl */`
    uniform float uEncodeFollows;
    varying vec2  vUv;
    const float NA_VEIL = 2.0 / 255.0;
    const float NA_STEP = 1.0 / 255.0;
    vec3 naSrgbToLinear(vec3 value) {
        vec3 low  = value / 12.92;
        vec3 high = pow((value + vec3(0.055)) / 1.055, vec3(2.4));
        return mix(high, low, vec3(lessThanEqual(value, vec3(0.04045))));
    }
    void main() {
        // A drawing-like density field: hard-edged blocks (things at different
        // depths behind the plane) over a soft ramp, open paper between them.
        vec2  p       = vUv * vec2(17.3, 9.7);
        float block   = step(0.5, fract(p.x + 0.37 * floor(p.y))) * step(0.3, fract(p.y));
        float ramp    = smoothstep(0.05, 0.95, vUv.x);
        float density = block * (0.12 + 0.86 * ramp);
        // TrueVision's fog layer output (Na__ElevationDepthFog__Shader__ 1.0.0, mode 1)
        float alpha         = max(density, NA_VEIL);
        vec3  premultiplied = (density < NA_VEIL) ? vec3(alpha) : (vec3(1.0) * alpha);
        if (uEncodeFollows > 0.5) premultiplied = naSrgbToLinear(min(premultiplied + vec3(NA_STEP), vec3(1.0)));
        else                      premultiplied = min(premultiplied, vec3(alpha));
        gl_FragColor = vec4(premultiplied, alpha);
    }
`;

const QUAD_VERTEX = /* glsl */`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

function buildLayerScene() {
    const scene = new THREE.Scene();
    const material = new THREE.ShaderMaterial({
        uniforms: { uEncodeFollows: { value: 1 } },
        vertexShader: QUAD_VERTEX, fragmentShader: FOG_LAYER_FRAGMENT,
        blending: THREE.NoBlending, depthTest: false, depthWrite: false
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    return scene;
}

function buildOpaqueScene() {
    const scene = new THREE.Scene();
    scene.background = null;
    const gradient = new THREE.ShaderMaterial({
        vertexShader: QUAD_VERTEX,
        fragmentShader: /* glsl */`
            varying vec2 vUv;
            void main() { gl_FragColor = vec4(vUv.x, vUv.y, 1.0 - vUv.x * vUv.y, 1.0); }
        `
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gradient));
    const colours = [ 0x141414, 0xc8102e, 0x2e7d32, 0xf2f2f2, 0x1565c0 ];
    colours.forEach((hex, i) => {
        const tri = new THREE.Mesh(new THREE.CircleGeometry(0.21 + 0.03 * i, 3 + i * 2),
                                   new THREE.MeshBasicMaterial({ color: hex }));
        tri.position.set(-0.75 + i * 0.37, -0.2 + 0.1 * (i % 3), 0.1);
        tri.rotation.z = 0.3 * i + 0.17;
        scene.add(tri);
    });
    return scene;
}

function quadCamera() {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    return camera;
}

function countAboveAlpha(px) {
    let above = 0, maxOver = 0;
    for (let i = 0; i < px.length; i += 4) {
        const over = Math.max(px[i], px[i + 1], px[i + 2]) - px[i + 3];
        if (over > 0) { above++; if (over > maxOver) maxOver = over; }
    }
    return { above, maxOver };
}

// TARGET ROUTE | the caller binds the sample target and draws its whole frame into it
function superTarget(ssModule, renderer, scene, clearHex, clearAlpha, samples, partialCount) {
    const ss = ssModule.Na__Supersampler__Create({ renderer, width: W, height: H, samples, sampleTarget: true, encodeSrgb: true });
    const camera = quadCamera();
    const count  = partialCount || ss.sampleCount;
    ss.captureBaseProjection(camera);
    for (let i = 0; i < count; i++) {
        ss.applyJitter(camera, i);
        ss.beginSample();
        renderer.setClearColor(clearHex, clearAlpha);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);
        ss.accumulateSample(i);
    }
    ss.restoreProjection(camera);
    return present(ss, renderer, partialCount ? ss.sampleCount / count : 1);
}

// COMPOSER ROUTE | the caller hands over a finished frame texture per sample (no encode)
function superComposer(ssModule, renderer, scene, samples) {
    const ss = ssModule.Na__Supersampler__Create({ renderer, width: W, height: H, samples });
    const camera = quadCamera();
    const frame  = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, format: THREE.RGBAFormat,
                                                      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    ss.captureBaseProjection(camera);
    for (let i = 0; i < ss.sampleCount; i++) {
        ss.applyJitter(camera, i);
        renderer.setRenderTarget(frame);
        renderer.setClearColor(0xffffff, 1);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);
        ss.accumulate(frame.texture, i);
    }
    ss.restoreProjection(camera);
    renderer.setRenderTarget(null);
    const out = present(ss, renderer, 1);
    frame.dispose();
    return out;
}

function present(ss, renderer, scale) {
    const target8 = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
                                                        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
    ss.present(target8, scale);
    const px8 = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(target8, 0, 0, W, H, px8);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    ss.present(null, scale);
    const pxCanvas = readCanvas(renderer);
    target8.dispose();
    ss.dispose();
    return { px8, pxCanvas };
}

async function partB(oldSS, newSS, newSource, oldSource) {
    check('B0 old Supersampler is the pre-image (no clamp)', oldSource.indexOf('total.rgb = min(total.rgb, vec3(total.a));') === -1);
    check('B0 new Supersampler carries the clamp', newSource.indexOf('total.rgb = min(total.rgb, vec3(total.a));') !== -1);

    const renderer = makeRenderer('B: supersampler');
    const layer  = buildLayerScene();
    const opaque = buildOpaqueScene();
    R.data.layer = [];

    // THE PREMULTIPLIED LAYER | every supported count, plus a part-finished total
    const runs = [ { samples: 2 }, { samples: 4 }, { samples: 8 }, { samples: 16 }, { samples: 16, partial: 5 } ];
    for (const run of runs) {
        const label  = run.samples + 'x' + (run.partial ? ' (' + run.partial + ' of ' + run.samples + ' drawn)' : '');
        const before = superTarget(oldSS, renderer, layer, 0x000000, 0, run.samples, run.partial);
        const after  = superTarget(newSS, renderer, layer, 0x000000, 0, run.samples, run.partial);
        const b8 = countAboveAlpha(before.px8), a8 = countAboveAlpha(after.px8);
        const bc = countAboveAlpha(before.pxCanvas), ac = countAboveAlpha(after.pxCanvas);
        // Pixels that were already valid before must not move
        let movedValid = 0;
        for (let i = 0; i < before.px8.length; i += 4) {
            const wasValid = Math.max(before.px8[i], before.px8[i + 1], before.px8[i + 2]) <= before.px8[i + 3];
            if (wasValid && (before.px8[i] !== after.px8[i] || before.px8[i + 1] !== after.px8[i + 1] ||
                             before.px8[i + 2] !== after.px8[i + 2] || before.px8[i + 3] !== after.px8[i + 3])) movedValid++;
        }
        let alphaChanged = 0;
        for (let i = 3; i < before.px8.length; i += 4) if (before.px8[i] !== after.px8[i]) alphaChanged++;
        R.data.layer.push({ run: label, before8: b8, after8: a8, beforeCanvas: bc, afterCanvas: ac, movedValid, alphaChanged });
        check('B1 layer ' + label + ': BEFORE leaves colour above alpha (the fault is reproduced)', b8.above > 0, b8.above + ' px, up to ' + b8.maxOver + ' steps');
        check('B1 layer ' + label + ': AFTER colour <= alpha at every pixel (8-bit target)', a8.above === 0, a8.above);
        check('B1 layer ' + label + ': AFTER colour <= alpha at every pixel (canvas)', ac.above === 0, ac.above);
        check('B1 layer ' + label + ': pixels that were valid are untouched, alpha unchanged', movedValid === 0 && alphaChanged === 0, movedValid + ' / ' + alphaChanged);
    }

    // OPAQUE FRAMES | byte-identical on both routes
    R.data.opaque = [];
    for (const samples of [ 4, 16 ]) {
        const tBefore = superTarget(oldSS, renderer, opaque, 0xffffff, 1, samples);
        const tAfter  = superTarget(newSS, renderer, opaque, 0xffffff, 1, samples);
        const cBefore = superComposer(oldSS, renderer, opaque, samples);
        const cAfter  = superComposer(newSS, renderer, opaque, samples);
        let opaqueAlpha = true;
        for (let i = 3; i < tAfter.px8.length; i += 4) if (tAfter.px8[i] !== 255) { opaqueAlpha = false; break; }
        const entry = {
            samples,
            targetRoute8      : countDiff(tBefore.px8, tAfter.px8),
            targetRouteCanvas : countDiff(tBefore.pxCanvas, tAfter.pxCanvas),
            composerRoute8    : countDiff(cBefore.px8, cAfter.px8),
            composerCanvas    : countDiff(cBefore.pxCanvas, cAfter.pxCanvas),
            opaqueAlpha
        };
        R.data.opaque.push(entry);
        check('B2 opaque ' + samples + 'x frame is opaque', opaqueAlpha);
        check('B2 opaque ' + samples + 'x target route (encodeSrgb) byte-identical', entry.targetRoute8 === 0 && entry.targetRouteCanvas === 0, entry.targetRoute8 + ' / ' + entry.targetRouteCanvas);
        check('B2 opaque ' + samples + 'x composer route byte-identical', entry.composerRoute8 === 0 && entry.composerCanvas === 0, entry.composerRoute8 + ' / ' + entry.composerCanvas);
    }
}


// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

async function main() {
    const out = document.getElementById('out');
    try {
        const [ oldMM, newMM, oldSS, newSS ] = await Promise.all([
            import(URLS.oldMM), import(URLS.newMM), import(URLS.oldSS), import(URLS.newSS)
        ]);
        const config    = await (await fetch(URLS.config, { cache: 'no-store' })).json();
        const newSource = await (await fetch(URLS.newSS, { cache: 'no-store' })).text();
        const oldSource = await (await fetch(URLS.oldSS, { cache: 'no-store' })).text();
        check('A0 live config: models.RenderConfig__Linework__OrthoDepthBiasMm = 2',
              config.models && config.models.RenderConfig__Linework && config.models.RenderConfig__Linework.RenderConfig__Linework__OrthoDepthBiasMm === 2);

        await partA(oldMM, newMM, config);
        await partB(oldSS, newSS, newSource, oldSource);
    } catch (error) {
        R.ok = false;
        R.errors.push(String(error && error.stack || error));
    }
    if (R.errors.length) R.ok = false;
    R.done = true;
    const failed = R.checks.filter((c) => !c.pass);
    out.textContent = 'RESULT: ' + (R.ok ? 'PASS' : 'FAIL') + ' - ' + (R.checks.length - failed.length) + '/' + R.checks.length + ' checks'
                    + (R.errors.length ? '\nERRORS:\n' + R.errors.join('\n') : '')
                    + '\n\n' + JSON.stringify(R, null, 1);
    document.title = 'W1-03 harness ' + (R.ok ? 'PASS' : 'FAIL');
}

main();
