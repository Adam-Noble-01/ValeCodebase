import { Na__Utils__TimeToMinutes } from '../05__AppUtils/Na__Utils__Time.js';
import { Na__Utils__ParseYyyyMmDdToLocalDate, Na__Utils__FormatLocalDateAsYyyyMmDd, Na__Utils__FormatUkDateLong, Na__Utils__FormatUkDateCompact, Na__Utils__CompareYyyyMmDd } from '../05__AppUtils/Na__Utils__Dates.js';

// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Chart Palette & Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Desaturated Chart Color Palette (25% Reduced Saturation)
    // ------------------------------------------------------------
    const Na__Analytics__ChartPalette  = [
        '#5288df',                                                      // <-- Blue (desaturated from #3b82f6)
        '#926fe3',                                                      // <-- Violet (desaturated from #8b5cf6)
        '#25a47a',                                                      // <-- Green (desaturated from #10b981)
        '#d89628',                                                      // <-- Amber (desaturated from #f59e0b)
        '#dd566d',                                                      // <-- Rose (desaturated from #f43f5e)
        '#7577df',                                                      // <-- Indigo (desaturated from #6366f1)
        '#29a496'                                                       // <-- Teal (desaturated from #14b8a6)
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Chart Instance Handles & Render State
    // ------------------------------------------------------------
    let Na__Analytics__PieChartInstance     = null;
    let Na__Analytics__BarChartInstance     = null;
    let Na__Analytics__CurrentWorker        = null;
    let Na__Analytics__CurrentPanelEl       = null;
    let Na__Analytics__CurrentRange         = null;
    let Na__Analytics__AllCalendarDates     = [];
    let Na__Analytics__FullDateHoursMap     = {};
    let Na__Analytics__TaskThresholdHours   = 0;                                // <-- Minimum hours for donut chart slices
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Date Range & Calendar Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get First-to-Last Day Range for Current Month
    // ------------------------------------------------------------
    function Na__Analytics__GetCurrentMonthRange() {
        const todayValue   = new Date();
        const firstOfMonth = new Date(todayValue.getFullYear(), todayValue.getMonth(), 1);
        const lastOfMonth  = new Date(todayValue.getFullYear(), todayValue.getMonth() + 1, 0);

        return {
            rangeStart : Na__Utils__FormatLocalDateAsYyyyMmDd(firstOfMonth),
            rangeEnd   : Na__Utils__FormatLocalDateAsYyyyMmDd(lastOfMonth)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date as Short Display Label (e.g. "21 Oct 2024")
    // ------------------------------------------------------------
    function Na__Analytics__FormatDateLabel(isoDateString) {
        return Na__Utils__FormatUkDateLong(isoDateString);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Generate All Calendar Dates Between Start and End
    // ------------------------------------------------------------
    function Na__Analytics__GenerateCalendarDates(startISO, endISO) {
        const dates       = [];
        const currentDate = Na__Utils__ParseYyyyMmDdToLocalDate(startISO);
        const endDate     = Na__Utils__ParseYyyyMmDdToLocalDate(endISO);

        while (currentDate <= endDate) {
            dates.push(Na__Utils__FormatLocalDateAsYyyyMmDd(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Task Title Normalization & Display Labels
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalize Task Title Into Case-Insensitive Group Key
    // ------------------------------------------------------------
    function Na__Analytics__NormalizeTaskTitle(taskTitleValue) {
        const titleValue = String(taskTitleValue || '').replace(/\s+/g, ' ').trim();
        if (!titleValue) return 'untitled task';
        return titleValue.toLowerCase();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Normalized Task Key Into Title-Case Label
    // ------------------------------------------------------------
    function Na__Analytics__FormatTaskDisplayName(taskKeyValue) {
        if (!taskKeyValue || taskKeyValue === 'untitled task') return 'Untitled Task';
        return taskKeyValue.replace(/\b[a-z]/g, (charValue) => charValue.toUpperCase());
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Shift Aggregation & Analytics Datasets
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Full Date-Hours Map for All Shifts (Unfiltered)
    // ------------------------------------------------------------
    function Na__Analytics__BuildFullDateHoursMap(worker) {
        const dateHoursMap = {};

        worker.shifts.forEach((shiftValue) => {
            const durationHours = (Na__Utils__TimeToMinutes(shiftValue.endTime) - Na__Utils__TimeToMinutes(shiftValue.startTime)) / 60;
            dateHoursMap[shiftValue.date] = (dateHoursMap[shiftValue.date] || 0) + durationHours;
        });

        return dateHoursMap;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Aggregate Analytics Data (Filtered by Date Range)
    // ------------------------------------------------------------
    function Na__Analytics__BuildAnalyticsData(worker, rangeStart, rangeEnd) {
        const taskHoursMap   = {};
        const taskLabelsMap  = {};
        const dateHoursMap   = {};

        const filteredShifts = worker.shifts.filter((shiftValue) => {
            return shiftValue.date >= rangeStart && shiftValue.date <= rangeEnd;
        });

        filteredShifts.forEach((shiftValue) => {
            const durationHours      = (Na__Utils__TimeToMinutes(shiftValue.endTime) - Na__Utils__TimeToMinutes(shiftValue.startTime)) / 60;
            const normalizedTaskKey  = Na__Analytics__NormalizeTaskTitle(shiftValue.title);

            if (!taskLabelsMap[normalizedTaskKey]) {
                taskLabelsMap[normalizedTaskKey] = Na__Analytics__FormatTaskDisplayName(normalizedTaskKey);
            }

            taskHoursMap[normalizedTaskKey]  = (taskHoursMap[normalizedTaskKey] || 0) + durationHours;
            dateHoursMap[shiftValue.date]    = (dateHoursMap[shiftValue.date] || 0) + durationHours;
        });

        const allTaskData = Object.entries(taskHoursMap)
            .map(([keyValue, value]) => ({
                name  : taskLabelsMap[keyValue] || Na__Analytics__FormatTaskDisplayName(keyValue),
                value : Number(value.toFixed(1))
            }))
            .sort((a, b) => b.value - a.value);

        const thresholdValue = Na__Analytics__TaskThresholdHours;
        let taskData         = allTaskData;
        if (thresholdValue > 0) {
            const aboveThreshold = allTaskData.filter((item) => item.value >= thresholdValue);
            const belowThreshold = allTaskData.filter((item) => item.value < thresholdValue);
            const otherTotal     = belowThreshold.reduce((acc, item) => acc + item.value, 0);

            taskData = aboveThreshold;
            if (otherTotal > 0) {
                taskData = [...aboveThreshold, { name: 'Other', value: Number(otherTotal.toFixed(1)) }];
            }
        }

        const dayData = Object.entries(dateHoursMap)
            .sort(([dateA], [dateB]) => Na__Utils__CompareYyyyMmDd(dateA, dateB))
            .map(([dateValue, value]) => ({
                name  : Na__Utils__FormatUkDateCompact(dateValue),
                value : Number(value.toFixed(1))
            }));

        const totalHours = Object.values(taskHoursMap).reduce((accValue, currentValue) => accValue + currentValue, 0);
        return { taskData, dayData, totalHours, shiftCount: filteredShifts.length };
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - View Composition & Partial DOM Updates
// -----------------------------------------------------------------------------

    // FUNCTION | Render Analytics View (Entry Point)
    // ------------------------------------------------------------
    export function Na__Analytics__RenderAnalytics(config) {
        const { panelElement, worker } = config;

        if (!worker) {
            panelElement.innerHTML = '<div class="na-analytics-root"><div class="na-analytics-grid"><div class="na-analytics-card">No worker data available.</div></div></div>';
            return;
        }

        Na__Analytics__CurrentWorker     = worker;
        Na__Analytics__CurrentPanelEl    = panelElement;
        Na__Analytics__FullDateHoursMap  = Na__Analytics__BuildFullDateHoursMap(worker);

        const shiftDatesSorted = Object.keys(Na__Analytics__FullDateHoursMap).sort();
        if (shiftDatesSorted.length > 0) {
            Na__Analytics__AllCalendarDates = Na__Analytics__GenerateCalendarDates(shiftDatesSorted[0], shiftDatesSorted[shiftDatesSorted.length - 1]);
        } else {
            Na__Analytics__AllCalendarDates = [];
        }

        const monthRange = Na__Analytics__GetCurrentMonthRange();
        if (shiftDatesSorted.length > 0) {
            Na__Analytics__CurrentRange = {
                rangeStart : shiftDatesSorted[0],
                rangeEnd   : shiftDatesSorted[shiftDatesSorted.length - 1]
            };
        } else {
            Na__Analytics__CurrentRange = monthRange;
        }

        Na__Analytics__RenderFullView();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render the Full Analytics View (Stats + Levels + Charts)
    // ------------------------------------------------------------
    function Na__Analytics__RenderFullView() {
        const worker        = Na__Analytics__CurrentWorker;
        const panelElement  = Na__Analytics__CurrentPanelEl;
        const range         = Na__Analytics__CurrentRange;
        const analyticsData = Na__Analytics__BuildAnalyticsData(worker, range.rangeStart, range.rangeEnd);

        panelElement.innerHTML = `
           <div class="na-analytics-root">
               <div class="na-analytics-grid">
                   <div class="na-analytics-stats">
                       <div class="na-analytics-card">
                           <div><strong>${worker.name}</strong></div>
                           <div style="font-size:13px;color:#64748b;">${worker.role}</div>
                       </div>
                       <div class="na-analytics-card">
                           <div style="font-size:13px;color:#64748b;">Total Tracked Hours</div>
                           <div class="na-analytics-value na-analytics-value--indigo">${analyticsData.totalHours.toFixed(1)} hrs</div>
                       </div>
                       <div class="na-analytics-card">
                           <div style="font-size:13px;color:#64748b;">Total Tasks</div>
                           <div class="na-analytics-value na-analytics-value--emerald">${analyticsData.shiftCount}</div>
                       </div>
                   </div>
                   <div class="na-analytics-card na-analytics-levels" id="naAnalyticsLevels">
                       <div class="na-analytics-levels__header">
                           <span class="na-analytics-levels__date" id="naLevelsDateStart">${Na__Analytics__FormatDateLabel(range.rangeStart)}</span>
                           <span class="na-analytics-levels__title">Time Range</span>
                           <span class="na-analytics-levels__date" id="naLevelsDateEnd">${Na__Analytics__FormatDateLabel(range.rangeEnd)}</span>
                       </div>
                       <div class="na-analytics-levels__track" id="naLevelsTrack">
                           <canvas class="na-analytics-levels__canvas" id="naLevelsCanvas"></canvas>
                           <div class="na-analytics-levels__selected" id="naLevelsSelected"></div>
                           <div class="na-analytics-levels__handle na-analytics-levels__handle--left" id="naLevelsHandleLeft"></div>
                           <div class="na-analytics-levels__handle na-analytics-levels__handle--right" id="naLevelsHandleRight"></div>
                       </div>
                   </div>
                   <div class="na-analytics-chart-grid">
                       <div class="na-analytics-card">
                           <div style="font-weight:700;margin-bottom:8px;">Time Distribution by Task</div>
                           <div class="na-analytics-threshold-row">
                               <label for="naThresholdSlider">Min Hours</label>
                               <input type="range" id="naThresholdSlider" min="0" max="5" step="0.25" value="${Na__Analytics__TaskThresholdHours}">
                               <span id="naThresholdLabel">${Na__Analytics__TaskThresholdHours > 0 ? Na__Analytics__TaskThresholdHours.toFixed(2) + ' hrs' : 'Off'}</span>
                           </div>
                           <div class="na-analytics-chart-wrap"><canvas id="naAnalyticsPieChart"></canvas></div>
                       </div>
                       <div class="na-analytics-card">
                           <div style="font-weight:700;margin-bottom:8px;">Hours per Day</div>
                           <div class="na-analytics-chart-wrap"><canvas id="naAnalyticsBarChart"></canvas></div>
                       </div>
                   </div>
               </div>
           </div>
        `;

        Na__Analytics__DestroyCharts();
        Na__Analytics__BuildCharts(analyticsData);
        Na__Analytics__AttachThresholdSlider();
        requestAnimationFrame(() => {
            Na__Analytics__DrawLevelsHistogram();
            Na__Analytics__AttachLevelsDragHandlers();
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Attach Threshold Slider Change Handler
    // ------------------------------------------------------------
    function Na__Analytics__AttachThresholdSlider() {
        const sliderEl = document.getElementById('naThresholdSlider');
        const labelEl  = document.getElementById('naThresholdLabel');
        if (!sliderEl) return;

        sliderEl.addEventListener('input', (eventValue) => {
            const newValue = parseFloat(eventValue.target.value);
            Na__Analytics__TaskThresholdHours = newValue;

            if (labelEl) {
                labelEl.textContent = newValue > 0 ? newValue.toFixed(2) + ' hrs' : 'Off';
            }

            Na__Analytics__UpdateStatsAndCharts();
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Update Stats Cards and Charts Without Full DOM Rebuild
    // ------------------------------------------------------------
    function Na__Analytics__UpdateStatsAndCharts() {
        const worker = Na__Analytics__CurrentWorker;
        const range  = Na__Analytics__CurrentRange;
        if (!worker) return;

        const analyticsData = Na__Analytics__BuildAnalyticsData(worker, range.rangeStart, range.rangeEnd);

        const statsContainer = document.querySelector('.na-analytics-stats');
        if (statsContainer) {
            const cards = statsContainer.querySelectorAll('.na-analytics-card');
            if (cards[1]) {
                const valueEl = cards[1].querySelector('.na-analytics-value');
                if (valueEl) valueEl.textContent = `${analyticsData.totalHours.toFixed(1)} hrs`;
            }
            if (cards[2]) {
                const valueEl = cards[2].querySelector('.na-analytics-value');
                if (valueEl) valueEl.textContent = `${analyticsData.shiftCount}`;
            }
        }

        Na__Analytics__DestroyCharts();
        Na__Analytics__BuildCharts(analyticsData);
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Time Range Levels (Canvas & Overlay Chrome)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Draw Levels Histogram as Area Chart on Canvas
    // ------------------------------------------------------------
    function Na__Analytics__DrawLevelsHistogram() {
        const canvas = document.getElementById('naLevelsCanvas');
        const track  = document.getElementById('naLevelsTrack');
        if (!canvas || !track) return;

        const trackWidth  = track.clientWidth;
        const trackHeight = track.clientHeight;
        if (trackWidth === 0 || trackHeight === 0) return;

        canvas.width  = trackWidth;
        canvas.height = trackHeight;

        const ctx          = canvas.getContext('2d');
        const allDates     = Na__Analytics__AllCalendarDates;
        const dateHoursMap = Na__Analytics__FullDateHoursMap;
        const range        = Na__Analytics__CurrentRange;

        if (allDates.length === 0) return;

        const maxHours   = Math.max(...allDates.map((d) => dateHoursMap[d] || 0), 0.1);
        const padTop     = 8;
        const drawHeight = canvas.height - padTop;
        const maxIdx     = Math.max(1, allDates.length - 1);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const points = allDates.map((dateStr, idx) => {
            const hours = dateHoursMap[dateStr] || 0;
            const xVal  = allDates.length === 1
                ? canvas.width / 2
                : (idx / maxIdx) * canvas.width;
            const yVal  = canvas.height - ((hours / maxHours) * drawHeight);
            return { x: xVal, y: yVal };
        });

        if (points.length === 0) return;

        const buildCurvePath = () => {
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i += 1) {
                const cpX = (points[i - 1].x + points[i].x) / 2;
                ctx.bezierCurveTo(cpX, points[i - 1].y, cpX, points[i].y, points[i].x, points[i].y);
            }
        };

        const areaGradient = ctx.createLinearGradient(0, padTop, 0, canvas.height);
        areaGradient.addColorStop(0, 'rgba(97, 90, 209, 0.30)');
        areaGradient.addColorStop(1, 'rgba(97, 90, 209, 0.04)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, canvas.height);
        ctx.lineTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
            const cpX = (points[i - 1].x + points[i].x) / 2;
            ctx.bezierCurveTo(cpX, points[i - 1].y, cpX, points[i].y, points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, canvas.height);
        ctx.closePath();
        ctx.fillStyle = areaGradient;
        ctx.fill();

        ctx.beginPath();
        buildCurvePath();
        ctx.strokeStyle = 'rgba(97, 90, 209, 0.8)';
        ctx.lineWidth   = 2;
        ctx.stroke();

        let startIdx = allDates.findIndex((d) => d >= range.rangeStart);
        if (startIdx < 0) startIdx = 0;
        let endIdx = allDates.length - 1;
        for (let i = allDates.length - 1; i >= 0; i -= 1) {
            if (allDates[i] <= range.rangeEnd) { endIdx = i; break; }
        }

        const leftX  = (startIdx / maxIdx) * canvas.width;
        const rightX = (endIdx / maxIdx) * canvas.width;

        ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
        if (leftX > 1)             ctx.fillRect(0, 0, leftX, canvas.height);
        if (rightX < canvas.width - 1) ctx.fillRect(rightX, 0, canvas.width - rightX, canvas.height);

        Na__Analytics__UpdateLevelsHandlePositions();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Handle Positions and Date Labels From Current Range
    // ------------------------------------------------------------
    function Na__Analytics__UpdateLevelsHandlePositions() {
        const selectedEl  = document.getElementById('naLevelsSelected');
        const handleLeft  = document.getElementById('naLevelsHandleLeft');
        const handleRight = document.getElementById('naLevelsHandleRight');
        const dateStartEl = document.getElementById('naLevelsDateStart');
        const dateEndEl   = document.getElementById('naLevelsDateEnd');
        if (!selectedEl || !handleLeft || !handleRight) return;

        const allDates = Na__Analytics__AllCalendarDates;
        if (allDates.length === 0) return;

        const range    = Na__Analytics__CurrentRange;
        const maxIdx   = Math.max(1, allDates.length - 1);

        let startIdx = allDates.findIndex((d) => d >= range.rangeStart);
        if (startIdx < 0) startIdx = 0;

        let endIdx = allDates.length - 1;
        for (let i = allDates.length - 1; i >= 0; i -= 1) {
            if (allDates[i] <= range.rangeEnd) { endIdx = i; break; }
        }

        const leftPct  = (startIdx / maxIdx) * 100;
        const rightPct = (endIdx / maxIdx) * 100;

        selectedEl.style.left  = `${leftPct}%`;
        selectedEl.style.width = `${Math.max(0, rightPct - leftPct)}%`;

        handleLeft.style.left  = `${leftPct}%`;
        handleRight.style.left = `${rightPct}%`;

        if (dateStartEl) dateStartEl.textContent = Na__Analytics__FormatDateLabel(range.rangeStart);
        if (dateEndEl)   dateEndEl.textContent   = Na__Analytics__FormatDateLabel(range.rangeEnd);
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Time Range Handle Drag Interaction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Attach Drag Handlers to Level Handles
    // ------------------------------------------------------------
    function Na__Analytics__AttachLevelsDragHandlers() {
        const track       = document.getElementById('naLevelsTrack');
        const handleLeft  = document.getElementById('naLevelsHandleLeft');
        const handleRight = document.getElementById('naLevelsHandleRight');
        if (!track || !handleLeft || !handleRight) return;

        Na__Analytics__SetupHandleDrag(handleLeft, 'left', track);
        Na__Analytics__SetupHandleDrag(handleRight, 'right', track);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Configure Drag Behavior for a Single Handle
    // ------------------------------------------------------------
    function Na__Analytics__SetupHandleDrag(handleElement, side, trackElement) {
        let isDragging = false;

        const onMouseMove = (eventValue) => {
            if (!isDragging) return;
            eventValue.preventDefault();

            const trackRect = trackElement.getBoundingClientRect();
            const clientX   = eventValue.touches ? eventValue.touches[0].clientX : eventValue.clientX;
            const relativeX = Math.max(0, Math.min(clientX - trackRect.left, trackRect.width));
            const pct       = relativeX / trackRect.width;
            const allDates  = Na__Analytics__AllCalendarDates;
            if (allDates.length === 0) return;

            const dateIdx    = Math.round(pct * (allDates.length - 1));
            const clampedIdx = Math.max(0, Math.min(dateIdx, allDates.length - 1));

            if (side === 'left') {
                let rightBound = allDates.length - 1;
                for (let i = 0; i < allDates.length; i += 1) {
                    if (allDates[i] >= Na__Analytics__CurrentRange.rangeEnd) { rightBound = i; break; }
                }
                Na__Analytics__CurrentRange.rangeStart = allDates[Math.min(clampedIdx, rightBound)];
            } else {
                let leftBound = 0;
                for (let i = 0; i < allDates.length; i += 1) {
                    if (allDates[i] >= Na__Analytics__CurrentRange.rangeStart) { leftBound = i; break; }
                }
                Na__Analytics__CurrentRange.rangeEnd = allDates[Math.max(clampedIdx, leftBound)];
            }

            Na__Analytics__DrawLevelsHistogram();
            Na__Analytics__UpdateStatsAndCharts();
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        };

        const onMouseDown = (eventValue) => {
            isDragging = true;
            eventValue.preventDefault();
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onMouseMove, { passive: false });
            document.addEventListener('touchend', onMouseUp);
        };

        handleElement.addEventListener('mousedown', onMouseDown);
        handleElement.addEventListener('touchstart', onMouseDown, { passive: false });
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Analytics Renderer - Chart.js Doughnut & Bar Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create Analytics Chart Instances
    // ------------------------------------------------------------
    function Na__Analytics__BuildCharts(analyticsData) {
        if (typeof window.Chart === 'undefined') return;

        const pieCanvas = document.getElementById('naAnalyticsPieChart');
        const barCanvas = document.getElementById('naAnalyticsBarChart');
        if (!pieCanvas || !barCanvas) return;

        Na__Analytics__PieChartInstance = new window.Chart(pieCanvas, {
            type : 'doughnut',
            data : {
                labels   : analyticsData.taskData.map((itemValue) => itemValue.name),
                datasets : [
                    {
                        data            : analyticsData.taskData.map((itemValue) => itemValue.value),
                        backgroundColor : Na__Analytics__ChartPalette.slice(0, Math.max(analyticsData.taskData.length, 1))
                    }
                ]
            },
            options : {
                responsive          : true,
                maintainAspectRatio : false,
                plugins : {
                    legend : { position: 'bottom' }
                }
            }
        });

        Na__Analytics__BarChartInstance = new window.Chart(barCanvas, {
            type : 'bar',
            data : {
                labels   : analyticsData.dayData.map((itemValue) => itemValue.name),
                datasets : [
                    {
                        label           : 'Hours',
                        data            : analyticsData.dayData.map((itemValue) => itemValue.value),
                        backgroundColor : analyticsData.dayData.map((_, idx) => Na__Analytics__ChartPalette[idx % Na__Analytics__ChartPalette.length])
                    }
                ]
            },
            options : {
                responsive          : true,
                maintainAspectRatio : false
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Destroy Existing Charts
    // ------------------------------------------------------------
    export function Na__Analytics__DestroyCharts() {
        if (Na__Analytics__PieChartInstance) {
            Na__Analytics__PieChartInstance.destroy();
            Na__Analytics__PieChartInstance = null;
        }

        if (Na__Analytics__BarChartInstance) {
            Na__Analytics__BarChartInstance.destroy();
            Na__Analytics__BarChartInstance = null;
        }
    }
    // ------------------------------------------------------------

// endregion ----------------------------------------------------
