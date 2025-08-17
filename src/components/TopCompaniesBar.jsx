import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts'

export default function TopCompaniesBar({ filteredRows, onCompanyClick }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by company and sum billable hours
    const companyData = {}
    
    for (const row of filteredRows) {
      if (!row.isBillable) continue // Only billable hours
      
      const company = row.Company || 'Unknown'
      if (!companyData[company]) {
        companyData[company] = 0
      }
      companyData[company] += row.Hours
    }
    
    // Convert to array, sort, and take top 10
    const result = Object.entries(companyData)
      .map(([company, hours]) => ({
        company,
        hours: Math.round(hours * 4) / 4 // Round to 0.25
      }))
      .filter(item => !['OryxAlign', 'OryxAlign-Internal c/code'].includes(item.company)) // Exclude internal companies
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300">
            Billable Hours: {payload[0].value}h
          </p>
          <p className="text-xs text-cyan-400 mt-1">
            Click to filter by this company
          </p>
        </div>
      )
    }
    return null
  }
  
  const handleBarClick = (data) => {
    if (data && data.company && onCompanyClick) {
      onCompanyClick(data.company)
    }
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Top 10 Companies by Billable Hours</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No billable hours data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Top 10 Companies by Billable Hours</h3>
      <div className="h-80">
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
              label={{ value: 'Billable Hours', position: 'bottom', style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="company" 
              type="category" 
              width={120} 
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="hours" 
              cursor="pointer"
              onClick={handleBarClick}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill="#22d3ee"
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center text-xs text-slate-400">
        Click on any bar to filter by that company
      </div>
    </div>
  )
}
