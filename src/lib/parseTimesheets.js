import Papa from 'papaparse'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isoWeek from 'dayjs/plugin/isoWeek'
import { CANONICAL_HEADERS, LEGACY_COLUMN_MAPPING, isInternalWork, mapWorkTypeToBoard } from './mapping.js'

dayjs.extend(customParseFormat)
dayjs.extend(isoWeek)

const DATE_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY']

/**
 * Safely converts a value to float, handling commas
 * @param {any} value 
 * @returns {number}
 */
function safeFloat(value) {
  const n = parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Maps legacy column names to canonical headers
 * @param {Object} rawRow 
 * @returns {Object}
 */
function normalizeColumnNames(rawRow) {
  const normalized = {}
  
  // First, copy all existing columns
  Object.keys(rawRow).forEach(key => {
    normalized[key] = rawRow[key]
  })
  
  // Then apply legacy mappings
  Object.entries(LEGACY_COLUMN_MAPPING).forEach(([legacy, canonical]) => {
    if (rawRow[legacy] !== undefined) {
      normalized[canonical] = rawRow[legacy]
      // Keep the legacy column for now, don't delete
    }
  })
  
  return normalized
}

/**
 * Calculates fiscal year from a date (assuming April start)
 * @param {dayjs.Dayjs} date 
 * @returns {string} e.g., "FY25"
 */
function getFiscalYear(date) {
  const year = date.year()
  const month = date.month() + 1 // dayjs months are 0-indexed
  
  if (month >= 4) {
    // Apr-Dec: current fiscal year
    return `FY${String(year).slice(-2)}`
  } else {
    // Jan-Mar: previous fiscal year
    return `FY${String(year - 1).slice(-2)}`
  }
}

/**
 * Calculates fiscal month from a date
 * @param {dayjs.Dayjs} date 
 * @returns {string} e.g., "FY25-04"
 */
function getFiscalMonth(date) {
  const fiscalYear = getFiscalYear(date)
  const month = date.month() + 1
  
  let fiscalMonth
  if (month >= 4) {
    fiscalMonth = month - 3 // Apr=1, May=2, ..., Dec=9
  } else {
    fiscalMonth = month + 9 // Jan=10, Feb=11, Mar=12
  }
  
  return `${fiscalYear}-${String(fiscalMonth).padStart(2, '0')}`
}

/**
 * Parses CSV to clean rows with derived fields
 * @param {File|string} fileOrString 
 * @returns {Promise<Array>}
 */
export function parseCsvToRows(fileOrString) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV parse warnings:', results.errors)
          }
          
          const rawRows = results.data || []
          console.log(`Parsed ${rawRows.length} raw rows from CSV`)
          
          if (rawRows.length === 0) {
            resolve([])
            return
          }
          
          // Log available headers for debugging
          const availableHeaders = Object.keys(rawRows[0] || {})
          console.log('Available CSV headers:', availableHeaders)
          
          // Debug: Show raw CSV data for first few rows
          console.log('parseTimesheets - RAW CSV DATA (first 3 rows):')
          rawRows.slice(0, 3).forEach((row, index) => {
            console.log(`Raw row ${index + 1}:`, {
              'Productive/Unproductive': row['Productive/Unproductive'],
              'Productivity': row['Productivity'],
              'Role': row['Role'],
              'Member': row['Member'],
              'Hours': row['Hours']
            })
          })
          
          // Check for missing canonical headers
          const missingHeaders = []
          for (const canonical of CANONICAL_HEADERS) {
            const hasDirectMatch = availableHeaders.includes(canonical)
            const hasLegacyMatch = Object.keys(LEGACY_COLUMN_MAPPING).some(legacy => 
              availableHeaders.includes(legacy) && LEGACY_COLUMN_MAPPING[legacy] === canonical
            )
            
            if (!hasDirectMatch && !hasLegacyMatch) {
              missingHeaders.push(canonical)
            }
          }
          
          if (missingHeaders.length > 0) {
            console.error('parseTimesheets - MISSING HEADERS:', missingHeaders)
            console.error('parseTimesheets - Available headers:', availableHeaders)
            const error = new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
            error.missingHeaders = missingHeaders
            reject(error)
            return
          }
          
          console.log('parseTimesheets - All required headers found ✅')
          
          // Validate first few rows for date parsing
          console.log('parseTimesheets - Testing date parsing on first 3 rows...')
          for (let i = 0; i < Math.min(3, rawRows.length); i++) {
            const row = rawRows[i]
            const dateString = row.Date
            console.log(`Row ${i + 1} date: "${dateString}"`)
            
            const date = dayjs(dateString, DATE_FORMATS, true)
            if (!date.isValid()) {
              console.error(`parseTimesheets - INVALID DATE in row ${i + 1}: "${dateString}"`)
              console.error(`parseTimesheets - Expected format: DD/MM/YYYY, D/M/YYYY, or DD/MM/YY`)
              const error = new Error(`Invalid date format in row ${i + 1}: "${dateString}". Expected DD/MM/YYYY format.`)
              reject(error)
              return
            }
            console.log(`Row ${i + 1} date parsed successfully: ${date.format('YYYY-MM-DD')}`)
          }
          
          const cleanRows = rawRows
            .map((rawRow, index) => {
              try {
                // Normalize column names
                const normalized = normalizeColumnNames(rawRow)
                
                // Parse Hours and filter out zero hours
                const hours = safeFloat(normalized.Hours)
                if (hours <= 0) {
                  console.log(`parseTimesheets - Row ${index + 1} filtered: Hours <= 0 (${hours})`)
                  return null
                }
                
                // Exclude HoPS role
                if (normalized.Role === "HoPS") {
                  console.log(`parseTimesheets - Row ${index + 1} filtered: Role is HoPS`)
                  return null
                }
                
                // Parse date
                const dateString = normalized.Date
                const date = dayjs(dateString, DATE_FORMATS, true)
                if (!date.isValid()) {
                  console.error(`parseTimesheets - Row ${index + 1} filtered: Invalid date "${dateString}"`)
                  return null
                }
                
                // Build clean row with canonical headers + derived fields
                const cleanRow = {}
                
                // Copy canonical headers
                CANONICAL_HEADERS.forEach(header => {
                  cleanRow[header] = normalized[header] || ''
                })
                
                // Override Hours with parsed float
                cleanRow.Hours = hours
                
                // Add derived fields
                cleanRow.dateObj = date.toDate()
                cleanRow.calendarMonth = date.format('YYYY-MM')
                cleanRow.fiscalYear = getFiscalYear(date)
                cleanRow.fiscalMonth = getFiscalMonth(date)
                cleanRow.isoWeek = `${date.format('YYYY')}-W${String(date.isoWeek()).padStart(2, '0')}`
                cleanRow.dow = date.isoWeekday() // 1=Monday, 7=Sunday
                cleanRow.isWeekend = cleanRow.dow >= 6
                
                // Set default values for fields that might not exist in the CSV
                cleanRow.Company = cleanRow.Company || 'Unknown'
                cleanRow["Project/Ticket"] = cleanRow["Project/Ticket"] || 'Unknown'
                cleanRow["Project Type"] = cleanRow["Project Type"] || 'Unknown'
                cleanRow["Work Type"] = cleanRow["Work Type"] || 'Unknown'
                cleanRow.boardWorkType = mapWorkTypeToBoard(cleanRow["Work Type"])
                cleanRow.isInternal = isInternalWork(cleanRow)
                
                // Calculate isBillable AFTER Productivity field is set
                cleanRow.isBillable = cleanRow.Productivity === "Productive"
                
                // Debug: Log the exact calculation for this row
                if (index < 10) { // Only log for first few rows to avoid spam
                  console.log(`parseTimesheets - Row ${index + 1} isBillable calculation:`, {
                    Productivity: cleanRow.Productivity,
                    isProductive: cleanRow.Productivity === "Productive",
                    isUnproductive: cleanRow.Productivity === "Unproductive",
                    isBillable: cleanRow.isBillable,
                    Role: cleanRow.Role,
                    Member: cleanRow.Member,
                    Hours: cleanRow.Hours
                  })
                }
                
                return cleanRow
              } catch (rowError) {
                console.error(`parseTimesheets - Error processing row ${index + 1}:`, rowError)
                console.error(`parseTimesheets - Row data:`, rawRow)
                return null
              }
            })
            .filter(row => row !== null) // Remove filtered out rows
          
          console.log(`parseTimesheets - Processing summary:`)
          console.log(`  - Total rows: ${rawRows.length}`)
          console.log(`  - Clean rows: ${cleanRows.length}`)
          console.log(`  - Filtered out: ${rawRows.length - cleanRows.length}`)
          
          if (cleanRows.length === 0) {
            console.error(`parseTimesheets - ALL ROWS WERE FILTERED OUT!`)
            console.error(`parseTimesheets - This means every row failed validation`)
            console.error(`parseTimesheets - Check the logs above for specific reasons`)
          }
          
          console.log(`Processed ${cleanRows.length} clean rows after filtering`)
          
          // Debug: Log productivity and billable status for first few rows
          if (cleanRows.length > 0) {
            console.log('Sample clean row:', cleanRows[0])
            
            // Show productivity breakdown for first few rows
            cleanRows.slice(0, 5).forEach((row, index) => {
              console.log(`Row ${index + 1} data:`, {
                Productivity: row.Productivity,
                isBillable: row.isBillable,
                Role: row.Role,
                Member: row.Member,
                Hours: row.Hours
              })
            })
            
            // Debug: Show productivity field analysis
            const productivityValues = [...new Set(cleanRows.map(row => row.Productivity))]
            console.log('parseTimesheets - All unique Productivity values found:', productivityValues)
            
            // Show how many rows have each productivity value
            const productivityCounts = {}
            cleanRows.forEach(row => {
              const productivity = row.Productivity || 'Unknown'
              productivityCounts[productivity] = (productivityCounts[productivity] || 0) + 1
            })
            console.log('parseTimesheets - Productivity value counts:', productivityCounts)
            
            // Debug: Show detailed productivity analysis
            console.log('parseTimesheets - DETAILED PRODUCTIVITY ANALYSIS:')
            const productivityAnalysis = {}
            cleanRows.forEach(row => {
              const productivity = row.Productivity || 'Unknown'
              const trimmed = productivity.trim()
              const lower = productivity.toLowerCase()
              const upper = productivity.toUpperCase()
              
              if (!productivityAnalysis[productivity]) {
                productivityAnalysis[productivity] = {
                  count: 0,
                  trimmed,
                  lower,
                  upper,
                  isProductive: productivity === "Productive",
                  isUnproductive: productivity === "Unproductive",
                  isProductiveLower: lower === "productive",
                  isUnproductiveLower: lower === "unproductive"
                }
              }
              productivityAnalysis[productivity].count++
            })
            
            Object.entries(productivityAnalysis).forEach(([value, analysis]) => {
              console.log(`Productivity "${value}":`, analysis)
            })
            
            // Show how many rows are marked as billable
            const billableCount = cleanRows.filter(row => row.isBillable).length
            const totalCount = cleanRows.length
            console.log(`parseTimesheets - Billable rows: ${billableCount}/${totalCount} (${Math.round(billableCount/totalCount*100)}%)`)
            
            // Debug: Show the exact isBillable calculation for first few rows
            console.log('parseTimesheets - DETAILED isBillable ANALYSIS:')
            cleanRows.slice(0, 10).forEach((row, index) => {
              const productivity = row.Productivity
              const trimmedProductivity = productivity ? productivity.trim() : ''
              const isProductive = trimmedProductivity === "Productive"
              const calculatedIsBillable = isProductive
              
              console.log(`Row ${index + 1}:`, {
                rawProductivity: `"${productivity}"`,
                trimmedProductivity: `"${trimmedProductivity}"`,
                isProductive,
                calculatedIsBillable,
                actualIsBillable: row.isBillable,
                match: calculatedIsBillable === row.isBillable ? '✅' : '❌',
                Role: row.Role,
                Member: row.Member
              })
            })
            
            // Debug: Show role breakdown
            const roleCounts = {}
            cleanRows.forEach(row => {
              const role = row.Role || 'Unknown'
              roleCounts[role] = (roleCounts[role] || 0) + 1
            })
            console.log('parseTimesheets - Role counts:', roleCounts)
          }
          
          resolve(cleanRows)
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}
