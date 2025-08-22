import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import dayjs from 'dayjs'
import { ROLE_TARGETS, DAY_HOURS } from '../lib/invariants.js'
import { uiTheme } from '../theme'

// Custom color palette matching the Project Type Trends & Summary chart
const CUSTOM_COLORS = [
  '#B5C933', // Lime Zest
  '#FF4F00', // Vibrant Orange
  '#3CC9E3', // Bright Aqua
  '#FFD166', // Soft Yellow
  '#FF6F61', // Coral
  '#C62828', // Deep Red
  '#8E44AD', // Plum
  '#FF3462', // Vivid Pink
  '#4A3F94', // Indigo
  '#4DD0E1', // Sky Blue
  '#1E8FA6', // Turquoise
  '#FF9E2C', // Warm Amber
  '#7FE7A1', // Mint Green
  '#3C4CFF', // Electric Blue
  '#A58BFF'  // Light Lavender
]

/**
 * Calculates working days in a month (excludes weekends)
 * @param {string} calendarMonth - YYYY-MM format
 * @returns {number} - Number of working days
 */
function getWorkingDaysInMonth(calendarMonth) {
  const [year, month] = calendarMonth.split('-')
  const date = dayjs(`${year}-${month}-01`)
  const daysInMonth = date.daysInMonth()
  
  let workingDays = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDay = date.date(day)
    const dayOfWeek = currentDay.day() // 0=Sunday, 6=Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++
    }
  }
  
  return workingDays
}

/**
 * Calculates role utilisation data for bullet chart
 * @param {Array} rows - Filtered timesheet rows
 * @returns {Array} - Array of role utilisation data
 */
function calculateRoleUtilisation(rows) {
  const roleData = {}
  
  // Initialize data for target roles
  const targetRoles = ['Cloud', 'Network', 'PM']
  for (const role of targetRoles) {
    roleData[role] = {
      role,
      billableHours: 0,
      totalWorkedHours: 0,
      memberMonths: new Set()
    }
  }
  
  // Process rows
  for (const row of rows) {
    const role = row.Role
    if (!targetRoles.includes(role)) continue
    
    const member = row.Member
    const month = row.calendarMonth
    
    // Add billable hours (productive work) - use Productivity field directly
    const productivity = (row.Productivity || '').trim()
    if (productivity === "Productive") {
      roleData[role].billableHours += row.Hours
    }
    
    // Add ALL worked hours (productive + non-productive)
    roleData[role].totalWorkedHours += row.Hours
    
    // Track unique member-month combinations
    roleData[role].memberMonths.add(`${member}-${month}`)
  }
  
  // Calculate utilisation based on actual worked hours
  const result = []
  for (const role of targetRoles) {
    const data = roleData[role]
    
    // Calculate utilisation: Billable Hours / Total Worked Hours
    const utilisation = data.totalWorkedHours > 0 ? (data.billableHours / data.totalWorkedHours) * 100 : 0
    const target = (ROLE_TARGETS[role] || 0) * 100
    
    result.push({
      role,
      utilisation: Math.round(utilisation),
      target,
      billableHours: Math.round(data.billableHours * 4) / 4, // Round to 0.25
      totalWorkedHours: Math.round(data.totalWorkedHours * 4) / 4
    })
  }
  
  return result
}

export default function RoleUtilBullet({ filteredRows }) {
  const data = useMemo(() => {
    return calculateRoleUtilisation(filteredRows || [])
  }, [filteredRows])
  
  // Group teams by target values to combine duplicate lines
  const targetGroups = data.reduce((groups, item) => {
    const target = item.target
    if (!groups[target]) {
      groups[target] = []
    }
    groups[target].push(item)
    return groups
  }, {})
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const barData = payload[0].payload
      
      // Get the color for this specific bar to use in tooltip
      const barIndex = data.findIndex(item => item.role === barData.role)
      const barColor = CUSTOM_COLORS[barIndex % CUSTOM_COLORS.length]
      
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: '#586961', // Smokey Sage
            borderColor: uiTheme.muted,
            textShadow: '0 1px 1px rgba(0,0,0,0.5)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: barColor }}
            ></div>
            <p className="text-sm font-semibold" style={{ color: '#B5C933' }}>{barData.role} Team</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: '#EFECD2' }}>Billable:</span>
              <span className="font-bold" style={{ color: barColor }}>{barData.billableHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: '#EFECD2' }}>Worked:</span>
              <span className="font-bold" style={{ color: barColor }}>{barData.totalWorkedHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: '#EFECD2' }}>Utilisation:</span>
              <span className="font-bold" style={{ color: barColor }}>{barData.utilisation}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: '#EFECD2' }}>Target:</span>
              <span className="font-bold" style={{ color: barColor }}>{barData.target}%</span>
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
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No role utilisation data for current filters
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Role Utilisation Performance</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 30, right: 30, top: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={uiTheme.chart.grid} />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ value: 'Utilisation %', position: 'bottom', style: { fill: uiTheme.chart.axis } }}
            />
            <YAxis 
              dataKey="role" 
              type="category" 
              width={50}
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {/* Utilisation bars with custom colors */}
            <Bar 
              dataKey="utilisation" 
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CUSTOM_COLORS[index % CUSTOM_COLORS.length]}
                />
              ))}
            </Bar>
            
            {/* Target reference lines with distinct colors and top-positioned labels */}
            {Object.entries(targetGroups).map(([target, teams], index) => {
              // Use different colors for different target groups
              let lineColor
              if (teams.length === 1 && teams[0].role === 'PM') {
                // PM team gets orange target line
                lineColor = '#FF9E2C' // Warm Amber from custom palette
              } else {
                // Cloud & Network teams get a shared blue target line
                lineColor = '#3C4CFF' // Electric Blue from custom palette
              }
              
              return (
                <ReferenceLine 
                  key={`target-${target}`}
                  x={parseFloat(target)}
                  stroke={lineColor}
                  strokeWidth={3}
                  strokeDasharray="6 3"
                  label={{
                    value: `${target}%`,
                    position: 'top',
                    fill: lineColor,
                    fontSize: 11,
                    fontWeight: 'bold',
                    offset: 20,
                    angle: -90
                  }}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Enhanced legend with team-specific colors - Side by side layout */}
      <div className="mt-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left side - Legend */}
          <div className="space-y-3">
            <div className="text-center text-xs text-slate-400 mb-3">Legend</div>
            <div className="grid grid-cols-1 gap-3">
              {data.map((item, index) => {
                const barColor = CUSTOM_COLORS[index % CUSTOM_COLORS.length]
                return (
                  <div key={item.role} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded" 
                        style={{ backgroundColor: barColor }}
                      ></div>
                      <span className="text-slate-300">{item.role} Team</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Target:</span>
                      <span 
                        className="font-medium" 
                        style={{ color: barColor }}
                      >
                        {item.target}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Right side - Target Lines */}
          <div className="space-y-3">
            <div className="text-center text-xs text-slate-400 mb-3">Target Lines</div>
            {Object.entries(targetGroups).map(([target, teams]) => {
              let lineColor, labelText, legendText
              if (teams.length === 1 && teams[0].role === 'PM') {
                lineColor = '#FF9E2C' // Warm Amber from custom palette
                labelText = `${target}% - PM Team`
                legendText = `${target}% - PM Team`
              } else {
                lineColor = '#3C4CFF' // Electric Blue from custom palette
                labelText = `${target}% - Cloud Team/Network Team`
                legendText = `${target}% - Cloud Team/Network Team`
              }
              
              return (
                <div key={target} className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-1">
                  <div 
                    className="h-0.5 w-6" 
                    style={{ borderTop: `2px dashed ${lineColor}` }}
                  ></div>
                  <span style={{ color: lineColor }}>{legendText}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
