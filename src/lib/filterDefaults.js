// Default filter values for the time analytics dashboard

export const FILTER_DEFAULTS = {
  period: "Month", // "Month" | "Quarter" | "FY" | "Custom"
  month: null, // to be set to latest complete month in data (calendarMonth)
  quarter: null,
  fy: null,
  fromDate: null, // for Custom period
  toDate: null, // for Custom period
  roles: ["Cloud", "Network", "PM"], // HoPS is always excluded in data
  members: "ALL",
  companies: "ALL",
  projectTypes: "ALL",
  workTypesBoard: [
    "Tech Delivery",
    "PM Delivery",
    "Internal Admin",
    "Leave/Bank Holiday",
    "Sick Leave",
    "Training",
    "Other"
  ],
  productivity: "All" // All | Productive | Unproductive
}

export const PERIOD_OPTIONS = ["Month", "Quarter", "FY", "Custom"]
export const PRODUCTIVITY_OPTIONS = ["All", "Productive", "Unproductive"]
