import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'

const PROJECT_TYPE_COLORS = [
  '#84cc16', '#22d3ee', '#a78bfa', '#fb7185', '#fbbf24', '#34d399',
  '#f472b6', '#60a5fa', '#f97316', '#10b981', '#8b5cf6', '#ef4444'
]

export default function ClientProjectTypeMix({ filteredRows, onCompanyFilter }) {
  const { data, projectTypes } = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return { data: [], projectTypes: [] }
    
    // Group by client and project type
    const clientProjectTypeData = {}
    const allProjectTypes = new Set()
    
    for (const row of filteredRows) {
      const client = row.Company || 'Unknown'
      if (row.isInternal) continue // Exclude internal work
      
      const projectType = row['Project Type'] || 'Unknown'
      allProjectTypes.add(projectType)
      
      if (!clientProjectTypeData[client]) {
        clientProjectTypeData[client] = {}
      }
      
      clientProjectTypeData[client][projectType] = (clientProjectTypeData[client][projectType] || 0) + row.Hours
    }
    
    const projectTypesArray = Array.from(allProjectTypes).sort()
    
    // Convert to chart data
    const result = Object.entries(clientProjectTypeData).map(([client, projectTypes]) => {
      const totalHours = Object.values(projectTypes).reduce((sum, hours) => sum + hours, 0)
      
      if (totalHours === 0) return null
      
      const clientData = {
        client,
        totalHours: Math.round(totalHours * 4) / 4
      }
      
      // Add each project type as a property
      projectTypesArray.forEach(projectType => {
        const hours = projectTypes[projectType] || 0
        clientData[projectType] = Math.round(hours * 4) / 4
      })
      
      return clientData
    }).filter(Boolean)
    
    // Sort by total hours descending and take top 10
    result.sort((a, b) => b.totalHours - a.totalHours)
    return { 
      data: result.slice(0, 10),
      projectTypes: projectTypesArray
    }
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300 mb-2">Total: {data.totalHours}h</p>
          {payload.map((entry, index) => {
            if (entry.value > 0) {
              return (
                <p key={index} className="text-xs" style={{ color: entry.color }}>
                  {entry.dataKey}: {entry.value}h
                </p>
              )
            }
            return null
          })}
          <p className="text-xs text-cyan-400 mt-1 border-t border-slate-600 pt-1">
            Click to filter by this client
          </p>
        </div>
      )
    }
    return null
  }
  
  const handleBarClick = (data) => {
    if (data && data.client && onCompanyFilter) {
      onCompanyFilter(data.client)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Client Project Type Mix</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No client project type data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Client Project Type Mix</h3>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 24, top: 8, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Hours', position: 'insideBottom', offset: 0, style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="client" 
              type="category" 
              width={180} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500, wordBreak: 'break-all', whiteSpace: 'pre-line' }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {projectTypes.map((projectType, index) => (
              <Bar 
                key={projectType}
                dataKey={projectType}
                stackId="projectType"
                fill={PROJECT_TYPE_COLORS[index % PROJECT_TYPE_COLORS.length]}
                cursor="pointer"
                onClick={handleBarClick}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
        {projectTypes.slice(0, 6).map((projectType, index) => ( // Show only first 6 in legend for space
          <div key={projectType} className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded" 
              style={{ backgroundColor: PROJECT_TYPE_COLORS[index % PROJECT_TYPE_COLORS.length] }}
            ></div>
            <span className="truncate max-w-20" title={projectType}>{projectType}</span>
          </div>
        ))}
        {projectTypes.length > 6 && (
          <span className="text-slate-500">+{projectTypes.length - 6} more</span>
        )}
      </div>
    </div>
  )
}
