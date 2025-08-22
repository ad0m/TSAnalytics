import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LabelList } from 'recharts'
import { uiTheme } from '../theme'

export default function HoursByPerson({ filteredRows }) {
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
    
    // Group by member and sum total hours
    const memberHours = {}
    
    for (const row of filteredRows) {
      const member = row.Member || 'Unknown'
      memberHours[member] = (memberHours[member] || 0) + row.Hours
    }
    
    // Convert to array and sort by hours descending
    const result = Object.entries(memberHours)
      .map(([member, hours]) => ({
        member,
        hours: Math.round(hours * 4) / 4 // Round to 0.25
      }))
      .sort((a, b) => b.hours - a.hours)
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Total Hours:</span>
              <span className="font-bold" style={{ color: tooltipColors[0] }}>{payload[0].value}h</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Total Hours by Person</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No person data available
        </div>
      </div>
    )
  }
  
  // Calculate dynamic height based on number of people
  const chartHeight = Math.max(420, data.length * 35)
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Total Hours by Person</h3>
      <div style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 100, top: 8, bottom: 36 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Total Hours', position: 'bottom', style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="member" 
              type="category" 
              width={120} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="hours" 
              fill={tooltipColors[0]}
            >
              <LabelList 
                dataKey="hours" 
                position="right" 
                formatter={(v) => `${v}h`} 
                className="text-[11px] fill-slate-200" 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Ranked by total hours in selected time period
      </div>
    </div>
  )
}
