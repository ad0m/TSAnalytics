import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

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

/**
 * Gets the daily baseline hours for a member on a specific date
 * @param {string} memberName - Normalized member name
 * @param {dayjs.Dayjs} date 
 * @returns {number}
 */
function dailyBaselineFor(memberName, date) {
  const normalizedName = normalizeMemberName(memberName)
  const dayOfWeek = date.isoWeekday() // 1=Monday, 7=Sunday
  
  // Weekends have 0 baseline
  if (dayOfWeek >= 6) {
    return 0
  }
  
  // Mark Bolton has compressed schedule
  if (normalizedName === 'Mark Bolton') {
    if (dayOfWeek <= 4) { // Mon-Thu
      return 8.25
    } else { // Fri
      return 4.5
    }
  }
  
  // Default weekday baseline
  return 7.5
}

/**
 * Rounds hours to 0.25 increments
 * @param {number} hours 
 * @returns {number}
 */
function roundToQuarterHours(hours) {
  return Math.round(hours * 4) / 4
}

/**
 * Computes weekly overtime for all entries
 * @param {Array} entries - Array of timesheet entries with Member, Date, Hours, Productivity, "Work Type" fields
 * @returns {Array} Array of weekly overtime objects
 */
export function computeWeeklyOvertime(entries) {
  if (!entries || entries.length === 0) {
    return []
  }
  
  // Group entries by member and ISO week
  const memberWeekGroups = {}
  
  for (const entry of entries) {
    const member = normalizeMemberName(entry.Member)
    
    // Handle both Date field and dateObj field from parsed timesheets
    let date
    if (entry.dateObj) {
      date = dayjs(entry.dateObj)
    } else if (entry.Date) {
      date = dayjs(entry.Date, ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY'])
    } else {
      console.warn('No date found in entry:', entry)
      continue
    }
    
    if (!date.isValid()) {
      console.warn('Invalid date in entry:', entry)
      continue
    }
    
    const isoWeek = `${date.format('YYYY')}-W${String(date.isoWeek()).padStart(2, '0')}`
    const dateKey = date.format('YYYY-MM-DD')
    
    if (!memberWeekGroups[member]) {
      memberWeekGroups[member] = {}
    }
    
    if (!memberWeekGroups[member][isoWeek]) {
      memberWeekGroups[member][isoWeek] = {
        dates: {},
        totalProductiveWeekdayBaseline: 0,
        totalNonWorkingWeekdayHours: 0
      }
    }
    
    if (!memberWeekGroups[member][isoWeek].dates[dateKey]) {
      memberWeekGroups[member][isoWeek].dates[dateKey] = {
        productiveHours: 0,
        nonWorkingHours: 0,
        isWeekend: date.isoWeekday() >= 6,
        isBankHoliday: false,
        dailyBaseline: dailyBaselineFor(member, date)
      }
    }
    
    const dayData = memberWeekGroups[member][isoWeek].dates[dateKey]
    const hours = parseFloat(entry.Hours) || 0
    
    if (hours <= 0) continue
    
    // Check if this is a bank holiday entry
    if (entry["Work Type"] === "Bank/Holiday Leave") {
      dayData.isBankHoliday = true
      dayData.nonWorkingHours += hours
    }
    // Check if this is other non-working time (sick leave, annual leave, training)
    else if (["Sick Leave", "Training"].includes(entry["Work Type"])) {
      dayData.nonWorkingHours += hours
    }
    // Productive work
    else if (entry.Productivity === "Productive") {
      dayData.productiveHours += hours
    }
  }
  
  // Calculate overtime for each member-week
  const results = []
  
  for (const [member, weekGroups] of Object.entries(memberWeekGroups)) {
    for (const [isoWeek, weekData] of Object.entries(weekGroups)) {
      let dailyWeekdayOT = 0
      let weekendHolidayOT = 0
      let productiveWeekdayBaselinePool = 0
      let nonWorkingWeekdayHours = 0
      
      // Process each date in the week
      for (const [dateKey, dayData] of Object.entries(weekData.dates)) {
        const date = dayjs(dateKey)
        const isWeekend = dayData.isWeekend
        const isBankHoliday = dayData.isBankHoliday
        const dailyBaseline = dayData.dailyBaseline
        
        if (isWeekend) {
          // All productive hours on weekends are overtime
          weekendHolidayOT += dayData.productiveHours
        } else if (isBankHoliday) {
          // Bank holiday entries reduce weekly capacity (capped at daily baseline)
          const capacityReduction = Math.min(dayData.nonWorkingHours, 7.5)
          nonWorkingWeekdayHours += capacityReduction
          
          // Any productive hours on bank holiday dates are overtime
          weekendHolidayOT += dayData.productiveHours
        } else {
          // Normal weekday
          // Non-working hours reduce weekly capacity (capped at daily baseline)
          const capacityReduction = Math.min(dayData.nonWorkingHours, dailyBaseline)
          nonWorkingWeekdayHours += capacityReduction
          
          // Productive hours are split into base and overtime portions
          const basePortion = Math.min(dayData.productiveHours, dailyBaseline)
          const dailyOT = Math.max(0, dayData.productiveHours - dailyBaseline)
          
          dailyWeekdayOT += dailyOT
          productiveWeekdayBaselinePool += basePortion
        }
      }
      
      // Calculate weekly overflow overtime
      const weeklyCapacity = Math.max(0, 37.5 - nonWorkingWeekdayHours)
      const weeklyOverflow = Math.max(0, productiveWeekdayBaselinePool - weeklyCapacity)
      
      // Round all values to 0.25 hour increments
      const result = {
        member,
        isoWeek,
        overtime: {
          dailyWeekday: roundToQuarterHours(dailyWeekdayOT),
          weeklyOverflow: roundToQuarterHours(weeklyOverflow),
          weekendHoliday: roundToQuarterHours(weekendHolidayOT),
          total: roundToQuarterHours(dailyWeekdayOT + weeklyOverflow + weekendHolidayOT)
        }
      }
      
      results.push(result)
    }
  }
  
  return results
}
