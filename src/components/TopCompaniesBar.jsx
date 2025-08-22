import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'
import { uiTheme } from '../theme'

// Custom color palette matching the Project Type Trends & Summary chart
const CUSTOM_COLORS = [
  '#B5C933', // Lime Zest
  '#FF4F00', // Vibrant Orange
  '#3CC9E3', // Bright Aqua
  '#FFD166', // Soft Yellow
  '#FF6F61', // Coral
  '#C62828', // Deep Red
  '#8E44AD', // Plum
  '#FF3462', // Vivid Pink
  '#4A3F94', // Indigo
  '#4DD0E1', // Sky Blue
  '#1E8FA6', // Turquoise
  '#FF9E2C', // Warm Amber
  '#7FE7A1', // Mint Green
  '#3C4CFF', // Electric Blue
  '#A58BFF'  // Light Lavender
]

export default function TopCompaniesBar({ filteredRows, onCompanyClick }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by company and sum billable hours, also collect project details
    const companyData = {}
    
    for (const row of filteredRows) {
      if (!row.isBillable) continue // Only billable hours
      
      const company = row.Company || 'Unknown'
      const project = row['Project Type'] || 'Unknown'
      
      if (!companyData[company]) {
        companyData[company] = {
          totalHours: 0,
          projects: {}
        }
      }
      
      companyData[company].totalHours += row.Hours
      
      if (!companyData[company].projects[project]) {
        companyData[company].projects[project] = 0
      }
      companyData[company].projects[project] += row.Hours
    }
    
    // Convert to array, sort, and take top 10
    const result = Object.entries(companyData)
      .map(([company, data]) => ({
        company,
        hours: Math.round(data.totalHours * 4) / 4, // Round to 0.25
        projects: data.projects
      }))
      .filter(item => !['OryxAlign', 'OryxAlign-Internal c/code'].includes(item.company)) // Exclude internal companies
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const barData = payload[0].payload
      const projects = barData.projects || {}
      
      // Get the color for this specific bar to use in tooltip
      const barIndex = data.findIndex(item => item.company === barData.company)
      const barColor = CUSTOM_COLORS[barIndex % CUSTOM_COLORS.length]
      
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl min-w-48"
          style={{ 
            backgroundColor: '#586961', // Smokey Sage
            borderColor: uiTheme.muted,
            textShadow: '0 1px 1px rgba(0,0,0,0.5)'
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: '#B5C933' }}>
            Company: {label}
          </p>
          
          {/* Project breakdown */}
          {Object.entries(projects).map(([project, hours]) => (
            <div key={project} className="flex justify-between items-center text-xs mb-1">
              <span className="truncate max-w-32" style={{ color: '#EFECD2' }}>{project}:</span>
              <span className="font-bold" style={{ color: barColor }}>{Math.round(hours * 4) / 4}h</span>
            </div>
          ))}
          
          <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${uiTheme.border}` }}>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: '#EFECD2' }}>Total Hours:</span>
              <span className="font-bold" style={{ color: barColor }}>{payload[0].value}h</span>
            </div>
          </div>
          
          <p className="text-xs mt-2 text-center" style={{ color: barColor }}>
            Click to filter by this company
          </p>
        </div>
      )
    }
    return null
  }
  
  const handleBarClick = (data) => {
    if (data && data.company && onCompanyClick) {
      onCompanyClick(data.company)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Top 10 Companies by Billable Hours</h3>
        <div className="flex h-48 items-center justify-center text-sm" style={{ color: uiTheme.muted }}>
          No billable hours data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Top 10 Companies by Billable Hours</h3>
      <div className="h-[28rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 24, top: 8, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={uiTheme.chart.grid} />
            <XAxis 
              type="number" 
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ value: 'Billable Hours', position: 'bottom', style: { fill: uiTheme.chart.axis } }}
            />
            <YAxis 
              dataKey="company" 
              type="category" 
              width={120} 
              interval={0} 
              tick={{ fill: uiTheme.chart.axis, fontSize: 11 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="hours" 
              cursor="pointer"
              onClick={handleBarClick}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CUSTOM_COLORS[index % CUSTOM_COLORS.length]}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Click on any bar to filter by that company
      </div>
    </div>
  )
}
