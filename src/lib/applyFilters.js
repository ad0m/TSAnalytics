// Filter application logic for clean timesheet rows
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

/**
 * Derives quarter from calendar month
 * @param {string} calendarMonth - YYYY-MM format
 * @returns {string} - YYYY-Q# format
 */
function getQuarterFromMonth(calendarMonth) {
  const [year, month] = calendarMonth.split('-')
  const monthNum = parseInt(month, 10)
  const quarter = Math.ceil(monthNum / 3)
  return `${year}-Q${quarter}`
}

/**
 * Derives quarter from ISO week
 * @param {string} isoWeek - YYYY-W## format
 * @returns {string} - YYYY-Q# format
 */
function getQuarterFromIsoWeek(isoWeek) {
  const [year, week] = isoWeek.split('-W')
  const weekNum = parseInt(week, 10)
  // Approximate quarter from week number (52/53 weeks per year)
  const quarter = Math.ceil((weekNum / 52) * 4)
  return `${year}-Q${Math.min(quarter, 4)}`
}

/**
 * Applies filters to clean timesheet rows
 * @param {Array} rows - Array of clean row objects
 * @param {Object} filters - Filter configuration object
 * @returns {Array} - Filtered rows
 */
export function applyFilters(rows, filters) {
  console.log('applyFilters - Input:', { totalRows: rows.length, filters })
  
  // Count productivity breakdown in input rows
  const inputProductivity = {
    Productive: rows.filter(r => r.Productivity === "Productive").length,
    Unproductive: rows.filter(r => r.Productivity === "Unproductive").length,
    Other: rows.filter(r => r.Productivity !== "Productive" && r.Productivity !== "Unproductive").length
  }
  console.log('applyFilters - Input productivity breakdown:', inputProductivity)
  
  const filteredRows = rows.filter(row => {
    // Period filtering
    switch (filters.period) {
      case "Month":
        if (filters.month && row.calendarMonth !== filters.month) return false
        break
      case "Quarter":
        if (filters.quarter && getQuarterFromMonth(row.calendarMonth) !== filters.quarter) return false
        break
      case "FY":
        if (filters.fy && row.fiscalYear !== filters.fy) return false
        break
      case "Custom":
        if (filters.fromDate || filters.toDate) {
          const rowDateStr = row.Date
          if (!rowDateStr) return false
          
          // Parse the row date using the same formats as parseTimesheets.js
          const DATE_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY']
          const rowDate = dayjs(rowDateStr, DATE_FORMATS, true)
          if (!rowDate.isValid()) return false
          
          // Get the date only (no time) for comparison
          const rowDateOnly = rowDate.format('YYYY-MM-DD')
          
          // Check if row date is within custom range (inclusive)
          if (filters.fromDate) {
            const fromDateStr = dayjs(filters.fromDate).format('YYYY-MM-DD')
            if (rowDateOnly < fromDateStr) return false
          }
          if (filters.toDate) {
            const toDateStr = dayjs(filters.toDate).format('YYYY-MM-DD')
            if (rowDateOnly > toDateStr) return false
          }
        }
        break

    }

    // Role filtering
    if (Array.isArray(filters.roles) && filters.roles.length > 0) {
      if (!filters.roles.includes(row.Role)) return false
    }

    // Member filtering
    if (filters.members !== "ALL") {
      if (Array.isArray(filters.members) && filters.members.length > 0) {
        if (!filters.members.includes(row.Member)) return false
      }
    }

    // Company filtering
    if (filters.companies !== "ALL") {
      if (Array.isArray(filters.companies) && filters.companies.length > 0) {
        if (!filters.companies.includes(row.Company)) return false
      }
    }

    // Project Type filtering
    if (filters.projectTypes !== "ALL") {
      if (Array.isArray(filters.projectTypes) && filters.projectTypes.length > 0) {
        if (!filters.projectTypes.includes(row['Project Type'])) return false
      }
    }

    // Board Work Type filtering
    if (Array.isArray(filters.workTypesBoard) && filters.workTypesBoard.length > 0) {
      if (!filters.workTypesBoard.includes(row.boardWorkType)) return false
    }

    // Productivity filtering
    if (filters.productivity !== "All") {
      if (filters.productivity === "Productive" && !row.isBillable) return false
      if (filters.productivity === "Unproductive" && row.isBillable) return false
    }

    return true
  })
  
  // Count productivity breakdown in output rows
  const outputProductivity = {
    Productive: filteredRows.filter(r => r.Productivity === "Productive").length,
    Unproductive: filteredRows.filter(r => r.Productivity === "Unproductive").length,
    Other: filteredRows.filter(r => r.Productivity !== "Productive" && r.Productivity !== "Unproductive").length
  }
  console.log('applyFilters - Output:', { 
    totalRows: filteredRows.length, 
    productivity: outputProductivity,
    filtered: rows.length - filteredRows.length
  })
  
  return filteredRows
}

/**
 * Generates distinct values for filter options
 * @param {Array} rows - Array of clean row objects
 * @returns {Object} - Object with arrays of distinct values
 */
export function getDistinctValues(rows) {
  const roles = [...new Set(rows.map(r => r.Role).filter(Boolean))].sort()
  const members = [...new Set(rows.map(r => r.Member).filter(Boolean))].sort()
  const companies = [...new Set(rows.map(r => r.Company).filter(Boolean))].sort()
  const projectTypes = [...new Set(rows.map(r => r['Project Type']).filter(Boolean))].sort()
  const workTypesBoard = [...new Set(rows.map(r => r.boardWorkType).filter(Boolean))].sort()
  const calendarMonths = [...new Set(rows.map(r => r.calendarMonth).filter(Boolean))].sort()
  const fiscalYears = [...new Set(rows.map(r => r.fiscalYear).filter(Boolean))].sort()

  // Generate quarters from calendar months
  const quarters = [...new Set(calendarMonths.map(getQuarterFromMonth))].sort()

  return {
    roles,
    members,
    companies,
    projectTypes,
    workTypesBoard,
    calendarMonths,
    quarters,
    fiscalYears
  }
}

/**
 * Determines the latest complete month from the data
 * @param {Array} rows - Array of clean row objects
 * @returns {string|null} - Latest complete month in YYYY-MM format
 */
export function getLatestCompleteMonth(rows) {
  const months = [...new Set(rows.map(r => r.calendarMonth).filter(Boolean))].sort()
  return months.length > 0 ? months[months.length - 1] : null
}

/**
 * Derives quarter and FY from a month
 * @param {string} month - YYYY-MM format
 * @returns {Object} - {quarter, fy}
 */
export function derivePeriodDefaults(month) {
  if (!month) return { quarter: null, fy: null }
  
  const quarter = getQuarterFromMonth(month)
  const [year, monthNum] = month.split('-')
  const monthInt = parseInt(monthNum, 10)
  
  // FY starts in April
  let fyYear
  if (monthInt >= 4) {
    fyYear = parseInt(year, 10)
  } else {
    fyYear = parseInt(year, 10) - 1
  }
  
  const fy = `FY${String(fyYear).slice(-2)}`
  
  return { quarter, fy }
}
