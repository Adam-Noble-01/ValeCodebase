// =============================================================================
// VALEVISION3D - DEV TOOLS - SCENE INSPECTOR CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__SceneInspector__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : SceneInspector Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : On-demand scene graph reporter for the Dev Tools panel
// CREATED    : 11-Mar-2026
//
// DESCRIPTION:
// - Provides a Scan Scene button in the Dev Tools panel that traverses the
//   live Three.js scene graph and renders a collapsible node tree.
// - Reports per-node type, name, visibility state, and mesh stats
//   (triangle + vertex counts) inline without mutating the scene.
// - Shows a summary header with total node, mesh, triangle, line, and light
//   counts after each scan.
// - Works on-demand because Na__AppFlow__StartLoadingSequence is not awaited,
//   so models may not be present at script boot time.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Mar-2026 - Version 1.0.0
// - Initial implementation as a standalone Dev Tools module.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM IDs
    // ------------------------------------------------------------
    const Na__SceneInspector__ToggleId  = 'naSceneInspectorToggle';            // <-- Panel open/close button
    const Na__SceneInspector__PanelId   = 'naSceneInspectorPanel';             // <-- Collapsible panel container
    const Na__SceneInspector__StatsId   = 'naSceneInspectorStats';             // <-- Summary stats line
    const Na__SceneInspector__TreeId    = 'naSceneInspectorTree';              // <-- Tree scroll container
    const Na__SceneInspector__ScanBtnId = 'naSceneInspectorScanBtn';           // <-- Scan trigger button
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Expand Depth
    // ------------------------------------------------------------
    const Na__SceneInspector__DefaultExpandDepth = 3;                          // <-- Expand 3 levels by default (down to GLTF scene roots)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Type Badge Labels and Families
    // ------------------------------------------------------------
    const Na__SceneInspector__TypeFamilies = {
        Mesh            : 'mesh',                                              // <-- Mesh geometry nodes
        SkinnedMesh     : 'mesh',                                              // <-- Skinned mesh variant
        Scene           : 'group',                                             // <-- THREE.Scene root
        Group           : 'group',                                             // <-- THREE.Group containers
        Object3D        : 'group',                                             // <-- Generic Object3D
        DirectionalLight : 'light',                                            // <-- Directional light
        AmbientLight    : 'light',                                             // <-- Ambient light
        PointLight      : 'light',                                             // <-- Point light
        SpotLight       : 'light',                                             // <-- Spot light
        HemisphereLight : 'light',                                             // <-- Hemisphere light
        LineSegments    : 'line',                                              // <-- Standard line segments
        LineSegments2   : 'line',                                              // <-- Fat line segments (three/addons)
        Line            : 'line',                                              // <-- Generic THREE.Line
        PerspectiveCamera : 'camera',                                          // <-- Perspective camera
        OrthographicCamera : 'camera',                                         // <-- Orthographic camera
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Traversal and Stats Collection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Classify Node Type Family
    // ------------------------------------------------------------
    function Na__SceneInspector__GetTypeFamily(node) {
        return Na__SceneInspector__TypeFamilies[node.type] || 'other';         // <-- Resolve family or fallback
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compute Mesh Triangle and Vertex Count
    // ------------------------------------------------------------
    function Na__SceneInspector__GetMeshStats(node) {
        if (!node.isMesh && !node.isSkinnedMesh) return null;                  // <-- Only applies to mesh nodes
        const geo = node.geometry;
        if (!geo) return null;

        const posAttr     = geo.attributes && geo.attributes.position;
        const vertexCount = posAttr ? posAttr.count : 0;                       // <-- Position attribute vertex count
        const triCount    = geo.index
            ? Math.floor(geo.index.count / 3)                                  // <-- Indexed geometry
            : Math.floor(vertexCount / 3);                                     // <-- Non-indexed geometry

        return { vertexCount, triCount };                                      // <-- Return stats object
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Single Node Data Record
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildNodeRecord(node) {
        const meshStats  = Na__SceneInspector__GetMeshStats(node);             // <-- Compute mesh stats (null for non-meshes)
        const hasProfile = !!(node.userData && node.userData.Na__ProfileLineColor); // <-- ValeVision profile colour flag

        return {
            uuid        : node.uuid,                                           // <-- Unique Three.js ID
            name        : node.name || '[unnamed]',                            // <-- Display name
            type        : node.type || 'Object3D',                             // <-- Three.js type string
            family      : Na__SceneInspector__GetTypeFamily(node),             // <-- Resolved CSS family
            visible     : node.visible,                                        // <-- Current visibility state
            childCount  : node.children ? node.children.length : 0,           // <-- Direct child count
            meshStats   : meshStats,                                           // <-- { vertexCount, triCount } or null
            hasProfile  : hasProfile,                                          // <-- Has ValeVision profile line colour data
            children    : []                                                   // <-- Populated by recursive walk
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recursively Walk Scene Children
    // ------------------------------------------------------------
    function Na__SceneInspector__WalkNode(node, stats) {
        const record = Na__SceneInspector__BuildNodeRecord(node);              // <-- Build data record for this node

        stats.totalNodes++;                                                    // <-- Count all nodes

        const family = record.family;
        if (family === 'mesh')  stats.totalMeshes++;                           // <-- Accumulate mesh count
        if (family === 'light') stats.totalLights++;                           // <-- Accumulate light count
        if (family === 'line')  stats.totalLines++;                            // <-- Accumulate line count
        if (record.meshStats) {
            stats.totalTriangles += record.meshStats.triCount;                 // <-- Accumulate triangle count
            stats.totalVertices  += record.meshStats.vertexCount;              // <-- Accumulate vertex count
        }

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                record.children.push(Na__SceneInspector__WalkNode(child, stats)); // <-- Recurse into children
            }
        }

        return record;                                                         // <-- Return populated record tree
    }
    // ------------------------------------------------------------


    // FUNCTION | Scan Scene - Builds Full Stats and Node Tree
    // ------------------------------------------------------------
    function Na__SceneInspector__ScanScene(scene) {
        const stats = {
            totalNodes     : 0,                                                // <-- All Object3D descendants
            totalMeshes    : 0,                                                // <-- Mesh/SkinnedMesh nodes
            totalTriangles : 0,                                                // <-- Sum of triangle counts
            totalVertices  : 0,                                                // <-- Sum of vertex counts
            totalLights    : 0,                                                // <-- Light nodes
            totalLines     : 0                                                 // <-- Line segment nodes
        };

        const tree = Na__SceneInspector__WalkNode(scene, stats);              // <-- Walk from scene root

        return { stats, tree };                                                // <-- Return data for rendering
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Tree Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format Number with Thousands Separator
    // ------------------------------------------------------------
    function Na__SceneInspector__FormatNumber(n) {
        return n.toLocaleString();                                             // <-- Readable large numbers
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Stats Summary Line
    // ------------------------------------------------------------
    function Na__SceneInspector__RenderStats(statsEl, stats) {
        if (!statsEl) return;

        statsEl.innerHTML = [
            `<span class="na-scene-inspector__stat-item"><strong>${Na__SceneInspector__FormatNumber(stats.totalNodes)}</strong> nodes</span>`,
            `<span class="na-scene-inspector__stat-item"><strong>${Na__SceneInspector__FormatNumber(stats.totalMeshes)}</strong> meshes</span>`,
            `<span class="na-scene-inspector__stat-item"><strong>${Na__SceneInspector__FormatNumber(stats.totalTriangles)}</strong> tris</span>`,
            `<span class="na-scene-inspector__stat-item"><strong>${Na__SceneInspector__FormatNumber(stats.totalLines)}</strong> lines</span>`,
            `<span class="na-scene-inspector__stat-item"><strong>${Na__SceneInspector__FormatNumber(stats.totalLights)}</strong> lights</span>`
        ].join('');                                                            // <-- Build stats row
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Node Row Element
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildNodeRowEl(record, depth) {
        const row = document.createElement('div');
        row.className = 'na-scene-inspector__row';

        // INDENT SPACER
        const indent = document.createElement('span');
        indent.className = 'na-scene-inspector__indent';
        indent.style.paddingLeft = `${depth * 12}px`;                         // <-- Scale indent by depth
        row.appendChild(indent);

        // EXPAND TOGGLE (only when children exist)
        const toggle = document.createElement('span');
        toggle.className = 'na-scene-inspector__toggle';
        if (record.children.length > 0) {
            toggle.textContent = '▾';                                          // <-- Expanded state arrow
            toggle.setAttribute('aria-hidden', 'true');
        }
        row.appendChild(toggle);

        // VISIBILITY DOT
        const dot = document.createElement('span');
        dot.className = `na-scene-inspector__dot${record.visible ? ' na-scene-inspector__dot--visible' : ' na-scene-inspector__dot--hidden'}`;
        dot.title = record.visible ? 'Visible' : 'Hidden';
        row.appendChild(dot);

        // TYPE BADGE
        const badge = document.createElement('span');
        badge.className = `na-scene-inspector__badge na-scene-inspector__badge--${record.family}`;
        badge.textContent = record.type;
        row.appendChild(badge);

        // NODE NAME
        const name = document.createElement('span');
        name.className = 'na-scene-inspector__name';
        name.textContent = record.name;
        name.title = record.name;                                              // <-- Full name on hover for truncated text
        row.appendChild(name);

        // MESH STATS (triangles / vertices)
        if (record.meshStats) {
            const count = document.createElement('span');
            count.className = 'na-scene-inspector__count';
            count.textContent = `${Na__SceneInspector__FormatNumber(record.meshStats.triCount)}t`;
            count.title = `${Na__SceneInspector__FormatNumber(record.meshStats.triCount)} triangles, ${Na__SceneInspector__FormatNumber(record.meshStats.vertexCount)} vertices`;
            row.appendChild(count);
        } else if (record.children.length > 0) {
            // CHILD COUNT BADGE (shown when no mesh stats)
            const count = document.createElement('span');
            count.className = 'na-scene-inspector__count';
            count.textContent = `${record.children.length}`;
            count.title = `${record.children.length} direct children`;
            row.appendChild(count);
        }

        return row;                                                            // <-- Return constructed row element
    }
    // ------------------------------------------------------------


    // FUNCTION | Recursively Build DOM Tree from Record
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildDomTree(record, depth, defaultExpandDepth) {
        const wrapper = document.createElement('div');
        wrapper.className = 'na-scene-inspector__node';

        const rowEl = Na__SceneInspector__BuildNodeRowEl(record, depth);       // <-- Build this node's row
        wrapper.appendChild(rowEl);

        if (record.children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'na-scene-inspector__children';

            // COLLAPSE BY DEFAULT BEYOND EXPAND DEPTH
            if (depth >= defaultExpandDepth) {
                childContainer.style.display = 'none';                        // <-- Collapsed beyond default depth
                const toggleEl = rowEl.querySelector('.na-scene-inspector__toggle');
                if (toggleEl) toggleEl.textContent = '▸';                     // <-- Show collapsed arrow
            }

            for (const child of record.children) {
                childContainer.appendChild(
                    Na__SceneInspector__BuildDomTree(child, depth + 1, defaultExpandDepth) // <-- Recurse
                );
            }

            wrapper.appendChild(childContainer);

            // CLICK HANDLER | Toggle child visibility
            rowEl.style.cursor = 'pointer';
            rowEl.addEventListener('click', () => {
                const isHidden = childContainer.style.display === 'none';
                childContainer.style.display = isHidden ? '' : 'none';        // <-- Toggle visibility

                const toggleEl = rowEl.querySelector('.na-scene-inspector__toggle');
                if (toggleEl) toggleEl.textContent = isHidden ? '▾' : '▸';   // <-- Sync arrow direction
            });
        }

        return wrapper;                                                        // <-- Return complete node element
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Full Tree into DOM Container
    // ------------------------------------------------------------
    function Na__SceneInspector__RenderTree(treeEl, tree) {
        if (!treeEl) return;
        treeEl.innerHTML = '';                                                 // <-- Clear previous scan results

        const domTree = Na__SceneInspector__BuildDomTree(
            tree,
            0,
            Na__SceneInspector__DefaultExpandDepth                             // <-- Apply default expand depth
        );
        treeEl.appendChild(domTree);                                           // <-- Mount rendered tree
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Toggle
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wire Panel Open/Close Toggle
    // ------------------------------------------------------------
    function Na__SceneInspector__InitPanelToggle() {
        const toggleBtn = document.getElementById(Na__SceneInspector__ToggleId);
        const panel     = document.getElementById(Na__SceneInspector__PanelId);
        if (!toggleBtn || !panel) return;

        toggleBtn.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);                       // <-- Toggle panel open state
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));         // <-- Sync accessibility state
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Scene Inspector Dev Tool
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeSceneInspector(scene) {
        Na__SceneInspector__InitPanelToggle();                                 // <-- Wire panel open/close

        const scanBtn  = document.getElementById(Na__SceneInspector__ScanBtnId);
        const statsEl  = document.getElementById(Na__SceneInspector__StatsId);
        const treeEl   = document.getElementById(Na__SceneInspector__TreeId);
        if (!scanBtn || !statsEl || !treeEl) return;                          // <-- Exit if markup is unavailable

        scanBtn.addEventListener('click', () => {
            if (!scene) {
                statsEl.textContent = 'Scene not available.';                 // <-- Guard if scene ref is missing
                return;
            }

            scanBtn.textContent  = 'Scanning...';
            scanBtn.disabled     = true;                                       // <-- Prevent double-click during scan

            const { stats, tree } = Na__SceneInspector__ScanScene(scene);    // <-- Traverse scene graph

            Na__SceneInspector__RenderStats(statsEl, stats);                  // <-- Update summary header
            Na__SceneInspector__RenderTree(treeEl, tree);                     // <-- Render collapsible node tree

            scanBtn.textContent = 'Rescan';
            scanBtn.disabled    = false;                                       // <-- Re-enable button
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Inspector API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeSceneInspector
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
