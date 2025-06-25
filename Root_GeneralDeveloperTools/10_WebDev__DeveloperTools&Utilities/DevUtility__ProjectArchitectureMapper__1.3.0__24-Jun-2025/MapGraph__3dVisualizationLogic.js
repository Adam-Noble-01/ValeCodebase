// =============================================================================
// VALEDESIGNSUITE - 3D NEURAL NETWORK VISUALIZATION ENGINE
// =============================================================================
//
// FILE       : MapGraph__3dVisualizationLogic.js
// NAMESPACE  : Architecture3D
// MODULE     : NeuralNetwork3DVisualizationEngine
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Three.js 3D visualization engine for project file architecture
// CREATED    : 2025
//
// DESCRIPTION
// - Renders project structure as an interactive 3D neural network using Three.js
// - Nodes represent files/folders with visual hierarchy (size, color, shape)
// - Edges show dependencies with styled connections (imports, requires, hierarchy)
// - Real-time force-directed physics for organic node positioning
// - Full 3D navigation with orbit controls (rotate, zoom, pan)
// - Interactive hover and selection with information display
// - Optimized rendering for large codebases with thousands of nodes
// - Listens for 'graphDataLoaded' event to initialize visualization
//
// -----------------------------------------------------------------------------
//
// DESIGN CONCEPT BREAKDOWN
//  - Root Folder - Acts as the Sun, Central Point of the Solar System, this anchors the entire system around a central point.
//  - Folders & Files Directly in the root directory - Orbit around the Sun
//  - Folders & Files in Sub-Folders - Branch out from each child folder
//  - So items as they nest are like planets and moons in their own orbits
//  - This ensures a clear and intuitive visual hierarchy with a definite centre point.
//  - This makes it easy to work out in each direction from the sun (root folder) to locate the items you are looking for.
//
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Three.js 3D Visualization Core System
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | 3D Visualization Configuration
    // ------------------------------------------------------------
    const SCENE_CONFIG = {
        BACKGROUND_COLOR       : 0x0a0a1a,                     // <-- Dark neural background
        FOG_COLOR              : 0x0a0a1a,                     // <-- Matching fog color
        FOG_NEAR               : 1,                            // <-- Fog start distance
        FOG_FAR                : 1000,                         // <-- Fog end distance
        CAMERA_FOV             : 75,                           // <-- Field of view
        CAMERA_NEAR            : 0.01,                         // <-- Near clipping plane (reduced to prevent line culling)
        CAMERA_FAR             : 20000,                        // <-- Far clipping plane
        INITIAL_CAMERA_POS     : { x: 200, y: 200, z: 200 }    // <-- Initial camera position
    };

    // NODE CONFIG |  Node Size Configuration
    // ------------------------------------------
    const NODE_CONFIG = {
        BASE_SIZE              : 4,                             // <-- Base node size
        SIZE_MULTIPLIER        : {                              // <-- Size multipliers by type
            root_folder        : 4.00,                          // <-- Root Folder - Acts as the Sun, Central Point of the Solar System
            folder             : 2.50,                          // <-- Folders are larger
            html               : 1.25,                          // <-- HTML files medium
            javascript         : 1.25,                          // <-- JavaScript slightly larger
            js                 : 1.25,                          // <-- JavaScript (legacy support)
            css                : 1.25,                          // <-- CSS normal
            json               : 1.25,                          // <-- JSON standard
            sketchup           : 1.50,                          // <-- SketchUp files
            layout             : 1.50,                          // <-- Layout files
            cad                : 1.25,                          // <-- CAD files
            blender            : 1.50,                          // <-- Blender files
            photoshop          : 1.50,                          // <-- Photoshop files
            pdf                : 1.25,                          // <-- PDF files
            other              : 1.00                           // <-- Others smaller
        },

        // NODE CONFIG |  Node Colour Configuration
        // ------------------------------------------
        COLORS                 : {                             // <-- Node colors by type
            root_folder        : 0x7f0019,                     // <-- Red for root folder
            folder             : 0xff55cc,                     // <-- Pink for folders
            html               : 0x00d4ff,                     // <-- Cyan for HTML
            javascript         : 0xffaa00,                     // <-- Orange for JavaScript
            js                 : 0xffaa00,                     // <-- Orange for JavaScript (legacy support)
            css                : 0x00ff88,                     // <-- Green for CSS
            json               : 0x55ddff,                     // <-- Light blue for JSON
            image              : 0xffcc55,                     // <-- Yellow for images
            model              : 0xff8855,                     // <-- Orange-red for 3D models
            font               : 0xcc88ff,                     // <-- Purple for fonts
            hdri               : 0x88ffcc,                     // <-- Turquoise for HDRI
            markdown           : 0xcccccc,                     // <-- Gray for markdown
            audio              : 0xffaa88,                     // <-- Peach for audio
            video              : 0x88aaff,                     // <-- Blue for video
            sketchup           : 0xff6600,                     // <-- Red-orange for SketchUp
            layout             : 0xff7722,                     // <-- Orange-red for Layout
            cad                : 0x0088ff,                     // <-- Blue for CAD files
            blender            : 0xff4400,                     // <-- Bright orange for Blender
            photoshop          : 0x0066ff,                     // <-- Blue for Photoshop
            pdf                : 0xff0044,                     // <-- Red for PDF
            other              : 0xaa66ff                      // <-- Purple for others
        }
    };

    // NODE CONFIG |  Connection Configuration
    // ------------------------------------------
    const CONNECTION_CONFIG = {
        DEFAULT_COLOR          : 0x00ffaa,                                        // <-- Default connection color
        DEFAULT_OPACITY        : 0.3,                                             // <-- Default connection opacity
        DEFAULT_WIDTH          : 1,                                               // <-- Default line width
        TYPES                  : {                                                // <-- Connection type configurations
            import             : { color: 0xffaa00, width: 2, opacity: 0.6 },     // <-- JavaScript imports
            require            : { color: 0xff8800, width: 2, opacity: 0.6 },     // <-- Node.js requires
            stylesheet         : { color: 0x00ff88, width: 2, opacity: 0.5 },     // <-- CSS links
            script             : { color: 0x00d4ff, width: 2, opacity: 0.5 },     // <-- Script tags
            hierarchy          : { color: 0xff55cc, width: 3, opacity: 0.4 },     // <-- Folder hierarchy
            contains           : { color: 0x8855ff, width: 1, opacity: 0.2 },     // <-- Folder contains file
            asset              : { color: 0xffcc55, width: 1, opacity: 0.3 }      // <-- Asset references
        }
    };

    // CLASS | 3D Neural Network Architecture Visualization
    // ------------------------------------------------------------
    class Architecture3DNeuralNetwork {
        constructor(container, graphData) {
            this.container = container;               // <-- DOM container element
            this.graphData = graphData;               // <-- Graph nodes and edges data
            this.scene = null;                        // <-- Three.js scene
            this.camera = null;                       // <-- Three.js camera
            this.renderer = null;                     // <-- Three.js renderer
            this.controls = null;                     // <-- Orbit controls
            this.raycaster = new THREE.Raycaster();   // <-- For mouse interaction
            this.mouse = new THREE.Vector2();         // <-- Mouse position
            this.nodes = new Map();                   // <-- Node mesh map
            this.connections = new Map();             // <-- Connection line map
            this.selectedNode = null;                 // <-- Currently selected node
            this.hoveredNode = null;                  // <-- Currently hovered node
            this.nodePositions = new Map();           // <-- Node 3D positions
            this.animationId = null;                  // <-- Animation frame ID
            this.physicsEngine = null;                // <-- Physics engine instance
            
            // Store bound function references for proper event listener cleanup
            this.handleMouseMoveBound = this.handleMouseMove.bind(this);       // <-- Bound mouse move handler
            this.handleMouseClickBound = this.handleMouseClick.bind(this);     // <-- Bound mouse click handler
            this.handleKeyPressBound = this.handleKeyPress.bind(this);         // <-- Bound key press handler
            this.handleResizeBound = this.handleResize.bind(this);             // <-- Bound resize handler
            this.controlsToggleBound = null;                                    // <-- Bound controls toggle handler
            this.controlsHeaderBound = null;                                    // <-- Bound controls header handler
            
            this.init();                              // Initialize visualization
        }

        // SUB FUNCTION | Initialize Three.js Scene and Components
        // ---------------------------------------------------------------
        init() {
            this.setupScene();                        // <-- Create scene
            this.createStarfield();                   // <-- Add starfield
            this.setupCamera();                       // <-- Setup camera
            this.setupRenderer();                     // <-- Create renderer
            this.setupControls();                     // <-- Add orbit controls
            this.setupLighting();                     // <-- Add lights
            this.setupEventListeners();               // <-- Mouse/keyboard events
            this.initializePhysics();                 // <-- Initialize physics engine
            this.createVisualization();               // <-- Build 3D graph
            this.startAnimation();                    // <-- Start render loop
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Initialize Physics Engine
        // ---------------------------------------------------------------
        initializePhysics() {
            // Create physics engine instance
            this.physicsEngine = new PhysicsEngine3D();                         // <-- Create physics engine
            
            // Initialize with graph data
            this.physicsEngine.initialize(this.graphData);                      // <-- Pass graph data to physics
            
            // Get hierarchy data for visualization
            const hierarchyData = this.physicsEngine.getNodeHierarchy();        // <-- Get computed hierarchy
            this.nodeHierarchy = hierarchyData.hierarchy;                       // <-- Store hierarchy map
            this.nodeParents = hierarchyData.parents;                           // <-- Store parents map
            this.nodeDepths = hierarchyData.depths;                             // <-- Store depths map
            this.rootNodes = hierarchyData.roots;                               // <-- Store root nodes
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Setup Three.js Scene with Fog
        // ---------------------------------------------------------------
        setupScene() {
            this.scene = new THREE.Scene();                                          // <-- Create new scene
            this.scene.background = new THREE.Color(SCENE_CONFIG.BACKGROUND_COLOR);  // <-- Set background
            // Fog removed for clearer space view
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Create Starfield Background
        // ---------------------------------------------------------------
        createStarfield() {
            const starsGeometry = new THREE.BufferGeometry();           // <-- Create geometry
            const starCount = 2000;                                     // <-- Number of stars
            const positions = new Float32Array(starCount * 3);          // <-- Position array
            const colors = new Float32Array(starCount * 3);             // <-- Color array
            
            for (let i = 0; i < starCount; i++) {                       // <-- For each star
                const i3 = i * 3;                                       // <-- Index multiplier
                
                // Random position in sphere
                const radius = 500 + Math.random() * 1500;              // <-- Distance from center
                const theta = Math.random() * Math.PI * 2;              // <-- Horizontal angle
                const phi = Math.acos((Math.random() * 2) - 1);        // <-- Vertical angle
                
                positions[i3] = radius * Math.sin(phi) * Math.cos(theta); // <-- X position
                positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta); // <-- Y position
                positions[i3 + 2] = radius * Math.cos(phi);            // <-- Z position
                
                // Slight color variation
                const brightness = 0.5 + Math.random() * 0.5;          // <-- Star brightness
                colors[i3] = brightness;                                // <-- R
                colors[i3 + 1] = brightness * (0.8 + Math.random() * 0.2); // <-- G (slight variation)
                colors[i3 + 2] = brightness * (0.9 + Math.random() * 0.1); // <-- B (slight variation)
            }
            
            starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); // <-- Set positions
            starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // <-- Set colors
            
            const starsMaterial = new THREE.PointsMaterial({            // <-- Star material
                size: 1.5,                                               // <-- Star size
                vertexColors: true,                                      // <-- Use vertex colors
                transparent: true,                                       // <-- Enable transparency
                opacity: 0.6,                                           // <-- Subtle opacity
                blending: THREE.AdditiveBlending                        // <-- Additive blending for glow
            });
            
            const stars = new THREE.Points(starsGeometry, starsMaterial); // <-- Create stars
            this.scene.add(stars);                                       // <-- Add to scene
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Setup Perspective Camera
        // ---------------------------------------------------------------
        setupCamera() {
            const aspect = this.container.clientWidth / this.container.clientHeight; // <-- Calculate aspect ratio
            this.camera = new THREE.PerspectiveCamera(                 // <-- Create perspective camera
                SCENE_CONFIG.CAMERA_FOV,
                aspect,
                SCENE_CONFIG.CAMERA_NEAR,
                SCENE_CONFIG.CAMERA_FAR
            );
            // Adjust camera position to look down at the horizontal plane
            this.camera.position.set(                                   // <-- Set initial position
                SCENE_CONFIG.INITIAL_CAMERA_POS.x,
                300,                                                     // <-- Higher Y to look down
                SCENE_CONFIG.INITIAL_CAMERA_POS.z
            );
            this.camera.lookAt(0, 0, 0);                               // <-- Look at center
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Setup WebGL Renderer
        // ---------------------------------------------------------------
        setupRenderer() {
            this.renderer = new THREE.WebGLRenderer({                   // <-- Create WebGL renderer
                antialias: true,                                        // <-- Enable antialiasing
                alpha: true                                             // <-- Enable transparency
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight); // <-- Set size
            this.renderer.setPixelRatio(window.devicePixelRatio);      // <-- Set pixel ratio
            this.container.appendChild(this.renderer.domElement);       // <-- Add to DOM
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Setup Orbit Controls for 3D Navigation
        // ---------------------------------------------------------------
        setupControls() {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement); // <-- Create orbit controls
            this.controls.enableDamping = true;                         // <-- Smooth motion
            this.controls.dampingFactor = 0.05;                         // <-- Damping strength
            this.controls.rotateSpeed = 0.5;                            // <-- Rotation speed
            this.controls.zoomSpeed = 1.2;                              // <-- Zoom speed
            this.controls.panSpeed = 0.8;                               // <-- Pan speed
            this.controls.minDistance = 10;                             // <-- Minimum zoom
            this.controls.maxDistance = 2000;                           // <-- Maximum zoom
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Setup Scene Lighting
        // ---------------------------------------------------------------
        setupLighting() {
            // Ambient light for base illumination
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // <-- Soft white ambient
            this.scene.add(ambientLight);                               // <-- Add to scene

            // Directional light for shadows and depth
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // <-- Main light
            directionalLight.position.set(100, 100, 50);                // <-- Position above
            this.scene.add(directionalLight);                           // <-- Add to scene

            // Point lights for node glow effects
            const pointLight1 = new THREE.PointLight(0x00ffaa, 0.5, 500); // <-- Cyan glow
            pointLight1.position.set(0, 100, 0);                        // <-- Center top
            this.scene.add(pointLight1);                                // <-- Add to scene

            const pointLight2 = new THREE.PointLight(0xff6b6b, 0.3, 300); // <-- Red accent
            pointLight2.position.set(-100, 0, 100);                     // <-- Side position
            this.scene.add(pointLight2);                                // <-- Add to scene
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Centralized Root Folder Detection
        // ---------------------------------------------------------------
        isRootFolder(node) {
            // Use physics engine to check if node is root
            return this.physicsEngine && this.physicsEngine.isRootNode(node.id); // <-- Delegate to physics engine
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Create 3D Node Mesh
        // ---------------------------------------------------------------
        createNodeMesh(node) {
            const nodeType = node.type || 'other';                      // <-- Get node type
            const isFolder = node.isFolder || false;                    // <-- Check if folder
            
            // Determine if this is the root folder (gravitational center)
            const isRootFolder = this.isRootFolder(node);               // <-- Use centralized detection
            const effectiveType = isRootFolder ? 'root_folder' : nodeType; // <-- Override type for root
            
            // Calculate node size based on type and connections
            const baseSize = NODE_CONFIG.BASE_SIZE;                     // <-- Base size
            const typeMultiplier = NODE_CONFIG.SIZE_MULTIPLIER[effectiveType] || 1; // <-- Type multiplier
            const connectionCount = this.graphData.edges.filter(        // <-- Count connections
                e => e.source === node.id || e.target === node.id
            ).length;
            const connectionMultiplier = 1 + (connectionCount * 0.05);  // <-- Connection size bonus
            const finalSize = baseSize * typeMultiplier * connectionMultiplier; // <-- Final size
            
            // Create geometry - ROOT FOLDER GETS DIAMOND SHAPE (THE SUN)
            let geometry;
            if (isRootFolder) {
                geometry = new THREE.OctahedronGeometry(finalSize, 0);  // <-- Diamond shape for gravitational center
                console.log('🌟 ROOT FOLDER (SUN):', node.id, node.label, 'size:', finalSize);
            } else if (isFolder) {
                geometry = new THREE.BoxGeometry(finalSize * 1.2, finalSize * 1.2, finalSize * 1.2); // <-- Regular folder boxes
            } else {
                geometry = new THREE.SphereGeometry(finalSize, 16, 16);  // <-- File spheres
            }
            
            // Create material with ENHANCED properties for root folder (the sun)
            const color = NODE_CONFIG.COLORS[effectiveType] || NODE_CONFIG.COLORS.other; // <-- Get color
            const material = new THREE.MeshPhongMaterial({              // <-- Enhanced material
                color: color,                                            // <-- Base color
                emissive: color,                                         // <-- Glow color
                emissiveIntensity: isRootFolder ? 0.8 : 0.3,            // <-- Intense glow for root (like sun)
                shininess: isRootFolder ? 300 : 100,                    // <-- Maximum shininess for root
                specular: 0xffffff,                                     // <-- White specular highlights
                transparent: false,                                     // <-- Solid
                opacity: 1.0                                            // <-- Full opacity
            });
            
            // Create mesh with root folder flag
            const mesh = new THREE.Mesh(geometry, material);            // <-- Create mesh
            mesh.userData = { 
                node: node, 
                originalColor: color,
                isRootFolder: isRootFolder,                             // <-- Critical flag for physics
                nodeType: effectiveType                                 // <-- Store effective type
            };
            
            // Enhanced label for root folder
            this.createNodeLabel(mesh, node.label, isRootFolder);       // <-- Add label
            
            // Special animation setup for root folder (sun pulsing)
            if (isRootFolder) {
                mesh.userData.originalScale = { x: 1, y: 1, z: 1 };     // <-- Store original scale
                mesh.userData.pulsePhase = Math.random() * Math.PI * 2; // <-- Random pulse phase
                mesh.userData.isSun = true;                             // <-- Mark as sun for animation
            }
            
            return mesh;                                                 // <-- Return mesh
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Create Node Text Label
        // ---------------------------------------------------------------
        createNodeLabel(mesh, text, isRootFolder = false) {
            // Create canvas for text
            const canvas = document.createElement('canvas');             // <-- Create canvas
            const context = canvas.getContext('2d');                     // <-- Get 2D context
            canvas.width = 512;                                          // <-- Canvas width
            canvas.height = isRootFolder ? 96 : 64;                     // <-- Taller canvas for root
            
            // Draw text with enhanced styling for root
            context.fillStyle = isRootFolder ? '#ffff00' : 'white';     // <-- Yellow text for root
            context.font = isRootFolder ? 'bold 32px Open Sans' : '24px Open Sans'; // <-- Larger font for root
            context.textAlign = 'center';                                // <-- Center align
            context.textBaseline = 'middle';                             // <-- Middle baseline
            
            const displayText = text.split('/').pop();                  // <-- Get filename only
            const centerY = canvas.height / 2;                          // <-- Center Y position
            
            // Add outline for root folder text
            if (isRootFolder) {
                context.strokeStyle = '#000000';                        // <-- Black outline
                context.lineWidth = 3;                                   // <-- Thick outline
                context.strokeText(displayText, 256, centerY);          // <-- Draw outline
            }
            
            context.fillText(displayText, 256, centerY);                // <-- Draw main text
            
            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);             // <-- Create texture
            const spriteMaterial = new THREE.SpriteMaterial({            // <-- Sprite material
                map: texture,                                            // <-- Use texture
                transparent: true,                                       // <-- Enable transparency
                opacity: isRootFolder ? 1.0 : 0.8                      // <-- Full opacity for root
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);             // <-- Create sprite
            const scale = isRootFolder ? 60 : 40;                       // <-- Larger label for root
            sprite.scale.set(scale, scale * 0.125, 1);                  // <-- Scale sprite
            sprite.position.y = isRootFolder ? 25 : 15;                 // <-- Position above node
            
            mesh.add(sprite);                                            // <-- Add to mesh
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Create Connection Line Between Nodes
        // ---------------------------------------------------------------
        createConnectionLine(edge, sourcePos, targetPos) {
            // Calculate distance between nodes to determine if connection should be shown
            const distance = sourcePos.distanceTo(targetPos);           // <-- Calculate 3D distance
            const MAX_CONNECTION_DISTANCE = 400;                        // <-- Maximum distance for connections
            const FADE_START_DISTANCE = 200;                           // <-- Distance where fade begins
            
            // Skip extremely long connections to reduce visual clutter
            if (distance > MAX_CONNECTION_DISTANCE) {                   // <-- Skip very long connections
                return null;                                             // <-- Return null to skip this connection
            }
            
            // Determine connection type and styling
            let connectionType = 'default';                              // <-- Default type
            if (edge.type) {                                             // <-- Check edge type
                connectionType = edge.type;                              // <-- Use edge type
            }
            
            const config = CONNECTION_CONFIG.TYPES[connectionType] ||    // <-- Get config
                          { color: CONNECTION_CONFIG.DEFAULT_COLOR, 
                            width: CONNECTION_CONFIG.DEFAULT_WIDTH,
                            opacity: CONNECTION_CONFIG.DEFAULT_OPACITY };
            
            // Calculate distance-based opacity (fade long connections)
            let adjustedOpacity = config.opacity;                       // <-- Start with base opacity
            if (distance > FADE_START_DISTANCE) {                       // <-- If connection is long
                const fadeRatio = 1 - ((distance - FADE_START_DISTANCE) / (MAX_CONNECTION_DISTANCE - FADE_START_DISTANCE));
                adjustedOpacity = config.opacity * Math.max(0.1, fadeRatio); // <-- Fade opacity based on distance
            }
            
            // Create simpler straight line for distant connections, curved for close ones
            let geometry;
            if (distance > FADE_START_DISTANCE) {                       // <-- Use straight lines for long connections
                const points = [sourcePos, targetPos];                  // <-- Simple straight line
                geometry = new THREE.BufferGeometry().setFromPoints(points);
            } else {                                                     // <-- Use curved lines for close connections
                const curve = new THREE.QuadraticBezierCurve3(          // <-- Bezier curve
                    sourcePos,                                           // <-- Start point
                    new THREE.Vector3(                                   // <-- Control point
                        (sourcePos.x + targetPos.x) / 2,
                        (sourcePos.y + targetPos.y) / 2 + 15,            // <-- Reduced curve height
                        (sourcePos.z + targetPos.z) / 2
                    ),
                    targetPos                                            // <-- End point
                );
                
                const points = curve.getPoints(16);                     // <-- Fewer points for performance
                geometry = new THREE.BufferGeometry().setFromPoints(points);
            }
            
            const material = new THREE.LineBasicMaterial({              // <-- Line material
                color: config.color,                                     // <-- Connection color
                opacity: adjustedOpacity,                                // <-- Distance-adjusted opacity
                transparent: true,                                       // <-- Enable transparency
                linewidth: config.width                                  // <-- Line width
            });
            
            const line = new THREE.Line(geometry, material);            // <-- Create line
            line.userData = { 
                edge: edge, 
                config: config,
                distance: distance,                                      // <-- Store distance for updates
                originalOpacity: config.opacity                         // <-- Store original opacity
            };
            
            return line;                                                 // <-- Return line
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Update Node 3D Positions from Simulation
        // ---------------------------------------------------------------
        updateNodePositions() {
            this.graphData.nodes.forEach(node => {                           // <-- For each node
                const mesh = this.nodes.get(node.id);                        // <-- Get node mesh
                if (mesh) {                                                  // <-- If mesh exists
                    mesh.position.set(node.x, node.y, node.z || 0);          // <-- Update position
                    this.nodePositions.set(node.id, mesh.position.clone());  // <-- Store position
                }
            });
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Update Connection Line Positions
        // ---------------------------------------------------------------
        updateConnectionPositions() {
            this.connections.forEach((line, edgeKey) => {               // <-- For each connection
                const edge = line.userData.edge;                        // <-- Get edge data
                
                // Get source and target nodes
                let sourceNode, targetNode;                             // <-- Node variables
                
                // Handle both node references and IDs
                if (typeof edge.source === 'object') {                  // <-- If source is node object
                    sourceNode = edge.source;
                } else {                                                 // <-- If source is ID
                    sourceNode = this.graphData.nodes.find(n => n.id === edge.source);
                }
                
                if (typeof edge.target === 'object') {                  // <-- If target is node object
                    targetNode = edge.target;
                } else {                                                 // <-- If target is ID
                    targetNode = this.graphData.nodes.find(n => n.id === edge.target);
                }
                
                if (sourceNode && targetNode) {                         // <-- If both nodes exist
                    const sourcePos = new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z || 0);
                    const targetPos = new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z || 0);
                    
                    // Update curve points
                    const curve = new THREE.QuadraticBezierCurve3(      // <-- New curve
                        sourcePos,
                        new THREE.Vector3(
                            (sourcePos.x + targetPos.x) / 2,
                            (sourcePos.y + targetPos.y) / 2 + 20,
                            (sourcePos.z + targetPos.z) / 2
                        ),
                        targetPos
                    );
                    
                    const points = curve.getPoints(32);                 // <-- Get new points
                    line.geometry.setFromPoints(points);                 // <-- Update geometry
                    line.geometry.attributes.position.needsUpdate = true; // <-- Mark for update
                }
            });
        }
        // ---------------------------------------------------------------



        // FUNCTION | Create Complete 3D Visualization
        // ---------------------------------------------------------------
        createVisualization() {
            console.log('🔍 Root nodes identified:', this.rootNodes);    // <-- Debug log
            
            // Create nodes
            this.graphData.nodes.forEach(node => {                       // <-- For each node
                const mesh = this.createNodeMesh(node);                  // <-- Create mesh
                this.scene.add(mesh);                                    // <-- Add to scene
                this.nodes.set(node.id, mesh);                           // <-- Store in map
                
                // Debug log for root nodes
                if (this.rootNodes.includes(node.id)) {
                    console.log('🌟 Created root node mesh:', node.id, node.label);
                }
            });
            
            // Create connections using original edges data with distance filtering
            this.graphData.edges.forEach(edge => {                      // <-- For each edge
                const sourceNode = this.graphData.nodes.find(n => n.id === edge.source); // <-- Find source
                const targetNode = this.graphData.nodes.find(n => n.id === edge.target); // <-- Find target
                
                if (sourceNode && targetNode) {                         // <-- If both exist
                    const sourcePos = new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z);
                    const targetPos = new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z);
                    
                    const line = this.createConnectionLine(edge, sourcePos, targetPos); // <-- Create line
                    if (line) {                                          // <-- Only add if line was created (not filtered out)
                        this.scene.add(line);                            // <-- Add to scene
                        
                        // Store with a unique key
                        const key = `${edge.source}-${edge.target}`;    // <-- Create key
                        this.connections.set(key, line);                 // <-- Store in map
                    }
                }
            });
            
            // Add stats display
            this.updateStatsDisplay();                                   // <-- Update statistics
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Handle Window Resize
        // ---------------------------------------------------------------
        handleResize() {
            const width = this.container.clientWidth;                   // <-- Get new width
            const height = this.container.clientHeight;                 // <-- Get new height
            
            this.camera.aspect = width / height;                        // <-- Update aspect ratio
            this.camera.updateProjectionMatrix();                       // <-- Update projection
            
            this.renderer.setSize(width, height);                       // <-- Update renderer size
        }
        // ---------------------------------------------------------------

        // REGION | Event Handlers
        // -----------------------------------------------------------------------------

        // EVENT HANDLER | Handle Mouse Movement for Hover Effects
        // ---------------------------------------------------------------
        handleMouseMove(event) {
            const rect = this.container.getBoundingClientRect();                // <-- Get container bounds
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;  // <-- Normalize X
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; // <-- Normalize Y
            
            // Raycast for hover detection
            this.raycaster.setFromCamera(this.mouse, this.camera);      // <-- Setup raycaster
            const intersects = this.raycaster.intersectObjects(         // <-- Find intersections
                Array.from(this.nodes.values())
            );
            
            // Handle hover state
            if (intersects.length > 0) {                                // <-- If hovering
                const newHovered = intersects[0].object;                // <-- Get hovered object
                
                if (this.hoveredNode !== newHovered) {                  // <-- If different node
                    this.clearHoverEffects();                           // <-- Clear previous
                    this.hoveredNode = newHovered;                      // <-- Set new hovered
                    this.applyHoverEffects(newHovered);                 // <-- Apply effects
                }
            } else {                                                    // <-- Not hovering
                this.clearHoverEffects();                               // <-- Clear effects
                this.hoveredNode = null;                                // <-- Clear hovered
            }
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Apply Hover Visual Effects
        // ---------------------------------------------------------------
        applyHoverEffects(mesh) {
            // Scale up node
            mesh.scale.set(1.2, 1.2, 1.2);                              // <-- Scale up
            
            // Brighten material
            mesh.material.emissiveIntensity = 0.6;                      // <-- Increase glow
            
            // Highlight connected nodes
            const nodeData = mesh.userData.node;                        // <-- Get node data
            this.graphData.edges.forEach(edge => {                      // <-- Check each edge
                if (edge.source === nodeData.id || edge.target === nodeData.id) { // <-- If connected
                    const connectionKey = `${edge.source}-${edge.target}`; // <-- Get key
                    const line = this.connections.get(connectionKey);      // <-- Get line
                    if (line) {                                            // <-- If line exists
                        line.material.opacity = 0.8;                       // <-- Increase opacity
                        line.material.color.setHex(0xffff00);              // <-- Yellow highlight
                    }
                    
                    // Highlight connected node
                    const connectedId = edge.source === nodeData.id ? edge.target : edge.source;
                    const connectedMesh = this.nodes.get(connectedId);   // <-- Get connected mesh
                    if (connectedMesh) {                                 // <-- If exists
                        connectedMesh.material.emissiveIntensity = 0.4;  // <-- Slight glow
                    }
                }
            });
            
            // Update cursor
            this.container.style.cursor = 'pointer';                    // <-- Pointer cursor
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Clear Hover Effects
        // ---------------------------------------------------------------
        clearHoverEffects() {
            if (this.hoveredNode) {                                     // <-- If was hovering
                this.hoveredNode.scale.set(1, 1, 1);                    // <-- Reset scale
                this.hoveredNode.material.emissiveIntensity = 0.3;      // <-- Reset glow
            }
            
            // Reset all connections
            this.connections.forEach(line => {                          // <-- For each connection
                const config = line.userData.config;                    // <-- Get original config
                line.material.opacity = config.opacity;                 // <-- Reset opacity
                line.material.color.setHex(config.color);               // <-- Reset color
            });
            
            // Reset all nodes
            this.nodes.forEach(mesh => {                                // <-- For each node
                if (mesh !== this.selectedNode) {                       // <-- If not selected
                    mesh.material.emissiveIntensity = 0.3;              // <-- Reset glow
                }
            });
            
            // Reset cursor
            this.container.style.cursor = 'grab';                       // <-- Grab cursor
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Handle Mouse Click for Selection
        // ---------------------------------------------------------------
        handleMouseClick(event) {
            if (this.hoveredNode) {                                      // <-- If clicking on node
                this.selectNode(this.hoveredNode);                       // <-- Select it
            } else {                                                     // <-- Clicking empty space
                this.deselectNode();                                     // <-- Deselect
            }
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Select Node
        // ---------------------------------------------------------------
        selectNode(mesh) {
            this.deselectNode();                                        // <-- Clear previous selection
            
            this.selectedNode = mesh;                                    // <-- Set selected
            mesh.material.emissiveIntensity = 0.8;                      // <-- Bright glow
            
            // Show info panel
            this.showNodeInfo(mesh.userData.node);                      // <-- Display node info
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Deselect Current Node
        // ---------------------------------------------------------------
        deselectNode() {
            if (this.selectedNode) {                                    // <-- If node selected
                this.selectedNode.scale.set(1, 1, 1);                   // <-- Reset scale
                this.selectedNode.material.emissiveIntensity = 0.3;     // <-- Reset glow
                this.selectedNode = null;                               // <-- Clear selection
            }
            
            this.hideNodeInfo();                                         // <-- Hide info panel
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Handle Keyboard Input
        // ---------------------------------------------------------------
        handleKeyPress(event) {
            switch(event.key.toLowerCase()) {                           // <-- Check key
                case 'r':                                                // <-- Reset view
                    this.resetCamera();
                    break;
                case ' ':                                                // <-- Pause simulation
                    this.toggleSimulation();
                    break;
                case '?':                                                // <-- Toggle help panel
                    if (event.shiftKey) {                                // <-- Check Shift modifier
                        this.toggleControlsPanel();
                    }
                    break;
            }
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Reset Camera to Initial Position
        // ---------------------------------------------------------------
        resetCamera() {
            this.camera.position.set(                                  // <-- Reset position
                SCENE_CONFIG.INITIAL_CAMERA_POS.x,
                300,                                                   // <-- Higher Y to look down
                SCENE_CONFIG.INITIAL_CAMERA_POS.z
            );
            this.camera.lookAt(0, 0, 0);                               // <-- Look at center
            this.controls.target.set(0, 0, 0);                         // <-- Reset controls target
            this.controls.update();                                    // <-- Update controls
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Toggle Force Simulation
        // ---------------------------------------------------------------
        toggleSimulation() {
            if (this.physicsEngine) {                                    // <-- Check if physics engine exists
                this.physicsEngine.toggleSimulation();                   // <-- Toggle physics simulation
                const isRunning = this.physicsEngine.isSimulationRunning(); // <-- Get current state
                console.log(isRunning ? '▶️ Physics resumed' : '⏸️ Physics paused'); // <-- Log state
            }
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Show Node Information Panel
        // ---------------------------------------------------------------
        showNodeInfo(nodeData) {
            const infoPanel = document.getElementById('node-info');      // <-- Get info panel
            if (!infoPanel) return;                                      // <-- Exit if not found
            
            // Get node mesh for positioning
            const nodeMesh = this.nodes.get(nodeData.id);               // <-- Get node mesh
            if (!nodeMesh) return;                                       // <-- Exit if mesh not found
            
            // Calculate screen position of node
            const vector = new THREE.Vector3();                          // <-- Create position vector
            nodeMesh.getWorldPosition(vector);                           // <-- Get world position
            vector.project(this.camera);                                 // <-- Project to camera space
            
            // Convert to screen coordinates
            const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;   // <-- Convert to screen X
            const y = (-vector.y * 0.5 + 0.5) * this.container.clientHeight; // <-- Convert to screen Y
            
            // Get connections for this node
            const incomingConnections = this.graphData.edges.filter(     // <-- Get incoming connections
                e => e.target === nodeData.id
            );
            const outgoingConnections = this.graphData.edges.filter(     // <-- Get outgoing connections
                e => e.source === nodeData.id
            );
            
            // Get connected node labels
            const getNodeLabel = (nodeId) => {                          // <-- Helper to get node label
                const node = this.graphData.nodes.find(n => n.id === nodeId);
                return node ? node.label : 'Unknown';
            };
            
            // Format file size (mock data for now)
            const fileSize = nodeData.isFolder ? 'N/A' : '100MB';       // <-- Mock size data
            const lastModified = '24-Jun-2025';                         // <-- Mock date data
            const created = '21-Jun-2025';                              // <-- Mock date data
            
            // Build incoming connections list
            const incomingList = incomingConnections.length > 0 
                ? incomingConnections.map(e => 
                    `<div class="node-info-list-item">${getNodeLabel(e.source)}</div>`
                  ).join('')
                : '<div class="node-info-list-item">None</div>';
            
            // Build outgoing connections list
            const outgoingList = outgoingConnections.length > 0
                ? outgoingConnections.map(e => 
                    `<div class="node-info-list-item">${getNodeLabel(e.target)}</div>`
                  ).join('')
                : '<div class="node-info-list-item">None</div>';
            
            // Build node info HTML with all required fields
            infoPanel.innerHTML = `
                <button class="node-info-close" onclick="window.architecture3D.hideNodeInfo()">×</button>
                <h3>${nodeData.label}</h3>
                
                <div class="node-info-row">
                    <span class="node-info-label">Type:</span>
                    <span class="node-info-value">${nodeData.isFolder ? 'Folder' : nodeData.type.charAt(0).toUpperCase() + nodeData.type.slice(1) + ' File'}</span>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Connections:</span>
                    <span class="node-info-value">${incomingConnections.length + outgoingConnections.length}</span>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Path:</span>
                    <span class="node-info-value path-value">${nodeData.label}</span>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Size:</span>
                    <span class="node-info-value">${fileSize}</span>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Last Modified:</span>
                    <span class="node-info-value">${lastModified}</span>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Created:</span>
                    <span class="node-info-value">${created}</span>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Receives Data:</span>
                    <div class="node-info-list">${incomingList}</div>
                </div>
                
                <div class="node-info-row">
                    <span class="node-info-label">Sends Data:</span>
                    <div class="node-info-list">${outgoingList}</div>
                </div>
            `;
            
            // Position panel next to node with offset
            const panelOffset = 60;                                      // <-- Offset from node center
            const panelWidth = 360;                                      // <-- Approximate panel width
            const panelHeight = 400;                                     // <-- Approximate panel height
            
            // Calculate optimal position (prefer right side, but adjust if near edge)
            let panelX = x + panelOffset;                               // <-- Default to right side
            let panelY = y - panelHeight / 2;                           // <-- Center vertically on node
            
            // Adjust if panel would go off screen
            if (panelX + panelWidth > this.container.clientWidth) {      // <-- Check right edge
                panelX = x - panelWidth - panelOffset;                   // <-- Move to left side
            }
            if (panelY < 20) {                                          // <-- Check top edge
                panelY = 20;                                             // <-- Keep minimum distance from top
            }
            if (panelY + panelHeight > this.container.clientHeight - 20) { // <-- Check bottom edge
                panelY = this.container.clientHeight - panelHeight - 20; // <-- Keep minimum distance from bottom
            }
            
            // Apply position and show panel
            infoPanel.style.left = `${panelX}px`;                       // <-- Set X position
            infoPanel.style.top = `${panelY}px`;                        // <-- Set Y position
            infoPanel.style.display = 'block';                          // <-- Show panel
            infoPanel.classList.add('fade-in');                         // <-- Add fade-in animation
            
            // Store node reference for continuous tracking
            this.trackedNode = nodeMesh;                                // <-- Store reference for position updates
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Hide Node Information Panel
        // ---------------------------------------------------------------
        hideNodeInfo() {
            const infoPanel = document.getElementById('node-info');     // <-- Get info panel
            if (infoPanel) {                                            // <-- If exists
                infoPanel.style.display = 'none';                       // <-- Hide panel
                infoPanel.classList.remove('fade-in');                  // <-- Remove animation class
            }
            this.trackedNode = null;                                    // <-- Clear tracked node reference
        }
        // ---------------------------------------------------------------

        // EVENT HANDLER | Toggle Controls Panel Visibility
        // ---------------------------------------------------------------
        toggleControlsPanel() {
            const controlsContent = document.getElementById('controls-content'); // <-- Get content panel
            const toggleButton = document.getElementById('controls-toggle');     // <-- Get toggle button
            const toggleArrow = toggleButton.querySelector('.toggle-arrow');     // <-- Get arrow icon
            const projectPathControls = document.getElementById('project-path-controls'); // <-- Get project path controls
            
            if (controlsContent && toggleArrow) {                               // <-- If elements exist
                controlsContent.classList.toggle('collapsed');                   // <-- Toggle collapsed class
                
                // Update arrow direction
                if (controlsContent.classList.contains('collapsed')) {           // <-- If collapsed
                    toggleArrow.textContent = '▶';                              // <-- Right arrow
                    if (projectPathControls) projectPathControls.classList.add('hidden-by-default'); // Hide input
                } else {                                                         // <-- If expanded
                    toggleArrow.textContent = '▼';                              // <-- Down arrow
                    if (projectPathControls) projectPathControls.classList.remove('hidden-by-default'); // Show input
                }
            }
        }
        // ---------------------------------------------------------------

        // REGION | Event Listeners
        // -----------------------------------------------------------------------------

        // EVENT LISTENER | Setup Event Listeners
        // ---------------------------------------------------------------
        setupEventListeners() {
            // Mouse events using bound references for proper cleanup
            this.container.addEventListener('mousemove', this.handleMouseMoveBound);      // <-- Mouse move
            this.container.addEventListener('click', this.handleMouseClickBound);         // <-- Mouse click
            
            // Keyboard and resize events using bound references
            window.addEventListener('keydown', this.handleKeyPressBound);                 // <-- Key press
            window.addEventListener('resize', this.handleResizeBound);                    // <-- Window resize
            
            // Controls panel toggle button with stored bound reference
            const controlsToggle = document.getElementById('controls-toggle');           // <-- Get toggle button
            const controlsHeader = document.getElementById('controls-header');           // <-- Get header
            
            if (controlsToggle) {                                                       // <-- If button exists
                this.controlsToggleBound = (e) => {                                     // <-- Create bound function
                    e.stopPropagation();                                                // <-- Prevent bubbling
                    this.toggleControlsPanel();                                         // <-- Toggle panel
                };
                controlsToggle.addEventListener('click', this.controlsToggleBound);     // <-- Attach handler
            }
            
            if (controlsHeader) {                                                       // <-- If header exists
                this.controlsHeaderBound = () => {                                      // <-- Create bound function
                    this.toggleControlsPanel();                                         // <-- Toggle panel
                };
                controlsHeader.addEventListener('click', this.controlsHeaderBound);     // <-- Attach handler
            }
        }
        // ---------------------------------------------------------------

        // REGION | Visualization Functions
        // -----------------------------------------------------------------------------

        // FUNCTION | Update Statistics Display
        // ---------------------------------------------------------------
        updateStatsDisplay() {
            const legendContainer = document.getElementById('legend-container');  // <-- Get legend container
            if (!legendContainer) return;                                         // <-- Exit if not found
            
            // Count nodes by type
            const typeCounts = {};                                     // <-- Type count object
            this.graphData.nodes.forEach(node => {                     // <-- For each node
                const type = node.type || 'other';                     // <-- Get type
                typeCounts[type] = (typeCounts[type] || 0) + 1;        // <-- Increment count
            });
            
            // Build legend HTML
            let legendHTML = '<h2 class="legend-title">File Types</h2>'; // <-- Title
            
            Object.entries(typeCounts).forEach(([type, count]) => {    // <-- For each type
                const color = NODE_CONFIG.COLORS[type] || NODE_CONFIG.COLORS.other; // <-- Get color
                legendHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #${color.toString(16).padStart(6, '0')};"></div>
                        <span class="legend-text">${type}</span>
                        <span class="legend-count">${count}</span>
                    </div>
                `;
            });
            
            // Add statistics
            legendHTML += `
                <div class="stats-section">
                    <div class="stats-item">
                        <span class="stats-label">Total Nodes:</span>
                        <span class="stats-value">${this.graphData.nodes.length}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Connections:</span>
                        <span class="stats-value">${this.graphData.edges.length}</span>
                    </div>
                </div>
            `;
            
            legendContainer.innerHTML = legendHTML;                     // <-- Update HTML
        }
        // ---------------------------------------------------------------

        // FUNCTION | Start Animation Loop
        // ---------------------------------------------------------------
        startAnimation() {
            const animate = () => {                                      // <-- Animation function
                this.animationId = requestAnimationFrame(animate);       // <-- Request next frame
                
                // Update physics simulation
                if (this.physicsEngine) {                                // <-- Check if physics engine exists
                    this.physicsEngine.updatePhysics();                  // <-- Update physics calculations
                    this.updateNodePositions();                          // <-- Update visual positions
                    this.updateConnectionPositions();                    // <-- Update connection lines
                }
                
                // Update controls
                if (this.controls) {                                     // <-- Check if controls exist
                    this.controls.update();                              // <-- Update orbit controls
                }
                
                // Special animations for root node (sun pulsing)
                this.nodes.forEach((mesh, nodeId) => {                  // <-- For each node mesh
                    if (mesh.userData.isSun) {                           // <-- Check if marked as sun
                        // Gentle pulsing effect
                        const pulseScale = 1 + Math.sin(Date.now() * 0.001 + mesh.userData.pulsePhase) * 0.05;
                        mesh.scale.set(pulseScale, pulseScale, pulseScale); // <-- Apply pulsing scale
                        
                        // Rotate the sun slowly
                        mesh.rotation.y += 0.002;                        // <-- Slow Y rotation
                        mesh.rotation.x += 0.001;                        // <-- Slow X rotation
                    }
                });
                
                // Update node info panel position if tracking a node
                if (this.trackedNode) {                                  // <-- Check if tracking a node
                    this.updateNodeInfoPosition();                       // <-- Update panel position
                }
                
                // Render scene
                this.renderer.render(this.scene, this.camera);          // <-- Render frame
            };
            
            animate();                                                   // <-- Start animation loop
        }
        // ---------------------------------------------------------------
        
        // HELPER FUNCTION | Update Node Info Panel Position
        // ---------------------------------------------------------------
        updateNodeInfoPosition() {
            const infoPanel = document.getElementById('node-info');      // <-- Get info panel
            if (!infoPanel || !this.trackedNode) return;                // <-- Exit if no panel or node
            
            // Calculate screen position of tracked node
            const vector = new THREE.Vector3();                          // <-- Create position vector
            this.trackedNode.getWorldPosition(vector);                   // <-- Get world position
            vector.project(this.camera);                                 // <-- Project to camera space
            
            // Check if node is behind camera or off-screen
            if (vector.z > 1) {                                          // <-- Node is behind camera
                infoPanel.style.display = 'none';                        // <-- Hide panel
                return;
            }
            
            // Convert to screen coordinates
            const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;   // <-- Convert to screen X
            const y = (-vector.y * 0.5 + 0.5) * this.container.clientHeight; // <-- Convert to screen Y
            
            // Check if node is off-screen
            if (x < -50 || x > this.container.clientWidth + 50 ||       // <-- Check horizontal bounds
                y < -50 || y > this.container.clientHeight + 50) {      // <-- Check vertical bounds
                infoPanel.style.display = 'none';                        // <-- Hide panel
                return;
            }
            
            // Show panel if it was hidden
            if (infoPanel.style.display === 'none') {                   // <-- Check if panel hidden
                infoPanel.style.display = 'block';                       // <-- Show panel
            }
            
            // Get current panel dimensions
            const panelRect = infoPanel.getBoundingClientRect();         // <-- Get panel dimensions
            const panelWidth = panelRect.width;                          // <-- Panel width
            const panelHeight = panelRect.height;                        // <-- Panel height
            const panelOffset = 60;                                      // <-- Offset from node center
            
            // Calculate optimal position (prefer right side, but adjust if near edge)
            let panelX = x + panelOffset;                               // <-- Default to right side
            let panelY = y - panelHeight / 2;                           // <-- Center vertically on node
            
            // Adjust if panel would go off screen
            if (panelX + panelWidth > this.container.clientWidth) {      // <-- Check right edge
                panelX = x - panelWidth - panelOffset;                   // <-- Move to left side
            }
            if (panelY < 20) {                                          // <-- Check top edge
                panelY = 20;                                             // <-- Keep minimum distance from top
            }
            if (panelY + panelHeight > this.container.clientHeight - 20) { // <-- Check bottom edge
                panelY = this.container.clientHeight - panelHeight - 20; // <-- Keep minimum distance from bottom
            }
            
            // Apply smooth position update
            infoPanel.style.left = `${panelX}px`;                       // <-- Update X position
            infoPanel.style.top = `${panelY}px`;                        // <-- Update Y position
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Destroy Visualization and Clean Up Resources
        // ---------------------------------------------------------------
        destroy() {
            // Cancel animation
            if (this.animationId) {                                      // <-- Check if animation running
                cancelAnimationFrame(this.animationId);                  // <-- Stop animation loop
            }
            
            // Stop physics simulation
            if (this.physicsEngine) {                                    // <-- Check if physics engine exists
                this.physicsEngine.stopSimulation();                     // <-- Stop physics
            }
            
            console.log('🧹 Starting comprehensive scene cleanup...');   // <-- Log cleanup start
            
            // Clear all scene objects recursively
            if (this.scene) {                                           // <-- If scene exists
                this.clearSceneObjects(this.scene);                     // <-- Clear all objects
            }
            
            // Dispose of all node meshes and their resources
            if (this.nodes) {                                            // <-- If nodes map exists
                this.nodes.forEach(mesh => {                            // <-- For each node mesh
                    this.disposeMeshResources(mesh);                    // <-- Dispose resources
                });
                this.nodes.clear();                                     // <-- Clear nodes map
            }
            
            // Dispose of all connection lines and their resources
            if (this.connections) {                                      // <-- If connections map exists
                this.connections.forEach(line => {                      // <-- For each connection line
                    this.disposeMeshResources(line);                    // <-- Dispose resources
                });
                this.connections.clear();                               // <-- Clear connections map
            }
            
            // Clear all data structures
            if (this.nodePositions) this.nodePositions.clear();         // <-- Clear node positions
            if (this.nodeHierarchy) this.nodeHierarchy.clear();         // <-- Clear hierarchy map
            if (this.nodeParents) this.nodeParents.clear();             // <-- Clear parents map
            if (this.nodeDepths) this.nodeDepths.clear();               // <-- Clear depths map
            
            // Reset selection and hover states
            this.selectedNode = null;                                    // <-- Clear selected node
            this.hoveredNode = null;                                     // <-- Clear hovered node
            
            // Remove event listeners using stored bound references
            if (this.container) {                                        // <-- If container exists
                this.container.removeEventListener('mousemove', this.handleMouseMoveBound);
                this.container.removeEventListener('click', this.handleMouseClickBound);
            }
            
            // Remove window event listeners
            window.removeEventListener('keydown', this.handleKeyPressBound);
            window.removeEventListener('resize', this.handleResizeBound);
            
            // Remove controls panel event listeners if they exist
            const controlsToggle = document.getElementById('controls-toggle');
            const controlsHeader = document.getElementById('controls-header');
            
            if (controlsToggle && this.controlsToggleBound) {            // <-- If toggle exists and bound
                controlsToggle.removeEventListener('click', this.controlsToggleBound);
                this.controlsToggleBound = null;                         // <-- Clear reference
            }
            
            if (controlsHeader && this.controlsHeaderBound) {            // <-- If header exists and bound
                controlsHeader.removeEventListener('click', this.controlsHeaderBound);
                this.controlsHeaderBound = null;                         // <-- Clear reference
            }
            
            // Dispose of controls
            if (this.controls) {                                         // <-- If controls exist
                this.controls.dispose();                                 // <-- Dispose orbit controls
                this.controls = null;                                    // <-- Clear controls reference
            }
            
            // Dispose of renderer and remove from DOM
            if (this.renderer) {                                         // <-- If renderer exists
                this.renderer.dispose();                                 // <-- Dispose renderer
                if (this.container && this.renderer.domElement) {        // <-- If container and element exist
                    this.container.removeChild(this.renderer.domElement); // <-- Remove from DOM
                }
                this.renderer = null;                                    // <-- Clear renderer reference
            }
            
            // Clear scene reference
            this.scene = null;                                           // <-- Clear scene reference
            this.camera = null;                                          // <-- Clear camera reference
            
            console.log('✅ Scene cleanup completed successfully');      // <-- Log cleanup completion
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Recursively Clear All Scene Objects
        // ---------------------------------------------------------------
        clearSceneObjects(object) {
            // Remove all children first (recursive)
            while (object.children.length > 0) {                        // <-- While children exist
                const child = object.children[0];                       // <-- Get first child
                this.clearSceneObjects(child);                          // <-- Recursively clear child
                object.remove(child);                                    // <-- Remove from parent
            }
            
            // Dispose of object resources if it's a mesh or line
            this.disposeMeshResources(object);                          // <-- Dispose object resources
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Dispose Mesh Geometries and Materials
        // ---------------------------------------------------------------
        disposeMeshResources(object) {
            if (object.geometry) {                                       // <-- If has geometry
                object.geometry.dispose();                               // <-- Dispose geometry
            }
            
            if (object.material) {                                       // <-- If has material
                if (Array.isArray(object.material)) {                   // <-- If material array
                    object.material.forEach(material => {               // <-- For each material
                        if (material.map) material.map.dispose();        // <-- Dispose texture
                        material.dispose();                              // <-- Dispose material
                    });
                } else {                                                 // <-- If single material
                    if (object.material.map) object.material.map.dispose(); // <-- Dispose texture
                    object.material.dispose();                          // <-- Dispose material
                }
            }
        }
        // ---------------------------------------------------------------




    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Initialization and Integration
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize 3D Visualization When Data Ready
    // ------------------------------------------------------------
    async function initializeVisualization3D() {
        try {
            // Check if graph data is loaded
            if (!window.graphData || !window.dataLoaded) {                // <-- Check data state
                console.log('⏳ Waiting for graph data to load...');
                return;
            }
            
            // Get container element
            const container = document.getElementById('neural-container'); // <-- Get container
            if (!container) {                                              // <-- Check container exists
                console.error('❌ Container element not found');
                return;
            }
            
            // CRITICAL: Clear existing visualization before creating new one
            if (window.architecture3D) {                                   // <-- Check if previous instance exists
                console.log('🧹 Clearing previous 3D visualization...');
                window.architecture3D.destroy();                          // <-- Destroy old instance
                window.architecture3D = null;                             // <-- Clear reference
                console.log('✅ Previous visualization cleared');
            }
            
            // FIXED: Ensure controls panel is expanded and project path controls are visible after reload
            const controlsContent = document.getElementById('controls-content'); // <-- Get controls content
            const toggleArrow = document.querySelector('.toggle-arrow');         // <-- Get arrow
            const projectPathControls = document.getElementById('project-path-controls'); // <-- Get project controls
            
            if (controlsContent && toggleArrow) {                               // <-- If elements exist
                controlsContent.classList.remove('collapsed');                   // <-- Expand panel after reload
                toggleArrow.textContent = '▼';                                  // <-- Down arrow for expanded
                
                // Ensure project path controls are visible when panel is expanded
                if (projectPathControls) {                                      // <-- If project controls exist
                    projectPathControls.classList.remove('hidden-by-default');  // <-- Show project controls
                }
            }
            
            // Create 3D visualization
            console.log('🚀 Initializing 3D neural network visualization...');
            window.architecture3D = new Architecture3DNeuralNetwork(container, window.graphData); // <-- Create instance
            
            // Add node info panel if not exists
            if (!document.getElementById('node-info')) {                // <-- Check if exists
                const infoPanel = document.createElement('div');        // <-- Create panel
                infoPanel.id = 'node-info';                            // <-- Set ID
                infoPanel.className = 'node-info-panel';               // <-- Set class
                infoPanel.style.display = 'none';                      // <-- Hide initially
                document.body.appendChild(infoPanel);                   // <-- Add to body
            }
            
            console.log('✅ 3D visualization initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing 3D visualization:', error);
        }
    };
    // ---------------------------------------------------------------

    // EVENT LISTENER | Initialize When Graph Data is Loaded
    // ------------------------------------------------------------
    window.addEventListener('graphDataLoaded', (event) => {
        console.log('📊 Graph data loaded event received');             // Log event reception
        
        // Wait for Three.js dependencies to be ready
        const checkDependencies = () => {
            if (typeof THREE !== 'undefined' && 
                typeof THREE.OrbitControls !== 'undefined' &&
                document.readyState === 'complete') {
                
                console.log('✅ All dependencies ready, initializing 3D visualization...');
                initializeVisualization3D();                            // Initialize visualization
                
            } else {
                // Log what we're waiting for
                if (typeof THREE === 'undefined') {
                    console.log('⏳ Waiting for Three.js...');
                } else if (typeof THREE.OrbitControls === 'undefined') {
                    console.log('⏳ Waiting for OrbitControls...');
                } else {
                    console.log('⏳ Waiting for DOM ready...');
                }
                
                // Check again in 100ms
                setTimeout(checkDependencies, 100);
            }
        };
        
        checkDependencies();                                            // Start dependency check
    });
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
