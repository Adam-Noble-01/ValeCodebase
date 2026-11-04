// =============================================================================
// VALEVISION3D - VEGETATION LINEWORK PROTOTYPE - WHITECARD TEST BED
// =============================================================================
//
// FILE       : Na__VegLine__TestBed__.js
// NAMESPACE  : Na__VegBed
// MODULE     : Prototype - Vegetation Linework
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A made up house, terrace and raised planters in the whitecard style,
//              plus a line-up of shelves, for the bushes to be judged against
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - WHY MADE UP. A real project is client data and this folder's parent repo is
//   public, so nothing here comes from one. The shape follows what Adam ringed on
//   04-Nov-2026: long raised planters along a terrace front, a return up each side,
//   central steps, and windows just above the planting so the bushes overlap them.
// - LINES AND FACES AS A PROJECT'S ARE. White MeshStandardMaterial with polygon
//   offset, fat lines from EdgesGeometry, the loader's bias, the config's colour and
//   weight: Na__AppConfig__Main.json is read rather than copied.
//
// FRAMES:
// - Set out in integer mm, Y-up, converted to metres once in Na__VegBed__Box.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 0.1.0
// - Initial build for the isolated aesthetic demo.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
    import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
    import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Line Material the Bushes Use Too
    // ------------------------------------------------------------
    import { Na__VegLayer__MakeLineMaterial } from '../02__Src__AppModules/24__System__Vegetation/03__System__SceneLayer/Na__Vegetation__SceneLayer__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Layout, in Integer mm
    // ------------------------------------------------------------
    const Na__VegBed__TERRACE_Y      = 750;
    const Na__VegBed__RIM_TOP_Y      = 1200;
    const Na__VegBed__COPING_TOP_Y   = 1260;
    const Na__VegBed__SOIL_Y         = 1120;
    const Na__VegBed__RIM_MM         = 120;
    const Na__VegBed__COPING_OUT_MM  = 25;
    const Na__VegBed__TERRACE_X      = 7600;
    const Na__VegBed__TERRACE_FRONT  = 3000;
    const Na__VegBed__HOUSE_FRONT    = -1200;
    const Na__VegBed__HOUSE_X        = 8000;
    const Na__VegBed__EAVES_Y        = 8200;
    const Na__VegBed__SHELF_ORIGIN_X = 60000;                                  // <-- Far enough from the house never to share a view
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building Blocks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Box, in mm, onto the Lists
    // ------------------------------------------------------------
    function Na__VegBed__Box(lists, x0, x1, y0, y1, z0, z1) {
        const geometry = new THREE.BoxGeometry((x1 - x0) / 1000, (y1 - y0) / 1000, (z1 - z0) / 1000).toNonIndexed();  // <-- As the roof is: mergeGeometries wants them all alike
        geometry.translate((x0 + x1) / 2000, (y0 + y1) / 2000, (z0 + z1) / 2000);
        lists.faces.push(geometry);
        lists.edges.push(new THREE.EdgesGeometry(geometry, 1));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Line with No Face, in mm
    // ------------------------------------------------------------
    function Na__VegBed__Line(lists, x0, y0, z0, x1, y1, z1) {
        lists.loose.push(x0 / 1000, y0 / 1000, z0 / 1000, x1 / 1000, y1 / 1000, z1 / 1000);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Rectangle of Lines Flat on a Wall, in mm
    // ------------------------------------------------------------
    function Na__VegBed__Rect(lists, x0, x1, y0, y1, z) {
        Na__VegBed__Line(lists, x0, y0, z, x1, y0, z);
        Na__VegBed__Line(lists, x1, y0, z, x1, y1, z);
        Na__VegBed__Line(lists, x1, y1, z, x0, y1, z);
        Na__VegBed__Line(lists, x0, y1, z, x0, y0, z);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Sash Window with Its Sill and Head
    // ------------------------------------------------------------
    function Na__VegBed__Window(lists, xc, y0, w, h, z, rows) {
        const x0 = xc - w / 2, x1 = xc + w / 2, y1 = y0 + h;
        Na__VegBed__Box(lists, x0, x1, y0, y1, z, z + 40);                     // <-- Frame
        Na__VegBed__Box(lists, x0 - 90, x1 + 90, y0 - 110, y0, z, z + 130);    // <-- Stone sill
        Na__VegBed__Box(lists, x0 - 70, x1 + 70, y1, y1 + 200, z, z + 70);     // <-- Stone head

        const inX = 75, inY = 75, face = z + 42;
        Na__VegBed__Rect(lists, x0 + inX, x1 - inX, y0 + inY, y1 - inY, face);
        const mid = y0 + h / 2;
        Na__VegBed__Line(lists, x0 + inX, mid + 25, face, x1 - inX, mid + 25, face);
        Na__VegBed__Line(lists, x0 + inX, mid - 25, face, x1 - inX, mid - 25, face);
        for (let r = 1; r < rows; r++) {
            const t = r / rows;
            const up = mid + 25 + (y1 - inY - mid - 25) * t;
            const dn = y0 + inY + (mid - 25 - y0 - inY) * t;
            Na__VegBed__Line(lists, x0 + inX, up, face, x1 - inX, up, face);
            Na__VegBed__Line(lists, x0 + inX, dn, face, x1 - inX, dn, face);
        }
        Na__VegBed__Line(lists, xc, y0 + inY, face, xc, y1 - inY, face);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Raised Planter: Soil, Four Rim Walls and a Coping Ring
    // ------------------------------------------------------------
    function Na__VegBed__Planter(lists, x0, x1, z0, z1) {
        const T = Na__VegBed__TERRACE_Y, R = Na__VegBed__RIM_TOP_Y, C = Na__VegBed__COPING_TOP_Y;
        const rim = Na__VegBed__RIM_MM, out = Na__VegBed__COPING_OUT_MM;

        Na__VegBed__Box(lists, x0, x1, T, R, z1 - rim, z1);
        Na__VegBed__Box(lists, x0, x1, T, R, z0, z0 + rim);
        Na__VegBed__Box(lists, x0, x0 + rim, T, R, z0 + rim, z1 - rim);
        Na__VegBed__Box(lists, x1 - rim, x1, T, R, z0 + rim, z1 - rim);

        Na__VegBed__Box(lists, x0 - out, x1 + out, R, C, z1 - rim - out, z1 + out);
        Na__VegBed__Box(lists, x0 - out, x1 + out, R, C, z0 - out, z0 + rim + out);
        Na__VegBed__Box(lists, x0 - out, x0 + rim + out, R, C, z0 + rim + out, z1 - rim - out);
        Na__VegBed__Box(lists, x1 - rim - out, x1 + out, R, C, z0 + rim + out, z1 - rim - out);

        Na__VegBed__Box(lists, x0 + rim, x1 - rim, T, Na__VegBed__SOIL_Y, z0 + rim, z1 - rim);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Hipped Roof over the House
    // ------------------------------------------------------------
    function Na__VegBed__Roof(lists, x, y, zBack, zFront, rise) {
        const m = (v) => v / 1000;
        const ridgeZ = (zBack + zFront) / 2;
        const inset  = (zFront - zBack) / 2;
        const p = [
            [-x, y, zFront], [x, y, zFront], [x, y, zBack], [-x, y, zBack],
            [-(x - inset), y + rise, ridgeZ], [x - inset, y + rise, ridgeZ]
        ].map((v) => [m(v[0]), m(v[1]), m(v[2])]);
        const tris = [[0, 1, 5], [0, 5, 4], [1, 2, 5], [2, 3, 4], [2, 4, 5], [3, 0, 4]];

        const positions = [];
        tris.forEach((t) => t.forEach((i) => positions.push(p[i][0], p[i][1], p[i][2])));
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        const uvs = new Float32Array((positions.length / 3) * 2);              // <-- mergeGeometries wants what the boxes have
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        lists.faces.push(geometry);
        lists.edges.push(new THREE.EdgesGeometry(geometry, 1));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Whole Bed
// -----------------------------------------------------------------------------

    // FUNCTION | Build the House, the Terrace and the Shelves
    // ------------------------------------------------------------
    // options: { scene, appConfig, shelves, shelfSpanMm }
    // shelves: [{ yMm }] - one thin slab per row of the line-up
    // Returns { mesh, shelfOriginM, setLineWeight }
    // ------------------------------------------------------------
    function Na__VegBed__Build(options) {
        const lists = { faces : [], edges : [], loose : [] };

        // THE HOUSE
        const hx = Na__VegBed__HOUSE_X, front = Na__VegBed__HOUSE_FRONT, eaves = Na__VegBed__EAVES_Y;
        Na__VegBed__Box(lists, -hx, hx, 0, eaves, -7000, front);
        Na__VegBed__Box(lists, -hx - 40, -1150, 0, 1500, front - 10, front + 40);      // <-- Plinth, stopping at the door frame
        Na__VegBed__Box(lists, 1150, hx + 40, 0, 1500, front - 10, front + 40);
        Na__VegBed__Box(lists, -hx - 15, hx + 15, 4700, 4820, front - 10, front + 30); // <-- String course
        Na__VegBed__Box(lists, -hx - 200, hx + 200, eaves - 150, eaves, -7200, front + 200);
        Na__VegBed__Roof(lists, hx + 200, eaves, -7200, front + 200, 2600);
        Na__VegBed__Box(lists, -5200, -4300, eaves + 1400, 12000, -4600, -3700);
        Na__VegBed__Box(lists, 4300, 5200, eaves + 1400, 12000, -4600, -3700);

        // WINDOWS | The ground floor sits just above the planting, as in the reference elevation
        const groundY = 2150, upperY = 5350;
        [-6200, -3700, 3700, 6200].forEach((x) => {
            Na__VegBed__Window(lists, x, groundY, 1300, 2300, front + 40, 2);
            Na__VegBed__Window(lists, x, upperY, 1200, 2000, front + 30, 2);
        });
        Na__VegBed__Window(lists, 0, upperY, 1200, 2000, front + 30, 2);

        // THE DOORS
        Na__VegBed__Box(lists, -1150, 1150, Na__VegBed__TERRACE_Y, 3700, front + 40, front + 90);
        Na__VegBed__Rect(lists, -1050, -40, Na__VegBed__TERRACE_Y + 40, 3600, front + 92);
        Na__VegBed__Rect(lists, 40, 1050, Na__VegBed__TERRACE_Y + 40, 3600, front + 92);
        [-1, 1].forEach((side) => {
            const a = side < 0 ? -950 : 140, b = side < 0 ? -140 : 950;
            Na__VegBed__Rect(lists, a, b, 1000, 1500, front + 92);
            Na__VegBed__Rect(lists, a, b, 1620, 3480, front + 92);
        });

        // THE TERRACE AND THE STEPS
        const tx = Na__VegBed__TERRACE_X, tf = Na__VegBed__TERRACE_FRONT, ty = Na__VegBed__TERRACE_Y;
        Na__VegBed__Box(lists, -tx, tx, 0, ty, front, tf);
        const stepW = 1500, tread = 280;
        for (let s = 1; s <= 4; s++) {
            const top = ty - 150 * s;
            Na__VegBed__Box(lists, -stepW, stepW, 0, top, tf, tf + tread * s);
        }
        [-1, 1].forEach((side) => {
            const a = side < 0 ? -stepW - 150 : stepW, b = side < 0 ? -stepW : stepW + 150;
            Na__VegBed__Box(lists, a, b, 0, ty, tf, tf + tread * 4 + 60);
        });

        // THE PLANTERS | A long bed each side of the steps, and a return up each side
        const bedBack = 2100;
        Na__VegBed__Planter(lists, -tx, -stepW - 150, bedBack, tf);
        Na__VegBed__Planter(lists, stepW + 150, tx, bedBack, tf);
        Na__VegBed__Planter(lists, -tx, -tx + 900, front, bedBack);
        Na__VegBed__Planter(lists, tx - 900, tx, front, bedBack);

        // THE SHELVES | Each row of the line-up stands on its own thin slab, away from the house
        const shelfX = Na__VegBed__SHELF_ORIGIN_X;
        options.shelves.forEach((shelf) => {
            Na__VegBed__Box(lists, shelfX - 1300, shelfX + options.shelfSpanMm + 1300, shelf.yMm - 60, shelf.yMm, -700, 700);
        });

        // FACES
        const appConfig = options.appConfig;
        const baseMesh  = appConfig.models.baseMesh.material;
        const lineCfg   = appConfig.models.RenderConfig__Linework;
        const merged    = mergeGeometries(lists.faces, false);
        const material  = new THREE.MeshStandardMaterial({
            color               : baseMesh.whiteColor,
            roughness           : baseMesh.roughness,
            metalness           : baseMesh.metalness,
            side                : THREE.DoubleSide,
            polygonOffset       : true,
            polygonOffsetFactor : baseMesh.polygonOffsetFactor,
            polygonOffsetUnits  : baseMesh.polygonOffsetUnits
        });
        const mesh = new THREE.Mesh(merged, material);
        mesh.name          = 'Na__VegLine__TestBedFaces';                      // <-- No shadows here: they would only compete with the lines being judged
        options.scene.add(mesh);

        // LINES | The model's own colour, weight and bias from the app's config
        let total = lists.loose.length;
        lists.edges.forEach((e) => { total += e.attributes.position.array.length; });
        const joined = new Float32Array(total);
        let at = 0;
        lists.edges.forEach((e) => { joined.set(e.attributes.position.array, at); at += e.attributes.position.array.length; });
        joined.set(lists.loose, at);

        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(joined);
        const lineMaterial = Na__VegLayer__MakeLineMaterial(
            lineCfg.RenderConfig__Linework__EdgeColor,
            lineCfg.RenderConfig__Linework__LineWidth,
            lineCfg.RenderConfig__Linework__DepthBias,
            lineCfg.RenderConfig__Linework__OrthoDepthBiasMm,
            options.resolution
        );
        const line = new LineSegments2(geometry, lineMaterial);
        line.name          = 'Na__VegLine__TestBedLines';
        line.frustumCulled = false;
        line.renderOrder   = lineCfg.RenderConfig__Linework__RenderOrder;
        options.scene.add(line);

        return {
            mesh,
            shelfOriginM  : shelfX / 1000,
            setLineWeight : (widthPx) => { lineMaterial.linewidth = widthPx; }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Test Bed API
    // ------------------------------------------------------------
    export {
        Na__VegBed__SHELF_ORIGIN_X,
        Na__VegBed__Build
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
