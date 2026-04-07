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
// - Each node row has an interactive visibility dot that toggles the Three.js
//   node.visible property live and invalidates the render loop.
// - Hide All and Restore All bulk controls allow quickly isolating or
//   restoring the scene to its scanned state for per-object testing.
// - A filter input narrows the displayed tree to nodes matching the typed
//   name fragment, showing ancestor groups automatically.
// - Isolate Pair mode: when active, toggling any node's dot also toggles the
//   paired sibling model (mesh <-> linework) under the same ValeVision
//   category group, enabling fast per-pair isolation testing.
// - Works on-demand because Na__AppFlow__StartLoadingSequence is not awaited,
//   so models may not be present at script boot time.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Mar-2026 - Version 1.2.0 — see ValeVision__DEVLOG__.md v2.0.3 and v2.0.4
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM IDs
    // ------------------------------------------------------------
    const Na__SceneInspector__ToggleId        = 'naSceneInspectorToggle';             // <-- Panel open/close button
    const Na__SceneInspector__PanelId         = 'naSceneInspectorPanel';              // <-- Collapsible panel container
    const Na__SceneInspector__StatsId         = 'naSceneInspectorStats';              // <-- Summary stats line
    const Na__SceneInspector__TreeId          = 'naSceneInspectorTree';               // <-- Tree scroll container
    const Na__SceneInspector__ScanBtnId       = 'naSceneInspectorScanBtn';            // <-- Scan trigger button
    const Na__SceneInspector__FilterId        = 'naSceneInspectorFilter';             // <-- Name filter input
    const Na__SceneInspector__HideAllBtnId    = 'naSceneInspectorHideAll';            // <-- Hide all nodes button
    const Na__SceneInspector__RestoreAllBtnId = 'naSceneInspectorRestoreAll';         // <-- Restore all nodes button
    const Na__SceneInspector__IsolatePairBtnId    = 'naSceneInspectorIsolatePair';    // <-- Isolate Pair mode toggle
    const Na__SceneInspector__CopyTreeBtnId       = 'naSceneInspectorCopyTree';       // <-- Copy tree to clipboard button
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Asset Category Group Name Pattern
    // ------------------------------------------------------------
    const Na__SceneInspector__CategoryPattern = /^ValeVision__\w+__\w+/;        // <-- Matches ValeVision category group names (e.g. ValeVision__MainBuildingModel__Existing)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Expand Depth
    // ------------------------------------------------------------
    const Na__SceneInspector__DefaultExpandDepth = 3;                           // <-- Expand 3 levels by default (down to GLTF scene roots)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Type Badge Labels and Families
    // ------------------------------------------------------------
    const Na__SceneInspector__TypeFamilies = {
        Mesh               : 'mesh',                                            // <-- Mesh geometry nodes
        SkinnedMesh        : 'mesh',                                            // <-- Skinned mesh variant
        Scene              : 'group',                                           // <-- THREE.Scene root
        Group              : 'group',                                           // <-- THREE.Group containers
        Object3D           : 'group',                                           // <-- Generic Object3D
        DirectionalLight   : 'light',                                           // <-- Directional light
        AmbientLight       : 'light',                                           // <-- Ambient light
        PointLight         : 'light',                                           // <-- Point light
        SpotLight          : 'light',                                           // <-- Spot light
        HemisphereLight    : 'light',                                           // <-- Hemisphere light
        LineSegments       : 'line',                                            // <-- Standard line segments
        LineSegments2      : 'line',                                            // <-- Fat line segments (three/addons)
        Line               : 'line',                                            // <-- Generic THREE.Line
        PerspectiveCamera  : 'camera',                                          // <-- Perspective camera
        OrthographicCamera : 'camera',                                          // <-- Orthographic camera
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Node Registry and Visibility Snapshot
    // ------------------------------------------------------------
    let Na__SceneInspector__NodeRegistry       = [];                            // <-- Flat list: { uuid, nodeRef, dotEl, wrapperEl, name }
    let Na__SceneInspector__VisibilitySnapshot = {};                            // <-- uuid -> initial visible (bool) taken at scan time
    let Na__SceneInspector__IsolatePairActive  = false;                         // <-- Isolate Pair mode flag
    let Na__SceneInspector__LastScannedTree    = null;                          // <-- Record tree from most recent scan (for copy)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Traversal and Stats Collection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Classify Node Type Family
    // ------------------------------------------------------------
    function Na__SceneInspector__GetTypeFamily(node) {
        return Na__SceneInspector__TypeFamilies[node.type] || 'other';          // <-- Resolve family or fallback
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compute Mesh Triangle and Vertex Count
    // ------------------------------------------------------------
    function Na__SceneInspector__GetMeshStats(node) {
        if (!node.isMesh && !node.isSkinnedMesh) return null;                   // <-- Only applies to mesh nodes
        const geo = node.geometry;
        if (!geo) return null;

        const posAttr     = geo.attributes && geo.attributes.position;
        const vertexCount = posAttr ? posAttr.count : 0;                        // <-- Position attribute vertex count
        const triCount    = geo.index
            ? Math.floor(geo.index.count / 3)                                   // <-- Indexed geometry
            : Math.floor(vertexCount / 3);                                      // <-- Non-indexed geometry

        return { vertexCount, triCount };                                       // <-- Return stats object
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Single Node Data Record
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildNodeRecord(node) {
        const meshStats  = Na__SceneInspector__GetMeshStats(node);              // <-- Compute mesh stats (null for non-meshes)
        const hasProfile = !!(node.userData && node.userData.Na__ProfileLineColor); // <-- ValeVision profile colour flag

        return {
            uuid        : node.uuid,                                            // <-- Unique Three.js ID
            name        : node.name || '[unnamed]',                             // <-- Display name
            type        : node.type || 'Object3D',                              // <-- Three.js type string
            family      : Na__SceneInspector__GetTypeFamily(node),              // <-- Resolved CSS family
            visible     : node.visible,                                         // <-- Current visibility state
            childCount  : node.children ? node.children.length : 0,            // <-- Direct child count
            meshStats   : meshStats,                                            // <-- { vertexCount, triCount } or null
            hasProfile  : hasProfile,                                           // <-- Has ValeVision profile line colour data
            nodeRef     : node,                                                 // <-- Live Three.js object reference for toggling
            children    : []                                                    // <-- Populated by recursive walk
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recursively Walk Scene Children
    // ------------------------------------------------------------
    function Na__SceneInspector__WalkNode(node, stats) {
        const record = Na__SceneInspector__BuildNodeRecord(node);               // <-- Build data record for this node

        stats.totalNodes++;                                                     // <-- Count all nodes

        const family = record.family;
        if (family === 'mesh')  stats.totalMeshes++;                            // <-- Accumulate mesh count
        if (family === 'light') stats.totalLights++;                            // <-- Accumulate light count
        if (family === 'line')  stats.totalLines++;                             // <-- Accumulate line count
        if (record.meshStats) {
            stats.totalTriangles += record.meshStats.triCount;                  // <-- Accumulate triangle count
            stats.totalVertices  += record.meshStats.vertexCount;               // <-- Accumulate vertex count
        }

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                record.children.push(Na__SceneInspector__WalkNode(child, stats)); // <-- Recurse into children
            }
        }

        return record;                                                          // <-- Return populated record tree
    }
    // ------------------------------------------------------------


    // FUNCTION | Scan Scene - Builds Full Stats and Node Tree
    // ------------------------------------------------------------
    function Na__SceneInspector__ScanScene(scene) {
        const stats = {
            totalNodes     : 0,                                                 // <-- All Object3D descendants
            totalMeshes    : 0,                                                 // <-- Mesh/SkinnedMesh nodes
            totalTriangles : 0,                                                 // <-- Sum of triangle counts
            totalVertices  : 0,                                                 // <-- Sum of vertex counts
            totalLights    : 0,                                                 // <-- Light nodes
            totalLines     : 0                                                  // <-- Line segment nodes
        };

        const tree = Na__SceneInspector__WalkNode(scene, stats);               // <-- Walk from scene root

        return { stats, tree };                                                 // <-- Return data for rendering
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility State Management
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Snapshot Current Visibility from Registry
    // ------------------------------------------------------------
    function Na__SceneInspector__TakeVisibilitySnapshot() {
        Na__SceneInspector__VisibilitySnapshot = {};                            // <-- Reset snapshot
        for (const entry of Na__SceneInspector__NodeRegistry) {
            Na__SceneInspector__VisibilitySnapshot[entry.uuid] = entry.nodeRef.visible; // <-- Record current state
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Visibility Map to All Registered Nodes
    // ------------------------------------------------------------
    function Na__SceneInspector__ApplyVisibilityToAll(visibleMap) {
        for (const entry of Na__SceneInspector__NodeRegistry) {
            const vis        = visibleMap.hasOwnProperty(entry.uuid) ? visibleMap[entry.uuid] : false;
            entry.nodeRef.visible = vis;                                        // <-- Mutate Three.js visible flag
            entry.dotEl.className = `na-scene-inspector__dot na-scene-inspector__dot--${vis ? 'visible' : 'hidden'}`; // <-- Sync dot colour
        }
        Na__RenderLoop__RequestRender();                                        // <-- Invalidate render after bulk change
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find ValeVision Category Group Ancestor
    // ------------------------------------------------------------
    function Na__SceneInspector__FindCategoryGroup(nodeRef) {
        let current = nodeRef.parent;
        while (current) {
            if (current.name && Na__SceneInspector__CategoryPattern.test(current.name)) {
                return current;                                                 // <-- Found category group (e.g. ValeVision__MainBuildingModel__Existing)
            }
            current = current.parent;
        }
        return null;                                                            // <-- No category group found in ancestor chain
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Pair Siblings (Other Direct Children of Category Group)
    // ------------------------------------------------------------
    function Na__SceneInspector__GetPairSiblings(nodeRef, categoryGroup) {
        let branchRoot = nodeRef;
        while (branchRoot.parent && branchRoot.parent !== categoryGroup) {
            branchRoot = branchRoot.parent;                                     // <-- Walk up to direct child of category group
        }
        return categoryGroup.children.filter(child => child !== branchRoot);   // <-- All other direct children are pair siblings
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle Pair Siblings and Sync Their Dot Elements
    // ------------------------------------------------------------
    function Na__SceneInspector__TogglePairSiblings(nodeRef, newVisible) {
        const categoryGroup = Na__SceneInspector__FindCategoryGroup(nodeRef);  // <-- Locate ValeVision category group
        if (!categoryGroup) return;                                             // <-- No pair relationship if outside category group

        const siblings = Na__SceneInspector__GetPairSiblings(nodeRef, categoryGroup); // <-- Get mesh/linework counterparts

        for (const sibling of siblings) {
            sibling.visible = newVisible;                                       // <-- Sync sibling visibility to match clicked node

            const entry = Na__SceneInspector__NodeRegistry.find(r => r.uuid === sibling.uuid); // <-- Look up registry entry for dot sync
            if (entry) {
                entry.dotEl.className = `na-scene-inspector__dot na-scene-inspector__dot--${newVisible ? 'visible' : 'hidden'}`;
                entry.dotEl.title     = newVisible ? 'Click to hide' : 'Click to show'; // <-- Sync tooltip
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Tree Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format Number with Thousands Separator
    // ------------------------------------------------------------
    function Na__SceneInspector__FormatNumber(n) {
        return n.toLocaleString();                                              // <-- Readable large numbers
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
        ].join('');                                                             // <-- Build stats row
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Node Row Element
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildNodeRowEl(record) {
        const row = document.createElement('div');
        row.className = 'na-scene-inspector__row';

        // INDENT SPACER
        const indent = document.createElement('span');
        indent.className = 'na-scene-inspector__indent';
        row.appendChild(indent);

        // EXPAND TOGGLE (only when children exist)
        const toggle = document.createElement('span');
        toggle.className = 'na-scene-inspector__toggle';
        if (record.children.length > 0) {
            toggle.textContent = '▾';                                           // <-- Expanded state arrow
            toggle.setAttribute('aria-hidden', 'true');
        }
        row.appendChild(toggle);

        // VISIBILITY DOT (interactive - click to toggle scene visibility)
        const dot = document.createElement('span');
        dot.className = `na-scene-inspector__dot${record.visible ? ' na-scene-inspector__dot--visible' : ' na-scene-inspector__dot--hidden'}`;
        dot.title = record.visible ? 'Click to hide' : 'Click to show';

        dot.addEventListener('click', (e) => {
            e.stopPropagation();                                                // <-- Prevent row expand/collapse

            const newVisible        = !record.nodeRef.visible;
            record.nodeRef.visible  = newVisible;                              // <-- Mutate Three.js visible flag
            dot.className = `na-scene-inspector__dot na-scene-inspector__dot--${newVisible ? 'visible' : 'hidden'}`;
            dot.title     = newVisible ? 'Click to hide' : 'Click to show';   // <-- Update tooltip

            if (Na__SceneInspector__IsolatePairActive) {
                Na__SceneInspector__TogglePairSiblings(record.nodeRef, newVisible); // <-- Also toggle paired mesh/linework sibling
            }

            Na__RenderLoop__RequestRender();                                   // <-- Invalidate render
        });

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
        name.title = record.name;                                               // <-- Full name on hover for truncated text
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

        return { rowEl: row, dotEl: dot };                                      // <-- Return row and dot for registry
    }
    // ------------------------------------------------------------


    // FUNCTION | Recursively Build DOM Tree from Record
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildDomTree(record, depth, defaultExpandDepth) {
        const wrapper = document.createElement('div');
        wrapper.className = 'na-scene-inspector__node';
        wrapper.dataset.nodeName = record.name.toLowerCase();                   // <-- Stamp for filter matching

        const { rowEl, dotEl } = Na__SceneInspector__BuildNodeRowEl(record);   // <-- Build this node's row

        // INDENT ROW BY DEPTH
        const indentEl = rowEl.querySelector('.na-scene-inspector__indent');
        if (indentEl) indentEl.style.paddingLeft = `${depth * 12}px`;          // <-- Scale indent by depth

        wrapper.appendChild(rowEl);

        // REGISTER NODE FOR BULK VISIBILITY AND FILTER
        Na__SceneInspector__NodeRegistry.push({
            uuid      : record.uuid,                                            // <-- Three.js UUID
            nodeRef   : record.nodeRef,                                         // <-- Live scene object
            dotEl     : dotEl,                                                  // <-- DOM dot element
            wrapperEl : wrapper,                                                // <-- DOM wrapper element
            name      : record.name.toLowerCase()                               // <-- Lowercased name for filter
        });

        if (record.children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'na-scene-inspector__children';

            // COLLAPSE BY DEFAULT BEYOND EXPAND DEPTH
            if (depth >= defaultExpandDepth) {
                childContainer.style.display = 'none';                         // <-- Collapsed beyond default depth
                const toggleEl = rowEl.querySelector('.na-scene-inspector__toggle');
                if (toggleEl) toggleEl.textContent = '▸';                      // <-- Show collapsed arrow
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
                childContainer.style.display = isHidden ? '' : 'none';         // <-- Toggle visibility

                const toggleEl = rowEl.querySelector('.na-scene-inspector__toggle');
                if (toggleEl) toggleEl.textContent = isHidden ? '▾' : '▸';    // <-- Sync arrow direction
            });
        }

        return wrapper;                                                         // <-- Return complete node element
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Full Tree into DOM Container
    // ------------------------------------------------------------
    function Na__SceneInspector__RenderTree(treeEl, tree) {
        if (!treeEl) return;
        treeEl.innerHTML = '';                                                  // <-- Clear previous scan results

        Na__SceneInspector__NodeRegistry = [];                                  // <-- Reset registry before rebuild

        const domTree = Na__SceneInspector__BuildDomTree(
            tree,
            0,
            Na__SceneInspector__DefaultExpandDepth                              // <-- Apply default expand depth
        );
        treeEl.appendChild(domTree);                                            // <-- Mount rendered tree

        Na__SceneInspector__TakeVisibilitySnapshot();                           // <-- Snapshot visibility after tree is registered
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filter Logic
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Reveal All Ancestors of a Matched Node Wrapper
    // ------------------------------------------------------------
    function Na__SceneInspector__RevealAncestors(el) {
        let current = el.parentElement;
        while (current) {
            if (current.classList.contains('na-scene-inspector__node')) {
                current.style.display = '';                                     // <-- Show ancestor node wrapper
            }
            if (current.classList.contains('na-scene-inspector__children')) {
                current.style.display = '';                                     // <-- Expand ancestor children container
            }
            current = current.parentElement;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Filter to Node Registry
    // ------------------------------------------------------------
    function Na__SceneInspector__ApplyFilter(query) {
        const term = query.trim().toLowerCase();

        if (!term) {
            // CLEAR FILTER - restore all wrappers to default visibility
            for (const entry of Na__SceneInspector__NodeRegistry) {
                entry.wrapperEl.style.display = '';                             // <-- Show all nodes
            }
            return;
        }

        // HIDE ALL first, then reveal matches and their ancestors
        for (const entry of Na__SceneInspector__NodeRegistry) {
            entry.wrapperEl.style.display = 'none';                            // <-- Hide all by default
        }

        for (const entry of Na__SceneInspector__NodeRegistry) {
            if (entry.name.includes(term)) {
                entry.wrapperEl.style.display = '';                             // <-- Show matching node
                Na__SceneInspector__RevealAncestors(entry.wrapperEl);           // <-- Show its ancestors
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Copy Tree to Clipboard
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Concise Text Line for a Single Node (name only)
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildNodeTextLineConcise(record, depth) {
        const indent = '    '.repeat(Math.max(0, depth - 1));                  // <-- Offset by 1 so Scene children start flush; 4-space increment
        return `${indent}${record.type} ${record.name}`;                       // <-- Type and name only, no stats
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Full Text Line for a Single Node (stats + visibility)
    // ------------------------------------------------------------
    function Na__SceneInspector__BuildNodeTextLineFull(record, depth) {
        const indent      = '  '.repeat(depth);                                 // <-- Two-space indent per depth level
        const visibleStr  = `Visible = ${record.visible ? 'True' : 'False'}`;  // <-- Capitalised boolean state
        const triSegment  = record.meshStats
            ? `  |  ${Na__SceneInspector__FormatNumber(record.meshStats.triCount)} triangles`
            : '';                                                                // <-- Triangle count segment for mesh nodes only
        return `${indent}${record.type} ${record.name}${triSegment}  |  ${visibleStr}`; // <-- Pipe-separated fields
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Recursively Build Plain-Text Tree Lines with Provided Line Builder
    // ------------------------------------------------------------
    function Na__SceneInspector__WalkTreeToText(record, depth, lines, lineBuilder) {
        lines.push(lineBuilder(record, depth));                                 // <-- Append this node's line via builder
        for (const child of record.children) {
            Na__SceneInspector__WalkTreeToText(child, depth + 1, lines, lineBuilder); // <-- Recurse into children
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Copy Scene Tree to Clipboard
    // ------------------------------------------------------------
    function Na__SceneInspector__CopyTreeToClipboard(copyBtn) {
        if (!Na__SceneInspector__LastScannedTree) {
            copyBtn.textContent = 'No scan yet';                                // <-- Guard: nothing to copy before first scan
            setTimeout(() => { copyBtn.textContent = 'Copy Tree'; }, 1500);    // <-- Restore label after delay
            return;
        }

        const divider = '=======================================';               // <-- Section divider line

        // BUILD CONCISE REPORT (names only, 8-space indent)
        const conciseLines = [];
        Na__SceneInspector__WalkTreeToText(
            Na__SceneInspector__LastScannedTree, 0, conciseLines,
            Na__SceneInspector__BuildNodeTextLineConcise                        // <-- Name-only line builder
        );

        // BUILD FULL REPORT (stats + visibility, 2-space indent)
        const fullLines = [];
        Na__SceneInspector__WalkTreeToText(
            Na__SceneInspector__LastScannedTree, 0, fullLines,
            Na__SceneInspector__BuildNodeTextLineFull                           // <-- Stats + visibility line builder
        );

        const text = [
            '1. CONCISE REPORT',
            divider,
            conciseLines.join('\n'),
            divider,
            '',
            '2. FULL REPORT WITH STATES & STATISTICS',
            divider,
            fullLines.join('\n'),
            divider,
            'END'
        ].join('\n');                                                            // <-- Combine both reports into single output

        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Copied!';                                    // <-- Visual confirmation on success
            setTimeout(() => { copyBtn.textContent = 'Copy Tree'; }, 1500);    // <-- Restore label after delay
        }).catch(() => {
            copyBtn.textContent = 'Failed';                                     // <-- Indicate clipboard access failure
            setTimeout(() => { copyBtn.textContent = 'Copy Tree'; }, 1500);    // <-- Restore label after delay
        });
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
            panel.classList.toggle('is-open', !isOpen);                        // <-- Toggle panel open state
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));          // <-- Sync accessibility state
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
        Na__SceneInspector__InitPanelToggle();                                  // <-- Wire panel open/close

        const scanBtn         = document.getElementById(Na__SceneInspector__ScanBtnId);
        const statsEl         = document.getElementById(Na__SceneInspector__StatsId);
        const treeEl          = document.getElementById(Na__SceneInspector__TreeId);
        const filterEl        = document.getElementById(Na__SceneInspector__FilterId);
        const hideAllBtn      = document.getElementById(Na__SceneInspector__HideAllBtnId);
        const restoreAllBtn   = document.getElementById(Na__SceneInspector__RestoreAllBtnId);
        const isolatePairBtn  = document.getElementById(Na__SceneInspector__IsolatePairBtnId);
        const copyTreeBtn     = document.getElementById(Na__SceneInspector__CopyTreeBtnId);

        if (!scanBtn || !statsEl || !treeEl) return;                           // <-- Exit if markup is unavailable

        // SCAN BUTTON - traverse scene and render tree
        scanBtn.addEventListener('click', () => {
            if (!scene) {
                statsEl.textContent = 'Scene not available.';                  // <-- Guard if scene ref is missing
                return;
            }

            scanBtn.textContent = 'Scanning...';
            scanBtn.disabled    = true;                                         // <-- Prevent double-click during scan

            const { stats, tree } = Na__SceneInspector__ScanScene(scene);     // <-- Traverse scene graph

            Na__SceneInspector__RenderStats(statsEl, stats);                   // <-- Update summary header
            Na__SceneInspector__RenderTree(treeEl, tree);                      // <-- Render collapsible node tree + snapshot
            Na__SceneInspector__LastScannedTree = tree;                        // <-- Cache tree for copy feature

            if (filterEl) filterEl.value = '';                                 // <-- Clear stale filter after rescan

            scanBtn.textContent = 'Rescan';
            scanBtn.disabled    = false;                                        // <-- Re-enable button
        });

        // FILTER INPUT - narrow displayed tree by node name
        if (filterEl) {
            filterEl.addEventListener('input', () => {
                Na__SceneInspector__ApplyFilter(filterEl.value);               // <-- Apply name filter on each keystroke
            });
        }

        // HIDE ALL - set every registered node to invisible
        if (hideAllBtn) {
            hideAllBtn.addEventListener('click', () => {
                Na__SceneInspector__ApplyVisibilityToAll({});                  // <-- Empty map resolves all to false
            });
        }

        // RESTORE ALL - reinstate visibility snapshot taken at last scan
        if (restoreAllBtn) {
            restoreAllBtn.addEventListener('click', () => {
                Na__SceneInspector__ApplyVisibilityToAll(Na__SceneInspector__VisibilitySnapshot); // <-- Restore to scan-time state
            });
        }

        // ISOLATE PAIR - toggle paired mesh/linework mode on dot clicks
        if (isolatePairBtn) {
            isolatePairBtn.addEventListener('click', () => {
                Na__SceneInspector__IsolatePairActive = !Na__SceneInspector__IsolatePairActive; // <-- Flip mode flag

                isolatePairBtn.classList.toggle('na-scene-inspector__toolbar-btn--active', Na__SceneInspector__IsolatePairActive); // <-- Apply active style
                isolatePairBtn.setAttribute('aria-pressed', String(Na__SceneInspector__IsolatePairActive)); // <-- Sync accessibility state
            });
        }

        // COPY TREE - serialize last scanned tree to plain text and write to clipboard
        if (copyTreeBtn) {
            copyTreeBtn.addEventListener('click', () => {
                Na__SceneInspector__CopyTreeToClipboard(copyTreeBtn);           // <-- Trigger clipboard copy with feedback
            });
        }
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
