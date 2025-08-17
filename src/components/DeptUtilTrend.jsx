import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import { DAY_HOURS } from '../lib/invariants.js'

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
 * Calculates 3-month moving average
 * @param {Array} data - Array of data points with utilisation values
 * @returns {Array} - Data with moving average added
 */
function calculateMovingAverage(data) {
  return data.map((item, index) => {
    if (index < 2) {
      // Not enough data for 3-month average
      return { ...item, movingAvg: null }
    }
    
    const sum = data.slice(index - 2, index + 1).reduce((acc, curr) => acc + curr.utilisation, 0)
    const movingAvg = sum / 3
    
    return { ...item, movingAvg }
  })
}

export default function DeptUtilTrend({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by calendar month
    const monthlyData = {}
    
    for (const row of filteredRows) {
      const month = row.calendarMonth
      if (!monthlyData[month]) {
        monthlyData[month] = {
          billableHours: 0,
          totalWorkedHours: 0,
          memberMonths: new Set()
        }
      }
      
      // Add billable hours (productive work) - use Productivity field directly
      const productivity = (row.Productivity || '').trim()
      if (productivity === "Productive") {
        monthlyData[month].billableHours += row.Hours
      }
      
      // Add ALL worked hours (productive + non-productive)
      monthlyData[month].totalWorkedHours += row.Hours
      
      // Track unique member-month combinations
      monthlyData[month].memberMonths.add(`${row.Member}-${month}`)
    }
    
    // Calculate utilisation per month
    const monthlyUtilisation = []
    for (const [month, data] of Object.entries(monthlyData)) {
      // Calculate utilisation: Billable Hours / Total Worked Hours
      const utilisation = data.totalWorkedHours > 0 ? (data.billableHours / data.totalWorkedHours) * 100 : 0
      
      monthlyUtilisation.push({
        month,
        utilisation: Math.round(utilisation * 10) / 10, // Round to 1 decimal
        billableHours: Math.round(data.billableHours * 4) / 4,
        totalWorkedHours: Math.round(data.totalWorkedHours * 4) / 4
      })
    }
    
    // Sort by month and get last 6 months
    monthlyUtilisation.sort((a, b) => a.month.localeCompare(b.month))
    const last6Months = monthlyUtilisation.slice(-6)
    
    // Add moving average
    return calculateMovingAverage(last6Months)
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300">
            Billable: {data.billableHours}h / Worked: {data.totalWorkedHours}h
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.dataKey === 'utilisation' ? 'Dept Util' : '3-Month Avg'}: {entry.value?.toFixed(1)}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Department Utilisation Trend</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No trend data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Department Utilisation Trend (Last 6 Months)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Utilisation %', angle: -90, position: 'insideLeft', style: { fill: '#cbd5e1' } }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {/* Actual utilisation line */}
            <Line 
              type="monotone" 
              dataKey="utilisation" 
              stroke="#84cc16" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#84cc16' }} 
              activeDot={{ r: 6, fill: '#84cc16' }}
            />
            
            {/* 3-month moving average line */}
            <Line 
              type="monotone" 
              dataKey="movingAvg" 
              stroke="#22d3ee" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: '#22d3ee' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 bg-lime-400 rounded"></div>
            <span>Dept Utilisation</span>
          </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-6 bg-cyan-400 rounded" style={{ background: 'repeating-linear-gradient(to right, #22d3ee 0, #22d3ee 3px, transparent 3px, transparent 6px)' }}></div>
          <span>3-Month Moving Avg</span>
        </div>
      </div>
    </div>
  )
}
