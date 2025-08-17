import { useMemo } from 'react'
import { ResponsiveContainer } from 'recharts'

export default function RoleByWorkTypeHeatmap({ filteredRows }) {
  const { heatmapData, maxHours, workTypes, roles } = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return { 
      heatmapData: [], 
      maxHours: 0, 
      workTypes: [], 
      roles: [] 
    }
    
    // Define the roles we want to show
    const targetRoles = ['Cloud', 'Network', 'PM']
    
    // Group by role and work type
    const roleWorkTypeMatrix = {}
    const roleHourTotals = {}
    
    for (const row of filteredRows) {
      const role = row.Role
      const workType = row.boardWorkType || 'Other'
      const hours = row.Hours
      
      if (!targetRoles.includes(role)) continue
      
      if (!roleWorkTypeMatrix[role]) {
        roleWorkTypeMatrix[role] = {}
        roleHourTotals[role] = 0
      }
      
      roleWorkTypeMatrix[role][workType] = (roleWorkTypeMatrix[role][workType] || 0) + hours
      roleHourTotals[role] += hours
    }
    
    // Get all work types present in data
    const allWorkTypes = new Set()
    Object.values(roleWorkTypeMatrix).forEach(workTypeData => {
      Object.keys(workTypeData).forEach(workType => allWorkTypes.add(workType))
    })
    const workTypesArray = Array.from(allWorkTypes).sort()
    
    // Create heatmap data structure
    const heatmapCells = []
    let globalMaxHours = 0
    
    targetRoles.forEach((role, roleIndex) => {
      workTypesArray.forEach((workType, workTypeIndex) => {
        const hours = roleWorkTypeMatrix[role]?.[workType] || 0
        const roleTotal = roleHourTotals[role] || 0
        const percentageOfRole = roleTotal > 0 ? (hours / roleTotal) * 100 : 0
        
        globalMaxHours = Math.max(globalMaxHours, hours)
        
        heatmapCells.push({
          role,
          workType,
          hours: Math.round(hours * 4) / 4,
          percentageOfRole: Math.round(percentageOfRole * 10) / 10,
          roleIndex,
          workTypeIndex,
          x: workTypeIndex,
          y: roleIndex
        })
      })
    })
    
    return {
      heatmapData: heatmapCells,
      maxHours: globalMaxHours,
      workTypes: workTypesArray,
      roles: targetRoles
    }
  }, [filteredRows])
  
  // Get color intensity based on hours (0-1 normalized)
  const getColorIntensity = (hours) => {
    if (maxHours === 0) return 0
    return hours / maxHours
  }
  
  // Get background color based on intensity
  const getCellColor = (intensity) => {
    if (intensity === 0) return '#1e293b' // Dark slate for zero
    
    // Create a gradient from dark blue to bright lime green
    const darkBlue = { r: 30, g: 41, b: 59 } // slate-800
    const limeGreen = { r: 132, g: 204, b: 22 } // lime-500
    
    const r = Math.round(darkBlue.r + (limeGreen.r - darkBlue.r) * intensity)
    const g = Math.round(darkBlue.g + (limeGreen.g - darkBlue.g) * intensity)
    const b = Math.round(darkBlue.b + (limeGreen.b - darkBlue.b) * intensity)
    
    return `rgb(${r}, ${g}, ${b})`
  }
  
  const cellWidth = 120
  const cellHeight = 60
  const margin = { top: 40, right: 20, bottom: 80, left: 100 }
  
  if (!heatmapData || heatmapData.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Role by Work Type Heatmap</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No heatmap data available
        </div>
      </div>
    )
  }
  
  const totalWidth = margin.left + (workTypes.length * cellWidth) + margin.right
  const totalHeight = margin.top + (roles.length * cellHeight) + margin.bottom
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Role by Work Type Heatmap</h3>
      <div className="h-80 overflow-auto">
        <div style={{ width: Math.max(totalWidth, 600), height: Math.max(totalHeight, 300) }}>
          <svg width="100%" height="100%" className="overflow-visible">
            {/* Y-axis labels (Roles) */}
            {roles.map((role, index) => (
              <text
                key={role}
                x={margin.left - 10}
                y={margin.top + (index * cellHeight) + (cellHeight / 2)}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-slate-300"
              >
                {role}
              </text>
            ))}
            
            {/* X-axis labels (Work Types) */}
            {workTypes.map((workType, index) => (
              <text
                key={workType}
                x={margin.left + (index * cellWidth) + (cellWidth / 2)}
                y={margin.top + (roles.length * cellHeight) + 20}
                textAnchor="middle"
                dominantBaseline="hanging"
                className="text-xs fill-slate-300"
                transform={`rotate(-35, ${margin.left + (index * cellWidth) + (cellWidth / 2)}, ${margin.top + (roles.length * cellHeight) + 20})`}
              >
                {workType}
              </text>
            ))}
            
            {/* Heatmap cells */}
            {heatmapData.map((cell, index) => {
              const intensity = getColorIntensity(cell.hours)
              const color = getCellColor(intensity)
              const x = margin.left + (cell.workTypeIndex * cellWidth)
              const y = margin.top + (cell.roleIndex * cellHeight)
              
              return (
                <g key={index}>
                  {/* Cell rectangle */}
                  <rect
                    x={x}
                    y={y}
                    width={cellWidth - 2}
                    height={cellHeight - 2}
                    fill={color}
                    stroke="#475569"
                    strokeWidth={1}
                    className="cursor-pointer hover:stroke-lime-400 hover:stroke-2"
                  >
                    <title>
                      {`${cell.role} - ${cell.workType}\nHours: ${cell.hours}h\n% of Role: ${cell.percentageOfRole}%`}
                    </title>
                  </rect>
                  
                  {/* Cell text */}
                  <text
                    x={x + cellWidth / 2}
                    y={y + cellHeight / 2 - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-medium fill-white pointer-events-none"
                  >
                    {cell.hours}h
                  </text>
                  <text
                    x={x + cellWidth / 2}
                    y={y + cellHeight / 2 + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-slate-200 pointer-events-none"
                  >
                    {cell.percentageOfRole}%
                  </text>
                </g>
              )
            })}
            
            {/* Color scale legend */}
            <g transform={`translate(${margin.left}, ${margin.top - 30})`}>
              <text x={0} y={0} className="text-xs fill-slate-300">
                Hours: 0
              </text>
              <rect x={50} y={-8} width={100} height={16} fill="url(#heatmapGradient)" stroke="#475569" />
              <text x={160} y={0} className="text-xs fill-slate-300">
                {Math.round(maxHours * 4) / 4}
              </text>
            </g>
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="heatmapGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#84cc16" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400 space-y-1">
        <p>Color intensity shows hours relative to maximum (darker = fewer hours, brighter = more hours)</p>
        <p>Percentages show each work type as % of role's total hours</p>
      </div>
    </div>
  )
}
