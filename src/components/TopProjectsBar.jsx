import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { ACCESSIBLE_COLORS } from '../lib/utils.jsx'
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

export default function TopProjectsBar({ filteredRows, onProjectClick }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by project/ticket and sum total hours (posted rule - all hours)
    const projectHours = {}
    const projectCompanies = {} // Track company for each project
    const projectManagers = {} // Track PM with most hours for each project
    const projectEngineers = {} // Track all engineers for each project
    
    for (const row of filteredRows) {
      const project = row['Project/Ticket'] || 'Unknown'
      const company = row.Company || 'Unknown Company'
      const member = row.Member || 'Unknown'
      const workRole = row['Work Role'] || ''
      const role = row.Role || ''
      const hours = row.Hours || 0
      
      if (!projectHours[project]) {
        projectHours[project] = 0
        projectCompanies[project] = company
        projectManagers[project] = {}
        projectEngineers[project] = {}
      }
      
      projectHours[project] += hours
      
      // Track hours by member for this project based on actual roles
      if (member && hours > 0) {
        const isPM = workRole.toLowerCase().includes('project manager') || 
                    role.toLowerCase().includes('pm')
        const isEngineer = workRole.toLowerCase().includes('project engineer') || 
                          role.toLowerCase().includes('cloud') || 
                          role.toLowerCase().includes('network')
        
        if (isPM) {
          projectManagers[project][member] = (projectManagers[project][member] || 0) + hours
        } else if (isEngineer) {
          projectEngineers[project][member] = (projectEngineers[project][member] || 0) + hours
        }
      }
    }
    
    // Convert to array and sort by hours descending, take top 30
    const result = Object.entries(projectHours)
      .map(([project, hours]) => {
        // Get PM with most hours
        const pmEntries = Object.entries(projectManagers[project] || {})
        const topPM = pmEntries.length > 0 
          ? pmEntries.sort((a, b) => b[1] - a[1])
              .map(([name, hours]) => {
                // Convert "Last, First" format to "First Last"
                if (name.includes(',')) {
                  const parts = name.split(',').map(part => part.trim())
                  
                  if (parts.length === 2) {
                    const firstName = parts[1].trim()
                    const lastName = parts[0].trim()
                    const formattedName = `${firstName} ${lastName}`
                    return formattedName
                  }
                }
                return name // Return as-is if no comma found
              })
              .join(', ')
          : 'Not assigned'
        
        // Get all engineers (sorted by hours)
        const engineerEntries = Object.entries(projectEngineers[project] || {})
        const engineers = engineerEntries
          .sort((a, b) => b[1] - a[1])
          .map(([name, hours]) => {
            // Convert "Last, First" format to "First Last"
            if (name.includes(',')) {
              const parts = name.split(',').map(part => part.trim())
              
              if (parts.length === 2) {
                const firstName = parts[1].trim()
                const lastName = parts[0].trim()
                const formattedName = `${firstName} ${lastName}`
                return formattedName
              }
            }
            return name // Return as-is if no comma found
          })
          .join(', ')
        
        return {
          project,
          hours: Math.round(hours * 4) / 4, // Round to 0.25
          company: projectCompanies[project] || 'Unknown Company',
          projectManager: topPM,
          engineers: engineers || 'Not assigned'
        }
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 30) // Changed from 20 to 30
    
    return result
  }, [filteredRows])
  
  // Calculate total hours for percentage
  const totalHours = useMemo(() => {
    return data.reduce((sum, item) => sum + item.hours, 0)
  }, [data])
  
  // Dynamic height calculation matching the "Overall Time Allocation by Project Type" chart
  const heightPx = useMemo(() => {
    const perBar = 32 // px per category row for readability
    const base = 140  // axes + padding
    const calc = perBar * data.length + base
    return Math.max(420, Math.min(calc, 900))
  }, [data.length])
  
  // Custom label renderer matching the Project Type chart exactly
  const renderLabel = (props) => {
    const { x = 0, y = 0, width = 0, height = 0, value } = props || {}
    const hours = Number(value || 0)
    const pct = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : '0.0'
    const label = `${hours}h (${pct}%)`
    const tx = x + width + 8
    const ty = y + height / 2
    return (
      <text 
        x={tx} 
        y={ty} 
        fontSize={12} 
        fill="#cbd5e1" 
        textAnchor="start" 
        dominantBaseline="central" 
        style={{ 
          whiteSpace: 'pre',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
        className="project-label"
      >
        {label}
      </text>
    )
  }
  
  const handleBarClick = (data) => {
    if (data && data.project && onProjectClick) {
      onProjectClick(data.project)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No project data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">🎯</span>
          </span>
          Top 30 Projects by Hours
        </h3>
      </div>
      <div style={{ height: heightPx }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 160, top: 8, bottom: 8 }} // Exact match: right: 160
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              dataKey="project" 
              type="category" 
              width={220} // Exact match: width: 220
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 12 }} // Exact match: fontSize: 12
            />
            <ReTooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const barData = payload[0].payload
                  const hours = barData.hours
                  const pct = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : '0.0'
                  const company = barData.company || 'Unknown Company'
                  const projectManager = barData.projectManager || 'Not assigned'
                  const engineers = barData.engineers || 'Not assigned'
                  
                  // Get the color for this specific bar to use in tooltip
                  const barIndex = data.findIndex(item => item.project === barData.project)
                  const barColor = CUSTOM_COLORS[barIndex % CUSTOM_COLORS.length]
                  const textShadow = '0 1px 1px rgba(0,0,0,0.5)'
                  
                  return (
                    <div 
                      className="rounded-lg border p-3 shadow-2xl"
                      style={{ 
                        backgroundColor: '#586961', 
                        borderColor: uiTheme.muted,
                        color: uiTheme.chart.tooltipText
                      }}
                    >
                      <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>
                        Project: {barData.project}
                      </p>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
                          <span style={{ color: '#EFECD2' }}>Hours:</span>
                          <span className="font-bold" style={{ color: barColor }}>{hours}h ({pct}%)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
                          <span style={{ color: '#EFECD2' }}>Company:</span>
                          <span className="font-bold" style={{ color: barColor }}>{company}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
                          <span style={{ color: '#EFECD2' }}>PM/s:</span>
                          <span className="font-bold" style={{ color: barColor }}>{projectManager}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
                          <span style={{ color: '#EFECD2' }}>Engineer/s:</span>
                          <span className="font-bold" style={{ color: barColor }}>{engineers}</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey="hours" 
              cursor="pointer"
              onClick={handleBarClick}
            >
              <LabelList 
                dataKey="hours" 
                content={renderLabel}
                position="right"
                style={{ 
                  fill: '#cbd5e1',
                  fontSize: '12px',
                  pointerEvents: 'none'
                }}
              />
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CUSTOM_COLORS[index % CUSTOM_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Click on any bar to view project details and breakdown
      </div>
    </div>
  )
}
