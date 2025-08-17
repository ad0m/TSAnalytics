import { useMemo } from 'react'
import dayjs from 'dayjs'
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
      color: 'bg-blue-500/20 text-blue-400',
      description: 'Department utilisation percentage calculated as (Total Billable Hours ÷ Total Worked Hours) across all roles. Represents the proportion of logged time that was productive work.'
    },
    {
      title: 'Billable Hours',
      value: roundToQuarter(metrics.billableHours).toFixed(2),
      icon: '💼',
      color: 'bg-green-500/20 text-green-400',
      description: 'Total hours logged as billable work. These are hours that can be charged to clients or projects, representing revenue-generating activities.'
    },
    {
      title: 'Internal Hours Share %',
      value: formatPercent(metrics.internalHoursSharePercent),
      icon: '🏢',
      color: 'bg-yellow-500/20 text-yellow-400',
      description: 'Percentage of total hours spent on internal company work (non-client projects). Calculated as (Internal Hours ÷ Total Hours).'
    },
    {
      title: 'Cloud Util %',
      value: formatPercent(metrics.cloudUtilPercent),
      subtitle: `vs ${formatPercent(ROLE_TARGETS.Cloud)} target`,
      icon: '☁️',
      color: 'bg-cyan-500/20 text-cyan-400',
      description: 'Cloud team utilisation rate. Shows productive hours as a percentage of total time logged by Cloud team members. Compares against target utilisation goals.'
    },
    {
      title: 'Network Util %',
      value: formatPercent(metrics.networkUtilPercent),
      subtitle: `vs ${formatPercent(ROLE_TARGETS.Network)} target`,
      icon: '🌐',
      color: 'bg-purple-500/20 text-purple-400',
      description: 'Network team utilisation rate. Measures productive work efficiency for Network team members against established utilisation targets.'
    },
    {
      title: 'PM Util %',
      value: formatPercent(metrics.pmUtilPercent),
      subtitle: `vs ${formatPercent(ROLE_TARGETS.PM)} target`,
      icon: '📋',
      color: 'bg-orange-500/20 text-orange-400',
      description: 'Project Management team utilisation rate. Tracks productive hours for PM team members and compares performance against utilisation targets.'
    }
  ]
  
  if (!filteredRows?.length) {
    return <EmptyState title="No data for KPIs" onReset={onReset} />
  }
  
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile, index) => (
        <div key={index} className="oryx-card p-6">
          <div className="flex items-start gap-4">
            {/* Left side - KPI info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.color}`}>
                  <span className="text-lg">{tile.icon}</span>
                </div>
                <h3 className="text-sm font-medium text-slate-300">{tile.title}</h3>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">{tile.value}</div>
              {tile.subtitle && (
                <div className="text-xs text-slate-400">{tile.subtitle}</div>
              )}
            </div>
            
            {/* Right side - Description */}
            <div className="flex-1">
              <p className="text-xs text-slate-400 leading-relaxed">{tile.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
