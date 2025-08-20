import React, { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

// Overtime rules
const OVERTIME_DAILY_THRESHOLD = 7.5

export default function OvertimeIncidence({ filteredRows }) {
  const ref = useRef(null)
  
  const data = useMemo(() => {
    try {
      console.log('OvertimeIncidence - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows || filteredRows.length === 0) return []
      
      // Group by member, week, and date to calculate daily hours
      const memberWeeklyData = {}
      
      for (const row of filteredRows) {
        const member = row.Member || 'Unknown'
        
        // Skip rows without valid dateObj
        if (!row.dateObj) {
          console.log('OvertimeIncidence - Skipping row without dateObj:', row)
          continue
        }
        
        const date = dayjs(row.dateObj)
        if (!date.isValid()) {
          console.log('OvertimeIncidence - Skipping row with invalid date:', row)
          continue
        }
        
        const week = date.format('YYYY-[W]WW') // ISO week format
      const dateKey = date.format('YYYY-MM-DD')
      const isWeekend = date.isoWeekday() >= 6 // Saturday=6, Sunday=7
      
      if (!memberWeeklyData[member]) {
        memberWeeklyData[member] = {}
      }
      
      if (!memberWeeklyData[member][week]) {
        memberWeeklyData[member][week] = {}
      }
      
      if (!memberWeeklyData[member][week][dateKey]) {
        memberWeeklyData[member][week][dateKey] = {
          hours: 0,
          isWeekend
        }
      }
      
      memberWeeklyData[member][week][dateKey].hours += row.Hours
    }
    
    // Calculate overtime incidents per member per week
    const weeklyOvertimeData = {}
    
    for (const [member, weeklyData] of Object.entries(memberWeeklyData)) {
      for (const [week, dailyData] of Object.entries(weeklyData)) {
        if (!weeklyOvertimeData[week]) {
          weeklyOvertimeData[week] = {}
        }
        
        if (!weeklyOvertimeData[week][member]) {
          weeklyOvertimeData[week][member] = {
            weekdayOT: 0,
            weekendOT: 0
          }
        }
        
        // Count overtime incidents for this member in this week
        for (const [dateKey, dayData] of Object.entries(dailyData)) {
          const isOvertime = dayData.hours > OVERTIME_DAILY_THRESHOLD || (dayData.isWeekend && dayData.hours > 0)
          
          if (isOvertime) {
            if (dayData.isWeekend) {
              weeklyOvertimeData[week][member].weekendOT += 1
            } else {
              weeklyOvertimeData[week][member].weekdayOT += 1
            }
          }
        }
      }
    }
    
    // Convert to chart data format (show top contributors only)
    const allMembers = new Set()
    Object.values(weeklyOvertimeData).forEach(weekData => {
      Object.keys(weekData).forEach(member => allMembers.add(member))
    })
    
    // Calculate total overtime incidents per member to find top contributors
    const memberTotals = {}
    for (const member of allMembers) {
      memberTotals[member] = 0
      Object.values(weeklyOvertimeData).forEach(weekData => {
        const memberData = weekData[member]
        if (memberData) {
          memberTotals[member] += memberData.weekdayOT + memberData.weekendOT
        }
      })
    }
    
    // Get top 10 members by overtime incidents
    const topMembers = Object.entries(memberTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([member]) => member)
    
    // Build chart data
    const chartData = Object.entries(weeklyOvertimeData)
      .map(([week, memberData]) => {
        const weekEntry = { week }
        
        topMembers.forEach(member => {
          const data = memberData[member] || { weekdayOT: 0, weekendOT: 0 }
          weekEntry[`${member}_weekday`] = data.weekdayOT
          weekEntry[`${member}_weekend`] = data.weekendOT
        })
        
        return weekEntry
      })
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12) // Show last 12 weeks for readability
    
    return { chartData, topMembers }
    
    } catch (error) {
      console.error('OvertimeIncidence - Error:', error)
      return { chartData: [], topMembers: [] }
    }
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">Week {label}</p>
          {payload
            .filter(item => item.value > 0)
            .map((item, index) => {
              const [member, type] = item.dataKey.split('_')
              return (
                <p key={index} className="text-xs" style={{ color: item.color }}>
                  {member} ({type === 'weekday' ? 'Weekday' : 'Weekend'}): {item.value} incidents
                </p>
              )
            })}
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
        <div className="flex h-80 items-center justify-center text-sm text-slate-400">
          No overtime incidents found
        </div>
      </div>
    )
  }
  
  // Generate colors for members
  const memberColors = [
    '#22d3ee', '#84cc16', '#a78bfa', '#fb7185', '#fbbf24', 
    '#34d399', '#f472b6', '#60a5fa', '#f97316', '#10b981'
  ]
  
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
      <div className="h-80 rounded-lg p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data.chartData} 
            margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="week" 
              tick={{ fill: '#cbd5e1', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Overtime Incidents', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            
            {data.topMembers.map((member, index) => (
              <React.Fragment key={member}>
                <Bar 
                  dataKey={`${member}_weekday`}
                  stackId={member}
                  name={`${member} (Weekday)`}
                  fill={memberColors[index % memberColors.length]}
                  fillOpacity={0.8}
                />
                <Bar 
                  dataKey={`${member}_weekend`}
                  stackId={member}
                  name={`${member} (Weekend)`}
                  fill={memberColors[index % memberColors.length]}
                  fillOpacity={1}
                />
              </React.Fragment>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
        <p>Shows weekly overtime incidents (days &gt;7.5h or any weekend hours)</p>
        <p>Darker shades = weekend, lighter = weekday. Top 10 contributors shown.</p>
      </div>
    </div>
  )
}
