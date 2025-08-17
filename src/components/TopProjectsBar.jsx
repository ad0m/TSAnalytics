import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { ACCESSIBLE_COLORS } from '../lib/utils.jsx'

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
          console.log('Added PM:', member, 'to project:', project, 'hours:', hours) // Debug log
        } else if (isEngineer) {
          projectEngineers[project][member] = (projectEngineers[project][member] || 0) + hours
          console.log('Added Engineer:', member, 'to project:', project, 'hours:', hours) // Debug log
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
                console.log('Processing PM name:', name) // Debug log
                
                // Convert "Last, First" format to "First Last"
                if (name.includes(',')) {
                  const parts = name.split(',').map(part => part.trim())
                  console.log('Split PM parts:', parts) // Debug log
                  
                  if (parts.length === 2) {
                    const firstName = parts[1].trim()
                    const lastName = parts[0].trim()
                    const formattedName = `${firstName} ${lastName}`
                    console.log('Formatted PM name:', formattedName) // Debug log
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
            console.log('Processing engineer name:', name) // Debug log
            
            // Convert "Last, First" format to "First Last"
            if (name.includes(',')) {
              const parts = name.split(',').map(part => part.trim())
              console.log('Split parts:', parts) // Debug log
              
              if (parts.length === 2) {
                const firstName = parts[1].trim()
                const lastName = parts[0].trim()
                const formattedName = `${firstName} ${lastName}`
                console.log('Formatted name:', formattedName) // Debug log
                return formattedName
              }
            }
            return name // Return as-is if no comma found
          })
          .join(', ')
        
        console.log('Final engineers string for project:', project, ':', engineers) // Debug log
        
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
                  const data = payload[0].payload
                  const hours = data.hours
                  const pct = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : '0.0'
                  const company = data.company || 'Unknown Company'
                  const projectManager = data.projectManager || 'Not assigned'
                  const engineers = data.engineers || 'Not assigned'
                  
                  return (
                    <div style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#cbd5e1'
                    }}>
                      <div style={{ 
                        color: '#84cc16', 
                        fontWeight: 'bold', 
                        fontSize: '14px',
                        marginBottom: '8px',
                        borderBottom: '1px solid #475569',
                        paddingBottom: '4px'
                      }}>
                        Project Details
                      </div>
                      <div style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        marginBottom: '6px',
                        fontSize: '13px'
                      }}>
                        {data.project}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>Hours:</span> {hours}h ({pct}%)
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>Company:</span> {company}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>PM/s:</span> {projectManager}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold' }}>Engineer/s:</span> {engineers}
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
                <Cell key={`cell-${index}`} fill={ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length]} />
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
