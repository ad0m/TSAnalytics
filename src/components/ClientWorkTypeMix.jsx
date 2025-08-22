import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'
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

const WORK_TYPE_COLORS = {
  'Tech Delivery': tooltipColors[0],      // Lime Zest
  'PM Delivery': tooltipColors[1],        // Vibrant Orange
  'Internal Admin': tooltipColors[2],     // Bright Aqua
  'Internal Support': tooltipColors[3],   // Soft Yellow
  'Other': tooltipColors[4]               // Coral
}

export default function ClientWorkTypeMix({ filteredRows, onCompanyFilter }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by client and work type
    const clientWorkTypeData = {}
    
    for (const row of filteredRows) {
      const client = row.Company || 'Unknown'
      if (row.isInternal) continue // Exclude internal work
      
      if (!clientWorkTypeData[client]) {
        clientWorkTypeData[client] = {}
      }
      
      const workType = row.boardWorkType || 'Other'
      clientWorkTypeData[client][workType] = (clientWorkTypeData[client][workType] || 0) + row.Hours
    }
    
    // Convert to percentage data
    const result = Object.entries(clientWorkTypeData).map(([client, workTypes]) => {
      const totalHours = Object.values(workTypes).reduce((sum, hours) => sum + hours, 0)
      
      if (totalHours === 0) return null
      
      const percentages = {
        client,
        totalHours: Math.round(totalHours * 4) / 4
      }
      
      // Calculate percentages for each work type
      Object.keys(WORK_TYPE_COLORS).forEach(workType => {
        const hours = workTypes[workType] || 0
        percentages[workType] = totalHours > 0 ? (hours / totalHours) * 100 : 0
        percentages[`${workType}_hours`] = Math.round(hours * 4) / 4 // Store actual hours for tooltip
      })
      
      return percentages
    }).filter(Boolean)
    
    // Sort by total hours descending and take top 10
    result.sort((a, b) => b.totalHours - a.totalHours)
    return result.slice(0, 10)
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
              <span className="font-bold" style={{ color: tooltipColors[5] }}>{data.totalHours}h</span>
            </div>
            {payload.map((entry, index) => {
              const workType = entry.dataKey
              const percentage = entry.value
              const hours = data[`${workType}_hours`]
              return (
                <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                  <span style={{ color: '#EFECD2' }}>{workType}:</span>
                  <span className="font-bold" style={{ color: entry.color }}>
                    {hours}h ({percentage.toFixed(1)}%)
                  </span>
                </div>
              )
            })}
            <div className="flex justify-between items-center text-xs mt-1 border-t pt-1" style={{ textShadow, borderColor: uiTheme.muted }}>
              <span style={{ color: '#EFECD2' }}>Action:</span>
              <span className="font-bold" style={{ color: tooltipColors[6] }}>Click to filter</span>
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
        <h3 className="oryx-heading text-lg mb-4">Client Work Type Mix (100% Stacked)</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No client work type data available
        </div>
      </div>
    )
  }
  
  // Only show these work types for clients
  const CLIENT_WORK_TYPES = ['Tech Delivery', 'PM Delivery']
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Client Work Type Mix (100% Stacked)</h3>
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
              domain={[0, 100]}
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Percentage (%)', position: 'insideBottom', offset: 0, style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="client" 
              type="category" 
              width={180} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500, wordBreak: 'break-all', whiteSpace: 'pre-line' }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {CLIENT_WORK_TYPES.map((workType) => (
              <Bar 
                key={workType}
                dataKey={workType}
                stackId="workType"
                fill={WORK_TYPE_COLORS[workType]}
                cursor="pointer"
                onClick={handleBarClick}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
        {CLIENT_WORK_TYPES.map((workType) => (
          <div key={workType} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: WORK_TYPE_COLORS[workType] }}></div>
            <span>{workType}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
