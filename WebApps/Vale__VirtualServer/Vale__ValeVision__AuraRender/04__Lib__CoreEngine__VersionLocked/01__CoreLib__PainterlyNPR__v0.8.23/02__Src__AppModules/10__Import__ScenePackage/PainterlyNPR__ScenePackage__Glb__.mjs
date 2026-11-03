/* =============================================================================
   PAINTERLYNPR - SCENE PACKAGE | GLB SCENES
   =============================================================================

   FILE       : PainterlyNPR__ScenePackage__Glb__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ScenePackage - Glb
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A project's own model in place of the demo cottage: GLB files read
                into the package's records - objects with their Ids, material
                classes and roles, their triangles, and the edges the pen draws
   CREATED    : 30-Oct-2026

   DESCRIPTION:
   - A HOST HANDS OVER A SCENE SOURCE (ValeVision AURA's scene file, made from
     ValeVision 3D's whitecard): the objects in Id order, each naming its GLB
     file and node; the files, read with GlbRead; each mesh file's linework
     twin; one placement into the engine's world. GlbBase turns it into a base
     for Build (PainterlyNPR__ScenePackage__SetBase): run in place of the
     cottage and its garden, so the lawn, the distant belt, placed assets and
     material assignments follow exactly as they do for the demo.
   - IDS ARE THE SOURCE'S: objects are added in its order, so an object's Id is
     its place, and a material assignment's '#Id' keeps naming the same object
     after a re-import. A missing object still takes its Id, with no geometry.
   - EDGES ARE THE PEN'S SOURCE (the line candidates read only Scene.Edges). A
     mesh file's linework twin - SketchUp's own edges, as ValeVision 3D draws
     them - gives the hard edges, node for node; without one, the mesh's
     creases and open borders do. Edges between gently turned faces become
     SMOOTH edges carrying both face normals, drawn only where they are a
     silhouette (a column's sides, never its facets), as the cottage's are.
   - INSTANCED COMPONENTS (one GLB mesh, many nodes) are baked once per node:
     the engine draws one vertex array.
   - THE SUN AND THE FOOTPRINT FOLLOW THE MODEL: the shadow square is centred
     on the buildings and sized to them (the cottage's is 17 m), and the
     footprint the wash reads is the focal building's half size.
   - GLASS, WINDOW FRAMES AND DOORS ARE RECOGNISED (v0.8.16; Adam: "use a
     tipple method tag/material/naming"): by the SketchUp tag and material a
     flattened node is named by (TrueVision's builder buckets faces as
     <tag>::<material>, so the SSOT Windows and Doors tags arrive), by the
     glTF material (its name, or see-through), and by the node's and mesh's
     names (Na__GlbScenes__Config.json). A recognised node or primitive takes
     that class, triangle by triangle; the rest keep their object's.
     GlbWindows then turns each pane of glass into a window record for the
     shadow lines, once the drawing's own material assignments are applied.
   - NO SURFACES OR ORGANICS: brick indication needs records a GLB does not
     carry; a Painterly Scene Package will.

   -----------------------------------------------------------------------------

   SOURCE (what a host hands to GlbBase):
     {
       Placement : { OffsetM: [x, y, z], RotationDeg: 0 },     about +Y first, then moved
       Objects   : [ { Id, Name, Category, Material, Role, File, Node, Missing } ],
       Glbs      : Map(file name -> GlbRead result),
       Twins     : Map(mesh file name -> its linework file name)
     }

   ============================================================================= */

import GlbScenesConfig from './Na__GlbScenes__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Maths__Multiply     as  Multiply,
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Dot        as  V3Dot,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | GLB Scenes
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The GLB Container, Accessors and the Edge Rules
    // ------------------------------------------------------------
    const GLB_MAGIC         =  0x46546C67;                                  // <-- 'glTF'
    const CHUNK_JSON        =  0x4E4F534A;
    const CHUNK_BIN         =  0x004E4942;
    const COMPONENTS        =  { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
    const TYPED             =  { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const READ              =  { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };
    const IDENTITY          =  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const CREASE_DEG        =  30;                                          // <-- Faces turned more than this meet at a hard edge (no linework twin)
    const SMOOTH_MIN_DEG    =  6;                                           // <-- Under this the faces are one surface: no edge at all (a triangulation line is never a pen line)
    const WELD_PER_M        =  2000;                                        // <-- Corners closer than half a millimetre are one corner
    const SMOOTH_MAX_TRIS   =  250000;                                      // <-- An object larger than this keeps its hard edges only (furniture sets run to millions)
    const GROUND_LINE_M     =  0.03;                                        // <-- An edge this close to its object's foot is its ground line: Primary
    const SHADOW_MIN_HALF   =  17;                                          // <-- The cottage's square: never smaller
    const SHADOW_MAX_HALF   =  60;                                          // <-- The sun stands 60 m off and sees 130 m deep (23__Pass__LightAndShadow)
    const P = 0, S = 1, T = 2, O = 3;                                       // <-- Line classes, Primary to Optional (35__Line__DrawingDiscipline)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Config - Na__GlbScenes__Config.json: Glass, Window Frames and Doors by Tag, Material and Name
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken. The
    // patterns are compiled once, case ignored, in the order they are tried.
    const RECOGNITION  =  PainterlyNPR__ConfigAccess__Section(GlbScenesConfig, 'PainterlyNPR__GlbScenes__Config', 'Recognition', ['Recognition']).Recognition;
    const RULES        =  ['Glass', 'Window', 'Door'].map((key) => {
        const rule     =  RECOGNITION[key];
        const pattern  =  (source) => (source ? new RegExp(source, 'i') : null);
        return { Key: key, Class: rule.Class, Tags: pattern(rule.Tags), Materials: pattern(rule.Materials), Names: pattern(rule.Names) };
    });
    const SEE_THROUGH  =  RECOGNITION.Glass.SeeThroughAlpha;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading a GLB
// -----------------------------------------------------------------------------

    // FUNCTION | Read a GLB File: { Json, Bin, Nodes: [{ Index, Name, Mesh, World }] }
    // ------------------------------------------------------------
    // Every node reached from the file's scene, with its world matrix (column
    // major, as glTF and the engine's maths keep them), in the file's own node
    // order: a linework twin pairs with its mesh file by that order.
    function PainterlyNPR__ScenePackage__GlbRead(buffer) {
        const bytes  =  buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const view   =  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (bytes.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) throw new Error('Not a GLB file: no glTF header.');
        let json  =  null;
        let bin   =  null;
        for (let at = 12; at + 8 <= bytes.byteLength;) {
            const length  =  view.getUint32(at, true);
            const type    =  view.getUint32(at + 4, true);
            const body    =  bytes.subarray(at + 8, at + 8 + length);
            if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(body));
            else if (type === CHUNK_BIN) bin = body;
            at += 8 + length;
        }
        if (!json) throw new Error('A GLB file without its JSON chunk.');
        const glb    =  { Json: json, Bin: bin, Nodes: [] };
        const nodes  =  json.nodes || [];
        const visit  =  (index, parent) => {
            const node   =  nodes[index];
            const world  =  Multiply(parent, PainterlyNPR__ScenePackage__GlbNodeMatrix(node));
            glb.Nodes.push({ Index: index, Name: node.name || '', Mesh: node.mesh, World: world, Extras: node.extras || null });
            (node.children || []).forEach((child) => visit(child, world));
        };
        const scene  =  (json.scenes || [])[json.scene || 0] || { nodes: nodes.map((_, i) => i) };
        (scene.nodes || []).forEach((root) => visit(root, IDENTITY));
        glb.Nodes.sort((a, b) => a.Index - b.Index);
        return glb;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Node's Own Matrix: its matrix, or translation x rotation x scale
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__GlbNodeMatrix(node) {
        if (node.matrix) return new Float32Array(node.matrix);
        const [tx, ty, tz]      =  node.translation || [0, 0, 0];
        const [x, y, z, w]      =  node.rotation || [0, 0, 0, 1];
        const [sx, sy, sz]      =  node.scale || [1, 1, 1];
        return new Float32Array([
            (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx,     (2 * (x * z - y * w)) * sx,     0,
            (2 * (x * y - z * w)) * sy,     (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy,     0,
            (2 * (x * z + y * w)) * sz,     (2 * (y * z - x * w)) * sz,     (1 - 2 * (x * x + y * y)) * sz, 0,
            tx, ty, tz, 1,
        ]);
    }
    // ------------------------------------------------------------


    // FUNCTION | An Accessor's Values as One Flat Typed Array (count x components)
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__GlbAccessor(glb, index) {
        const json      =  glb.Json;
        const accessor  =  json.accessors[index];
        const comps     =  COMPONENTS[accessor.type] || 1;
        const Typed     =  TYPED[accessor.componentType];
        const out       =  new Typed(accessor.count * comps);
        if (accessor.bufferView === undefined || !glb.Bin) return out;          // <-- All zeros, as glTF says (sparse accessors are not read)
        const view      =  json.bufferViews[accessor.bufferView];
        const start     =  (view.byteOffset || 0) + (accessor.byteOffset || 0);
        const size      =  Typed.BYTES_PER_ELEMENT;
        const stride    =  view.byteStride || size * comps;
        const absolute  =  glb.Bin.byteOffset + start;
        if (stride === size * comps && absolute % size === 0) {
            out.set(new Typed(glb.Bin.buffer, absolute, accessor.count * comps));
            return out;
        }
        const data  =  new DataView(glb.Bin.buffer, glb.Bin.byteOffset);
        const read  =  READ[accessor.componentType];
        for (let i = 0; i < accessor.count; i++) {
            for (let c = 0; c < comps; c++) out[i * comps + c] = data[read](start + i * stride + c * size, true);
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Recognition: Glass, Window Frames and Doors by Tag, Material and Name
// -----------------------------------------------------------------------------

    // FUNCTION | A Node's Class by Its Tag, Material and Name: a material class key, or null
    // ------------------------------------------------------------
    // TrueVision's builder names a flattened node <tag>::<material> (the
    // SketchUp tag and the SketchUp material, kept even in a whitecard); an
    // instanced component's node carries its definition's name. Glass wins over
    // a window or a door, so a glazed door's glass is glass and its leaf is
    // joinery. A node's extras.tag (another exporter's) counts as its tag.
    function PainterlyNPR__ScenePackage__GlbRecognise(glb, node) {
        const flat      =  node.Name.indexOf('::');
        const extras    =  node.Extras || {};
        const tag       =  [flat >= 0 ? node.Name.slice(0, flat) : '', extras.tag || extras.Tag || extras.layer || extras.Layer || ''].join(' ');
        const material  =  flat >= 0 ? node.Name.slice(flat + 2) : '';
        const mesh      =  node.Mesh !== undefined && glb.Json.meshes[node.Mesh] ? glb.Json.meshes[node.Mesh].name || '' : '';
        const names     =  node.Name + ' ' + mesh;
        for (const rule of RULES) {
            if ((rule.Tags && rule.Tags.test(tag)) || (rule.Materials && rule.Materials.test(material)) || (rule.Names && rule.Names.test(names))) return rule.Class;
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Primitive's Own Glass: its glTF material named glass, or see-through
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__GlbPrimitiveGlass(glb, primitive) {
        const material  =  primitive.material !== undefined ? (glb.Json.materials || [])[primitive.material] : null;
        if (!material) return false;
        const pbr    =  material.pbrMetallicRoughness || {};
        const alpha  =  pbr.baseColorFactor && pbr.baseColorFactor.length > 3 ? pbr.baseColorFactor[3] : 1;
        return material.alphaMode === 'BLEND' || alpha < SEE_THROUGH || RULES[0].Materials.test(material.name || '');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Into the Engine's World
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Point and a Normal Through a Node's Matrix, Then the Placement
    // ------------------------------------------------------------
    // The placement turns about +Y (right-handed: counter-clockwise from above)
    // and then moves. A normal goes through the inverse transpose of the node's
    // own 3 x 3, so a scaled component keeps its faces' true directions.
    function PainterlyNPR__ScenePackage__GlbTransform(world, placement) {
        const m    =  world;
        const a    =  (placement.RotationDeg || 0) * Math.PI / 180;
        const c    =  Math.cos(a);
        const s    =  Math.sin(a);
        const off  =  placement.OffsetM || [0, 0, 0];
        const det  =  m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
        const k    =  Math.abs(det) > 1e-12 ? 1 / det : 1;
        const nm   =  [                                                      // <-- The inverse transpose of the 3 x 3, row by row
            (m[5] * m[10] - m[6] * m[9]) * k, (m[6] * m[8] - m[4] * m[10]) * k, (m[4] * m[9] - m[5] * m[8]) * k,
            (m[2] * m[9] - m[1] * m[10]) * k, (m[0] * m[10] - m[2] * m[8]) * k, (m[1] * m[8] - m[0] * m[9]) * k,
            (m[1] * m[6] - m[2] * m[5]) * k,  (m[2] * m[4] - m[0] * m[6]) * k,  (m[0] * m[5] - m[1] * m[4]) * k,
        ];
        const turn  =  (x, y, z) => [c * x + s * z, y, -s * x + c * z];
        return {
            Point  :  (x, y, z) => {
                const p  =  turn(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
                return [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
            },
            Normal :  (x, y, z) => V3Normalise(turn(nm[0] * x + nm[3] * y + nm[6] * z, nm[1] * x + nm[4] * y + nm[7] * z, nm[2] * x + nm[5] * y + nm[8] * z)),
            Flip   :  det < 0,                                                // <-- A mirrored component: its triangles' winding turns over
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Node's Triangles in the World: { Points: [[x,y,z]...] in threes, Normals: the same, Classes: one a triangle }
    // ------------------------------------------------------------
    // classify (optional) gives each primitive a material class key or null;
    // Classes holds it for every triangle the primitive gave.
    function PainterlyNPR__ScenePackage__GlbTriangles(glb, node, placement, classify) {
        const mesh    =  glb.Json.meshes[node.Mesh];
        const xf      =  PainterlyNPR__ScenePackage__GlbTransform(node.World, placement);
        const points  =  [];
        const normals =  [];
        const classes =  [];
        for (const primitive of mesh.primitives || []) {
            if ((primitive.mode === undefined ? 4 : primitive.mode) !== 4) continue;   // <-- Triangles only: strips and fans are not written by SketchUp's exporters
            const cls    =  classify ? classify(primitive) : null;
            const pos    =  PainterlyNPR__ScenePackage__GlbAccessor(glb, primitive.attributes.POSITION);
            const nrm    =  primitive.attributes.NORMAL !== undefined ? PainterlyNPR__ScenePackage__GlbAccessor(glb, primitive.attributes.NORMAL) : null;
            const index  =  primitive.indices !== undefined ? PainterlyNPR__ScenePackage__GlbAccessor(glb, primitive.indices) : null;
            const count  =  index ? index.length : pos.length / 3;
            for (let t = 0; t + 2 < count; t += 3) {
                const corners  =  xf.Flip ? [0, 2, 1] : [0, 1, 2];
                const ids      =  corners.map((k) => index ? index[t + k] : t + k);
                const p        =  ids.map((i) => xf.Point(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
                const face     =  V3Normalise(V3Cross(V3Sub(p[1], p[0]), V3Sub(p[2], p[0])));
                if (!Number.isFinite(face[0])) continue;                          // <-- A degenerate sliver draws nothing
                points.push(p[0], p[1], p[2]);
                classes.push(cls);
                if (nrm) {
                    const n  =  ids.map((i) => xf.Normal(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]));
                    normals.push(...n.map((v) => (V3Dot(v, face) < 0 ? [-v[0], -v[1], -v[2]] : v)));   // <-- Normals face the way the triangle does
                } else {
                    normals.push(face, face, face);
                }
            }
        }
        return { Points: points, Normals: normals, Classes: classes };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Node's Lines in the World (a linework twin): [[a, b]...]
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__GlbLines(glb, node, placement) {
        const mesh  =  glb.Json.meshes[node.Mesh];
        const xf    =  PainterlyNPR__ScenePackage__GlbTransform(node.World, placement);
        const out   =  [];
        for (const primitive of mesh.primitives || []) {
            const mode  =  primitive.mode === undefined ? 4 : primitive.mode;
            if (mode !== 1 && mode !== 3) continue;                              // <-- LINES and LINE_STRIP
            const pos    =  PainterlyNPR__ScenePackage__GlbAccessor(glb, primitive.attributes.POSITION);
            const index  =  primitive.indices !== undefined ? PainterlyNPR__ScenePackage__GlbAccessor(glb, primitive.indices) : null;
            const count  =  index ? index.length : pos.length / 3;
            const at     =  (k) => { const i = index ? index[k] : k; return xf.Point(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); };
            if (mode === 1) for (let k = 0; k + 1 < count; k += 2) out.push([at(k), at(k + 1)]);
            else for (let k = 0; k + 1 < count; k++) out.push([at(k), at(k + 1)]);
        }
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Mesh's Edges: { Hard: [[a, b]], Smooth: [[a, b, n1, n2]] }
    // ------------------------------------------------------------
    // Corners are welded, every triangle side is counted, and each side is read by
    // the turn between the faces that share it: an open border or a sharp crease
    // is hard; a gentle turn is smooth (a silhouette only); a flat join is nothing.
    function PainterlyNPR__ScenePackage__GlbMeshEdges(points, wantHard, wantSmooth) {
        const weld    =  new Map();
        const corner  =  (p) => {
            const key  =  Math.round(p[0] * WELD_PER_M) + ',' + Math.round(p[1] * WELD_PER_M) + ',' + Math.round(p[2] * WELD_PER_M);
            let id     =  weld.get(key);
            if (id === undefined) { id = weld.size; weld.set(key, id); }
            return id;
        };
        const sides   =  new Map();
        const faces   =  [];
        for (let t = 0; t < points.length; t += 3) {
            const tri   =  [points[t], points[t + 1], points[t + 2]];
            const ids   =  tri.map(corner);
            faces.push(V3Normalise(V3Cross(V3Sub(tri[1], tri[0]), V3Sub(tri[2], tri[0]))));
            for (let k = 0; k < 3; k++) {
                const a  =  ids[k];
                const b  =  ids[(k + 1) % 3];
                if (a === b) continue;
                const key  =  a < b ? a * 4194304 + b : b * 4194304 + a;         // <-- 2^22 corners a side: exact as a number
                let side   =  sides.get(key);
                if (!side) { side = { A: tri[k], B: tri[(k + 1) % 3], Faces: [] }; sides.set(key, side); }
                side.Faces.push(faces.length - 1);
            }
        }
        const crease  =  Math.cos(CREASE_DEG * Math.PI / 180);
        const flat    =  Math.cos(SMOOTH_MIN_DEG * Math.PI / 180);
        const hard    =  [];
        const smooth  =  [];
        for (const side of sides.values()) {
            if (side.Faces.length !== 2) { if (wantHard) hard.push([side.A, side.B]); continue; }
            const n1   =  faces[side.Faces[0]];
            const n2   =  faces[side.Faces[1]];
            const dot  =  V3Dot(n1, n2);
            if (dot < crease) { if (wantHard) hard.push([side.A, side.B]); }
            else if (dot < flat && wantSmooth) smooth.push([side.A, side.B, n1, n2]);
        }
        return { Hard: hard, Smooth: smooth };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Base: a Scene Source Into the Package
// -----------------------------------------------------------------------------

    // FUNCTION | A Base for Build From a Scene Source (the cottage's place in Build)
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__GlbBase(source) {
        return function PainterlyNPR__ScenePackage__GlbBaseBuild(K) {
            const { pkg, addObject, addEdge, vertex }  =  K;
            const placement  =  source.Placement || {};
            const taken      =  new Map();                                       // <-- File -> node indexes used: a repeated name takes its next node
            const boxes      =  { Focal: null, Architecture: null, Ground: null };
            const grow       =  (key, p) => {
                const b  =  boxes[key] || (boxes[key] = { Min: [Infinity, Infinity, Infinity], Max: [-Infinity, -Infinity, -Infinity] });
                for (let i = 0; i < 3; i++) { if (p[i] < b.Min[i]) b.Min[i] = p[i]; if (p[i] > b.Max[i]) b.Max[i] = p[i]; }
            };
            const counts     =  { Objects: 0, Triangles: 0, Hard: 0, Smooth: 0, Twin: 0, Missing: 0, Recognised: 0 };
            let groundTop    =  Infinity;                                        // <-- The lowest upward-facing ground: a site slab's top, never its sides

            for (const spec of source.Objects || []) {
                const glb   =  source.Glbs && source.Glbs.get(spec.File);
                const used  =  taken.get(spec.File) || new Set();
                taken.set(spec.File, used);
                const node  =  glb && !spec.Missing ? glb.Nodes.find((n) => n.Name === spec.Node && n.Mesh !== undefined && !used.has(n.Index)) : null;
                const seen  =  node ? PainterlyNPR__ScenePackage__GlbRecognise(glb, node) : null;   // <-- Its tag, material or name: glass, a window frame, a door
                const key     =  seen || (MATERIAL_BY_KEY[spec.Material] && spec.Material !== 'Sky' ? spec.Material : 'Render');
                const object  =  addObject(spec.Name || `Object ${spec.Id}`, spec.Category || 'Wall', key, spec.Role || 'Architecture');
                counts.Objects++;
                if (seen) counts.Recognised++;
                if (object.Id !== spec.Id) console.warn(`[PainterlyNPR Glb] Object "${spec.Name}" is #${object.Id}, its source says #${spec.Id}: the source's Ids must run 1, 2, 3 ... in order.`);
                if (!node) { counts.Missing++; continue; }
                used.add(node.Index);

                // The triangles, with the object's id and material in every vertex; a
                // primitive whose own glTF material is glass is glass, triangle by triangle
                const glass  =  { Id: object.Id, MaterialId: MATERIAL_BY_KEY.Glass.Id };
                const tri    =  PainterlyNPR__ScenePackage__GlbTriangles(glb, node, placement, (primitive) => (PainterlyNPR__ScenePackage__GlbPrimitiveGlass(glb, primitive) ? 'Glass' : null));
                for (let i = 0; i < tri.Points.length; i++) vertex(tri.Points[i], tri.Normals[i], tri.Classes[(i / 3) | 0] === 'Glass' ? glass : object);
                counts.Triangles += tri.Points.length / 3;
                let foot  =  Infinity;
                for (const p of tri.Points) {
                    if (p[1] < foot) foot = p[1];
                    if (spec.Role === 'Focal' || spec.Role === 'Architecture' || spec.Role === 'Ground') grow(spec.Role, p);
                }
                if (spec.Role === 'Ground') {
                    for (let t = 0; t < tri.Points.length; t += 3) {
                        const [a, b, c]  =  [tri.Points[t], tri.Points[t + 1], tri.Points[t + 2]];
                        if (V3Normalise(V3Cross(V3Sub(b, a), V3Sub(c, a)))[1] > 0.5) groundTop = Math.min(groundTop, a[1], b[1], c[1]);
                    }
                }

                // The edges: the linework twin's, node for node, else the mesh's creases; smooth sides for silhouettes
                const lineClass  =  spec.Role === 'Ground' ? O : spec.Role === 'Context' ? T : S;
                const classOf    =  (a, b) => ((spec.Role === 'Focal' || spec.Role === 'Architecture') && a[1] - foot < GROUND_LINE_M && b[1] - foot < GROUND_LINE_M ? P : lineClass);
                const twinName   =  source.Twins && source.Twins.get(spec.File);
                const twin       =  twinName && source.Glbs.get(twinName);
                const twinNode   =  twin ? twin.Nodes.find((n) => n.Index === node.Index && n.Mesh !== undefined) : null;
                const lines      =  twinNode ? PainterlyNPR__ScenePackage__GlbLines(twin, twinNode, placement) : [];
                const small      =  tri.Points.length / 3 <= SMOOTH_MAX_TRIS;
                const mesh       =  PainterlyNPR__ScenePackage__GlbMeshEdges(tri.Points, !lines.length, small && spec.Role !== 'Ground');
                for (const [a, b] of lines) addEdge(object, a, b, classOf(a, b), 'Hard');
                for (const [a, b] of mesh.Hard) addEdge(object, a, b, classOf(a, b), 'Hard');
                for (const [a, b, n1, n2] of mesh.Smooth) addEdge(object, a, b, lineClass, 'Smooth', n1, n2);
                counts.Hard += lines.length + mesh.Hard.length;
                counts.Smooth += mesh.Smooth.length;
                if (lines.length) counts.Twin++;
            }

            // The sun's square and the wash's footprint follow the buildings; the lawn sits under the model's own ground
            const building  =  boxes.Focal || boxes.Architecture;
            const all       =  [boxes.Focal, boxes.Architecture].filter(Boolean);
            if (building) pkg.Footprint = [+((building.Max[0] - building.Min[0]) / 2).toFixed(3), +((building.Max[2] - building.Min[2]) / 2).toFixed(3)];
            if (all.length) {
                const min     =  [0, 1, 2].map((i) => Math.min(...all.map((b) => b.Min[i])));
                const max     =  [0, 1, 2].map((i) => Math.max(...all.map((b) => b.Max[i])));
                const centre  =  [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
                const half    =  Math.hypot(max[0] - min[0], max[2] - min[2]) / 2 + 2;
                pkg.ShadowCentre    =  centre;
                pkg.ShadowHalfSize  =  Math.min(SHADOW_MAX_HALF, Math.max(SHADOW_MIN_HALF, half));
            }
            if (Number.isFinite(groundTop)) K.GroundY = Math.min(0, groundTop) - 0.05;   // <-- Just under the model's own ground, so the two never fight for a pixel and the lawn carries on past its edge
            pkg.Source  =  Object.assign({ Kind: 'Glb' }, counts);
            return pkg;
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ScenePackage__GlbAccessor,
        PainterlyNPR__ScenePackage__GlbBase,
        PainterlyNPR__ScenePackage__GlbMeshEdges,
        PainterlyNPR__ScenePackage__GlbRead,
        PainterlyNPR__ScenePackage__GlbRecognise,
        PainterlyNPR__ScenePackage__GlbTriangles,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
