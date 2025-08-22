import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'
import { uiTheme } from '../theme'

export default function AvgHoursPerProjectByClient({ filteredRows, onCompanyFilter }) {
  // Custom color palette for tooltip values - matching Project Type Trends
  const tooltipColors = [
    '#B5C933', // Lime Zest (brand secondary, high contrast yellow-green)
    '#FF4F00', // Vibrant Orange (brand accent, very strong)
    '#3CC9E3', // Bright Aqua (crisp cyan, pops well)
    '#FFD166', // Soft Yellow (warm yellow, readable, friendly)
    '#FF6F61', // Coral (bright red-pink, strong)
    '#C62828', // Deep Red (serious warning red, high contrast)
    '#8E44AD', // Plum (rich purple, readable on sage)
    '#FF3462', // Vivid Pink (neon raspberry pink, vibrant substitute for orange)
    '#4A3F94', // Indigo (deep, saturated indigo blue)
    '#4DD0E1', // Sky Blue (lighter teal-cyan, softer contrast)
    '#1E8FA6', // Turquoise (medium cyan-teal, still visible on sage)
    '#FF9E2C', // Warm Amber (between orange and yellow, vibrant)
    '#7FE7A1', // Mint Green (fresh mint tone, light and legible)
    '#3C4CFF', // Electric Blue (saturated bright blue)
    '#A58BFF'  // Light Lavender (gentle purple highlight)
  ]

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
          <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>{data.client}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Avg Hours/Project:</span>
              <span className="font-bold" style={{ color: tooltipColors[0] }}>{data.avgHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Number of Projects:</span>
              <span className="font-bold" style={{ color: tooltipColors[1] }}>{data.projectCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Total Hours:</span>
              <span className="font-bold" style={{ color: tooltipColors[2] }}>{data.totalHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1 border-t pt-1" style={{ textShadow, borderColor: uiTheme.muted }}>
              <span style={{ color: '#EFECD2' }}>Action:</span>
              <span className="font-bold" style={{ color: tooltipColors[3] }}>Click to filter</span>
            </div>
          </div>
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
              fill={tooltipColors[1]}
              cursor="pointer"
              onClick={handleDotClick}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={tooltipColors[1]}
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
