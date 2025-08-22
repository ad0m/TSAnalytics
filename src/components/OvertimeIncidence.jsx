import React, { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { uiTheme } from '../theme'

// Extend dayjs with ISO week plugin
dayjs.extend(isoWeek)

/**
 * Normalizes member names to handle variations like "Bolton, Mark" vs "Mark Bolton"
 * @param {string} memberName 
 * @returns {string}
 */
function normalizeMemberName(memberName) {
  if (!memberName) return 'Unknown'
  
  // Handle "Last, First" format
  if (memberName.includes(',')) {
    const parts = memberName.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      return `${parts[1]} ${parts[0]}`
    }
  }
  
  return memberName.trim()
}

export default function OvertimeIncidence({ filteredRows }) {
  const ref = useRef(null)
  
  const data = useMemo(() => {
    try {
      console.log('OvertimeIncidence - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows || filteredRows.length === 0) return []
      
      // Find the latest date in the filtered data
      let latestDate = null
      for (const entry of filteredRows) {
        let date
        if (entry.dateObj) {
          date = dayjs(entry.dateObj)
        } else if (entry.Date) {
          date = dayjs(entry.Date, ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY'])
        } else {
          continue
        }
        
        if (date.isValid()) {
          if (!latestDate || date.isAfter(latestDate)) {
            latestDate = date
          }
        }
      }
      
      if (!latestDate) {
        console.warn('No valid dates found in filtered data')
        return { chartData: [], topMembers: [] }
      }
      
      // Calculate the start of 6 weeks ago from the latest date in data
      const sixWeeksAgo = latestDate.subtract(6, 'week').startOf('week') // Start of Monday 6 weeks ago
      
      // Generate all dates for the 6-week period (Monday to Sunday) up to the latest date
      const allDates = []
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          const date = sixWeeksAgo.add(week * 7 + day, 'day')
          
          // Only include dates up to the latest date in our data
          if (date.isAfter(latestDate)) break
          
          allDates.push({
            date,
            dateKey: date.format('YYYY-MM-DD'),
            dayOfWeek: date.isoWeekday(), // 1=Monday, 7=Sunday
            dayName: date.format('dddd'),
            weekNumber: week + 1,
            displayName: `${date.format('DD/MM')} - ${date.format('dddd')}`
          })
        }
        // If we've reached the latest date, stop adding more weeks
        if (allDates.length > 0 && allDates[allDates.length - 1].date.isSame(latestDate, 'day')) break
      }
      
      // Group entries by member and date to calculate daily overtime
      const memberDateGroups = {}
      const allMembers = new Set()
      
      for (const entry of filteredRows) {
        const member = normalizeMemberName(entry.Member)
        if (!member) continue
        
        allMembers.add(member)
        
        // Handle both Date field and dateObj field from parsed timesheets
        let date
        if (entry.dateObj) {
          date = dayjs(entry.dateObj)
        } else if (entry.Date) {
          date = dayjs(entry.Date, ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY'])
        } else {
          continue
        }
        
        if (!date.isValid()) continue
        
        // Only process dates within our calculated 6-week window
        if (date.isBefore(sixWeeksAgo) || date.isAfter(latestDate)) continue
        
        const dateKey = date.format('YYYY-MM-DD')
        
        if (!memberDateGroups[member]) {
          memberDateGroups[member] = {}
        }
        
        if (!memberDateGroups[member][dateKey]) {
          memberDateGroups[member][dateKey] = {
            productiveHours: 0,
            nonWorkingHours: 0,
            isWeekend: date.isoWeekday() >= 6,
            isBankHoliday: false,
            dailyBaseline: 0
          }
        }
        
        const dayData = memberDateGroups[member][dateKey]
        const hours = parseFloat(entry.Hours) || 0
        
        if (hours <= 0) continue
        
        // Set daily baseline based on member and day
        if (dayData.dailyBaseline === 0) {
          const dayOfWeek = date.isoWeekday()
          if (dayOfWeek >= 6) {
            dayData.dailyBaseline = 0 // Weekends
          } else if (member === 'Mark Bolton') {
            dayData.dailyBaseline = dayOfWeek <= 4 ? 8.25 : 4.5 // Compressed schedule
          } else {
            dayData.dailyBaseline = 7.5 // Standard
          }
        }
        
        // Check if this is a bank holiday entry
        if (entry["Work Type"] === "Bank/Holiday Leave") {
          dayData.isBankHoliday = true
          dayData.nonWorkingHours += hours
        }
        // Check if this is other non-working time
        else if (["Sick Leave", "Training"].includes(entry["Work Type"])) {
          dayData.nonWorkingHours += hours
        }
        // Productive work
        else if (entry.Productivity === "Productive") {
          dayData.productiveHours += hours
        }
      }
      
      // Calculate daily overtime for each member and date
      const dailyOvertimeData = {}
      
      for (const [member, dateGroups] of Object.entries(memberDateGroups)) {
        for (const [dateKey, dayData] of Object.entries(dateGroups)) {
          let dailyOvertime = 0
          
          if (dayData.isWeekend) {
            // All productive hours on weekends are overtime
            dailyOvertime = dayData.productiveHours
          } else if (dayData.isBankHoliday) {
            // Any productive hours on bank holiday dates are overtime
            dailyOvertime = dayData.productiveHours
          } else {
            // Normal weekday - calculate overtime above baseline
            dailyOvertime = Math.max(0, dayData.productiveHours - dayData.dailyBaseline)
          }
          
          if (dailyOvertime > 0) {
            if (!dailyOvertimeData[dateKey]) {
              dailyOvertimeData[dateKey] = {}
            }
            dailyOvertimeData[dateKey][member] = dailyOvertime
          }
        }
      }
      
      // Calculate total overtime hours per member to find top contributors
      const memberTotals = {}
      for (const member of allMembers) {
        memberTotals[member] = Object.values(dailyOvertimeData)
          .reduce((sum, dayData) => sum + (dayData[member] || 0), 0)
      }
      
      // Get ALL members (not just top 10) - show everyone from the dataset
      const topMembers = Object.entries(memberTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([member]) => member)
      
      // Build chart data - include all dates, even those with no overtime
      const chartData = allDates.map(dateInfo => {
        const dayEntry = {
          ...dateInfo,
          total: 0
        }
        
        // Add overtime for each member on this day
        const dayOvertime = dailyOvertimeData[dateInfo.dateKey] || {}
        topMembers.forEach(member => {
          dayEntry[member] = dayOvertime[member] || 0
          dayEntry.total += dayOvertime[member] || 0
        })
        
        return dayEntry
      })
      
      return { chartData, topMembers, latestDate: latestDate.format('DD/MM/YYYY') }
      
    } catch (error) {
      console.error('OvertimeIncidence - Error:', error)
      return { chartData: [], topMembers: [] }
    }
  }, [filteredRows])
  
  // Custom color palette for members - expanded to handle more than 10 people
  const memberColors = [
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
    '#A58BFF', // Light Lavender
    '#FF6B9D', // Rose Pink
    '#4ECDC4', // Sea Green
    '#FFE66D', // Golden Yellow
    '#95E1D3', // Mint Blue
    '#F38181', // Soft Red
    '#A8E6CF', // Mint Green
    '#FF8B94', // Salmon Pink
    '#96CEB4', // Sage Green
    '#FFEAA7', // Cream Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Seafoam
    '#F7DC6F', // Goldenrod
    '#BB8FCE', // Lavender
    '#85C1E9', // Sky Blue
    '#F8C471', // Peach
    '#82E0AA', // Mint
    '#F1948A', // Coral
    '#85C1E9', // Light Blue
    '#D7BDE2', // Light Purple
    '#FAD7A0', // Light Orange
    '#ABEBC6', // Light Green
    '#F9E79F', // Light Yellow
    '#D5A6BD', // Light Pink
    '#A9CCE3', // Light Blue
    '#D2B4DE', // Light Purple
    '#AED6F1', // Very Light Blue
    '#FADBD8', // Very Light Pink
    '#D5F4E6', // Very Light Green
    '#FCF3CF', // Very Light Yellow
    '#E8DAEF', // Very Light Purple
    '#D1F2EB', // Very Light Teal
    '#FDEBD0', // Very Light Orange
    '#E8F8F5', // Very Light Mint
    '#FEF9E7', // Very Light Cream
    '#F4F6F6'  // Very Light Gray
  ]

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
          <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>
            {label}
          </p>
          <div className="space-y-1">
            {payload
              .filter(item => item.value > 0)
              .map((item, index) => {
                const member = item.dataKey
                
                return (
                  <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                    <span style={{ color: '#EFECD2' }}>
                      {member}:
                    </span>
                    <span className="font-bold" style={{ color: item.color }}>
                      {item.value.toFixed(2)} hours
                    </span>
                  </div>
                )
              })}
            {payload.filter(item => item.value > 0).length === 0 && (
              <div className="text-xs text-slate-400" style={{ textShadow }}>
                No overtime on this day
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }
  
  const exportPng = () => {
    const node = ref.current
    if (!node) return
    toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
      .then((blob) => {
        if (!blob) throw new Error('No blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'overtime-incidence.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
  }
  
  if (!data.chartData || data.chartData.length === 0) {
    return (
      <div ref={ref} className="oryx-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="oryx-heading text-lg flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">⚡</span>
            </span>
            Overtime Incidence
          </h3>
          <button 
            onClick={exportPng}
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
        <div className="flex h-96 items-center justify-center text-sm text-slate-400">
          No overtime hours found
        </div>
      </div>
    )
  }
  
  return (
    <div ref={ref} className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">⚡</span>
          </span>
          Overtime Incidence - 6 Week View
        </h3>
        <button 
          onClick={exportPng}
          className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> Export PNG
        </button>
      </div>
      
      {/* Summary breakdown section */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-lime-400">
              {data.topMembers.length > 0 ? 
                Math.round(data.chartData.reduce((sum, day) => sum + day.total, 0) / data.chartData.length * 10) / 10 : 0
              }
            </div>
            <div className="text-xs text-slate-400">Avg Daily OT Hours</div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {data.topMembers.length > 0 ? 
                data.topMembers[0] : 'N/A'
              }
            </div>
            <div className="text-xs text-slate-400">Top Contributor</div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {data.latestDate || 'N/A'}
            </div>
            <div className="text-xs text-slate-400">Data up to</div>
          </div>
        </div>
      </div>
      
      <div className="h-96 rounded-lg p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data.chartData} 
            margin={{ left: 8, right: 16, top: 16, bottom: 40 }}
            barSize={35}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="displayName" 
              tick={{ fill: '#cbd5e1', fontSize: 10 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              label={{ 
                value: 'Overtime Hours', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Stacked bars for each member */}
            {data.topMembers.map((member, index) => (
              <Bar 
                key={member}
                dataKey={member}
                name={member}
                fill={memberColors[index % memberColors.length]}
                fillOpacity={0.9}
                radius={[4, 4, 0, 0]}
                stroke={memberColors[index % memberColors.length]}
                strokeWidth={1}
                stackId="a"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
        <p>Shows daily overtime hours for up to 6 weeks ending on {data.latestDate || 'the latest available date'}.</p>
        <p>Each bar represents one day with overtime hours stacked by person. Days with no overtime show as 0 height.</p>
      </div>
    </div>
  )
}
