import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { uiTheme } from '../theme'

export default function ClientPareto({ filteredRows }) {
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
    
    // Group by company and sum billable hours
    const companyData = {}
    
    for (const row of filteredRows) {
      if (!row.isBillable) continue // Only billable hours for Pareto
      
      const company = row.Company || 'Unknown'
      if (!companyData[company]) {
        companyData[company] = 0
      }
      companyData[company] += row.Hours
    }
    
    // Convert to array and sort by hours descending
    const sortedData = Object.entries(companyData)
      .map(([company, hours]) => ({
        company,
        hours: Math.round(hours * 4) / 4 // Round to 0.25
      }))
      .filter(item => !['OryxAlign', 'OryxAlign-Internal c/code'].includes(item.company)) // Exclude internal companies
      .sort((a, b) => b.hours - a.hours)
    
    // Calculate cumulative percentage
    const totalHours = sortedData.reduce((sum, item) => sum + item.hours, 0)
    let cumulativeHours = 0
    
    const result = sortedData.map((item, index) => {
      cumulativeHours += item.hours
      const cumulativePercent = totalHours > 0 ? (cumulativeHours / totalHours) * 100 : 0
      
      return {
        ...item,
        cumulativePercent: Math.round(cumulativePercent * 10) / 10, // Round to 1 decimal
        rank: index + 1,
        displayName: item.company.length > 15 ? `${item.company.substring(0, 12)}...` : item.company
      }
    })
    
    // Take top 20 for readability
    return result.slice(0, 20)
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
          <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>
            {data.company}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Billable Hours:</span>
              <span className="font-bold" style={{ color: tooltipColors[0] }}>{data.hours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Cumulative:</span>
              <span className="font-bold" style={{ color: tooltipColors[1] }}>{data.cumulativePercent}%</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Rank:</span>
              <span className="font-bold" style={{ color: tooltipColors[2] }}>#{data.rank}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }
  
  // Find the 80% elbow point
  const eightyPercentIndex = data.findIndex(item => item.cumulativePercent >= 80)
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Client Pareto Analysis</h3>
        <div className="flex h-48 items-center justify-center text-sm" style={{ color: uiTheme.muted }}>
          No billable hours data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Client Pareto Analysis (Billable Hours)</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data} 
            margin={{ left: 8, right: 40, top: 8, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={uiTheme.chart.grid} />
            <XAxis 
              dataKey="displayName"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fill: uiTheme.chart.axis, fontSize: 10 }}
            />
            <YAxis 
              yAxisId="hours"
              orientation="left"
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ value: 'Billable Hours', angle: -90, position: 'insideLeft', style: { fill: uiTheme.chart.axis } }}
            />
            <YAxis 
              yAxisId="percent"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', style: { fill: uiTheme.chart.axis } }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {/* 80% reference line */}
            <ReferenceLine 
              yAxisId="percent"
              y={80} 
              stroke={uiTheme.muted} 
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            
            {/* Hours bars */}
            <Bar 
              yAxisId="hours"
              dataKey="hours" 
              fill={tooltipColors[0]}
              opacity={0.8}
            />
            
            {/* Cumulative percentage line */}
            <Line 
              yAxisId="percent"
              type="monotone" 
              dataKey="cumulativePercent" 
              stroke={tooltipColors[1]} 
              strokeWidth={3}
              dot={{ r: 3, fill: tooltipColors[1] }}
              activeDot={{ r: 5, fill: tooltipColors[1] }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-6 text-xs" style={{ color: uiTheme.muted }}>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: tooltipColors[0] }}></div>
            <span>Billable Hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 rounded" style={{ backgroundColor: tooltipColors[1] }}></div>
            <span>Cumulative %</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="h-1 w-6 rounded" 
              style={{ 
                background: `repeating-linear-gradient(to right, ${uiTheme.muted} 0, ${uiTheme.muted} 3px, transparent 3px, transparent 6px)` 
              }}
            ></div>
            <span>80% Line</span>
          </div>
        </div>
        {eightyPercentIndex >= 0 && (
          <div className="text-center text-xs" style={{ color: uiTheme.muted }}>
            80% of billable hours come from the first {eightyPercentIndex + 1} companies
          </div>
        )}
      </div>
    </div>
  )
}
