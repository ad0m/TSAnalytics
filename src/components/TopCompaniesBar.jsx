import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'
import { uiTheme } from '../theme'

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
      const data = payload[0].payload
      const projects = data.projects || {}
      
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl min-w-48"
          style={{ 
            backgroundColor: uiTheme.chart.tooltipBg, 
            borderColor: uiTheme.chart.tooltipBorder,
            color: uiTheme.chart.tooltipText 
          }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: uiTheme.chart.tooltipText }}>
            Company: {label}
          </p>
          
          {/* Project breakdown */}
          {Object.entries(projects).map(([project, hours]) => (
            <div key={project} className="flex justify-between items-center text-xs mb-1">
              <span className="truncate max-w-32" style={{ color: uiTheme.muted }}>{project}:</span>
              <span className="font-medium" style={{ color: uiTheme.primary }}>{Math.round(hours * 4) / 4}h</span>
            </div>
          ))}
          
          <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${uiTheme.border}` }}>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: uiTheme.muted }}>Total Hours:</span>
              <span className="font-semibold" style={{ color: uiTheme.chart.tooltipText }}>{payload[0].value}h</span>
            </div>
          </div>
          
          <p className="text-xs mt-2 text-center" style={{ color: uiTheme.primary }}>
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
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 24, top: 8, bottom: 8 }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={uiTheme.primary} stopOpacity={0.9}/>
                <stop offset="100%" stopColor={uiTheme.primary} stopOpacity={0.7}/>
              </linearGradient>
            </defs>
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
                  fill="url(#barGradient)"
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
