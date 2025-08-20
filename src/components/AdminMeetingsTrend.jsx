import { useMemo, useRef } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'
import { uiTheme } from '../theme'

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
        const workType = row['Work Type'] // Use original Work Type instead of board category
        const hours = row.Hours || 0
        
        // Skip rows without required fields
        if (!month || !workType) {
          console.log('AdminMeetingsTrend - Skipping row without month/workType:', row)
          continue
        }
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          adminMeetingHours: 0,
          adminHours: 0,
          trainingHours: 0,
          bankHolidayLeaveHours: 0,
          sickLeaveHours: 0,
          totalHours: 0
        }
      }
      
      // Track specific work types
      if (workType === 'Admin - Internal Meeting') {
        monthlyData[month].adminMeetingHours += hours
      } else if (workType === 'Admin') {
        monthlyData[month].adminHours += hours
      } else if (workType === 'Training') {
        monthlyData[month].trainingHours += hours
      } else if (workType === 'Bank/Holiday Leave') {
        monthlyData[month].bankHolidayLeaveHours += hours
      } else if (workType === 'Sick Leave' || workType === 'Sick') {
        monthlyData[month].sickLeaveHours += hours
      }
      
      monthlyData[month].totalHours += hours
    }
    
    // Convert to chart data
    const chartData = Object.entries(monthlyData)
      .map(([month, data]) => {
        const totalAdminHours = data.adminMeetingHours + data.adminHours + data.trainingHours + data.bankHolidayLeaveHours + data.sickLeaveHours
        const adminPercentage = data.totalHours > 0 ? (totalAdminHours / data.totalHours) * 100 : 0
        
        return {
          month,
          adminMeetingHours: Math.round(data.adminMeetingHours * 4) / 4,
          adminHours: Math.round(data.adminHours * 4) / 4,
          trainingHours: Math.round(data.trainingHours * 4) / 4,
          bankHolidayLeaveHours: Math.round(data.bankHolidayLeaveHours * 4) / 4,
          sickLeaveHours: Math.round(data.sickLeaveHours * 4) / 4,
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
      const textShadow = '0 1px 1px rgba(0,0,0,0.4)'
      
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: uiTheme.surface, 
            borderColor: uiTheme.muted,
            color: uiTheme.chart.tooltipText
          }}
        >
          <p className="text-sm font-medium mb-2" style={{ textShadow }}>
            {label}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Admin - Internal Meeting:</span>
              <span className="font-semibold" style={{ color: '#012A2D' }}>{data?.adminMeetingHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Admin:</span>
              <span className="font-semibold" style={{ color: '#B5C933' }}>{data?.adminHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Training:</span>
              <span className="font-semibold" style={{ color: '#EFECD2' }}>{data?.trainingHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Bank/Holiday Leave:</span>
              <span className="font-semibold" style={{ color: '#586961' }}>{data?.bankHolidayLeaveHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Sick Leave:</span>
              <span className="font-semibold" style={{ color: '#8B9DC3' }}>{data?.sickLeaveHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Total Hours:</span>
              <span className="font-semibold" style={{ color: uiTheme.chart.tooltipText }}>{data?.totalHours}h</span>
            </div>
            <div className="flex justify-between items-center text-xs" style={{ textShadow }}>
              <span style={{ color: '#64748b' }}>Admin Share:</span>
              <span className="font-semibold" style={{ color: '#FF4F00' }}>{data?.adminPercentage}%</span>
            </div>
          </div>
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
            Internal Admin & Meetings
          </h3>
          <button 
            onClick={exportPng}
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
        <div className="flex h-96 items-center justify-center text-sm" style={{ color: uiTheme.muted }}>
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
          Internal Admin & Meetings
        </h3>
        <button 
          onClick={exportPng}
          className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> Export PNG
        </button>
      </div>
      <div className="h-96 rounded-lg p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data} 
            margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={uiTheme.chart.grid} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
            />
            <YAxis 
              yAxisId="hours"
              orientation="left"
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ 
                value: 'Admin Hours', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: uiTheme.chart.axis } 
              }}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: uiTheme.chart.axis, fontSize: 12 }}
              label={{ 
                value: 'Admin Share %', 
                angle: 90, 
                position: 'insideRight', 
                style: { fill: uiTheme.chart.axis } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar 
              yAxisId="hours"
              dataKey="adminMeetingHours" 
              name="Admin - Internal Meeting"
              fill="#012A2D"
            />
            <Bar 
              yAxisId="hours"
              dataKey="adminHours" 
              name="Admin"
              fill="#B5C933"
            />
            <Bar 
              yAxisId="hours"
              dataKey="trainingHours" 
              name="Training"
              fill="#EFECD2"
            />
            <Bar 
              yAxisId="hours"
              dataKey="bankHolidayLeaveHours" 
              name="Bank/Holiday Leave"
              fill="#586961"
            />
            <Bar 
              yAxisId="hours"
              dataKey="sickLeaveHours" 
              name="Sick Leave"
              fill="#8B9DC3"
            />
            <Line 
              yAxisId="percentage"
              type="monotone" 
              dataKey="adminPercentage" 
              name="Admin Share %"
              stroke="#FF4F00" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#FF4F00' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        <p className="mb-1">Compares Admin - Internal Meeting, Admin, Training, Bank/Holiday Leave, and Sick Leave hours with their combined percentage of total monthly hours</p>
        <p className="text-xs text-slate-500">
          Admin Share % = What portion of total work time is spent on non-productive activities vs. productive work
        </p>
      </div>
    </div>
  )
}
