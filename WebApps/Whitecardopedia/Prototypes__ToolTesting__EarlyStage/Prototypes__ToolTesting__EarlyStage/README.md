# Whitecardopedia Artist Timeline Visualizer

## Overview

An interactive data visualization tool built with D3.js that analyzes all project.json files from the Whitecardopedia 2025 projects directory. The tool provides comprehensive insights into artist productivity, project timelines, and performance metrics.

## Author

**Adam Noble - Noble Architecture**  
Created: 24-Oct-2025

## Features

### 1. Artist Productivity Bar Chart
- Horizontal bar chart showing the number of projects completed by each artist
- Color-coded bars for easy visual distinction
- Interactive tooltips with detailed statistics
- Sorted by project count (most prolific artists first)

### 2. Project Timeline (Gantt Chart)
- Visual timeline showing request and delivery dates for all projects
- Color-coded by artist for easy identification
- Options to group by artist or filter to specific artists
- Interactive tooltips showing project details, turnaround time, and hours

### 3. Artist Statistics Table
- Comprehensive table with key performance metrics:
  - Total projects count
  - Average turnaround time (days)
  - Hours allocated vs hours taken
  - Efficiency percentage
  - Active period (date range)

### 4. Time Efficiency Chart
- Dual-bar comparison of allocated hours vs actual hours
- Green bars indicate projects completed within allocated time
- Orange bars indicate projects that exceeded allocated time
- Helps identify efficiency trends across artists

## Usage

### Starting the Tool

1. **Open the HTML file**:
   ```
   WebApps/Whitecardopedia/Prototypes__ToolTesting__EarlyStage/Prototypes__ToolTesting__EarlyStage/index.html
   ```

2. **Click "Load Project Data"**:
   - The tool will scan and load all project.json files from:
     ```
     WebApps/Whitecardopedia/Projects/2025/
     ```
   - Excludes backup folders and template projects automatically

3. **Explore the visualizations**:
   - All charts update automatically once data is loaded
   - Hover over elements for detailed tooltips
   - Use filters and controls to customize views

### Interactive Controls

**Timeline Chart Controls**:
- **Group by Artist**: Check this to group projects by artist name
- **Filter Artist**: Select a specific artist to view only their projects, or "All Artists" for complete view

### Data Structure

The tool expects `project.json` files with the following structure:

```json
{
  "projectName": "Project Name",
  "projectCode": "12345",
  "productionData": {
    "conceptArtist": "Artist Name",
    "input": "CAD File | Hand Drawn Concept",
    "additionalNotes": "Notes about the project"
  },
  "scheduleData": {
    "dateReceived": "DD-MMM-YYYY",
    "dateFulfilled": "DD-MMM-YYYY",
    "timeAllocated": 5,
    "timeTaken": 4
  }
}
```

## Technical Details

### Technologies Used
- **D3.js v7** (loaded from CDN)
- Vanilla JavaScript (ES6+)
- HTML5 / CSS3
- Vale Design Suite styling standards

### File Structure
```
Prototypes__ToolTesting__EarlyStage/
├── index.html          # Main HTML structure
├── style.css           # Vale Design Suite styles
├── visualization.js    # Data processing and D3.js visualizations
└── README.md          # This file
```

### Key Calculations

**Turnaround Time**: Days between `dateReceived` and `dateFulfilled`

**Efficiency**: `(Hours Allocated / Hours Taken) × 100`
- 100% = Perfect efficiency (completed exactly on time)
- >100% = Over-delivered (took less time than allocated)
- <100% = Under-delivered (took more time than allocated)

**Average Turnaround**: Mean turnaround time across all projects for an artist

## Code Conventions

This tool follows **Adam Noble's Vale Design Suite coding conventions**:

- ✓ Regional structure with collapsible sections
- ✓ Function headers with clear descriptions
- ✓ Inline comments using `// <--` notation
- ✓ Column-aligned CSS properties
- ✓ Vale color scheme and typography standards
- ✓ Consistent 4-space indentation within regions

## Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**Note**: Requires a local web server due to CORS restrictions when loading JSON files. Modern browsers block `file://` protocol requests to local JSON files.

### Running a Local Server

**Option 1 - Python**:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2 - Node.js**:
```bash
npx http-server
```

**Option 3 - VS Code**:
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

Then navigate to:
```
http://localhost:8000/WebApps/Whitecardopedia/Prototypes__ToolTesting__EarlyStage/Prototypes__ToolTesting__EarlyStage/
```

## Future Enhancements

Potential improvements for future versions:
- Export visualizations as PNG/SVG
- PDF report generation
- Date range filtering
- Project type categorization
- Performance comparison over time
- Artist workload forecasting
- CSV data export

## Known Limitations

1. **Static folder list**: The tool uses a hardcoded list of project folders rather than dynamic directory scanning (browser security limitation)
2. **CORS requirements**: Must be run from a web server, not directly from filesystem
3. **No data persistence**: Data must be reloaded on each page refresh

## License

Vale Design Suite Internal Tool  
© Noble Architecture 2025

---

**Last Updated**: 24-Oct-2025  
**Version**: 1.0.0

