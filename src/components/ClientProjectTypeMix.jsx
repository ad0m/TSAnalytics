import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import { uiTheme } from '../theme'

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

const PROJECT_TYPE_COLORS = [
  ...tooltipColors,            // 15 base palette colors
  '#2EC27E',                   // Extra 1: Emerald green
  '#FF7F50'                    // Extra 2: Coral orange
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
          <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs mb-2" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Total:</span>
              <span className="font-bold" style={{ color: tooltipColors[12] }}>{data.totalHours}h</span>
            </div>
            {payload.map((entry, index) => {
              if (entry.value > 0) {
                return (
                  <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                    <span style={{ color: '#EFECD2' }}>{entry.dataKey}:</span>
                    <span className="font-bold" style={{ color: entry.color }}>{entry.value}h</span>
                  </div>
                )
              }
              return null
            })}
            <div className="flex justify-between items-center text-xs mt-1 border-t pt-1" style={{ textShadow, borderColor: uiTheme.muted }}>
              <span style={{ color: '#EFECD2' }}>Action:</span>
              <span className="font-bold" style={{ color: tooltipColors[13] }}>Click to filter</span>
            </div>
          </div>
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
        {projectTypes.map((projectType, index) => (
          <div key={projectType} className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded" 
              style={{ backgroundColor: PROJECT_TYPE_COLORS[index % PROJECT_TYPE_COLORS.length] }}
            ></div>
            <span className="break-words" style={{ whiteSpace: 'normal' }} title={projectType}>{projectType}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
