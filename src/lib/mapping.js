// CSV column mapping and business rule definitions

// Canonical CSV headers (exact, case-sensitive)
export const CANONICAL_HEADERS = [
  "Member",
  "Date", 
  "Ticket",
  "Work Role",
  "Work Type",
  "Company",
  "Hours",
  "Project/Ticket",
  "Project Type",
  "Role",
  "Productivity"
]

// Legacy column name mappings to canonical headers
export const LEGACY_COLUMN_MAPPING = {
  "Team": "Role",
  "Project/Ticket/Worktype": "Project/Ticket",
  "Date  (dd/MM/yyyy)": "Date"
  // Status is dropped - all rows are approved
  // Productivity column is already named correctly
}

// Work Type to Board category mapping
export const WORK_TYPE_TO_BOARD = {
  "Project Installation & Engineering": "Tech Delivery",
  "Project Management": "PM Delivery", 
  "Solutions & Scoping": "Pre-Sales",
  "Admin": "Internal Admin",
  "Internal Support, Projects & Documents": "Internal Support",
  "Internal Support & Projects": "Internal Support"
  // Default for unmapped types: "Other"
}

// Internal company classification
export const INTERNAL_COMPANIES = new Set([
  "OryxAlign",
  "OryxAlign-Internal c/code"
])

/**
 * Determines if a row is internal work
 * @param {Object} row - Clean row object
 * @returns {boolean}
 */
export function isInternalWork(row) {
  return INTERNAL_COMPANIES.has(row.Company) || 
         (row["Project Type"] && row["Project Type"].startsWith("Internal"))
}

/**
 * Maps Work Type to board category
 * @param {string} workType 
 * @returns {string}
 */
export function mapWorkTypeToBoard(workType) {
  return WORK_TYPE_TO_BOARD[workType] || "Other"
}
