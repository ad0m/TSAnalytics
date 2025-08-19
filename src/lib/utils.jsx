// Utility functions for consistent formatting and performance
import React from 'react'

/**
 * Rounds number to nearest 0.25
 * @param {number} value 
 * @returns {number}
 */
export function roundToQuarter(value) {
  return Math.round(value * 4) / 4
}

/**
 * Formats hours for display (nearest 0.25)
 * @param {number} hours 
 * @returns {string}
 */
export function formatHours(hours) {
  return `${roundToQuarter(hours)}h`
}

/**
 * Formats hours for tooltips (one decimal)
 * @param {number} hours 
 * @returns {string}
 */
export function formatTooltipHours(hours) {
  return `${hours.toFixed(1)} h`
}

/**
 * Formats percentage for display
 * @param {number} percentage 
 * @returns {string}
 */
export function formatPercentage(percentage) {
  return `${percentage.toFixed(1)}%`
}

/**
 * Color-blind friendly and high contrast colour palette
 * Based on IBM Design Language colours optimised for dark backgrounds
 */
export const ACCESSIBLE_COLORS = [
  '#B5C933', // Lime Zest (primary)
  '#FF4F00', // Vibrant Orange (secondary)  
  '#012A2D', // Midnight Green (dark)
  '#8B9DC3', // Soft Blue (medium contrast)
  '#FF8A40', // Lighter orange variant
  '#586961', // Smokey Sage (muted)
  '#A3B82C', // Darker lime variant
  '#FF6B1A', // Medium orange variant
  '#6B8E60', // Forest Green (medium)
  '#FF3B00', // Darker orange variant
]

/**
 * Gets color from accessible palette by index
 * @param {number} index 
 * @returns {string}
 */
export function getAccessibleColor(index) {
  return ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length]
}

/**
 * Contrast-optimised colours for specific chart types
 */
export const CHART_COLORS = {
  primary: '#B5C933',     // Lime Zest - primary actions
  secondary: '#FF4F00',   // Vibrant Orange - secondary data
  accent: '#EFECD2',      // Stone - highlights
  warning: '#FF4F00',     // Orange - warnings
  danger: '#FF4F00',      // Orange - errors/critical
  info: '#B5C933',        // Lime - information
  neutral: '#586961',     // Smokey Sage - neutral data
}

/**
 * Returns a memoized empty state component
 */
export function EmptyState({ title = "No data available", onReset, showReset = true }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-48 text-center p-8">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
          <span className="text-2xl text-slate-400">📊</span>
        </div>
        <h3 className="text-slate-300 font-medium mb-2">{title}</h3>
        <p className="text-slate-400 text-sm">
          Try adjusting your filters to see more data
        </p>
      </div>
      {showReset && onReset && (
        <button
          onClick={onReset}
          className="oryx-primary px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Reset Filters
        </button>
      )}
    </div>
  )
}

/**
 * Memoized calculation helper to avoid recreating objects
 * @param {Function} calculator - Function that returns calculation result
 * @param {Array} deps - Dependencies for memoization
 * @returns {any} Memoized result
 */
export function useMemoizedCalculation(calculator, deps) {
  return React.useMemo(calculator, deps)
}

/**
 * Debounced state update helper
 * @param {any} value 
 * @param {number} delay 
 * @returns {any}
 */
export function useDebounced(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value)
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

/**
 * Performance-optimised data grouping
 * @param {Array} data 
 * @param {Function} keyFn 
 * @param {Function} valueFn 
 * @returns {Map}
 */
export function fastGroupBy(data, keyFn, valueFn = (item) => item) {
  const groups = new Map()
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const key = keyFn(item)
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(valueFn(item))
  }
  
  return groups
}

/**
 * Fast aggregation helper
 * @param {Array} data 
 * @param {Function} keyFn 
 * @param {Function} valueFn 
 * @returns {Map}
 */
export function fastAggregate(data, keyFn, valueFn) {
  const aggregates = new Map()
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const key = keyFn(item)
    const value = valueFn(item)
    
    aggregates.set(key, (aggregates.get(key) || 0) + value)
  }
  
  return aggregates
}
