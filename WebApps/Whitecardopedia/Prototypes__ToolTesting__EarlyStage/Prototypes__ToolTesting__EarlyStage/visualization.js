// =============================================================================
// VALEDESIGNSUITE - ARTIST TIMELINE VISUALIZER
// =============================================================================
//
// FILE       : visualization.js
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
// REGION | Module Variables and State Management
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Application State
    // ------------------------------------------------------------
    let allProjects         = [];                                        // <-- Array of all loaded project data
    let artistStats         = {};                                        // <-- Aggregated statistics by artist
    let projectsLoaded      = false;                                     // <-- Flag to track if data is loaded
    
    const BASE_PATH         = '../../Projects/2025/';                    // <-- Relative path to projects (up 2 levels)
    const EXCLUDED_FOLDERS  = ['__BACKUP__', '01__TemplateProject', '00__ExampleProject']; // <-- Folders to skip
    
    // Color palette for artists
    const ARTIST_COLORS     = [
        '#4a90e2', '#52c41a', '#fa8c16', '#f5222d', '#722ed1',
        '#13c2c2', '#eb2f96', '#faad14', '#1890ff', '#a0d911'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Data Loading and Processing Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Application and Setup Event Listeners
    // ------------------------------------------------------------
    function initialize() {
        const loadBtn = document.getElementById('loadDataBtn');          // <-- Get load button reference
        const groupCheckbox = document.getElementById('groupByArtist');  // <-- Get grouping checkbox
        const artistFilter = document.getElementById('artistFilter');    // <-- Get artist filter dropdown
        
        loadBtn.addEventListener('click', loadAllProjectData);           // <-- Attach click handler to load button
        groupCheckbox.addEventListener('change', updateTimelineChart);   // <-- Update timeline when grouping changes
        artistFilter.addEventListener('change', updateTimelineChart);    // <-- Update timeline when filter changes
        
        console.log('Artist Timeline Visualizer initialized');           // <-- Log initialization
    }
    // ---------------------------------------------------------------

    // FUNCTION | Load All Project JSON Files from Directory
    // ------------------------------------------------------------
    async function loadAllProjectData() {
        const statusDiv = document.getElementById('loadingStatus');      // <-- Get status message container
        statusDiv.textContent = 'Loading project data...';               // <-- Update status message
        statusDiv.className = 'status-message loading';                  // <-- Apply loading style
        
        allProjects = [];                                                // <-- Reset projects array
        
        try {
            const projectFolders = await getProjectFolders();            // <-- Get list of project folders
            
            for (const folder of projectFolders) {                       // <-- Iterate through each folder
                if (shouldSkipFolder(folder)) continue;                  // <-- Skip excluded folders
                
                const projectData = await loadProjectFile(folder);       // <-- Load project.json from folder
                if (projectData) {                                       // <-- If data loaded successfully
                    allProjects.push(projectData);                       // <-- Add to projects array
                }
            }
            
            statusDiv.textContent = `Successfully loaded ${allProjects.length} projects`; // <-- Update success message
            statusDiv.className = 'status-message success';              // <-- Apply success style
            
            processAllData();                                            // <-- Process and aggregate data
            renderAllVisualizations();                                   // <-- Render all charts and tables
            projectsLoaded = true;                                       // <-- Mark data as loaded
            
        } catch (error) {
            statusDiv.textContent = `Error loading data: ${error.message}`; // <-- Show error message
            statusDiv.className = 'status-message error';                // <-- Apply error style
            console.error('Error loading project data:', error);         // <-- Log error details
        }
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Get List of Project Folders
    // ---------------------------------------------------------------
    async function getProjectFolders() {
        // Since we can't directly list directories via JavaScript in browser,
        // we'll use a hardcoded list based on the known folder structure
        const folders = [
            'JN-2906__Johnstone', 'PH-59512__Phillips', 'GY-60937__Gray',
            'WK-3007__Weeks', 'FN-62104__Fenner Scheme-01', 'FN-62104__Fenner Scheme-02',
            'FN-62104__Fenner Scheme-03', 'WS-61782__Wiltshire', 'WR-60556__Winter',
            'VN-61445__Vaughan', 'HS-61747__Harris', 'HN-61484__Hannan',
            'MU-61478__Mashru', 'VB-60009__VanDenBorn', 'RS-59923__Richards',
            'NY-29951__McNerney', 'PY-61616__Pilley', 'HY-55239__Hendry',
            'MH-61603__Mottershead', 'HT-59908__Hewitt', 'HD-61716__Holland',
            'GS-61695__Gibbs', 'CS-61737__Conyers', 'AN-61960__Acton',
            '61557__Shillabeer', 'JF-61131__Jolliffe'
        ];
        return folders;                                                  // <-- Return folder list
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Check if Folder Should Be Skipped
    // ---------------------------------------------------------------
    function shouldSkipFolder(folderName) {
        return EXCLUDED_FOLDERS.some(excluded =>                         // <-- Check if folder matches exclusion list
            folderName.includes(excluded)
        );
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Load Individual Project JSON File
    // ---------------------------------------------------------------
    async function loadProjectFile(folderName) {
        try {
            const filePath = `${BASE_PATH}${folderName}/project.json`;   // <-- Construct full file path
            const response = await fetch(filePath);                      // <-- Fetch JSON file
            
            if (!response.ok) {                                          // <-- Check if fetch failed
                console.warn(`Could not load ${folderName}`);            // <-- Log warning
                return null;                                             // <-- Return null on failure
            }
            
            const data = await response.json();                          // <-- Parse JSON data
            return data;                                                 // <-- Return parsed data
            
        } catch (error) {
            console.warn(`Error loading ${folderName}:`, error);         // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Process and Aggregate All Project Data
    // ------------------------------------------------------------
    function processAllData() {
        artistStats = {};                                                // <-- Reset artist statistics
        
        allProjects.forEach(project => {                                 // <-- Iterate through each project
            const artist = project.productionData?.conceptArtist;        // <-- Get artist name
            if (!artist) return;                                         // <-- Skip if no artist specified
            
            if (!artistStats[artist]) {                                  // <-- Initialize artist entry if needed
                artistStats[artist] = {
                    name                : artist,                        // <-- Artist name
                    projectCount        : 0,                             // <-- Number of projects
                    totalTimeAllocated  : 0,                             // <-- Total hours allocated
                    totalTimeTaken      : 0,                             // <-- Total hours actually taken
                    projects            : [],                            // <-- Array of project references
                    earliestDate        : null,                          // <-- First project date
                    latestDate          : null                           // <-- Last project date
                };
            }
            
            const stats = artistStats[artist];                           // <-- Get artist stats reference
            stats.projectCount++;                                        // <-- Increment project count
            stats.totalTimeAllocated += project.scheduleData?.timeAllocated || 0; // <-- Add allocated hours
            stats.totalTimeTaken += project.scheduleData?.timeTaken || 0; // <-- Add actual hours
            stats.projects.push(project);                                // <-- Add project to artist's list
            
            updateArtistDateRange(stats, project);                       // <-- Update date range for artist
        });
        
        updateDataSummary();                                             // <-- Update summary display
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Update Artist Date Range
    // ---------------------------------------------------------------
    function updateArtistDateRange(stats, project) {
        const receivedDate = parseDate(project.scheduleData?.dateReceived); // <-- Parse received date
        const fulfilledDate = parseDate(project.scheduleData?.dateFulfilled); // <-- Parse fulfilled date
        
        if (!stats.earliestDate || receivedDate < stats.earliestDate) { // <-- Update earliest date if needed
            stats.earliestDate = receivedDate;
        }
        
        if (!stats.latestDate || fulfilledDate > stats.latestDate) {    // <-- Update latest date if needed
            stats.latestDate = fulfilledDate;
        }
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Parse Date String (DD-MMM-YYYY format)
    // ---------------------------------------------------------------
    function parseDate(dateStr) {
        if (!dateStr) return new Date();                                 // <-- Return current date if invalid
        
        const months = {                                                 // <-- Month abbreviation mapping
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        const parts = dateStr.split('-');                                // <-- Split date string
        const day = parseInt(parts[0]);                                  // <-- Extract day
        const month = months[parts[1]];                                  // <-- Extract month
        const year = parseInt(parts[2]);                                 // <-- Extract year
        
        return new Date(year, month, day);                               // <-- Return Date object
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Format Date for Display
    // ---------------------------------------------------------------
    function formatDate(date) {
        if (!date) return 'N/A';                                         // <-- Return N/A if no date
        return date.toLocaleDateString('en-GB', {                        // <-- Format as DD MMM YYYY
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Update Data Summary Display
    // ---------------------------------------------------------------
    function updateDataSummary() {
        const summaryDiv = document.getElementById('dataSummary');       // <-- Get summary container
        const artistCount = Object.keys(artistStats).length;             // <-- Count unique artists
        const projectCount = allProjects.length;                         // <-- Count total projects
        
        summaryDiv.textContent = `${projectCount} projects • ${artistCount} artists`; // <-- Display summary
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Visualization Rendering Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Render All Visualizations
    // ------------------------------------------------------------
    function renderAllVisualizations() {
        renderBarChart();                                                // <-- Render artist productivity bar chart
        renderTimelineChart();                                           // <-- Render project timeline chart
        renderStatisticsTable();                                         // <-- Render statistics table
        renderEfficiencyChart();                                         // <-- Render efficiency comparison chart
        populateArtistFilter();                                          // <-- Populate artist filter dropdown
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Populate Artist Filter Dropdown
    // ---------------------------------------------------------------
    function populateArtistFilter() {
        const select = document.getElementById('artistFilter');          // <-- Get select element
        select.innerHTML = '<option value="all">All Artists</option>';   // <-- Reset with default option
        
        Object.keys(artistStats).sort().forEach(artist => {              // <-- Iterate through sorted artists
            const option = document.createElement('option');             // <-- Create option element
            option.value = artist;                                       // <-- Set option value
            option.textContent = artist;                                 // <-- Set option text
            select.appendChild(option);                                  // <-- Add to select
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Bar Chart - Artist Productivity Visualization
// -----------------------------------------------------------------------------

    // FUNCTION | Render Horizontal Bar Chart of Projects Per Artist
    // ------------------------------------------------------------
    function renderBarChart() {
        const container = document.getElementById('barChart');           // <-- Get chart container
        container.innerHTML = '';                                        // <-- Clear existing content
        
        const data = Object.values(artistStats)                          // <-- Get artist stats array
            .sort((a, b) => b.projectCount - a.projectCount);            // <-- Sort by project count descending
        
        const margin = { top: 20, right: 30, bottom: 40, left: 100 };   // <-- Define chart margins
        const width = 900 - margin.left - margin.right;                  // <-- Calculate chart width
        const height = Math.max(400, data.length * 40) - margin.top - margin.bottom; // <-- Dynamic height
        
        const svg = d3.select('#barChart')                               // <-- Create SVG element
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const x = d3.scaleLinear()                                       // <-- Create x scale
            .domain([0, d3.max(data, d => d.projectCount)])
            .range([0, width]);
        
        const y = d3.scaleBand()                                         // <-- Create y scale
            .domain(data.map(d => d.name))
            .range([0, height])
            .padding(0.2);
        
        const colorScale = d3.scaleOrdinal()                             // <-- Create color scale
            .domain(data.map(d => d.name))
            .range(ARTIST_COLORS);
        
        // Add gridlines
        svg.append('g')                                                  // <-- Add vertical gridlines
            .attr('class', 'grid')
            .call(d3.axisBottom(x)
                .tickSize(height)
                .tickFormat('')
            );
        
        // Draw bars
        svg.selectAll('.bar')                                            // <-- Create bars
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('width', d => x(d.projectCount))
            .attr('height', y.bandwidth())
            .attr('fill', d => colorScale(d.name))
            .on('mouseover', showTooltip)                                // <-- Show tooltip on hover
            .on('mouseout', hideTooltip);                                // <-- Hide tooltip on mouse out
        
        // Add value labels
        svg.selectAll('.label')                                          // <-- Add count labels
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
        svg.append('g')                                                  // <-- Add x axis
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5));
        
        svg.append('g')                                                  // <-- Add y axis
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
        
        // HELPER FUNCTION | Show Tooltip for Bar Chart
        // ---------------------------------------------------------------
        function showTooltip(event, d) {
            const tooltip = d3.select('#tooltip');                       // <-- Get tooltip element
            const avgTurnaround = calculateAverageTurnaround(d);         // <-- Calculate average turnaround
            
            tooltip.html(`
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-content">
                    Projects: ${d.projectCount}<br>
                    Avg Turnaround: ${avgTurnaround} days<br>
                    Total Hours: ${d.totalTimeTaken}
                </div>
            `);
            
            tooltip.classed('visible', true)                             // <-- Make tooltip visible
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Timeline Chart - Gantt Style Project Timeline
// -----------------------------------------------------------------------------

    // FUNCTION | Render Timeline Chart Showing Project Duration
    // ------------------------------------------------------------
    function renderTimelineChart() {
        const container = document.getElementById('timelineChart');      // <-- Get chart container
        container.innerHTML = '';                                        // <-- Clear existing content
        
        const groupByArtist = document.getElementById('groupByArtist').checked; // <-- Check grouping option
        const filterArtist = document.getElementById('artistFilter').value; // <-- Get filter value
        
        let projectsToShow = allProjects.filter(p => {                   // <-- Filter projects
            if (filterArtist === 'all') return true;
            return p.productionData?.conceptArtist === filterArtist;
        });
        
        if (projectsToShow.length === 0) {                               // <-- Check if no projects to show
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No projects to display</p>';
            return;
        }
        
        const margin = { top: 40, right: 30, bottom: 60, left: 200 };   // <-- Define chart margins
        const width = 1100 - margin.left - margin.right;                 // <-- Calculate chart width
        const height = Math.max(400, projectsToShow.length * 30) - margin.top - margin.bottom; // <-- Dynamic height
        
        const svg = d3.select('#timelineChart')                          // <-- Create SVG element
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const allDates = projectsToShow.flatMap(p => [                   // <-- Get all dates for scale
            parseDate(p.scheduleData?.dateReceived),
            parseDate(p.scheduleData?.dateFulfilled)
        ]);
        
        const x = d3.scaleTime()                                         // <-- Create time scale
            .domain([d3.min(allDates), d3.max(allDates)])
            .range([0, width]);
        
        if (groupByArtist) {                                             // <-- Group by artist if enabled
            projectsToShow.sort((a, b) => {
                const artistA = a.productionData?.conceptArtist || '';
                const artistB = b.productionData?.conceptArtist || '';
                return artistA.localeCompare(artistB);
            });
        }
        
        const y = d3.scaleBand()                                         // <-- Create y scale
            .domain(projectsToShow.map((p, i) => i))
            .range([0, height])
            .padding(0.3);
        
        const colorScale = d3.scaleOrdinal()                             // <-- Create color scale
            .domain(Object.keys(artistStats))
            .range(ARTIST_COLORS);
        
        // Add gridlines
        svg.append('g')                                                  // <-- Add vertical gridlines
            .attr('class', 'grid')
            .call(d3.axisBottom(x)
                .ticks(10)
                .tickSize(height)
                .tickFormat('')
            );
        
        // Draw timeline bars
        svg.selectAll('.timeline-bar')                                   // <-- Create timeline bars
            .data(projectsToShow)
            .enter()
            .append('rect')
            .attr('class', 'timeline-bar bar')
            .attr('x', d => x(parseDate(d.scheduleData?.dateReceived)))
            .attr('y', (d, i) => y(i))
            .attr('width', d => {
                const start = parseDate(d.scheduleData?.dateReceived);
                const end = parseDate(d.scheduleData?.dateFulfilled);
                return x(end) - x(start);
            })
            .attr('height', y.bandwidth())
            .attr('fill', d => colorScale(d.productionData?.conceptArtist))
            .attr('rx', 4)
            .on('mouseover', showTimelineTooltip)                        // <-- Show tooltip on hover
            .on('mouseout', hideTooltip);                                // <-- Hide tooltip on mouse out
        
        // Add project labels
        svg.selectAll('.project-label')                                  // <-- Add project name labels
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
        svg.append('g')                                                  // <-- Add x axis
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(10).tickFormat(d3.timeFormat('%d %b')))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        
        // HELPER FUNCTION | Show Tooltip for Timeline Chart
        // ---------------------------------------------------------------
        function showTimelineTooltip(event, d) {
            const tooltip = d3.select('#tooltip');                       // <-- Get tooltip element
            const receivedDate = formatDate(parseDate(d.scheduleData?.dateReceived));
            const fulfilledDate = formatDate(parseDate(d.scheduleData?.dateFulfilled));
            const turnaround = calculateTurnaroundDays(d);               // <-- Calculate turnaround time
            
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
            
            tooltip.classed('visible', true)                             // <-- Make tooltip visible
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Update Timeline Chart (for controls)
    // ---------------------------------------------------------------
    function updateTimelineChart() {
        if (!projectsLoaded) return;                                     // <-- Only update if data loaded
        renderTimelineChart();                                           // <-- Re-render timeline chart
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Statistics Table - Artist Performance Metrics
// -----------------------------------------------------------------------------

    // FUNCTION | Render Statistics Table with Artist Metrics
    // ------------------------------------------------------------
    function renderStatisticsTable() {
        const container = document.getElementById('statisticsTable');    // <-- Get table container
        container.innerHTML = '';                                        // <-- Clear existing content
        
        const data = Object.values(artistStats)                          // <-- Get artist stats array
            .sort((a, b) => b.projectCount - a.projectCount);            // <-- Sort by project count
        
        const table = document.createElement('table');                   // <-- Create table element
        table.className = 'stats-table';                                 // <-- Apply table styling
        
        // Create table header
        const thead = document.createElement('thead');                   // <-- Create table header
        thead.innerHTML = `
            <tr>
                <th>Artist</th>
                <th>Projects</th>
                <th>Avg Turnaround</th>
                <th>Hours Allocated</th>
                <th>Hours Taken</th>
                <th>Efficiency</th>
                <th>Active Period</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');                   // <-- Create table body
        
        data.forEach(artist => {                                         // <-- Iterate through each artist
            const avgTurnaround = calculateAverageTurnaround(artist);    // <-- Calculate average turnaround
            const efficiency = calculateEfficiency(artist);              // <-- Calculate efficiency percentage
            const activePeriod = `${formatDate(artist.earliestDate)} - ${formatDate(artist.latestDate)}`;
            
            const row = document.createElement('tr');                    // <-- Create table row
            row.innerHTML = `
                <td><strong>${artist.name}</strong></td>
                <td class="number-cell">${artist.projectCount}</td>
                <td class="number-cell">${avgTurnaround} days</td>
                <td class="number-cell">${artist.totalTimeAllocated}h</td>
                <td class="number-cell">${artist.totalTimeTaken}h</td>
                <td class="number-cell">${efficiency}%</td>
                <td>${activePeriod}</td>
            `;
            tbody.appendChild(row);                                      // <-- Add row to table body
        });
        
        table.appendChild(tbody);                                        // <-- Add body to table
        container.appendChild(table);                                    // <-- Add table to container
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Efficiency Chart - Time Allocation vs Actual
// -----------------------------------------------------------------------------

    // FUNCTION | Render Efficiency Comparison Chart
    // ------------------------------------------------------------
    function renderEfficiencyChart() {
        const container = document.getElementById('efficiencyChart');    // <-- Get chart container
        container.innerHTML = '';                                        // <-- Clear existing content
        
        const data = Object.values(artistStats)                          // <-- Get artist stats array
            .sort((a, b) => b.projectCount - a.projectCount);            // <-- Sort by project count
        
        const margin = { top: 20, right: 30, bottom: 40, left: 100 };   // <-- Define chart margins
        const width = 900 - margin.left - margin.right;                  // <-- Calculate chart width
        const height = Math.max(400, data.length * 50) - margin.top - margin.bottom; // <-- Dynamic height
        
        const svg = d3.select('#efficiencyChart')                        // <-- Create SVG element
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const x = d3.scaleLinear()                                       // <-- Create x scale
            .domain([0, d3.max(data, d => Math.max(d.totalTimeAllocated, d.totalTimeTaken))])
            .range([0, width]);
        
        const y = d3.scaleBand()                                         // <-- Create y scale
            .domain(data.map(d => d.name))
            .range([0, height])
            .padding(0.3);
        
        // Add gridlines
        svg.append('g')                                                  // <-- Add vertical gridlines
            .attr('class', 'grid')
            .call(d3.axisBottom(x)
                .tickSize(height)
                .tickFormat('')
            );
        
        // Draw allocated time bars
        svg.selectAll('.bar-allocated')                                  // <-- Create allocated time bars
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar-allocated bar')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('width', d => x(d.totalTimeAllocated))
            .attr('height', y.bandwidth() / 2 - 2)
            .attr('fill', '#e0e0e0')
            .on('mouseover', (event, d) => showEfficiencyTooltip(event, d, 'allocated'))
            .on('mouseout', hideTooltip);
        
        // Draw actual time bars
        svg.selectAll('.bar-actual')                                     // <-- Create actual time bars
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar-actual bar')
            .attr('x', 0)
            .attr('y', d => y(d.name) + y.bandwidth() / 2 + 2)
            .attr('width', d => x(d.totalTimeTaken))
            .attr('height', y.bandwidth() / 2 - 2)
            .attr('fill', d => d.totalTimeTaken > d.totalTimeAllocated ? '#fa8c16' : '#52c41a')
            .on('mouseover', (event, d) => showEfficiencyTooltip(event, d, 'actual'))
            .on('mouseout', hideTooltip);
        
        // Add axes
        svg.append('g')                                                  // <-- Add x axis
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5));
        
        svg.append('g')                                                  // <-- Add y axis
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
        
        // Add legend
        const legend = svg.append('g')                                   // <-- Create legend
            .attr('transform', `translate(${width - 150}, -10)`);
        
        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#e0e0e0');
        
        legend.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text('Allocated')
            .style('font-size', '12px');
        
        legend.append('rect')
            .attr('x', 80)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#52c41a');
        
        legend.append('text')
            .attr('x', 100)
            .attr('y', 12)
            .text('Actual')
            .style('font-size', '12px');
        
        // HELPER FUNCTION | Show Tooltip for Efficiency Chart
        // ---------------------------------------------------------------
        function showEfficiencyTooltip(event, d, type) {
            const tooltip = d3.select('#tooltip');                       // <-- Get tooltip element
            const efficiency = calculateEfficiency(d);                   // <-- Calculate efficiency
            
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
            
            tooltip.classed('visible', true)                             // <-- Make tooltip visible
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Utility and Calculation Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate Average Turnaround Time for Artist
    // ---------------------------------------------------------------
    function calculateAverageTurnaround(artist) {
        const turnarounds = artist.projects.map(p => calculateTurnaroundDays(p)); // <-- Get all turnaround times
        const avg = turnarounds.reduce((sum, val) => sum + val, 0) / turnarounds.length; // <-- Calculate average
        return avg.toFixed(1);                                           // <-- Return rounded to 1 decimal
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Calculate Turnaround Days for Single Project
    // ---------------------------------------------------------------
    function calculateTurnaroundDays(project) {
        const start = parseDate(project.scheduleData?.dateReceived);     // <-- Parse start date
        const end = parseDate(project.scheduleData?.dateFulfilled);      // <-- Parse end date
        const diffTime = Math.abs(end - start);                          // <-- Calculate time difference
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));   // <-- Convert to days
        return diffDays;                                                 // <-- Return number of days
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Calculate Efficiency Percentage
    // ---------------------------------------------------------------
    function calculateEfficiency(artist) {
        if (artist.totalTimeTaken === 0) return 100;                     // <-- Perfect efficiency if no time taken
        const efficiency = (artist.totalTimeAllocated / artist.totalTimeTaken) * 100; // <-- Calculate percentage
        return efficiency.toFixed(0);                                    // <-- Return rounded to integer
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Hide Tooltip
    // ---------------------------------------------------------------
    function hideTooltip() {
        d3.select('#tooltip').classed('visible', false);                 // <-- Hide tooltip
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Application Initialization
// -----------------------------------------------------------------------------

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initialize);           // <-- Initialize app on DOM ready

// endregion -------------------------------------------------------------------

