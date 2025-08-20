import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import { uiTheme } from '../theme'

export default function CumulativeBillableVsNon({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by date and billable/non-billable
    const dailyData = {}
    
    for (const row of filteredRows) {
      const date = dayjs(row.dateObj).format('YYYY-MM-DD')
      const hours = row.Hours
      const isBillable = row.isBillable
      
      if (!dailyData[date]) {
        dailyData[date] = {
          billable: 0,
          nonBillable: 0
        }
      }
      
      if (isBillable) {
        dailyData[date].billable += hours
      } else {
        dailyData[date].nonBillable += hours
      }
    }
    
    // Convert to sorted array and calculate cumulative totals
    const sortedDates = Object.keys(dailyData).sort()
    let cumulativeBillable = 0
    let cumulativeNonBillable = 0
    
    const chartData = sortedDates.map(date => {
      const dayData = dailyData[date]
      cumulativeBillable += dayData.billable
      cumulativeNonBillable += dayData.nonBillable
      
      return {
        date,
        displayDate: dayjs(date).format('MMM DD'),
        cumulativeBillable: Math.round(cumulativeBillable * 4) / 4,
        cumulativeNonBillable: Math.round(cumulativeNonBillable * 4) / 4,
        dailyBillable: Math.round(dayData.billable * 4) / 4,
        dailyNonBillable: Math.round(dayData.nonBillable * 4) / 4
      }
    })
    
    return chartData
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = payload.reduce((sum, item) => sum + item.value, 0)
      
             const textShadow = '0 1px 1px rgba(0,0,0,0.4)'
      
      return (
        <div className="rounded-lg border p-3 shadow-2xl" style={{ 
          backgroundColor: uiTheme.surface, 
          borderColor: uiTheme.muted,
          color: uiTheme.chart.tooltipText
        }}>
                     <p className="text-sm font-medium" style={{ textShadow }}>{dayjs(data.date).format('MMM DD, YYYY')}</p>
           <p className="text-xs mb-2" style={{ color: uiTheme.chart.tooltipText, textShadow }}>Cumulative Total: {total.toFixed(2)}h</p>
                       {payload.map((item, index) => (
              <p key={index} className="text-xs" style={{ textShadow }}>
                <span style={{ color: '#64748b' }}>{item.dataKey === 'cumulativeBillable' ? 'Cumulative Billable' : 'Cumulative Non-billable'}: </span>
                <span className="font-semibold" style={{ color: item.color }}>{item.value}h</span>
              </p>
            ))}
           <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${uiTheme.muted}` }}>
             <p className="text-xs" style={{ color: uiTheme.chart.tooltipText, textShadow }}>Daily breakdown:</p>
                                                                                                                   <p className="text-xs" style={{ textShadow }}>
                 <span style={{ color: '#64748b' }}>Billable: </span>
                 <span className="font-semibold" style={{ color: '#84cc16' }}>{data.dailyBillable}h</span>
               </p>
                                                                                                                                                                                                                                       <p className="text-xs" style={{ textShadow }}>
                 <span style={{ color: '#64748b' }}>Non-billable: </span>
                 <span className="font-semibold" style={{ color: '#ef4444' }}>{data.dailyNonBillable}h</span>
               </p>
           </div>
        </div>
      )
    }
    return null
  }
  
  // Format date for x-axis (show every nth date to avoid crowding)
  const formatXAxisDate = (date) => {
    return dayjs(date).format('MM/DD')
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Cumulative Billable vs Non-billable</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No cumulative data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Cumulative Billable vs Non-billable</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="date"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickFormatter={formatXAxisDate}
              interval={Math.max(1, Math.floor(data.length / 10))} // Show ~10 ticks
            />
            <YAxis 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ 
                value: 'Cumulative Hours', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#cbd5e1' } 
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area 
              type="monotone" 
              dataKey="cumulativeBillable" 
              stackId="1"
              name="Cumulative Billable"
              stroke="#84cc16" 
              fill="url(#colorBillable)"
            />
            <Area 
              type="monotone" 
              dataKey="cumulativeNonBillable" 
              stackId="1"
              name="Cumulative Non-billable"
              stroke="#ef4444" 
              fill="url(#colorNonBillable)"
            />

            <defs>
              <linearGradient id="colorBillable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#84cc16" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorNonBillable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Shows running total of billable and non-billable hours over the selected time period
      </div>
    </div>
  )
}
