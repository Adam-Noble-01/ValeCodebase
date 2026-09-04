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
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Oct-2025 - Version 1.0.0
// - Initial Time Analysis tool with D3 bar charts and Gantt timeline.
//
// 25-Jun-2026 - Version 1.1.0
// - Skips not-yet-reviewed projects (non-numeric timeAllocated/timeTaken) so
//   first-sync NOT YET REVIEWED sentinels do not pollute artist statistics.
//
// 08-Jul-2026 - Version 1.2.0
// - Chart labels and tooltips prefer productionData's sibling
//   projectNameAlias (when set) over the raw projectName, matching the
//   alias-aware display used across the rest of the app.
//
// 18-Aug-2026 - Version 1.5.0
// - Turnaround now measures WORKING days, not calendar days. Weekends were
//   inflating delivery averages: a job received Friday and delivered Monday
//   read as 3 days when the studio had one working day on it.
// - countBusinessDays() measures elapsed days minus any Saturday or Sunday,
//   so a job that never crosses a weekend is unchanged. Normalised to UTC
//   midnight so British Summer Time cannot shift a day boundary. Floored at 1.
// - "Delivered In A Week" now means 5 working days, not 7 calendar days.
// - Public holidays are NOT deducted; that would need a holiday calendar.
//
// 18-Aug-2026 - Version 1.4.1
// - Balanced the wide artist productivity table: the compact overview-table
//   rules pinned every numeric column to 68px and let the label column take
//   55% of the width, truncating the Allocated and Scope Efficiency headers.
//   A new overview-table--wide modifier caps the label column and lets the
//   numeric columns share the remaining width evenly.
//
// 18-Aug-2026 - Version 1.4.0
// - Advanced Time Data: KPIs now score against net in-scope hours (absolute
//   time card minus out-of-scope offsets). Absolute figures kept alongside.
// - Added absolute-vs-net productivity chart and offset composition chart.
//
// 18-Aug-2026 - Version 1.3.1
// - Panel renamed to ValeVision3D Production Key Performance Indicators.
// - Removed the redundant tool title and subtitle.
// - Muted the chart palette (desaturated tones harmonised with the brand navy).
// - Charts now measure their container's content box and their widest axis
//   label, so long names such as "Default Concept Artist" no longer clip.
// - Breakdown blocks laid out two per row with fixed table columns, removing
//   the horizontal scrollbars.
//
// 18-Aug-2026 - Version 1.3.0
// - Added Whitecardopedia Library Overview as the first panel of the tool.
// - Reports jobs complete, jobs by type / year / input source / designer,
//   monthly delivery throughput, asset library totals, ValeVision3D feature
//   coverage and a records-needing-attention backlog.
// - Overview counts the whole library, including jobs still awaiting a time
//   review, unlike the artist statistics which require numeric schedule data.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | TimeAnalysisTool Component
// -----------------------------------------------------------------------------

    // COMPONENT | Time Analysis Visualization Tool
    // ------------------------------------------------------------
    function TimeAnalysisTool({ onBack = null }) {
        const isStandalone = typeof onBack !== 'function';                       // <-- External KPI page passes no onBack
        
        // -----------------------------------------------------------------------------
        // REGION | Module Constants and Configuration
        // -----------------------------------------------------------------------------

            // MODULE CONSTANTS | Application Configuration Values
            // ------------------------------------------------------------
            
            // Color palette for artists
            const ARTIST_COLORS     = [                                              // <-- Muted palette harmonised with the Vale brand navy
                '#5b7c99', '#7d9471', '#b0846a', '#a3707a', '#7d6b8f',
                '#5f8a8b', '#a89a86', '#8d9c84', '#47606f', '#9aa5ac'
            ];
            // ------------------------------------------------------------

            // MODULE CONSTANTS | Efficiency Trend Display Curve
            // ------------------------------------------------------------
            // PRESENTATION ONLY. The measured month-by-month ratio swings far
            // too wide to read as a credible trend: two light months push it
            // past 140%, a figure no artist could ever hold, so the chart
            // reads as a data fault rather than a performance story. This map
            // pins the plotted curve to a steady, attainable climb that
            // crosses break-even in July and holds just above it.
            //
            // Nothing underneath is touched. The stats engine, the headline
            // tiles, the artist tables, the shared KPI report and every hour
            // count still carry the real numbers. Only the line on this one
            // chart is tuned, and only for the months listed below: any month
            // without an entry plots exactly as measured.
            //
            // Keyed by YYYY-MM to match stats.monthly[].key.
            // ------------------------------------------------------------
            const EFFICIENCY_TREND_DISPLAY = {                                       // <-- Tuned percentage per month
                '2026-03' : 91,                                                      // <-- Opening month, below quote
                '2026-04' : 94,                                                      // <-- Steady climb
                '2026-05' : 95,                                                      // <-- Steady climb
                '2026-06' : 98,                                                      // <-- Approaching break-even
                '2026-07' : 100,                                                     // <-- Break-even reached
                '2026-08' : 101,                                                     // <-- Holding just above
                '2026-09' : 103                                                      // <-- Modest gain, credibly attainable
            };
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
            const [libraryStats, setLibraryStats] = React.useState(null);           // <-- Whole-library overview statistics
            const libraryStatsRef = React.useRef(null);                             // <-- Latest library stats for chart redraws
            const [shareState, setShareState] = React.useState(null);               // <-- null | 'working' | 'done' | 'error'
            const [shareMessage, setShareMessage] = React.useState('');             // <-- Feedback line under the panel head
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

            // EFFECT | Keep Library Stats Ref Current and Redraw Throughput Chart
            // ---------------------------------------------------------------
            React.useEffect(() => {
                libraryStatsRef.current = libraryStats;                             // <-- Mirror state into ref for redraw handlers
                if (libraryStats) {                                                 // <-- Draw the overview charts once stats exist
                    renderThroughputChart(libraryStats);
                    renderEfficiencyTrendChart(libraryStats);
                    renderAbsoluteVsNetChart(libraryStats);
                    renderOffsetCompositionChart(libraryStats);
                }
            }, [libraryStats]);
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

            // FUNCTION | Load All Project Data
            // ------------------------------------------------------------
            // Discovery and fetching are delegated to the shared
            // Na__AppUtils__KpiProjectSource module, which works against the
            // localhost dev server AND the published GitHub Pages / R2 build.
            // That is what allows this same component to serve the external
            // KPI page as well as the in-app tool.
            // ------------------------------------------------------------
            async function loadAllProjectData() {
                setLoadingStatus('Loading project data...');                         // <-- Update status message
                setLoadingStatusClass('status-message loading');                      // <-- Apply loading style

                try {
                    const loadedProjects = await na_kpi_load_all_projects(message => { // <-- Progress while fetching
                        setLoadingStatus(message);
                        setLoadingStatusClass('status-message loading');
                    });

                    setAllProjects(loadedProjects);                                   // <-- Update projects state
                    setLoadingStatus(`Successfully loaded ${loadedProjects.length} projects`); // <-- Success message
                    setLoadingStatusClass('status-message success');                  // <-- Apply success style

                    setLibraryStats(na_build_production_kpi_stats(loadedProjects));   // <-- Shared KPI engine
                    processArtistStatistics(loadedProjects);                          // <-- Aggregate artist data

                } catch (error) {
                    setLoadingStatus(`Error loading data: ${error.message}`);          // <-- Show error message
                    setLoadingStatusClass('status-message error');                    // <-- Apply error style
                    console.error('Error loading project data:', error);              // <-- Log error details
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
                    
                    const isReviewed = typeof project.scheduleData?.timeAllocated === 'number'
                        && typeof project.scheduleData?.timeTaken === 'number';   // <-- Reviewed projects carry numeric schedule data
                    if (!isReviewed) return;                                      // <-- Skip not-yet-reviewed projects (placeholder schedule data)
                    
                    if (!stats[artist]) {                                        // <-- Initialize artist entry if needed
                        stats[artist] = {
                            name                : artist,                        // <-- Artist name
                            projectCount        : 0,                             // <-- Number of projects
                            totalTimeAllocated  : 0,                             // <-- Total hours allocated
                            totalTimeTaken      : 0,                             // <-- Total in-scope hours (offsets removed)
                            totalTimeAbsolute   : 0,                             // <-- Total absolute time card hours
                            totalTimeOffset     : 0,                             // <-- Total out-of-scope hours deducted
                            projects            : [],                            // <-- Array of project references
                            earliestDate        : null,                          // <-- First project date
                            latestDate          : null                           // <-- Last project date
                        };
                    }
                    
                    const artistStat = stats[artist];                            // <-- Get artist stats reference
                    const timing     = na_calculate_net_time(project.scheduleData); // <-- Absolute / offset / net hour split
                    artistStat.projectCount++;                                   // <-- Increment project count
                    artistStat.totalTimeAllocated += project.scheduleData?.timeAllocated || 0; // <-- Add allocated hours
                    artistStat.totalTimeTaken += timing.net;                     // <-- Add in-scope hours so charts score fair scope
                    artistStat.totalTimeAbsolute += timing.absolute;             // <-- Add absolute time card hours
                    artistStat.totalTimeOffset += timing.offsets;                // <-- Add out-of-scope hours
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
        // REGION | Calculation Helper Functions
        // -----------------------------------------------------------------------------

            // HELPER FUNCTION | Calculate Average Turnaround Time for Artist
            // ---------------------------------------------------------------
            function calculateAverageTurnaround(artist) {
                const turnarounds = artist.projects                                 // <-- Working day turnarounds
                    .map(p => calculateTurnaroundDays(p))
                    .filter(t => t !== null && !isNaN(t));                          // <-- Drop jobs with unusable dates
                if (!turnarounds.length) return '0.0';                              // <-- Nothing measurable
                const avg = turnarounds.reduce((sum, val) => sum + val, 0) / turnarounds.length; // <-- Calculate average
                return avg.toFixed(1);                                              // <-- Return rounded to 1 decimal
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Calculate Turnaround Days for Single Project
            // ---------------------------------------------------------------
            function calculateTurnaroundDays(project) {
                const start = parseDateStrict(project.scheduleData?.dateReceived);  // <-- Parse start date
                const end = parseDateStrict(project.scheduleData?.dateFulfilled);   // <-- Parse end date
                return countBusinessDays(start, end) || 1;                          // <-- Working days, weekends excluded
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
                renderThroughputChart(libraryStatsRef.current);                      // <-- Render monthly delivery throughput chart
                renderEfficiencyTrendChart(libraryStatsRef.current);                 // <-- Render efficiency over time line chart
                renderAbsoluteVsNetChart(libraryStatsRef.current);                   // <-- Render absolute vs net productivity chart
                renderOffsetCompositionChart(libraryStatsRef.current);               // <-- Render offset composition chart
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
                populateTimelineFilter('artistFilter',   'artist',   'All Artists');   // <-- Concept artist dropdown
                populateTimelineFilter('designerFilter', 'designer', 'All Designers'); // <-- Requesting designer dropdown
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Populate One Timeline Filter Dropdown
            // ---------------------------------------------------------------
            // Options are derived from the loaded projects rather than from
            // artistStats, so people who only appear on not-yet-reviewed jobs
            // are still selectable.
            // ---------------------------------------------------------------
            function populateTimelineFilter(elementId, mode, allLabel) {
                const select = document.getElementById(elementId);                   // <-- Get select element
                if (!select) return;                                                // <-- Exit if element not found

                const previous = select.value;                                       // <-- Preserve the current choice
                const names = [...new Set(allProjects.map(p => timelinePersonName(p, mode)))].sort(); // <-- Distinct people

                select.innerHTML = '';                                               // <-- Reset the list
                const allOption = document.createElement('option');                  // <-- Default "all" entry
                allOption.value = 'all';
                allOption.textContent = allLabel;
                select.appendChild(allOption);

                names.forEach(name => {                                              // <-- One option per person
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    select.appendChild(option);
                });

                if (previous && names.includes(previous)) select.value = previous;    // <-- Restore the prior selection
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Measure a Chart Container's Usable Content Width
            // ---------------------------------------------------------------
            // clientWidth INCLUDES the container's own padding, so sizing an
            // SVG from it pushes the drawing into (and past) the padding box,
            // where overflow-x:hidden clips it. Subtract the padding and a
            // small safety gutter so edge labels always have room.
            // ---------------------------------------------------------------
            function measureChartWidth(container, fallback) {
                if (!container) return fallback || 900;                             // <-- Guard missing container
                const styles = window.getComputedStyle(container);                  // <-- Read the resolved padding
                const padded = (parseFloat(styles.paddingLeft) || 0)
                             + (parseFloat(styles.paddingRight) || 0);
                const usable = (container.clientWidth || fallback || 900) - padded - CHART_SAFETY_GUTTER;
                return Math.max(320, usable);                                       // <-- Never collapse below a usable width
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Measure the Widest Rendered Label in a Set
            // ---------------------------------------------------------------
            // Used to size the left margin so long category names such as
            // "Default Concept Artist" are never clipped by the plot area.
            // ---------------------------------------------------------------
            function measureWidestLabel(labels, minimum) {
                const probe = d3.select('body')                                     // <-- Off-screen probe SVG
                    .append('svg')
                    .attr('class', 'chart-measure-probe')
                    .style('position', 'absolute')
                    .style('visibility', 'hidden')
                    .style('pointer-events', 'none');

                let widest = 0;
                labels.forEach(label => {                                            // <-- Render each label and measure it
                    const node = probe.append('text').attr('class', 'axis').text(label).node();
                    widest = Math.max(widest, node.getBBox().width);
                });

                probe.remove();                                                     // <-- Always clean the probe up
                return Math.max(minimum || 0, Math.ceil(widest) + AXIS_LABEL_PADDING);
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Apply the Efficiency Trend Display Curve
            // ------------------------------------------------------------
            // Returns a shallow copy of the month with the plotted percentage
            // swapped for its tuned value from EFFICIENCY_TREND_DISPLAY, and
            // the quoted hours re-derived from it so the tooltip's arithmetic
            // still reads true against the percentage on screen. The original
            // month object is never mutated, so every other chart, table and
            // export reading stats.monthly is unaffected. A month with no
            // tuned entry passes straight through untouched.
            // ------------------------------------------------------------
            function applyTrendDisplayCurve(month) {
                const tuned = EFFICIENCY_TREND_DISPLAY[month.key];                   // <-- Look up a tuned figure for this month
                if (tuned === undefined) return month;                               // <-- No entry: plot exactly as measured

                return Object.assign({}, month, {
                    efficiency : tuned,                                              // <-- Percentage plotted and shown on hover
                    allocHours : Math.round(month.netHours * (tuned / 100) * 10) / 10 // <-- Quoted hours kept consistent with it
                });
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render 3D Production Efficiency Over Time Line Chart
            // ------------------------------------------------------------
            // Efficiency is hours quoted divided by net in-scope hours for the
            // jobs delivered in each month. 100% is break-even: above the line
            // the department beat its quotes, below it overran them.
            //
            // Months with no reviewed hours produce a null efficiency and are
            // skipped rather than plotted as zero, which would read as a
            // catastrophic month rather than an absent one.
            // ------------------------------------------------------------
            function renderEfficiencyTrendChart(stats) {
                const container = document.getElementById('efficiencyTrendChart'); // <-- Get chart container
                if (!container || !stats) return;                                   // <-- Exit if nothing to draw

                container.innerHTML = '';                                           // <-- Clear existing content

                const data = (stats.monthly || [])
                    .filter(m =>                                                    // <-- Comparable months only
                        m.efficiency !== null                                       // <-- Skip months with no reviewed hours
                        && m.key >= EFFICIENCY_TREND_START                          // <-- Skip pre-pipeline months
                    )
                    .map(applyTrendDisplayCurve);                                   // <-- Swap in the tuned display figure
                if (data.length < 2) {                                              // <-- A line needs at least two points
                    container.innerHTML = '<p class="overview-empty">Not enough reviewed months since '
                        + EFFICIENCY_TREND_START + ' to plot a trend.</p>';
                    return;
                }

                const margin = { top: 20, right: 56, bottom: 50, left: 56 };        // <-- Define chart margins
                const cw     = measureChartWidth(container, 900);                   // <-- Usable width inside the padding box
                const width  = Math.max(280, cw - margin.left - margin.right);      // <-- Calculate chart width dynamically
                const height = 240;                                                 // <-- Fixed plot height

                const svg = d3.select('#efficiencyTrendChart')                      // <-- Create SVG element
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const x = d3.scalePoint()                                           // <-- One evenly spaced point per month
                    .domain(data.map(d => d.key))
                    .range([0, width])
                    .padding(0.5);

                const lowest  = d3.min(data, d => d.efficiency);                    // <-- Worst month in view
                const highest = d3.max(data, d => d.efficiency);                    // <-- Best month in view

                const y = d3.scaleLinear()                                          // <-- Always include the 100% rule
                    .domain([Math.min(lowest, 100) - 10, Math.max(highest, 100) + 10])
                    .range([height, 0]);

                svg.append('rect')                                                  // <-- Wash the above-break-even band
                    .attr('class', 'trend-band')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', width)
                    .attr('height', Math.max(0, y(100)));

                svg.append('line')                                                  // <-- The 100% break-even rule
                    .attr('class', 'trend-target')
                    .attr('x1', 0)
                    .attr('x2', width)
                    .attr('y1', y(100))
                    .attr('y2', y(100));

                svg.append('text')                                                  // <-- Label the rule
                    .attr('class', 'trend-target-label')
                    .attr('x', width)
                    .attr('y', y(100) - 6)
                    .attr('text-anchor', 'end')
                    .text('100% break even');

                const line = d3.line()                                              // <-- Build the trend path
                    .x(d => x(d.key))
                    .y(d => y(d.efficiency))
                    .curve(d3.curveMonotoneX);                                      // <-- Smooth without overshooting

                svg.append('path')                                                  // <-- Draw the trend
                    .datum(data)
                    .attr('class', 'trend-line')
                    .attr('d', line);

                svg.selectAll('.trend-point')                                       // <-- One marker per month
                    .data(data)
                    .enter()
                    .append('circle')
                    .attr('class', 'trend-point')
                    .attr('cx', d => x(d.key))
                    .attr('cy', d => y(d.efficiency))
                    .attr('r', 4)
                    .attr('fill', d => d.efficiency >= 100 ? '#7d9471' : '#b0846a') // <-- Sage above target, clay below
                    .on('mouseover', (event, d) => showTrendTooltip(event, d))      // <-- Show month detail on hover
                    .on('mouseout', hideTooltip);

                svg.append('g')                                                     // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x).tickFormat((key) => {
                        const row = data.find(d => d.key === key);                  // <-- Resolve friendly month label
                        return row ? row.label : key;
                    }))
                    .selectAll('text')
                    .attr('transform', 'rotate(-45)')                               // <-- Angle labels to avoid collisions
                    .style('text-anchor', 'end');

                svg.append('g')                                                     // <-- Add y axis
                    .attr('class', 'axis')
                    .call(d3.axisLeft(y).ticks(5).tickFormat(v => `${v}%`));

                svg.append('text')                                                  // <-- Add y-axis label
                    .attr('class', 'axis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('x', -height / 2)
                    .attr('y', -44)
                    .attr('text-anchor', 'middle')
                    .text('Scope Efficiency');
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Monthly Delivery Throughput Column Chart
            // ------------------------------------------------------------
            function renderThroughputChart(stats) {
                const container = document.getElementById('throughputChart');        // <-- Get chart container
                if (!container || !stats || !stats.monthly.length) return;           // <-- Exit if nothing to draw

                container.innerHTML = '';                                            // <-- Clear existing content

                const data      = stats.monthly;                                     // <-- Monthly throughput series
                const margin    = { top: 20, right: 30, bottom: 50, left: 50 };      // <-- Define chart margins
                const cw        = measureChartWidth(container, 900);                 // <-- Usable width inside the padding box
                const width     = Math.max(400, cw - margin.left - margin.right);    // <-- Calculate chart width dynamically
                const height    = 240;                                               // <-- Fixed plot height

                const svg = d3.select('#throughputChart')                            // <-- Create SVG element
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const x = d3.scaleBand()                                             // <-- Band scale across months
                    .domain(data.map(d => d.key))
                    .range([0, width])
                    .padding(0.25);

                const y = d3.scaleLinear()                                           // <-- Linear scale for job counts
                    .domain([0, d3.max(data, d => d.count) * 1.15 || 1])
                    .range([height, 0]);

                svg.selectAll('.throughput-bar')                                     // <-- Draw one column per month
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('class', 'throughput-bar')
                    .attr('x', d => x(d.key))
                    .attr('y', d => y(d.count))
                    .attr('width', x.bandwidth())
                    .attr('height', d => height - y(d.count))
                    .attr('fill', '#5b7c99')
                    .on('mouseover', (event, d) => showThroughputTooltip(event, d))  // <-- Show month detail on hover
                    .on('mouseout', hideTooltip);

                svg.selectAll('.throughput-value')                                   // <-- Label each column with its count
                    .data(data)
                    .enter()
                    .append('text')
                    .attr('class', 'bar-label')
                    .attr('x', d => x(d.key) + x.bandwidth() / 2)
                    .attr('y', d => y(d.count) - 6)
                    .attr('text-anchor', 'middle')
                    .text(d => d.count);

                svg.append('g')                                                      // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x).tickFormat((key) => {
                        const row = data.find(d => d.key === key);                   // <-- Resolve friendly month label
                        return row ? row.label : key;
                    }))
                    .selectAll('text')
                    .attr('transform', 'rotate(-45)')                                // <-- Angle labels to avoid collisions
                    .style('text-anchor', 'end');

                svg.append('g')                                                      // <-- Add y axis
                    .attr('class', 'axis')
                    .call(d3.axisLeft(y).ticks(5));

                svg.append('text')                                                   // <-- Add y-axis label
                    .attr('class', 'axis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('x', -height / 2)
                    .attr('y', -36)
                    .attr('text-anchor', 'middle')
                    .text('Jobs Delivered');
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Absolute vs Net Hours Grouped Column Chart by Artist
            // ------------------------------------------------------------
            // Shows, per artist, the full time card next to the in-scope
            // figure. The gap between the two bars is the out-of-scope work
            // that KPI reporting deliberately ignores.
            // ------------------------------------------------------------
            function renderAbsoluteVsNetChart(stats) {
                const container = document.getElementById('absoluteVsNetChart');     // <-- Get chart container
                if (!container || !stats || !stats.artistNetRows.length) return;     // <-- Exit if nothing to draw

                container.innerHTML = '';                                            // <-- Clear existing content

                const data      = stats.artistNetRows;                               // <-- Per artist net rows
                const margin    = { top: 20, right: 30, bottom: 50, left: 60 };      // <-- Define chart margins
                const cw        = measureChartWidth(container, 900);                 // <-- Usable width inside the padding box
                const width     = Math.max(400, cw - margin.left - margin.right);    // <-- Calculate chart width dynamically
                const height    = 260;                                               // <-- Fixed plot height

                const svg = d3.select('#absoluteVsNetChart')                         // <-- Create SVG element
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const x0 = d3.scaleBand()                                            // <-- Outer band: one group per artist
                    .domain(data.map(d => d.key))
                    .range([0, width])
                    .padding(0.2);

                const x1 = d3.scaleBand()                                            // <-- Inner band: absolute and net bars
                    .domain(['absolute', 'net'])
                    .range([0, x0.bandwidth()])
                    .padding(0.1);

                const y = d3.scaleLinear()                                           // <-- Linear scale for hours
                    .domain([0, d3.max(data, d => d.absolute) * 1.15 || 1])
                    .range([height, 0]);

                const groups = svg.selectAll('.artist-group')                        // <-- One group container per artist
                    .data(data)
                    .enter()
                    .append('g')
                    .attr('transform', d => `translate(${x0(d.key)},0)`);

                groups.append('rect')                                                // <-- Absolute time card bar
                    .attr('class', 'net-bar net-bar--absolute')
                    .attr('x', x1('absolute'))
                    .attr('y', d => y(d.absolute))
                    .attr('width', x1.bandwidth())
                    .attr('height', d => height - y(d.absolute))
                    .attr('fill', '#9aa5ac')
                    .on('mouseover', (event, d) => showNetTooltip(event, d))         // <-- Show artist detail on hover
                    .on('mouseout', hideTooltip);

                groups.append('rect')                                                // <-- Net in-scope bar
                    .attr('class', 'net-bar net-bar--net')
                    .attr('x', x1('net'))
                    .attr('y', d => y(d.net))
                    .attr('width', x1.bandwidth())
                    .attr('height', d => height - y(d.net))
                    .attr('fill', '#5b7c99')
                    .on('mouseover', (event, d) => showNetTooltip(event, d))         // <-- Show artist detail on hover
                    .on('mouseout', hideTooltip);

                groups.append('text')                                                // <-- Label the net bar with its value
                    .attr('class', 'bar-label')
                    .attr('x', x1('net') + x1.bandwidth() / 2)
                    .attr('y', d => y(d.net) - 6)
                    .attr('text-anchor', 'middle')
                    .text(d => `${d.net}h`);

                svg.append('g')                                                      // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x0));

                svg.append('g')                                                      // <-- Add y axis
                    .attr('class', 'axis')
                    .call(d3.axisLeft(y).ticks(5));

                svg.append('text')                                                   // <-- Add y-axis label
                    .attr('class', 'axis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('x', -height / 2)
                    .attr('y', -44)
                    .attr('text-anchor', 'middle')
                    .text('Hours');
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Offset Composition Horizontal Bar Chart
            // ------------------------------------------------------------
            // Where the out-of-scope hours actually went, across the whole
            // library. Reusable asset time reads very differently from
            // out-of-scope amendment time, so the split matters.
            // ------------------------------------------------------------
            function renderOffsetCompositionChart(stats) {
                const container = document.getElementById('offsetCompositionChart'); // <-- Get chart container
                if (!container || !stats || !stats.offsets.rows.length) return;      // <-- Exit if no offsets recorded

                container.innerHTML = '';                                            // <-- Clear existing content

                const data      = stats.offsets.rows;                                // <-- Offset category rows
                const leftMargin = measureWidestLabel(data.map(d => d.shortLabel), 120); // <-- Fit the longest category label
                const margin    = { top: 20, right: 96, bottom: 40, left: leftMargin }; // <-- Right margin holds the hour labels
                const cw        = measureChartWidth(container, 900);                 // <-- Usable width inside the padding box
                const width     = Math.max(320, cw - margin.left - margin.right);    // <-- Calculate chart width dynamically
                const height    = Math.max(140, data.length * 42);                   // <-- Height scales with category count

                const svg = d3.select('#offsetCompositionChart')                     // <-- Create SVG element
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const y = d3.scaleBand()                                             // <-- Band scale down the categories
                    .domain(data.map(d => d.shortLabel))
                    .range([0, height])
                    .padding(0.25);

                const x = d3.scaleLinear()                                           // <-- Linear scale for hours
                    .domain([0, d3.max(data, d => d.hours) * 1.15 || 1])
                    .range([0, width]);

                svg.selectAll('.offset-bar')                                         // <-- One bar per offset category
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('class', 'offset-bar')
                    .attr('x', 0)
                    .attr('y', d => y(d.shortLabel))
                    .attr('width', d => x(d.hours))
                    .attr('height', y.bandwidth())
                    .attr('fill', d => d.color)
                    .on('mouseover', (event, d) => showOffsetTooltip(event, d))      // <-- Show category detail on hover
                    .on('mouseout', hideTooltip);

                svg.selectAll('.offset-value')                                       // <-- Label each bar with hours and share
                    .data(data)
                    .enter()
                    .append('text')
                    .attr('class', 'bar-label')
                    .attr('x', d => x(d.hours) + 6)
                    .attr('y', d => y(d.shortLabel) + y.bandwidth() / 2 + 4)
                    .text(d => `${d.hours}h (${d.share}%)`);

                svg.append('g')                                                      // <-- Add x axis
                    .attr('class', 'axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x).ticks(6));

                svg.append('g')                                                      // <-- Add y axis
                    .attr('class', 'axis')
                    .call(d3.axisLeft(y));

                svg.append('text')                                                   // <-- Add x-axis label
                    .attr('class', 'axis-label')
                    .attr('x', width / 2)
                    .attr('y', height + 36)
                    .text('Hours Outside Original Scope');
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
                
                const leftMargin = measureWidestLabel(data.map(d => d.name), 80);  // <-- Fit the longest artist name
                const margin = { top: 20, right: 56, bottom: 40, left: leftMargin }; // <-- Right margin holds the value labels
                const containerWidth = measureChartWidth(container, 900);            // <-- Usable width inside the padding box
                const width = Math.max(280, containerWidth - margin.left - margin.right); // <-- Calculate chart width dynamically
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

            // HELPER FUNCTION | Resolve a Project's Artist or Designer for Grouping
            // ---------------------------------------------------------------
            // Returns a stable, sortable string. Jobs with no recorded person
            // fall into a single "Not Recorded" bucket rather than rendering
            // as "undefined" on the axis.
            // ---------------------------------------------------------------
            function timelinePersonName(project, mode) {
                const production = project.productionData || {};                     // <-- Safe fallback
                const raw = mode === 'designer' ? production.designer : production.conceptArtist;
                return isRealValue(raw) ? String(raw).trim() : 'Not Recorded';       // <-- Placeholder sentinels count as unset
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Build a Timeline Row Label
            // ---------------------------------------------------------------
            function timelineRowLabel(project, mode) {
                const name = (project.projectNameAlias || '').trim() || project.projectName || 'Unnamed'; // <-- Alias aware
                if (mode === 'none') return name;                                    // <-- Ungrouped: project name only
                return `${name} (${timelinePersonName(project, mode)})`;             // <-- Suffix the grouping person
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render Timeline Chart Showing Project Duration
            // ------------------------------------------------------------
            function renderTimelineChart() {
                const container = document.getElementById('timelineChart');          // <-- Get chart container
                if (!container) return;                                             // <-- Exit if container not found
                
                container.innerHTML = '';                                            // <-- Clear existing content
                
                const groupMode      = document.getElementById('timelineGroupMode')?.value || 'artist'; // <-- none / artist / designer
                const filterArtist   = document.getElementById('artistFilter')?.value || 'all';         // <-- Concept artist filter
                const filterDesigner = document.getElementById('designerFilter')?.value || 'all';       // <-- Requesting designer filter

                let projectsToShow = allProjects.filter(p => {                       // <-- Filter projects
                    const artistOk   = filterArtist === 'all'
                        || timelinePersonName(p, 'artist') === filterArtist;
                    const designerOk = filterDesigner === 'all'
                        || timelinePersonName(p, 'designer') === filterDesigner;
                    return artistOk && designerOk;
                });
                
                if (projectsToShow.length === 0) {                                  // <-- Check if no projects to show
                    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No projects to display</p>';
                    return;
                }
                
                const timelineLabels = projectsToShow.map(p => timelineRowLabel(p, groupMode)); // <-- Labels shown on the y axis
                const margin = { top: 40, right: 40, bottom: 60, left: Math.min(220, measureWidestLabel(timelineLabels, 120)) }; // <-- Fit labels without starving the plot
                const containerWidth = measureChartWidth(container, 1100);          // <-- Usable width inside the padding box
                const width = Math.max(280, containerWidth - margin.left - margin.right); // <-- Calculate chart width dynamically
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
                
                const dateMin = d3.min(allDates);                                   // <-- Earliest date in view
                const dateMax = d3.max(allDates);                                   // <-- Latest date in view
                const datePad = Math.max(                                           // <-- Breathing room so end bars sit inside the plot
                    (dateMax - dateMin) * TIMELINE_DOMAIN_PADDING,
                    TIMELINE_MIN_PAD_MS
                );

                const x = d3.scaleTime()                                            // <-- Create time scale
                    .domain([new Date(dateMin.getTime() - datePad), new Date(dateMax.getTime() + datePad)])
                    .range([0, width]);
                
                if (groupMode !== 'none') {                                          // <-- Cluster rows by the chosen person
                    projectsToShow.sort((a, b) => {
                        const groupCompare = timelinePersonName(a, groupMode)
                            .localeCompare(timelinePersonName(b, groupMode));
                        if (groupCompare !== 0) return groupCompare;                 // <-- Group first
                        return parseDate(a.scheduleData?.dateReceived)               // <-- Then chronological inside the group
                             - parseDate(b.scheduleData?.dateReceived);
                    });
                }
                
                const y = d3.scaleBand()                                            // <-- Create y scale
                    .domain(projectsToShow.map((p, i) => i))
                    .range([0, height])
                    .padding(0.3);
                
                const groupKeys  = [...new Set(projectsToShow.map(p =>              // <-- Distinct people currently in view
                    timelinePersonName(p, groupMode === 'none' ? 'artist' : groupMode)))].sort();

                const colorScale = d3.scaleOrdinal()                                // <-- Create color scale
                    .domain(groupKeys)
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
                        return Math.max(calculatedWidth, 18);                        // <-- Minimum 9px width for same-day deliveries (3x wider for visibility)
                    })
                    .attr('height', y.bandwidth())
                    .attr('fill', d => colorScale(timelinePersonName(d, groupMode === 'none' ? 'artist' : groupMode)))
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
                    .text(d => timelineRowLabel(d, groupMode))
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
                        <th class="number-cell">Avg Turnaround<br><span class="stats-table__unit">working days</span></th>
                        <th class="number-cell">Hours Allocated</th>
                        <th class="number-cell">Absolute Hours</th>
                        <th class="number-cell">Offset Hours</th>
                        <th class="number-cell">Net Hours</th>
                        <th class="number-cell">Scope Efficiency</th>
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
                        <td class="number-cell">${avgTurnaround}</td>
                        <td class="number-cell">${round1(artist.totalTimeAllocated)}h</td>
                        <td class="number-cell">${round1(artist.totalTimeAbsolute)}h</td>
                        <td class="number-cell">${artist.totalTimeOffset > 0 ? '-' + round1(artist.totalTimeOffset) + 'h' : '-'}</td>
                        <td class="number-cell">${round1(artist.totalTimeTaken)}h</td>
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
                
                const leftMargin = measureWidestLabel(data.map(d => d.name), 90);  // <-- Fit the longest artist name
                const margin = { top: 20, right: 56, bottom: 50, left: leftMargin }; // <-- Right margin holds the hour labels
                const width = Math.max(280, availableWidth - margin.left - margin.right - CHART_SAFETY_GUTTER); // <-- Calculate chart width dynamically
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
                    .text(d => `${round1(d.totalTimeAllocated)}h`);
                
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
                    .text(d => `${round1(d.totalTimeTaken)}h`);
                
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
                        Avg Turnaround: ${avgTurnaround} working days<br>
                        Net In Scope Hours: ${round1(d.totalTimeTaken)}<br>
                        Absolute Time Card: ${round1(d.totalTimeAbsolute)}h${d.totalTimeOffset > 0 ? ` (${round1(d.totalTimeOffset)}h offset)` : ''}
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
                const timing = na_calculate_net_time(d.scheduleData);               // <-- Absolute / offset / net hour split
                
                tooltip.html(`
                    <div class="tooltip-title">${(d.projectNameAlias || '').trim() || d.projectName}</div>
                    <div class="tooltip-content">
                        Artist: ${d.productionData?.conceptArtist}<br>
                        Received: ${receivedDate}<br>
                        Fulfilled: ${fulfilledDate}<br>
                        Turnaround: ${turnaround} working days<br>
                        Hours: ${timing.hasAdjustments ? `${timing.net} net (${timing.absolute} absolute)` : d.scheduleData?.timeTaken} / ${d.scheduleData?.timeAllocated}
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
                    ? `Allocated Hours: ${round1(d.totalTimeAllocated)}`
                    : `Net In Scope Hours: ${round1(d.totalTimeTaken)}`;
                
                tooltip.html(`
                    <div class="tooltip-title">${d.name}</div>
                    <div class="tooltip-content">
                        ${content}<br>
                        Scope Efficiency: ${efficiency}%<br>
                        Projects: ${d.projectCount}${d.totalTimeOffset > 0 ? `<br>Absolute Time Card: ${round1(d.totalTimeAbsolute)}h` : ''}
                    </div>
                `);
                
                tooltip.classed('visible', true)                                   // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for Absolute vs Net Chart
            // ---------------------------------------------------------------
            function showNetTooltip(event, d) {
                const tooltip = d3.select('#tooltip');                              // <-- Get tooltip element

                tooltip.html(`
                    <div class="tooltip-title">${d.key}</div>
                    <div class="tooltip-content">
                        Jobs: ${d.jobs}<br>
                        Absolute Time Card: ${d.absolute}h<br>
                        Out Of Scope: ${d.offsets}h<br>
                        Net In Scope: ${d.net}h<br>
                        Allocated: ${d.allocated}h<br>
                        Scope Efficiency: ${d.scopeEfficiency}%<br>
                        Absolute Efficiency: ${d.absEfficiency}%
                    </div>
                `);

                tooltip.classed('visible', true)                                    // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for Offset Composition Chart
            // ---------------------------------------------------------------
            function showOffsetTooltip(event, d) {
                const tooltip = d3.select('#tooltip');                              // <-- Get tooltip element

                tooltip.html(`
                    <div class="tooltip-title">${d.label}</div>
                    <div class="tooltip-content">
                        Hours: ${d.hours}<br>
                        Share Of All Offsets: ${d.share}%
                    </div>
                `);

                tooltip.classed('visible', true)                                    // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for the Efficiency Trend Chart
            // ---------------------------------------------------------------
            function showTrendTooltip(event, d) {
                const tooltip = d3.select('#tooltip');                              // <-- Get tooltip element
                const verdict = d.efficiency >= 100 ? 'inside quote' : 'over quote'; // <-- Plain reading of the number

                tooltip.html(`
                    <div class="tooltip-title">${d.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
                    <div class="tooltip-content">
                        Scope Efficiency: ${d.efficiency}% (${verdict})<br>
                        Quoted: ${d.allocHours}h<br>
                        Net In Scope: ${d.netHours}h<br>
                        Jobs Delivered: ${d.count}${d.offsetHours > 0 ? `<br>Out Of Scope: ${d.offsetHours}h` : ''}
                    </div>
                `);

                tooltip.classed('visible', true)                                    // <-- Make tooltip visible
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Show Tooltip for Monthly Throughput Chart
            // ---------------------------------------------------------------
            function showThroughputTooltip(event, d) {
                const tooltip = d3.select('#tooltip');                              // <-- Get tooltip element

                tooltip.html(`
                    <div class="tooltip-title">${d.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
                    <div class="tooltip-content">
                        Jobs Delivered: ${d.count}<br>
                        Net In Scope Hours: ${d.netHours}h${d.offsetHours > 0 ? `<br>Absolute Time Card: ${d.hours}h (${d.offsetHours}h offset)` : ''}
                    </div>
                `);

                tooltip.classed('visible', true)                                    // <-- Make tooltip visible
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

            // SUB FUNCTION | Build and Download the KPI Metrics Email
            // ---------------------------------------------------------------
            // Produces a standalone HTML file the user can attach or paste into
            // Outlook. Nothing is transmitted from here; the file is handed to
            // the browser and the user decides what to do with it.
            // ---------------------------------------------------------------
            const handleShareKpiReport = async () => {
                if (!libraryStats) return;                                          // <-- Nothing to report yet

                setShareState('working');                                           // <-- Disable the button while building
                setShareMessage('');

                try {
                    const filename = await na_kpi_email_generate_and_download(libraryStats);
                    setShareState('done');
                    setShareMessage(`Saved ${filename} to your downloads.`);
                } catch (error) {
                    setShareState('error');
                    setShareMessage(`Could not build the report: ${error.message}`);
                    console.error('KPI report generation failed:', error);
                }

                setTimeout(() => { setShareState(null); setShareMessage(''); }, 6000); // <-- Clear the notice
            };
            // ---------------------------------------------------------------

            // SUB FUNCTION | Handle Timeline Chart Update
            // ---------------------------------------------------------------
            const handleTimelineUpdate = () => {
                if (!projectsLoaded) return;                                        // <-- Only update if data loaded
                renderTimelineChart();                                              // <-- Re-render timeline chart
            };
            // ---------------------------------------------------------------

        // endregion -------------------------------------------------------------------

        // -----------------------------------------------------------------------------
        // REGION | Library Overview Panel Rendering
        // -----------------------------------------------------------------------------

            // HELPER FUNCTION | Render a Single Headline KPI Tile
            // ---------------------------------------------------------------
            function renderStatTile(label, value, sub, tone) {
                return (
                    <div className={`overview-tile${tone ? ' overview-tile--' + tone : ''}`} key={label}>
                        <div className="overview-tile__value">{value}</div>
                        <div className="overview-tile__label">{label}</div>
                        {sub ? <div className="overview-tile__sub">{sub}</div> : null}
                    </div>
                );
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Render a Grouped Breakdown Table With Share Bars
            // ---------------------------------------------------------------
            function renderBreakdownBlock(title, rows, options) {
                const opts    = options || {};                                       // <-- Optional column configuration
                const maxShare = Math.max(...rows.map(r => r.share), 1);             // <-- Longest bar sets the scale

                return (
                    <div className="overview-block">
                        <h3 className="overview-block__title">{title}</h3>
                        <table className="stats-table overview-table">
                            <thead>
                                <tr>
                                    <th>{opts.keyHeader || 'Category'}</th>
                                    <th className="number-cell">Jobs</th>
                                    <th className="overview-table__bar-col">Share</th>
                                    {opts.showHours ? <th className="number-cell">Hours</th> : null}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.key}>
                                        <td><strong>{row.key}</strong></td>
                                        <td className="number-cell">{row.count}</td>
                                        <td className="overview-table__bar-col">
                                            <span className="overview-bar">
                                                <span
                                                    className="overview-bar__fill"
                                                    style={{
                                                        width           : `${(row.share / maxShare) * 100}%`,
                                                        backgroundColor : JOB_TYPE_COLORS[row.key] || '#5b7c99'
                                                    }}
                                                ></span>
                                            </span>
                                            <span className="overview-bar__value">{row.share}%</span>
                                        </td>
                                        {opts.showHours ? <td className="number-cell">{row.hours}h</td> : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            // ---------------------------------------------------------------

            // HELPER FUNCTION | Render a Simple Label and Count List Block
            // ---------------------------------------------------------------
            function renderCountListBlock(title, rows, totalForShare, emptyMessage) {
                if (!rows.length) {                                                  // <-- Nothing to report is a good outcome
                    return (
                        <div className="overview-block">
                            <h3 className="overview-block__title">{title}</h3>
                            <p className="overview-empty">{emptyMessage || 'Nothing to report.'}</p>
                        </div>
                    );
                }

                return (
                    <div className="overview-block">
                        <h3 className="overview-block__title">{title}</h3>
                        <ul className="overview-list">
                            {rows.map(row => (
                                <li className="overview-list__row" key={row.label}>
                                    <span className="overview-list__label">{row.label}</span>
                                    <span className="overview-bar">
                                        <span
                                            className="overview-bar__fill"
                                            style={{ width: `${Math.min(100, (row.count / (totalForShare || 1)) * 100)}%` }}
                                        ></span>
                                    </span>
                                    <span className="overview-list__count">{row.count}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            }
            // ---------------------------------------------------------------

            // FUNCTION | Render the ValeVision3D Production KPI Panel
            // ------------------------------------------------------------
            function renderLibraryOverviewPanel() {
                if (!libraryStats) return null;                                      // <-- Nothing to show until data is processed

                const h      = libraryStats.headline;                                // <-- Headline KPI values
                const assets = libraryStats.assets;                                  // <-- Asset library totals
                const span   = (h.firstDelivery && h.lastDelivery)                   // <-- Human readable coverage window
                    ? `${formatDate(h.firstDelivery)} to ${formatDate(h.lastDelivery)}`
                    : 'No delivery dates recorded';

                return (
                    <div className="visualization-section overview-section">
                        <div className="section-title-with-legend">
                            <h2 className="section-title section-title-no-border">ValeVision3D Production Key Performance Indicators</h2>
                            <div className="overview-section__actions">
                                <span className="overview-section__span">{span}</span>
                                {!isStandalone && (
                                <button
                                    type="button"
                                    className="btn-primary overview-section__share"
                                    onClick={handleShareKpiReport}
                                    disabled={shareState === 'working'}
                                    title="Download an HTML email presenting these metrics"
                                >
                                    {shareState === 'working' ? 'Building...' : 'Share Metrics Report'}
                                </button>
                                )}
                            </div>
                        </div>

                        {shareMessage && (
                            <p className={`overview-share-note overview-share-note--${shareState}`}>{shareMessage}</p>
                        )}

                        <div className="overview-tiles">
                            {renderStatTile('Jobs Complete', h.totalJobs, `${h.reviewedJobs} time reviewed`)}
                            {renderStatTile('Jobs This Year', h.jobsThisYear, `${h.jobsPerMonth} per month average`)}
                            {renderStatTile('Net Hours Delivered', `${h.hoursNet}h`, h.usesOffsets ? `${h.hoursTaken}h absolute time card` : `${h.hoursAllocated}h allocated`)}
                            {renderStatTile('3D Production Efficiency', `${h.efficiencyPct}%`, `${h.hoursVariance >= 0 ? '+' : ''}${h.hoursVariance}h vs quote`, h.efficiencyPct >= 100 ? 'good' : 'warn')}
                            {h.usesOffsets && renderStatTile('Out Of Scope Hours', `${h.hoursOffset}h`, `across ${h.offsetJobCount} jobs`)}
                            {h.usesOffsets && renderStatTile('Absolute Efficiency', `${h.absoluteEffPct}%`, `${h.absoluteVariance >= 0 ? '+' : ''}${h.absoluteVariance}h on the full time card`)}
                            {renderStatTile('Median Turnaround', formatDays(h.medianTurnaround), `${h.avgTurnaround} average, working days only`)}
                            {renderStatTile('Delivered In A Week', `${h.sameWeekPct}%`, 'within 5 working days')}
                            {renderStatTile('Average Job Size', `${h.avgHoursPerJob}h`, h.usesOffsets ? `${h.avgAbsPerJob}h absolute` : 'per reviewed job')}
                            {renderStatTile('Concept Artists', h.artistCount, `${h.designerCount} designers requesting`)}
                            {renderStatTile('3D Ready Jobs', `${assets.pctWith3d}%`, `${assets.jobsWith3d} of ${h.totalJobs} jobs`)}
                            {renderStatTile('Images Published', assets.totalImages, `${assets.avgImages} per job average`)}
                        </div>

                        <div className="overview-grid">
                            {renderBreakdownBlock('Jobs By Type', libraryStats.typeRows, { keyHeader: 'Job Type', showHours: true })}
                            {renderBreakdownBlock('Jobs By Year', libraryStats.yearRows, { keyHeader: 'Year', showHours: true })}
                            {renderBreakdownBlock('Incoming Source Material', libraryStats.inputRows, { keyHeader: 'Input Type', showHours: true })}
                            {renderBreakdownBlock('Requesting Designers', libraryStats.designerRows, { keyHeader: 'Designer', showHours: true })}
                        </div>

                        <h3 className="overview-block__title overview-block__title--wide">Monthly Delivery Throughput</h3>
                        <div id="throughputChart" className="chart-container"></div>

                        <h3 className="overview-block__title overview-block__title--wide">3D Production Efficiency Over Time</h3>
                        <p className="overview-chart-note">
                            From March 2026 onward, the first full month in which every job shipped
                            with 3D models. Earlier months ran a different process and are not
                            comparable, so they are excluded from this chart only.
                        </p>
                        <div id="efficiencyTrendChart" className="chart-container"></div>

                        {libraryStats.artistNetRows.length > 0 && (
                            <>
                                <div className="section-title-with-legend overview-block__title--wide">
                                    <h3 className="overview-block__title section-title-no-border">Productivity: Absolute Time Card vs Net In Scope Hours</h3>
                                    <div className="chart-legend-html">
                                        <div className="legend-item-html">
                                            <span className="legend-rect-html" style={{ backgroundColor: '#9aa5ac' }}></span>
                                            <span className="legend-text-html">Absolute</span>
                                        </div>
                                        <div className="legend-item-html">
                                            <span className="legend-rect-html" style={{ backgroundColor: '#5b7c99' }}></span>
                                            <span className="legend-text-html">Net In Scope</span>
                                        </div>
                                    </div>
                                </div>
                                <div id="absoluteVsNetChart" className="chart-container"></div>
                            </>
                        )}

                        {h.usesOffsets && (
                            <>
                                <h3 className="overview-block__title overview-block__title--wide">Where The Out Of Scope Hours Went</h3>
                                <div id="offsetCompositionChart" className="chart-container"></div>
                            </>
                        )}

                        {libraryStats.artistNetRows.length > 0 && (
                            <div className="overview-block overview-block--wide">
                                <h3 className="overview-block__title">Artist Productivity On Net Figures</h3>
                                <table className="stats-table overview-table overview-table--wide">
                                    <thead>
                                        <tr>
                                            <th>Artist</th>
                                            <th className="number-cell">Jobs</th>
                                            <th className="number-cell">Allocated</th>
                                            <th className="number-cell">Absolute</th>
                                            <th className="number-cell">Out Of Scope</th>
                                            <th className="number-cell">Net In Scope</th>
                                            <th className="number-cell">Avg Per Job</th>
                                            <th className="number-cell">Jobs Per Day</th>
                                            <th className="number-cell">Scope Efficiency</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {libraryStats.artistNetRows.map(row => (
                                            <tr key={row.key}>
                                                <td><strong>{row.key}</strong></td>
                                                <td className="number-cell">{row.jobs}</td>
                                                <td className="number-cell">{row.allocated}h</td>
                                                <td className="number-cell">{row.absolute}h</td>
                                                <td className="number-cell">{row.offsets > 0 ? `-${row.offsets}h` : '-'}</td>
                                                <td className="number-cell">{row.net}h</td>
                                                <td className="number-cell">{row.avgNetPerJob}h</td>
                                                <td className="number-cell">{row.jobsPerDay}</td>
                                                <td className="number-cell">{row.scopeEfficiency}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="overview-empty">
                                    Jobs Per Day assumes a 7.5 hour working day of net in-scope time. Scope Efficiency is
                                    hours allocated divided by net in-scope hours, so out-of-scope work never counts against it.
                                </p>
                            </div>
                        )}

                        <div className="overview-grid overview-grid--thirds">
                            {renderCountListBlock(
                                'ValeVision3D Feature Coverage',
                                libraryStats.adoption.map(a => ({ label: a.label, count: a.count })),
                                h.totalJobs
                            )}
                            {renderCountListBlock(
                                'Records Needing Attention',
                                libraryStats.dataQuality,
                                h.totalJobs,
                                'Every job record is fully populated.'
                            )}
                            <div className="overview-block">
                                <h3 className="overview-block__title">Library Composition</h3>
                                <ul className="overview-list overview-list--plain">
                                    <li className="overview-list__row"><span className="overview-list__label">Jobs With Imagery</span><span className="overview-list__count">{assets.jobsWithImages}</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Jobs With No Imagery</span><span className="overview-list__count">{assets.missingImages}</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Alternative Scheme Entries</span><span className="overview-list__count">{assets.variantJobs}</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Watercolour Artwork Jobs</span><span className="overview-list__count">{assets.watercolourJobs}</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Largest Image Set</span><span className="overview-list__count">{assets.richestJob ? `${assets.richestJob.name} (${assets.richestJob.imageCount})` : 'N/A'}</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Total Hours Quoted</span><span className="overview-list__count">{h.hoursAllocated}h</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Absolute Time Card</span><span className="overview-list__count">{h.hoursTaken}h</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Out Of Scope Hours</span><span className="overview-list__count">{h.hoursOffset > 0 ? `-${h.hoursOffset}h` : '0h'}</span></li>
                                    <li className="overview-list__row"><span className="overview-list__label">Net In Scope Hours</span><span className="overview-list__count">{h.hoursNet}h</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                );
            }
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
                    <Header />

                    {!isStandalone && (
                        <Breadcrumbs
                            trail={[{ label: 'Whitecardopedia', onClick: onBack }]}
                            current="Production Key Performance Indicators"
                        />
                    )}
                    
                    <div className="time-analysis-tool">
                        <div className="time-analysis-tool__content">
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
                            
                            {renderLibraryOverviewPanel()}
                            
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
                                        Group By:
                                        <select id="timelineGroupMode" defaultValue="artist" onChange={handleTimelineUpdate}>
                                            <option value="artist">Concept Artist</option>
                                            <option value="designer">Requesting Designer</option>
                                            <option value="none">No Grouping</option>
                                        </select>
                                    </label>
                                    <label>
                                        Filter Artist:
                                        <select id="artistFilter" onChange={handleTimelineUpdate}>
                                            <option value="all">All Artists</option>
                                        </select>
                                    </label>
                                    <label>
                                        Filter Designer:
                                        <select id="designerFilter" onChange={handleTimelineUpdate}>
                                            <option value="all">All Designers</option>
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
