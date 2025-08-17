// Filter persistence using localStorage

const STORAGE_KEY = 'oryx-time-analytics-filters'
const STORAGE_VERSION = '1.0'

/**
 * Saves filter state to localStorage
 * @param {Object} filters 
 */
export function saveFilters(filters) {
  try {
    const filterData = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      filters: filters
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterData))
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error)
  }
}

/**
 * Loads filter state from localStorage
 * @param {Object} defaultFilters 
 * @returns {Object}
 */
export function loadFilters(defaultFilters) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultFilters
    
    const filterData = JSON.parse(stored)
    
    // Check version compatibility
    if (filterData.version !== STORAGE_VERSION) {
      console.info('Filter storage version mismatch, using defaults')
      return defaultFilters
    }
    
    // Check if data is too old (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    if (filterData.timestamp < thirtyDaysAgo) {
      console.info('Stored filters too old, using defaults')
      return defaultFilters
    }
    
    // Merge stored filters with defaults to handle new filter keys
    const mergedFilters = {
      ...defaultFilters,
      ...filterData.filters
    }
    
    console.info('Loaded filters from localStorage')
    return mergedFilters
    
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error)
    return defaultFilters
  }
}

/**
 * Clears stored filters
 */
export function clearStoredFilters() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.info('Cleared stored filters')
  } catch (error) {
    console.warn('Failed to clear stored filters:', error)
  }
}

/**
 * Resets filters to defaults and clears storage
 * @param {Object} defaultFilters 
 * @param {Function} setFilters 
 */
export function resetFilters(defaultFilters, setFilters) {
  clearStoredFilters()
  setFilters({ ...defaultFilters })
}
