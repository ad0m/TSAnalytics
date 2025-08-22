import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts'
import { uiTheme } from '../theme'

export default function Top5ClientsTrend({ filteredRows, onCompanyFilter }) {
  // Custom color palette for tooltip values - matching Project Type Trends
  const tooltipColors = [
    '#B5C933', // Lime Zest (brand secondary, high contrast yellow-green)
    '#FF4F00', // Vibrant Orange (brand accent, very strong)
    '#3CC9E3', // Bright Aqua (crisp cyan, pops well)
    '#FFD166', // Soft Yellow (warm yellow, readable, friendly)
    '#FF6F61', // Coral (bright red-pink, strong)
    '#C62828', // Deep Red (serious warning red, high contrast)
    '#8E44AD', // Plum (rich purple, readable on sage)
    '#FF3462', // Vivid Pink (neon raspberry pink, vibrant substitute for orange)
    '#4A3F94', // Indigo (deep, saturated indigo blue)
    '#4DD0E1', // Sky Blue (lighter teal-cyan, softer contrast)
    '#1E8FA6', // Turquoise (medium cyan-teal, still visible on sage)
    '#FF9E2C', // Warm Amber (between orange and yellow, vibrant)
    '#7FE7A1', // Mint Green (fresh mint tone, light and legible)
    '#3C4CFF', // Electric Blue (saturated bright blue)
    '#A58BFF'  // Light Lavender (gentle purple highlight)
  ]

  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Get top 9 clients by total billable hours
    const clientTotals = {}
    for (const row of filteredRows) {
      if (!row.isBillable) continue
      const client = row.Company || 'Unknown'
      if (row.isInternal) continue // Exclude internal work
      clientTotals[client] = (clientTotals[client] || 0) + row.Hours
    }
    
    const top9Clients = Object.entries(clientTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([client]) => client)
    
    if (top9Clients.length === 0) return []
    
    // Group billable hours by client and month
    const clientMonthlyData = {}
    for (const client of top9Clients) {
      clientMonthlyData[client] = {}
    }
    
    for (const row of filteredRows) {
      if (!row.isBillable) continue
      const client = row.Company || 'Unknown'
      if (!top9Clients.includes(client)) continue
      
      const month = row.calendarMonth
      if (!clientMonthlyData[client][month]) {
        clientMonthlyData[client][month] = 0
      }
      clientMonthlyData[client][month] += row.Hours
    }
    
    // Get all months and create time series for each client
    const allMonths = [...new Set(filteredRows.map(r => r.calendarMonth))].sort()
    
    return top9Clients.map(client => {
      const monthlyData = allMonths.map(month => ({
        month,
        hours: Math.round((clientMonthlyData[client][month] || 0) * 4) / 4 // Round to 0.25
      }))
      
      return {
        client,
        data: monthlyData,
        totalHours: clientTotals[client]
      }
    })
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const textShadow = '0 1px 1px rgba(0,0,0,0.5)'
      
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: '#586961', 
            borderColor: uiTheme.muted,
            color: uiTheme.chart.tooltipText
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#EFECD2' }}>Hours:</span>
              <span className="font-bold" style={{ color: tooltipColors[0] }}>{payload[0].value}h</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }
  
  const handleClientClick = (client) => {
    if (onCompanyFilter) {
      onCompanyFilter(client)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No client trend data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-2">Top 9 Client Trends</h3>
      <div className="mb-3 text-xs text-slate-400 text-center">
        This section shows the monthly billable hours trend for your 9 most active clients. Each mini-chart displays how that client’s billable hours have changed over time. Click a client to filter the dashboard by that company.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((clientData, index) => (
          <div 
            key={clientData.client} 
            className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800/50 p-3 hover:bg-slate-700/50 transition-colors"
            onClick={() => handleClientClick(clientData.client)}
          >
            <h4 className="text-sm font-medium text-white mb-1 truncate" title={clientData.client}>
              {clientData.client}
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Total: {Math.round(clientData.totalHours * 4) / 4}h
            </p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientData.data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="month" hide />
                  <YAxis hide />
                  <ReTooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke={tooltipColors[0]} 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: tooltipColors[0] }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Click on any client to filter by that company
      </div>
    </div>
  )
}
