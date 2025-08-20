import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'

const WORK_TYPE_COLORS = {
  'Tech Delivery': '#22d3ee',
  'PM Delivery': '#84cc16', 
  'Internal Admin': '#f59e0b',
  'Internal Support': '#fbbf24',
  'Other': '#9ca3af'
}

export default function ClientWorkTypeMix({ filteredRows, onCompanyFilter }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by client and work type
    const clientWorkTypeData = {}
    
    for (const row of filteredRows) {
      const client = row.Company || 'Unknown'
      if (row.isInternal) continue // Exclude internal work
      
      if (!clientWorkTypeData[client]) {
        clientWorkTypeData[client] = {}
      }
      
      const workType = row.boardWorkType || 'Other'
      clientWorkTypeData[client][workType] = (clientWorkTypeData[client][workType] || 0) + row.Hours
    }
    
    // Convert to percentage data
    const result = Object.entries(clientWorkTypeData).map(([client, workTypes]) => {
      const totalHours = Object.values(workTypes).reduce((sum, hours) => sum + hours, 0)
      
      if (totalHours === 0) return null
      
      const percentages = {
        client,
        totalHours: Math.round(totalHours * 4) / 4
      }
      
      // Calculate percentages for each work type
      Object.keys(WORK_TYPE_COLORS).forEach(workType => {
        const hours = workTypes[workType] || 0
        percentages[workType] = totalHours > 0 ? (hours / totalHours) * 100 : 0
        percentages[`${workType}_hours`] = Math.round(hours * 4) / 4 // Store actual hours for tooltip
      })
      
      return percentages
    }).filter(Boolean)
    
    // Sort by total hours descending and take top 10
    result.sort((a, b) => b.totalHours - a.totalHours)
    return result.slice(0, 10)
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: '#EFECD2',
            borderColor: '#586961'
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#111C3A' }}>{label}</p>
          <p className="text-xs mb-2" style={{ color: '#586961' }}>Total: {data.totalHours}h</p>
          {payload.map((entry, index) => {
            const workType = entry.dataKey
            const percentage = entry.value
            const hours = data[`${workType}_hours`]
            return (
              <p key={index} className="text-xs" style={{ color: entry.color }}>
                {workType}: {hours}h ({percentage.toFixed(1)}%)
              </p>
            )
          })}
          <p className="text-xs text-cyan-400 mt-1 border-t pt-1" style={{ borderColor: '#586961' }}>
            Click to filter by this client
          </p>
        </div>
      )
    }
    return null
  }
  
  const handleBarClick = (data) => {
    if (data && data.client && onCompanyFilter) {
      onCompanyFilter(data.client)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Client Work Type Mix (100% Stacked)</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No client work type data available
        </div>
      </div>
    )
  }
  
  // Only show these work types for clients
  const CLIENT_WORK_TYPES = ['Tech Delivery', 'PM Delivery']
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Client Work Type Mix (100% Stacked)</h3>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 24, top: 8, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Percentage (%)', position: 'insideBottom', offset: 0, style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="client" 
              type="category" 
              width={180} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500, wordBreak: 'break-all', whiteSpace: 'pre-line' }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            {CLIENT_WORK_TYPES.map((workType) => (
              <Bar 
                key={workType}
                dataKey={workType}
                stackId="workType"
                fill={WORK_TYPE_COLORS[workType]}
                cursor="pointer"
                onClick={handleBarClick}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
        {CLIENT_WORK_TYPES.map((workType) => (
          <div key={workType} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: WORK_TYPE_COLORS[workType] }}></div>
            <span>{workType}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
