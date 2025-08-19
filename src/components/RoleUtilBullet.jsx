import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import dayjs from 'dayjs'
import { ROLE_TARGETS, DAY_HOURS } from '../lib/invariants.js'
import { uiTheme } from '../theme'

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
  
  // Define distinct colors for each team
  const teamColors = {
    Cloud: {
      primary: '#06b6d4', // cyan-500
      secondary: '#0891b2', // cyan-600
      target: '#0e7490', // cyan-700
      light: '#67e8f9' // cyan-300
    },
    Network: {
      primary: '#8b5cf6', // violet-500
      secondary: '#7c3aed', // violet-600
      target: '#6d28d9', // violet-700
      light: '#a78bfa' // violet-300
    },
    PM: {
      primary: '#f97316', // orange-500
      secondary: '#ea580c', // orange-600
      target: '#c2410c', // orange-700
      light: '#fb923c' // orange-300
    }
  }
  
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
      const data = payload[0].payload
      const teamColor = teamColors[data.role]
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: teamColor.primary }}
            ></div>
            <p className="text-sm font-medium text-white">{data.role} Team</p>
          </div>
          <p className="text-xs text-slate-300">
            Billable: {data.billableHours}h / Worked: {data.totalWorkedHours}h
          </p>
          <p className="text-xs text-slate-300">
            Utilisation: <span style={{ color: teamColor.primary }}>{data.utilisation}%</span> 
            (Target: <span style={{ color: teamColor.target }}>{data.target}%</span>)
          </p>
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
      <h3 className="oryx-heading text-lg mb-4 text-center">Role Utilisation Performance</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 60, right: 60, top: 40, bottom: 20 }}
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
            
            {/* Utilisation bars with team-specific colors */}
            <Bar 
              dataKey="utilisation" 
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={teamColors[entry.role].primary}
                />
              ))}
            </Bar>
            
            {/* Target reference lines with distinct colors and top-positioned labels */}
            {Object.entries(targetGroups).map(([target, teams], index) => {
              // Use different colors for different target groups
              let lineColor
              if (teams.length === 1 && teams[0].role === 'PM') {
                // PM team gets orange target line
                lineColor = teamColors.PM.target
              } else {
                // Cloud & Network teams get a shared blue-violet target line
                lineColor = '#3b82f6' // blue-500
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
      
      {/* Enhanced legend with team-specific colors */}
      <div className="mt-6 space-y-3">
        <div className="text-center text-xs text-slate-400 mb-3">Legend</div>
        <div className="grid grid-cols-1 gap-3">
          {data.map((item) => {
            const teamColor = teamColors[item.role]
            return (
              <div key={item.role} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded" 
                    style={{ backgroundColor: teamColor.primary }}
                  ></div>
                  <span className="text-slate-300">{item.role} Team</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Target:</span>
                  <span 
                    className="font-medium" 
                    style={{ color: teamColor.target }}
                  >
                    {item.target}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Target line legend */}
        <div className="mt-4 pt-3 border-t border-slate-600">
          <div className="text-center text-xs text-slate-400 mb-2">Target Lines</div>
          {Object.entries(targetGroups).map(([target, teams]) => {
            let lineColor, labelText, legendText
            if (teams.length === 1 && teams[0].role === 'PM') {
              lineColor = teamColors.PM.target
              labelText = `${target}% - PM Team`
              legendText = `${target}% - PM Team`
            } else {
              lineColor = '#3b82f6'
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
  )
}
