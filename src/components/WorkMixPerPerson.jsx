import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts'

const WORK_TYPE_COLORS = {
  'Tech Delivery': '#22d3ee',
  'PM Delivery': '#84cc16', 
  'Pre-Sales': '#a78bfa',
  'Internal Admin': '#fb7185',
  'Internal Support': '#fbbf24',
  'Other': '#9ca3af'
}

export default function WorkMixPerPerson({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by member and work type
    const memberWorkTypeData = {}
    
    for (const row of filteredRows) {
      const member = row.Member || 'Unknown'
      const workType = row.boardWorkType || 'Other'
      const hours = row.Hours
      
      if (!memberWorkTypeData[member]) {
        memberWorkTypeData[member] = {}
      }
      
      memberWorkTypeData[member][workType] = (memberWorkTypeData[member][workType] || 0) + hours
    }
    
    // Convert to chart data format
    const result = Object.entries(memberWorkTypeData).map(([member, workTypes]) => {
      const totalHours = Object.values(workTypes).reduce((sum, hours) => sum + hours, 0)
      
      const memberData = {
        member,
        totalHours: Math.round(totalHours * 4) / 4
      }
      
      // Add each work type as a property
      Object.keys(WORK_TYPE_COLORS).forEach(workType => {
        const hours = workTypes[workType] || 0
        memberData[workType] = Math.round(hours * 4) / 4
      })
      
      return memberData
    })
    
    // Sort by total hours descending and take top 15 for readability
    result.sort((a, b) => b.totalHours - a.totalHours)
    return result.slice(0, 15)
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
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Work Mix by Person</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No work mix data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Work Mix by Person</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 24, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Hours', position: 'bottom', style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="member" 
              type="category" 
              width={100} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 10 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {Object.entries(WORK_TYPE_COLORS).map(([workType, color]) => (
              <Bar 
                key={workType}
                dataKey={workType}
                stackId="workType"
                name={workType}
                fill={color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Top 15 people by total hours, showing work type distribution
      </div>
    </div>
  )
}
