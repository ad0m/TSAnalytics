import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AvgHoursPerProjectByClient({ filteredRows, onCompanyFilter }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by client and project
    const clientProjectData = {}
    
    for (const row of filteredRows) {
      const client = row.Company || 'Unknown'
      if (row.isInternal) continue // Exclude internal work
      
      const project = row['Project/Ticket'] || 'Unknown'
      const key = `${client}|${project}`
      
      if (!clientProjectData[client]) {
        clientProjectData[client] = {}
      }
      
      if (!clientProjectData[client][project]) {
        clientProjectData[client][project] = 0
      }
      
      clientProjectData[client][project] += row.Hours
    }
    
    // Calculate average hours per project and project count for each client
    const result = Object.entries(clientProjectData).map(([client, projects]) => {
      const projectEntries = Object.entries(projects)
      const totalHours = projectEntries.reduce((sum, [, hours]) => sum + hours, 0)
      const projectCount = projectEntries.length
      const avgHoursPerProject = projectCount > 0 ? totalHours / projectCount : 0
      
      return {
        client,
        avgHours: Math.round(avgHoursPerProject * 4) / 4, // Round to 0.25
        projectCount,
        totalHours: Math.round(totalHours * 4) / 4,
        x: client, // For scatter chart x-axis
        y: avgHoursPerProject,
        size: Math.max(20, Math.min(200, projectCount * 10)) // Size based on project count
      }
    })
    
    // Sort by total hours and take top 15 for readability
    result.sort((a, b) => b.totalHours - a.totalHours)
    return result.slice(0, 15)
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{data.client}</p>
          <p className="text-xs text-slate-300">
            Avg Hours/Project: {data.avgHours}h
          </p>
          <p className="text-xs text-slate-300">
            Number of Projects: {data.projectCount}
          </p>
          <p className="text-xs text-slate-300">
            Total Hours: {data.totalHours}h
          </p>
          <p className="text-xs text-cyan-400 mt-1 border-t border-slate-600 pt-1">
            Click to filter by this client
          </p>
        </div>
      )
    }
    return null
  }
  
  const handleDotClick = (data) => {
    if (data && data.client && onCompanyFilter) {
      onCompanyFilter(data.client)
    }
  }
  
  // Custom tick formatter for X-axis to show client names at an angle
  const formatClientName = (client) => {
    return client.length > 10 ? `${client.substring(0, 8)}...` : client
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Avg Hours per Project by Client</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No project data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Avg Hours per Project by Client</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart 
            data={data} 
            margin={{ left: 8, right: 16, top: 8, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="category"
              dataKey="client"
              tick={{ fill: '#cbd5e1', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tickFormatter={formatClientName}
            />
            <YAxis 
              type="number"
              dataKey="y"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Avg Hours/Project', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Scatter 
              dataKey="y" 
              fill="#22d3ee"
              cursor="pointer"
              onClick={handleDotClick}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill="#22d3ee"
                  r={Math.sqrt(entry.size)} // Use square root for better visual scaling
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400 space-y-1">
        <p>Dot size represents number of projects</p>
        <p>Click on any dot to filter by that client</p>
      </div>
    </div>
  )
}
