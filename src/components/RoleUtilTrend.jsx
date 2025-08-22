import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import dayjs from 'dayjs'
import { DAY_HOURS, ROLE_TARGETS } from '../lib/invariants.js'
import { uiTheme } from '../theme'

export default function RoleUtilTrend({ filteredRows }) {
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
    
    // Group by month and role
    const monthlyRoleData = {}
    const monthlyRoleContractHours = {}
    
    for (const row of filteredRows) {
      const month = row.calendarMonth
      const role = row.Role
      const member = row.Member || 'Unknown'
      const hours = row.Hours
      const isBillable = row.isBillable
      const dateObj = dayjs(row.dateObj)
      
      // Only track roles with targets
      if (!ROLE_TARGETS[role]) continue
      
      if (!monthlyRoleData[month]) {
        monthlyRoleData[month] = {}
        monthlyRoleContractHours[month] = {}
      }
      
      if (!monthlyRoleData[month][role]) {
        monthlyRoleData[month][role] = {
          billableHours: 0,
          totalHours: 0,
          members: new Set()
        }
        monthlyRoleContractHours[month][role] = 0
      }
      
      monthlyRoleData[month][role].totalHours += hours
      if (isBillable) {
        monthlyRoleData[month][role].billableHours += hours
      }
      monthlyRoleData[month][role].members.add(member)
    }
    
    // Calculate contract hours for each month/role combination
    for (const month in monthlyRoleData) {
      const monthDate = dayjs(month)
      const daysInMonth = monthDate.daysInMonth()
      let workingDaysInMonth = 0
      
      for (let i = 1; i <= daysInMonth; i++) {
        const day = monthDate.date(i)
        if (day.isoWeekday() < 6) { // Monday to Friday
          workingDaysInMonth++
        }
      }
      
      for (const role in monthlyRoleData[month]) {
        const memberCount = monthlyRoleData[month][role].members.size
        monthlyRoleContractHours[month][role] = memberCount * workingDaysInMonth * DAY_HOURS
      }
    }
    
    // Convert to chart data
    const chartData = Object.entries(monthlyRoleData)
      .map(([month, roleData]) => {
        const monthEntry = { month }
        
        Object.keys(ROLE_TARGETS).forEach(role => {
          const data = roleData[role]
          const contractHours = monthlyRoleContractHours[month]?.[role] || 0
          
          if (data && contractHours > 0) {
            const utilisation = (data.billableHours / contractHours) * 100
            monthEntry[role] = Math.round(utilisation * 10) / 10 // Round to 1 decimal
          } else {
            monthEntry[role] = 0
          }
        })
        
        return monthEntry
      })
      .sort((a, b) => a.month.localeCompare(b.month))
    
    return chartData
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
            {payload.map((item, index) => {
              const target = ROLE_TARGETS[item.dataKey] * 100
              return (
                <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                  <span style={{ color: '#EFECD2' }}>{item.dataKey}:</span>
                  <span className="font-bold" style={{ color: item.color }}>
                    {item.value}% (Target: {target}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Role Utilisation Trend</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No role utilisation data available
        </div>
      </div>
    )
  }
  
  const roleColors = {
    'Cloud': tooltipColors[0],    // Lime Zest
    'Network': tooltipColors[1],  // Vibrant Orange
    'PM': tooltipColors[2]        // Bright Aqua
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Role Utilisation Trend</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Utilisation %', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Reference lines for targets */}
            <ReferenceLine 
              y={75} 
              stroke={tooltipColors[0]} 
              strokeDasharray="2 2" 
              strokeWidth={1}
              label={{ value: "Cloud/Network 75%", position: "topRight", fill: tooltipColors[0], fontSize: 10 }}
            />
            <ReferenceLine 
              y={70} 
              stroke={tooltipColors[2]} 
              strokeDasharray="2 2" 
              strokeWidth={1}
              label={{ value: "PM 70%", position: "bottomRight", fill: tooltipColors[2], fontSize: 10 }}
            />
            
            {/* Role utilisation lines */}
            {Object.entries(ROLE_TARGETS).map(([role, target]) => (
              <Line 
                key={role}
                type="monotone" 
                dataKey={role} 
                name={`${role} (Target: ${target * 100}%)`}
                stroke={roleColors[role]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
        <p>Shows monthly utilisation percentage vs targets</p>
        <p>Dashed lines indicate role-specific utilisation targets</p>
      </div>
    </div>
  )
}
