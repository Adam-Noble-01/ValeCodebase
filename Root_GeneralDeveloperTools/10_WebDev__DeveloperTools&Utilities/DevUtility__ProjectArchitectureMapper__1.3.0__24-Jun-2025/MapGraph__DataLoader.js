// =============================================================================
// VALEDESIGNSUITE - PROJECT ARCHITECTURE DATA FETCHER
// =============================================================================
//
// FILE       : MapGraph__DataLoader.js
// NAMESPACE  : GraphData
// MODULE     : ProjectArchitectureDataFetcher
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fetches and manages project file structure data from Flask API
// CREATED    : 2025
//
// DESCRIPTION:
// - Fetches project nodes and edges data from Flask server endpoint
// - Provides centralized data storage for visualization components
// - Handles API errors and provides fallback empty data structure
// - Fires custom events when data is loaded for decoupled initialization
// - This file ONLY handles data - no visualization logic
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Jan-2025 - Version 1.0.0
// - Initial data fetching implementation
// - API integration with Flask backend
// - Error handling and fallback support
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Dynamic Graph Data Loading System
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Graph Data Loading State
    // ------------------------------------------------------------
    window.graphData = null;                                             // <-- Graph data storage
    window.dataLoaded = false;                                           // <-- Loading state flag
    // ---------------------------------------------------------------

    
    // FUNCTION | Load Graph Data from Flask API
    // ------------------------------------------------------------
    async function loadGraphData() {
        try {
            console.log('🔍 Loading project architecture data...');        // Log loading start
            
            const response = await fetch('/api/graph-data');              // Fetch from Flask API
            
            if (!response.ok) {                                           // Check response status
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();                          // Parse JSON response
            
            // Handle API errors
            if (data.error) {                                             // Check for API errors
                throw new Error(`Server error: ${data.error}`);
            }
            
            // Validate data structure
            if (!data.nodes || !data.edges) {                            // Check data structure
                throw new Error('Invalid data structure: missing nodes or edges');
            }
            
            window.graphData = { nodes: data.nodes, edges: data.edges }; // Store graph data globally
            window.dataLoaded = true;                                     // Set loaded flag
            
            // Log detailed success information
            const metadata = data.metadata || {};                        // Get metadata
            console.log(`✅ Loaded ${data.nodes.length} nodes and ${data.edges.length} edges`); // Log success
            if (metadata.scan_time_ms) {
                console.log(`⚡ Server scan time: ${metadata.scan_time_ms}ms`); // Log performance
            }
            if (metadata.root_directory) {
                console.log(`📁 Root directory: ${metadata.root_directory}`); // Log root path
            }
            
            // Fire custom event to notify visualization components
            window.dispatchEvent(new CustomEvent('graphDataLoaded', {    // Fire data loaded event
                detail: { nodes: data.nodes, edges: data.edges, metadata: metadata }
            }));
            
            return data;                                                  // Return loaded data
            
        } catch (error) {
            console.error('❌ Error loading graph data:', error);         // Log error
            
            // Show error message to user
            showErrorMessage(`Failed to load project data: ${error.message}`);
            
            // Fallback to empty data structure
            window.graphData = { nodes: [], edges: [] };                  // Set empty fallback
            window.dataLoaded = true;                                     // Set loaded flag
            
            // Fire event even with empty data
            window.dispatchEvent(new CustomEvent('graphDataLoaded', {    // Fire event with empty data
                detail: { nodes: [], edges: [], error: error.message }
            }));
            
            throw error;                                                  // Re-throw for caller handling
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load New Project Directory
    // ------------------------------------------------------------
    async function loadNewProjectDirectory(directoryPath) {
        try {
            console.log(`📂 Loading new project directory: ${directoryPath}`); // Log directory change
            
            const response = await fetch('/api/change-directory', {       // Call directory change endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ directory_path: directoryPath })
            });
            
            const result = await response.json();                         // Parse response
            
            if (!response.ok || !result.success) {                       // Check for errors
                throw new Error(result.error || 'Failed to change directory');
            }
            
            console.log(`✅ Successfully changed to: ${result.path}`);    // Log success
            
            // Reload graph data from new directory
            window.dataLoaded = false;                                    // Reset loaded flag
            await loadGraphData();                                        // Load new data
            
            return result;                                                // Return result
            
        } catch (error) {
            console.error('❌ Error changing directory:', error);         // Log error
            throw error;                                                  // Re-throw for caller
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Current Directory Status
    // ------------------------------------------------------------
    async function getCurrentDirectoryStatus() {
        try {
            const response = await fetch('/api/directory-status');        // Fetch directory status
            
            if (!response.ok) {                                           // Check response
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();                                 // Return status data
            
        } catch (error) {
            console.error('❌ Error getting directory status:', error);   // Log error
            return null;                                                  // Return null on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Project Path Controls
    // ------------------------------------------------------------
    function initializeProjectPathControls() {
        const pathInput = document.getElementById('project-path-input');  // Get path input element
        const reloadBtn = document.getElementById('reload-project-btn');  // Get reload button element
        const pathStatus = document.getElementById('path-status');        // Get status element
        
        if (!pathInput || !reloadBtn || !pathStatus) return;             // Exit if elements not found
        
        // Load current directory status on initialization
        getCurrentDirectoryStatus().then(status => {                      // Get initial status
            if (status && status.current_path) {                          // If path exists
                pathInput.value = status.current_path;                    // Set input value
                pathStatus.textContent = 'Current project loaded';        // Set status text
                pathStatus.className = 'path-status success';             // Set success style
            }
        });
        
        // Handle reload button click
        reloadBtn.addEventListener('click', async () => {                 // Add click handler
            const newPath = pathInput.value.trim();                       // Get trimmed path
            
            if (!newPath) {                                                // Check for empty path
                pathStatus.textContent = 'Please enter a project directory path';
                pathStatus.className = 'path-status error';
                return;
            }
            
            // Disable controls during loading
            pathInput.disabled = true;                                     // Disable input
            reloadBtn.disabled = true;                                     // Disable button
            pathStatus.textContent = 'Loading project...';                 // Set loading status
            pathStatus.className = 'path-status loading';                  // Set loading style
            
            try {
                await loadNewProjectDirectory(newPath);                    // Load new directory
                pathStatus.textContent = 'Project loaded successfully!';   // Success message
                pathStatus.className = 'path-status success';             // Success style
            } catch (error) {
                pathStatus.textContent = error.message || 'Failed to load project';
                pathStatus.className = 'path-status error';                // Error style
            } finally {
                pathInput.disabled = false;                                // Re-enable input
                reloadBtn.disabled = false;                                // Re-enable button
            }
        });
        
        // Handle Enter key in input
        pathInput.addEventListener('keypress', (event) => {               // Add keypress handler
            if (event.key === 'Enter') {                                  // Check for Enter key
                reloadBtn.click();                                         // Trigger reload
            }
        });
    }
    // ---------------------------------------------------------------


    // FUNCTION | Show Error Message to User
    // ------------------------------------------------------------
    function showErrorMessage(message) {
        const pathStatus = document.getElementById('path-status');
        if (pathStatus) {
            pathStatus.textContent = `❌ ${message}`;
            pathStatus.className = 'path-status error';
        } else {
            alert(message); // fallback
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Graph Data (Async Wrapper)
    // ------------------------------------------------------------
    window.getGraphData = async function() {
        if (!window.dataLoaded) {                                         // Check if data not loaded
            await loadGraphData();                                        // Load data if needed
        }
        return window.graphData;                                          // Return graph data
    };
    // ---------------------------------------------------------------

    // Export new functions for external use
    window.loadNewProjectDirectory = loadNewProjectDirectory;             // Export directory loader
    window.getCurrentDirectoryStatus = getCurrentDirectoryStatus;         // Export status getter
    window.initializeProjectPathControls = initializeProjectPathControls; // Export controls initializer

    // AUTO-INITIALIZATION | Load Data on Script Load
    // ------------------------------------------------------------
    if (document.readyState === 'loading') {                             // Check if document still loading
        document.addEventListener('DOMContentLoaded', () => {             // Wait for DOM ready
            initializeProjectPathControls();                              // Initialize path controls
            loadGraphData();                                              // Load graph data
        });
    } else {
        initializeProjectPathControls();                                  // Initialize path controls immediately
        loadGraphData();                                                  // Load immediately if DOM ready
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------