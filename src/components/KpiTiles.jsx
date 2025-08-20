import { useMemo } from 'react'
import dayjs from 'dayjs'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ROLE_TARGETS, DAY_HOURS } from '../lib/invariants.js'
import { roundToQuarter, EmptyState } from '../lib/utils.jsx'

/**
 * Calculates working days in a month (excludes weekends)
 * @param {string} calendarMonth - YYYY-MM format
 * @returns {number} - Number of working days
 */
function getWorkingDaysInMonth(calendarMonth) {
  if (!calendarMonth || typeof calendarMonth !== 'string') {
    console.warn('Invalid calendarMonth:', calendarMonth)
    return 22 // Fallback to average working days per month
  }
  
  try {
    const [year, month] = calendarMonth.split('-')
    if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
      console.warn('Invalid calendarMonth format:', calendarMonth)
      return 22
    }
    
    const date = dayjs(`${year}-${month}-01`)
    if (!date.isValid()) {
      console.warn('Invalid date from calendarMonth:', calendarMonth)
      return 22
    }
    
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
  } catch (error) {
    console.warn('Error calculating working days for month:', calendarMonth, error)
    return 22 // Fallback to average working days per month
  }
}

/**
 * Calculates utilization metrics for roles
 * @param {Array} rows - Filtered timesheet rows
 * @returns {Object} - Utilization metrics
 */
function calcUtilisation(rows) {
  const roleData = {}
  
  console.log('calcUtilisation - input rows:', rows.length)
  console.log('calcUtilisation - sample row:', rows[0])
  
  // Debug: Show all unique roles in the data
  const uniqueRoles = [...new Set(rows.map(row => row.Role).filter(Boolean))]
  console.log('calcUtilisation - unique roles found:', uniqueRoles)
  
  // Debug: Show productivity values for each role
  uniqueRoles.forEach(role => {
    const roleRows = rows.filter(row => row.Role === role)
    const productivityCounts = {}
    const productivityValues = new Set()
    
    roleRows.forEach(row => {
      const productivity = row.Productivity || 'Unknown'
      const trimmedProductivity = productivity.trim()
      const isProductive = trimmedProductivity === "Productive"
      
      productivityCounts[productivity] = (productivityCounts[productivity] || 0) + 1
      productivityValues.add(productivity)
      
      // Debug individual row processing
      if (roleRows.indexOf(row) < 3) { // Only first 3 rows
        console.log(`calcUtilisation - Row processing for ${role}:`, {
          rawProductivity: `"${productivity}"`,
          trimmedProductivity: `"${trimmedProductivity}"`,
          isProductive,
          isBillable: row.isBillable,
          hours: row.Hours,
          member: row.Member
        })
      }
    })
    
    console.log(`calcUtilisation - productivity breakdown for "${role}":`, productivityCounts)
    console.log(`calcUtilisation - unique productivity values for "${role}":`, Array.from(productivityValues))
    
    // Show sample rows with billable flag
    const sampleRows = roleRows.slice(0, 3).map(row => ({
      Member: row.Member,
      Hours: row.Hours,
      Productivity: row.Productivity,
      isBillable: row.isBillable,
      Role: row.Role
    }))
    console.log(`calcUtilisation - sample data for role "${role}":`, sampleRows)
  })
  
  // Group by role and calculate actual utilization
  for (const row of rows) {
    const role = row.Role
    const member = row.Member
    const month = row.calendarMonth
    
    if (!role || !member || !month) {
      console.warn('Missing required data in row:', { role, member, month, row })
      continue
    }
    
    if (!roleData[role]) {
      roleData[role] = {
        totalBillableHours: 0,
        totalWorkedHours: 0,
        memberMonths: new Set()
      }
    }
    
    // Add billable hours (productive work) - use Productivity field directly
    const productivity = (row.Productivity || '').trim()
    if (productivity === "Productive") {
      roleData[role].totalBillableHours += row.Hours
    }
    
    // Add ALL worked hours (productive + non-productive)
    roleData[role].totalWorkedHours += row.Hours
    
    // Track unique member-month combinations for reference
    roleData[role].memberMonths.add(`${member}-${month}`)
  }
  
  console.log('calcUtilisation - roleData before utilization calculation:', roleData)
  
  // Calculate utilization based on actual worked hours
  for (const role in roleData) {
    // Utilization = Billable Hours / Total Worked Hours
    // This represents: Productive Work ÷ Total Time Logged
    // This is the correct business metric for utilization
    roleData[role].utilization = roleData[role].totalWorkedHours > 0 
      ? roleData[role].totalBillableHours / roleData[role].totalWorkedHours 
      : 0
    
    // Debug: Show calculation for each role
    console.log(`calcUtilisation - ${role} calculation:`, {
      billableHours: roleData[role].totalBillableHours,
      workedHours: roleData[role].totalWorkedHours,
      utilization: roleData[role].utilization,
      formula: `${roleData[role].totalBillableHours} / ${roleData[role].totalWorkedHours} = ${roleData[role].utilization}`
    })
  }
  
  console.log('calcUtilisation - final roleData:', roleData)
  
  // Debug: Show expected vs actual utilization
  console.log('calcUtilisation - UTILIZATION SUMMARY:')
  for (const role in roleData) {
    const roleRows = rows.filter(row => row.Role === role)
    const totalHours = roleRows.reduce((sum, row) => sum + row.Hours, 0)
    
    // Debug: Show all rows for this role first
    console.log(`calcUtilisation - ${role} Team - ALL ROWS (${roleRows.length} total):`)
    roleRows.forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, {
        Member: row.Member,
        Productivity: `"${row.Productivity}"`,
        Hours: row.Hours,
        Date: row.Date
      })
    })
    
    // Debug: Show raw productivity values for this role
    const productivityValues = [...new Set(roleRows.map(row => row.Productivity))]
    console.log(`calcUtilisation - ${role} Team - Raw Productivity values found:`, productivityValues)
    
    const productiveHours = roleRows.filter(row => {
      const productivity = (row.Productivity || '').trim()
      const isProductive = productivity === "Productive"
      if (row.Member === roleRows[0]?.Member) { // Log first few rows for debugging
        console.log(`calcUtilisation - ${role} - Row check:`, {
          rawProductivity: `"${row.Productivity}"`,
          trimmed: `"${productivity}"`,
          isProductive,
          hours: row.Hours,
          member: row.Member
        })
      }
      return isProductive
    }).reduce((sum, row) => sum + row.Hours, 0)
    
    const unproductiveHours = roleRows.filter(row => {
      const productivity = (row.Productivity || '').trim()
      const isUnproductive = productivity === "Unproductive"
      if (row.Member === roleRows[0]?.Member) { // Log first few rows for debugging
        console.log(`calcUtilisation - ${role} - Row check:`, {
          rawProductivity: `"${row.Productivity}"`,
          trimmed: `"${productivity}"`,
          isUnproductive,
          hours: row.Hours,
          member: row.Member
        })
      }
      return isUnproductive
    }).reduce((sum, row) => sum + row.Hours, 0)
    
    const expectedUtilization = totalHours > 0 ? productiveHours / totalHours : 0
    const actualUtilization = roleData[role].utilization
    
    console.log(`${role} Team:`, {
      totalHours: Math.round(totalHours * 100) / 100,
      productiveHours: Math.round(productiveHours * 100) / 100,
      unproductiveHours: Math.round(unproductiveHours * 100) / 100,
      expectedUtilization: Math.round(expectedUtilization * 1000) / 10 + '%',
      actualUtilization: Math.round(actualUtilization * 1000) / 10 + '%',
      difference: Math.round((expectedUtilization - actualUtilization) * 1000) / 10 + '%',
      check: Math.abs(productiveHours + unproductiveHours - totalHours) < 0.01 ? '✅' : '❌'
    })
  }
  
  return roleData
}

/**
 * Rounds hours to nearest 0.25
 * @param {number} hours 
 * @returns {number}
 */
// Use imported roundToQuarter function

/**
 * Formats percentage to 0 decimals
 * @param {number} value - Decimal value (0.75 = 75%)
 * @returns {string}
 */
function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

export default function KpiTiles({ filteredRows, onReset }) {
  const metrics = useMemo(() => {
    if (!filteredRows?.length) {
      return {
        deptUtilPercent: 0,
        billableHours: 0,
        internalHoursSharePercent: 0,
        cloudUtilPercent: 0,
        networkUtilPercent: 0,
        pmUtilPercent: 0
      }
    }
    
    // Debug: Log the data we're working with
    console.log('KpiTiles - filteredRows length:', filteredRows.length)
    console.log('KpiTiles - sample rows:', filteredRows.slice(0, 3))
    console.log('KpiTiles - sample row keys:', Object.keys(filteredRows[0] || {}))
    
    const roleUtils = calcUtilisation(filteredRows)
    console.log('KpiTiles - roleUtils:', roleUtils)
    
    // Department weighted utilization
    let totalBillableHours = 0
    let totalWorkedHours = 0
    for (const role in roleUtils) {
      totalBillableHours += roleUtils[role].totalBillableHours
      totalWorkedHours += roleUtils[role].totalWorkedHours
    }
    const deptUtilPercent = totalWorkedHours > 0 ? totalBillableHours / totalWorkedHours : 0
    
    // Billable hours total
    const billableHours = filteredRows
      .filter(row => row.isBillable)
      .reduce((sum, row) => sum + row.Hours, 0)
    
    // Internal hours share
    const totalHours = filteredRows.reduce((sum, row) => sum + row.Hours, 0)
    const internalHours = filteredRows
      .filter(row => row.isInternal)
      .reduce((sum, row) => sum + row.Hours, 0)
    const internalHoursSharePercent = totalHours > 0 ? internalHours / totalHours : 0
    
    // Individual role utilizations
    const cloudUtilPercent = roleUtils['Cloud']?.utilization || 0
    const networkUtilPercent = roleUtils['Network']?.utilization || 0
    const pmUtilPercent = roleUtils['PM']?.utilization || 0
    
    console.log('KpiTiles - calculated metrics:', {
      deptUtilPercent,
      billableHours,
      internalHoursSharePercent,
      cloudUtilPercent,
      networkUtilPercent,
      pmUtilPercent
    })
    
    // Debug: Show role breakdown
    console.log('KpiTiles - role breakdown:', Object.keys(roleUtils).map(role => ({
      role,
      billableHours: roleUtils[role].totalBillableHours,
      workedHours: roleUtils[role].totalWorkedHours,
      utilization: roleUtils[role].utilization
    })))
    
    return {
      deptUtilPercent,
      billableHours,
      internalHoursSharePercent,
      cloudUtilPercent,
      networkUtilPercent,
      pmUtilPercent
    }
  }, [filteredRows])
  
  const tiles = [
    {
      title: 'Dept Util %',
      value: formatPercent(metrics.deptUtilPercent),
      icon: '📈',
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-400',
      chartColor: '#60a5fa',
      bgColor: 'bg-blue-500/10',
      description: 'Percentage of productive vs total work time across all roles'
    },
    {
      title: 'Billable Hours',
      value: roundToQuarter(metrics.billableHours).toFixed(2),
      icon: '💼',
      color: 'from-green-500/20 to-green-600/20',
      iconColor: 'text-green-400',
      chartColor: '#4ade80',
      bgColor: 'bg-green-500/10',
      description: 'Total hours that can be charged to clients'
    },
    {
      title: 'Internal Hours Share %',
      value: formatPercent(metrics.internalHoursSharePercent),
      icon: '🏢',
      color: 'from-yellow-500/20 to-yellow-600/20',
      iconColor: 'text-yellow-400',
      chartColor: '#facc15',
      bgColor: 'bg-yellow-500/10',
      description: 'Time spent on internal company work'
    },
    {
      title: 'Cloud Util %',
      value: formatPercent(metrics.cloudUtilPercent),
      subtitle: `vs ${formatPercent(ROLE_TARGETS.Cloud)} target`,
      icon: '☁️',
      color: 'from-cyan-500/20 to-cyan-600/20',
      iconColor: 'text-cyan-400',
      chartColor: '#22d3ee',
      bgColor: 'bg-cyan-500/10',
      description: 'Cloud team productive work efficiency'
    },
    {
      title: 'Network Util %',
      value: formatPercent(metrics.networkUtilPercent),
      subtitle: `vs ${formatPercent(ROLE_TARGETS.Network)} target`,
      icon: '🌐',
      color: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-400',
      chartColor: '#a78bfa',
      bgColor: 'bg-purple-500/10',
      description: 'Network team productive work efficiency'
    },
    {
      title: 'PM Util %',
      value: formatPercent(metrics.pmUtilPercent),
      subtitle: `vs ${formatPercent(ROLE_TARGETS.PM)} target`,
      icon: '📋',
      color: 'from-orange-500/20 to-orange-600/20',
      iconColor: 'text-orange-400',
      chartColor: '#fb923c',
      bgColor: 'bg-orange-500/10',
      description: 'PM team productive work efficiency'
    }
  ]

  // Helper function to get status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-emerald-400'
      case 'warning': return 'text-amber-400'
      case 'critical': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  // Helper function to get weekly data for trend charts
  const getWeeklyData = (title, rows) => {
    if (!rows?.length) return []
    
    // Group data by week
    const weeklyData = {}
    
    rows.forEach(row => {
      const date = dayjs(row.Date, 'DD/MM/YYYY')
      if (!date.isValid()) return
      
      // Get week start (Monday)
      const weekStart = date.startOf('week').format('YYYY-MM-DD')
      
      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = {
          week: weekStart,
          deptUtil: 0,
          billableHours: 0,
          internalHours: 0,
          cloudUtil: 0,
          networkUtil: 0,
          pmUtil: 0,
          totalWorkedHours: 0,
          totalBillableHours: 0
        }
      }
      
      // Add hours based on KPI type
      if (title === 'Dept Util %') {
        const productivity = (row.Productivity || '').trim()
        if (productivity === "Productive") {
          weeklyData[weekStart].totalBillableHours += row.Hours
        }
        weeklyData[weekStart].totalWorkedHours += row.Hours
      } else if (title === 'Billable Hours') {
        if (row.isBillable) {
          weeklyData[weekStart].billableHours += row.Hours
        }
      } else if (title === 'Internal Hours Share %') {
        if (row.isInternal) {
          weeklyData[weekStart].internalHours += row.Hours
        }
        weeklyData[weekStart].totalWorkedHours += row.Hours
      } else if (title.includes('Util %')) {
        const productivity = (row.Productivity || '').trim()
        if (productivity === "Productive") {
          weeklyData[weekStart].totalBillableHours += row.Hours
        }
        weeklyData[weekStart].totalWorkedHours += row.Hours
      }
    })
    
    // Calculate percentages and format data
    const chartData = Object.values(weeklyData)
      .map(week => {
        let value = 0
        
        if (title === 'Dept Util %') {
          value = week.totalWorkedHours > 0 ? (week.totalBillableHours / week.totalWorkedHours) * 100 : 0
        } else if (title === 'Billable Hours') {
          value = week.billableHours
        } else if (title === 'Internal Hours Share %') {
          value = week.totalWorkedHours > 0 ? (week.internalHours / week.totalWorkedHours) * 100 : 0
        } else if (title.includes('Util %')) {
          value = week.totalWorkedHours > 0 ? (week.totalBillableHours / week.totalWorkedHours) * 100 : 0
        }
        
        return {
          week: dayjs(week.week).format('MMM DD'),
          value: Math.round(value * 100) / 100
        }
      })
      .sort((a, b) => dayjs(a.week, 'MMM DD').diff(dayjs(b.week, 'MMM DD')))
      .slice(-8) // Last 8 weeks
    
    return chartData
  }

  // Mini trend chart component
  const MiniTrendChart = ({ data, color, title }) => {
    if (!data || data.length < 2) {
      return (
        <div className="h-[50px] w-[180px] bg-slate-700/30 rounded flex items-center justify-center">
          <span className="text-xs text-slate-400">No trend data</span>
        </div>
      )
    }
    
    return (
      <div className="h-[50px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis 
              dataKey="week" 
              hide={true}
            />
            <YAxis 
              hide={true}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-stone-100 border border-stone-300 rounded-lg p-2 text-xs">
                      <p className="font-medium text-stone-800">{label}</p>
                      <p className="text-stone-600">
                        {title.includes('%') ? `${payload[0].value}%` : `${payload[0].value}h`}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (!filteredRows?.length) {
    return <EmptyState title="No data for KPIs" onReset={onReset} />
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile, index) => (
        <div 
          key={index} 
          className="oryx-card p-4 relative"
        >
                     {/* Header with icon, title, and value on the right */}
           <div className="flex items-start justify-between mb-3">
             <div className="flex items-center gap-3">
               <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tile.color} shadow-lg`}>
                 <span className="text-xl">{tile.icon}</span>
               </div>
               <div className="flex-1">
                 <h3 className="text-base font-semibold text-slate-300 mb-1">
                   {tile.title}
                 </h3>
                 {tile.subtitle && (
                   <div className="text-xs text-slate-400">
                     {tile.subtitle}
                   </div>
                 )}
               </div>
             </div>
             
             {/* Main value positioned on the right */}
             <div className="text-3xl font-bold text-white text-right">
               {tile.value}
             </div>
           </div>

           {/* Trend chart below */}
           <div className="flex justify-end mb-3">
             <MiniTrendChart 
               data={getWeeklyData(tile.title, filteredRows)}
               color={tile.chartColor}
               title={tile.title}
             />
           </div>

          
        </div>
      ))}
    </div>
  )
}
