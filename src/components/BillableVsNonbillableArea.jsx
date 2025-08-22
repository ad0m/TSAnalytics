import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { uiTheme } from '../theme'

dayjs.extend(customParseFormat)

// UK date formats used throughout the application
const DATE_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY']

export default function BillableVsNonbillableArea({ filteredRows }) {
  const componentId = Math.random().toString(36).substr(2, 9)
  
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
    
    console.log(`BillableVsNonbillableArea [${componentId}] - DYNAMIC: Starting with filtered data`)
    console.log('BillableVsNonbillableArea - DYNAMIC: Total rows:', filteredRows.length)
    console.log('BillableVsNonbillableArea - DYNAMIC: Sample row:', filteredRows[0])
    console.log('BillableVsNonbillableArea - DYNAMIC: All row keys:', Object.keys(filteredRows[0] || {}))
    
    // Log first 10 rows to see what dates we actually have
    console.log('BillableVsNonbillableArea - DYNAMIC: First 10 rows with dates and months:')
    filteredRows.slice(0, 10).forEach((row, index) => {
      console.log(`Row ${index}:`, {
        Date: row.Date,
        calendarMonth: row.calendarMonth,
        Hours: row.Hours,
        Member: row.Member,
        isBillable: row.isBillable
      })
    })
    
    // Check what months are represented in the filtered data
    const monthsInData = [...new Set(filteredRows.map(row => row.calendarMonth))].sort()
    console.log('BillableVsNonbillableArea - DYNAMIC: Months in filtered data:', monthsInData)
    
    // Find the actual date field in the data
    let dateField = null
    if (filteredRows[0]) {
      if (filteredRows[0].Date) dateField = 'Date'
      else if (filteredRows[0].date) dateField = 'date'
      else if (filteredRows[0].Date_Time) dateField = 'Date_Time'
      else if (filteredRows[0].date_time) dateField = 'date_time'
    }
    
    console.log('BillableVsNonbillableArea - DYNAMIC: Using date field:', dateField)
    
    if (!dateField) {
      console.log('BillableVsNonbillableArea - DYNAMIC: No date field found, returning empty')
      return []
    }
    
    // First pass: Find the actual date range in the data
    let validDates = []
    let validRows = []
    
    filteredRows.forEach((row, index) => {
      const dateStr = row[dateField]
      if (!dateStr) return
      
      // Parse date using UK format (DD/MM/YYYY)
      const date = dayjs(dateStr, DATE_FORMATS, true)
      if (date.isValid()) {
        // BASIC FILTERING: Only accept dates that look reasonable (trust the filteredRows)
        const year = date.year()
        const month = date.month() + 1 // dayjs months are 0-based
        
        // Only basic year validation - trust that filteredRows contains the right data
        if (year >= 2020 && year <= 2025) {
          validDates.push(date)
          validRows.push(row)
          if (validDates.length <= 5) { // Log first 5 valid dates
            console.log(`BillableVsNonbillableArea - DYNAMIC: Row ${index} ACCEPTED date: ${dateStr} -> ${date.format('YYYY-MM-DD')} (Year: ${year}, Month: ${month})`)
          }
        } else {
          if (index < 5) { // Log first 5 rejected dates
            console.log(`BillableVsNonbillableArea - DYNAMIC: Row ${index} REJECTED date: ${dateStr} -> ${date.format('YYYY-MM-DD')} (Year: ${year}, Month: ${month}) - invalid year`)
          }
        }
      } else {
        if (index < 5) { // Log first 5 invalid dates
          console.log(`BillableVsNonbillableArea - DYNAMIC: Row ${index} invalid date: ${dateStr}`)
        }
      }
    })
    
    if (validDates.length === 0) {
      console.log('BillableVsNonbillableArea - DYNAMIC: No valid dates found after filtering')
      return []
    }
    
    console.log('BillableVsNonbillableArea - DYNAMIC: After filtering - valid dates:', validDates.length, 'valid rows:', validRows.length)
    
    // Find the actual range of the FILTERED data
    validDates.sort((a, b) => a - b)
    const actualStartDate = validDates[0]
    const actualEndDate = validDates[validDates.length - 1]
    
    console.log('BillableVsNonbillableArea - DYNAMIC: Filtered data range:', {
      start: actualStartDate.format('YYYY-MM-DD'),
      end: actualEndDate.format('YYYY-MM-DD'),
      totalDays: actualEndDate.diff(actualStartDate, 'day'),
      totalValidDates: validDates.length
    })
    
    // Group by week (Monday start) - use only the valid rows
    const weeklyData = {}
    
    validRows.forEach((row, index) => {
      const dateStr = row[dateField]
      const date = dayjs(dateStr, DATE_FORMATS, true) // Use UK date format
      
      // Get week start (Monday) - ensure we're grouping by week
      const weekStart = date.startOf('week').add(1, 'day') // Start week on Monday instead of Sunday
      const weekKey = weekStart.format('YYYY-MM-DD')
      const weekDisplay = `${weekStart.format('MMM DD')} - ${weekStart.add(6, 'day').format('MMM DD')}`
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekKey,
          period: weekDisplay,
          billable: 0,
          nonBillable: 0
        }
        console.log(`BillableVsNonbillableArea - DYNAMIC: Created WEEK ${weekKey} (${weekDisplay}) from date ${date.format('YYYY-MM-DD')}`)
      }
      
      // Add hours based on billable flag
      if (row.isBillable) {
        weeklyData[weekKey].billable += row.Hours || 0
      } else {
        weeklyData[weekKey].nonBillable += row.Hours || 0
      }
    })
    
    console.log('BillableVsNonbillableArea - DYNAMIC: Weekly data keys:', Object.keys(weeklyData).sort())
    console.log('BillableVsNonbillableArea - DYNAMIC: Sample weekly data:', Object.values(weeklyData)[0])
    
    // Convert to array and sort by week
    const result = Object.values(weeklyData)
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
      .map(item => ({
        period: item.period,
        billable: Math.round((item.billable || 0) * 4) / 4,
        nonBillable: Math.round((item.nonBillable || 0) * 4) / 4
      }))
    
    console.log('BillableVsNonbillableArea - DYNAMIC: Final WEEKLY result:', result)
    console.log('BillableVsNonbillableArea - DYNAMIC: Chart will show WEEKS:', result.map(r => r.period))
    console.log('BillableVsNonbillableArea - DYNAMIC: Total weeks:', result.length)
    
    // Show breakdown by month for verification
    const monthBreakdown = {}
    result.forEach(week => {
      const month = week.period.substring(0, 3) // Extract month from "Apr 03 - Apr 09"
      monthBreakdown[month] = (monthBreakdown[month] || 0) + 1
    })
    console.log('BillableVsNonbillableArea - DYNAMIC: Weeks by month:', monthBreakdown)
    
    // CRITICAL DEBUG: Show exactly what data is being passed to the chart
    console.log('BillableVsNonbillableArea - DYNAMIC: *** CRITICAL DEBUG ***')
    console.log('BillableVsNonbillableArea - DYNAMIC: result.length =', result.length)
    console.log('BillableVsNonbillableArea - DYNAMIC: First 3 data points:', result.slice(0, 3))
    console.log('BillableVsNonbillableArea - DYNAMIC: Last 3 data points:', result.slice(-3))
    
    // If we're still seeing January/December, there's a fundamental issue
    if (result.some(r => r.period.includes('Jan') || r.period.includes('Dec'))) {
      console.error('BillableVsNonbillableArea - DYNAMIC: *** ERROR: Jan/Dec data found in result! ***')
      console.error('BillableVsNonbillableArea - DYNAMIC: Problematic data points:', 
        result.filter(r => r.period.includes('Jan') || r.period.includes('Dec')))
    }
    
    // EMERGENCY OVERRIDE: Force specific test data to verify chart behaviour
    const testMode = false // Set to true to test with hardcoded data
    
    if (testMode) {
      console.log('BillableVsNonbillableArea - DYNAMIC: *** TEST MODE ACTIVE ***')
      return [
        { period: "Jun 05 - Jun 11", billable: 25, nonBillable: 15 },
        { period: "Jun 12 - Jun 18", billable: 30, nonBillable: 10 },
        { period: "Jun 19 - Jun 25", billable: 28, nonBillable: 12 }
      ]
    }
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0)
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
            {payload.reverse().map((entry, index) => (
              <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                <span style={{ color: '#EFECD2' }}>
                  {entry.dataKey === 'billable' ? 'Billable' : 'Non-billable'}:
                </span>
                <span className="font-bold" style={{ color: tooltipColors[index % tooltipColors.length] }}>
                  {entry.value}h
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center text-xs border-t pt-1 mt-1" style={{ textShadow, borderColor: uiTheme.muted }}>
              <span style={{ color: '#EFECD2' }}>Total:</span>
              <span className="font-bold" style={{ color: tooltipColors[2] }}>{total}h</span>
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
        <h3 className="oryx-heading text-lg mb-4">Billable vs Non-billable Hours (Weekly)</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No data available for current filters
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Billable vs Non-billable Hours (Weekly)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
            <defs>
              <linearGradient id="billableGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tooltipColors[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={tooltipColors[0]} stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="nonBillableGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tooltipColors[1]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={tooltipColors[1]} stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="period" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#cbd5e1' } }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="nonBillable"
              stackId="1"
              stroke={tooltipColors[1]}
              fill="url(#nonBillableGrad)"
            />
            <Area
              type="monotone"
              dataKey="billable"
              stackId="1"
              stroke={tooltipColors[0]}
              fill="url(#billableGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: tooltipColors[0] }}></div>
          <span>Billable Hours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: tooltipColors[1] }}></div>
          <span>Non-billable Hours</span>
        </div>
      </div>
    </div>
  )
}
