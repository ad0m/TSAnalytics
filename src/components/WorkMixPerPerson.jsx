import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts'
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
  'Leave/Bank Holiday': tooltipColors[8], // Indigo (replacing Soft Yellow)
  'Sick Leave': tooltipColors[4],         // Coral
  'Training': tooltipColors[5],           // Deep Red
  'Other': tooltipColors[6]               // Plum
}

// Map raw work types coming from data to standardized labels used in the chart
const WORK_TYPE_MAP = {
  'Admin': 'Internal Admin',
  'Bank/Holiday Leave': 'Leave/Bank Holiday',
  'Internal Support': 'Internal Admin',
  'Internal Support, Projects & Documentation': 'Internal Admin',
  'Project Installation & Engineering': 'Tech Delivery',
  'Project Management': 'PM Delivery',
  'Sick Leave': 'Sick Leave',
  'Training': 'Training'
}

function normalizeWorkType(rawWorkType) {
  const original = (rawWorkType || '').trim()
  const mapped = WORK_TYPE_MAP[original] || original
  // Prefer the mapped label if it exists in colors, else fallback to original if known, else Other
  if (WORK_TYPE_COLORS[mapped]) return mapped
  if (WORK_TYPE_COLORS[original]) return original
  return 'Other'
}

export default function WorkMixPerPerson({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by member and work type
    const memberWorkTypeData = {}
    
    for (const row of filteredRows) {
      const member = row.Member || 'Unknown'
      const workType = normalizeWorkType(row.boardWorkType || 'Other')
      const hours = row.Hours
      
      if (!memberWorkTypeData[member]) {
        memberWorkTypeData[member] = {}
      }
      
      memberWorkTypeData[member][workType] = (memberWorkTypeData[member][workType] || 0) + hours
    }
    
    // Convert to chart data format
    const result = Object.entries(memberWorkTypeData).map(([member, workTypes]) => {
      const totalHours = Object.values(workTypes).reduce((sum, hours) => sum + hours, 0)
      
      const memberData = {
        member,
        totalHours: Math.round(totalHours * 4) / 4
      }
      
      // Add each work type as a property
      Object.keys(WORK_TYPE_COLORS).forEach(workType => {
        const hours = workTypes[workType] || 0
        memberData[workType] = Math.round(hours * 4) / 4
      })
      
      return memberData
    })
    
    // Sort by total hours descending and take top 15 for readability
    result.sort((a, b) => b.totalHours - a.totalHours)
    return result.slice(0, 15)
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
              <span className="font-bold" style={{ color: tooltipColors[7] }}>{data.totalHours}h</span>
            </div>
            {payload
              .filter(item => item.value > 0)
              .sort((a, b) => b.value - a.value)
              .map((item, index) => (
                <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                  <span style={{ color: '#EFECD2' }}>{item.dataKey}:</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.value}h</span>
                </div>
              ))}
          </div>
        </div>
      )
    }
    return null
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Work Mix by Person</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No work mix data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Work Mix by Person</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 24, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Hours', position: 'bottom', style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="member" 
              type="category" 
              width={100} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 10 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {Object.entries(WORK_TYPE_COLORS).map(([workType, color]) => (
              <Bar 
                key={workType}
                dataKey={workType}
                stackId="workType"
                name={workType}
                fill={color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Top 15 people by total hours, showing work type distribution
      </div>
    </div>
  )
}
