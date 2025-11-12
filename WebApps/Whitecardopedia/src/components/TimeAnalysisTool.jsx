// =============================================================================
// WHITECARDOPEDIA - TIME ANALYSIS TOOL COMPONENT
// =============================================================================
//
// FILE       : TimeAnalysisTool.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : TimeAnalysisTool Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Data loading, processing, and D3.js visualization logic
// CREATED    : 24-Oct-2025
//
// DESCRIPTION:
// - Loads and processes project.json files from Whitecardopedia 2025 projects
// - Aggregates artist productivity and timeline data
// - Creates interactive D3.js visualizations (bar charts, Gantt timeline)
// - Generates statistics tables and efficiency metrics
// - All dimensions follow Vale Design Suite standards
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | TimeAnalysisTool Component
// -----------------------------------------------------------------------------

    // COMPONENT | Time Analysis Visualization Tool
    // ------------------------------------------------------------
    function TimeAnalysisTool({ onBack }) {
        
        // -----------------------------------------------------------------------------
        // REGION | Module Constants and Configuration
        // -----------------------------------------------------------------------------

            // MODULE CONSTANTS | Application Configuration Values
            // ------------------------------------------------------------
            const BASE_PATH         = 'Projects/2025/';                              // <-- Relative path to projects
            const EXCLUDED_FOLDERS  = ['__BACKUP__', '01__TemplateProject', '00__ExampleProject']; // <-- Folders to skip (client-side fallback)
            const DISCOVER_API_URL  = '/api/projects/discover';                     // <-- API endpoint for project discovery
            
            // Color palette for artists
            const ARTIST_COLORS     = [
                '#4a90e2', '#52c41a', '#fa8c16', '#f5222d', '#722ed1',
                '#13c2c2', '#eb2f96', '#faad14', '#1890ff', '#a0d911'
            ];
            // ------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Component State Management
        // -----------------------------------------------------------------------------

            // MODULE VARIABLES | Application State
            // ------------------------------------------------------------
            const [allProjects, setAllProjects] = React.useState([]);              // <-- Array of all loaded project data
            const [artistStats, setArtistStats] = React.useState({});               // <-- Aggregated statistics by artist
            const [projectsLoaded, setProjectsLoaded] = React.useState(false);      // <-- Flag to track if data is loaded
            const [loadingStatus, setLoadingStatus] = React.useState('');           // <-- Loading status message
            const [loadingStatusClass, setLoadingStatusClass] = React.useState('');  // <-- Loading status CSS class
            // ------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | React Effects and Lifecycle Management
        // -----------------------------------------------------------------------------

            // EFFECT | Load All Project Data on Mount
            // ---------------------------------------------------------------
            React.useEffect(() => {
                loadAllProjectData();                                               // <-- Load data when component mounts
            }, []);
            // ---------------------------------------------------------------

            // EFFECT | Render Visualizations When Data Loads
            // ---------------------------------------------------------------
            React.useEffect(() => {
                if (projectsLoaded && Object.keys(artistStats).length > 0) {         // <-- Check if data is ready
                    renderAllVisualizations();                                      // <-- Render all charts and tables
                }
            }, [projectsLoaded, artistStats]);
            // ---------------------------------------------------------------

            // EFFECT | Handle Window Resize for Responsive Charts
            // ---------------------------------------------------------------
            React.useEffect(() => {
                if (!projectsLoaded || Object.keys(artistStats).length === 0) return; // <-- Exit if data not loaded
                
                let resizeTimeout;                                                   // <-- Debounce timer variable
                
                const handleResize = () => {                                         // <-- Resize handler function
                    clearTimeout(resizeTimeout);                                     // <-- Clear existing timeout
                    resizeTimeout = setTimeout(() => {                               // <-- Debounce resize events
                        if (projectsLoaded && Object.keys(artistStats).length > 0) { // <-- Check if data is ready
                            renderAllVisualizations();                              // <-- Re-render all charts on resize
                        }
                    }, 250);                                                         // <-- 250ms debounce delay
                };
                
                window.addEventListener('resize', handleResize);                     // <-- Add resize event listener
                
                return () => {                                                       // <-- Cleanup function
                    window.removeEventListener('resize', handleResize);              // <-- Remove resize listener
                    clearTimeout(resizeTimeout);                                     // <-- Clear timeout on unmount
                };
            }, [projectsLoaded, artistStats]);
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Data Loading Functions
        // -----------------------------------------------------------------------------

            // FUNCTION | Load All Project JSON Files from Directory
            // ------------------------------------------------------------
            async function loadAllProjectData() {
                setLoadingStatus('Loading project data...');                         // <-- Update status message
                setLoadingStatusClass('status-message loading');                      // <-- Apply loading style
                
                const loadedProjects = [];                                            // <-- Local array to collect projects
                
                try {
                    const projectFolders = await getProjectFolders();                // <-- Get list of project folders
                    
                    for (const folder of projectFolders) {                           // <-- Iterate through each folder
                        if (shouldSkipFolder(folder)) continue;                      // <-- Skip excluded folders
                        
                        const projectData = await loadProjectFile(folder);           // <-- Load project.json from folder
                        if (projectData) {                                           // <-- If data loaded successfully
                            loadedProjects.push(projectData);                        // <-- Add to local array
                        }
                    }
                    
                    setAllProjects(loadedProjects);                                   // <-- Update projects state
                    setLoadingStatus(`Successfully loaded ${loadedProjects.length} projects`); // <-- Update success message
                    setLoadingStatusClass('status-message success');                  // <-- Apply success style
                    
                    processArtistStatistics(loadedProjects);                          // <-- Process and aggregate artist data
                    
                } catch (error) {
                    setLoadingStatus(`Error loading data: ${error.message}`);          // <-- Show error message
                    setLoadingStatusClass('status-message error');                   // <-- Apply error style
                    console.error('Error loading project data:', error);             // <-- Log error details
                }
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Get List of Project Folders via Discovery API
            // ---------------------------------------------------------------
            async function getProjectFolders() {
                try {
                    const response = await fetch(DISCOVER_API_URL);                 // <-- Fetch from discovery endpoint
                    
                    if (!response.ok) {                                             // <-- Check if fetch failed
                        throw new Error(`Discovery API returned ${response.status}`); // <-- Throw error for failed response
                    }
                    
                    const data = await response.json();                             // <-- Parse JSON response
                    
                    if (data.error) {                                               // <-- Check for API error message
                        throw new Error(data.error);                                 // <-- Throw error from API
                    }
                    
                    return data.folders || [];                                      // <-- Return discovered folders array
                    
                } catch (error) {
                    console.error('Error discovering project folders:', error);     // <-- Log discovery error
                    setLoadingStatus(`Warning: Could not discover projects automatically. ${error.message}`); // <-- Update status
                    setLoadingStatusClass('status-message error');                  // <-- Apply error style
                    return [];                                                      // <-- Return empty array on error
                }
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Check if Folder Should Be Skipped
            // ---------------------------------------------------------------
            function shouldSkipFolder(folderName) {
                return EXCLUDED_FOLDERS.some(excluded =>                           // <-- Check if folder matches exclusion list
                    folderName.includes(excluded)
                );
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Load Individual Project JSON File
            // ---------------------------------------------------------------
            async function loadProjectFile(folderName) {
                try {
                    const filePath = `${BASE_PATH}${folderName}/project.json`;     // <-- Construct full file path
                    const response = await fetch(filePath);                         // <-- Fetch JSON file
                    
                    if (!response.ok) {                                             // <-- Check if fetch failed
                        console.warn(`Could not load ${folderName}`);               // <-- Log warning
                        return null;                                                // <-- Return null on failure
                    }
                    
                    const data = await response.json();                             // <-- Parse JSON data
                    return data;                                                    // <-- Return parsed data
                    
                } catch (error) {
                    console.warn(`Error loading ${folderName}:`, error);            // <-- Log error
                    return null;                                                    // <-- Return null on error
                }
            }
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Data Processing and Aggregation Functions
        // -----------------------------------------------------------------------------

            // FUNCTION | Process and Aggregate Artist Statistics
            // ------------------------------------------------------------
            function processArtistStatistics(loadedProjects) {
                const stats = {};                                                // <-- Initialize artist statistics
                
                loadedProjects.forEach(project => {                              // <-- Iterate through each project
                    const artist = project.productionData?.conceptArtist;         // <-- Get artist name
                    if (!artist) return;                                         // <-- Skip if no artist specified
                    
                    if (!stats[artist]) {                                        // <-- Initialize artist entry if needed
                        stats[artist] = {
                            name                : artist,                        // <-- Artist name
                            projectCount        : 0,                             // <-- Number of projects
                            totalTimeAllocated  : 0,                             // <-- Total hours allocated
                            totalTimeTaken      : 0,                             // <-- Total hours actually taken
                            projects            : [],                            // <-- Array of project references
                            earliestDate        : null,                          // <-- First project date
                            latestDate          : null                           // <-- Last project date
                        };
                    }
                    
                    const artistStat = stats[artist];                            // <-- Get artist stats reference
                    artistStat.projectCount++;                                   // <-- Increment project count
                    artistStat.totalTimeAllocated += project.scheduleData?.timeAllocated || 0; // <-- Add allocated hours
                    artistStat.totalTimeTaken += project.scheduleData?.timeTaken || 0; // <-- Add actual hours
                    artistStat.projects.push(project);                          // <-- Add project to artist's list
                    
                    updateArtistDateRange(artistStat, project);                  // <-- Update date range for artist
                });
                
                setArtistStats(stats);                                           // <-- Update artist stats state
                setProjectsLoaded(true);                                         // <-- Mark data as loaded
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Update Artist Date Range
            // ---------------------------------------------------------------
            function updateArtistDateRange(stats, project) {
                const receivedDate = parseDate(project.scheduleData?.dateReceived);  // <-- Parse received date
                const fulfilledDate = parseDate(project.scheduleData?.dateFulfilled); // <-- Parse fulfilled date
                
                if (!stats.earliestDate || receivedDate < stats.earliestDate) {      // <-- Update earliest date if needed
                    stats.earliestDate = receivedDate;
                }
                
                if (!stats.latestDate || fulfilledDate > stats.latestDate) {         // <-- Update latest date if needed
                    stats.latestDate = fulfilledDate;
                }
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Update Data Summary Display
            // ---------------------------------------------------------------
            function updateDataSummary() {
                const artistCount = Object.keys(artistStats).length;                // <-- Count unique artists
                const projectCount = allProjects.length;                             // <-- Count total projects
                
                // Summary is displayed in the component render
                return `${projectCount} projects • ${artistCount} artists`;          // <-- Return summary text
            }
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Date Utility Functions
        // -----------------------------------------------------------------------------

            // HELPER FUNCTION | Parse Date String (DD-MMM-YYYY format)
            // ---------------------------------------------------------------
            function parseDate(dateStr) {
                if (!dateStr) return new Date();                                    // <-- Return current date if invalid
                
                const months = {                                                    // <-- Month abbreviation mapping
                    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                };
                
                const parts = dateStr.split('-');                                   // <-- Split date string
                const day = parseInt(parts[0]);                                      // <-- Extract day
                const month = months[parts[1]];                                    // <-- Extract month
                const year = parseInt(parts[2]);                                    // <-- Extract year
                
                return new Date(year, month, day);                                  // <-- Return Date object
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Format Date for Display
            // ---------------------------------------------------------------
            function formatDate(date) {
                if (!date) return 'N/A';                                            // <-- Return N/A if no date
                return date.toLocaleDateString('en-GB', {                          // <-- Format as DD MMM YYYY
                    day: '2-digit', month: 'short', year: 'numeric'
                });
            }
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Calculation Helper Functions
        // -----------------------------------------------------------------------------

            // HELPER FUNCTION | Calculate Average Turnaround Time for Artist
            // ---------------------------------------------------------------
            function calculateAverageTurnaround(artist) {
                const turnarounds = artist.projects.map(p => calculateTurnaroundDays(p)); // <-- Get all turnaround times
                const avg = turnarounds.reduce((sum, val) => sum + val, 0) / turnarounds.length; // <-- Calculate average
                return avg.toFixed(1);                                              // <-- Return rounded to 1 decimal
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Calculate Turnaround Days for Single Project
            // ---------------------------------------------------------------
            function calculateTurnaroundDays(project) {
                const start = parseDate(project.scheduleData?.dateReceived);       // <-- Parse start date
                const end = parseDate(project.scheduleData?.dateFulfilled);        // <-- Parse end date
                const diffTime = Math.abs(end - start);                             // <-- Calculate time difference
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));      // <-- Convert to days
                return diffDays === 0 ? 1 : diffDays;                               // <-- Treat same-day deliveries as 1 day
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Calculate Efficiency Percentage
            // ---------------------------------------------------------------
            function calculateEfficiency(artist) {
                if (artist.totalTimeTaken === 0) return 100;                        // <-- Perfect efficiency if no time taken
                const efficiency = (artist.totalTimeAllocated / artist.totalTimeTaken) * 100; // <-- Calculate percentage
                return efficiency.toFixed(0);                                       // <-- Return rounded to integer
            }
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Visualization Rendering Functions
        // -----------------------------------------------------------------------------

            // FUNCTION | Render All Visualizations
            // ------------------------------------------------------------
            function renderAllVisualizations() {
                renderBarChart();                                                   // <-- Render artist productivity bar chart
                renderTimelineChart();                                              // <-- Render project timeline chart
                renderStatisticsTable();                                            // <-- Render statistics table
                renderEfficiencyLegend();                                           // <-- Render efficiency legend
                renderEfficiencyChart();                                            // <-- Render efficiency comparison chart
                populateArtistFilter();                                              // <-- Populate artist filter dropdown
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Populate Artist Filter Dropdown
            // ---------------------------------------------------------------
            function populateArtistFilter() {
                const select = document.getElementById('artistFilter');               // <-- Get select element
                if (!select) return;                                                // <-- Exit if element not found
                
                select.innerHTML = '<option value="all">All Artists</option>';      // <-- Reset with default option
                
                Object.keys(artistStats).sort().forEach(artist => {                 // <-- Iterate through sorted artists
                    const option = document.createElement('option');                // <-- Create option element
                    option.value = artist;                                          // <-- Set option value
                    option.textContent = artist;                                    // <-- Set option text
                    select.appendChild(option);                                     // <-- Add to select
                });
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Horizontal Bar Chart of Projects Per Artist
            // ------------------------------------------------------------
            function renderBarChart() {
                const container = document.getElementById('barChart');               // <-- Get chart container
                if (!container) return;                                             // <-- Exit if container not found
                
                container.innerHTML = '';                                           // <-- Clear existing content
                
                const data = Object.values(artistStats)                             // <-- Get artist stats array
                    .sort((a, b) => b.projectCount - a.projectCount);              // <-- Sort by project count descending
                
                if (data.length === 0) return;                                      // <-- Exit if no data
                
                const margin = { top: 20, right: 30, bottom: 40, left: 100 };      // <-- Define chart margins
                const containerWidth = container.clientWidth || container.offsetWidth || 900; // <-- Get container width with fallback
                const width = Math.max(400, containerWidth - margin.left - margin.right); // <-- Calculate chart width dynamically
                const height = Math.max(400, data.length * 40) - margin.top - margin.bottom; // <-- Dynamic height
                
                const svg = d3.select('#barChart')                                  // <-- Create SVG element
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);
                
                const x = d3.scaleLinear()                                          // <-- Create x scale
                    .domain([0, d3.max(data, d => d.projectCount)])
                    .range([0, width]);
                
                const y = d3.scaleBand()                                            // <-- Create y scale
                    .domain(data.map(d => d.name))
                    .range([0, height])
                    .padding(0.2);
                
                const colorScale = d3.scaleOrdinal()                                // <-- Create color scale
                    .domain(data.map(d => d.name))
                    .range(ARTIST_COLORS);
                
                // Add gridlines
                svg.append('g')                                                     // <-- Add vertical gridlines
                    .attr('class', 'grid')
                    .call(d3.axisBottom(x)
                        .tickSize(height)
                        .tickFormat('')
                    );
                
                // Draw bars
                svg.selectAll('.bar')                                               // <-- Create bars
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', 0)
                    .attr('y', d => y(d.name))
                    .attr('width', d => x(d.projectCount))
                    .attr('height', y.bandwidth())
                    .attr('fill', d => colorScale(d.name))
                    .on('mouseover', showTooltip)                                   // <-- Show tooltip on hover
                    .on('mouseout', hideTooltip);                                   // <-- Hide tooltip on mouse out
                
                // Add value labels
                svg.selectAll('.label')                                             // <-- Add count labels
                    .data(data)
                    .enter()
                    .append('text')
                    .attr('class', 'label')
                    .attr('x', d => x(d.projectCount) + 5)
                    .attr('y', d => y(d.name) + y.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .text(d => d.projectCount)
                    .style('font-size', '12px')
                    .style('fill', '#666');
                
                // Add axes
                svg.append('g')                                                     // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x).ticks(5));
                
                svg.append('g')                                                     // <-- Add y axis
                    .attr('class', 'axis')
                    .call(d3.axisLeft(y));
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Timeline Chart Showing Project Duration
            // ------------------------------------------------------------
            function renderTimelineChart() {
                const container = document.getElementById('timelineChart');          // <-- Get chart container
                if (!container) return;                                             // <-- Exit if container not found
                
                container.innerHTML = '';                                            // <-- Clear existing content
                
                const groupByArtist = document.getElementById('groupByArtist')?.checked || false; // <-- Check grouping option
                const filterArtist = document.getElementById('artistFilter')?.value || 'all'; // <-- Get filter value
                
                let projectsToShow = allProjects.filter(p => {                       // <-- Filter projects
                    if (filterArtist === 'all') return true;
                    return p.productionData?.conceptArtist === filterArtist;
                });
                
                if (projectsToShow.length === 0) {                                  // <-- Check if no projects to show
                    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No projects to display</p>';
                    return;
                }
                
                const margin = { top: 40, right: 30, bottom: 60, left: 200 };      // <-- Define chart margins
                const containerWidth = container.clientWidth || container.offsetWidth || 1100; // <-- Get container width with fallback
                const width = Math.max(400, containerWidth - margin.left - margin.right); // <-- Calculate chart width dynamically
                const height = Math.max(400, projectsToShow.length * 30) - margin.top - margin.bottom; // <-- Dynamic height
                
                const svg = d3.select('#timelineChart')                             // <-- Create SVG element
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);
                
                const allDates = projectsToShow.flatMap(p => [                       // <-- Get all dates for scale
                    parseDate(p.scheduleData?.dateReceived),
                    parseDate(p.scheduleData?.dateFulfilled)
                ]);
                
                const x = d3.scaleTime()                                            // <-- Create time scale
                    .domain([d3.min(allDates), d3.max(allDates)])
                    .range([0, width]);
                
                if (groupByArtist) {                                                 // <-- Group by artist if enabled
                    projectsToShow.sort((a, b) => {
                        const artistA = a.productionData?.conceptArtist || '';
                        const artistB = b.productionData?.conceptArtist || '';
                        return artistA.localeCompare(artistB);
                    });
                }
                
                const y = d3.scaleBand()                                            // <-- Create y scale
                    .domain(projectsToShow.map((p, i) => i))
                    .range([0, height])
                    .padding(0.3);
                
                const colorScale = d3.scaleOrdinal()                                // <-- Create color scale
                    .domain(Object.keys(artistStats))
                    .range(ARTIST_COLORS);
                
                // Add gridlines
                svg.append('g')                                                     // <-- Add vertical gridlines
                    .attr('class', 'grid')
                    .call(d3.axisBottom(x)
                        .ticks(10)
                        .tickSize(height)
                        .tickFormat('')
                    );
                
                // Draw timeline bars
                svg.selectAll('.timeline-bar')                                      // <-- Create timeline bars
                    .data(projectsToShow)
                    .enter()
                    .append('rect')
                    .attr('class', 'timeline-bar bar')
                    .attr('x', d => x(parseDate(d.scheduleData?.dateReceived)))
                    .attr('y', (d, i) => y(i))
                    .attr('width', d => {
                        const start = parseDate(d.scheduleData?.dateReceived);
                        const end = parseDate(d.scheduleData?.dateFulfilled);
                        const calculatedWidth = x(end) - x(start);
                        return Math.max(calculatedWidth, 3);                        // <-- Minimum 3px width for same-day deliveries
                    })
                    .attr('height', y.bandwidth())
                    .attr('fill', d => colorScale(d.productionData?.conceptArtist))
                    .attr('rx', 4)
                    .on('mouseover', showTimelineTooltip)                           // <-- Show tooltip on hover
                    .on('mouseout', hideTooltip);                                    // <-- Hide tooltip on mouse out
                
                // Add project labels
                svg.selectAll('.project-label')                                     // <-- Add project name labels
                    .data(projectsToShow)
                    .enter()
                    .append('text')
                    .attr('class', 'project-label')
                    .attr('x', -5)
                    .attr('y', (d, i) => y(i) + y.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .attr('text-anchor', 'end')
                    .text(d => `${d.projectName} (${d.productionData?.conceptArtist})`)
                    .style('font-size', '11px')
                    .style('fill', '#333');
                
                // Add axes
                svg.append('g')                                                     // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.timeFormat('%d %b')))
                    .selectAll('text')
                    .attr('transform', 'rotate(-45)')
                    .style('text-anchor', 'end');
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Statistics Table with Artist Metrics
            // ------------------------------------------------------------
            function renderStatisticsTable() {
                const container = document.getElementById('statisticsTable');       // <-- Get table container
                if (!container) return;                                              // <-- Exit if container not found
                
                container.innerHTML = '';                                            // <-- Clear existing content
                
                const data = Object.values(artistStats)                            // <-- Get artist stats array
                    .sort((a, b) => {                                               // <-- Sort by efficiency (highest to lowest)
                        const efficiencyA = parseFloat(calculateEfficiency(a));     // <-- Calculate efficiency for artist A
                        const efficiencyB = parseFloat(calculateEfficiency(b));     // <-- Calculate efficiency for artist B
                        return efficiencyB - efficiencyA;                           // <-- Sort descending by efficiency
                    });
                
                if (data.length === 0) return;                                      // <-- Exit if no data
                
                const table = document.createElement('table');                       // <-- Create table element
                table.className = 'stats-table';                                   // <-- Apply table styling
                
                // Create table header
                const thead = document.createElement('thead');                      // <-- Create table header
                thead.innerHTML = `
                    <tr>
                        <th>Artist</th>
                        <th class="number-cell">Projects</th>
                        <th class="number-cell">Avg Turnaround</th>
                        <th class="number-cell">Hours Allocated</th>
                        <th class="number-cell">Hours Taken</th>
                        <th class="number-cell">Efficiency</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                // Create table body
                const tbody = document.createElement('tbody');                      // <-- Create table body
                
                data.forEach(artist => {                                            // <-- Iterate through each artist
                    const avgTurnaround = calculateAverageTurnaround(artist);       // <-- Calculate average turnaround
                    const efficiency = calculateEfficiency(artist);                 // <-- Calculate efficiency percentage
                    
                    const row = document.createElement('tr');                       // <-- Create table row
                    row.innerHTML = `
                        <td><strong>${artist.name}</strong></td>
                        <td class="number-cell">${artist.projectCount}</td>
                        <td class="number-cell">${avgTurnaround} days</td>
                        <td class="number-cell">${artist.totalTimeAllocated}h</td>
                        <td class="number-cell">${artist.totalTimeTaken}h</td>
                        <td class="number-cell">${efficiency}%</td>
                    `;
                    tbody.appendChild(row);                                          // <-- Add row to table body
                });
                
                table.appendChild(tbody);                                            // <-- Add body to table
                container.appendChild(table);                                       // <-- Add table to container
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Render Efficiency Legend in HTML Container
            // ---------------------------------------------------------------
            function renderEfficiencyLegend() {
                const legendContainer = document.getElementById('efficiencyLegend');   // <-- Get legend container
                if (!legendContainer) return;                                         // <-- Exit if container not found
                
                legendContainer.innerHTML = '';                                       // <-- Clear existing content
                
                // Create legend HTML structure
                const legend = document.createElement('div');                          // <-- Create legend wrapper
                legend.className = 'chart-legend-html';                              // <-- Apply CSS class
                
                // Allocated legend item
                const allocatedItem = document.createElement('div');                   // <-- Create allocated item
                allocatedItem.className = 'legend-item-html';
                allocatedItem.innerHTML = `
                    <span class="legend-rect-html allocated"></span>
                    <span class="legend-text-html">Allocated</span>
                `;
                legend.appendChild(allocatedItem);
                
                // Actual (under) legend item
                const underItem = document.createElement('div');                       // <-- Create under item
                underItem.className = 'legend-item-html';
                underItem.innerHTML = `
                    <span class="legend-rect-html actual-under"></span>
                    <span class="legend-text-html">Actual (Under)</span>
                `;
                legend.appendChild(underItem);
                
                // Actual (over) legend item
                const overItem = document.createElement('div');                        // <-- Create over item
                overItem.className = 'legend-item-html';
                overItem.innerHTML = `
                    <span class="legend-rect-html actual-over"></span>
                    <span class="legend-text-html">Actual (Over)</span>
                `;
                legend.appendChild(overItem);
                
                legendContainer.appendChild(legend);                                  // <-- Add legend to container
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Efficiency Comparison Chart
            // ------------------------------------------------------------
            function renderEfficiencyChart() {
                const container = document.getElementById('efficiencyChart');       // <-- Get chart container
                if (!container) return;                                             // <-- Exit if container not found
                
                container.innerHTML = '';                                           // <-- Clear existing content
                
                const data = Object.values(artistStats)                            // <-- Get artist stats array
                    .sort((a, b) => {                                               // <-- Sort by efficiency (highest to lowest)
                        const efficiencyA = parseFloat(calculateEfficiency(a));     // <-- Calculate efficiency for artist A
                        const efficiencyB = parseFloat(calculateEfficiency(b));     // <-- Calculate efficiency for artist B
                        return efficiencyB - efficiencyA;                           // <-- Sort descending by efficiency
                    });
                
                if (data.length === 0) return;                                      // <-- Exit if no data
                
                // Calculate container width accounting for padding
                const containerRect = container.getBoundingClientRect();             // <-- Get container dimensions
                const containerStyle = window.getComputedStyle(container);          // <-- Get computed styles
                const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;      // <-- Get left padding
                const paddingRight = parseFloat(containerStyle.paddingRight) || 0;   // <-- Get right padding
                const availableWidth = containerRect.width - paddingLeft - paddingRight; // <-- Calculate available width
                
                const margin = { top: 20, right: 30, bottom: 50, left: 120 };      // <-- Define chart margins (reduced top since legend is in HTML)
                const width = Math.max(500, availableWidth - margin.left - margin.right); // <-- Calculate chart width dynamically
                const height = Math.max(400, data.length * 60) - margin.top - margin.bottom; // <-- Dynamic height with more spacing
                
                // Ensure SVG doesn't exceed container width
                const totalSVGWidth = width + margin.left + margin.right;           // <-- Total SVG width
                const maxSVGWidth = availableWidth;                                 // <-- Maximum allowed SVG width
                const finalSVGWidth = Math.min(totalSVGWidth, maxSVGWidth);         // <-- Use smaller value
                
                const svg = d3.select('#efficiencyChart')                           // <-- Create SVG element
                    .append('svg')
                    .attr('width', finalSVGWidth)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);
                
                const maxHours = d3.max(data, d => Math.max(d.totalTimeAllocated, d.totalTimeTaken)); // <-- Get max hours for scale
                const domainMax = Math.ceil(maxHours * 1.02);                        // <-- Add minimal 2% padding to prevent edge clipping
                const x = d3.scaleLinear()                                          // <-- Create x scale
                    .domain([0, domainMax])
                    .range([0, width]);
                
                const y = d3.scaleBand()                                            // <-- Create y scale
                    .domain(data.map(d => d.name))
                    .range([0, height])
                    .padding(0.4);                                                  // <-- More padding for clarity
                
                // Add gridlines
                svg.append('g')                                                     // <-- Add vertical gridlines
                    .attr('class', 'grid')
                    .call(d3.axisBottom(x)
                        .ticks(8)
                        .tickSize(-height)
                        .tickFormat('')
                    );
                
                // Create grouped bar chart - side by side bars
                const barWidth = y.bandwidth() * 0.35;                              // <-- Width of each bar (35% of band)
                const barSpacing = y.bandwidth() * 0.1;                             // <-- Space between bars
                const barStartY = (y.bandwidth() - (barWidth * 2 + barSpacing)) / 2; // <-- Center bars vertically
                
                // Draw allocated time bars (left side)
                svg.selectAll('.bar-allocated')                                     // <-- Create allocated time bars
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('class', 'bar-allocated bar')
                    .attr('x', 0)
                    .attr('y', d => y(d.name) + barStartY)
                    .attr('width', d => Math.min(x(d.totalTimeAllocated), width))   // <-- Ensure bar doesn't exceed width
                    .attr('height', barWidth)
                    .attr('rx', 3)                                                   // <-- Rounded corners
                    .on('mouseover', (event, d) => showEfficiencyTooltip(event, d, 'allocated'))
                    .on('mouseout', hideTooltip);
                
                // Add allocated value labels
                svg.selectAll('.label-allocated')                                    // <-- Add allocated value labels
                    .data(data)
                    .enter()
                    .append('text')
                    .attr('class', 'label-allocated')
                    .attr('x', d => {
                        const barEnd = Math.min(x(d.totalTimeAllocated), width);      // <-- Get bar end position (clamped)
                        const labelX = barEnd + 5;                                  // <-- Position label 5px after bar
                        const maxX = width - 180;                                   // <-- Maximum x position (account for legend space)
                        return Math.min(labelX, maxX);                               // <-- Ensure label doesn't overflow
                    })
                    .attr('y', d => y(d.name) + barStartY + barWidth / 2)
                    .attr('dy', '0.35em')
                    .text(d => `${d.totalTimeAllocated}h`);
                
                // Draw actual time bars (right side)
                svg.selectAll('.bar-actual')                                        // <-- Create actual time bars
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('class', d => `bar-actual bar ${d.totalTimeTaken > d.totalTimeAllocated ? 'over-allocated' : 'under-allocated'}`)
                    .attr('x', 0)
                    .attr('y', d => y(d.name) + barStartY + barWidth + barSpacing)
                    .attr('width', d => Math.min(x(d.totalTimeTaken), width))        // <-- Ensure bar doesn't exceed width
                    .attr('height', barWidth)
                    .attr('rx', 3)                                                   // <-- Rounded corners
                    .on('mouseover', (event, d) => showEfficiencyTooltip(event, d, 'actual'))
                    .on('mouseout', hideTooltip);
                
                // Add actual value labels
                svg.selectAll('.label-actual')                                      // <-- Add actual value labels
                    .data(data)
                    .enter()
                    .append('text')
                    .attr('class', 'label-actual')
                    .attr('x', d => {
                        const barEnd = Math.min(x(d.totalTimeTaken), width);         // <-- Get bar end position (clamped)
                        const labelX = barEnd + 5;                                   // <-- Position label 5px after bar
                        const maxX = width - 180;                                    // <-- Maximum x position (account for legend space)
                        return Math.min(labelX, maxX);                               // <-- Ensure label doesn't overflow
                    })
                    .attr('y', d => y(d.name) + barStartY + barWidth + barSpacing + barWidth / 2)
                    .attr('dy', '0.35em')
                    .text(d => `${d.totalTimeTaken}h`);
                
                // Add axes
                svg.append('g')                                                     // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x).ticks(8));
                
                svg.append('text')                                                 // <-- Add x-axis label
                    .attr('class', 'axis-label')
                    .attr('x', width / 2)
                    .attr('y', height + 40)
                    .text('Hours');
                
                svg.append('g')                                                     // <-- Add y axis
                    .attr('class', 'axis')
                    .call(d3.axisLeft(y));
                
                // Render legend in separate HTML container (not in SVG)
                renderEfficiencyLegend();
            }
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Tooltip Functions
        // -----------------------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for Bar Chart
            // ---------------------------------------------------------------
            function showTooltip(event, d) {
                const tooltip = d3.select('#tooltip');                             // <-- Get tooltip element
                const avgTurnaround = calculateAverageTurnaround(d);                // <-- Calculate average turnaround
                
                tooltip.html(`
                    <div class="tooltip-title">${d.name}</div>
                    <div class="tooltip-content">
                        Projects: ${d.projectCount}<br>
                        Avg Turnaround: ${avgTurnaround} days<br>
                        Total Hours: ${d.totalTimeTaken}
                    </div>
                `);
                
                tooltip.classed('visible', true)                                    // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for Timeline Chart
            // ---------------------------------------------------------------
            function showTimelineTooltip(event, d) {
                const tooltip = d3.select('#tooltip');                              // <-- Get tooltip element
                const receivedDate = formatDate(parseDate(d.scheduleData?.dateReceived));
                const fulfilledDate = formatDate(parseDate(d.scheduleData?.dateFulfilled));
                const turnaround = calculateTurnaroundDays(d);                      // <-- Calculate turnaround time
                
                tooltip.html(`
                    <div class="tooltip-title">${d.projectName}</div>
                    <div class="tooltip-content">
                        Artist: ${d.productionData?.conceptArtist}<br>
                        Received: ${receivedDate}<br>
                        Fulfilled: ${fulfilledDate}<br>
                        Turnaround: ${turnaround} days<br>
                        Hours: ${d.scheduleData?.timeTaken} / ${d.scheduleData?.timeAllocated}
                    </div>
                `);
                
                tooltip.classed('visible', true)                                   // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for Efficiency Chart
            // ---------------------------------------------------------------
            function showEfficiencyTooltip(event, d, type) {
                const tooltip = d3.select('#tooltip');                              // <-- Get tooltip element
                const efficiency = calculateEfficiency(d);                          // <-- Calculate efficiency
                
                const content = type === 'allocated'
                    ? `Allocated Hours: ${d.totalTimeAllocated}`
                    : `Actual Hours: ${d.totalTimeTaken}`;
                
                tooltip.html(`
                    <div class="tooltip-title">${d.name}</div>
                    <div class="tooltip-content">
                        ${content}<br>
                        Efficiency: ${efficiency}%<br>
                        Projects: ${d.projectCount}
                    </div>
                `);
                
                tooltip.classed('visible', true)                                   // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Hide Tooltip
            // ---------------------------------------------------------------
            function hideTooltip() {
                d3.select('#tooltip').classed('visible', false);                   // <-- Hide tooltip
            }
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Event Handlers
        // -----------------------------------------------------------------------------

            // SUB FUNCTION | Handle Timeline Chart Update
            // ---------------------------------------------------------------
            const handleTimelineUpdate = () => {
                if (!projectsLoaded) return;                                        // <-- Only update if data loaded
                renderTimelineChart();                                              // <-- Re-render timeline chart
            };
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Component Render
        // -----------------------------------------------------------------------------

            // RENDER | Time Analysis Tool Interface
            // ---------------------------------------------------------------
            const dataSummary = updateDataSummary();                                // <-- Get data summary text
            
            return (
                <>
                    <Header showBackButton={true} onBack={onBack} />
                    
                    <div className="time-analysis-tool">
                        <div className="time-analysis-tool__content">
                            <h1 className="time-analysis-tool__title">
                                Artist Efficiency Data Visualisation Tool
                            </h1>
                            <p className="time-analysis-tool__subtitle">
                                This Tool Offers Data Driven Analysis & Artist Key Performance Metrics
                            </p>
                            
                            <div className="control-panel">
                                <button 
                                    id="loadDataBtn" 
                                    className="btn-primary"
                                    onClick={loadAllProjectData}
                                >
                                    Reload Project Data
                                </button>
                                <div id="loadingStatus" className={loadingStatusClass}>
                                    {loadingStatus}
                                </div>
                                <div id="dataSummary" className="data-summary">
                                    {dataSummary}
                                </div>
                            </div>
                            
                            <div className="visualization-section">
                                <h2 className="section-title">Artist Productivity - Projects Count</h2>
                                <div id="barChart" className="chart-container"></div>
                            </div>
                            
                            <div className="visualization-section">
                                <h2 className="section-title">Artist Statistics & Performance Metrics</h2>
                                <div id="statisticsTable" className="table-container"></div>
                            </div>
                            
                            <div className="visualization-section">
                                <div className="section-title-with-legend">
                                    <h2 className="section-title section-title-no-border">Time Efficiency - Allocated vs Actual Hours</h2>
                                    <div id="efficiencyLegend" className="chart-legend-container"></div>
                                </div>
                                <div id="efficiencyChart" className="chart-container"></div>
                            </div>
                            
                            <div className="visualization-section">
                                <h2 className="section-title">Project Timeline - Request to Delivery</h2>
                                <div className="timeline-controls">
                                    <label>
                                        <input 
                                            type="checkbox" 
                                            id="groupByArtist" 
                                            defaultChecked
                                            onChange={handleTimelineUpdate}
                                        />
                                        Group by Artist
                                    </label>
                                    <label>
                                        Filter Artist:
                                        <select id="artistFilter" onChange={handleTimelineUpdate}>
                                            <option value="all">All Artists</option>
                                        </select>
                                    </label>
                                </div>
                                <div id="timelineChart" className="chart-container"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="tooltip" className="tooltip"></div>
                </>
            );
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
