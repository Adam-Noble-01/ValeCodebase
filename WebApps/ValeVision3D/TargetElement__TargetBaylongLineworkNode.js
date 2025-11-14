// #Region ------------------------------------------------
// MODEL TARGETING | Targets and retrieves model elements from scene
// --------------------------------------------------------

// FUNCTION | SmoothNormalsByAngle - Smooths normals based on angle threshold (SketchUp-style)
// --------------------------------------------------------
function SmoothNormalsByAngle(mesh, angleThresholdDegrees = 20) {
    if (!mesh || !mesh.geometry) {
        console.warn('SmoothNormalsByAngle: Invalid mesh provided');
        return;
    }

    // Convert angle threshold to radians
    // ------------------------------------
    const angleThresholdRad = BABYLON.Tools.ToRadians(angleThresholdDegrees);
    const cosThreshold = Math.cos(angleThresholdRad);


    // Get vertex data from mesh
    // ------------------------------------
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);

    if (!positions || !indices || !normals) {
        console.warn('SmoothNormalsByAngle: Mesh missing required vertex data');
        return;
    }


    // Calculate face normals for all triangles
    // ------------------------------------
    const faceNormals = [];
    const vertexToFaces = new Map(); // Map vertex index to array of face indices

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        // Get vertex positions
        const v0 = new BABYLON.Vector3(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
        const v1 = new BABYLON.Vector3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
        const v2 = new BABYLON.Vector3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);

        // Calculate face normal
        const edge1 = v1.subtract(v0);
        const edge2 = v2.subtract(v0);
        const faceNormal = BABYLON.Vector3.Cross(edge1, edge2).normalize();

        const faceIndex = i / 3;
        faceNormals.push(faceNormal);

        // Map vertices to faces
        [i0, i1, i2].forEach(vertexIndex => {
            if (!vertexToFaces.has(vertexIndex)) {
                vertexToFaces.set(vertexIndex, []);
            }
            vertexToFaces.get(vertexIndex).push(faceIndex);
        });
    }


    // Calculate smoothed normals for each vertex
    // ------------------------------------
    const newNormals = new Float32Array(normals.length);

    for (let vertexIndex = 0; vertexIndex < positions.length / 3; vertexIndex++) {
        const faces = vertexToFaces.get(vertexIndex) || [];
        
        if (faces.length === 0) {
            // No faces, keep original normal
            newNormals[vertexIndex * 3] = normals[vertexIndex * 3];
            newNormals[vertexIndex * 3 + 1] = normals[vertexIndex * 3 + 1];
            newNormals[vertexIndex * 3 + 2] = normals[vertexIndex * 3 + 2];
            continue;
        }

        // Group faces by angle threshold (transitive smoothing)
        // Find all faces that should be smoothed together
        // Uses transitive closure: if A~B and B~C, then A~B~C are grouped
        const smoothedGroups = [];
        const processedFaces = new Set();

        for (let i = 0; i < faces.length; i++) {
            if (processedFaces.has(faces[i])) continue;

            const group = [faces[i]];
            processedFaces.add(faces[i]);
            let changed = true;

            // Transitive closure: keep adding faces until no more can be added
            while (changed) {
                changed = false;

                // Check all faces in current group against all other faces
                for (let groupIdx = 0; groupIdx < group.length; groupIdx++) {
                    const baseFaceIndex = group[groupIdx];
                    const baseNormal = faceNormals[baseFaceIndex];

                    for (let j = 0; j < faces.length; j++) {
                        if (processedFaces.has(faces[j])) continue;

                        const otherNormal = faceNormals[faces[j]];
                        const dotProduct = BABYLON.Vector3.Dot(baseNormal, otherNormal);

                        // Check if angle is within threshold (using cosine)
                        if (dotProduct >= cosThreshold) {
                            group.push(faces[j]);
                            processedFaces.add(faces[j]);
                            changed = true;
                        }
                    }
                }
            }

            smoothedGroups.push(group);
        }

        // Average normals for each smoothed group
        const averagedNormals = smoothedGroups.map(group => {
            const avgNormal = new BABYLON.Vector3(0, 0, 0);
            group.forEach(faceIndex => {
                avgNormal.addInPlace(faceNormals[faceIndex]);
            });
            return avgNormal.normalize();
        });

        // Weight average based on group sizes (larger groups have more influence)
        const finalNormal = new BABYLON.Vector3(0, 0, 0);
        let totalWeight = 0;

        smoothedGroups.forEach((group, groupIndex) => {
            const weight = group.length;
            finalNormal.addInPlace(averagedNormals[groupIndex].scale(weight));
            totalWeight += weight;
        });

        if (totalWeight > 0) {
            finalNormal.scaleInPlace(1 / totalWeight).normalize();
        }

        // Store smoothed normal
        newNormals[vertexIndex * 3] = finalNormal.x;
        newNormals[vertexIndex * 3 + 1] = finalNormal.y;
        newNormals[vertexIndex * 3 + 2] = finalNormal.z;
    }


    // Update mesh with smoothed normals
    // ------------------------------------
    mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, newNormals);
    console.log(`SmoothNormalsByAngle: Applied ${angleThresholdDegrees}° smoothing to mesh "${mesh.name}"`);
}
// --------------------------------------------------------


// FUNCTION | SmoothNormalsForNode - Smooths normals for all meshes in a transform node
// --------------------------------------------------------
function SmoothNormalsForNode(node, angleThresholdDegrees = 20) {
    if (!node) {
        console.warn('SmoothNormalsForNode: Invalid node provided');
        return;
    }

    const meshes = new Set();

    // If node is itself a mesh, include it
    // ------------------------------------
    if (node.getVerticesData && node.geometry) {
        meshes.add(node);
    }

    // Collect all child meshes recursively
    // ------------------------------------
    if (node.getChildMeshes) {
        const childMeshes = node.getChildMeshes(false);
        childMeshes.forEach(mesh => {
            if (mesh.getVerticesData && mesh.geometry) {
                meshes.add(mesh);
            }
        });
    }

    // Also check for descendants recursively
    // ------------------------------------
    const collectMeshesRecursive = (currentNode) => {
        if (currentNode.getChildren) {
            currentNode.getChildren().forEach(child => {
                if (child.getVerticesData && child.geometry) {
                    meshes.add(child);
                }
                collectMeshesRecursive(child);
            });
        }
    };
    collectMeshesRecursive(node);

    // Convert Set to Array for processing
    const meshArray = Array.from(meshes);

    // Apply smoothing to each mesh
    // ------------------------------------
    meshArray.forEach(mesh => {
        SmoothNormalsByAngle(mesh, angleThresholdDegrees);
    });

    console.log(`SmoothNormalsForNode: Processed ${meshArray.length} mesh(es) from node "${node.name}"`);
}
// --------------------------------------------------------


// FUNCTION | TargetElement__TargetBaylongLineworkNode - Targets and retrieves model elements from scene
// --------------------------------------------------------
async function TargetElement__TargetBaylongLineworkNode(scene) {
    // Wait for the model to finish loading
    // ------------------------------------
    await loadGLBModel();


    // Get the main model root by name
    // ------------------------------------
    const modelRoot = scene.getTransformNodeByName("ValeVision__MainModel__ModelRoot");


    // Get a specific known child node (example: EdgeLayer_Layer0)
    // ------------------------------------
    const edgeLayerNode = scene.getTransformNodeByName("EdgeLayer_Layer0");


    // Smooth normals with 20-degree threshold (SketchUp-style)
    // ------------------------------------
    if (edgeLayerNode) {
        SmoothNormalsForNode(edgeLayerNode, 20);
    } else {
        console.warn('TargetElement__TargetBaylongLineworkNode: EdgeLayer_Layer0 node not found');
    }


    // Return references for other functions
    // ------------------------------------
    return { modelRoot, edgeLayerNode };
}
// --------------------------------------------------------

// #endregion ---------------------------------------------
