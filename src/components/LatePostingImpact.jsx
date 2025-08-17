import { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'
import { EmptyState } from '../lib/utils.jsx'

export default function LatePostingImpact({ filteredRows, onReset }) {
  const ref = useRef(null)
  
  const data = useMemo(() => {
    try {
      console.log('LatePostingImpact - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows || filteredRows.length === 0) {
        console.log('LatePostingImpact - No filtered rows')
        return []
      }
      
      // Simple approach: Group by calendar month only
      const monthlyData = {}
      
      for (const row of filteredRows) {
        try {
          const month = row.calendarMonth
          const hours = parseFloat(row.Hours) || 0
          
          // Skip invalid rows
          if (!month || hours <= 0) {
            continue
          }
          
          if (!monthlyData[month]) {
            monthlyData[month] = {
              totalHours: 0,
              entryCount: 0
            }
          }
          
          monthlyData[month].totalHours += hours
          monthlyData[month].entryCount += 1
          
        } catch (rowError) {
          console.log('LatePostingImpact - Error processing row:', rowError)
          continue
        }
      }
      
      // Convert to chart data (simplified for now)
      const chartData = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          totalHours: Math.round(data.totalHours * 4) / 4,
          entryCount: data.entryCount,
          avgHoursPerEntry: Math.round((data.totalHours / data.entryCount) * 4) / 4
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
      
      console.log('LatePostingImpact - Chart data:', chartData)
      return chartData
      
    } catch (error) {
      console.error('LatePostingImpact - Error:', error)
      return []
    }
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300">
            Total Hours: {data?.totalHours}h
          </p>
          <p className="text-xs text-slate-300">
            Entries: {data?.entryCount}
          </p>
          <p className="text-xs text-slate-300">
            Avg per Entry: {data?.avgHoursPerEntry}h
          </p>
        </div>
      )
    }
    return null
  }
  
  const exportPng = () => {
    const node = ref.current
    if (!node) return
    toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
      .then((blob) => {
        if (!blob) throw new Error('No blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'late-posting-impact.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
  }
  
  if (!data || data.length === 0) {
    return (
      <div ref={ref} className="oryx-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="oryx-heading text-lg flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">⏰</span>
            </span>
            Late Posting Impact
          </h3>
          <button 
            onClick={exportPng}
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
        <EmptyState 
          message="No posting data available"
          onReset={onReset}
        />
      </div>
    )
  }
  
  return (
    <div ref={ref} className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">⏰</span>
          </span>
          Posting Analysis (Simplified)
        </h3>
        <button 
          onClick={exportPng}
          className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> Export PNG
        </button>
      </div>
      <div className="h-80 rounded-lg bg-slate-900/30 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Hours', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            <Bar 
              dataKey="totalHours" 
              name="Total Hours"
              fill="#84cc16"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        <p>Monthly hours posting analysis (simplified view)</p>
      </div>
    </div>
  )
}