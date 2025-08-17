import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { ACCESSIBLE_COLORS } from '../lib/utils.jsx'

export default function ProjectTypeTrend({ filteredRows }) {
  const { monthlyData, projectTypeSummary, topProjectTypes, yAxisDomain } = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return { monthlyData: [], projectTypeSummary: [], topProjectTypes: [], yAxisDomain: [0, 100] }
    
    // Group by month and project type
    const monthlyData = {}
    const projectTypeTotals = {}
    
    for (const row of filteredRows) {
      // Try multiple date fields and fallback to current month if none work
      let month = row.calendarMonth
      if (!month && row.Date) {
        try {
          // If we have a Date field, try to extract month
          const date = new Date(row.Date)
          if (!isNaN(date.getTime())) {
            month = date.toISOString().substring(0, 7) // YYYY-MM format
          }
        } catch (e) {
          console.warn('Failed to parse date:', row.Date)
        }
      }
      
      // Fallback to current month if still no month
      if (!month) {
        month = new Date().toISOString().substring(0, 7)
      }
      
      const projectType = row['Project Type'] || 'Unknown'
      const hours = row.Hours || 0
      
      // Monthly data for line chart
      if (!monthlyData[month]) {
        monthlyData[month] = {}
      }
      monthlyData[month][projectType] = (monthlyData[month][projectType] || 0) + hours
      
      // Total hours per project type
      projectTypeTotals[projectType] = (projectTypeTotals[projectType] || 0) + hours
    }
    
    // Get top 8 project types by total hours (reduced from 15 for better line chart visibility)
    const topProjectTypes = Object.entries(projectTypeTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // Reduced from 15 to 8 for better line chart visibility
      .map(([type]) => type)
    
    // Convert monthly data to chart format (only top project types)
    const chartData = Object.entries(monthlyData)
      .map(([month, projectTypeData]) => {
        const monthEntry = { month }
        
        topProjectTypes.forEach(projectType => {
          monthEntry[projectType] = Math.round((projectTypeData[projectType] || 0) * 4) / 4
        })
        
        return monthEntry
      })
      .sort((a, b) => a.month.localeCompare(b.month))
    
    // Calculate Y-axis domain for better line visibility
    let maxMonthlyHours = 0
    chartData.forEach(month => {
      topProjectTypes.forEach(projectType => {
        maxMonthlyHours = Math.max(maxMonthlyHours, month[projectType] || 0)
      })
    })
    
    // Set Y-axis to show data with some padding (round up to nearest 50)
    const yAxisMax = Math.ceil(maxMonthlyHours / 50) * 50 + 50
    
    // Summary data for top project types
    const projectTypeSummary = topProjectTypes.map(projectType => ({
      projectType,
      totalHours: Math.round(projectTypeTotals[projectType] * 4) / 4,
      avgMonthlyHours: Math.round((projectTypeTotals[projectType] / chartData.length) * 4) / 4,
      trend: chartData.length > 1 ? 
        (chartData[chartData.length - 1][projectType] || 0) - (chartData[0][projectType] || 0) : 0
    }))
    
    // Debug logging
    console.log('ProjectTypeTrend Debug:', {
      totalRows: filteredRows.length,
      uniqueMonths: Object.keys(monthlyData),
      uniqueProjectTypes: Object.keys(projectTypeTotals),
      topProjectTypes,
      chartDataLength: chartData.length,
      sampleChartData: chartData.slice(0, 2),
      projectTypeSummary,
      sampleRow: filteredRows[0],
      hasCalendarMonth: filteredRows[0]?.calendarMonth,
      hasDate: filteredRows[0]?.Date,
      maxMonthlyHours,
      yAxisMax
    })
    
    // Additional debug for bar chart
    console.log('Bar Chart Debug:', {
      projectTypeSummaryLength: projectTypeSummary.length,
      firstBar: projectTypeSummary[0],
      allBars: projectTypeSummary.map(item => ({
        projectType: item.projectType,
        totalHours: item.totalHours,
        avgMonthlyHours: item.avgMonthlyHours,
        trend: item.trend
      }))
    })
    
    return { 
      monthlyData: chartData,
      projectTypeSummary,
      topProjectTypes,
      yAxisDomain: [0, yAxisMax]
    }
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          {payload
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((item, index) => (
              <p key={index} className="text-xs" style={{ color: item.color }}>
                {item.dataKey}: {item.value}h
              </p>
            ))}
        </div>
      )
    }
    return null
  }
  
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Project Type Trends & Summary</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No monthly trend data available. Check console for debug info.
        </div>
      </div>
    )
  }
  
  // Check if we have meaningful monthly data
  const hasMonthlyTrends = monthlyData.some(month => 
    topProjectTypes.some(projectType => month[projectType] > 0)
  )
  
  if (!hasMonthlyTrends) {
    return (
      <div className="oryx-card p-8 min-h-[800px]"> {/* Added min-height to ensure sufficient space */}
        <h3 className="oryx-heading text-lg mb-6">Project Type Trends & Summary</h3> {/* Increased margin bottom */}
        <p className="text-sm text-slate-400 mb-6"> {/* Increased margin bottom */}
          Top 8 project types by total hours. Monthly trends unavailable - showing summary only.
        </p>
        
        {/* Project Type Summary Bars Only */}
        <div className="mb-6 overflow-hidden"> {/* Added overflow-hidden to prevent chart from going outside card */}
          {/* Debug header */}
          <div className="mb-3 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
            <strong>Bar Chart Data:</strong> {projectTypeSummary.length} project types, 
            Range: {Math.min(...projectTypeSummary.map(b => b.totalHours))}h - {Math.max(...projectTypeSummary.map(b => b.totalHours))}h
          </div>
          
          {/* Enhanced HTML-based bar chart */}
          <div className="mb-6 p-4 bg-slate-800/30 rounded overflow-hidden"> {/* Added overflow-hidden */}
            <h4 className="text-sm font-medium text-slate-300 mb-6">Project Type Summary (Interactive Chart)</h4>
            <div className="space-y-4 overflow-hidden"> {/* Added overflow-hidden */}
              {projectTypeSummary.map((entry, index) => {
                const maxHours = Math.max(...projectTypeSummary.map(b => b.totalHours))
                const barWidth = (entry.totalHours / maxHours) * 100
                const percentage = ((entry.totalHours / projectTypeSummary.reduce((sum, item) => sum + item.totalHours, 0)) * 100).toFixed(1)
                
                return (
                  <div key={index} className="group overflow-hidden"> {/* Added overflow-hidden */}
                    <div className="flex items-center space-x-3 mb-2"> {/* Increased margin bottom */}
                      <div className="w-48 text-xs text-slate-300 truncate group-hover:text-blue-300 transition-colors">
                        {entry.projectType}
                      </div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                        {percentage}% of total
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-48 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                        {entry.avgMonthlyHours}h/month avg
                      </div>
                      <div className="flex-1 bg-slate-700 rounded h-10 relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg max-w-full"> {/* Added max-w-full */}
                        <div 
                          className="h-full rounded bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 group-hover:from-blue-400 group-hover:to-blue-500"
                          style={{ width: `${barWidth}%` }}
                        />
                        
                        {/* Hover overlay with detailed info */}
                        <div className="absolute inset-0 flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"> {/* Added pointer-events-none */}
                          <div className="bg-slate-800/90 rounded-lg px-3 py-2 shadow-xl border border-slate-600 z-10"> {/* Added z-10 */}
                            <div className="text-xs font-medium text-white whitespace-nowrap">
                              {entry.projectType}
                            </div>
                            <div className="text-xs text-slate-300">
                              Total: <span className="text-blue-300 font-medium">{entry.totalHours}h</span>
                            </div>
                            <div className="text-xs text-slate-300">
                              Monthly: <span className="text-green-300 font-medium">{entry.avgMonthlyHours}h</span>
                            </div>
                            <div className="text-xs text-slate-300">
                              Trend: <span className={`font-medium ${entry.trend > 0 ? 'text-green-300' : entry.trend < 0 ? 'text-red-300' : 'text-slate-300'}`}>
                                {entry.trend > 0 ? '+' : ''}{entry.trend}h
                              </span>
                            </div>
                            <div className="text-xs text-slate-300">
                              Share: <span className="text-purple-300 font-medium">{percentage}%</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Hours label */}
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-xs text-white font-medium drop-shadow-lg">
                            {entry.totalHours}h
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Trend indicator */}
                    <div className="flex items-center space-x-3 mt-2"> {/* Increased margin top */}
                      <div className="w-48"></div>
                      <div className="flex-1 flex items-center space-x-2">
                        {entry.trend > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-green-400">
                            <span>↗</span>
                            <span>Growing</span>
                          </div>
                        )}
                        {entry.trend < 0 && (
                          <div className="flex items-center space-x-1 text-xs text-red-400">
                            <span>↘</span>
                            <span>Declining</span>
                          </div>
                        )}
                        {entry.trend === 0 && (
                          <div className="flex items-center space-x-1 text-xs text-slate-400">
                            <span>→</span>
                            <span>Stable</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Debug info for bar chart */}
          <div className="mt-3 text-xs text-slate-400">
            Debug: {projectTypeSummary.length} bars, first: {projectTypeSummary[0]?.projectType} ({projectTypeSummary[0]?.totalHours}h)
          </div>
        </div>
        
        {/* Quick Insights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-lime-400 font-medium mb-1">📈 Most Active</div>
            <div className="text-slate-300">{projectTypeSummary[0]?.projectType || 'N/A'}</div>
            <div className="text-slate-400">{projectTypeSummary[0]?.totalHours || 0}h total</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-blue-400 font-medium mb-1">📊 Monthly Average</div>
            <div className="text-slate-300">
              {Math.round(projectTypeSummary.reduce((sum, item) => sum + item.avgMonthlyHours, 0) / projectTypeSummary.length * 4) / 4}h
            </div>
            <div className="text-slate-400">across all types</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-purple-400 font-medium mb-1">🔄 Trend Analysis</div>
            <div className="text-slate-300">
              {projectTypeSummary.filter(d => d.trend > 0).length} growing
            </div>
            <div className="text-slate-400">
              {projectTypeSummary.filter(d => d.trend < 0).length} declining
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-8 min-h-[800px]"> {/* Added min-height to ensure sufficient space */}
      <h3 className="oryx-heading text-lg mb-6">Project Type Trends & Summary</h3> {/* Increased margin bottom */}
      <p className="text-sm text-slate-400 mb-6"> {/* Increased margin bottom */}
        Top 8 project types by total hours. Line chart shows monthly trends, bars show total hours.
      </p>
      
      {/* Monthly Trends Line Chart */}
      <div className="h-96 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={monthlyData} 
            margin={{ left: 8, right: 16, top: 20, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              domain={yAxisDomain}
              label={{ 
                value: 'Monthly Hours', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {topProjectTypes.map((projectType, index) => (
              <Line 
                key={projectType}
                type="monotone" 
                dataKey={projectType} 
                stroke={ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length]}
                strokeWidth={3} // Increased from 2 to 3 for better visibility
                dot={{ r: 5, fill: ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length] }} // Increased from 4 to 5
                activeDot={{ r: 7, fill: ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length] }} // Increased from 6 to 7
                name={projectType}
                connectNulls={false} // Don't connect null values
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Project Type Summary Bars */}
      <div className="mb-6 overflow-hidden"> {/* Added overflow-hidden to prevent chart from going outside card */}
        {/* Debug header */}
        <div className="mb-3 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
          <strong>Bar Chart Data:</strong> {projectTypeSummary.length} project types, 
          Range: {Math.min(...projectTypeSummary.map(b => b.totalHours))}h - {Math.max(...projectTypeSummary.map(b => b.totalHours))}h
        </div>
        
        {/* Enhanced HTML-based bar chart */}
        <div className="mb-6 p-4 bg-slate-800/30 rounded overflow-hidden"> {/* Added overflow-hidden */}
          <h4 className="text-sm font-medium text-slate-300 mb-6">Project Type Summary (Interactive Chart)</h4>
          <div className="space-y-4 overflow-hidden"> {/* Added overflow-hidden */}
            {projectTypeSummary.map((entry, index) => {
              const maxHours = Math.max(...projectTypeSummary.map(b => b.totalHours))
              const barWidth = (entry.totalHours / maxHours) * 100
              const percentage = ((entry.totalHours / projectTypeSummary.reduce((sum, item) => sum + item.totalHours, 0)) * 100).toFixed(1)
              
              return (
                <div key={index} className="group overflow-hidden"> {/* Added overflow-hidden */}
                  <div className="flex items-center space-x-3 mb-2"> {/* Increased margin bottom */}
                    <div className="w-48 text-xs text-slate-300 truncate group-hover:text-blue-300 transition-colors">
                      {entry.projectType}
                    </div>
                    <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                      {percentage}% of total
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-48 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                      {entry.avgMonthlyHours}h/month avg
                    </div>
                    <div className="flex-1 bg-slate-700 rounded h-10 relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg max-w-full"> {/* Added max-w-full */}
                      <div 
                        className="h-full rounded bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 group-hover:from-blue-400 group-hover:to-blue-500"
                        style={{ width: `${barWidth}%` }}
                      />
                      
                      {/* Hover overlay with detailed info */}
                      <div className="absolute inset-0 flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"> {/* Added pointer-events-none */}
                        <div className="bg-slate-800/90 rounded-lg px-3 py-2 shadow-xl border border-slate-600 z-10"> {/* Added z-10 */}
                          <div className="text-xs font-medium text-white whitespace-nowrap">
                            {entry.projectType}
                          </div>
                          <div className="text-xs text-slate-300">
                            Total: <span className="text-blue-300 font-medium">{entry.totalHours}h</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Monthly: <span className="text-green-300 font-medium">{entry.avgMonthlyHours}h</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Trend: <span className={`font-medium ${entry.trend > 0 ? 'text-green-300' : entry.trend < 0 ? 'text-red-300' : 'text-slate-300'}`}>
                              {entry.trend > 0 ? '+' : ''}{entry.trend}h
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Share: <span className="text-purple-300 font-medium">{percentage}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hours label */}
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <span className="text-xs text-white font-medium drop-shadow-lg">
                          {entry.totalHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trend indicator */}
                  <div className="flex items-center space-x-3 mt-2"> {/* Increased margin top */}
                    <div className="w-48"></div>
                    <div className="flex-1 flex items-center space-x-2">
                      {entry.trend > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <span>↗</span>
                          <span>Growing</span>
                        </div>
                      )}
                      {entry.trend < 0 && (
                        <div className="flex items-center space-x-1 text-xs text-red-400">
                          <span>↘</span>
                          <span>Declining</span>
                        </div>
                      )}
                      {entry.trend === 0 && (
                        <div className="flex items-center space-x-1 text-xs text-slate-400">
                          <span>→</span>
                          <span>Stable</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Debug info for bar chart */}
        <div className="mt-3 text-xs text-slate-400">
          Debug: {projectTypeSummary.length} bars, first: {projectTypeSummary[0]?.projectType} ({projectTypeSummary[0]?.totalHours}h)
        </div>
      </div>
      
      {/* Quick Insights */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-lime-400 font-medium mb-1">📈 Most Active</div>
          <div className="text-slate-300">{projectTypeSummary[0]?.projectType || 'N/A'}</div>
          <div className="text-slate-400">{projectTypeSummary[0]?.totalHours || 0}h total</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-blue-400 font-medium mb-1">📊 Monthly Average</div>
          <div className="text-slate-300">
            {Math.round(projectTypeSummary.reduce((sum, item) => sum + item.avgMonthlyHours, 0) / projectTypeSummary.length * 4) / 4}h
          </div>
          <div className="text-slate-400">across all types</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-purple-400 font-medium mb-1">🔄 Trend Analysis</div>
          <div className="text-slate-300">
            {projectTypeSummary.filter(d => d.trend > 0).length} growing
          </div>
          <div className="text-slate-400">
            {projectTypeSummary.filter(d => d.trend < 0).length} declining
          </div>
        </div>
      </div>
    </div>
  )
}
