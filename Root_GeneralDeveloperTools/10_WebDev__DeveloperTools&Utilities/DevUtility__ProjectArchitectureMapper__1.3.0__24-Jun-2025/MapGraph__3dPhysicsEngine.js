// =============================================================================
// VALEDESIGNSUITE - 3D PHYSICS ENGINE FOR NEURAL NETWORK VISUALIZATION
// =============================================================================
//
// FILE       : MapGraph__3dPhysicsEngine.js
// NAMESPACE  : Architecture3D
// MODULE     : PhysicsEngine3D
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Physics simulation engine for 3D neural network visualization
// CREATED    : 2025
//
// DESCRIPTION
// - Handles all physics calculations for node positioning and movement
// - Implements hierarchical solar system model with gravitational forces
// - Manages orbital mechanics, repulsion forces, and collision detection
// - Provides force calculations for parent-child relationships
// - Supports real-time physics updates with configurable parameters
// - Decoupled from visualization for clean separation of concerns
//
// DESIGN CONCEPT BREAKDOWN
//  - Root Folder - Acts as the Sun, Central Point of the Solar System, this anchors the entire system around a central point.
//  - Folders & Files Directly in the root directory - Orbit around the Sun
//  - Folders & Files in Sub-Folders - Branch out from each child folder
//  - So items as they nest are like planets and moons in their own orbits
//  - This ensures a clear and intuitive visual hierarchy with a definite centre point.
//  - This makes it easy to work out in each direction from the sun (root folder) to locate the items you are looking for.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Jun-2025 - Version 1.0.0
// - Initial extraction from visualization logic
// - Hierarchical solar system physics model
// - Force calculation and velocity updates
// - Orbital mechanics implementation
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Export and Physics Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Physics Configuration Parameters
    // ------------------------------------------------------------
    const PHYSICS_CONFIG = {
        ORBITAL_BASE_RADIUS    : 120,      // <-- Base orbital radius for child nodes (increased for wider spread)
        ORBITAL_SPACING        : 80,       // <-- Additional spacing between orbital levels (increased for better separation)
        GRAVITY_STRENGTH       : 0.8,      // <-- Gravitational attraction strength (reduced for looser orbits)
        ORBITAL_VELOCITY       : 0.006,    // <-- Base orbital rotation speed (reduced for more stable motion)
        REPULSION_STRENGTH     : 25,       // <-- Mild repulsion between siblings (increased for better separation)
        REPULSION_DISTANCE     : 50,       // <-- Distance at which repulsion applies (increased for wider spread)
        DAMPING                : 0.98,     // <-- Velocity damping (slight reduction for more natural motion)
        MAX_VELOCITY           : 3.0,      // <-- Maximum velocity per axis (increased for better movement)
        ROOT_GRAVITY           : 2.5,      // <-- Extra gravity for root node (sun) (slight reduction)
        FOLDER_GRAVITY_MULT    : 1.8,      // <-- Gravity multiplier for folders vs files (slight reduction)
        VERTICAL_VARIATION     : 0.4,      // <-- Vertical variation factor (reduced for flatter, more readable system)
        MIN_HEIGHT_SPACING     : 25,       // <-- Minimum vertical spacing between levels (increased)
        HEIGHT_REPULSION       : 0.2,      // <-- Additional repulsion in Y direction (reduced for flatter system)
        ROOT_REPULSION_MULT    : 1.2,      // <-- Root node repulsion multiplier (reduced)
        ROOT_REPULSION_RADIUS  : 80        // <-- Root node repulsion radius (increased for wider inner system)
    };
    // ---------------------------------------------------------------

    // CLASS | 3D Physics Engine for Neural Network Simulation
    // ------------------------------------------------------------
    class PhysicsEngine3D {
        constructor() {
            this.graphData = null;                                               // <-- Graph nodes and edges data
            this.nodeHierarchy = null;                                          // <-- Node parent-child relationships
            this.nodeParents = null;                                            // <-- Child to parent mapping
            this.nodeDepths = null;                                             // <-- Node depth levels
            this.rootNodes = null;                                              // <-- Root node IDs
            this.simulationRunning = false;                                     // <-- Physics simulation state
            this.simulationAlpha = 1.0;                                         // <-- Simulation energy level
        }

        // SUB FUNCTION | Initialize Physics Engine with Graph Data
        // ---------------------------------------------------------------
        initialize(graphData) {
            this.graphData = graphData;                                         // <-- Store graph data reference
            this.nodeHierarchy = new Map();                                     // <-- Initialize hierarchy map
            this.nodeParents = new Map();                                       // <-- Initialize parents map
            this.nodeDepths = new Map();                                        // <-- Initialize depths map
            this.rootNodes = [];                                                // <-- Initialize root nodes array
            
            // Build hierarchy structure
            this.buildNodeHierarchy();                                          // <-- Analyze node relationships
            
            // Initialize node physics properties
            this.initializeNodeProperties();                                    // <-- Setup physics properties
            
            // Position nodes in initial configuration
            this.setupInitialPositions();                                       // <-- Calculate starting positions
            
            // Start physics simulation
            this.simulationRunning = true;                                      // <-- Enable simulation
            this.simulationAlpha = 1.0;                                         // <-- Full initial energy
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Build Node Hierarchy from Edges
        // ---------------------------------------------------------------
        buildNodeHierarchy() {
            // Clear existing hierarchy data
            this.nodeHierarchy.clear();                                         // <-- Reset hierarchy map
            this.nodeParents.clear();                                          // <-- Reset parents map
            this.nodeDepths.clear();                                           // <-- Reset depths map
            this.rootNodes = [];                                                // <-- Reset root nodes
            
            // First pass: Build parent-child relationships from hierarchy edges
            this.graphData.edges.forEach(edge => {                             // <-- Process each edge
                if (edge.type === 'hierarchy' || edge.type === 'contains') {   // <-- Check if hierarchy edge
                    const parentId = edge.source;                               // <-- Parent is source
                    const childId = edge.target;                                // <-- Child is target
                    
                    // Add to parent's children list
                    if (!this.nodeHierarchy.has(parentId)) {
                        this.nodeHierarchy.set(parentId, []);
                    }
                    this.nodeHierarchy.get(parentId).push(childId);
                    
                    // Set child's parent
                    this.nodeParents.set(childId, parentId);
                }
            });
            
            // Find root nodes (nodes with no parents)
            this.graphData.nodes.forEach(node => {                             // <-- Check each node
                if (!this.nodeParents.has(node.id)) {                          // <-- No parent
                    this.rootNodes.push(node.id);                              // <-- Add as root
                    this.nodeDepths.set(node.id, 0);                           // <-- Depth 0
                }
            });
            
            // Calculate depths for all nodes
            const calculateDepth = (nodeId, depth) => {                        // <-- Recursive depth calculation
                this.nodeDepths.set(nodeId, depth);                            // <-- Set depth
                const children = this.nodeHierarchy.get(nodeId) || [];         // <-- Get children
                children.forEach(childId => {                                   // <-- For each child
                    calculateDepth(childId, depth + 1);                        // <-- Recurse
                });
            };
            
            this.rootNodes.forEach(rootId => calculateDepth(rootId, 0));       // <-- Calculate from roots
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Initialize Node Physics Properties
        // ---------------------------------------------------------------
        initializeNodeProperties() {
            this.graphData.nodes.forEach(node => {                             // <-- For each node
                // Initialize velocities
                node.vx = 0;                                                    // <-- X velocity
                node.vy = 0;                                                    // <-- Y velocity
                node.vz = 0;                                                    // <-- Z velocity
                
                // Initialize forces
                node.fx = 0;                                                    // <-- X force
                node.fy = 0;                                                    // <-- Y force
                node.fz = 0;                                                    // <-- Z force
            });
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Setup Initial Node Positions
        // ---------------------------------------------------------------
        setupInitialPositions() {
            // Position root nodes at center
            this.rootNodes.forEach((rootId, index) => {                        // <-- For each root
                const rootNode = this.graphData.nodes.find(n => n.id === rootId);
                if (rootNode) {
                    if (this.rootNodes.length === 1) {                         // <-- Single root at exact center
                        rootNode.x = 0;
                        rootNode.y = 0;
                        rootNode.z = 0;
                    } else {                                                    // <-- Multiple roots in tight center cluster
                        const angle = (index / this.rootNodes.length) * Math.PI * 2;
                        const clusterRadius = 10;                               // <-- Very small cluster radius
                        rootNode.x = Math.cos(angle) * clusterRadius;
                        rootNode.y = 0;                                         // <-- All roots at same Y level
                        rootNode.z = Math.sin(angle) * clusterRadius;
                    }
                }
            });
            
            // Position child nodes in direct outward branches from root
            const positionChildren = (parentId, parentNode) => {               // <-- Recursive positioning
                const children = this.nodeHierarchy.get(parentId) || [];
                const depth = this.nodeDepths.get(parentId) || 0;
                
                children.forEach((childId, index) => {                         // <-- For each child
                    const childNode = this.graphData.nodes.find(n => n.id === childId);
                    if (childNode) {
                        // Calculate direct outward positioning from parent
                        const numChildren = children.length;
                        const angleH = (index / numChildren) * Math.PI * 2;    // <-- Horizontal angle
                        const angleV = (Math.random() - 0.5) * Math.PI * PHYSICS_CONFIG.VERTICAL_VARIATION; // <-- Vertical variation
                        
                        // Calculate distance from parent (increases with depth)
                        const baseDistance = PHYSICS_CONFIG.ORBITAL_BASE_RADIUS + 
                                           depth * PHYSICS_CONFIG.ORBITAL_SPACING;
                        
                        // Position directly outward from parent
                        childNode.x = parentNode.x + Math.cos(angleH) * Math.cos(angleV) * baseDistance;
                        childNode.y = parentNode.y + Math.sin(angleV) * baseDistance; // <-- Full Y variation
                        childNode.z = parentNode.z + Math.sin(angleH) * Math.cos(angleV) * baseDistance;
                        
                        // Add small initial orbital velocity in all 3 dimensions
                        const tangentSpeed = PHYSICS_CONFIG.ORBITAL_VELOCITY * Math.sqrt(baseDistance / 100);
                        childNode.vx = -Math.sin(angleH) * tangentSpeed;
                        childNode.vy = Math.cos(angleV) * tangentSpeed * 0.3;  // <-- Add Y velocity
                        childNode.vz = Math.cos(angleH) * tangentSpeed;
                        
                        // Recursively position this node's children
                        positionChildren(childId, childNode);
                    }
                });
            };
            
            // Position all nodes starting from roots
            this.rootNodes.forEach(rootId => {                                 // <-- For each root
                const rootNode = this.graphData.nodes.find(n => n.id === rootId);
                if (rootNode) {
                    positionChildren(rootId, rootNode);                        // <-- Position its children
                }
            });
            
            // Position any orphan nodes (not in hierarchy) in outer sphere
            let orphanCount = 0;
            this.graphData.nodes.forEach(node => {                             // <-- Check for orphans
                if (node.x === undefined || node.y === undefined || node.z === undefined) {
                    // Position orphans in outer sphere with full 3D distribution
                    const angle = orphanCount * 0.618 * Math.PI * 2;           // <-- Golden angle
                    const radius = 400 + orphanCount * 15;                     // <-- Larger radius for orphans
                    const heightAngle = (Math.random() - 0.5) * Math.PI;       // <-- Random height angle
                    
                    node.x = Math.cos(angle) * Math.cos(heightAngle) * radius;
                    node.y = Math.sin(heightAngle) * radius;                   // <-- Full Y variation
                    node.z = Math.sin(angle) * Math.cos(heightAngle) * radius;
                    orphanCount++;
                }
            });
        }
        // ---------------------------------------------------------------

        // FUNCTION | Update Physics Simulation - Main Physics Loop
        // ---------------------------------------------------------------
        updatePhysics() {
            if (!this.simulationRunning) return;                               // <-- Skip if not running
            
            // Reset forces
            this.graphData.nodes.forEach(node => {                             // <-- Clear forces
                node.fx = 0;
                node.fy = 0;
                node.fz = 0;
            });
            
            // HIERARCHICAL SOLAR SYSTEM MODEL: Each node orbits its immediate parent
            const rootNodes = this.rootNodes || [];                            // <-- Get root nodes
            
            // Phase 1: Apply hierarchical gravitational forces
            this.graphData.nodes.forEach(node => {                             // <-- For each node
                if (!rootNodes.includes(node.id)) {                            // <-- If not root node
                    this.applyHierarchicalGravity(node);                       // <-- Apply gravity to immediate parent
                }
            });
            
            // Phase 2: Apply hierarchical repulsion to maintain orbital distances
            this.graphData.nodes.forEach(node => {                             // <-- For each node
                if (!rootNodes.includes(node.id)) {                            // <-- If not root node
                    this.applyHierarchicalRepulsion(node);                     // <-- Apply repulsion from parent
                }
            });
            
            // Phase 3: Apply sibling repulsion (prevent same-level nodes from overlapping)
            this.applySiblingRepulsions();                                     // <-- Sibling node separation
            
            // Phase 4: Apply hierarchical orbital motion
            this.graphData.nodes.forEach(node => {                             // <-- For each node
                if (!rootNodes.includes(node.id)) {                            // <-- If not root node
                    this.applyHierarchicalOrbit(node);                         // <-- Apply orbital motion around parent
                }
            });
            
            // Phase 5: Update velocities and positions
            this.graphData.nodes.forEach(node => {                             // <-- For each node
                if (rootNodes.includes(node.id)) {                             // <-- Root nodes (sun)
                    // Root nodes stay at center with very strong anchoring
                    const centerForce = PHYSICS_CONFIG.ROOT_GRAVITY * 50;      // <-- Ultra-strong center pull
                    node.vx = -node.x * centerForce * 0.1;                     // <-- Direct position correction
                    node.vy = -node.y * centerForce * 0.1;
                    node.vz = -node.z * centerForce * 0.1;
                    
                    // Keep root very close to center
                    const rootDistance = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
                    if (rootDistance > 2) {                                     // <-- Even tighter constraint
                        const scale = 2 / rootDistance;                         // <-- Scale back to center
                        node.x *= scale;
                        node.y *= scale;
                        node.z *= scale;
                    }
                } else {                                                        // <-- Regular nodes (planets/moons)
                    // Update velocities with forces
                    node.vx = (node.vx + node.fx) * PHYSICS_CONFIG.DAMPING;    // <-- Apply damping
                    node.vy = (node.vy + node.fy) * PHYSICS_CONFIG.DAMPING;
                    node.vz = (node.vz + node.fz) * PHYSICS_CONFIG.DAMPING;
                    
                    // Clamp velocities to prevent chaotic movement
                    const maxVel = PHYSICS_CONFIG.MAX_VELOCITY;                // <-- Get max velocity
                    node.vx = Math.max(-maxVel, Math.min(maxVel, node.vx));    // <-- Clamp X velocity
                    node.vy = Math.max(-maxVel, Math.min(maxVel, node.vy));    // <-- Clamp Y velocity
                    node.vz = Math.max(-maxVel, Math.min(maxVel, node.vz));    // <-- Clamp Z velocity
                    
                    // Update positions
                    node.x += node.vx;                                          // <-- Update X
                    node.y += node.vy;                                          // <-- Update Y
                    node.z += node.vz;                                          // <-- Update Z
                    
                    // Apply hierarchical distance constraints
                    this.applyHierarchicalConstraints(node);                   // <-- Maintain proper orbital distances
                }
            });
            
            // Slower decay for stable solar system
            this.simulationAlpha *= 0.995;                                     // <-- Slower decay for stability
            
            // Stop simulation when stable
            if (this.simulationAlpha < 0.005) {                                // <-- Lower threshold
                this.simulationRunning = false;                                // <-- Stop simulation
                console.log('🌟 Hierarchical solar system stabilized!');
            }
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Apply Hierarchical Gravity (Each node orbits its immediate parent)
        // ---------------------------------------------------------------
        applyHierarchicalGravity(node) {
            const parentId = this.nodeParents.get(node.id);                    // <-- Get immediate parent ID
            if (!parentId) return;                                              // <-- Skip if no parent (should be root)
            
            const parentNode = this.graphData.nodes.find(n => n.id === parentId); // <-- Find parent node
            if (!parentNode) return;                                            // <-- Skip if parent not found
            
            // Calculate gravitational force towards immediate parent
            const dx = parentNode.x - node.x;                                  // <-- X distance to parent
            const dy = parentNode.y - node.y;                                  // <-- Y distance to parent
            const dz = parentNode.z - node.z;                                  // <-- Z distance to parent
            let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);            // <-- 3D distance to parent
            
            if (distance < 1) distance = 1;                                     // <-- Prevent division by zero
            
            // Gravitational attraction strength based on parent type and depth
            const depth = this.nodeDepths.get(node.id) || 0;                   // <-- Get node depth
            const gravityStrength = PHYSICS_CONFIG.GRAVITY_STRENGTH * 
                                   (parentNode.isFolder ? PHYSICS_CONFIG.FOLDER_GRAVITY_MULT : 1); // <-- Stronger for folders
            
            // Adjust gravity by depth - deeper nodes have weaker gravity
            const depthFactor = Math.max(0.5, 1 / Math.sqrt(depth + 1));      // <-- Diminishing gravity with depth
            const force = gravityStrength * depthFactor / distance;            // <-- Final force calculation
            
            // Apply force towards parent
            node.fx += (dx / distance) * force;                                // <-- X force component
            node.fy += (dy / distance) * force;                                // <-- Y force component
            node.fz += (dz / distance) * force;                                // <-- Z force component
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Apply Hierarchical Repulsion (Maintain orbital distance from parent)
        // ---------------------------------------------------------------
        applyHierarchicalRepulsion(node) {
            const parentId = this.nodeParents.get(node.id);                    // <-- Get immediate parent ID
            if (!parentId) return;                                              // <-- Skip if no parent
            
            const parentNode = this.graphData.nodes.find(n => n.id === parentId); // <-- Find parent node
            if (!parentNode) return;                                            // <-- Skip if parent not found
            
            // Calculate distance from immediate parent
            const dx = node.x - parentNode.x;                                  // <-- X distance from parent
            const dy = node.y - parentNode.y;                                  // <-- Y distance from parent
            const dz = node.z - parentNode.z;                                  // <-- Z distance from parent
            let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);            // <-- 3D distance from parent
            
            if (distance < 0.1) distance = 0.1;                                // <-- Prevent division by zero
            
            // Calculate ideal orbital distance based on depth and node type
            const depth = this.nodeDepths.get(node.id) || 0;                   // <-- Get node depth
            const isFolder = node.isFolder || false;                           // <-- Check if folder
            const baseDistance = PHYSICS_CONFIG.ORBITAL_BASE_RADIUS + 
                               (depth - 1) * PHYSICS_CONFIG.ORBITAL_SPACING;   // <-- Base orbital distance
            const idealDistance = baseDistance * (isFolder ? 1.3 : 1.0);       // <-- Folders orbit farther
            
            // Apply repulsion if too close to parent
            if (distance < idealDistance * 0.7) {                               // <-- Too close threshold
                const repulsionStrength = PHYSICS_CONFIG.REPULSION_STRENGTH * 3; // <-- Strong repulsion
                const force = repulsionStrength / (distance * distance);       // <-- Inverse square law
                
                // Apply outward force from parent
                node.fx += (dx / distance) * force;                            // <-- X repulsion
                node.fy += (dy / distance) * force;                            // <-- Y repulsion
                node.fz += (dz / distance) * force;                            // <-- Z repulsion
            }
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Apply Sibling Repulsions (Same-level nodes repel each other)
        // ---------------------------------------------------------------
        applySiblingRepulsions() {
            // Group nodes by their parent (siblings)
            const siblingGroups = new Map();                                    // <-- Parent ID to children map
            
            this.graphData.nodes.forEach(node => {                             // <-- For each node
                const parentId = this.nodeParents.get(node.id) || 'ROOT';      // <-- Get parent or mark as root
                if (!siblingGroups.has(parentId)) {
                    siblingGroups.set(parentId, []);
                }
                siblingGroups.get(parentId).push(node);                        // <-- Add to sibling group
            });
            
            // Apply repulsion within each sibling group
            siblingGroups.forEach(siblings => {                                // <-- For each sibling group
                for (let i = 0; i < siblings.length; i++) {                    // <-- Each sibling
                    for (let j = i + 1; j < siblings.length; j++) {            // <-- Each other sibling
                        const node1 = siblings[i];
                        const node2 = siblings[j];
                        
                        // Calculate distance between siblings
                        const dx = node1.x - node2.x;                          // <-- X distance
                        const dy = node1.y - node2.y;                          // <-- Y distance
                        const dz = node1.z - node2.z;                          // <-- Z distance
                        let distance = Math.sqrt(dx * dx + dy * dy + dz * dz); // <-- 3D distance
                        
                        // Apply repulsion if siblings are too close
                        const siblingDistance = PHYSICS_CONFIG.REPULSION_DISTANCE * 1.5; // <-- Sibling separation
                        if (distance < siblingDistance && distance > 0.1) {    // <-- Within repulsion range
                            const force = PHYSICS_CONFIG.REPULSION_STRENGTH / (distance * distance);
                            
                            // Apply repulsion
                            const fx = (dx / distance) * force;                // <-- X force component
                            const fy = (dy / distance) * force;                // <-- Y force component
                            const fz = (dz / distance) * force;                // <-- Z force component
                            
                            node1.fx += fx;                                     // <-- Apply to node1
                            node1.fy += fy;
                            node1.fz += fz;
                            
                            node2.fx -= fx;                                     // <-- Apply opposite to node2
                            node2.fy -= fy;
                            node2.fz -= fz;
                        }
                    }
                }
            });
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Apply Hierarchical Orbit (Each node orbits its immediate parent)
        // ---------------------------------------------------------------
        applyHierarchicalOrbit(node) {
            const parentId = this.nodeParents.get(node.id);                    // <-- Get immediate parent ID
            if (!parentId) return;                                              // <-- Skip if no parent
            
            const parentNode = this.graphData.nodes.find(n => n.id === parentId); // <-- Find parent node
            if (!parentNode) return;                                            // <-- Skip if parent not found
            
            // Calculate orbital parameters relative to immediate parent
            const dx = node.x - parentNode.x;                                  // <-- X distance from parent
            const dy = node.y - parentNode.y;                                  // <-- Y distance from parent
            const dz = node.z - parentNode.z;                                  // <-- Z distance from parent
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);          // <-- 3D distance from parent
            
            if (distance < 5) return;                                           // <-- Too close for stable orbit
            
            // Calculate orbital speed based on distance from parent (Kepler's laws)
            const depth = this.nodeDepths.get(node.id) || 0;                   // <-- Get orbital depth
            const baseSpeed = PHYSICS_CONFIG.ORBITAL_VELOCITY * (1 + depth * 0.5); // <-- Faster for deeper orbits
            const orbitalSpeed = baseSpeed * Math.sqrt(50 / distance);         // <-- Speed proportional to sqrt(1/r)
            
            // Calculate tangential velocity for 3D orbit around parent
            const positionVector = new THREE.Vector3(dx, dy, dz);              // <-- Position relative to parent
            const upVector = new THREE.Vector3(0, 1, 0);                       // <-- Y-up reference
            
            // Cross product to get orbital direction (perpendicular to position and up)
            const tangentVector = new THREE.Vector3();
            tangentVector.crossVectors(upVector, positionVector);              // <-- Perpendicular orbital direction
            tangentVector.normalize();                                          // <-- Normalize to unit vector
            
            // Add orbital velocity in tangential direction
            node.vx += tangentVector.x * orbitalSpeed;                         // <-- Add tangential X velocity
            node.vy += tangentVector.y * orbitalSpeed * 0.4;                   // <-- Reduced Y velocity for stability
            node.vz += tangentVector.z * orbitalSpeed;                         // <-- Add tangential Z velocity
        }
        // ---------------------------------------------------------------

        // HELPER FUNCTION | Apply Hierarchical Constraints (Maintain proper orbital distances)
        // ---------------------------------------------------------------
        applyHierarchicalConstraints(node) {
            const parentId = this.nodeParents.get(node.id);                    // <-- Get immediate parent ID
            if (!parentId) {                                                    // <-- If no parent (orphan node)
                // Orphan nodes get pulled toward the solar system center
                const distanceFromCenter = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
                const maxOrphanDistance = 600;                                 // <-- Maximum distance for orphans
                
                if (distanceFromCenter > maxOrphanDistance) {                  // <-- Too far from center
                    const scale = maxOrphanDistance / distanceFromCenter;
                    node.x *= scale;
                    node.y *= scale;
                    node.z *= scale;
                }
                return;
            }
            
            const parentNode = this.graphData.nodes.find(n => n.id === parentId); // <-- Find parent node
            if (!parentNode) return;                                            // <-- Skip if parent not found
            
            // Calculate distance from immediate parent
            const dx = node.x - parentNode.x;                                  // <-- X distance from parent
            const dy = node.y - parentNode.y;                                  // <-- Y distance from parent
            const dz = node.z - parentNode.z;                                  // <-- Z distance from parent
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);          // <-- 3D distance from parent
            
            // Calculate ideal orbital range based on depth and node type
            const depth = this.nodeDepths.get(node.id) || 0;                   // <-- Get node depth
            const isFolder = node.isFolder || false;                           // <-- Check if folder
            const baseDistance = PHYSICS_CONFIG.ORBITAL_BASE_RADIUS + 
                               (depth - 1) * PHYSICS_CONFIG.ORBITAL_SPACING;   // <-- Base orbital distance
            
            const minDistance = baseDistance * 0.6;                            // <-- Minimum orbital distance
            const maxDistance = baseDistance * 1.8;                            // <-- Maximum orbital distance
            
            // Constrain node to proper orbital range around its parent
            if (distance < minDistance) {                                       // <-- Too close to parent
                const scale = minDistance / distance;
                node.x = parentNode.x + dx * scale;
                node.y = parentNode.y + dy * scale;
                node.z = parentNode.z + dz * scale;
            } else if (distance > maxDistance) {                               // <-- Too far from parent
                const scale = maxDistance / distance;
                node.x = parentNode.x + dx * scale;
                node.y = parentNode.y + dy * scale;
                node.z = parentNode.z + dz * scale;
            }
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Start Physics Simulation
        // ---------------------------------------------------------------
        startSimulation() {
            this.simulationRunning = true;                                      // <-- Enable simulation
            this.simulationAlpha = 1.0;                                         // <-- Reset energy level
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Stop Physics Simulation
        // ---------------------------------------------------------------
        stopSimulation() {
            this.simulationRunning = false;                                     // <-- Disable simulation
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Toggle Physics Simulation
        // ---------------------------------------------------------------
        toggleSimulation() {
            this.simulationRunning = !this.simulationRunning;                  // <-- Toggle state
            if (this.simulationRunning) {
                this.simulationAlpha = Math.max(this.simulationAlpha, 0.3);    // <-- Restore some energy
            }
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Check if Simulation is Running
        // ---------------------------------------------------------------
        isSimulationRunning() {
            return this.simulationRunning;                                      // <-- Return current state
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Get Simulation Energy Level
        // ---------------------------------------------------------------
        getSimulationAlpha() {
            return this.simulationAlpha;                                        // <-- Return energy level
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Check if Node is Root Node
        // ---------------------------------------------------------------
        isRootNode(nodeId) {
            return this.rootNodes && this.rootNodes.includes(nodeId);          // <-- Check if in root nodes list
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Get Node Hierarchy Data
        // ---------------------------------------------------------------
        getNodeHierarchy() {
            return {
                hierarchy: this.nodeHierarchy,                                  // <-- Parent to children map
                parents: this.nodeParents,                                      // <-- Child to parent map
                depths: this.nodeDepths,                                        // <-- Node depth levels
                roots: this.rootNodes                                           // <-- Root node IDs
            };
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

    // MODULE EXPORT | Export Physics Engine Class
    // ---------------------------------------------------------------
    window.PhysicsEngine3D = PhysicsEngine3D;                                   // <-- Export to global scope
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
