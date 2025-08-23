import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { X } from 'lucide-react'

dayjs.extend(isoWeek)

// Overtime rules - using the same logic as OvertimeIncidence
const OUTLIER_DAILY_THRESHOLD = 12

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

export default function CalendarHeatmap({ filteredRows }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  
  const { calendarData, members } = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return { calendarData: {}, members: [] }
    
    // Group by member and date
    const memberDateData = {}
    const allMembers = new Set()
    
    for (const row of filteredRows) {
      const member = normalizeMemberName(row.Member || 'Unknown')
      const date = dayjs(row.dateObj)
      const dateKey = date.format('YYYY-MM-DD')
      const dow = date.isoWeekday() // 1=Monday, 7=Sunday
      
      allMembers.add(member)
      
      if (!memberDateData[member]) {
        memberDateData[member] = {}
      }
      
      if (!memberDateData[member][dateKey]) {
        memberDateData[member][dateKey] = {
          date: date.toDate(),
          dateKey,
          dow,
          isWeekend: dow >= 6,
          isBankHoliday: false,
          productiveHours: 0,
          nonWorkingHours: 0,
          dailyBaseline: 0,
          entries: []
        }
      }
      
      const dayData = memberDateData[member][dateKey]
      const hours = parseFloat(row.Hours) || 0
      
      if (hours <= 0) continue
      
      // Set daily baseline based on member and day
      if (dayData.dailyBaseline === 0) {
        if (dow >= 6) {
          dayData.dailyBaseline = 0 // Weekends
        } else if (member === 'Mark Bolton') {
          dayData.dailyBaseline = dow <= 4 ? 8.25 : 4.5 // Compressed schedule
        } else {
          dayData.dailyBaseline = 7.5 // Standard
        }
      }
      
      // Check if this is a bank holiday entry
      if (row["Work Type"] === "Bank/Holiday Leave") {
        dayData.isBankHoliday = true
        dayData.nonWorkingHours += hours
      }
      // Check if this is other non-working time
      else if (["Sick Leave", "Training"].includes(row["Work Type"])) {
        dayData.nonWorkingHours += hours
      }
      // Productive work
      else if (row.Productivity === "Productive") {
        dayData.productiveHours += hours
      }
      
      // Keep track of total hours for display
      dayData.hours = (dayData.hours || 0) + hours
      
      dayData.entries.push({
        project: row['Project/Ticket'] || 'Unknown',
        company: row.Company || 'Unknown',
        hours: row.Hours
      })
    }
    
    // Apply overtime rules - using the same logic as OvertimeIncidence
    for (const member in memberDateData) {
      for (const dateKey in memberDateData[member]) {
        const dayData = memberDateData[member][dateKey]
        
        // Calculate overtime using the same logic as OvertimeIncidence
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
        
        dayData.isOvertime = dailyOvertime > 0
        dayData.overtimeHours = dailyOvertime
        
        // Outlier: > 12h daily (total hours)
        dayData.isOutlier = dayData.hours > OUTLIER_DAILY_THRESHOLD
      }
    }
    
    return {
      calendarData: memberDateData,
      members: Array.from(allMembers).sort()
    }
  }, [filteredRows])
  
  // Get color intensity based on overtime hours
  const getDayColor = (dayData) => {
    if (!dayData) return '#334155' // Lighter slate for no data - better contrast
    
    const hours = dayData.hours
    if (hours === 0) return '#334155' // Lighter slate for zero hours - better contrast
    
    if (dayData.isOutlier) {
      // Bright red for outliers - much more visible
      return `rgba(239, 68, 68, 0.9)`
    } else if (dayData.isOvertime) {
      // Bright orange for overtime - intensity based on overtime hours
      const overtimeIntensity = Math.min(dayData.overtimeHours / 8, 1) // Scale 0-8h overtime
      return `rgba(251, 146, 60, ${0.7 + overtimeIntensity * 0.3})`
    } else {
      // Bright green for normal - intensity based on total hours
      const normalIntensity = Math.min(hours / 8, 1) // Scale 0-8h normal
      return `rgba(132, 204, 22, ${0.6 + normalIntensity * 0.4})`
    }
  }
  
  // Get all weeks in the data range
  const getWeeksInRange = () => {
    const allDates = []
    Object.values(calendarData).forEach(memberData => {
      Object.values(memberData).forEach(dayData => {
        allDates.push(dayjs(dayData.date))
      })
    })
    
    if (allDates.length === 0) return []
    
    // Find min and max dates using timestamps
    const timestamps = allDates.map(date => date.valueOf())
    const minDate = dayjs(Math.min(...timestamps))
    const maxDate = dayjs(Math.max(...timestamps))
    
    // Start from Monday of first week
    const startWeek = minDate.startOf('isoWeek')
    const endWeek = maxDate.endOf('isoWeek')
    
    const weeks = []
    let currentWeek = startWeek
    
    while (currentWeek.isBefore(endWeek) || currentWeek.isSame(endWeek, 'week')) {
      weeks.push(currentWeek)
      currentWeek = currentWeek.add(1, 'week')
    }
    
    return weeks
  }
  
  const weeks = getWeeksInRange()
  
  // Set default selected member if none selected
  const currentSelectedMember = selectedMember || (members.length > 0 ? members[0] : null)
  
  // Update selected member when members list changes
  useEffect(() => {
    if (!selectedMember && members.length > 0) {
      setSelectedMember(members[0])
    }
  }, [members, selectedMember])
  
  const handleDayClick = (dayData) => {
    if (dayData && dayData.hours > 0) {
      setSelectedDay(dayData)
    }
  }
  
  const handleCloseModal = () => {
    setSelectedDay(null)
  }
  
  if (!currentSelectedMember || weeks.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Calendar Heatmap</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No calendar data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Calendar Heatmap - {currentSelectedMember}</h3>
      
      {/* Member selector */}
      <div className="mb-4">
        <select
          value={currentSelectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="oryx-input text-sm rounded px-3 py-1"
        >
          {members.map(member => (
            <option key={member} value={member}>{member}</option>
          ))}
        </select>
      </div>
      
      {/* Calendar grid */}
      <div className="overflow-auto">
        <div className="min-w-max">
          {/* Day labels */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs text-slate-400 text-center w-12"></div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-xs text-slate-400 text-center w-12">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar weeks */}
          {weeks.map((weekStart, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-8 gap-1 mb-1">
              {/* Week label */}
              <div className="text-xs text-slate-400 text-center w-12 flex items-center justify-center">
                {weekStart.format('MM/DD')}
              </div>
              
              {/* Days of the week */}
              {[1, 2, 3, 4, 5, 6, 7].map(dow => {
                const dayDate = weekStart.isoWeekday(dow)
                const dateKey = dayDate.format('YYYY-MM-DD')
                const dayData = calendarData[currentSelectedMember]?.[dateKey]
                const color = getDayColor(dayData)
                
                return (
                  <div
                    key={dow}
                    className="w-12 h-12 rounded border border-slate-600 cursor-pointer hover:border-lime-400 hover:scale-105 transition-all relative flex items-center justify-center"
                    style={{ backgroundColor: color }}
                    onClick={() => handleDayClick(dayData)}
                    title={dayData ? `${dayDate.format('MMM DD')}: ${dayData.hours}h${dayData.isOvertime ? ` (OT: ${dayData.overtimeHours?.toFixed(1)}h)` : ''}${dayData.isOutlier ? ' (OUTLIER)' : ''}` : dayDate.format('MMM DD')}
                  >
                    {/* Day number */}
                    <span 
                      className={`text-xs font-bold drop-shadow-sm translate-y-[2px] ${
                        dayData && dayData.hours > 0 
                          ? 'text-white' 
                          : 'text-slate-200'
                      }`}
                    >
                      {dayDate.date()}
                    </span>
                    
                    {/* Overtime badge */}
                    {dayData?.isOvertime && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
                    )}
                    
                    {/* Outlier badge */}
                    {dayData?.isOutlier && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                    )}
                    
                    {/* Hours text */}
                    {dayData && dayData.hours > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 text-center">
                        <span className="text-[10px] text-stone-200 bg-black bg-opacity-70 px-1 rounded font-semibold">
                          {dayData.hours.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(132, 204, 22, 0.8)' }}></div>
            <span>Normal hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 146, 60, 0.8)' }}></div>
            <span>Overtime (above baseline or weekend)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
            <span>Outlier (&gt;12h)</span>
          </div>
        </div>
        <p>Click on any day with hours to see detailed breakdown</p>
      </div>
      
      {/* Day detail modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="oryx-card w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h4 className="oryx-heading text-lg">
                  {dayjs(selectedDay.date).format('MMM DD, YYYY')}
                </h4>
                <p className="text-sm text-slate-400">
                  {selectedDay.hours}h total
                  {selectedDay.isOvertime && (
                    <span className="text-orange-400 ml-2">
                      OVERTIME ({selectedDay.overtimeHours?.toFixed(1)}h)
                    </span>
                  )}
                  {selectedDay.isOutlier && <span className="text-red-400 ml-2">OUTLIER</span>}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {selectedDay.entries.map((entry, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium text-white">{entry.project}</p>
                      <span className="text-sm text-lime-400 font-bold">{entry.hours}h</span>
                    </div>
                    <p className="text-xs text-slate-400">{entry.company}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
