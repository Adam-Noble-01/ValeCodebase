import { Na__Utils__TimeToMinutes } from '../05__AppUtils/Na__Utils__Time.js';

// -----------------------------------------------------------------------------
// REGION | Analytics Renderer
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Chart Instance Handles
 // ------------------------------------------------------------
 let Na__Analytics__PieChartInstance = null;
 let Na__Analytics__BarChartInstance = null;
 // ------------------------------------------------------------


 // FUNCTION | Render Analytics View
 // ------------------------------------------------------------
 export function Na__Analytics__RenderAnalytics(config) {
     const { panelElement, worker } = config;

     if (!worker) {
         panelElement.innerHTML = '<div class="na-analytics-root"><div class="na-analytics-grid"><div class="na-analytics-card">No worker data available.</div></div></div>';
         return;
     }

     const analyticsData = Na__Analytics__BuildAnalyticsData(worker);

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
                        <div class="na-analytics-value na-analytics-value--emerald">${worker.shifts.length}</div>
                    </div>
                </div>
                <div class="na-analytics-chart-grid">
                    <div class="na-analytics-card">
                        <div style="font-weight:700;margin-bottom:8px;">Time Distribution by Task</div>
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
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Build Aggregate Analytics Data
 // ------------------------------------------------------------
 function Na__Analytics__BuildAnalyticsData(worker) {
     const taskHoursMap = {};
     const dateHoursMap = {};

     worker.shifts.forEach((shiftValue) => {
         const durationHours = (Na__Utils__TimeToMinutes(shiftValue.endTime) - Na__Utils__TimeToMinutes(shiftValue.startTime)) / 60;
         const taskTitle = shiftValue.title || 'Untitled Task';

         taskHoursMap[taskTitle] = (taskHoursMap[taskTitle] || 0) + durationHours;
         dateHoursMap[shiftValue.date] = (dateHoursMap[shiftValue.date] || 0) + durationHours;
     });

     const taskData = Object.entries(taskHoursMap)
         .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
         .sort((a, b) => b.value - a.value);

     const dayData = Object.entries(dateHoursMap)
         .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
         .map(([dateValue, value]) => ({
             name: new Date(dateValue).toLocaleDateString('en-US', { weekday: 'short' }),
             value: Number(value.toFixed(1))
         }));

     const totalHours = Object.values(taskHoursMap).reduce((accValue, currentValue) => accValue + currentValue, 0);
     return { taskData, dayData, totalHours };
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Create Analytics Chart Instances
 // ------------------------------------------------------------
 function Na__Analytics__BuildCharts(analyticsData) {
     if (typeof window.Chart === 'undefined') {
         return;
     }

     const pieCanvas = document.getElementById('naAnalyticsPieChart');
     const barCanvas = document.getElementById('naAnalyticsBarChart');
     if (!pieCanvas || !barCanvas) return;

     Na__Analytics__PieChartInstance = new window.Chart(pieCanvas, {
         type: 'doughnut',
         data: {
             labels: analyticsData.taskData.map((itemValue) => itemValue.name),
             datasets: [
                 {
                     data: analyticsData.taskData.map((itemValue) => itemValue.value),
                     backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#14b8a6']
                 }
             ]
         },
         options: {
             responsive: true,
             maintainAspectRatio: false,
             plugins: {
                 legend: { position: 'bottom' }
             }
         }
     });

     Na__Analytics__BarChartInstance = new window.Chart(barCanvas, {
         type: 'bar',
         data: {
             labels: analyticsData.dayData.map((itemValue) => itemValue.name),
             datasets: [
                 {
                     label: 'Hours',
                     data: analyticsData.dayData.map((itemValue) => itemValue.value),
                     backgroundColor: '#6366f1'
                 }
             ]
         },
         options: {
             responsive: true,
             maintainAspectRatio: false
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
