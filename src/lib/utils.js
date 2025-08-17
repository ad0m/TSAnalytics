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
 * Colour-blind friendly and high contrast colour palette
 * Based on IBM Design Language colours optimised for dark backgrounds
 */
export const ACCESSIBLE_COLORS = [
  '#78a9ff', // Light blue - high contrast on dark
  '#42be65', // Green - accessible 
  '#ff7eb6', // Pink - distinct from blue/green
  '#82cfff', // Cyan - good contrast
  '#ffb3ba', // Light coral - warm contrast
  '#ba4cff', // Purple - distinct hue
  '#ff8389', // Red-pink - warning tone
  '#08bdba', // Teal - cool contrast
  '#fdd13a', // Yellow - high visibility (use sparingly)
  '#6929c4', // Deep purple - good contrast
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
  primary: '#42be65',     // Green - primary actions
  secondary: '#78a9ff',   // Blue - secondary data
  accent: '#ff7eb6',      // Pink - highlights
  warning: '#fdd13a',     // Yellow - warnings
  danger: '#ff8389',      // Red - errors/critical
  info: '#82cfff',        // Cyan - information
  neutral: '#a2a9b0',     // Grey - neutral data
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
