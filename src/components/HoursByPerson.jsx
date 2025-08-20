import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LabelList } from 'recharts'

export default function HoursByPerson({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by member and sum total hours
    const memberHours = {}
    
    for (const row of filteredRows) {
      const member = row.Member || 'Unknown'
      memberHours[member] = (memberHours[member] || 0) + row.Hours
    }
    
    // Convert to array and sort by hours descending
    const result = Object.entries(memberHours)
      .map(([member, hours]) => ({
        member,
        hours: Math.round(hours * 4) / 4 // Round to 0.25
      }))
      .sort((a, b) => b.hours - a.hours)
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: '#EFECD2',
            borderColor: '#586961'
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#111C3A' }}>{label}</p>
          <p className="text-xs" style={{ color: '#586961' }}>
            Total Hours: {payload[0].value}h
          </p>
        </div>
      )
    }
    return null
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Total Hours by Person</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No person data available
        </div>
      </div>
    )
  }
  
  // Calculate dynamic height based on number of people
  const chartHeight = Math.max(420, data.length * 35)
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Total Hours by Person</h3>
      <div style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 100, top: 8, bottom: 36 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Total Hours', position: 'bottom', style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="member" 
              type="category" 
              width={120} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="hours" 
              fill="#22d3ee"
            >
              <LabelList 
                dataKey="hours" 
                position="right" 
                formatter={(v) => `${v}h`} 
                className="text-[11px] fill-slate-200" 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Ranked by total hours in selected time period
      </div>
    </div>
  )
}
