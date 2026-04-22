// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Three Viewport Main
// -----------------------------------------------------------------------------
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const PhotoMeasurePro__System__ThreeViewport__Main = (function() {
    const runtime = {
        initialized: false,
        scene: null,
        renderer: null,
        camera: null,
        controls: null,
        rootElement: null,
        canvasElement: null,
        hudElement: null,
        analyticalGroup: null,
        measureGroup: null,
        depthGroup: null,
        raycaster: new THREE.Raycaster(),
        analyticalSignature: "",
        textureSignature: "",
        depthSignature: "",
        analyticalSceneBundle: null,
        planeTexturesByName: {},
        imageSampleCache: null,
        labelMapCache: null                                                          // { url, width, height, data (Uint8), labelsByPlane }
    };

    function PhotoMeasurePro__ThreeViewport__Initialize(domRefs) {
        if (runtime.initialized) return;
        runtime.rootElement = domRefs.PhotoMeasurePro__ThreeViewport__Root;
        runtime.canvasElement = domRefs.PhotoMeasurePro__ThreeViewport__Canvas;
        runtime.hudElement = domRefs.PhotoMeasurePro__ThreeViewport__Hud;
        if (!runtime.rootElement || !runtime.canvasElement) return;

        runtime.scene = new THREE.Scene();
        runtime.scene.background = new THREE.Color(0x020617);
        runtime.camera = new THREE.PerspectiveCamera(45, 1, 10, 200000);
        runtime.camera.position.set(2500, -5500, 3000);
        runtime.camera.up.set(0, 0, 1);

        runtime.renderer = new THREE.WebGLRenderer({
            canvas: runtime.canvasElement,
            antialias: true,
            alpha: false
        });
        runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        runtime.controls = new OrbitControls(runtime.camera, runtime.canvasElement);
        runtime.controls.target.set(2000, 1500, 1200);
        runtime.controls.update();
        runtime.controls.enableDamping = true;
        runtime.controls.dampingFactor = 0.12;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(4000, -6000, 7000);
        runtime.scene.add(ambientLight);
        runtime.scene.add(directionalLight);

        runtime.analyticalGroup = new THREE.Group();
        runtime.depthGroup = new THREE.Group();
        runtime.measureGroup = new THREE.Group();
        runtime.scene.add(runtime.analyticalGroup);
        runtime.scene.add(runtime.depthGroup);
        runtime.scene.add(runtime.measureGroup);

        runtime.canvasElement.addEventListener("pointerdown", PhotoMeasurePro__ThreeViewport__HandlePointerDown);

        runtime.initialized = true;
    }

    function PhotoMeasurePro__ThreeViewport__EnsureSize() {
        const rect = runtime.rootElement.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        runtime.renderer.setSize(width, height, false);
        runtime.camera.aspect = width / height;
        runtime.camera.updateProjectionMatrix();
    }

    function PhotoMeasurePro__ThreeViewport__ClearGroup(groupRef) {
        while (groupRef.children.length > 0) {
            const childObject = groupRef.children.pop();
            if (childObject.geometry) childObject.geometry.dispose();
            if (childObject.material) {
                if (Array.isArray(childObject.material)) {
                    childObject.material.forEach(function(materialItem) {
                        if (materialItem.map) materialItem.map.dispose();
                        materialItem.dispose();
                    });
                } else {
                    if (childObject.material.map) childObject.material.map.dispose();
                    childObject.material.dispose();
                }
            }
        }
    }

    function PhotoMeasurePro__ThreeViewport__BuildQuadMesh(cornersWorld, tintHex, textureMap) {
        const planeGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            cornersWorld[0][0], cornersWorld[0][1], cornersWorld[0][2],
            cornersWorld[1][0], cornersWorld[1][1], cornersWorld[1][2],
            cornersWorld[2][0], cornersWorld[2][1], cornersWorld[2][2],
            cornersWorld[3][0], cornersWorld[3][1], cornersWorld[3][2]
        ]);
        const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
        planeGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        planeGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        planeGeometry.setIndex([0, 1, 2, 0, 2, 3]);
        planeGeometry.computeVertexNormals();
        const planeMaterial = new THREE.MeshStandardMaterial({
            map: textureMap || null,
            color: tintHex,
            transparent: true,
            opacity: textureMap ? 0.98 : 0.45,
            side: THREE.DoubleSide,
            depthWrite: true
        });
        return new THREE.Mesh(planeGeometry, planeMaterial);
    }

    function PhotoMeasurePro__ThreeViewport__ComputeHomographyFromPoints(sourcePoints, destinationPoints) {
        if (!sourcePoints || !destinationPoints || sourcePoints.length !== 4 || destinationPoints.length !== 4) return null;
        const system = [];
        for (let i = 0; i < 4; i++) {
            const u = sourcePoints[i].x;
            const v = sourcePoints[i].y;
            const x = destinationPoints[i][0];
            const y = destinationPoints[i][1];
            if (![u, v, x, y].every(Number.isFinite)) return null;
            system.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
            system.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
        }
        for (let pivot = 0; pivot < 8; pivot++) {
            let bestRow = pivot;
            let bestValue = Math.abs(system[pivot][pivot]);
            for (let row = pivot + 1; row < 8; row++) {
                const candidate = Math.abs(system[row][pivot]);
                if (candidate > bestValue) {
                    bestValue = candidate;
                    bestRow = row;
                }
            }
            if (bestValue < 1e-12) return null;
            if (bestRow !== pivot) {
                const tempRow = system[pivot];
                system[pivot] = system[bestRow];
                system[bestRow] = tempRow;
            }
            const pivotValue = system[pivot][pivot];
            for (let col = pivot; col < 9; col++) system[pivot][col] /= pivotValue;
            for (let row = 0; row < 8; row++) {
                if (row === pivot) continue;
                const scale = system[row][pivot];
                if (!scale) continue;
                for (let col = pivot; col < 9; col++) system[row][col] -= scale * system[pivot][col];
            }
        }
        const solution = system.map(function(row) { return row[8]; });
        return [
            [solution[0], solution[1], solution[2]],
            [solution[3], solution[4], solution[5]],
            [solution[6], solution[7], 1]
        ];
    }

    function PhotoMeasurePro__ThreeViewport__LoadImageSampleCache(imageUrl) {
        if (!imageUrl) return Promise.resolve(null);
        if (runtime.imageSampleCache && runtime.imageSampleCache.url === imageUrl) return Promise.resolve(runtime.imageSampleCache);
        return new Promise(function(resolvePromise, rejectPromise) {
            const imageElement = new Image();
            imageElement.crossOrigin = "anonymous";
            imageElement.onload = function() {
                const canvas = document.createElement("canvas");
                canvas.width = imageElement.naturalWidth;
                canvas.height = imageElement.naturalHeight;
                const context = canvas.getContext("2d");
                context.drawImage(imageElement, 0, 0);
                runtime.imageSampleCache = {
                    url: imageUrl,
                    width: canvas.width,
                    height: canvas.height,
                    data: context.getImageData(0, 0, canvas.width, canvas.height).data
                };
                resolvePromise(runtime.imageSampleCache);
            };
            imageElement.onerror = rejectPromise;
            imageElement.src = imageUrl;
        });
    }

    function PhotoMeasurePro__ThreeViewport__BilinearSample(sourceCache, pixelX, pixelY, outputData, outputOffset) {
        if (pixelX < 0 || pixelY < 0 || pixelX >= sourceCache.width - 1 || pixelY >= sourceCache.height - 1) {
            outputData[outputOffset] = 0;
            outputData[outputOffset + 1] = 0;
            outputData[outputOffset + 2] = 0;
            outputData[outputOffset + 3] = 0;
            return;
        }
        const x0 = Math.floor(pixelX);
        const y0 = Math.floor(pixelY);
        const tx = pixelX - x0;
        const ty = pixelY - y0;
        const stride = sourceCache.width * 4;
        const tl = y0 * stride + x0 * 4;
        const tr = tl + 4;
        const bl = tl + stride;
        const br = bl + 4;
        const source = sourceCache.data;
        const wTl = (1 - tx) * (1 - ty);
        const wTr = tx * (1 - ty);
        const wBl = (1 - tx) * ty;
        const wBr = tx * ty;
        outputData[outputOffset] = source[tl] * wTl + source[tr] * wTr + source[bl] * wBl + source[br] * wBr;
        outputData[outputOffset + 1] = source[tl + 1] * wTl + source[tr + 1] * wTr + source[bl + 1] * wBl + source[br + 1] * wBr;
        outputData[outputOffset + 2] = source[tl + 2] * wTl + source[tr + 2] * wTr + source[bl + 2] * wBl + source[br + 2] * wBr;
        outputData[outputOffset + 3] = 255;
    }

    function PhotoMeasurePro__ThreeViewport__LoadLabelMapCache(labelMapInfo) {
        if (!labelMapInfo || !labelMapInfo.cacheUrl) return Promise.resolve(null);
        if (runtime.labelMapCache && runtime.labelMapCache.url === labelMapInfo.cacheUrl) return Promise.resolve(runtime.labelMapCache);
        return new Promise(function(resolvePromise, rejectPromise) {
            const labelMapImage = new Image();
            labelMapImage.crossOrigin = "anonymous";
            labelMapImage.onload = function() {
                const labelCanvas  = document.createElement("canvas");
                labelCanvas.width  = labelMapImage.naturalWidth;
                labelCanvas.height = labelMapImage.naturalHeight;
                const labelContext = labelCanvas.getContext("2d");
                labelContext.drawImage(labelMapImage, 0, 0);
                const rawPixels = labelContext.getImageData(0, 0, labelCanvas.width, labelCanvas.height).data;
                const labelBytes = new Uint8Array(labelCanvas.width * labelCanvas.height);   // Collapse RGBA->grayscale (label PNG is saved as "L" mode so R==G==B==label).
                for (let pixelIndex = 0; pixelIndex < labelBytes.length; pixelIndex++) {
                    labelBytes[pixelIndex] = rawPixels[pixelIndex * 4];
                }
                runtime.labelMapCache = {
                    url:            labelMapInfo.cacheUrl,
                    width:          labelCanvas.width,
                    height:         labelCanvas.height,
                    data:           labelBytes,
                    labelsByPlane:  labelMapInfo.labelsByPlane || {}
                };
                resolvePromise(runtime.labelMapCache);
            };
            labelMapImage.onerror = rejectPromise;
            labelMapImage.src = labelMapInfo.cacheUrl;
        });
    }

    function PhotoMeasurePro__ThreeViewport__SampleLabelAtImagePixel(labelMapCache, pixelX, pixelY) {
        if (!labelMapCache) return -1;
        const clampedX = Math.max(0, Math.min(labelMapCache.width  - 1, Math.round(pixelX)));
        const clampedY = Math.max(0, Math.min(labelMapCache.height - 1, Math.round(pixelY)));
        return labelMapCache.data[clampedY * labelMapCache.width + clampedX];
    }

    function PhotoMeasurePro__ThreeViewport__BuildTextureFromFootprint(imageUrl, footprintPoints, widthMm, heightMm, labelMapCache, expectedLabelValue) {
        const planarHomographyUtils = window.PhotoMeasurePro__MathUtils__PlanarHomography;
        if (!imageUrl || !footprintPoints || footprintPoints.length !== 4) return Promise.resolve(null);
        const imageToPlaneHomography = PhotoMeasurePro__ThreeViewport__ComputeHomographyFromPoints(
            footprintPoints,
            [[0, 0], [widthMm, 0], [widthMm, heightMm], [0, heightMm]]
        );
        if (!imageToPlaneHomography) return Promise.resolve(null);
        const inverseHomography = planarHomographyUtils.PhotoMeasurePro__PlanarHomography__InvertHomography(imageToPlaneHomography);
        if (!inverseHomography) return Promise.resolve(null);
        const targetLongEdge = 1400;
        const aspect = widthMm / Math.max(1, heightMm);
        const outWidth = aspect >= 1 ? targetLongEdge : Math.max(1, Math.round(targetLongEdge * aspect));
        const outHeight = aspect >= 1 ? Math.max(1, Math.round(targetLongEdge / aspect)) : targetLongEdge;
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = outWidth;
        outputCanvas.height = outHeight;
        const shouldApplyLabelMask = Boolean(labelMapCache && Number.isFinite(expectedLabelValue) && expectedLabelValue >= 0);
        return PhotoMeasurePro__ThreeViewport__LoadImageSampleCache(imageUrl).then(function(sourceCache) {
            if (!sourceCache) return null;
            const outputContext = outputCanvas.getContext("2d");
            const outputImageData = outputContext.createImageData(outWidth, outHeight);
            const outputData = outputImageData.data;
            const stepX = widthMm / outWidth;
            const stepY = heightMm / outHeight;
            for (let y = 0; y < outHeight; y++) {
                const planeY = (y + 0.5) * stepY;
                for (let x = 0; x < outWidth; x++) {
                    const planeX = (x + 0.5) * stepX;
                    const imagePoint = planarHomographyUtils.PhotoMeasurePro__PlanarHomography__ApplyHomography(
                        inverseHomography,
                        [planeX, planeY]
                    );
                    const outputOffset = (y * outWidth + x) * 4;
                    if (!imagePoint) {
                        outputData[outputOffset + 3] = 0;
                        continue;
                    }
                    if (shouldApplyLabelMask) {                                             // Drop pixels that another plane owns per the server-side partition.
                        const sampledLabelValue = PhotoMeasurePro__ThreeViewport__SampleLabelAtImagePixel(labelMapCache, imagePoint[0], imagePoint[1]);
                        if (sampledLabelValue !== expectedLabelValue) {
                            outputData[outputOffset + 3] = 0;
                            continue;
                        }
                    }
                    PhotoMeasurePro__ThreeViewport__BilinearSample(sourceCache, imagePoint[0], imagePoint[1], outputData, outputOffset);
                }
            }
            outputContext.putImageData(outputImageData, 0, 0);
            const texture = new THREE.CanvasTexture(outputCanvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
            return texture;
        }).catch(function() {
            return null;
        });
    }

    function PhotoMeasurePro__ThreeViewport__ApplyPhotoLockedCamera(analyticalSceneBundle, currentState) {
        if (!analyticalSceneBundle || !analyticalSceneBundle.worldOrigin || !analyticalSceneBundle.perspectiveData) return;
        const worldOrigin = analyticalSceneBundle.worldOrigin;
        const perspectiveData = analyticalSceneBundle.perspectiveData;
        const imageW = (currentState.imgSize && currentState.imgSize.w) || 1;
        const imageH = (currentState.imgSize && currentState.imgSize.h) || 1;
        runtime.camera.near = 10;
        runtime.camera.far = 200000;
        runtime.camera.fov = (2 * Math.atan2(imageH * 0.5, perspectiveData.f)) * 180 / Math.PI;
        runtime.camera.position.set(worldOrigin.C[0], worldOrigin.C[1], worldOrigin.C[2]);
        const forward = new THREE.Vector3(worldOrigin.R_cw[0][2], worldOrigin.R_cw[1][2], worldOrigin.R_cw[2][2]).normalize();
        const up = new THREE.Vector3(-worldOrigin.R_cw[0][1], -worldOrigin.R_cw[1][1], -worldOrigin.R_cw[2][1]).normalize();
        runtime.camera.up.copy(up);
        runtime.camera.lookAt(runtime.camera.position.clone().add(forward));
        runtime.camera.updateProjectionMatrix();
        const principalX = Number(perspectiveData.cx);
        const principalY = Number(perspectiveData.cy);
        if (Number.isFinite(principalX) && Number.isFinite(principalY)) {
            const offsetX = principalX - imageW * 0.5;
            const offsetY = principalY - imageH * 0.5;
            if (Math.abs(offsetX) > 0.001 || Math.abs(offsetY) > 0.001) runtime.camera.setViewOffset(imageW, imageH, offsetX, offsetY, imageW, imageH);
            else runtime.camera.clearViewOffset();
        }
        runtime.controls.target.set(0, 0, 1000);
        runtime.controls.update();
    }

    function PhotoMeasurePro__ThreeViewport__TranslateCorners(cornersWorld, translationVector) {
        return cornersWorld.map(function(cornerPoint) {
            return [
                cornerPoint[0] + translationVector[0],
                cornerPoint[1] + translationVector[1],
                cornerPoint[2] + translationVector[2]
            ];
        });
    }

    function PhotoMeasurePro__ThreeViewport__ResolveOffsetPlaneCorners(offsetPlaneItem, parentPlane) {
        if (Array.isArray(offsetPlaneItem.cornersWorld) && offsetPlaneItem.cornersWorld.length === 4) {
            return offsetPlaneItem.cornersWorld;
        }
        if (!parentPlane) return null;
        const offsetDistanceMm = Number(offsetPlaneItem.offsetMm);
        if (!Number.isFinite(offsetDistanceMm)) return null;
        return PhotoMeasurePro__ThreeViewport__TranslateCorners(parentPlane.cornersWorld, [
            parentPlane.normal[0] * offsetDistanceMm,
            parentPlane.normal[1] * offsetDistanceMm,
            parentPlane.normal[2] * offsetDistanceMm
        ]);
    }

    function PhotoMeasurePro__ThreeViewport__ComputeCornerDistance(cornerA, cornerB) {
        return Math.hypot(cornerA[0] - cornerB[0], cornerA[1] - cornerB[1], cornerA[2] - cornerB[2]);
    }

    function PhotoMeasurePro__ThreeViewport__ProjectCornersToImageFootprint(cornersWorld, analyticalSceneBundle) {
        const solver = window.PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver;
        if (!solver || !analyticalSceneBundle || !analyticalSceneBundle.worldOrigin || !analyticalSceneBundle.perspectiveData) return null;
        const footprintPoints = cornersWorld.map(function(cornerWorld) {
            return solver.PhotoMeasurePro__SceneReconstruction3D__ProjectWorldToImage
                ? solver.PhotoMeasurePro__SceneReconstruction3D__ProjectWorldToImage(cornerWorld, analyticalSceneBundle.perspectiveData, analyticalSceneBundle.worldOrigin)
                : null;
        });
        if (footprintPoints.some(function(pointValue) { return !pointValue; })) return null;
        return footprintPoints;
    }

    function PhotoMeasurePro__ThreeViewport__BuildAndAttachOffsetPlanes(currentState, planesByName, analyticalSceneBundle, labelMapCache) {
        const labelsByPlane = (labelMapCache && labelMapCache.labelsByPlane) || {};
        (currentState.scene3d.offsetPlanes || []).forEach(function(offsetPlaneItem, offsetIndex) {
            const parentPlane  = planesByName[offsetPlaneItem.parentPlane];
            const cornersWorld = PhotoMeasurePro__ThreeViewport__ResolveOffsetPlaneCorners(offsetPlaneItem, parentPlane);
            if (!cornersWorld) return;
            const isDetected         = offsetPlaneItem.source === "detected";
            const tintColor          = isDetected ? 0xffffff : 0x22d3ee;
            const cachedTextureKey   = "offset_" + offsetIndex;
            const cachedTextureValue = runtime.planeTexturesByName[cachedTextureKey] || null;
            const offsetMesh         = PhotoMeasurePro__ThreeViewport__BuildQuadMesh(cornersWorld, tintColor, cachedTextureValue);
            offsetMesh.material.opacity    = cachedTextureValue ? 1.0 : (isDetected ? 0.55 : 0.22);
            offsetMesh.material.transparent = true;
            offsetMesh.renderOrder         = isDetected ? 25 : 30;
            offsetMesh.userData            = {
                planeName:  offsetPlaneItem.name,
                snapSource: "analytical",
                source:     offsetPlaneItem.source || "manual"
            };
            runtime.analyticalGroup.add(offsetMesh);

            if (!cachedTextureValue && isDetected && currentState.imageUrl) {             // Texture the detected plane with its own slice of the photo.
                const footprintPoints = PhotoMeasurePro__ThreeViewport__ProjectCornersToImageFootprint(cornersWorld, analyticalSceneBundle);
                if (!footprintPoints) return;
                const planeWidthMm  = Number(offsetPlaneItem.widthMm)  || PhotoMeasurePro__ThreeViewport__ComputeCornerDistance(cornersWorld[0], cornersWorld[1]);
                const planeHeightMm = Number(offsetPlaneItem.heightMm) || PhotoMeasurePro__ThreeViewport__ComputeCornerDistance(cornersWorld[1], cornersWorld[2]);
                const expectedLabel = labelsByPlane["Offset_" + offsetIndex];
                PhotoMeasurePro__ThreeViewport__BuildTextureFromFootprint(
                    currentState.imageUrl,
                    footprintPoints,
                    planeWidthMm,
                    planeHeightMm,
                    labelMapCache,
                    Number.isFinite(expectedLabel) ? expectedLabel : -1
                ).then(function(textureValue) {
                    if (!textureValue) return;
                    runtime.planeTexturesByName[cachedTextureKey] = textureValue;
                    runtime.analyticalSignature = "";
                });
            }
        });
    }

    function PhotoMeasurePro__ThreeViewport__BuildPlaneTexturesIfNeeded(currentState, analyticalSceneBundle, labelMapCache) {
        const planesByName      = analyticalSceneBundle.planesByName || {};
        const footprintsByPlane = analyticalSceneBundle.imageFootprintsByPlane || {};
        const textureSignature  = JSON.stringify({
            imageUrl:    currentState.imageUrl || "",
            footprints:  footprintsByPlane,
            offsets:     currentState.scene3d.offsetPlanes || [],
            labelMapUrl: (labelMapCache && labelMapCache.url) || "",
            facadeW:     planesByName.Facade && planesByName.Facade.widthMm,
            sideW:       planesByName.Side   && planesByName.Side.widthMm,
            h:           planesByName.Facade && planesByName.Facade.heightMm
        });
        if (runtime.textureSignature === textureSignature) return;
        runtime.textureSignature     = textureSignature;
        runtime.planeTexturesByName  = {};
        if (!currentState.imageUrl) return;
        const labelsByPlane = (labelMapCache && labelMapCache.labelsByPlane) || {};
        ["Facade", "Side", "Ground"].forEach(function(planeName) {
            const planeDef  = planesByName[planeName];
            const footprint = footprintsByPlane[planeName];
            if (!planeDef || !footprint) return;
            const expectedLabel = labelsByPlane[planeName];
            PhotoMeasurePro__ThreeViewport__BuildTextureFromFootprint(
                currentState.imageUrl,
                footprint,
                planeDef.widthMm,
                planeDef.heightMm,
                labelMapCache,
                Number.isFinite(expectedLabel) ? expectedLabel : -1
            ).then(function(textureValue) {
                if (!textureValue) return;
                runtime.planeTexturesByName[planeName] = textureValue;
                runtime.analyticalSignature = "";
            });
        });
    }

    function PhotoMeasurePro__ThreeViewport__RebuildAnalyticalScene(currentState) {
        const solver = window.PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver;
        const analyticalSceneBundle = solver.PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene(currentState);
        runtime.analyticalSceneBundle = analyticalSceneBundle;
        if (!analyticalSceneBundle || !analyticalSceneBundle.ready || !analyticalSceneBundle.planesByName) return;
        const planesByName  = analyticalSceneBundle.planesByName;
        const scene3dState  = currentState.scene3d || {};
        const labelMapInfo  = scene3dState.planeLabelMap || null;
        const labelMapCache = (labelMapInfo && runtime.labelMapCache && runtime.labelMapCache.url === labelMapInfo.cacheUrl) ? runtime.labelMapCache : null;
        if (labelMapInfo && !labelMapCache) {                                             // Kick off async load; a later render tick will pick up the cached map and retexture.
            PhotoMeasurePro__ThreeViewport__LoadLabelMapCache(labelMapInfo).then(function(loadedCache) {
                if (loadedCache) {
                    runtime.textureSignature    = "";
                    runtime.analyticalSignature = "";
                }
            }).catch(function() { /* Mask load failures fall back to unmasked textures. */ });
        }

        PhotoMeasurePro__ThreeViewport__BuildPlaneTexturesIfNeeded(currentState, analyticalSceneBundle, labelMapCache);
        PhotoMeasurePro__ThreeViewport__ClearGroup(runtime.analyticalGroup);

        const facadeHasTexture = Boolean(runtime.planeTexturesByName.Facade);
        const facadeMesh = PhotoMeasurePro__ThreeViewport__BuildQuadMesh(planesByName.Facade.cornersWorld, facadeHasTexture ? 0xffffff : 0x334155, runtime.planeTexturesByName.Facade || null);
        facadeMesh.material.opacity = facadeHasTexture ? 1.0 : 0.3;
        facadeMesh.renderOrder = 20;
        facadeMesh.userData = { planeName: "Facade", snapSource: "analytical" };
        runtime.analyticalGroup.add(facadeMesh);

        const sideHasTexture = Boolean(runtime.planeTexturesByName.Side);
        const sideMesh = PhotoMeasurePro__ThreeViewport__BuildQuadMesh(planesByName.Side.cornersWorld, sideHasTexture ? 0xffffff : 0x1f2937, runtime.planeTexturesByName.Side || null);
        sideMesh.material.opacity = sideHasTexture ? 1.0 : 0.3;
        sideMesh.renderOrder = 19;
        sideMesh.userData = { planeName: "Side", snapSource: "analytical" };
        runtime.analyticalGroup.add(sideMesh);

        const groundHasTexture = Boolean(runtime.planeTexturesByName.Ground);
        const groundMesh = PhotoMeasurePro__ThreeViewport__BuildQuadMesh(planesByName.Ground.cornersWorld, groundHasTexture ? 0xffffff : 0x111827, runtime.planeTexturesByName.Ground || null);
        groundMesh.material.opacity = groundHasTexture ? 1.0 : 0.25;
        groundMesh.renderOrder = 5;
        groundMesh.material.depthWrite = false;
        groundMesh.userData = { planeName: "Ground", snapSource: "analytical" };
        runtime.analyticalGroup.add(groundMesh);

        PhotoMeasurePro__ThreeViewport__BuildAndAttachOffsetPlanes(currentState, planesByName, analyticalSceneBundle, labelMapCache);
    }

    function PhotoMeasurePro__ThreeViewport__UpdateDepthMesh(currentState) {
        const scene3dState = currentState.scene3d || {};
        const nextDepthSignature = (scene3dState.depthCacheUrl || "") + "|" + (scene3dState.depthScaling ? JSON.stringify(scene3dState.depthScaling) : "none");
        if (runtime.depthSignature === nextDepthSignature) return;
        runtime.depthSignature = nextDepthSignature;
        PhotoMeasurePro__ThreeViewport__ClearGroup(runtime.depthGroup);
    }

    function PhotoMeasurePro__ThreeViewport__RebuildMeasurements(currentState) {
        PhotoMeasurePro__ThreeViewport__ClearGroup(runtime.measureGroup);
        (currentState.measurements3d || []).forEach(function(measurementItem) {
            const points = [new THREE.Vector3(measurementItem.a.x, measurementItem.a.y, measurementItem.a.z), new THREE.Vector3(measurementItem.b.x, measurementItem.b.y, measurementItem.b.z)];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0xf97316 });
            runtime.measureGroup.add(new THREE.Line(geometry, material));
        });
    }

    function PhotoMeasurePro__ThreeViewport__PickBestAnalyticalHit(analyticalHits) {
        if (!analyticalHits || !analyticalHits.length) return null;
        const sortedHits = analyticalHits.slice().sort(function(hitA, hitB) {
            const planeA = hitA.object && hitA.object.userData && hitA.object.userData.planeName;
            const planeB = hitB.object && hitB.object.userData && hitB.object.userData.planeName;
            if (planeA === "Ground" && planeB !== "Ground") return 1;
            if (planeA !== "Ground" && planeB === "Ground") return -1;
            return hitA.distance - hitB.distance;
        });
        const nearestHit = sortedHits[0];
        const nearestDistance = nearestHit.distance;
        const visibleCandidates = sortedHits.filter(function(hitRecord) {
            return hitRecord.distance <= nearestDistance + 5;
        });
        return visibleCandidates[0] || nearestHit;
    }

    function PhotoMeasurePro__ThreeViewport__HandlePointerDown(pointerEvent) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState || currentState.mode !== "3d") return;
        const rect = runtime.canvasElement.getBoundingClientRect();
        const ndcX = ((pointerEvent.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((pointerEvent.clientY - rect.top) / rect.height) * 2 - 1);
        runtime.raycaster.setFromCamera({ x: ndcX, y: ndcY }, runtime.camera);
        const scene3dState = currentState.scene3d || {};
        const snapTarget = scene3dState.snapTarget || "analytical";
        let hitRecord = null;
        if (snapTarget === "depthMesh" || snapTarget === "both") {
            const depthHits = runtime.raycaster.intersectObjects(runtime.depthGroup.children, true);
            if (depthHits.length > 0) hitRecord = depthHits[0];
        }
        if (!hitRecord && (snapTarget === "analytical" || snapTarget === "both")) {
            const analyticalHits = runtime.raycaster.intersectObjects(runtime.analyticalGroup.children, true);
            hitRecord = PhotoMeasurePro__ThreeViewport__PickBestAnalyticalHit(analyticalHits);
        }
        if (!hitRecord) return;
        const measurementEngine = window.PhotoMeasurePro__System__Measurement3D__Engine;
        measurementEngine.PhotoMeasurePro__Measurement3D__RegisterPick(
            { x: hitRecord.point.x, y: hitRecord.point.y, z: hitRecord.point.z },
            hitRecord.object.userData.snapSource || "analytical",
            hitRecord.object.userData.planeName || null
        );
    }

    function PhotoMeasurePro__ThreeViewport__AlignToPhoto(currentState) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const stateValue = currentState || stateManager.PhotoMeasurePro__StateManager__GetState();
        const solver = window.PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver;
        const analyticalSceneBundle = solver.PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene(stateValue);
        if (!analyticalSceneBundle || !analyticalSceneBundle.ready) return;
        runtime.analyticalSceneBundle = analyticalSceneBundle;
        PhotoMeasurePro__ThreeViewport__ApplyPhotoLockedCamera(analyticalSceneBundle, stateValue);
        const nextCameraState = {
            position: { x: runtime.camera.position.x, y: runtime.camera.position.y, z: runtime.camera.position.z },
            target: { x: runtime.controls.target.x, y: runtime.controls.target.y, z: runtime.controls.target.z }
        };
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return {
                scene3d: Object.assign({}, previousState.scene3d, { cameraState: nextCameraState })
            };
        });
    }

    function PhotoMeasurePro__ThreeViewport__RestoreCameraState(currentState) {
        const scene3dState = currentState.scene3d || {};
        const cameraState = scene3dState.cameraState;
        if (cameraState && cameraState.position && cameraState.target) {
            runtime.camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
            runtime.controls.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
            runtime.controls.update();
            return;
        }
        if (runtime.analyticalSceneBundle && runtime.analyticalSceneBundle.ready) {
            PhotoMeasurePro__ThreeViewport__ApplyPhotoLockedCamera(runtime.analyticalSceneBundle, currentState);
        }
    }

    function PhotoMeasurePro__ThreeViewport__Render(domRefs, currentState) {
        if (!runtime.initialized) return;
        if (currentState.mode !== "3d") return;

        PhotoMeasurePro__ThreeViewport__EnsureSize();

        const nextAnalyticalSignature = JSON.stringify({
            lines:              currentState.lines,
            constraintsByPlane: currentState.constraintsByPlane,
            anchorPoint:        currentState.anchorPoint,
            offsetPlanes:       currentState.scene3d.offsetPlanes,
            imageUrl:           currentState.imageUrl || "",
            worldOrigin:        currentState.scene3d.worldOrigin,
            labelMapUrl:        (currentState.scene3d.planeLabelMap && currentState.scene3d.planeLabelMap.cacheUrl) || ""
        });
        if (nextAnalyticalSignature !== runtime.analyticalSignature) {
            runtime.analyticalSignature = nextAnalyticalSignature;
            PhotoMeasurePro__ThreeViewport__RebuildAnalyticalScene(currentState);
            PhotoMeasurePro__ThreeViewport__RestoreCameraState(currentState);
        }

        PhotoMeasurePro__ThreeViewport__UpdateDepthMesh(currentState);
        PhotoMeasurePro__ThreeViewport__RebuildMeasurements(currentState);
        runtime.controls.update();
        runtime.renderer.render(runtime.scene, runtime.camera);

        if (runtime.hudElement && window.PhotoMeasurePro__System__ThreeViewport__OverlayHud) {
            runtime.hudElement.textContent = window.PhotoMeasurePro__System__ThreeViewport__OverlayHud
                .PhotoMeasurePro__ThreeViewport__OverlayHud__BuildMarkup(currentState);
        }
    }

    return {
        PhotoMeasurePro__ThreeViewport__Initialize: PhotoMeasurePro__ThreeViewport__Initialize,
        PhotoMeasurePro__ThreeViewport__Render: PhotoMeasurePro__ThreeViewport__Render,
        PhotoMeasurePro__ThreeViewport__AlignToPhoto: PhotoMeasurePro__ThreeViewport__AlignToPhoto
    };
})();

window.PhotoMeasurePro__System__ThreeViewport__Main = PhotoMeasurePro__System__ThreeViewport__Main;
// endregion ----------------------------------------------------
