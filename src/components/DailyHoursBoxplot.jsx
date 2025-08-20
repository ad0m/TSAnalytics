import { useMemo } from 'react'
import { ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'

// Function to calculate five-number summary
function calculateBoxplotStats(values) {
  if (values.length === 0) return null
  
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  
  const min = sorted[0]
  const max = sorted[n - 1]
  const median = n % 2 === 0 
    ? (sorted[Math.floor(n / 2) - 1] + sorted[Math.floor(n / 2)]) / 2
    : sorted[Math.floor(n / 2)]
    
  const q1Index = Math.floor(n / 4)
  const q3Index = Math.floor(3 * n / 4)
  const q1 = n % 4 === 0 
    ? (sorted[q1Index - 1] + sorted[q1Index]) / 2
    : sorted[q1Index]
  const q3 = n % 4 === 0 
    ? (sorted[q3Index - 1] + sorted[q3Index]) / 2
    : sorted[q3Index]
  
  return {
    min: Math.round(min * 4) / 4,
    q1: Math.round(q1 * 4) / 4,
    median: Math.round(median * 4) / 4,
    q3: Math.round(q3 * 4) / 4,
    max: Math.round(max * 4) / 4,
    count: n,
    values: sorted
  }
}

export default function DailyHoursBoxplot({ filteredRows }) {
  const { boxplotData, maxValue } = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return { boxplotData: [], maxValue: 0 }
    
    // Group by member and date, sum daily hours
    const memberDailyHours = {}
    
    for (const row of filteredRows) {
      const member = row.Member || 'Unknown'
      const date = dayjs(row.dateObj).format('YYYY-MM-DD')
      const key = `${member}-${date}`
      
      if (!memberDailyHours[member]) {
        memberDailyHours[member] = {}
      }
      
      memberDailyHours[member][date] = (memberDailyHours[member][date] || 0) + row.Hours
    }
    
    // Calculate boxplot stats for each member
    const boxplotResults = []
    let globalMax = 0
    
    for (const [member, dailyHours] of Object.entries(memberDailyHours)) {
      const dailyValues = Object.values(dailyHours)
      const stats = calculateBoxplotStats(dailyValues)
      
      if (stats) {
        globalMax = Math.max(globalMax, stats.max)
        boxplotResults.push({
          member,
          ...stats
        })
      }
    }
    
    // Sort by median hours descending and take top 15
    boxplotResults.sort((a, b) => b.median - a.median)
    
    return {
      boxplotData: boxplotResults.slice(0, 15), // Show top 15 people instead of 10
      maxValue: globalMax
    }
  }, [filteredRows])
  
  const BoxplotTooltip = ({ member, stats }) => (
    <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl text-xs max-w-xs">
      <p className="text-sm font-medium text-white mb-2">{member}</p>
      <p className="text-slate-300 mb-2">📅 Days tracked: {stats.count}</p>
      <div className="space-y-1 border-t border-slate-700 pt-2">
        <p className="text-slate-300">🔻 <strong>Min day:</strong> {stats.min}h (lowest hours)</p>
        <p className="text-slate-300">📊 <strong>Q1 (25%):</strong> {stats.q1}h (bottom quarter)</p>
        <p className="text-lime-400 font-medium">📈 <strong>Median:</strong> {stats.median}h (typical day)</p>
        <p className="text-slate-300">📊 <strong>Q3 (75%):</strong> {stats.q3}h (top quarter)</p>
        <p className="text-slate-300">🔺 <strong>Max day:</strong> {stats.max}h (highest hours)</p>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400">
        <p>💡 Box range: {stats.q1}h - {stats.q3}h ({((stats.q3 - stats.q1) * 4) / 4}h spread)</p>
      </div>
    </div>
  )
  
  if (!boxplotData || boxplotData.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Daily Hours Distribution</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No daily hours data available
        </div>
      </div>
    )
  }
  
  const chartWidth = 600
  const chartHeight = 400
  const margin = { top: 40, right: 40, bottom: 80, left: 120 }
  const plotWidth = chartWidth - margin.left - margin.right
  const plotHeight = chartHeight - margin.top - margin.bottom
  
  const boxWidth = 40
  const boxSpacing = 60
  const yScale = (value) => margin.top + (1 - (value / (maxValue * 1.1))) * plotHeight
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Daily Hours Distribution (Top 15 by Median)</h3>
      <div className="h-[420px]">
        <div style={{ width: Math.max(chartWidth, boxplotData.length * boxSpacing + margin.left + margin.right), height: chartHeight }}>
          <svg width="100%" height="100%" className="overflow-visible">
            {/* Y-axis */}
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + plotHeight}
              stroke="#475569"
              strokeWidth={1}
            />
            
            {/* Y-axis ticks and labels */}
            {[0, 2, 4, 6, 8, 10, 12, 14].map(hour => {
              if (hour <= maxValue * 1.1) {
                const y = yScale(hour)
                return (
                  <g key={hour}>
                    <line
                      x1={margin.left - 5}
                      y1={y}
                      x2={margin.left}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth={1}
                    />
                    <text
                      x={margin.left - 10}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-xs fill-slate-300"
                    >
                      {hour}h
                    </text>
                    {/* Grid lines */}
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={margin.left + plotWidth}
                      y2={y}
                      stroke="#475569"
                      strokeWidth={0.5}
                      strokeDasharray="2 2"
                    />
                  </g>
                )
              }
              return null
            })}
            
            {/* Boxplots */}
            {boxplotData.map((data, index) => {
              const x = margin.left + (index + 1) * boxSpacing
              const minY = yScale(data.min)
              const q1Y = yScale(data.q1)
              const medianY = yScale(data.median)
              const q3Y = yScale(data.q3)
              const maxY = yScale(data.max)
              
              return (
                <g key={data.member}>
                  {/* Lower whisker */}
                  <line x1={x} y1={minY} x2={x} y2={q1Y} stroke="#22d3ee" strokeWidth={2} />
                  <line x1={x - 10} y1={minY} x2={x + 10} y2={minY} stroke="#22d3ee" strokeWidth={2} />
                  
                  {/* Upper whisker */}
                  <line x1={x} y1={q3Y} x2={x} y2={maxY} stroke="#22d3ee" strokeWidth={2} />
                  <line x1={x - 10} y1={maxY} x2={x + 10} y2={maxY} stroke="#22d3ee" strokeWidth={2} />
                  
                  {/* Box */}
                  <rect
                    x={x - boxWidth / 2}
                    y={q3Y}
                    width={boxWidth}
                    height={q1Y - q3Y}
                    fill="#22d3ee"
                    fillOpacity={0.3}
                    stroke="#22d3ee"
                    strokeWidth={2}
                  />
                  
                  {/* Median line */}
                  <line
                    x1={x - boxWidth / 2}
                    y1={medianY}
                    x2={x + boxWidth / 2}
                    y2={medianY}
                    stroke="#84cc16"
                    strokeWidth={3}
                  />
                  
                  {/* X-axis label */}
                  <text
                    x={x}
                    y={margin.top + plotHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-slate-300"
                    transform={`rotate(-35, ${x}, ${margin.top + plotHeight + 20})`}
                  >
                    {data.member}
                  </text>
                  
                  {/* Invisible hover area */}
                  <rect
                    x={x - boxWidth / 2}
                    y={Math.min(minY, maxY)}
                    width={boxWidth}
                    height={Math.abs(maxY - minY)}
                    fill="transparent"
                    className="cursor-pointer"
                  >
                    <title>
                      {`${data.member}\nDays: ${data.count}\nMin: ${data.min}h\nQ1: ${data.q1}h\nMedian: ${data.median}h\nQ3: ${data.q3}h\nMax: ${data.max}h`}
                    </title>
                  </rect>
                </g>
              )
            })}
            
            {/* Chart title */}
            <text
              x={margin.left + plotWidth / 2}
              y={20}
              textAnchor="middle"
              className="text-sm fill-slate-300 font-medium"
            >
              Daily Hours Distribution (Top 10 by Median)
            </text>
            
            {/* Y-axis label */}
            <text
              x={20}
              y={margin.top + plotHeight / 2}
              textAnchor="middle"
              className="text-sm fill-slate-300"
              transform={`rotate(-90, 20, ${margin.top + plotHeight / 2})`}
            >
              Hours per Day
            </text>
          </svg>
        </div>
      </div>
      {/* Improved explanation section */}
      <div className="mt-4 space-y-3">
        <div className="text-center text-xs text-slate-400">
          <p>📊 <strong className="text-slate-300">How to Read This Chart:</strong></p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1 text-slate-300">
            <p><strong className="text-sky-400">📘 Legend:</strong></p>
            <p><span className="inline-block w-3 h-3 bg-slate-600 border border-slate-500 mr-2"></span><strong>Box:</strong> Middle 50% of daily hours (Q1-Q3)</p>
            <p><span className="inline-block w-3 h-1 bg-lime-400 mr-2"></span><strong>Green Line:</strong> Median (typical daily hours)</p>
            <p><span className="inline-block w-1 h-3 bg-slate-400 mr-2"></span><strong>Whiskers:</strong> Min/max daily hours worked</p>
          </div>
          <div className="space-y-1 text-slate-300">
            <p><strong className="font-semibold" style={{ color: '#B5C933' }}>💡 Insights:</strong></p>
            <p>• <strong>Narrow box:</strong> Consistent daily hours</p>
            <p>• <strong>Wide box:</strong> Variable workload</p>
            <p>• <strong>Long whiskers:</strong> Extreme work days</p>
          </div>
          <div className="space-y-1 text-slate-300">
            <p><strong className="text-cyan-400">📈 Sorting:</strong></p>
            <p>• Ranked by median hours (highest first)</p>
            <p>• Shows team members with highest typical daily hours</p>
            <p>• <strong>Hover boxes</strong> for detailed stats</p>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 border-t border-slate-700 pt-2">
          <p>💭 <strong>Business Value:</strong> Identify workload patterns, spot potential burnout risks, and balance team capacity</p>
        </div>
      </div>
    </div>
  )
}
