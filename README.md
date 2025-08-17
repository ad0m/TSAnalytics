# Timesheet Analytics Dashboard

A comprehensive React-based analytics dashboard for timesheet data analysis, built with Vite and modern web technologies.

## 🚀 Features

### 📊 **Key Performance Indicators (KPIs)**
- **Department Utilisation %**: Overall team productivity metrics
- **Billable Hours**: Total revenue-generating time tracked
- **Internal Hours Share %**: Internal vs client work breakdown
- **Team-specific Utilisation**: Cloud, Network, and PM team performance metrics
- Each KPI includes detailed calculation explanations for transparency

### 📈 **Interactive Charts & Visualisations**
- **Role Utilisation Performance**: Bullet chart with team-specific colour coding and target lines
- **Department Utilisation Trends**: Time-series analysis of team performance
- **Billable vs Non-billable Hours**: Weekly aggregation with dynamic date filtering
- **Top Companies by Billable Hours**: Client revenue analysis
- **Client Pareto Analysis**: 80/20 rule visualisation for client focus

### 🔍 **Advanced Filtering**
- **Period Filters**: Month, Quarter, Financial Year, or Custom date ranges
- **Team Filters**: Filter by specific roles (Cloud, Network, PM)
- **Member Filters**: Individual team member analysis
- **Company Filters**: Client-specific insights
- **Project Type Filters**: Work category analysis
- **Productivity Filters**: Billable vs non-billable focus

### 📱 **Modern UI/UX**
- **Dark Theme**: Professional dark palette throughout
- **Responsive Design**: Works on desktop, tablet
- **Export Functionality**: PNG export for charts and reports
- **Card-based Layout**: Clean, organised information hierarchy
- **Interactive Elements**: Clickable filters and drill-down capabilities

## 🛠️ **Technical Stack**

- **Frontend**: React 18 with Vite for fast development
- **Charts**: Recharts library for interactive visualisations
- **Styling**: Tailwind CSS with custom Oryx theme
- **Date Handling**: Day.js with UK date format support (DD/MM/YYYY)
- **CSV Processing**: Papa Parse for timesheet data import
- **Exports**: html-to-image for PNG generation at 2x resolution

## 📋 **Data Format**

The application expects CSV files with the following structure:
- **Date**: UK format (DD/MM/YYYY, D/M/YYYY, or DD/MM/YY)
- **Member**: Team member name
- **Role**: Team/Department (Cloud, Network, PM, etc.)
- **Company**: Client name
- **Project Type**: Work category
- **Hours**: Time logged (decimal format)
- **Productivity**: "Productive" or "Unproductive" classification

## 🚀 **Getting Started**

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd landing

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Usage
1. **Upload CSV**: Use the file upload area to import your timesheet data
2. **Apply Filters**: Use the filter panel to focus on specific time periods, teams, or clients
3. **Analyse Data**: Explore the various charts and KPIs across different tabs
4. **Export Results**: Use the export functionality to save charts as PNG images

## 📊 **Dashboard Sections**

### Overview
- Key Performance Indicators with detailed explanations
- Role Utilisation Performance with team-specific targets
- Department trends and billable vs non-billable analysis

### People
- Individual team member performance analysis
- Role-based productivity metrics
- Team utilisation comparisons

### Clients
- Client revenue analysis and project breakdowns
- Company-wise billable hours tracking
- Client mix and project type analysis

### Projects
- Project type performance and trends
- Work category analysis and productivity insights

### Governance
- Late posting impact analysis
- Data quality metrics and compliance tracking

## 🎨 **Design System**

- **Colors**: Custom Oryx palette with dark theme
- **Typography**: Clean, readable font hierarchy
- **Components**: Consistent card-based layout with `.oryx-card`, `.oryx-heading`, and `.oryx-primary` styles
- **Icons**: Contextual emoji icons for visual clarity
- **Export**: All charts include "Export PNG" functionality

## 🔧 **Configuration**

### Date Formats
The application is configured for UK date formats:
- Primary: DD/MM/YYYY (e.g., 25/12/2025)
- Alternative: D/M/YYYY (e.g., 5/1/2025)
- Short: DD/MM/YY (e.g., 25/12/25)

### Fiscal Year
- Starts in April (April = Month 1)
- Financial year calculations based on April-March cycle

## 📈 **Performance Optimizations**

- **Memoized Calculations**: Heavy computations cached with React.useMemo
- **Efficient Filtering**: Optimised filter application for large datasets
- **Lazy Loading**: Components load only when needed
- **Responsive Charts**: Dynamic sizing based on container dimensions

## 🔍 **Debugging & Development**

The application includes comprehensive console logging for development:
- Data processing steps with detailed breakdowns
- Filter application results and row counts
- Chart data transformation logging
- Date parsing validation and error detection

## 📝 **License**

This project is proprietary software developed for timesheet analytics and reporting.

## 🤝 **Contributing**

Internal development project. For feature requests or bug reports, please contact the development team.

---

Built for efficient timesheet analytics and team performance insights.