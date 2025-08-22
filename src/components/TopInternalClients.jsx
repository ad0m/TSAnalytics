import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LabelList } from 'recharts'
import { uiTheme } from '../theme'

const INTERNAL_COMPANIES = new Set(['OryxAlign', 'OryxAlign-Internal c/code'])

export default function TopInternalClients({ filteredRows, onCompanyFilter }) {
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
    
    // Group internal hours by company
    const internalHours = {}
    
    for (const row of filteredRows) {
      // Only include rows that are flagged as internal OR from internal companies
      if (!row.isInternal && !INTERNAL_COMPANIES.has(row.Company)) continue
      
      const company = row.Company || 'Unknown'
      internalHours[company] = (internalHours[company] || 0) + row.Hours
    }
    
    // Convert to array and sort
    const result = Object.entries(internalHours)
      .map(([company, hours]) => ({
        company,
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
              <span style={{ color: '#EFECD2' }}>Internal Hours:</span>
              <span className="font-bold" style={{ color: tooltipColors[0] }}>{payload[0].value}h</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1 border-t pt-1" style={{ textShadow, borderColor: uiTheme.muted }}>
              <span style={{ color: '#EFECD2' }}>Action:</span>
              <span className="font-bold" style={{ color: tooltipColors[1] }}>Click to filter</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }
  
  const handleBarClick = (data) => {
    if (data && data.company && onCompanyFilter) {
      onCompanyFilter(data.company)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">OryxAlign Internal Hours</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No internal hours data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">OryxAlign Internal Hours</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 40, top: 8, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Internal Hours', position: 'insideBottom', offset: 0, style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="company" 
              type="category" 
              width={180} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500, wordBreak: 'break-all', whiteSpace: 'pre-line' }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="hours" 
              fill={tooltipColors[0]}
              cursor="pointer"
              onClick={handleBarClick}
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
      <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
        <p>Shows hours flagged as internal work or from internal companies</p>
        <p>Click on any bar to filter by that company</p>
      </div>
    </div>
  )
}
