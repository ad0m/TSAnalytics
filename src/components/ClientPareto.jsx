import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { uiTheme } from '../theme'

export default function ClientPareto({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by company and sum billable hours
    const companyData = {}
    
    for (const row of filteredRows) {
      if (!row.isBillable) continue // Only billable hours for Pareto
      
      const company = row.Company || 'Unknown'
      if (!companyData[company]) {
        companyData[company] = 0
      }
      companyData[company] += row.Hours
    }
    
    // Convert to array and sort by hours descending
    const sortedData = Object.entries(companyData)
      .map(([company, hours]) => ({
        company,
        hours: Math.round(hours * 4) / 4 // Round to 0.25
      }))
      .filter(item => !['OryxAlign', 'OryxAlign-Internal c/code'].includes(item.company)) // Exclude internal companies
      .sort((a, b) => b.hours - a.hours)
    
    // Calculate cumulative percentage
    const totalHours = sortedData.reduce((sum, item) => sum + item.hours, 0)
    let cumulativeHours = 0
    
    const result = sortedData.map((item, index) => {
      cumulativeHours += item.hours
      const cumulativePercent = totalHours > 0 ? (cumulativeHours / totalHours) * 100 : 0
      
      return {
        ...item,
        cumulativePercent: Math.round(cumulativePercent * 10) / 10, // Round to 1 decimal
        rank: index + 1,
        displayName: item.company.length > 15 ? `${item.company.substring(0, 12)}...` : item.company
      }
    })
    
    // Take top 20 for readability
    return result.slice(0, 20)
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: uiTheme.chart.tooltipBg, 
            borderColor: uiTheme.chart.tooltipBorder,
            color: uiTheme.chart.tooltipText 
          }}
        >
          <p className="text-sm font-medium" style={{ color: uiTheme.chart.tooltipText }}>
            {data.company}
          </p>
          <p className="text-xs" style={{ color: uiTheme.muted }}>
            Billable Hours: {data.hours}h
          </p>
          <p className="text-xs" style={{ color: uiTheme.muted }}>
            Cumulative: {data.cumulativePercent}%
          </p>
          <p className="text-xs" style={{ color: uiTheme.muted }}>
            Rank: #{data.rank}
          </p>
        </div>
      )
    }
    return null
  }
  
  // Find the 80% elbow point
  const eightyPercentIndex = data.findIndex(item => item.cumulativePercent >= 80)
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Client Pareto Analysis</h3>
        <div className="flex h-48 items-center justify-center text-sm" style={{ color: uiTheme.muted }}>
          No billable hours data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Client Pareto Analysis (Billable Hours)</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data} 
            margin={{ left: 8, right: 40, top: 8, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={uiTheme.chart.grid} />
            <XAxis 
              dataKey="displayName"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fill: uiTheme.chart.axis, fontSize: 10 }}
            />
            <YAxis 
              yAxisId="hours"
              orientation="left"
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ value: 'Billable Hours', angle: -90, position: 'insideLeft', style: { fill: uiTheme.chart.axis } }}
            />
            <YAxis 
              yAxisId="percent"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', style: { fill: uiTheme.chart.axis } }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {/* 80% reference line */}
            <ReferenceLine 
              yAxisId="percent"
              y={80} 
              stroke={uiTheme.muted} 
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            
            {/* Hours bars */}
            <Bar 
              yAxisId="hours"
              dataKey="hours" 
              fill={uiTheme.primary}
              opacity={0.8}
            />
            
            {/* Cumulative percentage line */}
            <Line 
              yAxisId="percent"
              type="monotone" 
              dataKey="cumulativePercent" 
              stroke={uiTheme.secondary} 
              strokeWidth={3}
              dot={{ r: 3, fill: uiTheme.secondary }}
              activeDot={{ r: 5, fill: uiTheme.secondary }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-6 text-xs" style={{ color: uiTheme.muted }}>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: uiTheme.primary }}></div>
            <span>Billable Hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 rounded" style={{ backgroundColor: uiTheme.secondary }}></div>
            <span>Cumulative %</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="h-1 w-6 rounded" 
              style={{ 
                background: `repeating-linear-gradient(to right, ${uiTheme.muted} 0, ${uiTheme.muted} 3px, transparent 3px, transparent 6px)` 
              }}
            ></div>
            <span>80% Line</span>
          </div>
        </div>
        {eightyPercentIndex >= 0 && (
          <div className="text-center text-xs" style={{ color: uiTheme.muted }}>
            80% of billable hours come from the first {eightyPercentIndex + 1} companies
          </div>
        )}
      </div>
    </div>
  )
}
