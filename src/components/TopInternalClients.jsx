import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LabelList } from 'recharts'

const INTERNAL_COMPANIES = new Set(['OryxAlign', 'OryxAlign-Internal c/code'])

export default function TopInternalClients({ filteredRows, onCompanyFilter }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group internal hours by company
    const internalHours = {}
    
    for (const row of filteredRows) {
      // Only include rows that are flagged as internal OR from internal companies
      if (!row.isInternal && !INTERNAL_COMPANIES.has(row.Company)) continue
      
      const company = row.Company || 'Unknown'
      internalHours[company] = (internalHours[company] || 0) + row.Hours
    }
    
    // Convert to array and sort
    const result = Object.entries(internalHours)
      .map(([company, hours]) => ({
        company,
        hours: Math.round(hours * 4) / 4 // Round to 0.25
      }))
      .sort((a, b) => b.hours - a.hours)
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300">
            Internal Hours: {payload[0].value}h
          </p>
          <p className="text-xs text-cyan-400 mt-1 border-t border-slate-600 pt-1">
            Click to filter by this company
          </p>
        </div>
      )
    }
    return null
  }
  
  const handleBarClick = (data) => {
    if (data && data.company && onCompanyFilter) {
      onCompanyFilter(data.company)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">OryxAlign Internal Hours</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No internal hours data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">OryxAlign Internal Hours</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 12, right: 40, top: 8, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number" 
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Internal Hours', position: 'insideBottom', offset: 0, style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="company" 
              type="category" 
              width={180} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500, wordBreak: 'break-all', whiteSpace: 'pre-line' }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="hours" 
              fill="#fbbf24"
              cursor="pointer"
              onClick={handleBarClick}
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
      <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
        <p>Shows hours flagged as internal work or from internal companies</p>
        <p>Click on any bar to filter by that company</p>
      </div>
    </div>
  )
}
