export const uiTheme = {
  // Base Colors
  bg: '#111C3A',
  surface: '#EFECD2', 
  text: '#EFECD2',
  muted: '#586961',
  primary: '#B5C933',
  secondary: '#FF4F00',
  border: '#586961',
  
  // Chart specific theming
  chart: {
    // Chart series colors - ensuring good contrast and variety
    series: [
      '#B5C933', // Lime Zest (primary)
      '#FF4F00', // Vibrant Orange (secondary)  
      '#EFECD2', // Stone (light)
      '#C7D945', // Lighter lime variant
      '#FF8A40', // Lighter orange variant
      '#D4D1B8', // Muted stone variant
      '#A3B82C', // Darker lime variant
      '#FF6B1A', // Medium orange variant
    ],
    grid: '#586961',        // Smokey Sage for grid lines
    axis: '#EFECD2',        // Stone for axis labels
    tooltipBg: '#EFECD2',   // Stone for tooltip background
    tooltipText: '#111C3A', // Twilight Blue for tooltip text (dark text on light background)
    tooltipBorder: '#586961', // Smokey Sage for tooltip border
  },
  
  // Additional semantic colors
  success: '#B5C933',
  warning: '#FF4F00', 
  error: '#FF4F00',
  info: '#EFECD2',
} as const

// Gradient definitions for charts and UI elements
export const gradients = {
  primary: {
    id: 'primaryGradient',
    colors: [
      { offset: '0%', color: '#B5C933', opacity: 0.9 },
      { offset: '100%', color: '#B5C933', opacity: 0.1 },
    ]
  },
  secondary: {
    id: 'secondaryGradient', 
    colors: [
      { offset: '0%', color: '#FF4F00', opacity: 0.9 },
      { offset: '100%', color: '#FF4F00', opacity: 0.1 },
    ]
  }
} as const

// Helper function to get chart color by index
export function getChartColor(index: number): string {
  return uiTheme.chart.series[index % uiTheme.chart.series.length]
}

// Helper function to get gradient configuration for Recharts
export function getGradientConfig(gradientType: 'primary' | 'secondary') {
  const gradient = gradients[gradientType]
  return {
    id: gradient.id,
    x1: "0",
    y1: "0", 
    x2: "0",
    y2: "1",
    stops: gradient.colors
  }
}
