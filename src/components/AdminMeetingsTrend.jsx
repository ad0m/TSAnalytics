import { useMemo, useRef } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'

export default function AdminMeetingsTrend({ filteredRows }) {
  const ref = useRef(null)
  
  const data = useMemo(() => {
    try {
      console.log('AdminMeetingsTrend - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows || filteredRows.length === 0) return []
      
      // Group by month
      const monthlyData = {}
      
      for (const row of filteredRows) {
        const month = row.calendarMonth
        const workType = row.boardWorkType
        const hours = row.Hours || 0
        
        // Skip rows without required fields
        if (!month || !workType) {
          console.log('AdminMeetingsTrend - Skipping row without month/workType:', row)
          continue
        }
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          adminHours: 0,
          totalHours: 0
        }
      }
      
      // Admin hours: Internal Admin + Internal Support
      if (workType === 'Internal Admin' || workType === 'Internal Support') {
        monthlyData[month].adminHours += hours
      }
      
      monthlyData[month].totalHours += hours
    }
    
    // Convert to chart data
    const chartData = Object.entries(monthlyData)
      .map(([month, data]) => {
        const adminPercentage = data.totalHours > 0 ? (data.adminHours / data.totalHours) * 100 : 0
        
        return {
          month,
          adminHours: Math.round(data.adminHours * 4) / 4,
          totalHours: Math.round(data.totalHours * 4) / 4,
          adminPercentage: Math.round(adminPercentage * 10) / 10
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
    
    return chartData
    
    } catch (error) {
      console.error('AdminMeetingsTrend - Error:', error)
      return []
    }
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300 mb-1">
            Admin Hours: {data?.adminHours}h
          </p>
          <p className="text-xs text-slate-300 mb-1">
            Total Hours: {data?.totalHours}h
          </p>
          <p className="text-xs text-lime-400">
            Admin Share: {data?.adminPercentage}%
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
        a.download = 'admin-meetings-trend.png'
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
              <span className="text-lime-400">📊</span>
            </span>
            Admin & Meetings Trend
          </h3>
          <button 
            onClick={exportPng}
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
        <div className="flex h-80 items-center justify-center text-sm text-slate-400">
          No admin/meetings data available
        </div>
      </div>
    )
  }
  
  return (
    <div ref={ref} className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">📊</span>
          </span>
          Admin & Meetings Trend
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
          <ComposedChart 
            data={data} 
            margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="hours"
              orientation="left"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Admin Hours', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Admin Share %', 
                angle: 90, 
                position: 'insideRight', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar 
              yAxisId="hours"
              dataKey="adminHours" 
              name="Admin Hours"
              fill="#fbbf24"
            />
            <Line 
              yAxisId="percentage"
              type="monotone" 
              dataKey="adminPercentage" 
              name="Admin Share %"
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Shows Internal Admin + Internal Support hours and their percentage of total monthly hours
      </div>
    </div>
  )
}
